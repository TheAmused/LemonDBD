# backend/app/features/auth/models.py
from app.models.two_factor import UserRecoveryCode, UserTwoFactor

__all__ = ["UserTwoFactor", "UserRecoveryCode"]
