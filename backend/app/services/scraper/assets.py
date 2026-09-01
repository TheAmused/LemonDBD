# backend/app/services/scraper/assets.py
import asyncio
import logging
from pathlib import Path

from curl_cffi.requests import AsyncSession

from app.scrapers.types import AddonData, CharacterData, ItemData, MapData, OfferingData, PerkData, RealmImageData
from app.scrapers.utils import sanitize_filename
from app.services.image_conversion import (
    composite_perk_diamond_frame,
    ensure_format_bytes,
    get_perk_frame_template as _get_perk_frame_template,
)
from app.services.scraper.state import ScraperStateManager

logger = logging.getLogger(__name__)

PERK_FRAME_TEMPLATE_PATH = Path(__file__).resolve().parent.parent.parent / "scrapers" / "assets" / "perk_frame.png"


def get_perk_frame_template():
    """Retrieve and cache the PNG diamond frame template for perks."""
    return _get_perk_frame_template(PERK_FRAME_TEMPLATE_PATH)


def apply_perk_diamond_frame(icon_bytes: bytes) -> bytes:
    """Composites perk icon onto the canonical diamond framing template and exports high-quality WebP."""
    return composite_perk_diamond_frame(icon_bytes, PERK_FRAME_TEMPLATE_PATH, quality=92)


def normalise_image_bytes(content: bytes, relative_path: str) -> bytes:
    """Make the stored bytes match the WebP (or specified) extension.

    Ensures all stored static assets are valid, compressed WebP binaries.
    """
    return ensure_format_bytes(content, relative_path, quality=92)


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

    # Ensure path uses .webp extension
    if not relative_path.lower().endswith((".webp", ".svg", ".json")):
        relative_path = str(Path(relative_path).with_suffix(".webp")).replace("\\", "/")

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
            if apply_perk_frame:
                try:
                    content = apply_perk_diamond_frame(response.content)
                except Exception as frame_err:
                    logger.warning(f"Could not frame perk icon [{url}]: {frame_err}")
                    content = normalise_image_bytes(response.content, relative_path)
            else:
                content = normalise_image_bytes(response.content, relative_path)
            destination.write_bytes(content)
        except Exception as err:
            logger.error(f"Download failed [{url}]: {err}")
        finally:
            ScraperStateManager.increment_progress()


async def download_all_assets(
    static_dir: Path,
    perks: list[PerkData],
    characters: list[CharacterData],
    items: list[ItemData] | None = None,
    addons: list[AddonData] | None = None,
    maps: list[MapData] | None = None,
    offerings: list[OfferingData] | None = None,
    realms: list[RealmImageData] | None = None,
    impersonate_browser: str = "chrome120",
    max_concurrent_downloads: int = 10,
    request_timeout: int = 30,
) -> None:
    """Batch concurrent asset downloader for characters, powers, perks, items, addons, maps, offerings, and realms."""
    semaphore = asyncio.Semaphore(max_concurrent_downloads)

    def _to_webp_path(path: str) -> str:
        """Force a relative asset path to end in .webp.

        download_single_asset always *writes* the file as .webp regardless of
        the extension it's handed, but it has no way to report that correction
        back to the caller. Every path we intend to persist to the database
        must therefore already be normalized to .webp *before* we hand it to
        download_single_asset -- otherwise the DB ends up pointing at a .png
        that was never actually written (see char.power.icon_local_path below,
        which this mirrors; it was previously the only path fixed up this way,
        which is exactly why perk/character/item/addon/offering/map/realm
        assets kept 404ing after the download layer switched to WebP).
        """
        if not path or path.lower().endswith((".webp", ".svg", ".json")):
            return path
        return str(Path(path).with_suffix(".webp")).replace("\\", "/")

    async with AsyncSession(impersonate=impersonate_browser, verify=False) as client:
        tasks = []
        for perk in perks:
            perk.icon_local_path = _to_webp_path(perk.icon_local_path)
            tasks.append(
                download_single_asset(
                    client,
                    semaphore,
                    static_dir,
                    perk.icon_url,
                    perk.icon_local_path,
                    timeout=request_timeout,
                    apply_perk_frame=True,
                )
            )
        for char in characters:
            if char.avatar_url:
                char.avatar_local_path = _to_webp_path(char.avatar_local_path)
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
                p_path = f"icons/powers/{p_slug}.webp"
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
                    item.icon_local_path = _to_webp_path(item.icon_local_path)
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
                    addon.icon_local_path = _to_webp_path(addon.icon_local_path)
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
        if offerings:
            for off in offerings:
                if off.icon_url:
                    off.icon_local_path = _to_webp_path(off.icon_local_path)
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
                    m.callout_image_local_path = _to_webp_path(m.callout_image_local_path)
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
        if realms:
            for r in realms:
                if r.image_url and r.image_local_path:
                    r.image_local_path = _to_webp_path(r.image_local_path)
                    tasks.append(
                        download_single_asset(
                            client,
                            semaphore,
                            static_dir,
                            r.image_url,
                            r.image_local_path,
                            timeout=request_timeout,
                        )
                    )

        await asyncio.gather(*tasks)
