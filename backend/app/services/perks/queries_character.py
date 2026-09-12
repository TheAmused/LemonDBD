# backend/app/services/perks/queries_character.py
import logging
import re
from typing import Any
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.core.cache import catalog_cache
from app.core.db_retry import retry_on_transient_db_error
from app.core.extensions import db
from app.models import Item, ItemAddon, Killer, KillerAddon, Offering, Survivor
from app.services.perks.utils import HEADER_EXCLUSIONS, normalize_search_key, slugify

logger = logging.getLogger(__name__)


def _role_models(category: str | None) -> list[type[Survivor] | type[Killer]]:
    """The tables a `category` filter selects, survivors first.

    The filter used to be `WHERE lower(role) = ?` against the discriminator
    column; with one table per role it picks tables instead. A category that
    names neither role selects nothing, exactly as the old comparison matched
    no rows.
    """
    wanted = category.lower() if category else "all"
    if wanted == "all":
        return [Survivor, Killer]
    return [m for m in (Survivor, Killer) if m.role.lower() == wanted]


def fetch_characters(service, category: str | None = None, lang: str | None = None) -> list[dict[str, Any]]:
    """Retrieve character list ordered by canonical chapter release numbers."""
    cache_key = ("fetch_characters", category.lower() if category else "all", lang)
    cached = catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        models = _role_models(category)
        characters: list[Survivor | Killer] = []
        for model in models:
            # `release_number` is the primary key now, so the CASE that pushed
            # NULL and 0 release numbers to the end of the list has nothing
            # left to guard against: ordering by id is the same order.
            stmt = (
                select(model)
                .options(joinedload(model.perks))
                .order_by(model.id.asc(), model.name.asc())
            )
            characters.extend(_run_characters_query(stmt))

        if len(models) > 1:
            # The old single query ordered all 98 rows by release number, so
            # the two result sets have to be interleaved rather than appended:
            # survivor 3 came before killer 4. Survivors win an equal release
            # number because they held ids 1-54 against the killers' 55-98 in
            # the table that no longer exists, and `id ASC` was the tiebreak.
            characters.sort(key=lambda c: (c.release_number, 0 if isinstance(c, Survivor) else 1, c.name))
        # This path falls back to a possibly-empty in-memory cache on any
        # exception, including one raised inside to_dict(), so an empty result
        # is logged rather than passed off as "there is no data yet".
        if not characters:
            logger.warning(
                f"[characters-query-check] DB query returned 0 rows "
                f"(category={category!r}); falling back to in-memory cache "
                f"of size {len(service._characters_cache)}"
            )
        if characters:
            res = [c.to_dict(lang=lang) for c in characters]
            catalog_cache.set(cache_key, res, ttl=120.0)
            return res
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
    cache_key = ("fetch_character_suggestions", query.strip().lower() if query else "", category.lower() if category else "all", limit)
    cached = catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        models = _role_models(category)
        chars: list[Survivor | Killer] = []
        for model in models:
            stmt = select(model)
            if query:
                q_clean = f"%{query.strip().lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(model.name).like(q_clean),
                        func.lower(model.real_name).like(q_clean),
                    )
                )

            stmt = stmt.order_by(model.name.asc()).limit(limit)
            chars.extend(db.session.scalars(stmt).all())

        if len(models) > 1:
            # Each half is already name-ordered and capped at `limit`, so the
            # first `limit` names of the merge are the same ones the single
            # ordered query returned.
            chars.sort(key=lambda c: c.name)
            chars = chars[:limit]

        res = [
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
        catalog_cache.set(cache_key, res, ttl=120.0)
        return res
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
        catalog_cache.set(cache_key, res, ttl=60.0)
        return res


def fetch_character_detail(service, character_name: str, lang: str | None = None) -> dict[str, Any] | None:
    """Retrieve full character detail including specific addons, powers, and teachable perks."""
    target_clean = character_name.strip().lower()
    target_slug = slugify(character_name)
    target_spaces = target_clean.replace("-", " ").replace("_", " ")

    cache_key = ("fetch_character_detail", target_clean, lang)
    cached = catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        # Fast-path: attempt direct indexed SQL lookup on common canonical
        # identifiers. Survivors are tried before killers, and a hit in either
        # table ends the search: names are unique across both tables (no
        # survivor shares a name with a killer), so there is never a second
        # row to weigh against the first.
        matched_char: Survivor | Killer | None = None
        for model in (Survivor, Killer):
            direct_stmt = (
                select(model)
                .options(joinedload(model.perks))
                .where(
                    or_(
                        func.lower(model.name) == target_clean,
                        func.lower(model.name) == target_spaces,
                        # This resolves a URL path segment, so it necessarily
                        # compares text -- but only against the two real display
                        # columns. The three alias columns it used to try
                        # (wiki_slug, short_name, code_prefix) were `name`
                        # respelled and no longer exist; code_prefix is derived
                        # and is matched in the Python fallback below.
                        func.lower(model.real_name) == target_clean,
                        func.lower(model.real_name) == target_spaces,
                    )
                )
            )
            matched_char = db.session.scalars(direct_stmt).unique().first()
            if matched_char:
                break

        # Fallback path: check normalized aliases and localized translation names
        if not matched_char:
            chars: list[Survivor | Killer] = []
            for model in (Survivor, Killer):
                stmt = select(model).options(joinedload(model.perks))
                chars.extend(db.session.scalars(stmt).unique().all())

            for c in chars:
                c_name = c.name.lower()
                c_real = (c.real_name or "").lower()
                c_prefix = c.code_prefix.lower()

                candidate_slugs = {
                    c_name,
                    c_real,
                    c_prefix,
                    slugify(c.name),
                    slugify(c.real_name or ""),
                    normalize_search_key(c.name),
                    normalize_search_key(c.real_name or ""),
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
            # This was 55 lines of Python: load all 880 killer add-ons, build a
            # token set from the character's name, real name, wiki slug, short
            # name and power name, then substring- and word-match each add-on's
            # `associated_target` against it -- on every request, to find the
            # 20 rows that belong to this killer. `killer_addons.killer_id` is
            # NOT NULL and indexed, so it is a single exact predicate rather
            # than a heuristic over every add-on in the game.
            matched_addons = db.session.scalars(
                select(KillerAddon).where(KillerAddon.killer_id == matched_char.id)
            ).all()
            addons_list = [a.to_dict(lang=lang) for a in matched_addons]
            addons_list.sort(key=get_rarity_sort_key)

            killer_offerings = db.session.scalars(
                select(Offering).where(func.lower(Offering.role).in_(["killer", "all"]))
            ).all()
            offerings_list = [o.to_dict(lang=lang) for o in killer_offerings]
            offerings_list.sort(key=get_rarity_sort_key)
        else:
            items = db.session.scalars(select(Item)).all()
            items_list = [i.to_dict(lang=lang) for i in items if i.name.lower().strip() not in HEADER_EXCLUSIONS]
            items_list.sort(key=get_rarity_sort_key)

            # Survivor add-ons are the whole of `item_addons`: the table exists
            # because these 51 rows attach to an item class rather than to a
            # killer, so there is no predicate left to write. The old query
            # filtered on `category` (a stored string) and then dropped any row
            # whose target contained "numbers" -- a guard against header rows
            # that the foreign key makes unnecessary.
            survivor_addons = db.session.scalars(select(ItemAddon)).all()
            addons_list = [
                a.to_dict(lang=lang)
                for a in survivor_addons
                if a.name.lower().strip() not in HEADER_EXCLUSIONS
            ]
            addons_list.sort(key=get_rarity_sort_key)

            survivor_offerings = db.session.scalars(
                select(Offering).where(func.lower(Offering.role).in_(["survivor", "all"]))
            ).all()
            offerings_list = [o.to_dict(lang=lang) for o in survivor_offerings]
            offerings_list.sort(key=get_rarity_sort_key)

        result = {
            "character": char_dict,
            "power": char_dict.get("power"),
            "perks": perks_list,
            "addons": addons_list,
            "items": items_list,
            "offerings": offerings_list,
        }
        catalog_cache.set(cache_key, result, ttl=120.0)
        return result
    except Exception as e:
        logger.error(f"Error getting character detail from DB: {e}", exc_info=True)
        return None
