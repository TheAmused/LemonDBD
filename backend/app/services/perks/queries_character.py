# backend/app/services/perks/queries_character.py
import logging
import re
from typing import Any
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import joinedload

from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.models import Addon, Character, Item, Offering
from app.services.perks.utils import HEADER_EXCLUSIONS, normalize_search_key, slugify

logger = logging.getLogger(__name__)


def fetch_characters(service, category: str | None = None, lang: str | None = None) -> list[dict[str, Any]]:
    """Retrieve character list ordered by canonical chapter release numbers."""
    try:
        stmt = select(Character).options(joinedload(Character.perks))
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Character.role) == category.lower())

        stmt = stmt.order_by(
            case(
                (and_(Character.release_number.is_not(None), Character.release_number > 0), Character.release_number),
                else_=9999,
            ).asc(),
            Character.id.asc(),
            Character.name.asc(),
        )

        characters = _run_characters_query(stmt)
        # TEMPORARY DIAGNOSTIC (remove once confirmed): this path silently
        # falls back to a possibly-empty in-memory cache on ANY exception,
        # including one raised inside to_dict() -- log it loudly so a bad
        # fallback is never mistaken for "there's just no data yet".
        if not characters:
            logger.warning(
                f"[characters-query-check] DB query returned 0 rows "
                f"(category={category!r}); falling back to in-memory cache "
                f"of size {len(service._characters_cache)}"
            )
        if characters:
            return [c.to_dict(lang=lang) for c in characters]
    except Exception:
        logger.exception(
            f"[characters-query-check] Querying/serializing characters from "
            f"DB raised -- falling back to in-memory cache of size "
            f"{len(service._characters_cache)}"
        )

    return service._characters_cache


@retry_on_transient_db_error()
def _run_characters_query(stmt):
    # Split out so a transient connection drop gets retried once here,
    # before fetch_characters' broader except falls back to the (possibly
    # empty/stale) in-memory cache -- without this, a one-off blip silently
    # degrades every caller to a near-empty catalog instead of a clean error.
    return db.session.scalars(stmt).unique().all()


def fetch_character_suggestions(
    service,
    query: str = "",
    category: str | None = None,
    limit: int = 15,
) -> list[dict[str, Any]]:
    """Autocomplete suggestions for characters by name or real name."""
    try:
        stmt = select(Character)
        if category and category.lower() != "all":
            stmt = stmt.where(func.lower(Character.role) == category.lower())

        if query:
            q_clean = f"%{query.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Character.name).like(q_clean),
                    func.lower(Character.real_name).like(q_clean),
                    func.lower(Character.short_name).like(q_clean),
                )
            )

        stmt = stmt.order_by(Character.name.asc()).limit(limit)
        chars = db.session.scalars(stmt).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "real_name": c.real_name or c.name,
                "category": c.role,
                "avatar_local_path": c.avatar_local_path or "",
                "portrait_url": c.portrait_url or "",
            }
            for c in chars
        ]
    except Exception:
        q_clean = query.strip().lower()
        res = []
        for c in service._characters_cache:
            if category and category.lower() != "all" and (c.get("category") or c.get("role", "")).lower() != category.lower():
                continue
            if not q_clean or q_clean in c.get("name", "").lower() or q_clean in c.get("real_name", "").lower():
                res.append({
                    "id": c.get("id"),
                    "name": c.get("name", ""),
                    "real_name": c.get("real_name", c.get("name", "")),
                    "category": c.get("category") or c.get("role", "Survivor"),
                    "avatar_local_path": c.get("avatar_local_path", ""),
                    "portrait_url": c.get("avatar_url", ""),
                })
            if len(res) >= limit:
                break
        return res


