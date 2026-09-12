# backend/app/models/chapter.py
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.character import Killer, Survivor

#: Release packaging of a chapter. The scraped source spelled these four ways
#: in free text ("Chapter DLC", "Half-Chapter DLC", "free Chapter DLC",
#: "base_game") plus one truncation bug ("Chapter DLC that"), which made
#: `dlc_type` disagree with itself inside a single chapter. Normalized to a
#: closed set and enforced by a CHECK constraint.
DLC_TYPES = ("base_game", "chapter", "half_chapter", "free_chapter")

#: What `characters.dlc_type` used to contain, keyed by the normalized value.
#: Storage is the closed set above; the character API keeps emitting the
#: original free-text label so nothing downstream has to change. The one row
#: that read "Chapter DLC that" -- a truncated scrape -- now reads
#: "Chapter DLC" like the rest of its chapter.
DLC_TYPE_LABELS = {
    "base_game": "base_game",
    "chapter": "Chapter DLC",
    "half_chapter": "Half-Chapter DLC",
    "free_chapter": "free Chapter DLC",
}


def dlc_type_label(value: str | None) -> str:
    return DLC_TYPE_LABELS.get(value or "chapter", "Chapter DLC")

#: The name reserved for the original 2016 release. It is not a DLC chapter,
#: but seven characters originate from it, so it needs a row for
#: `characters.chapter_id` to be a NOT NULL foreign key.
BASE_GAME_NAME = "Base Game"


class Chapter(Base):
    """A released chapter (or the base game).

    Holds every attribute that is a property of the *release* rather than of an
    individual character. `release_date`, `release_year`, `is_licensed` and
    `dlc_type` were previously stored once per character, where all 98 rows
    agreed with their chapter on all four -- a textbook transitive dependency,
    and four more columns to keep in sync every time a chapter is re-scraped.

    Cosmetic DLC (outfit packs, the soundtrack, bundle "Expansion Packs") used
    to share this table with real chapters, which is why 18 of the 69 rows had
    no characters at all. They are gone; this table is chapters only.
    """

    __tablename__ = "chapters"
    __table_args__ = (
        CheckConstraint(
            "dlc_type IN ('base_game', 'chapter', 'half_chapter', 'free_chapter')",
            name="ck_chapters_dlc_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)

    release_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_licensed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dlc_type: Mapped[str] = mapped_column(String(20), default="chapter", nullable=False)

    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    # Two collections rather than one, because there are two tables. Callers
    # that want the whole cast chain them; nothing needs a polymorphic query.
    survivors: Mapped[list["Survivor"]] = relationship(
        back_populates="chapter", order_by="Survivor.id"
    )
    killers: Mapped[list["Killer"]] = relationship(
        back_populates="chapter", order_by="Killer.id"
    )

    @property
    def characters(self) -> list["Survivor | Killer"]:
        """The chapter's whole cast, survivors first. Read-only."""
        return [*self.survivors, *self.killers]

    @staticmethod
    def format_release_date(value: date | None) -> str:
        """Render a date the way the wiki and the existing API do: `14 June 2016`.

        Verified to round-trip every one of the 52 distinct release dates in the
        dataset, so storing a real DATE costs nothing at the API boundary while
        making "characters released in 2023" an index range scan instead of a
        string LIKE.
        """
        if not value:
            return ""
        return f"{value.day} {value.strftime('%B')} {value.year}"

    def localized_name(self, lang: str | None = None) -> str:
        """Chapter name in `lang`, falling back to the canonical English name.

        These strings used to live on every character (98 rows x 5 languages =
        490 copies of 52 distinct names). They live here now, once each.
        """
        if lang and self.translations:
            trans = self.translations.get(lang)
            if isinstance(trans, dict) and trans.get("name"):
                return str(trans["name"])
        return self.name

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.localized_name(lang),
            "raw_name": self.name,
            "release_date": self.format_release_date(self.release_date),
            "release_year": self.release_year,
            "is_licensed": self.is_licensed,
            "dlc_type": self.dlc_type,
            "banner_url": self.banner_url,
            "banner_local_path": self.banner_local_path,
        }
