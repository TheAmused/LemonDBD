# Ban-evasion e-mail list: switch-on runbook

Everything here is copy-and-run. Commands are given for **Windows PowerShell** and **bash**; run them from
the repository root (the folder with `docker-compose.dev.yml`). The compose file in use is chosen by
`COMPOSE_FILE` in `.env` (currently `docker-compose.dev.yml`, which reads `.env.dev`).

What the list is, in short: a permanent ban stores `HMAC-SHA256(pepper, canonical e-mail)` (never the
address). The list is read **only when an account is created** (password sign-up and a *new* Google
account). Signing in, e-mail change and every other flow never look at it. Design and decisions:
Project docs `ban-evasion-email-hash-list-plan-2026-10-15` and `warnings-bans-phase3-implementation-2026-10-15`.

## 0. State of this checkout

| Item | State |
|---|---|
| Migration `0018_banned_email_hashes` | in the repo; applied by the backend entrypoint on start |
| `BAN_LIST_ENABLED=true`, `BAN_LIST_PEPPERS=v1:<64 hex>` | already written to `.env.dev` and `.env.prod` (both git-ignored; **different** pepper in each) |
| `.env.example` | stays `BAN_LIST_ENABLED=false` and an empty pepper, on purpose |
| `docker-compose.base.yml` | passes both variables through to the backend |
| Legal texts (Terms, Rules, Privacy; en/pl/de/es/ja) | already in the change, with `{banListWindow}` / `{warningWindow}` filled from `/api/v1/privacy-info` |
| Export / import | target `banned_email_hashes` (group *Users & Accounts*): hashes, pepper version, reason code and dates; **never the pepper** |

> `.env.prod` is still the template-style file (`your-domain.example`, `change-this-…` passwords). Its pepper
> is real, but treat that file as "to be finished before a real deployment".

## 1. Back up the pepper (do this before anything else)

The pepper is the only way to match an address against the stored hashes. **If it is lost, every entry
becomes useless** (nothing can be recomputed, and the table cannot be turned back into addresses). Keep a
copy outside the repository and outside the database host, next to your other backed-up secrets
(`SECRET_KEY`, `JWT_SECRET_KEY`, `TWO_FACTOR_ENCRYPTION_KEY`): a password manager entry is enough.

Show the value to copy, **in a private terminal only** (never paste it into chat, a ticket or a log):

```powershell
# PowerShell
(Select-String -Path .env.dev -Pattern '^BAN_LIST_PEPPERS=').Line
```

```bash
# bash
grep '^BAN_LIST_PEPPERS=' .env.dev
```

Store the whole `BAN_LIST_PEPPERS=v1:…` line. Repeat for `.env.prod` under a separate name.

Prove the backup is correct without revealing the secret. The fingerprint (first 8 characters of a SHA-256)
printed from the running app must equal the one computed from your stored copy:

```powershell
docker compose exec backend python -c "import os,hashlib;[print(p.split(':')[0], hashlib.sha256(bytes.fromhex(p.split(':')[1])).hexdigest()[:8]) for p in os.environ['BAN_LIST_PEPPERS'].split(',')]"
```

Write the fingerprint down next to the backup (it is safe to store in plain text).

## 2. Generate a pepper (only if you need a new one)

A pepper for `.env.dev` and one for `.env.prod` have already been generated. To make another (a new
environment, or a replacement before first use):

```powershell
python -c "import secrets; print('v1:' + secrets.token_hex(32))"
```

Rules (the app refuses weak values and names the problem without echoing the value): hex, at least
32 bytes, not a repeated byte, versions are positive integers and unique, **newest first**, comma separated.
**Use a different pepper per environment**, so a dev database dump says nothing about production.

Set it in the env file (one line each):

```
BAN_LIST_ENABLED=true
BAN_LIST_PEPPERS=v1:<64 hex characters>
```

## 3. Switch on

```powershell
docker compose up -d --build backend
docker compose logs backend --tail 50
```

Look for: no `BAN_LIST_PEPPERS` warning, and the migration to revision `0018` (or "already at head").
Check the table exists and is empty:

```powershell
docker compose exec db psql -U postgres -d dbd_db -c "SELECT count(*) FROM banned_email_hashes;"
```

From this moment every *new* permanent ban adds an entry. Existing bans have none yet: next step.

## 4. Backfill bans made while the list was off

Do this **after the Privacy Policy describing the list is live** (it is, in this change). Look first:

```powershell
docker compose exec backend python scripts/backfill_ban_list.py --dry-run
```

