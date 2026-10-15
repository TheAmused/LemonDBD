# backend/app/utils/email_address.py
"""One canonical spelling per mailbox, for comparing addresses (never for delivering to them).

`abc@gmail.com`, `a.b.c@gmail.com`, `abc+anything@gmail.com` and `abc@googlemail.com` are one
Gmail mailbox. The same goes for the `+tag` of the big providers below. Everything else is only
lower-cased: guessing at a small provider's rules would merge two real people, so an address we do not
know stays exactly as distinct as the provider makes it.

Accounts are still unique by the address as typed (lower-cased); the canonical form is what the
ban-evasion list hashes, so a banned person cannot dodge it with a dot or a +tag.
"""
import unicodedata

GMAIL_DOMAINS = frozenset({"gmail.com", "googlemail.com"})
#: Providers documented to deliver `name+tag@domain` to `name@domain`.
PLUS_TAG_DOMAINS = frozenset(
    {
        "outlook.com",
        "hotmail.com",
        "live.com",
        "msn.com",
        "icloud.com",
        "me.com",
        "mac.com",
        "proton.me",
        "protonmail.com",
        "pm.me",
        "fastmail.com",
        "fastmail.fm",
    }
)
MAX_ADDRESS_LENGTH = 254


def canonical_email(value: str | None) -> str | None:
    """The canonical form of `value`, or None when it is not a plausible single address."""
    if not isinstance(value, str):
        return None
    text = unicodedata.normalize("NFKC", value).strip().lower()
    if not text or len(text) > MAX_ADDRESS_LENGTH or any(ch.isspace() for ch in text):
        return None
    local, sep, domain = text.rpartition("@")
    domain = domain.rstrip(".")
    if not sep or not local or not domain or "@" in local:
        return None
    if domain in GMAIL_DOMAINS:
        domain = "gmail.com"
        local = local.split("+", 1)[0].replace(".", "")
    elif domain in PLUS_TAG_DOMAINS:
        local = local.split("+", 1)[0]
    if not local:
        return None
    return f"{local}@{domain}"
