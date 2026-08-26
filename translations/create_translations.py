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

    ITEM_LOCALIZATIONS = {
        "Item_MasqueradeFlashlight": {
            "en": {"name": "Masquerade Flashlight", "description": "Not even a mask can protect you from this Flashlight's bright beam.<br><br>Press the <i>Use Item button</i> to light the <b>Flashlight</b> for up to <b>8 seconds</b>.<br><br>• Blinding the Killer triggers a celebratory explosion of confetti and lights.<br><br><span class=\"FlavorText\">\"Happy Anniversary! The future looks bright!\" — The Dead by Daylight Team</span>"},
            "pl": {"name": "Latarka na bal maskowy", "description": "Nawet maska nie ochroni cię przed jasnym promieniem tej latarki.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby włączyć <b>latarkę</b> na maksymalnie <b>8 sekund</b>.<br><br>• Oślepienie zabójcy wywołuje uroczysty wybuch konfetti i świateł.<br><br><span class=\"FlavorText\">„Wszystkiego najlepszego z okazji rocznicy! Przyszłość rysuje się w jasnych barwach!” — Zespół Dead by Daylight</span>"},
            "de": {"name": "Maskeraden-Taschenlampe", "description": "Nicht einmal eine Maske kann dich vor dem hellen Lichtstrahl dieser Taschenlampe schützen.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um die <b>Taschenlampe</b> bis zu <b>8 Sekunden</b> lang leuchten zu lassen.<br><br>• Das Blenden des Killers löst eine festliche Konfetti- und Lichtexplosion aus.<br><br><span class=\"FlavorText\">„Alles Gute zum Jubiläum! Die Zukunft sieht rosig aus!“ – Das Dead by Daylight-Team</span>"},
            "es": {"name": "Linterna de mascarada", "description": "Ni siquiera una máscara te protegerá del haz brillante de esta linterna.<br><br>Pulsa el <i>botón de usar objeto</i> para encender la <b>linterna</b> durante un máximo de <b>8 segundos</b>.<br><br>• Cegar al Asesino desencadena una festiva explosión de confeti y luces.<br><br><span class=\"FlavorText\">«¡Feliz aniversario! ¡El futuro parece brillante!» — El equipo de Dead by Daylight</span>"},
            "ja": {"name": "仮面舞踏会の懐中電灯", "description": "どんな仮面も、この懐中電灯の眩しい光からは守ってくれない。<br><br><i>アイテム使用ボタン</i>を押すと、最大<b>8秒間</b><b>懐中電灯</b>を点灯できる。<br><br>• 殺人鬼を目眩ましすると華やかな紙吹雪と光が炸裂する。<br><br><span class=\"FlavorText\">「記念日おめでとう！未来は明るいぞ！」 ― Dead by Daylight チーム</span>"}
        },
        "Item_AnniversaryFlashlight": {
            "en": {"name": "Anniversary Flashlight", "description": "A festive Flashlight equipped with sparklers that creates a celebratory burst of confetti upon blinding the Killer.<br><br>Press the <i>Use Item button</i> to light the <b>Flashlight</b> for up to <b>8 seconds</b>.<br><br>• Blinding the Killer triggers a burst of confetti.<br><br><span class=\"FlavorText\">\"Happy Anniversary!\" — The Dead by Daylight Team</span>"},
            "pl": {"name": "Latarka rocznicowa", "description": "Świąteczna latarka ozdobiona zimnymi ogniami, która wywołuje uroczysty wybuch konfetti po oślepieniu zabójcy.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby włączyć <b>latarkę</b> na maksymalnie <b>8 sekund</b>.<br><br>• Oślepienie zabójcy wywołuje wybuch konfetti.<br><br><span class=\"FlavorText\">„Wszystkiego najlepszego z okazji rocznicy!” — Zespół Dead by Daylight</span>"},
            "de": {"name": "Geburtstags-Taschenlampe", "description": "Eine festliche Taschenlampe mit Wunderkerzen, die beim Blenden des Killers eine Konfetti-Explosion erzeugt.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um die <b>Taschenlampe</b> bis zu <b>8 Sekunden</b> lang leuchten zu lassen.<br><br>• Das Blenden des Killers erzeugt eine Konfetti-Explosion.<br><br><span class=\"FlavorText\">„Alles Gute zum Jubiläum!“ – Das Dead by Daylight-Team</span>"},
            "es": {"name": "Linterna de aniversario", "description": "Una linterna festiva con bengalas que crea una explosión de confeti al cegar al Asesino.<br><br>Pulsa el <i>botón de usar objeto</i> para encender la <b>linterna</b> durante un máximo de <b>8 segundos</b>.<br><br>• Explota con confeti al cegar al Asesino.<br><br><span class=\"FlavorText\">«¡Feliz aniversario!» — El equipo de Dead by Daylight</span>"},
            "ja": {"name": "周年記念の懐中電灯", "description": "花火が付いた華やかな懐中電灯。殺人鬼を目眩ましすると紙吹雪が炸裂する。<br><br><i>アイテム使用ボタン</i>を押すと、最大<b>8秒間</b><b>懐中電灯</b>を点灯できる。<br><br>• 殺人鬼を目眩ましすると紙吹雪が炸裂する。<br><br><span class=\"FlavorText\">「記念日おめでとう！」 ― Dead by Daylight チーム</span>"}
        },
        "Item_AllHallowsEveLunchbox": {
            "en": {"name": "All Hallows' Eve Lunchbox", "description": "A spooky Halloween-themed lunchbox containing medical supplies that makes you glow brightly in the dark.<br><br>• <b>32 Charges</b>.<br>• <b>Increases Altruistic Healing speed</b> by <b>+40%</b>.<br>• Unlocks the <i>Self-Heal</i> action.<br>• Makes you <b>considerably more visible</b> to all Players while holding it.<br><br><span class=\"FlavorText\">\"Happy Halloween!\" — The Dead by Daylight Team</span>"},
            "pl": {"name": "Pudełko śniadaniowe na Halloween", "description": "Straszne pudełko śniadaniowe z motywem Halloween zawierające zaopatrzenie medyczne, które sprawia, że jasno świecisz w ciemności.<br><br>• <b>32 ładunki</b>.<br>• <b>Zwiększa prędkość leczenia innych</b> o <b>+40%</b>.<br>• Odblokowuje akcję <i>samoleczenia</i>.<br>• Sprawia, że jesteś <b>znacznie lepiej widoczny</b> dla wszystkich graczy podczas trzymania w dłoni.<br><br><span class=\"FlavorText\">„Wesołego Halloween!” — Zespół Dead by Daylight</span>"},
            "de": {"name": "Halloween-Brotdose", "description": "Eine gruselige Halloween-Brotdose mit medizinischen Hilfsmitteln, die dich im Dunkeln hell leuchten lässt.<br><br>• <b>32 Aufladungen</b>.<br>• <b>Erhöht das Altruismus-Heilungstempo</b> um <b>+40%</b>.<br>• Schaltet die Aktion <i>Selbstheilung</i> frei.<br>• Macht dich beim Halten für alle Spieler <b>deutlich sichtbarer</b>.<br><br><span class=\"FlavorText\">„Frohes Halloween!“ – Das Dead by Daylight-Team</span>"},
            "es": {"name": "Fiambrera de Halloween", "description": "Una fiambrera temática de Halloween con suministros médicos que te hace brillar intensamente en la oscuridad.<br><br>• <b>32 cargas</b>.<br>• <b>Aumenta la velocidad de curación altruista</b> en un <b>+40%</b>.<br>• Desbloquea la acción de <i>autocuración</i>.<br>• Te hace <b>considerablemente más visible</b> para todos los jugadores al sostenerlo.<br><br><span class=\"FlavorText\">«¡Feliz Halloween!» — El equipo de Dead by Daylight</span>"},
            "ja": {"name": "ハロウィンのランチボックス", "description": "暗闇で明るく輝く、医療品が入った不気味なハロウィン仕様のランチボックス。<br><br>• <b>32チャージ</b>。<br>• <b>他者治療の速度</b>が<b>+40%上昇</b>する。<br>• <i>自己治療</i>アクションが解放される。<br>• 手に持っている間、全プレイヤーから<b>かなり目立ちやすくなる</b>。<br><br><span class=\"FlavorText\">「ハッピーハロウィン！」 ― Dead by Daylight チーム</span>"}
        },
        "Item_WinterPartyStarter": {
            "en": {"name": "Winter Party Starter", "description": "A festive winter firecracker that detonates into loud bangs and intense flashes of light.<br><br>Press the <i>Use Item button</i> to drop the firecracker:<br>• Detonates with a loud bang and a blinding flash of light.<br>• Temporarily <b>blinds</b> and <b>deafens</b> nearby Players.<br>• Causes the Killer to <b>drop carried Survivors</b> if blinded during a pickup or carry.<br><br><span class=\"FlavorText\">Single-use consumable item.</span>"},
            "pl": {"name": "Starter Zimowej Imprezy", "description": "Świąteczna zimowa petarda, która detonuje z głośnym hukiem i intensywnym błyskiem światła.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby upuścić petardę:<br>• Detonuje z głośnym hukiem i oślepiającym błyskiem światła.<br>• Chwilowo <b>oślepia</b> i <b>ogłusza</b> pobliskich graczy.<br>• Powoduje, że zabójca <b>upuszcza niesionego ocalałego</b>, jeśli zostanie oślepiony podczas podnoszenia lub niesienia.<br><br><span class=\"FlavorText\">Przedmiot jednorazowego użytku.</span>"},
            "de": {"name": "Winter-Knallbonbon", "description": "Ein festlicher Winter-Partykracher, der mit lauten Knallen und hellen Blitzen detoniert.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um den Kracher abzulegen:<br>• Detoniert mit lautem Knall und blendendem Blitz.<br>• <b>Blendet</b> und <b>betäubt</b> kurzzeitig nahe Spieler.<br>• Lässt den Killer getragene Überlebende <b>fallenlassen</b>, wenn er geblendet wird.<br><br><span class=\"FlavorText\">Einmalig verwendbarer Gegenstand.</span>"},
            "es": {"name": "Petardo invernal", "description": "Un petardo invernal festivo que detona con fuertes estallidos y destellos de luz intensos.<br><br>Pulsa el <i>botón de usar objeto</i> para soltar el petardo:<br>• Detona con un fuerte estallido y un destello cegador.<br>• <b>Ciega</b> y <b>ensordece</b> temporalmente a los jugadores cercanos.<br>• Hace que el Asesino <b>suelte al superviviente transportado</b> si es cegado.<br><br><span class=\"FlavorText\">Objeto consumible de un solo uso.</span>"},
            "ja": {"name": "冬のパーティースターター", "description": "大きな破裂音と強烈な閃光を放って炸裂する冬のクラッカー。<br><br><i>アイテム使用ボタン</i>を押すとクラッカーを足元に設置する:<br>• 破裂音と眩しい光を放って爆発する。<br>• 近くのプレイヤーを目眩ましおよび一時的に聴覚を奪う。<br>• 殺人鬼が生存者を担いでいる時に目眩ましすると生存者を<b>落とさせる</b>。<br><br><span class=\"FlavorText\">使い切りの消費アイテム。</span>"}
        },
        "Item_ThirdYearPartyStarter": {
            "en": {"name": "Third Year Party Starter", "description": "A special anniversary firecracker celebrating the 3rd Year of Dead by Daylight.<br><br>Press the <i>Use Item button</i> to drop the firecracker:<br>• Detonates with a loud bang and a shower of colorful confetti.<br>• Temporarily <b>blinds</b> and <b>deafens</b> nearby Players.<br>• Causes the Killer to <b>drop carried Survivors</b> if blinded during a pickup or carry.<br><br><span class=\"FlavorText\">Single-use consumable item.</span>"},
            "pl": {"name": "Zestaw imprezowy z okazji trzeciej rocznicy", "description": "Specjalna rocznicowa petarda z okazji 3. rocznicy Dead by Daylight.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby upuścić petardę:<br>• Detonuje z głośnym hukiem i deszczem kolorowego konfetti.<br>• Chwilowo <b>oślepia</b> i <b>ogłusza</b> pobliskich graczy.<br>• Powoduje, że zabójca <b>upuszcza niesionego ocalałego</b>, jeśli zostanie oślepiony podczas podnoszenia lub niesienia.<br><br><span class=\"FlavorText\">Przedmiot jednorazowego użytku.</span>"},
            "de": {"name": "Partykracher zum dritten Geburtstag", "description": "Ein spezieller Knallkörper zum 3. Geburtstag von Dead by Daylight.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um den Kracher abzulegen:<br>• Detoniert mit lautem Knall und buntem Konfetti.<br>• <b>Blendet</b> und <b>betäubt</b> kurzzeitig nahe Spieler.<br>• Lässt den Killer getragene Überlebende <b>fallenlassen</b>.<br><br><span class=\"FlavorText\">Einmalig verwendbarer Gegenstand.</span>"},
            "es": {"name": "Petardo del tercer aniversario", "description": "Un petardo especial de aniversario para conmemorar el 3.er aniversario de Dead by Daylight.<br><br>Pulsa el <i>botón de usar objeto</i> para soltar el petardo:<br>• Detona con un fuerte estallido y una lluvia de confeti de colores.<br>• <b>Ciega</b> y <b>ensordece</b> a los jugadores cercanos.<br>• Hace que el Asesino <b>suelte al superviviente transportado</b>.<br><br><span class=\"FlavorText\">Objeto consumible de un solo uso.</span>"},
            "ja": {"name": "3周年のパーティースターター", "description": "Dead by Daylight 3周年を記念した特別なクラッカー。<br><br><i>アイテム使用ボタン</i>を押すとクラッカーを設置する:<br>• 破裂音と色鮮やかな紙吹雪を放って爆発する。<br>• 近くのプレイヤーを目眩ましする。<br>• 殺人鬼が生存者を担いでいる時に目眩ましすると生存者を落とさせる。<br><br><span class=\"FlavorText\">使い切りの消費アイテム。</span>"}
        },
        "Item_FlashGrenade": {
            "en": {"name": "Flash Grenade", "description": "Craftable Limited Item created using the <i>Flashbang</i> Perk.<br><br>Press the <i>Use Item button</i> to drop the grenade on the ground:<br>• Detonates with a short delay, producing a loud bang and a blinding flash of light.<br>• <b>Blinds</b> and <b>deafens</b> all players within the blast radius.<br>• Causes the Killer to <b>drop carried Survivors</b> if blinded during a pickup or carry.<br>• Triggers a loud Noise Notification at the explosion location for the Killer.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity at the end of the Trial.</span>"},
            "pl": {"name": "Granat błyskowy", "description": "Przedmiot limitowany wytwarzany przy pomocy umiejętności <i>Granat Błyskowy</i>.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby upuścić granat na ziemię:<br>• Detonuje z krótkim opóźnieniem z głośnym hukiem i oślepiającym błyskiem światła.<br>• <b>Oślepia</b> i <b>ogłusza</b> wszystkich graczy w zasięgu wybuchu.<br>• Powoduje, że zabójca <b>upuszcza niesionego ocalałego</b>, jeśli zostanie oślepiony podczas podnoszenia lub niesienia.<br>• Wywołuje głośne powiadomienie dźwiękowe w miejscu eksplozji dla zabójcy.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Blendgranate", "description": "Herstellbarer Gegenstand durch das Talent <i>Granate</i>.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um die Granate fallen zu lassen:<br>• Detoniert nach kurzer Verzögerung mit lautem Knall und Lichtblitz.<br>• <b>Blendet</b> und <b>betäubt</b> alle Spieler im Explosionsbereich.<br>• Lässt den Killer getragene Überlebende <b>fallenlassen</b>.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Granada cegadora", "description": "Objeto fabricable creado con la habilidad <i>Granada cegadora</i>.<br><br>Pulsa el <i>botón de usar objeto</i> para soltar la granada en el suelo:<br>• Detona con un breve retraso con un fuerte estallido y un destello cegador.<br>• <b>Ciega</b> y <b>ensordece</b> a todos los jugadores en el radio de alcance.<br>• Hace que el Asesino <b>suelte al superviviente transportado</b>.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "スタングレネード", "description": "パーク『スタングレネード』で作成可能な限定アイテム。<br><br><i>アイテム使用ボタン</i>を押すと足元にグレネードを落とす:<br>• 短い遅延の後に破裂音と眩しい光を放って爆発する。<br>• 爆発範囲内の全プレイヤーを目眩ましおよび聴覚を奪う。<br>• 殺人鬼が生存者を担いでいる時に目眩ましすると生存者を落とさせる。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_ChineseFirecracker": {
            "en": {"name": "Chinese Firecracker", "description": "A traditional Chinese firecracker used to ward off evil spirits during the Lunar New Year.<br><br>Press the <i>Use Item button</i> to drop the firecracker:<br>• Detonates with a series of loud bangs and bright flashes of light.<br>• Temporarily <b>blinds</b> and <b>deafens</b> nearby Players.<br>• Causes the Killer to <b>drop carried Survivors</b> if blinded.<br><br><span class=\"FlavorText\">Single-use consumable item.</span>"},
            "pl": {"name": "Chińskie petardy", "description": "Tradycyjna chińska petarda używana do odpędzania złych duchów podczas Nowego Roku Księżycowego.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby upuścić petardę:<br>• Detonuje serią głośnych trzasków i oślepiających błysków światła.<br>• Chwilowo <b>oślepia</b> i <b>ogłusza</b> pobliskich graczy.<br>• Powoduje, że zabójca <b>upuszcza niesionego ocalałego</b>, jeśli zostanie oślepiony.<br><br><span class=\"FlavorText\">Przedmiot jednorazowego użytku.</span>"},
            "de": {"name": "Chinesischer Böller", "description": "Traditionelle chinesische Feuerwerkskörper zur Vertreibung böser Geister zum Mondneujahr.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um den Böller abzulegen:<br>• Detoniert mit einer Reihe lauter Knalle und Lichtblitze.<br>• <b>Blendet</b> und <b>betäubt</b> nahe Spieler.<br>• Lässt den Killer getragene Überlebende <b>fallenlassen</b>.<br><br><span class=\"FlavorText\">Einmalig verwendbarer Gegenstand.</span>"},
            "es": {"name": "Petardos chinos", "description": "Un petardo tradicional chino utilizado para ahuyentar a los malos espíritus durante el Año Nuevo Lunar.<br><br>Pulsa el <i>botón de usar objeto</i> para soltar el petardo:<br>• Detona con una serie de fuertes estallidos y destellos brillantes.<br>• <b>Ciega</b> y <b>ensordece</b> a los jugadores cercanos.<br>• Hace que el Asesino <b>suelte al superviviente transportado</b>.<br><br><span class=\"FlavorText\">Objeto consumible de un solo uso.</span>"},
            "ja": {"name": "爆竹", "description": "旧正月を祝う伝統的な爆竹。<br><br><i>アイテム使用ボタン</i>を押すと足元に爆竹を設置する:<br>• 連続した破裂音と閃光を放って炸裂する。<br>• 近くのプレイヤーを目眩ましする。<br>• 殺人鬼が生存者を担いでいる時に目眩ましすると生存者を落とさせる。<br><br><span class=\"FlavorText\">使い切りの消費アイテム。</span>"}
        },
        "Item_BanquetFlashlight": {
            "en": {"name": "Banquet Flashlight", "description": "It's time to burn calories... and retinas.<br><br>Press the <i>Use Item button</i> to light the <b>Flashlight</b> for up to <b>8 seconds</b>.<br><br>• Blinding the Killer creates a celebratory burst of confetti and lights.<br><br><span class=\"FlavorText\">Only available during Anniversary Events.</span>"},
            "pl": {"name": "Bankietowa latarka", "description": "Czas spalić kalorie... i siatkówki.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby włączyć <b>latarkę</b> na maksymalnie <b>8 sekund</b>.<br><br>• Oślepienie zabójcy wywołuje uroczysty wybuch konfetti i świateł.<br><br><span class=\"FlavorText\">Dostępna wyłącznie podczas wydarzeń rocznicowych.</span>"},
            "de": {"name": "Bankett-Taschenlampe", "description": "Zeit, Kalorien zu verbrennen ... und Netzhäute.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um die <b>Taschenlampe</b> bis zu <b>8 Sekunden</b> lang leuchten zu lassen.<br><br>• Das Blenden des Killers erzeugt eine festliche Explosion aus Konfetti und Licht.<br><br><span class=\"FlavorText\">Nur während Jubiläums-Events verfügbar.</span>"},
            "es": {"name": "Linterna de banquete", "description": "Es hora de quemar calorías... y retinas.<br><br>Pulsa el <i>botón de usar objeto</i> para encender la <b>linterna</b> durante un máximo de <b>8 segundos</b>.<br><br>• Cegar al Asesino crea una festiva explosión de confeti y luces.<br><br><span class=\"FlavorText\">Solo disponible durante los eventos de aniversario.</span>"},
            "ja": {"name": "バンケットの懐中電灯", "description": "カロリーを消費する時だ…ついでに網膜も。<br><br><i>アイテム使用ボタン</i>を押すと、最大<b>8秒間</b><b>懐中電灯</b>を点灯できる。<br><br>• 殺人鬼を目眩ましすると華やかな紙吹雪と光が炸裂する。<br><br><span class=\"FlavorText\">記念イベント期間中のみ利用可能。</span>"}
        },
        "Item_Candelabra": {
            "en": {"name": "Candelabra", "description": "Limited Item from the <i>Lights Out - Castlevania</i> Modifier Event.<br><br>In the darkest of castles, any light is a precious commodity. All Survivors start the Trial with a <b>Candelabra</b> in hand.<br><br>• <b>90 Charges</b>.<br>• Pushes back the Fog as a passive effect when held.<br>• Press and hold the <i>Use Item button</i> to reveal the Aura of the nearest incomplete Generator.<br>• Place the <b>Candelabra</b> on top of a Generator to reveal its Aura to all Survivors within <b>32 meters</b>.<br>• Completing that Generator suppresses the Killer's ability to read Generator Auras for <b>15 seconds</b>.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Kandelabr", "description": "Przedmiot limitowany z wydarzenia <i>Lights Out - Castlevania</i>.<br><br>W najciemniejszych zamkach każde światło jest cennym towarem. Wszyscy ocalali rozpoczynają próbę z <b>Kandelabrem</b> w dłoni.<br><br>• <b>90 ładunków</b>.<br>• Trzymany w dłoni pasywnie rozprasza Mgłę.<br>• Przytrzymaj przycisk <i>użycia przedmiotu</i>, aby ujawnić aurę najbliższego nieukończonego generatora.<br>• Umieść <b>Kandelabr</b> na generatorze, aby ujawnić jego aurę wszystkim ocalałym w promieniu <b>32 metrów</b>.<br>• Ukończenie generatora z kandelabrem blokuje zdolność zabójcy do odczytywania aur generatorów na <b>15 sekund</b>.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Kandelaber", "description": "Begrenzter Gegenstand aus dem Event <i>Lights Out – Castlevania</i>.<br><br>In den dunkelsten Schlössern ist jedes Licht ein kostbares Gut. Alle Überlebenden beginnen die Prüfung mit einem <b>Kandelaber</b> in der Hand.<br><br>• <b>90 Aufladungen</b>.<br>• Drängt beim Halten den Nebel passiv zurück.<br>• Halte die Taste <i>Gegenstand benutzen</i> gedrückt, um die Aura des nächsten unvollständigen Generators anzuzeigen.<br>• Platziere den <b>Kandelaber</b> auf einem Generator, um dessen Aura allen Überlebenden im Umkreis von <b>32 Metern</b> anzuzeigen.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Candelabro", "description": "Objeto limitado del evento <i>Lights Out - Castlevania</i>.<br><br>En los castillos más oscuros, cualquier luz es un bien preciado. Todos los supervivientes comienzan la partida con un <b>Candelabro</b> en la mano.<br><br>• <b>90 cargas</b>.<br>• Disipa la Niebla de forma pasiva al sostenerlo.<br>• Mantén pulsado el <i>botón de usar objeto</i> para revelar el aura del generador incompleto más cercano.<br>• Coloca el <b>Candelabro</b> en un generador para revelar su aura a todos los supervivientes en un radio de <b>32 metros</b>.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "枝付き燭台", "description": "モディファイアイベント『消灯 - キャッスルヴァニア』の限定アイテム。<br><br>暗闇の城では、どんな灯りも貴重な宝となる。全生存者は<b>枝付き燭台</b>を手にした状態で儀式を開始する。<br><br>• <b>90チャージ</b>。<br>• 手に持っている間、霧を押し返す。<br>• <i>アイテム使用ボタン</i>を長押しすると、最も近い未完了の発電機のオーラが視える。<br>• 発電機の上に置くと、<b>32メートル</b>以内の全生存者にその発電機のオーラが表示される。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_RemoteFlameTurret": {
            "en": {"name": "Remote Flame Turret", "description": "Limited Item against The Xenomorph retrieved from Control Stations.<br><br>• Deployed turrets emit an audible warning and reveal the distance of an approaching Xenomorph.<br>• When The Xenomorph is in range, the turret fires flames: slowing The Xenomorph and ending its <b>Crawler Mode</b>.<br>• Continuous firing causes the turret to overheat and shut down.<br>• The Xenomorph can destroy deployed turrets with a basic attack or Tail Attack.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Zdalna wieżyczka ogniowa", "description": "Przedmiot limitowany pobierany ze stacji kontrolnych w starciu z Ksenomorfem.<br><br>• Rozłożona wieżyczka emituje dźwiękowy sygnał ostrzegawczy i ujawnia odległość do zbliżającego się Ksenomorfa.<br>• Gdy Ksenomorf znajdzie się w jej zasięgu, wieżyczka otwiera ogień: podpala go, <b>spowalnia</b> i zmusza do opuszczenia <b>trybu pełzania</b>.<br>• Ciągły ogień doprowadza do przegrzania i wyłączenia wieżyczki.<br>• Ksenomorf może zniszczyć rozłożoną wieżyczkę atakiem zwykłym lub atakiem ogonem.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Ferngesteuertes Flammengeschütz", "description": "Begrenzter Gegenstand von Kontrollstationen gegen den Xenomorph.<br><br>• Das aufgestellte Flammengeschütz warnt vor dem herannahenden Xenomorph und zeigt dessen Entfernung an.<br>• Kommt der Xenomorph in Reichweite, eröffnet das Geschütz das Feuer: es <b>verlangsamt</b> ihn und beendet seinen <b>Kriechmodus</b>.<br>• Der Xenomorph kann Geschütze mit einem normalen Angriff oder Schwanzangriff zerstören.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Torreta lanzallamas a distancia", "description": "Objeto limitado de las estaciones de control contra el Xenomorfo.<br><br>• La torreta desplegada emite una señal sonora y revela la distancia del Xenomorfo.<br>• Cuando entra en alcance, la torreta dispara: lo <b>ralentiza</b> y desactiva su <b>modo cuadrúpedo</b>.<br>• El Xenomorfo puede destruir la torreta con un ataque básico o de cola.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "遠隔火炎タレット", "description": "コントロールステーションから入手できるゼノモーフ対策の限定アイテム。<br><br>• 設置されたタレットは接近するゼノモーフの距離を警告音で知らせる。<br>• 射程内に入ると火炎放射で攻撃し、<b>移動速度を低下</b>させ、<b>這いずりモード</b>を解除する。<br>• ゼノモーフは通常攻撃や尻尾攻撃でタレットを破壊できる。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_FogCrystal": {
            "en": {"name": "Fog Crystal", "description": "Limited Item from the <i>Haunted by Daylight</i> Event.<br><br>Cold to the touch, the crystal vibrates with dark Void energy.<br><br>Press the <i>Use Item button</i> to throw the crystal:<br>• Explodes into a dense cloud of fog that slows the Killer and suppresses their Aura reading abilities within the area.<br>• Allows Survivors to quickly hide and break line of sight.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Kryształ mgły", "description": "Przedmiot limitowany z wydarzenia <i>Haunted by Daylight</i>.<br><br>Zimny w dotyku kryształ wibruje od ciemnej energii Pustki.<br><br>Naciśnij przycisk <i>użycia przedmiotu</i>, aby rzucić kryształem:<br>• Eksploduje w gęstą chmurę mgły, która spowalnia zabójcę i blokuje odczytywanie aur w obszarze działania.<br>• Pozwala ocalałym na szybkie ukrycie się i zerwanie pościgu.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Nebelkristall", "description": "Begrenzter Gegenstand aus dem <i>Haunted by Daylight</i>-Event.<br><br>Der Kristall fühlt sich eiskalt an und vibriert vor dunkler Energie.<br><br>Drücke die Taste <i>Gegenstand benutzen</i>, um den Kristall zu werfen:<br>• Explodiert in eine dichte Nebelwolke, die den Killer verlangsamt und Auren blockiert.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Cristal de niebla", "description": "Objeto limitado del evento <i>Haunted by Daylight</i>.<br><br>Frío al tacto, el cristal vibra con energía oscura del Vacío.<br><br>Pulsa el <i>botón de usar objeto</i> para lanzar el cristal:<br>• Explota en una densa nube de niebla que ralentiza al Asesino y bloquea la lectura de auras.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "霧のクリスタル", "description": "『Haunted by Daylight』イベントの限定アイテム。<br><br>触れると冷たく、虚空の力で振動している。<br><br><i>アイテム使用ボタン</i>を押すとクリスタルを投擲する:<br>• 濃密な霧となって破裂し、殺人鬼を妨害してオーラ視覚を遮断する。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_Keycard": {
            "en": {"name": "Keycard", "description": "A keycard that fits in a terminal inside the secret room aboard the <i>Nostromo</i>.<br><br>• Unlocks the secret supply cache on the <i>Nostromo Wreckage</i> map.<br>• Insert the keycard into the terminal console to unlock the door and retrieve powerful tools.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Karta kodowa", "description": "Karta kodowa pasująca do terminala w sekretnym pomieszczeniu na pokładzie <i>Nostromo</i>.<br><br>• Otwiera dostęp do tajnego schowka z zaopatrzeniem na mapie <i>Wrak Nostromo</i>.<br>• Włóż kartę do konsoli terminala, aby odblokować drzwi do komory i zdobyć potężne przedmioty.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Schlüsselkarte", "description": "Eine Schlüsselkarte, die in ein Terminal an Bord der <i>Nostromo</i> passt.<br><br>• Öffnet den geheimen Vorratsraum auf dem <i>Wrack der Nostromo</i>.<br>• Verwende die Karte am Terminal, um die Tür zu entriegeln.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Tarjeta de acceso", "description": "Una tarjeta de acceso que encaja en un terminal a bordo de la <i>Nostromo</i>.<br><br>• Abre la sala secreta de suministros en el mapa de los <i>Restos de la Nostromo</i>.<br>• Insértala en la consola para desbloquear la puerta y conseguir objetos.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "キーカード", "description": "<i>ノストロモ号</i>の船内にある秘密の部屋の端末に適合するキーカード。<br><br>• <i>ノストロモ号の残骸</i>マップにある秘密の部屋のドアを開錠する。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_VHSTape": {
            "en": {"name": "VHS Tape", "description": "A cursed videotape retrieved from an active TV to turn it off temporarily.<br><br>• Carrying a <b>VHS Tape</b> causes <b>Condemned</b> to steadily build up during The Onryō's Projections.<br>• Insert the <b>VHS Tape</b> into the highlighted TV to <b>reduce Condemned by -3 Stacks</b>.<br>• Survivors who reach maximum Condemned (7 Stacks) can be killed immediately when downed.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Kaseta VHS", "description": "Przeklęta kaseta wideo, którą ocalali mogą wyjąć z włączonego telewizora, aby go tymczasowo wyłączyć.<br><br>• Niesienie <b>Kasety VHS</b> powoduje stopniowe narastanie kumulacji <b>Potępienia</b> podczas projekcji Onryō.<br>• Włóż <b>Kasetę VHS</b> do oznaczonego telewizora, aby <b>usunąć 3 kumulacje Potępienia</b>.<br>• Ocalony z maksymalnym poziomem Potępienia (7 kumulacji) może zostać natychmiast zabity po powaleniu.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Videokassette", "description": "Ein verfluchtes Videoband aus einem aktiven Fernseher, um diesen vorübergehend auszuschalten.<br><br>• Das Tragen des <b>Videobands</b> baut während der Projektionen von Onryō Stapel von <b>Verdammt</b> auf.<br>• Lege das Band in den markierten Fernseher ein, um <b>3 Stapel von Verdammt abzubauen</b>.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Cinta de vídeo", "description": "Una cinta de vídeo maldita recogida de un televisor para apagarlo temporalmente.<br><br>• Llevar una <b>Cinta de vídeo</b> acumula <b>Condena</b> pasivamente durante las proyecciones de La Onryō.<br>• Inserta la cinta en el televisor marcado para <b>eliminar 3 acumulaciones de Condena</b>.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "ビデオテープ", "description": "テレビの電源を一時的に切るために取り出された呪われたビデオテープ。<br><br>• <b>ビデオテープ</b>を所持している間、怨霊の幽体離脱時に<b>呪像</b>の蓄積が進行する。<br>• ハイライトされた特定のテレビにテープを挿入することで、<b>呪像の蓄積を3個減少</b>させられる。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_GlowingFungus": {
            "en": {"name": "Glowing Fungus", "description": "A strange glowing fungus that grows on Survivors infected with a parasite.<br><br>• Consuming the <b>Glowing Fungus</b> removes the parasite and cures the infection.<br>• Eating the fungus may temporarily inflict the <b>Oblivious</b> or <b>Exhausted</b> Status Effect.<br>• Holding a fungus reveals your location to the Killer within a certain range.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Świecący Grzyb", "description": "Tajemniczy świecący grzyb rosnący na ciałach zarażonych pasożytem ocalałych.<br><br>• Zjedzenie <b>Świecącego Grzyba</b> usuwa pasożyta i leczy z infekcji.<br>• Spożycie grzyba może chwilowo nałożyć efekt <b>Nieświadomy</b> lub <b>Wyczerpany</b>.<br>• Ocalali niosący grzyb ujawniają swoją obecność zabójcy w określonym zasięgu.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Leuchtpilz", "description": "Ein leuchtender Pilz, der auf parasitenbefallenen Überlebenden wächst.<br><br>• Das Verzehren des <b>Leuchtpilzes</b> entfernt den Parasiten und heilt die Infektion.<br>• Kann vorübergehend den Statuseffekt <b>Ahnungslos</b> oder <b>Erschöpft</b> auslösen.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Hongo brillante", "description": "Un hongo brillante que crece en los supervivientes infectados con un parásito.<br><br>• Consumir el <b>Hongo brillante</b> elimina el parásito y cura la infección.<br>• Puede infligir temporalmente el efecto de estado <b>Inconsciente</b> o <b>Agotamiento</b>.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "光るキノコ", "description": "寄生された生存者の体に発生する発光性のキノコ。<br><br>• <b>光るキノコ</b>を摂取することで寄生虫を除去し、感染状態を治療する。<br>• 一時的に<b>忘却</b>または<b>疲労</b>のステータス効果を受ける場合がある。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_HandofVecna": {
            "en": {"name": "Hand of Vecna", "description": "A legendary artifact of The Lich found inside magical Treasure Chests.<br><br>• Press the <i>Interaction button</i> to attune to the <b>Hand of Vecna</b>:<br>• Entering a Locker allows you to instantly <b>teleport to another Locker</b> within line of sight.<br>• Teleporting costs <b>1 Health State</b> and triggers <i>Killer Instinct</i> for <b>3 seconds</b>.<br>• An attuned Survivor can be executed immediately by The Lich when placed in the Dying State.<br><br><span class=\"FlavorText\">Limited Item — cannot be brought out of the Trial.</span>"},
            "pl": {"name": "Ręka Vecny", "description": "Legendarny artefakt Licza, który można znaleźć w magicznych skrzyniach ze skarbem.<br><br>• Naciśnij przycisk <i>interakcji</i>, aby dostroić się do <b>Ręki Vecny</b>:<br>• Wejście do szafki pozwala natychmiast <b>teleportować się do innej szafki</b> w zasięgu wzroku.<br>• Użycie teleportacji odbiera <b>1 stan zdrowia</b> i nakłada efekt <i>Zabójczego Instynktu</i> na <b>3 sekundy</b>.<br>• Ocalały dostrojony do artefaktu może zostać natychmiast zabity przez Licza, gdy zostanie powalony.<br><br><span class=\"FlavorText\">Przedmiot limitowany — nie można go wynieść z próby.</span>"},
            "de": {"name": "Hand von Vecna", "description": "Ein legendäres Artefakt des Lichs aus magischen Schatztruhen.<br><br>• Stimme dich auf die <b>Hand von Vecna</b> ein:<br>• Das Betreten eines Schranks erlaubt dir, dich sofort zu einem anderen Schrank zu <b>teleportieren</b>.<br>• Kostet <b>1 Gesundheitsstatus</b> und löst für <b>3 Sekunden</b> <i>Killer-Instinkt</i> aus.<br>• Kann vom Lich bei Erreichen des Todesstatus sofort getötet werden.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – kann die Prüfung nicht verlassen.</span>"},
            "es": {"name": "Mano de Vecna", "description": "Un artefacto legendario de El Liche que se encuentra en los cofres del tesoro.<br><br>• Sintonízate con la <b>Mano de Vecna</b>:<br>• Entrar en una taquilla te permite <b>teletransportarte instantáneamente a otra taquilla</b>.<br>• Cuesta <b>1 estado de salud</b> y activa <i>Instinto asesino</i> durante <b>3 segundos</b>.<br>• El Liche puede ejecutar inmediatamente a los supervivientes sintonizados en estado agonizante.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "ヴェクナの手", "description": "宝箱から入手できるリッチの伝説的なアーティファクト。<br><br>• <b>ヴェクナの手</b>に同調する:<br>• ロッカーに入ると、別のロッカーへ即座に<b>テレポート</b>できる。<br>• テレポートを使用すると<b>1段階の負傷</b>を負い、<b>3秒間</b>殺人鬼のキラーの本能が発動する。<br>• 同調した生存者は瀕死状態になった際にリッチによって直接殺害（メメント・モリ）される危険がある。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式から持ち帰ることはできない。</span>"}
        },
        "Item_EyeofVecna": {
            "en": {"name": "Eye of Vecna", "description": "A legendary artifact of The Lich found inside magical Treasure Chests.<br><br>• Press the <i>Interaction button</i> to attune to the <b>Eye of Vecna</b>:<br>• Exiting a Locker grants complete <b>Invisibility</b> and <b>+50% Haste</b> for <b>3 seconds</b>.<br>• Leaves no Scratch Marks or pools of blood while invisible.<br>• Activating costs <b>1 Health State</b> and triggers <i>Killer Instinct</i> for <b>3 seconds</b>.<br>• An attuned Survivor can be executed immediately by The Lich when placed in the Dying State.<br><br><span class=\"FlavorText\">Limited Item — cannot be brought out of the Trial.</span>"},
            "pl": {"name": "Oko Vecny", "description": "Legendarny artefakt Licza, który można znaleźć w magicznych skrzyniach ze skarbem.<br><br>• Naciśnij przycisk <i>interakcji</i>, aby dostroić się do <b>Oka Vecny</b>:<br>• Wyjście z szafki zapewnia całkowitą <b>niewidzialność</b> i status <b>Pośpiech (+50%)</b> na <b>3 sekundy</b>.<br>• Podczas trwania niewidzialności nie zostawiasz śladów zarysowań ani plam krwi.<br>• Użycie zdolności odbiera <b>1 stan zdrowia</b> i nakłada efekt <i>Zabójczego Instynktu</i> na <b>3 sekundy</b>.<br>• Ocalały dostrojony do artefaktu może zostać natychmiast zabity przez Licza, gdy zostanie powalony.<br><br><span class=\"FlavorText\">Przedmiot limitowany — nie można go wynieść z próby.</span>"},
            "de": {"name": "Auge von Vecna", "description": "Ein legendäres Artefakt des Lichs aus magischen Schatztruhen.<br><br>• Stimme dich auf das <b>Auge von Vecna</b> ein:<br>• Das Verlassen eines Schranks gewährt <b>3 Sekunden</b> lang <b>Unsichtbarkeit</b> und <b>+50% Eile</b>.<br>• Kostet <b>1 Gesundheitsstatus</b> und löst für <b>3 Sekunden</b> <i>Killer-Instinkt</i> aus.<br>• Kann vom Lich bei Erreichen des Todesstatus sofort getötet werden.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – kann die Prüfung nicht verlassen.</span>"},
            "es": {"name": "Ojo de Vecna", "description": "Un artefacto legendario de El Liche que se encuentra en los cofres del tesoro.<br><br>• Sintonízate con el <b>Ojo de Vecna</b>:<br>• Salir de una taquilla otorga <b>invisibilidad total</b> y <b>Celeridad (+50%)</b> durante <b>3 segundos</b>.<br>• Cuesta <b>1 estado de salud</b> y activa <i>Instinto asesino</i> durante <b>3 segundos</b>.<br>• El Liche puede ejecutar inmediatamente a los supervivientes sintonizados en estado agonizante.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "ヴェクナの目", "description": "宝箱から入手できるリッチの伝説的なアーティファクト。<br><br>• <b>ヴェクナの目</b>に同調する:<br>• ロッカーから出ると<b>3秒間</b>完全な<b>透明化</b>と<b>迅速 (+50%)</b>を得る。<br>• 発動時に<b>1段階の負傷</b>を負い、<b>3秒間</b>キラーの本能が発動する。<br>• 同調した生存者は瀕死状態になった際にリッチによって直接殺害される危険がある。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式から持ち帰ることはできない。</span>"}
        },
        "Item_EMP": {
            "en": {"name": "EMP", "description": "A device printed from Supply Cases to disable The Singularity's network.<br><br>• Press and hold the <i>Use Item button</i> to charge and release an <b>Electromagnetic Pulse (EMP)</b>:<br>• <b>Removes Slipstream</b> from all nearby Survivors.<br>• <b>Temporarily disables Biopods</b> within the blast radius.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Urządzenie EMP", "description": "Przedmiot wytwarzany przez <b>skrzynie z zapasami</b> na mapie przeciwko Osobliwości.<br><br>• Ocalali mogą pobrać <b>EMP</b> ze skrzyni z zapasami lub przyspieszyć proces jego drukowania.<br>• Naciśnij i przytrzymaj przycisk <i>użycia przedmiotu</i>, aby naładować i wyemitować <b>Impuls Elektromagnetyczny (EMP)</b>:<br>• <b>Usuwa pasożytniczy strumień (Slipstream)</b> ze wszystkich pobliskich ocalałych.<br>• <b>Tymczasowo wyłącza biokapsuły</b> Osobliwości w zasięgu fali uderzeniowej.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "EMP-Gerät", "description": "Ein von Versorgungskisten gedrucktes Gerät gegen die Singularität.<br><br>• Halte die Taste <i>Gegenstand benutzen</i> gedrückt, um einen <b>Elektromagnetischen Impuls (EMP)</b> auszulösen:<br>• <b>Entfernt den Windschatten (Slipstream)</b> von allen nahen Überlebenden.<br>• <b>Deaktiviert Biokapseln</b> der Singularität im Wirkungsbereich vorübergehend.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Dispositivo PEM", "description": "Un dispositivo fabricado por las cajas de suministros contra La Singularidad.<br><br>• Mantén pulsado el <i>botón de usar objeto</i> para cargar y liberar un <b>Pulso Electromagnético (EMP)</b>:<br>• <b>Elimina la estela (Slipstream)</b> de todos los supervivientes cercanos.<br>• <b>Desactiva temporalmente las biovainas</b> de La Singularidad dentro del radio de efecto.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "EMPデバイス", "description": "シンギュラリティに対抗するためサプライケースから生成されるアイテム。<br><br>• <i>アイテム使用ボタン</i>を長押しして<b>EMP（電磁パルス）</b>をチャージ・発射する:<br>• 範囲内の全生存者から<b>スリップストリーム（寄生体）を除去</b>する。<br>• 範囲内のシンギュラリティの<b>バイオポッドを一時的に無力化</b>する。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        },
        "Item_FragileMirror": {
            "en": {"name": "Fragile Mirror", "description": "A pocket mirror retrieved from the basement with a White Glyph. Its surface is icy cold.<br><br><span class=\"FlavorText\">Limited Item — consumed by The Entity upon exiting the Trial.</span>"},
            "pl": {"name": "Kruche lusterko", "description": "Kieszonkowe lusterko wyciągnięte z piwnicy z białym glifem. Jego powierzchnia jest lodowata.<br><br><span class=\"FlavorText\">Przedmiot limitowany — jest pochłaniany przez Byt na koniec próby.</span>"},
            "de": {"name": "Zerbrechlicher Spiegel", "description": "Ein Taschenspiegel aus dem Keller mit einer weißen Glyphe. Seine Oberfläche ist eiskalt.<br><br><span class=\"FlavorText\">Begrenzter Gegenstand – wird am Ende der Prüfung vom Entitus aufgenommen.</span>"},
            "es": {"name": "Espejo frágil", "description": "Un espejo de bolsillo recuperado del sótano con un glifo blanco. Su superficie está helada.<br><br><span class=\"FlavorText\">Objeto limitado: consumido por el Ente al final de la partida.</span>"},
            "ja": {"name": "壊れやすい鏡", "description": "地下室から回収された白いグリフが描かれた手鏡。表面は氷のように冷たい。<br><br><span class=\"FlavorText\">限定アイテム ― 儀式終了時にエンティティによって回収される。</span>"}
        }
    }

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

        clean_it_key = "Item_" + it_name_en.replace(" ", "").replace("'", "").replace("-", "")
        item_loc_override = (
            ITEM_LOCALIZATIONS.get(it_id)
            or ITEM_LOCALIZATIONS.get(it_name_en)
            or ITEM_LOCALIZATIONS.get(clean_it_key)
        )

        for lang_code, dump_data in localized_dumps.items():
            it_lang = None
            for cand in dump_data.get("Items", []):
                if cand.get("Id") == it_id:
                    it_lang = cand
                    break

            if item_loc_override and lang_code in item_loc_override:
                name_l = item_loc_override[lang_code]["name"]
                desc_l = item_loc_override[lang_code]["description"]
            elif it_lang:
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
        },
        "Addon_Trapper_TrapperBag": {
            "en": {"name": "Trapper Bag", "description": "A protective heavy leather bag used for carrying bear traps.<br><li>Start the Trial with <b>2 extra Bear Traps</b>.</li><li>Allows the carrying of <b>2 extra Bear Traps</b>.</li>"},
            "pl": {"name": "Torba trapera", "description": "Ciężka skórzana torba ochronna używana do przenoszenia pułapek na niedźwiedzie.<br><li>Rozpoczynasz próbę z <b>2 dodatkowymi pułapkami na niedźwiedzie</b>.</li><li>Pozwala na przenoszenie <b>2 dodatkowych pułapek na niedźwiedzie</b>.</li>"},
            "de": {"name": "Fallensteller-Tasche", "description": "Eine schwere Ledertasche zum Tragen von Bärenfallen.<br><li>Beginne die Prüfung mit <b>2 zusätzlichen Bärenfallen</b>.</li><li>Ermöglicht das Tragen von <b>2 zusätzlichen Bärenfallen</b>.</li>"},
            "es": {"name": "Bolsa de trampero", "description": "Una bolsa de cuero grueso para transportar trampas para osos.<br><li>Empiezas la partida con <b>2 trampas para osos adicionales</b>.</li><li>Permite transportar <b>2 trampas para osos adicionales</b>.</li>"},
            "ja": {"name": "トラッパーのバッグ", "description": "トラバサミを運ぶための厚手の革袋。<br><li>儀式開始時に<b>トラバサミを2個追加</b>で所持する。</li><li><b>トラバサミの所持上限が2個増加</b>する。</li>"}
        },
        "Trapper Bag": {
            "en": {"name": "Trapper Bag", "description": "A protective heavy leather bag used for carrying bear traps.<br><li>Start the Trial with <b>2 extra Bear Traps</b>.</li><li>Allows the carrying of <b>2 extra Bear Traps</b>.</li>"},
            "pl": {"name": "Torba trapera", "description": "Ciężka skórzana torba ochronna używana do przenoszenia pułapek na niedźwiedzie.<br><li>Rozpoczynasz próbę z <b>2 dodatkowymi pułapkami na niedźwiedzie</b>.</li><li>Pozwala na przenoszenie <b>2 dodatkowych pułapek na niedźwiedzie</b>.</li>"},
            "de": {"name": "Fallensteller-Tasche", "description": "Eine schwere Ledertasche zum Tragen von Bärenfallen.<br><li>Beginne die Prüfung mit <b>2 zusätzlichen Bärenfallen</b>.</li><li>Ermöglicht das Tragen von <b>2 zusätzlichen Bärenfallen</b>.</li>"},
            "es": {"name": "Bolsa de trampero", "description": "Una bolsa de cuero grueso para transportar trampas para osos.<br><li>Empiezas la partida con <b>2 trampas para osos adicionales</b>.</li><li>Permite transportar <b>2 trampas para osos adicionales</b>.</li>"},
            "ja": {"name": "トラッパーのバッグ", "description": "トラバサミを運ぶための厚手の革袋。<br><li>儀式開始時に<b>トラバサミを2個追加</b>で所持する。</li><li><b>トラバサミの所持上限が2個増加</b>する。</li>"}
        },
        "ADDON_K33_13": {
            "en": {"name": "Molted Skin", "description": "Dried skin shed by the Xenomorph during rapid growth.<br><li><b>Increases Movement Speed</b> while in <b>Crawler Mode</b> by <b>+2%</b>.</li>"},
            "pl": {"name": "Wylinka", "description": "Wysuszona skóra zrzucona przez Ksenomorfa w trakcie szybkiego wzrostu.<br><li><b>Zwiększa prędkość ruchu</b> w <b>trybie pełzania</b> o <b>+2%</b>.</li>"},
            "de": {"name": "Gehäutete Haut", "description": "Getrocknete Haut, die der Xenomorph beim schnellen Wachstum abgeworfen hat.<br><li><b>Erhöht die Bewegungsgeschwindigkeit</b> im <b>Kriechmodus</b> um <b>+2%</b>.</li>"},
            "es": {"name": "Piel mudada", "description": "Piel seca mudada por el Xenomorfo durante su rápido crecimiento.<br><li><b>Aumenta la velocidad de movimiento</b> en <b>modo cuadrúpedo</b> en un <b>+2%</b>.</li>"},
            "ja": {"name": "脱皮した皮膚", "description": "ゼノモーフの急成長時に剥がれ落ちた乾燥した皮膚。<br><li><b>這いずりモード</b>時の<b>移動速度が+2%上昇</b>する。</li>"}
        },
        "Molted Skin": {
            "en": {"name": "Molted Skin", "description": "Dried skin shed by the Xenomorph during rapid growth.<br><li><b>Increases Movement Speed</b> while in <b>Crawler Mode</b> by <b>+2%</b>.</li>"},
            "pl": {"name": "Wylinka", "description": "Wysuszona skóra zrzucona przez Ksenomorfa w trakcie szybkiego wzrostu.<br><li><b>Zwiększa prędkość ruchu</b> w <b>trybie pełzania</b> o <b>+2%</b>.</li>"},
            "de": {"name": "Gehäutete Haut", "description": "Getrocknete Haut, die der Xenomorph beim schnellen Wachstum abgeworfen hat.<br><li><b>Erhöht die Bewegungsgeschwindigkeit</b> im <b>Kriechmodus</b> um <b>+2%</b>.</li>"},
            "es": {"name": "Piel mudada", "description": "Piel seca mudada por el Xenomorfo durante su rápido crecimiento.<br><li><b>Aumenta la velocidad de movimiento</b> en <b>modo cuadrúpedo</b> en un <b>+2%</b>.</li>"},
            "ja": {"name": "脱皮した皮膚", "description": "ゼノモーフの急成長時に剥がれ落ちた乾燥した皮膚。<br><li><b>這いずりモード</b>時の<b>移動速度が+2%上昇</b>する。</li>"}
        },
        "Moulted Skin": {
            "en": {"name": "Molted Skin", "description": "Dried skin shed by the Xenomorph during rapid growth.<br><li><b>Increases Movement Speed</b> while in <b>Crawler Mode</b> by <b>+2%</b>.</li>"},
            "pl": {"name": "Wylinka", "description": "Wysuszona skóra zrzucona przez Ksenomorfa w trakcie szybkiego wzrostu.<br><li><b>Zwiększa prędkość ruchu</b> w <b>trybie pełzania</b> o <b>+2%</b>.</li>"},
            "de": {"name": "Gehäutete Haut", "description": "Getrocknete Haut, die der Xenomorph beim schnellen Wachstum abgeworfen hat.<br><li><b>Erhöht die Bewegungsgeschwindigkeit</b> im <b>Kriechmodus</b> um <b>+2%</b>.</li>"},
            "es": {"name": "Piel mudada", "description": "Piel seca mudada por el Xenomorfo durante su rápido crecimiento.<br><li><b>Aumenta la velocidad de movimiento</b> en <b>modo cuadrúpedo</b> en un <b>+2%</b>.</li>"},
            "ja": {"name": "脱皮した皮膚", "description": "ゼノモーフの急成長時に剥がれ落ちた乾燥した皮膚。<br><li><b>這いずりモード</b>時の<b>移動速度が+2%上昇</b>する。</li>"}
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
    SURVIVOR_ONLY_OFFERINGS = {
        "Bog Laurel", "Fresh Bog Laurel", "Fragrant Bog Laurel", "Bog Laurel Sachet",
        "Crispleaf Amaranth", "Fresh Crispleaf Amaranth", "Fragrant Crispleaf Amaranth", "Crispleaf Amaranth Sachet",
        "Sweet William", "Fresh Sweet William", "Fragrant Sweet William", "Sweet William Sachet",
        "Primrose Blossom", "Fresh Primrose Blossom", "Fragrant Primrose Blossom", "Primrose Blossom Sachet",
        "Sealed Envelope", "Bound Envelope", "Escape! Cake",
        "White Ward",
        "Shroud of Union", "Vigo's Shroud",
        "Tarnished Coin", "Shiny Coin",
        "Petrified Oak",
        "Chalk Pouch", "Cream Chalk Pouch", "Ivory Chalk Pouch", "Salt Pouch", "Black Salt Statuette", "Vigo's Jar of Salty Lips",
        "Annotated Blueprint", "Vigo's Blueprint", "Vigo’s Blueprint"
    }

    KILLER_ONLY_OFFERINGS = {
        "Tan Leaf", "Clear Specimen Jar", "Cattle Tag 28", "Cattle Tag 81",
        "Shrike Wreath", "Devout Shrike Wreath", "Ardent Shrike Wreath",
        "Spotted Owl Wreath", "Devout Spotted Owl Wreath", "Ardent Spotted Owl Wreath",
        "Tanager Wreath", "Devout Tanager Wreath", "Ardent Tanager Wreath",
        "Raven Wreath", "Devout Raven Wreath", "Ardent Raven Wreath",
        "Hollow Shell", "Survivor Pudding",
        "Black Ward",
        "Shroud of Separation", "Shroud of Binding",
        "Scratched Coin", "Cut Coin",
        "Mouldy Oak", "Moldy Oak", "Rotten Oak", "Putrid Oak",
        "Cypress Memento Mori", "Ivory Memento Mori", "Ebony Memento Mori"
    }

    OFFERING_LOCALIZATIONS = {
        # --- SURVIVOR BLOODPOINTS: OBJECTIVES (Bog Laurel) ---
        "Bog Laurel Sachet": {
            "en": {"name": "Bog Laurel Sachet", "description": "Grants <b>50%</b> bonus Bloodpoints in the <b>Objectives</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A palm-sized hand-sewn sachet packed with beaded grain.\"</span>"},
            "pl": {"name": "Saszetka z Bagienną Lawendą", "description": "Zapewnia <b>50%</b> dodatkowych Punktów Krwi w kategorii <b>Cele</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Ręcznie szyta saszetka wypchana paciorkowatym ziarnem”.</span>"},
            "de": {"name": "Sumpflorbeer-Säckchen", "description": "Gewährt <b>50%</b> zusätzliche Blutpunkte in der Kategorie <b>Ziele</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein handgenähtes Säckchen voller perlenartigem Korn.“</span>"},
            "es": {"name": "Bolsita de laurel de pantano", "description": "Otorga un <b>50%</b> de puntos de sangre adicionales en la categoría de <b>Objetivos</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Una bolsita cosida a mano llena de grano perlado».</span>"},
            "ja": {"name": "沼地月桂樹のサシェ", "description": "<b>目標</b>カテゴリーで獲得するブラッドポイントが<b>50%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「ビーズ状の穀物が詰められた手縫いのサシェ。」</span>"}
        },
        "Fresh Bog Laurel": {
            "en": {"name": "Fresh Bog Laurel", "description": "Grants <b>75%</b> bonus Bloodpoints in the <b>Objectives</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"Pale green leaves laced with strange crimson veins. Releases a pungent radish scent.\"</span>"},
            "pl": {"name": "Świeża Bagienna Lawenda", "description": "Zapewnia <b>75%</b> dodatkowych Punktów Krwi w kategorii <b>Cele</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Bladozielone liście poprzecinane dziwnymi purpurowymi żyłkami. Wydzielają mocny zapach rzodkiewki”.</span>"},
            "de": {"name": "Frischer Sumpflorbeer", "description": "Gewährt <b>75%</b> zusätzliche Blutpunkte in der Kategorie <b>Ziele</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Blassgrüne Blätter mit seltsamen karminroten Adern. Verströmt einen stechenden Rettichgeruch.“</span>"},
            "es": {"name": "Laurel de pantano fresco", "description": "Otorga un <b>75%</b> de puntos de sangre adicionales en la categoría de <b>Objetivos</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Hojas de color verde pálido con extrañas vetas carmesí. Desprende un penetrante olor a rábano».</span>"},
            "ja": {"name": "新鮮な沼地月桂樹", "description": "<b>目標</b>カテゴリーで獲得するブラッドポイントが<b>75%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「奇妙な深紅の葉脈が走る薄緑色の葉。ツンとする大根のような匂いを放つ。」</span>"}
        },
        "Fragrant Bog Laurel": {
            "en": {"name": "Fragrant Bog Laurel", "description": "Grants <b>100%</b> bonus Bloodpoints in the <b>Objectives</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"Pale green leaves laced with strange crimson veins. Releases a strong, intoxicating scent.\"</span>"},
            "pl": {"name": "Pachnąca Bagienna Lawenda", "description": "Zapewnia <b>100%</b> dodatkowych Punktów Krwi w kategorii <b>Cele</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Bladozielone liście z karmazynowymi żyłkami o silnym, odurzającym zapachu”.</span>"},
            "de": {"name": "Duftender Sumpflorbeer", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in der Kategorie <b>Ziele</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Blassgrüne Blätter mit karminroten Adern und betörendem Duft.“</span>"},
            "es": {"name": "Laurel de pantano fragante", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en la categoría de <b>Objetivos</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Hojas de color verde pálido con vetas carmesí y un aroma embriagador».</span>"},
            "ja": {"name": "芳しい沼地月桂樹", "description": "<b>目標</b>カテゴリーで獲得するブラッドポイントが<b>100%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「深紅の葉脈が走る薄緑色の葉。強烈で魅惑的な香りを放つ。」</span>"}
        },
        # --- SURVIVOR BLOODPOINTS: SURVIVAL (Crispleaf Amaranth) ---
        "Crispleaf Amaranth Sachet": {
            "en": {"name": "Crispleaf Amaranth Sachet", "description": "Grants <b>50%</b> bonus Bloodpoints in the <b>Survival</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A palm-sized hand-sewn sachet containing dried leaves.\"</span>"},
            "pl": {"name": "Saszetka z Szarłatem Wyniosłym", "description": "Zapewnia <b>50%</b> dodatkowych Punktów Krwi w kategorii <b>Przetrwanie</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Ręcznie szyta saszetka zawierająca wysuszone liście szarłatu”.</span>"},
            "de": {"name": "Krausblatt-Amarant-Säckchen", "description": "Gewährt <b>50%</b> zusätzliche Blutpunkte in der Kategorie <b>Überleben</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein handgenähtes Säckchen mit getrockneten Amarantblättern.“</span>"},
            "es": {"name": "Bolsita de amaranto rizado", "description": "Otorga un <b>50%</b> de puntos de sangre adicionales en la categoría de <b>Supervivencia</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Una bolsita cosida a mano con hojas secas de amaranto».</span>"},
            "ja": {"name": "縮れ葉アマランサスのサシェ", "description": "<b>生存</b>カテゴリーで獲得するブラッドポイントが<b>50%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「乾燥した葉が入った手のひらサイズの手縫いサシェ。」</span>"}
        },
        "Fresh Crispleaf Amaranth": {
            "en": {"name": "Fresh Crispleaf Amaranth", "description": "Grants <b>75%</b> bonus Bloodpoints in the <b>Survival</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A bunch of flowers with pink petals and a blood-red pericarp.\"</span>"},
            "pl": {"name": "Świeży Szarłat Wyniosły", "description": "Zapewnia <b>75%</b> dodatkowych Punktów Krwi w kategorii <b>Przetrwanie</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Pęk kwiatów z różowymi płatkami oraz krwistoczerwoną owocnią”.</span>"},
            "de": {"name": "Frischer Krausblatt-Amarant", "description": "Gewährt <b>75%</b> zusätzliche Blutpunkte in der Kategorie <b>Überleben</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein Blumenstrauß mit rosa Blütenblättern und blutroter Samenschale.“</span>"},
            "es": {"name": "Amaranto rizado fresco", "description": "Otorga un <b>75%</b> de puntos de sangre adicionales en la categoría de <b>Supervivencia</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Un ramo de flores con pétalos rosados y un pericarpio de color rojo sangre».</span>"},
            "ja": {"name": "新鮮な縮れ葉アマランサス", "description": "<b>生存</b>カテゴリーで獲得するブラッドポイントが<b>75%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「ピンクの花びらと血のように赤い果皮を持つ花の束。」</span>"}
        },
        "Fragrant Crispleaf Amaranth": {
            "en": {"name": "Fragrant Crispleaf Amaranth", "description": "Grants <b>100%</b> bonus Bloodpoints in the <b>Survival</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A bunch of flowers with pink petals. Amaranth is said to be eternal.\"</span>"},
            "pl": {"name": "Pachnący Szarłat Wyniosły", "description": "Zapewnia <b>100%</b> dodatkowych Punktów Krwi w kategorii <b>Przetrwanie</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Pęk kwiatów z różowymi płatkami. Powiada się, że szarłat jest wieczny”.</span>"},
            "de": {"name": "Duftender Krausblatt-Amarant", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in der Kategorie <b>Überleben</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein Strauß mit rosa Blüten. Man sagt, der Amarant sei ewig.“</span>"},
            "es": {"name": "Amaranto rizado fragante", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en la categoría de <b>Supervivencia</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Un ramo de flores rosadas. Se dice que el amaranto es eterno».</span>"},
            "ja": {"name": "芳しい縮れ葉アマランサス", "description": "<b>生存</b>カテゴリーで獲得するブラッドポイントが<b>100%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「ピンクの花びらを持つ花束。アマランサスは永遠であると言われている。」</span>"}
        },
        # --- SURVIVOR BLOODPOINTS: ALTRUISM (Sweet William) ---
        "Sweet William Sachet": {
            "en": {"name": "Sweet William Sachet", "description": "Grants <b>50%</b> bonus Bloodpoints in the <b>Altruism</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A palm-sized hand-sewn sachet containing dried sweet petals.\"</span>"},
            "pl": {"name": "Saszetka z Goździkiem Brodatym", "description": "Zapewnia <b>50%</b> dodatkowych Punktów Krwi w kategorii <b>Altruizm</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Ręcznie szyta saszetka zawierająca suszone płatki goździka”.</span>"},
            "de": {"name": "Bartnelken-Säckchen", "description": "Gewährt <b>50%</b> zusätzliche Blutpunkte in der Kategorie <b>Altruismus</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein handgenähtes Säckchen mit getrockneten Nelkenblättern.“</span>"},
            "es": {"name": "Bolsita de minutisa", "description": "Otorga un <b>50%</b> de puntos de sangre adicionales en la categoría de <b>Altruismo</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Una bolsita cosida a mano con pétalos secos de clavel».</span>"},
            "ja": {"name": "アメリカナデシコのサシェ", "description": "<b>阿頼耶識</b>カテゴリーで獲得するブラッドポイントが<b>50%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「乾燥したナデシコの花びらが入った手縫いのサシェ。」</span>"}
        },
        "Fresh Sweet William": {
            "en": {"name": "Fresh Sweet William", "description": "Grants <b>75%</b> bonus Bloodpoints in the <b>Altruism</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"Golden flowers harvested at their peak, releasing a soothing scent.\"</span>"},
            "pl": {"name": "Świeży Goździk Brodaty", "description": "Zapewnia <b>75%</b> dodatkowych Punktów Krwi w kategorii <b>Altruizm</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Złociste kwiaty zerwane w pełni rozkwitu, wydzielające kojący zapach”.</span>"},
            "de": {"name": "Frische Bartnelke", "description": "Gewährt <b>75%</b> zusätzliche Blutpunkte in der Kategorie <b>Altruismus</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Goldene Blumen, die auf ihrem Höhepunkt geerntet wurden und einen beruhigenden Duft verströmen.“</span>"},
            "es": {"name": "Minutisa fresca", "description": "Otorga un <b>75%</b> de puntos de sangre adicionales en la categoría de <b>Altruismo</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Flores doradas recolectadas en su momento óptimo que liberan un aroma calmante».</span>"},
            "ja": {"name": "新鮮なアメリカナデシコ", "description": "<b>阿頼耶識</b>カテゴリーで獲得するブラッドポイントが<b>75%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「満開の時期に収穫された、心安らぐ香りを放つ黄金色の花。」</span>"}
        },
        "Fragrant Sweet William": {
            "en": {"name": "Fragrant Sweet William", "description": "Grants <b>100%</b> bonus Bloodpoints in the <b>Altruism</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"Golden flowers harvested at their peak. Releases a strong, earthy, and soothing scent.\"</span>"},
            "pl": {"name": "Pachnący Goździk Brodaty", "description": "Zapewnia <b>100%</b> dodatkowych Punktów Krwi w kategorii <b>Altruizm</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Złote, zerwane przy czubku kwiaty. Uwalniają mocny, ziemisty, lecz kojący zapach”.</span>"},
            "de": {"name": "Duftende Bartnelke", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in der Kategorie <b>Altruismus</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Goldene Blumen mit einem intensiven, erdigen und beruhigenden Duft.“</span>"},
            "es": {"name": "Minutisa fragante", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en la categoría de <b>Altruismo</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Flores doradas con un aroma intenso, terroso y relajante».</span>"},
            "ja": {"name": "芳しいアメリカナデシコ", "description": "<b>阿頼耶識</b>カテゴリーで獲得するブラッドポイントが<b>100%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「満開時に収穫された、土の香りと心地よい癒やしを放つ黄金の花。」</span>"}
        },
        # --- SURVIVOR BLOODPOINTS: BOLDNESS (Primrose) ---
        "Primrose Blossom Sachet": {
            "en": {"name": "Primrose Blossom Sachet", "description": "Grants <b>50%</b> bonus Bloodpoints in the <b>Boldness</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A palm-sized hand-sewn sachet containing 4 gold petals.\"</span>"},
            "pl": {"name": "Saszetka z kwiatem pierwiosnka", "description": "Zapewnia <b>50%</b> dodatkowych Punktów Krwi w kategorii <b>Zuchwałość</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Ręcznie szyta saszetka zawierająca 4 złociste płatki pierwiosnka”.</span>"},
            "de": {"name": "Primelblüten-Säckchen", "description": "Gewährt <b>50%</b> zusätzliche Blutpunkte in der Kategorie <b>Kühnheit</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein handgenähtes Säckchen mit 4 goldenen Blütenblättern.“</span>"},
            "es": {"name": "Bolsita de flores de prímula", "description": "Otorga un <b>50%</b> de puntos de sangre adicionales en la categoría de <b>Audacia</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Una bolsita cosida a mano que contiene 4 pétalos dorados».</span>"},
            "ja": {"name": "プリムローズの花サシェ", "description": "<b>勇敢</b>カテゴリーで獲得するブラッドポイントが<b>50%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「4枚の黄金の花びらが入った手縫いのサシェ。」</span>"}
        },
        "Fresh Primrose Blossom": {
            "en": {"name": "Fresh Primrose Blossom", "description": "Grants <b>75%</b> bonus Bloodpoints in the <b>Boldness</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"The primrose opens at the very last moment before the sun gives place to the night.\"</span>"},
            "pl": {"name": "Świeży kwiat pierwiosnka", "description": "Zapewnia <b>75%</b> dodatkowych Punktów Krwi w kategorii <b>Zuchwałość</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Pierwiosnek otwiera się tuż przed tym, jak słońce ustępuje miejsca nocy”.</span>"},
            "de": {"name": "Frische Primelblüte", "description": "Gewährt <b>75%</b> zusätzliche Blutpunkte in der Kategorie <b>Kühnheit</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Die Primel öffnet sich im allerletzten Moment, bevor die Sonne der Nacht weicht.“</span>"},
            "es": {"name": "Flor de prímula fresca", "description": "Otorga un <b>75%</b> de puntos de sangre adicionales en la categoría de <b>Audacia</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«La prímula se abre en el último momento antes de que el sol dé paso a la noche».</span>"},
            "ja": {"name": "新鮮なプリムローズの花", "description": "<b>勇敢</b>カテゴリーで獲得するブラッドポイントが<b>75%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「太陽が夜に場所を譲る直前の瞬間に開くサクラソウ。」</span>"}
        },
        "Fragrant Primrose Blossom": {
            "en": {"name": "Fragrant Primrose Blossom", "description": "Grants <b>100%</b> bonus Bloodpoints in the <b>Boldness</b> category.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A sweet and intoxicating aroma fills the realm.\"</span>"},
            "pl": {"name": "Pachnący kwiat pierwiosnka", "description": "Zapewnia <b>100%</b> dodatkowych Punktów Krwi w kategorii <b>Zuchwałość</b>.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Słodki i odurzający zapach wypełnia wymiar Bytu”.</span>"},
            "de": {"name": "Duftende Primelblüte", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in der Kategorie <b>Kühnheit</b>.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein süßes und berauschendes Aroma erfüllt das Reich.“</span>"},
            "es": {"name": "Flor de prímula fragante", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en la categoría de <b>Audacia</b>.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Un aroma dulce e embriagador inunda el reino».</span>"},
            "ja": {"name": "芳しいプリムローズの花", "description": "<b>勇敢</b>カテゴリーで獲得するブラッドポイントが<b>100%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「甘く魅惑的な香りが領域を満たす。」</span>"}
        },
        # --- SURVIVOR ALL-CATEGORIES BLOODPOINTS ---
        "Escape! Cake": {
            "en": {"name": "Escape! Cake", "description": "Grants <b>100%</b> bonus Bloodpoints in all categories to yourself.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A delightfully sweet treat baked with the essence of freedom.\"</span>"},
            "pl": {"name": "Ucieczkowe ciasto", "description": "Zapewnia <b>100%</b> dodatkowych Punktów Krwi we wszystkich kategoriach dla siebie.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Wyśmienity słodki przysmak upieczony z myślą o wolności”.</span>"},
            "de": {"name": "Fluchtkuchen", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in allen Kategorien für dich selbst.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein herrlich süßer Kuchen, gebacken mit der Essenz der Freiheit.“</span>"},
            "es": {"name": "¡Tarta de huida!", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en todas las categorías para ti.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Un dulce pastel horneado con la esencia de la libertad».</span>"},
            "ja": {"name": "脱出だ！ケーキ", "description": "全カテゴリーで獲得するブラッドポイントが自分自身のみ<b>100%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「自由のエッセンスとともに焼き上げられた、心躍る甘いご馳走。」</span>"}
        },
        "Bound Envelope": {
            "en": {"name": "Bound Envelope", "description": "Grants <b>25%</b> bonus Bloodpoints in all categories to all Survivors.<br><br><span class=\"FlavorText\">\"An envelope tied with rough twine, holding tokens of shared survival.\"</span>"},
            "pl": {"name": "Związana koperta", "description": "Zapewnia wszystkim ocalałym bonus <b>25%</b> do Punktów Krwi we wszystkich kategoriach.<br><br><span class=\"FlavorText\">„Koperta przewiązana szorstkim sznurkiem, kryjąca słowa otuchy dla ocalałych”.</span>"},
            "de": {"name": "Gebundener Umschlag", "description": "Gewährt allen Überlebenden <b>25%</b> zusätzliche Blutpunkte in allen Kategorien.<br><br><span class=\"FlavorText\">„Ein mit rauem Garn verschnürter Umschlag mit Zeichen des Zusammenhalts.“</span>"},
            "es": {"name": "Sobre atado", "description": "Otorga un <b>25%</b> de puntos de sangre adicionales en todas las categorías a todos los supervivientes.<br><br><span class=\"FlavorText\">«Un sobre atado con cordel rústico con símbolos de supervivencia compartida».</span>"},
            "ja": {"name": "封じられた封筒", "description": "全生存者の全カテゴリーで獲得するブラッドポイントが<b>25%</b>増加する。<br><br><span class=\"FlavorText\">「粗い麻ひもで縛られた、連帯の印が込められた封筒。」</span>"}
        },
        "Sealed Envelope": {
            "en": {"name": "Sealed Envelope", "description": "Grants <b>25%</b> bonus Bloodpoints in all categories to all Survivors.<br><br><span class=\"FlavorText\">\"A sealed wax envelope containing mysterious tokens of encouragement.\"</span>"},
            "pl": {"name": "Zapieczętowana koperta", "description": "Zapewnia wszystkim ocalałym bonus <b>25%</b> do Punktów Krwi we wszystkich kategoriach.<br><br><span class=\"FlavorText\">„Zapieczętowana woskiem koperta zawierająca tajemnicze słowa wsparcia”.</span>"},
            "de": {"name": "Versiegelter Umschlag", "description": "Gewährt allen Überlebenden <b>25%</b> zusätzliche Blutpunkte in allen Kategorien.<br><br><span class=\"FlavorText\">„Ein versiegelter Wachsumschlag mit geheimnisvollen Zeichen der Ermutigung.“</span>"},
            "es": {"name": "Sobre sellado", "description": "Otorga un <b>25%</b> de puntos de sangre adicionales en todas las categorías a todos los supervivientes.<br><br><span class=\"FlavorText\">«Un sobre sellado con cera que contiene misteriosas muestras de ánimo».</span>"},
            "ja": {"name": "封筒", "description": "全生存者の全カテゴリーで獲得するブラッドポイントが<b>25%</b>増加する。<br><br><span class=\"FlavorText\">「励ましの印が封じられた蝋封の封筒。」</span>"}
        },
        # --- SURVIVOR LUCK OFFERINGS ---
        "Vigo's Jar of Salty Lips": {
            "en": {"name": "Vigo's Jar of Salty Lips", "description": "<b>Considerably increases</b> the Luck of all Survivors (+3%).<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A jar filled with salty lips floating in murky brine.\"</span>"},
            "pl": {"name": "Słoik słonych ust Viga", "description": "<b>Znacznie zwiększa</b> szczęście wszystkich ocalałych (+3%).<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Słoik wypełniony słonymi ustami zanurzonymi w mętnej solance”.</span>"},
            "de": {"name": "Vigos Glas voller salziger Lippen", "description": "Erhöht das Glück aller Überlebenden <b>beträchtlich</b> (+3%).<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein Glas voller salziger Lippen, die in trüber Lake schwimmen.“</span>"},
            "es": {"name": "Frasco de labios salados de Vigo", "description": "<b>Aumenta considerablemente</b> la suerte de todos los supervivientes (+3%).<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un frasco lleno de labios salados flotando en salmuera turbia».</span>"},
            "ja": {"name": "ヴィゴの塩漬け唇の瓶", "description": "全生存者の運が<b>かなり上昇</b>する (+3%)。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「濁った塩水に浮かぶ塩漬けの唇が入った小瓶。」</span>"}
        },
        "Salt Pouch": {
            "en": {"name": "Salt Pouch", "description": "<b>Slightly increases</b> the Luck of all Survivors (+1%).<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A small cotton pouch filled with a white salty powder.\"</span>"},
            "pl": {"name": "Słony Woreczek", "description": "<b>Nieznacznie zwiększa</b> szczęście wszystkich ocalałych (+1%).<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Mały bawełniany woreczek wypełniony białym, słonym proszkiem”.</span>"},
            "de": {"name": "Salzsäckchen", "description": "Erhöht das Glück aller Überlebenden <b>leicht</b> (+1%).<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein kleines Baumwollsäckchen voller weißem, salzigem Pulver.“</span>"},
            "es": {"name": "Bolsita de sal", "description": "<b>Aumenta ligeramente</b> la suerte de todos los supervivientes (+1%).<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una pequeña bolsita de algodón llena de polvo blanco y salado».</span>"},
            "ja": {"name": "塩の小袋", "description": "全生存者の運が<b>少し上昇</b>する (+1%)。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「白い塩状の粉末が入った小さな木綿の袋。」</span>"}
        },
        "Black Salt Statuette": {
            "en": {"name": "Black Salt Statuette", "description": "<b>Moderately increases</b> the Luck of all Survivors (+2%).<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A small statuette carved from black rock salt.\"</span>"},
            "pl": {"name": "Figurka z czarnej soli", "description": "<b>Umiarkowanie zwiększa</b> szczęście wszystkich ocalałych (+2%).<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Mała figurka wystrugana z czarnej soli kamiennej”.</span>"},
            "de": {"name": "Schwarze Salzstatuette", "description": "Erhöht das Glück aller Überlebenden <b>mäßig</b> (+2%).<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Eine kleine Statuette, geschnitzt aus schwarzem Steinsalz.“</span>"},
            "es": {"name": "Estatuilla de sal negra", "description": "<b>Aumenta moderadamente</b> la suerte de todos los supervivientes (+2%).<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una pequeña estatuilla tallada en sal gema negra».</span>"},
            "ja": {"name": "黒い塩の小像", "description": "全生存者の運が<b>そこそこ上昇</b>する (+2%)。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「黒い岩塩から彫り出された小さな小像。」</span>"}
        },
        "Chalk Pouch": {
            "en": {"name": "Chalk Pouch", "description": "<b>Slightly increases</b> your Luck (+1%).<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A small cotton pouch filled with white chalky powder.\"</span>"},
            "pl": {"name": "Woreczek Kredy", "description": "<b>Nieznacznie zwiększa</b> twoje szczęście (+1%).<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Mały bawełniany woreczek wypełniony białym kredowym proszkiem”.</span>"},
            "de": {"name": "Kreidesäckchen", "description": "Erhöht dein Glück <b>leicht</b> (+1%).<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein kleines Baumwollsäckchen mit weißem Kreidepulver.“</span>"},
            "es": {"name": "Bolsita de tiza", "description": "<b>Aumenta ligeramente</b> tu suerte (+1%).<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una bolsita de algodón llena de polvo blanco de tiza».</span>"},
            "ja": {"name": "チョークの小袋", "description": "自分の運が<b>少し上昇</b>する (+1%)。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「白いチョークの粉末が入った小さな木綿の袋。」</span>"}
        },
        "Cream Chalk Pouch": {
            "en": {"name": "Cream Chalk Pouch", "description": "<b>Moderately increases</b> your Luck (+2%).<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A small cotton pouch filled halfway with cream chalky powder.\"</span>"},
            "pl": {"name": "Kremowy Woreczek Kredy", "description": "<b>Umiarkowanie zwiększa</b> twoje szczęście (+2%).<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Mały bawełniany woreczek wypełniony do połowy kremowym proszkiem”.</span>"},
            "de": {"name": "Cremefarbenes Kreidesäckchen", "description": "Erhöht dein Glück <b>mäßig</b> (+2%).<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein kleines Baumwollsäckchen, halbvoll mit cremefarbenem Pulver.“</span>"},
            "es": {"name": "Bolsita de tiza crema", "description": "<b>Aumenta moderadamente</b> tu suerte (+2%).<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una pequeña bolsita de algodón llena hasta la mitad de polvo crema».</span>"},
            "ja": {"name": "クリーム色のチョークの小袋", "description": "自分の運が<b>そこそこ上昇</b>する (+2%)。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「クリーム色の粉末が半分入った小さな木綿の袋。」</span>"}
        },
        "Ivory Chalk Pouch": {
            "en": {"name": "Ivory Chalk Pouch", "description": "<b>Considerably increases</b> your Luck (+3%).<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A small leather pouch filled with ivory chalky powder.\"</span>"},
            "pl": {"name": "Woreczek Proszku z Kości Słoniowej", "description": "<b>Znacznie zwiększa</b> twoje szczęście (+3%).<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Mały skórzany woreczek wypełniony proszkiem z kości słoniowej”.</span>"},
            "de": {"name": "Elfenbeinfarbenes Kreidesäckchen", "description": "Erhöht dein Glück <b>beträchtlich</b> (+3%).<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein kleines Ledersäckchen mit elfenbeinfarbenem Kreidepulver.“</span>"},
            "es": {"name": "Bolsita de tiza marfil", "description": "<b>Aumenta considerablemente</b> tu suerte (+3%).<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una pequeña bolsita de cuero llena de polvo blanco marfil».</span>"},
            "ja": {"name": "象牙色のチョークの小袋", "description": "自分の運が<b>かなり上昇</b>する (+3%)。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「月光に輝く象牙色の粉末が入った小さな革袋。」</span>"}
        },
        # --- SURVIVOR HOOK / PETRIFIED OAK ---
        "Petrified Oak": {
            "en": {"name": "Petrified Oak", "description": "Calms The Entity and <b>moderately increases</b> the distance between sacrificial hooks.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A deteriorating piece of petrified wood.\"</span>"},
            "pl": {"name": "Skamieniały Dąb", "description": "Uspokaja Byt oraz <b>umiarkowanie zwiększa</b> odległość między hakami ofiarnymi na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Niszczejący kawałek skamieniałego drewna”.</span>"},
            "de": {"name": "Versteinerte Eiche", "description": "Beruhigt den Entitus und vergrößert den Abstand zwischen Opferhaken <b>mäßig</b>.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein verfallendes Stück versteinertes Holz.“</span>"},
            "es": {"name": "Roble petrificado", "description": "Calma al Ente y <b>aumenta moderadamente</b> la distancia entre los ganchos de sacrificio.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un trozo deteriorado de madera petrificada».</span>"},
            "ja": {"name": "化石化した樫の木", "description": "エンティティを鎮め、フック間の距離を<b>そこそこ広げる</b>。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「劣化しつつある珪化木の破片。」</span>"}
        },
        # --- SURVIVOR CHESTS & SHROUDS ---
        "Shiny Coin": {
            "en": {"name": "Shiny Coin", "description": "Calls on The Entity to spawn <b>2 additional Chests</b>.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A clean and polished piece of gold...\"</span>"},
            "pl": {"name": "Błyszcząca moneta", "description": "Prosi Byt o przywołanie <b>2 dodatkowych skrzyń</b> na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Czysty, wypolerowany kawałek złota…”</span>"},
            "de": {"name": "Glänzende Münze", "description": "Ruft den Entitus an, um <b>2 zusätzliche Truhen</b> erscheinen zu lassen.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein sauberes und poliertes Stück Gold...“</span>"},
            "es": {"name": "Moneda brillante", "description": "Pide al Ente que haga aparecer <b>2 cofres adicionales</b>.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una pieza de oro limpia y pulida...».</span>"},
            "ja": {"name": "輝くコイン", "description": "エンティティに呼びかけ、宝箱を<b>2個追加</b>で生成させる。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「きれいに磨かれた金貨片…」</span>"}
        },
        "Tarnished Coin": {
            "en": {"name": "Tarnished Coin", "description": "Calls on The Entity to spawn <b>1 additional Chest</b>.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A round piece of metal which has lost all sheen.\"</span>"},
            "pl": {"name": "Zaśniedziała Moneta", "description": "Prosi Byt o przywołanie <b>1 dodatkowej skrzyni</b> na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Okrągły kawałek metalu, który stracił cały połysk”.</span>"},
            "de": {"name": "Angelaufene Münze", "description": "Ruft den Entitus an, um <b>1 zusätzliche Truhe</b> erscheinen zu lassen.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein rundes Stück Metall, das jeden Glanz verloren hat.“</span>"},
            "es": {"name": "Moneda deslustrada", "description": "Pide al Ente que haga aparecer <b>1 cofre adicional</b>.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una pieza redonda de metal sin brillo alguno».</span>"},
            "ja": {"name": "変色したコイン", "description": "エンティティに呼びかけ、宝箱を<b>1個追加</b>で生成させる。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「輝きを完全に失った円形の金属片。」</span>"}
        },
        "Shroud of Union": {
            "en": {"name": "Shroud of Union", "description": "You start the trial together with another Survivor.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A knotted piece of fabric.\"</span>"},
            "pl": {"name": "Całun Zjednoczenia", "description": "Rozpoczynasz próbę razem z innym ocalałym.<br><br><li>Sekret.</li><br><span class=\"FlavorText\">„Związany kawałek materiału”.</span>"},
            "de": {"name": "Schleier der Vereinigung", "description": "Du beginnst die Prüfung zusammen mit einem anderen Überlebenden.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein verknotetes Stück Stoff.“</span>"},
            "es": {"name": "Mortaja de unión", "description": "Empiezas la partida junto a otro superviviente.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un trozo de tela anudado».</span>"},
            "ja": {"name": "結束の覆い", "description": "他の生存者1名と一緒に試練を開始する。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「結び目のある布の破片。」</span>"}
        },
        "Vigo's Shroud": {
            "en": {"name": "Vigo's Shroud", "description": "You start the trial as far as possible from the Killer.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"I found marvels through the years in The Fog, but only now do I understand how to bend The Fog's irrefragable rules.\" — Vigo's Journal</span>"},
            "pl": {"name": "Całun Viga", "description": "Rozpoczynasz próbę jak najdalej od Zabójcy.<br><br><li>Sekret.</li><br><span class=\"FlavorText\">„Przebywając we Mgle przez lata, miałem styczność z wieloma cudami i nie mogłem ich pojąć; dopiero teraz rozumiem, jak zagiąć nieodwracalne zasady Mgły”. — Dziennik Viga</span>"},
            "de": {"name": "Vigos Schleier", "description": "Du beginnst die Prüfung so weit wie möglich vom Killer entfernt.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ich habe im Laufe der Jahre Wunder im Nebel gefunden, aber erst jetzt verstehe ich, wie man seine unumstößlichen Gesetze beugt.“ — Vigos Tagebuch</span>"},
            "es": {"name": "Mortaja de Vigo", "description": "Empiezas la partida lo más lejos posible del asesino.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Encontré maravillas a través de los años en la Niebla, pero solo ahora comprendo cómo doblegar sus reglas irrefragables». — Diario de Vigo</span>"},
            "ja": {"name": "ヴィゴの覆い", "description": "殺人鬼から最も離れた場所で試練を開始する。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「霧の中で幾年も奇跡を目撃したが、その抗いがたい法則を曲げる術を今ようやく理解した。」— ヴィゴの手記</span>"}
        },
        "Vigo's Blueprint": {
            "en": {"name": "Vigo's Blueprint", "description": "<b>Tremendously increases</b> the chance of spawning the Hatch in the Main Building.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A clever design that has the letter V etched on the bottom.\"</span>"},
            "pl": {"name": "Plany Viga", "description": "<b>Ogromnie zwiększa</b> szansę na pojawienie się włazu w głównym budynku.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Zmyślny projekt z wyrytym V u dołu”.</span>"},
            "de": {"name": "Vigos Bauplan", "description": "Erhöht die Chance <b>enorm</b>, dass die Bodenluke im Hauptgebäude erscheint.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein ausgeklügelter Entwurf mit einem eingravierten V am unteren Rand.“</span>"},
            "es": {"name": "Plano de Vigo", "description": "<b>Aumenta enormemente</b> la probabilidad de que la trampilla aparezca en el edificio principal.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un diseño ingenioso con la letra V grabada en la parte inferior».</span>"},
            "ja": {"name": "ヴィゴの設計図", "description": "ハッチがメインの建物に出現する確率が<b>大幅に上昇</b>する。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「底にVの文字が刻まれた巧みな図面。」</span>"}
        },
        "Annotated Blueprint": {
            "en": {"name": "Annotated Blueprint", "description": "<b>Tremendously increases</b> the chance of spawning the Hatch in the Killer Shack.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"Someone wrote essential notes on the side, but who?\"</span>"},
            "pl": {"name": "Plany z adnotacjami", "description": "<b>Ogromnie zwiększa</b> szansę na pojawienie się włazu w chacie zabójcy.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Ktoś naniósł z boku niezbędne notatki, ale kto?”.</span>"},
            "de": {"name": "Kommentierter Bauplan", "description": "Erhöht die Chance <b>enorm</b>, dass die Bodenluke in der Killer-Hütte erscheint.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Jemand hat wichtige Notizen am Rand hinterlassen, aber wer?“</span>"},
            "es": {"name": "Plano anotado", "description": "<b>Aumenta enormemente</b> la probabilidad de que la trampilla aparezca en la cabaña del asesino.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Alguien escribió notas esenciales en el margen, pero ¿quién?».</span>"},
            "ja": {"name": "注釈付きの設計図", "description": "ハッチが殺人鬼の小屋に出現する確率が<b>大幅に上昇</b>する。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「誰かが重要なメモを書き残しているが、一体誰が？」</span>"}
        },
        # --- WARDS ---
        "White Ward": {
            "en": {"name": "White Ward", "description": "Burning this offering grants you protection against the loss of your Item and Add-ons upon death.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"Keep me from evil, defend me, and pass away.\"</span>"},
            "pl": {"name": "Biała pieczęć", "description": "Spalenie tego daru zapewnia ochronę przed utratą trzymanego przedmiotu oraz jego dodatków w przypadku śmierci w próbie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„I trzymaj mnie ode złego, ochroń mnie i odejdź”.</span>"},
            "de": {"name": "Weißes Schutzzeichen", "description": "Das Verbrennen dieser Opfergabe schützt dich beim Tod vor dem Verlust deines Gegenstands und deiner Zusätze.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Bewahre mich vor dem Bösen, verteidige mich und vergehe.“</span>"},
            "es": {"name": "Sello blanco", "description": "Quemar esta ofrenda te protege contra la pérdida de tu objeto y accesorios en caso de morir en la partida.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Líbrame del mal, defiéndeme y desaparece».</span>"},
            "ja": {"name": "白の魔除け", "description": "このオファリングを捧げると、死亡時に所持しているアイテムとアドオンの消失を防ぐ。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「悪から我を守り、我を護り、そして消え去りたまえ。」</span>"}
        },
        "Black Ward": {
            "en": {"name": "Black Ward", "description": "Burning this offering grants you protection against the loss of your Add-ons at the end of the trial.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"The dark power remains unspent.\"</span>"},
            "pl": {"name": "Czarna pieczęć", "description": "Spalenie tego daru chroni przed utratą dodatków po zakończeniu próby.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Mroczna moc pozostaje nienaruszona”.</span>"},
            "de": {"name": "Schwarzes Schutzzeichen", "description": "Das Verbrennen dieser Opfergabe schützt dich am Ende der Prüfung vor dem Verlust deiner Zusätze.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Die dunkle Kraft bleibt unberührt.“</span>"},
            "es": {"name": "Sello negro", "description": "Quemar esta ofrenda te protege contra la pérdida de tus accesorios al final de la partida.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«El poder oscuro permanece intacto».</span>"},
            "ja": {"name": "黒の魔除け", "description": "このオファリングを捧げると、試練終了時にアドオンの消失を防ぐ。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「闇の力は消費されずに残る。」</span>"}
        },
        # --- KILLER OFFERINGS ---
        "Hollow Shell": {
            "en": {"name": "Hollow Shell", "description": "Grants <b>25%</b> bonus Bloodpoints in all categories.<br><br><span class=\"FlavorText\">\"A hollowed shell holding lingering echoes of the Entity's realm.\"</span>"},
            "pl": {"name": "Pusta skorupa", "description": "Zapewnia <b>25%</b> premii do Punktów Krwi we wszystkich kategoriach.<br><br><span class=\"FlavorText\">„Pusta skorupa przechowująca echa wymiaru Bytu”.</span>"},
            "de": {"name": "Hohle Schale", "description": "Gewährt <b>25%</b> zusätzliche Blutpunkte in allen Kategorien.<br><br><span class=\"FlavorText\">„Eine hohle Schale mit verwehten Echos des Reiches.“</span>"},
            "es": {"name": "Concha hueca", "description": "Otorga un <b>25%</b> de puntos de sangre adicionales en todas las categorías.<br><br><span class=\"FlavorText\">«Una concha vacía que retiene los ecos del reino del Ente».</span>"},
            "ja": {"name": "空っぽの殻", "description": "全カテゴリーで獲得するブラッドポイントが<b>25%</b>増加する。<br><br><span class=\"FlavorText\">「領域の残響を宿す、空洞の貝殻。」</span>"}
        },
        "Survivor Pudding": {
            "en": {"name": "Survivor Pudding", "description": "Grants <b>100%</b> bonus Bloodpoints in all categories.<br><br><li>Personal.</li><br><span class=\"FlavorText\">\"A putrid dessert concocted from the suffering of Survivors.\"</span>"},
            "pl": {"name": "Pudding z ocalałych", "description": "Zapewnia <b>100%</b> dodatkowych Punktów Krwi we wszystkich kategoriach.<br><br><li>Przedmiot osobisty.</li><br><span class=\"FlavorText\">„Zgniły deser przyrządzony z cierpienia ocalałych”.</span>"},
            "de": {"name": "Überlebenden-Pudding", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in allen Kategorien.<br><br><li>Persönlich.</li><br><span class=\"FlavorText\">„Ein fauliges Dessert aus den Qualen der Überlebenden.“</span>"},
            "es": {"name": "Pudin de superviviente", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en todas las categorías.<br><br><li>Personal.</li><br><span class=\"FlavorText\">«Un postre fétido elaborado a partir del sufrimiento de los supervivientes».</span>"},
            "ja": {"name": "生者のプリン", "description": "全カテゴリーで獲得するブラッドポイントが<b>100%</b>増加する。<br><br><li>重複不可。</li><br><span class=\"FlavorText\">「生存者の苦しみから調合された腐敗したデザート。」</span>"}
        },
        "Cut Coin": {
            "en": {"name": "Cut Coin", "description": "Calls on The Entity to remove <b>2 Chests</b>.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"Two halves of a torn coin.\"</span>"},
            "pl": {"name": "Przecięta moneta", "description": "Prosi Byt o usunięcie <b>2 skrzyń</b> z mapy.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Dwie połówki rozdartej monety”.</span>"},
            "de": {"name": "Zerschnittene Münze", "description": "Ruft den Entitus an, um <b>2 Truhen</b> zu entfernen.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Zwei Hälften einer zerschnittenen Münze.“</span>"},
            "es": {"name": "Moneda cortada", "description": "Pide al Ente que elimine <b>2 cofres</b> de la partida.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Dos mitades de una moneda rota».</span>"},
            "ja": {"name": "カットされたコイン", "description": "エンティティに呼びかけ、宝箱を<b>2個減少</b>させる。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「真っ二つに割られたコインの破片。」</span>"}
        },
        "Scratched Coin": {
            "en": {"name": "Scratched Coin", "description": "Calls on The Entity to remove <b>1 Chest</b>.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A defaced coin with deep scratches.\"</span>"},
            "pl": {"name": "Zadrapana moneta", "description": "Prosi Byt o usunięcie <b>1 skrzyni</b> z mapy.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Zniszczona moneta z głębokimi zadrapaniami”.</span>"},
            "de": {"name": "Zerkratzte Münze", "description": "Ruft den Entitus an, um <b>1 Truhe</b> zu entfernen.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Eine entstellte Münze mit tiefen Kratzern.“</span>"},
            "es": {"name": "Moneda rayada", "description": "Pide al Ente que elimine <b>1 cofre</b> de la partida.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una moneda estropeada con profundos arañazos».</span>"},
            "ja": {"name": "傷ついたコイン", "description": "エンティティに呼びかけ、宝箱を<b>1個減少</b>させる。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「深い傷がつけられた硬貨。」</span>"}
        },
        "Shroud of Separation": {
            "en": {"name": "Shroud of Separation", "description": "All Survivors start the trial separated from one another.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A torn shroud bearing a cold omen.\"</span>"},
            "pl": {"name": "Całun Separacji", "description": "Wszyscy ocalali rozpoczynają próbę oddzieleni od siebie nawzajem.<br><br><li>Sekret.</li><br><span class=\"FlavorText\">„Podarty całun niosący ponury omen”.</span>"},
            "de": {"name": "Schleier der Trennung", "description": "Alle Überlebenden beginnen die Prüfung voneinander getrennt.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein zerrissener Schleier voller finsterer Vorzeichen.“</span>"},
            "es": {"name": "Mortaja de separación", "description": "Todos los supervivientes empiezan la partida separados unos de otros.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Una mortaja desgarrada con un frío presagio».</span>"},
            "ja": {"name": "隔離の覆い", "description": "すべての生存者がバラバラの位置で試練を開始する。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「不吉な予兆を漂わせる、引き裂かれた覆い。」</span>"}
        },
        # --- EVENT OFFERINGS ---
        "Coconut Scream Pie": {
            "en": {"name": "Coconut Scream Pie", "description": "Grants <b>106%</b> bonus Bloodpoints in all categories to all players and reveals event props.<br><br><span class=\"FlavorText\">\"A delightfully horrifying dessert packed with coconut screams.\"</span>"},
            "pl": {"name": "Kokosowe ciasto krzyku", "description": "Zapewnia wszystkim graczom bonus <b>106%</b> do Punktów Krwi we wszystkich kategoriach oraz ujawnia aury rekwizytów wydarzenia.<br><br><span class=\"FlavorText\">„Przerażająco pyszny deser pełen kokosowego wrzasku”.</span>"},
            "de": {"name": "Schockosnusskuchen", "description": "Gewährt allen Spielern <b>106%</b> zusätzliche Blutpunkte in allen Kategorien und zeigt Event-Objekte an.<br><br><span class=\"FlavorText\">„Ein schaurig-köstliches Dessert voller Kokosnuss-Schreie.“</span>"},
            "es": {"name": "Pastel de coco gritón", "description": "Otorga un <b>106%</b> de puntos de sangre adicionales en todas las categorías a todos los jugadores y revela objetos del evento.<br><br><span class=\"FlavorText\">«Un postre deliciosamente espeluznante lleno de gritos de coco».</span>"},
            "ja": {"name": "ココナッツスクリームパイ", "description": "全プレイヤーの全カテゴリーで獲得するブラッドポイントが<b>106%</b>増加し、イベントオブジェクトのオーラが表示される。<br><br><span class=\"FlavorText\">「ココナッツの悲鳴が詰まった、恐ろしくも美味しいデザート。」</span>"}
        },
        "Sacrificial Cake": {
            "en": {"name": "Sacrificial Cake", "description": "Grants <b>105%</b> bonus Bloodpoints in all categories to all players during the 5th Anniversary.<br><br><span class=\"FlavorText\">\"A delightfully bloody cake to celebrate 5 years in the Fog.\"</span>"},
            "pl": {"name": "Ciasto ofiarne", "description": "Zapewnia wszystkim graczom bonus <b>105%</b> do Punktów Krwi we wszystkich kategoriach z okazji 5. rocznicy.<br><br><span class=\"FlavorText\">„Rozkosznie krwisty tort, aby uczcić 5 lat we Fiolecie i Mgle”.</span>"},
            "de": {"name": "Opferkuchen", "description": "Gewährt allen Spielern <b>105%</b> zusätzliche Blutpunkte in allen Kategorien während des 5. Jubiläums.<br><br><span class=\"FlavorText\">„Ein herrlich blutiger Kuchen zum 5-jährigen Jubiläum im Nebel.“</span>"},
            "es": {"name": "Pastel del sacrificio", "description": "Otorga un <b>105%</b> de puntos de sangre adicionales en todas las categorías a todos los jugadores durante el 5.º aniversario.<br><br><span class=\"FlavorText\">«Un pastel deliciosamente sangriento para celebrar 5 años en la Niebla».</span>"},
            "ja": {"name": "犠牲のケーキ", "description": "5周年イベント期間中、全プレイヤーの全カテゴリーで獲得するブラッドポイントが<b>105%</b>増加する。<br><br><span class=\"FlavorText\">「霧の中での5年間を祝う、血塗られた豪華なケーキ。」</span>"}
        },
        "SCREECH COBBLER": {
            "en": {"name": "Screech Cobbler", "description": "Grants <b>108%</b> bonus Bloodpoints in all categories to all players and reveals Invitations during the 8th Anniversary.<br><br><span class=\"FlavorText\">\"Tryks has concocted a delicious dessert for you this year... dying to have a taste.\"</span>"},
            "pl": {"name": "Skrzeczące ciasto", "description": "Zapewnia wszystkim graczom bonus <b>108%</b> do Punktów Krwi we wszystkich kategoriach oraz ujawnia zaproszenia z okazji 8. rocznicy.<br><br><span class=\"FlavorText\">„Tryks przygotowała w tym roku pyszny deser... aż dasz się pokroić za kawałek”.</span>"},
            "de": {"name": "Kreisch-Cobbler", "description": "Gewährt allen Spielern <b>108%</b> zusätzliche Blutpunkte in allen Kategorien während des 8. Jubiläums.<br><br><span class=\"FlavorText\">„Tryks hat dieses Jahr ein köstliches Dessert zubereitet... zum Sterben lecker.“</span>"},
            "es": {"name": "Pastel chillón", "description": "Otorga un <b>108%</b> de puntos de sangre adicionales en todas las categorías a todos los jugadores durante el 8.º aniversario.<br><br><span class=\"FlavorText\">«Tryks ha preparado un postre delicioso este año... para morirse».</span>"},
            "ja": {"name": "スクリーチ・コブラー", "description": "8周年イベント期間中、全プレイヤーの全カテゴリーで獲得するブラッドポイントが<b>108%</b>増加し、招待状のオーラが表示される。<br><br><span class=\"FlavorText\">「トリックスが今年用意した絶品デザート…誰もが喉から手が出るほど欲しがる。」</span>"}
        },
        "TERRORMISU": {
            "en": {"name": "Terrormisu", "description": "Grants <b>107%</b> bonus Bloodpoints in all categories to all players and reveals Invitations during the 7th Anniversary.<br><br><span class=\"FlavorText\">\"A delightfully twisted dessert layered with horrors and sweet decadence.\"</span>"},
            "pl": {"name": "Terrormisu", "description": "Zapewnia wszystkim graczom bonus <b>107%</b> do Punktów Krwi we wszystkich kategoriach oraz ujawnia zaproszenia z okazji 7. rocznicy.<br><br><span class=\"FlavorText\">„Rozkosznie wynaturzony deser przełożony warstwami koszmaru i słodkiej dekadencji”.</span>"},
            "de": {"name": "Terrormisu", "description": "Gewährt allen Spielern <b>107%</b> zusätzliche Blutpunkte in allen Kategorien während des 7. Jubiläums.<br><br><span class=\"FlavorText\">„Ein herrlich verdrehtes Dessert voller Grauen und süßer Dekadenz.“</span>"},
            "es": {"name": "Terrormisú", "description": "Otorga un <b>107%</b> de puntos de sangre adicionales en todas las categorías a todos los jugadores durante el 7.º aniversario.<br><br><span class=\"FlavorText\">«Un postre deliciosamente retorcido con capas de horror y dulce decadencia».</span>"},
            "ja": {"name": "テラーミス", "description": "7周年イベント期間中、全プレイヤーの全カテゴリーで獲得するブラッドポイントが<b>107%</b>増加し、招待状のオーラが表示される。<br><br><span class=\"FlavorText\">「恐怖と甘美な退廃が幾重にも重なった、狂気のデザート。」</span>"}
        },
        "Toothy Torte": {
            "en": {"name": "Toothy Torte", "description": "Grants <b>109%</b> bonus Bloodpoints in all categories to all players during the 9th Anniversary.<br><br><span class=\"FlavorText\">\"A razor-sharp celebration cake that bites back.\"</span>"},
            "pl": {"name": "Zębaty tort", "description": "Zapewnia wszystkim graczom bonus <b>109%</b> do Punktów Krwi we wszystkich kategoriach z okazji 9. rocznicy.<br><br><span class=\"FlavorText\">„Ostry jak brzytwa jubileuszowy tort, który potrafi ugryźć”.</span>"},
            "de": {"name": "Zahnige Torte", "description": "Gewährt allen Spielern <b>109%</b> zusätzliche Blutpunkte in allen Kategorien während des 9. Jubiläums.<br><br><span class=\"FlavorText\">„Eine messerscharfe Festtagstorte, die zurückbeißt.“</span>"},
            "es": {"name": "Tarta dentada", "description": "Otorga un <b>109%</b> de puntos de sangre adicionales en todas las categorías a todos los jugadores durante el 9.º aniversario.<br><br><span class=\"FlavorText\">«Una tarta de celebración afilada como una cuchilla que muerde».</span>"},
            "ja": {"name": "トゥーシー・トルテ", "description": "9周年イベント期間中、全プレイヤーの全カテゴリーで獲得するブラッドポイントが<b>109%</b>増加する。<br><br><span class=\"FlavorText\">「噛みついてくるほど鋭利な記念ケーキ。」</span>"}
        },
        "Cursed Seed": {
            "en": {"name": "Cursed Seed", "description": "Grants <b>100%</b> bonus Bloodpoints in all categories and reveals shrines during The Midnight Grove event.<br><br><span class=\"FlavorText\">\"A dark seed harvested under the pale light of the Midnight Grove.\"</span>"},
            "pl": {"name": "Przeklęte nasiono", "description": "Zapewnia <b>100%</b> premii do Punktów Krwi we wszystkich kategoriach oraz ujawnia aury kapliczek podczas wydarzenia Północny Gaj.<br><br><span class=\"FlavorText\">„Ciemne nasiono zebrane w bladym świetle Północnego Gaju”.</span>"},
            "de": {"name": "Verfluchter Samen", "description": "Gewährt <b>100%</b> zusätzliche Blutpunkte in allen Kategorien und zeigt Schreine während des Mitternachtshain-Events an.<br><br><span class=\"FlavorText\">„Ein dunkler Samen, geerntet im blassen Licht des Mitternachtshains.“</span>"},
            "es": {"name": "Semilla maldita", "description": "Otorga un <b>100%</b> de puntos de sangre adicionales en todas las categorías y revela santuarios durante el evento de La arboleda de medianoche.<br><br><span class=\"FlavorText\">«Una semilla oscura recolectada bajo la pálida luz de la Arboleda de medianoche».</span>"},
            "ja": {"name": "呪われた種", "description": "真夜中の森イベント期間中、全カテゴリーのブラッドポイントが<b>100%</b>増加し、祠のオーラが表示される。<br><br><span class=\"FlavorText\">「真夜中の森の青白い光の下で収穫された不吉な種。」</span>"}
        },
        "Pustula Petals": {
            "en": {"name": "Pustula Petals", "description": "Grants bonus Bloodpoints and spawns additional Cankerous Pustules during The Eternal Blight event.<br><br><span class=\"FlavorText\">\"Rotten, glowing petals dripping with concentrated serum.\"</span>"},
            "pl": {"name": "Płatki krosty", "description": "Zapewnia premię do Punktów Krwi oraz przywołuje dodatkowe zgniłe kwiaty podczas wydarzenia Wieczna Zaraza.<br><br><span class=\"FlavorText\">„Zgniłe, świecące płatki ociekające stężonym serum”.</span>"},
            "de": {"name": "Pustel-Blütenblätter", "description": "Gewährt Bonus-Blutpunkte und lässt zusätzliche Fäulnispusteln während des Events Die ewige Fäule erscheinen.<br><br><span class=\"FlavorText\">„Verfaulte, leuchtende Blütenblätter, die von konzentriertem Serum triefen.“</span>"},
            "es": {"name": "Pétalos de pústula", "description": "Otorga puntos de sangre adicionales y genera pústulas adicionales durante el evento El deterioro eterno.<br><br><span class=\"FlavorText\">«Pétalos podridos y brillantes que gotean suero concentrado».</span>"},
            "ja": {"name": "胴枯れ病の花びら", "description": "不滅の胴枯れ病イベント期間中、追加のブラッドポイントを獲得し、潰瘍の小胞が出現する。<br><br><span class=\"FlavorText\">「濃縮された血清が滴る、腐敗して光る花びら。」</span>"}
        },
        "BBQ Invitation": {
            "en": {"name": "BBQ Invitation", "description": "Grants bonus Bloodpoints and converts generators and hooks into BBQ-themed objectives during the Scorching Summer BBQ event.<br><br><span class=\"FlavorText\">\"Fire up the grill and let the meat sizzle under the blazing sun.\"</span>"},
            "pl": {"name": "Zaproszenie na grilla", "description": "Zapewnia premię do Punktów Krwi oraz dodaje specjalne generatory i haki grillowe podczas wydarzenia Letni Grill.<br><br><span class=\"FlavorText\">„Rozpal grilla i pozwól skwierczeć mięsu w prażącym słońcu”.</span>"},
            "de": {"name": "Grill-Einladung", "description": "Gewährt Bonus-Blutpunkte und verwandelt Generatoren und Haken in Grill-Objekte während des Sommergrill-Events.<br><br><span class=\"FlavorText\">„Feuere den Grill an und lass das Fleisch unter der sengenden Sonne brutzeln.“</span>"},
            "es": {"name": "Invitación a la barbacoa", "description": "Otorga puntos de sangre adicionales y transforma generadores y ganchos durante el evento Barbacoa de verano.<br><br><span class=\"FlavorText\">«Enciende la parrilla y deja que la carne chisporrotee bajo el sol abrasador».</span>"},
            "ja": {"name": "バーベキュー招待状", "description": "灼熱のサマーバーベキュー期間中、追加のブラッドポイントを獲得し、発電機とフックが特別仕様になる。<br><br><span class=\"FlavorText\">「グリルに火をつけ、猛烈な太陽の下で肉を焼き尽くせ。」</span>"}
        },
        # --- EVENT / SPECIAL OFFERINGS ---
        "Arcane Dousing Rod": {
            "en": {"name": "Arcane Dousing Rod", "description": "Calls upon The Entity to reveal the auras of Haunts during the event and grants bonus Bloodpoints.<br><br><li>Special.</li><br><span class=\"FlavorText\">\"A peculiar wooden rod imbued with arcane energy.\"</span>"},
            "pl": {"name": "Magiczna różdżka", "description": "Wzywa Byt, aby ujawnił aury Nawiedzeń podczas trwania wydarzenia, oraz zapewnia dodatkowe Punkty Krwi.<br><br><li>Przedmiot specjalny.</li><br><span class=\"FlavorText\">„Osobliwa drewniana różdżka nasycona tajemną energią”.</span>"},
            "de": {"name": "Arkane Wünschelrute", "description": "Ruft den Entitus an, um während des Events die Auren von Spukerscheinungen zu enthüllen, und gewährt zusätzliche Blutpunkte.<br><br><li>Spezial.</li><br><span class=\"FlavorText\">„Eine eigentümliche Holzwünschelrute, erfüllt von arkaner Energie.“</span>"},
            "es": {"name": "Vara de zahorí arcana", "description": "Pide al Ente que revele las auras de las Apariciones durante el evento y otorga puntos de sangre adicionales.<br><br><li>Especial.</li><br><span class=\"FlavorText\">«Una peculiar vara de madera imbuida de energía arcana».</span>"},
            "ja": {"name": "不可思議なダウジングロッド", "description": "イベント期間中、エンティティに呼びかけて憑依のオーラを表示し、追加のブラッドポイントを獲得する。<br><br><li>スペシャル。</li><br><span class=\"FlavorText\">「秘術のエネルギーが宿る奇妙な木の棒。」</span>"}
        },
        "Arcane Dowsing Rod": {
            "en": {"name": "Arcane Dousing Rod", "description": "Calls upon The Entity to reveal the auras of Haunts during the event and grants bonus Bloodpoints.<br><br><li>Special.</li><br><span class=\"FlavorText\">\"A peculiar wooden rod imbued with arcane energy.\"</span>"},
            "pl": {"name": "Magiczna różdżka", "description": "Wzywa Byt, aby ujawnił aury Nawiedzeń podczas trwania wydarzenia, oraz zapewnia dodatkowe Punkty Krwi.<br><br><li>Przedmiot specjalny.</li><br><span class=\"FlavorText\">„Osobliwa drewniana różdżka nasycona tajemną energią”.</span>"},
            "de": {"name": "Arkane Wünschelrute", "description": "Ruft den Entitus an, um während des Events die Auren von Spukerscheinungen zu enthüllen, und gewährt zusätzliche Blutpunkte.<br><br><li>Spezial.</li><br><span class=\"FlavorText\">„Eine eigentümliche Holzwünschelrute, erfüllt von arkaner Energie.“</span>"},
            "es": {"name": "Vara de zahorí arcana", "description": "Pide al Ente que revele las auras de las Apariciones durante el evento y otorga puntos de sangre adicionales.<br><br><li>Especial.</li><br><span class=\"FlavorText\">«Una peculiar vara de madera imbuida de energía arcana».</span>"},
            "ja": {"name": "不可思議なダウジングロッド", "description": "イベント期間中、エンティティに呼びかけて憑依のオーラを表示し、追加のブラッドポイントを獲得する。<br><br><li>スペシャル。</li><br><span class=\"FlavorText\">「秘術のエネルギーが宿る奇妙な木の棒。」</span>"}
        },
        "Alien Flora": {
            "en": {"name": "Alien Flora", "description": "<b>Tremendously increases</b> the chance of being sent to <b>Nostromo Wreckage</b> when burnt.<br><br><span class=\"FlavorText\">\"The flora on this strange planet was beautiful, but could have been deadly; thankfully, it has not killed anyone... yet.\"</span>"},
            "pl": {"name": "Obca flora", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Wraku Nostromo</b>.<br><br><span class=\"FlavorText\">„Roślinność na tej obcej planecie była piękna, ale mogła okazać się zabójcza. Na szczęście nikogo jeszcze nie zabiła... jeszcze”.</span>"},
            "de": {"name": "Außerirdische Flora", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>Nostromo-Wrack</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Die Flora auf diesem seltsamen Planeten war wunderschön, hätte aber tödlich sein können. Zum Glück hat sie noch niemanden getötet... bisher.“</span>"},
            "es": {"name": "Flora alienígena", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en los <b>Restos del Nostromo</b>.<br><br><span class=\"FlavorText\">«La flora de este extraño planeta era hermosa, pero podría haber sido mortal; afortunadamente, no ha matado a nadie... todavía».</span>"},
            "ja": {"name": "地球外植物", "description": "使用すると、<b>ノストロモ号の残骸</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「この奇妙な惑星の植物は美しいが致命的だったかもしれない。幸いなことに、まだ誰も殺されていない…今のところは。」</span>"}
        },
        "Hawkins National Laboratory ID": {
            "en": {"name": "Hawkins National Laboratory ID", "description": "<b>Tremendously increases</b> the chance of being sent to the <b>Underground Complex</b> when burnt.<br><br><span class=\"FlavorText\">\"A pass for the Hawkins National Laboratory, which once held dangerous experiments.\"</span>"},
            "pl": {"name": "Karta Hawkins National Laboratory", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Podziemnego kompleksu</b>.<br><br><span class=\"FlavorText\">„Przepustka do Hawkins National Laboratory, gdzie prowadzono niegdyś niebezpieczne eksperymenty”.</span>"},
            "de": {"name": "Hawkins National Laboratory-Ausweis", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>Unterirdischen Komplex</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein Ausweis für das Hawkins National Laboratory, in dem einst gefährliche Experimente stattfanden.“</span>"},
            "es": {"name": "Tarjeta de identificación del Laboratorio Nacional de Hawkins", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en el <b>Complejo subterráneo</b>.<br><br><span class=\"FlavorText\">«Un pase para el Laboratorio Nacional de Hawkins, donde antaño se realizaron peligrosos experimentos».</span>"},
            "ja": {"name": "ホーキンス国立研究所の身分証明書", "description": "使用すると、<b>地下施設</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「かつて危険な実験が行われていたホーキンス国立研究所の通行証。」</span>"}
        },
        "Hawkins National Laboratory I.D.": {
            "en": {"name": "Hawkins National Laboratory ID", "description": "<b>Tremendously increases</b> the chance of being sent to the <b>Underground Complex</b> when burnt.<br><br><span class=\"FlavorText\">\"A pass for the Hawkins National Laboratory, which once held dangerous experiments.\"</span>"},
            "pl": {"name": "Karta Hawkins National Laboratory", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Podziemnego kompleksu</b>.<br><br><span class=\"FlavorText\">„Przepustka do Hawkins National Laboratory, gdzie prowadzono niegdyś niebezpieczne eksperymenty”.</span>"},
            "de": {"name": "Hawkins National Laboratory-Ausweis", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>Unterirdischen Komplex</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein Ausweis für das Hawkins National Laboratory, in dem einst gefährliche Experimente stattfanden.“</span>"},
            "es": {"name": "Tarjeta de identificación del Laboratorio Nacional de Hawkins", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en el <b>Complejo subterráneo</b>.<br><br><span class=\"FlavorText\">«Un pase para el Laboratorio Nacional de Hawkins, donde antaño se realizaron peligrosos experimentos».</span>"},
            "ja": {"name": "ホーキンス国立研究所の身分証明書", "description": "使用すると、<b>地下施設</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「かつて危険な実験が行われていたホーキンス国立研究所の通行証。」</span>"}
        },
        "Mary's Letter": {
            "en": {"name": "Mary's Letter", "description": "<b>Tremendously increases</b> the chance of being sent to <b>Midwich Elementary School</b> when burnt.<br><br><span class=\"FlavorText\">\"A tragic letter written by Mary, filled with haunting farewells.\"</span>"},
            "pl": {"name": "List Mary", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Szkoły Podstawowej Midwich</b>.<br><br><span class=\"FlavorText\">„Tragiczny list napisany przez Mary, pełen przejmujących pożegnań”.</span>"},
            "de": {"name": "Marys Brief", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zur <b>Midwich-Grundschule</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein tragischer Brief von Mary, voller ergreifender Abschiede.“</span>"},
            "es": {"name": "Carta de Mary", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en la <b>Escuela Primaria Midwich</b>.<br><br><span class=\"FlavorText\">«Una trágica carta escrita por Mary, llena de despedidas desgarradoras».</span>"},
            "ja": {"name": "メアリーの手紙", "description": "使用すると、<b>ミッドウィッチ小学校</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「胸を締め付ける別れの言葉で埋め尽くされた、メアリーの悲劇的な手紙。」</span>"}
        },
        "Mouldy Oak": {
            "en": {"name": "Mouldy Oak", "description": "Calls on The Entity to <b>slightly decrease</b> the distance between sacrificial hooks.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A decaying, fungus-covered piece of oak.\"</span>"},
            "pl": {"name": "Spleśniały Dąb", "description": "Wzywa Byt, aby <b>delikatnie zmniejszył</b> odległość między hakami ofiarnymi na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Niszczejący, pokryty grzybem kawałek dębu”.</span>"},
            "de": {"name": "Schimmlige Eiche", "description": "Ruft den Entitus an, um den Abstand zwischen Opferhaken <b>leicht zu verringern</b>.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein verfallendes, pilzüberwachsenes Stück Eiche.“</span>"},
            "es": {"name": "Roble mohoso", "description": "Pide al Ente que <b>reduzca ligeramente</b> la distancia entre los ganchos de sacrificio.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un trozo de roble en descomposición cubierto de hongos».</span>"},
            "ja": {"name": "カビの生えた樫の木", "description": "エンティティに呼びかけ、フック間の距離を<b>少し縮める</b>。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「腐食し、菌糸に覆われた樫の木の破片。」</span>"}
        },
        "Moldy Oak": {
            "en": {"name": "Mouldy Oak", "description": "Calls on The Entity to <b>slightly decrease</b> the distance between sacrificial hooks.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A decaying, fungus-covered piece of oak.\"</span>"},
            "pl": {"name": "Spleśniały Dąb", "description": "Wzywa Byt, aby <b>delikatnie zmniejszył</b> odległość między hakami ofiarnymi na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Niszczejący, pokryty grzybem kawałek dębu”.</span>"},
            "de": {"name": "Schimmlige Eiche", "description": "Ruft den Entitus an, um den Abstand zwischen Opferhaken <b>leicht zu verringern</b>.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein verfallendes, pilzüberwachsenes Stück Eiche.“</span>"},
            "es": {"name": "Roble mohoso", "description": "Pide al Ente que <b>reduzca ligeramente</b> la distancia entre los ganchos de sacrificio.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un trozo de roble en descomposición cubierto de hongos».</span>"},
            "ja": {"name": "カビの生えた樫の木", "description": "エンティティに呼びかけ、フック間の距離を<b>少し縮める</b>。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「腐食し、菌糸に覆われた樫の木の破片。」</span>"}
        },
        "Putrid Oak": {
            "en": {"name": "Putrid Oak", "description": "Calls on The Entity to <b>considerably decrease</b> the distance between sacrificial hooks.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A rotten piece of oak soaked in a black rotting liquid.\"</span>"},
            "pl": {"name": "Przegniły dąb", "description": "Wzywa Byt, aby <b>znacznie zmniejszył</b> odległość między hakami ofiarnymi na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Zniszczony kawałek dębu nasączony czarną, gnijącą cieczą”.</span>"},
            "de": {"name": "Verfaulte Eiche", "description": "Ruft den Entitus an, um den Abstand zwischen Opferhaken <b>beträchtlich zu verringern</b>.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein verrottetes Stück Eiche, getränkt mit einer schwarzen Fäulnisflüssigkeit.“</span>"},
            "es": {"name": "Roble pútrido", "description": "Pide al Ente que <b>reduzca considerablemente</b> la distancia entre los ganchos de sacrificio.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un trozo podrido de roble empapado en un líquido negro putrefacto».</span>"},
            "ja": {"name": "腐敗した樫の木", "description": "エンティティに呼びかけ、フック間の距離を<b>かなり縮める</b>。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「黒い腐敗液に浸された朽ちた樫の木の破片。」</span>"}
        },
        "Rotten Oak": {
            "en": {"name": "Rotten Oak", "description": "Calls on The Entity to <b>moderately decrease</b> the distance between sacrificial hooks.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A decomposing piece of oak carved with strange symbols.\"</span>"},
            "pl": {"name": "Zgniły Dąb", "description": "Wzywa Byt, aby <b>umiarkowanie zmniejszył</b> odległość między hakami ofiarnymi na mapie.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Rozkładający się kawał dębu, na którym wyryto dziwne znaki”.</span>"},
            "de": {"name": "Morsche Eiche", "description": "Ruft den Entitus an, um den Abstand zwischen Opferhaken <b>mäßig zu verringern</b>.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein verfallendes Stück Eiche mit seltsamen Symbolen.“</span>"},
            "es": {"name": "Roble podrido", "description": "Pide al Ente que <b>reduzca moderadamente</b> la distancia entre los ganchos de sacrificio.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un trozo de roble en descomposición tallado con extraños símbolos».</span>"},
            "ja": {"name": "朽ちた樫の木", "description": "エンティティに呼びかけ、フック間の距離を<b>そこそこ縮める</b>。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「奇妙な記号が刻まれた腐敗した樫の木の破片。」</span>"}
        },
        "Cypress Memento Mori": {
            "en": {"name": "Cypress Memento Mori", "description": "Grants the ability to kill the last Survivor in the trial by your hand.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"I will devour their hope.\"</span>"},
            "pl": {"name": "Cyprysowe Memento Mori", "description": "Zapewnia możliwość zabicia ostatniego ocalałego w próbie własnymi rękami.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Pożrę ich nadzieję”.</span>"},
            "de": {"name": "Zypressen-Memento Mori", "description": "Gewährt die Fähigkeit, den letzten Überlebenden der Prüfung eigenhändig zu töten.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ich werde ihre Hoffnung verschlingen.“</span>"},
            "es": {"name": "Memento Mori de ciprés", "description": "Otorga la capacidad de matar con tus propias manos al último superviviente de la partida.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Devoraré su esperanza».</span>"},
            "ja": {"name": "ヒノキのメメント・モリ", "description": "試練の最後に残った生存者1名を自分の手で殺害する能力を得る。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「彼らの希望を喰らい尽くしてやる。」</span>"}
        },
        "Ivory Memento Mori": {
            "en": {"name": "Ivory Memento Mori", "description": "Grants the ability to kill 1 Survivor who has progressed 2 Hook Stages by your hand.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"A token of death carved from ivory.\"</span>"},
            "pl": {"name": "Memento Mori z Kości Słoniowej", "description": "Zapewnia możliwość zabicia 1 ocalałego, który osiągnął 2. stan powieszenia na haku, własnymi rękami.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Symbol śmierci wystrugany z kości słoniowej”.</span>"},
            "de": {"name": "Elfenbein-Memento Mori", "description": "Gewährt die Fähigkeit, 1 Überlebenden, der 2 Hakenstufen erreicht hat, eigenhändig zu töten.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Ein aus Elfenbein geschnitztes Zeichen des Todes.“</span>"},
            "es": {"name": "Memento Mori de marfil", "description": "Otorga la capacidad de matar con tus propias manos a 1 superviviente que haya alcanzado la fase 2 de gancho.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Un símbolo de muerte tallado en marfil».</span>"},
            "ja": {"name": "象牙のメメント・モリ", "description": "2段階フックに進んだ生存者1名を自分の手で殺害する能力を得る。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「象牙から彫り出された死の象徴。」</span>"}
        },
        "Ebony Memento Mori": {
            "en": {"name": "Ebony Memento Mori", "description": "Grants the ability to kill all Survivors who have progressed 2 Hook Stages by your hand.<br><br><li>Secret.</li><br><span class=\"FlavorText\">\"No one escapes.\"</span>"},
            "pl": {"name": "Hebanowe Memento Mori", "description": "Zapewnia możliwość zabicia wszystkich ocalałych, którzy osiągnęli 2. stan powieszenia na haku, własnymi rękami.<br><br><li>Tajemnica.</li><br><span class=\"FlavorText\">„Nikt nie ucieknie”.</span>"},
            "de": {"name": "Ebenholz-Memento Mori", "description": "Gewährt die Fähigkeit, alle Überlebenden, die 2 Hakenstufen erreicht haben, eigenhändig zu töten.<br><br><li>Geheimnis.</li><br><span class=\"FlavorText\">„Niemand entkommt.“</span>"},
            "es": {"name": "Memento Mori de ébano", "description": "Otorga la capacidad de matar con tus propias manos a todos los supervivientes que hayan alcanzado la fase 2 de gancho.<br><br><li>Secreto.</li><br><span class=\"FlavorText\">«Nadie escapa».</span>"},
            "ja": {"name": "黒檀のメメント・モリ", "description": "2段階フックに進んだすべての生存者を自分の手で殺害する能力を得る。<br><br><li>シークレット。</li><br><span class=\"FlavorText\">「誰も逃げられない。」</span>"}
        },
        # --- MAP OFFERINGS ---
        "Azarov's Key": {
            "en": {"name": "Azarov's Key", "description": "<b>Tremendously increases</b> the chance of being sent to <b>Autohaven Wreckers</b> when burnt.<br><br><span class=\"FlavorText\">\"A mechanical key etched with the mark of the Azarov lineage.\"</span>"},
            "pl": {"name": "Klucz Azarowa", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie na <b>Złomowisko Autohaven</b>.<br><br><span class=\"FlavorText\">„Mechaniczny klucz z wyrytym znakiem rodu Azarowów”.</span>"},
            "de": {"name": "Azarovs Schlüssel", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>Autohaven-Schrottplatz</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein mechanischer Schlüssel mit dem Siegel der Familie Azarov.“</span>"},
            "es": {"name": "Llave de Azarov", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en el <b>Desguace Autohaven</b>.<br><br><span class=\"FlavorText\">«Una llave mecánica grabada con la marca del linaje Azarov».</span>"},
            "ja": {"name": "アザロフの鍵", "description": "使用すると、<b>オートヘイヴン・レッカーズ</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「アザロフ家の紋章が刻まれた機械仕掛けの鍵。」</span>"}
        },
        "Charred Wedding Photograph": {
            "en": {"name": "Charred Wedding Photograph", "description": "<b>Tremendously increases</b> the chance of being sent to <b>Crotus Prenn Asylum</b> when burnt.<br><br><span class=\"FlavorText\">\"A burnt picture holding painful memories of a shattered marriage.\"</span>"},
            "pl": {"name": "Zwęglone zdjęcie ślubne", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Przytułku Crotus Prenn</b>.<br><br><span class=\"FlavorText\">„Spalona fotografia kryjąca bolesne wspomnienia zniszczonego małżeństwa”.</span>"},
            "de": {"name": "Verkohltes Hochzeitsfoto", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zur <b>Crotus-Prenn-Anstalt</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein verbranntes Foto mit schmerzhaften Erinnerungen an eine zerbrochene Ehe.“</span>"},
            "es": {"name": "Foto de boda carbonizada", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en el <b>Psiquiátrico Crotus Prenn</b>.<br><br><span class=\"FlavorText\">«Una fotografía quemada con dolorosos recuerdos de un matrimonio roto».</span>"},
            "ja": {"name": "焦げた結婚写真", "description": "使用すると、<b>クロータス・プレン・アサイラム</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「破綻した結婚生活の痛ましい記憶が残る、焼け焦げた写真。」</span>"}
        },
        "Beef Tallow Mixture": {
            "en": {"name": "Beef Tallow Mixture", "description": "<b>Tremendously increases</b> the chance of being sent to <b>The Decimated Borgo</b> when burnt.<br><br><span class=\"FlavorText\">\"A foul blend of rendered fat once used to fuel the fires of war.\"</span>"},
            "pl": {"name": "Mieszanka łoju wołowego", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Zdziesiątkowanego Borgo</b>.<br><br><span class=\"FlavorText\">„Ohydna mieszanina wytopionego tłuszczu używana niegdyś do podsycania pożogi wojennej”.</span>"},
            "de": {"name": "Rindertalgmischung", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>Dezimierten Borgo</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Eine übelriechende Mischung aus ausgelassenem Fett, die einst die Kriegsfeuer nährte.“</span>"},
            "es": {"name": "Mezcla de sebo de buey", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en <b>El Burgo diezmado</b>.<br><br><span class=\"FlavorText\">«Una repugnante mezcla de grasa derretida usada antaño para avivar las llamas de la guerra».</span>"},
            "ja": {"name": "牛脂の混合物", "description": "使用すると、<b>壊滅したボルゴ</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「かつて戦火を燃え上がらせるために使われた、獣脂の不快な混合物。」</span>"}
        },
        "Crow's Eye": {
            "en": {"name": "Crow's Eye", "description": "<b>Tremendously increases</b> the chance of being sent to the <b>Forsaken Boneyard</b> when burnt.<br><br><span class=\"FlavorText\">\"A petrified crow's eye gazing eternally into the barren graveyard.\"</span>"},
            "pl": {"name": "Krucze oko", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie na <b>Zapomniany cmentarz</b>.<br><br><span class=\"FlavorText\">„Skamieniałe krucze oko wpatrujące się w bezkresne cmentarzysko”.</span>"},
            "de": {"name": "Krähenauge", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>Einsamen Friedhof</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein versteinertes Krähenauge, das ewig auf das öde Gräberfeld blickt.“</span>"},
            "es": {"name": "Ojo de cuervo", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en el <b>Cementerio abandonado</b>.<br><br><span class=\"FlavorText\">«Un ojo de cuervo petrificado que mira fijamente hacia el árido cementerio».</span>"},
            "ja": {"name": "カラスの目", "description": "使用すると、<b>荒れ果てた墓場</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「不毛な墓地を永遠に見つめ続ける、石化したカラスの目。」</span>"}
        },
        "MacMillan's Phalanx Bone": {
            "en": {"name": "MacMillan's Phalanx Bone", "description": "<b>Tremendously increases</b> the chance of being sent to <b>The MacMillan Estate</b> when burnt.<br><br><span class=\"FlavorText\">\"A severed finger bone from the founder of the MacMillan empire.\"</span>"},
            "pl": {"name": "Kość paliczka Macmillana", "description": "Po spaleniu <b>ogromnie zwiększa</b> szansę na wysłanie do <b>Posiadłości Macmillanów</b>.<br><br><span class=\"FlavorText\">„Odcięta kość palca założyciela imperium Macmillanów”.</span>"},
            "de": {"name": "MacMillans Fingerknochen", "description": "Erhöht beim Verbrennen die Chance <b>enorm</b>, zum <b>MacMillan-Anwesen</b> geschickt zu werden.<br><br><span class=\"FlavorText\">„Ein abgetrennter Fingerknochen des Gründers des MacMillan-Imperiums.“</span>"},
            "es": {"name": "Falange de MacMillan", "description": "Al quemarse, <b>aumenta enormemente</b> la probabilidad de que la partida se juegue en <b>La finca Macmillan</b>.<br><br><span class=\"FlavorText\">«Una falange amputada del fundador del imperio MacMillan».</span>"},
            "ja": {"name": "マクミランの指骨", "description": "使用すると、<b>マクミラン・エステート</b>に送られる確率が<b>大幅に上昇</b>する。<br><br><span class=\"FlavorText\">「マクミラン帝国の創設者の切り取られた指の骨。」</span>"}
        },
    }

    all_off_entries = []
    for off_cat in ["CommonOfferings", "KillerOfferings", "SurvivorOfferings"]:
        for off in en_dump.get(off_cat, []):
            all_off_entries.append((off_cat, off))

    for off_cat, off_en in all_off_entries:
        off_id = off_en.get("Id", "")
        off_name_en = off_en.get("DisplayName", {}).get("LocalizedString", "") or off_en.get("Name", "")
        if not off_name_en:
            continue

        clean_off_key = off_name_en.replace("’", "'").replace("“", '"').replace("”", '"').strip()
        if clean_off_key == "Hawkins National Laboratory I.D.":
            canonical_off_name = "Hawkins National Laboratory ID"
        elif clean_off_key in ("Arcane Dowsing Rod", "Arcane Dousing Rod"):
            canonical_off_name = "Arcane Dousing Rod"
        elif clean_off_key in ("Moldy Oak", "Mouldy Oak"):
            canonical_off_name = "Mouldy Oak"
        else:
            canonical_off_name = clean_off_key

        off_override = (
            OFFERING_LOCALIZATIONS.get(off_id)
            or OFFERING_LOCALIZATIONS.get(canonical_off_name)
            or OFFERING_LOCALIZATIONS.get(clean_off_key)
            or OFFERING_LOCALIZATIONS.get(off_name_en)
        )

        if canonical_off_name in SURVIVOR_ONLY_OFFERINGS:
            canonical_role = "Survivor"
        elif canonical_off_name in KILLER_ONLY_OFFERINGS:
            canonical_role = "Killer"
        else:
            canonical_role = "Killer" if "Killer" in off_cat else ("Survivor" if "Survivor" in off_cat else "All")

        off_record = {
            "name": canonical_off_name,
            "category": off_cat,
            "role": canonical_role,
            "translations": {},
        }

        for lang_code, dump_data in localized_dumps.items():
            off_lang = None
            for cand in dump_data.get(off_cat, []):
                if cand.get("Id") == off_id:
                    off_lang = cand
                    break

            if off_override and lang_code in off_override:
                name_l = off_override[lang_code]["name"]
                desc_l = off_override[lang_code]["description"]
            elif off_lang:
                name_l = off_lang.get("DisplayName", {}).get("LocalizedString", canonical_off_name)
                desc_l = off_lang.get("Description", {}).get("LocalizedString", "")
            else:
                name_l = canonical_off_name
                desc_l = off_en.get("Description", {}).get("LocalizedString", "")

            off_record["translations"][lang_code] = {
                "name": name_l,
                "description": desc_l,
            }

        squashed["offerings"][canonical_off_name] = off_record

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