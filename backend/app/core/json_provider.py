# backend/app/core/json_provider.py
import dataclasses
from datetime import date, datetime
from typing import Any
from uuid import UUID
from flask.json.provider import DefaultJSONProvider

try:
    import orjson
    HAS_ORJSON = True
except ImportError:
    import json
    orjson = None  # type: ignore
    HAS_ORJSON = False


def safe_json_loads(val: str | bytes | None, default: Any = None) -> Any:
    """Safely deserialize JSON string or bytes using orjson with fallback."""
    if not val:
        return default
    try:
        if HAS_ORJSON:
            return orjson.loads(val)
        return json.loads(val)
    except Exception:
        return default


def safe_json_dumps(val: Any, default_val: str = "{}") -> str:
    """Safely serialize Python object to JSON string using orjson with fallback."""
    try:
        if HAS_ORJSON:
            return orjson.dumps(val).decode("utf-8")
        return json.dumps(val)
    except Exception:
        return default_val


class ORJSONProvider(DefaultJSONProvider):
    """High-performance JSON provider for Flask using Rust-backed orjson serialization."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, set):
            return list(obj)
        if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
            return dataclasses.asdict(obj)
        if hasattr(obj, "model_dump") and callable(obj.model_dump):
            return obj.model_dump()
        if hasattr(obj, "to_dict") and callable(obj.to_dict):
            return obj.to_dict()
        return super().default(obj)

    def dumps(self, obj: Any, **kwargs: Any) -> str:
        if not HAS_ORJSON:
            return super().dumps(obj, **kwargs)

        options = (
            orjson.OPT_NON_STR_KEYS
            | orjson.OPT_SERIALIZE_NUMPY
            | orjson.OPT_SERIALIZE_DATACLASS
            | orjson.OPT_PASSTHROUGH_DATETIME
        )
        return orjson.dumps(obj, default=self.default, option=options).decode("utf-8")

    def loads(self, s: str | bytes, **kwargs: Any) -> Any:
        if not HAS_ORJSON:
            return super().loads(s, **kwargs)
        return orjson.loads(s)
