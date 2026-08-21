#!/usr/bin/env python3
"""
create_translations.py
======================
Extracts and squashes official Dead by Daylight multi-language translations
from raw game string table dumps into a compact, optimized translations bundle
for the LemonDBD backend (backend/app/translations/translations.json).

Supports any arbitrary language added to the translations folder (e.g., fr.json,
it.json, pt.json, ru.json, ko.json, zh.json, etc.).

Usage:
------
    python create_translations.py
    python create_translations.py --locales en pl de es ja fr
    python create_translations.py --out ../backend/app/translations/translations.json
"""

import argparse
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("create_translations")

# Known non-locale dump files to ignore during auto-discovery
EXCLUDED_JSON_FILES = {
    "characters_dump.json",
    "characters_dump_backup.json",
    "items_dump.json",
    "gameplay_dump.json",
    "lemondbd.json",
    "pl_dump.json",
    "translations.json",
    "translations.min.json",
}

CHAPTER_TRANSLATIONS_MASTER: Dict[str, Dict[str, str]] = {
    "Base Game": {
        "en": "Base Game",
        "pl": "Gra podstawowa",
        "de": "Grundspiel",
        "es": "Juego base",
        "ja": "本編",
    },
    "Last Breath Chapter": {
        "en": "The Last Breath",
        "pl": "Ostatni oddech",
        "de": "Der letzte Atemzug",
        "es": "El último aliento",
        "ja": "最期の息の根",
    },
    "Of Flesh and Mud": {
        "en": "Of Flesh and Mud",
        "pl": "Z ciała i błota",
        "de": "Aus Fleisch und Schlamm",
        "es": "De carne y barro",
        "ja": "肉と泥",
    },
    "Spark of Madness": {
        "en": "Spark of Madness",
        "pl": "Iskra szaleństwa",
        "de": "Funke des Wahnsinns",
        "es": "Chispa de locura",
        "ja": "狂気の火花",
    },
    "A Lullaby for the Dark": {
        "en": "A Lullaby for the Dark",
        "pl": "Kołysanka dla mroku",
        "de": "Ein Schlaflied für die Dunkelheit",
        "es": "Una nana para la oscuridad",
        "ja": "闇のララバイ",
    },
    "LEATHERFACE™": {
        "en": "Leatherface™",
        "pl": "Leatherface™",
        "de": "Leatherface™",
        "es": "Leatherface™",
        "ja": "レザーフェイス™",
    },
    "A Nightmare on Elm Street™": {
        "en": "A Nightmare on Elm Street™",
        "pl": "Koszmar z ulicy Wiązów™",
        "de": "A Nightmare on Elm Street™",
        "es": "Pesadilla en Elm Street™",
        "ja": "エルム街の悪夢™",
    },
    "SAW™ Chapter": {
        "en": "SAW™ Chapter",
        "pl": "Rozdział SAW™",
        "de": "SAW™-Kapitel",
        "es": "Capítulo de SAW™",
        "ja": "SAW™チャプター",
    },
    "Curtain Call": {
        "en": "Curtain Call",
        "pl": "Opadająca kurtyna",
        "de": "Vorhang auf",
        "es": "Llamada a escena",
        "ja": "カーテンコール",
    },
    "Shattered Bloodline": {
        "en": "Shattered Bloodline",
        "pl": "Roztrzaskana linia krwi",
        "de": "Zersplitterte Blutlinie",
        "es": "Linaje destrozado",
        "ja": "砕かれた血統",
    },
    "Darkness Among Us": {
        "en": "Darkness Among Us",
        "pl": "Mrok pośród nas",
        "de": "Dunkelheit unter uns",
        "es": "La oscuridad entre nosotros",
        "ja": "私たちの闇",
    },
    "Demise of the Faithful": {
        "en": "Demise of the Faithful",
        "pl": "Śmierć wiernych",
        "de": "Untergang der Getreuen",
        "es": "Muerte de los fieles",
        "ja": "信仰の終焉",
    },
    "Ash vs Evil Dead": {
        "en": "Ash vs Evil Dead",
        "pl": "Ash kontra martwe zło",
        "de": "Ash vs Evil Dead",
        "es": "Ash vs Evil Dead",
        "ja": "死霊のはらわた リターンズ",
    },
    "Ghost Face®": {
        "en": "Ghost Face®",
        "pl": "Ghost Face®",
        "de": "Ghost Face®",
        "es": "Ghost Face®",
        "ja": "ゴーストフェイス®",
    },
    "Stranger Things": {
        "en": "Stranger Things",
        "pl": "Stranger Things",
        "de": "Stranger Things",
        "es": "Stranger Things",
        "ja": "ストレンジャー・シングス",
    },
    "Stranger Things Chapter 2": {
        "en": "Stranger Things Chapter 2",
        "pl": "Stranger Things Rozdział 2",
        "de": "Stranger Things Kapitel 2",
        "es": "Stranger Things Capítulo 2",
        "ja": "ストレンジャー・シングス 第2章",
    },
    "Cursed Legacy": {
        "en": "Cursed Legacy",
        "pl": "Przeklęte dziedzictwo",
        "de": "Verfluchtes Erbe",
        "es": "Legado maldito",
        "ja": "呪われた遺産",
    },
    "Chains of Hate": {
        "en": "Chains of Hate",
        "pl": "Łańcuchy nienawiści",
        "de": "Ketten des Hasses",
        "es": "Cadenas de odio",
        "ja": "憎しみの連鎖",
    },
    "Silent Hill (Chapter)": {
        "en": "Silent Hill",
        "pl": "Silent Hill",
        "de": "Silent Hill",
        "es": "Silent Hill",
        "ja": "サイレントヒル",
    },
    "Descend Beyond": {
        "en": "Descend Beyond",
        "pl": "Przekroczyć granicę",
        "de": "Grenzüberschreitung",
        "es": "Descenso al más allá",
        "ja": "彼方への降下",
    },
    "A Binding of Kin": {
        "en": "A Binding of Kin",
        "pl": "Więzy krwi",
        "de": "Eine Bindung der Verwandtschaft",
        "es": "Un lazo de sangre",
        "ja": "肉親の愛",
    },
    "All-Kill": {
        "en": "All-Kill",
        "pl": "All-Kill",
        "de": "All-Kill",
        "es": "All-Kill",
        "ja": "All-Kill",
    },
    "All-Kill: Comeback": {
        "en": "All-Kill: Comeback",
        "pl": "All-Kill: Powrót",
        "de": "All-Kill: Comeback",
        "es": "All-Kill: Regreso",
        "ja": "All-Kill: カムバック",
    },
    "Resident Evil™": {
        "en": "Resident Evil™",
        "pl": "Resident Evil™",
        "de": "Resident Evil™",
        "es": "Resident Evil™",
        "ja": "バイオハザード™",
    },
    "Hellraiser™": {
        "en": "Hellraiser™",
        "pl": "Hellraiser™",
        "de": "Hellraiser™",
        "es": "Hellraiser™",
        "ja": "ヘルレイザー™",
    },
    "Hour of the Witch": {
        "en": "Hour of the Witch",
        "pl": "Godzina czarownic",
        "de": "Stunde der Hexe",
        "es": "La hora de la bruja",
        "ja": "魔女の時",
    },
    "Portrait of a Murder": {
        "en": "Portrait of a Murder",
        "pl": "Portret morderstwa",
        "de": "Porträt eines Mordes",
        "es": "Retrato de un asesinato",
        "ja": "殺人の肖像画",
    },
    "Sadako Rising": {
        "en": "Sadako Rising",
        "pl": "Przebudzenie Sadako",
        "de": "Sadakos Erwachen",
        "es": "El despertar de Sadako",
        "ja": "貞子ライジング",
    },
    "Roots of Dread": {
        "en": "Roots of Dread",
        "pl": "Korzenie grozy",
        "de": "Wurzeln des Grauens",
        "es": "Raíces del pavor",
        "ja": "恐怖の根源",
    },
    "Resident Evil™: PROJECT W": {
        "en": "Resident Evil™: PROJECT W",
        "pl": "Resident Evil™: PROJEKT W",
        "de": "Resident Evil™: PROJECT W",
        "es": "Resident Evil™: PROJECT W",
        "ja": "バイオハザード™：PROJECT W",
    },
    "Forged in Fog": {
        "en": "Forged in Fog",
        "pl": "Wykute we mgle",
        "de": "Im Nebel geschmiedet",
        "es": "Forjado en la niebla",
        "ja": "霧の中の鍛造",
    },
    "Tools of Torment": {
        "en": "Tools of Torment",
        "pl": "Narzędzia udręki",
        "de": "Werkzeuge der Qual",
        "es": "Herramientas de tormento",
        "ja": "苦虐の道具",
    },
    "End Transmission": {
        "en": "End Transmission",
        "pl": "Koniec transmisji",
        "de": "Ende der Übertragung",
        "es": "Fin de transmisión",
        "ja": "通信終了",
    },
    "Nicolas Cage (Chapter)": {
        "en": "Nicolas Cage",
        "pl": "Nicolas Cage",
        "de": "Nicolas Cage",
        "es": "Nicolas Cage",
        "ja": "ニコラス・ケイジ",
    },
    "Alien": {
        "en": "Alien",
        "pl": "Obcy",
        "de": "Alien",
        "es": "Alien",
        "ja": "エイリアン",
    },
    "Chucky (Chapter)": {
        "en": "Chucky",
        "pl": "Chucky",
        "de": "Chucky",
        "es": "Chucky",
        "ja": "チャッキー",
    },
    "Alan Wake® (Chapter)": {
        "en": "Alan Wake®",
        "pl": "Alan Wake®",
        "de": "Alan Wake®",
        "es": "Alan Wake®",
        "ja": "アラン・ウェイク®",
    },
    "All Things Wicked": {
        "en": "All Things Wicked",
        "pl": "Wszystko, co nikczemne",
        "de": "Alles Böse",
        "es": "Todo lo perverso",
        "ja": "邪悪の全て",
    },
    "Dungeons & Dragons": {
        "en": "Dungeons & Dragons",
        "pl": "Dungeons & Dragons",
        "de": "Dungeons & Dragons",
        "es": "Dungeons & Dragons",
        "ja": "ダンジョンズ&ドラゴンズ",
    },
    "Tomb Raider™": {
        "en": "Tomb Raider™",
        "pl": "Tomb Raider™",
        "de": "Tomb Raider™",
        "es": "Tomb Raider™",
        "ja": "トゥームレイダー™",
    },
    "Castlevania": {
        "en": "Castlevania",
        "pl": "Castlevania",
        "de": "Castlevania",
        "es": "Castlevania",
        "ja": "悪魔城ドラキュラ",
    },
    "Doomed Course": {
        "en": "Doomed Course",
        "pl": "Przeklęty kurs",
        "de": "Verhängnisvoller Kurs",
        "es": "Rumbo fatídico",
        "ja": "破滅の進路",
    },
    "The HALLOWEEN® Chapter": {
        "en": "The HALLOWEEN® Chapter",
        "pl": "Rozdział HALLOWEEN®",
        "de": "Das HALLOWEEN®-Kapitel",
        "es": "El capítulo de HALLOWEEN®",
        "ja": "HALLOWEEN®チャプター",
    },
    "Left Behind (Chapter)": {
        "en": "Left Behind",
        "pl": "Pozostawieni w tyle",
        "de": "Zurückgelassen",
        "es": "Abandonados",
        "ja": "残された者たち",
    },
    "Five Nights at Freddy's": {
        "en": "Five Nights at Freddy's",
        "pl": "Five Nights at Freddy's",
        "de": "Five Nights at Freddy's",
        "es": "Five Nights at Freddy's",
        "ja": "Five Nights at Freddy's",
    },
    "The Walking Dead": {
        "en": "The Walking Dead",
        "pl": "The Walking Dead",
        "de": "The Walking Dead",
        "es": "The Walking Dead",
        "ja": "ウォーキング・デッド",
    },
    "Tokyo Ghoul": {
        "en": "Tokyo Ghoul",
        "pl": "Tokyo Ghoul",
        "de": "Tokyo Ghoul",
        "es": "Tokyo Ghoul",
        "ja": "東京喰種",
    },
    "Jason (Chapter)": {
        "en": "Friday the 13th",
        "pl": "Piątek trzynastego",
        "de": "Freitag der 13.",
        "es": "Viernes 13",
        "ja": "13日の金曜日",
    },
    "Chorus of Sin": {
        "en": "Chorus of Sin",
        "pl": "Chór grzechu",
        "de": "Chor der Sünde",
        "es": "Coro del pecado",
        "ja": "罪の合唱",
    },
    "Steady Pulse": {
        "en": "Steady Pulse",
        "pl": "Równomierny puls",
        "de": "Ruhiger Puls",
        "es": "Pulso firme",
        "ja": "安定した脈動",
    },
    "Life Road": {
        "en": "Life Road",
        "pl": "Droga życia",
        "de": "Lebensweg",
        "es": "Camino de vida",
        "ja": "命の道",
    },
    "Sinister Grace": {
        "en": "Sinister Grace",
        "pl": "Złowroga gracja",
        "de": "Finsterer Anmut",
        "es": "Gracia siniestra",
        "ja": "不吉な気品",
    },
}


