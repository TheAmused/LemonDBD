# backend/app/services/scraper/assets.py
import asyncio
import io
import logging
import re
from pathlib import Path
from typing import List, Optional

from curl_cffi.requests import AsyncSession
from PIL import Image

from app.scrapers.types import AddonData, CharacterData, ItemData, MapData, OfferingData, PerkData
from app.scrapers.utils import sanitize_filename
from app.services.scraper.state import ScraperStateManager

logger = logging.getLogger(__name__)

PERK_FRAME_TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "scrapers" / "assets" / "perk_frame.png"
_perk_frame_template_cache: Optional[Image.Image] = None


def get_perk_frame_template() -> Optional[Image.Image]:
    """Retrieve and cache the PNG diamond frame template for perks."""
    global _perk_frame_template_cache
    if _perk_frame_template_cache is None and PERK_FRAME_TEMPLATE_PATH.exists():
        _perk_frame_template_cache = Image.open(PERK_FRAME_TEMPLATE_PATH).convert("RGBA")
    return _perk_frame_template_cache


def apply_perk_diamond_frame(icon_bytes: bytes) -> bytes:
    """Composites perk icon onto the canonical diamond framing template."""
    template = get_perk_frame_template()
    if template is None:
        return icon_bytes

    size = template.size[0]
    canvas = template.copy()

    icon = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
    icon_size = int(size * 0.85)
    icon_resized = icon.resize((icon_size, icon_size), Image.LANCZOS)
    offset = ((size - icon_size) // 2, (size - icon_size) // 2)
    canvas.alpha_composite(icon_resized, offset)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


async def download_single_asset(
    client: AsyncSession,
    semaphore: asyncio.Semaphore,
    static_dir: Path,
    url: str,
    relative_path: str,
    timeout: int = 30,
    apply_perk_frame: bool = False,
) -> None:
    """Asynchronously download and persist an individual asset file."""
    if not url:
        return

    destination = static_dir / relative_path
    try:
        if destination.exists():
            ScraperStateManager.increment_progress()
            return
        destination.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.warning(f"Could not prepare destination for [{relative_path}]: {e}")
        ScraperStateManager.increment_progress()
        return

    async with semaphore:
        try:
            response = await client.get(url, timeout=timeout)
            response.raise_for_status()
            content = response.content
            if apply_perk_frame:
                try:
                    content = apply_perk_diamond_frame(content)
                except Exception as frame_err:
                    logger.warning(f"Could not frame perk icon [{url}]: {frame_err}")
            destination.write_bytes(content)
        except Exception as err:
            logger.error(f"Download failed [{url}]: {err}")
        finally:
            ScraperStateManager.increment_progress()


async def download_all_assets(
    static_dir: Path,
    perks: List[PerkData],
    characters: List[CharacterData],
    items: Optional[List[ItemData]] = None,
    addons: Optional[List[AddonData]] = None,
    maps: Optional[List[MapData]] = None,
    offerings: Optional[List[OfferingData]] = None,
    impersonate_browser: str = "chrome120",
    max_concurrent_downloads: int = 10,
    request_timeout: int = 30,
) -> None:
    """Batch concurrent asset downloader for characters, powers, perks, items, addons, maps, and offerings."""
    semaphore = asyncio.Semaphore(max_concurrent_downloads)
    async with AsyncSession(impersonate=impersonate_browser, verify=False) as client:
        tasks = [
            download_single_asset(
                client,
                semaphore,
                static_dir,
                perk.icon_url,
                perk.icon_local_path,
                timeout=request_timeout,
                apply_perk_frame=True,
            )
            for perk in perks
        ]
        for char in characters:
            if char.avatar_url:
                tasks.append(
                    download_single_asset(
                        client,
                        semaphore,
                        static_dir,
                        char.avatar_url,
                        char.avatar_local_path,
                        timeout=request_timeout,
                    )
                )
            if char.power and char.power.icon_url:
                p_slug = sanitize_filename(char.power.name)
                p_path = f"icons/powers/{p_slug}.png"
                char.power.icon_local_path = p_path
                tasks.append(
                    download_single_asset(
                        client,
                        semaphore,
                        static_dir,
                        char.power.icon_url,
                        p_path,
                        timeout=request_timeout,
                    )
                )
        if items:
            for item in items:
                if item.icon_url:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            item.icon_url,
                            item.icon_local_path,
                            timeout=request_timeout,
                        )
                    )
        if addons:
            for addon in addons:
                if addon.icon_url:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            addon.icon_url,
                            addon.icon_local_path,
                            timeout=request_timeout,
                        )
                    )
                    # Also download under base name if different (e.g. without (The Slasher))
                    base_name = re.sub(r"\s*\([^)]*\)", "", addon.name).strip()
                    base_slug = sanitize_filename(base_name)
                    base_path = f"icons/addons/{base_slug}.png"
                    if base_path != addon.icon_local_path:
                        tasks.append(
                            download_single_asset(
                                client,
                                semaphore,
                                static_dir,
                                addon.icon_url,
                                base_path,
                                timeout=request_timeout,
                            )
                        )

                    # Common spelling / legacy aliases
                    alias_slugs = []
                    if "ether_15" in base_slug or "aether_15" in base_slug:
                        alias_slugs.extend(["aether_15%", "ether_15_vol%", "aether_15_vol%"])
                    if "molted_skin" in base_slug or "moulted_skin" in base_slug:
                        alias_slugs.extend(["molted_skin", "moulted_skin"])
                    if "honey_locust_thorn" in base_slug:
                        alias_slugs.extend(["honey_locust_thorn", "honey_locust_thorns"])
                    if "adi_valente" in base_slug:
                        alias_slugs.extend(["adi_valente_issue_1", "adi_valente_issue_#1", "adi_valente_1"])

                    for alias in set(alias_slugs):
                        alias_path = f"icons/addons/{sanitize_filename(alias)}.png"
                        if alias_path != addon.icon_local_path and alias_path != base_path:
                            tasks.append(
                                download_single_asset(
                                    client,
                                    semaphore,
                                    static_dir,
                                    addon.icon_url,
                                    alias_path,
                                    timeout=request_timeout,
                                )
                            )
        if offerings:
            for off in offerings:
                if off.icon_url:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            off.icon_url,
                            off.icon_local_path,
                            timeout=request_timeout,
                        )
                    )
        if maps:
            for m in maps:
                if m.callout_image_url and m.callout_image_local_path:
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            m.callout_image_url,
                            m.callout_image_local_path,
                            timeout=request_timeout,
                        )
                    )

        await asyncio.gather(*tasks)

