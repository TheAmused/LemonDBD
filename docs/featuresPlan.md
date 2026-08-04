---
created: true
created_at: "2026-08-04T13:59:25+02:00"
updated_at: "2026-08-04T18:27:00+02:00"
version: "2.0.0"
status: "IMPLEMENTED"
---

# 🚀 LemonDBD Ultimate Feature Roadmap & Expansion Masterplan (`featuresPlan.md`)

Welcome to the **LemonDBD Ultimate Expansion Masterplan**. All primary feature modules outlined below have been fully built, tested, and integrated into LemonDBD.

---

## 📌 Feature Flag Metadata
- **`created`**: `true`
- **`created_at`**: `2026-08-04T13:59:25+02:00`
- **`updated_at`**: `2026-08-04T18:27:00+02:00`
- **`version`**: `2.0.0`
- **`status`**: `ALL_FEATURES_IMPLEMENTED`

---

## 1. ⚔️ Advanced Challenge & Gauntlet Suite

- [x] **DONE - 1.1 The Survivor & Killer Gauntlet Mode**: Progressive perk and add-on restriction tiers (Warm Up 4 Perks -> Thinning 3 -> Struggle 2 -> Hardcore 1 -> Legend 0 Perks/Addons).
- [x] **DONE - 1.2 Tournament & Custom Draft Mode (DBD Fantasy League)**: Interactive room creation (`/draft`), ban phase (3 perks per side), survivor/killer pick phase, shareable URL, spectator view.
- [x] **DONE - 1.3 Chaos Wheel 2.0 (Wheel of Fortune with Curses & Mutators)**: Wheel of fortune with secret curse slices (*Curse of Blindness*, *No Exhaustion Perks*, *Meme Loadout*, *Double XP*), particle bursts, and curse banners.
- [x] **DONE - 1.4 Automated Daily & Weekly Quests**: Daily/weekly quest engine (`/api/v1/quests`), animated progress bars, XP reward badges (+500 XP, +2500 XP), and claimable rewards modal.

---

## 2. 🧠 Smart Synergy & Loadout Builder Engine

- [x] **DONE - 2.1 AI Perk Synergy Matrix & Rating Calculator**: Compatibility algorithm (0-100% score) in `SynergyService`, detection of positive synergies (*Sprint Burst + Vigil*, *Sloppy + Nurse's Calling*) and anti-synergy warnings (*Exhaustion overlaps*, *No Mither + Self-Care*).
- [x] **DONE - 2.2 Community Build Vault & Otzdarva Meta Integration**: Filterable community build browser (`/builds`), pre-seeded Otzdarva meta loadouts, upvoting system, build text copy, and shareable QR code cards.
- [x] **DONE - 2.3 SWF 4-Player Team Loadout Planner**: Interactive 16-perk team builder (`/swf`), team perk redundancy detector (flags duplicate team perks), squad role assignments (*Chaser*, *Gen Rusher*, *Medic*, *Unhooker*), and shareable URL export.

---

## 3. 📊 Analytics, Match Tracker & Killer Calculator

- [x] **DONE - 3.1 Killer Add-on Stat Delta Calculator**: Computes exact numerical power stat modifications when pairing 2 add-ons for Huntress, Nurse, Blight, Trapper, Wraith, and Spirit (`/killer-calculator`).
- [x] **DONE - 3.2 Terror Radius & Lullaby 2D Visualizer**: Interactive 2D HTML5 Canvas radar displaying base vs modified Terror Radius distances with perk toggles (*Distressing*, *Monitor & Abuse*, *Agitation*, *Furtive Chase*).
- [x] **DONE - 3.3 Match Logger & Exceptions System**: SQLite match logging, streak tracking, and match exception triggers (*DC < 5 Gens*, *Game Cancelled*).

---

## 4. 🎨 Custom UI Studio & Custom Perk Designer

- [x] **DONE - 4.1 Custom Perk Creator Studio**: Real-time perk card preview designer (`/custom-perks`), rarity badges (*Iridescent*, *Very Rare*, *Uncommon*), custom icon presets, author tags, and markdown description parser.
- [x] **DONE - 4.2 Community Perk Concepts Gallery**: Upvotable gallery of custom perk concepts created by the community.

---

## 5. 🗺️ Interactive Maps & Totem Explorer

- [x] **DONE - 5.1 Interactive Realm Map Explorer**: 2D Map Canvas (`/maps`) for iconic realms (Coal Tower, Azarov's Resting Place, Thompson House, Léry's, RPD, Midwich).
- [x] **DONE - 5.2 Totem & Tile Markers**: Toggleable markers for Killer Shack, Main Building, 5 Totem spawn locations, Jungle Gyms, and LT Walls.

---

## 6. 📹 Streamer Suite & Twitch / OBS Integration

- [x] **DONE - 6.1 OBS Transparent Webdock Overlay**: Transparent browser overlay page (`/overlay`) displaying real-time target character portrait, win streak, best streak, and perk loadout for Twitch/YouTube live streams.

---

## 7. 🎯 Complete Feature Matrix Summary

| Feature Module | Route | Status |
| :--- | :--- | :--- |
| **Survivor & Killer Gauntlet** | `/[locale]/challenge` | `[x] DONE` |
| **Tournament Draft Room** | `/[locale]/draft` | `[x] DONE` |
| **SWF Team Loadout Planner** | `/[locale]/swf` | `[x] DONE` |
| **Killer Stat & TR Calculator** | `/[locale]/killer-calculator` | `[x] DONE` |
| **Community Build Vault** | `/[locale]/builds` | `[x] DONE` |
| **Custom Perk Studio** | `/[locale]/custom-perks` | `[x] DONE` |
| **Interactive Map Explorer** | `/[locale]/maps` | `[x] DONE` |
| **Daily Quests System** | Quests Modal Trigger | `[x] DONE` |
| **OBS Streamer Overlay** | `/[locale]/overlay` | `[x] DONE` |
