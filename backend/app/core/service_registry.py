# backend/app/core/service_registry.py
from collections.abc import Callable
from typing import TypeVar

from flask import current_app

T = TypeVar("T")


def make_service_getter(config_key: str, service_cls: Callable[[], T]) -> Callable[[], T]:
    """Build a route-module `get_x_service()` accessor: a request-scoped
    override via `current_app.config[config_key]` (used by tests to inject a
    fake/preconfigured service) takes precedence over a lazily created,
    module-level singleton default."""
    default: T | None = None

    def get_service() -> T:
        nonlocal default
        if current_app and current_app.config.get(config_key):
            return current_app.config[config_key]
        if default is None:
            default = service_cls()
        return default

    return get_service
