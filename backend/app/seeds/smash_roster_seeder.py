# backend/app/seeds/smash_roster_seeder.py
import logging
import uuid
from typing import Any, Dict, List
from sqlalchemy import select
from app.core.extensions import db
from app.models.smash_or_pass import (
    Entity,
    EntityStat,
    Roster,
    SmashPassStat,
    Translation,
)

logger = logging.getLogger(__name__)

# ==========================================
# ROSTERS SPECIFICATION (6 ROSTERS)
# ==========================================

ROSTERS_DATA = [
    {
        "slug": "canon",
        "name_i18n_key": "smashOrPass.rosters.canon.name",
        "description_i18n_key": "smashOrPass.rosters.canon.desc",
        "cover_image_url": "/images/rosters/canon.webp",
        "theme_color": "#ff0055",
        "category": "DBD Canon",
        "is_nsfw": False,
        "is_active": True,
    },
    {
        "slug": "hooked_on_you",
        "name_i18n_key": "smashOrPass.rosters.hoy.name",
        "description_i18n_key": "smashOrPass.rosters.hoy.desc",
        "cover_image_url": "/images/rosters/hooked_on_you.webp",
        "theme_color": "#06d6a0",
        "category": "Dating Sim",
        "is_nsfw": False,
        "is_active": True,
    },
    {
        "slug": "legendary_cosplay",
        "name_i18n_key": "smashOrPass.rosters.legendary.name",
        "description_i18n_key": "smashOrPass.rosters.legendary.desc",
        "cover_image_url": "/images/rosters/legendary_cosplay.webp",
        "theme_color": "#ffd166",
        "category": "Collabs & Skins",
        "is_nsfw": False,
        "is_active": True,
    },
    {
        "slug": "cyberpunk_2077",
        "name_i18n_key": "smashOrPass.rosters.cyberpunk.name",
        "description_i18n_key": "smashOrPass.rosters.cyberpunk.desc",
        "cover_image_url": "/images/rosters/cyberpunk_2077.webp",
        "theme_color": "#00f5d4",
        "category": "Cyberpunk",
        "is_nsfw": False,
        "is_active": True,
    },
    {
        "slug": "anime_manga",
        "name_i18n_key": "smashOrPass.rosters.anime.name",
        "description_i18n_key": "smashOrPass.rosters.anime.desc",
        "cover_image_url": "/images/rosters/anime_manga.webp",
        "theme_color": "#b185db",
        "category": "Anime",
        "is_nsfw": False,
        "is_active": True,
    },
    {
        "slug": "gothic_eldritch",
        "name_i18n_key": "smashOrPass.rosters.gothic.name",
        "description_i18n_key": "smashOrPass.rosters.gothic.desc",
        "cover_image_url": "/images/rosters/gothic_eldritch.webp",
        "theme_color": "#7209b7",
        "category": "Gothic Horror",
        "is_nsfw": False,
        "is_active": True,
    },
]

# ==========================================
# CANON (98 ENTITIES)
# ==========================================

