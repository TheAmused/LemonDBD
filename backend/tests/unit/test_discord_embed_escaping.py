# backend/tests/unit/test_discord_embed_escaping.py
"""What a bug reporter types reaches the team's Discord as plain text, and never pings anyone."""
import pytest

from app.services.discord_webhook import bug_report_embed, escape_markdown

ZWSP = chr(0x200B)


@pytest.mark.unit
def test_masked_links_and_markdown_are_escaped() -> None:
    assert escape_markdown("[free nitro](https://evil.example)") == "\\[free nitro\\]\\(https://evil.example\\)"
    assert escape_markdown("**bold** ||spoiler|| # heading") == "\\*\\*bold\\*\\* \\|\\|spoiler\\|\\| \\# heading"


@pytest.mark.unit
def test_mentions_cannot_ping() -> None:
    assert escape_markdown("@everyone look") == f"@{ZWSP}everyone look"


@pytest.mark.unit
def test_embed_fields_escape_reporter_input() -> None:
    embed = bug_report_embed({
        "id": 1,
        "title": "[click](https://evil.example)",
        "message": "@here broken",
        "reporter_name": "a`b @everyone",
        "reporter_email": "x@example.com",
    })
    assert "\\[click\\]" in embed["title"]
    assert embed["description"].startswith(f"@{ZWSP}here")
    submitter = embed["fields"][0]["value"]
    assert submitter.startswith("`") and submitter.endswith("`") and submitter.count("`") == 2
    assert f"@{ZWSP}everyone" in submitter
