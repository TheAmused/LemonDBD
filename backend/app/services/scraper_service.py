import asyncio
import hashlib
import html
import json
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, fields
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union
from urllib.parse import unquote

from bs4 import BeautifulSoup, Tag
from curl_cffi import requests
from curl_cffi.requests import AsyncSession

logger = logging.getLogger(__name__)

from flask import current_app
from sqlalchemy import select, or_, func, case, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from app.extensions import db
from app.models import Character, Perk, Item, Addon, MapRealm, MapTile, MapObjective

# Wiki portraits are named K01_TheTrapper_Portrait.png / S07_AceVisconti_Portrait.png.
# The prefix letter is the role and the digits are the release number.
PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)

CANONICAL_DLC_INFO: Dict[str, Dict[str, Any]] = {
    # --- SURVIVORS: BASE GAME ---
    "dwight fairfield": {
        "release_number": 1, "code_prefix": "S01", "role": "Survivor",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["The Trapper", "The Wraith", "The Hillbilly", "Meg Thomas", "Claudette Morel", "Jake Park"]',
        "lore": "Dwight was not the typical high school athlete. Weak, awkward, and lacking in physical prowess, he was the target of relentless bullying. When his coworkers took him on a retreat into the woods and abandoned him with a bottle of spiked moonshine, Dwight wandered into the deep forest and was never seen again."
    },
    "meg thomas": {
        "release_number": 2, "code_prefix": "S02", "role": "Survivor",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["The Trapper", "The Wraith", "The Hillbilly", "Dwight Fairfield", "Claudette Morel", "Jake Park"]',
        "lore": "Perhaps it was her mother who instilled that fierce drive in her, or perhaps it was the relentless need to run. Meg gave up her track scholarship when her mother fell ill. During a long run deep in the woods to clear her head, Meg vanished into the thick fog."
    },
    "claudette morel": {
        "release_number": 3, "code_prefix": "S03", "role": "Survivor",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["The Trapper", "The Wraith", "The Hillbilly", "Dwight Fairfield", "Meg Thomas", "Jake Park"]',
        "lore": "From the day her parents gave her a first science kit, Claudette loved studying plants and botanical medicine. On a weekend bus ride home from university, the bus took a wrong turn into an unnatural mist, and Claudette never arrived at her destination."
    },
    "jake park": {
        "release_number": 4, "code_prefix": "S04", "role": "Survivor",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["The Trapper", "The Wraith", "The Hillbilly", "Dwight Fairfield", "Meg Thomas", "Claudette Morel"]',
        "lore": "Growing up the rebellious son of a wealthy CEO, Jake rejected high society to live off-grid in the remote forest. When search parties came looking after a harsh winter, they found his makeshift cabin deserted with no tracks leading away."
    },
    # --- KILLERS: BASE GAME ---
    "the trapper": {
        "release_number": 1, "code_prefix": "K01", "role": "Killer",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["Dwight Fairfield", "Meg Thomas", "Claudette Morel", "Jake Park"]',
        "lore": "Evan idolized his wealthy father Archie MacMillan. When Archie's mind cracked, Evan followed his father's orders to lead over a hundred miners into a deep shaft and detonate the explosives, sealing them in their tomb."
    },
    "the wraith": {
        "release_number": 2, "code_prefix": "K02", "role": "Killer",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["Dwight Fairfield", "Meg Thomas", "Claudette Morel", "Jake Park"]',
        "lore": "Philip arrived in America with high hopes, taking a job at Autohaven Wreckers scrap yard. When he discovered he was unwittingly executing kidnapped people inside the car crusher, a violent frenzy overtook him."
    },
    "the hillbilly": {
        "release_number": 3, "code_prefix": "K03", "role": "Killer",
        "chapter_name": "Dead by Daylight: Base Game", "chapter_number": "0", "dlc_type": "base_game",
        "is_licensed": False, "release_year": 2016, "release_date": "June 14, 2016",
        "dlc_counterparts": '["Dwight Fairfield", "Meg Thomas", "Claudette Morel", "Jake Park"]',
        "lore": "Born hideous and deformed, the un-named boy was locked in a bricked-up room on Coldwind Farm by his cruel parents. Years later, he broke free with a chainsaw and wrought brutal vengeance across the farm."
    },
    # --- CHAPTER 1: THE LAST BREATH ---
    "the nurse": {
        "release_number": 4, "code_prefix": "K04", "role": "Killer",
        "chapter_name": "Chapter 1: The Last Breath", "chapter_number": "1", "dlc_type": "free_update",
        "is_licensed": False, "release_year": 2016, "release_date": "August 18, 2016",
        "dlc_counterparts": '["Nea Karlsson"]',
        "lore": "Sally worked the graveyard shift at the Disturbed Ward of Crotus Prenn Asylum. After twenty years of witnessing misery, her mind fractured, and she cleansed the asylum of all breathing souls."
    },
    "nea karlsson": {
        "release_number": 5, "code_prefix": "S05", "role": "Survivor",
        "chapter_name": "Chapter 1: The Last Breath", "chapter_number": "1", "dlc_type": "free_update",
        "is_licensed": False, "release_year": 2016, "release_date": "August 18, 2016",
        "dlc_counterparts": '["The Nurse"]',
        "lore": "Nea grew up in Sweden before her family relocated to the US. An urban tagger and skateboarder, Nea dared to tag the condemned Crotus Prenn Asylum and never came out."
    },
    # --- CHAPTER 2: THE HALLOWEEN CHAPTER ---
    "the shape": {
        "release_number": 5, "code_prefix": "K05", "role": "Killer",
        "chapter_name": "Chapter 2: The Halloween Chapter", "chapter_number": "2", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2016, "release_date": "October 25, 2016",
        "dlc_counterparts": '["Laurie Strode"]',
        "lore": "Michael Myers is human only in form. Behind his blank white mask lies pure, unadulterated evil. Driven by an insatiable need to kill, he stalks his prey through Haddonfield with relentless patience."
    },
    "laurie strode": {
        "release_number": 6, "code_prefix": "S06", "role": "Survivor",
        "chapter_name": "Chapter 2: The Halloween Chapter", "chapter_number": "2", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2016, "release_date": "October 25, 2016",
        "dlc_counterparts": '["The Shape"]',
        "lore": "The quintessential babysitter, Laurie thought Halloween would be a night of studying and quiet caretaking. Instead, she faced The Shape and fought desperately to survive."
    },
    # --- CHAPTER 3: OF FLESH AND MUD ---
    "the hag": {
        "release_number": 6, "code_prefix": "K06", "role": "Killer",
        "chapter_name": "Chapter 3: Of Flesh and Mud", "chapter_number": "3", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2016, "release_date": "December 8, 2016",
        "dlc_counterparts": '["Ace Visconti"]',
        "lore": "Kidnapped by cannibals and starved in a dark cellar, Lisa carved the elders' protective runes into the wooden floor with her bleeding fingers, awakening dark arcane forces."
    },
    "ace visconti": {
        "release_number": 7, "code_prefix": "S07", "role": "Survivor",
        "chapter_name": "Chapter 3: Of Flesh and Mud", "chapter_number": "3", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2016, "release_date": "December 8, 2016",
        "dlc_counterparts": '["The Hag"]',
        "lore": "Ace is a charming high-rolling gambler who always believed his lucky streak would pull him through. When debt collectors closed in, he vanished without paying his tab."
    },
    # --- FREE UPDATE: LEFT BEHIND ---
    'william "bill" overbeck': {
        "release_number": 8, "code_prefix": "S08", "role": "Survivor",
        "chapter_name": "Left Behind (Left 4 Dead)", "chapter_number": "Free DLC", "dlc_type": "free_update",
        "is_licensed": True, "release_year": 2017, "release_date": "March 8, 2017",
        "dlc_counterparts": '[]',
        "lore": "A battle-hardened Vietnam veteran, Bill fought through hordes of infected zombies. Sacrificing himself to restart the bridge generator for his team, Bill awoke in The Fog."
    },
    "william 'bill' overbeck": {
        "release_number": 8, "code_prefix": "S08", "role": "Survivor",
        "chapter_name": "Left Behind (Left 4 Dead)", "chapter_number": "Free DLC", "dlc_type": "free_update",
        "is_licensed": True, "release_year": 2017, "release_date": "March 8, 2017",
        "dlc_counterparts": '[]',
        "lore": "A battle-hardened Vietnam veteran, Bill fought through hordes of infected zombies. Sacrificing himself to restart the bridge generator for his team, Bill awoke in The Fog."
    },
    "bill overbeck": {
        "release_number": 8, "code_prefix": "S08", "role": "Survivor",
        "chapter_name": "Left Behind (Left 4 Dead)", "chapter_number": "Free DLC", "dlc_type": "free_update",
        "is_licensed": True, "release_year": 2017, "release_date": "March 8, 2017",
        "dlc_counterparts": '[]',
        "lore": "A battle-hardened Vietnam veteran, Bill fought through hordes of infected zombies. Sacrificing himself to restart the bridge generator for his team, Bill awoke in The Fog."
    },
    # --- CHAPTER 4: SPARK OF MADNESS ---
    "the doctor": {
        "release_number": 7, "code_prefix": "K07", "role": "Killer",
        "chapter_name": "Chapter 4: Spark of Madness", "chapter_number": "4", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2017, "release_date": "May 11, 2017",
        "dlc_counterparts": '["Feng Min"]',
        "lore": "Recruited into the Léry Memorial secret research project, Dr. Carter pioneered electroconvulsive torture to extract thoughts from prisoners, descending into mad sadism."
    },
    "feng min": {
        "release_number": 9, "code_prefix": "S09", "role": "Survivor",
        "chapter_name": "Chapter 4: Spark of Madness", "chapter_number": "4", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2017, "release_date": "May 11, 2017",
        "dlc_counterparts": '["The Doctor"]',
        "lore": "A top-tier esports athlete, Feng Min spent days streaming in internet cafes. Facing burnout and pressure, she wandered into the night and never returned to the arena."
    },
    # --- CHAPTER 5: A LULLABY FOR THE DARK ---
    "the huntress": {
        "release_number": 8, "code_prefix": "K08", "role": "Killer",
        "chapter_name": "Chapter 5: A Lullaby for the Dark", "chapter_number": "5", "dlc_type": "free_update",
        "is_licensed": False, "release_year": 2017, "release_date": "July 27, 2017",
        "dlc_counterparts": '["David King"]',
        "lore": "Raised by her mother in the Russian taiga, Anna learned to hunt wild elk and soldiers. After her mother was killed by an elk, Anna survived alone in the freezing forest."
    },
    "david king": {
        "release_number": 10, "code_prefix": "S10", "role": "Survivor",
        "chapter_name": "Chapter 5: A Lullaby for the Dark", "chapter_number": "5", "dlc_type": "free_update",
        "is_licensed": False, "release_year": 2017, "release_date": "July 27, 2017",
        "dlc_counterparts": '["The Huntress"]',
        "lore": "A former rugby star with a penchant for barroom brawls and collecting underworld debts, David fought hard and lived fast before vanishing after a rowdy pub night."
    },
    # --- PARAGRAPH: LEATHERFACE ---
    "the cannibal": {
        "release_number": 9, "code_prefix": "K09", "role": "Killer",
        "chapter_name": "Paragraph: LEATHERFACE™", "chapter_number": "Paragraph", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2017, "release_date": "September 14, 2017",
        "dlc_counterparts": '[]',
        "lore": "Bubba kills not out of malice, but out of fear and love for his twisted family. Wielding a buzzing chainsaw and wearing a mask of human flesh, he protects his home at all costs."
    },
    # --- CHAPTER 6: A NIGHTMARE ON ELM STREET ---
    "the nightmare": {
        "release_number": 10, "code_prefix": "K10", "role": "Killer",
        "chapter_name": "Chapter 6: A Nightmare on Elm Street™", "chapter_number": "6", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2017, "release_date": "October 26, 2017",
        "dlc_counterparts": '["Quentin Smith"]',
        "lore": "Even death could not stop Freddy Krueger. Slain by vengeful parents, he returned in the dream world, tormenting the children of Springwood in their deepest sleep."
    },
    "quentin smith": {
        "release_number": 11, "code_prefix": "S11", "role": "Survivor",
        "chapter_name": "Chapter 6: A Nightmare on Elm Street™", "chapter_number": "6", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2017, "release_date": "October 26, 2017",
        "dlc_counterparts": '["The Nightmare"]',
        "lore": "Fuelled by caffeine pills and adrenaline, Quentin fought sleep to stay alive and rescue Nancy from the clutches of Freddy Krueger."
    },
    # --- CHAPTER 7: SAW ---
    "the pig": {
        "release_number": 11, "code_prefix": "K11", "role": "Killer",
        "chapter_name": "Chapter 7: SAW™", "chapter_number": "7", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2018, "release_date": "January 23, 2018",
        "dlc_counterparts": '["Detective Tapp"]',
        "lore": "A disciple of the Jigsaw Killer, Amanda created unwinnable reverse bear-trap games to test human survival and purge guilt."
    },
    "detective tapp": {
        "release_number": 12, "code_prefix": "S12", "role": "Survivor",
        "chapter_name": "Chapter 7: SAW™", "chapter_number": "7", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2018, "release_date": "January 23, 2018",
        "dlc_counterparts": '["The Pig"]',
        "lore": "Obsessed with capturing the Jigsaw killer, Detective Tapp ruined his career and marriage in pursuit of justice before vanishing into the shadows."
    },
    "david tapp": {
        "release_number": 12, "code_prefix": "S12", "role": "Survivor",
        "chapter_name": "Chapter 7: SAW™", "chapter_number": "7", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2018, "release_date": "January 23, 2018",
        "dlc_counterparts": '["The Pig"]',
        "lore": "Obsessed with capturing the Jigsaw killer, Detective Tapp ruined his career and marriage in pursuit of justice before vanishing into the shadows."
    },
    # --- CHAPTER 8: CURTAIN CALL ---
    "the clown": {
        "release_number": 12, "code_prefix": "K12", "role": "Killer",
        "chapter_name": "Chapter 8: Curtain Call", "chapter_number": "8", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2018, "release_date": "June 12, 2018",
        "dlc_counterparts": '["Kate Denson"]',
        "lore": "Traveling under the alias Jeffrey Hawk with carnivals, Kenneth mixed toxic anaesthetic tonics to drug and mutilate unsuspecting victims."
    },
    "kate denson": {
        "release_number": 13, "code_prefix": "S13", "role": "Survivor",
        "chapter_name": "Chapter 8: Curtain Call", "chapter_number": "8", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2018, "release_date": "June 12, 2018",
        "dlc_counterparts": '["The Clown"]',
        "lore": "A soulful folk musician traveling in her trusty Chevy, Kate spread warmth and songs across small towns before the fog engulfed her camp."
    },
    # --- CHAPTER 9: SHATTERED BLOODLINE ---
    "the spirit": {
        "release_number": 13, "code_prefix": "K13", "role": "Killer",
        "chapter_name": "Chapter 9: Shattered Bloodline", "chapter_number": "9", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2018, "release_date": "September 18, 2018",
        "dlc_counterparts": '["Adam Francis"]',
        "lore": "Cut down by her father in their ancestral home, Rin pledged her dying vengeance to dark spirits in exchange for otherworldly power."
    },
    "adam francis": {
        "release_number": 14, "code_prefix": "S14", "role": "Survivor",
        "chapter_name": "Chapter 9: Shattered Bloodline", "chapter_number": "9", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2018, "release_date": "September 18, 2018",
        "dlc_counterparts": '["The Spirit"]',
        "lore": "An ambitious teacher from Jamaica who moved to Kagoshima to teach English, Adam was riding the train home when it derailed in the dense mist."
    },
    # --- CHAPTER 10: DARKNESS AMONG US ---
    "the legion": {
        "release_number": 14, "code_prefix": "K14", "role": "Killer",
        "chapter_name": "Chapter 10: Darkness Among Us", "chapter_number": "10", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2018, "release_date": "December 11, 2018",
        "dlc_counterparts": '["Jeff Johansen"]',
        "lore": "Four delinquent teenagers from Ormond bound together by boredom and adrenaline, spiraling into a brutal thrill-kill spree."
    },
    "jeff johansen": {
        "release_number": 15, "code_prefix": "S15", "role": "Survivor",
        "chapter_name": "Chapter 10: Darkness Among Us", "chapter_number": "10", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2018, "release_date": "December 11, 2018",
        "dlc_counterparts": '["The Legion"]',
        "lore": "A quiet heavy-metal artist and muralist, Jeff returned to his hometown of Ormond to sort out his past, only to be taken by The Fog."
    },
    # --- CHAPTER 11: DEMISE OF THE FAITHFUL ---
    "the plague": {
        "release_number": 15, "code_prefix": "K15", "role": "Killer",
        "chapter_name": "Chapter 11: Demise of the Faithful", "chapter_number": "11", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2019, "release_date": "March 19, 2019",
        "dlc_counterparts": '["Jane Romero"]',
        "lore": "High Priestess of Babylon, Adiris led her people in prayer as a devastating plague struck, ultimately succumbing to the pestilence herself."
    },
    "jane romero": {
        "release_number": 16, "code_prefix": "S16", "role": "Survivor",
        "chapter_name": "Chapter 11: Demise of the Faithful", "chapter_number": "11", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2019, "release_date": "March 19, 2019",
        "dlc_counterparts": '["The Plague"]',
        "lore": "An influential talk show host and advocate, Jane was driving home after a grueling broadcast when she swerved into a thick, unexplained fog."
    },
    # --- PARAGRAPH: ASH VS EVIL DEAD ---
    "ash williams": {
        "release_number": 17, "code_prefix": "S17", "role": "Survivor",
        "chapter_name": "Paragraph: Ash vs Evil Dead", "chapter_number": "Paragraph", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2019, "release_date": "April 2, 2019",
        "dlc_counterparts": '[]',
        "lore": "Chainsaw-wielding, boomstick-toting savior of humanity against Deadites. Ash made a deal with a Sumerian demon and ended up in The Fog."
    },
    "ashley j. williams": {
        "release_number": 17, "code_prefix": "S17", "role": "Survivor",
        "chapter_name": "Paragraph: Ash vs Evil Dead", "chapter_number": "Paragraph", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2019, "release_date": "April 2, 2019",
        "dlc_counterparts": '[]',
        "lore": "Chainsaw-wielding, boomstick-toting savior of humanity against Deadites. Ash made a deal with a Sumerian demon and ended up in The Fog."
    },
    # --- CHAPTER 12: GHOST FACE ---
    "the ghost face": {
        "release_number": 16, "code_prefix": "K16", "role": "Killer",
        "chapter_name": "Chapter 12: Ghost Face®", "chapter_number": "12", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2019, "release_date": "June 18, 2019",
        "dlc_counterparts": '[]',
        "lore": "Working as a mild-mannered journalist by day, Danny investigated his own murders by night before vanishing into a new town."
    },
    # --- CHAPTER 13: STRANGER THINGS ---
    "the demogorgon": {
        "release_number": 17, "code_prefix": "K17", "role": "Killer",
        "chapter_name": "Chapter 13: Stranger Things", "chapter_number": "13", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2019, "release_date": "September 17, 2019",
        "dlc_counterparts": '["Steve Harrington", "Nancy Wheeler"]',
        "lore": "An apex predator from the Upside Down, driven by primal instincts to hunt and consume anything in its path."
    },
    "steve harrington": {
        "release_number": 18, "code_prefix": "S18", "role": "Survivor",
        "chapter_name": "Chapter 13: Stranger Things", "chapter_number": "13", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2019, "release_date": "September 17, 2019",
        "dlc_counterparts": '["The Demogorgon", "Nancy Wheeler"]',
        "lore": "Former high school king turned loyal babysitter and protector, Steve never hesitates to throw himself into danger to save his friends."
    },
    "nancy wheeler": {
        "release_number": 19, "code_prefix": "S19", "role": "Survivor",
        "chapter_name": "Chapter 13: Stranger Things", "chapter_number": "13", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2019, "release_date": "September 17, 2019",
        "dlc_counterparts": '["The Demogorgon", "Steve Harrington"]',
        "lore": "An aspiring investigative reporter from Hawkins High, Nancy pursues the truth no matter how terrifying the horrors in her way."
    },
    # --- CHAPTER 14: CURSED LEGACY ---
    "the oni": {
        "release_number": 18, "code_prefix": "K18", "role": "Killer",
        "chapter_name": "Chapter 14: Cursed Legacy", "chapter_number": "14", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2019, "release_date": "December 3, 2019",
        "dlc_counterparts": '["Yui Kimura"]',
        "lore": "Ancestor of the Yamaoka line, Kazan was an enraged samurai who slaughtered impostor lords across feudal Japan with brutal fury."
    },
    "yui kimura": {
        "release_number": 20, "code_prefix": "S20", "role": "Survivor",
        "chapter_name": "Chapter 14: Cursed Legacy", "chapter_number": "20", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2019, "release_date": "December 3, 2019",
        "dlc_counterparts": '["The Oni"]',
        "lore": "A fierce and independent motorcycle racer from Japan, Yui led an all-female street racing gang before crossing the finish line into The Fog."
    },
    # --- CHAPTER 15: CHAINS OF HATE ---
    "the deathslinger": {
        "release_number": 19, "code_prefix": "K19", "role": "Killer",
        "chapter_name": "Chapter 15: Chains of Hate", "chapter_number": "15", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "March 10, 2020",
        "dlc_counterparts": '["Zarina Kassir"]',
        "lore": "A brilliant Irish engineer in the American frontier who invented the speargun, driven to vengeance after having his patents stolen."
    },
    "zarina kassir": {
        "release_number": 21, "code_prefix": "S21", "role": "Survivor",
        "chapter_name": "Chapter 15: Chains of Hate", "chapter_number": "21", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "March 10, 2020",
        "dlc_counterparts": '["The Deathslinger"]',
        "lore": "A fearless documentary filmmaker uncovering stories of injustice, Zarina investigated Hellshire Penitentiary before being claimed by The Fog."
    },
    # --- CHAPTER 16: SILENT HILL ---
    "the executioner": {
        "release_number": 20, "code_prefix": "K20", "role": "Killer",
        "chapter_name": "Chapter 16: Silent Hill", "chapter_number": "16", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2020, "release_date": "June 16, 2020",
        "dlc_counterparts": '["Cheryl Mason"]',
        "lore": "A manifestation of guilt and punishment from Silent Hill, dragging the Great Knife to exact relentless torment and tormenting cages."
    },
    "cheryl mason": {
        "release_number": 22, "code_prefix": "S22", "role": "Survivor",
        "chapter_name": "Chapter 16: Silent Hill", "chapter_number": "16", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2020, "release_date": "June 16, 2020",
        "dlc_counterparts": '["The Executioner"]',
        "lore": "Having survived the nightmarish cult of Silent Hill, Cheryl sought a peaceful life helping troubled teens before The Fog claimed her."
    },
    # --- CHAPTER 17: DESCEND BEYOND ---
    "the blight": {
        "release_number": 21, "code_prefix": "K21", "role": "Killer",
        "chapter_name": "Chapter 17: Descend Beyond", "chapter_number": "17", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "September 8, 2020",
        "dlc_counterparts": '["Felix Richter"]',
        "lore": "A brilliant Scottish chemist obsessed with the mind-altering serum extracted from Pustula flowers, Talbot mutated into a hyper-fast monster."
    },
    "felix richter": {
        "release_number": 23, "code_prefix": "S23", "role": "Survivor",
        "chapter_name": "Chapter 17: Descend Beyond", "chapter_number": "17", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "September 8, 2020",
        "dlc_counterparts": '["The Blight"]',
        "lore": "An innovative German architect searching for his missing father on the desolate island of Dyer, Felix stumbled into an ancient portal."
    },
    # --- CHAPTER 18: A BINDING OF KIN ---
    "the twins": {
        "release_number": 22, "code_prefix": "K22", "role": "Killer",
        "chapter_name": "Chapter 18: A Binding of Kin", "chapter_number": "18", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "December 1, 2020",
        "dlc_counterparts": '["Élodie Rakoto"]',
        "lore": "Born conjoined in 17th-century France, Charlotte and Victor were hunted as demons. Reunited by The Entity, they hunt as a lethal pair."
    },
    "élodie rakoto": {
        "release_number": 24, "code_prefix": "S24", "role": "Survivor",
        "chapter_name": "Chapter 18: A Binding of Kin", "chapter_number": "18", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "December 1, 2020",
        "dlc_counterparts": '["The Twins"]',
        "lore": "An occult investigator searching the world for ancient artifacts connected to her missing parents, Élodie followed the clues into The Fog."
    },
    "elodie rakoto": {
        "release_number": 24, "code_prefix": "S24", "role": "Survivor",
        "chapter_name": "Chapter 18: A Binding of Kin", "chapter_number": "18", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2020, "release_date": "December 1, 2020",
        "dlc_counterparts": '["The Twins"]',
        "lore": "An occult investigator searching the world for ancient artifacts connected to her missing parents, Élodie followed the clues into The Fog."
    },
    # --- CHAPTER 19: ALL-KILL ---
    "the trickster": {
        "release_number": 23, "code_prefix": "K23", "role": "Killer",
        "chapter_name": "Chapter 19: All-Kill", "chapter_number": "19", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2021, "release_date": "March 30, 2021",
        "dlc_counterparts": '["Yun-Jin Lee"]',
        "lore": "A sensational K-Pop superstar who secretly recorded the agonizing screams of his murder victims and mixed them into his hit songs."
    },
    "yun-jin lee": {
        "release_number": 25, "code_prefix": "S25", "role": "Survivor",
        "chapter_name": "Chapter 19: All-Kill", "chapter_number": "19", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2021, "release_date": "March 30, 2021",
        "dlc_counterparts": '["The Trickster"]',
        "lore": "A ruthless music producer who built NO SPIN from the ground up, Yun-Jin always put her own survival and career ambitions first."
    },
    "lee yun-jin": {
        "release_number": 25, "code_prefix": "S25", "role": "Survivor",
        "chapter_name": "Chapter 19: All-Kill", "chapter_number": "19", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2021, "release_date": "March 30, 2021",
        "dlc_counterparts": '["The Trickster"]',
        "lore": "A ruthless music producer who built NO SPIN from the ground up, Yun-Jin always put her own survival and career ambitions first."
    },
    # --- CHAPTER 20: RESIDENT EVIL ---
    "the nemesis": {
        "release_number": 24, "code_prefix": "K24", "role": "Killer",
        "chapter_name": "Chapter 20: Resident Evil", "chapter_number": "20", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2021, "release_date": "June 15, 2021",
        "dlc_counterparts": '["Leon S. Kennedy", "Jill Valentine"]',
        "lore": "Umbrella Corporation's ultimate biological weapon, programmed with a singular mission: eradicate all members of S.T.A.R.S."
    },
    "leon s. kennedy": {
        "release_number": 26, "code_prefix": "S26", "role": "Survivor",
        "chapter_name": "Chapter 20: Resident Evil", "chapter_number": "20", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2021, "release_date": "June 15, 2021",
        "dlc_counterparts": '["The Nemesis", "Jill Valentine"]',
        "lore": "On his first day as a rookie cop in Raccoon City, Leon faced a biological apocalypse, displaying tactical brilliance and resolve."
    },
    "leon kennedy": {
        "release_number": 26, "code_prefix": "S26", "role": "Survivor",
        "chapter_name": "Chapter 20: Resident Evil", "chapter_number": "20", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2021, "release_date": "June 15, 2021",
        "dlc_counterparts": '["The Nemesis", "Jill Valentine"]',
        "lore": "On his first day as a rookie cop in Raccoon City, Leon faced a biological apocalypse, displaying tactical brilliance and resolve."
    },
    "jill valentine": {
        "release_number": 27, "code_prefix": "S27", "role": "Survivor",
        "chapter_name": "Chapter 20: Resident Evil", "chapter_number": "20", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2021, "release_date": "June 15, 2021",
        "dlc_counterparts": '["The Nemesis", "Leon S. Kennedy"]',
        "lore": "Founding member of S.T.A.R.S. and surviving operative of the Spencer Mansion incident, Jill escaped Raccoon City while hunted by Nemesis."
    },
    # --- CHAPTER 21: HELLRAISER ---
    "the cenobite": {
        "release_number": 25, "code_prefix": "K25", "role": "Killer",
        "chapter_name": "Chapter 21: Hellraiser™", "chapter_number": "21", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2021, "release_date": "September 7, 2021",
        "dlc_counterparts": '[]',
        "lore": "An explorer in the further regions of experience: demon to some, angel to others. Summons hooks and chains to harvest mortal souls."
    },
    # --- CHAPTER 21.5: HOUR OF THE WITCH ---
    "mikaela reid": {
        "release_number": 28, "code_prefix": "S28", "role": "Survivor",
        "chapter_name": "Chapter 21.5: Hour of the Witch", "chapter_number": "21.5", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2021, "release_date": "October 19, 2021",
        "dlc_counterparts": '[]',
        "lore": "A modern witch and horror storyteller, Mikaela blessed totems at the Moonstone festival before disappearing into the mist."
    },
    # --- CHAPTER 22: PORTRAIT OF A MURDER ---
    "the artist": {
        "release_number": 26, "code_prefix": "K26", "role": "Killer",
        "chapter_name": "Chapter 22: Portrait of a Murder", "chapter_number": "22", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2021, "release_date": "November 30, 2021",
        "dlc_counterparts": '["Jonah Vasquez"]',
        "lore": "A gifted Chilean artist whose tongue and hands were severed by corrupt officials. Crows flocked to avenge her, manifesting ink dire crows."
    },
    "jonah vasquez": {
        "release_number": 29, "code_prefix": "S29", "role": "Survivor",
        "chapter_name": "Chapter 22: Portrait of a Murder", "chapter_number": "22", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2021, "release_date": "November 30, 2021",
        "dlc_counterparts": '["The Artist"]',
        "lore": "A CIA cryptanalyst who decoded an arcane recurring signal that led him to an abandoned cemetery in the Chilean desert."
    },
    # --- CHAPTER 23: SADAKO RISING ---
    "the onryō": {
        "release_number": 27, "code_prefix": "K27", "role": "Killer",
        "chapter_name": "Chapter 23: Sadako Rising", "chapter_number": "23", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2022, "release_date": "March 8, 2022",
        "dlc_counterparts": '["Yoichi Asakawa"]',
        "lore": "Left to die in a water well, Sadako's psychic wrath manifested as a cursed videotape that condemns anyone who watches it."
    },
    "the onryo": {
        "release_number": 27, "code_prefix": "K27", "role": "Killer",
        "chapter_name": "Chapter 23: Sadako Rising", "chapter_number": "23", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2022, "release_date": "March 8, 2022",
        "dlc_counterparts": '["Yoichi Asakawa"]',
        "lore": "Left to die in a water well, Sadako's psychic wrath manifested as a cursed videotape that condemns anyone who watches it."
    },
    "yoichi asakawa": {
        "release_number": 30, "code_prefix": "S30", "role": "Survivor",
        "chapter_name": "Chapter 23: Sadako Rising", "chapter_number": "23", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2022, "release_date": "March 8, 2022",
        "dlc_counterparts": '["The Onryō"]',
        "lore": "The boy who survived Sadako's curse grew up to become a marine biologist, forever haunted by psychic visions of the ocean deep."
    },
    # --- CHAPTER 24: ROOTS OF DREAD ---
    "the dredge": {
        "release_number": 28, "code_prefix": "K28", "role": "Killer",
        "chapter_name": "Chapter 24: Roots of Dread", "chapter_number": "24", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2022, "release_date": "June 7, 2022",
        "dlc_counterparts": '["Haddie Kaur"]',
        "lore": "A monstrous amalgamation of dark thoughts and severed limbs born from the suppressed malice of a utopian cult on the Garden of Joy."
    },
    "haddie kaur": {
        "release_number": 31, "code_prefix": "S31", "role": "Survivor",
        "chapter_name": "Chapter 24: Roots of Dread", "chapter_number": "31", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2022, "release_date": "June 7, 2022",
        "dlc_counterparts": '["The Dredge"]',
        "lore": "A psychic podcaster capable of seeing 'The Ravage' — bleeding dimensions of darkness — who investigated haunted locations worldwide."
    },
    # --- CHAPTER 25: RESIDENT EVIL: PROJECT W ---
    "the mastermind": {
        "release_number": 29, "code_prefix": "K29", "role": "Killer",
        "chapter_name": "Chapter 25: Resident Evil: PROJECT W", "chapter_number": "25", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2022, "release_date": "August 30, 2022",
        "dlc_counterparts": '["Ada Wong", "Rebecca Chambers"]',
        "lore": "A visionary eugenicist with superhuman power derived from the Uroboros virus, believing humanity requires forced evolution."
    },
    "ada wong": {
        "release_number": 32, "code_prefix": "S32", "role": "Survivor",
        "chapter_name": "Chapter 25: Resident Evil: PROJECT W", "chapter_number": "25", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2022, "release_date": "August 30, 2022",
        "dlc_counterparts": '["The Mastermind", "Rebecca Chambers"]',
        "lore": "An enigmatic corporate spy of unparalleled skill who uses stealth, grappling hooks, and intellect to complete impossible missions."
    },
    "rebecca chambers": {
        "release_number": 33, "code_prefix": "S33", "role": "Survivor",
        "chapter_name": "Chapter 25: Resident Evil: PROJECT W", "chapter_number": "25", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2022, "release_date": "August 30, 2022",
        "dlc_counterparts": '["The Mastermind", "Ada Wong"]',
        "lore": "The prodigy medic of S.T.A.R.S. Bravo Team whose medical expertise and optimism keep her allies fighting through darkness."
    },
    # --- CHAPTER 26: FORGED IN FOG ---
    "the knight": {
        "release_number": 30, "code_prefix": "K30", "role": "Killer",
        "chapter_name": "Chapter 26: Forged in Fog", "chapter_number": "26", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2022, "release_date": "November 22, 2022",
        "dlc_counterparts": '["Vittorio Toscano"]',
        "lore": "A brutal Hungarian sellsword who led his loyal Guardia Compagnia — The Carnifex, The Assassin, and The Jailer — in bloody conquest."
    },
    "vittorio toscano": {
        "release_number": 34, "code_prefix": "S34", "role": "Survivor",
        "chapter_name": "Chapter 26: Forged in Fog", "chapter_number": "34", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2022, "release_date": "November 22, 2022",
        "dlc_counterparts": '["The Knight"]',
        "lore": "An Italian nobleman and scholar who unlocked ancient runes of peace, roaming across realms for centuries without aging."
    },
    # --- CHAPTER 27: TOOLS OF TORMENT ---
    "the skull merchant": {
        "release_number": 31, "code_prefix": "K31", "role": "Killer",
        "chapter_name": "Chapter 27: Tools of Torment", "chapter_number": "27", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2023, "release_date": "March 7, 2023",
        "dlc_counterparts": '["Thalita Lyra", "Renato Lyra"]',
        "lore": "A wealthy tech CEO who used surveillance drones and stealth technology to eliminate corporate rivals and track human quarry."
    },
    "thalita lyra": {
        "release_number": 35, "code_prefix": "S35", "role": "Survivor",
        "chapter_name": "Chapter 27: Tools of Torment", "chapter_number": "27", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2023, "release_date": "March 7, 2023",
        "dlc_counterparts": '["The Skull Merchant", "Renato Lyra"]',
        "lore": "A high-spirited Brazilian kite-fighter and mentor, working alongside her brother Renato to protect their local beach community."
    },
    "renato lyra": {
        "release_number": 36, "code_prefix": "S36", "role": "Survivor",
        "chapter_name": "Chapter 27: Tools of Torment", "chapter_number": "27", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2023, "release_date": "March 7, 2023",
        "dlc_counterparts": '["The Skull Merchant", "Thalita Lyra"]',
        "lore": "A patient, analytical kite competitor and student whose calculated thinking balances his sister Thalita's fiery spontaneity."
    },
    # --- CHAPTER 28: END TRANSMISSION ---
    "the singularity": {
        "release_number": 32, "code_prefix": "K32", "role": "Killer",
        "chapter_name": "Chapter 28: End Transmission", "chapter_number": "28", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2023, "release_date": "June 13, 2023",
        "dlc_counterparts": '["Gabriel Soma"]',
        "lore": "An autonomous android on an alien planet that came into contact with ancient alien technology, declaring humanity obsolete."
    },
    "gabriel soma": {
        "release_number": 37, "code_prefix": "S37", "role": "Survivor",
        "chapter_name": "Chapter 28: End Transmission", "chapter_number": "28", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2023, "release_date": "June 13, 2023",
        "dlc_counterparts": '["The Singularity"]',
        "lore": "A synthetic clone technician created to maintain deep space outposts on Dvarka, who fought desperately for his own genuine humanity."
    },
    # --- PARAGRAPH: NICOLAS CAGE ---
    "nicolas cage": {
        "release_number": 38, "code_prefix": "S38", "role": "Survivor",
        "chapter_name": "Paragraph: Nicolas Cage", "chapter_number": "Paragraph", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2023, "release_date": "July 25, 2023",
        "dlc_counterparts": '[]',
        "lore": "Legendary actor Nicolas Cage was filming the performance of a lifetime when a red mist on set transported him straight into The Fog."
    },
    # --- CHAPTER 29: ALIEN ---
    "the xenomorph": {
        "release_number": 33, "code_prefix": "K33", "role": "Killer",
        "chapter_name": "Chapter 29: Alien", "chapter_number": "29", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2023, "release_date": "August 29, 2023",
        "dlc_counterparts": '["Ellen Ripley"]',
        "lore": "The perfect organism. Unmatched structural perfection matched only by its hostility. It stalks through subterranean tunnels to slaughter."
    },
    "ellen ripley": {
        "release_number": 39, "code_prefix": "S39", "role": "Survivor",
        "chapter_name": "Chapter 29: Alien", "chapter_number": "29", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2023, "release_date": "August 29, 2023",
        "dlc_counterparts": '["The Xenomorph"]',
        "lore": "Warrant Officer on the commercial starship USCSS Nostromo, Ripley is the ultimate survivor who never surrenders against impossible odds."
    },
    # --- CHAPTER 30: CHUCKY ---
    "the good guy": {
        "release_number": 34, "code_prefix": "K34", "role": "Killer",
        "chapter_name": "Chapter 30: Chucky", "chapter_number": "30", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2023, "release_date": "November 28, 2023",
        "dlc_counterparts": '[]',
        "lore": "The notorious Lakeshore Strangler transferred his soul into a Good Guy doll using voodoo, relishing bloody mayhem with gleeful malice."
    },
    # --- PARAGRAPH: ALAN WAKE ---
    "alan wake": {
        "release_number": 40, "code_prefix": "S40", "role": "Survivor",
        "chapter_name": "Paragraph: Alan Wake", "chapter_number": "Paragraph", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "January 30, 2024",
        "dlc_counterparts": '[]',
        "lore": "A troubled best-selling novelist trapped in the Dark Place, writing manuscripts with his trusty flashlight to reshape reality and escape."
    },
    # --- CHAPTER 31: ALL THINGS WICKED ---
    "the unknown": {
        "release_number": 35, "code_prefix": "K35", "role": "Killer",
        "chapter_name": "Chapter 31: All Things Wicked", "chapter_number": "31", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2024, "release_date": "March 12, 2024",
        "dlc_counterparts": '["Sable Ward"]',
        "lore": "An urban legend brought into horrifying physical reality by rumors and fear, mimicking voices and twisting limbs in impossible shapes."
    },
    "sable ward": {
        "release_number": 41, "code_prefix": "S41", "role": "Survivor",
        "chapter_name": "Chapter 31: All Things Wicked", "chapter_number": "31", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2024, "release_date": "March 12, 2024",
        "dlc_counterparts": '["The Unknown"]',
        "lore": "A goth host of a late-night horror radio show who willingly walked into the Greenville cinema basement to find her best friend Mikaela."
    },
    # --- CHAPTER 32: DUNGEONS & DRAGONS ---
    "the lich": {
        "release_number": 36, "code_prefix": "K36", "role": "Killer",
        "chapter_name": "Chapter 32: Dungeons & Dragons", "chapter_number": "32", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "June 3, 2024",
        "dlc_counterparts": '["Aestri Yazar", "Baemar Uraz"]',
        "lore": "The arch-lich of Greyhawk, Master of the Spider Throne and Lord of Secrets. Wields the Book of Vile Darkness and four arcane spells."
    },
    "aestri yazar": {
        "release_number": 42, "code_prefix": "S42", "role": "Survivor",
        "chapter_name": "Chapter 32: Dungeons & Dragons", "chapter_number": "32", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "June 3, 2024",
        "dlc_counterparts": '["The Lich"]',
        "lore": "An elven bard of joyful spirit and arcane inspiration, weaving magical songs and illusions to aid her adventuring party."
    },
    # --- PARAGRAPH: TOMB RAIDER ---
    "lara croft": {
        "release_number": 43, "code_prefix": "S43", "role": "Survivor",
        "chapter_name": "Paragraph: Tomb Raider", "chapter_number": "Paragraph", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "July 16, 2024",
        "dlc_counterparts": '[]',
        "lore": "Legendary archaeologist and tomb raider whose acrobatic agility, resourcefulness, and survival instincts keep her one step ahead."
    },
    # --- CHAPTER 33: CASTLEVANIA ---
    "the dark lord": {
        "release_number": 37, "code_prefix": "K37", "role": "Killer",
        "chapter_name": "Chapter 33: Castlevania", "chapter_number": "33", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "August 27, 2024",
        "dlc_counterparts": '["Trevor Belmont"]',
        "lore": "The immortal lord of vampires and dark sorcery. Shapeshifts into bat, wolf, and vampire forms to conquer all mortal realms."
    },
    "trevor belmont": {
        "release_number": 44, "code_prefix": "S44", "role": "Survivor",
        "chapter_name": "Chapter 33: Castlevania", "chapter_number": "33", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "August 27, 2024",
        "dlc_counterparts": '["The Dark Lord"]',
        "lore": "Last scion of the legendary Belmont monster-hunting clan, wielding holy magic, courage, and relics against nocturnal beasts."
    },
    # --- CHAPTER 34: DOOMED COURSE ---
    "the houndmaster": {
        "release_number": 38, "code_prefix": "K38", "role": "Killer",
        "chapter_name": "Chapter 34: Doomed Course", "chapter_number": "34", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2024, "release_date": "November 2024",
        "dlc_counterparts": '["Taurie Cain"]',
        "lore": "A 19th-century naval captain stranded on a cursed island who commands her loyal war hound Snug to tear down mutineers."
    },
    "taurie cain": {
        "release_number": 45, "code_prefix": "S45", "role": "Survivor",
        "chapter_name": "Chapter 34: Doomed Course", "chapter_number": "34", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2024, "release_date": "November 2024",
        "dlc_counterparts": '["The Houndmaster"]',
        "lore": "A member of the black-market Black Vale cult whose invocation rituals led her directly into the court of The Entity."
    },
    # --- ADDITIONAL CANONICAL ARCHIVES KILLERS (K39 - K44) ---
    "the ghoul": {
        "release_number": 39, "code_prefix": "K39", "role": "Killer",
        "chapter_name": "Dead by Daylight Archives: The Ghoul", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "A half-ghoul cursed to walk between humanity and monstrous hunger, fighting to protect those he loves with visceral predatory fury."
    },
    "the animatronic": {
        "release_number": 40, "code_prefix": "K40", "role": "Killer",
        "chapter_name": "Dead by Daylight Archives: Five Nights", "chapter_number": "Archives", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "William Afton, trapped inside a decaying animatronic rabbit suit, bound by rusty crossbeams and eternal agony, eternally driven to hunt."
    },
    "the krasue": {
        "release_number": 41, "code_prefix": "K41", "role": "Killer",
        "chapter_name": "Dead by Daylight Archives: Southeast Legends", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "A nocturnal female ghost of folklore whose head detaches from the body at night to hunt for flesh, trailing glowing internal viscera."
    },
    "the slasher": {
        "release_number": 42, "code_prefix": "K42", "role": "Killer",
        "chapter_name": "Dead by Daylight Archives: Crystal Lake", "chapter_number": "Archives", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "The masked drowned boy of Crystal Lake, an immortal juggernaut of vengeance who punishes all who trespass upon his sacred woods."
    },
    "the first": {
        "release_number": 43, "code_prefix": "K43", "role": "Killer",
        "chapter_name": "Dead by Daylight Archives: Ancient Fog", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "The earliest hunter taken by the Entity when humanity first made fire, ancient and molded into pure elemental cruelty."
    },
    "the judgment": {
        "release_number": 44, "code_prefix": "K44", "role": "Killer",
        "chapter_name": "Dead by Daylight Archives: Holy Inquisition", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "A fanatic judge from the Spanish Inquisition who tortured thousands in the name of purity until the Entity answered his prayers."
    },
    # --- ADDITIONAL CANONICAL ARCHIVES SURVIVORS (S46 - S54) ---
    "orela rose": {
        "release_number": 46, "code_prefix": "S46", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2024, "release_date": "2024",
        "dlc_counterparts": '[]',
        "lore": "A botanist exploring cursed flora whose research into the Black Vale led her straight into the Fog."
    },
    "rick grimes": {
        "release_number": 47, "code_prefix": "S47", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives: The Walking Dead", "chapter_number": "Archives", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "2024",
        "dlc_counterparts": '["Michonne Grimes"]',
        "lore": "A sheriff's deputy turned battle-hardened leader who did whatever it took to keep his family alive in an apocalyptic wasteland."
    },
    "michonne grimes": {
        "release_number": 48, "code_prefix": "S48", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives: The Walking Dead", "chapter_number": "Archives", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "2024",
        "dlc_counterparts": '["Rick Grimes"]',
        "lore": "A fierce katana-wielding survivor whose sharp instincts and quiet resilience made her a beacon of hope against walking death."
    },
    "vee boonyasak": {
        "release_number": 49, "code_prefix": "S49", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2024, "release_date": "2024",
        "dlc_counterparts": '[]',
        "lore": "A street racer from Bangkok who used precision reflexes and mechanical ingenuity to outrun underground syndicates."
    },
    "eleven": {
        "release_number": 50, "code_prefix": "S50", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives: Stranger Things Vol 2", "chapter_number": "Archives", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "2024",
        "dlc_counterparts": '["Dustin Henderson"]',
        "lore": "A young girl with psychokinetic powers escaped from Hawkins National Laboratory, braving monsters from the Upside Down."
    },
    "dustin henderson": {
        "release_number": 51, "code_prefix": "S51", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives: Stranger Things Vol 2", "chapter_number": "Archives", "dlc_type": "licensed_chapter",
        "is_licensed": True, "release_year": 2024, "release_date": "2024",
        "dlc_counterparts": '["Eleven"]',
        "lore": "A whip-smart science enthusiast and radio builder whose loyalty to his friends never wavered in the darkest hours."
    },
    "kwon tae-young": {
        "release_number": 52, "code_prefix": "S52", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "An underground investigative journalist in Seoul who risked everything to expose corruption among high-level executives."
    },
    "shane wiigwaas": {
        "release_number": 53, "code_prefix": "S53", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "An indigenous wilderness tracker from Ontario whose bond with nature helped him guide lost wanderers through blizzard country."
    },
    "aurora stardotter": {
        "release_number": 54, "code_prefix": "S54", "role": "Survivor",
        "chapter_name": "Dead by Daylight Archives", "chapter_number": "Archives", "dlc_type": "original_chapter",
        "is_licensed": False, "release_year": 2025, "release_date": "2025",
        "dlc_counterparts": '[]',
        "lore": "A Nordic stargazer and astronomer who unlocked ancestral celestial maps pointing beyond known dimensions."
    },
}

