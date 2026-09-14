# backend/app/services/others/killer_calc_service.py
from typing import Any

KILLERS_DATA: dict[str, dict[str, Any]] = {
    "huntress": {
        "id": "huntress",
        "name": "The Huntress",
        "title": "Anna",
        "icon": "huntress.png",
        "base_terror_radius": 20.0,
        "lullaby_radius": 45.0,
        "movement_speed": 4.4,
        "power_name": "Hunting Hatchets",
        "power_stats": {
            "windup_time": {"name": "Hatchet Windup Time", "base": 1.0, "unit": "s", "lower_is_better": True},
            "cooldown_time": {"name": "Hatchet Throw Cooldown", "base": 1.25, "unit": "s", "lower_is_better": True},
            "reload_speed": {"name": "Locker Reload Speed", "base": 3.0, "unit": "s", "lower_is_better": True},
            "hatchet_capacity": {"name": "Hatchet Capacity", "base": 5, "unit": "hatchets", "lower_is_better": False},
        },
        "addons": {
            "flower_babushka": {
                "id": "flower_babushka",
                "name": "Flower Babushka",
                "rarity": "Uncommon",
                "description": "Moderately decreases hatchet windup time (-12%).",
                "modifiers": {"windup_time": {"type": "percent", "value": -12}}
            },
            "manna_grass_braid": {
                "id": "manna_grass_braid",
                "name": "Manna Grass Braid",
                "rarity": "Common",
                "description": "Slightly decreases hatchet windup time (-8%).",
                "modifiers": {"windup_time": {"type": "percent", "value": -8}}
            },
            "oak_shaft": {
                "id": "oak_shaft",
                "name": "Oak Shaft",
                "rarity": "Rare",
                "description": "Decreases cooldown between hatchet throws (-20%).",
                "modifiers": {"cooldown_time": {"type": "percent", "value": -20}}
            },
            "leather_loop": {
                "id": "leather_loop",
                "name": "Leather Loop",
                "rarity": "Uncommon",
                "description": "Increases hatchet capacity (+1) and decreases reload time (-10%).",
                "modifiers": {
                    "hatchet_capacity": {"type": "flat", "value": 1},
                    "reload_speed": {"type": "percent", "value": -10}
                }
            },
            "wooden_fox": {
                "id": "wooden_fox",
                "name": "Wooden Fox",
                "rarity": "Very Rare",
                "description": "Grants Undetectable status for 15 seconds after reloading.",
                "modifiers": {}
            }
        }
    },
    "nurse": {
        "id": "nurse",
        "name": "The Nurse",
        "title": "Sally Smithson",
        "icon": "nurse.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 3.85,
        "power_name": "Spencer's Last Breath",
        "power_stats": {
            "blink_charge_time": {"name": "Blink Charge Time", "base": 2.0, "unit": "s", "lower_is_better": True},
            "blink_fatigue_time": {"name": "Blink Fatigue Duration", "base": 2.5, "unit": "s", "lower_is_better": True},
            "max_blinks": {"name": "Max Blinks", "base": 2, "unit": "blinks", "lower_is_better": False},
            "blink_charge_speed": {"name": "Blink Charge Speed", "base": 100.0, "unit": "%", "lower_is_better": False},
        },
        "addons": {
            "fragile_wheeze": {
                "id": "fragile_wheeze",
                "name": "Fragile Wheeze",
                "rarity": "Very Rare",
                "description": "Decreases fatigue duration after blinks (-15%).",
                "modifiers": {"blink_fatigue_time": {"type": "percent", "value": -15}}
            },
            "heavy_panting": {
                "id": "heavy_panting",
                "name": "Heavy Panting",
                "rarity": "Rare",
                "description": "Increases max blink charge speed (+20%).",
                "modifiers": {"blink_charge_speed": {"type": "percent", "value": 20}}
            },
            "kavanaghs_last_breath": {
                "id": "kavanaghs_last_breath",
                "name": "Kavanagh's Last Breath",
                "rarity": "Very Rare",
                "description": "Increases max blink charge speed (+30%) but increases fatigue duration (+15%).",
                "modifiers": {
                    "blink_charge_speed": {"type": "percent", "value": 30},
                    "blink_fatigue_time": {"type": "percent", "value": 15}
                }
            },
            "dark_cincture": {
                "id": "dark_cincture",
                "name": "Dark Cincture",
                "rarity": "Uncommon",
                "description": "Increases movement speed (+0.2 m/s).",
                "modifiers": {"movement_speed": {"type": "flat", "value": 0.2}}
            },
            "bad_mans_last_breath": {
                "id": "bad_mans_last_breath",
                "name": "Bad Man's Last Breath",
                "rarity": "Ultra Rare",
                "description": "Hitting a survivor with a blink attack hides Terror Radius for 25s.",
                "modifiers": {}
            }
        }
    },
    "blight": {
        "id": "blight",
        "name": "The Blight",
        "title": "Talbot Grimes",
        "icon": "blight.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.6,
        "power_name": "Blighted Serum",
        "power_stats": {
            "rush_tokens": {"name": "Rush Tokens", "base": 5, "unit": "tokens", "lower_is_better": False},
            "rush_recharge_time": {"name": "Token Recharge Time", "base": 2.0, "unit": "s", "lower_is_better": True},
            "rush_speed": {"name": "Rush Movement Speed Boost", "base": 0.0, "unit": "%", "lower_is_better": False},
            "turn_rate": {"name": "Rush Turn Rate", "base": 100.0, "unit": "%", "lower_is_better": False},
        },
        "addons": {
            "blighted_rat": {
                "id": "blighted_rat",
                "name": "Blighted Rat",
                "rarity": "Uncommon",
                "description": "Increases Rush movement speed (+10%).",
                "modifiers": {"rush_speed": {"type": "percent", "value": 10}}
            },
            "blighted_crow": {
                "id": "blighted_crow",
                "name": "Blighted Crow",
                "rarity": "Very Rare",
                "description": "Increases Rush movement speed (+15%).",
                "modifiers": {"rush_speed": {"type": "percent", "value": 15}}
            },
            "adrenaline_vial": {
                "id": "adrenaline_vial",
                "name": "Adrenaline Vial",
                "rarity": "Very Rare",
                "description": "Increases max Rush tokens (+2) and decreases token recharge time (-25%).",
                "modifiers": {
                    "rush_tokens": {"type": "flat", "value": 2},
                    "rush_recharge_time": {"type": "percent", "value": -25}
                }
            },
            "umbra_salts": {
                "id": "umbra_salts",
                "name": "Umbra Salts",
                "rarity": "Common",
                "description": "Increases Rush turn rate (+15%).",
                "modifiers": {"turn_rate": {"type": "percent", "value": 15}}
            },
            "compound_seven": {
                "id": "compound_seven",
                "name": "Compound Seven",
                "rarity": "Uncommon",
                "description": "Automatically targets nearby survivors within 16 meters during a rush.",
                "modifiers": {}
            }
        }
    },
    "trapper": {
        "id": "trapper",
        "name": "The Trapper",
        "title": "Evan MacMillan",
        "icon": "trapper.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.6,
        "power_name": "Bear Trap",
        "power_stats": {
            "trap_set_time": {"name": "Trap Setting Time", "base": 2.5, "unit": "s", "lower_is_better": True},
            "escape_difficulty": {"name": "Trap Rescue/Escape Time", "base": 100.0, "unit": "%", "lower_is_better": False},
            "starting_traps": {"name": "Starting Traps", "base": 2, "unit": "traps", "lower_is_better": False},
        },
        "addons": {
            "fast_fastening_kit": {
                "id": "fast_fastening_kit",
                "name": "Fast-Fastening Kit",
                "rarity": "Uncommon",
                "description": "Decreases trap setting time (-20%).",
                "modifiers": {"trap_set_time": {"type": "percent", "value": -20}}
            },
            "trapper_gloves": {
                "id": "trapper_gloves",
                "name": "Trapper Gloves",
                "rarity": "Common",
                "description": "Decreases trap setting time (-30%).",
                "modifiers": {"trap_set_time": {"type": "percent", "value": -30}}
            },
            "secondary_coil": {
                "id": "secondary_coil",
                "name": "Secondary Coil",
                "rarity": "Very Rare",
                "description": "Increases trap escape/rescue duration (+50%).",
                "modifiers": {"escape_difficulty": {"type": "percent", "value": 50}}
            },
            "trapper_bag": {
                "id": "trapper_bag",
                "name": "Trapper Sack",
                "rarity": "Very Rare",
                "description": "Start with +2 extra Bear Traps.",
                "modifiers": {"starting_traps": {"type": "flat", "value": 2}}
            },
            "tar_bottle": {
                "id": "tar_bottle",
                "name": "Tar Bottle",
                "rarity": "Rare",
                "description": "Considerably darkens Bear Traps.",
                "modifiers": {}
            }
        }
    },
    "wraith": {
        "id": "wraith",
        "name": "The Wraith",
        "title": "Philip Ojomo",
        "icon": "wraith.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.6,
        "power_name": "Wailing Bell",
        "power_stats": {
            "uncloak_time": {"name": "Uncloaking Time", "base": 3.0, "unit": "s", "lower_is_better": True},
            "cloak_time": {"name": "Cloaking Time", "base": 1.5, "unit": "s", "lower_is_better": True},
            "cloaked_speed": {"name": "Cloaked Movement Speed", "base": 6.0, "unit": "m/s", "lower_is_better": False},
        },
        "addons": {
            "swift_hunt": {
                "id": "swift_hunt",
                "name": "Swift Hunt - Blood",
                "rarity": "Very Rare",
                "description": "Decreases uncloaking time (-20%).",
                "modifiers": {"uncloak_time": {"type": "percent", "value": -20}}
            },
            "windstorm": {
                "id": "windstorm",
                "name": "Windstorm - Blood",
                "rarity": "Very Rare",
                "description": "Increases movement speed while cloaked (+10%).",
                "modifiers": {"cloaked_speed": {"type": "percent", "value": 10}}
            },
            "shadow_dance": {
                "id": "shadow_dance",
                "name": "Shadow Dance - White",
                "rarity": "Rare",
                "description": "Decreases cloaking time (-15%).",
                "modifiers": {"cloak_time": {"type": "percent", "value": -15}}
            },
            "bone_clapper": {
                "id": "bone_clapper",
                "name": "Bone Clapper",
                "rarity": "Uncommon",
                "description": "Bell sound no longer lets survivors discern distance or direction.",
                "modifiers": {}
            },
            "coxcomb_clapper": {
                "id": "coxcomb_clapper",
                "name": "The Coxcomb Clapper",
                "rarity": "Ultra Rare",
                "description": "Completely suppresses the Wailing Bell sound.",
                "modifiers": {}
            }
        }
    },
    "spirit": {
        "id": "spirit",
        "name": "The Spirit",
        "title": "Rin Yamaoka",
        "icon": "spirit.png",
        "base_terror_radius": 32.0,
        "lullaby_radius": 0.0,
        "movement_speed": 4.4,
        "power_name": "Yamaoka's Haunting",
        "power_stats": {
            "phase_duration": {"name": "Phase Duration", "base": 5.0, "unit": "s", "lower_is_better": False},
            "phase_speed": {"name": "Phase Movement Speed", "base": 7.0, "unit": "m/s", "lower_is_better": False},
            "phase_recharge": {"name": "Phase Recharge Time", "base": 15.0, "unit": "s", "lower_is_better": True},
        },
        "addons": {
            "yakuyoke_amulet": {
                "id": "yakuyoke_amulet",
                "name": "Yakuyoke Amulet",
                "rarity": "Very Rare",
                "description": "Increases phase duration (+20%) but decreases phase speed (-10%).",
                "modifiers": {
                    "phase_duration": {"type": "percent", "value": 20},
                    "phase_speed": {"type": "percent", "value": -10}
                }
            },
            "cherry_blossom": {
                "id": "cherry_blossom",
                "name": "Dried Cherry Blossom",
                "rarity": "Rare",
                "description": "Increases phase movement speed (+15%).",
                "modifiers": {"phase_speed": {"type": "percent", "value": 15}}
            },
            "mother_daughter_ring": {
                "id": "mother_daughter_ring",
                "name": "Mother-Daughter Ring",
                "rarity": "Ultra Rare",
                "description": "Tremendously increases phase movement speed (+40%).",
                "modifiers": {"phase_speed": {"type": "percent", "value": 40}}
            },
            "rusty_flute": {
                "id": "rusty_flute",
                "name": "Rusty Flute",
                "rarity": "Uncommon",
                "description": "Decreases phase recharge time (-20%).",
                "modifiers": {"phase_recharge": {"type": "percent", "value": -20}}
            },
            "origami_crane": {
                "id": "origami_crane",
                "name": "Origami Crane",
                "rarity": "Common",
                "description": "Decreases phase recharge time (-10%).",
                "modifiers": {"phase_recharge": {"type": "percent", "value": -10}}
            }
        }
    }
}

