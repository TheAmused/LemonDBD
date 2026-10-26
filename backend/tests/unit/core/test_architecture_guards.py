# backend/tests/unit/core/test_architecture_guards.py
#
# Architectural integrity guards: blueprint registration uniqueness,
# scheduler decoupling, and database connection pool allocation.
import pytest
from flask import Flask
from app.core.config import Config


@pytest.mark.unit
class TestArchitectureGuards:
    """Guards ensuring backend architectural boundaries and configuration limits."""

    def test_unique_blueprint_registration(self, app: Flask) -> None:
        """Every registered blueprint must have a distinct name; no duplicate or alias registrations."""
        blueprint_names = list(app.blueprints.keys())
        assert len(blueprint_names) == len(set(blueprint_names)), (
            f"Duplicate blueprints detected: {blueprint_names}"
        )
        assert "smash_alias" not in app.blueprints, (
            "smash_alias duplicate blueprint must remain eradicated"
        )

    def test_database_connection_pool_bounds(self) -> None:
        """Connection pool size + overflow must leave headroom for external services (Umami, pgAdmin)."""
        engine_opts = Config.SQLALCHEMY_ENGINE_OPTIONS
        pool_size = engine_opts.get("pool_size", 10)
        max_overflow = engine_opts.get("max_overflow", 5)
        total_connections_per_worker = pool_size + max_overflow

        assert total_connections_per_worker <= 20, (
            f"Per-worker DB connection allocation ({total_connections_per_worker}) exceeds safe limit (20)."
        )

    def test_scheduler_runner_script_exists(self) -> None:
        """Standalone scheduler runner must exist for decoupled execution."""
        from pathlib import Path
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        scheduler_script = backend_dir / "scripts" / "run_scheduler.py"
        assert scheduler_script.exists(), "scripts/run_scheduler.py must exist"

    def test_scheduler_disabled_in_testing(self, app: Flask) -> None:
        """Scheduler must be disabled in test / worker environments when SCHEDULER_ENABLED=False."""
        assert app.config.get("SCHEDULER_ENABLED") is False, (
            "SCHEDULER_ENABLED must be False in test configuration to avoid background threads"
        )