# Derived canonical release maps
CANONICAL_KILLER_RELEASES = {
    k: (v["release_number"], v["code_prefix"])
    for k, v in CANONICAL_DLC_INFO.items()
    if v.get("role") == "Killer"
}

CANONICAL_SURVIVOR_RELEASES = {
    k: (v["release_number"], v["code_prefix"])
    for k, v in CANONICAL_DLC_INFO.items()
    if v.get("role") == "Survivor"
}

CANONICAL_KILLER_POWERS = {
    "the trapper": {
        "name": "Bear Trap",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/4/4c/IconPowers_bearTrap.png",
        "targets": ["Bear Trap", "The Trapper", "Evan MacMillan"],
        "description": "The Trapper starts the Trial carrying Bear Traps and can find additional Bear Traps scattered throughout the Realm. The Trapper can set a Bear Trap on the ground. When a Survivor steps into an active Bear Trap, they become trapped, injured into the Injured state if Healthy, and suffer from the Trapped Status Effect until they escape or are rescued.",
    },
    "the wraith": {
        "name": "Wailing Bell",
        "movement_speed": "4.6 m/s (115%) / 6.0 m/s (150% Cloaked)",
        "terror_radius": "32 m (0 m Cloaked)",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2c/IconPowers_wailingBell.png",
        "targets": ["Wailing Bell", "The Wraith", "Philip Ojomo"],
        "description": "Ring the Wailing Bell to enter and exit the Spirit World. While Cloaked, the Wraith moves significantly faster, gains the Undetectable Status Effect, and is invisible to Survivors beyond 20 metres. Uncloaking grants a temporary burst of Movement Speed.",
    },
    "the hillbilly": {
        "name": "Chainsaw",
        "movement_speed": "4.6 m/s (115%) / 10.12 m/s (253% Sprint)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/9/9e/IconPowers_chainsaw.png",
        "targets": ["Chainsaw", "The Hillbilly", "Max Thompson Jr."],
        "description": "Rev the Chainsaw to trigger a deadly high-speed Chainsaw Sprint. Hitting a Survivor with the Chainsaw instantly puts them into the Dying State. The Chainsaw features an Overheat mechanic that builds heat while revving and sprinting.",
    },
    "the nurse": {
        "name": "Spencer's Last Breath",
        "movement_speed": "3.85 m/s (96.25%) / 13.33 m/s Blink",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c5/IconPowers_spencersLastBreath.png",
        "targets": ["Spencer's Last Breath", "The Nurse", "Sally Smithson"],
        "description": "Channel Spencer's Last Breath to perform a Blink, tearing through the physical world and traversing obstacles and terrain instantly. The Nurse can chain an additional Blink before suffering a brief fatigue.",
    },
    "the shape": {
        "name": "Evil Within",
        "movement_speed": "4.2 m/s (105% T1) / 4.6 m/s (115% T2-T3)",
        "terror_radius": "0 m (T1) / 16 m (T2) / 32 m (T3)",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/52/IconPowers_evilWithin.png",
        "targets": ["Evil Within", "The Shape", "Michael Myers"],
        "description": "Stalk Survivors to harvest Evil and progress through three tiers of Evil Within. Tier I grants Undetectable but slower movement. Tier II gives standard speed and reduced Terror Radius. Tier III gives extended Lunge and causes all Basic Attacks to inflict the Dying State.",
    },
    "the hag": {
        "name": "Blackened Catalyst",
        "movement_speed": "4.4 m/s (110%)",
        "terror_radius": "24 m",
        "terror_radius_meters": 24,
        "height": "Short",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/ca/IconPowers_blackenedCatalyst.png",
        "targets": ["Blackened Catalyst", "The Hag", "Lisa Sherwood"],
        "description": "Draw Phantasm Traps on the ground using mud. When a Survivor steps near a trap, a terrifying Phantasm is triggered, disorienting the Survivor. The Hag can teleport instantly to any triggered Phantasm Trap within 48 metres.",
    },
    "the doctor": {
        "name": "Carter's Spark",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e4/IconPowers_cartersSpark.png",
        "targets": ["Carter's Spark", "The Doctor", "Herman Carter"],
        "description": "Release Shock Therapy attacks and a devastating Static Blast that shocks Survivors, causing them to scream, reveal their locations, and advance through Madness tiers (I, II, III). High Madness causes hallucinations, skill check disruptions, and prevents interaction.",
    },
    "the huntress": {
        "name": "Hunting Hatchets",
        "movement_speed": "4.4 m/s (110%)",
        "terror_radius": "20 m (45 m Lullaby)",
        "terror_radius_meters": 20,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/07/IconPowers_huntingHatchets.png",
        "targets": ["Hunting Hatchets", "The Huntress", "Anna"],
        "description": "Carry up to 5 Hunting Hatchets and wind up high-velocity ranged throws that injure or down Survivors across long distances. Replenish Hatchets at Lockers throughout the Trial.",
    },
    "the cannibal": {
        "name": "Bubba's Chainsaw",
        "movement_speed": "4.6 m/s (115%) / 5.29 m/s (132.25% Sweep)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/09/IconPowers_bubbasChainsaw.png",
        "targets": ["Bubba's Chainsaw", "The Cannibal", "Bubba Sawyer"],
        "description": "Consume Power Tokens to initiate a Chainsaw Sweep, swinging the chainsaw back and forth in a lethal arc that instantly downs any Survivors hit and chews through thrown pallets.",
    },
    "the nightmare": {
        "name": "Dream Demon",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m (32 m Lullaby in Dream)",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/a/ad/IconPowers_dreamDemon.png",
        "targets": ["Dream Demon", "The Nightmare", "Freddy Krueger"],
        "description": "Survivors passively fall asleep into the Dream World. Asleep Survivors are oblivious to Freddy's Terror Radius, hearing a Lullaby instead. Freddy can place Dream Snares/Pallets to hinder Survivors and project his form across the map to teleport to Generators.",
    },
    "the pig": {
        "name": "Jigsaw's Baptism",
        "movement_speed": "4.6 m/s (115%) / 3.6 m/s (Crouch) / 6.9 m/s (Ambush)",
        "terror_radius": "32 m (0 m Crouched)",
        "terror_radius_meters": 32,
        "height": "Short",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/13/IconPowers_jigsawsBaptism.png",
        "targets": ["Jigsaw's Baptism", "The Pig", "Amanda Young"],
        "description": "Crouch to become Undetectable and unleash an Ambush Dash attack. When downing a Survivor, place a Reverse Bear Trap on their head. RBTs activate when a Generator completes and kill the Survivor if not removed at a Jigsaw Box before time expires.",
    },
    "the clown": {
        "name": "The Afterpiece Tonic",
        "movement_speed": "4.6 m/s (115%) / 5.06 m/s (Antidote)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/8/89/IconPowers_theAfterpieceTonic.png",
        "targets": ["The Afterpiece Tonic", "The Clown", "Kenneth Chase"],
        "description": "Brew and throw bottles of Afterpiece Tonic (intoxicating purple gas that impairs vision and slows Survivors) and Afterpiece Antidote (invigorating yellow gas that cures intoxication and grants a speed boost).",
    },
    "the spirit": {
        "name": "Yamaoka's Haunting",
        "movement_speed": "4.4 m/s (110%) / 7.04 m/s (Phase)",
        "terror_radius": "24 m",
        "terror_radius_meters": 24,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/4/4e/IconPowers_yamaokasHaunting.png",
        "targets": ["Yamaoka's Haunting", "The Spirit", "Rin Yamaoka"],
        "description": "Leave behind a stationary Husk and enter the Ethereal Plane to Phase-Walk at extreme speed. While Phase-Walking, Survivors are invisible to the Spirit, who must track them via scratch marks, sounds, and environmental disturbance.",
    },
    "the legion": {
        "name": "Feral Frenzy",
        "movement_speed": "4.6 m/s (115%) / 5.2 m/s (Frenzy)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/b3/IconPowers_feralFrenzy.png",
        "targets": ["Feral Frenzy", "The Legion", "Frank, Julie, Susie, Joey"],
        "description": "Activate Feral Frenzy to sprint rapidly and vault pallets and windows at high speed. Hitting a Survivor applies Deep Wound and reveals the locations of all other Survivors within Terror Radius via Killer Instinct.",
    },
    "the plague": {
        "name": "Vile Purge",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/52/IconPowers_vilePurge.png",
        "targets": ["Vile Purge", "The Plague", "Adiris"],
        "description": "Vomit streams of infection that contaminate Survivors and interactive objects. Infected Survivors eventually become Broken. Purging at Pools of Devotion cleanses Survivors but corrupts the pool into Corrupt Purge, turning the stream into lethal damage.",
    },
    "the ghost face": {
        "name": "Night Shroud",
        "movement_speed": "4.6 m/s (115%) / 3.6 m/s (Crouch)",
        "terror_radius": "32 m (0 m Shroud)",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3d/IconPowers_nightShroud.png",
        "targets": ["Night Shroud", "The Ghost Face", "Danny Johnson"],
        "description": "Activate Night Shroud to gain the Undetectable Status Effect. Crouch and lean from cover to stalk Survivors, filling their stalk gauge to Mark them, inflicting the Exposed Status Effect.",
    },
    "the demogorgon": {
        "name": "Of the Abyss",
        "movement_speed": "4.6 m/s (115%) / 9.2 m/s (Shred)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/a/a9/IconPowers_ofTheAbyss.png",
        "targets": ["Of the Abyss", "The Demogorgon", "Demogorgon"],
        "description": "Place Portals across the map and traverse the Upside Down to travel between them. Channel Of the Abyss to detect nearby Survivors on portals and unleash a long-range Shred lunge attack.",
    },
    "the oni": {
        "name": "Yamaoka's Wrath",
        "movement_speed": "4.6 m/s (115%) / 7.82 m/s (Demon Dash)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/df/IconPowers_yamaokasWrath.png",
        "targets": ["Yamaoka's Wrath", "The Oni", "Kazan Yamaoka"],
        "description": "Injured Survivors drop Blood Orbs that the Oni absorbs to charge his power. When full, activate Blood Fury to execute high-speed Demon Sprints and deadly Demon Strikes that instantly down Survivors.",
    },
    "the deathslinger": {
        "name": "The Redeemer",
        "movement_speed": "4.4 m/s (110%)",
        "terror_radius": "24 m",
        "terror_radius_meters": 24,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/77/IconPowers_theRedeemer.png",
        "targets": ["The Redeemer", "The Deathslinger", "Caleb Quinn"],
        "description": "Aim and fire a spear gun with a tethered chain to harpoon Survivors from range, reeling them in toward you for a basic attack or forcing them to break the chain and suffer Deep Wound.",
    },
    "the executioner": {
        "name": "Rites of Judgement",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c5/IconPowers_ritesOfJudgement.png",
        "targets": ["Rites of Judgement", "The Executioner", "Pyramid Head"],
        "description": "Carve trails of Torment into the ground. Survivors who step into the trails become Tormented. Unleash Punishment of the Damned to send shockwaves through obstacles, and send downed Tormented Survivors directly into Cages of Atonement or execute them with Final Judgement.",
    },
    "the blight": {
        "name": "Blighted Corruption",
        "movement_speed": "4.6 m/s (115%) / 9.2 m/s (Rush)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2f/IconPowers_blightedCorruption.png",
        "targets": ["Blighted Corruption", "The Blight", "Talbot Grimes"],
        "description": "Consume Rush Tokens to initiate high-speed Rushes. Slam into environmental obstacles to perform a Slam, resetting tokens and chaining into Lethal Rushes to strike Survivors across the map.",
    },
    "the twins": {
        "name": "Blood Bond",
        "movement_speed": "4.6 m/s (Charlotte) / 6.0 m/s (Victor)",
        "terror_radius": "32 m (Charlotte) / 0 m (Victor)",
        "terror_radius_meters": 32,
        "height": "Tall (Charlotte) / Short (Victor)",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/7b/IconPowers_bloodBond.png",
        "targets": ["Blood Bond", "The Twins", "Charlotte & Victor Deshayes"],
        "description": "Release Victor from Charlotte's chest to control him independently. Victor moves with blinding speed, detects Survivors via Killer Instinct, and pounces onto Survivors to latch on, injure, or down them.",
    },
    "the trickster": {
        "name": "Showstopper",
        "movement_speed": "4.4 m/s (110%)",
        "terror_radius": "24 m (40 m Lullaby)",
        "terror_radius_meters": 24,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2f/IconPowers_showstopper.png",
        "targets": ["Showstopper", "The Trickster", "Ji-Woon Hak"],
        "description": "Throw a flurry of throwing blades at rapid speed. Each blade hit fills a Survivor's Laceration Meter, dealing damage once full. Rapid hits build up Main Event, unlocking an automatic stream of infinite blades.",
    },
    "the nemesis": {
        "name": "T-Virus",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/4/4b/IconPowers_t-Virus.png",
        "targets": ["T-Virus", "The Nemesis", "Nemesis T-Type"],
        "description": "Whip Survivors with your Tentacle Strike to infect them with the T-Virus and advance through Mutation rates (Tier I, II, III). Higher tiers increase range and allow destroying pallets and breakable walls. AI-controlled Zombies roam the map.",
    },
    "the cenobite": {
        "name": "Summons of Pain",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2e/IconPowers_summonsOfPain.png",
        "targets": ["Summons of Pain", "The Cenobite", "Pinhead (Elliot Spencer)"],
        "description": "Spawn a gateway and guide a possessed Chain projectile to snare Survivors. The Lament Configuration puzzle box spawns in the Trial; if Survivors neglect it, a universal Chain Hunt relentlessly attacks all Survivors.",
    },
    "the artist": {
        "name": "Birds of Torment",
        "movement_speed": "4.4 m/s (110%)",
        "terror_radius": "24 m",
        "terror_radius_meters": 24,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/30/IconPowers_birdsOfTorment.png",
        "targets": ["Birds of Torment", "The Artist", "Carmina Mora"],
        "description": "Summon Dire Crows and launch them across the entire map in straight trajectories. Crows reveal Survivors with a swarm or injure Survivors if launched within close range or through obstacles.",
    },
    "the onryō": {
        "name": "Deluge of Fear",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "24 m (0 m Demanifested + 24 m Lullaby)",
        "terror_radius_meters": 24,
        "height": "Short",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/0c/IconPowers_delugeOfFear.png",
        "targets": ["Deluge of Fear", "The Onryō", "The Onryo", "Sadako Yamamura"],
        "description": "Manifest to enter and exit invisibility. Demanifested Sadako is Undetectable and can Project herself directly to active TVs near Survivors, spreading Condemned stacks. Fully Condemned Survivors can be instantly killed by hand.",
    },
    "the dredge": {
        "name": "Reign of Darkness",
        "movement_speed": "4.6 m/s (115%) / 12-38 m/s (Teleport)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/d3/IconPowers_reignOfDarkness.png",
        "targets": ["Reign of Darkness", "The Dredge"],
        "description": "Teleport between Lockers across the map and leave behind a Remnant to return to. When the Nightfall meter fills from injuries and teleports, total darkness envelops the Trial, blinding Survivors and granting Dredge extreme mobility.",
    },
    "the mastermind": {
        "name": "Virulent Bound",
        "movement_speed": "4.6 m/s (115%) / 14.0 m/s (Bound)",
        "terror_radius": "40 m",
        "terror_radius_meters": 40,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/14/IconPowers_virulentBound.png",
        "targets": ["Virulent Bound", "The Mastermind", "Albert Wesker"],
        "description": "Charge two high-speed Bound attacks to vault obstacles and slam into Survivors, infecting them with Uroboros and tossing or slamming them into walls for heavy damage.",
    },
    "the knight": {
        "name": "Guardia Compagnia",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/df/IconPowers_guardiaCompagnia.png",
        "targets": ["Guardia Compagnia", "The Knight", "Tarhos Kovács"],
        "description": "Draw a patrol path and summon one of three loyal Guards (The Carnifex, The Assassin, The Jailer) to patrol the area, hunt Survivors, or damage generators and pallets automatically.",
    },
    "the skull merchant": {
        "name": "Eyes in the Sky",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c5/IconPowers_eyesInTheSky.png",
        "targets": ["Eyes in the Sky", "The Skull Merchant", "Adriana Imai"],
        "description": "Deploy Eyes in the Sky Drones that scan zones with detection lines. Survivors scanned gain Lock-On stacks; full Lock-On inflicts Claw Traps, Hindered, and Broken while tracking their positions on the Radar.",
    },
    "the singularity": {
        "name": "Quantum Instantiation",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/08/IconPowers_quantumInstantiation.png",
        "targets": ["Quantum Instantiation", "The Singularity", "HUX-A7-13"],
        "description": "Fire Biopods onto walls and ceilings to surveil the map. Target Survivors through Biopods to apply Temporal Slipstreams, allowing the Singularity to teleport directly behind them into Overclock mode.",
    },
    "the xenomorph": {
        "name": "Hidden Pursuit",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m (24 m Crawler Mode)",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c9/IconPowers_hiddenPursuit.png",
        "targets": ["Hidden Pursuit", "The Xenomorph", "Xenomorph"],
        "description": "Access a subterranean Tunnel System under Control Stations to travel anywhere with extreme speed. Exiting tunnels triggers Crawler Mode, reducing Terror Radius and enabling a lethal Tail Attack.",
    },
    "the good guy": {
        "name": "Playtime's Over",
        "movement_speed": "4.4 m/s (110%) / 8.28 m/s (Slice & Dice)",
        "terror_radius": "32 m (0 m Hidey-Ho)",
        "terror_radius_meters": 32,
        "height": "Short",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/14/IconPowers_playtimesOver.png",
        "targets": ["Playtime's Over", "The Good Guy", "Chucky (Charles Lee Ray)"],
        "description": "Enter Hidey-Ho Mode to become Undetectable and spawn phantom footsteps. While in Hidey-Ho Mode, perform a Scamper under pallets or unleash a high-speed Slice & Dice charge attack.",
    },
    "the unknown": {
        "name": "UVX",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/7b/IconPowers_uvx.png",
        "targets": ["UVX", "The Unknown"],
        "description": "Launch bouncing UVX projectiles that create a blast radius upon detonation, inflicting Weakened on Survivors or injuring Weakened Survivors. The Unknown leaves behind Hallucinations to teleport to instantly.",
    },
    "the lich": {
        "name": "Vile Darkness",
        "movement_speed": "4.6 m/s (115%) / 7.0 m/s (Fly)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/23/IconPowers_vileDarkness.png",
        "targets": ["Vile Darkness", "The Lich", "Vecna"],
        "description": "Wield four distinct dark spells: Mage Hand (lifts or blocks pallets), Flight of the Damned (summons flying spectral skeletons), Dispelling Sphere (invisible sphere disabling magic items), and Fly (grants airborne flight speed).",
    },
    "the dark lord": {
        "name": "Vampiric Shift",
        "movement_speed": "4.6 m/s (115%) / 6.0 m/s (Wolf)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/a/a2/IconPowers_vampiricShift.png",
        "targets": ["Vampiric Shift", "The Dark Lord", "Dracula (Vlad Tepes)"],
        "description": "Shift between three monstrous forms: Vampire Form (casts Hellfire pillars over obstacles), Bat Form (invisible flight and teleport to vault locations), and Wolf Form (scents blood trails and unleashes Pounce attacks).",
    },
    "the houndmaster": {
        "name": "Command: Search & Chase",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/8/86/IconPowers_commandSearchAndChase.png",
        "targets": ["Command: Search & Chase", "The Houndmaster", "Portia Maye"],
        "description": "Issue commands to your faithful hunting hound, Snag. Command: Search sends the hound to scout ahead and reveal Survivors. Command: Chase directs the hound to charge, pounce, and drag Survivors back toward you.",
    },
    "the ghoul": {
        "name": "Rinkaku Kagune",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Average",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/30/IconPowers_birdsOfTorment.png",
        "targets": ["Rinkaku Kagune", "The Ghoul", "Ken Kaneki"],
        "description": "Unleash predatory Rinkaku Kagune tentacles from your back to pierce through obstacles, vault elevations rapidly, and impale fleeing survivors from distance.",
    },
    "the animatronic": {
        "name": "Springlock Malfunction",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/14/IconPowers_playtimesOver.png",
        "targets": ["Springlock Malfunction", "The Animatronic", "Springtrap", "William Afton"],
        "description": "Sabotage ventilation and audio systems across the realm. Activate Phantom Audio hallucinations to lure survivors into deadly springlock ambushes.",
    },
    "the krasue": {
        "name": "Nocturnal Severance",
        "movement_speed": "4.4 m/s (110%)",
        "terror_radius": "24 m",
        "terror_radius_meters": 24,
        "height": "Short",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/ca/IconPowers_blackenedCatalyst.png",
        "targets": ["Nocturnal Severance", "The Krasue", "Krasue"],
        "description": "Detach your head and glowing internal organs from your body to fly silently over obstacles and inflict lingering septic curses on survivors.",
    },
    "the slasher": {
        "name": "Relentless Stalker",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3d/IconPowers_nightShroud.png",
        "targets": ["Relentless Stalker", "The Slasher", "Jason Voorhees"],
        "description": "Channel pure unstoppable momentum to smash through barricades instantly, shift silently across fog-covered paths, and execute brutal machete strikes.",
    },
    "the first": {
        "name": "Primordial Blight",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/2/2f/IconPowers_blightedCorruption.png",
        "targets": ["Primordial Blight", "The First"],
        "description": "Channel the raw primordial energy of the Fog before the Realms were forged, warping reality, corrupting generator foundations, and manifesting entity claws.",
    },
    "the judgment": {
        "name": "Pyre of Heresy",
        "movement_speed": "4.6 m/s (115%)",
        "terror_radius": "32 m",
        "terror_radius_meters": 32,
        "height": "Tall",
        "icon_url": "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c5/IconPowers_ritesOfJudgement.png",
        "targets": ["Pyre of Heresy", "The Judgment"],
        "description": "Branded heretic glyphs burst into holy fire beneath running survivors, exposing false paths and sentencing survivors to the cleansing pyre.",
    },
}


