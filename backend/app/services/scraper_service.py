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

# Wiki portraits are named K01_TheTrapper_Portrait.png / S07_AceVisconti_Portrait.png.
# The prefix letter is the role and the digits are the release number, which makes the
# filename the only reliable way to tell a character from a power or an item.
PORTRAIT_PATTERN = re.compile(r"^(K|S)(\d+)_.*_Portrait", re.ASCII)

ROLE_BY_PREFIX = {"K": "Killer", "S": "Survivor"}

TEACHABLE_PERK_OVERRIDE = {
    "flow state": "Kwon Tae-young",
    "a place for us": "Kwon Tae-young",
    "five moves ahead": "Kwon Tae-young",
    "fruits of your labor": "Aurora Stardotter",
    "salvation's cry": "Aurora Stardotter",
    "boon: steadfast": "Aurora Stardotter",
    "do no harm": "Orela Rose",
    "duty of care": "Orela Rose",
    "rapid response": "Orela Rose",
    "apocalyptic ingenuity": "Rick Grimes",
    "come and get me!": "Rick Grimes",
    "teamwork: toughen up": "Rick Grimes",
    "conviction": "Michonne Grimes",
    "last stand": "Michonne Grimes",
    "teamwork: throw down": "Michonne Grimes",
    "road life": "Vee Boonyasak",
    "one-two-three-four!": "Vee Boonyasak",
    "ghost notes": "Vee Boonyasak",
    "bada bada boom": "Dustin Henderson",
    "change of plan": "Dustin Henderson",
    "teamwork: full circuit": "Dustin Henderson",
    "extrasensory perception": "Eleven",
    "we see you": "Eleven",
    "teamwork: soft-spoken": "Eleven",
    "wide open throttle": "Shane Wiigwaas",
    "lend a hand": "Shane Wiigwaas",
    "cross-examination": "Shane Wiigwaas",
}

