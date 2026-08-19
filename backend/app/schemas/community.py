# backend/app/schemas/community.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DailyQuestBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    category: str = Field(..., max_length=20)
    progress: int = 0
    goal: int = 1
    xp_reward: int = 500
    is_completed: bool = False


class DailyQuestResponse(DailyQuestBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CommunityBuildBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str
    role: str = Field(..., max_length=20)
    category: str = Field(..., max_length=50)
    character_id: str = "all"
    perks: List[str] = []
    upvotes: int = 0
    author: str = "Community"


class CommunityBuildCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str
    role: str
    category: str
    character_id: str = "all"
    perks: List[str] = Field(..., max_length=4)


class CommunityBuildResponse(CommunityBuildBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CustomPerkBase(BaseModel):
    name: str = Field(..., max_length=150)
    role: str = Field(..., max_length=20)
    character_name: str = "Teachable"
    rarity: str = "Very Rare"
    icon_preset: str = "sparkles"
    description: str
    upvotes: int = 0
    author: str = "Community"


class CustomPerkCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    role: str
    character_name: Optional[str] = "Teachable"
    rarity: Optional[str] = "Very Rare"
    icon_preset: Optional[str] = "sparkles"
    description: str = Field(..., min_length=5)


class CustomPerkResponse(CustomPerkBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BugReportBase(BaseModel):
    reporter_name: str = Field(..., max_length=100)
    reporter_email: Optional[str] = Field(None, max_length=150)
    title: str = Field(..., max_length=200)
    category: str = Field("General", max_length=50)
    message: str
    images: List[str] = []


class BugReportCreate(BugReportBase):
    user_id: Optional[int] = None


class BugReportResponse(BugReportBase):
    id: int
    user_id: Optional[int] = None
    status: str
    admin_notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

