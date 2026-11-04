// frontend/src/components/smash-or-pass/SmashSoundEffects.ts
import { SmashSoundBase } from './SmashSoundBase';
import { jitter, playBell, playNoise, playTone } from './sound/voices';

/** A smash this soon after the last one is a quick streak: it gets a light chime, never the full chord. */
const RAPID_GAP_S = 0.9;
/** Faster than this the chime is skipped altogether, so mashing the button never stacks sounds. */
const SKIP_GAP_S = 0.35;
/** A roster pick this soon after the last one stays silent. */
const SELECT_MIN_GAP_S = 0.4;

/** The romantic chord a smash rings: F4 A4 C5 E5 A5 C6, or the same with a G5 for a brighter turn. */
const SMASH_VOICINGS = [
  [349.23, 440.0, 523.25, 659.25, 880.0, 1046.5],
  [349.23, 440.0, 523.25, 659.25, 783.99, 1046.5],
];

class SmashSoundEngine extends SmashSoundBase {
  private lastSmashAt = -Infinity;
  private lastSelectAt = -Infinity;

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

  // SEXY SMASH: Warm sub-drop + lush romantic FM chord + golden shimmer. Every smash sounds the same;
  // quick streaks get a light, short chime and mashing faster than that is skipped.
  public playSmashSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    const gap = now - this.lastSmashAt;
    this.lastSmashAt = now;
    if (gap < SKIP_GAP_S) return;

    if (gap < RAPID_GAP_S) {
      // Light variant: three soft notes of the chord, a short tail, no sub-bass, no sparkle, no ducking
      [523.25, 659.25, 880.0].forEach((freq, idx) => {
        playBell(ctx, out, {
          freq,
          start: now + idx * 0.025,
          dur: 0.28,
          attack: 0.015,
          peak: 0.07 - idx * 0.012,
          index: 0.6,
          filter: { type: 'lowpass', from: 3000, to: 1100 },
        });
      });
      return;
    }

    // 1. Sensual deep sub-bass drop (808 style)
    playTone(ctx, out, { freq: 110, endFreq: 36, start: now, dur: 0.4, attack: 0.004, peak: 0.3 });

    // 2. Lush romantic FM chime chord, strummed
    const voicing = SMASH_VOICINGS[Math.floor(Math.random() * SMASH_VOICINGS.length)];
    voicing.forEach((freq, idx) => {
      playBell(ctx, out, {
        freq,
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
      freq: 1760,
      endFreq: 3520,
      start: now + 0.08,
      dur: 0.3,
      attack: 0.04,
      peak: 0.08,
      filter: { type: 'bandpass', from: 3400, q: 4 },
    });

    this.duckMusic(0.55);
  }

  // ROSTER PICK: one quiet, short bell note. No chord, no music ducking and no link to the smash streak.
  public playSelectSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    if (now - this.lastSelectAt < SELECT_MIN_GAP_S) return;
    this.lastSelectAt = now;

    playBell(ctx, out, {
      freq: 659.25,
      start: now,
      dur: 0.22,
      attack: 0.01,
      peak: 0.05,
      index: 0.4,
      filter: { type: 'lowpass', from: 2400, to: 1000 },
    });
  }

  // SAD PASS: Poignant minor cello sigh + teardrop + cold breeze whisper
  public playPassSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;
    this.lastSmashAt = -Infinity;
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

  // Card turn: a soft, low swish of paper through the air, no thump and no click at the start
  public playFlipSound() {
    const target = this.sfxTarget();
    if (!target) return;
    const { ctx, out } = target;
    const now = ctx.currentTime;

    playNoise(ctx, out, {
      start: now,
      dur: 0.2,
      attack: 0.07,
      peak: 0.028,
      filter: { type: 'bandpass', from: 700 * jitter(120), to: 1900, q: 0.6 },
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