Expected output: `N running ban(s); M without an entry; would add M; K skipped (no usable e-mail).`
`--dry-run` writes nothing. Then apply:

```powershell
docker compose exec backend python scripts/backfill_ban_list.py
```

Running it again changes nothing (`0 without an entry`). Entries created by the backfill get the **full
retention from now** (setting `ban_list_retention_days`, default 1095 days / 3 years; Admin → Settings →
Moderation). The script refuses to run (exit code 1, no changes) when the list is off or the pepper is invalid.

## 5. Verify

```powershell
# entries per pepper version, and when the first one expires
docker compose exec db psql -U postgres -d dbd_db -c "SELECT key_version, count(*) AS entries, min(expires_at) AS first_expiry FROM banned_email_hashes GROUP BY key_version ORDER BY key_version DESC;"
```

End-to-end check (dev only), with a throw-away account:

1. Register `ban.test.user@gmail.com`, then ban it permanently from the admin moderation drawer.
2. Try to register again as `b.a.n.test.user+x@googlemail.com` (same canonical address). Expected: HTTP 400
   with the neutral text "This e-mail address cannot be used to register. Contact … if you think this is a mistake."
3. Lift the ban (or restore the account): the entry disappears and registration works again.
4. Delete the banned account instead: the entry **stays** until `expires_at` (that is the point).

Automated coverage: `backend/tests/unit/test_ban_list.py`, `test_ban_list_export.py`,
`test_banned_email_hashes_migration.py`, `test_escalation.py`.

## 6. Rotating the pepper

Add a new version **in front** and keep the old one; lookups try every configured version, new entries use
the newest:

```
BAN_LIST_PEPPERS=v2:<new 64 hex>,v1:<old 64 hex>
```

```powershell
docker compose up -d backend
docker compose exec backend python scripts/backfill_ban_list.py --dry-run
```

Old entries keep working through `v1` until they expire (max. the retention window), after which `v1` can be
dropped. **Do not drop a version while rows with that `key_version` exist**; they would silently stop
matching. Check first:

```powershell
docker compose exec db psql -U postgres -d dbd_db -c "SELECT count(*) FROM banned_email_hashes WHERE key_version = 1 AND expires_at > now();"
```

Rotate immediately if the pepper may have leaked (then also consider re-running the backfill so running bans
get a `v2` entry; lifting a ban removes only that ban's rows).

## 7. Switching off / emergency

* `BAN_LIST_ENABLED=false` + restart: nothing is hashed, stored or checked; registration is never blocked.
  Existing rows stay in the table and are still purged on schedule; lifting a ban still removes its row.
* To delete **all** entries: `DELETE FROM banned_email_hashes;` (or an import in *replace* mode, see below).

## 8. Export and import

* Export: admin → Database → Export → *Users & Accounts* → **Ban-Evasion List** (also included in "export all").
  The file holds `email_hmac`, `key_version`, `reason_code`, `created_at`, `expires_at`. It does **not**
  hold the pepper or any address. It is still personal data (pseudonymised): handle it like the user export.
* Import, *merge*: adds missing hashes, extends the expiry of a hash that is already listed, skips expired or
  malformed rows. Imported rows have no ban behind them (`sanction_id` NULL), so **only expiry removes
  them**; unbanning the user later will not delete them.
* Import, *replace*: first deletes the whole list, then loads the file.
* The result summary reports `created`, `updated`, `skipped`, and `unverifiable` = rows made with a pepper
  version that is **not configured on the target**. They are kept but cannot match anyone until that pepper is
  added. Moving a database to another environment therefore means moving the pepper too (securely, as a
  secret), or accepting that the old entries are dead weight until they expire.
* The "Purge" tab ignores this target on purpose.

## 9. Quick reference

| Task | Command |
|---|---|
| Fingerprint of configured peppers | `docker compose exec backend python -c "import os,hashlib;[print(p.split(':')[0], hashlib.sha256(bytes.fromhex(p.split(':')[1])).hexdigest()[:8]) for p in os.environ['BAN_LIST_PEPPERS'].split(',')]"` |
| Dry run | `docker compose exec backend python scripts/backfill_ban_list.py --dry-run` |
| Backfill | `docker compose exec backend python scripts/backfill_ban_list.py` |
| Entry count | `docker compose exec db psql -U postgres -d dbd_db -c "SELECT count(*) FROM banned_email_hashes;"` |
| Backend tests for the list | `cd backend; $env:TESTING='True'; python -m pytest tests/unit/test_ban_list.py tests/unit/test_ban_list_export.py -q` |
