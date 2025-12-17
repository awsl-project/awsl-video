import asyncio
import httpx
import logging
from typing import Dict, Optional
from fastapi import HTTPException
from .config import settings

logger = logging.getLogger("backend.oauth_service")


class OAuthProvider:
    """Base class for OAuth providers"""

    def get_authorize_url(self, redirect_uri: str) -> str:
        raise NotImplementedError

    async def get_access_token(self, code: str, redirect_uri: str) -> str:
        raise NotImplementedError

    async def get_user_info(self, access_token: str) -> Dict:
        raise NotImplementedError


class GitHubOAuthProvider(OAuthProvider):
    """GitHub OAuth provider"""

    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_API_URL = "https://api.github.com/user"

    def get_authorize_url(self, redirect_uri: str) -> str:
        """Generate GitHub OAuth authorization URL"""
        return (
            f"{self.AUTHORIZE_URL}?"
            f"client_id={settings.GITHUB_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"scope=user:email"
        )

    async def get_access_token(self, code: str, redirect_uri: str) -> str:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                params={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            return data["access_token"]

    async def get_user_info(self, access_token: str) -> Dict:
        """Get user information from GitHub"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.USER_API_URL,
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()
            user_data = response.json()

            return {
                "oauth_id": str(user_data["id"]),
                "username": user_data["login"],
                "name": user_data.get("name"),
                "avatar_url": None,  # 不再使用头像URL
                "email": user_data.get("email"),
            }


class LinuxDoOAuthProvider(OAuthProvider):
    """Linux.do OAuth provider"""

    AUTHORIZE_URL = "https://connect.linux.do/oauth2/authorize"
    TOKEN_URL = "https://connect.linux.do/oauth2/token"
    USER_API_URL = "https://connect.linux.do/api/user"

    def get_authorize_url(self, redirect_uri: str) -> str:
        """Generate Linux.do OAuth authorization URL"""
        return (
            f"{self.AUTHORIZE_URL}?"
            f"client_id={settings.LINUXDO_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope=user"
        )

    async def get_access_token(self, code: str, redirect_uri: str) -> str:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.LINUXDO_CLIENT_ID,
                    "client_secret": settings.LINUXDO_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            return data["access_token"]

    async def get_user_info(self, access_token: str) -> Dict:
        """Get user information from Linux.do"""
        timeout = httpx.Timeout(15.0, connect=10.0)
        max_retries = 3

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    logger.info(f"Requesting user info from: {self.USER_API_URL} (attempt {attempt + 1}/{max_retries})")
                    response = await client.get(
                        self.USER_API_URL,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Accept": "application/json",
                        },
                    )
                    logger.info(f"User info response status: {response.status_code}")
                    response.raise_for_status()
                    user_data = response.json()
                    logger.info(f"User data received: {user_data.get('username', 'unknown')}")

                    return {
                        "oauth_id": str(user_data["id"]),
                        "username": user_data["username"],
                        "name": user_data.get("name"),
                        "avatar_url": None,  # 不再使用头像URL
                        "email": None,  # Linux.do doesn't provide email
                    }

            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.warning(f"Attempt {attempt + 1} failed: {type(e).__name__}: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error(f"All {max_retries} attempts failed to connect to {self.USER_API_URL}")
                    raise HTTPException(
                        status_code=503,
                        detail="无法连接到 Linux.do API，请稍后重试"
                    )
                # Wait before retry (exponential backoff)
                await asyncio.sleep(1 * (attempt + 1))
            except Exception as e:
                logger.error(f"Error getting user info: {str(e)}")
                raise


class OAuthService:
    """OAuth service to handle multiple providers"""

    def __init__(self):
        self.providers = {
            "github": GitHubOAuthProvider(),
            "linuxdo": LinuxDoOAuthProvider(),
        }

    def get_provider(self, provider_name: str) -> Optional[OAuthProvider]:
        """Get OAuth provider by name"""
        return self.providers.get(provider_name.lower())

    def get_authorize_url(self, provider_name: str, redirect_uri: str) -> Optional[str]:
        """Get authorization URL for provider"""
        provider = self.get_provider(provider_name)
        if provider:
            return provider.get_authorize_url(redirect_uri)
        return None

    async def authenticate(self, provider_name: str, code: str, redirect_uri: str) -> Optional[Dict]:
        """Authenticate user with OAuth provider"""
        provider = self.get_provider(provider_name)
        if not provider:
            return None

        # Exchange code for access token
        access_token = await provider.get_access_token(code, redirect_uri)

        # Get user information
        user_info = await provider.get_user_info(access_token)

        return user_info


# Singleton instance
oauth_service = OAuthService()
