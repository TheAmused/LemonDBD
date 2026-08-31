# backend/tests/unit/test_changelog_sanitize.py
import pytest
from app.utils.sanitize import sanitize_changelog_html


@pytest.mark.unit
class TestSanitizeChangelogHtml:
    """Tests for the allowlist HTML sanitizer guarding admin changelog posts."""

    def test_empty_input_returns_empty_string(self) -> None:
        assert sanitize_changelog_html("") == ""
        assert sanitize_changelog_html(None) == ""  # type: ignore[arg-type]

    def test_keeps_allowed_formatting_tags(self) -> None:
        html = "<p>Hello <b>world</b>, <i>this</i> is <u>fine</u>.</p>"
        result = sanitize_changelog_html(html)
        assert "<p>" in result
        assert "<b>world</b>" in result
        assert "<i>this</i>" in result
        assert "<u>fine</u>" in result

    def test_strips_disallowed_tags_but_keeps_text_content(self) -> None:
        html = "<script>alert(1)</script><p>Safe text</p>"
        result = sanitize_changelog_html(html)
        assert "<script>" not in result
        assert "alert(1)" not in result
        assert "Safe text" in result

    def test_strips_style_tag_and_its_css_content(self) -> None:
        html = "<style>body{display:none}</style><p>visible</p>"
        result = sanitize_changelog_html(html)
        assert "<style>" not in result
        assert "display:none" not in result
        assert "visible" in result

    def test_strips_iframe_entirely(self) -> None:
        html = '<iframe src="https://evil.example"></iframe><p>ok</p>'
        result = sanitize_changelog_html(html)
        assert "<iframe" not in result
        assert "evil.example" not in result
        assert "ok" in result

    def test_strips_img_tag_entirely(self) -> None:
        html = '<p>look</p><img src="x" onerror="alert(1)">'
        result = sanitize_changelog_html(html)
        assert "<img" not in result
        assert "onerror" not in result

    def test_strips_disallowed_attributes_like_onclick(self) -> None:
        html = '<p onclick="alert(1)">Click me</p>'
        result = sanitize_changelog_html(html)
        assert "onclick" not in result
        assert "Click me" in result

    def test_span_keeps_valid_color_style(self) -> None:
        html = '<span style="color: #ff0000;">red text</span>'
        result = sanitize_changelog_html(html)
        assert "color: #ff0000" in result
        assert "red text" in result

    def test_span_keeps_valid_rgba_background_color(self) -> None:
        html = '<span style="background-color: rgba(255, 0, 0, 0.5);">hi</span>'
        result = sanitize_changelog_html(html)
        assert "background-color: rgba(255, 0, 0, 0.5)" in result

    def test_span_strips_invalid_color_value(self) -> None:
        # A non-color value (potential injection vector) must not survive.
        html = '<span style="color: javascript:alert(1);">bad</span>'
        result = sanitize_changelog_html(html)
        assert "javascript" not in result
        assert "color:" not in result

    def test_span_strips_disallowed_style_property(self) -> None:
        # `position`/`behavior` etc. are not on span's allowlist at all.
        html = '<span style="position: fixed; color: #000000;">x</span>'
        result = sanitize_changelog_html(html)
        assert "position" not in result
        assert "color: #000000" in result

    def test_paragraph_keeps_valid_text_align(self) -> None:
        for align in ("left", "right", "center", "justify"):
            html = f'<p style="text-align: {align};">x</p>'
            result = sanitize_changelog_html(html)
            assert f"text-align: {align}" in result

    def test_paragraph_strips_invalid_text_align_value(self) -> None:
        html = '<p style="text-align: expression(alert(1));">x</p>'
        result = sanitize_changelog_html(html)
        assert "expression" not in result

    def test_paragraph_style_does_not_allow_color(self) -> None:
        # `color` is only allowed on span, not on p -- style should be dropped.
        html = '<p style="color: #ff0000;">x</p>'
        result = sanitize_changelog_html(html)
        assert "color" not in result

    def test_link_keeps_safe_http_href(self) -> None:
        html = '<a href="https://example.com">link</a>'
        result = sanitize_changelog_html(html)
        assert 'href="https://example.com"' in result

    def test_link_keeps_safe_relative_href(self) -> None:
        html = '<a href="/patch-notes">link</a>'
        result = sanitize_changelog_html(html)
        assert 'href="/patch-notes"' in result

    def test_link_strips_javascript_href(self) -> None:
        html = "<a href=\"javascript:alert(document.cookie)\">click me</a>"
        result = sanitize_changelog_html(html)
        assert "javascript:" not in result
        assert "click me" in result

    def test_link_target_blank_gets_safe_rel(self) -> None:
        html = '<a href="https://example.com" target="_blank">link</a>'
        result = sanitize_changelog_html(html)
        assert 'target="_blank"' in result
        assert 'rel="noopener noreferrer"' in result

    def test_lists_round_trip(self) -> None:
        html = "<ul><li>one</li><li>two</li></ul><ol><li>first</li></ol>"
        result = sanitize_changelog_html(html)
        assert "<ul>" in result and "<li>one</li>" in result
        assert "<ol>" in result and "<li>first</li>" in result

    def test_unbalanced_tags_are_closed_safely(self) -> None:
        # Malformed input (e.g. from a buggy contentEditable dump) must not
        # crash the parser or leak unclosed tags into the stored HTML.
        html = "<p>unclosed paragraph<b>bold text"
        result = sanitize_changelog_html(html)
        assert result.count("<p>") == result.count("</p>")
        assert result.count("<b>") == result.count("</b>")

    def test_truncates_to_max_length(self) -> None:
        html = "<p>" + ("a" * 100) + "</p>"
        result = sanitize_changelog_html(html, max_length=20)
        assert len(html[:20]) == 20
        # Result must never be built from more than max_length raw chars.
        assert len(result) <= 20 + len("<p></p>")

    def test_does_not_double_escape_entities(self) -> None:
        html = "<p>Tom &amp; Jerry</p>"
        result = sanitize_changelog_html(html)
        assert "Tom &amp; Jerry" in result
        assert "&amp;amp;" not in result

    def test_heading_and_blockquote_allowed(self) -> None:
        html = "<h3>Title</h3><blockquote>Quoted</blockquote>"
        result = sanitize_changelog_html(html)
        assert "<h3>Title</h3>" in result
        assert "<blockquote>Quoted</blockquote>" in result

    def test_br_is_self_closed_void_tag(self) -> None:
        html = "<p>line one<br>line two</p>"
        result = sanitize_changelog_html(html)
        assert "<br>" in result or "<br/>" in result or "<br />" in result
