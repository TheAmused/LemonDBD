# backend/app/models/character.py
"""Survivors and killers: two tables, two id spaces.

They were one `characters` table with a `role` discriminator, and that one
table had to be shaped for the union of two things it was describing:

* Seven columns -- power, movement speed, terror radius, height -- were NULL
  for every one of the 54 survivors, so `power_name` could not be NOT NULL
  where it actually belongs. An earlier pass moved them into a 1:1
  `killer_profiles` child, which fixed the nullability at the cost of a join
  and a second row per killer. Splitting the parent removes both: the columns
  sit on `killers`, NOT NULL, with no child table at all.
* `role` was the polymorphic discriminator, so a typo produced an unmapped
  identity at query time rather than a constraint violation at write time.
  There is no discriminator now -- the table is the role.
* `release_number` was, for all 98 rows, the character's position *within its
  role* (survivors 1-54, killers 1-44). With one table per role that is the
  primary key, so it is derived rather than stored, and `to_dict` keeps
  emitting it.

Identity: survivors keep ids 1-54 exactly as they were; killers are renumbered
1-44, which is their old id minus the 54 survivors ahead of them -- and also
exactly their old `release_number`. Names are unique across both tables (no
survivor shares a name with a killer), so `/characters/<name>/detail` stays
unambiguous.
"""
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from app.core.extensions import Base
from app.models.base import utcnow
from app.models.chapter import dlc_type_label

if TYPE_CHECKING:
    from app.models.chapter import Chapter
    from app.models.equipment import KillerAddon
    from app.models.perk import Perk

#: The two roles. No longer a stored discriminator anywhere on these tables --
#: `Survivor.role` and `Killer.role` are constants -- but the API still returns
#: it, and `perks.role` still stores it, because a perk can belong to a role
#: without belonging to a character.
SURVIVOR_ROLE = "Survivor"
KILLER_ROLE = "Killer"
CHARACTER_ROLES = (SURVIVOR_ROLE, KILLER_ROLE)

#: Killer stature, a closed set in the source data.
KILLER_HEIGHTS = ("Short", "Average", "Tall")

#: Survivor running speed. Every killer's "%" figure is their speed measured
#: against this, which is why `movement_speed_percent` never needed storing.
_SURVIVOR_BASE_SPEED = Decimal("4.0")


def _decimal_str(value: Decimal | float | None) -> str:
    """Render a NUMERIC without trailing zeros: 4.60 -> "4.6", 96.25 -> "96.25"."""
    if value is None:
        return ""
    return format(Decimal(str(value)).normalize(), "f")


class _CharacterMixin:
    """Everything a survivor and a killer genuinely have in common.

    A mixin, not a base table: the two tables are independent, with their own
    primary keys and their own sequences. Nothing here is polymorphic and no
    query spans both tables implicitly -- a caller that wants the combined
    roster asks for it.
    """

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    portrait_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    real_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disabled_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lore: Mapped[str | None] = mapped_column(Text, nullable=True)
    # When this row was first created, not the in-game release date -- lets
    # "how many killers/survivors existed in the game at time X" be answered
    # honestly for players whose owned roster was fixed before X.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    @declared_attr
    def chapter_id(cls) -> Mapped[int]:
        # NOT NULL on both tables: all 98 characters resolve to a chapter,
        # Base Game included.
        return mapped_column(
            ForeignKey("chapters.id", ondelete="RESTRICT"), nullable=False, index=True
        )

    @declared_attr
    def translations(cls) -> Mapped[dict[str, Any] | None]:
        return mapped_column(
            JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
        )

    #: "Survivor" or "Killer". A constant per table rather than a column.
    role: str = ""

    @property
    def release_number(self) -> int:
        """Position within the role.

        Was a stored column that equalled this for all 98 rows, because the
        source numbered survivors and killers separately -- which is what the
        primary key now is.
        """
        return self.id

    @property
    def code_prefix(self) -> str:
        """`S01`, `K12`: the role's initial plus the release number."""
        return f"{self.role[0].upper()}{self.id:02d}"

    @property
    def dlc_counterparts(self) -> list[str]:
        """Other characters released in the same chapter.

        Derived, not stored -- the column held exactly this. The base game is
        not a DLC bundle, so its seven characters have no counterparts.
        """
        chapter = self.chapter
        if not chapter or chapter.dlc_type == "base_game":
            return []
        return [
            c.name
            for c in (*chapter.survivors, *chapter.killers)
            if not (type(c) is type(self) and c.id == self.id)
        ]

    def localized(self, lang: str | None, field: str, fallback: str) -> str:
        if lang and self.translations:
            trans = self.translations.get(lang)
            if isinstance(trans, dict) and trans.get(field):
                return str(trans[field])
        return fallback

    def _base_dict(self, lang: str | None = None) -> dict[str, Any]:
        chapter = self.chapter
        return {
            "id": self.id,
            "name": self.localized(lang, "name", self.name),
            "role": self.role,
            "category": self.role,
            "code_prefix": self.code_prefix,
            "portrait_url": self.portrait_url,
            "real_name": self.real_name or self.name,
            "avatar_url": self.portrait_url or "",
            "avatar_local_path": self.avatar_local_path or "",
            "release_number": self.release_number,
            "chapter_id": self.chapter_id,
            "chapter_name": chapter.localized_name(lang) if chapter else "Base Game",
            "dlc_type": dlc_type_label(chapter.dlc_type if chapter else None),
            "is_licensed": bool(chapter.is_licensed) if chapter else False,
            "is_disabled": bool(self.is_disabled),
            "disabled_reason": self.disabled_reason,
            "release_year": (chapter.release_year if chapter else None) or 2016,
            "release_date": chapter.format_release_date(chapter.release_date) if chapter else "",
            "dlc_counterparts": self.dlc_counterparts,
            "lore": self.localized(lang, "lore", self.lore or ""),
            "translations": self.translations or {},
        }


