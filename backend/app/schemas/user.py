# backend/app/schemas/user.py
from datetime import datetime
from typing import Any, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StrictBool, model_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: str = Field(default="user", max_length=20)
    avatar_url: str = Field(default="default_avatar", max_length=255)
    is_active: bool = True
    is_verified: bool = False


class UserRegister(BaseModel):
    """What a visitor may send to `POST /auth/register`. There is deliberately no `role` (or
    `avatar_url`): those are for admins creating accounts (`UserCreate`), and accepting them here
    let anyone sign up as an admin."""

    login: str = Field(..., min_length=3, max_length=50, pattern=r"^[^@\s]+$")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserCreate(BaseModel):
    login: str = Field(..., min_length=3, max_length=50, pattern=r"^[^@\s]+$")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str | None = "user"
    avatar_url: str | None = "default_avatar"
    #: The acting admin's own password (and 2FA code): required when the new account is an admin.
    current_password: str | None = Field(None, max_length=200)
    two_factor_code: str | None = Field(None, max_length=64)


class UserUpdate(BaseModel):
    """What an admin may change on someone else's account (PUT /users/<id>)."""

    username: str | None = Field(None, min_length=3, max_length=50)
    role: str | None = None
    is_active: bool | None = None
    is_verified: bool | None = None
    #: The acting admin's own password (and 2FA code): required to grant the admin role, or to take it
    #: from another admin.
    current_password: str | None = Field(None, max_length=200)
    two_factor_code: str | None = Field(None, max_length=64)


class UserResponse(UserBase):
    id: int
    login: str
    two_factor_enabled: bool = False
    has_password: bool = True
    google_linked: bool = False
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


#: Most ownership changes one bulk request may carry (the whole roster is ~200 characters).
MAX_BULK_OWNERSHIP_UPDATES = 1000


class CharacterOwnershipSet(BaseModel):
    """One character's ownership as a client sends it. `character_id` and `role` are checked by the
    route / service (an invalid one is a 400 for a single change and skipped in a bulk one);
    `is_owned` must be a real boolean -- "false" as a string used to count as owned."""

    model_config = ConfigDict(extra="ignore")

    character_id: Any = None
    role: Any = None
    is_owned: StrictBool = True


class PerkOwnershipSet(BaseModel):
    """One perk's unlock state as a client sends it (see CharacterOwnershipSet)."""

    model_config = ConfigDict(extra="ignore")

    perk_id: Any = None
    is_unlocked: StrictBool = True


class BulkCharacterOwnershipRequest(BaseModel):
    updates: list[CharacterOwnershipSet] = Field(default_factory=list, max_length=MAX_BULK_OWNERSHIP_UPDATES)


class BulkPerkOwnershipRequest(BaseModel):
    updates: list[PerkOwnershipSet] = Field(default_factory=list, max_length=MAX_BULK_OWNERSHIP_UPDATES)


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
