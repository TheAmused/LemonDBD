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
    orjson = None  # type: ignore
    HAS_ORJSON = False


class ORJSONProvider(DefaultJSONProvider):
    """
    High-performance JSON provider for Flask using orjson (Rust-backed).
    Provides 3x-10x faster serialization for large payload responses
    such as perk datasets, character powers, and i18n dictionaries.
    """

    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, set):
            return list(obj)
        if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
            return dataclasses.asdict(obj)
        if hasattr(obj, "to_dict") and callable(obj.to_dict):
            return obj.to_dict()
        return super().default(obj)

    def dumps(self, obj: Any, **kwargs: Any) -> str:
        if not HAS_ORJSON:
            return super().dumps(obj, **kwargs)

        # orjson options for maximum compatibility and performance
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