class Survivor(Base, _CharacterMixin):
    """A playable survivor. Ids 1-54, unchanged from the old `characters` table."""

    __tablename__ = "survivors"

    role = SURVIVOR_ROLE

    chapter: Mapped["Chapter"] = relationship(back_populates="survivors", lazy="joined")

    # Default (lazy) loading: every real reader of `.perks` opts in with
    # `joinedload` at its own query site, so eager-loading here was pure cost
    # for the ownership summary, admin lists and translation sync. Cascade
    # delete is unaffected -- it only needs the collection at flush time.
    perks: Mapped[list["Perk"]] = relationship(
        back_populates="survivor", cascade="all, delete-orphan"
    )

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        return self._base_dict(lang)


class Killer(Base, _CharacterMixin):
    """A playable killer, with the power statistics that are only ever theirs.

    These seven columns used to live on `characters`, NULL for all 54
    survivors, and then in a 1:1 `killer_profiles` child. Here they are plain
    columns on the only table they were ever about, and `power_name` is finally
    NOT NULL: every one of the 44 killers has a power, and no survivor ever
    did.

    `movement_speed` and `terror_radius` arrive as display strings
    ("4.6 m/s (115%)", "32 metres"). The speed is fully structured, so it is
    stored as one number and rendered back -- the percentage is
    `movement_speed_ms / 4.0 * 100` exactly, for all 44. The terror radius is
    not structured: five killers have mode-dependent radii ("32m (Stalker Mode)
    16m (Pursuer Mode)") that no single number expresses, so the display string
    is kept alongside the sortable `terror_radius_meters`.
    """

    __tablename__ = "killers"
    __table_args__ = (
        CheckConstraint(
            "height IS NULL OR height IN ('Short', 'Average', 'Tall')",
            name="ck_killers_height",
        ),
        CheckConstraint(
            "terror_radius_meters IS NULL OR terror_radius_meters >= 0",
            name="ck_killers_terror_radius_meters",
        ),
        CheckConstraint(
            "movement_speed_ms IS NULL OR movement_speed_ms > 0",
            name="ck_killers_movement_speed_ms",
        ),
    )

    role = KILLER_ROLE

    power_name: Mapped[str] = mapped_column(String(150), nullable=False)
    power_description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    power_icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    power_icon_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    movement_speed_ms: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)

    terror_radius: Mapped[str | None] = mapped_column(String(150), nullable=True)
    terror_radius_meters: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    height: Mapped[str | None] = mapped_column(String(20), nullable=True)

    chapter: Mapped["Chapter"] = relationship(back_populates="killers", lazy="joined")

    perks: Mapped[list["Perk"]] = relationship(
        back_populates="killer", cascade="all, delete-orphan"
    )

    # Killer add-ons. Previously reachable only by fuzzy-matching
    # `addons.associated_target` against this killer's name, real name, wiki
    # slug, short name and power name -- in Python, over all 880 killer
    # add-ons, on every request.
    addons: Mapped[list["KillerAddon"]] = relationship(
        back_populates="killer", cascade="all, delete-orphan"
    )

    @property
    def movement_speed_percent(self) -> Decimal | None:
        """Speed as a percentage of the 4.0 m/s survivor baseline.

        This was a stored column. It is `movement_speed_ms / 4.0 * 100`
        exactly -- for all 44 killers, including the awkward 3.85 -> 96.25 --
        so it was a second copy of the same number.
        """
        if self.movement_speed_ms is None:
            return None
        return (Decimal(str(self.movement_speed_ms)) / _SURVIVOR_BASE_SPEED) * 100

    @property
    def movement_speed(self) -> str:
        """Display form: `4.6 m/s (115%)`. Round-trips all four speeds in use."""
        if self.movement_speed_ms is None:
            return ""
        return (
            f"{_decimal_str(self.movement_speed_ms)} m/s "
            f"({_decimal_str(self.movement_speed_percent)}%)"
        )

    def power_dict(self, lang: str | None = None) -> dict[str, Any]:
        return {
            "name": self.localized(lang, "power_name", self.power_name),
            "description": self.localized(lang, "power_description", self.power_description),
            "icon_url": self.power_icon_url or "",
            "icon_local_path": self.power_icon_local_path or "",
            "movement_speed": self.movement_speed or "4.6 m/s (115%)",
            "terror_radius": self.terror_radius or "32 m",
            "terror_radius_meters": self.terror_radius_meters or 32,
            "height": self.height or "Tall",
        }

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        data = self._base_dict(lang)
        data["power"] = self.power_dict(lang)
        return data