def clean_html_formatting(raw_text: Optional[str]) -> str:
    """Strips Unreal HTML tags while preserving linebreaks, quotes, and punctuation."""
    if not raw_text:
        return ""

    text = str(raw_text)
    # Replace line breaks
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    # Strip HTML tags like <span>, <b>, <i>, <font>, etc.
    text = re.sub(r"</?[a-zA-Z0-9_-]+(?:\s+[^>]*?)?>", "", text)
    # Clean HTML entities
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&amp;", "&")
    # Clean whitespace while preserving newlines
    lines = [line.strip() for line in text.split("\n")]
    cleaned = "\n".join(lines).strip()
    return cleaned


def simplify_name_key(s: str) -> str:
    """Normalizes entity names for robust cross-referencing and lookup."""
    if not s:
        return ""
    s = s.lower().replace("\xa0", " ")
    s = re.sub(r"\(the [^)]+\)", "", s)
    s = re.sub(r"\([^)]+\)", "", s)
    return re.sub(r"[^a-z0-9]", "", s)


def load_locale_string_table(file_path: Path) -> Dict[str, str]:
    """
    Loads an Unreal Engine string table JSON dump (e.g. en.json, pl.json, fr.json)
    flattening all namespaces into a direct key -> localized string dictionary.
    """
    if not file_path.exists():
        logger.warning(f"Locale file not found: {file_path}")
        return {}

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    flat_lookup: Dict[str, str] = {}
    if isinstance(data, dict):
        for ns_or_key, val in data.items():
            if isinstance(val, dict):
                for k, v in val.items():
                    if isinstance(v, str):
                        flat_lookup[k] = clean_html_formatting(v)
            elif isinstance(val, str):
                flat_lookup[ns_or_key] = clean_html_formatting(val)

    return flat_lookup


def resolve_text(
    field_obj: Any,
    locale_dict: Dict[str, str],
    fallback: str = "",
    en_dict: Optional[Dict[str, str]] = None,
    text_to_guid: Optional[Dict[str, str]] = None,
) -> str:
    """Resolves localized string from field object containing Key / SourceString with dynamic reverse fallback."""
    if not field_obj:
        return fallback

    if isinstance(field_obj, str):
        return field_obj

    if isinstance(field_obj, dict):
        key = field_obj.get("Key") or field_obj.get("key")
        if key and key in locale_dict and locale_dict[key]:
            return locale_dict[key]

        # Dynamic reverse text matching if key is missing or not in locale_dict
        source_str = field_obj.get("SourceString") or field_obj.get("LocalizedString") or ""
        if text_to_guid and source_str:
            sk = simplify_name_key(source_str)
            if sk in text_to_guid:
                matched_guid = text_to_guid[sk]
                if matched_guid in locale_dict and locale_dict[matched_guid]:
                    return locale_dict[matched_guid]

            # Try prefix matching
            words = source_str.split()
            if len(words) >= 4:
                for length in [6, 5, 4, 3]:
                    prefix = simplify_name_key(" ".join(words[:length]))
                    if len(prefix) >= 12:
                        for tk, matched_guid in text_to_guid.items():
                            if prefix in tk:
                                if matched_guid in locale_dict and locale_dict[matched_guid]:
                                    return locale_dict[matched_guid]

        return field_obj.get("LocalizedString") or field_obj.get("SourceString") or fallback

    return fallback


