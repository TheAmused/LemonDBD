# 🍋 LemonDBD — The Ultimate Dead by Daylight Companion Suite & Analytics Engine

LemonDBD is a modern, containerized, full-stack Dead by Daylight web application built with Python 3.12 (Flask API + SQLite database) and Next.js 16 (App Router + React 19 + Tailwind CSS v4). It provides a comprehensive toolkit for Dead by Daylight players, streamers, SWF teams, and competitive tournament organizers.

---

## 🌟 Key Application Features & User Guide

### 1. ⚡ The Survivor & Killer Gauntlet Challenge Mode (`/[locale]/challenge`)
- **Endurance Marathon & Roster Clearing**: Challenge yourself to clear the entire Survivor or Killer roster.
- **Progressive Perk & Add-on Restriction Tiers**:
  - **Tier 0 (*The Warm Up*)**: 4 Perks allowed.
  - **Tier 1 (*The Thinning*)**: 3 Perks allowed (4th slot locked).
  - **Tier 2 (*The Struggle*)**: 2 Perks allowed (3rd & 4th slots locked).
  - **Tier 3 (*The Hardcore*)**: 1 Teachable Perk allowed (all other slots locked).
  - **Tier 4 (*The Legend*)**: 0 Perks allowed (pure skill trial!).
- **Green-Glow Roster Grid**: Completed characters glow emerald green with checkmark badges.
- **Milestone Checkpoints & Loss Rollback**: Set checkpoint intervals (e.g. every 3 wins). A loss rolls your streak back to the last saved checkpoint milestone.
- **Unowned DLC Character Exclusion**: Disable characters you don’t own via the **`⚙️ Character Pool`** modal.
- **Match Exception Handlers**: Invalidate matches affected by early DCs (**`DC < 5 Gens`**) or loading cancellations (**`Game Cancelled`**) to re-roll for the same character without penalty.

---

### 2. 🎲 Random Perk Generator & No-Repeat Mode
- **No-Repeat Perk Pool**: Ensures no duplicate perks are drawn across consecutive rolls until you click **`Reset Used Perks`**.
- **Wheel of Fortune 2.0 with Mutator Curses**: Features secret curse slices (*Curse of Blindness*, *No Exhaustion Perks*, *Meme Loadout*, *Double XP*), particle bursts, and live curse alerts.
- **SQLite Persistence**: Generator settings and drawn perk pools persist across browser reloads.

---

### 3. 🏆 Tournament & Custom Draft Room (`/[locale]/draft`)
- **Pick & Ban System**: Turn-based draft room for 4v1 custom games and competitive tournaments.
  - **Ban Phase**: Each captain bans up to 3 meta perks.
  - **Pick Phase**: Alternating survivor and killer perk picks.
- **Shareable Spectator Links**: Live spectator links for tournament hosts and stream commentators.

---

### 4. 👥 SWF 4-Player Team Loadout Planner (`/[locale]/swf`)
- **16-Perk Team Build Matrix**: Simultaneously design builds for all 4 team members.
- **Team Perk Redundancy Detector**: Flags duplicate team perks (e.g., having 2 *Prove Thyself* or 2 *Boon: Circle of Healing*) with real-time warning banners.
- **Squad Role Assignments**: Assign roles (*Chaser*, *Gen Rusher*, *Medic*, *Unhooker*).
- **Shareable Team Loadout URLs**: Export team loadouts with single-click URL copying.

---

### 5. 🎯 Killer Add-on Stat Calculator & Terror Radius Visualizer (`/[locale]/killer-calculator`)
- **Add-on Stat Delta Calculator**: Computes exact numerical power stat modifications when pairing 2 add-ons for Huntress, Nurse, Blight, Trapper, Wraith, and Spirit.
- **Interactive 2D Terror Radius Radar**: Real-time canvas radar displaying base Terror Radius, modified Terror Radius distance, and Lullaby rings under perk effects (*Distressing*, *Monitor & Abuse*, *Agitation*, *Furtive Chase*).

---

### 6. 🔥 Community Build Vault & Otzdarva Meta (`/[locale]/builds`)
- **Community Build Browser**: Search, filter, and upvote builds across categories (*Meta*, *Meme*, *Stealth*, *Chase*, *Otzdarva Recommended*).
- **Pre-Seeded Pro Builds**: Curated builds inspired by competitive players and content creators.
- **Shareable Build Cards & QR Codes**: Export 4K PNG build cards with dynamic QR codes.

---

### 7. 🎨 Custom Perk Creator Studio (`/[locale]/custom-perks`)
- **Live Perk Card Designer**: Design custom perk concepts with real-time card preview, rarity badges (*Iridescent*, *Very Rare*, *Uncommon*), custom icon presets, author tags, and markdown description parser.
- **Community Perk Concepts Gallery**: Upvotable gallery of community-submitted perk concepts.

---

### 8. 🗺️ Interactive Realm Maps & Totem Explorer (`/[locale]/maps`)
- **Interactive 2D Map Canvas**: Layout maps for iconic realms (*Coal Tower*, *Azarov's Resting Place*, *Thompson House*, *Léry's*, *RPD*, *Midwich*).
- **Toggleable Markers**: 🛖 Killer Shack (Basement & God Pallet/Window), 🏛️ Main Building, 💀 5 Totem Spawn Locations, 🧱 Jungle Gyms & LT Walls.

---

### 9. 📜 Daily & Weekly Trial Quests
- **Automated Quest Engine**: 3 daily quests + 1 weekly trial quest rewarding XP badges upon completion.
- **Claim Rewards Modal**: Interactive quest drawer accessible from the navigation header.

---

### 10. 📹 OBS Streamer Overlay (`/[locale]/overlay`)
- **Transparent OBS Webdock**: Transparent browser source displaying live target character, active win streak, safe checkpoint, and perk loadout icons for live streams.

---

## 💻 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend API** | Python 3.12, Flask 3.1, Gunicorn 23, Pydantic v2 |
| **Database** | SQLite 3 with WAL mode (`backend/data/lemon_dbd.db`) |
| **Scraper** | `curl_cffi` (Chrome TLS impersonation), BeautifulSoup4 |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide Icons |
| **Localization** | i18n supporting English (`/en`), Spanish (`/es`), and Polish (`/pl`) |
| **DevOps** | Docker, Docker Compose |

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-username/LemonDBD.git
cd LemonDBD

# 2. Run via Docker Compose
docker-compose up --build -d
```

### Local Dev Setup:

```bash
# Backend (Flask)
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python run.py

# Frontend (Next.js)
cd frontend
npm install
npm run dev
```

App Dashboard: `http://localhost:3000`
Backend API: `http://localhost:5000/api/v1/health`

---

## 📡 REST API Summary

- `GET /api/v1/perks` — Perk catalog
- `GET /api/v1/challenges/run` — Active gauntlet run state
- `POST /api/v1/challenges/roll` — Roll loadout
- `POST /api/v1/challenges/result` — Submit match result (Win/Loss)
- `POST /api/v1/challenges/invalidate` — Trigger match exception
- `GET /api/v1/draft/<room_code>` — Draft room state
- `GET /api/v1/quests` — Active daily quests
- `POST /api/v1/synergy/analyze` — Analyze perk synergy
- `POST /api/v1/killer-calc/calculate` — Compute add-on stat deltas & Terror Radius
- `GET /api/v1/builds` — Community build vault
- `GET /api/v1/custom-perks` — Custom perk studio concepts
- `GET /api/v1/maps` — Interactive realm maps

---

## 📜 Roadmap & Masterplan Document
For the complete list of features and implemented milestones, see [`featuresPlan.md`](./featuresPlan.md).
