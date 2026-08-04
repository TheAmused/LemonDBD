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

class ChallengeService:
    def __init__(self, db_service=None, perk_service=None):
        self.db_service = db_service or DatabaseService()
        self.perk_service = perk_service or PerkService()

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

        if row:
            run_data = dict(row)
            run_data["completed_characters"] = json.loads(run_data["completed_characters_json"])
            run_data["checkpoint_characters"] = json.loads(run_data["checkpoint_characters_json"])
            run_data["current_loadout"] = json.loads(run_data["current_loadout_json"])
            conn.close()
            return run_data

        target_character = "Meg Thomas" if role == "survivor" else "The Trapper"
        initial_loadout = {
            "character": target_character,
            "perks": [],
            "map_offering": MAP_OFFERINGS[0]
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
        conn.close()
        return new_row

    def roll_challenge(self, role):
        run = self.get_or_create_run(role)
        all_perks_resp = self.perk_service.get_perks(category=role, limit=200)
        role_perks = all_perks_resp.get("data", [])

        # Get characters for role
        characters_list = self.perk_service.get_characters(category=role)
        all_character_names = [c["name"] for c in characters_list if c.get("name")]
        
        if not all_character_names:
            # Fallback if characters list is empty
            all_character_names = list(set([p.get("character") for p in role_perks if p.get("character") and p.get("character") not in ("General", "All")]))

        completed = run["completed_characters"]
        remaining = [c for c in all_character_names if c not in completed]

        if not remaining:
            remaining = all_character_names if all_character_names else ["Meg Thomas" if role == "survivor" else "The Trapper"]

        target_char = random.choice(remaining)

        # Perk sampling logic: 2 own perks, 1 general, 1 any (or up to 4 unique perks)
        char_perks = [p for p in role_perks if p.get("character") == target_char]
        general_perks = [p for p in role_perks if p.get("character") in ("General", "All")]

        selected_perks = []
        if char_perks:
            selected_perks.extend(random.sample(char_perks, min(2, len(char_perks))))
        if general_perks:
            available_gen = [p for p in general_perks if p not in selected_perks]
            if available_gen:
                selected_perks.extend(random.sample(available_gen, min(1, len(available_gen))))

        remaining_pool = [p for p in role_perks if p not in selected_perks]
        needed = 4 - len(selected_perks)
        if needed > 0 and remaining_pool:
            selected_perks.extend(random.sample(remaining_pool, min(needed, len(remaining_pool))))

        map_offering = random.choice(MAP_OFFERINGS)

        loadout = {
            "character": target_char,
            "perks": selected_perks,
            "map_offering": map_offering
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
        return run

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
