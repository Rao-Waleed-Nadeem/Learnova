"""User and UserProfile Pydantic schemas for request validation and serialization."""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserProfileResponse(BaseModel):
    """User profile data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    bio: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class UserResponse(BaseModel):
    """User account data returned in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    profile: Optional[UserProfileResponse] = None

    @field_validator("role", mode="before")
    @classmethod
    def extract_role_name(cls, v: Any) -> str:
        if hasattr(v, "name"):
            return str(v.name)
        return str(v)


class UserProfileUpdateRequest(BaseModel):
    """Request payload to update current user profile details."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    bio: Optional[str] = Field(default=None, max_length=2000)
    department: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=512)


class UserPreferencesUpdateRequest(BaseModel):
    """Request payload to update current user preferences."""

    preferences: Dict[str, Any] = Field(default_factory=dict)


class UserRoleUpdateRequest(BaseModel):
    """Request payload for administrator to change user role."""

    role: str = Field(..., pattern="^(administrator|teacher|student)$")


class UserStatusUpdateRequest(BaseModel):
    """Request payload for administrator to activate/deactivate user."""

    is_active: bool
