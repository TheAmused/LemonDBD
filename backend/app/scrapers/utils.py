import html
import re
import unicodedata
from typing import Optional, Tuple
from urllib.parse import unquote
from bs4 import Tag
from app.scrapers.constants_wikigg import PORTRAIT_PATTERN


def normalize_name_key(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    normalized = normalized.lower().strip()
    normalized = re.sub(r'["\'\.\-–_]', " ", normalized)
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

    cleaned = re.sub(
        r'^[A-Za-z0-9_\'\s\-"]+\s+(?:Survivor|Killer)\s+-\s+[A-Za-z0-9_\'\s\-]+$',
        "",
        cleaned,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    lines = [line.strip() for line in cleaned.splitlines()]
    lines = [line for line in lines if line]

    filtered_lines = []
    for line in lines:
        if (
            line.lower() in ["survivor", "killer", "survivor perk", "killer perk"]
            or re.match(r"^-\s*[A-Za-z0-9\s']+$", line)
            or re.match(r'^[A-Za-z0-9_\'\s\-"]+"\s+[A-Za-z0-9_\'\s\-"]+$', line)
        ):
            continue
        filtered_lines.append(line)
    lines = filtered_lines

    lines = [line for line in lines if line and line not in ["<", ">", "&lt;", "&gt;"]]

    if not lines:
        return "Perk description is currently unavailable in the database."

    deduped_lines = []
    for line in lines:
        if not deduped_lines or line != deduped_lines[-1]:
            deduped_lines.append(line)
    lines = deduped_lines

    while len(lines) > 1 and lines[-1].lower() == lines[0].lower():
        lines.pop()

    result = "\n".join(lines).strip()
    if not result or result in ["<", ">", "&lt;", "&gt;"]:
        return "Perk description is currently unavailable in the database."

    return result


def sanitize_filename(name: str) -> str:
    clean_str = name.lower().strip()
    clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
    clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
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


def classify_portrait(image_url: str) -> Optional[Tuple[str, int]]:
    if not image_url:
        return None
    filename = image_url.split("/revision")[0].rstrip("/").split("/")[-1]
    match = PORTRAIT_PATTERN.match(filename)
    if not match:
        return None
    category = "Killer" if match.group(1).upper() == "K" else "Survivor"

    try:
        release_number = int(match.group(2))
    except ValueError:
        release_number = 0

    return category, release_number


def normalise_character_name(title: str, category: str) -> str:
    clean = (title or "").strip()
    if category == "Killer" and clean.startswith("The "):
        return clean[4:].strip()
    return clean