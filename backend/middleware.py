"""
Global middleware for blocking access based on IP country
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)


class IPCountryBlockMiddleware(BaseHTTPMiddleware):
    """
    Middleware to block access from specific countries based on X-Vercel-IP-Country header.

    Vercel automatically adds the X-Vercel-IP-Country header to all requests,
    which contains the ISO 3166-1 alpha-2 country code of the request origin.

    This middleware blocks requests from China (CN) to comply with regional restrictions.
    """

    def __init__(self, app, blocked_countries: list = None):
        """
        Initialize the middleware.

        Args:
            app: The FastAPI application
            blocked_countries: List of country codes to block (default: ["CN"])
        """
        super().__init__(app)
        self.blocked_countries = blocked_countries or ["CN"]
        logger.info(f"IPCountryBlockMiddleware initialized. Blocking countries: {self.blocked_countries}")

    async def dispatch(self, request: Request, call_next):
        """
        Process each request and block if from a restricted country.

        Args:
            request: The incoming request
            call_next: The next middleware/route handler

        Returns:
            Response or error for blocked requests
        """
        # Get the country code from Vercel's header
        country_code = request.headers.get("X-Vercel-IP-Country", "").upper()

        # Log the request for monitoring
        if country_code:
            logger.debug(f"Request from country: {country_code} to {request.url.path}")

        # Block if country is in blocked list
        if country_code in self.blocked_countries:
            logger.warning(
                f"Blocked request from {country_code} - "
                f"Path: {request.url.path} - "
                f"IP: {request.client.host if request.client else 'unknown'}"
            )

            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "success": False,
                    "message": "访问受限：该地区暂不支持访问",
                    "detail": "Access restricted: This region is not supported",
                    "status_code": 403
                }
            )

        # Continue to next middleware/handler if not blocked
        response = await call_next(request)
        return response
