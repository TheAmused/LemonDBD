# backend/app/core/streak_blueprint.py
from collections.abc import Callable, Sequence
from typing import Any

from flask import Blueprint, g, jsonify, request

from app.core.security import login_required


def make_value_cleaner(valid_values: Sequence[str]) -> Callable[[str | None], str | None]:
    """Build a `_clean_<param>(value)` validator that only lets through one of `valid_values`."""

    def clean(value: str | None) -> str | None:
        return value if value in valid_values else None

    return clean


def make_streak_blueprint(
    *,
    name: str,
    url_prefix: str,
    get_service: Callable[[], Any],
    param_name: str,
    valid_values: Sequence[str],
    invalid_value_hint: str,
    has_reveal: bool = True,
    reveal_method: str = "reveal",
) -> Blueprint:
    """Build the run/reveal/reset/stats endpoints shared by every "pick a
    mode, play a streak run" challenge (gauntlet, chaos, history). Each mode's
    `POST /result` stays hand-written in its own route module -- unlike these
    4 endpoints, it genuinely differs per mode (extra required fields,
    gauntlet's auto-roll-next-run behavior) rather than just varying by
    parameter name, so forcing it through a shared shape would trade real
    clarity for a false abstraction.
    """
    bp = Blueprint(name, __name__, url_prefix=url_prefix)
    clean_value = make_value_cleaner(valid_values)

    @bp.route("/run", methods=["GET"])
    @login_required
    def get_run():
        value = clean_value(request.args.get(param_name))
        if not value:
            return jsonify({"error": f"Query parameter '{param_name}' must be {invalid_value_hint}"}), 400
        service = get_service()
        try:
            run = service.get_or_create_run(g.current_user.id, value)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        return jsonify({"run": run}), 200

    if has_reveal:
        @bp.route("/reveal", methods=["POST"])
        @login_required
        def reveal():
            data = request.get_json(silent=True) or {}
            run_id = data.get("run_id")
            if not run_id:
                return jsonify({"error": "Field 'run_id' is required"}), 400
            service = get_service()
            try:
                run = getattr(service, reveal_method)(g.current_user.id, run_id)
            except ValueError as e:
                status = 404 if "not found" in str(e).lower() else 400
                return jsonify({"error": str(e)}), status
            return jsonify({"run": run}), 200

    @bp.route("/run/reset", methods=["POST"])
    @login_required
    def reset_run():
        data = request.get_json(silent=True) or {}
        value = clean_value(data.get(param_name))
        if not value:
            return jsonify({"error": f"Field '{param_name}' must be {invalid_value_hint}"}), 400
        service = get_service()
        try:
            run = service.reset_run(g.current_user.id, value)
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        return jsonify({"run": run}), 200

    @bp.route("/stats", methods=["GET"])
    @login_required
    def get_stats():
        value = clean_value(request.args.get(param_name))
        if not value:
            return jsonify({"error": f"Query parameter '{param_name}' must be {invalid_value_hint}"}), 400
        service = get_service()
        stats = service.get_stats(g.current_user.id, value)
        return jsonify({"stats": stats}), 200

    return bp
