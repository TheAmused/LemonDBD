# backend/tests/unit/test_discord_markdown.py
import pytest

from app.utils.discord_markdown import html_to_discord


@pytest.mark.unit
class TestHtmlToDiscord:
    def test_heading_becomes_a_bold_line_and_items_become_bullets(self) -> None:
        text = html_to_discord("<h3>Bug-fix</h3><ul><li>One</li><li>Two</li></ul>")
        assert text == "**Bug-fix**\n\n\u2022 One\n\u2022 Two"

    def test_inline_marks_and_links(self) -> None:
        text = html_to_discord('<p><b>Bold</b> <i>it</i> <a href="https://x.dev/a">site</a></p>')
        assert text == "**Bold** *it* [site](https://x.dev/a)"

    def test_unsafe_link_keeps_only_its_text(self) -> None:
        assert html_to_discord('<p><a href="javascript:alert(1)">click</a></p>') == "[click]"

    def test_long_text_is_cut_with_an_ellipsis(self) -> None:
        text = html_to_discord("<p>" + "a" * 5000 + "</p>", limit=100)
        assert len(text) == 100
        assert text.endswith("\u2026")

    def test_empty_input(self) -> None:
        assert html_to_discord("") == ""
