from fastapi import APIRouter, Depends, HTTPException, status
from ..schemas import Token, LoginRequest
from ..auth import authenticate_admin, create_access_token

router = APIRouter(prefix="/admin-api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(login_request: LoginRequest):
    """Admin login endpoint"""
    if not authenticate_admin(login_request.username, login_request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": login_request.username})
    return Token(access_token=access_token, token_type="bearer")
