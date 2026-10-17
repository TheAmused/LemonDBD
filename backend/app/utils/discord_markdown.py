# backend/app/utils/discord_markdown.py
"""Turns a sanitised changelog post (the HTML the admin editor produces) into Discord markdown."""
import re
from html.parser import HTMLParser

_BLOCKS = {"p", "div", "ul", "ol", "blockquote"}
_HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
_MARKS = {"b": "**", "strong": "**", "i": "*", "em": "*", "u": "__", "s": "~~", "del": "~~"}


class _Converter(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self._hrefs: list[str | None] = []

    def _line_break(self) -> None:
        """Starts a new line unless one is already open, so lines written one under another stay tight."""
        if self.out and not self.out[-1].endswith("\n"):
            self.out.append("\n")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _MARKS:
            self.out.append(_MARKS[tag])
        elif tag in _HEADINGS:
            self.out.append("\n\n### ")
        elif tag in _BLOCKS:
            self._line_break()
        elif tag == "li":
            self._line_break()
            self.out.append("- ")
        elif tag == "br":
            self.out.append("\n")
        elif tag == "a":
            href = dict(attrs).get("href") or ""
            self._hrefs.append(href if href.startswith(("http://", "https://")) else None)
            self.out.append("[")

    def handle_endtag(self, tag: str) -> None:
        if tag in _MARKS:
            self.out.append(_MARKS[tag])
        elif tag in _HEADINGS:
            self.out.append("\n")
        elif tag in _BLOCKS:
            self._line_break()
        elif tag == "a" and self._hrefs:
            href = self._hrefs.pop()
            self.out.append(f"]({href})" if href else "]")

    def handle_data(self, data: str) -> None:
        self.out.append(data)


def html_to_discord(html: str, limit: int = 3500) -> str:
    """Headings become `###` titles, list items `- ` bullets, links `[text](url)`; the rest keeps its text.
    The result is cut at `limit` characters (an embed description allows 4096)."""
    parser = _Converter()
    parser.feed(html or "")
    parser.close()
    text = "".join(parser.out)
    text = re.sub(r"\[\]\(([^)]*)\)", "", text)  # a link with no text
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"
