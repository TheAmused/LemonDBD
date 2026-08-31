# backend/app/utils/sanitize.py
"""
Minimal allowlist HTML sanitizer for admin-authored changelog posts.

The changelog WYSIWYG editor (frontend) only ever emits a small, known set of
tags/attributes (bold/italic/underline, colored/highlighted spans, aligned
paragraphs, lists, links, line breaks). Rather than pull in an extra
third-party dependency, we sanitize with the standard-library html.parser:
anything not on the allowlist is dropped (its text content is kept, its tag
is discarded), and every attribute value is validated before being
re-emitted. This is intentionally strict -- it is not a general-purpose HTML
sanitizer.
"""
from __future__ import annotations

import re
from html import escape, unescape
from html.parser import HTMLParser

_ALLOWED_TAGS = {
    "p", "div", "br", "b", "strong", "i", "em", "u", "s", "span",
    "ul", "ol", "li", "h3", "h4", "blockquote", "a",
}

# void elements never need a closing tag
_VOID_TAGS = {"br"}

# Tags whose *content* is never safe or meaningful to surface as visible
# text -- script/style source, or markup meant to be interpreted by the
# browser as something other than a text node. Dropping only the wrapper
# tag (the default behavior for anything off the allowlist) would still
# leak this content into the rendered post as stray escaped text; these
# tags must have their entire subtree discarded instead.
_STRIP_CONTENT_TAGS = {"script", "style", "noscript", "template", "iframe", "object", "embed"}

# Which inline-style properties are permitted per tag. Anything else in a
# `style` attribute is dropped, tag by tag, property by property -- this
# blocks style-based XSS vectors (url(), expression(), javascript:, etc.)
# while still letting the WYSIWYG editor's color/highlight/alignment tools
# round-trip through the database.
_TAG_STYLE_PROPS: dict[str, set[str]] = {
    "span": {"color", "background-color"},
    "p": {"text-align"},
    "div": {"text-align"},
    "h3": {"text-align"},
    "h4": {"text-align"},
    "li": {"text-align"},
    "ul": {"text-align"},
    "ol": {"text-align"},
    "blockquote": {"text-align"},
}

_COLOR_VALUE_RE = re.compile(
    r"^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\))$"
)
_ALIGN_VALUE_RE = re.compile(r"^(left|right|center|justify)$")

_PROPERTY_VALIDATORS = {
    "color": _COLOR_VALUE_RE,
    "background-color": _COLOR_VALUE_RE,
    "text-align": _ALIGN_VALUE_RE,
}

_SAFE_HREF_RE = re.compile(r"^(https?://|/)", re.IGNORECASE)


def _sanitize_style(tag: str, raw_style: str) -> str:
    allowed_props = _TAG_STYLE_PROPS.get(tag)
    if not allowed_props:
        return ""

    kept: list[str] = []
    for decl in raw_style.split(";"):
        if ":" not in decl:
            continue
        prop, _, value = decl.partition(":")
        prop = prop.strip().lower()
        value = value.strip()
        if prop not in allowed_props:
            continue
        validator = _PROPERTY_VALIDATORS.get(prop)
        if not validator or not validator.match(value):
            continue
        kept.append(f"{prop}: {value}")

    return "; ".join(kept)


def _clean_attrs(tag: str, attrs: list[tuple[str, str | None]]) -> str:
    parts = []
    for name, value in attrs:
        value = value or ""
        if name == "style":
            cleaned = _sanitize_style(tag, value)
            if cleaned:
                parts.append(f' style="{escape(cleaned, quote=True)}"')
        elif tag == "a" and name == "href" and _SAFE_HREF_RE.match(value.strip()):
            parts.append(f' href="{escape(value.strip(), quote=True)}"')
        elif tag == "a" and name == "target" and value == "_blank":
            parts.append(' target="_blank" rel="noopener noreferrer"')
    return "".join(parts)


class _ChangelogSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self._open_stack: list[str] = []
        # Depth counter for nested _STRIP_CONTENT_TAGS regions currently
        # being discarded (tag, attrs, and any text/markup inside).
        self._stripping_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _STRIP_CONTENT_TAGS:
            self._stripping_depth += 1
            return
        if self._stripping_depth:
            return
        if tag not in _ALLOWED_TAGS:
            return
        attr_str = _clean_attrs(tag, attrs)
        self.out.append(f"<{tag}{attr_str}>")
        if tag not in _VOID_TAGS:
            self._open_stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _STRIP_CONTENT_TAGS or self._stripping_depth:
            return
        if tag not in _ALLOWED_TAGS:
            return
        attr_str = _clean_attrs(tag, attrs)
        self.out.append(f"<{tag}{attr_str} />")

    def handle_endtag(self, tag: str) -> None:
        if tag in _STRIP_CONTENT_TAGS:
            if self._stripping_depth:
                self._stripping_depth -= 1
            return
        if self._stripping_depth:
            return
        if tag not in _ALLOWED_TAGS or tag in _VOID_TAGS:
            return
        if tag in self._open_stack:
            # close any unbalanced tags opened after this one first
            while self._open_stack and self._open_stack[-1] != tag:
                self.out.append(f"</{self._open_stack.pop()}>")
            if self._open_stack:
                self._open_stack.pop()
            self.out.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self._stripping_depth:
            return
        self.out.append(escape(data))

    def close(self) -> None:
        super().close()
        while self._open_stack:
            self.out.append(f"</{self._open_stack.pop()}>")


def sanitize_changelog_html(raw_html: str, max_length: int = 20000) -> str:
    """Strips any tag/attribute/style not on the changelog editor's allowlist."""
    if not raw_html:
        return ""
    raw_html = unescape(raw_html)[:max_length]
    parser = _ChangelogSanitizer()
    parser.feed(raw_html)
    parser.close()
    return "".join(parser.out).strip()