OFFERINGS_MASTER_GUIDS: Dict[str, Tuple[str, str, str, str, str]] = {
    # Survivor Bloodpoints
    "primroseblossomsachet": ("2AA8584C47333A9061A06CB9700CB929", "CF03FBA046FB4F07F2AE2DB62575154A", "Bloodpoints", "Survivor", "Common"),
    "freshprimroseblossom": ("EAA6A9AF42BD42B5B26E55BE7F620BD1", "030E18F54925B8B122FEA2ABF7C2E9BA", "Bloodpoints", "Survivor", "Uncommon"),
    "fragrantprimroseblossom": ("C502E7614B44B9C56F9A2793DCFEF72B", "816DC4D248A7551514DF398D0D1036A9", "Bloodpoints", "Survivor", "Rare"),
    "sweetwilliamsachet": ("DB07196E40354F9C3F6A4C85D0787F69", "B2ACE8DB4809C3E055D5C2BF7A5A1F6C", "Bloodpoints", "Survivor", "Common"),
    "freshsweetwilliam": ("6389E2F04D2E0EC6C980ACA7C01885C1", "D49BA33948515EF42723F696DA60FB06", "Bloodpoints", "Survivor", "Uncommon"),
    "fragrantsweetwilliam": ("2DC0B9154C47F6DE60F25A93BC773663", "6AA85E5D426F7C594FACB79AC97E71D3", "Bloodpoints", "Survivor", "Rare"),
    "boglaurelsachet": ("78298EDC4F416B0C034B6DB05603D9EE", "3741707C458D54D1B8887ABE42FDD590", "Bloodpoints", "Survivor", "Common"),
    "freshboglaurel": ("7426A99A418BE4EC2FBFBA993C116757", "88264EE5476A70010AB96BB8873794F7", "Bloodpoints", "Survivor", "Uncommon"),
    "fragrantboglaurel": ("35439BA24C0330DDA24C069A9090623B", "526DA47E40100E4E881B05BC55C48104", "Bloodpoints", "Survivor", "Rare"),
    "crispleafamaranthsachet": ("6070EEA24F1992F2B61FDBA62D6BA15F", "4DE283C841D710A0E88CA597756B4DD4", "Bloodpoints", "Survivor", "Common"),
    "freshcrispleafamaranth": ("AA7B0FE1471714B9D28B239C1F821415", "E7D18F72473EFFB34386A1A79A39AB9C", "Bloodpoints", "Survivor", "Uncommon"),
    "fragrantcrispleafamaranth": ("E2EB09FA4BF218154F7073B4D3C5C421", "7DD1B12A449576F39BFF62893E8E7697", "Bloodpoints", "Survivor", "Rare"),
    "boundenvelope": ("0207460841B023DD93452DA491489270", "24096C2640D508AC697899B8587D61E9", "Bloodpoints", "Survivor", "Rare"),

    # Killer Bloodpoints
    "tanagerwreath": ("CB666E044F74FE9FFC62CA8CB76FEE26", "1B15086D4431A4469271F4AEFC805409", "Bloodpoints", "Killer", "Common"),
    "devouttanagerwreath": ("CE3607E84304ADB62DD191B2ED1B0333", "C4C2E3834B6A0CC3556FB3936276CB51", "Bloodpoints", "Killer", "Uncommon"),
    "ardenttanagerwreath": ("A6BCAED042477507E0AD21957A8E4651", "207A58A241CDEAF7CD6E1691D3D1878D", "Bloodpoints", "Killer", "Rare"),
    "ravenwreath": ("9B47195F45B15030016B12BE65CA2B3B", "13E7B4E44B624543DB3D4E95A8E88723", "Bloodpoints", "Killer", "Common"),
    "devoutravenwreath": ("0BCDC03848E1D94CFCE45E99DAA1A6C2", "B8CF810B4D33046D18B04685B78E2F15", "Bloodpoints", "Killer", "Uncommon"),
    "ardentravenwreath": ("E68B8D4E41484C98628E35A5E5B5E63B", "CC110D5C41423FFBB48A0DA1F107C9CC", "Bloodpoints", "Killer", "Rare"),
    "spottedowlwreath": ("D9BFE8C349C54D14532B039A72A4EBF8", "2F79941C46C3E2E80FC7479F13A40A7D", "Bloodpoints", "Killer", "Common"),
    "devoutspottedowlwreath": ("5E62AFCA4074F96C11494589255E04A7", "CD6CC4FA4627FEB450CBB4AEEF76CC05", "Bloodpoints", "Killer", "Uncommon"),
    "ardentspottedowlwreath": ("47DB469C45BFF089FF4FE6BEBD580B40", "B7ECE091488CAA08821991AC8E3219D3", "Bloodpoints", "Killer", "Rare"),
    "shrikewreath": ("996A514144372F2BFB4A09950F85A202", "648F1711471A92F0008668949736A0D2", "Bloodpoints", "Killer", "Common"),
    "devoutshrikewreath": ("35476D92404ED30FB47700B0BC44D0F8", "8E3497E349323CE066B3AB8F55210E7C", "Bloodpoints", "Killer", "Uncommon"),
    "ardentshrikewreath": ("F8507E7841F90940562D55B9781EE602", "1B0F0E4C4FC296D9827A95A9FC0362D2", "Bloodpoints", "Killer", "Rare"),
    "survivorpudding": ("F1CC07EB4706EEFD6AD5179B728B1975", "CB3AB28D4C4A7BD11DE78F8FF4BA9580", "Bloodpoints", "Killer", "Uncommon"),

    # Shared Bloodpoints
    "escapecake": ("2121D13849B39E2F4AF9AA9FCDA0840F", "D9444D2E4CB7EF5076545B8ACA67A57C", "Bloodpoints", "Survivor", "Uncommon"),
    "hollowshell": ("D3FF6E434BFEB13AFC079488FBBBAE3B", "9A8684224E53DAF9F96898B9996EC629", "Bloodpoints", "All", "Uncommon"),
    "sealedenvelope": ("D9D0A8FC467914D928E7CBAEF70EC128", "57E01ADC44533E75D2EEFBBE7182E528", "Bloodpoints", "All", "Common"),
    "bloodypartystreamers": ("A3BCE0CC41B602F09B6A92B7E1CDCB78", "C3D9B2D543D23D2BD4A4209131FAFBA3", "Bloodpoints", "All", "Rare"),

    # Moris
    "cypressmementomori": ("B6282AE54C542BC0E1C9DCB5D5C6C685", "41EAF03248385311B0C4BFBAF9A3BC8B", "Memento Mori", "Killer", "Uncommon"),
    "ivorymementomori": ("887588C046DF46ED104CE6B999CC3B7F", "E11B32044C7EA29BA558778C2652B095", "Memento Mori", "Killer", "Rare"),
    "ebonymementomori": ("B9E9CFD0487C0D0A8D9F29A440D9BA1E", "EF8E49094B623EE7B87CECB5855DB9D3", "Memento Mori", "Killer", "Ultra Rare"),

    # Wards
    "whiteward": ("2696459C4431CF10268CB0912E4B7133", "B86AFE7C4060E12A29D8708DDED7A3DF", "Ward", "Survivor", "Very Rare"),
    "blackward": ("CAA2C2B14013AB0580DEE79297BBB0FD", "A3D1BA1C4C15F9B9ECC4C9A2B6029DB1", "Ward", "Killer", "Very Rare"),
    "sacrificialward": ("4FBFF0774D4DFDE9E4AF698EBDE51F5B", "CC19E52B44BBF91376E1A5A91224ACE3", "Ward", "All", "Very Rare"),

    # Luck
    "chalkpouch": ("10BD2E7E4CFDC5B543D3C9BE9F0D9041", "E90E95AF4CF14EBEB81C4BA6253FFFC7", "Luck", "Survivor", "Common"),
    "creamchalkpouch": ("E97F107E442F9FA73F1C4EB7532A554A", "E3FDC08745E67CF21D1EEBA9844C701B", "Luck", "Survivor", "Uncommon"),
    "ivorychalkpouch": ("7369B2314F23D69805906E923C4258FB", "E376E6F843F8B383AC2C5CB6E2070D10", "Luck", "Survivor", "Rare"),
    "saltpouch": ("D8EF56E745DF3E98EF4CF7AE6FEA775C", "BDC34EE248D93444458C9698AC745CD7", "Luck", "Survivor", "Rare"),
    "blacksaltstatuette": ("B73A41FE42D05423B29C0EB70E83D04C", "CC8E21014CDDE86408DE05A6110825F7", "Luck", "Survivor", "Very Rare"),
    "vigosjarofsaltylips": ("6F37DFCA482F6627BD864193F164C877", "9F8BC0A74AE7529BA2E7599026419999", "Luck", "Survivor", "Very Rare"),

    # Shrouds
    "shroudofunion": ("786F3AE14F442C446CA452BEA4660893", "20473BE642878D32D157F3B5F6C6CC04", "Shroud", "Survivor", "Common"),
    "vigosshroud": ("F3DFCFBD4A5408D121B66D92EDFDE218", "607DF1154C4F00E880B44BA5B4DE345D", "Shroud", "Survivor", "Rare"),
    "shroudofseparation": ("B89BAE9D47EDD52B7BD5839C29F81822", "637E4D8249BE19E4A96DAFB613EC44B7", "Shroud", "Killer", "Rare"),
    "shroudofbinding": ("D37C82C748BA0C05F255DBBA1BCEBD40", "01FFAC0E42C063717208BE893F7D5230", "Shroud", "Survivor", "Very Rare"),
    "shroudofvanishing": ("0A00192A4947E993D6ACDCBF03F173DC", "C9DAD9F44F2AAC027B65AAA77FC6ED41", "Shroud", "All", "Rare"),

    # Blueprints
    "bloodiedblueprint": ("608711E840D5505C558F498A92AC0B57", "6E22561942C646829B7665ADB716DB79", "Map Modifications", "Survivor", "Common"),
    "tornblueprint": ("8D4DFCC3451A2DE757134DB609C63CD6", "B0470AB344AD685EE026EC833B2FAAB1", "Map Modifications", "Survivor", "Common"),
    "annotatedblueprint": ("66C4181B436D2184B489569EE35A6D6C", "3994FB744A727CE3564486A8329E88DA", "Map Modifications", "All", "Uncommon"),
    "vigosblueprint": ("F848EE634A1B02B516DB7491AE3F0854", "D566415B4C268481498B99AE13E531DE", "Map Modifications", "All", "Uncommon"),

    # Map / Fog / Hooks
    "mouldyoak": ("3579450341F2B14258ACAF943922756E", "38096AE54FE36FE0607994966AECA6CC", "Map Modifications", "Killer", "Common"),
    "moldyoak": ("3579450341F2B14258ACAF943922756E", "38096AE54FE36FE0607994966AECA6CC", "Map Modifications", "Killer", "Common"),
    "rottenoak": ("C372993845B25C6789D42588147EBC05", "4B692EF94276A8CEF60EDDAEBA2A16AC", "Map Modifications", "Killer", "Uncommon"),
    "petrifiedoak": ("83C88607412E832049DEB59EECE4FFCD", "02BFBEFB4FF9CC68940C5C88DE088EF3", "Map Modifications", "Survivor", "Very Rare"),
    "putridoak": ("6AC0E0E14F44F953DC5F0DB76DCC4468", "E90E95AF4CF14EBEB81C4BA6253FFFC7", "Map Modifications", "Killer", "Very Rare"),
    "clearreagent": ("BE6BD9F14A577C6873EDBE9F3968C222", "65284D534DDFCCD36E62C69EDABFE08E", "Map Modifications", "All", "Common"),
    "faintreagent": ("61E1BD594B4E1F1FB21B21A0F9BC0C75", "963986AA483E6A65586A3881D116F3F0", "Map Modifications", "All", "Common"),
    "hazyreagent": ("F3DFCFBD4A5408D121B66D92EDFDE218", "85274FDB4D2EFE7043D02699289BD837", "Map Modifications", "All", "Uncommon"),
    "murkyreagent": ("9F8BC0A74AE7529BA2E7599026419999", "432AC59A4B7646E00038E491874FE417", "Map Modifications", "All", "Very Rare"),
    "tarnishedcoin": ("FDCB951B40AF8D2CE55F6A97491C7B2F", "D129DADA4D7B20AFA7A78488C280769B", "Map Modifications", "Survivor", "Uncommon"),
    "shinycoin": ("DE19CDDE47BC22FDB51B4C93574A1CA8", "16B5F4BF45C5AC7FE0A027878B3062EC", "Map Modifications", "Survivor", "Very Rare"),
    "scratchedcoin": ("9E84BDFA4AE25E4CD8E1DC9845BC3DE3", "D129DADA4D7B20AFA7A78488C280769B", "Map Modifications", "Killer", "Uncommon"),
    "cutcoin": ("65A683644E206385B5F37F8F7E41C7F0", "649EBE674EEECF5AE2B487A8DF334A6F", "Map Modifications", "Killer", "Very Rare"),

    # Realms
    "azarovskey": ("05A206A44A1E659A1D1FF8842E9BF3F5", "242A50784042AED7D39113925B5DDC0C", "Realm", "All", "Rare"),
    "grandmascookbook": ("72DFDE394982635B6DFFB4873155DFBA", "AE43EB3243C31F27A4464F885F4F16EF", "Realm", "All", "Rare"),
    "heartlocket": ("BC17FB14459C51D219C17590C28A8116", "14B10897496D515BA4CE7FB9D935C61D", "Realm", "All", "Rare"),
    "charredweddingphotograph": ("390B75804ACDECD40772719B5349BA08", "710F53D5443D60C7E1875CBDA1616461", "Realm", "All", "Rare"),
    "beeftallowmixture": ("C3F8B3914561066EAFE83FA2DF251D5A", "CE91505943697BA38B08DBBA2C92BC00", "Realm", "All", "Rare"),
    "airlockdoors": ("965DB0EB4D67735BC4F21087F0833B95", "FF827E5546D5CCF15163DEACA1BE118C", "Realm", "All", "Rare"),
    "alienflora": ("42D932FA4F93BEEAEB4BC49463567D59", "3F43EF9A497D1A25C09566B1973DEDE0", "Realm", "All", "Rare"),
    "crowseye": ("FEE8586047AE56655EE241B7203E79DF", "E3937F7841B8CEE6D93E1E98ECADE72C", "Realm", "All", "Rare"),
    "jigsawpiece": ("1CD6BAA34CEBA676766023A139785BC9", "264A24DD4E2AB6EF09070F9EE688FA34", "Realm", "All", "Rare"),
    "shatteredbottle": ("61E1BD594B4E1F1FB21B21A0F9BC0C75", "710F53D5443D60C7E1875CBDA1616461", "Realm", "All", "Rare"),
    "stroderealtykey": ("3457D890479F637CD165979C6FE98BCE", "998373DC430E7077D06EE4897F6A00C6", "Realm", "All", "Rare"),
    "hawkinsnationallaboratoryid": ("AA1187424FF448BCBBCE748A541525C2", "EAAF21C34307A4D59DDAF492D9C94101", "Realm", "All", "Rare"),
    "shatteredglasses": ("C98E56B6488A0DF16A34A999B0B7FF12", "64C7AF2645252C155D4613B81E371FA1", "Realm", "All", "Rare"),
    "macmillansphalanxbone": ("890BC6FD462B28966E04A7B8E6FDF477", "4AB56DCE422056A4AEEFB2BC989D0F9C", "Realm", "All", "Rare"),
    "damagedphoto": ("B0C688564FEFA669527D56B136279E43", "FC597AD845E04CA3CBD53E9C8DFC4D1C", "Realm", "All", "Rare"),
    "rpdbadge": ("72A590CD461A0BD85FEBD2931D4577FB", "1BCD755540F19F3D9F0FFBB32AC21126", "Realm", "All", "Rare"),
    "thelastmask": ("A6E5568F4DF5B3A7F7C770923058D4B0", "802969944AECEED4A5D810ABC5D99A2B", "Realm", "All", "Rare"),
    "marysletter": ("2F8AC6EE476C5BD8EF41A88307DAF6C4", "446D817E41D87DCCE3E33BAEB0CECC25", "Realm", "All", "Rare"),
    "thepiedpiper": ("EAE90DF945BE28E3166885BCB350567C", "B081888D424E2E886F804696C8DFC57D", "Realm", "All", "Rare"),
    "ichorousloam": ("3E58D4794BCFEE126DCEB28489BF3DCE", "E5F7F73C490DB746A7F7F0958C86F3C2", "Realm", "All", "Rare"),
    "yamaokafamilycrest": ("FA6DBBC3405786CDEBC2D49DF798B750", "52A847E94E0A1EF0EE104787284974CC", "Realm", "All", "Rare"),

    # Special / Event Offerings
    "arcanedousingrod": ("74A1B8C047C4328E44C5C088D6F2C240", "C12F53EB4E8FDBBDBF6AC7B25E3C7B9D_DESC", "Special", "All", "Event"),
    "arcanedowsingrod": ("74A1B8C047C4328E44C5C088D6F2C240", "C12F53EB4E8FDBBDBF6AC7B25E3C7B9D_DESC", "Special", "All", "Event"),
    "cursedseed": ("44301C71420C2156AF8BAFA429A26A4A", "A032F89342750C36B76013A98B3289C7", "Special", "All", "Event"),
    "pustulapetals": ("6EEBFF664C5632CD7A48C8B763C4D81D", "A0328B7D4F84CD1A7E3E439E8D89AC87", "Special", "All", "Event"),
    "redenvelope": ("3DAEB8274B3FD53BD4638782AE34533F", "9EDC662F49B653D0E59BA8A247E6CEC7", "Special", "All", "Event"),
    "bloodshoteye": ("4847E24C4BD901C46E27299DA9F0042D", "95A92A3B40602CC788CE5185E7F558B1", "Special", "All", "Event"),
    "bbqinvitation": ("732E164344F571AC014D8B936CA50785", "E7049EC5456FC8CD6C2230A9B0767EFF", "Special", "All", "Event"),
    "gruesomegateau": ("67156DE04CFEF3EF7A5D20A6E881D299", "08ECAD1A4B7096AB6990B8841FFEC226", "Special", "All", "Event"),
    "ghastlygateau": ("622E64644EC974DE4D4ECF937DDFBE53", "0D2A6DB345764968BA8BD58439C1E54B", "Special", "All", "Event"),
    "sacrificialcake": ("5032F1A74152FA1ED5BAEBBA227A597E", "B8C460824C3D9E82842460A97EE81768", "Special", "All", "Event"),
    "frightfulflan": ("D87E4DC14886E2073998D0819CAEB65C", "FrightfulFlan_Description", "Special", "All", "Event"),
    "terrormisu": ("E20B8C854291B6B20235C1935629F0DA", "Terrormisu_Description", "Special", "All", "Event"),
    "screechcobbler": ("9331C07C4E19557C32AC63B66D606E2A", "ScreechCobbler_Description", "Special", "All", "Event"),
    "toothytorte": ("65D4F9734182963172E4459C66B96D74", "ToothyTorte_Description", "Special", "All", "Event"),
    "screampie": ("755C4BCB4BA84920E3E1A699313BF503", "CoconutScreamPie_Description", "Special", "All", "Event"),
    "coconutscreampie": ("755C4BCB4BA84920E3E1A699313BF503", "CoconutScreamPie_Description", "Special", "All", "Event"),
}

