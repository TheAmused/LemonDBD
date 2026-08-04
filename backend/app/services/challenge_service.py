import json
import random
from app.services.db_service import DatabaseService
from app.services.perk_service import PerkService

MAP_OFFERINGS = [
    {"name": "MacMillan's Phormium", "realm": "The MacMillan Estate"},
    {"name": "Shattered Glasses", "realm": "Léry's Memorial Institute"},
    {"name": "Azarov's Key", "realm": "Autohaven Wreckers"},
    {"name": "Mary's Letter", "realm": "Silent Hill / Midwich"},
    {"name": "RPD Badge", "realm": "Raccoon City Police Station"},
    {"name": "Coldwind Corn Husk", "realm": "Coldwind Farm"},
    {"name": "Sacrificial Ward", "realm": "Any Realm (Cancel Offerings)"}
]

GAUNTLET_TIERS = [
    {
        "tier_level": 0,
        "tier_index": 0,
        "name": "The Warm Up",
        "perk_limit": 4,
        "description": "Must include at least 1 character teachable perk"
    },
    {
        "tier_level": 1,
        "tier_index": 1,
        "name": "The Thinning",
        "perk_limit": 3,
        "description": "Must include at least 1 character teachable perk"
    },
    {
        "tier_level": 2,
        "tier_index": 2,
        "name": "The Struggle",
        "perk_limit": 2,
        "description": "Must include at least 1 character teachable perk"
    },
    {
        "tier_level": 3,
        "tier_index": 3,
        "name": "The Hardcore",
        "perk_limit": 1,
        "description": "Must be a character teachable perk"
    },
    {
        "tier_level": 4,
        "tier_index": 4,
        "name": "The Legend",
        "perk_limit": 0,
        "description": "No Perks allowed (No-perk trial)"
    }
]

KILLER_GAUNTLET_TIERS = [
    {
        "tier_level": 0,
        "tier_index": 0,
        "name": "The Warm Up",
        "perk_limit": 4,
        "addon_limit": 2,
        "description": "4 Perks, 2 Add-ons"
    },
    {
        "tier_level": 1,
        "tier_index": 1,
        "name": "The Restriction",
        "perk_limit": 3,
        "addon_limit": 1,
        "description": "3 Perks, 1 Add-on"
    },
    {
        "tier_level": 2,
        "tier_index": 2,
        "name": "The Deprivation",
        "perk_limit": 2,
        "addon_limit": 0,
        "description": "2 Perks, 0 Add-ons"
    },
    {
        "tier_level": 3,
        "tier_index": 3,
        "name": "The Barebones",
        "perk_limit": 1,
        "addon_limit": 0,
        "description": "1 Perk, 0 Add-ons"
    },
    {
        "tier_level": 4,
        "tier_index": 4,
        "name": "The Entity's Chosen",
        "perk_limit": 0,
        "addon_limit": 0,
        "description": "0 Perks, 0 Add-ons"
    }
]

