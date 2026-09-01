# Smash or Pass UI & Audio Overhaul Design Spec

**Date:** 2026-09-01  
**Target File(s):**  
- rontend/src/components/smash-or-pass/SmashOrPassHub.tsx  
- rontend/src/components/smash-or-pass/SmashSoundEffects.ts  

---

## 1. Overview & Objectives

Refine the Smash or Pass hub interface and audio engine:
1. **Drawer for Filter Settings**: Move role (All Roles, Survivors, Killers) and gender (All Genders, Female, Male, Monsters & Eldritch) filters into an animated drawer expanding from the top banner via ramer-motion. Default filters are ll roles and ll genders.
2. **Unified In-Line Header Bar**: Shorten all action buttons (BGM, Archetype, Hall of Fame Leaderboard) to icons only. Align the telemetry stats capsule (50 left | 0 | 0 | 0%) and icon buttons on a single horizontal row.
3. **Unified Dynamic Sound System**: Merge BGM and SFX controls into a single dynamic sound toggle icon that controls master audio.
4. **Pristine Web Audio Synthesized SFX**: Overhaul SFX to remove harsh static / TV noise blips and replace them with warm, punchy, atmospheric, high-fidelity tones.
5. **Header Rebrand & Heart Flanking**: Remove  DBD Smash or Pass and DBD OCCULT DOSSIER text labels, replacing them with the roster selector element flanked by heart icons on both sides.

---

## 2. Component Architecture & UI Flow

### A. Header Bar (SmashOrPassHub.tsx)
- **Left Cluster:**
  - Pulsing Heart icon (Left)
  - Roster Selector Pill (Avatar thumbnail, Roster Name, Count, Dropdown Chevron)
  - Pulsing Heart icon (Right)
- **Right Cluster (Inline Flex):**
  - **Telemetry Capsule**: [ <Layers /> {count} left | <Heart /> {smashes} | <ThumbsDown /> {passes} | {rate}% ]
  - **Filter Drawer Toggle Button**: Icon-only button (SlidersHorizontal) with active filter dot indicator.
  - **Dynamic Audio Toggle**: Icon-only button (Volume2 / VolumeX) with active glow when audio is playing.
  - **Archetype Button**: Icon-only (Sparkles).
  - **Hall of Fame Button**: Icon-only (Trophy).
  - **Shuffle Button**: Icon-only (Shuffle).
  - **Reset Button**: Icon-only (Trash2).
  - **Help Button**: Icon-only (HelpCircle).

### B. Framer Motion Filter Drawer
- Placed immediately underneath the header row inside <AnimatePresence>.
- Expand/Collapse animation:
  - initial={{ height: 0, opacity: 0 }}
  - nimate={{ height: 'auto', opacity: 1 }}
  - exit={{ height: 0, opacity: 0 }}
  - 	ransition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
- Content layout:
  - Role Filter Pills (All Roles, Survivors, Killers).
  - Gender Filter Pills (All Genders, Female, Male, Monsters & Eldritch).
  - Default selection initialized to ll and ll.

---

## 3. Audio Engine Overhaul (SmashSoundEffects.ts)

### A. Unified Sound Management
- Single toggle method: 	oggleMasterSound() which synchronizes mute state across both ambient synth music (BGM) and synthesized sound effects (SFX).
- State persistence in localStorage.

### B. Sound Synthesis Profiles
- **Smash SFX (playSmashSound)**:
  - Deep warm sub-bass punch (85Hz -> 38Hz exponential decay).
  - Sparkling pentatonic harmonic bell chime (warm sine tones with smooth envelope at 523.25Hz, 659.25Hz, 783.99Hz, 1046.50Hz with gentle decay, eliminating harsh buzz).
- **Pass SFX (playPassSound)**:
  - Soft, airy cinematic low-pass sweep (600Hz down to 100Hz biquad lowpass with gentle resonant warmth).
  - Sub-bass swoosh drop (60Hz -> 30Hz) creating a clean, melancholic whisper into the fog.
- **Card Flip SFX (playFlipSound)**:
  - Soft, organic high-frequency click (smooth transient without clipping).
- **Heartbeat SFX (playHeartbeat)**:
  - Resonant lub-dub double heartbeat pulse with smooth sine envelopes.

---

## 4. Verification Plan

1. **Visual & Interaction Verification**:
   - Ensure header renders cleanly in a single line on desktop and wraps responsively on mobile.
   - Verify filter drawer opens and closes smoothly with framer-motion animations.
   - Verify roster selector is flanked by hearts and old titles are removed.
2. **Audio Verification**:
   - Verify unified sound button turns audio on/off dynamically.
   - Verify smash and pass sound effects produce warm, high-fidelity tones without distortion or TV static.
3. **Automated Unit & Live Tests**:
   - Run frontend unit and live tests via 
pm run test:unit.
