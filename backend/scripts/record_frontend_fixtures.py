# backend/scripts/record_frontend_fixtures.py
"""Record the API answers the frontend unit tests use as fixtures.

The frontend unit tests run without a backend. Where a test checks that client
code works on what the API really returns (the perk picker on the real
catalogue, the ALTCHA solver on a real challenge), the answer is recorded here
once and committed under frontend/src/__tests__/fixtures/. Re-run this after a
change to the perk seed or to the ALTCHA format:

    cd backend
    DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/dbd_db \
        python scripts/record_frontend_fixtures.py

It only reads: GET /api/v1/perks and a smash-or-pass feed page on a seeded
database, plus a challenge made by AltchaService with a throwaway key.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from app.services.altcha_service import AltchaService  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "__tests__" / "fixtures"

# The perk fields the client-side picker reads (computeEligiblePool, perk_types predicates).
PERK_FIELDS = ("id", "name", "category", "perk_types")
# The feed fields the smash-or-pass persona reads (calculateRomancePersona).
SMASH_FIELDS = ("id", "slug", "name", "role", "gender")


def record_perks(client) -> None:
    res = client.get("/api/v1/perks?limit=500")
    assert res.status_code == 200, res.status_code
    perks = res.get_json()["data"]
    assert len(perks) >= 200, f"only {len(perks)} perks: is the database seeded?"
    rows = [{k: p.get(k) for k in PERK_FIELDS} for p in perks]
    rows.sort(key=lambda p: (p["category"], p["name"]))
    write("perksApi.json", {
        "_source": "GET /api/v1/perks?limit=500, trimmed to the fields the perk picker reads. "
                   "Re-record with backend/scripts/record_frontend_fixtures.py.",
        "data": rows,
    })


def record_smash_feed(client) -> None:
    res = client.get("/api/v1/smash-or-pass/rosters/canon/feed?limit=6", headers={"X-Session-ID": "fixture-recorder"})
    assert res.status_code == 200, res.status_code
    entities = [{k: e.get(k) for k in SMASH_FIELDS} for e in res.get_json()["data"]["entities"]]
    assert len(entities) == 6, len(entities)
    write("smashFeed.json", {
        "_source": "GET /api/v1/smash-or-pass/rosters/canon/feed?limit=6 (data.entities), trimmed to "
                   "the fields the persona calculation reads. "
                   "Re-record with backend/scripts/record_frontend_fixtures.py.",
        "entities": entities,
    })


def record_altcha() -> None:
    key = "fixture-only-key"
    challenge = AltchaService.create_challenge(key, max_number=5000, expires_in_seconds=10 * 365 * 24 * 3600)
    number = next(
        n for n in range(challenge["maxnumber"] + 1)
        if hashlib.sha256(f"{challenge['salt']}{n}".encode()).hexdigest() == challenge["challenge"]
    )
    payload = {**challenge, "number": number}
    ok, error = AltchaService.verify_solution(payload, key)
    assert ok, error
    write("altchaChallenge.json", {
        "_source": "AltchaService.create_challenge; `accepted` passed AltchaService.verify_solution. "
                   "Re-record with backend/scripts/record_frontend_fixtures.py.",
        "challenge": challenge,
        "accepted": payload,
    })


def write(name: str, data: dict) -> None:
    """One key per line, and one row per line inside lists, so a fixture stays short and diffs well."""
    def dump(value: object) -> str:
        return json.dumps(value, ensure_ascii=False)

    lines = []
    for key, value in data.items():
        if isinstance(value, list):
            rows = ",\n".join(f"    {dump(row)}" for row in value)
            lines.append(f"  {dump(key)}: [\n{rows}\n  ]")
        else:
            lines.append(f"  {dump(key)}: {dump(value)}")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text("{\n" + ",\n".join(lines) + "\n}\n", encoding="utf-8")
    print(f"wrote {OUT / name}")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        client = app.test_client()
        record_perks(client)
        record_smash_feed(client)
    record_altcha()
