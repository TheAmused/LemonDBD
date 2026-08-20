# backend/app/scrapers/utils.py
import html
import re
import unicodedata
from typing import Optional, Tuple
from urllib.parse import unquote
from bs4 import Tag

PORTRAIT_REGEX = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)
YEAR_REGEX = re.compile(r"\b(201[6-9]|202[0-9]|203[0-9])\b")
TERROR_RADIUS_NUM_REGEX = re.compile(r"(\d+)\s*m(?:etre|eter)?s?", re.IGNORECASE)


def classify_portrait(image_url: str) -> Optional[Tuple[str, int]]:
    if not image_url:
        return None
    filename = image_url.split("/revision")[0].rstrip("/").split("/")[-1]
    match = PORTRAIT_REGEX.match(filename)
    if not match:
        return None
    role_letter = match.group(1)
    if role_letter not in ("K", "S"):
        return None
    role = "Killer" if role_letter == "K" else "Survivor"
    try:
        rel_num = int(match.group(2))
    except ValueError:
        rel_num = 0
    return role, rel_num


def normalise_character_name(name: str, category: str = "") -> str:
    if not name:
        return ""
    clean_name = name.strip()
    if category.lower() == "killer" and clean_name.lower().startswith("the "):
        return clean_name[4:].strip()
    return clean_name


def normalize_name_key(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    normalized = normalized.lower().strip()
    # Replace ALL non-alphanumeric characters (colons, apostrophes, hyphens, quotes) with spaces
    normalized = re.sub(r"[^a-z0-9]", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def clean_description_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""

    cleaned = re.sub(r"<[^>]+>", "", text)
    cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
    cleaned = html.unescape(cleaned)

    cleaned = cleaned.replace("\ufffd", '"')
    cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
    cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)

    cleaned = re.sub(
        r"(\d+)(?:\s*/\s*(\d+))+",
        lambda m: re.sub(r"\s*/\s*", "/", m.group(0)),
        cleaned,
    )
    cleaned = re.sub(r"(\d+)\s+(%)", r"\1\2", cleaned)
    cleaned = re.sub(r"(\d+)\s+(s|m)\b(?!\w)", r"\1\2", cleaned)

    cleaned = re.sub(
        r"This description is based on the changes announced for or featured in the upcoming Patch\s*[\d.]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"Unable to retrieve the Perk description.*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    if not lines:
        return ""

    if len(lines) > 2 and lines[-1].lower() == lines[0].lower():
        lines = lines[:-1]

    filtered_lines = [l for l in lines if l.lower() not in ["survivor", "killer", "survivor perk", "killer perk"]]
    return "\n".join(filtered_lines).strip()


def extract_cell_markdown_text(cell_tag: Optional[Tag]) -> str:
    """Converts a MediaWiki table cell containing rich text, lists, and quotes into clean markdown."""
    if not cell_tag:
        return ""
    from bs4 import BeautifulSoup
    cell_copy = BeautifulSoup(str(cell_tag), "html.parser")
    for icon_link in cell_copy.find_all(class_="iconLink"):
        icon_link.decompose()
    for li in cell_copy.find_all("li"):
        li.replace_with(f"\n* {li.get_text().strip()}\n")
    for br in cell_copy.find_all("br"):
        br.replace_with("\n")
    for p in cell_copy.find_all("p"):
        p.replace_with(f"\n{p.get_text().strip()}\n")
    for div in cell_copy.find_all("div"):
        div.replace_with(f"\n{div.get_text().strip()}\n")

    raw_text = cell_copy.get_text()
    return clean_description_text(raw_text)


def sanitize_filename(name: str) -> str:
    clean_str = name.lower().strip()
    clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
    clean_str = re.sub(r'[\\/*?:"<>|®™\']', "", clean_str)
    clean_str = re.sub(r"_+", "_", clean_str)
    return clean_str.strip("_")


def extract_high_res_url(img_tag: Optional[Tag], base_domain: str = "https://deadbydaylight.wiki.gg") -> str:
    if not img_tag:
        return ""
    raw_url = (
        img_tag.get("data-src")
        or img_tag.get("src")
        or img_tag.get("data-srcset")
        or ""
    )
    if not raw_url:
        return ""

    if "," in raw_url:
        raw_url = raw_url.split(",")[-1].strip().split()[0]

    if raw_url.startswith("//"):
        raw_url = f"https:{raw_url}"
    elif raw_url.startswith("/"):
        raw_url = f"{base_domain.rstrip('/')}{raw_url}"

    if "/images/thumb/" in raw_url:
        match = re.search(r"/images/thumb/([0-9a-f]/[0-9a-f]{2}/[^/]+)/", raw_url)
        if match:
            raw_url = f"{base_domain.rstrip('/')}/images/{match.group(1)}"
        else:
            raw_url = raw_url.replace("/thumb", "")
            raw_url = re.sub(r"/\d+px-[^/]+$", "", raw_url)

    raw_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
    if "/revision/latest" in raw_url:
        raw_url = raw_url.split("/revision/latest")[0] + "/revision/latest"

    return raw_url


def extract_slug_from_href(href: str) -> str:
    if not href or "/wiki/" not in href:
        return ""
    raw_slug = href.split("/wiki/")[-1].split("#")[0].split("?")[0]
    return unquote(raw_slug).strip()