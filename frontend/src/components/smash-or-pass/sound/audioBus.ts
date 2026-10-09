// frontend/src/components/smash-or-pass/sound/audioBus.ts
//
// What every Smash or Pass sound is played through: a dry path for effects and for music, a shared
// room reverb, and a compressor at the end so a pile-up of voices never clips.

export interface AudioBus {
  /** One-shot effects connect here. */
  sfx: GainNode;
  /** The music connects here; its level is the music volume and what ducking moves. */
  music: GainNode;
}

const REVERB_SECONDS = 1.9;
const REVERB_DECAY = 3.4;

/** A synthetic room: stereo noise that fades out, darkened so it sounds like air rather than hiss. */
function makeImpulse(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smoothed = 0;
    for (let i = 0; i < length; i++) {
      const fade = Math.pow(1 - i / length, REVERB_DECAY);
      smoothed += 0.3 * ((Math.random() * 2 - 1) - smoothed);
      data[i] = smoothed * fade;
    }
  }
  return impulse;
}

export function createAudioBus(ctx: BaseAudioContext): AudioBus {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 24;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.55;
  reverb.connect(reverbReturn);
  reverbReturn.connect(master);

  const sfx = ctx.createGain();
  sfx.connect(master);
  const sfxSend = ctx.createGain();
  sfxSend.gain.value = 0.2;
  sfx.connect(sfxSend);
  sfxSend.connect(reverb);

  const music = ctx.createGain();
  music.gain.value = 0.0001;
  music.connect(master);
  const musicSend = ctx.createGain();
  musicSend.gain.value = 0.45;
  music.connect(musicSend);
  musicSend.connect(reverb);

  return { sfx, music };
}
