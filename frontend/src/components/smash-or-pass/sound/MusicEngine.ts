// frontend/src/components/smash-or-pass/sound/MusicEngine.ts
//
// The background music: a slow, dark, sensual loop in D minor. A warm pad holds each chord, a sub
// bass roots it, a sparse plucked arpeggio and a soft heartbeat move over it, and a bell glimmers
// now and then. Notes are scheduled a fraction of a second ahead on the audio clock, so the groove
// stays steady however busy the page is, and nothing outlives the loop that made it.
import { jitter, playBell, playNoise, playTone } from './voices';

const BPM = 72;
const STEP = 60 / BPM / 4; // a sixteenth note
const BAR_STEPS = 16;
const CHORD_STEPS = BAR_STEPS * 2;
const LOOKAHEAD_S = 0.35;
const TICK_MS = 90;
const FADE_IN_S = 2.2;
const FADE_OUT_S = 0.5;

interface Chord {
  bass: number;
  notes: number[];
}

// Dm9 -> Bbmaj7#11 -> Gm9 -> A7alt
const CHORDS: Chord[] = [
  { bass: 73.42, notes: [146.83, 220.0, 261.63, 329.63, 440.0] },
  { bass: 58.27, notes: [116.54, 233.08, 293.66, 369.99, 466.16] },
  { bass: 49.0, notes: [98.0, 196.0, 261.63, 293.66, 392.0] },
  { bass: 55.0, notes: [110.0, 220.0, 277.18, 329.63, 415.3] },
];

/** Which chord note the arpeggio plays on each eighth of a bar, or -1 for a rest. */
const ARP_PATTERN = [1, -1, 2, 3, -1, 4, -1, 3];

export class MusicEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  /** Everything this loop plays goes through here, so stopping it can silence it all at once. */
  private readonly out: GainNode;

  constructor(private readonly ctx: BaseAudioContext, destination: AudioNode) {
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0.001, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN_S);
    this.out.connect(destination);
  }

  start(): void {
    this.nextTime = this.ctx.currentTime + 0.05;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Fades out and lets go of everything; the engine cannot be started again. */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(Math.max(this.out.gain.value, 0.001), now);
    this.out.gain.linearRampToValueAtTime(0.0001, now + FADE_OUT_S);
    setTimeout(() => this.out.disconnect(), (FADE_OUT_S + 0.1) * 1000);
  }

  private schedule(): void {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step++;
    }
  }

  /** Plays what falls on one sixteenth note, `time` being when it sounds. */
  scheduleStep(step: number, time: number): void {
    const inChord = step % CHORD_STEPS;
    const chordIndex = Math.floor(step / CHORD_STEPS);
    const chord = CHORDS[chordIndex % CHORDS.length];

    if (inChord === 0) this.playChord(chord, time, chordIndex);

    const inBar = step % BAR_STEPS;
    if (inBar === 0 || inBar === 8) this.playHeartbeat(time);
    if (inBar % 4 === 2) this.playTick(time);
    if (inBar % 2 === 0) {
      const note = ARP_PATTERN[inBar / 2];
      if (note >= 0) this.playPluck(chord.notes[note] * 2, time);
    }
  }

  private playChord(chord: Chord, time: number, chordIndex: number): void {
    const dur = CHORD_STEPS * STEP + 0.4;
    const filter = { type: 'lowpass' as const, from: 450, to: 850, q: 2.5 };

    // The pad: each note a pair of slightly detuned saws, swelling in and out through a warm filter.
    chord.notes.forEach((freq, idx) => {
      for (const detuneCents of [-7, 7]) {
        playTone(this.ctx, this.out, {
          type: 'sawtooth',
          freq,
          detuneCents,
          start: time,
          dur,
          attack: 1.8,
          release: 2.2,
          peak: idx === 0 ? 0.04 : 0.025,
          filter,
        });
      }
    });

    playTone(this.ctx, this.out, { freq: chord.bass, start: time, dur, attack: 0.6, release: 2, peak: 0.16 });

    // Every other chord, a bell hangs over it in the reverb.
    if (chordIndex % 2 === 1) {
      playBell(this.ctx, this.out, {
        freq: chord.notes[4] * 2,
        start: time + 0.3,
        dur: 3.2,
        attack: 0.02,
        peak: 0.035,
        index: 0.5,
      });
    }
  }

  private playPluck(freq: number, time: number): void {
    playTone(this.ctx, this.out, {
      type: 'triangle',
      freq,
      start: time,
      dur: 0.9,
      attack: 0.006,
      peak: 0.05 * (0.8 + Math.random() * 0.4),
      filter: { type: 'lowpass', from: 2400, to: 700, q: 1 },
    });
  }

  private playHeartbeat(time: number): void {
    // lub-dub
    for (const [offset, from, to] of [[0, 65, 32], [0.18, 58, 30]] as const) {
      playTone(this.ctx, this.out, {
        freq: from * jitter(10),
        endFreq: to,
        start: time + offset,
        dur: 0.35,
        attack: 0.004,
        peak: offset === 0 ? 0.15 : 0.1,
      });
    }
  }

  private playTick(time: number): void {
    playNoise(this.ctx, this.out, {
      start: time,
      dur: 0.04,
      attack: 0.002,
      peak: 0.012 * (0.7 + Math.random() * 0.6),
      filter: { type: 'highpass', from: 7000 },
    });
  }
}
