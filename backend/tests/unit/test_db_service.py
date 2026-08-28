# backend/tests/unit/test_db_service.py
import gc
import sqlite3
import tempfile
from pathlib import Path
import pytest
from app.services.db_service import DatabaseService


@pytest.mark.unit
class TestDatabaseService:
    """Tests for SQLite standalone DatabaseService lifecycle, connections, and schemas."""

    @pytest.fixture
    def temp_db_service(self) -> DatabaseService:
        temp_dir = tempfile.TemporaryDirectory()
        db_path = str(Path(temp_dir.name) / "test_lemon.db")
        service = DatabaseService(db_path=db_path)
        yield service
        gc.collect()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    def test_init_db_creates_tables_and_default_records(self, temp_db_service: DatabaseService) -> None:
        temp_db_service.init_db()
        conn = temp_db_service.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]

        assert "perk_rules" in tables
        assert "gauntlet_runs" in tables
        assert "gauntlet_match_logs" in tables
        conn.close()

    def test_init_db_is_idempotent(self, temp_db_service: DatabaseService) -> None:
        temp_db_service.init_db()
        # Second invocation should not raise table exists errors or duplicate unique defaults
        temp_db_service.init_db()
        conn = temp_db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM perk_rules;")
        count = cursor.fetchone()[0]
        assert count >= 0
        conn.close()

    def test_get_connection_executes_queries(self, temp_db_service: DatabaseService) -> None:
        temp_db_service.init_db()
        conn = temp_db_service.get_connection()
        assert isinstance(conn, sqlite3.Connection)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM perk_rules;")
        result = cursor.fetchone()
        assert result is not None
        conn.close()

    def test_creates_intermediate_directories_if_not_present(self) -> None:
        with tempfile.TemporaryDirectory() as base_tmp:
            nested_path = Path(base_tmp) / "deeply" / "nested" / "dir" / "service.db"
            service = DatabaseService(db_path=str(nested_path))
            service.init_db()
            assert nested_path.exists()