SPECIAL_DESCRIPTIONS_OVERRIDE: Dict[str, Dict[str, str]] = {
    "Frightful Flan": {
        "en": "It may be a masquerade ball, but there is no masking the foul odour of this quivering yellow mass. Consuming it, however, fills you with vigour.\nGrants +106 % bonus Bloodpoints in all Scoring Categories to all Players.\nCalls upon The Entity for Crown Pillar reveal effects.\n\"Happy Anniversary! We made you this cake/pie/pudding/unspeakable horror.\" — The Dead by Daylight Team",
        "pl": "Może to i bal maskowy, ale nic nie zamaskuje ohydnego zapachu tej drżącej, żółtej masy. Jej spożycie dodaje jednak wigoru.\nZapewnia wszystkim graczom +106% dodatkowych Punktów Krwi we wszystkich kategoriach.\nWzywa Byt do ujawnienia Filaru Korony w odległości 8 metrów.\n„Wszystkiego najlepszego z okazji rocznicy! Zrobiliśmy dla was ten tort/placek/pudding/niewypowiedziany koszmar”. — Zespół Dead by Daylight",
        "de": "Es mag ein Maskenball sein, aber der faulige Geruch dieser zitternden gelben Masse lässt sich nicht verbergen. Der Verzehr verleiht jedoch neue Kraft.\nGewährt allen Spielern +106 % Bonus-Blutpunkte in allen Kategorien.\nRuft den Entitus an, um die Aura der Kronsäule zu enthüllen.\n„Alles Gute zum Jubiläum! Wir haben diesen Kuchen/Pudding/unsäglichen Schrecken für dich gebacken.“ — Das Dead by Daylight-Team",
        "es": "Puede que sea un baile de máscaras, pero no hay máscara que oculte el hedor nauseabundo de esta masa temblorosa. Sin embargo, consumirla te llena de vigor.\nOtorga un +106 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\nInvoca al Ente para revelar los pilares de corona.\n\"¡Feliz aniversario! Os hemos preparado esta tarta/pastel/púdin/horror indescriptible.\" — El equipo de Dead by Daylight",
        "ja": "仮面舞踏会とはいえ、この震える黄色い塊の悪臭は隠せない。しかし口にすれば活力が湧いてくる。\n全プレイヤーが全カテゴリーで+106%のボーナスブラッドポイントを獲得する。\nエンティティに祈りを捧げ、クラウンの柱のオーラを表示する。\n「記念日おめでとう！ケーキ/パイ/プリン/名状しがたい恐怖を作りました」 — Dead by Daylight 開発チーム"
    },
    "Terrormisu": {
        "en": "A celebratory dessert to be eaten during the masquerade. Each layer is more horrifying than the last.\nGrants +107 % bonus Bloodpoints in all Categories to all Players.\nReveals the Aura of Masquerade Pillars within 32 metres.\n\"Thanks for celebrating our Anniversary! Don't ask why it's so spongy.\" — The Dead by Daylight Team",
        "pl": "Świąteczny deser do zjedzenia podczas maskarady. Każda warstwa jest bardziej przerażająca od poprzedniej.\nZapewnia wszystkim graczom +107% dodatkowych Punktów Krwi we wszystkich kategoriach.\nUjawnia aurę Filaru Maskarady w promieniu 32 metrów.\n„Dziękujemy za świętowanie naszej rocznicy! Nie pytajcie, dlaczego jest tak gąbczasty”. — Zespół Dead by Daylight",
        "de": "Ein festliches Dessert für die Maskerade. Jede Schicht ist noch schrecklicher als die vorherige.\nGewährt allen Spielern +107 % Bonus-Blutpunkte in allen Kategorien.\nEnthüllt die Aura der Maskeradesäulen im Umkreis von 32 Metern.\n„Danke, dass du unser Jubiläum mit uns feierst! Frag nicht, warum es so schwammig ist.“ — Das Dead by Daylight-Team",
        "es": "Un postre festivo para disfrutar durante la mascarada. Cada capa es más terrorífica que la anterior.\nOtorga un +107 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\nRevela el aura de los pilares de la mascarada en un radio de 32 metros.\n\"¡Gracias por celebrar nuestro aniversario! No preguntes por qué es tan esponjoso.\" — El equipo de Dead by Daylight",
        "ja": "仮面舞踏会で食べるお祝いのデザート。どの層も前の層より恐ろしい。\n全プレイヤーが全カテゴリーで+107%のボーナスブラッドポイントを獲得する。\n32メートル以内の仮面舞踏会の柱のオーラを視覚化する。\n「周年を祝ってくれてありがとう！なぜこんなにスポンジ状なのかは聞かないで」 — Dead by Daylight 開発チーム"
    },
    "Screech Cobbler": {
        "en": "If you listen really closely, you can almost hear it screaming for more ice cream.\nGrants +108 % bonus Bloodpoints in all Categories to all Players.\nIncreases Aura-reveal distance of Masquerade Pillars by +8 metres and adds +1 Chest in the Trial.\n\"Happy anniversary! Hope this comfort food isn't too... discomforting.\" — The Dead by Daylight Team",
        "pl": "Jeśli wsłuchasz się naprawdę uważnie, niemal usłyszysz, jak krzyczy o więcej lodów.\nZapewnia wszystkim graczom +108% dodatkowych Punktów Krwi we wszystkich kategoriach.\nZwiększa zasięg ujawniania aury Filaru Maskarady o +8 metrów i dodaje +1 Skrzynię w Próbie.\n„Wszystkiego najlepszego z okazji rocznicy! Mamy nadzieję, że to danie nie jest zbyt... niepokojące”. — Zespół Dead by Daylight",
        "de": "Wenn man ganz genau hinhört, kann man es förmlich nach mehr Eiscreme schreien hören.\nGewährt allen Spielern +108 % Bonus-Blutpunkte in allen Kategorien.\nErhöht die Aurareichweite der Maskeradesäulen um +8 Meter und platziert +1 zusätzliche Kiste.\n„Alles Gute zum Jubiläum! Hoffentlich ist dieses Seelentröster-Essen nicht zu... unheimlich.“ — Das Dead by Daylight-Team",
        "es": "Si escuchas con atención, casi puedes oírlo gritar pidiendo más helado.\nOtorga un +108 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\nAumenta la distancia de revelación del aura de los pilares de la mascarada en +8 metros y añade +1 cofre en la partida.\n\"¡Feliz aniversario! Esperamos que esta comida reconfortante no sea demasiado... inquietante.\" — El equipo de Dead by Daylight",
        "ja": "耳を澄ますと、もっとアイスクリームをくれと叫んでいるのが聞こえるようだ。\n全プレイヤーが全カテゴリーで+108%のボーナスブラッドポイントを獲得する。\n仮面舞踏会の柱のオーラ表示距離が+8メートル増加し、試練内のチェストが+1個増加する。\n「周年おめでとう！このソウルフードがあまり...不快でないことを祈ります」 — Dead by Daylight 開発チーム"
    },
    "Toothy Torte": {
        "en": "\"Puts the icing in sacrificing.\"\nGrants +110 % bonus Bloodpoints in all Scoring Categories to all Players.\nReveals the Aura of Banquet Table within 16 metres. Killer starts with max Poison charges; Survivor starts with a Morsel.\n\"Chew fast, or it'll chew you right back. Thanks for celebrating with us!\" — The Dead by Daylight Team",
        "pl": "„Dodaje wisienkę na torcie poświęcenia”.\nZapewnia wszystkim graczom +110% dodatkowych Punktów Krwi we wszystkich kategoriach.\nUjawnia aurę Stołu Bankietowego w promieniu 16 metrów. Zabójca zaczyna z maksymalną liczbą ładunków Trucizny; Ocalały zaczyna z Kąskiem.\n„Gryź szybko, albo ono ugryzie ciebie. Dziękujemy za wspólne świętowanie!” — Zespół Dead by Daylight",
        "de": "„Macht das Opfern zu einem zuckersüßen Erlebnis.“\nGewährt allen Spielern +110 % Bonus-Blutpunkte in allen Kategorien.\nEnthüllt die Aura der Festtafel im Umkreis von 16 Metern. Killer starten mit vollen Giftladungen; Überlebende mit einem Bissen.\n„Schnell kauen, sonst kaut es dich! Danke fürs Feiern mit uns!“ — Das Dead by Daylight-Team",
        "es": "\"Pone la guinda al sacrificio.\"\nOtorga un +110 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\nRevela el aura de la mesa de banquete en un radio de 16 metros. El asesino comienza con cargas máximas de veneno; el superviviente comienza con un bocado.\n\"Mastica rápido o te morderá a ti. ¡Gracias por celebrar con nosotros!\" — El equipo de Dead by Daylight",
        "ja": "「犠牲の仕上げにアイシングを」\n全プレイヤーが全カテゴリーで+110%のボーナスブラッドポイントを獲得する。\n16メートル以内の晩餐会のテーブルのオーラを視覚化する。キラーは毒チャージ最大で開始し、生存者は一口分所持して開始する。\n「早く噛まないと噛み返されるぞ。一緒にお祝いしてくれてありがとう！」 — Dead by Daylight 開発チーム"
    },
    "Coconut Scream Pie": {
        "en": "\"A metallic taste overpowers the coconut.\"\nGrants +109 % bonus Bloodpoints in all Scoring Categories to all Players.\nReveals the Aura of Invitation Pillar within 16 metres.\n\"The secret ingredient is love... wait, no, that's blood. Happy Anniversary!\" — The Dead by Daylight Team",
        "pl": "„Metaliczny posmak dominuje nad kokosem”.\nZapewnia wszystkim graczom +109% dodatkowych Punktów Krwi we wszystkich kategoriach.\nUjawnia aurę Filaru Zaproszenia w promieniu 16 metrów.\n„Sekretnym składnikiem jest miłość... czekaj, nie, to krew. Wszystkiego najlepszego z okazji rocznicy!” — Zespół Dead by Daylight",
        "de": "„Ein metallischer Geschmack überdeckt die Kokosnuss.“\nGewährt allen Spielern +109 % Bonus-Blutpunkte in allen Kategorien.\nEnthüllt die Aura der Einladungssäule im Umkreis von 16 Metern.\n„Die geheime Zutat ist Liebe... Moment, nein, es ist Blut. Alles Gute zum Jubiläum!“ — Das Dead by Daylight-Team",
        "es": "\"Un sabor metálico eclipsa al coco.\"\nOtorga un +109 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\nRevela el aura del pilar de invitación en un radio de 16 metros.\n\"El ingrediente secreto es el amor... espera, no, es sangre. ¡Feliz aniversario!\" — El equipo de Dead by Daylight",
        "ja": "「金属の味がココナッツを圧倒している」\n全プレイヤーが全カテゴリーで+109%のボーナスブラッドポイントを獲得する。\n16メートル以内の招待の柱のオーラを視覚化する。\n「隠し味は愛...待って、違う、血だ。記念日おめでとう！」 — Dead by Daylight 開発チーム"
    },
    "Gruesome Gateau": {
        "en": "A baked treat commemorating the 3rd Anniversary of Dead by Daylight.\nGrants +103 % bonus Bloodpoints in all Categories to all Players.\n\"Happy 3rd Anniversary!\"",
        "pl": "Pieczony przysmak upamiętniający 3. rocznicę Dead by Daylight.\nZapewnia wszystkim graczom +103% dodatkowych Punktów Krwi we wszystkich kategoriach.\n„Szczęśliwej 3. rocznicy!”",
        "de": "Ein gebackenes Vergnügen zum 3. Jubiläum von Dead by Daylight.\nGewährt allen Spielern +103 % Bonus-Blutpunkte in allen Kategorien.\n„Alles Gute zum 3. Jubiläum!“",
        "es": "Un dulce horneado que conmemora el 3.er aniversario de Dead by Daylight.\nOtorga un +103 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\n\"¡Feliz 3.er aniversario!\"",
        "ja": "Dead by Daylightの3周年を記念した焼き菓子。\n全プレイヤーが全カテゴリーで+103%のボーナスブラッドポイントを獲得する。\n「3周年おめでとう！」"
    },
    "Ghastly Gateau": {
        "en": "A horrifying confectionery commemorating the 4th Anniversary of Dead by Daylight.\nGrants +104 % bonus Bloodpoints in all Categories to all Players.\n\"Happy 4th Anniversary!\"",
        "pl": "Przerażający wyrób cukierniczy upamiętniający 4. rocznicę Dead by Daylight.\nZapewnia wszystkim graczom +104% dodatkowych Punktów Krwi we wszystkich kategoriach.\n„Szczęśliwej 4. rocznicy!”",
        "de": "Ein schauriges Gebäck zum 4. Jubiläum von Dead by Daylight.\nGewährt allen Spielern +104 % Bonus-Blutpunkte in allen Kategorien.\n„Alles Gute zum 4. Jubiläum!“",
        "es": "Un dulce espeluznante que conmemora el 4.º aniversario de Dead by Daylight.\nOtorga un +104 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\n\"¡Feliz 4.º aniversario!\"",
        "ja": "Dead by Daylightの4周年を記念した恐ろしい菓子。\n全プレイヤーが全カテゴリーで+104%のボーナスブラッドポイントを獲得する。\n「4周年おめでとう！」"
    },
    "Sacrificial Cake": {
        "en": "A moist, bloody cake commemorating the 5th Anniversary of Dead by Daylight.\nGrants +105 % bonus Bloodpoints in all Categories to all Players.\n\"Happy 5th Anniversary!\"",
        "pl": "Wilgotne, krwawe ciasto upamiętniające 5. rocznicę Dead by Daylight.\nZapewnia wszystkim graczom +105% dodatkowych Punktów Krwi we wszystkich kategoriach.\n„Szczęśliwej 5. rocznicy!”",
        "de": "Ein saftiger, blutiger Kuchen zum 5. Jubiläum von Dead by Daylight.\nGewährt allen Spielern +105 % Bonus-Blutpunkte in allen Kategorien.\n„Alles Gute zum 5. Jubiläum!“",
        "es": "Un pastel sangriento que conmemora el 5.º aniversario de Dead by Daylight.\nOtorga un +105 % de puntos de sangre adicionales en todas las categorías a todos los jugadores.\n\"¡Feliz 5.º aniversario!\"",
        "ja": "Dead by Daylightの5周年を記念した血塗れのケーキ。\n全プレイヤーが全カテゴリーで+105%のボーナスブラッドポイントを獲得する。\n「5周年おめでとう！」"
    },
    "Cursed Seed": {
        "en": "A corrupt seed planted during The Midnight Grove event.\nCalls upon The Entity to spawn extra event generators and hooks, granting bonus Bloodpoints.",
        "pl": "Skażone nasiono zasadzone podczas wydarzenia Północny Gaj.\nWzywa Byt do utworzenia dodatkowych generatorów i haków wydarzenia, przyznając dodatkowe Punkty Krwi.",
        "de": "Ein verdorbener Samen, der während des Events „Der Mitternachtshain“ gepflanzt wurde.\nRuft den Entitus an, um zusätzliche Event-Generatoren und Haken zu spawnen, und gewährt Bonus-Blutpunkte.",
        "es": "Una semilla corrupta plantada durante el evento La arboleda de medianoche.\nInvoca al Ente para generar generadores y ganchos de evento adicionales, otorgando puntos de sangre adicionales.",
        "ja": "ミッドナイト・グローブイベント中に植えられた穢れた種。\nエンティティに祈りを捧げ、追加のイベント発電機とフックを生成し、ボーナスブラッドポイントを獲得する。"
    },
    "Pustula Petals": {
        "en": "Fragile petals harvested from the Pustula flower during The Eternal Blight.\nCalls upon The Entity to spawn extra event hooks and generators, granting huge Bloodpoint multipliers.",
        "pl": "Kruche płatki zebrane z kwiatu Pustuły podczas Wiecznego Zarazy.\nWzywa Byt do utworzenia dodatkowych haków i generatorów wydarzenia, przyznając ogromne mnożniki Punktów Krwi.",
        "de": "Zarte Blütenblätter der Pustelblume während der Ewigen Fäule.\nRuft den Entitus an, um zusätzliche Event-Haken und Generatoren zu spawnen, was enorme Blutpunkt-Multiplikatoren gewährt.",
        "es": "Pétalos frágiles recolectados de la flor de pústula durante La plaga eterna.\nInvoca al Ente para generar ganchos y generadores de evento adicionales, otorgando grandes multiplicadores de puntos de sangre.",
        "ja": "常しえの胴枯れ中に採取された胴枯れ病の花の儚い花弁。\nエンティティに祈りを捧げ、追加のイベントフックと発電機を生成し、莫大なブラッドポイント倍率を獲得する。"
    },
    "BBQ Invitation": {
        "en": "An invitation to the Scorching Summer BBQ event.\nCalls upon The Entity to spawn extra event Margarita machines and Grill hooks, granting bonus Bloodpoints.",
        "pl": "Zaproszenie na wydarzenie Upalne Letnie BBQ.\nWzywa Byt do utworzenia dodatkowych maszyn Margarity i haków do grilla, przyznając dodatkowe Punkty Krwi.",
        "de": "Eine Einladung zum Sengenden Sommer-BBQ-Event.\nRuft den Entitus an, um zusätzliche Margarita-Maschinen und Grill-Haken zu spawnen, was Bonus-Blutpunkte gewährt.",
        "es": "Una invitación al evento Barbacoa del verano abrasador.\nInvoca al Ente para generar máquinas de margaritas y ganchos de barbacoa adicionales, otorgando puntos de sangre adicionales.",
        "ja": "灼熱のサマーバーベキューイベントへの招待状。\nエンティティに祈りを捧げ、追加のマルガリータマシンとグリル型フックを生成し、ボーナスブラッドポイントを獲得する。"
    }
}