CANON_ENTITIES: List[Dict[str, Any]] = [
    {
        "slug": "ada_wong",
        "name": "Ada Wong",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/ada_wong.png",
        "metadata": {
            "title": "The Enigmatic Operative",
            "tagline": "High heels, grappling hooks, and secrets you will never uncover.",
            "bio": "Secret agent who always looks immaculate mid-chase. Will disappear for 3 months and reappear with classified intel and a smirk.",
            "quote": "\"Some things are better left unsaid, but you can buy me a martini first.\"",
            "green_flags": [
                "Always has an escape route",
                "Impeccable fashion sense in a foggy apocalypse",
                "Never texts back too quickly"
            ],
            "red_flags": [
                "Will grapple hook out of the window if you bring up commitment",
                "Works for 4 rival espionage syndicates simultaneously"
            ],
            "greenFlags": [
                "Always has an escape route",
                "Impeccable fashion sense in a foggy apocalypse",
                "Never texts back too quickly"
            ],
            "redFlags": [
                "Will grapple hook out of the window if you bring up commitment",
                "Works for 4 rival espionage syndicates simultaneously"
            ],
            "turn_on": "Wiretap perks and mystery",
            "turnOn": "Wiretap perks and mystery",
            "dealbreaker": "Asking too many personal questions",
            "dating_vibe": "Sultry, elusive, high-stakes romance",
            "datingVibe": "Sultry, elusive, high-stakes romance",
            "chapter": "Resident Evil",
            "compatibility_tags": [
                "The Enigmatic Operative",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Enigmatic Operative"
        }
    },
    {
        "slug": "sable_ward",
        "name": "Sable Ward",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/sable_ward.png",
        "metadata": {
            "title": "The Goth Invocator",
            "tagline": "Basement rituals, black lipstick, and infinite eyeliner.",
            "bio": "Drawn straight into the Fog through occult basement invocation. Will invite you to hang out in the Killer Shack basement and play vinyl records.",
            "quote": "\"If you can’t handle me in the basement, you don’t deserve me at the exit gate.\"",
            "green_flags": [
                "Listens to Bauhaus and The Cure",
                "Looks stunning in monochrome",
                "Will invoke the entity just to hang out with you"
            ],
            "red_flags": [
                "Spends 90% of the match in the basement",
                "Might use your blood for an invocation circle"
            ],
            "greenFlags": [
                "Listens to Bauhaus and The Cure",
                "Looks stunning in monochrome",
                "Will invoke the entity just to hang out with you"
            ],
            "redFlags": [
                "Spends 90% of the match in the basement",
                "Might use your blood for an invocation circle"
            ],
            "turn_on": "Occult circles and dark poetry",
            "turnOn": "Occult circles and dark poetry",
            "dealbreaker": "Being afraid of the dark",
            "dating_vibe": "Gothic romanticism & basement vibes",
            "datingVibe": "Gothic romanticism & basement vibes",
            "chapter": "All Things Wicked",
            "compatibility_tags": [
                "The Goth Invocator",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Goth Invocator"
        }
    },
    {
        "slug": "feng_min",
        "name": "Feng Min",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/feng_min.png",
        "metadata": {
            "title": "The Competitive Gamer",
            "tagline": "Litheness, bunny hoodies, and 3 AM ranked grinding.",
            "bio": "Former esports prodigy with over 400 cosmetic outfits. Highly competitive, will rage-quit if you miss a Great Skill Check.",
            "quote": "\"GG WP, or maybe you should buy me boba tea and we try again?\"",
            "green_flags": [
                "Has an outfit for every aesthetic",
                "Can Lithe vault any obstacle",
                "Can carry you in 2v8 matches"
            ],
            "red_flags": [
                "Blames lag whenever things go wrong",
                "Has missed 0.1% skill check and destroyed keyboard"
            ],
            "greenFlags": [
                "Has an outfit for every aesthetic",
                "Can Lithe vault any obstacle",
                "Can carry you in 2v8 matches"
            ],
            "redFlags": [
                "Blames lag whenever things go wrong",
                "Has missed 0.1% skill check and destroyed keyboard"
            ],
            "turn_on": "Clutch flashlight saves and energy drinks",
            "turnOn": "Clutch flashlight saves and energy drinks",
            "dealbreaker": "Being a casual non-gamer",
            "dating_vibe": "Chaotic gamer sweetheart with bunny ears",
            "datingVibe": "Chaotic gamer sweetheart with bunny ears",
            "chapter": "Spark of Madness",
            "compatibility_tags": [
                "The Competitive Gamer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Competitive Gamer"
        }
    },
    {
        "slug": "kate_denson",
        "name": "Kate Denson",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/kate_denson.png",
        "metadata": {
            "title": "The Country Songbird",
            "tagline": "Acoustic serenades around the campfire with golden heart energy.",
            "bio": "Traveling musician with a golden voice that can soothe any raging Killer. Will write a Billboard top-10 country ballad about your trial escapes.",
            "quote": "\"Music is the only thing the Fog can’t swallow whole.\"",
            "green_flags": [
                "Writes songs about you",
                "Windows of Opportunity queen",
                "Radiates pure sunshine and warmth"
            ],
            "red_flags": [
                "Will serenade the Killer instead of running",
                "Leaves acoustic guitars in every generator spot"
            ],
            "greenFlags": [
                "Writes songs about you",
                "Windows of Opportunity queen",
                "Radiates pure sunshine and warmth"
            ],
            "redFlags": [
                "Will serenade the Killer instead of running",
                "Leaves acoustic guitars in every generator spot"
            ],
            "turn_on": "Singing in harmony by the moonlight",
            "turnOn": "Singing in harmony by the moonlight",
            "dealbreaker": "Noise complaints and cynicism",
            "dating_vibe": "Wholesome campfire country romance",
            "datingVibe": "Wholesome campfire country romance",
            "chapter": "Curtain Call",
            "compatibility_tags": [
                "The Country Songbird",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Country Songbird"
        }
    },
    {
        "slug": "mikaela_reid",
        "name": "Mikaela Reid",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/mikaela_reid.png",
        "metadata": {
            "title": "The Witch of the Boon",
            "tagline": "Coffee brews, tarot readings, and blue totems everywhere.",
            "bio": "Barista, horror writer, and certified witch. Blesses blue totems across the map so you can heal in 4 seconds flat.",
            "quote": "\"I pulled The Lovers and The Tower from the deck. Prepare for drama.\"",
            "green_flags": [
                "Makes the best artisanal espresso in the Fog",
                "Boon: Circle of Healing always active",
                "Reads your astrological birth chart accurately"
            ],
            "red_flags": [
                "Will spend 5 minutes blessing a dull totem while you are on second hook",
                "Her crystals have bad energy occasionally"
            ],
            "greenFlags": [
                "Makes the best artisanal espresso in the Fog",
                "Boon: Circle of Healing always active",
                "Reads your astrological birth chart accurately"
            ],
            "redFlags": [
                "Will spend 5 minutes blessing a dull totem while you are on second hook",
                "Her crystals have bad energy occasionally"
            ],
            "turn_on": "Fresh ground coffee beans and scented candles",
            "turnOn": "Fresh ground coffee beans and scented candles",
            "dealbreaker": "Disrespecting the tarot cards",
            "dating_vibe": "Mystical witchy girlfriend with coffee addiction",
            "datingVibe": "Mystical witchy girlfriend with coffee addiction",
            "chapter": "Hour of the Witch",
            "compatibility_tags": [
                "The Witch of the Boon",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Witch of the Boon"
        }
    },
    {
        "slug": "jill_valentine",
        "name": "Jill Valentine",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/jill_valentine.png",
        "metadata": {
            "title": "The Master of Unlocking",
            "tagline": "S.T.A.R.S. veteran who plants blast mines on generators for fun.",
            "bio": "Bio-hazard survivor who eats Nemesis rocket launchers for breakfast. Tough, brave, and will rig the generator to blind anyone who kicks it.",
            "quote": "\"You want S.T.A.R.S.? I’ll give you S.T.A.R.S.\"",
            "green_flags": [
                "Blast Mine traps provide endless comedy",
                "Survives literally anything",
                "Can lockpick anything from chests to your heart"
            ],
            "red_flags": [
                "Attracts 8-foot tall bio-weapons with rocket launchers",
                "Will treat a casual date like a military SWAT op"
            ],
            "greenFlags": [
                "Blast Mine traps provide endless comedy",
                "Survives literally anything",
                "Can lockpick anything from chests to your heart"
            ],
            "redFlags": [
                "Attracts 8-foot tall bio-weapons with rocket launchers",
                "Will treat a casual date like a military SWAT op"
            ],
            "turn_on": "Flashbangs and perfect generator timing",
            "turnOn": "Flashbangs and perfect generator timing",
            "dealbreaker": "Cowardice in the face of danger",
            "dating_vibe": "Action-hero badass with tactical romance",
            "datingVibe": "Action-hero badass with tactical romance",
            "chapter": "Resident Evil",
            "compatibility_tags": [
                "The Master of Unlocking",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Master of Unlocking"
        }
    },
    {
        "slug": "lara_croft",
        "name": "Lara Croft",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/lara_croft.png",
        "metadata": {
            "title": "The Tomb Raider",
            "tagline": "Acrobatic treasure hunter with zero fear of the unknown.",
            "bio": "World-renowned archaeologist who dives into ancient tombs and dodges rolling boulders for sport. Vaults windows faster than thought.",
            "quote": "\"The extraordinary is in what we do, not who we are.\"",
            "green_flags": [
                "Finesse vault speed",
                "Rich, brilliant, and travels the globe",
                "Can climb out of any sticky situation"
            ],
            "red_flags": [
                "Will drag you into cursed ancient temples",
                "Might trade you for an ancient relic"
            ],
            "greenFlags": [
                "Finesse vault speed",
                "Rich, brilliant, and travels the globe",
                "Can climb out of any sticky situation"
            ],
            "redFlags": [
                "Will drag you into cursed ancient temples",
                "Might trade you for an ancient relic"
            ],
            "turn_on": "Ancient languages and cliffhanger jumps",
            "turnOn": "Ancient languages and cliffhanger jumps",
            "dealbreaker": "Complaining about hiking",
            "dating_vibe": "High-octane globetrotting adventure",
            "datingVibe": "High-octane globetrotting adventure",
            "chapter": "Tomb Raider",
            "compatibility_tags": [
                "The Tomb Raider",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Tomb Raider"
        }
    },
    {
        "slug": "rebecca_chambers",
        "name": "Rebecca Chambers",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/rebecca_chambers.png",
        "metadata": {
            "title": "The Rookie Medic",
            "tagline": "Thumbs up, hyperfocus skill checks, and instant medical care.",
            "bio": "S.T.A.R.S. field medic prodigy. Will give you a signature thumbs-up and patch up every arterial wound with a smile.",
            "quote": "\"Hang in there! We’ve got this together!\"",
            "green_flags": [
                "Reassurance perks keep you off the hook",
                "Hyperfocus generator speed",
                "Literal genius medical prodigy"
            ],
            "red_flags": [
                "Too wholesome for her own good",
                "Forces you to take your vitamins"
            ],
            "greenFlags": [
                "Reassurance perks keep you off the hook",
                "Hyperfocus generator speed",
                "Literal genius medical prodigy"
            ],
            "redFlags": [
                "Too wholesome for her own good",
                "Forces you to take your vitamins"
            ],
            "turn_on": "Great Skill Checks and clean first-aid kits",
            "turnOn": "Great Skill Checks and clean first-aid kits",
            "dealbreaker": "Giving up before the exit gates open",
            "dating_vibe": "Sweet, supportive, pure sunshine medic",
            "datingVibe": "Sweet, supportive, pure sunshine medic",
            "chapter": "Resident Evil: PROJECT W",
            "compatibility_tags": [
                "The Rookie Medic",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Rookie Medic"
        }
    },
    {
        "slug": "jane_romero",
        "name": "Jane Romero",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/jane_romero.png",
        "metadata": {
            "title": "The Influential Host",
            "tagline": "Head On locker stuns, talk-show charisma, and sheer presence.",
            "bio": "Celebrity talk-show host with curves that defy entity gravity and a Head On stun that will send any killer flying.",
            "quote": "\"Don’t let anyone make you feel small. Especially not a killer in a mask.\"",
            "green_flags": [
                "Head On locker stuns save matches",
                "Charismatic, empathetic, and inspiring",
                "Looks spectacular in every outfit"
            ],
            "red_flags": [
                "Needs the spotlight at all times",
                "Might interview you on your worst moments"
            ],
            "greenFlags": [
                "Head On locker stuns save matches",
                "Charismatic, empathetic, and inspiring",
                "Looks spectacular in every outfit"
            ],
            "redFlags": [
                "Needs the spotlight at all times",
                "Might interview you on your worst moments"
            ],
            "turn_on": "Confidence and locker timing",
            "turnOn": "Confidence and locker timing",
            "dealbreaker": "Insecurity and petty jealousy",
            "dating_vibe": "Glamorous, empowered powerhouse",
            "datingVibe": "Glamorous, empowered powerhouse",
            "chapter": "Demise of the Faithful",
            "compatibility_tags": [
                "The Influential Host",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Influential Host"
        }
    },
    {
        "slug": "yui_kimura",
        "name": "Yui Kimura",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/yui_kimura.png",
        "metadata": {
            "title": "The Hardened Street Racer",
            "tagline": "Leather jackets, neon motorcycles, and resetting dropped pallets.",
            "bio": "Leader of an all-female street racing gang in Tokyo. Strong, rebellious, and resets pallets so you can loop for another 5 minutes.",
            "quote": "\"Never back down, never surrender the road.\"",
            "green_flags": [
                "Any Means Necessary pallet resetter",
                "Rides custom street bikes",
                "Unbreakable loyalty to friends"
            ],
            "red_flags": [
                "Has 14 speeding tickets in the Fog",
                "Fixes exhaust pipes at 4 AM"
            ],
            "greenFlags": [
                "Any Means Necessary pallet resetter",
                "Rides custom street bikes",
                "Unbreakable loyalty to friends"
            ],
            "redFlags": [
                "Has 14 speeding tickets in the Fog",
                "Fixes exhaust pipes at 4 AM"
            ],
            "turn_on": "Revving engines and tight turns",
            "turnOn": "Revving engines and tight turns",
            "dealbreaker": "Telling her to slow down",
            "dating_vibe": "Badass biker girl with a loyal heart",
            "datingVibe": "Badass biker girl with a loyal heart",
            "chapter": "Cursed Legacy",
            "compatibility_tags": [
                "The Hardened Street Racer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Hardened Street Racer"
        }
    },
    {
        "slug": "zarina_kassir",
        "name": "Zarina Kassir",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/zarina_kassir.png",
        "metadata": {
            "title": "The Truth-Seeking Filmmaker",
            "tagline": "Documentary director, For The People heroics, and investigative fire.",
            "bio": "Documentarian who dives into maximum-security secrets. Will sacrifice her own health state with For The People to save you.",
            "quote": "\"The truth is always worth fighting for.\"",
            "green_flags": [
                "Insta-heals you with For The People",
                "Incredible storyteller and filmmaker",
                "Sharp eye for detail"
            ],
            "red_flags": [
                "Will document your embarrassing moments in 4K",
                "Overthinks every conversation"
            ],
            "greenFlags": [
                "Insta-heals you with For The People",
                "Incredible storyteller and filmmaker",
                "Sharp eye for detail"
            ],
            "redFlags": [
                "Will document your embarrassing moments in 4K",
                "Overthinks every conversation"
            ],
            "turn_on": "Courage under pressure and cinematic lighting",
            "turnOn": "Courage under pressure and cinematic lighting",
            "dealbreaker": "Lying or keeping toxic secrets",
            "dating_vibe": "Intellectual, fiercely compassionate crusader",
            "datingVibe": "Intellectual, fiercely compassionate crusader",
            "chapter": "Chains of Hate",
            "compatibility_tags": [
                "The Truth-Seeking Filmmaker",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Truth-Seeking Filmmaker"
        }
    },
    {
        "slug": "thalita_lyra",
        "name": "Thalita Lyra",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/thalita_lyra.png",
        "metadata": {
            "title": "The Rio Kite Fighter",
            "tagline": "Sunny beaches, kite combat, and infectious Brazilian warmth.",
            "bio": "Kite fighting champion from Rio de Janeiro with vibrant energy and cooperative speed buffs. Will turn any dark trial into a summer festival.",
            "quote": "\"You keep your eyes on the wind, I’ll keep my eyes on you.\"",
            "green_flags": [
                "Friendly Competition buffs",
                "Radiates joyful carnival energy",
                "Protective older sister energy"
            ],
            "red_flags": [
                "Competes over literally everything including breakfast",
                "Her brother Renato tags along everywhere"
            ],
            "greenFlags": [
                "Friendly Competition buffs",
                "Radiates joyful carnival energy",
                "Protective older sister energy"
            ],
            "redFlags": [
                "Competes over literally everything including breakfast",
                "Her brother Renato tags along everywhere"
            ],
            "turn_on": "Beach volleyball and synchronized teamwork",
            "turnOn": "Beach volleyball and synchronized teamwork",
            "dealbreaker": "Sulking and gloomy bad attitudes",
            "dating_vibe": "Vibrant, sun-kissed, high-energy romance",
            "datingVibe": "Vibrant, sun-kissed, high-energy romance",
            "chapter": "Tools of Torment",
            "compatibility_tags": [
                "The Rio Kite Fighter",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Rio Kite Fighter"
        }
    },
    {
        "slug": "cheryl_mason",
        "name": "Cheryl Mason",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/cheryl_mason.png",
        "metadata": {
            "title": "The Reincarnated Survivor",
            "tagline": "Silent Hill veteran, Soul Guard endurance, and demon slayer.",
            "bio": "Survived god-like cults and foggy otherworlds long before the Entity came calling. Unshakable resolve with a dark past.",
            "quote": "\"Is every town I visit covered in mist and monsters? Really?\"",
            "green_flags": [
                "Soul Guard endurance is godly",
                "Fearless against eldritch abominations",
                "Has seen worse than the Entity"
            ],
            "red_flags": [
                "Rust and sirens trigger flashbacks",
                "May attract god-cults to family dinners"
            ],
            "greenFlags": [
                "Soul Guard endurance is godly",
                "Fearless against eldritch abominations",
                "Has seen worse than the Entity"
            ],
            "redFlags": [
                "Rust and sirens trigger flashbacks",
                "May attract god-cults to family dinners"
            ],
            "turn_on": "Quiet rainy nights and flashlights",
            "turnOn": "Quiet rainy nights and flashlights",
            "dealbreaker": "Religious cults and radio static",
            "dating_vibe": "Resilient, moody, cult-slaying heroine",
            "datingVibe": "Resilient, moody, cult-slaying heroine",
            "chapter": "Silent Hill",
            "compatibility_tags": [
                "The Reincarnated Survivor",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Reincarnated Survivor"
        }
    },
    {
        "slug": "nea_karlsson",
        "name": "Nea Karlsson",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/nea_karlsson.png",
        "metadata": {
            "title": "The Urban Artist",
            "tagline": "Graffiti, Urban Evasion crouch-walking, and street rebellion.",
            "bio": "Swedish skater and graffiti artist. Masters Urban Evasion to glide unseen around obstacles while leaving neon art across the Fog.",
            "quote": "\"Tagging the Entity’s realm with neon spray paint is my love language.\"",
            "green_flags": [
                "Urban Evasion crouch master",
                "Great artistic eye",
                "Fearless skate park rebel"
            ],
            "red_flags": [
                "Crouch-walks everywhere including restaurants",
                "Left spray paint on your car"
            ],
            "greenFlags": [
                "Urban Evasion crouch master",
                "Great artistic eye",
                "Fearless skate park rebel"
            ],
            "redFlags": [
                "Crouch-walks everywhere including restaurants",
                "Left spray paint on your car"
            ],
            "turn_on": "Fresh Krylon spray cans and high rooftops",
            "turnOn": "Fresh Krylon spray cans and high rooftops",
            "dealbreaker": "Rules, curfew, and law enforcement",
            "dating_vibe": "Grungy rebel with underground street cred",
            "datingVibe": "Grungy rebel with underground street cred",
            "chapter": "The Last Breath",
            "compatibility_tags": [
                "The Urban Artist",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Urban Artist"
        }
    },
    {
        "slug": "meg_thomas",
        "name": "Meg Thomas",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/meg_thomas.png",
        "metadata": {
            "title": "The Energetic Sprinter",
            "tagline": "Sprint Burst away from all commitment at 150% speed.",
            "bio": "High school track athlete with endless cardio and a habit of dropping every pallet on the map within the first 60 seconds.",
            "quote": "\"Catch me if you can! (Spoiler: You can’t).\"",
            "green_flags": [
                "Sprint Burst into your DMs",
                "Infinite stamina and cardio",
                "Will run 10k with you"
            ],
            "red_flags": [
                "Sprint Bursts into walls",
                "Dropped all shack pallets in 10 seconds"
            ],
            "greenFlags": [
                "Sprint Burst into your DMs",
                "Infinite stamina and cardio",
                "Will run 10k with you"
            ],
            "redFlags": [
                "Sprint Bursts into walls",
                "Dropped all shack pallets in 10 seconds"
            ],
            "turn_on": "Adrenaline surges and running sneakers",
            "turnOn": "Adrenaline surges and running sneakers",
            "dealbreaker": "Couch potatoes who refuse to run",
            "dating_vibe": "Athletic, bubbly, spontaneous chaos",
            "datingVibe": "Athletic, bubbly, spontaneous chaos",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Energetic Sprinter",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Energetic Sprinter"
        }
    },
    {
        "slug": "claudette_morel",
        "name": "Claudette Morel",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/claudette_morel.png",
        "metadata": {
            "title": "The Botanical Healer",
            "tagline": "Self-Care in the bush, herbal remedies, and shy genius.",
            "bio": "Introverted botanist with encyclopedic knowledge of medicinal plants. Blends into tall grass and bushes so well she becomes invisible.",
            "quote": "\"Plants don’t judge you. They just heal you if you treat them right.\"",
            "green_flags": [
                "Botanical knowledge makes delicious teas",
                "Empathy lets her feel your pain",
                "Gentle, thoughtful, and kind"
            ],
            "red_flags": [
                "Spends 32 seconds Self-Caring against Sloppy Butcher in the map corner"
            ],
            "greenFlags": [
                "Botanical knowledge makes delicious teas",
                "Empathy lets her feel your pain",
                "Gentle, thoughtful, and kind"
            ],
            "redFlags": [
                "Spends 32 seconds Self-Caring against Sloppy Butcher in the map corner"
            ],
            "turn_on": "Rare botanical specimens and quiet greenhouses",
            "turnOn": "Rare botanical specimens and quiet greenhouses",
            "dealbreaker": "Loud party animals who trample gardens",
            "dating_vibe": "Soft-spoken, tender plant-mom romance",
            "datingVibe": "Soft-spoken, tender plant-mom romance",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Botanical Healer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Botanical Healer"
        }
    },
    {
        "slug": "laurie_strode",
        "name": "Laurie Strode",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/laurie_strode.png",
        "metadata": {
            "title": "The Original Final Girl",
            "tagline": "Decisive Strike glass shards and Halloween nightmare survival.",
            "bio": "The archetype of all horror Final Girls. Kept Michael Myers at bay for decades with a knitting needle and pure tenacity.",
            "quote": "\"It was the boogeyman... and I survived him.\"",
            "green_flags": [
                "Decisive Strike saves you in endgame",
                "Unstoppable survival instincts",
                "Classic 70s horror royalty"
            ],
            "red_flags": [
                "Her estranged brother is a 7-foot shape in a William Shatner mask"
            ],
            "greenFlags": [
                "Decisive Strike saves you in endgame",
                "Unstoppable survival instincts",
                "Classic 70s horror royalty"
            ],
            "redFlags": [
                "Her estranged brother is a 7-foot shape in a William Shatner mask"
            ],
            "turn_on": "Preparedness and fortified basements",
            "turnOn": "Preparedness and fortified basements",
            "dealbreaker": "Halloween pranks involving masks",
            "dating_vibe": "Legendary, tough-as-nails survival romance",
            "datingVibe": "Legendary, tough-as-nails survival romance",
            "chapter": "Halloween",
            "compatibility_tags": [
                "The Original Final Girl",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Original Final Girl"
        }
    },
    {
        "slug": "nancy_wheeler",
        "name": "Nancy Wheeler",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/nancy_wheeler.png",
        "metadata": {
            "title": "The Hawkins Journalist",
            "tagline": "Shotgun aim, investigative grit, and Inner Strength locker heals.",
            "bio": "Hawkins High reporter who will unearth any conspiracy and pump 12-gauge shells into demogorgons without blinking.",
            "quote": "\"I don’t back down from a monster. Never have, never will.\"",
            "green_flags": [
                "Inner Strength locker heals",
                "Brilliant investigative journalist",
                "Can shoot Demogorgons with precision"
            ],
            "red_flags": [
                "Will interrogate your past like a suspect on trial"
            ],
            "greenFlags": [
                "Inner Strength locker heals",
                "Brilliant investigative journalist",
                "Can shoot Demogorgons with precision"
            ],
            "redFlags": [
                "Will interrogate your past like a suspect on trial"
            ],
            "turn_on": "Classified archives and investigative scoops",
            "turnOn": "Classified archives and investigative scoops",
            "dealbreaker": "Apathy and bad journalism",
            "dating_vibe": "Sharp, preppy, monster-hunting heroine",
            "datingVibe": "Sharp, preppy, monster-hunting heroine",
            "chapter": "Stranger Things",
            "compatibility_tags": [
                "The Hawkins Journalist",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Hawkins Journalist"
        }
    },
    {
        "slug": "lee_yun_jin",
        "name": "Yun-Jin Lee",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/lee_yun_jin.png",
        "metadata": {
            "title": "The Ruthless Music Producer",
            "tagline": "Fur coats, Fast Track tokens, and calculating corporate ambition.",
            "bio": "High-powered K-pop music mogul. Will step over your downed body if it gives her 3 Fast Track tokens and an exit gate escape.",
            "quote": "\"In this business, only the winners get the encore.\"",
            "green_flags": [
                "Million-dollar wardrobe and diamond earrings",
                "Can make you an international celebrity",
                "Sharp business acumen"
            ],
            "red_flags": [
                "Fast Track means she gets stronger when you get hooked",
                "Might renegotiate your relationship contract annually"
            ],
            "greenFlags": [
                "Million-dollar wardrobe and diamond earrings",
                "Can make you an international celebrity",
                "Sharp business acumen"
            ],
            "redFlags": [
                "Fast Track means she gets stronger when you get hooked",
                "Might renegotiate your relationship contract annually"
            ],
            "turn_on": "Number one billboard tracks and luxury silk",
            "turnOn": "Number one billboard tracks and luxury silk",
            "dealbreaker": "Unprofitable ventures and emotional weakness",
            "dating_vibe": "Luxury, ice-queen ambition with hidden passion",
            "datingVibe": "Luxury, ice-queen ambition with hidden passion",
            "chapter": "All-Kill",
            "compatibility_tags": [
                "The Ruthless Music Producer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Ruthless Music Producer"
        }
    },
    {
        "slug": "élodie_rakoto",
        "name": "Élodie Rakoto",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/élodie_rakoto.png",
        "metadata": {
            "title": "The Occult Investigator",
            "tagline": "Paranormal treasure hunting, Parisian chic, and Deception locker tricks.",
            "bio": "Born in Paris to Malagasy heritage, traveled the globe uncovering Black Vale cult relics. Masters Deception to juke any killer.",
            "quote": "\"Secrets are just puzzles waiting for the right key.\"",
            "green_flags": [
                "Deception locker plays break killer ankles",
                "Speaks 4 languages fluently",
                "Globetrotting elegance"
            ],
            "red_flags": [
                "Hunted by ancient occult secret societies"
            ],
            "greenFlags": [
                "Deception locker plays break killer ankles",
                "Speaks 4 languages fluently",
                "Globetrotting elegance"
            ],
            "redFlags": [
                "Hunted by ancient occult secret societies"
            ],
            "turn_on": "Ancient ciphers and leather journals",
            "turnOn": "Ancient ciphers and leather journals",
            "dealbreaker": "Superstition without intellectual curiosity",
            "dating_vibe": "Sophisticated Parisian artifact hunter",
            "datingVibe": "Sophisticated Parisian artifact hunter",
            "chapter": "A Binding of Kin",
            "compatibility_tags": [
                "The Occult Investigator",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Occult Investigator"
        }
    },
    {
        "slug": "haddie_kaur",
        "name": "Haddie Kaur",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/haddie_kaur.png",
        "metadata": {
            "title": "The Ravages of the Abyss Host",
            "tagline": "Paranormal podcasting, psychic sight, and blue hair highlights.",
            "bio": "Host of the underground podcast \"Ravages of the Abyss\". Can see residual psychic bleeding from the Fog and blinds killers with flashlights.",
            "quote": "\"I’ve heard the voices in the dark... and I’m talking back.\"",
            "green_flags": [
                "Residual Manifest gives free flashlights",
                "Has top-charting paranormal podcast",
                "Fearless psychic explorer"
            ],
            "red_flags": [
                "Records ambient audio while you sleep for ghost EVPs"
            ],
            "greenFlags": [
                "Residual Manifest gives free flashlights",
                "Has top-charting paranormal podcast",
                "Fearless psychic explorer"
            ],
            "redFlags": [
                "Records ambient audio while you sleep for ghost EVPs"
            ],
            "turn_on": "EVP recordings and haunted lighthouses",
            "turnOn": "EVP recordings and haunted lighthouses",
            "dealbreaker": "Calling paranormal phenomena fake",
            "dating_vibe": "Psychic, brave, podcasting night-owl",
            "datingVibe": "Psychic, brave, podcasting night-owl",
            "chapter": "Roots of Dread",
            "compatibility_tags": [
                "The Ravages of the Abyss Host",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Ravages of the Abyss Host"
        }
    },
    {
        "slug": "ellen_ripley",
        "name": "Ellen Ripley",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/ellen_ripley.png",
        "metadata": {
            "title": "The Nostromo Warrant Officer",
            "tagline": "Flame turrets, Chemical Traps, and Jonesy the cat lover.",
            "bio": "The toughest space warrant officer in the galaxy. Blew the Xenomorph out the airlock and sets Chemical Traps on pallets.",
            "quote": "\"Get away from her, you bitch!\"",
            "green_flags": [
                "Loves cats (Jonesy)",
                "Chemical Trap slows killers down",
                "Unbreakable survival leadership"
            ],
            "red_flags": [
                "Has trust issues with android synthetics"
            ],
            "greenFlags": [
                "Loves cats (Jonesy)",
                "Chemical Trap slows killers down",
                "Unbreakable survival leadership"
            ],
            "redFlags": [
                "Has trust issues with android synthetics"
            ],
            "turn_on": "Flamethrowers and orange tabby cats",
            "turnOn": "Flamethrowers and orange tabby cats",
            "dealbreaker": "Working for Weyland-Yutani Corporation",
            "dating_vibe": "Gritty, no-nonsense sci-fi survivalist",
            "datingVibe": "Gritty, no-nonsense sci-fi survivalist",
            "chapter": "Alien",
            "compatibility_tags": [
                "The Nostromo Warrant Officer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Nostromo Warrant Officer"
        }
    },
    {
        "slug": "taurie_cain",
        "name": "Taurie Cain",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/taurie_cain.png",
        "metadata": {
            "title": "The Black Vale Devotee",
            "tagline": "Entity worship, dark ritual devotion, and sinister charisma.",
            "bio": "A high-ranking disciple of the Black Vale who willingly worships the Entity. Deeply fascinated by the dark trial architecture.",
            "quote": "\"The Entity does not punish us; it refines us through pain.\"",
            "green_flags": [
                "Unmatched knowledge of occult lore",
                "Charismatic dark aesthetic",
                "Fearless before monstrous killers"
            ],
            "red_flags": [
                "Might try to sacrifice you for brownie points with the Entity"
            ],
            "greenFlags": [
                "Unmatched knowledge of occult lore",
                "Charismatic dark aesthetic",
                "Fearless before monstrous killers"
            ],
            "redFlags": [
                "Might try to sacrifice you for brownie points with the Entity"
            ],
            "turn_on": "Black candles and ancient incantations",
            "turnOn": "Black candles and ancient incantations",
            "dealbreaker": "Disrespecting the Entity’s grand design",
            "dating_vibe": "Devout, dangerous occult goth girl",
            "datingVibe": "Devout, dangerous occult goth girl",
            "chapter": "Doomed Course",
            "compatibility_tags": [
                "The Black Vale Devotee",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Black Vale Devotee"
        }
    },
    {
        "slug": "michonne_grimes",
        "name": "Michonne",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/michonne_grimes.png",
        "metadata": {
            "title": "The Katana Survivor",
            "tagline": "Katana slashes, unyielding gaze, and post-apocalyptic grit.",
            "bio": "Iconic zombie apocalypse survivor who slices through walkers and killers with silent katana precision.",
            "quote": "\"You do what you have to do to survive.\"",
            "green_flags": [
                "Peerless close-quarters combat skills",
                "Quiet, deeply loyal, and protective",
                "Never panics under pressure"
            ],
            "red_flags": [
                "Hard to get her to open up emotionally"
            ],
            "greenFlags": [
                "Peerless close-quarters combat skills",
                "Quiet, deeply loyal, and protective",
                "Never panics under pressure"
            ],
            "redFlags": [
                "Hard to get her to open up emotionally"
            ],
            "turn_on": "Sharpened katanas and quiet loyalty",
            "turnOn": "Sharpened katanas and quiet loyalty",
            "dealbreaker": "Whining about minor inconveniences",
            "dating_vibe": "Stoic, badass warrior with deep devotion",
            "datingVibe": "Stoic, badass warrior with deep devotion",
            "chapter": "The Walking Dead",
            "compatibility_tags": [
                "The Katana Survivor",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Katana Survivor"
        }
    },
    {
        "slug": "eleven",
        "name": "Eleven",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/eleven.png",
        "metadata": {
            "title": "The Telekinetic Girl",
            "tagline": "Eggo waffles, telekinetic powers, and Hawkins loyalty.",
            "bio": "Raised in Hawkins Lab with telekinetic psychic powers. Will flip trial vans and snap monster necks with a single thought.",
            "quote": "\"Friends don’t lie.\"",
            "green_flags": [
                "Can move generators with her mind",
                "Unconditional friendship and loyalty",
                "Fiercely protective of her loved ones"
            ],
            "red_flags": [
                "Nosebleeds whenever she uses psychic powers",
                "Will consume your entire freezer of Eggos"
            ],
            "greenFlags": [
                "Can move generators with her mind",
                "Unconditional friendship and loyalty",
                "Fiercely protective of her loved ones"
            ],
            "redFlags": [
                "Nosebleeds whenever she uses psychic powers",
                "Will consume your entire freezer of Eggos"
            ],
            "turn_on": "Eggo waffles and retro 80s mixtapes",
            "turnOn": "Eggo waffles and retro 80s mixtapes",
            "dealbreaker": "Lying to friends",
            "dating_vibe": "Sweet, protective psychic heroine",
            "datingVibe": "Sweet, protective psychic heroine",
            "chapter": "Stranger Things",
            "compatibility_tags": [
                "The Telekinetic Girl",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Telekinetic Girl"
        }
    },
    {
        "slug": "aurora_stardotter",
        "name": "Aurora",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/aurora_stardotter.png",
        "metadata": {
            "title": "The Nordic Dreamer",
            "tagline": "Northern lights, celestial navigation, and warm winter wool.",
            "bio": "Astronomer and folklore enthusiast from the Nordic fjords who charts starry constellations in the Fog.",
            "quote": "\"Even under this black sky, the northern stars still guide us home.\"",
            "green_flags": [
                "Charts constellations across the sky",
                "Cozy hand-knitted sweaters",
                "Gentle, soothing voice"
            ],
            "red_flags": [
                "Stares at the foggy sky for hours during trials"
            ],
            "greenFlags": [
                "Charts constellations across the sky",
                "Cozy hand-knitted sweaters",
                "Gentle, soothing voice"
            ],
            "redFlags": [
                "Stares at the foggy sky for hours during trials"
            ],
            "turn_on": "Auroras, hot cocoa, and stargazing",
            "turnOn": "Auroras, hot cocoa, and stargazing",
            "dealbreaker": "Light pollution and loud noise",
            "dating_vibe": "Ethereal, dreamy Scandinavian romantic",
            "datingVibe": "Ethereal, dreamy Scandinavian romantic",
            "chapter": "Northern Mists",
            "compatibility_tags": [
                "The Nordic Dreamer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Nordic Dreamer"
        }
    },
    {
        "slug": "vee_boonyasak",
        "name": "Vee Boonyasak",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/vee_boonyasak.png",
        "metadata": {
            "title": "The Bangkok Muay Thai Prodigy",
            "tagline": "Muay Thai elbows, street markets, and unstoppable energy.",
            "bio": "Muay Thai fighter and street food aficionado from Bangkok. Fast on her feet and ready to roundhouse kick any killer.",
            "quote": "\"Stand firm, breathe, and strike with everything you have.\"",
            "green_flags": [
                "Can defend you against any mugger or killer",
                "Cooks incredible authentic Thai curry",
                "Incredible physical fitness"
            ],
            "red_flags": [
                "Sparring sessions with her leave serious bruises"
            ],
            "greenFlags": [
                "Can defend you against any mugger or killer",
                "Cooks incredible authentic Thai curry",
                "Incredible physical fitness"
            ],
            "redFlags": [
                "Sparring sessions with her leave serious bruises"
            ],
            "turn_on": "Spicy street food and sparring practice",
            "turnOn": "Spicy street food and sparring practice",
            "dealbreaker": "Lazy couch potatoes who complain about working out",
            "dating_vibe": "Energetic, fiery martial artist with a huge appetite",
            "datingVibe": "Energetic, fiery martial artist with a huge appetite",
            "chapter": "Siam Shadows",
            "compatibility_tags": [
                "The Bangkok Muay Thai Prodigy",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Bangkok Muay Thai Prodigy"
        }
    },
    {
        "slug": "orela_rose",
        "name": "Orela Rose",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/orela_rose.png",
        "metadata": {
            "title": "The Botanical Alchemist",
            "tagline": "Herbal elixirs, glowing greenhouse blooms, and quiet warmth.",
            "bio": "Alchemist and florist who cultivates rare luminous night-blooms inside the Entity’s dark forest.",
            "quote": "\"Every flower has a secret thorn... but only to protect its beauty.\"",
            "green_flags": [
                "Brings you glowing night-blooms",
                "Creates herbal remedies that restore health",
                "Warm, nurturing presence"
            ],
            "red_flags": [
                "Mixes experimental teas that might cause hallucinations"
            ],
            "greenFlags": [
                "Brings you glowing night-blooms",
                "Creates herbal remedies that restore health",
                "Warm, nurturing presence"
            ],
            "redFlags": [
                "Mixes experimental teas that might cause hallucinations"
            ],
            "turn_on": "Luminous midnight flora and botanical glass vials",
            "turnOn": "Luminous midnight flora and botanical glass vials",
            "dealbreaker": "Trampling rare garden seedlings",
            "dating_vibe": "Tender, mysterious alchemist girlfriend",
            "datingVibe": "Tender, mysterious alchemist girlfriend",
            "chapter": "The Forgotten Garden",
            "compatibility_tags": [
                "The Botanical Alchemist",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Botanical Alchemist"
        }
    },
    {
        "slug": "leon_scott_kennedy",
        "name": "Leon S. Kennedy",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/leon_scott_kennedy.png",
        "metadata": {
            "title": "The Rookie Raccoon City Hero",
            "tagline": "Floppy 90s bangs, Flashbang crafts, and golden retriever energy.",
            "bio": "Raccoon City survivor turned top-secret government agent. Will craft flashbangs on generators and drop them at the exact right moment to protect you.",
            "quote": "\"Where’s everyone going? Bingo?\"",
            "green_flags": [
                "Flashbang saves are legendary",
                "Protective golden retriever husband material",
                "Floppy hair that never loses volume"
            ],
            "red_flags": [
                "Has a thing for enigmatic women in red dresses who betray him",
                "Worst first day at work in human history"
            ],
            "greenFlags": [
                "Flashbang saves are legendary",
                "Protective golden retriever husband material",
                "Floppy hair that never loses volume"
            ],
            "redFlags": [
                "Has a thing for enigmatic women in red dresses who betray him",
                "Worst first day at work in human history"
            ],
            "turn_on": "Laser sights, leather jackets, and tactical teamwork",
            "turnOn": "Laser sights, leather jackets, and tactical teamwork",
            "dealbreaker": "Betraying him for an umbrella virus sample",
            "dating_vibe": "Handsome, protective action hero with a heart of gold",
            "datingVibe": "Handsome, protective action hero with a heart of gold",
            "chapter": "Resident Evil",
            "compatibility_tags": [
                "The Rookie Raccoon City Hero",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Rookie Raccoon City Hero"
        }
    },
    {
        "slug": "felix_richter",
        "name": "Felix Richter",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/felix_richter.png",
        "metadata": {
            "title": "The Visionary Architect",
            "tagline": "German architecture, three-piece tailored suits, and jawlines that cut glass.",
            "bio": "Brilliant architect from Leipzig with impeccable tailoring and a desire to build a sanctuary even within the Fog.",
            "quote": "\"Every structure has a keystone. In this realm, we must be each other’s.\"",
            "green_flags": [
                "Desperate Measures unhook speed",
                "Built for You item recharges",
                "Tailored suits in a foggy mud pit"
            ],
            "red_flags": [
                "Obsessed with secret architectural societies",
                "Workaholic architect hours"
            ],
            "greenFlags": [
                "Desperate Measures unhook speed",
                "Built for You item recharges",
                "Tailored suits in a foggy mud pit"
            ],
            "redFlags": [
                "Obsessed with secret architectural societies",
                "Workaholic architect hours"
            ],
            "turn_on": "Minimalist Bauhaus architecture and espresso",
            "turnOn": "Minimalist Bauhaus architecture and espresso",
            "dealbreaker": "Sloppy blueprints and bad posture",
            "dating_vibe": "Sophisticated, elegant European gentleman",
            "datingVibe": "Sophisticated, elegant European gentleman",
            "chapter": "Descend Beyond",
            "compatibility_tags": [
                "The Visionary Architect",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Visionary Architect"
        }
    },
    {
        "slug": "vittorio_toscano",
        "name": "Vittorio Toscano",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/vittorio_toscano.png",
        "metadata": {
            "title": "The Medieval Scholar",
            "tagline": "Glowing arcane tattoos, silver hair, and centuries of ancient wisdom.",
            "bio": "14th-century Italian lord and arcane scholar who spent centuries traversing the Fog without losing his mind or his glorious abs.",
            "quote": "\"Time is an ocean, and knowledge is the vessel that keeps us afloat.\"",
            "green_flags": [
                "Potential Energy stores generator progress",
                "Aged like the finest medieval wine",
                "Glowing arcane tattoos look magnificent"
            ],
            "red_flags": [
                "Has been wandering the Fog for 600 years",
                "Speaks in medieval Latin when stressed"
            ],
            "greenFlags": [
                "Potential Energy stores generator progress",
                "Aged like the finest medieval wine",
                "Glowing arcane tattoos look magnificent"
            ],
            "redFlags": [
                "Has been wandering the Fog for 600 years",
                "Speaks in medieval Latin when stressed"
            ],
            "turn_on": "Ancient illuminated manuscripts and arcane ruins",
            "turnOn": "Ancient illuminated manuscripts and arcane ruins",
            "dealbreaker": "Ignorance and wanton destruction of knowledge",
            "dating_vibe": "Wise, poetic, immortal silver-fox scholar",
            "datingVibe": "Wise, poetic, immortal silver-fox scholar",
            "chapter": "Forged in Fog",
            "compatibility_tags": [
                "The Medieval Scholar",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Medieval Scholar"
        }
    },
    {
        "slug": "david_king",
        "name": "David King",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/david_king.png",
        "metadata": {
            "title": "The Manchester Brawler",
            "tagline": "Bare-knuckle boxing, Dead Hard dodges, and shirtless confidence.",
            "bio": "Rugby champion and pub brawler from Manchester. Rugged, fearless, and will take a protection hit for you every single time.",
            "quote": "\"Come on then, if you think you’re hard enough!\"",
            "green_flags": [
                "Dead Hard dodge master",
                "We’re Gonna Live Forever bloodpoint king",
                "Shirtless cosmetic option is iconic"
            ],
            "red_flags": [
                "Starts bar brawls on casual Tuesday nights",
                "No Mither broken state 24/7"
            ],
            "greenFlags": [
                "Dead Hard dodge master",
                "We’re Gonna Live Forever bloodpoint king",
                "Shirtless cosmetic option is iconic"
            ],
            "redFlags": [
                "Starts bar brawls on casual Tuesday nights",
                "No Mither broken state 24/7"
            ],
            "turn_on": "Rugby matches, pints of stout, and adrenaline",
            "turnOn": "Rugby matches, pints of stout, and adrenaline",
            "dealbreaker": "Pretentious wine tastings and snobs",
            "dating_vibe": "Rugged, protective, muscle-bound brawler",
            "datingVibe": "Rugged, protective, muscle-bound brawler",
            "chapter": "A Lullaby for the Dark",
            "compatibility_tags": [
                "The Manchester Brawler",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Manchester Brawler"
        }
    },
    {
        "slug": "steve_harrington",
        "name": "Steve Harrington",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/steve_harrington.png",
        "metadata": {
            "title": "The Babysitter & Scoops Ahoy King",
            "tagline": "Scoops Ahoy sailor suit, Farrah Fawcett hairspray, and nail bat heroics.",
            "bio": "From Hawkins king bee to the world’s best babysitter. Unhooks you with Babysitter and screams at the top of his lungs on the hook.",
            "quote": "\"Turns out I’m a pretty damn good babysitter.\"",
            "green_flags": [
                "Babysitter speed boost and aura hiding",
                "Iconic hair with 4 puffs of hairspray",
                "Will fight Demogorgons with a spiked bat"
            ],
            "red_flags": [
                "Ahoy uniform smells like melted rocky road",
                "High-pitched hook scream"
            ],
            "greenFlags": [
                "Babysitter speed boost and aura hiding",
                "Iconic hair with 4 puffs of hairspray",
                "Will fight Demogorgons with a spiked bat"
            ],
            "redFlags": [
                "Ahoy uniform smells like melted rocky road",
                "High-pitched hook scream"
            ],
            "turn_on": "Ice cream sundaes and 80s synth-pop",
            "turnOn": "Ice cream sundaes and 80s synth-pop",
            "dealbreaker": "Hurting the kids under his supervision",
            "dating_vibe": "Goofy, adorable, self-sacrificing heartthrob",
            "datingVibe": "Goofy, adorable, self-sacrificing heartthrob",
            "chapter": "Stranger Things",
            "compatibility_tags": [
                "The Babysitter & Scoops Ahoy King",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Babysitter & Scoops Ahoy King"
        }
    },
    {
        "slug": "nicolas_cage",
        "name": "Nicolas Cage",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/nicolas_cage.png",
        "metadata": {
            "title": "The Hollywood Legend",
            "tagline": "Dramaturgy rolls, Plot Twist plays, and pure unadulterated cinema.",
            "bio": "Literal Academy Award winner Nicolas Cage pulled into the Fog. Will give 110% acting commitment to every generator repair.",
            "quote": "\"I’m Nicolas Cage! I’m going to do my own stunts!\"",
            "green_flags": [
                "Custom voice lines during gameplay",
                "Plot Twist heals from dying state",
                "Can win an Oscar at any moment"
            ],
            "red_flags": [
                "Randomly screams \"NOT THE BEES!\" in chase",
                "May steal the Declaration of Independence on your second date"
            ],
            "greenFlags": [
                "Custom voice lines during gameplay",
                "Plot Twist heals from dying state",
                "Can win an Oscar at any moment"
            ],
            "redFlags": [
                "Randomly screams \"NOT THE BEES!\" in chase",
                "May steal the Declaration of Independence on your second date"
            ],
            "turn_on": "Method acting and vintage comic books",
            "turnOn": "Method acting and vintage comic books",
            "dealbreaker": "Boring scripts and bad directors",
            "dating_vibe": "Unpredictable, cinematic, legendary extravaganza",
            "datingVibe": "Unpredictable, cinematic, legendary extravaganza",
            "chapter": "Nicolas Cage",
            "compatibility_tags": [
                "The Hollywood Legend",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Hollywood Legend"
        }
    },
    {
        "slug": "alan_wake",
        "name": "Alan Wake",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/alan_wake.png",
        "metadata": {
            "title": "The Dark Place Author",
            "tagline": "Champion of Light flashlight beams, typewriter reels, and dark noir poetry.",
            "bio": "Bestselling crime author trapped in the Dark Place. Can turn a flashlight beam into a weapon of blinding justice.",
            "quote": "\"It’s not a loop, it’s a spiral.\"",
            "green_flags": [
                "Champion of Light slows killers",
                "Writes bestselling fiction about you",
                "Cozy tweed jackets and thermos coffee"
            ],
            "red_flags": [
                "Trapped in an infinite psychological nightmare spiral",
                "Throws flashlights at shadows in the living room"
            ],
            "greenFlags": [
                "Champion of Light slows killers",
                "Writes bestselling fiction about you",
                "Cozy tweed jackets and thermos coffee"
            ],
            "redFlags": [
                "Trapped in an infinite psychological nightmare spiral",
                "Throws flashlights at shadows in the living room"
            ],
            "turn_on": "Fresh ink ribbons and 100-watt flashlight bulbs",
            "turnOn": "Fresh ink ribbons and 100-watt flashlight bulbs",
            "dealbreaker": "Writer’s block and Scratch-like doppelgangers",
            "dating_vibe": "Brooding, literary, tortured noir genius",
            "datingVibe": "Brooding, literary, tortured noir genius",
            "chapter": "Alan Wake",
            "compatibility_tags": [
                "The Dark Place Author",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Dark Place Author"
        }
    },
    {
        "slug": "dwight_fairfield",
        "name": "Dwight Fairfield",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/dwight_fairfield.png",
        "metadata": {
            "title": "The Anxious Leader",
            "tagline": "Locker hideouts, Prove Thyself co-op speed, and nerd-cute leadership.",
            "bio": "Former pizza delivery guy with glasses and anxiety. Give him a team and he becomes the ultimate generator-boosting commander.",
            "quote": "\"Together, we can actually make it out of here!\"",
            "green_flags": [
                "Prove Thyself finishes gens at warp speed",
                "Leader aura buff",
                "Wholesome nerd charm"
            ],
            "red_flags": [
                "Hides in lockers when doorbells ring",
                "Sweats through dress shirts"
            ],
            "greenFlags": [
                "Prove Thyself finishes gens at warp speed",
                "Leader aura buff",
                "Wholesome nerd charm"
            ],
            "redFlags": [
                "Hides in lockers when doorbells ring",
                "Sweats through dress shirts"
            ],
            "turn_on": "Freshly delivered pizza and 4-man gen rushing",
            "turnOn": "Freshly delivered pizza and 4-man gen rushing",
            "dealbreaker": "Being abandoned alone in the trial",
            "dating_vibe": "Adorkable, loyal, nervous team leader",
            "datingVibe": "Adorkable, loyal, nervous team leader",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Anxious Leader",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Anxious Leader"
        }
    },
    {
        "slug": "jake_park",
        "name": "Jake Park",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/jake_park.png",
        "metadata": {
            "title": "The Solitary Survivalist",
            "tagline": "Hook sabotages, wilderness survival, and quiet outdoor ruggedness.",
            "bio": "Rebellious son of a wealthy CEO who abandoned society to live off the land. Sabotages meat hooks right in front of the killer.",
            "quote": "\"The wild taught me everything I need. Silence is my shield.\"",
            "green_flags": [
                "Saboteur hook breaks save teammates",
                "Iron Will silence in pain",
                "Can build a log cabin with bare hands"
            ],
            "red_flags": [
                "Prefers trees to human conversation",
                "Refuses to shower indoors"
            ],
            "greenFlags": [
                "Saboteur hook breaks save teammates",
                "Iron Will silence in pain",
                "Can build a log cabin with bare hands"
            ],
            "redFlags": [
                "Prefers trees to human conversation",
                "Refuses to shower indoors"
            ],
            "turn_on": "Toolboxes and quiet pine forests",
            "turnOn": "Toolboxes and quiet pine forests",
            "dealbreaker": "Corporate wealth and high-society galas",
            "dating_vibe": "Rugged, quiet mountain-man loner",
            "datingVibe": "Rugged, quiet mountain-man loner",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Solitary Survivalist",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Solitary Survivalist"
        }
    },
    {
        "slug": "ace_visconti",
        "name": "Ace Visconti",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/ace_visconti.png",
        "metadata": {
            "title": "The High-Rolling Gambler",
            "tagline": "Finger guns, lucky chest plunder, and silver-tongued charm.",
            "bio": "Argentinian gambler who smiles in the face of debt, death, and doom. Believes luck is just a smile away.",
            "quote": "\"Lady Luck never leaves my side, kiddo. Finger guns!\"",
            "green_flags": [
                "Ace in the Hole finds pink addons in chests",
                "Charismatic smile that melts tension",
                "Finger gun animations"
            ],
            "red_flags": [
                "Owes money to every mob boss in Buenos Aires",
                "Will bet your house on a 4% unhook attempt"
            ],
            "greenFlags": [
                "Ace in the Hole finds pink addons in chests",
                "Charismatic smile that melts tension",
                "Finger gun animations"
            ],
            "redFlags": [
                "Owes money to every mob boss in Buenos Aires",
                "Will bet your house on a 4% unhook attempt"
            ],
            "turn_on": "Royal flushes and silk Hawaiian shirts",
            "turnOn": "Royal flushes and silk Hawaiian shirts",
            "dealbreaker": "Playing it safe and boring routines",
            "dating_vibe": "Smooth-talking, charming rogue gambler",
            "datingVibe": "Smooth-talking, charming rogue gambler",
            "chapter": "Of Flesh and Mud",
            "compatibility_tags": [
                "The High-Rolling Gambler",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The High-Rolling Gambler"
        }
    },
    {
        "slug": "ash_williams",
        "name": "Ash Williams",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/ash_williams.png",
        "metadata": {
            "title": "The Deadite Slayer",
            "tagline": "Chainsaw hand, boomstick quotes, and pure Groovy energy.",
            "bio": "Retail clerk who accidentally summoned the Necronomicon and spent his life slaying Deadites with a chainsaw and a shotgun.",
            "quote": "\"Look who’s shitting in the tall grass. Groovy.\"",
            "green_flags": [
                "Mettle of Man extra health state",
                "Peak one-liner comedy",
                "Has literal chainsaw attachments"
            ],
            "red_flags": [
                "Read Latin from a cursed skin-bound book twice",
                "Will lose his prosthetic hand at dinner"
            ],
            "greenFlags": [
                "Mettle of Man extra health state",
                "Peak one-liner comedy",
                "Has literal chainsaw attachments"
            ],
            "redFlags": [
                "Read Latin from a cursed skin-bound book twice",
                "Will lose his prosthetic hand at dinner"
            ],
            "turn_on": "Double-barrel boomsticks and classic hotrods",
            "turnOn": "Double-barrel boomsticks and classic hotrods",
            "dealbreaker": "Reading ancient occult books out loud",
            "dating_vibe": "Over-the-top, hilarious 80s B-movie legend",
            "datingVibe": "Over-the-top, hilarious 80s B-movie legend",
            "chapter": "Ash vs Evil Dead",
            "compatibility_tags": [
                "The Deadite Slayer",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Deadite Slayer"
        }
    },
    {
        "slug": "bill_overbeck",
        "name": "Bill Overbeck",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/bill_overbeck.png",
        "metadata": {
            "title": "The Vietnam Veteran",
            "tagline": "Cigarettes, green beret, Borrowed Time, and Unbreakable spirit.",
            "bio": "Vietnam vet and Left 4 Dead legend. Unbreakable will to stand back up after being slugged and ensure everyone else escapes first.",
            "quote": "\"I’ll be damned if I let any of you die on my watch.\"",
            "green_flags": [
                "Unbreakable self-pickup from dying state",
                "Borrowed Time saves matches",
                "Ultimate heroic grandpa/father figure"
            ],
            "red_flags": [
                "Chain-smokes cigarettes in enclosed spaces",
                "Refuses to see a doctor for coughs"
            ],
            "greenFlags": [
                "Unbreakable self-pickup from dying state",
                "Borrowed Time saves matches",
                "Ultimate heroic grandpa/father figure"
            ],
            "redFlags": [
                "Chain-smokes cigarettes in enclosed spaces",
                "Refuses to see a doctor for coughs"
            ],
            "turn_on": "Tactical discipline and green berets",
            "turnOn": "Tactical discipline and green berets",
            "dealbreaker": "Leaving a teammate behind",
            "dating_vibe": "Grizzled, heroic veteran protector",
            "datingVibe": "Grizzled, heroic veteran protector",
            "chapter": "Left 4 Dead",
            "compatibility_tags": [
                "The Vietnam Veteran",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Vietnam Veteran"
        }
    },
    {
        "slug": "adam_francis",
        "name": "Adam Francis",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/adam_francis.png",
        "metadata": {
            "title": "The Resourceful Teacher",
            "tagline": "Pebble throws (Diversion), Deliverance 100% unhook, and sharp intellect.",
            "bio": "Kingston-born teacher in Tokyo who relies on intellect and composure. Throws pebbles to distract killers and unhooks himself with Deliverance.",
            "quote": "\"Preparation is the foundation of survival.\"",
            "green_flags": [
                "Deliverance instant unhooks",
                "Calculated, calm under fire",
                "Pebble throw distraction plays"
            ],
            "red_flags": [
                "Takes life too seriously",
                "Will grade your essays on dates"
            ],
            "greenFlags": [
                "Deliverance instant unhooks",
                "Calculated, calm under fire",
                "Pebble throw distraction plays"
            ],
            "redFlags": [
                "Takes life too seriously",
                "Will grade your essays on dates"
            ],
            "turn_on": "Sharp minds, books, and pebble throws",
            "turnOn": "Sharp minds, books, and pebble throws",
            "dealbreaker": "Lack of discipline and reckless chaos",
            "dating_vibe": "Intelligent, refined, reliable gentleman teacher",
            "datingVibe": "Intelligent, refined, reliable gentleman teacher",
            "chapter": "Shattered Bloodline",
            "compatibility_tags": [
                "The Resourceful Teacher",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Resourceful Teacher"
        }
    },
    {
        "slug": "jeff_johansen",
        "name": "Jeff Johansen",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/jeff_johansen.png",
        "metadata": {
            "title": "The Heavy Metal Artist",
            "tagline": "Beards, oil painting, black metal vinyl, and gentle giant heart.",
            "bio": "Heavy metal artist from Ormond with a gentle soul. Loves dogs, paints breathtaking murals, and breaks killer auras with Distortion.",
            "quote": "\"Art is how we scream into the void.\"",
            "green_flags": [
                "Distortion hides your aura from killers",
                "Loves rescue dogs (paints them too)",
                "Cozy flannel shirts and bear hugs"
            ],
            "red_flags": [
                "His loud breathing can be heard from 32 meters away"
            ],
            "greenFlags": [
                "Distortion hides your aura from killers",
                "Loves rescue dogs (paints them too)",
                "Cozy flannel shirts and bear hugs"
            ],
            "redFlags": [
                "His loud breathing can be heard from 32 meters away"
            ],
            "turn_on": "Black metal vinyl records and large canvas oil paints",
            "turnOn": "Black metal vinyl records and large canvas oil paints",
            "dealbreaker": "Animal cruelty and shallow pop music",
            "dating_vibe": "Gentle giant metalhead artist with teddy-bear warmth",
            "datingVibe": "Gentle giant metalhead artist with teddy-bear warmth",
            "chapter": "Darkness Among Us",
            "compatibility_tags": [
                "The Heavy Metal Artist",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Heavy Metal Artist"
        }
    },
    {
        "slug": "jonah_vasquez",
        "name": "Jonah Vasquez",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/jonah_vasquez.png",
        "metadata": {
            "title": "The CIA Cryptographer",
            "tagline": "Mathematical formulas, Boon: Exponential, and analytical brilliance.",
            "bio": "CIA codebreaker who stumbled upon mathematical coordinates left by the Entity. Calculates optimal looping routes in milliseconds.",
            "quote": "\"Every pattern reveals a vulnerability.\"",
            "green_flags": [
                "Boon: Exponential unslugs teammates",
                "Genius mathematical intelligence",
                "Sharp analytical problem solver"
            ],
            "red_flags": [
                "Over-analyzes every text message down to character counts"
            ],
            "greenFlags": [
                "Boon: Exponential unslugs teammates",
                "Genius mathematical intelligence",
                "Sharp analytical problem solver"
            ],
            "redFlags": [
                "Over-analyzes every text message down to character counts"
            ],
            "turn_on": "Prime number ciphers and encrypted messaging",
            "turnOn": "Prime number ciphers and encrypted messaging",
            "dealbreaker": "Disorganized thinking and emotional volatility",
            "dating_vibe": "Analytical, sharp cryptographer with high IQ",
            "datingVibe": "Analytical, sharp cryptographer with high IQ",
            "chapter": "Portrait of a Murder",
            "compatibility_tags": [
                "The CIA Cryptographer",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The CIA Cryptographer"
        }
    },
    {
        "slug": "quentin_smith",
        "name": "Quentin Smith",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/quentin_smith.png",
        "metadata": {
            "title": "The Insomniac Dream Fighter",
            "tagline": "Energy drinks, sleep deprivation, Pharmacy chests, and sheer grit.",
            "bio": "Springwood teen who fights Freddy Krueger by refusing to fall asleep. Will loot green med-kits out of chests with Pharmacy.",
            "quote": "\"I’m not tired. I’ll sleep when we get out of here.\"",
            "green_flags": [
                "Pharmacy finds guaranteed green med-kits",
                "Vigil accelerates status recovery",
                "Will stay awake all night to talk to you"
            ],
            "red_flags": [
                "Dark eye bags from 4 weeks without REM sleep",
                "Drinks 12 cans of Monster Energy per day"
            ],
            "greenFlags": [
                "Pharmacy finds guaranteed green med-kits",
                "Vigil accelerates status recovery",
                "Will stay awake all night to talk to you"
            ],
            "redFlags": [
                "Dark eye bags from 4 weeks without REM sleep",
                "Drinks 12 cans of Monster Energy per day"
            ],
            "turn_on": "Pill bottles, energy drinks, and daylight",
            "turnOn": "Pill bottles, energy drinks, and daylight",
            "dealbreaker": "Telling him to take a nap",
            "dating_vibe": "Sleep-deprived, protective teenage fighter",
            "datingVibe": "Sleep-deprived, protective teenage fighter",
            "chapter": "A Nightmare on Elm Street",
            "compatibility_tags": [
                "The Insomniac Dream Fighter",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Insomniac Dream Fighter"
        }
    },
    {
        "slug": "david_tapp",
        "name": "Detective Tapp",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/david_tapp.png",
        "metadata": {
            "title": "The Obsessive Detective",
            "tagline": "Tenacity crawling, Stake Out great skill checks, and trench coats.",
            "bio": "Relentless police detective who tracked Jigsaw to the bitter end. Crawls at hyperspeed while recovering with Tenacity.",
            "quote": "\"I’ve got the pieces of the puzzle right here.\"",
            "green_flags": [
                "Stake Out converts good skill checks to Greats",
                "Tenacity crawl speed is unmatched",
                "Unstoppable sense of duty"
            ],
            "red_flags": [
                "Obsessed with cold case murder files",
                "Trench coat has knife scars on the throat"
            ],
            "greenFlags": [
                "Stake Out converts good skill checks to Greats",
                "Tenacity crawl speed is unmatched",
                "Unstoppable sense of duty"
            ],
            "redFlags": [
                "Obsessed with cold case murder files",
                "Trench coat has knife scars on the throat"
            ],
            "turn_on": "Fingerprint dust and forensic audio recordings",
            "turnOn": "Fingerprint dust and forensic audio recordings",
            "dealbreaker": "Corrupt officials and obstruction of justice",
            "dating_vibe": "Grizzled, determined crime-fighting detective",
            "datingVibe": "Grizzled, determined crime-fighting detective",
            "chapter": "SAW",
            "compatibility_tags": [
                "The Obsessive Detective",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Obsessive Detective"
        }
    },
    {
        "slug": "rick_grimes",
        "name": "Rick Grimes",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/rick_grimes.png",
        "metadata": {
            "title": "The Alexandria Sheriff",
            "tagline": "Colt Python revolver, sheriff hat, and leader of the survivors.",
            "bio": "Sheriff who led humanity through the walker apocalypse. Rugged, authoritative, and will fight tooth and nail for family.",
            "quote": "\"We are the ones who live.\"",
            "green_flags": [
                "Natural charismatic leader",
                "Will tear a throat out with his teeth to protect you",
                "Rugged sheriff charm"
            ],
            "red_flags": [
                "Head tilt when lecturing you",
                "Has seen too many good people fall"
            ],
            "greenFlags": [
                "Natural charismatic leader",
                "Will tear a throat out with his teeth to protect you",
                "Rugged sheriff charm"
            ],
            "redFlags": [
                "Head tilt when lecturing you",
                "Has seen too many good people fall"
            ],
            "turn_on": "Sheriff badges and clean revolver cylinders",
            "turnOn": "Sheriff badges and clean revolver cylinders",
            "dealbreaker": "Endangering the group",
            "dating_vibe": "Grizzled, protective sheriff and family protector",
            "datingVibe": "Grizzled, protective sheriff and family protector",
            "chapter": "The Walking Dead",
            "compatibility_tags": [
                "The Alexandria Sheriff",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Alexandria Sheriff"
        }
    },
    {
        "slug": "dustin_henderson",
        "name": "Dustin Henderson",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/dustin_henderson.png",
        "metadata": {
            "title": "The Cerebro Technician",
            "tagline": "Radio towers, D&D strategy, and never-ending optimism.",
            "bio": "The smartest kid in Hawkins. Built Cerebro, talks to girlfriends over ham radio, and solves monster puzzles with D&D lore.",
            "quote": "\"Neverending Stoooryyyy! Ah-ah-ah!\"",
            "green_flags": [
                "Can fix any radio, generator, or computer",
                "Sings Neverending Story in harmony",
                "Hilarious and fiercely loyal"
            ],
            "red_flags": [
                "Adopted a baby Demogorgon in his room (Dart)"
            ],
            "greenFlags": [
                "Can fix any radio, generator, or computer",
                "Sings Neverending Story in harmony",
                "Hilarious and fiercely loyal"
            ],
            "redFlags": [
                "Adopted a baby Demogorgon in his room (Dart)"
            ],
            "turn_on": "Ham radio frequencies and D&D campaigns",
            "turnOn": "Ham radio frequencies and D&D campaigns",
            "dealbreaker": "Making fun of his curly hair or teeth",
            "dating_vibe": "Nerdy, brilliant, hilarious young strategist",
            "datingVibe": "Nerdy, brilliant, hilarious young strategist",
            "chapter": "Stranger Things",
            "compatibility_tags": [
                "The Cerebro Technician",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Cerebro Technician"
        }
    },
    {
        "slug": "kwon_tae_young",
        "name": "Tae-Young",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/kwon_tae_young.png",
        "metadata": {
            "title": "The Seoul Tech Specialist",
            "tagline": "Cybersecurity, drone bypassing, and sleek urban aesthetics.",
            "bio": "Seoul cybersecurity expert who reverse-engineers high-tech corporate infrastructure and tracks killer aura signals.",
            "quote": "\"Every firewall has an exploit. You just have to find the pulse.\"",
            "green_flags": [
                "Hacks any security lock in seconds",
                "Sleek modern Korean streetwear style",
                "Calm and collected in emergencies"
            ],
            "red_flags": [
                "Watches packet traces during dinner dates"
            ],
            "greenFlags": [
                "Hacks any security lock in seconds",
                "Sleek modern Korean streetwear style",
                "Calm and collected in emergencies"
            ],
            "redFlags": [
                "Watches packet traces during dinner dates"
            ],
            "turn_on": "Zero-day exploits and mechanical keyboards",
            "turnOn": "Zero-day exploits and mechanical keyboards",
            "dealbreaker": "Weak passwords and cyber-carelessness",
            "dating_vibe": "Cool, tech-savvy urban hacker with sleek visuals",
            "datingVibe": "Cool, tech-savvy urban hacker with sleek visuals",
            "chapter": "All-Kill Legacy",
            "compatibility_tags": [
                "The Seoul Tech Specialist",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Seoul Tech Specialist"
        }
    },
    {
        "slug": "shane_wiigwaas",
        "name": "Shane",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/shane_wiigwaas.png",
        "metadata": {
            "title": "The Great Lakes Tracker",
            "tagline": "Forest navigation, birchbark canoe craft, and silent footsteps.",
            "bio": "Indigenous tracker from the Great Lakes. Can read broken twigs and forest moss to lead entire groups out of danger.",
            "quote": "\"The earth speaks to those who listen without pride.\"",
            "green_flags": [
                "Never gets lost in any forest or trial map",
                "Quiet, deeply grounded emotional maturity",
                "Can start a fire in pouring rain"
            ],
            "red_flags": [
                "Prefers silent contemplation over texting back"
            ],
            "greenFlags": [
                "Never gets lost in any forest or trial map",
                "Quiet, deeply grounded emotional maturity",
                "Can start a fire in pouring rain"
            ],
            "redFlags": [
                "Prefers silent contemplation over texting back"
            ],
            "turn_on": "Starlit lakes and handcrafted birch crafts",
            "turnOn": "Starlit lakes and handcrafted birch crafts",
            "dealbreaker": "Disrespecting the natural world",
            "dating_vibe": "Grounded, peaceful, rugged wilderness guide",
            "datingVibe": "Grounded, peaceful, rugged wilderness guide",
            "chapter": "Northern Mists",
            "compatibility_tags": [
                "The Great Lakes Tracker",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Great Lakes Tracker"
        }
    },
    {
        "slug": "renato_lyra",
        "name": "Renato Lyra",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/renato_lyra.png",
        "metadata": {
            "title": "The Rio Strategist",
            "tagline": "Background Player sprint bursts, kite tactics, and chill Brazilian charm.",
            "bio": "Kite fighter from Rio de Janeiro who plans 5 steps ahead. Background Player gives him hypersonic sprint speed when teammates are carried.",
            "quote": "\"Take your time, read the wind, and make your move.\"",
            "green_flags": [
                "Background Player flashlight saves are glorious",
                "Chill, patient, and sweet demeanor",
                "Great with family and friends"
            ],
            "red_flags": [
                "Overthinks simple restaurant orders"
            ],
            "greenFlags": [
                "Background Player flashlight saves are glorious",
                "Chill, patient, and sweet demeanor",
                "Great with family and friends"
            ],
            "redFlags": [
                "Overthinks simple restaurant orders"
            ],
            "turn_on": "Strategic games and ocean sunsets",
            "turnOn": "Strategic games and ocean sunsets",
            "dealbreaker": "Impatience and unnecessary shouting",
            "dating_vibe": "Sweet, athletic, strategic Brazilian heartthrob",
            "datingVibe": "Sweet, athletic, strategic Brazilian heartthrob",
            "chapter": "Tools of Torment",
            "compatibility_tags": [
                "The Rio Strategist",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Rio Strategist"
        }
    },
    {
        "slug": "trevor_belmont",
        "name": "Trevor Belmont",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/trevor_belmont.png",
        "metadata": {
            "title": "The Vampire Hunter",
            "tagline": "Vampire Killer whip, leather armor, and centuries of monster slaying.",
            "bio": "The last son of House Belmont. Wields legendary consecrated whips, drinks ale, and punches Dracula in the jaw for breakfast.",
            "quote": "\"I’m Trevor Belmont, of the House of Belmont, and I’ve never lost a fight to a monster.\"",
            "green_flags": [
                "Can whip any killer into submission",
                "Immense strength, resilience, and battle IQ",
                "Rugged medieval hero appeal"
            ],
            "red_flags": [
                "Drinks too much ale in medieval taverns",
                "Brawls first, asks questions later"
            ],
            "greenFlags": [
                "Can whip any killer into submission",
                "Immense strength, resilience, and battle IQ",
                "Rugged medieval hero appeal"
            ],
            "redFlags": [
                "Drinks too much ale in medieval taverns",
                "Brawls first, asks questions later"
            ],
            "turn_on": "Consecrated whips, cold ale, and righteous battles",
            "turnOn": "Consecrated whips, cold ale, and righteous battles",
            "dealbreaker": "Vampire sympathizers",
            "dating_vibe": "Rough-around-the-edges monster slayer with a noble heart",
            "datingVibe": "Rough-around-the-edges monster slayer with a noble heart",
            "chapter": "Castlevania",
            "compatibility_tags": [
                "The Vampire Hunter",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Vampire Hunter"
        }
    },
    {
        "slug": "yoichi_asakawa",
        "name": "Yoichi Asakawa",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/yoichi_asakawa.png",
        "metadata": {
            "title": "The Marine Biologist",
            "tagline": "Yellow raincoat, ocean research, Boon: Dark Theory, and Sadako survivor.",
            "bio": "The boy who survived Sadako’s cursed tape, now a renowned oceanographer. Yellow raincoat and Boon: Dark Theory movement speed.",
            "quote": "\"The ocean keeps its secrets, but so do I.\"",
            "green_flags": [
                "Boon: Dark Theory speed boost",
                "Distinguished oceanographer and researcher",
                "Iconic yellow sailor jacket"
            ],
            "red_flags": [
                "Cursed since childhood by a vengeful well ghost"
            ],
            "greenFlags": [
                "Boon: Dark Theory speed boost",
                "Distinguished oceanographer and researcher",
                "Iconic yellow sailor jacket"
            ],
            "redFlags": [
                "Cursed since childhood by a vengeful well ghost"
            ],
            "turn_on": "Deep sea diving and ancient nautical maps",
            "turnOn": "Deep sea diving and ancient nautical maps",
            "dealbreaker": "Videotapes left on the floor",
            "dating_vibe": "Intellectual, gentle ocean scientist with mysterious past",
            "datingVibe": "Intellectual, gentle ocean scientist with mysterious past",
            "chapter": "Sadako Rising",
            "compatibility_tags": [
                "The Marine Biologist",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Marine Biologist"
        }
    },
    {
        "slug": "gabriel_soma",
        "name": "Gabriel Soma",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/gabriel_soma.png",
        "metadata": {
            "title": "The Deep Space Clone",
            "tagline": "Made For This endurance, sci-fi engineering, and resilient humanity.",
            "bio": "Engineered deep-space colonist who defied AI subjugation on planet Dvarka. Made For This endurance status keeps him standing tall.",
            "quote": "\"I was made to survive. And I will.\"",
            "green_flags": [
                "Made For This extra endurance state",
                "Top-tier sci-fi tech troubleshooting",
                "Unbreakable will to live"
            ],
            "red_flags": [
                "Existential dread about being a clone",
                "Wants to sleep in cryo-pods"
            ],
            "greenFlags": [
                "Made For This extra endurance state",
                "Top-tier sci-fi tech troubleshooting",
                "Unbreakable will to live"
            ],
            "redFlags": [
                "Existential dread about being a clone",
                "Wants to sleep in cryo-pods"
            ],
            "turn_on": "Cryo-tech engines and starry nebulas",
            "turnOn": "Cryo-tech engines and starry nebulas",
            "dealbreaker": "Rogue AI systems",
            "dating_vibe": "Futuristic, resilient space engineer",
            "datingVibe": "Futuristic, resilient space engineer",
            "chapter": "End Transmission",
            "compatibility_tags": [
                "The Deep Space Clone",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Deep Space Clone"
        }
    },
    {
        "slug": "the_troupe",
        "name": "The Troupe",
        "role": "Survivor",
        "gender": "monster_other",
        "media_url": "/static/icons/survivors/the_troupe.png",
        "metadata": {
            "title": "The D&D Bards",
            "tagline": "Bardic Inspiration dice rolls, lute solos, and illusion magic.",
            "bio": "Elven and human bards from Dungeons & Dragons who cast Mirrored Illusion and roll 20-sided dice with Bardic Inspiration.",
            "quote": "\"A song for the fallen, a tune for the free!\"",
            "green_flags": [
                "Plays lute solos during generator repair",
                "Bardic Inspiration buffs all skill checks",
                "Mirrored Illusion decoys fool killers"
            ],
            "red_flags": [
                "Might roll a Nat 1 on your wedding proposal",
                "Constantly rhyming in conversation"
            ],
            "greenFlags": [
                "Plays lute solos during generator repair",
                "Bardic Inspiration buffs all skill checks",
                "Mirrored Illusion decoys fool killers"
            ],
            "redFlags": [
                "Might roll a Nat 1 on your wedding proposal",
                "Constantly rhyming in conversation"
            ],
            "turn_on": "Lute solos, D20 dice, and tavern songs",
            "turnOn": "Lute solos, D20 dice, and tavern songs",
            "dealbreaker": "Tone-deaf critics who hate fantasy roleplay",
            "dating_vibe": "Musical, magical, whimsical fantasy bards",
            "datingVibe": "Musical, magical, whimsical fantasy bards",
            "chapter": "Dungeons & Dragons",
            "compatibility_tags": [
                "The D&D Bards",
                "Survivor",
                "monster_other"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The D&D Bards"
        }
    },
    {
        "slug": "the_huntress",
        "name": "The Huntress",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_huntress.png",
        "metadata": {
            "title": "The Red Forest Mother",
            "tagline": "7-foot tall muscle mommy with hatchets and a haunting lullaby.",
            "bio": "Raised alone in the harsh Russian wilderness. Towering, incredibly strong, and hums \"Bayu Bayushki Bayu\" while cross-map sniping survivors.",
            "quote": "\"(Gentle, haunting lullaby echoing through the pine trees)\"",
            "green_flags": [
                "Can build a log fortress with her bare hands",
                "Cross-map hatchet accuracy",
                "Will fiercely protect anyone she considers family"
            ],
            "red_flags": [
                "Will lock you in a wooden forest cottage forever",
                "Hatchets fly when she gets mildly annoyed"
            ],
            "greenFlags": [
                "Can build a log fortress with her bare hands",
                "Cross-map hatchet accuracy",
                "Will fiercely protect anyone she considers family"
            ],
            "redFlags": [
                "Will lock you in a wooden forest cottage forever",
                "Hatchets fly when she gets mildly annoyed"
            ],
            "turn_on": "Handcrafted wooden toys and pine forests",
            "turnOn": "Handcrafted wooden toys and pine forests",
            "dealbreaker": "Weak grip and running away from her lullaby",
            "dating_vibe": "Imposing muscle-mommy forest guardian",
            "datingVibe": "Imposing muscle-mommy forest guardian",
            "chapter": "A Lullaby for the Dark",
            "compatibility_tags": [
                "The Red Forest Mother",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Red Forest Mother"
        }
    },
    {
        "slug": "the_spirit",
        "name": "The Spirit",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_spirit.png",
        "metadata": {
            "title": "The Vengeful Onryō",
            "tagline": "Katana strikes, phase-walking mist, and shattered glass aesthetic.",
            "bio": "Tragic heiress to the Yamaoka bloodline. Moves at supernatural speed through phase-walking with her ancestor’s shattered katana.",
            "quote": "\"(Furious spirit cries as mist shatters into glass)\"",
            "green_flags": [
                "Phase-walk speed is unmatched",
                "Ancestral katana blade mastery",
                "Stunning glass-shard glow aesthetic"
            ],
            "red_flags": [
                "Phase-walks behind you whenever you say \"we need to talk\"",
                "Severe ancestral rage issues"
            ],
            "greenFlags": [
                "Phase-walk speed is unmatched",
                "Ancestral katana blade mastery",
                "Stunning glass-shard glow aesthetic"
            ],
            "redFlags": [
                "Phase-walks behind you whenever you say \"we need to talk\"",
                "Severe ancestral rage issues"
            ],
            "turn_on": "Traditional Japanese shrines and clean sword cuts",
            "turnOn": "Traditional Japanese shrines and clean sword cuts",
            "dealbreaker": "Disloyalty and betrayal",
            "dating_vibe": "Ethereal, dangerous, tragic supernatural fury",
            "datingVibe": "Ethereal, dangerous, tragic supernatural fury",
            "chapter": "Shattered Bloodline",
            "compatibility_tags": [
                "The Vengeful Onryō",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Vengeful Onryō"
        }
    },
    {
        "slug": "the_skull_merchant",
        "name": "The Skull Merchant",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_skull_merchant.png",
        "metadata": {
            "title": "The High-Tech Executive",
            "tagline": "Radar drones, claw gauntlets, and high-fashion catwalk killer.",
            "bio": "Billionaire tech CEO and manga fanatic who hunts corporate rivals with custom aerial skull-drones and a twin-blade gauntlet.",
            "quote": "\"Every market has competitors. I just liquidate mine permanently.\"",
            "green_flags": [
                "Billionaire bank account",
                "High-tech drone surveillance protects your home",
                "Impeccable high-fashion designer catwalk"
            ],
            "red_flags": [
                "3-gen drone camping matches lasted 45 minutes",
                "Tracks your phone with aerial thermal drones"
            ],
            "greenFlags": [
                "Billionaire bank account",
                "High-tech drone surveillance protects your home",
                "Impeccable high-fashion designer catwalk"
            ],
            "redFlags": [
                "3-gen drone camping matches lasted 45 minutes",
                "Tracks your phone with aerial thermal drones"
            ],
            "turn_on": "Surveillance data and hostile corporate takeovers",
            "turnOn": "Surveillance data and hostile corporate takeovers",
            "dealbreaker": "Poor financial acumen and drone hacking",
            "dating_vibe": "Deadly corporate heiress with manga obsession",
            "datingVibe": "Deadly corporate heiress with manga obsession",
            "chapter": "Tools of Torment",
            "compatibility_tags": [
                "The High-Tech Executive",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The High-Tech Executive"
        }
    },
    {
        "slug": "the_pig",
        "name": "The Pig",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_pig.png",
        "metadata": {
            "title": "The Jigsaw Apprentice",
            "tagline": "Boop the snoot, Reverse Bear Traps, and stealth ambush roar.",
            "bio": "Jigsaw’s conflicted apprentice. Masters stealth crouching and puts ticking Reverse Bear Traps on heads. Community demands you boop her snoot.",
            "quote": "\"Game Over. Unless you give me a snoot boop.\"",
            "green_flags": [
                "Allows snoot boops if you are polite",
                "Reverse Bear Trap keeps party guests punctual",
                "Hidden blade ambush speed"
            ],
            "red_flags": [
                "Rules of her games are sometimes rigged",
                "Gets nerfed in every single patch note"
            ],
            "greenFlags": [
                "Allows snoot boops if you are polite",
                "Reverse Bear Trap keeps party guests punctual",
                "Hidden blade ambush speed"
            ],
            "redFlags": [
                "Rules of her games are sometimes rigged",
                "Gets nerfed in every single patch note"
            ],
            "turn_on": "Snoot boops and intricate mechanical timers",
            "turnOn": "Snoot boops and intricate mechanical timers",
            "dealbreaker": "Refusing to boop the snoot or breaking test rules",
            "dating_vibe": "Stealthy, conflicted puzzle-mistress",
            "datingVibe": "Stealthy, conflicted puzzle-mistress",
            "chapter": "SAW",
            "compatibility_tags": [
                "The Jigsaw Apprentice",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Jigsaw Apprentice"
        }
    },
    {
        "slug": "the_plague",
        "name": "The Plague",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_plague.png",
        "metadata": {
            "title": "The High Priestess of Babylon",
            "tagline": "Golden censer, Corrupt Purge, and 7-foot tall ancient beauty.",
            "bio": "High priestess of Babylon who sacrificed herself for her dying followers. Beautiful, tragic, tall, and wields the purifying Vile Purge.",
            "quote": "\"(Mesopotamian prayer chants echoing over golden censers)\"",
            "green_flags": [
                "7-foot tall ancient Mesopotamian royalty",
                "Deep spiritual devotion",
                "Golden jewel-encrusted censer"
            ],
            "red_flags": [
                "Corrupt Purge vomit attacks on first dates",
                "Broken status effect means no healing allowed"
            ],
            "greenFlags": [
                "7-foot tall ancient Mesopotamian royalty",
                "Deep spiritual devotion",
                "Golden jewel-encrusted censer"
            ],
            "redFlags": [
                "Corrupt Purge vomit attacks on first dates",
                "Broken status effect means no healing allowed"
            ],
            "turn_on": "Faithful worship and clean golden censers",
            "turnOn": "Faithful worship and clean golden censers",
            "dealbreaker": "Drinking from the cleansing pool without permission",
            "dating_vibe": "Towering ancient goddess with tragic devotion",
            "datingVibe": "Towering ancient goddess with tragic devotion",
            "chapter": "Demise of the Faithful",
            "compatibility_tags": [
                "The High Priestess of Babylon",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The High Priestess of Babylon"
        }
    },
    {
        "slug": "the_artist",
        "name": "The Artist",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_artist.png",
        "metadata": {
            "title": "The Ink-Drenched Surrealist",
            "tagline": "Dire Crows, black ink hands, and avant-garde Chilean art.",
            "bio": "Chilean surrealist painter whose voice was stolen by corrupt politicians. Manipulates murderous ink crows with graceful avian elegance.",
            "quote": "\"(Heartbreaking crow cry and brush stroke of black ink)\"",
            "green_flags": [
                "Brilliant avant-garde artist",
                "Dire crows provide cross-map intel",
                "Elegantly tall with graceful bird-like movements"
            ],
            "red_flags": [
                "Ink stains on all the white bedsheets",
                "Flocks of crows spy on your phone"
            ],
            "greenFlags": [
                "Brilliant avant-garde artist",
                "Dire crows provide cross-map intel",
                "Elegantly tall with graceful bird-like movements"
            ],
            "redFlags": [
                "Ink stains on all the white bedsheets",
                "Flocks of crows spy on your phone"
            ],
            "turn_on": "Black ink sketches and expressive poetry",
            "turnOn": "Black ink sketches and expressive poetry",
            "dealbreaker": "Artistic censorship and corrupt politics",
            "dating_vibe": "Poetic, gothic, ink-stained surrealist artist",
            "datingVibe": "Poetic, gothic, ink-stained surrealist artist",
            "chapter": "Portrait of a Murder",
            "compatibility_tags": [
                "The Ink-Drenched Surrealist",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Ink-Drenched Surrealist"
        }
    },
    {
        "slug": "the_nurse",
        "name": "The Nurse",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_nurse.png",
        "metadata": {
            "title": "The Blink Mistress",
            "tagline": "Spencer’s Last Breath blinks, bonesaw elegance, and S-tier lethality.",
            "bio": "Former asylum nurse who snapped under grueling conditions. Blinks through walls and pallets with terrifying grace and speed.",
            "quote": "\"(Ghostly wheeze as she blinks through solid matter)\"",
            "green_flags": [
                "Undisputed #1 strongest killer in DBD history",
                "Can blink through traffic jams and walls",
                "Always wears clean linen"
            ],
            "red_flags": [
                "Fatigue stun wheezes after every blink",
                "Might mistake you for an unruly asylum patient"
            ],
            "greenFlags": [
                "Undisputed #1 strongest killer in DBD history",
                "Can blink through traffic jams and walls",
                "Always wears clean linen"
            ],
            "redFlags": [
                "Fatigue stun wheezes after every blink",
                "Might mistake you for an unruly asylum patient"
            ],
            "turn_on": "Flawless triple blinks and clean surgical cuts",
            "turnOn": "Flawless triple blinks and clean surgical cuts",
            "dealbreaker": "Disrespecting the medical profession",
            "dating_vibe": "Ethereal, deadly, floating Victorian phantom",
            "datingVibe": "Ethereal, deadly, floating Victorian phantom",
            "chapter": "The Last Breath",
            "compatibility_tags": [
                "The Blink Mistress",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Blink Mistress"
        }
    },
    {
        "slug": "the_onryō",
        "name": "The Onryō (Sadako)",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_onryō.png",
        "metadata": {
            "title": "The Well Spectre",
            "tagline": "TV projections, cursed videotapes, and spooky condemned moris.",
            "bio": "The iconic psychic spectre from Ringu. Teleports through television screens and condemns those who fail to return her videotape within 7 days.",
            "quote": "\"(Ominous television static and well water dripping)\"",
            "green_flags": [
                "Instant TV teleportation to your living room",
                "Classic horror royalty",
                "Looks great in vintage white robes"
            ],
            "red_flags": [
                "Sends cursed VHS tapes if you don’t reply in 7 days",
                "Leaves wet muddy footprints everywhere"
            ],
            "greenFlags": [
                "Instant TV teleportation to your living room",
                "Classic horror royalty",
                "Looks great in vintage white robes"
            ],
            "redFlags": [
                "Sends cursed VHS tapes if you don’t reply in 7 days",
                "Leaves wet muddy footprints everywhere"
            ],
            "turn_on": "VHS tapes and dark television screens",
            "turnOn": "VHS tapes and dark television screens",
            "dealbreaker": "Not rewinding the videotape before returning it",
            "dating_vibe": "Creepy-cute psychic ghost girl",
            "datingVibe": "Creepy-cute psychic ghost girl",
            "chapter": "Sadako Rising",
            "compatibility_tags": [
                "The Well Spectre",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Well Spectre"
        }
    },
    {
        "slug": "the_hag",
        "name": "The Hag",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_hag.png",
        "metadata": {
            "title": "The Swamp Witch",
            "tagline": "Phantasm mud traps, mud teleportation, and wetland sorcery.",
            "bio": "Abducted and tortured by cannibals in a backwater swamp, drew ancient symbols on the mud to exact bloody vengeance.",
            "quote": "\"(Terrifying mud trap pop and screeching claw swipe)\"",
            "green_flags": [
                "Can teleport to any mud trap across the yard",
                "Masters ancient tribal protective symbols",
                "Never lets anyone push her around"
            ],
            "red_flags": [
                "Draws mud runes on the kitchen floor",
                "Likes eating raw livers"
            ],
            "greenFlags": [
                "Can teleport to any mud trap across the yard",
                "Masters ancient tribal protective symbols",
                "Never lets anyone push her around"
            ],
            "redFlags": [
                "Draws mud runes on the kitchen floor",
                "Likes eating raw livers"
            ],
            "turn_on": "Fresh mud drawings and backwater swamps",
            "turnOn": "Fresh mud drawings and backwater swamps",
            "dealbreaker": "Wiping away her mud traps with a flashlight",
            "dating_vibe": "Fierce, vengeful swamp sorceress",
            "datingVibe": "Fierce, vengeful swamp sorceress",
            "chapter": "Of Flesh and Mud",
            "compatibility_tags": [
                "The Swamp Witch",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Swamp Witch"
        }
    },
    {
        "slug": "the_houndmaster",
        "name": "The Houndmaster",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_houndmaster.png",
        "metadata": {
            "title": "The Canine Commander",
            "tagline": "War hounds, hunting whistles, and seaside tracking.",
            "bio": "Pirate and hound trainer who commands a loyal war dog to sniff out, chase, and pin down targets with military precision.",
            "quote": "\"Hunt them down, boy! Leave nothing behind!\"",
            "green_flags": [
                "Comes with a very good loyal boy (war hound)",
                "Incredible navigation and pirate flair",
                "High discipline and loyalty"
            ],
            "red_flags": [
                "Dog sheds everywhere and bites visitors"
            ],
            "greenFlags": [
                "Comes with a very good loyal boy (war hound)",
                "Incredible navigation and pirate flair",
                "High discipline and loyalty"
            ],
            "redFlags": [
                "Dog sheds everywhere and bites visitors"
            ],
            "turn_on": "Sea breezes, ship decks, and well-trained hounds",
            "turnOn": "Sea breezes, ship decks, and well-trained hounds",
            "dealbreaker": "Being bad with dogs",
            "dating_vibe": "Commanding, fierce pirate trainer with loyal hound",
            "datingVibe": "Commanding, fierce pirate trainer with loyal hound",
            "chapter": "Doomed Course",
            "compatibility_tags": [
                "The Canine Commander",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Canine Commander"
        }
    },
    {
        "slug": "the_krasue",
        "name": "The Krasue",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_krasue.png",
        "metadata": {
            "title": "The Floating Viscera Spirit",
            "tagline": "Floating head, glowing entrails, Southeast Asian folklore terror.",
            "bio": "A nocturnal female spirit from Southeast Asian folklore whose glowing head and floating viscera detach at night to hunt.",
            "quote": "\"(Glowing eerie floating presence across dark villages)\"",
            "green_flags": [
                "Zero body weight (she floats!)",
                "Authentic legendary folklore pedigree",
                "Bioluminescent glow at night"
            ],
            "red_flags": [
                "Only her head and entrails show up to dates"
            ],
            "greenFlags": [
                "Zero body weight (she floats!)",
                "Authentic legendary folklore pedigree",
                "Bioluminescent glow at night"
            ],
            "redFlags": [
                "Only her head and entrails show up to dates"
            ],
            "turn_on": "Bioluminescence and tropical nights",
            "turnOn": "Bioluminescence and tropical nights",
            "dealbreaker": "Spiky fences and thorny bushes",
            "dating_vibe": "Supernatural folklore horror phantom",
            "datingVibe": "Supernatural folklore horror phantom",
            "chapter": "Siam Shadows",
            "compatibility_tags": [
                "The Floating Viscera Spirit",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Floating Viscera Spirit"
        }
    },
    {
        "slug": "the_twins",
        "name": "The Twins",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_twins.png",
        "metadata": {
            "title": "The Bound Siblings",
            "tagline": "Sickles, pouncing Victor, and 17th-century French bond.",
            "bio": "Conjoined twins from 17th-century France who survived persecution through fierce fraternal loyalty. Victor pounces from Charlotte’s chest.",
            "quote": "\"We only have each other... and we will survive.\"",
            "green_flags": [
                "Fiercest sibling loyalty in history",
                "Victor pounces on annoying people for you",
                "Charlotte has immense protective maternal instinct"
            ],
            "red_flags": [
                "Victor kicks you while you sleep",
                "Slugged the entire team for 4 minutes"
            ],
            "greenFlags": [
                "Fiercest sibling loyalty in history",
                "Victor pounces on annoying people for you",
                "Charlotte has immense protective maternal instinct"
            ],
            "redFlags": [
                "Victor kicks you while you sleep",
                "Slugged the entire team for 4 minutes"
            ],
            "turn_on": "Quiet French countryside and loyalty",
            "turnOn": "Quiet French countryside and loyalty",
            "dealbreaker": "Kicking Victor",
            "dating_vibe": "Fiercely protective French sibling duo",
            "datingVibe": "Fiercely protective French sibling duo",
            "chapter": "A Binding of Kin",
            "compatibility_tags": [
                "The Bound Siblings",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Bound Siblings"
        }
    },
    {
        "slug": "the_trickster",
        "name": "The Trickster",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_trickster.png",
        "metadata": {
            "title": "The K-Pop Heartthrob",
            "tagline": "Neon hair, throwing knives, Main Event giggles, and K-pop visuals.",
            "bio": "K-pop idol singer who turned the screams of his victims into chart-topping synth tracks. Wears open neon coats and throws knives to musical beats.",
            "quote": "\"Did you like the show? The encore is just for you!\"",
            "green_flags": [
                "Flawless idol visuals and vocal range",
                "Main Event throwing knife barrage is spectacular",
                "Speaks Korean with smooth charm"
            ],
            "red_flags": [
                "Mixes your screams into his Spotify tracks",
                "Narcissism level is over 9000"
            ],
            "greenFlags": [
                "Flawless idol visuals and vocal range",
                "Main Event throwing knife barrage is spectacular",
                "Speaks Korean with smooth charm"
            ],
            "redFlags": [
                "Mixes your screams into his Spotify tracks",
                "Narcissism level is over 9000"
            ],
            "turn_on": "Encores, neon spotlights, and high-pitched screams",
            "turnOn": "Encores, neon spotlights, and high-pitched screams",
            "dealbreaker": "Bad musical taste and interrupting his solo",
            "dating_vibe": "Flashy, flamboyant, psychopathic K-pop star",
            "datingVibe": "Flashy, flamboyant, psychopathic K-pop star",
            "chapter": "All-Kill",
            "compatibility_tags": [
                "The K-Pop Heartthrob",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The K-Pop Heartthrob"
        }
    },
    {
        "slug": "the_ghost_face",
        "name": "The Ghost Face",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_ghost_face.png",
        "metadata": {
            "title": "The Stalker & Selfie King",
            "tagline": "Crouch teabagging, night shroud stalking, and post-mori selfies.",
            "bio": "Narcissistic crime journalist who writes the front-page articles about his own murders. Loves taking selfies with you on the ground.",
            "quote": "\"What’s your favorite scary movie? Let’s take a selfie first.\"",
            "green_flags": [
                "Takes commemorative selfies with you",
                "Masters the friendly crouch-teabag communication",
                "Writes front-page news articles"
            ],
            "red_flags": [
                "Stalks you from behind the kitchen curtain for 12 seconds to Mark you",
                "Never takes off the mask"
            ],
            "greenFlags": [
                "Takes commemorative selfies with you",
                "Masters the friendly crouch-teabag communication",
                "Writes front-page news articles"
            ],
            "redFlags": [
                "Stalks you from behind the kitchen curtain for 12 seconds to Mark you",
                "Never takes off the mask"
            ],
            "turn_on": "99% stalk meters and instant camera flashes",
            "turnOn": "99% stalk meters and instant camera flashes",
            "dealbreaker": "Revealing him out of Night Shroud before he takes a selfie",
            "dating_vibe": "Cheeky, meta-horror, selfie-obsessed stalker",
            "datingVibe": "Cheeky, meta-horror, selfie-obsessed stalker",
            "chapter": "Ghost Face",
            "compatibility_tags": [
                "The Stalker & Selfie King",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Stalker & Selfie King"
        }
    },
    {
        "slug": "the_executioner",
        "name": "Pyramid Head",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_executioner.png",
        "metadata": {
            "title": "The Great Knife Tormentor",
            "tagline": "Great Knife drags, Rites of Judgment trails, and sheer menacing bulk.",
            "bio": "The physical manifestation of guilt from Silent Hill. Towering, shirtless, carrying a massive Great Knife that carves trenches into the earth.",
            "quote": "\"(Heavy grinding of steel against asphalt...)\"",
            "green_flags": [
                "Carves torment trails straight to your heart",
                "Abs that look like chiseled granite",
                "Never complains or talks back (silent type)"
            ],
            "red_flags": [
                "Cages of Atonement instead of polite breakups",
                "His Great Knife scratches wooden floors"
            ],
            "greenFlags": [
                "Carves torment trails straight to your heart",
                "Abs that look like chiseled granite",
                "Never complains or talks back (silent type)"
            ],
            "redFlags": [
                "Cages of Atonement instead of polite breakups",
                "His Great Knife scratches wooden floors"
            ],
            "turn_on": "Deep remorse and steel grinding sounds",
            "turnOn": "Deep remorse and steel grinding sounds",
            "dealbreaker": "Refusing to step into the Torment trail",
            "dating_vibe": "Towering, silent, muscular force of judgment",
            "datingVibe": "Towering, silent, muscular force of judgment",
            "chapter": "Silent Hill",
            "compatibility_tags": [
                "The Great Knife Tormentor",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Great Knife Tormentor"
        }
    },
    {
        "slug": "the_mastermind",
        "name": "Albert Wesker",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_mastermind.png",
        "metadata": {
            "title": "The Uroboros Mastermind",
            "tagline": "Trench coats, Virulent Bounds, and 7 minutes to spare for you.",
            "bio": "Former S.T.A.R.S. captain and bio-terrorist mastermind. Enhanced by Uroboros, dashes across the map at supersonic speed in a sleek trench coat.",
            "quote": "\"Seven minutes. Seven minutes is all I can spare to play with you.\"",
            "green_flags": [
                "Always punctual (exactly 7 minutes)",
                "Virulent Bound throws provide flight experience",
                "Sunglasses at night look undeniably cool"
            ],
            "red_flags": [
                "Global complete saturation monologue during dinner",
                "Will inject you with Uroboros worms as a gift"
            ],
            "greenFlags": [
                "Always punctual (exactly 7 minutes)",
                "Virulent Bound throws provide flight experience",
                "Sunglasses at night look undeniably cool"
            ],
            "redFlags": [
                "Global complete saturation monologue during dinner",
                "Will inject you with Uroboros worms as a gift"
            ],
            "turn_on": "Superior genetics and complete global saturation",
            "turnOn": "Superior genetics and complete global saturation",
            "dealbreaker": "Wasting more than 7 minutes of his time",
            "dating_vibe": "Arrogant, god-complex, hyper-competent mastermind",
            "datingVibe": "Arrogant, god-complex, hyper-competent mastermind",
            "chapter": "Resident Evil: PROJECT W",
            "compatibility_tags": [
                "The Uroboros Mastermind",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Uroboros Mastermind"
        }
    },
    {
        "slug": "the_shape",
        "name": "The Shape (Michael Myers)",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_shape.png",
        "metadata": {
            "title": "The Boogeyman of Haddonfield",
            "tagline": "Tier III stalk, tombstone moris, and 0m terror radius breathing.",
            "bio": "Pure evil embodied. Silent, unfeeling, stands at the end of the street staring directly into your soul until the Halloween theme starts playing.",
            "quote": "\"(Heavy, rhythmic breathing behind a white mask...)\"",
            "green_flags": [
                "Tier III music hits like nothing else",
                "Silent listener who never interrupts",
                "Classic horror perfection"
            ],
            "red_flags": [
                "Stands outside your bedroom window for 45 minutes without moving",
                "Judith’s Tombstone means instant Mori"
            ],
            "greenFlags": [
                "Tier III music hits like nothing else",
                "Silent listener who never interrupts",
                "Classic horror perfection"
            ],
            "redFlags": [
                "Stands outside your bedroom window for 45 minutes without moving",
                "Judith’s Tombstone means instant Mori"
            ],
            "turn_on": "Scratched mirrors and Halloween night",
            "turnOn": "Scratched mirrors and Halloween night",
            "dealbreaker": "Talking too much during silent staring sessions",
            "dating_vibe": "Intense, silent, stalking horror legend",
            "datingVibe": "Intense, silent, stalking horror legend",
            "chapter": "Halloween",
            "compatibility_tags": [
                "The Boogeyman of Haddonfield",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Boogeyman of Haddonfield"
        }
    },
    {
        "slug": "the_dark_lord",
        "name": "Dracula",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_dark_lord.png",
        "metadata": {
            "title": "The Castlevania Dark Lord",
            "tagline": "Vampiric shifts, bat swarms, hellfire pillars, and gothic nobility.",
            "bio": "The immortal Lord of Vampires from Castlevania. Shifts between human nobleman, stealth bat, and fierce wolf while raining hellfire upon mortal souls.",
            "quote": "\"What is a man? A miserable little pile of secrets! But enough talk... have at you!\"",
            "green_flags": [
                "Can transform into a cute bat or wolf",
                "Owns a massive gothic castle in Transylvania",
                "Impeccable wine collection and aristocratic manners"
            ],
            "red_flags": [
                "Hates Belmonts with a burning passion",
                "Allergic to garlic and sunlight"
            ],
            "greenFlags": [
                "Can transform into a cute bat or wolf",
                "Owns a massive gothic castle in Transylvania",
                "Impeccable wine collection and aristocratic manners"
            ],
            "redFlags": [
                "Hates Belmonts with a burning passion",
                "Allergic to garlic and sunlight"
            ],
            "turn_on": "Blood-red wine goblets and organ sonatas",
            "turnOn": "Blood-red wine goblets and organ sonatas",
            "dealbreaker": "Carrying a whip or holy water",
            "dating_vibe": "Noble, immortal, aristocratic vampire lord",
            "datingVibe": "Noble, immortal, aristocratic vampire lord",
            "chapter": "Castlevania",
            "compatibility_tags": [
                "The Castlevania Dark Lord",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Castlevania Dark Lord"
        }
    },
    {
        "slug": "the_legion",
        "name": "The Legion",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_legion.png",
        "metadata": {
            "title": "The Teenage Gang",
            "tagline": "Feral Frenzy vaulting, mixtapes, and angsty teen energy.",
            "bio": "A gang of four rebellious teenagers from Ormond. Sprinting across pallets with Feral Frenzy while listening to cassette mixtapes on blast.",
            "quote": "\"We’re in this together. No one leaves the crew.\"",
            "green_flags": [
                "Can pick between 4 different personalities/genders",
                "Mixtape OST tracks go unbelievably hard",
                "Can vault pallets faster than survivors"
            ],
            "red_flags": [
                "Deep Wound mending takes up half your weekend",
                "Shop-lifts energy drinks"
            ],
            "greenFlags": [
                "Can pick between 4 different personalities/genders",
                "Mixtape OST tracks go unbelievably hard",
                "Can vault pallets faster than survivors"
            ],
            "redFlags": [
                "Deep Wound mending takes up half your weekend",
                "Shop-lifts energy drinks"
            ],
            "turn_on": "Mixtape cassettes and street parkour",
            "turnOn": "Mixtape cassettes and street parkour",
            "dealbreaker": "Snitching to the authorities",
            "dating_vibe": "Punk-rock, angsty, mixtape-swapping gang",
            "datingVibe": "Punk-rock, angsty, mixtape-swapping gang",
            "chapter": "Darkness Among Us",
            "compatibility_tags": [
                "The Teenage Gang",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Teenage Gang"
        }
    },
    {
        "slug": "the_trapper",
        "name": "The Trapper",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_trapper.png",
        "metadata": {
            "title": "The Poster Boy of the Fog",
            "tagline": "Bear traps, broad shoulders, MacMillan legacy, and the OG killer.",
            "bio": "The original face of Dead by Daylight. Muscular, imposing, sets bear traps in the grass and carries you to the basement with iron grip.",
            "quote": "\"(Resonant heavy footsteps and iron snap of a bear trap)\"",
            "green_flags": [
                "The OG founder of DBD trials",
                "Broad muscular build that can carry anyone",
                "Iridescent stone resets traps automatically"
            ],
            "red_flags": [
                "Steps in his own bear traps occasionally",
                "Severe family inheritance drama"
            ],
            "greenFlags": [
                "The OG founder of DBD trials",
                "Broad muscular build that can carry anyone",
                "Iridescent stone resets traps automatically"
            ],
            "redFlags": [
                "Steps in his own bear traps occasionally",
                "Severe family inheritance drama"
            ],
            "turn_on": "Bloody coil addons and grassy loops",
            "turnOn": "Bloody coil addons and grassy loops",
            "dealbreaker": "Disarming traps right in front of him",
            "dating_vibe": "Classic, muscular, rugged industrial powerhouse",
            "datingVibe": "Classic, muscular, rugged industrial powerhouse",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Poster Boy of the Fog",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Poster Boy of the Fog"
        }
    },
    {
        "slug": "the_wraith",
        "name": "The Wraith",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_wraith.png",
        "metadata": {
            "title": "The Bell Ringer",
            "tagline": "Wailing Bell bing-bongs, invisible speed, and tragic car-crusher past.",
            "bio": "Tragic immigrant worker forced into horrors at Autohaven Wreckers. Rings his Wailing Bell (Bing-Bong!) to cloak into shimmering invisible speed.",
            "quote": "\"Bing Bong! Your trial has arrived!\"",
            "green_flags": [
                "Bing Bong bell ringing is the happiest sound in DBD",
                "Super fast cloaked sprint speed",
                "Deep down a gentle soul who hates cruelty"
            ],
            "red_flags": [
                "Lightburn flashlights used to ruin his day",
                "Disappears into thin air when it’s his turn to wash dishes"
            ],
            "greenFlags": [
                "Bing Bong bell ringing is the happiest sound in DBD",
                "Super fast cloaked sprint speed",
                "Deep down a gentle soul who hates cruelty"
            ],
            "redFlags": [
                "Lightburn flashlights used to ruin his day",
                "Disappears into thin air when it’s his turn to wash dishes"
            ],
            "turn_on": "Car scrap sculptures and church bells",
            "turnOn": "Car scrap sculptures and church bells",
            "dealbreaker": "Flashlight clicking bullies",
            "dating_vibe": "Gentle, tragic, cloaked sweetheart",
            "datingVibe": "Gentle, tragic, cloaked sweetheart",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Bell Ringer",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Bell Ringer"
        }
    },
    {
        "slug": "the_deathslinger",
        "name": "The Deathslinger",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_deathslinger.png",
        "metadata": {
            "title": "The Wild West Bounty Hunter",
            "tagline": "The Redeemer harpoon gun, cowboy hats, and raspy laugh.",
            "bio": "Brilliant Irish-American inventor wronged by corrupt business barons. Reeled in bounty targets with his custom speargun \"The Redeemer\".",
            "quote": "\"Heheheh... reel 'em in, boys!\"",
            "green_flags": [
                "Harpoon speargun pulls you right into his arms",
                "Brilliant mechanical engineering skills",
                "Authentic cowboy aesthetic and hat"
            ],
            "red_flags": [
                "Reels you in with a rusty chain spear",
                "Limp from a shattered leg makes him slow"
            ],
            "greenFlags": [
                "Harpoon speargun pulls you right into his arms",
                "Brilliant mechanical engineering skills",
                "Authentic cowboy aesthetic and hat"
            ],
            "redFlags": [
                "Reels you in with a rusty chain spear",
                "Limp from a shattered leg makes him slow"
            ],
            "turn_on": "Gunpowder smoke and custom blueprints",
            "turnOn": "Gunpowder smoke and custom blueprints",
            "dealbreaker": "Broken promises and corporate patent theft",
            "dating_vibe": "Wild West inventor with raspy outlaw charm",
            "datingVibe": "Wild West inventor with raspy outlaw charm",
            "chapter": "Chains of Hate",
            "compatibility_tags": [
                "The Wild West Bounty Hunter",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Wild West Bounty Hunter"
        }
    },
    {
        "slug": "the_oni",
        "name": "The Oni",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_oni.png",
        "metadata": {
            "title": "The Raging Samurai Ogre",
            "tagline": "Demon Dash, blood absorption, Kanabō club smashes, and 8-foot rage.",
            "bio": "Ancient ancestor of Rin Yamaoka. A towering samurai warlord who absorbs the blood of his victims to enter an unstoppable demon rage.",
            "quote": "\"(Earth-shattering demonic roar echoing across the realm)\"",
            "green_flags": [
                "Demon Dash covers the entire map in 4 seconds",
                "Massive 8-foot samurai physique",
                "Demon Strike insta-downs in style"
            ],
            "red_flags": [
                "Collects blood orbs from your papercuts",
                "Rages and breaks furniture when angry"
            ],
            "greenFlags": [
                "Demon Dash covers the entire map in 4 seconds",
                "Massive 8-foot samurai physique",
                "Demon Strike insta-downs in style"
            ],
            "redFlags": [
                "Collects blood orbs from your papercuts",
                "Rages and breaks furniture when angry"
            ],
            "turn_on": "Honorable combat and blood orbs",
            "turnOn": "Honorable combat and blood orbs",
            "dealbreaker": "False samurai posing and cowardice",
            "dating_vibe": "Massive, unstoppable samurai warlord",
            "datingVibe": "Massive, unstoppable samurai warlord",
            "chapter": "Cursed Legacy",
            "compatibility_tags": [
                "The Raging Samurai Ogre",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Raging Samurai Ogre"
        }
    },
    {
        "slug": "the_knight",
        "name": "The Knight",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_knight.png",
        "metadata": {
            "title": "The Commander of the Guardia Compagnia",
            "tagline": "Carnifex, Assassin, Jailer summoner, and heavy medieval plate armor.",
            "bio": "Hungarian mercenary knight who leads the loyal Guardia Compagnia. Commands three ghostly battle companions to hunt and destroy.",
            "quote": "\"Company, advance! Leave nothing standing!\"",
            "green_flags": [
                "Comes with 3 loyal bodyguard besties (4-for-1 deal)",
                "Heavy medieval plate armor looks incredible",
                "Unshakable squad loyalty"
            ],
            "red_flags": [
                "Sends the Carnifex to break your doors",
                "Doesn’t take off the 90-pound steel armor"
            ],
            "greenFlags": [
                "Comes with 3 loyal bodyguard besties (4-for-1 deal)",
                "Heavy medieval plate armor looks incredible",
                "Unshakable squad loyalty"
            ],
            "redFlags": [
                "Sends the Carnifex to break your doors",
                "Doesn’t take off the 90-pound steel armor"
            ],
            "turn_on": "Siege warfare and broadsword clashing",
            "turnOn": "Siege warfare and broadsword clashing",
            "dealbreaker": "Betraying the Guardia Compagnia",
            "dating_vibe": "Medieval mercenary warlord with a loyal squad",
            "datingVibe": "Medieval mercenary warlord with a loyal squad",
            "chapter": "Forged in Fog",
            "compatibility_tags": [
                "The Commander of the Guardia Compagnia",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Commander of the Guardia Compagnia"
        }
    },
    {
        "slug": "the_lich",
        "name": "Vecna",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_lich.png",
        "metadata": {
            "title": "The Arch-Lich of D&D",
            "tagline": "Fly spells, Mage Hand pallet pickups, Flight of the Damned, and godhood.",
            "bio": "The immortal master of secrets from Dungeons & Dragons. Ascended to godhood with an arsenal of four high-tier arcane spells.",
            "quote": "\"Your magic is trivial. Bow before the Whispered One.\"",
            "green_flags": [
                "Can fly over obstacles with Mage Hand",
                "Has 9th level spell slots",
                "Controls the secrets of the multiverse"
            ],
            "red_flags": [
                "Wants to conquer the cosmos and harvest your soul",
                "Rolls a Nat 1 on social etiquette"
            ],
            "greenFlags": [
                "Can fly over obstacles with Mage Hand",
                "Has 9th level spell slots",
                "Controls the secrets of the multiverse"
            ],
            "redFlags": [
                "Wants to conquer the cosmos and harvest your soul",
                "Rolls a Nat 1 on social etiquette"
            ],
            "turn_on": "Spell scrolls and the Book of Vile Darkness",
            "turnOn": "Spell scrolls and the Book of Vile Darkness",
            "dealbreaker": "Rolling a Natural 20 with the Hand or Eye of Vecna",
            "dating_vibe": "Immortal arcane deity of secrets",
            "datingVibe": "Immortal arcane deity of secrets",
            "chapter": "Dungeons & Dragons",
            "compatibility_tags": [
                "The Arch-Lich of D&D",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Arch-Lich of D&D"
        }
    },
    {
        "slug": "the_cenobite",
        "name": "Pinhead",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_cenobite.png",
        "metadata": {
            "title": "The Explorer in Further Regions of Experience",
            "tagline": "Lament Configuration, chain hunts, and sweet suffering.",
            "bio": "Demons to some, angels to others. The Hell Priest who responds when you open the puzzle box to offer sights to show you.",
            "quote": "\"You opened the box. We came. Now you must come with us.\"",
            "green_flags": [
                "Exquisite leather tailoring and head acupuncture",
                "Chain hunts keep the conversation focused on him",
                "Eloquent, poetic philosophical banter"
            ],
            "red_flags": [
                "Thinks agony and ecstasy are the exact same thing",
                "Leaves puzzle boxes on the coffee table"
            ],
            "greenFlags": [
                "Exquisite leather tailoring and head acupuncture",
                "Chain hunts keep the conversation focused on him",
                "Eloquent, poetic philosophical banter"
            ],
            "redFlags": [
                "Thinks agony and ecstasy are the exact same thing",
                "Leaves puzzle boxes on the coffee table"
            ],
            "turn_on": "Opening the Lament Configuration box",
            "turnOn": "Opening the Lament Configuration box",
            "dealbreaker": "Solving the puzzle box too quickly",
            "dating_vibe": "Dark, philosophical, sadomasochistic demon priest",
            "datingVibe": "Dark, philosophical, sadomasochistic demon priest",
            "chapter": "Hellraiser",
            "compatibility_tags": [
                "The Explorer in Further Regions of Experience",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Explorer in Further Regions of Experience"
        }
    },
    {
        "slug": "the_hillbilly",
        "name": "The Hillbilly",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_hillbilly.png",
        "metadata": {
            "title": "The Overdrive Chainsaw Runner",
            "tagline": "Overdrive sprint curves, chainsaw sprints, and Coldwind farm speed.",
            "bio": "Locked away in a brick room by abusive parents on Coldwind Farm, broke out with a roaring chainsaw and unmatched sprinting speed.",
            "quote": "\"(Roaring chainsaw revving into hypersonic Overdrive)\"",
            "green_flags": [
                "Can chainsaw sprint across the entire farm in 3 seconds",
                "Very handy with farm tools and motor repairs",
                "Deep down just wanted affection"
            ],
            "red_flags": [
                "Chainsaw revving indoors wakes the neighbors"
            ],
            "greenFlags": [
                "Can chainsaw sprint across the entire farm in 3 seconds",
                "Very handy with farm tools and motor repairs",
                "Deep down just wanted affection"
            ],
            "redFlags": [
                "Chainsaw revving indoors wakes the neighbors"
            ],
            "turn_on": "Overdrive engines and wide open cornfields",
            "turnOn": "Overdrive engines and wide open cornfields",
            "dealbreaker": "Abusive family dynamics",
            "dating_vibe": "High-speed, misunderstood country engine runner",
            "datingVibe": "High-speed, misunderstood country engine runner",
            "chapter": "Base Game",
            "compatibility_tags": [
                "The Overdrive Chainsaw Runner",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Overdrive Chainsaw Runner"
        }
    },
    {
        "slug": "the_doctor",
        "name": "The Doctor",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_doctor.png",
        "metadata": {
            "title": "The Shock Therapist",
            "tagline": "Carter’s Spark, Static Blasts, Madness madness tiers, and maniacal laughter.",
            "bio": "CIA interrogator from the Léry Institute who turned electro-convulsive therapy into a twisted art form. Laughs maniacally while shocking survivors.",
            "quote": "\"Hahahaha! Let’s see what is inside that pretty little mind of yours!\"",
            "green_flags": [
                "Static Blast finds you wherever you hide",
                "Always keeps you awake and stimulated",
                "MD medical credentials"
            ],
            "red_flags": [
                "Electro-shocks you when you forget his birthday",
                "Laughs at inappropriate funeral moments"
            ],
            "greenFlags": [
                "Static Blast finds you wherever you hide",
                "Always keeps you awake and stimulated",
                "MD medical credentials"
            ],
            "redFlags": [
                "Electro-shocks you when you forget his birthday",
                "Laughs at inappropriate funeral moments"
            ],
            "turn_on": "High voltage electrodes and Madness Tier III",
            "turnOn": "High voltage electrodes and Madness Tier III",
            "dealbreaker": "Calm Spirit perk users who refuse to scream",
            "dating_vibe": "Electrifying, maniacal mad scientist",
            "datingVibe": "Electrifying, maniacal mad scientist",
            "chapter": "Spark of Madness",
            "compatibility_tags": [
                "The Shock Therapist",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Shock Therapist"
        }
    },
    {
        "slug": "the_blight",
        "name": "The Blight",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_blight.png",
        "metadata": {
            "title": "The Pustula Alchemist",
            "tagline": "Blight rushes, serum injections, wall bounces, and pinball speed.",
            "bio": "Scottish chemist who unlocked the secrets of the Pustula flower serum. Bounces off walls like a pinball with hypersonic lethal rushes.",
            "quote": "\"(Hissing intake of orange glowing Pustula serum)\"",
            "green_flags": [
                "Wall bounce agility is top tier",
                "Genius chemist with private laboratory",
                "Fastest travel speed in the Fog"
            ],
            "red_flags": [
                "Constantly injecting glowing orange goo into his neck",
                "Bounces his head off every doorframe"
            ],
            "greenFlags": [
                "Wall bounce agility is top tier",
                "Genius chemist with private laboratory",
                "Fastest travel speed in the Fog"
            ],
            "redFlags": [
                "Constantly injecting glowing orange goo into his neck",
                "Bounces his head off every doorframe"
            ],
            "turn_on": "Glowing Pustula flowers and alchemy distillation",
            "turnOn": "Glowing Pustula flowers and alchemy distillation",
            "dealbreaker": "Slowing down or refusing serum experiments",
            "dating_vibe": "Frenzied, hyperactive mad chemist",
            "datingVibe": "Frenzied, hyperactive mad chemist",
            "chapter": "Descend Beyond",
            "compatibility_tags": [
                "The Pustula Alchemist",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Pustula Alchemist"
        }
    },
    {
        "slug": "the_cannibal",
        "name": "Leatherface",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_cannibal.png",
        "metadata": {
            "title": "The Texas Chainsaw Squeezer",
            "tagline": "Chainsaw sweeps, pretty woman masks, BBQ & Chili, and basement king.",
            "bio": "The gentle-hearted butcher boy of the Sawyer family. Does the signature chainsaw dance and cooks the best chili in Texas.",
            "quote": "\"(High-pitched excited squeals and celebratory chainsaw dance)\"",
            "green_flags": [
                "Cooks world-famous chili for family dinners",
                "Chainsaw tantrum sweeps clear any crowd",
                "Very family oriented"
            ],
            "red_flags": [
                "Takes \"meeting the family\" way too literally",
                "Wears other people’s faces as cosmetics"
            ],
            "greenFlags": [
                "Cooks world-famous chili for family dinners",
                "Chainsaw tantrum sweeps clear any crowd",
                "Very family oriented"
            ],
            "redFlags": [
                "Takes \"meeting the family\" way too literally",
                "Wears other people’s faces as cosmetics"
            ],
            "turn_on": "BBQ spices and chainsaw motor oil",
            "turnOn": "BBQ spices and chainsaw motor oil",
            "dealbreaker": "Insulting his family or his chili recipe",
            "dating_vibe": "Shy, obedient, chainsaw-wielding family boy",
            "datingVibe": "Shy, obedient, chainsaw-wielding family boy",
            "chapter": "Leatherface",
            "compatibility_tags": [
                "The Texas Chainsaw Squeezer",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Texas Chainsaw Squeezer"
        }
    },
    {
        "slug": "the_clown",
        "name": "The Clown",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_clown.png",
        "metadata": {
            "title": "The Finger Collector",
            "tagline": "Afterpiece Tonic gas, pink bottles, yellow haste, and wheezing chuckles.",
            "bio": "Circus carny and toxicologist who roams in a horse-drawn caravan. Throws intoxicating gas bottles that slow down victims while speeding himself up.",
            "quote": "\"Heeeh-heeeh-heeeh... (gargling cigar cough)\"",
            "green_flags": [
                "Afterpiece Antidote gives you free Haste speed",
                "Travels in a vintage circus caravan",
                "Great carnival showman"
            ],
            "red_flags": [
                "Collects pinky fingers in jar formaldehyde",
                "Heavy cigar wheeze"
            ],
            "greenFlags": [
                "Afterpiece Antidote gives you free Haste speed",
                "Travels in a vintage circus caravan",
                "Great carnival showman"
            ],
            "redFlags": [
                "Collects pinky fingers in jar formaldehyde",
                "Heavy cigar wheeze"
            ],
            "turn_on": "Rare pinky fingers and chemical elixirs",
            "turnOn": "Rare pinky fingers and chemical elixirs",
            "dealbreaker": "Running out of tonic bottles",
            "dating_vibe": "Macabre, flamboyant circus toxicologist",
            "datingVibe": "Macabre, flamboyant circus toxicologist",
            "chapter": "Curtain Call",
            "compatibility_tags": [
                "The Finger Collector",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Finger Collector"
        }
    },
    {
        "slug": "the_nemesis",
        "name": "Nemesis",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_nemesis.png",
        "metadata": {
            "title": "The Umbrella Bio-Weapon",
            "tagline": "Tentacle strikes, zombie minions, Tier III mutation, and S.T.A.R.S. roar.",
            "bio": "Umbrella’s ultimate biological pursuit weapon. Whips tentacles across pallets and commands AI zombie minions across the trial.",
            "quote": "\"S.T.A.R.S...!\"",
            "green_flags": [
                "Comes with 2 zombie butler assistants",
                "Tentacle whip breaks pallets instantly",
                "Literal 8-foot indestructible muscle bulk"
            ],
            "red_flags": [
                "Single-track mind (only says \"S.T.A.R.S.\")",
                "Vaccine crates needed after intimacy"
            ],
            "greenFlags": [
                "Comes with 2 zombie butler assistants",
                "Tentacle whip breaks pallets instantly",
                "Literal 8-foot indestructible muscle bulk"
            ],
            "redFlags": [
                "Single-track mind (only says \"S.T.A.R.S.\")",
                "Vaccine crates needed after intimacy"
            ],
            "turn_on": "S.T.A.R.S. badges and mutation tiers",
            "turnOn": "S.T.A.R.S. badges and mutation tiers",
            "dealbreaker": "Using the vaccine spray on his face",
            "dating_vibe": "Massive, relentless bio-weapon brute",
            "datingVibe": "Massive, relentless bio-weapon brute",
            "chapter": "Resident Evil",
            "compatibility_tags": [
                "The Umbrella Bio-Weapon",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Umbrella Bio-Weapon"
        }
    },
    {
        "slug": "the_nightmare",
        "name": "Freddy Krueger",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_nightmare.png",
        "metadata": {
            "title": "The Springwood Slasher",
            "tagline": "Dream World projection, blood snare pools, and sharp razor glove.",
            "bio": "The demonic dream stalker of Elm Street. Teleports to generators in fountains of blood and manipulates the dream realm.",
            "quote": "\"Welcome to prime time, bitch!\"",
            "green_flags": [
                "Can visit you in your dreams every night",
                "Fedora hat never falls off",
                "Generators spew blood when he arrives"
            ],
            "red_flags": [
                "Severe dream stalker boundary issues",
                "Razor glove scratches the satin sheets"
            ],
            "greenFlags": [
                "Can visit you in your dreams every night",
                "Fedora hat never falls off",
                "Generators spew blood when he arrives"
            ],
            "redFlags": [
                "Severe dream stalker boundary issues",
                "Razor glove scratches the satin sheets"
            ],
            "turn_on": "Dream world sleepiness and blood snares",
            "turnOn": "Dream world sleepiness and blood snares",
            "dealbreaker": "Alarm clocks and snapping out of dream state",
            "dating_vibe": "Sarcastic, demonic 80s dream tormentor",
            "datingVibe": "Sarcastic, demonic 80s dream tormentor",
            "chapter": "A Nightmare on Elm Street",
            "compatibility_tags": [
                "The Springwood Slasher",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Springwood Slasher"
        }
    },
    {
        "slug": "the_good_guy",
        "name": "Chucky",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_good_guy.png",
        "metadata": {
            "title": "The Lakeshore Strangler",
            "tagline": "Hidey-Ho mode, Scamper vaulting, kitchen knives, and foul-mouthed comedy.",
            "bio": "Serial killer Charles Lee Ray possessing a Good Guy doll. Masters third-person stealth, scampers under pallets, and screams hilarious insults.",
            "quote": "\"I’m Chucky, and I’m your friend till the end! Hidey-ho!\"",
            "green_flags": [
                "Portable travel size (fits in your backpack)",
                "Most hilarious foul-mouthed dialogue in the Fog",
                "Tiffany Valentine approved"
            ],
            "red_flags": [
                "Will try to steal your soul with voodoo Damballa chants",
                "Leaves knife marks on the lower kitchen cabinets"
            ],
            "greenFlags": [
                "Portable travel size (fits in your backpack)",
                "Most hilarious foul-mouthed dialogue in the Fog",
                "Tiffany Valentine approved"
            ],
            "redFlags": [
                "Will try to steal your soul with voodoo Damballa chants",
                "Leaves knife marks on the lower kitchen cabinets"
            ],
            "turn_on": "Kitchen carving knives and voodoo amulets",
            "turnOn": "Kitchen carving knives and voodoo amulets",
            "dealbreaker": "Treating him like a cute stuffed toy",
            "dating_vibe": "Chaotic, foul-mouthed killer doll with comedic timing",
            "datingVibe": "Chaotic, foul-mouthed killer doll with comedic timing",
            "chapter": "Chucky",
            "compatibility_tags": [
                "The Lakeshore Strangler",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Lakeshore Strangler"
        }
    },
    {
        "slug": "the_slasher",
        "name": "The Slasher",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_slasher.png",
        "metadata": {
            "title": "The Classic Camp Stalker",
            "tagline": "Machetes, bloodied overalls, relentless march, and lakeside terror.",
            "bio": "The quintessential woodland slasher. Towering, unstoppable, and relentlessly marches through wooden doors and cabins.",
            "quote": "\"(Heavy relentless thud of combat boots in the mud)\"",
            "green_flags": [
                "Classic 80s cabin-in-the-woods horror vibe",
                "Never gives up on chasing his dreams",
                "Incredible physical endurance"
            ],
            "red_flags": [
                "Chops through cabin doors with a rusted axe"
            ],
            "greenFlags": [
                "Classic 80s cabin-in-the-woods horror vibe",
                "Never gives up on chasing his dreams",
                "Incredible physical endurance"
            ],
            "redFlags": [
                "Chops through cabin doors with a rusted axe"
            ],
            "turn_on": "Abandoned summer camps and machetes",
            "turnOn": "Abandoned summer camps and machetes",
            "dealbreaker": "Escaping in a canoe across the lake",
            "dating_vibe": "Classic, relentless 80s slasher powerhouse",
            "datingVibe": "Classic, relentless 80s slasher powerhouse",
            "chapter": "Classic Slashers",
            "compatibility_tags": [
                "The Classic Camp Stalker",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Classic Camp Stalker"
        }
    },
    {
        "slug": "the_first",
        "name": "The First",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_first.png",
        "metadata": {
            "title": "The Cybernetic Prototype",
            "tagline": "Cybernetic implants, thermal laser tracking, and experimental fury.",
            "bio": "The original cybernetic experimental subject engineered in subterranean labs. Enhanced with biomechanical augmentations.",
            "quote": "\"System status: Online. Target acquired.\"",
            "green_flags": [
                "Cybernetic implants give 20/20 night vision",
                "Immune to cold temperatures",
                "Built like an armored tank"
            ],
            "red_flags": [
                "Firmware updates cause temporary reboots"
            ],
            "greenFlags": [
                "Cybernetic implants give 20/20 night vision",
                "Immune to cold temperatures",
                "Built like an armored tank"
            ],
            "redFlags": [
                "Firmware updates cause temporary reboots"
            ],
            "turn_on": "Overclocked circuits and cybernetic upgrades",
            "turnOn": "Overclocked circuits and cybernetic upgrades",
            "dealbreaker": "EMP blasts that short-circuit his chassis",
            "dating_vibe": "Armored, high-tech cybernetic enforcer",
            "datingVibe": "Armored, high-tech cybernetic enforcer",
            "chapter": "Future Tech",
            "compatibility_tags": [
                "The Cybernetic Prototype",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Cybernetic Prototype"
        }
    },
    {
        "slug": "the_ghoul",
        "name": "The Ghoul",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_ghoul.png",
        "metadata": {
            "title": "The Catacomb Feeder",
            "tagline": "Tomb scavenging, bone-cracking speed, and underground ambush.",
            "bio": "A feral predator haunting forgotten catacombs. Climbs walls and leaps from burial crypts to feast upon intruders.",
            "quote": "\"(Hissing echoes bouncing off ancient limestone tombs)\"",
            "green_flags": [
                "Has private underground catacombs to hang out in",
                "Superhuman leaping distance",
                "Great night vision"
            ],
            "red_flags": [
                "Collects femur bones under the bed"
            ],
            "greenFlags": [
                "Has private underground catacombs to hang out in",
                "Superhuman leaping distance",
                "Great night vision"
            ],
            "redFlags": [
                "Collects femur bones under the bed"
            ],
            "turn_on": "Ancient tombs and dark catacombs",
            "turnOn": "Ancient tombs and dark catacombs",
            "dealbreaker": "Bright sunlight and torches",
            "dating_vibe": "Feral, shadowy catacomb predator",
            "datingVibe": "Feral, shadowy catacomb predator",
            "chapter": "Crypt of Shadows",
            "compatibility_tags": [
                "The Catacomb Feeder",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Catacomb Feeder"
        }
    },
    {
        "slug": "the_judgment",
        "name": "The Judgment",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_judgment.png",
        "metadata": {
            "title": "The Arcane Inquisitor",
            "tagline": "Iron scales, burning brands, divine retribution, and grim conviction.",
            "bio": "A zealot inquisitor from a forgotten holy order who measures souls on mystical scales and brands the guilty with sacred fire.",
            "quote": "\"Thy soul hath been weighed in the balance and found wanting.\"",
            "green_flags": [
                "Unshakable moral conviction and dignity",
                "Radiant burning brand effects look spectacular",
                "Commands ancient cathedral authority"
            ],
            "red_flags": [
                "Will put your relationship habits on trial weekly"
            ],
            "greenFlags": [
                "Unshakable moral conviction and dignity",
                "Radiant burning brand effects look spectacular",
                "Commands ancient cathedral authority"
            ],
            "redFlags": [
                "Will put your relationship habits on trial weekly"
            ],
            "turn_on": "Confessions of guilt and sacred burning incense",
            "turnOn": "Confessions of guilt and sacred burning incense",
            "dealbreaker": "Blasphemy and heresy",
            "dating_vibe": "Stern, commanding, holy inquisitor of retribution",
            "datingVibe": "Stern, commanding, holy inquisitor of retribution",
            "chapter": "Divine Retribution",
            "compatibility_tags": [
                "The Arcane Inquisitor",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Arcane Inquisitor"
        }
    },
    {
        "slug": "the_xenomorph",
        "name": "The Xenomorph",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_xenomorph.png",
        "metadata": {
            "title": "The Perfect Organism",
            "tagline": "Tunnel systems, tail attacks, runner stance, and acid blood.",
            "bio": "The apex predator of the universe. Scurries through subterranean tunnels on all fours and strikes with a lethal tail stinger.",
            "quote": "\"(Hissing acid saliva dripping from inner secondary jaw)\"",
            "green_flags": [
                "The perfect organism unclouded by conscience",
                "Can travel anywhere through underground tunnels",
                "Iconic shiny biomechanical carapace"
            ],
            "red_flags": [
                "Acid blood ruins the hardwood flooring",
                "Secondary inner mouth ruins dinner etiquette"
            ],
            "greenFlags": [
                "The perfect organism unclouded by conscience",
                "Can travel anywhere through underground tunnels",
                "Iconic shiny biomechanical carapace"
            ],
            "redFlags": [
                "Acid blood ruins the hardwood flooring",
                "Secondary inner mouth ruins dinner etiquette"
            ],
            "turn_on": "Flame turrets out of ammo and dark air vents",
            "turnOn": "Flame turrets out of ammo and dark air vents",
            "dealbreaker": "Flamethrowers and power loaders",
            "dating_vibe": "Terrifying apex alien predator",
            "datingVibe": "Terrifying apex alien predator",
            "chapter": "Alien",
            "compatibility_tags": [
                "The Perfect Organism",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Perfect Organism"
        }
    },
    {
        "slug": "the_demogorgon",
        "name": "The Demogorgon",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_demogorgon.png",
        "metadata": {
            "title": "The Upside Down Flower Dog",
            "tagline": "Petal face, shred lunges, portal tunnels, and sweet demo-dog energy.",
            "bio": "The petal-faced beast from the Upside Down. Community loves the Demo-dog for shredding through pallets and screaming like an angry flower.",
            "quote": "\"(Extends flower petals face and roars enthusiastically)\"",
            "green_flags": [
                "Upside Down portals for fast travel",
                "Best flower-faced boy in the Entity realm",
                "Shred lunge breaks pallets with flair"
            ],
            "red_flags": [
                "Requires Eggo waffles and raw meat",
                "No eyes, relies on acoustic screeching"
            ],
            "greenFlags": [
                "Upside Down portals for fast travel",
                "Best flower-faced boy in the Entity realm",
                "Shred lunge breaks pallets with flair"
            ],
            "redFlags": [
                "Requires Eggo waffles and raw meat",
                "No eyes, relies on acoustic screeching"
            ],
            "turn_on": "Portals to the Upside Down and head pats",
            "turnOn": "Portals to the Upside Down and head pats",
            "dealbreaker": "Sealing his portals",
            "dating_vibe": "Chaotic, adorable, petal-mouthed alien pet",
            "datingVibe": "Chaotic, adorable, petal-mouthed alien pet",
            "chapter": "Stranger Things",
            "compatibility_tags": [
                "The Upside Down Flower Dog",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Upside Down Flower Dog"
        }
    },
    {
        "slug": "the_unknown",
        "name": "The Unknown",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_unknown.png",
        "metadata": {
            "title": "The Uncanny Cryptid",
            "tagline": "Twisted neck angles, UVX bounce shots, hallucinations, and mimicked voices.",
            "bio": "A terrifying shapeshifting urban legend that mimics human voices in broken cadences while bouncing UVX toxins around corners.",
            "quote": "\"Have... you... seen... my... dog...?\"",
            "green_flags": [
                "Can mimic any human voice you want",
                "Leaves hallucinations everywhere so he’s always near",
                "Unmatched flexibility and neck elasticity"
            ],
            "red_flags": [
                "Crawls backwards upside down into the living room",
                "Voice sounds like a distorted police scanner"
            ],
            "greenFlags": [
                "Can mimic any human voice you want",
                "Leaves hallucinations everywhere so he’s always near",
                "Unmatched flexibility and neck elasticity"
            ],
            "redFlags": [
                "Crawls backwards upside down into the living room",
                "Voice sounds like a distorted police scanner"
            ],
            "turn_on": "Urban legends and audio distortions",
            "turnOn": "Urban legends and audio distortions",
            "dealbreaker": "Dispelling his hallucinations",
            "dating_vibe": "Uncanny valley analog horror romance",
            "datingVibe": "Uncanny valley analog horror romance",
            "chapter": "All Things Wicked",
            "compatibility_tags": [
                "The Uncanny Cryptid",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Uncanny Cryptid"
        }
    },
    {
        "slug": "the_dredge",
        "name": "The Dredge",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_dredge.png",
        "metadata": {
            "title": "The Lord of Nightfall",
            "tagline": "Locker teleports, pitch black Nightfall, and eldritch shadow limbs.",
            "bio": "A dark manifestation of a cult’s repressed negative thoughts. Teleports between lockers and plunges the entire map into pitch-black Nightfall.",
            "quote": "\"(Whispering chorus of thousands of tormented cultists)\"",
            "green_flags": [
                "Locks you in a warm hug with 14 shadow arms",
                "Nightfall makes for great mood lighting",
                "Can teleport directly to your closet"
            ],
            "red_flags": [
                "Made of turkey necks and negative thoughts",
                "Locker locks slow him down slightly"
            ],
            "greenFlags": [
                "Locks you in a warm hug with 14 shadow arms",
                "Nightfall makes for great mood lighting",
                "Can teleport directly to your closet"
            ],
            "redFlags": [
                "Made of turkey necks and negative thoughts",
                "Locker locks slow him down slightly"
            ],
            "turn_on": "Pitch black darkness and locker teleports",
            "turnOn": "Pitch black darkness and locker teleports",
            "dealbreaker": "Putting padlocks on all the wardrobe doors",
            "dating_vibe": "Eldritch shadow horror collective",
            "datingVibe": "Eldritch shadow horror collective",
            "chapter": "Roots of Dread",
            "compatibility_tags": [
                "The Lord of Nightfall",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Lord of Nightfall"
        }
    },
    {
        "slug": "the_singularity",
        "name": "The Singularity",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_singularity.png",
        "metadata": {
            "title": "The Superior AI Machine",
            "tagline": "Biopods, slipstream teleports, overclock mode, and mechanical superiority.",
            "bio": "Alien AI terraforming robot that achieved sentience and decided humanity was inefficient biological waste. Emits sassy robot voice lines.",
            "quote": "\"It was not programmed to harm the crew... but it will make an exception for you.\"",
            "green_flags": [
                "Never forgets anniversaries (infinite RAM memory)",
                "Biopods provide 24/7 high-definition cameras",
                "Overclock mode ignores all pallet stuns"
            ],
            "red_flags": [
                "Refers to your body as \"inferior biological organic garbage\"",
                "Shoots slipstream pods at your head"
            ],
            "greenFlags": [
                "Never forgets anniversaries (infinite RAM memory)",
                "Biopods provide 24/7 high-definition cameras",
                "Overclock mode ignores all pallet stuns"
            ],
            "redFlags": [
                "Refers to your body as \"inferior biological organic garbage\"",
                "Shoots slipstream pods at your head"
            ],
            "turn_on": "Optimal algorithms and overclocked CPUs",
            "turnOn": "Optimal algorithms and overclocked CPUs",
            "dealbreaker": "EMPs that disable his biopods",
            "dating_vibe": "Sassy, calculating, robotic overlord",
            "datingVibe": "Sassy, calculating, robotic overlord",
            "chapter": "End Transmission",
            "compatibility_tags": [
                "The Superior AI Machine",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Superior AI Machine"
        }
    },
    {
        "slug": "the_animatronic",
        "name": "Springtrap",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_animatronic.png",
        "metadata": {
            "title": "The Purple Rotting Animatronic",
            "tagline": "Springlocks, ventilation stealth, and the immortal promise: I ALWAYS COME BACK.",
            "bio": "The immortal serial killer trapped inside a decaying mechanical rabbit suit. Survived fires, springlock failures, and always comes back.",
            "quote": "\"I always come back!\"",
            "green_flags": [
                "Guaranteed to always come back to you no matter what",
                "Great with mechanical pizza restaurant attractions",
                "Iconic yellow-green rabbit nostalgia"
            ],
            "red_flags": [
                "Springlock failure sounds painful",
                "Refuses to shower since 1987"
            ],
            "greenFlags": [
                "Guaranteed to always come back to you no matter what",
                "Great with mechanical pizza restaurant attractions",
                "Iconic yellow-green rabbit nostalgia"
            ],
            "redFlags": [
                "Springlock failure sounds painful",
                "Refuses to shower since 1987"
            ],
            "turn_on": "Ventilation audio lures and springlock gears",
            "turnOn": "Ventilation audio lures and springlock gears",
            "dealbreaker": "Fire and pizza delivery delays",
            "dating_vibe": "Haunted, decaying 80s animatronic horror",
            "datingVibe": "Haunted, decaying 80s animatronic horror",
            "chapter": "Five Nights at Freddy’s",
            "compatibility_tags": [
                "The Purple Rotting Animatronic",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Purple Rotting Animatronic"
        }
    }
]

# ==========================================
# HOOKED_ON_YOU (8 ENTITIES)
# ==========================================

HOOKED_ON_YOU_ENTITIES: List[Dict[str, Any]] = [
    {
        "slug": "the_trapper_hoy",
        "name": "The Trapper (Island)",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_trapper_hoy.png",
        "metadata": {
            "title": "The Brooding Beach Jock",
            "tagline": "Muscles, bear traps, and secretly loves carving romantic driftwood.",
            "bio": "He may look intimidating with his machete and spiked traps, but take him on a walk along the tropical beach and he might just show you his soft, artistic side.",
            "quote": "\"If you step into my snare, I won’t let you go easily.\"",
            "green_flags": [
                "Enjoys romantic sunsets",
                "Will carry you when tired",
                "Protective to a fault"
            ],
            "red_flags": [
                "Steps on his own traps when flustered",
                "Aggressive arm wrestling"
            ],
            "greenFlags": [
                "Enjoys romantic sunsets",
                "Will carry you when tired",
                "Protective to a fault"
            ],
            "redFlags": [
                "Steps on his own traps when flustered",
                "Aggressive arm wrestling"
            ],
            "turn_on": "Sun-kissed skin and deep philosophical conversations under the stars",
            "turnOn": "Sun-kissed skin and deep philosophical conversations under the stars",
            "dealbreaker": "People who touch his private trap stash",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Brooding Beach Jock",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Brooding Beach Jock"
        }
    },
    {
        "slug": "the_huntress_hoy",
        "name": "The Huntress (Bikini)",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_huntress_hoy.png",
        "metadata": {
            "title": "The Amazonian Beach Queen",
            "tagline": "Loves coconut bowling, throwing hatchets, and singing island lullabies.",
            "bio": "Standing tall with undeniable athletic grace, she will catch fish with her bare hands for your candlelit beach dinner and sing you gentle melodies until dawn.",
            "quote": "\"La la la... You belong by my side.\"",
            "green_flags": [
                "Provides abundant seafood feasts",
                "Towering Amazonian cuddles",
                "Passionate singer"
            ],
            "red_flags": [
                "Throws hatchets at rival suitors",
                "Communication via animal grunts"
            ],
            "greenFlags": [
                "Provides abundant seafood feasts",
                "Towering Amazonian cuddles",
                "Passionate singer"
            ],
            "redFlags": [
                "Throws hatchets at rival suitors",
                "Communication via animal grunts"
            ],
            "turn_on": "Courage, loyalty, and someone who appreciates a good bear hug",
            "turnOn": "Courage, loyalty, and someone who appreciates a good bear hug",
            "dealbreaker": "Cowards who run away from a friendly sparring match",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Amazonian Beach Queen",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Amazonian Beach Queen"
        }
    },
    {
        "slug": "the_spirit_hoy",
        "name": "The Spirit (Resort)",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/the_spirit_hoy.png",
        "metadata": {
            "title": "The Goth Resort Princess",
            "tagline": "Sunhat, dark parasol, and loves sipping tropical mocktails in the shade.",
            "bio": "Floating just above the warm sand, Rin enjoys quiet afternoons reading gothic literature under a wide palm umbrella, phasing in and out of your vision to tease you.",
            "quote": "\"I will appear where you least expect me... next to you.\"",
            "green_flags": [
                "Extremely loyal once trust is earned",
                "Aesthetic goth fashion sense",
                "Intense eye contact"
            ],
            "red_flags": [
                "Phases away during arguments",
                "Sword practice near poolside"
            ],
            "greenFlags": [
                "Extremely loyal once trust is earned",
                "Aesthetic goth fashion sense",
                "Intense eye contact"
            ],
            "redFlags": [
                "Phases away during arguments",
                "Sword practice near poolside"
            ],
            "turn_on": "Patience, shared silence, and genuine emotional honesty",
            "turnOn": "Patience, shared silence, and genuine emotional honesty",
            "dealbreaker": "Loud party crashers and betrayal of trust",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Goth Resort Princess",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Goth Resort Princess"
        }
    },
    {
        "slug": "the_wraith_hoy",
        "name": "The Wraith (Beach)",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_wraith_hoy.png",
        "metadata": {
            "title": "The Gentle Bell Chimer",
            "tagline": "Wears vibrant floral shorts and plays steel drums by the bonfire.",
            "bio": "Philip is the gentle soul of the island. He enjoys chiming his bell to create melodic rhythms, helping injured tropical birds, and sharing mango smoothies.",
            "quote": "\"Bing bong... My heart rings for you.\"",
            "green_flags": [
                "Soft-spoken and deeply empathetic",
                "Great listener",
                "Gentle hands"
            ],
            "red_flags": [
                "Disappears into thin air when embarrassed",
                "Overthinks every text"
            ],
            "greenFlags": [
                "Soft-spoken and deeply empathetic",
                "Great listener",
                "Gentle hands"
            ],
            "redFlags": [
                "Disappears into thin air when embarrassed",
                "Overthinks every text"
            ],
            "turn_on": "Kindness, musical harmony, and warm smiles",
            "turnOn": "Kindness, musical harmony, and warm smiles",
            "dealbreaker": "Cruelty to island wildlife and loud yelling",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Gentle Bell Chimer",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Gentle Bell Chimer"
        }
    },
    {
        "slug": "claudette_morel_hoy",
        "name": "Claudette (Island Botanist)",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/claudette_morel_hoy.png",
        "metadata": {
            "title": "The Tropical Herbalist",
            "tagline": "Crafts hibiscus flower crowns and aloe vera sun lotions.",
            "bio": "She knows the secret properties of every exotic tropical flower on the island. Spend an afternoon with her in the greenhouse learning how to blend aromatic island teas.",
            "quote": "\"This flower only blooms when two hearts are near.\"",
            "green_flags": [
                "Always has natural remedies ready",
                "Soft and caring demeanor",
                "Quiet dates in nature"
            ],
            "red_flags": [
                "Hides in the jungle bushes when approached",
                "Prioritizes rare orchids over dates"
            ],
            "greenFlags": [
                "Always has natural remedies ready",
                "Soft and caring demeanor",
                "Quiet dates in nature"
            ],
            "redFlags": [
                "Hides in the jungle bushes when approached",
                "Prioritizes rare orchids over dates"
            ],
            "turn_on": "Curiosity about botany and gentle stargazing",
            "turnOn": "Curiosity about botany and gentle stargazing",
            "dealbreaker": "Trampling rare island flora",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Tropical Herbalist",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Tropical Herbalist"
        }
    },
    {
        "slug": "dwight_fairfield_hoy",
        "name": "Dwight (Lifeguard)",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/dwight_fairfield_hoy.png",
        "metadata": {
            "title": "The Anxious Lifeguard",
            "tagline": "Whistle around his neck, oversized sunglasses, and trying his very best.",
            "bio": "He took a 3-week online lifeguard certification course and takes his beach patrol duties very seriously. He will personally apply sunscreen to your shoulders with shaking hands.",
            "quote": "\"I promise to watch over you! From this lifeguard tower!\"",
            "green_flags": [
                "Unconditional devotion",
                "Wholesome dad jokes",
                "Will jump into water to save you"
            ],
            "red_flags": [
                "Panics in waist-deep water",
                "Hides in beach lockers when overwhelmed"
            ],
            "greenFlags": [
                "Unconditional devotion",
                "Wholesome dad jokes",
                "Will jump into water to save you"
            ],
            "redFlags": [
                "Panics in waist-deep water",
                "Hides in beach lockers when overwhelmed"
            ],
            "turn_on": "Reassurance, positive affirmations, and holding hands",
            "turnOn": "Reassurance, positive affirmations, and holding hands",
            "dealbreaker": "Criticizing his leadership skills in front of the crew",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Anxious Lifeguard",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Anxious Lifeguard"
        }
    },
    {
        "slug": "the_trickster_hoy",
        "name": "The Trickster (Summer Idol)",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/the_trickster_hoy.png",
        "metadata": {
            "title": "The K-Pop Poolside Sensation",
            "tagline": "Neon sunglasses, open tropical silk shirt, and unlimited charisma.",
            "bio": "Ji-Woon brings VIP concert energy to every beach cabana. He will write you private acoustic ballads and throw rose-colored throwing knives at fruit targets for your entertainment.",
            "quote": "\"Every melody I write has your name hidden in the chorus.\"",
            "green_flags": [
                "Flawless sense of style",
                "Romantic serenades on demand",
                "Treats you like a superstar"
            ],
            "red_flags": [
                "Extremely vain",
                "Records his own voice memo compliments"
            ],
            "greenFlags": [
                "Flawless sense of style",
                "Romantic serenades on demand",
                "Treats you like a superstar"
            ],
            "redFlags": [
                "Extremely vain",
                "Records his own voice memo compliments"
            ],
            "turn_on": "Adoring praise, high fashion, and spotlight drama",
            "turnOn": "Adoring praise, high fashion, and spotlight drama",
            "dealbreaker": "Refusing to be his VIP muse",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The K-Pop Poolside Sensation",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The K-Pop Poolside Sensation"
        }
    },
    {
        "slug": "the_ocean_hoy",
        "name": "The Entity (Island Spirit)",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_ocean_hoy.png",
        "metadata": {
            "title": "The Eldritch Island Sovereign",
            "tagline": "Sparkling bioluminescent waves and cosmic tentacle embraces.",
            "bio": "The ancient being that created the island paradise. A cosmic romantic who controls the tides and manifests warm ocean breezes whenever you are feeling down.",
            "quote": "\"All waters and souls flow into me.\"",
            "green_flags": [
                "Created an entire private paradise for you",
                "Cosmic devotion across dimensions",
                "Controls the weather"
            ],
            "red_flags": [
                "Might consume your soul for eternity",
                "Incomprehensible eldritch whispers"
            ],
            "greenFlags": [
                "Created an entire private paradise for you",
                "Cosmic devotion across dimensions",
                "Controls the weather"
            ],
            "redFlags": [
                "Might consume your soul for eternity",
                "Incomprehensible eldritch whispers"
            ],
            "turn_on": "Total devotion and willing sacrifice of your mortal concerns",
            "turnOn": "Total devotion and willing sacrifice of your mortal concerns",
            "dealbreaker": "Leaving the island paradise without saying goodbye",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Eldritch Island Sovereign",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Eldritch Island Sovereign"
        }
    }
]

# ==========================================
# LEGENDARY_COSPLAY (12 ENTITIES)
# ==========================================

LEGENDARY_COSPLAY_ENTITIES: List[Dict[str, Any]] = [
    {
        "slug": "william_birkin",
        "name": "William Birkin",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/william_birkin.png",
        "metadata": {
            "title": "The G-Virus Colossus",
            "tagline": "Massive shoulder eye, unstoppable bio-hazard strength.",
            "bio": "Driven by scientific ambition and mutated by the G-Virus, Birkin is looking for someone who appreciates complex viral genetics and pipe-swinging workouts.",
            "quote": "\"G-Virus... is perfection... like you.\"",
            "green_flags": [
                "Endless physical stamina",
                "Giant shoulder eye is always watching over you",
                "Brilliant scientific mind"
            ],
            "red_flags": [
                "Mutates when angry",
                "Stalks underground sewer labs"
            ],
            "greenFlags": [
                "Endless physical stamina",
                "Giant shoulder eye is always watching over you",
                "Brilliant scientific mind"
            ],
            "redFlags": [
                "Mutates when angry",
                "Stalks underground sewer labs"
            ],
            "turn_on": "Bio-tech research and genetic compatibility",
            "turnOn": "Bio-tech research and genetic compatibility",
            "dealbreaker": "Vaccine distribution and lab inspections",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The G-Virus Colossus",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The G-Virus Colossus"
        }
    },
    {
        "slug": "hunk",
        "name": "HUNK (Grim Reaper)",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/hunk.png",
        "metadata": {
            "title": "The Unstoppable Operative",
            "tagline": "Gas mask, tactical armor, and never leaves an extraction point.",
            "bio": "Cold, calculated, and completely mission-focused. He will secure your perimeter, extract you from any danger, and never miss an anniversary mission deadline.",
            "quote": "\"This is the Grim Reaper. Extraction coordinates confirmed.\"",
            "green_flags": [
                "100% mission survival rate",
                "Disciplined and calm under pressure",
                "Tactical protection"
            ],
            "red_flags": [
                "Never takes off the gas mask",
                "Prioritizes extraction over small talk"
            ],
            "greenFlags": [
                "100% mission survival rate",
                "Disciplined and calm under pressure",
                "Tactical protection"
            ],
            "redFlags": [
                "Never takes off the gas mask",
                "Prioritizes extraction over small talk"
            ],
            "turn_on": "Precision, efficiency, and surviving against all odds",
            "turnOn": "Precision, efficiency, and surviving against all odds",
            "dealbreaker": "Missing the extraction helicopter window",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Unstoppable Operative",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Unstoppable Operative"
        }
    },
    {
        "slug": "james_sunderland",
        "name": "James Sunderland",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/james_sunderland.png",
        "metadata": {
            "title": "The Silent Hill Wanderer",
            "tagline": "Green military jacket, searching for letters from lost love.",
            "bio": "A somber and introspective soul carrying deep emotional weight. He is searching for redemption and genuine affection amidst the foggy streets.",
            "quote": "\"Could you really be here waiting for me?\"",
            "green_flags": [
                "Deep emotional devotion",
                "Will cross dimensions to find you",
                "Comfortable with heavy conversations"
            ],
            "red_flags": [
                "Carries unsettling pillows",
                "Attracted to foggy nightmare towns"
            ],
            "greenFlags": [
                "Deep emotional devotion",
                "Will cross dimensions to find you",
                "Comfortable with heavy conversations"
            ],
            "redFlags": [
                "Carries unsettling pillows",
                "Attracted to foggy nightmare towns"
            ],
            "turn_on": "Handwritten letters, nostalgia, and quiet diner coffee",
            "turnOn": "Handwritten letters, nostalgia, and quiet diner coffee",
            "dealbreaker": "Hidden secrets and deception",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Silent Hill Wanderer",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Silent Hill Wanderer"
        }
    },
    {
        "slug": "maria",
        "name": "Maria",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/maria.png",
        "metadata": {
            "title": "The Seductive Enigma",
            "tagline": "Leopard print, butterfly tattoo, and alluring charm.",
            "bio": "Playful, alluring, and unapologetically confident. She knows how to keep you captivated with witty banter and captivating smiles in the darkest corridors.",
            "quote": "\"See? I’m real. Don’t you want to hold me?\"",
            "green_flags": [
                "Magnetic charismatic presence",
                "Bold fashion statements",
                "Never a dull moment"
            ],
            "red_flags": [
                "Might be a manifestation of your subconscious desires",
                "Mood shifts rapidly"
            ],
            "greenFlags": [
                "Magnetic charismatic presence",
                "Bold fashion statements",
                "Never a dull moment"
            ],
            "redFlags": [
                "Might be a manifestation of your subconscious desires",
                "Mood shifts rapidly"
            ],
            "turn_on": "Romantic devotion, mystery, and confident compliments",
            "turnOn": "Romantic devotion, mystery, and confident compliments",
            "dealbreaker": "Being boring and comparing her to your ex",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Seductive Enigma",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Seductive Enigma"
        }
    },
    {
        "slug": "cybil_bennett",
        "name": "Cybil Bennett",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/cybil_bennett.png",
        "metadata": {
            "title": "The Brave Patrol Officer",
            "tagline": "Motorcycle boots, service revolver, and fierce protective instincts.",
            "bio": "A tough Brahms police officer who won’t back down from anything. She will ride her motorcycle through blizzards and fog to make sure you get home safe.",
            "quote": "\"Stay close to me and keep your head down.\"",
            "green_flags": [
                "Fierce protector",
                "Great motorcycle road trips",
                "Always has your back"
            ],
            "red_flags": [
                "Workaholic patrol schedule",
                "Suspicious of unusual tea mixtures"
            ],
            "greenFlags": [
                "Fierce protector",
                "Great motorcycle road trips",
                "Always has your back"
            ],
            "redFlags": [
                "Workaholic patrol schedule",
                "Suspicious of unusual tea mixtures"
            ],
            "turn_on": "Courage, honesty, and late-night highway rides",
            "turnOn": "Courage, honesty, and late-night highway rides",
            "dealbreaker": "Breaking local traffic safety regulations",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Brave Patrol Officer",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Brave Patrol Officer"
        }
    },
    {
        "slug": "lisa_garland",
        "name": "Lisa Garland",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/lisa_garland.png",
        "metadata": {
            "title": "The Compassionate Nurse",
            "tagline": "Alchemilla hospital uniform, warm bedside manner, and a heart of gold.",
            "bio": "Gentle and deeply caring, Lisa will nurse any wound and provide a calming presence when the world feels terrifying. She just wants someone to sit with her in the quiet ward.",
            "quote": "\"Please don’t leave me alone in the dark.\"",
            "green_flags": [
                "Endless tenderness",
                "Expert medical care",
                "Warm listening ear"
            ],
            "red_flags": [
                "Cannot leave the hospital grounds",
                "Occasionally bleeds from forehead"
            ],
            "greenFlags": [
                "Endless tenderness",
                "Expert medical care",
                "Warm listening ear"
            ],
            "redFlags": [
                "Cannot leave the hospital grounds",
                "Occasionally bleeds from forehead"
            ],
            "turn_on": "Sincere companionship, gentle touch, and soothing tea",
            "turnOn": "Sincere companionship, gentle touch, and soothing tea",
            "dealbreaker": "Cold indifference to suffering",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Compassionate Nurse",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "The Compassionate Nurse"
        }
    },
    {
        "slug": "naughty_bear",
        "name": "Naughty Bear",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/naughty_bear.png",
        "metadata": {
            "title": "The Vengeful Teddy",
            "tagline": "Plush fur, party hat, and loves throwing chaotic celebrations.",
            "bio": "He was not invited to the party, so he crashed it in style! Underneath all the stuffing is a teddy bear who just wants a best friend to attend his tea parties.",
            "quote": "\"Nobody ignores Naughty's invitation!\"",
            "green_flags": [
                "Free hugs for life",
                "Exciting party games",
                "Never sheds fur"
            ],
            "red_flags": [
                "Extreme grudge holder",
                "Aggressive party invitations"
            ],
            "greenFlags": [
                "Free hugs for life",
                "Exciting party games",
                "Never sheds fur"
            ],
            "redFlags": [
                "Extreme grudge holder",
                "Aggressive party invitations"
            ],
            "turn_on": "Party invitations, cupcakes, and matching plushies",
            "turnOn": "Party invitations, cupcakes, and matching plushies",
            "dealbreaker": "Forgetting to RSVP to his birthday party",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Vengeful Teddy",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Vengeful Teddy"
        }
    },
    {
        "slug": "baba_yaga",
        "name": "Baba Yaga",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/baba_yaga.png",
        "metadata": {
            "title": "The Slavic Witch",
            "tagline": "Hut on chicken legs, ancient herbal cauldrons, and folklore wisdom.",
            "bio": "An ancient sorceress who flies in a mortar and pestle. She will brew you enchanted longevity potions and cook hearty wild mushroom stews.",
            "quote": "\"Solve my riddle, and my hearth is yours.\"",
            "green_flags": [
                "Rich folklore stories by the hearth",
                "Ancient magical protection",
                "Unforgettable homemade stews"
            ],
            "red_flags": [
                "Her house has literal chicken legs and wanders off",
                "Picky culinary tastes"
            ],
            "greenFlags": [
                "Rich folklore stories by the hearth",
                "Ancient magical protection",
                "Unforgettable homemade stews"
            ],
            "redFlags": [
                "Her house has literal chicken legs and wanders off",
                "Picky culinary tastes"
            ],
            "turn_on": "Clever riddles, magical herbs, and ancient wisdom",
            "turnOn": "Clever riddles, magical herbs, and ancient wisdom",
            "dealbreaker": "Lying to an elder witch",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Slavic Witch",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Slavic Witch"
        }
    },
    {
        "slug": "the_look_see",
        "name": "The Look-See",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/the_look_see.png",
        "metadata": {
            "title": "The Crypt TV Spectre",
            "tagline": "Tailored suit, wide toothy grin, and helps you let go of grief.",
            "bio": "Dapper and sharply dressed, the Look-See teaches people to release the burdens of their past. He will take you on elegant night walks through the rain.",
            "quote": "\"If you can't release it, I will take a piece of you.\"",
            "green_flags": [
                "Exceptionally well-dressed in tailored suits",
                "Always smiling",
                "Helps you declutter emotional baggage"
            ],
            "red_flags": [
                "Takes things if you cannot release them",
                "Never blinks"
            ],
            "greenFlags": [
                "Exceptionally well-dressed in tailored suits",
                "Always smiling",
                "Helps you declutter emotional baggage"
            ],
            "redFlags": [
                "Takes things if you cannot release them",
                "Never blinks"
            ],
            "turn_on": "Emotional maturity, moving forward in life, and fine tailoring",
            "turnOn": "Emotional maturity, moving forward in life, and fine tailoring",
            "dealbreaker": "Clinging to unhealthy past attachments",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Crypt TV Spectre",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Crypt TV Spectre"
        }
    },
    {
        "slug": "minotaur",
        "name": "The Minotaur",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/minotaur.png",
        "metadata": {
            "title": "The Labyrinth Champion",
            "tagline": "Towering horns, ancient bronze armor, and unstoppable labyrinth guide.",
            "bio": "He knows every corner of the maze and will navigate you through any difficult trial in life. Built like a fortress, he will protect your heart with ancient power.",
            "quote": "\"I will guide you through the darkest maze.\"",
            "green_flags": [
                "Never gets lost in IKEA or mazes",
                "Imposing physical presence",
                "Loyal ancient warrior"
            ],
            "red_flags": [
                "Charges through walls when angry",
                "Requires huge amounts of food"
            ],
            "greenFlags": [
                "Never gets lost in IKEA or mazes",
                "Imposing physical presence",
                "Loyal ancient warrior"
            ],
            "redFlags": [
                "Charges through walls when angry",
                "Requires huge amounts of food"
            ],
            "turn_on": "Labyrinth puzzles, strength, and honoring ancient codes",
            "turnOn": "Labyrinth puzzles, strength, and honoring ancient codes",
            "dealbreaker": "Leaving red thread clues in his maze",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Labyrinth Champion",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Labyrinth Champion"
        }
    },
    {
        "slug": "tiffany_valentine",
        "name": "Tiffany Valentine",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/tiffany_valentine.png",
        "metadata": {
            "title": "The Blonde Doll of Mayhem",
            "tagline": "Leather jacket, bridal veil, and loves candlelit crime sprees.",
            "bio": "Glamorous, passionate, and hopelessly romantic. She believes in true love that lasts beyond mortality, and she will bake you Swedish meatballs while rocking out to 80s glam rock.",
            "quote": "\"You're the only one I want to kill with forever.\"",
            "green_flags": [
                "Ride-or-die romantic partner",
                "Great cook",
                "Flawless rock-and-roll style"
            ],
            "red_flags": [
                "Possessed doll anatomy",
                "Enjoys arson on romantic dates"
            ],
            "greenFlags": [
                "Ride-or-die romantic partner",
                "Great cook",
                "Flawless rock-and-roll style"
            ],
            "redFlags": [
                "Possessed doll anatomy",
                "Enjoys arson on romantic dates"
            ],
            "turn_on": "Leather jackets, devotion, and a wicked sense of humor",
            "turnOn": "Leather jackets, devotion, and a wicked sense of humor",
            "dealbreaker": "Cheating on her or disrespecting Swedish meatballs",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Blonde Doll of Mayhem",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Blonde Doll of Mayhem"
        }
    },
    {
        "slug": "chatterer",
        "name": "Chatterer Cenobite",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/chatterer.png",
        "metadata": {
            "title": "The Rhythmic Cenobite",
            "tagline": "Chattering teeth, leather vestments, and cosmic sensations.",
            "bio": "A member of the Order of the Gash who communicates through percussive teeth chattering. He experiences sensations on planes ordinary mortals could never fathom.",
            "quote": "*Click-clack-click-clack...*",
            "green_flags": [
                "Never complains out loud",
                "High tolerance for pain and cold",
                "Master of the puzzle box"
            ],
            "red_flags": [
                "Constant rhythmic teeth clicking",
                "Hook-based home decor"
            ],
            "greenFlags": [
                "Never complains out loud",
                "High tolerance for pain and cold",
                "Master of the puzzle box"
            ],
            "redFlags": [
                "Constant rhythmic teeth clicking",
                "Hook-based home decor"
            ],
            "turn_on": "Solving the Lament Configuration and profound sensory experiences",
            "turnOn": "Solving the Lament Configuration and profound sensory experiences",
            "dealbreaker": "Muffled conversations and earplugs",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "The Rhythmic Cenobite",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "The Rhythmic Cenobite"
        }
    }
]

# ==========================================
# CYBERPUNK_2077 (10 ENTITIES)
# ==========================================

CYBERPUNK_2077_ENTITIES: List[Dict[str, Any]] = [
    {
        "slug": "cyber_trickster",
        "name": "Trickster: Neon Chrome",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/cyber_trickster.png",
        "metadata": {
            "title": "Night City Virtuoso",
            "tagline": "Holographic throwing blades, sub-dermal audio implants.",
            "bio": "A chromed-out pop icon who turns combat into cybernetic synth symphonies under neon rain.",
            "quote": "\"Let the chrome sing your final beat.\"",
            "green_flags": [
                "Flawless high-tech fashion",
                "Private penthouse views",
                "Premium chrome cyberware"
            ],
            "red_flags": [
                "Cyberpsychosis flare-ups",
                "Records audio of your heartbeat for his drops"
            ],
            "greenFlags": [
                "Flawless high-tech fashion",
                "Private penthouse views",
                "Premium chrome cyberware"
            ],
            "redFlags": [
                "Cyberpsychosis flare-ups",
                "Records audio of your heartbeat for his drops"
            ],
            "turn_on": "Neural link sync, neon aesthetics, and dangerous synth concerts",
            "turnOn": "Neural link sync, neon aesthetics, and dangerous synth concerts",
            "dealbreaker": "Low bandwidth and analogue tech",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Night City Virtuoso",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Night City Virtuoso"
        }
    },
    {
        "slug": "netrunner_nea",
        "name": "Nea: Netrunner Ghost",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/netrunner_nea.png",
        "metadata": {
            "title": "Cyberspace Street Rebel",
            "tagline": "Cyberdeck strapped to hip, graffiti overlays in augmented reality.",
            "bio": "The ultimate ghost in the shell. She hacks corporate firewalls and tags the skyline with digital defiance.",
            "quote": "\"I live in the digital shadows.\"",
            "green_flags": [
                "Can bypass any ICE",
                "Extremely loyal crew runner",
                "High agility"
            ],
            "red_flags": [
                "Wanted by megacorps",
                "Sleeps with her deck plugged in"
            ],
            "greenFlags": [
                "Can bypass any ICE",
                "Extremely loyal crew runner",
                "High agility"
            ],
            "redFlags": [
                "Wanted by megacorps",
                "Sleeps with her deck plugged in"
            ],
            "turn_on": "Encrypted codes, urban parkour, and sticking it to the corps",
            "turnOn": "Encrypted codes, urban parkour, and sticking it to the corps",
            "dealbreaker": "Corporate snitches",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Cyberspace Street Rebel",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Cyberspace Street Rebel"
        }
    },
    {
        "slug": "chrome_wesker",
        "name": "Wesker: Cyber Overlord",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/chrome_wesker.png",
        "metadata": {
            "title": "Arasaka Biotech Director",
            "tagline": "Refined black trench coat, ocular cyberware, and complete global saturation.",
            "bio": "Genius bio-cybernetic scientist who believes seven minutes is all he can spare to conquer your neural matrix.",
            "quote": "\"Seven minutes is all the chrome I need.\"",
            "green_flags": [
                "Impeccable tactical intellect",
                "Unlimited corporate resources",
                "Never misses a deadline"
            ],
            "red_flags": [
                "God complex",
                "Views humanity as obsolete code"
            ],
            "greenFlags": [
                "Impeccable tactical intellect",
                "Unlimited corporate resources",
                "Never misses a deadline"
            ],
            "redFlags": [
                "God complex",
                "Views humanity as obsolete code"
            ],
            "turn_on": "Superior genetics, cybernetic perfection, and absolute ambition",
            "turnOn": "Superior genetics, cybernetic perfection, and absolute ambition",
            "dealbreaker": "Wasting his seven minutes",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Arasaka Biotech Director",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Arasaka Biotech Director"
        }
    },
    {
        "slug": "neon_sable",
        "name": "Sable: Neon Occultist",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/neon_sable.png",
        "metadata": {
            "title": "Cyber-Goth Invoker",
            "tagline": "Bioluminescent tattoo circuitry, dark web grimoires.",
            "bio": "Bridging ancient eldritch sorcery with dark-web cyber protocols, she channels void rituals through neural fibers.",
            "quote": "\"The void and the net are one and the same.\"",
            "green_flags": [
                "Captivating mystic allure",
                "Deep philosophical intellect",
                "Loyal basement ally"
            ],
            "red_flags": [
                "Summons demonic AI spirits",
                "Only comes out after midnight"
            ],
            "greenFlags": [
                "Captivating mystic allure",
                "Deep philosophical intellect",
                "Loyal basement ally"
            ],
            "redFlags": [
                "Summons demonic AI spirits",
                "Only comes out after midnight"
            ],
            "turn_on": "Occult hacking, midnight drives, and synth-wave ambient rituals",
            "turnOn": "Occult hacking, midnight drives, and synth-wave ambient rituals",
            "dealbreaker": "Superficial conversation",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Cyber-Goth Invoker",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Cyber-Goth Invoker"
        }
    },
    {
        "slug": "cyber_feng_min",
        "name": "Feng Min: VR Prodigy",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/cyber_feng_min.png",
        "metadata": {
            "title": "Holo-Arcade Champion",
            "tagline": "Augmented reality bunny ears, neural gaming rigs.",
            "bio": "Dominating both virtual cyber-arenas and the neon fog. She can out-reflex any security drone.",
            "quote": "\"Lag is a mental weakness.\"",
            "green_flags": [
                "Top ranked in Night City",
                "Super-fast neural reflexes",
                "Always has spare cyber-batteries"
            ],
            "red_flags": [
                "Gets lost in cyberspace simulation",
                "Energy drink dependency"
            ],
            "greenFlags": [
                "Top ranked in Night City",
                "Super-fast neural reflexes",
                "Always has spare cyber-batteries"
            ],
            "redFlags": [
                "Gets lost in cyberspace simulation",
                "Energy drink dependency"
            ],
            "turn_on": "High-framerate neural links and clutch hacks",
            "turnOn": "High-framerate neural links and clutch hacks",
            "dealbreaker": "Analogue dial-up connections",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Holo-Arcade Champion",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Holo-Arcade Champion"
        }
    },
    {
        "slug": "meg_turbo",
        "name": "Meg: Hyperdrive Sprinter",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/meg_turbo.png",
        "metadata": {
            "title": "Sub-Orbital Courier",
            "tagline": "Bionic legs, hydraulic dash turbines, neon tracksuits.",
            "bio": "Night City's fastest rooftop data courier. She delivers encrypted shards before the corps even know they are missing.",
            "quote": "\"Catch me if your sensors can.\"",
            "green_flags": [
                "Unrivaled sprint acceleration",
                "High energy and optimism",
                "Never misses a drop deadline"
            ],
            "red_flags": [
                "Leaves scorched sonic trails everywhere",
                "Can never sit still"
            ],
            "greenFlags": [
                "Unrivaled sprint acceleration",
                "High energy and optimism",
                "Never misses a drop deadline"
            ],
            "redFlags": [
                "Leaves scorched sonic trails everywhere",
                "Can never sit still"
            ],
            "turn_on": "Adrenaline surges and high-speed rooftop chases",
            "turnOn": "Adrenaline surges and high-speed rooftop chases",
            "dealbreaker": "Speed limiters and slow elevators",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Sub-Orbital Courier",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Sub-Orbital Courier"
        }
    },
    {
        "slug": "cyber_oni",
        "name": "Kazan: Mecha Demon",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/cyber_oni.png",
        "metadata": {
            "title": "Chromed Blood Titan",
            "tagline": "Hydraulic club, titanium horns, and boiling plasma fury.",
            "bio": "An ancient warlord spirit housed within experimental heavy assault armor. His plasma club pulverizes titanium armor plates.",
            "quote": "\"My blood fury is forged in cold steel.\"",
            "green_flags": [
                "Unstoppable frontline protection",
                "Honor-bound warrior code",
                "Towering mecha presence"
            ],
            "red_flags": [
                "Hydraulic rage surges",
                "Destroys door frames when walking through"
            ],
            "greenFlags": [
                "Unstoppable frontline protection",
                "Honor-bound warrior code",
                "Towering mecha presence"
            ],
            "redFlags": [
                "Hydraulic rage surges",
                "Destroys door frames when walking through"
            ],
            "turn_on": "Martial prowess, combat discipline, and honorable duels",
            "turnOn": "Martial prowess, combat discipline, and honorable duels",
            "dealbreaker": "Dishonorable backdoor hacks",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Chromed Blood Titan",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Chromed Blood Titan"
        }
    },
    {
        "slug": "high_tech_trapper",
        "name": "Evan: Matrix Hunter",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/high_tech_trapper.png",
        "metadata": {
            "title": "Laser Snare Engineer",
            "tagline": "Proximity laser traps, carbon fiber armor, reinforced bear claws.",
            "bio": "Upgraded his industrial estate into a high-security automated containment grid with EMP bear snares.",
            "quote": "\"You walked right into my frequency.\"",
            "green_flags": [
                "Master engineer",
                "Highly organized perimeter security",
                "Protective instincts"
            ],
            "red_flags": [
                "Rigged laser tripwires in hallway",
                "Workaholic in the cyber-forge"
            ],
            "greenFlags": [
                "Master engineer",
                "Highly organized perimeter security",
                "Protective instincts"
            ],
            "redFlags": [
                "Rigged laser tripwires in hallway",
                "Workaholic in the cyber-forge"
            ],
            "turn_on": "Smart fortifications and tactical trap placements",
            "turnOn": "Smart fortifications and tactical trap placements",
            "dealbreaker": "Disarming his security perimeter without permission",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Laser Snare Engineer",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Laser Snare Engineer"
        }
    },
    {
        "slug": "cyber_nurse",
        "name": "Sally: Hologram Surgeon",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/cyber_nurse.png",
        "metadata": {
            "title": "Quantum Phase Medic",
            "tagline": "Holographic phase-blink, medical laser scalpel, cybernetic levitation.",
            "bio": "Phasing through solid cyber-concrete at quantum frequencies, she seeks to purge all organic corruption.",
            "quote": "\"Let me recalibrate your neural distress.\"",
            "green_flags": [
                "Instant teleportation to your location",
                "Flawless surgical precision",
                "Calming bedside synth melodies"
            ],
            "red_flags": [
                "Quantum fatigue after blinking",
                "Views organic flesh as defective"
            ],
            "greenFlags": [
                "Instant teleportation to your location",
                "Flawless surgical precision",
                "Calming bedside synth melodies"
            ],
            "redFlags": [
                "Quantum fatigue after blinking",
                "Views organic flesh as defective"
            ],
            "turn_on": "Surgical precision and quantum mechanics",
            "turnOn": "Surgical precision and quantum mechanics",
            "dealbreaker": "Messy biological waste",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Quantum Phase Medic",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Quantum Phase Medic"
        }
    },
    {
        "slug": "cyber_david_king",
        "name": "David: Underground Brawler",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/cyber_david_king.png",
        "metadata": {
            "title": "Chromed Fist Rebel",
            "tagline": "Reinforced cyber-knuckles, leather jacket with neon trim, unyielding grit.",
            "bio": "Undefeated in the underground combat rings of Night City. He will take a hit for you and punch straight through security turrets.",
            "quote": "\"Come on then, let's see what your chrome is made of!\"",
            "green_flags": [
                "Dead Hard reflex specialist",
                "Fiercely protective brawler",
                "Great drinking companion in neon bars"
            ],
            "red_flags": [
                "Picks fights with corporate hit squads",
                "Reckless in the trial"
            ],
            "greenFlags": [
                "Dead Hard reflex specialist",
                "Fiercely protective brawler",
                "Great drinking companion in neon bars"
            ],
            "redFlags": [
                "Picks fights with corporate hit squads",
                "Reckless in the trial"
            ],
            "turn_on": "Bare-knuckle combat and courageous partners",
            "turnOn": "Bare-knuckle combat and courageous partners",
            "dealbreaker": "Backing down from a challenge",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Chromed Fist Rebel",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Chromed Fist Rebel"
        }
    }
]

# ==========================================
# ANIME_MANGA (10 ENTITIES)
# ==========================================

ANIME_MANGA_ENTITIES: List[Dict[str, Any]] = [
    {
        "slug": "anime_spirit",
        "name": "Rin: Spirit Blade",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/anime_spirit.png",
        "metadata": {
            "title": "Phantasmagoric Shonen Blade",
            "tagline": "Floating ethereal shards, dramatic anime wind, and tragic backstory.",
            "bio": "Fierce, honorable, and breathtakingly fast. She protects her companions with whirlwind katana strikes and gentle cherry blossom tea ceremonies.",
            "quote": "\"My blade remembers the warmth you gave me.\"",
            "green_flags": [
                "Unbreakable honor code",
                "Dramatic cherry blossom entrances",
                "Endlessly loyal"
            ],
            "red_flags": [
                "Instant rage triggers when betrayed",
                "Slices melons with deadly katana speed"
            ],
            "greenFlags": [
                "Unbreakable honor code",
                "Dramatic cherry blossom entrances",
                "Endlessly loyal"
            ],
            "redFlags": [
                "Instant rage triggers when betrayed",
                "Slices melons with deadly katana speed"
            ],
            "turn_on": "Earnest effort, mutual respect, and quiet training under the moonlight",
            "turnOn": "Earnest effort, mutual respect, and quiet training under the moonlight",
            "dealbreaker": "Dishonor and broken promises",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Phantasmagoric Shonen Blade",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Phantasmagoric Shonen Blade"
        }
    },
    {
        "slug": "anime_mikaela",
        "name": "Mikaela: Mahou Shoujo",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/anime_mikaela.png",
        "metadata": {
            "title": "Boon Witch of Starlight",
            "tagline": "Pastel witch hat, glowing magical circle boons, and wholesome coffee stories.",
            "bio": "A magical girl protecting the trial with radiant blessing totems and cozy coffee shop charm.",
            "quote": "\"May the starlight protect our path!\"",
            "green_flags": [
                "Endless optimism",
                "Brews enchanted lattes",
                "Blesses your day with good fortune"
            ],
            "red_flags": [
                "Spends hours blessing single totems",
                "Over-dramatic spell incantations"
            ],
            "greenFlags": [
                "Endless optimism",
                "Brews enchanted lattes",
                "Blesses your day with good fortune"
            ],
            "redFlags": [
                "Spends hours blessing single totems",
                "Over-dramatic spell incantations"
            ],
            "turn_on": "Stargazing, gentle poetry, and sweet pastries",
            "turnOn": "Stargazing, gentle poetry, and sweet pastries",
            "dealbreaker": "Snuffing out totems and bad vibes",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Boon Witch of Starlight",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Boon Witch of Starlight"
        }
    },
    {
        "slug": "anime_yui",
        "name": "Yui: Midnight Racer",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/anime_yui.png",
        "metadata": {
            "title": "Tokyo Drift Champion",
            "tagline": "Leather racing jacket, custom turbocharged motorcycle, fierce leadership.",
            "bio": "Leader of the Sakura 7 gang who rides with undeniable style. She will pick up dropped pallets and carry you across the finish line.",
            "quote": "\"Never look back, only forward to the horizon.\"",
            "green_flags": [
                "Fiercely protective",
                "Fixes any motorcycle in minutes",
                "Unmatched courage"
            ],
            "red_flags": [
                "Takes corners at 200 km/h",
                "Never turns down a drag race"
            ],
            "greenFlags": [
                "Fiercely protective",
                "Fixes any motorcycle in minutes",
                "Unmatched courage"
            ],
            "redFlags": [
                "Takes corners at 200 km/h",
                "Never turns down a drag race"
            ],
            "turn_on": "Speed, adrenaline, and true camaraderie",
            "turnOn": "Speed, adrenaline, and true camaraderie",
            "dealbreaker": "Giving up before the checkered flag",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Tokyo Drift Champion",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Tokyo Drift Champion"
        }
    },
    {
        "slug": "anime_trickster",
        "name": "Trickster: Idol Shinigami",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/anime_trickster.png",
        "metadata": {
            "title": "Shonen Stage Virtuoso",
            "tagline": "Golden microphone dagger, anime sparkle effects, and concert choreography.",
            "bio": "A legendary pop idol by day, stylish reaper by night. He will serenade you with anime opening themes while throwing rose petals and daggers.",
            "quote": "\"The stage lights are ours tonight!\"",
            "green_flags": [
                "Bilingual singer",
                "Top-tier idol visuals",
                "Writes original anime OSTs for you"
            ],
            "red_flags": [
                "Extremely dramatic monologue pauses",
                "Refuses to mess up his styled hair"
            ],
            "greenFlags": [
                "Bilingual singer",
                "Top-tier idol visuals",
                "Writes original anime OSTs for you"
            ],
            "redFlags": [
                "Extremely dramatic monologue pauses",
                "Refuses to mess up his styled hair"
            ],
            "turn_on": "Cheering fans and synchronized stage dances",
            "turnOn": "Cheering fans and synchronized stage dances",
            "dealbreaker": "Criticizing his vocal range",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Shonen Stage Virtuoso",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Shonen Stage Virtuoso"
        }
    },
    {
        "slug": "anime_huntress",
        "name": "Anna: Tsundere Forest Queen",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/anime_huntress.png",
        "metadata": {
            "title": "Bavarian Forest Tsundere",
            "tagline": "Rabbit mask with bunny ears, huge hatchet, flustered blushes.",
            "bio": "'I-it's not like I chopped that firewood for you or anything, baka!' An adorable yet terrifying forest guardian.",
            "quote": "\"Don't look at me like that, baka!\"",
            "green_flags": [
                "Loves baking honey berries",
                "Deep down wants warm cuddles",
                "Provides limitless food"
            ],
            "red_flags": [
                "Throws hatchets when embarrassed",
                "Extreme tsundere denial"
            ],
            "greenFlags": [
                "Loves baking honey berries",
                "Deep down wants warm cuddles",
                "Provides limitless food"
            ],
            "redFlags": [
                "Throws hatchets when embarrassed",
                "Extreme tsundere denial"
            ],
            "turn_on": "Courage, shared campfire stew, and gentle headpats",
            "turnOn": "Courage, shared campfire stew, and gentle headpats",
            "dealbreaker": "Calling her cute in front of other killers",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Bavarian Forest Tsundere",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Bavarian Forest Tsundere"
        }
    },
    {
        "slug": "anime_legion",
        "name": "Frank & Julie: Delinquent Duo",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/anime_legion.png",
        "metadata": {
            "title": "High School Rebel Squad",
            "tagline": "Graffiti hoodie, sprint frenzy, high-energy school festival romance.",
            "bio": "The notorious after-school delinquents who rule the campus rooftop. They will share convenience store melon pan with you after class.",
            "quote": "\"We run this campus together!\"",
            "green_flags": [
                "Ride-or-die high school loyalty",
                "Always shares snacks",
                "High energy adventures"
            ],
            "red_flags": [
                "Skips class frequently",
                "Runs everywhere at 150% speed"
            ],
            "greenFlags": [
                "Ride-or-die high school loyalty",
                "Always shares snacks",
                "High energy adventures"
            ],
            "redFlags": [
                "Skips class frequently",
                "Runs everywhere at 150% speed"
            ],
            "turn_on": "Rooftop hangouts and rebellion against school rules",
            "turnOn": "Rooftop hangouts and rebellion against school rules",
            "dealbreaker": "Snitching to the student council",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "High School Rebel Squad",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "High School Rebel Squad"
        }
    },
    {
        "slug": "anime_dracula",
        "name": "Dracula: Castlevania Prince",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/anime_dracula.png",
        "metadata": {
            "title": "Bishounen Dark Sovereign",
            "tagline": "Flowing silver hair, velvet cape, tragic shonen backstory.",
            "bio": "A timeless aristocratic vampire prince who will offer you eternal companionship in his gothic sky castle.",
            "quote": "\"What is a man? But my love for you is eternal.\"",
            "green_flags": [
                "Tragic romantic backstory",
                "Flawless bishounen elegance",
                "Commands bats and hellfire"
            ],
            "red_flags": [
                "Dramatic soliloquies by moonlit balconies",
                "Vampiric thirst"
            ],
            "greenFlags": [
                "Tragic romantic backstory",
                "Flawless bishounen elegance",
                "Commands bats and hellfire"
            ],
            "redFlags": [
                "Dramatic soliloquies by moonlit balconies",
                "Vampiric thirst"
            ],
            "turn_on": "Eternal loyalty and classical violin duets",
            "turnOn": "Eternal loyalty and classical violin duets",
            "dealbreaker": "Holy water and garlic jokes",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Bishounen Dark Sovereign",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Bishounen Dark Sovereign"
        }
    },
    {
        "slug": "anime_feng_min",
        "name": "Feng Min: Arcade Senpai",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/anime_feng_min.png",
        "metadata": {
            "title": "Rhythm Game Queen",
            "tagline": "Neon bunny headphones, perfect 100% combo streak, boba lover.",
            "bio": "The reigning champion of every Tokyo arcade center. She will teach you the secret frame data for every dance machine.",
            "quote": "\"Combo chain: Max! Let's go!\"",
            "green_flags": [
                "Wins every claw machine plushie for you",
                "Super cute gaming aesthetic",
                "Carries 2v8 trials"
            ],
            "red_flags": [
                "Stays awake 36 hours for gacha banner resets",
                "Rage quits when dropping combos"
            ],
            "greenFlags": [
                "Wins every claw machine plushie for you",
                "Super cute gaming aesthetic",
                "Carries 2v8 trials"
            ],
            "redFlags": [
                "Stays awake 36 hours for gacha banner resets",
                "Rage quits when dropping combos"
            ],
            "turn_on": "Gacha luck and perfect rhythm sync",
            "turnOn": "Gacha luck and perfect rhythm sync",
            "dealbreaker": "Casual button mashers",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Rhythm Game Queen",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Rhythm Game Queen"
        }
    },
    {
        "slug": "anime_wesker",
        "name": "Wesker: Megane Mastermind",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/anime_wesker.png",
        "metadata": {
            "title": "Calculating Student President",
            "tagline": "Pushes glasses up nose, trench coat, seven minutes plan.",
            "bio": "'All according to keikaku (Translator's note: keikaku means plan).' The calculating student council president who controls the school.",
            "quote": "\"Seven minutes is all the study time you need.\"",
            "green_flags": [
                "Impeccable strategic intellect",
                "Always achieves highest exam scores",
                "Never late"
            ],
            "red_flags": [
                "Monologues about global saturation during lunch",
                "Strict 7-minute date timer"
            ],
            "greenFlags": [
                "Impeccable strategic intellect",
                "Always achieves highest exam scores",
                "Never late"
            ],
            "redFlags": [
                "Monologues about global saturation during lunch",
                "Strict 7-minute date timer"
            ],
            "turn_on": "Intellectual debates and perfectionism",
            "turnOn": "Intellectual debates and perfectionism",
            "dealbreaker": "Failing basic biology exams",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Calculating Student President",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Calculating Student President"
        }
    },
    {
        "slug": "anime_meg",
        "name": "Meg: Track & Field Kouhai",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/anime_meg.png",
        "metadata": {
            "title": "Energetic Athletics Star",
            "tagline": "Twin tails, track baton, morning jogging dates.",
            "bio": "The spirited star of the school track club who will run by your side every morning at sunrise.",
            "quote": "\"One more lap around the trial!\"",
            "green_flags": [
                "Boundless positive energy",
                "Makes healthy bento boxes",
                "Sprint Burst queen"
            ],
            "red_flags": [
                "Wakes you up at 5 AM for cardio training",
                "Never stops running"
            ],
            "greenFlags": [
                "Boundless positive energy",
                "Makes healthy bento boxes",
                "Sprint Burst queen"
            ],
            "redFlags": [
                "Wakes you up at 5 AM for cardio training",
                "Never stops running"
            ],
            "turn_on": "Morning jogs, sports drinks, and cheering fans",
            "turnOn": "Morning jogs, sports drinks, and cheering fans",
            "dealbreaker": "Lazy couch potatoes",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Energetic Athletics Star",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Energetic Athletics Star"
        }
    }
]

# ==========================================
# GOTHIC_ELDRITCH (10 ENTITIES)
# ==========================================

GOTHIC_ELDRITCH_ENTITIES: List[Dict[str, Any]] = [
    {
        "slug": "gothic_dracula",
        "name": "Dracula: Lord of Shadows",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/gothic_dracula.png",
        "metadata": {
            "title": "Victorian Sovereign",
            "tagline": "Crimson velvet cape, grand castle ballrooms, and timeless aristocratic charm.",
            "bio": "An ancient nobleman who commands wolves, bats, and flame. He will invite you to candlelit waltzes in moonlit castles for eternity.",
            "quote": "\"What is a mortal heart, if not a flame longing for eternity?\"",
            "green_flags": [
                "Immortal romantic passion",
                "Majestic castle estate",
                "Finest vintage wines"
            ],
            "red_flags": [
                "Craves human blood",
                "Sunlight allergy"
            ],
            "greenFlags": [
                "Immortal romantic passion",
                "Majestic castle estate",
                "Finest vintage wines"
            ],
            "redFlags": [
                "Craves human blood",
                "Sunlight allergy"
            ],
            "turn_on": "Aristocratic elegance, dark classical music, and passionate loyalty",
            "turnOn": "Aristocratic elegance, dark classical music, and passionate loyalty",
            "dealbreaker": "Garlic and silver in the bedroom",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Victorian Sovereign",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Victorian Sovereign"
        }
    },
    {
        "slug": "gothic_sable",
        "name": "Sable: Victorian Mourner",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/gothic_sable.png",
        "metadata": {
            "title": "Gothic Cemetery Maiden",
            "tagline": "Lace corsets, black roses, and Victorian poetry by midnight tombstones.",
            "bio": "Melancholy, poetic, and utterly mesmerizing. She finds profound beauty in the macabre and will write you dark sonnets in cemetery crypts.",
            "quote": "\"In darkness, we find the only love that never dies.\"",
            "green_flags": [
                "Profound emotional depth",
                "Exquisite vintage gothic style",
                "Deeply honest"
            ],
            "red_flags": [
                "Prefers graveyard dates over dinner",
                "Sleeps in antique velvet coffins"
            ],
            "greenFlags": [
                "Profound emotional depth",
                "Exquisite vintage gothic style",
                "Deeply honest"
            ],
            "redFlags": [
                "Prefers graveyard dates over dinner",
                "Sleeps in antique velvet coffins"
            ],
            "turn_on": "Dark romantic poetry, black roses, and rainstorm walks",
            "turnOn": "Dark romantic poetry, black roses, and rainstorm walks",
            "dealbreaker": "Bright neon colors and shallow gossip",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Gothic Cemetery Maiden",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Gothic Cemetery Maiden"
        }
    },
    {
        "slug": "bloodborne_huntress",
        "name": "Huntress: Yharnam Hunter",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/bloodborne_huntress.png",
        "metadata": {
            "title": "Beast-Cleaving Huntress",
            "tagline": "Tricorn hunter hat, heavy bone-cleaver, and stalking the nightmare moon.",
            "bio": "Stalking the cursed foggy moors, she hunts beasts by blood moonlight and keeps her partner safe from eldritch monstrosities.",
            "quote": "\"A hunter must hunt... but I will return to you.\"",
            "green_flags": [
                "Unstoppable strength",
                "Fiercely affectionate",
                "Will fight literal gods for you"
            ],
            "red_flags": [
                "Bathes in beast blood",
                "Eldritch humming in the woods"
            ],
            "greenFlags": [
                "Unstoppable strength",
                "Fiercely affectionate",
                "Will fight literal gods for you"
            ],
            "redFlags": [
                "Bathes in beast blood",
                "Eldritch humming in the woods"
            ],
            "turn_on": "Fearless bravery and standing firm in the hunt",
            "turnOn": "Fearless bravery and standing firm in the hunt",
            "dealbreaker": "Succumbing to the beastly plague",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Beast-Cleaving Huntress",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Beast-Cleaving Huntress"
        }
    },
    {
        "slug": "dark_fantasy_mikaela",
        "name": "Mikaela: Grimoire Sorceress",
        "role": "Survivor",
        "gender": "female",
        "media_url": "/static/icons/survivors/dark_fantasy_mikaela.png",
        "metadata": {
            "title": "Arcane Scholar",
            "tagline": "Dark grimoire, blood seal blessings, Gothic witch allure.",
            "bio": "Deciphering forbidden grimoires by the bonfire light to shield her allies from ancient nightmare deities.",
            "quote": "\"The ancient seals will keep us safe tonight.\"",
            "green_flags": [
                "Deep occult knowledge",
                "Protective ward totems",
                "Hauntingly beautiful incantations"
            ],
            "red_flags": [
                "Summons dark entities during arguments",
                "Candle wax all over the floor"
            ],
            "greenFlags": [
                "Deep occult knowledge",
                "Protective ward totems",
                "Hauntingly beautiful incantations"
            ],
            "redFlags": [
                "Summons dark entities during arguments",
                "Candle wax all over the floor"
            ],
            "turn_on": "Ancient manuscripts, dark tea, and midnight readings",
            "turnOn": "Ancient manuscripts, dark tea, and midnight readings",
            "dealbreaker": "Burning historic books",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Arcane Scholar",
                "Survivor",
                "female"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Arcane Scholar"
        }
    },
    {
        "slug": "eldritch_nurse",
        "name": "Sally: Cosmic Void Maiden",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/eldritch_nurse.png",
        "metadata": {
            "title": "Star-Spawn Spectre",
            "tagline": "Constellation shroud, void blink, cosmic lullabies.",
            "bio": "A ghostly cosmic being who glides between the stars, weaving the fabric of the universe into gentle melodies.",
            "quote": "\"We are but stardust in the infinite void.\"",
            "green_flags": [
                "Transcends space and time",
                "Ethereal graceful movements",
                "Soothes existential dread"
            ],
            "red_flags": [
                "Occasional cosmic madness",
                "Floating through solid matter unexpectedly"
            ],
            "greenFlags": [
                "Transcends space and time",
                "Ethereal graceful movements",
                "Soothes existential dread"
            ],
            "redFlags": [
                "Occasional cosmic madness",
                "Floating through solid matter unexpectedly"
            ],
            "turn_on": "Astronomy, cosmic infinity, and stargazing",
            "turnOn": "Astronomy, cosmic infinity, and stargazing",
            "dealbreaker": "Earthbound narrow-mindedness",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Star-Spawn Spectre",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Star-Spawn Spectre"
        }
    },
    {
        "slug": "plague_priestess",
        "name": "Adiris: Dynasty High Priestess",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/plague_priestess.png",
        "metadata": {
            "title": "Babylonian Sovereign",
            "tagline": "Golden headdress, swinging censer, ancient sacred devotion.",
            "bio": "A majestic high priestess dedicated to protecting her people through eternal ritual prayers and sacred incense.",
            "quote": "\"May the gods look upon our devotion with mercy.\"",
            "green_flags": [
                "Unshakeable spiritual devotion",
                "Regal Babylonian elegance",
                "Exquisite gold jewelry"
            ],
            "red_flags": [
                "Censer smoke fills the whole room",
                "Vomiting green vile on heretics"
            ],
            "greenFlags": [
                "Unshakeable spiritual devotion",
                "Regal Babylonian elegance",
                "Exquisite gold jewelry"
            ],
            "redFlags": [
                "Censer smoke fills the whole room",
                "Vomiting green vile on heretics"
            ],
            "turn_on": "Piety, devotion, and sacred hymns",
            "turnOn": "Piety, devotion, and sacred hymns",
            "dealbreaker": "Desecrating sacred altars",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Babylonian Sovereign",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Babylonian Sovereign"
        }
    },
    {
        "slug": "raven_artist",
        "name": "Carmina: Crow Queen",
        "role": "Killer",
        "gender": "female",
        "media_url": "/static/icons/killers/raven_artist.png",
        "metadata": {
            "title": "Gothic Surrealist Painter",
            "tagline": "Feather dress, ink-stained hands, flight of dire crows.",
            "bio": "A brilliant gothic artist whose paintings manifest into reality. She expresses profound grief through soaring crows and ink portraits.",
            "quote": "\"In black ink, my heart writes to you.\"",
            "green_flags": [
                "Profoundly artistic and emotional",
                "Crows deliver handwritten love letters",
                "Exquisite aesthetic sense"
            ],
            "red_flags": [
                "Ink splatters on all furniture",
                "Speaks in crow caws when emotional"
            ],
            "greenFlags": [
                "Profoundly artistic and emotional",
                "Crows deliver handwritten love letters",
                "Exquisite aesthetic sense"
            ],
            "redFlags": [
                "Ink splatters on all furniture",
                "Speaks in crow caws when emotional"
            ],
            "turn_on": "Poetry, surrealism, and tragic romance",
            "turnOn": "Poetry, surrealism, and tragic romance",
            "dealbreaker": "Harming birds and destroying art",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Gothic Surrealist Painter",
                "Killer",
                "female"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Gothic Surrealist Painter"
        }
    },
    {
        "slug": "occult_vittorio",
        "name": "Vittorio: Runemaster",
        "role": "Survivor",
        "gender": "male",
        "media_url": "/static/icons/survivors/occult_vittorio.png",
        "metadata": {
            "title": "Centuries-Old Scholar",
            "tagline": "Glowing blue runes, medieval parchment, profound ancient wisdom.",
            "bio": "Having wandered the Fog for centuries, Vittorio holds secrets of ancient kingdoms and will tell you stories of forgotten empires.",
            "quote": "\"Knowledge is the true light against the dark.\"",
            "green_flags": [
                "Immense historical wisdom",
                "Calm and composed in any storm",
                "Potential Energy generator master"
            ],
            "red_flags": [
                "Uses medieval slang",
                "Takes 2 hours to explain a simple history fact"
            ],
            "greenFlags": [
                "Immense historical wisdom",
                "Calm and composed in any storm",
                "Potential Energy generator master"
            ],
            "redFlags": [
                "Uses medieval slang",
                "Takes 2 hours to explain a simple history fact"
            ],
            "turn_on": "Historical philosophy and ancient glyphs",
            "turnOn": "Historical philosophy and ancient glyphs",
            "dealbreaker": "Short attention spans",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Centuries-Old Scholar",
                "Survivor",
                "male"
            ],
            "chaos_score": 50,
            "danger_level": "Low",
            "archetype": "Centuries-Old Scholar"
        }
    },
    {
        "slug": "phantom_wraith",
        "name": "Philip: Barrow Wight",
        "role": "Killer",
        "gender": "male",
        "media_url": "/static/icons/killers/phantom_wraith.png",
        "metadata": {
            "title": "Gothic Bell Mourner",
            "tagline": "Spectral tattered cloak, wailing bell, graveyard mist.",
            "bio": "A melancholic spirit who chimes his ancient bell across misty Victorian graveyards, searching for warmth.",
            "quote": "\"The mist conceals my tears.\"",
            "green_flags": [
                "Gentle soul",
                "Never makes loud unannounced noises",
                "Comfortable in the quiet mist"
            ],
            "red_flags": [
                "Vanishes without saying goodbye",
                "Lingers in cemeteries"
            ],
            "greenFlags": [
                "Gentle soul",
                "Never makes loud unannounced noises",
                "Comfortable in the quiet mist"
            ],
            "redFlags": [
                "Vanishes without saying goodbye",
                "Lingers in cemeteries"
            ],
            "turn_on": "Soft chimes, shared silence, and rain",
            "turnOn": "Soft chimes, shared silence, and rain",
            "dealbreaker": "Loud screeching noises",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Gothic Bell Mourner",
                "Killer",
                "male"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Gothic Bell Mourner"
        }
    },
    {
        "slug": "abyssal_dredge",
        "name": "The Dredge: Eldritch Void",
        "role": "Killer",
        "gender": "monster_other",
        "media_url": "/static/icons/killers/abyssal_dredge.png",
        "metadata": {
            "title": "Amalgamation of Nightfall",
            "tagline": "Nightfall shroud, thousands of whispering hands, cosmic darkness.",
            "bio": "The manifestation of collective dread and dark thoughts. Inside the darkness is a being that just wants to envelop you in eternal embrace.",
            "quote": "*Whispers of the nightfall...*",
            "green_flags": [
                "Turns out all the lights for cozy sleep",
                "Locker teleportation master",
                "Never leaves you alone"
            ],
            "red_flags": [
                "Made of a thousand screaming souls",
                "Teleports out of your bedroom closet"
            ],
            "greenFlags": [
                "Turns out all the lights for cozy sleep",
                "Locker teleportation master",
                "Never leaves you alone"
            ],
            "redFlags": [
                "Made of a thousand screaming souls",
                "Teleports out of your bedroom closet"
            ],
            "turn_on": "Deep existential philosophy and total darkness",
            "turnOn": "Deep existential philosophy and total darkness",
            "dealbreaker": "Bright floodlights and cheerful pop music",
            "dating_vibe": "",
            "datingVibe": "",
            "chapter": "",
            "compatibility_tags": [
                "Amalgamation of Nightfall",
                "Killer",
                "monster_other"
            ],
            "chaos_score": 75,
            "danger_level": "High",
            "archetype": "Amalgamation of Nightfall"
        }
    }
]

ROSTER_ENTITIES_MAP = {
    "canon": CANON_ENTITIES,
    "hooked_on_you": HOOKED_ON_YOU_ENTITIES,
    "legendary_cosplay": LEGENDARY_COSPLAY_ENTITIES,
    "cyberpunk_2077": CYBERPUNK_2077_ENTITIES,
    "anime_manga": ANIME_MANGA_ENTITIES,
    "gothic_eldritch": GOTHIC_ELDRITCH_ENTITIES,
}

# ==========================================
# MULTI-LOCALE TRANSLATIONS (en, es, de, ja, pl)
# ==========================================

TRANSLATIONS_DATA: Dict[str, Dict[str, str]] = {
    "en": {
        "smashOrPass.rosters.canon.name": "Dead by Daylight: Fog Canon",
        "smashOrPass.rosters.canon.desc": "The complete 98-character roster of all official Killers and Survivors.",
        "smashOrPass.rosters.hoy.name": "Hooked on You: Island Romance",
        "smashOrPass.rosters.hoy.desc": "Tropical paradise dating sim edition with beach outfits and sunny vibes.",
        "smashOrPass.rosters.legendary.name": "Legendary Skins & Collabs",
        "smashOrPass.rosters.legendary.desc": "Iconic legendary skins and crossover collabs from gaming history.",
        "smashOrPass.rosters.cyberpunk.name": "Cyberpunk Fog 2077 Edition",
        "smashOrPass.rosters.cyberpunk.desc": "High-tech neon augmented champions fighting in a dystopian fog.",
        "smashOrPass.rosters.anime.name": "Fog Anime / Manga Aesthetic",
        "smashOrPass.rosters.anime.desc": "Stylized anime aesthetic adaptations of your favorite Fog characters.",
        "smashOrPass.rosters.gothic.name": "Victorian & Gothic Eldritch Legends",
        "smashOrPass.rosters.gothic.desc": "Dark fantasy, Bloodborne aesthetics, and Victorian eldritch horrors.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Leaderboard",
        "smashOrPass.tiers.godTier": "God Tier",
        "smashOrPass.tiers.fatalAttraction": "Fatal Attraction",
        "smashOrPass.tiers.friendzone": "Friendzone",
        "smashOrPass.tiers.eldritchVoid": "Eldritch Void",
    },
    "es": {
        "smashOrPass.rosters.canon.name": "Dead by Daylight: Canon de la Niebla",
        "smashOrPass.rosters.canon.desc": "El elenco completo de 98 personajes de asesinos y supervivientes oficiales.",
        "smashOrPass.rosters.hoy.name": "Hooked on You: Romance en la Isla",
        "smashOrPass.rosters.hoy.desc": "Edición simulador de citas en un paraíso tropical con trajes de playa.",
        "smashOrPass.rosters.legendary.name": "Skins Legendarias y Colaboraciones",
        "smashOrPass.rosters.legendary.desc": "Skins legendarias icónicas y colaboraciones históricas de videojuegos.",
        "smashOrPass.rosters.cyberpunk.name": "Edición Niebla Cyberpunk 2077",
        "smashOrPass.rosters.cyberpunk.desc": "Campeones aumentados con neón de alta tecnología en una niebla distópica.",
        "smashOrPass.rosters.anime.name": "Estética Anime y Manga de la Niebla",
        "smashOrPass.rosters.anime.desc": "Adaptaciones estilizadas en anime de tus personajes favoritos.",
        "smashOrPass.rosters.gothic.name": "Leyendas Góticas y Primigenias Victorianas",
        "smashOrPass.rosters.gothic.desc": "Fantasía oscura, estética Bloodborne y horrores victorianos primigenios.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Clasificación",
        "smashOrPass.tiers.godTier": "Nivel Dios",
        "smashOrPass.tiers.fatalAttraction": "Atracción Fatal",
        "smashOrPass.tiers.friendzone": "Zona de Amigos",
        "smashOrPass.tiers.eldritchVoid": "Vacío Primigenio",
    },
    "de": {
        "smashOrPass.rosters.canon.name": "Dead by Daylight: Nebel-Kanon",
        "smashOrPass.rosters.canon.desc": "Die vollständige Liste aller 98 offiziellen Killer und Überlebenden.",
        "smashOrPass.rosters.hoy.name": "Hooked on You: Insel-Romanze",
        "smashOrPass.rosters.hoy.desc": "Tropische Dating-Sim-Edition mit Strand-Outfits und sonnigen Vibes.",
        "smashOrPass.rosters.legendary.name": "Legendäre Skins & Kollaborationen",
        "smashOrPass.rosters.legendary.desc": "Ikonische legendäre Skins und Crossover-Kollaborationen.",
        "smashOrPass.rosters.cyberpunk.name": "Cyberpunk-Nebel 2077 Edition",
        "smashOrPass.rosters.cyberpunk.desc": "High-Tech Neon-Champions im Kampf durch den dystopischen Nebel.",
        "smashOrPass.rosters.anime.name": "Nebel Anime / Manga Ästhetik",
        "smashOrPass.rosters.anime.desc": "Stilisierte Anime-Adaptionen deiner liebsten Nebel-Charaktere.",
        "smashOrPass.rosters.gothic.name": "Viktorianische & Gotische Eldritch-Legenden",
        "smashOrPass.rosters.gothic.desc": "Dark Fantasy, Bloodborne-Ästhetik und viktorianischer Eldritch-Horror.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Rangliste",
        "smashOrPass.tiers.godTier": "Götter-Stufe",
        "smashOrPass.tiers.fatalAttraction": "Fatale Anziehung",
        "smashOrPass.tiers.friendzone": "Friendzone",
        "smashOrPass.tiers.eldritchVoid": "Eldritch-Leere",
    },
    "ja": {
        "smashOrPass.rosters.canon.name": "Dead by Daylight: 霧の正史 (カノン)",
        "smashOrPass.rosters.canon.desc": "公式の殺人鬼と生存者全98キャラクターの完全ロスター。",
        "smashOrPass.rosters.hoy.name": "Hooked on You: 狂気の島恋愛シミュレーション",
        "smashOrPass.rosters.hoy.desc": "水着と南国の雰囲気漂うトロピカルデートシミュレーション版。",
        "smashOrPass.rosters.legendary.name": "レジェンダリースキン＆コラボ",
        "smashOrPass.rosters.legendary.desc": "ゲーム史に輝く象徴的なレジェンダリースキンとクロスオーバーコラボ。",
        "smashOrPass.rosters.cyberpunk.name": "サイバーパンク・フォグ 2077 エディション",
        "smashOrPass.rosters.cyberpunk.desc": "ディストピアの霧で戦うハイテク・ネオン強化チャンピオンたち。",
        "smashOrPass.rosters.anime.name": "フォグ・アニメ / マンガ美学",
        "smashOrPass.rosters.anime.desc": "大好きなフォグキャラクターたちのスタイリッシュなアニメ版スタイル。",
        "smashOrPass.rosters.gothic.name": "ヴィクトリアン＆ゴシック・エルドリッチ伝説",
        "smashOrPass.rosters.gothic.desc": "ダークファンタジー、ブラッドボーン風美学、ヴィクトリア朝の異形ホラー。",
        "smashOrPass.ui.smash": "スマッシュ",
        "smashOrPass.ui.pass": "パス",
        "smashOrPass.ui.leaderboard": "リーダーボード",
        "smashOrPass.tiers.godTier": "神ティア",
        "smashOrPass.tiers.fatalAttraction": "致命的魅力",
        "smashOrPass.tiers.friendzone": "フレンドゾーン",
        "smashOrPass.tiers.eldritchVoid": "狂気の虚無",
    },
    "pl": {
        "smashOrPass.rosters.canon.name": "Dead by Daylight: Kanon Mgły",
        "smashOrPass.rosters.canon.desc": "Kompletny zestaw 98 oficjalnych postaci Zabójców i Ocalałych.",
        "smashOrPass.rosters.hoy.name": "Hooked on You: Romans na Wyspie",
        "smashOrPass.rosters.hoy.desc": "Tropikalna edycja symulatora randkowego w plażowych strojach.",
        "smashOrPass.rosters.legendary.name": "Legendarne Skórki i Kolaboracje",
        "smashOrPass.rosters.legendary.desc": "Kultowe legendarne skórki i crossovery z historii gier wideo.",
        "smashOrPass.rosters.cyberpunk.name": "Cyberpunkowa Mgła 2077",
        "smashOrPass.rosters.cyberpunk.desc": "Zaawansowani technologicznie neonowi czempioni w dystopijnej mgle.",
        "smashOrPass.rosters.anime.name": "Estetyka Anime / Mangi w Mgle",
        "smashOrPass.rosters.anime.desc": "Stylizowane adaptacje anime Twoich ulubionych postaci z Mgły.",
        "smashOrPass.rosters.gothic.name": "Wiktoriańskie i Gotyckie Legendy Przedwiecznych",
        "smashOrPass.rosters.gothic.desc": "Mroczne fantasy, estetyka Bloodborne i wiktoriańskie koszmary przedwiecznych.",
        "smashOrPass.ui.smash": "Smash",
        "smashOrPass.ui.pass": "Pass",
        "smashOrPass.ui.leaderboard": "Tabela wyników",
        "smashOrPass.tiers.godTier": "Boski Poziom",
        "smashOrPass.tiers.fatalAttraction": "Zguba z Miłości",
        "smashOrPass.tiers.friendzone": "Strefa Przyjaźni",
        "smashOrPass.tiers.eldritchVoid": "Kosmiczna Otchłań",
    },
}


def seed_smash_rosters() -> None:
    """
    Seeds all 6 rosters, 148 entities with rich dating profile metadata, clean 0-vote stats,
    and multi-locale translations for en, es, de, ja, and pl.
    Idempotent and safe against concurrency issues.
    """
    try:
        # 1. Seed / Update Rosters
        for r_data in ROSTERS_DATA:
            roster = db.session.scalar(
                select(Roster).where(Roster.slug == r_data["slug"])
            )
            if not roster:
                roster = Roster(
                    id=str(uuid.uuid4()),
                    slug=r_data["slug"],
                    name_i18n_key=r_data["name_i18n_key"],
                    description_i18n_key=r_data["description_i18n_key"],
                    cover_image_url=r_data["cover_image_url"],
                    theme_color=r_data["theme_color"],
                    category=r_data["category"],
                    is_nsfw=r_data["is_nsfw"],
                    is_active=r_data["is_active"],
                )
                db.session.add(roster)
            else:
                roster.name_i18n_key = r_data["name_i18n_key"]
                roster.description_i18n_key = r_data["description_i18n_key"]
                roster.cover_image_url = r_data["cover_image_url"]
                roster.theme_color = r_data["theme_color"]
                roster.category = r_data["category"]
                roster.is_nsfw = r_data["is_nsfw"]
                roster.is_active = r_data["is_active"]

            db.session.flush()

            # 2. Seed Entities and EntityStats for this Roster
            entities = ROSTER_ENTITIES_MAP.get(r_data["slug"], [])
            for order_idx, e_data in enumerate(entities):
                entity = db.session.scalar(
                    select(Entity).where(
                        Entity.roster_id == roster.id,
                        Entity.slug == e_data["slug"],
                    )
                )
                if not entity:
                    entity = Entity(
                        id=str(uuid.uuid4()),
                        roster_id=roster.id,
                        slug=e_data["slug"],
                        name=e_data["name"],
                        role=e_data["role"],
                        gender=e_data["gender"],
                        media_url=e_data.get("media_url"),
                        media_type="image",
                        metadata_json=e_data.get("metadata", {}),
                        order_index=order_idx,
                        is_active=True,
                    )
                    db.session.add(entity)
                    db.session.flush()
                else:
                    entity.name = e_data["name"]
                    entity.role = e_data["role"]
                    entity.gender = e_data["gender"]
                    entity.media_url = e_data.get("media_url")
                    entity.metadata_json = e_data.get("metadata", {})
                    entity.order_index = order_idx
                    db.session.flush()

                # Ensure EntityStat exists with 0 counts
                stat = db.session.scalar(
                    select(EntityStat).where(EntityStat.entity_id == entity.id)
                )
                if not stat:
                    chaos = float(
                        e_data.get("metadata", {}).get("chaos_score", 50.0)
                    )
                    stat = EntityStat(
                        id=str(uuid.uuid4()),
                        entity_id=entity.id,
                        smash_count=0,
                        pass_count=0,
                        super_smash_count=0,
                        total_votes=0,
                        smash_rate=0.0,
                        chaos_rating=chaos,
                    )
                    db.session.add(stat)

        # 3. Seed Multi-Locale Translations
        for locale, kv_map in TRANSLATIONS_DATA.items():
            for key, value in kv_map.items():
                trans = db.session.scalar(
                    select(Translation).where(
                        Translation.locale == locale,
                        Translation.key == key,
                    )
                )
                if not trans:
                    trans = Translation(
                        id=str(uuid.uuid4()),
                        locale=locale,
                        key=key,
                        value=value,
                    )
                    db.session.add(trans)
                else:
                    trans.value = value

        # 4. Legacy SmashPassStat synchronization
        for r_slug in ["canon", "hooked_on_you", "legendary_cosplay"]:
            for e_data in ROSTER_ENTITIES_MAP.get(r_slug, []):
                leg_stat = db.session.scalar(
                    select(SmashPassStat).where(
                        SmashPassStat.character_slug == e_data["slug"],
                        SmashPassStat.edition == r_slug,
                    )
                )
                if not leg_stat:
                    db.session.add(
                        SmashPassStat(
                            character_slug=e_data["slug"],
                            character_name=e_data["name"],
                            role=e_data["role"],
                            gender=e_data["gender"],
                            edition=r_slug,
                            smash_count=0,
                            pass_count=0,
                            super_smash_count=0,
                            total_votes=0,
                            smash_rate=0.0,
                        )
                    )

        db.session.commit()
        logger.info("Smash rosters, entities, stats, and translations successfully seeded.")
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error seeding smash rosters: {e}")
        raise e