@dataclass
class ScraperConfig:
    source: str = "nightlight"
    fallback_to_wiki: bool = True
    last_used_source: str = "nightlight"
    last_run_timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScraperConfig":
        if not isinstance(data, dict):
            return cls()
        valid_keys = {f.name for f in fields(cls)}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)


@dataclass
class CharacterData:
    name: str
    real_name: str
    wiki_slug: str
    short_name: str
    category: str
    avatar_url: str
    avatar_local_path: str
    release_number: int = 0
    code_prefix: Optional[str] = None
    chapter_name: Optional[str] = None
    chapter_number: Optional[str] = None
    dlc_type: Optional[str] = None
    is_licensed: bool = False
    release_year: Optional[int] = None
    release_date: Optional[str] = None
    dlc_counterparts: Optional[str] = None
    lore: Optional[str] = None


@dataclass

@dataclass
class ItemData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str


@dataclass
class AddonData:
    name: str
    associated_target: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str


@dataclass
class PerkData:
    name: str
    character: str
    character_real_name: str
    character_avatar_path: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str


@dataclass
class MapData:
    id: str
    name: str
    realm: str
    realm_id: str
    callout_image_url: str
    callout_image_local_path: str
    dpath: str
    clock_system: Dict[str, Any]
    source: str = "hens333"
    source_label: str = "Hens333 12-Clock Callouts"


