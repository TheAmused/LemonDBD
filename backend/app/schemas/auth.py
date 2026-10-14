# backend/app/schemas/auth.py
from __future__ import annotations

from pydantic import BaseModel, Field


class GoogleSignInDTO(BaseModel):
    credential: str = Field(..., min_length=1)


class TwoFactorLoginDTO(BaseModel):
    two_factor_token: str | None = None
    code: str | None = None


class TwoFactorSetupDTO(BaseModel):
    password: str | None = None


class TwoFactorConfirmDTO(BaseModel):
    code: str | None = None


class TwoFactorDisableDTO(BaseModel):
    password: str | None = None
    code: str | None = None


class TwoFactorRecoveryCodesDTO(BaseModel):
    password: str | None = None
    code: str | None = None