KILLER_REAL_NAMES = {
    "The Trapper": "Evan MacMillan",
    "The Wraith": "Philip Ojomo",
    "The Hillbilly": "Max Thompson Jr.",
    "The Nurse": "Sally Smithson",
    "The Shape": "Michael Myers",
    "The Hag": "Lisa Sherwood",
    "The Doctor": "Herman Carter",
    "The Huntress": "Anna",
    "The Cannibal": "Bubba Sawyer",
    "The Nightmare": "Freddy Krueger",
    "The Pig": "Amanda Young",
    "The Clown": "Kenneth Chase",
    "The Spirit": "Rin Yamaoka",
    "The Legion": "Frank, Julie, Susie, Joey",
    "The Plague": "Adiris",
    "The Ghost Face": "Danny Johnson",
    "The Demogorgon": "Demogorgon",
    "The Deathslinger": "Caleb Quinn",
    "The Executioner": "Pyramid Head",
    "The Oni": "Kazan Yamaoka",
    "The Blight": "Talbot Grimes",
    "The Twins": "Charlotte & Victor Deshayes",
    "The Trickster": "Ji-Woon Hak",
    "The Cenobite": "Elliot Spencer",
    "The Artist": "Carmina Mora",
    "The Onryō": "Sadako Yamamura",
    "The Dredge": "The Dredge",
    "The Mastermind": "Albert Wesker",
    "The Knight": "Tarhos Kovács",
    "The Skull Merchant": "Adriana Imai",
    "The Singularity": "HUX-A7-13",
    "The Xenomorph": "Xenomorph",
    "The Good Guy": "Charles Lee Ray",
    "The Unknown": "The Unknown",
    "The Lich": "Vecna",
    "The Dark Lord": "Dracula",
    "The Animatronic": "Springtrap"
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


MAP_LANDMARKS_DB: Dict[str, Dict[str, str]] = {
    # Autohaven
    "azarovsrestingplace": {
        "twelve_o_clock": "Azarov's Office & Garage / North Exit Gate",
        "three_o_clock": "East Tree Cluster / Long Wall Pallet Tile",
        "six_o_clock": "Killer Shack & Basement / South Exit Gate",
        "nine_o_clock": "Car Crusher Crane / Scrap Pallet Gym",
        "center": "Center Chokepoint / Spine Generator",
        "description": "Azarov's Resting Place dumbbell map divided by a narrow middle chokepoint.",
    },
    "bloodlodge": {
        "twelve_o_clock": "Blood Lodge Main Building / North Spawn",
        "three_o_clock": "East Jungle Gyms / High Pallet Density Area",
        "six_o_clock": "Killer Shack & Basement / South Gate",
        "nine_o_clock": "Car Crusher / Scrap Metal Piles",
        "center": "Central Crane / Tree Loop Generator",
        "description": "Blood Lodge expansive junkyard renowned for high pallet loop density.",
    },
    "gasheaven": {
        "twelve_o_clock": "Gas Station & Auto Repair Shop (Gen Door Vault)",
        "three_o_clock": "East Car Wall Loops / Scrap Yard",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "West Jungle Gym & Long Wall Tiles",
        "center": "Central Scrap Heap & Flatbed Truck",
        "description": "Gas Heaven feature map with an interactive service garage door.",
    },
    "wreckersyard": {
        "twelve_o_clock": "North Crane / Scrap Car Stacks",
        "three_o_clock": "East Pallet Gym / Tree Loop",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "West L-T Wall / Four-Wall Gym",
        "center": "Central Car Compactor / Open Spine Gen",
        "description": "Wreckers' Yard open scrapyard without a dedicated main building.",
    },
    "wretchedshop": {
        "twelve_o_clock": "Wretched Shop Garage / Vault Window",
        "three_o_clock": "East Car Wall Maze / Generator Cluster",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "West Scrap Crane / L-T Walls",
        "center": "Central Tree / High Pallet Corridor",
        "description": "Wretched Shop automotive maintenance garage with strong window vaults.",
    },
    # Backwater Swamp
    "thepalerose": {
        "twelve_o_clock": "The Pale Rose Steamboat / Upper Deck & Wheelhouse",
        "three_o_clock": "East Boardwalk Pier / Reed Thicket",
        "six_o_clock": "Killer Shack / South Swamp Gate",
        "nine_o_clock": "West Willow Tree / Stilt Platform Loop",
        "center": "Sunken Wreck / Marsh Generator",
        "description": "The Pale Rose multi-deck river steamboat stranded amidst foggy reeds.",
    },
    "grimpantry": {
        "twelve_o_clock": "Grim Pantry Stilt House / Drop Vault & Pantry Basement",
        "three_o_clock": "East Pier / High Water Boardwalk Shacks",
        "six_o_clock": "Killer Shack / South Swamp Gate",
        "nine_o_clock": "West Wooden Maze / Reed Loops",
        "center": "Central Sunken Boat / Low Marsh Clearing",
        "description": "Grim Pantry elevated stilt lodge with basement vaults and extensive wooden boardwalks.",
    },
    # Badham / Springwood
    "preschooli": {
        "twelve_o_clock": "Badham Elementary / Boiler Room Basement",
        "three_o_clock": "East 2-Story House / House of Pain",
        "six_o_clock": "Killer Shack / South Suburb Gate",
        "nine_o_clock": "West Street Cars / White Fence Loop",
        "center": "Preschool Front Courtyard / Parked Cars",
        "description": "Badham Preschool I layout with boiler basement under the school.",
    },
    "badhampreschooli": {
        "twelve_o_clock": "Badham Elementary / Boiler Room Basement",
        "three_o_clock": "East 2-Story House / House of Pain",
        "six_o_clock": "Killer Shack / South Suburb Gate",
        "nine_o_clock": "West Street Cars / White Fence Loop",
        "center": "Preschool Front Courtyard / Parked Cars",
        "description": "Badham Preschool I layout with boiler basement under the school.",
    },
    "preschoolii": {
        "twelve_o_clock": "Preschool Main Entrance / Schoolyard",
        "three_o_clock": "East House of Pain / Backyard Fences",
        "six_o_clock": "Killer Shack / South Fence Gate",
        "nine_o_clock": "West 2-Story Residence / Porch Vault",
        "center": "Central Street / Abandoned Van Generator",
        "description": "Badham Preschool II variant repositioning residential houses.",
    },
    "badhampreschoolii": {
        "twelve_o_clock": "Preschool Main Entrance / Schoolyard",
        "three_o_clock": "East House of Pain / Backyard Fences",
        "six_o_clock": "Killer Shack / South Fence Gate",
        "nine_o_clock": "West 2-Story Residence / Porch Vault",
        "center": "Central Street / Abandoned Van Generator",
        "description": "Badham Preschool II variant repositioning residential houses.",
    },
    "preschooliii": {
        "twelve_o_clock": "Preschool Building / Boiler Basement",
        "three_o_clock": "East Suburb Cul-de-sac / Corner House",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Playpark / Jungle Gym",
        "center": "Central Crossroad / Generator",
        "description": "Badham Preschool III featuring a corner cul-de-sac and playground.",
    },
    "badhampreschooliii": {
        "twelve_o_clock": "Preschool Building / Boiler Basement",
        "three_o_clock": "East Suburb Cul-de-sac / Corner House",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Playpark / Jungle Gym",
        "center": "Central Crossroad / Generator",
        "description": "Badham Preschool III featuring a corner cul-de-sac and playground.",
    },
    "preschooliiiv": {
        "twelve_o_clock": "Preschool Main Structure / Boiler Room",
        "three_o_clock": "East 2-Story House / Corner Loop",
        "six_o_clock": "Killer Shack / South Street Gate",
        "nine_o_clock": "West Playground / Fence Maze",
        "center": "Suburban Street / Service Truck",
        "description": "Badham Preschool IV variant featuring balanced suburban streets.",
    },
    "preschooliv": {
        "twelve_o_clock": "Preschool Main Structure / Boiler Room",
        "three_o_clock": "East 2-Story House / Corner Loop",
        "six_o_clock": "Killer Shack / South Street Gate",
        "nine_o_clock": "West Playground / Fence Maze",
        "center": "Suburban Street / Service Truck",
        "description": "Badham Preschool IV variant featuring balanced suburban streets.",
    },
    "badhampreschooliv": {
        "twelve_o_clock": "Preschool Main Structure / Boiler Room",
        "three_o_clock": "East 2-Story House / Corner Loop",
        "six_o_clock": "Killer Shack / South Street Gate",
        "nine_o_clock": "West Playground / Fence Maze",
        "center": "Suburban Street / Service Truck",
        "description": "Badham Preschool IV variant featuring balanced suburban streets.",
    },
    "preschoolv": {
        "twelve_o_clock": "Preschool Facility / Basement Lab",
        "three_o_clock": "East House / Garage Vault",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "West Residential Driveway / Cars",
        "center": "School Playground / Central Fence Gen",
        "description": "Badham Preschool V variant offering wide open street sightlines.",
    },
    "badhampreschoolv": {
        "twelve_o_clock": "Preschool Facility / Basement Lab",
        "three_o_clock": "East House / Garage Vault",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "West Residential Driveway / Cars",
        "center": "School Playground / Central Fence Gen",
        "description": "Badham Preschool V variant offering wide open street sightlines.",
    },
    # Coldwind Farm
    "fracturedcowshed": {
        "twelve_o_clock": "Fractured Cowshed / God Window Vault & Pen",
        "three_o_clock": "East Cornfield Maze / Windmill",
        "six_o_clock": "Killer Shack / South Farm Gate",
        "nine_o_clock": "Harvester Tractor / Combine Ramp",
        "center": "Cattle Silo / Central Hay Bale Cluster",
        "description": "Fractured Cowshed famous for the strong barn window vault.",
    },
    "rancidabattoir": {
        "twelve_o_clock": "Meat Slaughterhouse / Pig Hooks & Chute Vault",
        "three_o_clock": "East Combine Harvester / Hay Cart",
        "six_o_clock": "Killer Shack / South Farm Gate",
        "nine_o_clock": "West Corn Maze / Tall Stalks",
        "center": "Central Silo / Windmill Generator",
        "description": "Rancid Abattoir meat slaughtering facility filled with carcass hooks.",
    },
    "rancidabbatoir": {
        "twelve_o_clock": "Meat Slaughterhouse / Pig Hooks & Chute Vault",
        "three_o_clock": "East Combine Harvester / Hay Cart",
        "six_o_clock": "Killer Shack / South Farm Gate",
        "nine_o_clock": "West Corn Maze / Tall Stalks",
        "center": "Central Silo / Windmill Generator",
        "description": "Rancid Abattoir meat slaughtering facility filled with carcass hooks.",
    },
    "rottenfields": {
        "twelve_o_clock": "North Combine Harvester / Ramp Loop",
        "three_o_clock": "East Cornfield / Four-Wall Pallet Gym",
        "six_o_clock": "Killer Shack / South Farm Gate",
        "nine_o_clock": "West Windmill / Hay Bales",
        "center": "Central Cornfield Gen / Scarecrow Tree",
        "description": "Rotten Fields completely open cornfield map without a large building.",
    },
    "thompsonhouse": {
        "twelve_o_clock": "Thompson Manor / 2-Story Wrap Porch & Balcony",
        "three_o_clock": "East Cornfield / Harvester Loop",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Windmill / Cattle Pen",
        "center": "Porch Yard / Central Haystack Gen",
        "description": "The Thompson House two-story southern estate house.",
    },
    "thethompsonhouse": {
        "twelve_o_clock": "Thompson Manor / 2-Story Wrap Porch & Balcony",
        "three_o_clock": "East Cornfield / Harvester Loop",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Windmill / Cattle Pen",
        "center": "Porch Yard / Central Haystack Gen",
        "description": "The Thompson House two-story southern estate house.",
    },
    "tormentcreek": {
        "twelve_o_clock": "Torment Creek Silo / Ruined Barn Frame",
        "three_o_clock": "East Corn Maze / Tractor Loop",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "West Harvester / Hay Wagon",
        "center": "Fallen Silo / Center Farm Clearing Gen",
        "description": "Torment Creek collapsed agricultural barn with fallen silo debris.",
    },
    # Crotus Prenn
    "disturbedward": {
        "twelve_o_clock": "Asylum Sanitarium / 2nd Floor Drop & Hall",
        "three_o_clock": "East Gazebo / Stone Fountain Loop",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Perimeter Gym / Brick Wall",
        "center": "Asylum Front Courtyard / Ambulance Loop",
        "description": "Disturbed Ward massive asylum sanitarium structure.",
    },
    "crotusprennasylum": {
        "twelve_o_clock": "Asylum Sanitarium / 2nd Floor Drop & Hall",
        "three_o_clock": "East Gazebo / Stone Fountain Loop",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Perimeter Gym / Brick Wall",
        "center": "Asylum Front Courtyard / Ambulance Loop",
        "description": "Crotus Prenn Asylum psychiatric hospital grounds.",
    },
    "fathercampbellschapel": {
        "twelve_o_clock": "Father Campbell's Chapel / Bell Tower & Pews",
        "three_o_clock": "East Circus Caravan / Maurice the Horse",
        "six_o_clock": "Killer Shack / South Asylum Gate",
        "nine_o_clock": "West Carnival Gazebo / Ticket Booth",
        "center": "Chapel Courtyard / Hearse Carriage Gen",
        "description": "Father Campbell's Chapel gothic stone sanctuary with the carnival caravan.",
    },
    "fathercambellschapel": {
        "twelve_o_clock": "Father Campbell's Chapel / Bell Tower & Pews",
        "three_o_clock": "East Circus Caravan / Maurice the Horse",
        "six_o_clock": "Killer Shack / South Asylum Gate",
        "nine_o_clock": "West Carnival Gazebo / Ticket Booth",
        "center": "Chapel Courtyard / Hearse Carriage Gen",
        "description": "Father Campbell's Chapel gothic stone sanctuary with the carnival caravan.",
    },
    # Decimated Borgo
    "shatteredsquare": {
        "twelve_o_clock": "Ruined Keep / Burning Manor Hearth",
        "three_o_clock": "East Gallows / Executioner Cart",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Smoldering Cottages / Hay Cart",
        "center": "Central Burning Rubble / Scaffold Gen",
        "description": "The Shattered Square razed medieval settlement with smoldering ruins.",
    },
    "theshatteredsquare": {
        "twelve_o_clock": "Ruined Keep / Burning Manor Hearth",
        "three_o_clock": "East Gallows / Executioner Cart",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Smoldering Cottages / Hay Cart",
        "center": "Central Burning Rubble / Scaffold Gen",
        "description": "The Shattered Square razed medieval settlement with smoldering ruins.",
    },
    "forgottenruins": {
        "twelve_o_clock": "Fortress Keep / Dragon Throne Chamber",
        "three_o_clock": "East Dungeon Catacombs / Vault Chutes",
        "six_o_clock": "Killer Shack / Outer Moat Gate",
        "nine_o_clock": "West Tower Ruins / Stone Corridors",
        "center": "Subterranean Altar / Portcullis Hub Gen",
        "description": "Forgotten Ruins ancient subterranean fortress featuring the Dragon lair.",
    },
    "thedecimatedborgomap3": {
        "twelve_o_clock": "Ruined Keep / Great Hall",
        "three_o_clock": "East Gallows / Medieval Cottages",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Siege Engines / Wooden Barricades",
        "center": "Central Burning Scaffold Gen",
        "description": "The Decimated Borgo fortress perimeter with burning timber.",
    },
    # Dvarka Deepwood
    "tobalanding": {
        "twelve_o_clock": "Alien Research Station / Glass Lookout & Ramp",
        "three_o_clock": "East Crystal Flora / Plateau Rocks",
        "six_o_clock": "Killer Shack / South Alien Forest Gate",
        "nine_o_clock": "West Giant Fungus / Spore Trees",
        "center": "Central Pod / Alien Spire Generator",
        "description": "Toba Landing extraterrestrial research base on an alien planet.",
    },
    "nostromowreckage": {
        "twelve_o_clock": "USCSS Nostromo Hull / Cryo Chamber & Bridge",
        "three_o_clock": "East Escape Shuttle / Exhaust Plume",
        "six_o_clock": "Killer Shack / South Plateau Gate",
        "nine_o_clock": "West Mineral Spire / Alien Outcrop",
        "center": "Starship Central Debris / Engine Core Gen",
        "description": "Nostromo Wreckage crashed Weyland-Yutani starship hull.",
    },
    "dvarkadeepwoodmap3": {
        "twelve_o_clock": "Crashed Module / Command Deck",
        "three_o_clock": "East Bioluminescent Grove / Crystals",
        "six_o_clock": "Killer Shack / South Deepwood Gate",
        "nine_o_clock": "West Spore Plateau / Rocky Formations",
        "center": "Deepwood Clearing / Energy Conduit Gen",
        "description": "Dvarka Deepwood alien ecosystem with bioluminescent flora.",
    },
    "dvarkadeepwoodmap4": {
        "twelve_o_clock": "Research Pod / Solar Arrays",
        "three_o_clock": "East Alien Ridge / Plateau Gym",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Fungus Spire / Mineral Formations",
        "center": "Central Crater / Xenomorph Debris",
        "description": "Dvarka Deepwood alien terrain featuring impact craters.",
    },
    # Forsaken Boneyard
    "eyrieofcrows": {
        "twelve_o_clock": "Eyrie Crow Tower / High Balcony & Library",
        "three_o_clock": "East Desert Crypts / Stone Sarcophagi",
        "six_o_clock": "Killer Shack / South Sand Gate",
        "nine_o_clock": "West Canvas Tents / Excavation Pit",
        "center": "Tower Base / Raven Statues & Open Sand",
        "description": "Eyrie of Crows majestic stone tower rising from Chilean desert sands.",
    },
    "deadsands": {
        "twelve_o_clock": "Ruined Crypt Spire / Sand Citadel",
        "three_o_clock": "East Sarcophagus Maze / Stone Walls",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Excavation Trench / Scaffolding",
        "center": "Central Sunken Relic / Sand Dunes Gen",
        "description": "Dead Sands desert expansion with excavated tomb relics.",
    },
    # Gideon Meat Plant
    "thegame": {
        "twelve_o_clock": "Upper Bathrooms / Sliding Door Vats",
        "three_o_clock": "East Freezer / Frozen Pig Carcasses",
        "six_o_clock": "Blast Door Exit / Lower Packaging Room",
        "nine_o_clock": "West Jigsaw Operating Room / Metal Chute",
        "center": "Central 2-Story Hole / Metal Catwalk Stairs",
        "description": "The Game Saw-themed meatpacking facility with two complete indoor floors.",
    },
    "gideonmeatplantmap2": {
        "twelve_o_clock": "Upper Level Slicers / Tile Bathrooms",
        "three_o_clock": "East Meat Hanging Freezers",
        "six_o_clock": "Blast Exit Gate / Ground Packaging",
        "nine_o_clock": "West Operating Room / Metal Chutes",
        "center": "Central Catwalk Staircase / Saw Trap Room",
        "description": "Gideon Meat Plant layout featuring industrial slicing machines.",
    },
    # Grave of Glennvale
    "deaddawgsaloon": {
        "twelve_o_clock": "Dead Dawg Saloon / 2nd Floor Balcony & Bar",
        "three_o_clock": "East Gallows / Hanging Tree & Cart",
        "six_o_clock": "Killer Shack / South Canyon Gate",
        "nine_o_clock": "West Windmill / Water Tower Basin",
        "center": "Main Street / Sheriff Carriage & Barbed Fence",
        "description": "Dead Dawg Saloon Wild West ghost town featuring breakable doors and gallows.",
    },
    # Haddonfield
    "lampkinlane": {
        "twelve_o_clock": "Myers House / Roof Balcony & Secret Stash",
        "three_o_clock": "East Strode Residence / House of Pain",
        "six_o_clock": "Killer Shack / South Suburb Gate",
        "nine_o_clock": "West 2-Story House / Garage Roof",
        "center": "Lampkin Lane Main Street / Police Cruisers",
        "description": "Lampkin Lane Halloween suburban street with the Myers house.",
    },
    # Hawkins
    "theundergroundcomplex": {
        "twelve_o_clock": "Upside Down Rift Lab / Portal Chamber",
        "three_o_clock": "East Isolation Tanks / Glass Chambers",
        "six_o_clock": "Main Blast Doors / Decontamination Exit",
        "nine_o_clock": "West Catwalk Silos / Storage Vats",
        "center": "Hawkins Central Atrium / 2nd Floor Catwalks",
        "description": "The Underground Complex Stranger Things research laboratory.",
    },
    # Lery's
    "treatmenttheatre": {
        "twelve_o_clock": "Electroshock Operating Stage / 2nd Floor Glass",
        "three_o_clock": "East Office Wing / Reception & Medical Files",
        "six_o_clock": "Ambulance Bay Exit / Double Glass Doors",
        "nine_o_clock": "West Hydrotherapy / Patient Shower Ward",
        "center": "Central Operating Theatre / Shock Device Gen",
        "description": "Léry's Memorial Institute modular mental hospital with treatment rooms.",
    },
    # MacMillan Estate
    "coaltower": {
        "twelve_o_clock": "Coal Tower 2-Story Brick Factory / Drop Vault",
        "three_o_clock": "East Minecart Tracks / Water Tower",
        "six_o_clock": "Killer Shack / South Mine Gate",
        "nine_o_clock": "West Industrial L-T Walls / Brick Gyms",
        "center": "Central Minecart Rail / Forest Clearing",
        "description": "Coal Tower two-story industrial brick manufacturing tower.",
    },
    "coaltowerii": {
        "twelve_o_clock": "Coal Tower Factory / Upper Window Drop",
        "three_o_clock": "East Water Tower / Minecart Loops",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Forest Gyms / Industrial Walls",
        "center": "Central Rail Tracks / Generator",
        "description": "Coal Tower II variant repositioning the industrial factory.",
    },
    "groaningstorehouse": {
        "twelve_o_clock": "Groaning Storehouse / Timber Factory & God Window",
        "three_o_clock": "East Log Piles / Cut Wood Pallets",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Brick Four-Wall / Industrial Gym",
        "center": "Central Lumber Yard / Crane Clearing Gen",
        "description": "Groaning Storehouse expansive timber processing storehouse.",
    },
    "groaningstorehouseii": {
        "twelve_o_clock": "Lumber Storehouse / Timber Factory Vault",
        "three_o_clock": "East Cut Log Stacks / Pallet Loops",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Brick Gyms / Four-Walls",
        "center": "Central Lumber Yard / Log Crane",
        "description": "Groaning Storehouse II variant with adjusted log pile spacing.",
    },
    "ironworksofmisery": {
        "twelve_o_clock": "Ironworks Smelting Kiln / Blast Furnace Pipe Vault",
        "three_o_clock": "East Industrial Pipes / Brick Wall Maze",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Jungle Gyms / Metal Dumpster Loop",
        "center": "Kiln Front Yard / Iron Scrap Pile Gen",
        "description": "Ironworks of Misery massive smelting kiln factory with pipe vaults.",
    },
    "ironworksofmiseryii": {
        "twelve_o_clock": "Ironworks Kiln / Blast Furnace Facility",
        "three_o_clock": "East Industrial Brick Maze / Pipes",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Four-Walls / Scrap Loops",
        "center": "Kiln Front Yard / Center Generator",
        "description": "Ironworks of Misery II variant with reworked factory exterior loops.",
    },
    "shelterwoods": {
        "twelve_o_clock": "Massive Ancient Oak Tree / Merchant Camp",
        "three_o_clock": "East Moonstone Rock Outcrops / Gyms",
        "six_o_clock": "Killer Shack / South Woods Gate",
        "nine_o_clock": "West Dense Tree Stumps / Pallet Loops",
        "center": "Central Clearing / Fallen Tree Trunk Gen",
        "description": "Shelter Woods dense forest centered around the colossal oak tree.",
    },
    "shelterwoodsii": {
        "twelve_o_clock": "Colossal Oak Tree / Radar Encampment",
        "three_o_clock": "East Boulder Clusters / Forest Gyms",
        "six_o_clock": "Killer Shack / South Woods Gate",
        "nine_o_clock": "West Tree Stumps / High Pallet Area",
        "center": "Central Oak Base / Clearing Generator",
        "description": "Shelter Woods II featuring upgraded radar camp structures.",
    },
    "suffocationpit": {
        "twelve_o_clock": "Mine Shaft Entrance / Stone Crusher Ramps",
        "three_o_clock": "East Heavy Brick Gyms / High Walls",
        "six_o_clock": "Killer Shack / South Mine Gate",
        "nine_o_clock": "West Minecart Piles / Rock Clusters",
        "center": "Suffocation Pit Chokepoint / Rail Ramp Gen",
        "description": "Suffocation Pit dumbbell layout with the mine shaft ramp dividing the map.",
    },
    "suffocationpitii": {
        "twelve_o_clock": "Mine Shaft Ramp / Crusher Platform",
        "three_o_clock": "East Brick Gyms / Four-Walls",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Minecarts / Rock Formations",
        "center": "Suffocation Chokepoint / Center Rail Gen",
        "description": "Suffocation Pit II variant with widened central chokepoint.",
    },
    # Ormond
    "mountormondresort": {
        "twelve_o_clock": "Ormond Ski Resort Chalet / Upper Balcony Bar",
        "three_o_clock": "East Heavy Bulldozer / Snowplow Ramp",
        "six_o_clock": "Killer Shack / South Mountain Gate",
        "nine_o_clock": "West Snowmobile Stalls / Pine Forest",
        "center": "Resort Front Porch / Snowy Bonfire Pit Gen",
        "description": "Mount Ormond Resort ski lodge chalet with two interior levels.",
    },
    "mountormondresortv1": {
        "twelve_o_clock": "Ormond Ski Resort Chalet / Upper Balcony Bar",
        "three_o_clock": "East Heavy Bulldozer / Snowplow Ramp",
        "six_o_clock": "Killer Shack / South Mountain Gate",
        "nine_o_clock": "West Snowmobile Stalls / Pine Forest",
        "center": "Resort Front Porch / Snowy Bonfire Pit Gen",
        "description": "Mount Ormond Resort ski lodge chalet with two interior levels.",
    },
    "mountormondresortii": {
        "twelve_o_clock": "Ski Chalet / Main Dining & Upper Deck",
        "three_o_clock": "East Snow Excavator / Bulldozer",
        "six_o_clock": "Killer Shack / South Slope Gate",
        "nine_o_clock": "West Pine Glade / Snowmobile Barn",
        "center": "Resort Terrace / Central Bonfire Gen",
        "description": "Mount Ormond Resort II variant with updated snowdrift obstacles.",
    },
    "mountormondresortv2": {
        "twelve_o_clock": "Ski Chalet / Main Dining & Upper Deck",
        "three_o_clock": "East Snow Excavator / Bulldozer",
        "six_o_clock": "Killer Shack / South Slope Gate",
        "nine_o_clock": "West Pine Glade / Snowmobile Barn",
        "center": "Resort Terrace / Central Bonfire Gen",
        "description": "Mount Ormond Resort II variant with updated snowdrift obstacles.",
    },
    "mountormondresortiii": {
        "twelve_o_clock": "Ski Lodge / Hearth & 2nd Floor Bar",
        "three_o_clock": "East Snow Groomer / Excavation Yard",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Snowmobile Trail / Pine Loops",
        "center": "Front Porch / Bonfire Generator",
        "description": "Mount Ormond Resort III variant featuring tighter exterior loops.",
    },
    "ormondlakemine": {
        "twelve_o_clock": "Lake Mine Headframe / Elevator Shaft & Crane",
        "three_o_clock": "East Mining Excavator / Rock Wall",
        "six_o_clock": "Killer Shack / South Glacier Gate",
        "nine_o_clock": "West Minecart Siding / Heavy Timber",
        "center": "Mine Quarry Pit / Conveyor Belt Gen",
        "description": "Ormond Lake Mine industrial mining headframe located on a frozen mountainside.",
    },
    # Raccoon City
    "policestationeastwing": {
        "twelve_o_clock": "RPD Main Lobby / Goddess Statue & Front Steps",
        "three_o_clock": "Rooftop Helipad / Burning Helicopter & Fire Escape",
        "six_o_clock": "East Office Wing / Chief Irons Taxidermy Office",
        "nine_o_clock": "East Waiting Room / Fire Exit Corridor",
        "center": "Main Hall Atrium / 2nd Floor Walkway Hub",
        "description": "Raccoon City Police Station East Wing focusing on the rooftop helipad.",
    },
    "policestationwestwing": {
        "twelve_o_clock": "RPD Main Lobby / Goddess Statue & Front Steps",
        "three_o_clock": "S.T.A.R.S. Office / 2nd Floor Corridor",
        "six_o_clock": "West Office / Records Room & Dark Room",
        "nine_o_clock": "West 3-Story Library / Movable Bookshelves",
        "center": "Main Hall Atrium / West Yard Gates",
        "description": "Raccoon City Police Station West Wing focusing on the multi-story library.",
    },
    "raccooncitypolicestation": {
        "twelve_o_clock": "RPD Grand Hall / Goddess Statue & Front Desk",
        "three_o_clock": "East Wing / Rooftop Helipad & Fire Escape",
        "six_o_clock": "Front Courtyard / Police Cruiser Barricades",
        "nine_o_clock": "West Wing / 3-Story Library & S.T.A.R.S. Office",
        "center": "Main Reception Desk / Staircase Hub",
        "description": "Raccoon City Police Station iconic multi-story indoor precinct.",
    },
    "raccooncitymap2": {
        "twelve_o_clock": "RPD Grand Hall / Goddess Statue",
        "three_o_clock": "East Helipad & Chief Office",
        "six_o_clock": "Front Yard Entrance Gates",
        "nine_o_clock": "West Library & Operations Room",
        "center": "Main Atrium / Grand Staircase Hub",
        "description": "Raccoon City Police Station variant layout.",
    },
    # Red Forest
    "mothersdwelling": {
        "twelve_o_clock": "Huntress Cottage / 2-Story Wooden Lodge & Porch",
        "three_o_clock": "East Stone Monoliths / Ancient Ruins",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Tall Pine Glade / Mossy Boulders",
        "center": "Mother's Glade / Fallen Birch Trunk Gen",
        "description": "Mother's Dwelling sprawling Russian forest with the Huntress cabin.",
    },
    "templeofpurgation": {
        "twelve_o_clock": "Temple of Purgation / Underground Altar Basement",
        "three_o_clock": "East Stone Columns / Ancient Wall Gyms",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Pine Thicket / Relic Obelisks",
        "center": "Temple Entrance Steps / Pool of Purgation Gen",
        "description": "Temple of Purgation ancient Babylonian stone temple.",
    },
    "thetempleofpurgation": {
        "twelve_o_clock": "Temple of Purgation / Underground Altar Basement",
        "three_o_clock": "East Stone Columns / Ancient Wall Gyms",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Pine Thicket / Relic Obelisks",
        "center": "Temple Entrance Steps / Pool of Purgation Gen",
        "description": "Temple of Purgation ancient Babylonian stone temple.",
    },
    # Silent Hill
    "midwichelementaryschool": {
        "twelve_o_clock": "North Classrooms / Reception & Infirmary",
        "three_o_clock": "East Stairwell / Chemistry Lab & Lockers",
        "six_o_clock": "South Classrooms / Library & Music Room",
        "nine_o_clock": "West Stairwell / Restrooms & Flayed Corpse",
        "center": "Central Courtyard / Clock Tower & Sirens",
        "description": "Midwich Elementary School square two-story indoor layout.",
    },
    "silenthillmap2": {
        "twelve_o_clock": "North Classrooms / Reception",
        "three_o_clock": "East Chemistry Lab & Stairwell",
        "six_o_clock": "South Library & Music Room",
        "nine_o_clock": "West Restrooms & Locker Corridor",
        "center": "Courtyard Clock Tower Generator",
        "description": "Midwich Elementary School variant layout.",
    },
    # Sleepless District
    "trickstersdelusion": {
        "twelve_o_clock": "Neon Concert Stage / VIP Lounge & Backstage",
        "three_o_clock": "East Sound Stage / Recording Booths",
        "six_o_clock": "Killer Shack / Alley Exit Gate",
        "nine_o_clock": "West Neon Alleyway / Dumpsters & Neon Signs",
        "center": "Nightclub Dancefloor / Neon DJ Booth Gen",
        "description": "Trickster's Delusion neon-lit K-pop entertainment district.",
    },
    # Withered Isle
    "gardenofjoy": {
        "twelve_o_clock": "Corrupted Colonial Manor / 2nd Floor Attic Drop",
        "three_o_clock": "East Greenhouse / Overgrown Trellis",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Gazebo / Twisted Picnic Tables",
        "center": "Front Lawn / Corrupted Roots & Fountain Gen",
        "description": "Garden of Joy corrupted colonial mansion featuring high attic drops.",
    },
    "greenvillesquare": {
        "twelve_o_clock": "Greenville Cinema / Theater Screen & Arcade Lobby",
        "three_o_clock": "East Town Gazebo / Stone Statue Park",
        "six_o_clock": "Killer Shack / South Road Gate",
        "nine_o_clock": "West Parking Lot / Abandoned Sedan Loops",
        "center": "Town Square Plaza / Central Fountain Gen",
        "description": "Greenville Square 1980s commercial square featuring cinema and arcade.",
    },
    "freddyfazbearspizza": {
        "twelve_o_clock": "Pizzeria Show Stage / Animatronic Band",
        "three_o_clock": "Pirate Cove & Kitchen / Stage Curtains",
        "six_o_clock": "Security Office / South Dining Exit",
        "nine_o_clock": "Arcade Hall & Prize Corner / Ball Pit",
        "center": "Main Dining Room / Party Tables Generator",
        "description": "Freddy Fazbear's Pizza haunted family pizzeria.",
    },
    "fallenrefuge": {
        "twelve_o_clock": "Crumbled Chapel / Sanctuary Spire",
        "three_o_clock": "East Overgrown Garden / Stone Arches",
        "six_o_clock": "Killer Shack / South Refuge Gate",
        "nine_o_clock": "West Refugee Camp / Tents & Crates",
        "center": "Chapel Courtyard / Broken Monument Gen",
        "description": "Fallen Refuge dilapidated sanctuary with crumbled stone archways.",
    },
    # Yamaoka
    "familyresidence": {
        "twelve_o_clock": "Yamaoka Family House / Shoji Screen Porch & Roof",
        "three_o_clock": "East Bamboo Thicket / Stone Torii Gate",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Garden Pagoda / Stone Lanterns",
        "center": "Residence Front Courtyard / Ancestral Tree Gen",
        "description": "Family Residence ancestral Japanese estate manor.",
    },
    "familyresidencev1": {
        "twelve_o_clock": "Yamaoka Family House / Shoji Screen Porch & Roof",
        "three_o_clock": "East Bamboo Thicket / Stone Torii Gate",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Garden Pagoda / Stone Lanterns",
        "center": "Residence Front Courtyard / Ancestral Tree Gen",
        "description": "Family Residence ancestral Japanese estate manor.",
    },
    "familyresidenceii": {
        "twelve_o_clock": "Yamaoka House / Shoji Hallways & Porch",
        "three_o_clock": "East Torii Gate Path / Bamboo Forest",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Pagoda / Stone Lantern Garden",
        "center": "Courtyard Garden / Ancestral Tree",
        "description": "Family Residence II variant with modified outer bamboo grove paths.",
    },
    "sanctumofwrath": {
        "twelve_o_clock": "Sanctum Temple Shrine / Stone Guardian Statues",
        "three_o_clock": "East Bamboo Forest / Torii Gate Path",
        "six_o_clock": "Killer Shack / South Shrine Gate",
        "nine_o_clock": "West Stone Lantern Garden / Pagoda",
        "center": "Temple Stepped Basin / Ancestral Altar Gen",
        "description": "Sanctum of Wrath grand mountain temple shrine.",
    },
    "sanctumofwrathv1": {
        "twelve_o_clock": "Sanctum Temple Shrine / Stone Guardian Statues",
        "three_o_clock": "East Bamboo Forest / Torii Gate Path",
        "six_o_clock": "Killer Shack / South Shrine Gate",
        "nine_o_clock": "West Stone Lantern Garden / Pagoda",
        "center": "Temple Stepped Basin / Ancestral Altar Gen",
        "description": "Sanctum of Wrath grand mountain temple shrine.",
    },
    "sanctumofwrathii": {
        "twelve_o_clock": "Sanctum Shrine / Guardian Statues & Steps",
        "three_o_clock": "East Bamboo Trail / Torii Gates",
        "six_o_clock": "Killer Shack / South Gate",
        "nine_o_clock": "West Stone Lantern Garden / Pagoda",
        "center": "Central Altar Basin / Altar Generator",
        "description": "Sanctum of Wrath II variant with adjusted shrine stairs.",
    },
}

REALM_LANDMARKS_DB: Dict[str, Dict[str, str]] = {
    "autohavenwreckers": {
        "twelve_o_clock": "Main Auto Garage / North Exit Gate",
        "three_o_clock": "Scrap Car Stacks / East Generator Yard",
        "six_o_clock": "Killer Shack & Basement / South Gate",
        "nine_o_clock": "Car Crusher Crane / West Pallet Gym",
        "center": "Central Wreckage / Spine Generator",
        "description": "Autohaven Wreckers industrial scrapyard with dense junk car loops.",
    },
    "backwaterswamp": {
        "twelve_o_clock": "Main Steamboat / Stilt Manor Upper Deck",
        "three_o_clock": "East Boardwalk Pier / Reed Thicket",
        "six_o_clock": "Killer Shack / South Marsh Gate",
        "nine_o_clock": "West Willow Tree / Stilt Platforms",
        "center": "Central Sunken Wreck / Reed Clearing Gen",
        "description": "Backwater Swamp murky marshlands featuring stilted wooden piers.",
    },
    "badham": {
        "twelve_o_clock": "Badham Elementary / Boiler Room Basement",
        "three_o_clock": "Two-Story Suburban House / House of Pain",
        "six_o_clock": "Killer Shack / South Street Gate",
        "nine_o_clock": "Playground Park / White Fence Loops",
        "center": "Main Suburban Street / Abandoned Van",
        "description": "Springwood suburban town with multi-floor residential homes.",
    },
    "springwood": {
        "twelve_o_clock": "Badham Elementary / Boiler Room Basement",
        "three_o_clock": "Two-Story Suburban House / House of Pain",
        "six_o_clock": "Killer Shack / South Street Gate",
        "nine_o_clock": "Playground Park / White Fence Loops",
        "center": "Main Suburban Street / Abandoned Van",
        "description": "Springwood suburban town with multi-floor residential homes.",
    },
    "coldwindfarm": {
        "twelve_o_clock": "Farm Manor / Slaughterhouse Main Facility",
        "three_o_clock": "Cornfield Thicket / Windmill Loop",
        "six_o_clock": "Killer Shack / South Farm Gate",
        "nine_o_clock": "Combine Harvester / Tractor Ramp Vault",
        "center": "Central Silo / Open Corn Clearing",
        "description": "Coldwind Farm agricultural expanse with tall corn stalk cover.",
    },
    "crotusprennasylum": {
        "twelve_o_clock": "Asylum Sanitarium / Bell Tower Chapel",
        "three_o_clock": "Circus Caravan & Maurice / East Gazebo",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "Brick Wall Perimeter Gyms / Fence Maze",
        "center": "Central Courtyard / Ambulance Loop",
        "description": "Crotus Prenn Asylum psychiatric hospital grounds with brick corridors.",
    },
    "disturbedward": {
        "twelve_o_clock": "Asylum Sanitarium / Upper Floor Drop",
        "three_o_clock": "Circus Caravan / East Stone Gazebo",
        "six_o_clock": "Killer Shack / South Exit Gate",
        "nine_o_clock": "Brick Wall Perimeter Gyms / Fence Maze",
        "center": "Central Courtyard / Ambulance Loop",
        "description": "Crotus Prenn Asylum psychiatric hospital grounds with brick corridors.",
    },
    "decimatedborgo": {
        "twelve_o_clock": "Burning Castle Keep / Dragon Throne",
        "three_o_clock": "Dungeon Catacombs / Executioner Gallows",
        "six_o_clock": "Killer Shack / South Moat Gate",
        "nine_o_clock": "Ruined Medieval Cottages / Smoldering Timber",
        "center": "Central Burning Scaffold / Portcullis Hub",
        "description": "The Decimated Borgo medieval warzone with smoldering fortress ruins.",
    },
    "thedecimatedborgo": {
        "twelve_o_clock": "Burning Castle Keep / Dragon Throne",
        "three_o_clock": "Dungeon Catacombs / Executioner Gallows",
        "six_o_clock": "Killer Shack / South Moat Gate",
        "nine_o_clock": "Ruined Medieval Cottages / Smoldering Timber",
        "center": "Central Burning Scaffold / Portcullis Hub",
        "description": "The Decimated Borgo medieval warzone with smoldering fortress ruins.",
    },
    "dvarkadeepwood": {
        "twelve_o_clock": "USCSS Nostromo Starship / Research Outpost",
        "three_o_clock": "East Crystal Plateau / Shuttle Debris",
        "six_o_clock": "Killer Shack / South Deepwood Gate",
        "nine_o_clock": "West Spore Thicket / Alien Organisms",
        "center": "Central Crash Core / Spire Generator",
        "description": "Dvarka Deepwood lush alien planet featuring crashed starships.",
    },
    "forsakenboneyard": {
        "twelve_o_clock": "Eyrie Crow Tower / High Balcony & Library",
        "three_o_clock": "Desert Crypts / Stone Sarcophagi Loops",
        "six_o_clock": "Killer Shack / South Sand Gate",
        "nine_o_clock": "Excavation Pit / Scaffold Tents",
        "center": "Tower Plaza / Raven Monument Generator",
        "description": "Forsaken Boneyard arid desert with a towering monolith spire.",
    },
    "gideonmeatplant": {
        "twelve_o_clock": "Upper Bathrooms / Meat Grinders & Sliding Door",
        "three_o_clock": "East Meat Freezers / Frozen Pig Carcasses",
        "six_o_clock": "Blast Exit Doors / Packaging Ward",
        "nine_o_clock": "West Operating Room / Metal Chute Drop",
        "center": "Central 2-Story Hole / Metal Catwalk Stairs",
        "description": "Gideon Meat Plant indoor industrial facility with two vertical levels.",
    },
    "graveofglennvale": {
        "twelve_o_clock": "Dead Dawg Saloon / 2nd Floor Balcony & Bar",
        "three_o_clock": "East Gallows / Hanging Tree & Cart",
        "six_o_clock": "Killer Shack / South Canyon Gate",
        "nine_o_clock": "West Windmill / Water Tower Basin",
        "center": "Frontier Main Street / Sheriff Carriage",
        "description": "Grave of Glenvale frontier ghost town with breakable saloon walls.",
    },
    "graveofglenvale": {
        "twelve_o_clock": "Dead Dawg Saloon / 2nd Floor Balcony & Bar",
        "three_o_clock": "East Gallows / Hanging Tree & Cart",
        "six_o_clock": "Killer Shack / South Canyon Gate",
        "nine_o_clock": "West Windmill / Water Tower Basin",
        "center": "Frontier Main Street / Sheriff Carriage",
        "description": "Grave of Glenvale frontier ghost town with breakable saloon walls.",
    },
    "haddonfield": {
        "twelve_o_clock": "Michael Myers House / Attic Balcony & Stash",
        "three_o_clock": "East Strode Residence / House of Pain",
        "six_o_clock": "Killer Shack / South Suburb Gate",
        "nine_o_clock": "West Suburban Residence / Garage Vault",
        "center": "Lampkin Lane Main Street / Police Cruisers",
        "description": "Haddonfield classic suburban street with residential porches.",
    },
    "hawkinsnationallaboratory": {
        "twelve_o_clock": "Upside Down Rift Lab / Portal Chamber",
        "three_o_clock": "East Isolation Tanks / Glass Chambers",
        "six_o_clock": "Main Blast Doors / Decontamination Exit",
        "nine_o_clock": "West Catwalk Silos / Storage Vats",
        "center": "Hawkins Central Atrium / 2nd Floor Catwalks",
        "description": "Hawkins underground research complex with portal chambers.",
    },
    "lerysmemorialinstitute": {
        "twelve_o_clock": "Electroshock Operating Stage / 2nd Floor Glass",
        "three_o_clock": "East Office Wing / Medical Records",
        "six_o_clock": "Ambulance Bay Exit / Double Doors",
        "nine_o_clock": "West Shower Ward / Treatment Rooms",
        "center": "Central Operating Theatre / Shock Device Gen",
        "description": "Léry's Memorial Institute modular mental hospital.",
    },
    "macmillanestate": {
        "twelve_o_clock": "Industrial Brick Factory / Smelting Mill",
        "three_o_clock": "East Minecart Yard / Brick Wall Gym",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Pipe Stacks / Dense Forest Gym",
        "center": "Central Rail Spine / Industrial Scrap Pile",
        "description": "The MacMillan Estate dark industrial forest featuring ironworks.",
    },
    "themacmillanestate": {
        "twelve_o_clock": "Industrial Brick Factory / Smelting Mill",
        "three_o_clock": "East Minecart Yard / Brick Wall Gym",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Pipe Stacks / Dense Forest Gym",
        "center": "Central Rail Spine / Industrial Scrap Pile",
        "description": "The MacMillan Estate dark industrial forest featuring ironworks.",
    },
    "ormond": {
        "twelve_o_clock": "Ormond Ski Resort Chalet / Upper Balcony Bar",
        "three_o_clock": "East Heavy Bulldozer / Snowplow Ramp",
        "six_o_clock": "Killer Shack / South Mountain Gate",
        "nine_o_clock": "West Snowmobile Stalls / Pine Forest",
        "center": "Resort Front Porch / Snowy Bonfire Pit Gen",
        "description": "Mount Ormond snow-covered resort featuring an expansive wooden lodge.",
    },
    "raccooncity": {
        "twelve_o_clock": "RPD Main Lobby / Goddess Statue & Front Steps",
        "three_o_clock": "Rooftop Helipad / Burning Helicopter & Fire Escape",
        "six_o_clock": "Front Courtyard Gate / Police Cruisers",
        "nine_o_clock": "West 3-Story Library / Movable Bookshelves",
        "center": "Main Hall Atrium / 2nd Floor Walkway Hub",
        "description": "Raccoon City Police Department multi-story precinct.",
    },
    "redforest": {
        "twelve_o_clock": "Huntress Cottage / Ancient Stone Temple",
        "three_o_clock": "East Stone Monoliths / Ancient Ruins",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Tall Pine Glade / Mossy Boulders",
        "center": "Central Shrine / Ancient Glade Generator",
        "description": "Red Forest misty woodland containing massive stone monoliths.",
    },
    "silenthill": {
        "twelve_o_clock": "North Classrooms / Reception & Infirmary",
        "three_o_clock": "East Stairwell / Chemistry Lab & Lockers",
        "six_o_clock": "South Classrooms / Library & Music Room",
        "nine_o_clock": "West Stairwell / Restrooms & Flayed Corpse",
        "center": "Central Courtyard / Clock Tower & Sirens",
        "description": "Midwich Elementary School nightmarish two-story schoolhouse.",
    },
    "sleeplessdistrict": {
        "twelve_o_clock": "Neon Concert Stage / VIP Lounge & Backstage",
        "three_o_clock": "East Sound Stage / Recording Booths",
        "six_o_clock": "Killer Shack / Alley Exit Gate",
        "nine_o_clock": "West Neon Alleyway / Dumpsters & Neon Signs",
        "center": "Nightclub Dancefloor / Neon DJ Booth Gen",
        "description": "Sleepless District urban nightlife alleyways drenched in neon.",
    },
    "witheredisle": {
        "twelve_o_clock": "Corrupted Colonial Manor / Cinema / Pizzeria Stage",
        "three_o_clock": "East Greenhouse / Arcade Lobby / Chapel Garden",
        "six_o_clock": "Killer Shack / South Forest Gate",
        "nine_o_clock": "West Gazebo / Parking Lot / Prize Corner",
        "center": "Town Plaza / Corrupted Roots & Fountain Gen",
        "description": "Withered Isle distorted alternate dimensions.",
    },
    "yamaokaestate": {
        "twelve_o_clock": "Yamaoka Family Residence / Ancestral Shrine",
        "three_o_clock": "East Bamboo Grove / Stone Torii Gates",
        "six_o_clock": "Killer Shack / South Estate Gate",
        "nine_o_clock": "West Garden Pagoda / Stone Lanterns",
        "center": "Residence Front Courtyard / Ancestral Tree Gen",
        "description": "Yamaoka Estate traditional Japanese heritage sanctuary.",
    },
}


def get_map_landmarks_data(map_name: str, realm_name: str, source: str = "hens333") -> Dict[str, Any]:
    norm_map = re.sub(r"[^a-z0-9]", "", (map_name or "").lower())
    norm_realm = re.sub(r"[^a-z0-9]", "", (realm_name or "").lower())

    match = MAP_LANDMARKS_DB.get(norm_map)
    if not match and len(norm_map) >= 4:
        for k, v in MAP_LANDMARKS_DB.items():
            if norm_map in k or k in norm_map:
                match = v
                break
    if not match and norm_realm:
        match = REALM_LANDMARKS_DB.get(norm_realm)
        if not match:
            for k, v in REALM_LANDMARKS_DB.items():
                if norm_realm in k or k in norm_realm:
                    match = v
                    break
    if not match:
        match = {
            "twelve_o_clock": "Main Landmark / North Exit Gate",
            "three_o_clock": "East Loop Tile / Generator Cluster",
            "six_o_clock": "Killer Shack & Basement / South Exit Gate",
            "nine_o_clock": "West Jungle Gym / Pallet Gym",
            "center": "Center Landmark / Central Generator",
            "description": f"Landmark layout and sector callouts for {map_name} ({realm_name}).",
        }

    desc = match.get("description", "")
    if source == "samoelcolt":
        description = f"SamoelColt Isometric Scheme for {map_name} ({realm_name}). {desc}"
    else:
        description = f"12-Clock Callout System for {map_name} ({realm_name}). Standard top-middle starts at 12 o'clock. {desc}"

    return {
        "description": description.strip(),
        "twelve_o_clock": match["twelve_o_clock"],
        "three_o_clock": match["three_o_clock"],
        "six_o_clock": match["six_o_clock"],
        "nine_o_clock": match["nine_o_clock"],
        "center": match.get("center", "Central Spine / Center Generator"),
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

            override_char = TEACHABLE_PERK_OVERRIDE.get(name.lower())
            if override_char:
                matched_char = char_map.get(override_char.lower())
            else:
                char_input = item.get("character") or item.get("character_name") or item.get("owner") or "General"
                matched_char = char_map.get(str(char_input).lower())

            if wiki_perks:
                wp_match = next((wp for wp in wiki_perks if wp.name and wp.name.lower() == name.lower()), None)
                if wp_match and wp_match.character and wp_match.character.lower() not in ["none", "all", "general"]:
                    matched_char = char_map.get(wp_match.character.lower()) or char_map.get(wp_match.character.split()[-1].lower()) or matched_char

            if matched_char:
                canonical_name = matched_char.name
                real_name = matched_char.real_name
                avatar_path = matched_char.avatar_local_path
            else:
                canonical_name = str(char_input) if char_input and char_input.lower() not in ["none", "all", "general"] else "General"
                real_name = canonical_name
                avatar_path = ""

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

        def process_page(url: str, category: str):
            try:
                logger.info(f"Scraping {category} index page directly...")
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

                    title = link.get("title", "").strip() or link.get_text().strip()
                    full_name = title.replace("_", " ").strip()

                    if not full_name or len(full_name) > 50:
                        continue

                    if any(x in slug_lower for x in ["perk", "item", "addon", "power", "patch", "dlc", "store", "tips"]):
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
                        )
                    )
            except Exception as e:
                logger.error(f"Error scraping {category} page: {e}")

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

        category = ROLE_BY_PREFIX.get(match.group(1))
        if not category:
            return None

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
        """Carry over release_number from the characters file already on disk.

        Drivers like Nightlight have no concept of release order, so a fresh
        scrape always writes release_number=0. Without this, every sync wipes
        out the chronological ordering used to sort the Characters Hub.
        """
        if not self.characters_file.exists():
            return
        try:
            with open(self.characters_file, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            return

        existing_numbers = {
            c["name"].lower(): c["release_number"]
            for c in existing
            if isinstance(c, dict) and c.get("name") and isinstance(c.get("release_number"), int)
        }

        for character in characters:
            if not character.release_number:
                known = existing_numbers.get(character.name.lower())
                if known is not None:
                    character.release_number = known

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
            return res[0], res[1], [], []

        try:
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

            # Populate real names for killers
            for c in characters:
                if c.category == "Killer" and c.name in KILLER_REAL_NAMES:
                    c.real_name = KILLER_REAL_NAMES[c.name]

            self._preserve_release_numbers(characters)

            self.characters_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.characters_file, "w", encoding="utf-8") as f:
                json.dump([asdict(c) for c in characters], f, indent=2, ensure_ascii=False)

            self.data_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump([asdict(p) for p in perks], f, indent=2, ensure_ascii=False)

            self.items_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.items_file, "w", encoding="utf-8") as f:
                json.dump([asdict(i) for i in items], f, indent=2, ensure_ascii=False)

            self.addons_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.addons_file, "w", encoding="utf-8") as f:
                json.dump([asdict(a) for a in addons], f, indent=2, ensure_ascii=False)

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

            if maps:
                self.maps_file.parent.mkdir(parents=True, exist_ok=True)
                with open(self.maps_file, "w", encoding="utf-8") as f:
                    json.dump([asdict(m) for m in maps], f, indent=2, ensure_ascii=False)

            total_downloads = len(perks) + sum(1 for c in characters if c.avatar_url) + len(items) + len(addons) + len(maps)
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

            survivor_count = sum(1 for p in perks if p.category == "Survivor")
            killer_count = sum(1 for p in perks if p.category == "Killer")

            stats = {
                "total_perks": len(perks),
                "total_characters": len(characters),
                "survivors": survivor_count,
                "killers": killer_count,
                "total_items": len(items),
                "total_addons": len(addons),
            }

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