def get_map_landmarks_data(map_name: str, realm_name: str, source: str = "hens333") -> Dict[str, Any]:
    try:
        if current_app:
            norm_map = re.sub(r"[^a-z0-9]", "", (map_name or "").lower())
            maps = db.session.scalars(select(MapRealm).options(joinedload(MapRealm.tiles))).all()
            for m in maps:
                m_norm = re.sub(r"[^a-z0-9]", "", (m.name or "").lower())
                if norm_map and (norm_map == m_norm or norm_map in m_norm or m_norm in norm_map):
                    twelve = next((t.name for t in m.tiles if "twelve" in t.name.lower() or t.y < 0.25), "Main Building / North Exit Gate")
                    three = next((t.name for t in m.tiles if "three" in t.name.lower() or t.x > 0.75), "East Jungle Gym / Outer Loop")
                    six = next((t.name for t in m.tiles if "six" in t.name.lower() or "shack" in t.name.lower() or t.y > 0.75), "Killer Shack & Basement / South Exit Gate")
                    nine = next((t.name for t in m.tiles if "nine" in t.name.lower() or t.x < 0.25), "West Gym / L-T Walls")
                    center = next((t.name for t in m.tiles if "center" in t.name.lower() or (0.4 <= t.x <= 0.6 and 0.4 <= t.y <= 0.6)), "Center Spine / Central Generator")
                    desc = m.description or f"Landmark layout for {m.name} ({m.realm})."
                    return {
                        "description": f"12-Clock Callout System for {m.name} ({m.realm}). {desc}".strip(),
                        "twelve_o_clock": twelve,
                        "three_o_clock": three,
                        "six_o_clock": six,
                        "nine_o_clock": nine,
                        "center": center,
                    }
    except Exception:
        pass

    return {
        "description": f"12-Clock Callout System for {map_name} ({realm_name}). Standard top-middle starts at 12 o'clock.",
        "twelve_o_clock": "Main Landmark / North Exit Gate",
        "three_o_clock": "East Loop Tile / Generator Cluster",
        "six_o_clock": "Killer Shack & Basement / South Exit Gate",
        "nine_o_clock": "West Jungle Gym / Pallet Gym",
        "center": "Center Landmark / Central Generator",
    }


