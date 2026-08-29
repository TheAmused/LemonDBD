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