ITEMS_MASTER_GUIDS: Dict[str, Tuple[str, str, str]] = {
    # Firecrackers
    "chinesefirecracker": ("16EF07C24D3272AF77AAE086C65B5362", "16EF07C24D3272AF77AAE086C65B5362", "Firecracker"),
    "thirdyearpartystarter": ("A535F33146FE34C6270026913050240C", "A535F33146FE34C6270026913050240C", "Firecracker"),
    "winterpartystarter": ("1AC4AF774C25C01AD31C6FBC07FC8E01", "F2438C154F0A4320F6D4088B599692BB", "Firecracker"),

    # Flashlights
    "flashlight": ("0B5410D64066D5E250CBDEBFE7DC7A6F", "FF61568341FFD3D1900239B736E526B3", "Flashlight"),
    "sportflashlight": ("A3EB9DFE402FDF983D90BAA8B7E2CE84", "A3EB9DFE402FDF983D90BAA8B7E2CE84", "Flashlight"),
    "utilityflashlight": ("0FC05EC5473F968097A803ADF11079AF", "0FC05EC5473F968097A803ADF11079AF", "Flashlight"),
    "anniversaryflashlight": ("527638604D6760809948A8A89A897033", "A9B8C6E542009041B58A298D407D40ED", "Flashlight"),
    "banquetflashlight": ("B79F756748AC8146E3CE069FD45230EE", "B79F756748AC8146E3CE069FD45230EE", "Flashlight"),
    "masqueradeflashlight": ("A668DB744EECA90CAAA9E08FE93BA69C", "87816CA146FBC13AB05FEAA6C55997FE", "Flashlight"),
    "willowisp": ("33F10B984A9BC0248688E5A9C1B3BE28", "8CDBD5A54841B70061E0CE82A3B9B047", "Flashlight"),

    # Fog Vials
    "apprenticesfogvial": ("7B16C9214023CD8E7CEDB2BF53CF0340", "7B16C9214023CD8E7CEDB2BF53CF0340", "Fog Vial"),
    "artisansfogvial": ("C2090A504A0859868E862389576F20A2", "DA0BBDBC4871CA40C3A0928935908E6D", "Fog Vial"),
    "vigosfogvial": ("928B32A94CC5EFDB88D1D98B4D8AF293", "E7523D2844C22153E13715897EE387A8", "Fog Vial"),

    # Keys
    "brokenkey": ("156551904F16120342AAFE8CB29B1B9B", "7F120EDA45CD2BB4C14CE3817EE0C77F", "Key"),
    "dullkey": ("8938A6574BEF3FAA8C1806B64AC26B34", "29AD9AF64A107E6AE8C8C4B8765BC106", "Key"),
    "skeletonkey": ("4C8ADC134429F45FE47256B81F131CE1", "BC1D48774A9BFC01101D4CA5D1D2C8A7", "Key"),

    # Maps
    "crypticmap": ("2D6CDBC9490140ED52D6C78F833CB48E", "078D8D9F46C319C3815155866F6909CC", "Map"),
    "scribbledmap": ("58C1C70040DE419FDD97339E24DA3D6D", "E203FFF34B5709FAED9132B11CB35FC5", "Map"),
    "annotatedmap": ("02CF652B41901AC403273DA7C33A7512", "8D0A018A445145A495C325A69F7063E3", "Map"),
    "bloodsensemap": ("278618094217179C9F015C9A178BE653", "E3FD9F4D4546420E0C3B38820504DCE0", "Map"),

    # Med-Kits
    "campingaidkit": ("B6C91DF2484E85B22CE32EA522BC146B", "6951DC284BD56F737590D1BA514E0A2B", "Med-Kit"),
    "firstaidkit": ("3F5F48EC4A47553FB86B5EB93A9164FF", "5B62868349D2ECE9628EF58F2D39391E", "Med-Kit"),
    "emergencymedkit": ("8EDC8C80474BE9663CF92CADEDC0FE31", "76CBE38442556C4843319CBB0D530C61", "Med-Kit"),
    "rangermedkit": ("CE8B97AB4A592E811DBAB18E92A66C52", "86D918D8446DE6B525A628AACF68C004", "Med-Kit"),
    "allhallowsevelunchbox": ("027011554DA9FBBAE0B2879206F911FE", "027011554DA9FBBAE0B2879206F911FE", "Med-Kit"),
    "anniversarymedkit": ("1113EC1C461087E197761290B8D280A3", "D35A421041984C0A520CE7BEE303DED9", "Med-Kit"),
    "banquetmedkit": ("F451E11B41770A62341899AE3218CED8", "F451E11B41770A62341899AE3218CED8", "Med-Kit"),
    "masquerademedkit": ("5CC3F51640EFEE4128FE88919B7EE742", "A0CA35064F3906BADFAA2EB304F16C96", "Med-Kit"),

    # Toolboxes
    "wornouttools": ("1D608EED4227F7FCFB48CCACD22458CB", "1909D8A7472ABAE80AE672A48446185B", "Toolbox"),
    "toolbox": ("0E4E28A3432C6B2AA03C6DA387EEAA87", "FEE27EF644F0E274818D228E6AB9CA22", "Toolbox"),
    "commodioustoolbox": ("C4B36BB94BFCF4E69A988C8861B3CBAF", "07EDC1F94E8F72D8B04313B607C750D2", "Toolbox"),
    "mechanicstoolbox": ("30BEC6CD45E85C97C477D58F2E397F38", "058E8AB443E4147320F3909F167400A5", "Toolbox"),
    "alexstoolbox": ("0C174EDC4CCA0BF88EBD0C9DA71705AA", "1A2A23064982CC6113EFF9B68D252175", "Toolbox"),
    "engineerstoolbox": ("AB320174429B7F1C2B2077BFAFAAA284", "BC73528E415A5B8A023A80BD84B56F3C", "Toolbox"),
    "anniversarytoolbox": ("3099EE854EBF0AF30926E3AD02431DDE", "6696CE854DF06CE9C73CA484043C35BB", "Toolbox"),
    "banquettoolbox": ("880162984F34202C94C0D9BCDA915EF8", "880162984F34202C94C0D9BCDA915EF8", "Toolbox"),
    "festivetoolbox": ("3B70C0A24CFC2558AC7EC385B871CF25", "3F62E9AA4FA098991D699783B1B64DEB", "Toolbox"),
    "masqueradetoolbox": ("79E0B50D4CB7A56F6E7AAA8E6FF10C55", "995601FD496CCA65D358DABD73767F43", "Toolbox"),

    # Special / In-Trial Items
    "antidote": ("445CEAEC453E5927BDC373B924B41A32", "3B2AC27D45C07E8E96717FA4D5192943", "Special"),
    "bloodcan": ("3D746750440BC4F601F54689D68F380A", "5259E4FE412F91A13172C1AEF0F098B0", "Special"),
    "candelabra": ("0271CC53474BF83632ACCE8AD3FBA020", "70F2C9D24085F87F56D5E4B96FF3F414", "Special"),
    "emp": ("6477510741B695E3BC29D1A6204E578F", "4E2D928A490A5EC64013A4973159911D", "Special"),
    "eyeofvecna": ("6CC3B71A49EA36D3934F40820E5F7171", "485A2C454DE2DC6B1DBD25BACA3D565A", "Special"),
    "firstaidspray": ("184B79C5435AF684DC1F5D9E6D49CF07", "2E78A67042D006B31231DF91A900625F", "Special"),
    "flashgrenade": ("450D58B1416B87B417331C90FD102CBE", "26E2F8364C702A1DA0822CA3BA533E58", "Special"),
    "fogcrystal": ("A946893649566B4BC7C67DBC1BCB07EA", "E00322574C25A4E1FA6C64819DF9DC5C", "Special"),
    "fragilemirror": ("056F923347345E31F71719ABD8D08D98", "C377D2584368941DC85D3A95C2A328EE", "Special"),
    "glowingfungus": ("81B47220495BCE824F805A80C654C370", "83019D484EE18C1F9A71148A87D3F03E", "Special"),
    "handofvecna": ("505CBDA547BDD07DBC3F038127F7ED52", "6CC3B71A49EA36D3934F40820E5F7171", "Special"),
    "keycard": ("71EDD4534E84CC5A72A0619D25C64418", "24DE997242C68F8A6BA641B43C6C1B00", "Special"),
    "lamentconfiguration": ("8387F4AC409641BC410654B08D8C76AA", "2E8901DE4F5294D8B9EA5F8233F7233D", "Special"),
    "lantern": ("0271CC53474BF83632ACCE8AD3FBA020", "A77DB6274D81E9DA2AB5409938689CC5", "Special"),
    "pocketmirror": ("056F923347345E31F71719ABD8D08D98", "C377D2584368941DC85D3A95C2A328EE", "Special"),
    "remoteflameturret": ("1A8AE0D24048AC9754D80D9EAE36EBBE", "3A17F51140307A8D60F7B6810EE26E27", "Special"),
    "searcherspendant": ("8F55711746B357F0F3BA0FB3026DE9F7", "SearchersPendant_Description", "Special"),
    "vhstape": ("12B0FC7D4E7D3D334C649EA70DED3365", "97A389F24AEB551136913EA7972BA6EA", "Special"),
    "vaccine": ("36D7B89C4201E76C5B2C59B86847CB74", "837DDEA04BBB3FAF6E9F0DA62BAA13C6", "Special"),
    "voidcrystal": ("4A198078440ECA6F19401CAC97F2B32C", "00F6061241E35D9703FA6A810DEF6C01", "Special"),
}

