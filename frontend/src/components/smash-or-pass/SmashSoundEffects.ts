// frontend/src/components/smash-or-pass/SmashSoundEffects.ts
'use client';

class SmashSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmIntervalId: any = null;
  private bgmOscillators: OscillatorNode[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('lemondbd_smash_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedBgm = localStorage.getItem('lemondbd_smash_bgm_playing');
      if (savedBgm !== null) {
        this.isBgmPlaying = savedBgm === 'true';
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Called on first user interaction anywhere on the window (click/touch/key)
  public handleUserInteraction() {
    const ctx = this.initContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!this.isMuted && this.isBgmPlaying && (!this.bgmGainNode || !this.bgmIntervalId)) {
      this.startBgm();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lemondbd_smash_sound_muted', String(this.isMuted));
    }
    if (this.isMuted && this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (!this.isMuted && this.isBgmPlaying && this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lemondbd_smash_sound_muted', String(muted));
    }
    if (this.isMuted && this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (!this.isMuted && this.isBgmPlaying && this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    }
  }

  public isSoundActive(): boolean {
    return !this.isMuted;
  }

  public toggleMasterSound(): boolean {
    if (this.isMuted || !this.isBgmPlaying) {
      // Turn sound ON
      this.isMuted = false;
      this.isBgmPlaying = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('lemondbd_smash_sound_muted', 'false');
        localStorage.setItem('lemondbd_smash_bgm_playing', 'true');
      }
      this.startBgm();
      this.playSmashSound();
      return true;
    } else {
      // Turn sound OFF
      this.isMuted = true;
      this.isBgmPlaying = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('lemondbd_smash_sound_muted', 'true');
        localStorage.setItem('lemondbd_smash_bgm_playing', 'false');
      }
      this.stopBgm();
      return false;
    }
  }

  // ================= BACKGROUND MUSIC: "SEXY & TWISTED" DARK SYNTH AMBIENCE =================
  public toggleBgm(): boolean {
    if (this.isBgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.isBgmPlaying;
  }

  public startBgm() {
    const ctx = this.initContext();
    if (!ctx) return;
    this.stopBgm();

    this.isBgmPlaying = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lemondbd_smash_bgm_playing', 'true');
    }

    // Main BGM master gain
    const masterBgmGain = ctx.createGain();
    masterBgmGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterBgmGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.08, ctx.currentTime + 2.0);
    masterBgmGain.connect(ctx.destination);
    this.bgmGainNode = masterBgmGain;

    // Dark sensual chord progression in D-minor: Dm9 -> Bbmaj7#11 -> Gm9 -> A7alt
    const chords = [
      [146.83, 220.0, 261.63, 329.63, 440.0], // D3, A3, C4, E4, A4 (Dm9)
      [116.54, 233.08, 293.66, 369.99, 466.16], // Bb2, Bb3, D4, F#4, Bb4 (Bbmaj7#11)
      [98.0, 196.0, 261.63, 293.66, 392.0], // G2, G3, C4, D4, G4 (Gm9)
      [110.0, 220.0, 277.18, 329.63, 415.3], // A2, A3, C#4, E4, G#4 (A7alt)
    ];

    let chordStep = 0;

    const playChordStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const now = this.ctx.currentTime;
      const currentChord = chords[chordStep % chords.length];
      chordStep++;

      // Lowpass resonant filter for dark, filtered warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(850, now + 3.0);
      filter.frequency.linearRampToValueAtTime(400, now + 6.0);
      filter.Q.setValueAtTime(2.5, now);
      filter.connect(this.bgmGainNode);

      currentChord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Layer warm sine and triangle with subtle detuning
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        const detune = (idx - 2) * 4;
        osc.frequency.setValueAtTime(freq + detune * 0.1, now);

        oscGain.gain.setValueAtTime(0.001, now);
        oscGain.gain.linearRampToValueAtTime(idx === 0 ? 0.25 : 0.08, now + 1.8);
        oscGain.gain.linearRampToValueAtTime(idx === 0 ? 0.2 : 0.06, now + 4.5);
        oscGain.gain.linearRampToValueAtTime(0.001, now + 6.2);

        osc.connect(oscGain);
        oscGain.connect(filter);

        osc.start(now);
        osc.stop(now + 6.5);
        this.bgmOscillators.push(osc);
      });

      // Sensual heartbeat pulse on 1 and 3
      const playPulse = (offset: number) => {
        if (!this.ctx || !this.bgmGainNode) return;
        const pOsc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(65, now + offset);
        pOsc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.35);

        pGain.gain.setValueAtTime(0.18, now + offset);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);

        pOsc.connect(pGain);
        pGain.connect(this.bgmGainNode);
        pOsc.start(now + offset);
        pOsc.stop(now + offset + 0.36);
        this.bgmOscillators.push(pOsc);
      };

      playPulse(0);
      playPulse(0.18);
      playPulse(3.0);
      playPulse(3.18);
    };

    playChordStep();
    this.bgmIntervalId = setInterval(playChordStep, 6000);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lemondbd_smash_bgm_playing', 'false');
    }
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      setTimeout(() => {
        this.bgmOscillators.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (_) {}
        });
        this.bgmOscillators = [];
        this.bgmGainNode?.disconnect();
        this.bgmGainNode = null;
      }, 600);
    }
  }

  // ================= SOUND EFFECTS: SEXY SMASH & BIG AIR WHOOSH =================

  // SEXY SMASH: Warm 808 sub-drop + lush romantic FM harp chord + crystalline shimmer
  public playSmashSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sensual deep sub-bass drop (808 style)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.32);

    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.34);

    // 2. Lush romantic FM chime chord: F4 (349Hz), A4 (440Hz), C5 (523Hz), E5 (659Hz), A5 (880Hz)
    const freqs = [349.23, 440.0, 523.25, 659.25, 880.0];
    freqs.forEach((freq, idx) => {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const carrierGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const startTime = now + idx * 0.032;

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, startTime);

      modulator.type = 'triangle';
      modulator.frequency.setValueAtTime(freq * 2, startTime);

      // FM index envelope
      modGain.gain.setValueAtTime(freq * 0.75, startTime);
      modGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.45);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      // High-sheen resonant filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, startTime);
      filter.frequency.exponentialRampToValueAtTime(900, startTime + 0.55);

      carrierGain.gain.setValueAtTime(0.001, startTime);
      carrierGain.gain.linearRampToValueAtTime(0.12 - idx * 0.015, startTime + 0.025);
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

      carrier.connect(filter);
      filter.connect(carrierGain);
      carrierGain.connect(ctx.destination);

      modulator.start(startTime);
      carrier.start(startTime);
      modulator.stop(startTime + 0.58);
      carrier.stop(startTime + 0.58);
    });

    // 3. Delicate sparkle pop accent
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    const sparkleFilter = ctx.createBiquadFilter();

    sparkleFilter.type = 'bandpass';
    sparkleFilter.frequency.setValueAtTime(3200, now + 0.1);
    sparkleFilter.Q.setValueAtTime(4.0, now + 0.1);

    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(1600, now + 0.1);
    sparkleOsc.frequency.exponentialRampToValueAtTime(3200, now + 0.22);

    sparkleGain.gain.setValueAtTime(0.001, now + 0.1);
    sparkleGain.gain.linearRampToValueAtTime(0.07, now + 0.13);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    sparkleOsc.connect(sparkleFilter);
    sparkleFilter.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);

    sparkleOsc.start(now + 0.1);
    sparkleOsc.stop(now + 0.36);
  }

  // BIG AIR WHOOSH PASS: High-velocity aerodynamic filtered noise whoosh + sub air displacement
  public playPassSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Aerodynamic White Noise Whoosh Buffer (0.42s)
    const bufferSize = Math.floor(ctx.sampleRate * 0.42);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Resonant bandpass filter that sweeps rapidly downward (4200Hz -> 90Hz)
    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(4200, now);
    whooshFilter.frequency.exponentialRampToValueAtTime(95, now + 0.4);
    whooshFilter.Q.setValueAtTime(3.8, now);

    // Second lowpass stage for smooth cinematic body
    const lowpassStage = ctx.createBiquadFilter();
    lowpassStage.type = 'lowpass';
    lowpassStage.frequency.setValueAtTime(3500, now);
    lowpassStage.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.001, now);
    whooshGain.gain.linearRampToValueAtTime(0.32, now + 0.06); // Fast aggressive attack
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    whiteNoise.connect(whooshFilter);
    whooshFilter.connect(lowpassStage);
    lowpassStage.connect(whooshGain);
    whooshGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.42);

    // 2. Sub Air Displacement Body (Physical air whoosh weight)
    const subAirOsc = ctx.createOscillator();
    const subAirGain = ctx.createGain();
    subAirOsc.type = 'sine';
    subAirOsc.frequency.setValueAtTime(160, now);
    subAirOsc.frequency.exponentialRampToValueAtTime(40, now + 0.38);

    subAirGain.gain.setValueAtTime(0.001, now);
    subAirGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    subAirGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    subAirOsc.connect(subAirGain);
    subAirGain.connect(ctx.destination);

    subAirOsc.start(now);
    subAirOsc.stop(now + 0.4);
  }

  // Tactile Tarot Card Flip Sound (Crisp, silky flick)
  public playFlipSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Warm anatomical heartbeat (Organic lub-dub double pulse)
  public playHeartbeat(speedMultiplier = 1.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const playThump = (time: number, freq: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, time);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + 0.12);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.13);
    };

    playThump(now, 72, 0.22);
    playThump(now + 0.14 / speedMultiplier, 58, 0.16);
  }

  // Silky hover micro-tick
  public playHoverTick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }
}

export const SmashSounds = new SmashSoundEngine();