PERKS_DATA: dict[str, dict[str, Any]] = {
    "distressing": {
        "id": "distressing",
        "name": "Distressing",
        "description": "Increases Terror Radius by 26%",
        "type": "percent",
        "value": 26
    },
    "monitor_and_abuse": {
        "id": "monitor_and_abuse",
        "name": "Monitor & Abuse",
        "description": "Terror Radius +8m in chase, -8m outside chase",
        "type": "conditional_flat"
    },
    "agitation": {
        "id": "agitation",
        "name": "Agitation",
        "description": "Terror Radius +12m while carrying a survivor",
        "type": "conditional_flat"
    },
    "furtive_chase": {
        "id": "furtive_chase",
        "name": "Furtive Chase",
        "description": "Terror Radius -4m per token (up to 4 tokens = -16m)",
        "type": "token_flat"
    }
}


class KillerCalcService:
    def get_killers(self) -> dict[str, dict[str, Any]]:
        return KILLERS_DATA

    def get_perks(self) -> dict[str, dict[str, Any]]:
        return PERKS_DATA

    def calculate(
        self,
        killer_id: str,
        addon_ids: list[str] | None = None,
        perk_ids: list[str] | None = None,
        perk_options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        addon_ids = addon_ids or []
        perk_ids = perk_ids or []
        perk_options = perk_options or {}

        if killer_id not in KILLERS_DATA:
            raise ValueError(f"Unknown killer_id: {killer_id}")

        killer = KILLERS_DATA[killer_id]
        base_tr = float(killer["base_terror_radius"])
        lullaby_radius = float(killer["lullaby_radius"])

        tr_breakdown = [{"source": "Base Terror Radius", "value": base_tr}]
        percent_mod = 0.0
        flat_mod = 0.0

        if "distressing" in perk_ids:
            dist_val = round(base_tr * 0.26, 2)
            percent_mod += 26.0
            tr_breakdown.append({"source": "Distressing (+26%)", "value": dist_val})

        if "monitor_and_abuse" in perk_ids:
            in_chase = perk_options.get("in_chase", False)
            ma_val = 8.0 if in_chase else -8.0
            flat_mod += ma_val
            label = "Monitor & Abuse (In Chase +8m)" if in_chase else "Monitor & Abuse (Out of Chase -8m)"
            tr_breakdown.append({"source": label, "value": ma_val})

        if "agitation" in perk_ids:
            carrying = perk_options.get("carrying_survivor", False)
            ag_val = 12.0 if carrying else 0.0
            if carrying:
                flat_mod += ag_val
                tr_breakdown.append({"source": "Agitation (Carrying +12m)", "value": ag_val})

        if "furtive_chase" in perk_ids:
            tokens = min(4, max(0, int(perk_options.get("furtive_chase_tokens", 0))))
            fc_val = float(tokens * -4)
            if tokens > 0:
                flat_mod += fc_val
                tr_breakdown.append({"source": f"Furtive Chase ({tokens} tokens)", "value": fc_val})

        modified_tr = round(max(0.0, base_tr * (1.0 + percent_mod / 100.0) + flat_mod), 2)
        tr_delta = round(modified_tr - base_tr, 2)

        equipped_addons = []
        addon_objects = []
        for aid in addon_ids[:2]:
            if aid in killer["addons"]:
                aobj = killer["addons"][aid]
                equipped_addons.append(aobj)
                addon_objects.append({
                    "id": aobj["id"],
                    "name": aobj["name"],
                    "rarity": aobj["rarity"],
                    "description": aobj["description"]
                })

        stat_deltas = []
        power_stats = killer["power_stats"]

        for stat_id, sdata in power_stats.items():
            base_val = float(sdata["base"])
            unit = sdata["unit"]
            lower_is_better = sdata["lower_is_better"]
            stat_name = sdata["name"]

            sum_percent = 0.0
            sum_flat = 0.0

            for addon in equipped_addons:
                if stat_id in addon["modifiers"]:
                    mod = addon["modifiers"][stat_id]
                    if mod["type"] == "percent":
                        sum_percent += mod["value"]
                    elif mod["type"] == "flat":
                        sum_flat += mod["value"]

            if base_val == 0.0:
                modified_val = round(base_val + sum_percent + sum_flat, 2)
            else:
                modified_val = round(base_val * (1.0 + sum_percent / 100.0) + sum_flat, 2)
            delta_val = round(modified_val - base_val, 2)

            if lower_is_better:
                is_buff = modified_val < base_val
            else:
                is_buff = modified_val > base_val

            is_changed = sum_percent != 0.0 or sum_flat != 0.0

            formatted_delta = ""
            if sum_percent != 0.0:
                formatted_delta = f"{'+' if sum_percent > 0 else ''}{sum_percent}%"
            elif sum_flat != 0.0:
                formatted_delta = f"{'+' if sum_flat > 0 else ''}{sum_flat} {unit}"
            else:
                formatted_delta = "0"

            stat_deltas.append({
                "stat_id": stat_id,
                "name": stat_name,
                "base": base_val,
                "modified": modified_val,
                "delta_value": delta_val,
                "delta_percent": round(sum_percent, 2),
                "delta_flat": round(sum_flat, 2),
                "formatted_delta": formatted_delta,
                "unit": unit,
                "lower_is_better": lower_is_better,
                "is_buff": is_buff,
                "is_changed": is_changed
            })

        return {
            "killer": {
                "id": killer["id"],
                "name": killer["name"],
                "title": killer["title"],
                "base_terror_radius": base_tr,
                "lullaby_radius": lullaby_radius,
                "movement_speed": killer["movement_speed"],
                "power_name": killer["power_name"]
            },
            "terror_radius": {
                "base": base_tr,
                "modified": modified_tr,
                "delta": tr_delta,
                "breakdown": tr_breakdown
            },
            "lullaby": {
                "base": lullaby_radius,
                "modified": lullaby_radius
            },
            "addons": addon_objects,
            "stat_deltas": stat_deltas
        }


def calculate_killer_calc(
    killer_id: str,
    addon_ids: list[str] | None = None,
    perk_ids: list[str] | None = None,
    perk_options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    service = KillerCalcService()
    return service.calculate(killer_id, addon_ids, perk_ids, perk_options)