SPECIAL_ITEM_DESCRIPTIONS: Dict[str, Dict[str, str]] = {
    "Searcher's Pendant": {
        "en": "An artifact from another place, where dark forces rule. Can be retrieved from chests in the trial.",
        "pl": "Artefakt z innego wymiaru, gdzie rządzą mroczne siły. Można go zdobyć ze skrzyń w próbie.",
        "de": "Ein Artefakt von einem anderen Ort, an dem dunkle Mächte herrschen. Kann aus Kisten in der Prüfung geborgen werden.",
        "es": "Un artefacto de otro lugar donde gobiernan fuerzas oscuras. Se puede obtener de los cofres en la partida.",
        "ja": "闇の勢力が支配する異界の遺物。試練内のチェストから回収できる。"
    }
}


def discover_available_locales(translations_dir: Path) -> List[str]:


    """Finds all available locale JSON files (e.g. en.json, pl.json, fr.json) in the folder."""
    locales = []
    for json_file in sorted(translations_dir.glob("*.json")):
        name = json_file.name.lower()
        if name in EXCLUDED_JSON_FILES:
            continue
        stem = json_file.stem.lower()
        # Matches typical 2 to 5 letter locale codes like 'en', 'pl', 'de', 'es', 'ja', 'fr', 'pt-br', 'zh-cn'
        if re.match(r"^[a-z]{2}(?:[-_][a-z]{2,4})?$", stem):
            locales.append(stem)
    return locales


