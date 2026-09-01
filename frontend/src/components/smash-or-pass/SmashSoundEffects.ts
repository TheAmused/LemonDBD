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

  // ================= SOUND EFFECTS: SEXY SMASH & SAD PASS AUDIO SUITE =================

  // SEXY DRAG HOVER: Seductive ascending FM harmonic flutter when dragging towards Smash
  public playSensualHover() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Seductive harmonic arpeggio (A4 -> C#5 -> E5 -> G#5)
    const notes = [440.0, 554.37, 659.25, 830.61];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const startTime = now + idx * 0.035;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.18);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, startTime);
      filter.frequency.exponentialRampToValueAtTime(800, startTime + 0.22);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.045, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.24);
    });
  }

  // SAD DRAG HOVER: Melancholic descending cello sigh when dragging towards Pass
  public playSadHover() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sorrowful descending minor tone glide (D4 -> C4 -> Bb3 -> A3)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(293.66, now); // D4
    osc.frequency.exponentialRampToValueAtTime(220.0, now + 0.28); // Glides down to A3

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.linearRampToValueAtTime(320, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  // TACTILE CARD LIFT / GRAB: Silky card touch
  public playCardGrabSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.045);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // SEXY SMASH: Warm 808 sub-drop + lush romantic FM harp chord + crystalline golden shimmer
  public playSmashSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sensual deep sub-bass drop (808 style)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.38);

    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // 2. Lush romantic FM chime chord: F4 (349Hz), A4 (440Hz), C5 (523Hz), E5 (659Hz), A5 (880Hz), C6 (1046Hz)
    const freqs = [349.23, 440.0, 523.25, 659.25, 880.0, 1046.5];
    freqs.forEach((freq, idx) => {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const carrierGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const startTime = now + idx * 0.03;

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, startTime);

      modulator.type = 'triangle';
      modulator.frequency.setValueAtTime(freq * 2, startTime);

      modGain.gain.setValueAtTime(freq * 0.8, startTime);
      modGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, startTime);
      filter.frequency.exponentialRampToValueAtTime(900, startTime + 0.6);

      carrierGain.gain.setValueAtTime(0.001, startTime);
      carrierGain.gain.linearRampToValueAtTime(0.14 - idx * 0.018, startTime + 0.025);
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

      carrier.connect(filter);
      filter.connect(carrierGain);
      carrierGain.connect(ctx.destination);

      modulator.start(startTime);
      carrier.start(startTime);
      modulator.stop(startTime + 0.62);
      carrier.stop(startTime + 0.62);
    });

    // 3. Delicate sparkle pop accent
    const sparkleOsc = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    const sparkleFilter = ctx.createBiquadFilter();

    sparkleFilter.type = 'bandpass';
    sparkleFilter.frequency.setValueAtTime(3400, now + 0.08);
    sparkleFilter.Q.setValueAtTime(4.0, now + 0.08);

    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(1760, now + 0.08);
    sparkleOsc.frequency.exponentialRampToValueAtTime(3520, now + 0.24);

    sparkleGain.gain.setValueAtTime(0.001, now + 0.08);
    sparkleGain.gain.linearRampToValueAtTime(0.08, now + 0.12);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    sparkleOsc.connect(sparkleFilter);
    sparkleFilter.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);

    sparkleOsc.start(now + 0.08);
    sparkleOsc.stop(now + 0.4);
  }

  // SAD PASS: Heartbreaking, poignant minor teardrop + sorrowful cello sigh + cold breeze whisper
  public playPassSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sad cello minor chord (D3 146Hz, F3 174Hz, A3 220Hz -> fading down to G2 98Hz)
    const celloChords = [146.83, 174.61, 220.0];
    celloChords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.55);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.linearRampToValueAtTime(160, now + 0.55);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08 - idx * 0.02, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });

    // 2. Sorrowful teardrop resonance (descending triangle chime)
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    const dropFilter = ctx.createBiquadFilter();

    dropOsc.type = 'triangle';
    dropOsc.frequency.setValueAtTime(587.33, now); // D5
    dropOsc.frequency.exponentialRampToValueAtTime(329.63, now + 0.35); // E4 sad drop

    dropFilter.type = 'lowpass';
    dropFilter.frequency.setValueAtTime(1100, now);
    dropFilter.frequency.exponentialRampToValueAtTime(300, now + 0.38);

    dropGain.gain.setValueAtTime(0.001, now);
    dropGain.gain.linearRampToValueAtTime(0.07, now + 0.04);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    dropOsc.connect(dropFilter);
    dropFilter.connect(dropGain);
    dropGain.connect(ctx.destination);

    dropOsc.start(now);
    dropOsc.stop(now + 0.4);

    // 3. Gentle melancholic wind sigh (filtered soft noise)
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(800, now);
    windFilter.frequency.exponentialRampToValueAtTime(180, now + 0.45);
    windFilter.Q.setValueAtTime(2.0, now);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.001, now);
    windGain.gain.linearRampToValueAtTime(0.06, now + 0.05);
    windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    whiteNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.46);
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
