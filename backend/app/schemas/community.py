# backend/app/schemas/community.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class BugReportBase(BaseModel):
    reporter_name: str = Field(..., max_length=100)
    reporter_email: str | None = Field(None, max_length=150)
    title: str = Field(..., max_length=200)
    message: str
    images: list[str] = []


class BugReportCreate(BugReportBase):
    user_id: int | None = None


class BugReportResponse(BugReportBase):
    id: int
    user_id: int | None = None
    status: str
    admin_notes: str | None = ""
    feedback_unread: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


#: Longest bug report description accepted (the column is TEXT; this keeps one report readable).
MAX_BUG_REPORT_MESSAGE_LENGTH = 10_000


class BugReportSubmitDTO(BaseModel):
    """POST /bug-reports. Other keys (honeypot, ALTCHA payload) are ignored here; they are checked
    on their own. Strings are trimmed; the lengths match the columns, so an oversized field is a
    400 instead of a database error."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    title: str = Field("", max_length=200)
    message: str = Field("", max_length=MAX_BUG_REPORT_MESSAGE_LENGTH)
    reporter_name: str = Field("", max_length=100)
    reporter_email: EmailStr | None = Field(None, max_length=150)
    images: list[object] = Field(default_factory=list)

    @field_validator("reporter_email", mode="before")
    @classmethod
    def _blank_email_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("images", mode="before")
    @classmethod
    def _images_must_be_a_list(cls, value: object) -> object:
        return value if isinstance(value, list) else []
