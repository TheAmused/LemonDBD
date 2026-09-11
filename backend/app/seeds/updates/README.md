# LemonDBD - Database Updates Folder

Drop any `.json` files here to automatically update/upsert records in the LemonDBD database.

### Supported formats:
1. **Partial update for single entity** (e.g. updating 2 perk descriptions):
```json
{
  "perks": [
    {
      "name": "Sprint Burst",
      "description": "New updated description here."
    }
  ]
}
```

2. **Standard LemonDBD export/import format**:
```json
{
  "data": {
    "characters": [ ... ]
  }
}
```

3. **Grouped export format**:
```json
{
  "groups": {
    "content": {
      "perks": [ ... ]
    }
  }
}
```

### When are updates applied?
- **Automatically on server startup**: The seeder scans this folder on boot, computes SHA256 hashes, and only applies files that are new or modified since last run.
- **Manually via CLI**:
  ```bash
  python scripts/import_database_updates.py
  # or target a specific file directly:
  python scripts/import_database_updates.py app/seeds/updates/my_patch.json
  ```
- **In Docker / Production**:
  ```bash
  docker exec dbd_backend python scripts/import_database_updates.py
  ```
All operations use safe **merge upsert** mode: existing users, ownerships, and streak logs are completely preserved.