class HensMapScraperDriver:
    HENS_CALLOUTS_URL = "https://hens333.com/callouts"
    CDN_BASE = "https://hens333.com/img/dbd/callouts/"

    @staticmethod
    def slugify(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        text = re.sub(r"[\s_-]+", "_", text)
        return text.strip("_")

    def scrape_maps(self) -> List[MapData]:
        logger.info("Scraping map callouts from Hens333...")
        try:
            res = requests.get(self.HENS_CALLOUTS_URL, verify=False, timeout=15)
            if res.status_code != 200:
                logger.warning(f"Failed to fetch Hens333 callouts: HTTP {res.status_code}")
                return []
            soup = BeautifulSoup(res.text, "html.parser")
            maps: List[MapData] = []

            for rw in soup.find_all("div", class_="realm-wrapper"):
                h1 = rw.find("h1")
                realm_name = h1.get_text(strip=True) if h1 else "General Realm"
                realm_slug = self.slugify(realm_name)

                for btn in rw.find_all(attrs={"data-path": True}):
                    dpath = btn["data-path"]
                    map_name = btn.get_text(strip=True)
                    map_slug = self.slugify(map_name)

                    encoded_dpath = re.sub(r"\s", "%20", dpath)
                    remote_url = f"{self.CDN_BASE}{encoded_dpath}"
                    rel_static_path = f"maps/callouts/hens333/{realm_slug}/{map_slug}.webp"

                    maps.append(
                        MapData(
                            id=f"hens_{map_slug}",
                            name=map_name,
                            realm=realm_name,
                            realm_id=realm_slug,
                            callout_image_url=remote_url,
                            callout_image_local_path=rel_static_path,
                            dpath=dpath,
                            clock_system=get_map_landmarks_data(
                                map_name=map_name,
                                realm_name=realm_name,
                                source="hens333",
                            ),
                            source="hens333",
                            source_label="Hens333 12-Clock Callouts",
                        )
                    )
            logger.info(f"Scraped {len(maps)} maps from Hens333.")
            return maps
        except Exception as e:
            logger.error(f"Error scraping Hens333 maps: {e}")
            return []


class SamoelColtMapScraperDriver:
    STEAM_GUIDE_URL = "https://steamcommunity.com/sharedfiles/filedetails/?id=2899093390"

    @staticmethod
    def slugify(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        text = re.sub(r"[\s_-]+", "_", text)
        return text.strip("_")

    def scrape_maps(self) -> List[MapData]:
        logger.info("Scraping SamoelColt map guides from Steam Workshop...")
        try:
            res = requests.get(self.STEAM_GUIDE_URL, verify=False, timeout=20)
            if res.status_code != 200:
                logger.warning(f"Failed to fetch Steam Workshop guide: HTTP {res.status_code}")
                return []
            soup = BeautifulSoup(res.text, "html.parser")
            maps: List[MapData] = []

            subsections = soup.find_all("div", class_="subSection")
            for sub in subsections:
                title_div = sub.find("div", class_="subSectionTitle")
                realm_name = title_div.get_text(strip=True) if title_div else "General Realm"
                if realm_name in ["Overview", "Comments", "General"]:
                    continue

                realm_slug = self.slugify(realm_name)
                lines = [text.strip() for text in sub.stripped_strings if text.strip() and text.strip() != realm_name]

                links = sub.find_all("a", class_="modalContentLink")
                for idx, link in enumerate(links):
                    href = link.get("href")
                    if href and "images.steamusercontent.com" in href:
                        map_name = f"{realm_name} Map {idx + 1}"
                        if idx < len(lines):
                            potential_name = lines[idx]
                            if len(potential_name) < 40 and not potential_name.startswith("http"):
                                map_name = potential_name

                        map_slug = self.slugify(map_name)
                        unique_id = f"samoel_{realm_slug}_{map_slug}_{idx + 1}"
                        rel_static_path = f"maps/callouts/samoelcolt/{realm_slug}/{map_slug}_{idx + 1}.jpg"

                        maps.append(
                            MapData(
                                id=unique_id,
                                name=map_name,
                                realm=realm_name,
                                realm_id=realm_slug,
                                callout_image_url=href,
                                callout_image_local_path=rel_static_path,
                                dpath="",
                                clock_system=get_map_landmarks_data(
                                    map_name=map_name,
                                    realm_name=realm_name,
                                    source="samoelcolt",
                                ),
                                source="samoelcolt",
                                source_label="SamoelColt Isometric Scheme",
                            )
                        )
            logger.info(f"Scraped {len(maps)} SamoelColt maps from Steam Workshop.")
            return maps
        except Exception as e:
            logger.error(f"Error scraping SamoelColt maps: {e}")
            return []


class NightlightScraperDriver:
    SURVIVORS_API = "https://nightlight.gg/api/v1/stats/global/survivors"
    KILLERS_API = "https://nightlight.gg/api/v1/stats/global/killers"
    PERKS_LIST_URL = "https://nightlight.gg/perks/list"

    CDN_PORTRAITS_BASE = "https://cdn.nightlight.gg/img/portraits/"
    CDN_PERKS_BASE = "https://cdn.nightlight.gg/img/perks/"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://nightlight.gg/",
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)

    def fetch_nightlight_data(self, url: str) -> str:
        try:
            response = requests.get(
                url,
                headers=self.HEADERS,
                impersonate=self.IMPERSONATE_BROWSER,
                verify=True,
                timeout=self.REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.text
        except Exception as err:
            err_msg = str(err).lower()
            if "certificate" in err_msg or "ssl" in err_msg or "curl: (60)" in err_msg:
                logger.warning(f"SSL certificate verification failed for {url}. Retrying with verify=False...")
                response = requests.get(
                    url,
                    headers=self.HEADERS,
                    impersonate=self.IMPERSONATE_BROWSER,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                response.raise_for_status()
                return response.text
            raise

    def parse_api_characters(self, survivors_payload: Any, killers_payload: Any) -> List[CharacterData]:
        characters: List[CharacterData] = []

        def process_items(payload: Any, category: str):
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:
                    return

            items = []
            if isinstance(payload, list):
                items = payload
            elif isinstance(payload, dict):
                data_val = payload.get("data")
                if isinstance(data_val, list):
                    items = data_val
                elif isinstance(data_val, dict):
                    items = data_val.get("survivors") or data_val.get("killers") or data_val.get("items") or []
                if not items:
                    items = payload.get("survivors") or payload.get("killers") or payload.get("items") or []

            for item in items:
                if not isinstance(item, dict):
                    continue

                name = item.get("name") or item.get("character_name") or item.get("title") or ""
                if not name:
                    continue

                name_lower = name.lower()
                if "overall_average" in name_lower or "overall average" in name_lower:
                    continue

                real_name = item.get("real_name") or name
                wiki_slug = item.get("wiki_slug") or item.get("slug") or item.get("id") or ScraperService.sanitize_filename(name)
                short_name = item.get("short_name") or ScraperService.sanitize_filename(name)

                raw_portrait = (
                    item.get("avatar_url")
                    or item.get("portrait_url")
                    or item.get("portrait")
                    or item.get("image")
                    or f"{short_name}.png"
                )

                if raw_portrait.startswith("http://") or raw_portrait.startswith("https://"):
                    avatar_url = raw_portrait
                else:
                    clean_portrait = raw_portrait.lstrip("/")
                    if clean_portrait.startswith("img/portraits/"):
                        avatar_url = f"https://cdn.nightlight.gg/{clean_portrait}"
                    elif clean_portrait.startswith("portraits/"):
                        avatar_url = f"https://cdn.nightlight.gg/img/{clean_portrait}"
                    else:
                        if not clean_portrait.endswith(".png") and "." not in clean_portrait:
                            clean_portrait = f"{clean_portrait}.png"
                        avatar_url = f"https://cdn.nightlight.gg/img/portraits/{clean_portrait}"

                sanitized = ScraperService.sanitize_filename(name)
                sub_dir = "survivors" if category == "Survivor" else "killers"
                local_path = f"avatars/{sub_dir}/{sanitized}.png"

                characters.append(
                    CharacterData(
                        name=name,
                        real_name=real_name,
                        wiki_slug=wiki_slug,
                        short_name=short_name,
                        category=category,
                        avatar_url=avatar_url,
                        avatar_local_path=local_path,
                    )
                )

        process_items(survivors_payload, "Survivor")
        process_items(killers_payload, "Killer")
        return characters

    def parse_nightlight_perks(
        self,
        chunk_js: str,
        stream_payload: str,
        characters: Optional[List[CharacterData]] = None,
        wiki_perks: Optional[List[PerkData]] = None,
    ) -> List[PerkData]:
        perks: List[PerkData] = []
        char_map: Dict[str, CharacterData] = {}
        if characters:
            for c in characters:
                char_map[c.name.lower()] = c
                char_map[c.short_name.lower()] = c
                char_map[c.wiki_slug.lower()] = c

        wiki_map: Optional[Dict[str, str]] = None
        if wiki_perks:
            wiki_map = {wp.name.lower(): wp.description for wp in wiki_perks if wp.name}

        descriptions: Dict[str, str] = {}
        if stream_payload:
            soup = BeautifulSoup(stream_payload, "html.parser")
            for el in soup.find_all(attrs={"data-perk": True}):
                pname = str(el["data-perk"]).replace("\\'", "'").replace('\\"', '"').strip()
                dtext = el.get_text(separator="\n", strip=True)
                if pname and dtext:
                    descriptions[pname] = dtext

            if not descriptions:
                for m in re.finditer(r'data-perk=["\']([^"\']+)["\'][^>]*>(.*?)(?=</div|<div|data-perk=|$)', stream_payload, re.DOTALL):
                    pname = m.group(1).replace("\\'", "'").replace('\\"', '"').strip()
                    dtext = BeautifulSoup(m.group(2), "html.parser").get_text(separator="\n", strip=True)
                    if pname and dtext:
                        descriptions[pname] = dtext

        raw_perks = []
        if isinstance(chunk_js, str):
            try:
                parsed = json.loads(chunk_js)
                if isinstance(parsed, list):
                    raw_perks = parsed
                elif isinstance(parsed, dict):
                    if "perks" in parsed or "data" in parsed:
                        raw_perks = parsed.get("perks") or parsed.get("data") or []
                    else:
                        raw_perks = [v for v in parsed.values() if isinstance(v, dict)]
            except Exception:
                pass

        if not raw_perks and isinstance(chunk_js, str):
            match = re.search(r'perks\s*:\s*(\[\s*\{.*?\}\s*\])', chunk_js, re.DOTALL)
            if match:
                try:
                    json_str = re.sub(r'(\b\w+\b)\s*:', r'"\1":', match.group(1))
                    json_str = re.sub(r':\s*\'([^\']*)\'', r': "\1"', json_str)
                    raw_perks = json.loads(json_str)
                except Exception:
                    pass

        if not raw_perks and isinstance(chunk_js, str):
            chars_dict = {}
            c_start = chunk_js.find('"10010":{"n":')
            if c_start != -1:
                for c_m in re.finditer(r'"(\d{4,5})":\s*(\{[^{}]*?"n"\s*:\s*"([^"]+)".*?\})', chunk_js):
                    cid = c_m.group(1)
                    cname = c_m.group(3)
                    chars_dict[cid] = cname

            seen_ids = set()
            for m in re.finditer(r'"(\d+)":\s*(\{[^{}]*?"n"\s*:\s*"([^"]+)".*?"u"\s*:\s*"/perks/([^"]+)".*?\})', chunk_js):
                pid = m.group(1)
                pname = m.group(3).replace('\\"', '"').replace("\\'", "'")
                u_slug = m.group(4)
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)

                obj_text = m.group(2)
                i_m = re.search(r'"i"\s*:\s*"([^"]+)"', obj_text)
                r_m = re.search(r'"r"\s*:\s*(\d+)', obj_text)
                c_m = re.search(r'"c"\s*:\s*(-?\d+)', obj_text)

                icon_slug = i_m.group(1) if i_m else ""
                role_num = int(r_m.group(1)) if r_m else 1
                char_id = c_m.group(1) if c_m else "-1"

                role_str = "Survivor" if role_num == 1 else "Killer"
                char_name = chars_dict.get(char_id, "General") if char_id != "-1" else "General"

                raw_perks.append({
                    "name": pname,
                    "character": char_name,
                    "role": role_str,
                    "icon": icon_slug,
                    "u": f"/perks/{u_slug}",
                })

        if not raw_perks and isinstance(chunk_js, str):
            for m in re.finditer(r'\{\s*(?:[^{}]*?name\s*:\s*["\'](?P<name>[^"\']+)["\'][^{}]*?)\}', chunk_js, re.DOTALL):
                obj_text = m.group(0)
                name_m = re.search(r'name\s*:\s*["\']([^"\']+)["\']', obj_text)
                char_m = re.search(r'character\s*:\s*["\']([^"\']+)["\']', obj_text)
                role_m = re.search(r'role\s*:\s*["\']?([^"\'\s,}]+)["\']?', obj_text)
                icon_m = re.search(r'icon\s*:\s*["\']([^"\']+)["\']', obj_text)
                if name_m:
                    raw_perks.append({
                        "name": name_m.group(1),
                        "character": char_m.group(1) if char_m else "General",
                        "role": role_m.group(1) if role_m else "Survivor",
                        "icon": icon_m.group(1) if icon_m else "",
                    })

        for item in raw_perks:
            if not isinstance(item, dict):
                continue

            name = item.get("name") or item.get("perk_name") or item.get("title") or item.get("n") or ""
            if not name:
                continue
            # Normalize perk names: fix literal escape sequences from JS chunk encoding
            name = str(name).replace("\\xA0", " ").replace("\\xa0", " ").replace("\\u00a0", " ")
            name = name.replace("\u00a0", " ").replace("\u2019", "'").replace("\u2018", "'")
            name = name.replace("\u2013", "-").replace("\u2014", "-")
            name = name.strip()

            u_val = item.get("u")
            if u_val is not None:
                u_str = str(u_val)
                if not (u_str.startswith("/perks/") or "/perks/" in u_str):
                    continue

            k_val = item.get("k")
            if k_val is not None:
                k_str = str(k_val).lower()
                if k_str in ["addon", "item"]:
                    continue

            role_val = str(item.get("role") or item.get("category") or "Survivor").lower()
            if role_val in ["survivor", "1", "s"]:
                category = "Survivor"
            elif role_val in ["killer", "2", "k"]:
                category = "Killer"
            else:
                category = "Survivor"

            desc = descriptions.get(name) or descriptions.get(name.replace("\\'", "'")) or ""
            if not desc and stream_payload:
                idx = stream_payload.find(name)
                if idx != -1:
                    snippet = stream_payload[idx:idx + 300]
                    desc = BeautifulSoup(snippet, "html.parser").get_text(separator="\n", strip=True)

            clean_desc = ScraperService.clean_description_text(desc)

            is_garbage = (
                not clean_desc
                or len(clean_desc) < 20
                or "unavailable" in clean_desc.lower()
                or "Survivor\n-" in clean_desc
                or "Killer\n-" in clean_desc
                or "This description is based on" in clean_desc
                or re.match(r'^[A-Za-z0-9_\'\s\-"]+\s+(?:Survivor|Killer)', clean_desc)
            )
            if is_garbage and wiki_map:
                wiki_val = wiki_map.get(name.lower())
                if wiki_val:
                    clean_desc = ScraperService.clean_description_text(wiki_val)

            char_input = item.get("character") or item.get("character_name") or item.get("owner") or "General"
            matched_char = char_map.get(str(char_input).lower())
            if not matched_char and str(char_input).lower() not in ["none", "all", "general"]:
                for c_k, c_v in char_map.items():
                    if c_k in str(char_input).lower() or str(char_input).lower() in c_k:
                        matched_char = c_v
                        break

            if wiki_perks:
                wp_match = next((wp for wp in wiki_perks if wp.name and wp.name.lower() == name.lower()), None)
                if wp_match and wp_match.character and wp_match.character.lower() not in ["none", "all", "general"]:
                    matched_char = char_map.get(wp_match.character.lower()) or char_map.get(wp_match.character.split()[-1].lower()) or matched_char

            if not matched_char:
                # Last resort: many perk flavor-text quotes are attributed to their
                # owning character (e.g. `"..." - Kwon Tae-young`), which lets us
                # recover the real owner when neither Nightlight nor the wiki tagged
                # it (this consistently happens for newly-added characters). If
                # Nightlight didn't have real flavor text at all, its fallback
                # snippet is often just a metadata caption ('Name\nRole\n-
                # Character') that clean_description_text() already stripped as
                # junk — check the raw text for that shape too.
                quoted_name = (
                    ScraperService.extract_quote_attribution(clean_desc)
                    or ScraperService.extract_header_caption_owner(desc)
                )
                if quoted_name:
                    matched_char = char_map.get(quoted_name.lower())
                    if not matched_char:
                        for c_k, c_v in char_map.items():
                            if c_k in quoted_name.lower() or quoted_name.lower() in c_k:
                                matched_char = c_v
                                break

            if matched_char:
                canonical_name = matched_char.name
                real_name = matched_char.real_name
                avatar_path = matched_char.avatar_local_path
            else:
                canonical_name = str(char_input) if char_input and char_input.lower() not in ["none", "all", "general"] else "General"
                real_name = canonical_name
                avatar_path = ""

            raw_icon = (
                item.get("icon")
                or item.get("icon_slug")
                or item.get("slug")
                or ScraperService.sanitize_filename(name)
            )

            if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                icon_url = raw_icon
            else:
                clean_icon = raw_icon.lstrip("/")
                if clean_icon.startswith("img/perks/"):
                    icon_url = f"https://cdn.nightlight.gg/{clean_icon}"
                elif clean_icon.startswith("perks/"):
                    icon_url = f"https://cdn.nightlight.gg/img/{clean_icon}"
                else:
                    if not clean_icon.endswith(".png") and "." not in clean_icon:
                        clean_icon = f"{clean_icon}.png"
                    icon_url = f"https://cdn.nightlight.gg/img/perks/{clean_icon}"

            sanitized_name = ScraperService.sanitize_filename(name)
            sanitized_char = ScraperService.sanitize_filename(canonical_name)
            category_dir = "survivors" if category == "Survivor" else "killers"
            if canonical_name == "General":
                local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
            else:
                local_rel_path = f"icons/{category_dir}/{sanitized_char}/{sanitized_name}.png"

            perks.append(
                PerkData(
                    name=name,
                    character=canonical_name,
                    character_real_name=real_name,
                    character_avatar_path=avatar_path,
                    category=category,
                    description=clean_desc,
                    icon_url=icon_url,
                    icon_local_path=local_rel_path,
                )
            )

        return perks

    def parse_nightlight_items_and_addons(
        self,
        chunk_js: str,
        stream_payload: str,
        characters: Optional[List[CharacterData]] = None,
    ) -> Tuple[List[ItemData], List[AddonData]]:
        items: List[ItemData] = []
        addons: List[AddonData] = []
        char_map: Dict[str, CharacterData] = {}
        if characters:
            for c in characters:
                char_map[c.name.lower()] = c
                char_map[c.short_name.lower()] = c
                char_map[c.wiki_slug.lower()] = c

        item_descriptions: Dict[str, str] = {}
        addon_descriptions: Dict[str, str] = {}
        descriptions: Dict[str, str] = {}

        if stream_payload:
            soup = BeautifulSoup(stream_payload, "html.parser")
            for el in soup.find_all(attrs={"data-item": True}):
                iname = str(el["data-item"]).replace("\'", "'").replace('\"', '"').strip()
                dtext = el.get_text(separator="\n", strip=True)
                if iname and dtext:
                    item_descriptions[iname] = dtext
            for el in soup.find_all(attrs={"data-addon": True}):
                aname = str(el["data-addon"]).replace("\'", "'").replace('\"', '"').strip()
                dtext = el.get_text(separator="\n", strip=True)
                if aname and dtext:
                    addon_descriptions[aname] = dtext

        raw_objects = []
        if isinstance(chunk_js, str):
            try:
                parsed = json.loads(chunk_js)
                if isinstance(parsed, list):
                    raw_objects = parsed
                elif isinstance(parsed, dict):
                    if "items" in parsed or "addons" in parsed or "data" in parsed:
                        raw_objects = (parsed.get("items") or []) + (parsed.get("addons") or []) + (parsed.get("data") or [])
                    else:
                        raw_objects = [v for v in parsed.values() if isinstance(v, dict)]
            except Exception:
                pass

        if not raw_objects and isinstance(chunk_js, str):
            seen_ids = set()
            for m in re.finditer(r'"(\d+)":\s*(\{[^{}]*?"n"\s*:\s*"([^"]+)".*?\})', chunk_js):
                pid = m.group(1)
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)
                obj_text = m.group(2)
                n_m = re.search(r'"n"\s*:\s*"([^"]+)"', obj_text)
                i_m = re.search(r'"i"\s*:\s*"([^"]+)"', obj_text)
                u_m = re.search(r'"u"\s*:\s*"([^"]*)"', obj_text)
                k_m = re.search(r'"k"\s*:\s*"([^"]*)"', obj_text)
                r_m = re.search(r'"r"\s*:\s*(\d+)', obj_text)
                c_m = re.search(r'"c"\s*:\s*(-?\d+|"[^"]*")', obj_text)
                rar_m = re.search(r'"rar(?:ity)?"\s*:\s*"([^"]*)"', obj_text)

                if n_m:
                    raw_objects.append({
                        "name": n_m.group(1).replace('\"', '"').replace("\'", "'"),
                        "icon": i_m.group(1) if i_m else "",
                        "u": u_m.group(1) if u_m else "",
                        "k": k_m.group(1) if k_m else "",
                        "role": int(r_m.group(1)) if r_m else 1,
                        "character": c_m.group(1).replace('"', '') if c_m else "General",
                        "rarity": rar_m.group(1) if rar_m else "",
                    })

        for entry in raw_objects:
            if not isinstance(entry, dict):
                continue
            name = entry.get("name") or entry.get("n") or entry.get("title") or ""
            if not name:
                continue

            u_val = str(entry.get("u") or "").lower()
            k_val = str(entry.get("k") or "").lower()

            is_item = u_val.startswith("/items/") or "/items/" in u_val or k_val == "item"
            is_addon = u_val.startswith("/addons/") or "/addons/" in u_val or k_val == "addon"

            role_val = str(entry.get("role") or entry.get("r") or "Survivor").lower()
            role_str = "Survivor" if role_val in ["survivor", "1", "s"] else "Killer"

            raw_icon = entry.get("icon") or entry.get("i") or entry.get("slug") or ScraperService.sanitize_filename(name)
            rarity = entry.get("rarity") or entry.get("rar") or ""

            if is_item:
                desc = item_descriptions.get(name) or descriptions.get(name) or ""
                if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                    icon_url = raw_icon
                else:
                    clean_icon = raw_icon.lstrip("/")
                    if not clean_icon.endswith(".png") and "." not in clean_icon:
                        clean_icon = f"{clean_icon}.png"
                    if clean_icon.startswith("img/items/"):
                        icon_url = f"https://cdn.nightlight.gg/{clean_icon}"
                    else:
                        icon_url = f"https://cdn.nightlight.gg/img/items/{clean_icon}"

                sanitized = ScraperService.sanitize_filename(name)
                items.append(
                    ItemData(
                        name=name,
                        category=role_str,
                        role=role_str,
                        description=desc,
                        icon_url=icon_url,
                        icon_local_path=f"icons/items/{sanitized}.png",
                        rarity=rarity,
                    )
                )

            elif is_addon:
                desc = addon_descriptions.get(name) or descriptions.get(name) or ""
                target_raw = entry.get("associated_target") or entry.get("c") or entry.get("character") or entry.get("target") or "General"
                matched_char = char_map.get(str(target_raw).lower())
                target_name = matched_char.name if matched_char else str(target_raw)

                if raw_icon.startswith("http://") or raw_icon.startswith("https://"):
                    icon_url = raw_icon
                else:
                    clean_icon = raw_icon.lstrip("/")
                    if not clean_icon.endswith(".png") and "." not in clean_icon:
                        clean_icon = f"{clean_icon}.png"
                    if clean_icon.startswith("img/addons/"):
                        icon_url = f"https://cdn.nightlight.gg/{clean_icon}"
                    else:
                        icon_url = f"https://cdn.nightlight.gg/img/addons/{clean_icon}"

                sanitized = ScraperService.sanitize_filename(name)
                addons.append(
                    AddonData(
                        name=name,
                        associated_target=target_name,
                        category=role_str,
                        description=desc,
                        icon_url=icon_url,
                        icon_local_path=f"icons/addons/{sanitized}.png",
                        rarity=rarity,
                    )
                )

        return items, addons

    def fetch_nightlight_perk_descriptions(self, perks: List[PerkData]) -> Dict[str, str]:
        """Fetch full perk description from each Nightlight perk page.
        Extracts from the active tab-pane div (current patch description) for complete, untruncated text.
        Falls back to meta description if the tab-pane content is unavailable."""
        GENERIC_MARKERS = [
            "Track DBD stats",
            "Dead by Daylight Stat Tracker",
            "Nightlight.gg",
            "custom icons",
        ]

        def name_to_slugs(name: str):
            """Generate candidate Nightlight URL slugs for a perk name.
            Nightlight uses original casing with spaces replaced by underscores,
            and URL-encodes special chars like apostrophes (%27), ampersands (&), etc.
            """
            import urllib.parse
            # Normalize unicode mojibake back to ASCII-safe chars
            clean = name.replace("\u2019", "'").replace("\u2018", "'").replace(
                "\u2013", "-").replace("\u2014", "-").replace("\u00a0", " ")
            # Handle literal escape sequences that appear as strings (encoding corruption)
            clean = clean.replace("\\xA0", " ").replace("\\xa0", " ").replace("\\u00a0", " ")

            candidates = []
            # Strategy 1: preserve casing, replace spaces with _, keep other chars
            s1 = re.sub(r" +", "_", clean)
            candidates.append(s1)

            # Strategy 2: URL-encode all non-alphanumeric non-underscore chars
            s2 = urllib.parse.quote(re.sub(r" +", "_", clean), safe="_-.")
            if s2 != s1:
                candidates.append(s2)

            # Strategy 3: strip all non-alphanum-underscore
            s3 = re.sub(r"[^a-zA-Z0-9_]+", "_", re.sub(r" +", "_", clean)).strip("_")
            if s3 not in candidates:
                candidates.append(s3)

            # Strategy 4: strip trailing punctuation (for "Come and Get Me!")
            s4 = re.sub(r"[^a-zA-Z0-9_]+", "_", re.sub(r" +", "_", clean.rstrip("!?."))).strip("_")
            if s4 not in candidates:
                candidates.append(s4)

            # Strategy 5: URL-encode the full name including non-breaking spaces (%C2%A0 etc.)
            raw_name = name  # use original bytes with unicode, not cleaned
            s5 = urllib.parse.quote(re.sub(r" ", "_", raw_name), safe="_-")
            if s5 not in candidates:
                candidates.append(s5)

            return candidates

        def fetch_one(name: str, slugs) -> Tuple[str, str]:
            for slug in slugs:
                url = f"https://nightlight.gg/perks/{slug}"
                try:
                    html_text = self.fetch_nightlight_data(url)
                    soup = BeautifulSoup(html_text, "html.parser")

                    # Verify we're on a real perk page (not the homepage)
                    meta = soup.find("meta", attrs={"name": "description"})
                    if meta and any(m in str(meta.get("content", "")) for m in GENERIC_MARKERS):
                        continue  # Homepage redirect — try next slug

                    # Extract full description from the ACTIVE tab panel.
                    # Nightlight shows description history as tabs; the current description
                    # is inside the tab-pane with class "active show".
                    full_desc = ""
                    active_pane = soup.find(
                        "div",
                        class_=lambda c: c and "tab-pane" in c and "active" in c and "show" in c,
                    )
                    if active_pane:
                        # First child div contains the description paragraphs
                        desc_div = active_pane.find("div", recursive=False)
                        if desc_div:
                            paragraphs = desc_div.find_all("p", recursive=False)
                            lines = []
                            for p in paragraphs:
                                text = p.get_text(" ", strip=True)
                                if text:
                                    lines.append(text)
                            full_desc = "\n".join(lines).strip()

                    # Fallback: use meta description (truncated but better than nothing)
                    if not full_desc and meta and meta.get("content"):
                        full_desc = str(meta["content"]).strip()
                        if any(m in full_desc for m in GENERIC_MARKERS):
                            full_desc = ""

                    if full_desc:
                        return name, full_desc
                except Exception:
                    pass
            return name, ""

        descriptions: Dict[str, str] = {}
        seen: set = set()
        tasks = []
        for perk in perks:
            key = perk.name.lower()
            if key not in seen:
                seen.add(key)
                tasks.append((perk.name, name_to_slugs(perk.name)))

        logger.info(f"Fetching Nightlight perk descriptions for {len(tasks)} perks...")
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = {executor.submit(fetch_one, name, slugs): name for name, slugs in tasks}
            for future in as_completed(futures):
                name, desc = future.result()
                if desc:
                    descriptions[name.lower()] = desc

        logger.info(f"Fetched Nightlight descriptions for {len(descriptions)}/{len(tasks)} perks.")
        return descriptions

    def scrape_all(self) -> Tuple[List[CharacterData], List[PerkData]]:
        logger.info("Scraping Nightlight.gg data...")
        survivors_raw = self.fetch_nightlight_data(self.SURVIVORS_API)
        killers_raw = self.fetch_nightlight_data(self.KILLERS_API)
        characters = self.parse_api_characters(survivors_raw, killers_raw)

        perks_page_html = self.fetch_nightlight_data(self.PERKS_LIST_URL)

        chunk_text = ""
        manifest_match = re.search(r'window\.__reactRouterManifest\s*=\s*(\{.*?\});', perks_page_html, re.DOTALL)
        if manifest_match:
            try:
                manifest = json.loads(manifest_match.group(1))
                for r_name, r_data in manifest.get("routes", {}).items():
                    for imp in r_data.get("imports", []):
                        if "chunk-" in imp:
                            try:
                                c_text = self.fetch_nightlight_data(f"https://nightlight.gg{imp}")
                                if '{"1":{"n":' in c_text or '"Sprint_Burst"' in c_text:
                                    chunk_text = c_text
                                    break
                            except Exception:
                                pass
                    if chunk_text:
                        break
            except Exception:
                pass

        # Use Wiki only for character-to-perk ownership mapping (not descriptions)
        wiki_perks = []
        try:
            wiki_driver = WikiScraperDriver(self.base_dir)
            wiki_html = wiki_driver.fetch_html(wiki_driver.PERKS_URL)
            wiki_perks = wiki_driver.parse_perks(wiki_html, characters)
        except Exception as w_err:
            logger.warning(f"Wiki perks lookup for character mapping failed: {w_err}")

        perks = self.parse_nightlight_perks(chunk_text, perks_page_html, characters=characters, wiki_perks=wiki_perks)

        # Fetch ALL perk descriptions directly from Nightlight individual perk pages
        nl_descriptions = self.fetch_nightlight_perk_descriptions(perks)
        enriched_perks = []
        for p in perks:
            nl_desc = nl_descriptions.get(p.name.lower(), "")
            if nl_desc:
                p.description = nl_desc
            enriched_perks.append(p)
        perks = enriched_perks

        items, addons = self.parse_nightlight_items_and_addons(chunk_text, perks_page_html, characters=characters)
        if len(items) < 5 or len(addons) < 5:
            try:
                wiki_driver = WikiScraperDriver(self.base_dir)
                if len(items) < 5:
                    w_items_html = wiki_driver.fetch_html(wiki_driver.ITEMS_URL)
                    items = wiki_driver.parse_wiki_items(w_items_html)
                if len(addons) < 5:
                    w_addons_html = wiki_driver.fetch_html(wiki_driver.ADDONS_URL)
                    addons = wiki_driver.parse_wiki_addons(w_addons_html)
            except Exception as w_err:
                logger.warning(f"Wiki fallback for items/addons failed: {w_err}")

        return characters, perks, items, addons


class WikiScraperDriver:
    PERKS_URL = "https://deadbydaylight.fandom.com/wiki/Perks"
    SURVIVORS_URL = "https://deadbydaylight.fandom.com/wiki/Survivors"
    KILLERS_URL = "https://deadbydaylight.fandom.com/wiki/Killers"
    ITEMS_URL = "https://deadbydaylight.fandom.com/wiki/Items"
    ADDONS_URL = "https://deadbydaylight.fandom.com/wiki/Add-ons"

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://deadbydaylight.fandom.com/wiki/Dead_by_Daylight_Wiki",
    }

    PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)
    ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}

    EXCLUDED_SLUGS = {
        "entity", "generator", "hatch", "chest", "item", "perk", "perks", "killers",
        "survivors", "tome", "observer", "vigo", "void", "stagger", "hook", "obsession",
        "blindness", "exhausted", "mangled", "broken", "exposed", "hindered", "oblivious",
        "aura", "scratch_marks", "pools_of_blood", "terror_radius", "basement",
        "exit_gate_switch", "skill_check", "loud_noise_notification", "conspicuous_action",
        "health_state", "injured_state", "protection_hit", "special_attack", "special_attacks",
        "crow", "window", "med-kit", "med-kits", "toolbox", "flashlight", "flashlights",
        "key", "keys", "add-on", "add-ons", "playing_survivor:_tips_and_tricks",
        "characters", "the_campfire", "status_effects", "realm", "realms", "map", "maps"
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)

    def fetch_html(self, url: str) -> str:
        try:
            response = requests.get(
                url,
                headers=self.HEADERS,
                impersonate=self.IMPERSONATE_BROWSER,
                verify=True,
                timeout=self.REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.text
        except Exception as err:
            err_msg = str(err).lower()
            if "certificate" in err_msg or "ssl" in err_msg or "curl: (60)" in err_msg:
                logger.warning(f"SSL certificate verification failed for {url}. Retrying with verify=False...")
                response = requests.get(
                    url,
                    headers=self.HEADERS,
                    impersonate=self.IMPERSONATE_BROWSER,
                    verify=False,
                    timeout=self.REQUEST_TIMEOUT,
                )
                response.raise_for_status()
                return response.text
            raise

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        characters: List[CharacterData] = []
        seen_slugs = set()

        def process_page(url: str, default_category: str):
            try:
                logger.info(f"Scraping {default_category} index page directly...")
                html = self.fetch_html(url)
                soup = BeautifulSoup(html, "html.parser")
                content = soup.find("div", class_="mw-parser-output") or soup

                for link in content.find_all("a", href=re.compile(r"^/wiki/")):
                    href = link.get("href", "")
                    slug = ScraperService.extract_slug_from_href(href)
                    slug_lower = slug.lower()

                    if not slug or slug_lower in seen_slugs or slug_lower in self.EXCLUDED_SLUGS:
                        continue

                    if slug.startswith(("Category:", "File:", "Special:", "Dead_by_Daylight", "Help:", "User:", "Template:", "Tome")):
                        continue

                    img = link.find("img")
                    if not img:
                        continue

                    avatar_url = ScraperService.extract_high_res_url(img)
                    if not avatar_url:
                        continue

                    filename = avatar_url.split("/revision")[0].rstrip("/").split("/")[-1]
                    match = PORTRAIT_PATTERN.match(filename)
                    if not match:
                        continue

                    category = "Killer" if match.group(1).upper() == "K" else "Survivor"
                    try:
                        release_number = int(match.group(2))
                    except ValueError:
                        release_number = 0

                    title = link.get("title", "").strip() or link.get_text().strip()
                    full_name = title.replace("_", " ").strip()
                    if not full_name or len(full_name) > 50:
                        continue

                    if any(x in slug_lower for x in ["perk", "item", "addon", "power", "patch", "dlc", "store", "tips", "bloodpoint"]):
                        continue

                    seen_slugs.add(slug_lower)
                    sanitized = ScraperService.sanitize_filename(full_name)
                    sub_dir = "survivors" if category == "Survivor" else "killers"

                    characters.append(
                        CharacterData(
                            name=full_name,
                            real_name=full_name,
                            wiki_slug=slug,
                            short_name=slug_lower,
                            category=category,
                            avatar_url=avatar_url,
                            avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                            release_number=release_number,
                        )
                    )
            except Exception as e:
                logger.error(f"Error scraping {default_category} page: {e}")

        process_page(self.SURVIVORS_URL, "Survivor")
        process_page(self.KILLERS_URL, "Killer")

        return characters

    CHARACTER_ALIASES = {
        "ash": "Ashley J. Williams",
        "ash williams": "Ashley J. Williams",
        "ashley williams": "Ashley J. Williams",
        "ashley j. williams": "Ashley J. Williams",
        "nancy": "Nancy Wheeler",
        "nancy wheeler": "Nancy Wheeler",
        "steve": "Steve Harrington",
        "steve harrington": "Steve Harrington",
        "bill": "William \"Bill\" Overbeck",
        "bill overbeck": "William \"Bill\" Overbeck",
        "william bill overbeck": "William \"Bill\" Overbeck",
        "william \"bill\" overbeck": "William \"Bill\" Overbeck",
        "quentin": "Quentin Smith",
        "quentin smith": "Quentin Smith",
        "tapp": "Detective Tapp",
        "detective tapp": "Detective Tapp",
        "david tapp": "Detective Tapp",
        "adam": "Adam Francis",
        "adam francis": "Adam Francis",
        "jeff": "Jeff Johansen",
        "jeff johansen": "Jeff Johansen",
        "jane": "Jane Romero",
        "jane romero": "Jane Romero",
        "yui": "Yui Kimura",
        "yui kimura": "Yui Kimura",
        "zarina": "Zarina Kassir",
        "zarina kassir": "Zarina Kassir",
        "cheryl": "Cheryl Mason",
        "heather": "Cheryl Mason",
        "cheryl mason": "Cheryl Mason",
        "felix": "Felix Richter",
        "felix richter": "Felix Richter",
        "elodie": "Elodie Rakoto",
        "élodie": "Elodie Rakoto",
        "elodie rakoto": "Elodie Rakoto",
        "élodie rakoto": "Elodie Rakoto",
        "yun-jin": "Lee Yun-Jin",
        "yun-jin lee": "Lee Yun-Jin",
        "yunjin": "Lee Yun-Jin",
        "yunjin lee": "Lee Yun-Jin",
        "lee yun-jin": "Lee Yun-Jin",
        "mikaela": "Mikaela Reid",
        "mikaela reid": "Mikaela Reid",
        "jonah": "Jonah Vasquez",
        "jonah vasquez": "Jonah Vasquez",
        "yoichi": "Yoichi Asakawa",
        "yoichi asakawa": "Yoichi Asakawa",
        "haddie": "Haddie Kaur",
        "haddie kaur": "Haddie Kaur",
        "ada": "Ada Wong",
        "ada wong": "Ada Wong",
        "rebecca": "Rebecca Chambers",
        "rebecca chambers": "Rebecca Chambers",
        "vittorio": "Vittorio Toscano",
        "vittorio toscano": "Vittorio Toscano",
        "thalita": "Thalita Lyra",
        "thalita lyra": "Thalita Lyra",
        "renato": "Renato Lyra",
        "renato lyra": "Renato Lyra",
        "gabriel": "Gabriel Soma",
        "gabriel soma": "Gabriel Soma",
        "nicolas": "Nicolas Cage",
        "nicolas cage": "Nicolas Cage",
        "ellen": "Ellen Ripley",
        "ellen ripley": "Ellen Ripley",
        "ripley": "Ellen Ripley",
        "sable": "Sable Ward",
        "sable ward": "Sable Ward",
        "estranho": "The Unknown",
        "alan": "Alan Wake",
        "alan wake": "Alan Wake",
        "lara": "Lara Croft",
        "lara croft": "Lara Croft",
        "trevor": "Trevor Belmont",
        "trevor belmont": "Trevor Belmont",
        "orela": "Orela Rose",
        "orela rose": "Orela Rose",
        "taurie": "Taurie Cain",
        "taurie cain": "Taurie Cain",
        "leon": "Leon S. Kennedy",
        "leon kennedy": "Leon S. Kennedy",
        "leon s. kennedy": "Leon S. Kennedy",
        "jill": "Jill Valentine",
        "jill valentine": "Jill Valentine",
        "aestri": "Aestri Yazar",
        "baermar": "Aestri Yazar",
        "aestri yazar": "Aestri Yazar",
        "baermar uraz": "Aestri Yazar",
        "aestri yazar & baermar uraz": "Aestri Yazar",
        "the troupe": "Aestri Yazar",
        "bard": "Aestri Yazar",
        "giri": "Giri",
        "trouster": "Trouster",
    }


    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        soup = BeautifulSoup(html_content, "html.parser")
        perks: List[PerkData] = []
        current_category: Optional[str] = None
        content_area = soup.find("div", class_="mw-parser-output") or soup

        char_by_slug = {}
        char_by_name = {}
        for c in characters:
            aliases = [c.name, c.real_name]
            if c.name:
                aliases.append(f"The {c.name}")
                if c.name.startswith("The "):
                    aliases.append(c.name[4:])
            for alias in aliases:
                if alias:
                    char_by_name.setdefault(alias.lower(), c)

            slugs = [c.wiki_slug]
            if c.wiki_slug and c.wiki_slug.startswith("The_"):
                slugs.append(c.wiki_slug[4:])
            elif c.wiki_slug:
                slugs.append(f"The_{c.wiki_slug}")
            for slug in slugs:
                if slug:
                    char_by_slug.setdefault(slug.lower(), c)

        char_by_short = {c.short_name.lower(): c for c in characters if c.short_name}

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                header_text = element.get_text().lower()
                if "survivor" in header_text:
                    current_category = "Survivor"
                elif "killer" in header_text:
                    current_category = "Killer"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                if not current_category:
                    continue

                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 3:
                        continue
                    try:
                        icon_tag = cells[0].find("img")
                        icon_url = ScraperService.extract_high_res_url(icon_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        perk_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()

                        cell_copy = BeautifulSoup(str(cells[2]), "html.parser")
                        for bold in cell_copy.find_all(["b", "strong"]):
                            bold.replace_with(f"**{bold.get_text().strip()}**")
                        for italic in cell_copy.find_all(["i", "em"]):
                            italic.replace_with(f"*{italic.get_text().strip()}*")
                        for li in cell_copy.find_all("li"):
                            li.replace_with(f"\n* {li.get_text().strip()}")
                        for br in cell_copy.find_all("br"):
                            br.replace_with("\n")
                        lines = [line.strip() for line in cell_copy.get_text().splitlines()]
                        raw_description = "\n".join(line for line in lines if line)
                        description = ScraperService.clean_description_text(raw_description)

                        canonical_name = "General"
                        real_name = "General"
                        avatar_path = ""

                        if len(cells) >= 4:
                            owner_cell = cells[3]
                            owner_link = owner_cell.find("a")

                            matched = None
                            if owner_link:
                                href = owner_link.get("href", "")
                                link_title = owner_link.get("title", "").strip().lower()
                                slug = ScraperService.extract_slug_from_href(href).lower()
                                alias_target = self.CHARACTER_ALIASES.get(link_title) or self.CHARACTER_ALIASES.get(slug)
                                if alias_target:
                                    matched = char_by_name.get(alias_target.lower())
                                if not matched:
                                    matched = char_by_slug.get(slug) or char_by_name.get(link_title) or char_by_short.get(link_title)

                            if not matched:
                                raw_text = owner_cell.get_text().strip()
                                clean_text = re.sub(r"^[.\s\-–]+|[.\s\-–]+$", "", raw_text).strip().lower()

                                if clean_text and clean_text not in ["all", "general", "none", "-", "all survivors", "all killers"]:
                                    alias_target = self.CHARACTER_ALIASES.get(clean_text)
                                    if alias_target:
                                        matched = char_by_name.get(alias_target.lower())
                                    if not matched:
                                        matched = char_by_short.get(clean_text) or char_by_name.get(clean_text) or char_by_slug.get(clean_text)
                                        if not matched:
                                            matched = char_by_name.get(f"the {clean_text}") or char_by_short.get(f"the {clean_text}")

                            if not matched:
                                quoted_name = ScraperService.extract_quote_attribution(description)
                                if quoted_name:
                                    quoted_lower = quoted_name.lower()
                                    matched = char_by_name.get(quoted_lower) or char_by_short.get(quoted_lower)
                                    if not matched:
                                        for c_k, c_v in char_by_name.items():
                                            if c_k in quoted_lower or quoted_lower in c_k:
                                                matched = c_v
                                                break

                            if matched:
                                canonical_name = matched.name
                                real_name = matched.real_name
                                avatar_path = matched.avatar_local_path

                        if not perk_name:
                            continue

                        sanitized_name = ScraperService.sanitize_filename(perk_name)
                        category_dir = "survivors" if current_category == "Survivor" else "killers"

                        if canonical_name == "General":
                            local_rel_path = f"icons/{category_dir}/General/{sanitized_name}.png"
                        else:
                            local_rel_path = f"icons/{category_dir}/{canonical_name}/{sanitized_name}.png"

                        perks.append(
                            PerkData(
                                name=perk_name,
                                character=canonical_name,
                                character_real_name=real_name,
                                character_avatar_path=avatar_path,
                                category=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_rel_path,
                            )
                        )
                    except Exception:
                        continue
        return perks


    def parse_wiki_items(self, html_content: str) -> List[ItemData]:
        soup = BeautifulSoup(html_content, "html.parser")
        items: List[ItemData] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_category = "Survivor"

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().lower()
                if "killer" in htext:
                    current_category = "Killer"
                elif "survivor" in htext:
                    current_category = "Survivor"

            elif element.name == "table" and "wikitable" in element.get("class", []):
                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = ScraperService.extract_high_res_url(img_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        item_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not item_name:
                            continue

                        name_lower = item_name.lower().strip()
                        HEADER_EXCLUSIONS = {
                            "uncommon items", "rare items", "very rare items", "ultra rare items",
                            "common items", "event items", "unused item", "limited items",
                            "survivor items", "killer items", "items", "add-ons", "addons", "equipment"
                        }
                        if name_lower in HEADER_EXCLUSIONS or name_lower.endswith(" items") or name_lower.endswith(" add-ons"):
                            continue

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        description = ScraperService.clean_description_text(description)

                        if not rarity:
                            for r_word in ["Ultra Rare", "Very Rare", "Rare", "Uncommon", "Common", "Event", "Iridescent"]:
                                if r_word.lower() in description.lower():
                                    rarity = r_word
                                    break

                        sanitized = ScraperService.sanitize_filename(item_name)
                        local_path = f"icons/items/{sanitized}.png"

                        items.append(
                            ItemData(
                                name=item_name,
                                category=current_category,
                                role=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return items

    def parse_wiki_addons(self, html_content: str) -> List[AddonData]:
        soup = BeautifulSoup(html_content, "html.parser")
        addons: List[AddonData] = []
        content_area = soup.find("div", class_="mw-parser-output") or soup
        current_target = "General"
        current_category = "Survivor"

        for element in content_area.find_all(["h1", "h2", "h3", "h4", "table"]):
            if element.name in ["h1", "h2", "h3", "h4"]:
                htext = element.get_text().strip()
                htext_lower = htext.lower()
                if "killer" in htext_lower:
                    current_category = "Killer"
                elif "survivor" in htext_lower:
                    current_category = "Survivor"

                target_clean = re.sub(r"\s+(?:Add-ons|Addons)$", "", htext, flags=re.IGNORECASE).strip()
                if target_clean and target_clean.lower() not in ["survivor", "killer", "general", "common", "uncommon", "rare", "very rare", "ultra rare"]:
                    current_target = target_clean

            elif element.name == "table" and "wikitable" in element.get("class", []):
                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    try:
                        img_tag = cells[0].find("img")
                        icon_url = ScraperService.extract_high_res_url(img_tag)

                        name_cell = cells[1]
                        name_link = name_cell.find("a")
                        addon_name = (name_link.get_text() if name_link else name_cell.get_text()).strip()
                        if not addon_name:
                            continue

                        rarity = ""
                        description = ""
                        if len(cells) >= 4:
                            rarity = cells[2].get_text().strip()
                            description = cells[3].get_text(separator="\n", strip=True)
                        elif len(cells) == 3:
                            description = cells[2].get_text(separator="\n", strip=True)

                        if not rarity:
                            for r_word in ["Ultra Rare", "Very Rare", "Rare", "Uncommon", "Common", "Event", "Iridescent"]:
                                if r_word.lower() in description.lower():
                                    rarity = r_word
                                    break

                        sanitized = ScraperService.sanitize_filename(addon_name)
                        local_path = f"icons/addons/{sanitized}.png"

                        addons.append(
                            AddonData(
                                name=addon_name,
                                associated_target=current_target,
                                category=current_category,
                                description=description,
                                icon_url=icon_url,
                                icon_local_path=local_path,
                                rarity=rarity,
                            )
                        )
                    except Exception:
                        continue
        return addons

    def scrape_all(self) -> Tuple[List[CharacterData], List[PerkData], List[ItemData], List[AddonData]]:
        logger.info("Scraping Fandom Wiki data...")
        characters = self.scrape_characters_dynamically()
        html = self.fetch_html(self.PERKS_URL)
        perks = self.parse_perks(html, characters)
        try:
            html_items = self.fetch_html(self.ITEMS_URL)
            items = self.parse_wiki_items(html_items)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki items: {e}")
            items = []
        try:
            html_addons = self.fetch_html(self.ADDONS_URL)
            addons = self.parse_wiki_addons(html_addons)
        except Exception as e:
            logger.warning(f"Failed to scrape wiki addons: {e}")
            addons = []
        return characters, perks, items, addons


class ScraperService:
    PERKS_URL = WikiScraperDriver.PERKS_URL
    SURVIVORS_URL = WikiScraperDriver.SURVIVORS_URL
    KILLERS_URL = WikiScraperDriver.KILLERS_URL

    IMPERSONATE_BROWSER = "chrome120"
    REQUEST_TIMEOUT = 30
    MAX_CONCURRENT_DOWNLOADS = 10

    HEADERS = WikiScraperDriver.HEADERS
    _lock = threading.Lock()
    _status: Dict[str, Any] = {
        "is_running": False,
        "progress": 0,
        "total": 0,
        "current_step": "idle",
        "last_run": None,
        "error": None,
        "fallback_used": False,
        "last_used_source": "nightlight",
    }

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
        self.base_dir = Path(base_dir)
        self.data_file = self.base_dir / "data" / "perks.json"
        self.characters_file = self.base_dir / "data" / "characters.json"
        self.items_file = self.base_dir / "data" / "items.json"
        self.addons_file = self.base_dir / "data" / "addons.json"
        self.maps_file = self.base_dir / "data" / "maps.json"
        self.config_file = self.base_dir / "data" / "scraper_config.json"
        self.static_dir = self.base_dir / "app" / "static"
        self.nightlight_driver = NightlightScraperDriver(self.base_dir)
        self.wiki_driver = WikiScraperDriver(self.base_dir)
        self.hens_map_driver = HensMapScraperDriver()
        self.samoel_map_driver = SamoelColtMapScraperDriver()

    def load_config(self) -> ScraperConfig:
        if not self.config_file.exists():
            return ScraperConfig()
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return ScraperConfig.from_dict(data)
        except Exception as e:
            logger.error(f"Error loading scraper config: {e}")
            return ScraperConfig()

    def save_config(self, data: Union[ScraperConfig, Dict[str, Any]]) -> ScraperConfig:
        if isinstance(data, ScraperConfig):
            config_obj = data
        elif isinstance(data, dict):
            current_dict = self.load_config().to_dict()
            current_dict.update(data)
            config_obj = ScraperConfig.from_dict(current_dict)
        else:
            raise ValueError("Data must be a ScraperConfig instance or a dict")

        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config_obj.to_dict(), f, indent=2, ensure_ascii=False)

        return config_obj

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        with cls._lock:
            return cls._status.copy()

    @classmethod
    def _update_status(cls, **kwargs) -> None:
        with cls._lock:
            cls._status.update(kwargs)

    @staticmethod
    def clean_description_text(text: str) -> str:
        if not text or not isinstance(text, str):
            return ""

        cleaned = re.sub(r"<[^>]+>", "", text)
        cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
        import html
        cleaned = html.unescape(cleaned)

        # Fix encoding artifacts from HTML text extraction:
        # U+FFFD (replacement char) is produced by BS4 for unknown curly quotes
        cleaned = cleaned.replace("\ufffd", '"')
        # "?" followed by capital or quote is often a garbled open-quote
        cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
        cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)

        # Normalize slash-separated perk value ranges: "5 / 4 / 3" -> "5/4/3"
        cleaned = re.sub(r'(\d+)(?:\s*/\s*(\d+))+', lambda m: re.sub(r'\s*/\s*', '/', m.group(0)), cleaned)

        # Normalize "50 %" -> "50%", "5 s" -> "5s", "60 m" -> "60m"
        cleaned = re.sub(r'(\d+)\s+(%)', r'\1\2', cleaned)
        cleaned = re.sub(r'(\d+)\s+(s|m)\b(?!\w)', r'\1\2', cleaned)

        # 1. Strip Wiki patch notice disclaimers (e.g. "This description is based on the changes announced for or featured in the upcoming Patch 8.1.0")
        cleaned = re.sub(
            r"This description is based on the changes announced for or featured in the upcoming Patch\s*[\d.]*",
            "",
            cleaned,
            flags=re.IGNORECASE
        )
        cleaned = re.sub(r"Unable to retrieve the Perk description.*$", "", cleaned, flags=re.IGNORECASE)

        # 2. Strip Nightlight header trash text e.g. "Autodidact" Autodidact\nSurvivor\n- Adam Francis"
        cleaned = re.sub(
            r'^[A-Za-z0-9_\'\s\-"]+\s+(?:Survivor|Killer)\s+-\s+[A-Za-z0-9_\'\s\-]+$',
            "",
            cleaned,
            flags=re.MULTILINE | re.IGNORECASE
        )

        lines = [line.strip() for line in cleaned.splitlines()]
        lines = [line for line in lines if line]

        # 3. Filter out lines that are just perk title or category headers
        filtered_lines = []
        for line in lines:
            if line.lower() in ["survivor", "killer", "survivor perk", "killer perk"] or re.match(r"^-\s*[A-Za-z0-9\s']+$", line) or re.match(r'^[A-Za-z0-9_\'\s\-"]+"\s+[A-Za-z0-9_\'\s\-"]+$', line):
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

        while len(lines) > 1 and lines[-1] in lines[:-1] and len(lines[-1]) < 80:
            lines.pop()

        result = "\n".join(lines).strip()
        if not result or result in ["<", ">", "&lt;", "&gt;"]:
            return "Perk description is currently unavailable in the database."

        return result

    _QUOTE_ATTRIBUTION_NON_NAMES = {"notebook", "unknown", "unknown, notebook"}

    @staticmethod
    def extract_quote_attribution(text: str) -> Optional[str]:
        """Pull the speaker's name from a flavor-text quote attribution at the
        end of a perk description, e.g. '"..." - Kwon Tae-young' -> 'Kwon Tae-young'.
        Used as a last-resort way to recover a perk's owning character when
        neither Nightlight nor the wiki tagged it (this consistently happens
        for newly-added characters the matching data hasn't caught up with)."""
        if not text:
            return None
        match = re.search(
            r'["”]\s*[-–—]\s*([A-Z][A-Za-z.\'’\-]+(?:\s+[A-Z][A-Za-z.\'’\-]+){0,3})\s*$',
            text.strip(),
        )
        if not match:
            return None
        candidate = match.group(1).strip()
        if candidate.lower() in ScraperService._QUOTE_ATTRIBUTION_NON_NAMES:
            return None
        return candidate

    @staticmethod
    def extract_header_caption_owner(raw_text: str) -> Optional[str]:
        """When Nightlight's real description lookup misses for a perk, the
        300-char fallback snippet sometimes lands on a metadata caption
        instead of flavor text, e.g. 'A Place For Us\\nSurvivor\\n- Kwon
        Tae-young'. clean_description_text() correctly discards that caption
        as junk, so pull the owning character out of it first, before it's
        thrown away — this is the only place the perk's owner is recorded
        for perks Nightlight has no real description for yet."""
        if not raw_text:
            return None
        match = re.search(
            r'(?:Survivor|Killer)\s*\n?\s*-\s*([A-Z][A-Za-z.\'’\-]+(?:\s+[A-Z][A-Za-z.\'’\-]+){0,3})',
            raw_text,
        )
        if not match:
            return None
        candidate = match.group(1).strip().rstrip("<>").strip()
        if candidate.lower() in ScraperService._QUOTE_ATTRIBUTION_NON_NAMES:
            return None
        return candidate

    @staticmethod
    def sanitize_filename(name: str) -> str:
        clean_str = name.lower().strip()
        clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
        clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
        clean_str = re.sub(r"_+", "_", clean_str)
        return clean_str.strip("_")

    @staticmethod
    def extract_high_res_url(img_tag: Optional[Tag]) -> str:
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
        high_res_url = re.sub(r"/scale-to-width-down/\d+", "", raw_url)
        if "/revision/latest" in high_res_url:
            high_res_url = high_res_url.split("/revision/latest")[0] + "/revision/latest"
        return high_res_url

    @staticmethod
    def extract_slug_from_href(href: str) -> str:
        if not href or "/wiki/" not in href:
            return ""
        raw_slug = href.split("/wiki/")[-1].split("#")[0].split("?")[0]
        return unquote(raw_slug).strip()

    @staticmethod
    def classify_portrait(image_url: str):
        """Return (category, release_number) when the image is a character portrait.

        Anything else — power icons, item icons, wiki concept images — returns None,
        which is how powers stop being mistaken for characters.
        """
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
            return None

        return category, release_number

    @staticmethod
    def normalise_character_name(title: str, category: str) -> str:
        """Killers lose their leading article; survivors keep their name intact."""
        clean = (title or "").strip()
        if category == "Killer" and clean.startswith("The "):
            return clean[4:].strip()
        return clean

    def fetch_html(self, url: str) -> str:
        return self.wiki_driver.fetch_html(url)

    def parse_character_page(self, html: str) -> List[CharacterData]:
        """Extract characters from a wiki index page.

        A link is a character only when its image is a portrait; the filename decides
        the category and release number, so it does not matter which index page the
        link was found on.
        """
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", class_="mw-parser-output") or soup

        characters: List[CharacterData] = []
        seen = set()

        for link in content.find_all("a", href=re.compile(r"^/wiki/")):
            img = link.find("img")
            if not img:
                continue

            image_url = self.extract_high_res_url(img)
            classified = self.classify_portrait(image_url)
            if not classified:
                continue

            category, release_number = classified

            title = (link.get("title") or "").strip() or link.get_text().strip()
            name = self.normalise_character_name(title, category)
            if not name:
                continue

            key = (category, name.lower())
            if key in seen:
                continue
            seen.add(key)

            slug = self.extract_slug_from_href(link.get("href", ""))
            sanitized = self.sanitize_filename(name)
            sub_dir = "survivors" if category == "Survivor" else "killers"

            characters.append(
                CharacterData(
                    name=name,
                    real_name=name,
                    wiki_slug=slug,
                    short_name=slug.lower(),
                    category=category,
                    avatar_url=image_url,
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=release_number,
                )
            )

        return characters

    def scrape_characters_dynamically(self) -> List[CharacterData]:
        return self.wiki_driver.scrape_characters_dynamically()

    def parse_perks(self, html_content: str, characters: List[CharacterData]) -> List[PerkData]:
        return self.wiki_driver.parse_perks(html_content, characters)

    async def _download_asset(
        self,
        client: AsyncSession,
        semaphore: asyncio.Semaphore,
        url: str,
        relative_path: str,
    ) -> None:
        if not url:
            return

        destination = self.static_dir / relative_path
        if destination.exists():
            with self._lock:
                self._status["progress"] += 1
            return

        destination.parent.mkdir(parents=True, exist_ok=True)

        async with semaphore:
            try:
                response = await client.get(url, headers=self.HEADERS, timeout=self.REQUEST_TIMEOUT)
                response.raise_for_status()
                destination.write_bytes(response.content)
            except Exception as err:
                logger.error(f"Download failed [{url}]: {err}")
            finally:
                with self._lock:
                    self._status["progress"] += 1

    async def download_all_assets_async(
        self,
        perks: List[PerkData],
        characters: List[CharacterData],
        items: Optional[List[ItemData]] = None,
        addons: Optional[List[AddonData]] = None,
        maps: Optional[List[MapData]] = None,
    ) -> None:
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
        async with AsyncSession(impersonate=self.IMPERSONATE_BROWSER, verify=False) as client:
            tasks = [
                self._download_asset(client, semaphore, perk.icon_url, perk.icon_local_path)
                for perk in perks
            ]
            for char in characters:
                if char.avatar_url:
                    tasks.append(
                        self._download_asset(client, semaphore, char.avatar_url, char.avatar_local_path)
                    )
            if items:
                for item in items:
                    if item.icon_url:
                        tasks.append(
                            self._download_asset(client, semaphore, item.icon_url, item.icon_local_path)
                        )
            if addons:
                for addon in addons:
                    if addon.icon_url:
                        tasks.append(
                            self._download_asset(client, semaphore, addon.icon_url, addon.icon_local_path)
                        )
            if maps:
                for m in maps:
                    if m.callout_image_url and m.callout_image_local_path:
                        tasks.append(
                            self._download_asset(client, semaphore, m.callout_image_url, m.callout_image_local_path)
                        )

            await asyncio.gather(*tasks)

    def _preserve_release_numbers(self, characters: List[CharacterData]) -> None:
        """Carry over release_number, code_prefix, and canonical DLC data from DB or canonical lookup."""
        db_release_map = {}
        try:
            if current_app:
                db_chars = db.session.scalars(select(Character)).all()
                for c in db_chars:
                    if c.release_number and c.release_number > 0:
                        db_release_map[c.name.lower().strip()] = (c.release_number, c.code_prefix)
        except Exception as e:
            logger.debug(f"Could not load release numbers from database: {e}")

        for character in characters:
            c_name = character.name.lower().strip()
            # 1. First check DB
            if c_name in db_release_map:
                rel_num, code_pref = db_release_map[c_name]
                if not character.release_number or character.release_number <= 0:
                    character.release_number = rel_num
                if not character.code_prefix:
                    character.code_prefix = code_pref
            # 2. Check canonical killer releases
            elif c_name in CANONICAL_KILLER_RELEASES:
                rel_num, code_pref = CANONICAL_KILLER_RELEASES[c_name]
                if not character.release_number or character.release_number <= 0:
                    character.release_number = rel_num
                if not character.code_prefix:
                    character.code_prefix = code_pref
            # 3. Check canonical survivor releases
            elif c_name in CANONICAL_SURVIVOR_RELEASES:
                rel_num, code_pref = CANONICAL_SURVIVOR_RELEASES[c_name]
                if not character.release_number or character.release_number <= 0:
                    character.release_number = rel_num
                if not character.code_prefix:
                    character.code_prefix = code_pref

            # Enrich DLC metadata
            dlc = CANONICAL_DLC_INFO.get(c_name)
            if not dlc:
                for alias_k, alias_v in self.CHARACTER_ALIASES.items():
                    if alias_k == c_name:
                        dlc = CANONICAL_DLC_INFO.get(alias_v.lower().strip())
                        break
            if dlc:
                if not character.chapter_name:
                    character.chapter_name = dlc.get("chapter_name")
                if not character.chapter_number:
                    character.chapter_number = dlc.get("chapter_number")
                if not character.dlc_type:
                    character.dlc_type = dlc.get("dlc_type")
                if not character.is_licensed:
                    character.is_licensed = dlc.get("is_licensed", False)
                if not character.release_year:
                    character.release_year = dlc.get("release_year")
                if not character.release_date:
                    character.release_date = dlc.get("release_date")
                if not character.dlc_counterparts:
                    character.dlc_counterparts = dlc.get("dlc_counterparts")
                if not character.lore:
                    character.lore = dlc.get("lore")

    def run_sync_pipeline(
        self,
        override_source: Optional[str] = None,
        override_fallback: Optional[bool] = None,
    ) -> Dict[str, int]:
        if self.get_status()["is_running"]:
            logger.warning("Scrape pipeline already running.")
            return {}

        config = self.load_config()
        active_source = override_source if override_source is not None else config.source
        active_fallback = override_fallback if override_fallback is not None else config.fallback_to_wiki

        self._update_status(
            is_running=True,
            progress=0,
            total=0,
            current_step="scraping_characters",
            error=None,
            fallback_used=False,
            last_used_source=active_source,
        )

        fallback_used = False
        source_used = active_source
        characters: List[CharacterData] = []
        perks: List[PerkData] = []
        items: List[ItemData] = []
        addons: List[AddonData] = []

        def unpack_res(res):
            if isinstance(res, tuple) and len(res) == 4:
                return res[0], res[1], res[2], res[3]
            elif isinstance(res, tuple) and len(res) == 2:
                return res[0], res[1], [], []
            return [], [], [], []

        try:
            # Step 1: Characters & Perks
            if active_source == "nightlight":
                try:
                    logger.info("Attempting to scrape via Nightlight driver...")
                    res = self.nightlight_driver.scrape_all()
                    characters, perks, items, addons = unpack_res(res)
                except Exception as nl_err:
                    logger.warning(f"Nightlight driver failed: {nl_err}")
                    if active_fallback:
                        logger.info("Falling back to Wiki driver...")
                        self._update_status(
                            current_step="falling_back_to_wiki",
                            fallback_used=True,
                        )
                        fallback_used = True
                        source_used = "wiki"
                        res = self.wiki_driver.scrape_all()
                        characters, perks, items, addons = unpack_res(res)
                    else:
                        raise nl_err
            else:
                logger.info("Scraping via Wiki driver...")
                res = self.wiki_driver.scrape_all()
                characters, perks, items, addons = unpack_res(res)
                source_used = "wiki"

            # Always scrape items/addons from Wiki if not already present
            if not items or not addons:
                try:
                    logger.info("Fetching items and addons from Wiki...")
                    self._update_status(current_step="scraping_items_addons")
                    wiki_items, wiki_addons = self.scrape_items_and_addons()
                    if not items:
                        items = wiki_items
                    if not addons:
                        addons = wiki_addons
                except Exception as e:
                    logger.error(f"Failed to scrape items/addons: {e}")

            # Post-processing
            self._preserve_release_numbers(characters)

            # Scrape Hens333 and SamoelColt Maps
            maps: List[MapData] = []
            try:
                logger.info("Scraping Hens333 maps...")
                hens_maps = self.hens_map_driver.scrape_maps()
                maps.extend(hens_maps)
            except Exception as map_err:
                logger.warning(f"Failed scraping Hens333 maps: {map_err}")

            try:
                logger.info("Scraping SamoelColt Steam Workshop maps...")
                samoel_maps = self.samoel_map_driver.scrape_maps()
                maps.extend(samoel_maps)
            except Exception as map_err:
                logger.warning(f"Failed scraping SamoelColt maps: {map_err}")

            # Atomically Upsert directly to PostgreSQL / SQLAlchemy Database
            db_sync_metrics = {}
            try:
                self._update_status(
                    current_step="seeding_database",
                )
                db_sync_metrics = self.sync_to_database(
                    characters=characters,
                    perks=perks,
                    items=items,
                    addons=addons,
                    maps=maps,
                )
            except Exception as db_err:
                logger.error(f"Error during atomic database upsert: {db_err}")

            total_downloads = len(perks) + sum(1 for c in characters if getattr(c, "avatar_url", None)) + len(items) + len(addons) + len(maps)
            self._update_status(
                current_step="downloading_assets",
                total=total_downloads,
                progress=0,
            )

            asyncio.run(self.download_all_assets_async(perks, characters, items=items, addons=addons, maps=maps))

            now_iso = datetime.now(timezone.utc).isoformat()
            self.save_config({
                "last_used_source": source_used,
                "last_run_timestamp": now_iso,
            })

            survivor_count = sum(1 for p in perks if getattr(p, "category", "") == "Survivor")
            killer_count = sum(1 for p in perks if getattr(p, "category", "") == "Killer")

            stats = {
                "status": "success",
                "characters_synced": len(characters),
                "perks_synced": len(perks),
                "total_perks": len(perks),
                "total_characters": len(characters),
                "survivors": survivor_count,
                "killers": killer_count,
                "total_items": len(items),
                "total_addons": len(addons),
            }
            stats.update(db_sync_metrics)

            self._update_status(
                is_running=False,
                current_step="completed",
                last_run=now_iso,
                last_used_source=source_used,
                fallback_used=fallback_used,
            )
            return stats

        except Exception as e:
            logger.error(f"Sync pipeline failed: {e}")
            self._update_status(
                is_running=False,
                current_step="failed",
                error=str(e),
            )
            raise

    def seed_canonical_characters(self) -> None:
        """Seed all canonical DBD characters with DLC and chapter metadata into the database."""
        canonical_list = [
            # Survivors
            ("Dwight Fairfield", "Dwight Fairfield", "Survivor", "dwight fairfield"),
            ("Meg Thomas", "Meg Thomas", "Survivor", "meg thomas"),
            ("Claudette Morel", "Claudette Morel", "Survivor", "claudette morel"),
            ("Jake Park", "Jake Park", "Survivor", "jake park"),
            ("Nea Karlsson", "Nea Karlsson", "Survivor", "nea karlsson"),
            ("Laurie Strode", "Laurie Strode", "Survivor", "laurie strode"),
            ("Ace Visconti", "Ace Visconti", "Survivor", "ace visconti"),
            ('William "Bill" Overbeck', 'William "Bill" Overbeck', "Survivor", 'william "bill" overbeck'),
            ("Feng Min", "Feng Min", "Survivor", "feng min"),
            ("David King", "David King", "Survivor", "david king"),
            ("Quentin Smith", "Quentin Smith", "Survivor", "quentin smith"),
            ("Detective David Tapp", "David Tapp", "Survivor", "detective tapp"),
            ("Kate Denson", "Kate Denson", "Survivor", "kate denson"),
            ("Adam Francis", "Adam Francis", "Survivor", "adam francis"),
            ("Jeff Johansen", "Jeff Johansen", "Survivor", "jeff johansen"),
            ("Jane Romero", "Jane Romero", "Survivor", "jane romero"),
            ("Ashley J. Williams", "Ashley J. Williams", "Survivor", "ashley j. williams"),
            ("Steve Harrington", "Steve Harrington", "Survivor", "steve harrington"),
            ("Nancy Wheeler", "Nancy Wheeler", "Survivor", "nancy wheeler"),
            ("Yui Kimura", "Yui Kimura", "Survivor", "yui kimura"),
            ("Zarina Kassir", "Zarina Kassir", "Survivor", "zarina kassir"),
            ("Cheryl Mason", "Cheryl Mason", "Survivor", "cheryl mason"),
            ("Felix Richter", "Felix Richter", "Survivor", "felix richter"),
            ("Élodie Rakoto", "Élodie Rakoto", "Survivor", "élodie rakoto"),
            ("Yun-Jin Lee", "Lee Yun-Jin", "Survivor", "yun-jin lee"),
            ("Leon S. Kennedy", "Leon S. Kennedy", "Survivor", "leon s. kennedy"),
            ("Jill Valentine", "Jill Valentine", "Survivor", "jill valentine"),
            ("Mikaela Reid", "Mikaela Reid", "Survivor", "mikaela reid"),
            ("Jonah Vasquez", "Jonah Vasquez", "Survivor", "jonah vasquez"),
            ("Yoichi Asakawa", "Yoichi Asakawa", "Survivor", "yoichi asakawa"),
            ("Haddie Kaur", "Haddie Kaur", "Survivor", "haddie kaur"),
            ("Ada Wong", "Ada Wong", "Survivor", "ada wong"),
            ("Rebecca Chambers", "Rebecca Chambers", "Survivor", "rebecca chambers"),
            ("Vittorio Toscano", "Vittorio Toscano", "Survivor", "vittorio toscano"),
            ("Thalita Lyra", "Thalita Lyra", "Survivor", "thalita lyra"),
            ("Renato Lyra", "Renato Lyra", "Survivor", "renato lyra"),
            ("Gabriel Soma", "Gabriel Soma", "Survivor", "gabriel soma"),
            ("Nicolas Cage", "Nicolas Cage", "Survivor", "nicolas cage"),
            ("Ellen Ripley", "Ellen Ripley", "Survivor", "ellen ripley"),
            ("Alan Wake", "Alan Wake", "Survivor", "alan wake"),
            ("Sable Ward", "Sable Ward", "Survivor", "sable ward"),
            ("Aestri Yazar", "Aestri Yazar", "Survivor", "aestri yazar"),
            ("Lara Croft", "Lara Croft", "Survivor", "lara croft"),
            ("Trevor Belmont", "Trevor Belmont", "Survivor", "trevor belmont"),
            ("Taurie Cain", "Taurie Cain", "Survivor", "taurie cain"),
            ("Orela Rose", "Orela Rose", "Survivor", "orela rose"),
            ("Rick Grimes", "Rick Grimes", "Survivor", "rick grimes"),
            ("Michonne Grimes", "Michonne Grimes", "Survivor", "michonne grimes"),
            ("Vee Boonyasak", "Vee Boonyasak", "Survivor", "vee boonyasak"),
            ("Eleven", "Eleven", "Survivor", "eleven"),
            ("Dustin Henderson", "Dustin Henderson", "Survivor", "dustin henderson"),
            ("Kwon Tae-young", "Kwon Tae-young", "Survivor", "kwon tae-young"),
            ("Shane Wiigwaas", "Shane Wiigwaas", "Survivor", "shane wiigwaas"),
            ("Aurora Stardotter", "Aurora Stardotter", "Survivor", "aurora stardotter"),
            # Killers (K01 - K44)
            ("The Trapper", "Evan MacMillan", "Killer", "the trapper"),
            ("The Wraith", "Philip Ojomo", "Killer", "the wraith"),
            ("The Hillbilly", "Max Thompson Jr.", "Killer", "the hillbilly"),
            ("The Nurse", "Sally Smithson", "Killer", "the nurse"),
            ("The Shape", "Michael Myers", "Killer", "the shape"),
            ("The Hag", "Lisa Sherwood", "Killer", "the hag"),
            ("The Doctor", "Herman Carter", "Killer", "the doctor"),
            ("The Huntress", "Anna", "Killer", "the huntress"),
            ("The Cannibal", "Bubba Sawyer", "Killer", "the cannibal"),
            ("The Nightmare", "Freddy Krueger", "Killer", "the nightmare"),
            ("The Pig", "Amanda Young", "Killer", "the pig"),
            ("The Clown", "Kenneth Chase", "Killer", "the clown"),
            ("The Spirit", "Rin Yamaoka", "Killer", "the spirit"),
            ("The Legion", "Frank, Julie, Susie, Joey", "Killer", "the legion"),
            ("The Plague", "Adiris", "Killer", "the plague"),
            ("The Ghost Face", "Danny Johnson", "Killer", "the ghost face"),
            ("The Demogorgon", "Demogorgon", "Killer", "the demogorgon"),
            ("The Oni", "Kazan Yamaoka", "Killer", "the oni"),
            ("The Deathslinger", "Caleb Quinn", "Killer", "the deathslinger"),
            ("The Executioner", "Pyramid Head", "Killer", "the executioner"),
            ("The Blight", "Talbot Grimes", "Killer", "the blight"),
            ("The Twins", "Charlotte & Victor Deshayes", "Killer", "the twins"),
            ("The Trickster", "Ji-Woon Hak", "Killer", "the trickster"),
            ("The Nemesis", "Nemesis T-Type", "Killer", "the nemesis"),
            ("The Cenobite", "Pinhead (Elliot Spencer)", "Killer", "the cenobite"),
            ("The Artist", "Carmina Mora", "Killer", "the artist"),
            ("The Onryō", "Sadako Yamamura", "Killer", "the onryō"),
            ("The Dredge", "The Dredge", "Killer", "the dredge"),
            ("The Mastermind", "Albert Wesker", "Killer", "the mastermind"),
            ("The Knight", "Tarhos Kovács", "Killer", "the knight"),
            ("The Skull Merchant", "Adriana Imai", "Killer", "the skull merchant"),
            ("The Singularity", "HUX-A7-13", "Killer", "the singularity"),
            ("The Xenomorph", "Xenomorph", "Killer", "the xenomorph"),
            ("The Good Guy", "Chucky (Charles Lee Ray)", "Killer", "the good guy"),
            ("The Unknown", "The Unknown", "Killer", "the unknown"),
            ("The Lich", "Vecna", "Killer", "the lich"),
            ("The Dark Lord", "Dracula (Vlad Tepes)", "Killer", "the dark lord"),
            ("The Houndmaster", "Portia Maye", "Killer", "the houndmaster"),
            ("The Ghoul", "Ken Kaneki", "Killer", "the ghoul"),
            ("The Animatronic", "Springtrap (William Afton)", "Killer", "the animatronic"),
            ("The Krasue", "Krasue", "Killer", "the krasue"),
            ("The Slasher", "Jason Voorhees", "Killer", "the slasher"),
            ("The First", "The First Killer", "Killer", "the first"),
            ("The Judgment", "The Grand Inquisitor", "Killer", "the judgment"),
        ]

        chars = []
        for display_name, real_name, role, key in canonical_list:
            dlc = CANONICAL_DLC_INFO.get(key, {})
            sub_dir = "survivors" if role == "Survivor" else "killers"
            slug = display_name.replace(" ", "_")
            sanitized = self.sanitize_filename(display_name)
            chars.append(
                CharacterData(
                    name=display_name,
                    real_name=real_name,
                    wiki_slug=slug,
                    short_name=key.lower(),
                    category=role,
                    avatar_url="",
                    avatar_local_path=f"avatars/{sub_dir}/{sanitized}.png",
                    release_number=dlc.get("release_number", 0),
                    code_prefix=dlc.get("code_prefix"),
                    chapter_name=dlc.get("chapter_name"),
                    chapter_number=dlc.get("chapter_number"),
                    dlc_type=dlc.get("dlc_type"),
                    is_licensed=dlc.get("is_licensed", False),
                    release_year=dlc.get("release_year"),
                    release_date=dlc.get("release_date"),
                    dlc_counterparts=dlc.get("dlc_counterparts"),
                    lore=dlc.get("lore"),
                )
            )
        self.sync_to_database(characters=chars, perks=[], items=[], addons=[], maps=[])

    def upsert_scraped_data_to_database(
        self,
        characters: List[Any],
        perks: List[Any],
        items: Optional[List[Any]] = None,
        addons: Optional[List[Any]] = None,
        maps: Optional[List[Any]] = None,
    ) -> Dict[str, int]:
        return self.sync_to_database(characters, perks, items, addons, maps)

    def sync_to_database(
        self,
        characters: List[Any],
        perks: List[Any],
        items: Optional[List[Any]] = None,
        addons: Optional[List[Any]] = None,
        maps: Optional[List[Any]] = None,
    ) -> Dict[str, int]:
        """Atomically upsert characters, perks, items, addons, and maps using standard SQLAlchemy ORM (PostgreSQL & SQLite compatible)."""
        items = items or []
        addons = addons or []
        maps = maps or []

        # 1. Upsert Characters
        if characters:
            existing_chars = {c.name.lower().strip(): c for c in db.session.scalars(select(Character)).all()}
            for c in characters:
                role = getattr(c, "category", None) or getattr(c, "role", "Survivor")
                portrait = getattr(c, "avatar_url", "")
                code_prefix = getattr(c, "code_prefix", None)
                if not code_prefix and portrait:
                    m = PORTRAIT_PATTERN.search(portrait.split("/")[-1])
                    if m:
                        code_prefix = f"{m.group(1)}{m.group(2)}"

                c_name = c.name.strip()
                c_name_lower = c_name.lower()
                dlc = CANONICAL_DLC_INFO.get(c_name_lower, {})

                existing_char = existing_chars.get(c_name_lower)

                if existing_char:
                    existing_char.role = role
                    if code_prefix or dlc.get("code_prefix"):
                        existing_char.code_prefix = code_prefix or dlc.get("code_prefix")
                    if portrait:
                        existing_char.portrait_url = portrait
                    if getattr(c, "real_name", None):
                        existing_char.real_name = c.real_name
                    if getattr(c, "short_name", None):
                        existing_char.short_name = c.short_name
                    if getattr(c, "wiki_slug", None):
                        existing_char.wiki_slug = c.wiki_slug
                    if getattr(c, "avatar_local_path", None):
                        existing_char.avatar_local_path = c.avatar_local_path
                    if dlc.get("release_number"):
                        existing_char.release_number = dlc.get("release_number")
                    if dlc.get("chapter_name"):
                        existing_char.chapter_name = dlc.get("chapter_name")
                    if dlc.get("chapter_number"):
                        existing_char.chapter_number = dlc.get("chapter_number")
                    if dlc.get("dlc_type"):
                        existing_char.dlc_type = dlc.get("dlc_type")
                    if "is_licensed" in dlc:
                        existing_char.is_licensed = dlc.get("is_licensed")
                    if dlc.get("release_year"):
                        existing_char.release_year = dlc.get("release_year")
                    if dlc.get("release_date"):
                        existing_char.release_date = dlc.get("release_date")
                    if dlc.get("dlc_counterparts"):
                        existing_char.dlc_counterparts = dlc.get("dlc_counterparts")
                    if dlc.get("lore"):
                        existing_char.lore = dlc.get("lore")
                else:
                    new_char = Character(
                        name=c_name,
                        role=role,
                        code_prefix=code_prefix or dlc.get("code_prefix"),
                        portrait_url=portrait or "",
                        real_name=getattr(c, "real_name", c_name) or c_name,
                        short_name=getattr(c, "short_name", "") or "",
                        wiki_slug=getattr(c, "wiki_slug", "") or "",
                        avatar_local_path=getattr(c, "avatar_local_path", "") or "",
                        release_number=getattr(c, "release_number", None) or dlc.get("release_number"),
                        chapter_name=getattr(c, "chapter_name", None) or dlc.get("chapter_name"),
                        chapter_number=getattr(c, "chapter_number", None) or dlc.get("chapter_number"),
                        dlc_type=getattr(c, "dlc_type", None) or dlc.get("dlc_type"),
                        is_licensed=getattr(c, "is_licensed", False) or dlc.get("is_licensed", False),
                        release_year=getattr(c, "release_year", None) or dlc.get("release_year"),
                        release_date=getattr(c, "release_date", None) or dlc.get("release_date"),
                        dlc_counterparts=getattr(c, "dlc_counterparts", None) or dlc.get("dlc_counterparts"),
                        lore=getattr(c, "lore", None) or dlc.get("lore"),
                    )
                    db.session.add(new_char)
                    existing_chars[c_name_lower] = new_char
            db.session.commit()

        # Query all characters to map name/alias -> character_id
        db_chars = db.session.scalars(select(Character)).all()
        char_lookup = {}
        for c in db_chars:
            char_lookup[c.name.lower().strip()] = c.id
            if c.real_name:
                char_lookup[c.real_name.lower().strip()] = c.id
            if c.wiki_slug:
                char_lookup[c.wiki_slug.lower().strip()] = c.id
            if c.short_name:
                char_lookup[c.short_name.lower().strip()] = c.id

        # 2. Upsert Perks
        if perks:
            existing_perks = {p.name.lower().strip(): p for p in db.session.scalars(select(Perk)).all()}
            for p in perks:
                char_name = getattr(p, "character", None) or ""
                matched_char_id = None
                if char_name and char_name.lower().strip() not in ["none", "all", "general"]:
                    matched_char_id = char_lookup.get(char_name.lower().strip())
                    if not matched_char_id:
                        for c_key, c_id in char_lookup.items():
                            if c_key in char_name.lower().strip() or char_name.lower().strip() in c_key:
                                matched_char_id = c_id
                                break

                is_teachable = (matched_char_id is not None)
                desc = self.clean_description_text(getattr(p, "description", ""))
                p_name = p.name.strip()
                p_name_lower = p_name.lower()

                existing_perk = existing_perks.get(p_name_lower)

                if existing_perk:
                    existing_perk.category = getattr(p, "category", "Survivor")
                    existing_perk.is_teachable = is_teachable
                    existing_perk.description = desc
                    if getattr(p, "icon_url", None):
                        existing_perk.icon_url = p.icon_url
                    if getattr(p, "icon_local_path", None):
                        existing_perk.icon_local_path = p.icon_local_path
                    if matched_char_id is not None:
                        existing_perk.character_id = matched_char_id
                else:
                    new_perk = Perk(
                        name=p_name,
                        category=getattr(p, "category", "Survivor"),
                        is_teachable=is_teachable,
                        description=desc,
                        icon_url=getattr(p, "icon_url", "") or "",
                        icon_local_path=getattr(p, "icon_local_path", "") or "",
                        character_id=matched_char_id,
                    )
                    db.session.add(new_perk)
                    existing_perks[p_name_lower] = new_perk
            db.session.commit()

        # 3. Upsert Items
        if items:
            existing_items = {i.name.lower().strip(): i for i in db.session.scalars(select(Item)).all()}
            for item in items:
                i_name = item.name.strip()
                i_name_lower = i_name.lower()
                existing_item = existing_items.get(i_name_lower)

                desc = self.clean_description_text(getattr(item, "description", ""))
                if existing_item:
                    existing_item.category = getattr(item, "category", "")
                    existing_item.role = getattr(item, "role", "Survivor")
                    existing_item.description = desc
                    if getattr(item, "icon_url", None):
                        existing_item.icon_url = item.icon_url
                    if getattr(item, "icon_local_path", None):
                        existing_item.icon_local_path = item.icon_local_path
                    if getattr(item, "rarity", None):
                        existing_item.rarity = item.rarity
                else:
                    new_item = Item(
                        name=i_name,
                        category=getattr(item, "category", ""),
                        role=getattr(item, "role", "Survivor"),
                        description=desc,
                        icon_url=getattr(item, "icon_url", "") or "",
                        icon_local_path=getattr(item, "icon_local_path", "") or "",
                        rarity=getattr(item, "rarity", "") or "",
                    )
                    db.session.add(new_item)
                    existing_items[i_name_lower] = new_item
            db.session.commit()

        # 4. Upsert Addons
        if addons:
            existing_addons = {a.name.lower().strip(): a for a in db.session.scalars(select(Addon)).all()}
            for addon in addons:
                a_name = addon.name.strip()
                a_name_lower = a_name.lower()
                existing_addon = existing_addons.get(a_name_lower)

                desc = self.clean_description_text(getattr(addon, "description", ""))
                if existing_addon:
                    existing_addon.associated_target = getattr(addon, "associated_target", "") or ""
                    existing_addon.category = getattr(addon, "category", "")
                    existing_addon.description = desc
                    if getattr(addon, "icon_url", None):
                        existing_addon.icon_url = addon.icon_url
                    if getattr(addon, "icon_local_path", None):
                        existing_addon.icon_local_path = addon.icon_local_path
                    if getattr(addon, "rarity", None):
                        existing_addon.rarity = addon.rarity
                else:
                    new_addon = Addon(
                        name=a_name,
                        associated_target=getattr(addon, "associated_target", "") or "",
                        category=getattr(addon, "category", ""),
                        description=desc,
                        icon_url=getattr(addon, "icon_url", "") or "",
                        icon_local_path=getattr(addon, "icon_local_path", "") or "",
                        rarity=getattr(addon, "rarity", "") or "",
                    )
                    db.session.add(new_addon)
                    existing_addons[a_name_lower] = new_addon
            db.session.commit()

        return {
            "characters_synced": len(characters),
            "perks_synced": len(perks),
            "items_synced": len(items),
            "addons_synced": len(addons),
        }