def build_squashed_translations_bundle(
    translations_dir: Path,
    locales: List[str],
) -> Dict[str, Any]:
    """
    Parses characters_dump.json and all discovered locale dumps to produce
    the consolidated multi-language translations dictionary.
    """
    characters_dump_path = translations_dir / "characters_dump.json"
    if not characters_dump_path.exists():
        raise FileNotFoundError(f"Master characters dump not found at {characters_dump_path}")

    logger.info(f"Loading master dump from {characters_dump_path.name}...")
    with open(characters_dump_path, "r", encoding="utf-8") as f:
        master_dump = json.load(f)

    # If items_dump.json exists, merge its sections
    items_dump_path = translations_dir / "items_dump.json"
    if items_dump_path.exists():
        try:
            with open(items_dump_path, "r", encoding="utf-8") as f:
                items_dump_data = json.load(f)
            for k, v in items_dump_data.items():
                if k not in master_dump:
                    master_dump[k] = v
        except Exception as e:
            logger.warning(f"Could not merge items_dump.json: {e}")

    # 1. Load string tables for each requested locale
    locale_tables: Dict[str, Dict[str, str]] = {}
    for loc in locales:
        loc_file = translations_dir / f"{loc}.json"
        if loc_file.exists():
            logger.info(f"Loading locale table: {loc_file.name}...")
            locale_tables[loc] = load_locale_string_table(loc_file)
        else:
            logger.warning(f"Locale file {loc_file.name} not found; skipping {loc}.")

    available_locales = [loc for loc in locales if loc in locale_tables]
    en_dict = locale_tables.get("en", {})

    # Build reverse lookup by English text to automatically find GUIDs for un-keyed items / addons
    text_to_guid: Dict[str, str] = {}
    for k, v in en_dict.items():
        sk = simplify_name_key(v)
        if sk and sk not in text_to_guid:
            text_to_guid[sk] = k

    characters_out: Dict[str, Any] = {}
    perks_out: Dict[str, Any] = {}
    items_out: Dict[str, Any] = {}
    addons_out: Dict[str, Any] = {}
    offerings_out: Dict[str, Any] = {}

    # 2. Process all top-level sections in master_dump
    for root_key, section_data in master_dump.items():
        if not isinstance(section_data, dict) and not isinstance(section_data, list):
            continue

        # A. Character Sections (e.g. K01, S01, K02...)
        if isinstance(section_data, dict) and ("Character" in section_data or "Perks" in section_data or "Addons" in section_data or "ItemAddons" in section_data):
            char_block = section_data.get("Character", {})
            char_name_field = char_block.get("DisplayName", {})
            char_lore_field = char_block.get("BackStory") or char_block.get("Biography") or {}
            char_power_block = section_data.get("Power", {})

            canonical_name = resolve_text(char_name_field, en_dict, fallback=root_key, en_dict=en_dict, text_to_guid=text_to_guid)
            if not canonical_name or canonical_name.startswith("SURVIVOR_") or canonical_name.startswith("KILLER_"):
                # Handle special case where SourceString was internal token
                loc_string = char_name_field.get("LocalizedString") if isinstance(char_name_field, dict) else None
                canonical_name = loc_string or root_key

            char_chapter = section_data.get("Chapter") or section_data.get("ChapterName") or "Base Game"
            if isinstance(char_chapter, dict):
                char_chapter = resolve_text(char_chapter, en_dict, fallback="Base Game", en_dict=en_dict, text_to_guid=text_to_guid)

            char_translations: Dict[str, Dict[str, str]] = {}
            for loc in available_locales:
                l_dict = locale_tables[loc]
                l_name = resolve_text(char_name_field, l_dict, fallback=canonical_name, en_dict=en_dict, text_to_guid=text_to_guid)
                l_lore = resolve_text(char_lore_field, l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)
                p_name = resolve_text(char_power_block.get("DisplayName"), l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)
                p_desc = resolve_text(char_power_block.get("Description"), l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)

                # Resolve localized chapter name
                loc_ch = char_chapter
                for ch_pattern, ch_locs in CHAPTER_TRANSLATIONS_MASTER.items():
                    if ch_pattern.lower() in char_chapter.lower() or char_chapter.lower() in ch_pattern.lower():
                        loc_ch = ch_locs.get(loc, ch_locs.get("en", char_chapter))
                        break

                char_translations[loc] = {
                    "name": l_name,
                    "lore": l_lore,
                    "chapter_name": loc_ch,
                }
                if p_name or p_desc:
                    char_translations[loc]["power_name"] = p_name
                    char_translations[loc]["power_description"] = p_desc

            # Key primarily by canonical name to avoid code_prefix mixups (e.g. S18/S19 Stranger Things)
            c_key = canonical_name.strip() if canonical_name else root_key
            characters_out[c_key] = {
                "name": canonical_name,
                "code_prefix": root_key if re.match(r"^[KS]\d{2,3}$", root_key) else "",
                "chapter_name": char_chapter,
                "translations": char_translations,
            }
            # Also register by root_key alias if different
            if root_key != c_key:
                characters_out[root_key] = {
                    "name": canonical_name,
                    "code_prefix": root_key if re.match(r"^[KS]\d{2,3}$", root_key) else "",
                    "chapter_name": char_chapter,
                    "translations": char_translations,
                }

            # Process Perks under character
            for perk in section_data.get("Perks", []):
                p_name_field = perk.get("DisplayName", {})
                p_desc_field = perk.get("Description", {})
                canon_perk_name = resolve_text(p_name_field, en_dict, fallback=perk.get("Id", ""), en_dict=en_dict, text_to_guid=text_to_guid)
                if not canon_perk_name:
                    continue

                perk_translations: Dict[str, Dict[str, str]] = {}
                for loc in available_locales:
                    l_dict = locale_tables[loc]
                    l_pname = resolve_text(p_name_field, l_dict, fallback=canon_perk_name, en_dict=en_dict, text_to_guid=text_to_guid)
                    l_pdesc = resolve_text(p_desc_field, l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)
                    perk_translations[loc] = {
                        "name": l_pname,
                        "description": l_pdesc,
                    }

                perks_out[canon_perk_name] = {
                    "name": canon_perk_name,
                    "character_code": root_key,
                    "character_name": canonical_name,
                    "translations": perk_translations,
                }

            # Process Killer Power Addons under character (ItemAddons or Addons)
            char_addons = section_data.get("ItemAddons", []) or section_data.get("Addons", [])
            for addon in char_addons:
                a_name_field = addon.get("DisplayName", {})
                a_desc_field = addon.get("Description", {})
                canon_addon_name = resolve_text(a_name_field, en_dict, fallback=addon.get("Id", ""), en_dict=en_dict, text_to_guid=text_to_guid)
                if not canon_addon_name:
                    continue

                addon_translations: Dict[str, Dict[str, str]] = {}
                for loc in available_locales:
                    l_dict = locale_tables[loc]
                    l_aname = resolve_text(a_name_field, l_dict, fallback=canon_addon_name, en_dict=en_dict, text_to_guid=text_to_guid)
                    l_adesc = resolve_text(a_desc_field, l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)
                    addon_translations[loc] = {
                        "name": l_aname,
                        "description": l_adesc,
                    }

                addons_out[canon_addon_name] = {
                    "name": canon_addon_name,
                    "associated_target": canonical_name,
                    "category": "Killer",
                    "translations": addon_translations,
                }

        # B. Items Section (Survivor items: medkits, toolboxes, flashlights, keys, maps, firecrackers)
        if root_key in ["Items", "SurvivorItems"] and isinstance(section_data, list):
            for item in section_data:
                i_name_field = item.get("DisplayName", {})
                i_desc_field = item.get("Description", {})
                canon_item_name = resolve_text(i_name_field, en_dict, fallback=item.get("Id", ""), en_dict=en_dict, text_to_guid=text_to_guid)
                if not canon_item_name:
                    continue

                sk = simplify_name_key(canon_item_name)
                mapping = ITEMS_MASTER_GUIDS.get(sk)

                name_guid = None
                desc_guid = None
                item_cat = item.get("Category", "Survivor")
                if mapping:
                    name_guid, desc_guid, item_cat = mapping

                item_translations: Dict[str, Dict[str, str]] = {}
                for loc in available_locales:
                    l_dict = locale_tables[loc]
                    
                    # 1. Localized name
                    l_iname = canon_item_name
                    if name_guid and name_guid in l_dict and l_dict[name_guid]:
                        l_iname = l_dict[name_guid]
                    else:
                        l_iname = resolve_text(i_name_field, l_dict, fallback=canon_item_name, en_dict=en_dict, text_to_guid=text_to_guid)

                    # 2. Localized description
                    l_idesc = ""
                    if canon_item_name in SPECIAL_ITEM_DESCRIPTIONS:
                        l_idesc = SPECIAL_ITEM_DESCRIPTIONS[canon_item_name].get(loc, SPECIAL_ITEM_DESCRIPTIONS[canon_item_name].get("en", ""))
                    elif desc_guid and desc_guid in l_dict and l_dict[desc_guid]:
                        l_idesc = l_dict[desc_guid]
                    else:
                        l_idesc = resolve_text(i_desc_field, l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)

                    item_translations[loc] = {
                        "name": l_iname,
                        "description": l_idesc,
                    }

                items_out[canon_item_name] = {
                    "name": canon_item_name,
                    "category": item_cat,
                    "role": "Survivor",
                    "translations": item_translations,
                }

        # C. Global / Survivor Add-ons
        if root_key in ["SurvivorAddons", "GlobalAddons"] and isinstance(section_data, list):
            for addon in section_data:
                a_name_field = addon.get("DisplayName", {})
                a_desc_field = addon.get("Description", {})
                canon_addon_name = resolve_text(a_name_field, en_dict, fallback=addon.get("Id", ""), en_dict=en_dict, text_to_guid=text_to_guid)
                if not canon_addon_name:
                    continue

                addon_translations = {}
                for loc in available_locales:
                    l_dict = locale_tables[loc]
                    l_aname = resolve_text(a_name_field, l_dict, fallback=canon_addon_name, en_dict=en_dict, text_to_guid=text_to_guid)
                    l_adesc = resolve_text(a_desc_field, l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)
                    addon_translations[loc] = {
                        "name": l_aname,
                        "description": l_adesc,
                    }

                target = addon.get("Category", "Survivor Item")
                if "serum" in canon_addon_name.lower() or "blight serum" in canon_addon_name.lower() or "refined serum" in canon_addon_name.lower():
                    target = "Special"

                addons_out[canon_addon_name] = {
                    "name": canon_addon_name,
                    "category": "Survivor",
                    "associated_target": target,
                    "translations": addon_translations,
                }

        # D. Offerings Sections (SurvivorOfferings, KillerOfferings, CommonOfferings)
        if root_key in ["SurvivorOfferings", "KillerOfferings", "CommonOfferings", "Offerings"] and isinstance(section_data, list):
            offering_role = "Survivor" if "Survivor" in root_key else ("Killer" if "Killer" in root_key else "All")
            for offering in section_data:
                o_name_field = offering.get("DisplayName", {})
                o_desc_field = offering.get("Description", {})
                canon_off_name = resolve_text(o_name_field, locale_tables.get("en", {}), fallback=offering.get("Id", ""))
                if not canon_off_name:
                    continue

                ck = simplify_name_key(canon_off_name)
                mapping = OFFERINGS_MASTER_GUIDS.get(ck)
                
                cat = offering.get("Category", "Offering")
                role = offering_role
                rarity = offering.get("Rarity", "Common")
                name_guid = None
                desc_guid = None

                if mapping:
                    name_guid, desc_guid, cat, role, rarity = mapping

                name_lower = canon_off_name.lower()
                if (
                    rarity == "Event"
                    or "dousing" in name_lower
                    or "dowsing" in name_lower
                    or "cobbler" in name_lower
                    or "terrormisu" in name_lower
                    or "flan" in name_lower
                    or "torte" in name_lower
                    or "scream pie" in name_lower
                    or "gateau" in name_lower
                    or "sacrificial cake" in name_lower
                    or "cursed seed" in name_lower
                    or "pustula" in name_lower
                    or "bbq" in name_lower
                    or "red envelope" in name_lower
                    or "bloodshot eye" in name_lower
                ):
                    cat = "Special"
                    role = "All"
                    rarity = "Event"

                off_translations = {}
                for loc in available_locales:
                    l_dict = locale_tables[loc]
                    
                    # 1. Name resolution
                    l_oname = canon_off_name
                    if name_guid and name_guid in l_dict:
                        l_oname = l_dict[name_guid]
                    else:
                        l_oname = resolve_text(o_name_field, l_dict, fallback=canon_off_name)

                    # 2. Description resolution
                    l_odesc = ""
                    matched_override = None
                    for s_name, s_descs in SPECIAL_DESCRIPTIONS_OVERRIDE.items():
                        if simplify_name_key(s_name) == ck:
                            matched_override = s_descs.get(loc, s_descs.get("en", ""))
                            break

                    if matched_override:
                        l_odesc = matched_override
                    elif desc_guid and desc_guid in l_dict:
                        l_odesc = l_dict[desc_guid]
                    else:
                        l_odesc = resolve_text(o_desc_field, l_dict, fallback="")

                    off_translations[loc] = {
                        "name": l_oname,
                        "description": l_odesc,
                    }

                offerings_out[canon_off_name] = {
                    "name": canon_off_name,
                    "category": cat,
                    "role": role,
                    "rarity": rarity,
                    "icon_url": offering.get("Icon", ""),
                    "icon_local_path": offering.get("IconPath", ""),
                    "translations": off_translations,
                }

        # E. General Perks (Survivor & Killer General Perks)
        if root_key in ["GeneralPerks", "CommonPerks", "General"] and isinstance(section_data, list):
            for perk in section_data:
                p_name_field = perk.get("DisplayName", {})
                p_desc_field = perk.get("Description", {})
                canon_perk_name = resolve_text(p_name_field, en_dict, fallback=perk.get("Id", ""), en_dict=en_dict, text_to_guid=text_to_guid)
                if not canon_perk_name:
                    continue

                perk_translations = {}
                for loc in available_locales:
                    l_dict = locale_tables[loc]
                    l_pname = resolve_text(p_name_field, l_dict, fallback=canon_perk_name, en_dict=en_dict, text_to_guid=text_to_guid)
                    l_pdesc = resolve_text(p_desc_field, l_dict, fallback="", en_dict=en_dict, text_to_guid=text_to_guid)
                    perk_translations[loc] = {
                        "name": l_pname,
                        "description": l_pdesc,
                    }

                perks_out[canon_perk_name] = {
                    "name": canon_perk_name,
                    "character_code": "General",
                    "character_name": "General",
                    "translations": perk_translations,
                }

    bundle = {
        "version": "2.0",
        "supported_locales": available_locales,
        "chapters": CHAPTER_TRANSLATIONS_MASTER,
        "characters": characters_out,
        "perks": perks_out,
        "items": items_out,
        "addons": addons_out,
        "offerings": offerings_out,
    }

    return bundle


