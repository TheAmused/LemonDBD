# backend/app/routes/others/builds.py
from flask import Blueprint, jsonify, request
from app.core.service_registry import make_service_getter
from app.services.others.build_service import BuildService

builds_bp = Blueprint("builds", __name__, url_prefix="/api/v1/builds")
get_build_service = make_service_getter("BUILD_SERVICE", BuildService)


@builds_bp.route("/", methods=["GET"])
@builds_bp.route("", methods=["GET"])
def get_builds():
    role = request.args.get("role")
    category = request.args.get("category")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", "upvotes")

    service = get_build_service()
    builds = service.get_builds(role=role, category=category, search=search, sort_by=sort_by)
    return jsonify({"status": "success", "builds": builds}), 200


@builds_bp.route("/", methods=["POST"])
@builds_bp.route("", methods=["POST"])
def create_build():
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    description = data.get("description", "")
    role = data.get("role")
    category = data.get("category", "meta")
    character_id = data.get("character_id") or data.get("character", "all")
    perks = data.get("perks", [])
    author = data.get("author", "Community")

    if not title or not role:
        return jsonify({"error": "Fields 'title' and 'role' are required."}), 400

    service = get_build_service()
    try:
        build = service.create_build(
            title=title,
            description=description,
            role=role,
            category=category,
            perks=perks,
            character_id=character_id,
            author=author
        )
        return jsonify({"status": "success", "build": build}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@builds_bp.route("/<int:build_id>/upvote", methods=["POST"])
def upvote_build(build_id: int):
    service = get_build_service()
    try:
        updated_build = service.upvote_build(build_id)
        return jsonify({"status": "success", "build": updated_build}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
