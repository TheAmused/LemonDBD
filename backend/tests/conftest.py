# backend/tests/conftest.py
import os
import pytest

def pytest_configure(config):
    config.addinivalue_line("markers", "unit: mark test as unit test (SQLite memory)")
    config.addinivalue_line("markers", "live: mark test as live test (PostgreSQL clone)")
    config.addinivalue_line("markers", "workflow: mark test as multi-step E2E workflow test")