def main():
    parser = argparse.ArgumentParser(
        description="Extract and squash Dead by Daylight translations for LemonDBD backend."
    )
    parser.add_argument(
        "--translations-dir",
        "-d",
        type=str,
        default=str(Path(__file__).resolve().parent),
        help="Path to the directory containing characters_dump.json and {locale}.json dumps.",
    )
    parser.add_argument(
        "--out",
        "-o",
        type=str,
        default=str(
            Path(__file__).resolve().parent.parent / "backend" / "app" / "translations" / "translations.json"
        ),
        help="Target output file path for the squashed translations.json bundle.",
    )
    parser.add_argument(
        "--locales",
        "-l",
        nargs="+",
        help="List of locales to extract (e.g. --locales en pl de es ja fr). Defaults to all discovered *.json files.",
    )
    parser.add_argument(
        "--minified",
        "-m",
        action="store_true",
        help="Also write a minified .min.json file alongside the main output.",
    )

    args = parser.parse_args()

    trans_dir = Path(args.translations_dir)
    out_file = Path(args.out)

    if not trans_dir.exists():
        logger.error(f"Translations directory not found: {trans_dir}")
        sys.exit(1)

    # 1. Discover or select locales
    if args.locales:
        locales = [l.lower() for l in args.locales]
    else:
        locales = discover_available_locales(trans_dir)

    logger.info("==================================================")
    logger.info("        LemonDBD Translations Generator           ")
    logger.info("==================================================")
    logger.info(f"Translations Source: {trans_dir}")
    logger.info(f"Target Output File:  {out_file}")
    logger.info(f"Target Locales:      {', '.join(locales)}")
    logger.info("--------------------------------------------------")

    # 2. Build squashed bundle
    try:
        bundle = build_squashed_translations_bundle(trans_dir, locales)
    except Exception as e:
        logger.error(f"Failed generating translations bundle: {e}", exc_info=True)
        sys.exit(1)

    # 3. Write output file
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)

    file_size_kb = out_file.stat().st_size / 1024
    logger.info(f"Generated {out_file.name} ({file_size_kb:.1f} KB)")

    if args.minified:
        min_file = out_file.with_suffix(".min.json")
        with open(min_file, "w", encoding="utf-8") as f:
            json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))
        logger.info(f"Generated {min_file.name} ({min_file.stat().st_size / 1024:.1f} KB)")

    # 4. Summary metrics
    logger.info("--------------------------------------------------")
    logger.info("Extraction Metrics Summary:")
    logger.info(f"  • Characters: {len(bundle['characters'])}")
    logger.info(f"  • Perks:      {len(bundle['perks'])}")
    logger.info(f"  • Items:      {len(bundle['items'])}")
    logger.info(f"  • Addons:     {len(bundle['addons'])}")
    logger.info(f"  • Offerings:  {len(bundle['offerings'])}")
    logger.info(f"  • Locales:    {', '.join(bundle['supported_locales'])}")
    logger.info("==================================================")
    logger.info("Translations successfully squashed and ready for backend deployment!")


if __name__ == "__main__":
    main()
