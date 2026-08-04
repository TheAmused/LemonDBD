from app.services.db_service import DatabaseService

class GeneratorService:
    def __init__(self, db_service=None):
        self.db_service = db_service or DatabaseService()

    def get_config(self):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM generator_settings WHERE id = 1;")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else {
            "role": "Survivor",
            "gen_mode": "instant",
            "no_repeat_perks": 1,
            "total_pages": 12,
            "perks_per_page": 15,
            "last_page_perks": 8,
            "spin_duration_sec": 3.0
        }

    def update_config(self, data):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        fields = []
        values = []
        for key in ["role", "gen_mode", "no_repeat_perks", "total_pages", "perks_per_page", "last_page_perks", "spin_duration_sec"]:
            if key in data:
                fields.append(f"{key} = ?")
                values.append(data[key])
        
        if fields:
            values.append(1)
            query = f"UPDATE generator_settings SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?;"
            cursor.execute(query, tuple(values))
            conn.commit()
        conn.close()
        return self.get_config()

    def get_drawn_perks(self, role):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT perk_name FROM generator_drawn_perks WHERE role = ?;", (role,))
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]

    def add_drawn_perks(self, role, perk_names):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        for name in perk_names:
            cursor.execute("""
            INSERT OR IGNORE INTO generator_drawn_perks (role, perk_name)
            VALUES (?, ?);
            """, (role, name))
        conn.commit()
        conn.close()
        return self.get_drawn_perks(role)

    def reset_drawn_perks(self, role=None):
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        if role:
            cursor.execute("DELETE FROM generator_drawn_perks WHERE role = ?;", (role,))
        else:
            cursor.execute("DELETE FROM generator_drawn_perks;")
        conn.commit()
        conn.close()
        return []
