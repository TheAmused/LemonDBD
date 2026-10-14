# backend/app/core/streak_blueprint.py
from collections.abc import Callable, Sequence
from typing import Any

from flask import Blueprint, g, jsonify, request

from app.core.security import login_required
from app.utils.responses import api_error


def make_value_cleaner(valid_values: Sequence[str] | None = None) -> Callable[[str | None], str | None]:
    """Build a `_clean_<param>(value)` validator that only lets through one of `valid_values`,
    or any non-empty stripped string if valid_values is None."""
    if valid_values is None:
        def clean_any(value: str | None) -> str | None:
            if not isinstance(value, str):
                return None
            stripped = value.strip()
            return stripped if stripped else None

        return clean_any

    def clean(value: str | None) -> str | None:
        return value if value in valid_values else None

    return clean


def make_streak_blueprint(
    *,
    name: str,
    url_prefix: str,
    get_service: Callable[[], Any],
    param_name: str,
    valid_values: Sequence[str] | None = None,
    invalid_value_hint: str,
    has_reveal: bool = True,
    reveal_method: str = "reveal",
    get_run_method: str = "get_or_create_run",
    stats_requires_param: bool = True,
    game_modes: Sequence[str] | None = None,
) -> Blueprint:
    """Build the run/reveal/abandon/stats endpoints shared by every "pick a
    mode, play a streak run" challenge (gauntlet, chaos, history, page_streak).
    Each mode's `POST /result` stays hand-written in its own route module -- unlike
    these shared endpoints, it genuinely differs per mode rather than just varying by
    parameter name.

    `game_modes` opts a mode into per-variant runs: the first entry is the
    default, and the chosen `game_mode` is handed to the service as a keyword.
    """
    bp = Blueprint(name, __name__, url_prefix=url_prefix)
    clean_value = make_value_cleaner(valid_values)

    def _param_error(location: str) -> tuple[Any, int]:
        prefix = "Query parameter" if location == "query" else "Field"
        if invalid_value_hint == "required":
            return api_error(f"{prefix} '{param_name}' is required", 400)
        return api_error(f"{prefix} '{param_name}' must be {invalid_value_hint}", 400)

    def read_mode_kwargs(source: Any) -> tuple[dict[str, str], tuple[Any, int] | None]:
        if not game_modes:
            return {}, None
        game_mode = source.get("game_mode") or game_modes[0]
        if game_mode not in game_modes:
            return {}, api_error(f"'game_mode' must be one of: {', '.join(game_modes)}", 400)
        return {"game_mode": game_mode}, None

    @bp.route("/run", methods=["GET"])
    @login_required
    def get_run():
        value = clean_value(request.args.get(param_name))
        if not value:
            return _param_error("query")
        mode_kwargs, mode_error = read_mode_kwargs(request.args)
        if mode_error:
            return mode_error
        service = get_service()
        try:
            fn = getattr(service, get_run_method)
            run = fn(g.current_user.id, value, **mode_kwargs)
        except ValueError as e:
            return api_error(str(e), 400)
        return jsonify({"run": run}), 200

    if has_reveal:
        @bp.route("/reveal", methods=["POST"])
        @login_required
        def reveal():
            data = request.get_json(silent=True) or {}
            run_id = data.get("run_id")
            if not run_id:
                return api_error("Field 'run_id' is required", 400)
            service = get_service()
            try:
                run = getattr(service, reveal_method)(g.current_user.id, run_id)
            except ValueError as e:
                status = 404 if "not found" in str(e).lower() else 400
                return api_error(str(e), status)
            return jsonify({"run": run}), 200

    @bp.route("/run/abandon", methods=["POST"])
    @login_required
    def abandon_run():
        data = request.get_json(silent=True) or {}
        value = clean_value(data.get(param_name))
        if not value:
            return _param_error("field")
        mode_kwargs, mode_error = read_mode_kwargs(data)
        if mode_error:
            return mode_error
        service = get_service()
        try:
            run = service.abandon_run(g.current_user.id, value, **mode_kwargs)
        except ValueError as e:
            status = 404 if "not found" in str(e).lower() else 400
            return api_error(str(e), status)
        return jsonify({"run": run}), 200

    @bp.route("/stats", methods=["GET"])
    @login_required
    def get_stats():
        service = get_service()
        if not stats_requires_param:
            stats = service.get_stats(g.current_user.id)
            return jsonify({"stats": stats}), 200
        value = clean_value(request.args.get(param_name))
        if not value:
            return _param_error("query")
        mode_kwargs, mode_error = read_mode_kwargs(request.args)
        if mode_error:
            return mode_error
        stats = service.get_stats(g.current_user.id, value, **mode_kwargs)
        return jsonify({"stats": stats}), 200

    @bp.route("/completions", methods=["GET"])
    @login_required
    def get_completions():
        value = clean_value(request.args.get(param_name))
        if not value:
            return _param_error("query")
        mode_kwargs, mode_error = read_mode_kwargs(request.args)
        if mode_error:
            return mode_error
        service = get_service()
        completions = service.get_completions(g.current_user.id, value, **mode_kwargs)
        return jsonify({"completions": completions}), 200

    return bp

