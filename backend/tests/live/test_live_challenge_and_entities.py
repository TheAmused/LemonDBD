# backend/tests/live/test_live_challenge_and_entities.py
import uuid
import pytest
from flask import Flask
from sqlalchemy import select
from app.core.extensions import db
from app.models.chaos import ChaosMatchLog, ChaosRun
from app.models.gauntlet import GauntletMatchLog, GauntletRun
from app.models.history import HistoryMatchLog, HistoryRun
from app.models.page_streak import PageStreakPageLog, PageStreakRun
from app.models.smash_or_pass import Entity, EntityStat, Roster, Vote
from app.models.user import User
from app.services.user_service import UserService


@pytest.mark.live
class TestLiveChallengesAndEntities:
    """Tests for complex challenge runs, match logs, cascades, and Smash or Pass pipeline in PostgreSQL."""

    def test_gauntlet_run_and_match_log_cascade(self, live_app: Flask) -> None:
        with live_app.app_context():
            user_service = UserService()
            username = "gauntlet_runner_live"
            user = db.session.scalars(select(User).where(User.username == username)).first()
            if not user:
                user, _ = user_service.register_user(
                    username=username,
                    email="runner@example.com",
                    password="RunnerPassword123!",
                    role="user",
                )
                user.is_verified = True
                db.session.commit()

            existing_run = db.session.scalars(
                select(GauntletRun).where(
                    GauntletRun.user_id == user.id,
                    GauntletRun.role == "Killer",
                    GauntletRun.game_mode == "original",
                )
            ).first()
            if existing_run:
                db.session.delete(existing_run)
                db.session.commit()

            run = GauntletRun(
                user_id=user.id,
                role="Killer",
                game_mode="original",
                status="in_progress",
                current_character_id="the_trapper",
                current_streak=0,
                best_streak=0,
            )
            db.session.add(run)
            db.session.flush()

            log = GauntletMatchLog(
                run_id=run.id,
                role="Killer",
                character_id="the_trapper",
                result="win",
                perks_json='["Agitation", "Brutal Strength"]',
                streak_before=0,
                streak_after=1,
            )
            run.current_streak = 1
            run.best_streak = 1
            run.completed_characters_json = '["the_trapper"]'
            db.session.add(log)
            db.session.commit()

            reloaded_run = db.session.get(GauntletRun, run.id)
            assert reloaded_run is not None
            assert reloaded_run.current_streak == 1
            assert len(reloaded_run.match_logs) == 1
            assert reloaded_run.match_logs[0].result == "win"

    def test_chaos_and_history_streak_live_persistence(self, live_app: Flask) -> None:
        with live_app.app_context():
            user_service = UserService()
            username = "challenge_poly_live"
            user = db.session.scalars(select(User).where(User.username == username)).first()
            if not user:
                user, _ = user_service.register_user(
                    username=username,
                    email="poly@example.com",
                    password="PolyPassword123!",
                    role="user",
                )
                user.is_verified = True
                db.session.commit()

            chaos = ChaosRun(
                user_id=user.id,
                difficulty="hell",
                status="in_progress",
                current_streak=2,
                best_streak=2,
            )
            db.session.add(chaos)
            db.session.flush()

            c_log = ChaosMatchLog(
                run_id=chaos.id,
                killer_id="The Trapper",
                result="win",
                streak_before=1,
                streak_after=2,
                perks_json="[]",
                addon_rarities_json="[]",
            )
            db.session.add(c_log)

            history = HistoryRun(
                user_id=user.id,
                mode="hell",
                status="in_progress",
                current_row_index=1,
                total_killers_beaten=5,
            )
            db.session.add(history)
            db.session.flush()

            h_log = HistoryMatchLog(
                run_id=history.id,
                killer_id="The Wraith",
                result="win",
                row_index=0,
                streak_before=4,
                streak_after=5,
            )
            db.session.add(h_log)
            db.session.commit()

            reloaded_chaos = db.session.get(ChaosRun, chaos.id)
            assert reloaded_chaos is not None
            assert reloaded_chaos.current_streak == 2

            reloaded_history = db.session.get(HistoryRun, history.id)
            assert reloaded_history is not None
            assert reloaded_history.total_killers_beaten == 5

    def test_smash_or_pass_roster_entity_and_vote_pipeline(self, live_app: Flask) -> None:
        with live_app.app_context():
            roster_slug = f"test_roster_{uuid.uuid4().hex[:8]}"
            roster = Roster(
                slug=roster_slug,
                name_i18n_key="roster.test.name",
                description_i18n_key="roster.test.desc",
                category="DBD",
                is_active=True,
            )
            db.session.add(roster)
            db.session.flush()

            entity_slug = f"entity_{uuid.uuid4().hex[:8]}"
            entity = Entity(
                roster_id=roster.id,
                slug=entity_slug,
                name="Sable Ward",
                role="Survivor",
                gender="female",
                order_index=1,
                is_active=True,
            )
            db.session.add(entity)
            db.session.flush()

            stat = EntityStat(
                entity_id=entity.id,
                smash_count=0,
                pass_count=0,
                super_smash_count=0,
            )
            db.session.add(stat)
            db.session.flush()

            vote1 = Vote(entity_id=entity.id, vote_type="smash", session_id="sess_alpha")
            vote2 = Vote(entity_id=entity.id, vote_type="super_smash", session_id="sess_beta")
            vote3 = Vote(entity_id=entity.id, vote_type="pass", session_id="sess_gamma")
            db.session.add_all([vote1, vote2, vote3])

            stat.smash_count += 1
            stat.super_smash_count += 1
            stat.pass_count += 1
            stat.calculate_rate()
            db.session.commit()

            reloaded_stat = db.session.scalars(
                select(EntityStat).where(EntityStat.entity_id == entity.id)
            ).one()
            assert reloaded_stat.total_votes == 3
            assert reloaded_stat.smash_rate == 66.7
            assert len(entity.votes) == 3