class ChallengeService:
    def __init__(self, db_service=None, perk_service=None):
        self.db_service = db_service or DatabaseService()
        self.perk_service = perk_service or PerkService()

    def get_tier_info(self, streak, role="survivor", checkpoint_interval=3):
        if isinstance(role, int):
            checkpoint_interval = role
            role = "survivor"
        if not checkpoint_interval or checkpoint_interval <= 0:
            checkpoint_interval = 3

        tier_index = min(4, max(0, streak // checkpoint_interval))

        if role and str(role).lower() == "killer":
            return dict(KILLER_GAUNTLET_TIERS[tier_index])
        return dict(GAUNTLET_TIERS[tier_index])

    def get_pool_settings(self, role):
        role_clean = role.lower()
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT character_name FROM character_pool_settings WHERE role = ? AND is_enabled = 0;", (role_clean,))
        rows = cursor.fetchall()
        disabled_names = [row["character_name"] for row in rows]
        conn.close()
        return {"role": role_clean, "disabled_names": disabled_names}

    def update_pool_settings(self, role, disabled_names):
        role_clean = role.lower()
        if isinstance(disabled_names, dict):
            if "disabled_names" in disabled_names:
                disabled_list = disabled_names["disabled_names"]
            else:
                disabled_list = [k for k, v in disabled_names.items() if not v]
        else:
            disabled_list = list(disabled_names)

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM character_pool_settings WHERE role = ?;", (role_clean,))
        for name in disabled_list:
            cursor.execute(
                "INSERT INTO character_pool_settings (role, character_name, is_enabled) VALUES (?, ?, 0);",
                (role_clean, name)
            )
        conn.commit()
        conn.close()
        return self.get_pool_settings(role_clean)

    def get_user_settings(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_settings WHERE id = 1;")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else {"id": 1, "active_role": "survivor", "checkpoint_interval": 3}

    def update_user_settings(self, active_role=None, checkpoint_interval=None):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        if active_role:
            cursor.execute("UPDATE user_settings SET active_role = ? WHERE id = 1;", (active_role,))
        if checkpoint_interval is not None:
            cursor.execute("UPDATE user_settings SET checkpoint_interval = ? WHERE id = 1;", (checkpoint_interval,))
        conn.commit()
        conn.close()
        return self.get_user_settings()

    def get_or_create_run(self, role):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM challenge_runs WHERE role = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1;",
            (role,)
        )
        row = cursor.fetchone()

        settings = self.get_user_settings()
        interval = settings.get("checkpoint_interval", 3)

        if row:
            run_data = dict(row)
            run_data["completed_characters"] = json.loads(run_data["completed_characters_json"])
            run_data["checkpoint_characters"] = json.loads(run_data["checkpoint_characters_json"])
            run_data["current_loadout"] = json.loads(run_data["current_loadout_json"])
            run_data["tier_info"] = self.get_tier_info(run_data["current_streak"], role=run_data.get("role", role), checkpoint_interval=interval)
            conn.close()
            return run_data

        target_character = "Meg Thomas" if role == "survivor" else "The Trapper"
        tier_info = self.get_tier_info(0, role=role, checkpoint_interval=interval)
        initial_loadout = {
            "character": target_character,
            "perks": [],
            "map_offering": MAP_OFFERINGS[0],
            "tier_info": tier_info
        }

        cursor.execute(
            """
            INSERT INTO challenge_runs (role, status, current_character_id, current_loadout_json)
            VALUES (?, 'in_progress', ?, ?);
            """,
            (role, target_character, json.dumps(initial_loadout))
        )

        conn.commit()
        run_id = cursor.lastrowid
        cursor.execute("SELECT * FROM challenge_runs WHERE id = ?;", (run_id,))
        new_row = dict(cursor.fetchone())
        new_row["completed_characters"] = []
        new_row["checkpoint_characters"] = []
        new_row["current_loadout"] = initial_loadout
        new_row["tier_info"] = tier_info
        conn.close()
        return new_row

    def roll_challenge(self, role, target_character=None):
        run = self.get_or_create_run(role)
        settings = self.get_user_settings()
        interval = settings.get("checkpoint_interval", 3)
        tier_info = self.get_tier_info(run["current_streak"], role=role, checkpoint_interval=interval)
        perk_limit = tier_info["perk_limit"]

        all_perks_resp = self.perk_service.get_perks(category=role, limit=200)
        role_perks = all_perks_resp.get("data", [])

        # Get characters for role
        characters_list = self.perk_service.get_characters(category=role)
        all_character_names = [c["name"] for c in characters_list if c.get("name")]
        
        if not all_character_names:
            all_character_names = list(set([p.get("character") for p in role_perks if p.get("character") and p.get("character") not in ("General", "All")]))

        pool_settings = self.get_pool_settings(role)
        disabled_names = set(pool_settings.get("disabled_names", []))

        completed = run["completed_characters"]
        remaining = [c for c in all_character_names if c not in completed and c not in disabled_names]

        if not remaining:
            remaining = [c for c in all_character_names if c not in disabled_names]
        if not remaining:
            remaining = all_character_names if all_character_names else ["Meg Thomas" if role == "survivor" else "The Trapper"]

        if target_character:
            target_char = target_character
        else:
            target_char = random.choice(remaining)

        selected_perks = []
        if perk_limit > 0:
            char_perks = [p for p in role_perks if p.get("character") == target_char]
            general_perks = [p for p in role_perks if p.get("character") in ("General", "All")]

            if char_perks:
                max_own = min(2, len(char_perks), perk_limit)
                selected_perks.extend(random.sample(char_perks, max_own))
            
            needed = perk_limit - len(selected_perks)
            if needed > 0 and general_perks:
                available_gen = [p for p in general_perks if p not in selected_perks]
                if available_gen:
                    max_gen = min(1, len(available_gen), needed)
                    selected_perks.extend(random.sample(available_gen, max_gen))

            needed = perk_limit - len(selected_perks)
            if needed > 0:
                remaining_pool = [p for p in role_perks if p not in selected_perks]
                if remaining_pool:
                    selected_perks.extend(random.sample(remaining_pool, min(needed, len(remaining_pool))))

        map_offering = random.choice(MAP_OFFERINGS)

        loadout = {
            "character": target_char,
            "perks": selected_perks,
            "map_offering": map_offering,
            "tier_info": tier_info
        }

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE challenge_runs
            SET current_character_id = ?, current_loadout_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
            """,
            (target_char, json.dumps(loadout), run["id"])
        )
        conn.commit()
        conn.close()

        run["current_character_id"] = target_char
        run["current_loadout"] = loadout
        run["tier_info"] = tier_info
        return run

    def invalidate_match(self, run_id, reason):
        valid_reasons = ('dc_before_5_gens', 'game_cancelled')
        if reason not in valid_reasons:
            raise ValueError(f"Invalid reason: {reason}. Must be one of {valid_reasons}")

        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM challenge_runs WHERE id = ?;", (run_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Run not found")

        run = dict(row)
        char_id = run["current_character_id"]

        cursor.execute(
            """
            INSERT INTO match_exceptions (run_id, character_id, reason)
            VALUES (?, ?, ?);
            """,
            (run_id, char_id, reason)
        )
        conn.commit()
        conn.close()

        return self.roll_challenge(run["role"], target_character=char_id)

    def submit_result(self, run_id, result):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM challenge_runs WHERE id = ?;", (run_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError("Run not found")

        run = dict(row)
        settings = self.get_user_settings()
        interval = settings.get("checkpoint_interval", 3)

        current_streak = run["current_streak"]
        best_streak = run["best_streak"]
        last_checkpoint = run["last_checkpoint_streak"]
        completed = json.loads(run["completed_characters_json"])
        checkpoint_chars = json.loads(run["checkpoint_characters_json"])
        char_id = run["current_character_id"]

        loadout = json.loads(run["current_loadout_json"])
        perks_json = json.dumps(loadout.get("perks", []))
        map_offering_str = loadout.get("map_offering", {}).get("name", "Default Map")

        if result == "win":
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            if char_id not in completed:
                completed.append(char_id)

            if interval > 0 and streak_after % interval == 0:
                last_checkpoint = streak_after
                checkpoint_chars = list(completed)
        else:
            streak_after = last_checkpoint if interval > 0 else 0
            completed = list(checkpoint_chars)
            best_after = best_streak

        cursor.execute(
            """
            UPDATE challenge_runs
            SET current_streak = ?, best_streak = ?, last_checkpoint_streak = ?,
                completed_characters_json = ?, checkpoint_characters_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
            """,
            (streak_after, best_after, last_checkpoint, json.dumps(completed), json.dumps(checkpoint_chars), run_id)
        )

        cursor.execute(
            """
            INSERT INTO match_logs (run_id, role, character_id, result, perks_json, map_offering, streak_before, streak_after)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (run_id, run["role"], char_id, result, perks_json, map_offering_str, current_streak, streak_after)
        )

        conn.commit()

        cursor.execute("SELECT * FROM challenge_runs WHERE id = ?;", (run_id,))
        updated_run = dict(cursor.fetchone())
        updated_run["completed_characters"] = completed
        updated_run["checkpoint_characters"] = checkpoint_chars
        updated_run["current_loadout"] = json.loads(updated_run["current_loadout_json"])
        updated_run["tier_info"] = self.get_tier_info(updated_run["current_streak"], role=updated_run.get("role", "survivor"), checkpoint_interval=interval)
        conn.close()

        return updated_run

    def get_stats(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN result='win' THEN 1 ELSE 0 END) as wins FROM match_logs;")
        row = cursor.fetchone()
        total = row["total"] or 0
        wins = row["wins"] or 0
        win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

        cursor.execute("SELECT * FROM match_logs ORDER BY id DESC LIMIT 10;")
        logs = [dict(r) for r in cursor.fetchall()]
        conn.close()

        return {
            "total_matches": total,
            "wins": wins,
            "losses": total - wins,
            "win_rate": win_rate,
            "recent_logs": logs
        }
