from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..database import get_db
from ..oauth_service import oauth_service
from ..auth import create_user_token
from ..schemas import UserToken, UserProfile
from .. import models

router = APIRouter()


@router.get("/login/{provider}")
async def oauth_login(provider: str, redirect_uri: str = Query(...)):
    """
    Initiate OAuth login flow

    - **provider**: OAuth provider name ('github' or 'linuxdo')
    - **redirect_uri**: Frontend callback URL
    """
    authorize_url = oauth_service.get_authorize_url(provider, redirect_uri)

    if not authorize_url:
        raise HTTPException(status_code=400, detail=f"Unsupported OAuth provider: {provider}")

    return {"authorize_url": authorize_url}


@router.post("/callback", response_model=UserToken)
async def oauth_callback(
    code: str = Query(...),
    provider: str = Query(...),
    redirect_uri: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle OAuth callback and create/update user

    - **code**: Authorization code from OAuth provider
    - **provider**: OAuth provider name
    - **redirect_uri**: Frontend callback URL (must match the one used in login)
    """
    # Authenticate with OAuth provider
    user_info = await oauth_service.authenticate(provider, code, redirect_uri)

    if not user_info:
        raise HTTPException(status_code=400, detail="OAuth authentication failed")

    # Check if user exists
    result = await db.execute(
        select(models.User).where(
            models.User.oauth_provider == provider,
            models.User.oauth_id == user_info["oauth_id"]
        )
    )
    user = result.scalar_one_or_none()

    if user:
        # Update existing user
        user.username = user_info["username"]
        user.name = user_info.get("name")
        user.avatar_url = user_info.get("avatar_url")
        user.email = user_info.get("email")
        user.last_login = datetime.utcnow()
    else:
        # Create new user
        user = models.User(
            oauth_provider=provider,
            oauth_id=user_info["oauth_id"],
            username=user_info["username"],
            name=user_info.get("name"),
            avatar_url=user_info.get("avatar_url"),
            email=user_info.get("email"),
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    # Create JWT token
    access_token = create_user_token(user.id, user.username)

    return UserToken(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile.from_orm(user)
    )
