# backend/app/schemas/user.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: str = Field(default="user", max_length=20)
    avatar_url: str = Field(default="default_avatar", max_length=255)
    is_active: bool = True
    is_verified: bool = False


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "user"
    avatar_url: Optional[str] = "default_avatar"


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserCharacterOwnershipBase(BaseModel):
    user_id: int
    character_id: int
    is_owned: bool = True


class UserCharacterOwnershipResponse(UserCharacterOwnershipBase):
    id: int
    character_name: Optional[str] = None
    character_role: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserPerkOwnershipBase(BaseModel):
    user_id: int
    perk_id: int
    is_unlocked: bool = True


class UserPerkOwnershipResponse(UserPerkOwnershipBase):
    id: int
    perk_name: Optional[str] = None
    perk_category: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

