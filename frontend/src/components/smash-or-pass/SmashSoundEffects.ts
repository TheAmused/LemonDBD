// frontend/src/components/smash-or-pass/SmashSoundEffects.ts
import { SmashSoundBase } from './SmashSoundBase';
import { jitter, playBell, playNoise, playTone } from './sound/voices';

/** Smashes in a row closer together than this build a combo. */
const COMBO_WINDOW_S = 8;
const MAX_COMBO = 5;

/** The romantic chord a smash rings: F4 A4 C5 E5 A5 C6, or the same with a G5 for a brighter turn. */
const SMASH_VOICINGS = [
  [349.23, 440.0, 523.25, 659.25, 880.0, 1046.5],
  [349.23, 440.0, 523.25, 659.25, 783.99, 1046.5],
];

class SmashSoundEngine extends SmashSoundBase {
  private smashCombo = 0;
  private lastSmashAt = -Infinity;

  // ================= SOUND EFFECTS: SEXY SMASH & SAD PASS AUDIO SUITE =================

  // SEXY DRAG HOVER: Seductive ascending FM harmonic flutter when dragging towards Smash
  public playSensualHover() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    // Seductive harmonic arpeggio (A4 -> C#5 -> E5 -> G#5)
    [440.0, 554.37, 659.25, 830.61].forEach((freq, idx) => {
      const start = now + idx * 0.035;
      playTone(ctx, out, {
        freq,
        endFreq: freq * 1.05,
        start,
        dur: 0.22,
        attack: 0.02,
        peak: 0.045,
        filter: { type: 'lowpass', from: 2200, to: 800 },
      });
    });
  }

  // SAD DRAG HOVER: Melancholic descending cello sigh when dragging towards Pass
  public playSadHover() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;

    // Sorrowful descending minor glide (D4 -> A3)
    playTone(ctx, out, {
      type: 'triangle',
      freq: 293.66,
      endFreq: 220.0,
      start: ctx.currentTime,
      dur: 0.3,
      attack: 0.03,
      peak: 0.055,
      filter: { type: 'lowpass', from: 750, to: 320 },
    });
  }

  // TACTILE CARD LIFT / GRAB: Silky card touch
  public playCardGrabSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    playTone(ctx, out, {
      freq: 380 * jitter(40),
      endFreq: 190,
      start: now,
      dur: 0.05,
      attack: 0.003,
      peak: 0.03,
      filter: { type: 'lowpass', from: 1200 },
    });
    // The brush of a thumb on the card
    playNoise(ctx, out, {
      start: now,
      dur: 0.04,
      attack: 0.004,
      peak: 0.012,
      filter: { type: 'bandpass', from: 2600, q: 0.8 },
    });
  }

  // SEXY SMASH: Warm 808 sub-drop + lush romantic FM chord + golden shimmer; consecutive smashes climb
  public playSmashSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    this.smashCombo = now - this.lastSmashAt < COMBO_WINDOW_S ? Math.min(this.smashCombo + 1, MAX_COMBO) : 0;
    this.lastSmashAt = now;
    const lift = Math.pow(2, this.smashCombo / 12); // one semitone higher per smash in the combo

    // 1. Sensual deep sub-bass drop (808 style)
    playTone(ctx, out, { freq: 110, endFreq: 36, start: now, dur: 0.4, attack: 0.004, peak: 0.3 });

    // 2. Lush romantic FM chime chord, strummed
    const voicing = SMASH_VOICINGS[Math.floor(Math.random() * SMASH_VOICINGS.length)];
    voicing.forEach((freq, idx) => {
      playBell(ctx, out, {
        freq: freq * lift,
        start: now + idx * 0.03,
        dur: 0.62,
        attack: 0.025,
        peak: 0.14 - idx * 0.018,
        index: 0.8,
        filter: { type: 'lowpass', from: 3200, to: 900 },
      });
    });

    // 3. Delicate sparkle pop accent
    playTone(ctx, out, {
      freq: 1760 * lift,
      endFreq: 3520 * lift,
      start: now + 0.08,
      dur: 0.3,
      attack: 0.04,
      peak: 0.08,
      filter: { type: 'bandpass', from: 3400, q: 4 },
    });

    // 4. A combo earns a high bell that rings on
    if (this.smashCombo >= 2) {
      playBell(ctx, out, {
        freq: 2093 * lift,
        start: now + 0.12,
        dur: 1.1,
        attack: 0.01,
        peak: 0.03 + this.smashCombo * 0.006,
        index: 0.4,
      });
    }

    this.duckMusic(0.55);
  }

  // SAD PASS: Poignant minor cello sigh + teardrop + cold breeze whisper
  public playPassSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;
    this.smashCombo = 0;
    const drift = jitter(25);

    // 1. Sad cello minor chord (D3, F3, A3), sagging flat
    [146.83, 174.61, 220.0].forEach((freq, idx) => {
      playTone(ctx, out, {
        type: 'sawtooth',
        freq: freq * drift,
        endFreq: freq * drift * 0.82,
        start: now,
        dur: 0.6,
        attack: 0.06,
        peak: 0.08 - idx * 0.02,
        filter: { type: 'lowpass', from: 420, to: 160 },
      });
    });

    // 2. Sorrowful teardrop resonance (descending triangle chime)
    playTone(ctx, out, {
      type: 'triangle',
      freq: 587.33 * drift,
      endFreq: 329.63,
      start: now,
      dur: 0.4,
      attack: 0.04,
      peak: 0.07,
      filter: { type: 'lowpass', from: 1100, to: 300 },
    });

    // 3. Gentle melancholic wind sigh
    playNoise(ctx, out, {
      start: now,
      dur: 0.45,
      attack: 0.05,
      peak: 0.06,
      filter: { type: 'bandpass', from: 800, to: 180, q: 2 },
    });

    this.duckMusic(0.7);
  }

  // Tactile card flip: a papery flick over a soft thump
  public playFlipSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    playNoise(ctx, out, {
      start: now,
      dur: 0.1,
      attack: 0.015,
      peak: 0.05,
      filter: { type: 'bandpass', from: 1800 * jitter(150), to: 5200, q: 0.9 },
    });
    playTone(ctx, out, {
      freq: 320 * jitter(60),
      endFreq: 140,
      start: now,
      dur: 0.07,
      attack: 0.003,
      peak: 0.05,
      filter: { type: 'lowpass', from: 800 },
    });
  }

  // Shuffling the deck: a quick riffle of cards ending in a settled tap
  public playShuffleSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    const flicks = 9;
    for (let i = 0; i < flicks; i++) {
      playNoise(ctx, out, {
        start: now + i * 0.034,
        dur: 0.03,
        attack: 0.002,
        peak: 0.03 * (0.65 + Math.random() * 0.5),
        filter: { type: 'bandpass', from: 3000 * jitter(300), q: 1.2 },
      });
    }
    playTone(ctx, out, {
      freq: 180,
      endFreq: 110,
      start: now + flicks * 0.034,
      dur: 0.08,
      attack: 0.003,
      peak: 0.07,
      filter: { type: 'lowpass', from: 600 },
    });
  }

  // Warm anatomical heartbeat (Organic lub-dub double pulse)
  public playHeartbeat(speedMultiplier = 1.0) {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    const thump = (start: number, freq: number, peak: number) =>
      playTone(ctx, out, {
        freq,
        endFreq: freq * 0.45,
        start,
        dur: 0.13,
        attack: 0.004,
        peak,
        filter: { type: 'lowpass', from: 150 },
      });
    thump(now, 72, 0.22);
    thump(now + 0.14 / speedMultiplier, 58, 0.16);
  }

  // Silky hover micro-tick, a little different every time
  public playHoverTick() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;

    playTone(ctx, out, {
      freq: 620 * jitter(80),
      endFreq: 400,
      start: ctx.currentTime,
      dur: 0.03,
      attack: 0.002,
      peak: 0.018,
    });
  }
}

export const SmashSounds = new SmashSoundEngine();
