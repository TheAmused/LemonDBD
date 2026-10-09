// frontend/src/components/smash-or-pass/sound/voices.ts
//
// The few building blocks every sound is made from: a pitched tone, an FM bell, and a burst of
// filtered noise, each with an attack-and-decay envelope.

const SILENCE = 0.0001;

interface Filter {
  type: BiquadFilterType;
  from: number;
  /** Sweeps to this over the sound's length. */
  to?: number;
  q?: number;
}

interface Envelope {
  start: number;
  dur: number;
  peak: number;
  /** Seconds to reach the peak. */
  attack?: number;
  /**
   * Holds the note near its peak and fades it out over this many seconds at the end (a pad).
   * Without it the note dies away from the peak straight away (a pluck or a chime).
   */
  release?: number;
}

export interface ToneSpec extends Envelope {
  type?: OscillatorType;
  freq: number;
  /** Glides to this over the sound's length. */
  endFreq?: number;
  detuneCents?: number;
  filter?: Filter;
}

export interface BellSpec extends Envelope {
  freq: number;
  /** Modulator frequency as a multiple of the carrier's. */
  ratio?: number;
  /** How hard the modulator bends the carrier at the start; it dies away with the note. */
  index?: number;
  filter?: Filter;
}

export interface NoiseSpec extends Envelope {
  filter: Filter;
}

function shapeFilter(ctx: BaseAudioContext, spec: Filter, start: number, dur: number): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = spec.type;
  filter.frequency.setValueAtTime(spec.from, start);
  if (spec.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), start + dur);
  if (spec.q !== undefined) filter.Q.setValueAtTime(spec.q, start);
  return filter;
}

function shapeGain(ctx: BaseAudioContext, { start, dur, peak, attack = 0.01, release }: Envelope): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENCE, start);
  gain.gain.linearRampToValueAtTime(peak, start + Math.min(attack, dur * 0.5));
  if (release !== undefined) {
    gain.gain.linearRampToValueAtTime(peak * 0.8, start + dur - release);
    gain.gain.linearRampToValueAtTime(SILENCE, start + dur);
  } else {
    gain.gain.exponentialRampToValueAtTime(SILENCE, start + dur);
  }
  return gain;
}

/** `source -> [filter] -> envelope -> out`. */
function chain(ctx: BaseAudioContext, source: AudioNode, out: AudioNode, env: Envelope, filter?: Filter): void {
  const gain = shapeGain(ctx, env);
  if (filter) {
    const f = shapeFilter(ctx, filter, env.start, env.dur);
    source.connect(f);
    f.connect(gain);
  } else {
    source.connect(gain);
  }
  gain.connect(out);
}

export function playTone(ctx: BaseAudioContext, out: AudioNode, spec: ToneSpec): void {
  const { type = 'sine', freq, endFreq, detuneCents = 0, start, dur } = spec;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  osc.detune.setValueAtTime(detuneCents, start);
  chain(ctx, osc, out, spec, spec.filter);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playBell(ctx: BaseAudioContext, out: AudioNode, spec: BellSpec): void {
  const { freq, ratio = 2, index = 0.8, start, dur } = spec;
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const depth = ctx.createGain();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(freq, start);
  modulator.type = 'triangle';
  modulator.frequency.setValueAtTime(freq * ratio, start);
  depth.gain.setValueAtTime(freq * index, start);
  depth.gain.exponentialRampToValueAtTime(0.01, start + dur * 0.8);
  modulator.connect(depth);
  depth.connect(carrier.frequency);
  chain(ctx, carrier, out, spec, spec.filter);
  modulator.start(start);
  carrier.start(start);
  modulator.stop(start + dur + 0.02);
  carrier.stop(start + dur + 0.02);
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One second of white noise per context, made once and shared by every burst. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

export function playNoise(ctx: BaseAudioContext, out: AudioNode, spec: NoiseSpec): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  chain(ctx, source, out, spec, spec.filter);
  // Start somewhere different each time so repeated bursts are not the same sample.
  source.start(spec.start, Math.random() * (1 - spec.dur - 0.05));
  source.stop(spec.start + spec.dur + 0.02);
}

/** A multiplier for a frequency, randomly off by up to `cents` either way. */
export function jitter(cents: number): number {
  return Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);
}
