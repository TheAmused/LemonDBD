# backend/app/schemas/user.py
from datetime import datetime
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
    role: str | None = "user"
    avatar_url: str | None = "default_avatar"


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    role: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCharacterOwnershipBase(BaseModel):
    user_id: int
    character_id: int
    is_owned: bool = True


class UserCharacterOwnershipResponse(UserCharacterOwnershipBase):
    id: int
    character_name: str | None = None
    character_role: str | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserPerkOwnershipBase(BaseModel):
    user_id: int
    perk_id: int
    is_unlocked: bool = True


class UserPerkOwnershipResponse(UserPerkOwnershipBase):
    id: int
    perk_name: str | None = None
    perk_category: str | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
