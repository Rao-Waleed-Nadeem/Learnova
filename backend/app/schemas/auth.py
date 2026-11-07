"""Authentication Pydantic schemas for requests and token responses."""

from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserResponse


class UserRegisterRequest(BaseModel):
    """Payload for public user self-registration. Always registers as student."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name of user")


class UserLoginRequest(BaseModel):
    """Payload for user email/password login."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """JWT bearer token response including user summary."""

    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenRefreshResponse(BaseModel):
    """JWT bearer access token returned from token refresh."""

    access_token: str
    token_type: str = "bearer"


class PasswordChangeRequest(BaseModel):
    """Payload for changing account password."""

    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class MessageResponse(BaseModel):
    """Generic status or success message response."""

    message: str
