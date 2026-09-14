# backend/app/schemas/user.py
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


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
    onboarding_completed_at: datetime | None = None
    preferred_language: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCharacterOwnershipBase(BaseModel):
    """Write shape for a row of `user_character_ownerships`.

    `character_id` pointed at one `characters` table and is gone. With
    survivors and killers numbered separately, ownership takes one nullable
    key per table with exactly one set -- mirroring the model's
    `ck_user_character_ownership_one_side` CHECK constraint, enforced here too
    so a bad write fails at the schema instead of the database.
    """

    user_id: int
    survivor_id: int | None = None
    killer_id: int | None = None
    is_owned: bool = True

    @model_validator(mode="after")
    def check_exactly_one_side(self) -> Self:
        if (self.survivor_id is None) == (self.killer_id is None):
            raise ValueError("exactly one of survivor_id or killer_id must be set")
        return self


class UserCharacterOwnershipResponse(BaseModel):
    """Mirrors `UserCharacterOwnership.to_dict()`.

    `character_id` is kept alongside `survivor_id`/`killer_id` -- it's scoped
    to `character_role` now that survivor 7 and killer 7 both exist, so it is
    ambiguous without them, not a replacement for them.
    """

    id: int
    user_id: int
    character_id: int | None = None
    character_role: str | None = None
    survivor_id: int | None = None
    killer_id: int | None = None
    character_name: str | None = None
    is_owned: bool = True
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
