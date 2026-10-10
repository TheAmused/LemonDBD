# backend/app/services/minigames/redaction.py
"""Keeps a clue from giving away its own answer."""
import re


def redact_identifiers(text: str, targets: list[str | None], placeholder: str = "[REDACTED]") -> str:
    """Thoroughly redacts character, power, or perk names and component words from text."""
    if not text:
        return ""
    stop_words = {
        "the", "a", "an", "of", "and", "in", "on", "at", "to", "for", "with",
        "from", "by", "is", "it", "her", "his", "she", "he", "or", "as", "be",
        "was", "were", "are", "been", "that", "this", "they", "them", "their",
        "into", "over", "after", "before", "each", "all", "both", "any", "some"
    }
    clean_targets = []
    for t in targets:
        if not t:
            continue
        t_clean = t.strip()
        if len(t_clean) >= 2 and t_clean.lower() not in stop_words:
            clean_targets.append(t_clean)
        tokens = re.split(r'[\s\-]+', t_clean)
        for part in tokens:
            part_clean = part.strip("()[],.'\"")
            if len(part_clean) >= 2 and part_clean.lower() not in stop_words:
                clean_targets.append(part_clean)

    clean_targets = sorted(list(set(clean_targets)), key=len, reverse=True)

    result = text
    for target in clean_targets:
        pattern = r'\b' + re.escape(target) + r"(?:['’]s)?\b"
        result = re.sub(pattern, placeholder, result, flags=re.IGNORECASE)
    return result
