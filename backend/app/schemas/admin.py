# backend/app/schemas/admin.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ChallengeModeSettingBase(BaseModel):
    mode: str = Field(..., max_length=20)
    is_enabled: bool = True
    disabled_reason: str | None = Field(None, max_length=255)


class ChallengeModeSettingResponse(ChallengeModeSettingBase):
    id: int
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogResponse(BaseModel):
    id: int
    admin_user_id: int | None = None
    action: str
    target_type: str | None = None
    target_id: str | None = None
    details: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


from typing import Any


class DisableItemDTO(BaseModel):
    is_disabled: bool
    role: str | None = None
    reason: str | None = None


class UpdateChallengeModeDTO(BaseModel):
    is_enabled: bool
    reason: str | None = None


class UpdateSiteSettingsDTO(BaseModel):
    settings: dict[str, Any] = Field(..., min_length=1)
    # Required (with a reason) for a change that lowers a protection, e.g. turning the e-mail check off.
    confirm_risky: bool = False
    reason: str = Field(default="", max_length=300)


class PurgeDatabaseDTO(BaseModel):
    targets: list[str] = Field(..., min_length=1)