def fetch_character_detail(service, character_name: str, lang: str | None = None) -> dict[str, Any] | None:
    """Retrieve full character detail including specific addons, powers, and teachable perks."""
    target_clean = character_name.strip().lower()
    target_slug = slugify(character_name)

    try:
        stmt = select(Character).options(joinedload(Character.perks))
        chars = db.session.scalars(stmt).unique().all()
        matched_char: Character | None = None

        for c in chars:
            c_name = c.name.lower()
            c_real = (c.real_name or "").lower()
            c_slug = (c.wiki_slug or "").lower()
            c_short = (c.short_name or "").lower()
            c_prefix = (c.code_prefix or "").lower()

            candidate_slugs = {
                c_name,
                c_real,
                c_slug,
                c_short,
                c_prefix,
                slugify(c.name),
                slugify(c.real_name or ""),
                slugify(c.wiki_slug or ""),
                slugify(c.short_name or ""),
                slugify(c.code_prefix or ""),
                normalize_search_key(c.name),
                normalize_search_key(c.real_name or ""),
                normalize_search_key(c.short_name or ""),
            }

            if c.translations and isinstance(c.translations, dict):
                for l_code, l_data in c.translations.items():
                    if isinstance(l_data, dict):
                        loc_name = l_data.get("name")
                        if loc_name:
                            candidate_slugs.add(loc_name.lower())
                            candidate_slugs.add(slugify(loc_name))
                            candidate_slugs.add(normalize_search_key(loc_name))
                        loc_real = l_data.get("real_name")
                        if loc_real:
                            candidate_slugs.add(loc_real.lower())
                            candidate_slugs.add(slugify(loc_real))
                            candidate_slugs.add(normalize_search_key(loc_real))

            if target_clean in candidate_slugs or target_slug in candidate_slugs or normalize_search_key(character_name) in candidate_slugs:
                matched_char = c
                break

        if not matched_char:
            return None

        char_dict = matched_char.to_dict(lang=lang)
        RARITY_RANK = {
            "common": 1,
            "uncommon": 2,
            "rare": 3,
            "very rare": 4,
            "ultra rare": 5,
            "iridescent": 5,
            "event": 6,
        }

        def get_rarity_sort_key(item_dict: dict[str, Any]) -> tuple[int, str]:
            r = (item_dict.get("rarity") or "").lower().strip()
            for k, rank in RARITY_RANK.items():
                if k in r:
                    return (rank, item_dict.get("name", ""))
            return (99, item_dict.get("name", ""))

        char_role = matched_char.role or "Survivor"
        perks_list = [p.to_dict(lang=lang) for p in matched_char.perks]

        addons_list: list[dict[str, Any]] = []
        items_list: list[dict[str, Any]] = []
        offerings_list: list[dict[str, Any]] = []

        if char_role.lower() == "killer":
            all_addons = db.session.scalars(
                select(Addon).where(func.lower(Addon.category) == "killer")
            ).all()
            matched_addons = []

            canonical_name = matched_char.name.strip()
            no_article_name = re.sub(r"^the\s+", "", canonical_name, flags=re.IGNORECASE).strip()

            char_tokens = {
                normalize_search_key(canonical_name),
                normalize_search_key(no_article_name),
                normalize_search_key(matched_char.real_name or ""),
                normalize_search_key(matched_char.wiki_slug or ""),
                normalize_search_key(matched_char.short_name or ""),
            }
            if matched_char.power_name:
                p_norm = normalize_search_key(matched_char.power_name)
                char_tokens.add(p_norm)
                if p_norm.endswith("s"):
                    char_tokens.add(p_norm[:-1])
                if p_norm.endswith("es"):
                    char_tokens.add(p_norm[:-2])
            char_tokens.discard("")

            for a in all_addons:
                raw_target = (a.associated_target or "").strip()
                target_norm = normalize_search_key(raw_target)
                if not target_norm:
                    continue

                if target_norm in char_tokens:
                    matched_addons.append(a)
                    continue

                target_no_art = re.sub(r"^the\s+", "", target_norm).strip()
                if target_no_art in char_tokens:
                    matched_addons.append(a)
                    continue

                target_words = set(target_norm.split())
                matched_word = False
                for tok in char_tokens:
                    tok_words = tok.split()
                    if len(tok_words) == 1:
                        if tok in target_words and tok not in {"the", "and", "for", "all"}:
                            matched_word = True
                            break
                    else:
                        if tok in target_norm:
                            matched_word = True
                            break

                if matched_word:
                    matched_addons.append(a)

            addons_list = [a.to_dict(lang=lang) for a in matched_addons]
            addons_list.sort(key=get_rarity_sort_key)

            killer_offerings = db.session.scalars(
                select(Offering).where(func.lower(Offering.role).in_(["killer", "all"]))
            ).all()
            offerings_list = [o.to_dict(lang=lang) for o in killer_offerings]
            offerings_list.sort(key=get_rarity_sort_key)
        else:
            items_stmt = select(Item).where(func.lower(Item.role) == "survivor")
            items = db.session.scalars(items_stmt).all()
            items_list = [i.to_dict(lang=lang) for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
            items_list.sort(key=get_rarity_sort_key)

            survivor_addons_stmt = select(Addon).where(func.lower(Addon.category) == "survivor")
            survivor_addons = db.session.scalars(survivor_addons_stmt).all()
            addons_list = [
                a.to_dict(lang=lang)
                for a in survivor_addons
                if a.name.lower().strip() not in HEADER_EXCLUSIONS and "numbers" not in (a.associated_target or "").lower()
            ]
            addons_list.sort(key=get_rarity_sort_key)

            survivor_offerings = db.session.scalars(
                select(Offering).where(func.lower(Offering.role).in_(["survivor", "all"]))
            ).all()
            offerings_list = [o.to_dict(lang=lang) for o in survivor_offerings]
            offerings_list.sort(key=get_rarity_sort_key)

        return {
            "character": char_dict,
            "power": char_dict.get("power"),
            "perks": perks_list,
            "addons": addons_list,
            "items": items_list,
            "offerings": offerings_list,
        }
    except Exception as e:
        logger.error(f"Error getting character detail from DB: {e}", exc_info=True)
        return None
