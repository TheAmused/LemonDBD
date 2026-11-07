# backend/app/models/challenge_mixins.py
"""Columns shared by the challenge run and match log tables. `sort_order`
keeps `id` and the foreign key first in a newly created table."""
from datetime import datetime
from typing import ClassVar

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.models.base import utcnow


class ChallengeRunMixin:
    """One player's run in a challenge mode: gauntlet, chaos, history, page streak."""

    id: Mapped[int] = mapped_column(primary_key=True, sort_order=-2)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, sort_order=-1
    )
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class RetryableRunMixin(ChallengeRunMixin):
    """A run that counts its failed attempts until completion, and numbers the attempts it has played.

    `attempts` is what the player sees and starts over after each completion, so a
    replay can try for a better result. `attempt` only ever grows: it is the group
    every match log is filed under, so history survives abandoning and replaying.
    """

    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    #: Lifetime results, kept on the run because old match logs are pruned (see `match_log_retention`).
    total_wins: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    total_losses: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    #: Matches since the run began or was last completed; starts over with `attempts`.
    playthrough_matches: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    #: Matches played in the current attempt. An attempt only counts once it has one: opening the page or
    #: pressing reset on an untouched attempt starts nothing.
    attempt_matches: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    @property
    def attempt_started(self) -> bool:
        """Whether the attempt in play counts yet. By default it does once a match was played in it."""
        return self.attempt_matches > 0

    def record_match(self, result: str, attempt: int) -> None:
        """Count a match of `attempt`. A match that ended its attempt is recorded after the run moved on to the
        next one, and belongs to the old one, so it must not make the new attempt look started."""
        if result == "win":
            self.total_wins += 1
        else:
            self.total_losses += 1
        self.playthrough_matches += 1
        if attempt == self.attempt:
            self.attempt_matches += 1

    def finish_playthrough(self) -> None:
        """The run was completed: the next playthrough counts its attempts and matches from zero."""
        self.attempts = 0
        self.playthrough_matches = 0

    def start_new_attempt(self) -> None:
        """A failed attempt: count it, and file the next matches under a new group."""
        self.attempts += 1
        self.attempt += 1
        self.attempt_matches = 0

    def abandon_attempt(self) -> None:
        """The player gives the run up. A finished run already started its attempt count over, so only a run in play counts it,
        and only if it got to play a match: giving up an untouched attempt leaves the count where it was."""
        if self.status == "completed":
            self.attempt += 1
        elif self.attempt_started:
            self.start_new_attempt()
        self.attempt_matches = 0
        self.playthrough_matches = 0


class StreakRunMixin(RetryableRunMixin):
    """A win streak with checkpoints: gauntlet and chaos."""

    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class MatchLogMixin:
    """One recorded match of a run; `__run_table__` names the run table it belongs to."""

    __run_table__: ClassVar[str]

    id: Mapped[int] = mapped_column(primary_key=True, sort_order=-2)

    @declared_attr
    def run_id(cls) -> Mapped[int]:
        return mapped_column(
            ForeignKey(f"{cls.__run_table__}.id", ondelete="CASCADE"), nullable=False, index=True, sort_order=-1
        )

    #: The run's `attempt` when the match was played, so a match that ends an attempt stays in it.
    attempt: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)


class StreakLogMixin(MatchLogMixin):
    """A match that moved a streak counter: gauntlet, chaos, history."""

    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
