import copy
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent
CHARACTERS_DIR = BASE_DIR / "DBDCharacters"
DUMP_FILE = BASE_DIR / "characters_dump.json"
BACKEND_TRANSLATIONS_DIR = BASE_DIR.parent / "backend" / "app" / "translations"


def sanitize_text(text: str) -> str:
    """Czyści sekwencje ucieczki i zamienia tagi HTML na czysty tekst z formatowaniem Markdown."""
    if not isinstance(text, str):
        return text

    # 1. Clean escaped quotes and backslashes
    text = re.sub(r'\\([„”"\'’])', r'\1', text)
    text = text.replace('\\"', '"').replace("\\\\", "\\")

    # 2. Convert spans with classes (FlavorText, ReminderText, Highlight)
    text = re.sub(r'<span\s+class=["\']FlavorText["\']>(.*?)</span>', r'\n"\1"\n', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<span\s+class=["\']ReminderText["\']>(.*?)</span>', r'\n\1\n', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<span\s+class=["\']Highlight\d*["\']>(.*?)</span>', r'\1', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'</?span[^>]*>', '', text, flags=re.IGNORECASE)

    # 3. Convert line breaks and paragraph tags
    text = re.sub(r'</?br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?p[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</?div[^>]*>', '\n', text, flags=re.IGNORECASE)

    # 4. Convert lists
    text = re.sub(r'</?ul[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li>(.*?)</li>', r'\n• \1', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'<li>', '\n• ', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '', text, flags=re.IGNORECASE)

    # 5. Strip styling tags
    text = re.sub(r'</?b>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?i>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?strong>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?em>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?font[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?color[^>]*>', '', text, flags=re.IGNORECASE)

    # 6. Remove any remaining stray HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # 7. Normalize newlines and whitespace
    text = text.replace("%%", "%")
    lines = [l.strip() for l in text.splitlines()]
    clean_lines = [l for l in lines if l]
    return '\n'.join(clean_lines)


def flatten_lang_file(file_path: Path) -> dict[str, str]:
    """Spłaszcza plik językowy (niezależnie od przestrzeni nazw) do mapy {GUID_Key: Text}."""
    flat_map = {}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        def recurse(node):
            if isinstance(node, dict):
                for k, v in node.items():
                    if isinstance(v, (dict, list)):
                        recurse(v)
                    elif isinstance(v, str):
                        k_clean = k.strip()
                        v_clean = sanitize_text(v)
                        if v_clean and not v_clean.startswith("@#"):
                            flat_map[k_clean] = v_clean
            elif isinstance(node, list):
                for item in node:
                    recurse(item)

        recurse(data)
    except Exception as e:
        print(f"Błąd wczytywania {file_path.name}: {e}")
    return flat_map


def build_source_to_guid_index() -> dict[str, str]:
    """Skanuje wszystkie pliki DB i zrzuty, mapując SourceString na unikalny GUID Key."""
    source_to_guid = {}

    def extract_pairs(node):
        if isinstance(node, dict):
            key = node.get("Key")
            src = node.get("SourceString")
            if (
                key
                and src
                and isinstance(key, str)
                and isinstance(src, str)
                and len(key.strip()) >= 16
            ):
                source_to_guid[src.strip().upper()] = key.strip()
            for v in node.values():
                extract_pairs(v)
        elif isinstance(node, list):
            for item in node:
                extract_pairs(item)

    # 1. Skanowanie bazy characters_dump
    for df in BASE_DIR.glob("*dump*.json"):
        try:
            with open(df, "r", encoding="utf-8") as f:
                extract_pairs(json.load(f))
        except Exception:
            pass

    # 2. Skanowanie folderu DBDCharacters
    if CHARACTERS_DIR.exists():
        for jf in CHARACTERS_DIR.rglob("*.json"):
            try:
                with open(jf, "r", encoding="utf-8") as f:
                    extract_pairs(json.load(f))
            except Exception:
                pass

    return source_to_guid


def load_all_tunables(characters_dir: Path) -> dict[str, str]:
    """Wczytuje wszystkie pliki *Tunable*.json oraz bazy DB, grupuje poziomy 1/2/3 i normalizuje klucze."""
    tunables_map = {}
    tiered_keys = {}

    if characters_dir.exists():
        for json_path in characters_dir.rglob("*.json"):
            if "tunable" in json_path.name.lower() or "db" in json_path.name.lower():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        content = json.load(f)

                    rows = {}
                    if isinstance(content, list) and content:
                        rows = content[0].get("Rows", {})
                    elif isinstance(content, dict):
                        rows = content.get("Rows", {})

                    for k, v in rows.items():
                        k_clean = k.strip()
                        val_str = ""

                        if "ValuesByLevel" in v and isinstance(v["ValuesByLevel"], list):
                            levels = v["ValuesByLevel"][:3]
                            formatted = [
                                str(int(x) if isinstance(x, (int, float)) and x == int(x) else x)
                                for x in levels
                            ]
                            val_str = "/".join(formatted)
                        elif "Value" in v:
                            val = v["Value"]
                            val_str = str(int(val) if isinstance(val, (int, float)) and val == int(val) else val)

                        if val_str:
                            norm_key = k_clean.lower().replace("tunable.", "").replace("_", ".")
                            norm_key_nozero = re.sub(r"([sk])0+([0-9]+)", r"\1\2", norm_key)

                            # Check if tiered key e.g. S53P01_HasteValue1 / S53P01_HasteValue2
                            m = re.match(r"^(.*?)[_.]?([123])$", norm_key)
                            if m:
                                base_key = m.group(1).rstrip("._")
                                lvl = int(m.group(2))
                                tiered_keys.setdefault(base_key, {})[lvl] = val_str
                                base_nozero = re.sub(r"([sk])0+([0-9]+)", r"\1\2", base_key)
                                tiered_keys.setdefault(base_nozero, {})[lvl] = val_str
                            else:
                                for k_alias in [norm_key, norm_key_nozero]:
                                    tunables_map[k_alias] = val_str
                                    tunables_map[k_alias.replace(".", "_")] = val_str
                                    tunables_map[re.sub(r"[^a-z0-9]", "", k_alias)] = val_str
                except Exception:
                    continue

    # Merge tiered keys (e.g. 1/2/3 -> val1/val2/val3)
    for base_key, levels in tiered_keys.items():
        if len(levels) >= 2:
            combined = "/".join([levels[i] for i in sorted(levels.keys())])
            tunables_map[base_key] = combined
            tunables_map[base_key.replace(".", "_")] = combined
            tunables_map[re.sub(r"[^a-z0-9]", "", base_key)] = combined

    # Dynamic loader for S054 (Aurora), K044 (The Judgment), and all character PerkTunablesDB.json files
    for char_dir in characters_dir.iterdir():
        if not char_dir.is_dir():
            continue
        pt_file = char_dir / "PerkTunablesDB.json"
        if not pt_file.exists():
            continue
        try:
            with open(pt_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            rows = data[0].get("Rows", {}) if isinstance(data, list) and data else {}
            # S054 dynamic resolution from actual game file
            if "S054P01_HealingProgressGained1" in rows:
                heal_prog = "/".join([str(int(rows[f"S054P01_HealingProgressGained{i}"]["Value"] * 100)) for i in [1, 2, 3] if f"S054P01_HealingProgressGained{i}" in rows])
                tunables_map["s054p01.healprogress"] = heal_prog
                tunables_map["s54p01.healprogress"] = heal_prog
                tunables_map["s054p01.tokensgained"] = "1"
                tunables_map["s54p01.tokensgained"] = "1"
            if "S054P02_SurvivorAuraRevealDuration" in rows:
                dur = str(int(rows["S054P02_SurvivorAuraRevealDuration"]["Value"]))
                tunables_map["s054p02.survivorauraduration"] = dur
                tunables_map["s54p02.survivorauraduration"] = dur
            if "S054P02_OtherSurvivorsAuraRevealDuration1" in rows:
                o_dur = "/".join([str(int(rows[f"S054P02_OtherSurvivorsAuraRevealDuration{i}"]["Value"])) for i in [1, 2, 3] if f"S054P02_OtherSurvivorsAuraRevealDuration{i}" in rows])
                tunables_map["s054p02.othersurvivorauraduration"] = o_dur
                tunables_map["s54p02.othersurvivorauraduration"] = o_dur
            if "S054P03_RegressionSlowingSpeed" in rows:
                regr = str(int(rows["S054P03_RegressionSlowingSpeed"]["Value"] * 100))
                tunables_map["s054p03.regressionmodifier"] = regr
                tunables_map["s54p03.regressionmodifier"] = regr
            if "S054P03_RepairSpeedBonus1" in rows:
                rep = "/".join([str(int(rows[f"S054P03_RepairSpeedBonus{i}"]["Value"] * 100)) for i in [1, 2, 3] if f"S054P03_RepairSpeedBonus{i}" in rows])
                tunables_map["s054p03.repairspeedmodifier"] = rep
                tunables_map["s54p03.repairspeedmodifier"] = rep

            # K044 dynamic resolution from actual game file
            if "K044P01_ObsessionAuraRevealCheckInterval" in rows:
                t_val = str(int(rows["K044P01_ObsessionAuraRevealCheckInterval"]["Value"]))
                tunables_map["k044p01.timer"] = t_val
                tunables_map["k44p01.timer"] = t_val
            if "K044P01_ObsessionAuraRevealMinDistance1" in rows:
                d_val = str(int(rows["K044P01_ObsessionAuraRevealMinDistance1"]["Value"] / 100))
                tunables_map["k044p01.distance"] = d_val
                tunables_map["k44p01.distance"] = d_val
            if "K044P01_ObsessionAuraRevealDuration1" in rows:
                dur_list = []
                for i in [1, 2, 3]:
                    if f"K044P01_ObsessionAuraRevealDuration{i}" in rows:
                        v = rows[f"K044P01_ObsessionAuraRevealDuration{i}"]["Value"]
                        dur_list.append(str(int(v)) if v == int(v) else str(v))
                dur_str = "/".join(dur_list)
                tunables_map["k044p01.auraduration"] = dur_str
                tunables_map["k44p01.auraduration"] = dur_str
            if "K044P02_AlertRange" in rows:
                ar_val = str(int(rows["K044P02_AlertRange"]["Value"] / 100))
                tunables_map["k044p02.hasterange"] = ar_val
                tunables_map["k44p02.hasterange"] = ar_val
            if "K044P02_HasteCapValue1" in rows:
                cap = "/".join([str(int(rows[f"K044P02_HasteCapValue{i}"]["Value"] * 100)) for i in [1, 2, 3] if f"K044P02_HasteCapValue{i}" in rows])
                tunables_map["k044p02.hastecap"] = cap
                tunables_map["k44p02.hastecap"] = cap
            if "K044P03_RegressionModifierMultiplier" in rows:
                rm_val = str(int(rows["K044P03_RegressionModifierMultiplier"]["Value"]))
                tunables_map["k044p03.fasterregression"] = rm_val
                tunables_map["k44p03.fasterregression"] = rm_val
        except Exception:
            continue

    # Supplemental dictionary of any non-Unreal row mappings (e.g. Trapper, General, etc.)
    NAMED_TUNABLES_DICT = {
        # --- K01 Trapper ---
        "k01p01.skillcheckoddsincrease": "6/8/10",
        "k01p01.successzonesizepenalty": "40/50/60",
        "k01p02.actionspeed": "10/15/20",
        "k01p03.haste": "6/12/18",
        "k01p03.terrorradiusincreasesize": "6/8/12",

        # --- Other Killers ---
        "k04p03.aurarevealdistance": "28",
        "k06p01.tokenslostonhit": "2",
        "k06p02.obsessionactionspeedbonus": "33/40/47",
        "k06p03.chargegainedcooldown": "120",
        "k06p03.tokenslostonaction": "1",
        "k06p03.haste": "5",
        "k09p01.distancethreshold": "16",
        "k09p01.triggertime": "90/60/30",
        "k09p01.hinderedduration": "30",
        "k09p01.hindered": "5/10/15",
        "k09p02.mindistancefromhook": "32",
        "k09p02.aurarevealduration": "15",
        "k09p03.itemsrevealdistance": "32",
        "k11p01.aurarevealdistance": "36/40/44",
        "k16p01.cooldown": "60",
        "k17p01.affecteddistance": "32",
        "k17p01.regression": "8",
        "k17p03.lingerduration": "4/5/6",
        "k23p03.gateblockdurationpertoken": "6/8/10",
        "k25p01.generatorblockduration": "30",
        "k25p02.totemaurarevealdistance": "16",
        "k25p02.totemblockduration": "90",
        "k25p03.mangledhemorrhageduration": "20/25/30",
        "k25p03.actionspeeddebuff": "10/13/16",
        "k26p01.finalgeneratorblockduration": "20/25/30",
        "k26p01.aurarevealduration": "6",
        "k26p02.generatorregression": "9/12/15",
        "k26p03.maxtokens": "4",
        "k31p02.range": "16",
        "k31p02.revealduration": "4/5/6",
        "k35p03.cooldown": "40/35/30",
        "k38p01.cooldown": "60/50/40",
        "k39p02.bonuspertoken": "2/3/4",
        "k43p01.distancetosurvivors": "16",
        "k43p01.uniquesurvivorstohook": "4",
        "k43p01.hinderedvalue": "3/4/5",
        "k43p02.starttrialundetectableduration": "30",
        "k43p03.tokensmaximum": "3",
        "k43p03.tokensgained": "1",
        "k43p03.cooldown": "60/50/40",
        "k43p03.hastevalue": "6/8/10",

        # --- Other Survivors ---
        "s05p01.fallstaggerreduction": "75",
        "s05p01.fallgruntreduction": "100",
        "s08p03.recoverextraspeed": "35/40/45",
        "s12p03.maxtokens": "3",
        "s12p03.bonusprogress": "1/1.5/2",
        "s12p03.tokensspent": "1",
        "s13p03.hookaurablockrange": "48/56/64",
        "s14p03.progressionbonuspertoken": "1",
        "s14p03.tokensperskillcheck": "1",
        "s15p03.hiddenduration": "6/8/10",
        "s16p03.exhaustedduration": "60/50/40",
        "s17p03.aurarevealdistance": "24",
        "s17p03.tokensneeded": "3",
        "s18p01.haste": "7",
        "s18p01.hasteduration": "6/8/10",
        "s18p01.stealthduration": "6/8/10",
        "s18p01.aurarevealduration": "6/8/10",
        "s18p02.pausetimer": "26/30/34",
        "s18p02.pausedistance": "16",
        "s18p03.requiredhealthstate": "1",
        "s18p03.durationofheal": "20",
        "s24p01.chestsearchspeedbonus": "40/60/80",
        "s24p01.maxrummagesperchest": "1",
        "s25p01.bonuspertoken": "4/5/6",
        "s26p01.stackablecleansespeed": "8/9/10",
        "s26p01.aurarevealduration": "4",
        "s29p02.aurarevealduration": "6/8/10",
        "s29p02.tokensspentpermiss": "1",
        "s35p03.lingerduration": "20/25/30",
        "s37p03.rummages": "1",
        "s38p02.extraaurarevealduration": "6/7/8",
        "s38p02.cooldown": "60",
        "s38p03.hasteduration": "4/5/6",
        "s42p02.highrollbonus": "15",
        "s42p02.effectduration": "15",
        "s42p02.cooldown": "110/100/90",
        "s43p03.genchargesremoved": "60/50/40",
        "s49p01.maxtokens": "3",
        "s49p01.healingspeedincrease": "30/40/50",
        "s49p02.cooldown": "60/50/40",
        "s51p02.aurarevealduration": "3/4/5",
        "s52p01.maxtokens": "3",
        "s52p01.tokenspergenerator": "1",
        "s52p01.actionspeedbuff": "6/8/10",
        "s52p02.effectduration": "10/12/14",
        "s52p03.palletwindowauracount": "1/2/3",
        "s52p03.actionspeedbuff": "20/25/30",
        "s52p03.cooldown": "60/50/40",
        "s53p01.hastevalue": "10/12.5/15",
        "s53p01.cooldownduration": "60",
        "s53p01.palletblockduration": "60",
        "s53p01.hasteduration": "3",
        "s53p02.totemblesscleanserequirement": "1",
        "s53p02.permanenthealingvalue": "12/14/16",
        "s53p02.permanentchargesonhealing": "12/14/16",
        "s53p03.traillifetime": "10",
        "s53p03.trailactorlifetime": "10",
        "s53p03.statuslinger": "3/4/5",
        "s53p03.elusivelingerduration": "3/4/5",

        # --- General Survivor Perks ---
        "sg_small_game.tokenspertotem": "1",
        "sg_small_game.maxtokens": "5",
        "sg_small_game.perkeffectdistance": "8/10/12",
        "sg_small_game.detectionconeangle": "45",
        "sg_small_game.coneanglereduction": "5",
        "sg_small_game.cooldown": "14/12/10",
        "sg_kindred.aurarevealdistance": "8/12/16",
        "sg_slippery_meat.extraattempts": "3",
        "sg_slippery_meat.hookescapechance": "2/3/4",
        "sg_well_make_it.healingspeedincrease": "100",
        "sg_well_make_it.duration": "30/60/90",
        "sg_deja_vu.generatorsshown": "3",
        "sg_deja_vu.repairspeed": "4/5/6",
        "sg_premonition.perkeffectdistance": "36",
        "sg_premonition.activationangle": "45",
        "sg_premonition.cooldown": "60/45/30",
        "sg_dark_sense.aurarevealdistance": "24",
        "sg_dark_sense.aurarevealduration": "5/7/10",
        "sg_lightweight.scratchmarkstimereduction": "3/4/5",
        "sg_no_one_left_behind.actionspeed": "30/40/50",
        "sg_no_one_left_behind.increasedhaste": "7",
        "sg_plunderers_instinct.chestaurarevealdistance": "16/24/32",
        "sg_plunderers_instinct.modifychestrarity": "Slightly/Moderately/Considerably",
        "sg_resilience.actionspeed": "3/6/9",
        "sg_hope.haste": "5/6/7",
        "sg_spine_chill.range": "36",
        "sg_spine_chill.actionspeed": "2/4/6",
        "sg_this_is_not_happening.greatzonesizebonus": "10/20/30",

        # --- General Killer Perks ---
        "kg_no_one_escapes_death.haste": "2/3/4",
        "kg_no_one_escapes_death.aurarevealstartrange": "4",
        "kg_no_one_escapes_death.aurarevealendrange": "24",
        "kg_no_one_escapes_death.aurasizeincreasedelay": "30",
        "kg_bitter_murmur.aurarevealrange": "16",
        "kg_bitter_murmur.aurarevealduration": "5",
        "kg_bitter_murmur.aurarevealendgameduration": "5/7/10",
        "kg_deerstalker.revealduration": "10/12/14",
        "kg_deerstalker.revealtimeintervals": "30",
        "kg_distressing.terrorradiusincreasesize": "22/24/26",
        "kg_hex_thrill_of_the_hunt.tokenspertotem": "1",
        "kg_hex_thrill_of_the_hunt.actionspeedreductionpertoken": "8/9/10",
        "kg_insidious.timetoactivate": "4/3/2",
        "kg_iron_grasp.wigglestrengthreduction": "75",
        "kg_iron_grasp.wiggletimeincrease": "4/8/12",
        "kg_monstrous_shrine.range": "24",
        "kg_monstrous_shrine.fasterprogress": "10/15/20",
        "kg_sloppy_butcher.duration": "60/75/90",
        "kg_sloppy_butcher.hemmorhageboost": "25",
        "kg_spies_from_the_shadows.notificationrange": "20/28/36",
        "kg_spies_from_the_shadows.cooldown": "5",
        "kg_unrelenting.attackmisscooldownreduction": "20/25/30",
        "kg_whispers.rangetosurvivors": "48/40/32",
    }

    for mk, mv in NAMED_TUNABLES_DICT.items():
        tunables_map[mk] = mv
        tunables_map[mk.replace(".", "_")] = mv
        tunables_map[re.sub(r"[^a-z0-9]", "", mk)] = mv

    return tunables_map


def build_keyword_dictionaries(
    dump_data: dict,
    target_lang_map: dict[str, str],
    en_lang_map: dict[str, str],
    source_to_guid: dict[str, str],
) -> tuple[dict[str, str], dict[str, str]]:
    """
    Dynamicznie wyszukuje i mapuje wszystkie słowa kluczowe ({Keyword.X}) oraz
    ich odpowiedniki językowe z en.json i target_lang.json BEZ ŻADNEGO HARDCODOWANIA.
    """
    target_keywords = {}
    en_keywords = {}

    all_tokens: Set[str] = set()

    # Skanowanie całego dump_data oraz plików językowych
    def scan_tokens(node):
        if isinstance(node, dict):
            for v in node.values():
                scan_tokens(v)
        elif isinstance(node, list):
            for item in node:
                scan_tokens(item)
        elif isinstance(node, str):
            for m in re.finditer(r"\{Keyword\.([a-zA-Z0-9_]+)\}", node, re.IGNORECASE):
                all_tokens.add(m.group(1).strip())

    scan_tokens(dump_data)
    for v in en_lang_map.values():
        if isinstance(v, str):
            for m in re.finditer(r"\{Keyword\.([a-zA-Z0-9_]+)\}", v, re.IGNORECASE):
                all_tokens.add(m.group(1).strip())
    for v in target_lang_map.values():
        if isinstance(v, str):
            for m in re.finditer(r"\{Keyword\.([a-zA-Z0-9_]+)\}", v, re.IGNORECASE):
                all_tokens.add(m.group(1).strip())

    # Dla każdego tokena dynamicznie odnajdź GUID w pliku en.json
    for raw_token in all_tokens:
        spaced_token = re.sub(r"([a-z])([A-Z])", r"\1 \2", raw_token).strip()
        candidates = [
            raw_token.lower(),
            spaced_token.lower(),
            raw_token.upper(),
            f"KEYWORD_{raw_token.upper()}_NAME",
            f"KEYWORDS_{raw_token.upper()}_NAME",
            f"KEYWORD_{spaced_token.upper().replace(' ', '_')}_NAME",
        ]

        found_guid = None

        # A. Sprawdzenie w source_to_guid
        for cand in candidates:
            if cand in source_to_guid:
                found_guid = source_to_guid[cand]
                break

        # B. Sprawdzenie bezpośrednio po tekście angielskim w en_lang_map
        if not found_guid:
            for guid, en_text in en_lang_map.items():
                en_clean = en_text.strip().lower()
                if en_clean == raw_token.lower() or en_clean == spaced_token.lower():
                    found_guid = guid
                    break

        if found_guid:
            en_val = en_lang_map.get(found_guid)
            target_val = target_lang_map.get(found_guid)

            if en_val:
                en_keywords[raw_token.upper()] = en_val
                en_keywords[spaced_token.upper()] = en_val
            if target_val:
                target_keywords[raw_token.upper()] = target_val
                target_keywords[spaced_token.upper()] = target_val
        else:
            en_keywords[raw_token.upper()] = spaced_token
            target_keywords[raw_token.upper()] = spaced_token

    return target_keywords, en_keywords


INPUT_ACTION_TRANSLATIONS = {
    "en": {
        "ACTIVATABLEBUTTON1": "Active Ability Button 1",
        "ACTIVATABLEBUTTON2": "Active Ability Button 2",
        "POWER": "Power Button",
        "SECONDARYPOWER": "Secondary Power Button",
        "ACTIONSURVIVOR": "Action Button",
        "USEITEM": "Use Item Button",
        "PICKUP": "Pick Up Button",
        "PICKUPITEM": "Pick Up Button",
        "ATTACK": "Attack Button",
    },
    "pl": {
        "ACTIVATABLEBUTTON1": "przycisk zdolności aktywnej 1",
        "ACTIVATABLEBUTTON2": "przycisk zdolności aktywnej 2",
        "POWER": "przycisk mocy",
        "SECONDARYPOWER": "przycisk mocy dodatkowej",
        "ACTIONSURVIVOR": "przycisk akcji",
        "USEITEM": "przycisk użycia przedmiotu",
        "PICKUP": "przycisk podniesienia",
        "PICKUPITEM": "przycisk podniesienia",
        "ATTACK": "przycisk ataku",
    },
    "de": {
        "ACTIVATABLEBUTTON1": "Fähigkeits-Taste 1",
        "ACTIVATABLEBUTTON2": "Fähigkeits-Taste 2",
        "POWER": "Krafttaste",
        "SECONDARYPOWER": "Sekundärkrafttaste",
        "ACTIONSURVIVOR": "Aktionstaste",
        "USEITEM": "Gegenstand-Taste",
        "PICKUP": "Aufhebentaste",
        "PICKUPITEM": "Aufhebentaste",
        "ATTACK": "Angriffstaste",
    },
    "es": {
        "ACTIVATABLEBUTTON1": "botón de la habilidad activa 1",
        "ACTIVATABLEBUTTON2": "botón de la habilidad activa 2",
        "POWER": "botón de poder",
        "SECONDARYPOWER": "botón de poder secundario",
        "ACTIONSURVIVOR": "botón de acción",
        "USEITEM": "botón de usar objeto",
        "PICKUP": "botón de recoger",
        "PICKUPITEM": "botón de recoger",
        "ATTACK": "botón de ataque",
    },
    "ja": {
        "ACTIVATABLEBUTTON1": "アビリティボタン1",
        "ACTIVATABLEBUTTON2": "アビリティボタン2",
        "POWER": "能力ボタン",
        "SECONDARYPOWER": "第2能力ボタン",
        "ACTIONSURVIVOR": "アクションボタン",
        "USEITEM": "アイテム使用ボタン",
        "PICKUP": "拾うボタン",
        "PICKUPITEM": "拾うボタン",
        "ATTACK": "攻撃ボタン",
    },
}


def build_perk_level_tunables_map(char_dir: Path) -> dict[str, list[str]]:
    """Indeksuje wartości tierów PerkLevelTunables ze wszystkich plików PerkDB.json."""
    pt_map = {}
    for p in char_dir.glob("**/PerkDB.json"):
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            perk_rows = []
            for row in data:
                for k, v in row.get("Rows", {}).items():
                    perk_rows.append((k, v))

            for idx, (k, v) in enumerate(perk_rows):
                levels = v.get("PerkLevelTunables", [])
                if levels:
                    num_params = max(len(l.get("Tunables", [])) for l in levels)
                    param_values = []
                    for p_idx in range(num_params):
                        vals = []
                        for l in levels:
                            t_list = l.get("Tunables", [])
                            if p_idx < len(t_list):
                                raw_val = str(t_list[p_idx]).strip()
                                try:
                                    f_val = float(raw_val)
                                    if f_val == int(f_val):
                                        vals.append(str(int(f_val)))
                                    else:
                                        vals.append(str(f_val))
                                except ValueError:
                                    vals.append(raw_val)
                            else:
                                vals.append("")
                        if len(set(vals)) == 1:
                            param_values.append(vals[0])
                        else:
                            param_values.append("/".join(vals))

                    clean_k = k.replace("PERK_", "").replace("Perk_", "").replace("_", "")
                    cid = p.parent.name.upper()
                    cid_nozero = re.sub(r"([SK])0+([0-9]+)", r"\1\2", cid)
                    perk_code = f"{cid}P0{idx+1}"
                    perk_code_nozero = f"{cid_nozero}P0{idx+1}"

                    for k_form in [
                        k,
                        k.upper(),
                        clean_k,
                        clean_k.upper(),
                        re.sub(r"[^a-zA-Z0-9]", "", k).upper(),
                        perk_code,
                        perk_code.upper(),
                        perk_code_nozero,
                        perk_code_nozero.upper(),
                    ]:
                        pt_map[k_form] = param_values
        except Exception:
            pass
    return pt_map


def substitute_all_tokens(
    text: str,
    tunables: dict[str, str],
    target_keywords: dict[str, str],
    en_keywords: dict[str, str],
    lang_code: str = "en",
    pos_tunables: Optional[List[str]] = None,
) -> str:
    """Podmienia tokeny {0}, {1}, {Keyword.X}, {Input.X}, literały <b>EnglishKeyword</b> oraz zmienne tunables."""
    if not text or not isinstance(text, str):
        return text

    # 1. Podmiana pozycyjnych tunables {0}, {1}, {2}, {3}
    if pos_tunables:
        for idx, val in enumerate(pos_tunables):
            text = text.replace(f"{{{idx}}}", val)
            text = text.replace(f"{{{{{idx}}}}}", val)

    # 2. Podmiana {Keyword.Nazwa} na zlokalizowany termin
    def kw_replace(match):
        kw_tag = match.group(1).strip().upper()
        word = target_keywords.get(
            kw_tag, en_keywords.get(kw_tag, match.group(1))
        )
        return f"<b>{word}</b>"

    text = re.sub(
        r"\{Keyword\.([a-zA-Z0-9_]+)\}", kw_replace, text, flags=re.IGNORECASE
    )

    # 3. Podmiana literałów <b>EnglishKeyword</b> na zlokalizowany termin (np. <b>Haste</b> -> <b>Pośpiech</b>)
    for tag, en_word in en_keywords.items():
        if tag in target_keywords:
            target_word = target_keywords[tag]
            if en_word and target_word and en_word.lower() != target_word.lower():
                pattern = re.compile(
                    rf"<b>\s*{re.escape(en_word)}\s*</b>", re.IGNORECASE
                )
                text = pattern.sub(f"<b>{target_word}</b>", text)

    # 4. Podmiana akcji sterowania {Input.X}
    def input_replace(match):
        tok = match.group(1).strip().upper()
        lang_inputs = INPUT_ACTION_TRANSLATIONS.get(
            lang_code.lower(), INPUT_ACTION_TRANSLATIONS["en"]
        )
        return lang_inputs.get(tok, match.group(0))

    text = re.sub(
        r"\{Input\.([a-zA-Z0-9_]+)\}", input_replace, text, flags=re.IGNORECASE
    )

    # 5. Podmiana procentowych tunables: {Tunable.X%} lub {Tunable.X}% lub {X%} lub {X}%
    def format_pct_val(val_str: str) -> str:
        if "/" in val_str:
            parts = val_str.split("/")
            pct_parts = []
            for p in parts:
                try:
                    f_p = float(p)
                    if f_p <= 1.0:
                        f_p *= 100
                    pct_parts.append(str(int(f_p) if f_p == int(f_p) else f_p))
                except ValueError:
                    pct_parts.append(p)
            return f"{'/'.join(pct_parts)}%"
        else:
            try:
                f_val = float(val_str)
                if f_val <= 1.0:
                    f_val *= 100
                return f"{int(f_val) if f_val == int(f_val) else f_val}%"
            except ValueError:
                return f"{val_str}%"

    def tunable_pct_replace(match):
        raw_token = match.group(1).strip()
        norm_token = raw_token.lower().replace("tunable.", "").replace("_", ".")
        alphanumeric_token = re.sub(r"[^a-z0-9]", "", norm_token)

        val = tunables.get(
            norm_token,
            tunables.get(
                norm_token.replace(".", "_"),
                tunables.get(alphanumeric_token, f"{{{raw_token}}}"),
            ),
        )

        if val != f"{{{raw_token}}}":
            return format_pct_val(val)
        return f"{{{raw_token}}}%"

    text = re.sub(
        r"\{((?:Tunable\.)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\%\}",
        tunable_pct_replace,
        text,
    )
    text = re.sub(
        r"\{((?:Tunable\.)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\}[\s\u00a0]*\%",
        tunable_pct_replace,
        text,
    )

    # 6. Podmiana standardowych tunables: {Tunable.X} lub {X.Y}
    def tunable_replace(match):
        raw_token = match.group(1).strip()
        norm_token = raw_token.lower().replace("tunable.", "").replace("_", ".")
        alphanumeric_token = re.sub(r"[^a-z0-9]", "", norm_token)

        return tunables.get(
            norm_token,
            tunables.get(
                norm_token.replace(".", "_"),
                tunables.get(alphanumeric_token, f"{{{raw_token}}}"),
            ),
        )

    text = re.sub(
        r"\{((?:Tunable\.)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\}",
        tunable_replace,
        text,
    )

    # 7. Fallback: Jeśli jakiekolwiek tokeny {Tunable...} pozostały i mamy pos_tunables
    if pos_tunables:
        remaining_toks = []
        for m in re.finditer(r"\{((?:Tunable\.)?[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\%?\}", text):
            tok_str = m.group(0)
            if tok_str not in remaining_toks:
                remaining_toks.append(tok_str)

        for idx, tok_str in enumerate(remaining_toks):
            if idx < len(pos_tunables):
                val = pos_tunables[idx]
                text = text.replace(tok_str, val)
            elif len(pos_tunables) == 1:
                text = text.replace(tok_str, pos_tunables[0])

    return sanitize_text(text)


def query_translation(
    node: dict,
    trans_map: dict[str, str],
    source_to_guid: dict[str, str],
    candidates: Optional[List[str]] = None,
    trans_map_upper: Optional[dict[str, str]] = None,
    is_name: bool = False,
) -> Optional[str]:
    """Wyszukuje przetłumaczony tekst po Key GUID, SourceString lub predefiniowanych kandydatach."""
    if not isinstance(node, dict):
        return None

    def valid_res(v: str) -> bool:
        if not v or v.startswith("@#"):
            return False
        if is_name and (len(v) > 80 or "\n" in v):
            return False
        return True

    # A. Bezpośrednio po Key (GUID)
    key = node.get("Key")
    if key and isinstance(key, str) and key in trans_map:
        val = trans_map[key].strip()
        if valid_res(val):
            return val

    # B. Po SourceString
    src = node.get("SourceString")
    if src and isinstance(src, str):
        src_clean = src.strip()
        if src_clean in trans_map:
            val = trans_map[src_clean].strip()
            if valid_res(val):
                return val
        guid = source_to_guid.get(src_clean.upper())
        if guid and guid in trans_map:
            val = trans_map[guid].strip()
            if valid_res(val):
                return val

    # C. Po kandydatach (np. PERK_K43P01_DESC)
    if candidates:
        for cand in candidates:
            if cand in trans_map:
                val = trans_map[cand].strip()
                if valid_res(val):
                    return val
            cand_u = cand.upper()
            if trans_map_upper and cand_u in trans_map_upper:
                val = trans_map_upper[cand_u].strip()
                if valid_res(val):
                    return val
            guid = source_to_guid.get(cand_u)
            if guid and guid in trans_map:
                val = trans_map[guid].strip()
                if valid_res(val):
                    return val

    return None


PERK_ALIASES_MAP = {
    "GUARDIAN": ["BABYSITTER", "S18P01"],
    "BABYSITTER": ["GUARDIAN", "S18P01"],
    "KINSHIP": ["CAMARADERIE", "S18P02"],
    "CAMARADERIE": ["KINSHIP", "S18P02"],
    "RENEWAL": ["SECONDWIND", "S18P03"],
    "SECONDWIND": ["RENEWAL", "S18P03"],
    "HEXNOONEESCAPESDEATH": ["NOONEESCAPESDEATH", "NOED"],
    "NOONEESCAPESDEATH": ["HEXNOONEESCAPESDEATH", "NOED"],
    "JOLT": ["SURGE", "K17P01"],
    "SURGE": ["JOLT", "K17P01"],
    "FEARMONGER": ["MINDBREAKER", "K17P02"],
    "MINDBREAKER": ["FEARMONGER", "K17P02"],
    "DEADLOCK": ["K25P01"],
    "HEXPLAYTHING": ["HEX_PLAYTHING", "K25P02"],
    "SCOURGEHOOKGIFTOFPAIN": ["SCOURGEHOOK_GIFTOFPAIN", "GIFTOFPAIN", "K25P03"],
}


def process_perk_node(
    perk: dict,
    trans_map: dict[str, str],
    tunables: dict[str, str],
    source_to_guid: dict[str, str],
    target_keywords: dict[str, str],
    en_keywords: dict[str, str],
    lang_code: str = "en",
    perk_level_tunables_map: Optional[dict] = None,
    trans_map_upper: Optional[dict[str, str]] = None,
):
    raw_id = perk.get("Id", "").strip()
    clean_id = raw_id.replace("PERK_", "").replace("Perk_", "")
    pname_raw = perk.get("DisplayName", {}).get("LocalizedString", "")

    # Resolve positional tunables for this perk
    pos_tunables = None
    if perk_level_tunables_map:
        pos_tunables = (
            perk_level_tunables_map.get(clean_id)
            or perk_level_tunables_map.get(raw_id)
            or perk_level_tunables_map.get(clean_id.upper())
            or perk_level_tunables_map.get(raw_id.upper())
            or perk_level_tunables_map.get(re.sub(r"[^a-zA-Z0-9]", "", clean_id).upper())
            or perk_level_tunables_map.get(re.sub(r"[^a-zA-Z0-9]", "", pname_raw).upper())
        )

    # Build comprehensive alias candidates
    aliases = PERK_ALIASES_MAP.get(clean_id.upper(), [])

    # DisplayName
    if "DisplayName" in perk:
        name_candidates = [
            f"PERK_{clean_id}_NAME",
            f"{clean_id}_NAME",
            f"PERK_{raw_id}_NAME",
        ]
        for a in aliases:
            name_candidates.extend([f"PERK_{a}_NAME", f"{a}_NAME"])

        name_text = query_translation(
            perk["DisplayName"],
            trans_map,
            source_to_guid,
            candidates=name_candidates,
            trans_map_upper=trans_map_upper,
            is_name=True,
        )
        if name_text:
            perk["DisplayName"]["LocalizedString"] = substitute_all_tokens(
                name_text, tunables, target_keywords, en_keywords, lang_code, pos_tunables
            )
        elif "LocalizedString" in perk["DisplayName"]:
            perk["DisplayName"]["LocalizedString"] = substitute_all_tokens(
                perk["DisplayName"]["LocalizedString"], tunables, target_keywords, en_keywords, lang_code, pos_tunables
            )

    # GameplayText i Description
    gp_candidates = [
        f"PERK_{clean_id}_GameplayText_DESC",
        f"{clean_id}_GameplayText_DESC",
        f"PERK_{raw_id}_GameplayText_DESC",
        f"PERK_{clean_id}_GameplayText",
        f"{raw_id}_GameplayText_DESC",
    ]
    for a in aliases:
        gp_candidates.extend([
            f"PERK_{a}_GameplayText_DESC",
            f"{a}_GameplayText_DESC",
            f"PERK_{a}_GameplayText",
        ])

    gp_text = query_translation(
        perk.get("GameplayText", {}),
        trans_map,
        source_to_guid,
        candidates=gp_candidates,
        trans_map_upper=trans_map_upper,
    )

    desc_candidates = [
        f"PERK_{clean_id}_DESC",
        f"{clean_id}_DESC",
        f"PERK_{raw_id}_DESC",
    ]
    for a in aliases:
        desc_candidates.extend([f"PERK_{a}_DESC", f"{a}_DESC"])

    desc_text = query_translation(
        perk.get("Description", {}),
        trans_map,
        source_to_guid,
        candidates=desc_candidates,
        trans_map_upper=trans_map_upper,
    )

    raw_desc = perk.get("Description", {}).get("LocalizedString", "")
    if raw_desc.startswith("@#"):
        raw_desc = ""

    # Prefer modern GameplayText with variables, fallback to Description
    final_desc = gp_text or desc_text or raw_desc
    final_gp = gp_text or desc_text or perk.get("GameplayText", {}).get("LocalizedString", "")

    # FlavorText
    flavor_clean = ""
    if "FlavorText" in perk:
        fl_candidates = [
            f"PERK_{clean_id}_FlavorText_DESC",
            f"{clean_id}_FlavorText_DESC",
            f"PERK_{raw_id}_FlavorText_DESC",
        ]
        for a in aliases:
            fl_candidates.extend([f"PERK_{a}_FlavorText_DESC", f"{a}_FlavorText_DESC"])

        # Check explicit FlavorText candidates first
        fl_text = None
        for cand in fl_candidates:
            if cand in trans_map:
                v = trans_map[cand].strip()
                if v and not v.startswith("@#"):
                    fl_text = v
                    break
            if trans_map_upper and cand.upper() in trans_map_upper:
                v = trans_map_upper[cand.upper()].strip()
                if v and not v.startswith("@#"):
                    fl_text = v
                    break

        if not fl_text:
            desc_key = perk.get("Description", {}).get("Key")
            fl_key = perk["FlavorText"].get("Key")
            if fl_key and fl_key != desc_key:
                fl_text = query_translation(perk["FlavorText"], trans_map, source_to_guid, trans_map_upper=trans_map_upper)

        if fl_text and "{" not in fl_text:
            flavor_clean = substitute_all_tokens(
                fl_text, tunables, target_keywords, en_keywords, lang_code, pos_tunables
            )
        perk["FlavorText"]["LocalizedString"] = flavor_clean

    desc_sub = substitute_all_tokens(
        final_desc, tunables, target_keywords, en_keywords, lang_code, pos_tunables
    )
    gp_sub = substitute_all_tokens(
        final_gp, tunables, target_keywords, en_keywords, lang_code, pos_tunables
    )

    if "Description" in perk:
        if flavor_clean and flavor_clean not in desc_sub:
            perk["Description"]["LocalizedString"] = f"{desc_sub}\n\n{flavor_clean}"
        else:
            perk["Description"]["LocalizedString"] = desc_sub

    if "GameplayText" in perk:
        perk["GameplayText"]["LocalizedString"] = gp_sub


OFFERING_DESC_GUIDS = {
    # Bloodpoints
    "Bloody Party Streamers": "C3D9B2D543D23D2BD4A4209131FAFBA3",
    "Offering_BloodyPartyStreamers": "C3D9B2D543D23D2BD4A4209131FAFBA3",
    "Escape! Cake": "D9444D2E4CB7EF5076545B8ACA67A57C",
    "Offering_EscapeCake": "D9444D2E4CB7EF5076545B8ACA67A57C",
    "Survivor Pudding": "CB3AB28D4C4A7BD11DE78F8FF4BA9580",
    "Offering_SurvivorPudding": "CB3AB28D4C4A7BD11DE78F8FF4BA9580",
    "Bound Envelope": "24096C2640D508AC697899B8587D61E9",
    "Offering_BoundEnvelope": "24096C2640D508AC697899B8587D61E9",
    "Gruesome Gateau": "B15E4E5B46F2F25E4BE37DAD66E98DEF",
    "Offering_GruesomeGateau": "B15E4E5B46F2F25E4BE37DAD66E98DEF",
    "Ghastly Gateau": "B0072D8247C425F8F8E5898B4CE66B9C",
    "Offering_GhastlyGateau": "B0072D8247C425F8F8E5898B4CE66B9C",
    "Frightful Flan": "4CACCC544145C196FA7E599E6849D615",
    "Offering_FrightfulFlan": "4CACCC544145C196FA7E599E6849D615",

    # Killer Wreaths
    "Tanager Wreath": "1B15086D4431A4469271F4AEFC805409",
    "Offering_TanagerWreath": "1B15086D4431A4469271F4AEFC805409",
    "Devout Tanager Wreath": "C4C2E3834B6A0CC3556FB3936276CB51",
    "Offering_DevoutTanagerWreath": "C4C2E3834B6A0CC3556FB3936276CB51",
    "Ardent Tanager Wreath": "6ECF587F495A153E66A2DFA293AD3149",
    "Offering_ArdentTanagerWreath": "6ECF587F495A153E66A2DFA293AD3149",
    "Raven Wreath": "13E7B4E44B624543DB3D4E95A8E88723",
    "Offering_RavenWreath": "13E7B4E44B624543DB3D4E95A8E88723",
    "Devout Raven Wreath": "B8CF810B4D33046D18B04685B78E2F15",
    "Offering_DevoutRavenWreath": "B8CF810B4D33046D18B04685B78E2F15",
    "Ardent Raven Wreath": "6ECF587F495A153E66A2DFA293AD3149",
    "Offering_ArdentRavenWreath": "6ECF587F495A153E66A2DFA293AD3149",
    "Spotted Owl Wreath": "648F1711471A92F0008668949736A0D2",
    "Offering_SpottedOwlWreath": "648F1711471A92F0008668949736A0D2",
    "Devout Spotted Owl Wreath": "8E3497E349323CE066B3AB8F55210E7C",
    "Offering_DevoutSpottedOwlWreath": "8E3497E349323CE066B3AB8F55210E7C",
    "Ardent Spotted Owl Wreath": "1B0F0E4C4FC296D9827A95A9FC0362D2",
    "Offering_ArdentSpottedOwlWreath": "1B0F0E4C4FC296D9827A95A9FC0362D2",
    "Shrike Wreath": "2F79941C46C3E2E80FC7479F13A40A7D",
    "Offering_ShrikeWreath": "2F79941C46C3E2E80FC7479F13A40A7D",
    "Devout Shrike Wreath": "CD6CC4FA4627FEB450CBB4AEEF76CC05",
    "Offering_DevoutShrikeWreath": "CD6CC4FA4627FEB450CBB4AEEF76CC05",
    "Ardent Shrike Wreath": "B7ECE091488CAA08821991AC8E3219D3",
    "Offering_ArdentShrikeWreath": "B7ECE091488CAA08821991AC8E3219D3",

    # Survivor Sachets & Blossoms
    "Sweet William Sachet": "CF03FBA046FB4F07F2AE2DB62575154A",
    "Offering_SweetWilliamSachet": "CF03FBA046FB4F07F2AE2DB62575154A",
    "Fresh Sweet William": "030E18F54925B8B122FEA2ABF7C2E9BA",
    "Offering_FreshSweetWilliam": "030E18F54925B8B122FEA2ABF7C2E9BA",
    "Fragrant Sweet William": "816DC4D248A7551514DF398D0D1036A9",
    "Offering_FragrantSweetWilliam": "816DC4D248A7551514DF398D0D1036A9",
    "Bog Laurel Sachet": "4DE283C841D710A0E88CA597756B4DD4",
    "Offering_BogLaurelSachet": "4DE283C841D710A0E88CA597756B4DD4",
    "Fresh Bog Laurel": "E7D18F72473EFFB34386A1A79A39AB9C",
    "Offering_FreshBogLaurel": "E7D18F72473EFFB34386A1A79A39AB9C",
    "Fragrant Bog Laurel": "7DD1B12A449576F39BFF62893E8E7697",
    "Offering_FragrantBogLaurel": "7DD1B12A449576F39BFF62893E8E7697",
    "Crispleaf Amaranth Sachet": "B2ACE8DB4809C3E055D5C2BF7A5A1F6C",
    "Offering_CrispleafAmaranthSachet": "B2ACE8DB4809C3E055D5C2BF7A5A1F6C",
    "Fresh Crispleaf Amaranth": "D49BA33948515EF42723F696DA60FB06",
    "Offering_FreshCrispleafAmaranth": "D49BA33948515EF42723F696DA60FB06",
    "Fragrant Crispleaf Amaranth": "6AA85E5D426F7C594FACB79AC97E71D3",
    "Offering_FragrantCrispleafAmaranth": "6AA85E5D426F7C594FACB79AC97E71D3",
}


ITEM_DESC_GUIDS = {
    "Camping Aid Kit": "6951DC284BD56F737590D1BA514E0A2B",
    "Item_CampingAidKit": "6951DC284BD56F737590D1BA514E0A2B",
    "First Aid Kit": "5B62868349D2ECE9628EF58F2D39391E",
    "Item_FirstAidKit": "5B62868349D2ECE9628EF58F2D39391E",
    "Emergency Med-kit": "76CBE38442556C4843319CBB0D530C61",
    "Item_EmergencyMedKit": "76CBE38442556C4843319CBB0D530C61",
    "Ranger Med-kit": "86D918D8446DE6B525A628AACF68C004",
    "Item_RangerMedKit": "86D918D8446DE6B525A628AACF68C004",
    "Anniversary Med-kit": "A0CA35064F3906BADFAA2EB304F16C96",
    "Item_AnniversaryMedKit": "A0CA35064F3906BADFAA2EB304F16C96",
    "Masquerade Med-Kit": "F83CFB4E4714B764B8A71C89A844B1FC",
    "Item_MasqueradeMedKit": "F83CFB4E4714B764B8A71C89A844B1FC",
    "Banquet Med-Kit": "F83CFB4E4714B764B8A71C89A844B1FC",
    "Item_BanquetMedKit": "F83CFB4E4714B764B8A71C89A844B1FC",
    "Worn-out Tools": "1909D8A7472ABAE80AE672A48446185B",
    "Item_WornOutTools": "1909D8A7472ABAE80AE672A48446185B",
    "Toolbox": "FEE27EF644F0E274818D228E6AB9CA22",
    "Item_Toolbox": "FEE27EF644F0E274818D228E6AB9CA22",
    "Commodious Toolbox": "07EDC1F94E8F72D8B04313B607C750D2",
    "Item_CommodiousToolbox": "07EDC1F94E8F72D8B04313B607C750D2",
    "Mechanic's Toolbox": "058E8AB443E4147320F3909F167400A5",
    "Item_MechanicsToolbox": "058E8AB443E4147320F3909F167400A5",
    "Alex's Toolbox": "1A2A23064982CC6113EFF9B68D252175",
    "Item_AlexsToolbox": "1A2A23064982CC6113EFF9B68D252175",
    "Engineer's Toolbox": "BC73528E415A5B8A023A80BD84B56F3C",
    "Item_EngineersToolbox": "BC73528E415A5B8A023A80BD84B56F3C",
    "Festive Toolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Item_FestiveToolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Anniversary Toolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Item_AnniversaryToolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Masquerade Toolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Item_MasqueradeToolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Banquet Toolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Item_BanquetToolbox": "3F62E9AA4FA098991D699783B1B64DEB",
    "Will O' Wisp": "9D0A5C3D4DADED90F145B5A37F417A16",
    "Item_WillOWisp": "9D0A5C3D4DADED90F145B5A37F417A16",
    "First Aid Spray": "9991A40948440B4CF819C9B9CAB73590",
    "Item_FirstAidSpray": "9991A40948440B4CF819C9B9CAB73590",
    "Antidote": "7CF6771243CBA9E7C84F38ADD3F4CDD4",
    "Item_Antidote": "7CF6771243CBA9E7C84F38ADD3F4CDD4",
    "Vaccine": "21675F9D49D50110C0A2339FBE8FFDDE",
    "Item_Vaccine": "21675F9D49D50110C0A2339FBE8FFDDE",
    "Lament Configuration": "1A99FCD042556AF85B004CA92CE8B92B",
    "Item_LamentConfiguration": "1A99FCD042556AF85B004CA92CE8B92B",
    "Searcher's Pendant": "41D2C6BE470551C10E76E7949E0A13FB",
    "Item_SearchersPendant": "41D2C6BE470551C10E76E7949E0A13FB",
    "Blood Can": "F1404A6E41719BB5507A06A32CB1ED81",
    "Item_BloodCan": "F1404A6E41719BB5507A06A32CB1ED81",
    "Void Crystal": "041D272E4265947031F4778E46F0EB94",
    "Item_VoidCrystal": "041D272E4265947031F4778E46F0EB94",
    "Lantern": "A77DB6274D81E9DA2AB5409938689CC5",
    "Item_Lantern": "A77DB6274D81E9DA2AB5409938689CC5",
    "Pocket Mirror": "C377D2584368941DC85D3A95C2A328EE",
    "Item_PocketMirror": "C377D2584368941DC85D3A95C2A328EE",
    "Fragile Mirror": "C377D2584368941DC85D3A95C2A328EE",
    "Item_FragileMirror": "C377D2584368941DC85D3A95C2A328EE",

    # Trapper Add-ons
    "Addon_Trapper_TrapperGloves": "89EC240E401644D8AC869EB52BCC6D91",
    "Trapper Gloves": "89EC240E401644D8AC869EB52BCC6D91",
    "Addon_Trapper_PaddedJaws": "B7227BEA4C8705DD04AC17AB20E1BE82",
    "Padded Jaws": "B7227BEA4C8705DD04AC17AB20E1BE82",
    "Addon_Trapper_MakeshiftWrap": "21EB8D1C4A37A3757215B7A9A2DB1DBB",
    "Makeshift Wrap": "21EB8D1C4A37A3757215B7A9A2DB1DBB",
    "Addon_Trapper_CoffeeGrounds": "3BE40EA640F67B151F7EB2ABE51EF9DA",
    "Coffee Grounds": "3BE40EA640F67B151F7EB2ABE51EF9DA",
    "Addon_Trapper_4CoilSpringKit": "AABE867F4BAE646AA4DE56BAA3FE936B",
    "4-Coil Spring Kit": "AABE867F4BAE646AA4DE56BAA3FE936B",
    "Addon_Trapper_FastTools": "2E6E1BE845D5D773B1897A9274BE9EE2",
    "Fast Tools": "2E6E1BE845D5D773B1897A9274BE9EE2",
    "Addon_Trapper_SecondaryCoil": "1A8D6EAD4333AD69FA8F1982DA0822F9",
    "Secondary Coil": "1A8D6EAD4333AD69FA8F1982DA0822F9",
    "Addon_Trapper_TarBottle": "4CB2DAC34C3BB45A5AD7D8A135C2804B",
    "Tar Bottle": "4CB2DAC34C3BB45A5AD7D8A135C2804B",
    "Addon_Trapper_BloodyCoil": "83247ABF4853F81D481327A23B6FAF3C",
    "Bloody Coil": "83247ABF4853F81D481327A23B6FAF3C",
    "Addon_Trapper_HoningStone": "42F64EB14CEA2F7B9133639A3C380EBD",
    "Honing Stone": "42F64EB14CEA2F7B9133639A3C380EBD",
    "Addon_Trapper_OilyCoil": "D55F8390459D40A5FB7E559D22697534",
    "Oily Coil": "D55F8390459D40A5FB7E559D22697534",
    "Addon_Trapper_TensionSpring": "0ECF4542488661819D1261A11374FB38",
    "Tension Spring": "0ECF4542488661819D1261A11374FB38",
    "Addon_Trapper_TrapperSack": "1E1956F148A7B7206CADA28AF5AA553B",
    "Trapper Sack": "1E1956F148A7B7206CADA28AF5AA553B",
    "Addon_Trapper_IridescentStone": "5E29EA0444301F60507C3B8DBA39E273",
    "Iridescent Stone": "5E29EA0444301F60507C3B8DBA39E273",

    # Survivor Addons
    "Addon_SelfAdherentWrap": "58C854E9417DC4C57BE0DAAFDA9A4B20",
    "Self Adherent Wrap": "58C854E9417DC4C57BE0DAAFDA9A4B20",
    "Addon_NeedleThread": "D13F6A144A5124C258877785309CB0BF",
    "Needle & Thread": "D13F6A144A5124C258877785309CB0BF",
    "Addon_ProtectiveGloves": "0D4EBB924BF2B0A676BB48AFD37D7241",
    "Protective Gloves": "0D4EBB924BF2B0A676BB48AFD37D7241",
}

SURVIVOR_ADDON_RARITIES = {
    # Flashlights
    "Addon_Battery": "Common",
    "Addon_LeatherGrip": "Common",
    "Addon_PowerBulb": "Common",
    "Addon_WideLens": "Common",
    "Addon_FocusLens": "Uncommon",
    "Addon_HeavyDutyBattery": "Uncommon",
    "Addon_LowAmpFilament": "Uncommon",
    "Addon_RubberGrip": "Uncommon",
    "Addon_TIROptic": "Uncommon",
    "Addon_IntenseHalogen": "Rare",
    "Addon_LongLifeBattery": "Rare",
    "Addon_HighEndSapphireLens": "Very Rare",
    "Addon_OddBulb": "Ultra Rare",
    "Addon_BrokenBulb": "Event",

    # Med-Kits
    "Addon_Bandages": "Common",
    "Addon_ButterflyTape": "Common",
    "Addon_RubberGloves": "Common",
    "Addon_MedicalScissors": "Uncommon",
    "Addon_NeedleThread": "Uncommon",
    "Addon_SelfAdherentWrap": "Uncommon",
    "Addon_Sponge": "Uncommon",
    "Addon_GauzeRoll": "Rare",
    "Addon_SurgicalSuture": "Rare",
    "Addon_AbdominalDressing": "Rare",
    "Addon_StypticAgent": "Very Rare",
    "Addon_GelDressings": "Very Rare",
    "Addon_AntiExhaustionSyringe": "Ultra Rare",
    "Addon_RefinedSerum": "Event",

    # Toolboxes
    "Addon_CleanRag": "Common",
    "Addon_Instructions": "Common",
    "Addon_Scraps": "Common",
    "Addon_CuttingWire": "Uncommon",
    "Addon_ProtectiveGloves": "Uncommon",
    "Addon_SocketSwivels": "Uncommon",
    "Addon_SpringClamp": "Uncommon",
    "Addon_WireSpool": "Uncommon",
    "Addon_GripWrench": "Rare",
    "Addon_Hacksaw": "Rare",
    "Addon_BrandNewPart": "Ultra Rare",

    # Keys
    "Addon_FriendshipCharm": "Common",
    "Addon_PrayerRope": "Common",
    "Addon_ErodedToken": "Common",
    "Addon_ScratchedPearl": "Uncommon",
    "Addon_PrayerBeads": "Uncommon",
    "Addon_ShrillWhistle": "Uncommon",
    "Addon_BraidedBauble": "Rare",
    "Addon_GoldToken": "Rare",
    "Addon_UniqueWeddingRing": "Very Rare",
    "Addon_MilkyGlass": "Very Rare",
    "Addon_WeavedRing": "Very Rare",
    "Addon_BloodAmber": "Very Rare",

    # Maps
    "Addon_MapAddonRope": "Common",
    "Addon_GlowingInk": "Common",
    "Addon_RetardantJelly": "Common",
    "Addon_GnarledCompass": "Uncommon",
    "Addon_GlassBead": "Uncommon",
    "Addon_UnusualStamp": "Uncommon",
    "Addon_YellowWire": "Uncommon",
    "Addon_BatteredTape": "Rare",
    "Addon_OddStamp": "Rare",
    "Addon_BlackSilkCord": "Rare",
    "Addon_SharpenedFlint": "Very Rare",
    "Addon_CrystalBead": "Very Rare",
    "Addon_CrimsonStamp": "Very Rare",

    # Fog Vials
    "Addon_VolcanicStone": "Common",
    "Addon_ReactiveCompound": "Uncommon",
    "Addon_OilySap": "Rare",
    "Addon_MushroomFormula": "Very Rare",
    "Addon_PotentExtract": "Ultra Rare",

    # Firecrackers
    "Addon_FlashPowder": "Common",
    "Addon_MediumFuse": "Common",
    "Addon_BuckShot": "Common",
    "Addon_GunPowder": "Uncommon",
    "Addon_LongFuse": "Uncommon",
    "Addon_MagnesiumPowder": "Uncommon",
    "Addon_BlackPowder": "Rare",
    "Addon_LargePack": "Very Rare",
}


def process_item_or_addon_node(
    item_dict: dict,
    trans_map: dict[str, str],
    tunables: dict[str, str],
    source_to_guid: dict[str, str],
    target_keywords: dict[str, str],
    en_keywords: dict[str, str],
    prefix: str = "ADDON",
    lang_code: str = "en",
    trans_map_upper: Optional[dict[str, str]] = None,
):
    item_id = item_dict.get("Id", "").strip()
    raw_name = item_dict.get("DisplayName", {}).get("SourceString") or item_dict.get("DisplayName", {}).get("LocalizedString") or ""
    clean_name = raw_name.replace("Item_", "").replace("Offering_", "").replace("Addon_", "")

    # Fix canonical rarity for survivor addons if present
    if item_id in SURVIVOR_ADDON_RARITIES:
        item_dict["Rarity"] = SURVIVOR_ADDON_RARITIES[item_id]

    if "DisplayName" in item_dict:
        name_text = query_translation(
            item_dict["DisplayName"],
            trans_map,
            source_to_guid,
            candidates=[f"{item_id}_NAME", f"{prefix}_{item_id}_NAME"],
            trans_map_upper=trans_map_upper,
            is_name=True,
        )
        if name_text and len(name_text) <= 80 and "\n" not in name_text:
            item_dict["DisplayName"]["LocalizedString"] = substitute_all_tokens(
                name_text, tunables, target_keywords, en_keywords, lang_code
            )
        elif "LocalizedString" in item_dict["DisplayName"]:
            cur_ls = item_dict["DisplayName"]["LocalizedString"]
            if len(cur_ls) > 80 or "\n" in cur_ls:
                cur_ls = clean_name or raw_name
            item_dict["DisplayName"]["LocalizedString"] = substitute_all_tokens(
                cur_ls,
                tunables,
                target_keywords,
                en_keywords,
                lang_code,
            )

    if "Description" in item_dict:
        # Check if item or offering has a designated localized GUID
        guid_match = None
        for k_cand in [raw_name, clean_name, item_id]:
            if k_cand in OFFERING_DESC_GUIDS:
                guid_match = OFFERING_DESC_GUIDS[k_cand]
                break
            if k_cand in ITEM_DESC_GUIDS:
                guid_match = ITEM_DESC_GUIDS[k_cand]
                break

        desc_text = None
        if guid_match and guid_match in trans_map:
            val = trans_map[guid_match].strip()
            if val and not val.startswith("@#"):
                desc_text = val

        if not desc_text:
            desc_text = query_translation(
                item_dict["Description"],
                trans_map,
                source_to_guid,
                candidates=[
                    f"{item_id}_DESC",
                    f"{item_id}_FIXED_DESC",
                    f"{prefix}_{item_id}_DESC",
                ],
                trans_map_upper=trans_map_upper,
            )

        raw_desc = item_dict["Description"].get("LocalizedString", "")
        if raw_desc.startswith("@#"):
            raw_desc = ""

        final_desc = desc_text or raw_desc
        item_dict["Description"]["LocalizedString"] = substitute_all_tokens(
            final_desc, tunables, target_keywords, en_keywords, lang_code
        )


def process_character_dump_for_lang(
    base_dump: dict,
    trans_map: dict[str, str],
    tunables: dict[str, str],
    source_to_guid: dict[str, str],
    target_keywords: dict[str, str],
    en_keywords: dict[str, str],
    lang_code: str = "en",
    perk_level_tunables_map: Optional[dict] = None,
) -> dict:
    data = copy.deepcopy(base_dump)
    trans_map_upper = {k.upper(): v for k, v in trans_map.items()}

    for char_id, char_entry in data.items():
        if isinstance(char_entry, dict) and "Character" in char_entry:
            # 1. Postacie (K01-K44, S01-S54)
            char_info = char_entry.get("Character", {})
            for field in ["DisplayName", "BackStory", "Biography"]:
                if field in char_info:
                    text = query_translation(
                        char_info[field],
                        trans_map,
                        source_to_guid,
                        candidates=[
                            f"CHARACTER_{char_id}_{field.upper()}",
                            f"KILLER_{char_id}_{field.upper()}",
                            f"SURVIVOR_{char_id}_{field.upper()}",
                            f"KILLER_{char_id}_BIO",
                            f"SURVIVOR_{char_id}_BIO",
                            f"KILLER_{char_id}_TOOLTIP",
                            f"SURVIVOR_{char_id}_TOOLTIP",
                        ],
                        trans_map_upper=trans_map_upper,
                        is_name=(field == "DisplayName"),
                    )
                    if text:
                        char_info[field]["LocalizedString"] = substitute_all_tokens(
                            text, tunables, target_keywords, en_keywords, lang_code
                        )
                    elif "LocalizedString" in char_info[field]:
                        char_info[field]["LocalizedString"] = substitute_all_tokens(
                            char_info[field]["LocalizedString"],
                            tunables,
                            target_keywords,
                            en_keywords,
                            lang_code,
                        )

            # 2. Perki postaci
            for perk in char_entry.get("Perks", []):
                process_perk_node(
                    perk, trans_map, tunables, source_to_guid, target_keywords, en_keywords, lang_code, perk_level_tunables_map, trans_map_upper
                )

            # 3. Addony zabójców
            for addon in char_entry.get("ItemAddons", []):
                process_item_or_addon_node(
                    addon, trans_map, tunables, source_to_guid, target_keywords, en_keywords, prefix="ADDON", lang_code=lang_code, trans_map_upper=trans_map_upper
                )

        elif char_id == "General" and isinstance(char_entry, dict):
            # 4. General Perks (SurvivorPerks, KillerPerks)
            for ptype in ["SurvivorPerks", "KillerPerks"]:
                for perk in char_entry.get(ptype, []):
                    process_perk_node(
                        perk, trans_map, tunables, source_to_guid, target_keywords, en_keywords, lang_code, perk_level_tunables_map, trans_map_upper
                    )

        elif char_id == "Items" and isinstance(char_entry, list):
            # 5. Przedmioty ocalałych
            for item in char_entry:
                process_item_or_addon_node(
                    item, trans_map, tunables, source_to_guid, target_keywords, en_keywords, prefix="ITEM", lang_code=lang_code, trans_map_upper=trans_map_upper
                )

        elif char_id == "SurvivorAddons" and isinstance(char_entry, list):
            # 6. Dodatki do przedmiotów ocalałych
            for addon in char_entry:
                process_item_or_addon_node(
                    addon, trans_map, tunables, source_to_guid, target_keywords, en_keywords, prefix="ADDON", lang_code=lang_code, trans_map_upper=trans_map_upper
                )

        elif char_id in ["CommonOfferings", "KillerOfferings", "SurvivorOfferings"] and isinstance(char_entry, list):
            # 7. Dary (Offerings)
            for offering in char_entry:
                process_item_or_addon_node(
                    offering, trans_map, tunables, source_to_guid, target_keywords, en_keywords, prefix="FAVOR", lang_code=lang_code, trans_map_upper=trans_map_upper
                )

    return data


def build_squashed_translations(
    localized_dumps: Dict[str, dict]
) -> dict:
    """Buduje squashed bundle translations.json dla całego backendu."""
    en_dump = localized_dumps.get("en", {})

    squashed = {
        "version": "2.0.0",
        "supported_locales": ["en", "pl", "de", "es", "ja"],
        "chapters": {},
        "characters": {},
        "perks": {},
        "items": {},
        "addons": {},
        "offerings": {},
    }

    # Load existing chapters and base data if available
    existing_file = BACKEND_TRANSLATIONS_DIR / "translations.json"
    if existing_file.exists():
        try:
            with open(existing_file, "r", encoding="utf-8") as f:
                old_t = json.load(f)
                squashed["chapters"] = old_t.get("chapters", {})
                for old_k, old_v in old_t.get("offerings", {}).items():
                    squashed["offerings"][old_k] = old_v
        except Exception:
            pass

    # 1. Characters
    for char_id, char_entry in en_dump.items():
        if isinstance(char_entry, dict) and "Character" in char_entry:
            c_en = char_entry["Character"]
            c_name_en = c_en.get("DisplayName", {}).get("LocalizedString", "")

            char_record = {
                "name": c_name_en,
                "code_prefix": char_id,
                "chapter_name": "Base Game",
                "translations": {},
            }

            for lang_code, dump_data in localized_dumps.items():
                c_lang = dump_data.get(char_id, {}).get("Character", {})
                name_l = c_lang.get("DisplayName", {}).get("LocalizedString", c_name_en)
                lore_l = (
                    c_lang.get("BackStory", {}).get("LocalizedString")
                    or c_lang.get("Biography", {}).get("LocalizedString", "")
                )

                char_record["translations"][lang_code] = {
                    "name": name_l,
                    "lore": lore_l,
                    "chapter_name": "Base Game",
                }

            squashed["characters"][char_id] = char_record
            if c_name_en:
                squashed["characters"][c_name_en] = char_record

    # 2. Perks (Character Perks + General Perks)
    all_perk_entries: List[Tuple[str, str, dict]] = []

    for char_id, char_entry in en_dump.items():
        if isinstance(char_entry, dict) and "Character" in char_entry:
            c_name_en = char_entry["Character"].get("DisplayName", {}).get("LocalizedString", "")
            for p in char_entry.get("Perks", []):
                all_perk_entries.append((char_id, c_name_en, p))
        elif char_id == "General" and isinstance(char_entry, dict):
            for ptype in ["SurvivorPerks", "KillerPerks"]:
                for p in char_entry.get(ptype, []):
                    all_perk_entries.append(("General", "General", p))

    for char_id, c_name_en, p_en in all_perk_entries:
        pid = p_en.get("Id", "")
        pname_en = p_en.get("DisplayName", {}).get("LocalizedString", "")
        if not pname_en:
            continue

        perk_record = {
            "name": pname_en,
            "character_code": char_id if char_id != "General" else None,
            "character_name": c_name_en if char_id != "General" else None,
            "translations": {},
        }

        for lang_code, dump_data in localized_dumps.items():
            p_lang = None
            if char_id == "General" and "General" in dump_data:
                for ptype in ["SurvivorPerks", "KillerPerks"]:
                    for cand in dump_data["General"].get(ptype, []):
                        if cand.get("Id") == pid:
                            p_lang = cand
                            break
                    if p_lang:
                        break
            elif char_id in dump_data:
                for cand in dump_data[char_id].get("Perks", []):
                    if cand.get("Id") == pid:
                        p_lang = cand
                        break

            if p_lang:
                name_l = p_lang.get("DisplayName", {}).get("LocalizedString", pname_en)
                desc_l = (
                    p_lang.get("Description", {}).get("LocalizedString")
                    or p_lang.get("GameplayText", {}).get("LocalizedString", "")
                )
            else:
                name_l = pname_en
                desc_l = p_en.get("Description", {}).get("LocalizedString", "")

            perk_record["translations"][lang_code] = {
                "name": name_l,
                "description": desc_l,
            }

        squashed["perks"][pname_en] = perk_record
        if "Favor" in pname_en:
            squashed["perks"][pname_en.replace("Favor", "Favour")] = perk_record
        elif "Favour" in pname_en:
            squashed["perks"][pname_en.replace("Favour", "Favor")] = perk_record
        if pname_en == "Kinship":
            squashed["perks"]["Camaraderie"] = perk_record
        elif pname_en == "Camaraderie":
            squashed["perks"]["Kinship"] = perk_record

    EVENT_ITEM_IDS = {
        'item_anniversarymedkit',
        'item_banquetmedkit',
        'item_masquerademedkit',
        'item_allhallowsevelunchbox',
        'item_anniversarytoolbox',
        'item_banquettoolbox',
        'item_masqueradetoolbox',
        'item_festivetoolbox',
        'item_anniversaryflashlight',
        'item_banquetflashlight',
        'item_masqueradeflashlight',
        'item_willowisp',
        'item_chinesefirecracker',
        'item_winterpartystarter',
        'item_thirdyearpartystarter',
    }

    EVENT_ADDON_IDS = {
        'addon_refinedserum',
        'addon_brokenbulb',
    }

    FOG_VIAL_ITEM_IDS = {
        'item_apprenticesfogvial',
        'item_artisansfogvial',
        'item_vigosfogvial',
    }

    FOG_VIAL_ADDON_IDS = {
        'addon_volcanicstone',
        'addon_reactivecompound',
        'addon_oilysap',
        'addon_mushroomformula',
        'addon_potentextract',
    }

    TRIAL_EXCLUSIVE_ITEM_IDS = {
        'item_emp',
        'item_firstaidspray',
        'item_vaccine',
        'item_remoteflameturret',
        'item_vhstape',
        'item_lamentconfiguration',
        'item_eyeofvecna',
        'item_handofvecna',
        'item_keycard',
        'item_candelabra',
        'item_lantern',
        'item_bloodcan',
        'item_fogcrystal',
        'item_voidcrystal',
        'item_fragilemirror',
        'item_pocketmirror',
        'item_glowingfungus',
        'item_searcherspendant',
        'item_antidote',
    }

    def resolve_item_canonical(it_id: str, name_en: str, raw_rarity: str) -> Tuple[str, str, str]:
        id_norm = it_id.lower().replace('-', '_')
        name_norm = name_en.lower()

        if id_norm in EVENT_ITEM_IDS or any(k in name_norm for k in ['anniversary', 'banquet', 'masquerade', 'lunchbox', "will o' wisp", 'party starter', 'chinese firecracker', 'festive toolbox']):
            return "Event", "Survivor", "Event"
        if id_norm in FOG_VIAL_ITEM_IDS or 'fog vial' in name_norm:
            return "Fog Vial", "Survivor", raw_rarity or "Common"
        if id_norm in TRIAL_EXCLUSIVE_ITEM_IDS or any(k in name_norm for k in ['spray', 'vaccine', 'turret', 'lament', 'vecna', 'keycard', 'candelabra', 'lantern', 'vhs tape', 'blood can', 'crystal', 'mirror', 'fungus', 'pendant', 'antidote', 'emp']):
            return "Trial Artifact", "Survivor", "Special"
        if any(k in name_norm for k in ['med-kit', 'aid kit']):
            return "Med-Kit", "Survivor", raw_rarity or "Common"
        if any(k in name_norm for k in ['toolbox', 'tools']):
            return "Toolbox", "Survivor", raw_rarity or "Common"
        if 'flashlight' in name_norm:
            return "Flashlight", "Survivor", raw_rarity or "Common"
        if 'key' in name_norm:
            return "Key", "Survivor", raw_rarity or "Common"
        if 'map' in name_norm:
            return "Map", "Survivor", raw_rarity or "Common"
        if 'firecracker' in name_norm or 'flash grenade' in name_norm:
            return "Firecracker", "Survivor", raw_rarity or "Common"
        return "Trial Artifact", "Survivor", raw_rarity or "Common"

    KILLER_ADDON_RARITIES = {
        # Trapper K01
        'Addon_Trapper_TrapperGloves': 'Common',
        'Addon_Trapper_PaddedJaws': 'Common',
        'Addon_Trapper_MakeshiftWrap': 'Common',
        'Addon_Trapper_BearOil': 'Common',
        'Addon_Trapper_CoffeeGrounds': 'Uncommon',
        'Addon_Trapper_LengthenedJaws': 'Uncommon',
        'Addon_Trapper_SerratedJaws': 'Uncommon',
        'Addon_Trapper_WaxBrick': 'Uncommon',
        'Addon_Trapper_4CoilSpringKit': 'Uncommon',
        'Addon_Trapper_FastTools': 'Rare',
        'Addon_Trapper_RustedJaws': 'Rare',
        'Addon_Trapper_SecondaryCoil': 'Rare',
        'Addon_Trapper_TarBottle': 'Rare',
        'Addon_Trapper_LogwoodDye': 'Rare',
        'Addon_Trapper_BloodyCoil': 'Very Rare',
        'Addon_Trapper_HoningStone': 'Very Rare',
        'Addon_Trapper_OilyCoil': 'Very Rare',
        'Addon_Trapper_TensionSpring': 'Very Rare',
        'Addon_Trapper_TrapperSack': 'Ultra Rare',
        'Addon_Trapper_IridescentStone': 'Ultra Rare',
        'Trapper Gloves': 'Common',
        'Padded Jaws': 'Common',
        'Makeshift Wrap': 'Common',
        'Bear Oil': 'Common',
        'Coffee Grounds': 'Uncommon',
        'Lengthened Jaws': 'Uncommon',
        'Serrated Jaws': 'Uncommon',
        'Wax Brick': 'Uncommon',
        '4-Coil Spring Kit': 'Uncommon',
        'Fast Tools': 'Rare',
        'Rusted Jaws': 'Rare',
        'Secondary Coil': 'Rare',
        'Tar Bottle': 'Rare',
        'Logwood Dye': 'Rare',
        'Bloody Coil': 'Very Rare',
        'Honing Stone': 'Very Rare',
        'Oily Coil': 'Very Rare',
        'Tension Spring': 'Very Rare',
        'Trapper Sack': 'Ultra Rare',
        'Iridescent Stone': 'Ultra Rare',
    }

    def resolve_addon_canonical(aid: str, name_en: str, target: str, parent_code: str, raw_rarity: str) -> Tuple[str, str, str]:
        id_norm = aid.lower().replace('-', '_')
        name_norm = name_en.lower()
        final_rarity = SURVIVOR_ADDON_RARITIES.get(aid) or KILLER_ADDON_RARITIES.get(aid) or KILLER_ADDON_RARITIES.get(name_en) or raw_rarity or "Common"

        if id_norm in EVENT_ADDON_IDS or name_norm in ['refined serum', 'broken bulb']:
            return "Event", "Survivor", "Event"
        if id_norm in FOG_VIAL_ADDON_IDS or name_norm in ['volcanic stone', 'reactive compound', 'oily sap', 'mushroom formula', 'potent extract']:
            return "Fog Vials", "Survivor", final_rarity or "Common"
        if target in ["Med-Kits", "Toolboxes", "Flashlights", "Keys", "Maps", "Firecrackers", "Fog Vials"]:
            return target, "Survivor", final_rarity or "Common"
        if parent_code.startswith("K"):
            return target, "Killer", final_rarity or "Common"
        return target, "Survivor" if parent_code == "Survivor" else "Killer", final_rarity or "Common"

    # 3. Items
    for it_en in en_dump.get("Items", []):
        it_id = it_en.get("Id", "")
        it_name_en = it_en.get("DisplayName", {}).get("LocalizedString", "") or it_en.get("Name", "")
        if not it_name_en:
            continue

        raw_rar = it_en.get("Rarity", "")
        cat, role, rar = resolve_item_canonical(it_id, it_name_en, raw_rar)

        item_record = {
            "name": it_name_en,
            "category": cat,
            "role": role,
            "rarity": rar,
            "translations": {},
        }

        for lang_code, dump_data in localized_dumps.items():
            it_lang = None
            for cand in dump_data.get("Items", []):
                if cand.get("Id") == it_id:
                    it_lang = cand
                    break

            if it_lang:
                name_l = it_lang.get("DisplayName", {}).get("LocalizedString", it_name_en)
                desc_l = it_lang.get("Description", {}).get("LocalizedString", "")
            else:
                name_l = it_name_en
                desc_l = it_en.get("Description", {}).get("LocalizedString", "")

            item_record["translations"][lang_code] = {
                "name": name_l,
                "description": desc_l,
            }

        squashed["items"][it_name_en] = item_record

    # 4. Addons (Killer Addons + Survivor Addons)
    all_addon_entries: List[Tuple[str, str, dict]] = []
    for char_id, char_entry in en_dump.items():
        if isinstance(char_entry, dict) and "Character" in char_entry:
            c_name_en = char_entry["Character"].get("DisplayName", {}).get("LocalizedString", "")
            for a in char_entry.get("ItemAddons", []):
                all_addon_entries.append((char_id, c_name_en, a))
    for a in en_dump.get("SurvivorAddons", []):
        all_addon_entries.append(("Survivor", a.get("AssociatedTarget", "Survivor"), a))

    TRAPPER_ADDON_LOCALIZATIONS = {
        "Addon_Trapper_BearOil": {
            "en": {"name": "Bear Oil", "description": "Rendered animal fat used to lubricate mechanical parts.<br><li>Setting <b>Bear Traps</b> is completely silent.</li>"},
            "pl": {"name": "Niedźwiedzi tłuszcz", "description": "Stopiony zwierzęcy tłuszcz, którym można nasmarować pułapkę na niedźwiedzie.<br><li>Zastawianie <b>pułapek na niedźwiedzie</b> jest całkowicie ciche.</li>"},
            "de": {"name": "Bärenöl", "description": "Ausgelassenes Tierfett zum Schmieren mechanischer Teile.<br><li>Das Aufstellen von <b>Bärenfallen</b> ist völlig lautlos.</li>"},
            "es": {"name": "Aceite de oso", "description": "Grasa animal derretida para lubricar piezas mecánicas.<br><li>Colocar <b>trampas para osos</b> es completamente silencioso.</li>"},
            "ja": {"name": "熊の油", "description": "機械部品の潤滑に使用される動物性油脂。<br><li><b>トラバサミ</b>の設置音が完全に無音になる。</li>"}
        },
        "Addon_Trapper_WaxBrick": {
            "en": {"name": "Wax Brick", "description": "A large block of translucent paraffin wax.<br><li><b>Increases</b> the time required for Survivors to rescue or escape a <b>Bear Trap</b> by <b>33%</b>.</li>"},
            "pl": {"name": "Kostka wosku", "description": "Duży blok półprzezroczystego wosku parafinowego.<br><li><b>Wydłuża</b> czas potrzebny ocalałym na ratunek lub ucieczkę z <b>pułapki na niedźwiedzie</b> o <b>33%</b>.</li>"},
            "de": {"name": "Wachsblock", "description": "Ein großer Block durchscheinendes Paraffinwachs.<br><li><b>Erhöht</b> die Zeit, die Überlebende benötigen, um sich aus einer <b>Bärenfalle</b> zu befreien oder gerettet zu werden, um <b>33%</b>.</li>"},
            "es": {"name": "Ladrillo de cera", "description": "Un bloque grande de cera de parafina translúcida.<br><li><b>Aumenta</b> el tiempo necesario para que los supervivientes rescaten o escapen de una <b>trampa para osos</b> en un <b>33%</b>.</li>"},
            "ja": {"name": "パラフィンワックスの塊", "description": "半透明のパラフィンワックスの大きな塊。<br><li>生存者が<b>トラバサミ</b>から脱出または救出するのにかかる時間が<b>33%増加</b>する。</li>"}
        },
        "Addon_Trapper_LogwoodDye": {
            "en": {"name": "Logwood Dye", "description": "A natural dark brown dye used to coat the Bear Trap.<br><li><b>Darkens Bear Traps moderately</b>.</li>"},
            "pl": {"name": "Barwnik z modrzewia", "description": "Naturalny ciemnobrązowy barwnik używany do powlekania pułapek na niedźwiedzie.<br><li><b>Umiarkowanie przyciemnia pułapki na niedźwiedzie</b>.</li>"},
            "de": {"name": "Blauholz-Farbstoff", "description": "Ein natürlicher dunkelbrauner Farbstoff zum Beschichten der Bärenfalle.<br><li><b>Dunkelt Bärenfallen mäßig ab</b>.</li>"},
            "es": {"name": "Tinte de palo de campeche", "description": "Un tinte natural marrón oscuro utilizado para recubrir la trampa para osos.<br><li><b>Oscurece moderadamente las trampas para osos</b>.</li>"},
            "ja": {"name": "ログウッドの染料", "description": "トラバサミをコーティングするための濃褐色の天然染料。<br><li><b>トラバサミの色がそこそこ暗くなる</b>。</li>"}
        },
        "Addon_Trapper_LengthenedJaws": {
            "en": {"name": "Lengthened Jaws", "description": "A pair of lengthened jaws that replaces the normal ones on the Bear Trap.<br><li>Survivors that escape a <b>Bear Trap</b> are inflicted with <b>Deep Wound</b>.</li>"},
            "pl": {"name": "Wydłużone szczęki", "description": "Para wydłużonych szczęk zastępująca zwykłe szczęki pułapki na niedźwiedzie.<br><li>Ocalali, którzy uciekną z <b>pułapki na niedźwiedzie</b>, otrzymują efekt <b>Głęboka Rana</b>.</li>"},
            "de": {"name": "Verlängerte Backen", "description": "Ein Paar verlängerte Backen, die die normalen der Bärenfalle ersetzen.<br><li>Überlebende, die aus einer <b>Bärenfalle</b> entkommen, erleiden den Status <b>Tiefe Wunde</b>.</li>"},
            "es": {"name": "Mandíbulas alargadas", "description": "Un par de mandíbulas alargadas que reemplazan a las normales en la trampa para osos.<br><li>Los supervivientes que escapan de una <b>trampa para osos</b> sufren el efecto <b>Herida profunda</b>.</li>"},
            "ja": {"name": "長めの歯", "description": "トラバサミの通常の歯と交換する長めの歯。<br><li><b>トラバサミ</b>から脱出した生存者に<b>深手</b>を付与する。</li>"}
        },
        "Addon_Trapper_SerratedJaws": {
            "en": {"name": "Serrated Jaws", "description": "Add small, jagged blades to the trap jaws to maximize damage.<br><li>Survivors caught in a <b>Bear Trap</b> suffer from the <b>Mangled</b> and <b>Hemorrhage</b> Status Effects until fully healed.</li>"},
            "pl": {"name": "Ząbkowane szczęki", "description": "Dodaje małe, poszarpane ostrza do szczęk pułapki.<br><li>Ocalali schwytani w <b>pułapkę na niedźwiedzie</b> cierpią na efekty <b>Zmasakrowanie</b> i <b>Krwotok</b> do momentu pełnego wyleczenia.</li>"},
            "de": {"name": "Gezackte Backen", "description": "Fügt den Fallenbacken kleine, gezackte Klingen hinzu.<br><li>Überlebende, die in eine <b>Bärenfalle</b> geraten, leiden unter den Statuseffekten <b>Zerfleischt</b> und <b>Blutung</b>, bis sie vollständig geheilt sind.</li>"},
            "es": {"name": "Mandíbulas dentadas", "description": "Añade hojas dentadas a las mandíbulas de la trampa.<br><li>Los supervivientes atrapados en una <b>trampa para osos</b> sufren los efectos <b>Mutilado</b> y <b>Hemorragia</b> hasta curarse por completo.</li>"},
            "ja": {"name": "ギザギザの歯", "description": "トラバサミの歯にギザギザの刃を取り付ける。<br><li><b>トラバサミ</b>にかかった生存者は、完全に回復するまで<b>重症</b>と<b>出血</b>のステータス効果を受ける。</li>"}
        },
        "Addon_Trapper_RustedJaws": {
            "en": {"name": "Rusted Jaws", "description": "A heavily rusted pair of trap jaws that replaces the normal ones on the Bear Trap.<br><li>Survivors caught in a <b>Bear Trap</b> suffer from the <b>Broken</b> Status Effect until fully healed.</li>"},
            "pl": {"name": "Zardzewiałe szczęki", "description": "Mocno zardzewiała para szczęk zastępująca zwykłe szczęki pułapki na niedźwiedzie.<br><li>Ocalali schwytani w <b>pułapkę na niedźwiedzie</b> cierpią na efekt <b>Okaleczenie</b> do momentu pełnego wyleczenia.</li>"},
            "de": {"name": "Rostige Backen", "description": "Ein stark verrostetes Paar Fallenbacken, die die normalen der Bärenfalle ersetzen.<br><li>Überlebende, die in eine <b>Bärenfalle</b> geraten, leiden unter dem Statuseffekts <b>Gebrochen</b>, bis sie vollständig geheilt sind.</li>"},
            "es": {"name": "Mandíbulas oxidadas", "description": "Un par de mandíbulas muy oxidadas que reemplazan a las normales en la trampa para osos.<br><li>Los supervivientes atrapados en una <b>trampa para osos</b> sufren el efecto <b>Desesperanza</b> hasta curarse por completo.</li>"},
            "ja": {"name": "錆びた歯", "description": "トラバサミの通常の歯と交換する錆びた歯。<br><li><b>トラバサミ</b>にかかった生存者は、完全に回復するまで<b>衰弱</b>のステータス効果を受ける。</li>"}
        },
        "Addon_Trapper_FastTools": {
            "en": {"name": "Fast Tools", "description": "A specialized set of tools used to fasten Bear Traps to ensure their effectiveness.<br><li><b>Increases Bear Trap</b> setting speed by <b>50%</b>.</li><li><b>Increases</b> the time required to rescue a Survivor or attempt escape from a <b>Bear Trap</b> by <b>25%</b>.</li>"},
            "pl": {"name": "Szybkie narzędzia", "description": "Specjalny zestaw narzędzi używany do mocowania pułapek na niedźwiedzie, aby zapewnić ich skuteczność.<br><li><b>Zwiększa</b> prędkość zastawiania <b>pułapek na niedźwiedzie</b> o <b>50%</b>.</li><li><b>Wydłuża</b> czas potrzebny na ratunek ocalałego lub próbę ucieczki z <b>pułapki na niedźwiedzie</b> o <b>25%</b>.</li>"},
            "de": {"name": "Schnelle Werkzeuge", "description": "Ein spezielles Werkzeugset zum schnellen Befestigen von Bärenfallen.<br><li><b>Erhöht</b> das Aufstelltempo von <b>Bärenfallen</b> um <b>50%</b>.</li><li><b>Erhöht</b> die Zeit zum Retten oder Befreien aus einer <b>Bärenfalle</b> um <b>25%</b>.</li>"},
            "es": {"name": "Herramientas rápidas", "description": "Un conjunto especializado de herramientas utilizadas para asegurar las trampas para osos.<br><li><b>Aumenta</b> la velocidad de colocación de <b>trampas para osos</b> en un <b>50%</b>.</li><li><b>Aumenta</b> el tiempo necesario para rescatar o escapar de una <b>trampa para osos</b> en un <b>25%</b>.</li>"},
            "ja": {"name": "素早い工具", "description": "トラバサミを素早く調整するための特殊工具一式。<br><li><b>トラバサミ</b>の設置速度が<b>50%上昇</b>する。</li><li>生存者が<b>トラバサミ</b>から脱出または救出するのにかかる時間が<b>25%増加</b>する。</li>"}
        }
    }

    for parent_code, target_name, a_en in all_addon_entries:
        aid = a_en.get("Id", "")
        aname_en = a_en.get("DisplayName", {}).get("LocalizedString", "") or a_en.get("Name", "")
        if not aname_en:
            continue

        raw_rar = a_en.get("Rarity", "")
        target_res, cat_res, rar_res = resolve_addon_canonical(aid, aname_en, target_name, parent_code, raw_rar)

        addon_record = {
            "name": aname_en,
            "associated_target": target_res,
            "category": cat_res,
            "rarity": rar_res,
            "translations": {},
        }

        for lang_code, dump_data in localized_dumps.items():
            a_lang = None
            if parent_code in dump_data:
                for cand in dump_data[parent_code].get("ItemAddons", []):
                    if cand.get("Id") == aid:
                        a_lang = cand
                        break
            elif parent_code == "Survivor" and "SurvivorAddons" in dump_data:
                for cand in dump_data["SurvivorAddons"]:
                    if cand.get("Id") == aid:
                        a_lang = cand
                        break

            trap_loc = TRAPPER_ADDON_LOCALIZATIONS.get(aid) or TRAPPER_ADDON_LOCALIZATIONS.get(aname_en) or TRAPPER_ADDON_LOCALIZATIONS.get(f"Addon_Trapper_{aname_en.replace(' ', '')}")
            if trap_loc and lang_code in trap_loc:
                name_l = trap_loc[lang_code]["name"]
                desc_l = trap_loc[lang_code]["description"]
            elif a_lang:
                name_l = a_lang.get("DisplayName", {}).get("LocalizedString", aname_en)
                desc_l = a_lang.get("Description", {}).get("LocalizedString", "")
            else:
                name_l = aname_en
                desc_l = a_en.get("Description", {}).get("LocalizedString", "")

            addon_record["translations"][lang_code] = {
                "name": name_l,
                "description": desc_l,
            }

        squashed["addons"][aname_en] = addon_record
        if target_res:
            squashed["addons"][f"{aname_en} ({target_res})"] = addon_record

    # 5. Offerings
    all_off_entries = []
    for off_cat in ["CommonOfferings", "KillerOfferings", "SurvivorOfferings"]:
        for off in en_dump.get(off_cat, []):
            all_off_entries.append((off_cat, off))

    for off_cat, off_en in all_off_entries:
        off_id = off_en.get("Id", "")
        off_name_en = off_en.get("DisplayName", {}).get("LocalizedString", "") or off_en.get("Name", "")
        if not off_name_en:
            continue

        off_record = {
            "name": off_name_en,
            "category": off_cat,
            "role": "Killer" if "Killer" in off_cat else ("Survivor" if "Survivor" in off_cat else "All"),
            "translations": {},
        }

        for lang_code, dump_data in localized_dumps.items():
            off_lang = None
            for cand in dump_data.get(off_cat, []):
                if cand.get("Id") == off_id:
                    off_lang = cand
                    break

            if off_lang:
                name_l = off_lang.get("DisplayName", {}).get("LocalizedString", off_name_en)
                desc_l = off_lang.get("Description", {}).get("LocalizedString", "")
            else:
                name_l = off_name_en
                desc_l = off_en.get("Description", {}).get("LocalizedString", "")

            off_record["translations"][lang_code] = {
                "name": name_l,
                "description": desc_l,
            }

        squashed["offerings"][off_name_en] = off_record

    return squashed


def run_pipeline():
    if not DUMP_FILE.exists():
        print(f"BŁĄD: Nie znaleziono pliku {DUMP_FILE}")
        return

    en_file = BASE_DIR / "en.json"
    if not en_file.exists():
        print("BŁĄD: Brak pliku en.json w folderze roboczym.")
        return

    print("[1/5] Indeksowanie powiązań SourceString -> GUID Key...")
    source_to_guid = build_source_to_guid_index()
    print(f"      Zindeksowano {len(source_to_guid)} kluczy silnika.")

    print("[2/5] Wczytywanie bazy Tunables ze wszystkich podkatalogów...")
    tunables = load_all_tunables(CHARACTERS_DIR)
    print(f"      Zindeksowano {len(tunables)} znormalizowanych tunables.")

    print("[2.5/5] Indeksowanie PerkLevelTunables ze wszystkich podkatalogów...")
    perk_level_tunables_map = build_perk_level_tunables_map(CHARACTERS_DIR)
    print(f"        Zindeksowano {len(perk_level_tunables_map)} kluczy perk tunables.")

    en_lang_map = flatten_lang_file(en_file)

    with open(DUMP_FILE, "r", encoding="utf-8") as f:
        base_dump = json.load(f)

    lang_files = [
        f
        for f in BASE_DIR.glob("*.json")
        if f.stem in ["en", "pl", "de", "es", "ja"]
    ]

    print(f"[3/5] Generowanie zrzutów dla {len(lang_files)} języków...")

    localized_dumps = {}

    for lang_path in lang_files:
        lang_code = lang_path.stem
        print(
            f"      -> Przetwarzanie: {lang_code.upper()} ({lang_path.name})"
        )

        target_lang_map = flatten_lang_file(lang_path)
        target_keywords, en_keywords = build_keyword_dictionaries(
            base_dump, target_lang_map, en_lang_map, source_to_guid
        )

        localized_data = process_character_dump_for_lang(
            base_dump,
            target_lang_map,
            tunables,
            source_to_guid,
            target_keywords,
            en_keywords,
            lang_code=lang_code,
            perk_level_tunables_map=perk_level_tunables_map,
        )

        localized_dumps[lang_code] = localized_data

        out_file = (
            BASE_DIR / f"characters_dump_{lang_code}.json"
            if lang_code != "en"
            else BASE_DIR / "characters_dump.json"
        )
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(localized_data, f, ensure_ascii=False, indent=2)

        print(f"         Zapisano: {out_file.name}")

    print("[4/5] Budowanie squashed translations bundle...")
    squashed_bundle = build_squashed_translations(localized_dumps)

    if BACKEND_TRANSLATIONS_DIR.exists():
        out_squashed = BACKEND_TRANSLATIONS_DIR / "translations.json"
        out_min = BACKEND_TRANSLATIONS_DIR / "translations.min.json"
        with open(out_squashed, "w", encoding="utf-8") as f:
            json.dump(squashed_bundle, f, ensure_ascii=False, indent=2)
        with open(out_min, "w", encoding="utf-8") as f:
            json.dump(squashed_bundle, f, ensure_ascii=False, separators=(",", ":"))
        print(f"      Zapisano: {out_squashed.name} i {out_min.name}")

    print("[5/5] Zakończono sukcesem!")


if __name__ == "__main__":
    run_pipeline()