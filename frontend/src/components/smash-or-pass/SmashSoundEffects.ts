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
      this.ctx.resume();
    }
    return this.ctx;
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
      [146.83, 220.00, 261.63, 329.63, 440.00], // D3, A3, C4, E4, A4 (Dm9)
      [116.54, 233.08, 293.66, 369.99, 466.16], // Bb2, Bb3, D4, F#4, Bb4 (Bbmaj7#11)
      [98.00, 196.00, 261.63, 293.66, 392.00],  // G2, G3, C4, D4, G4 (Gm9)
      [110.00, 220.00, 277.18, 329.63, 415.30], // A2, A3, C#4, E4, G#4 (A7alt)
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
        oscGain.gain.linearRampToValueAtTime(idx === 0 ? 0.20 : 0.06, now + 4.5);
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

  // ================= SOUND EFFECTS =================

  // Seductive / Sexy Smash Audio Cue
  public playSmashSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sultry Warm Harmonic Chords (F#4 -> A#4 -> C#5 -> F5)
    const freqs = [369.99, 466.16, 554.37, 698.46];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * 0.98, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq, now + idx * 0.04 + 0.12);

      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.75);
    });

    // 2. Sexy Sub-Bass Heartbeat Thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.35);

    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.36);
  }

  // Melancholic / Sad Pass Audio Cue
  public playPassSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Descending Minor Sad Chords (E4 -> D4 -> C4 -> A3)
    const freqs = [329.63, 293.66, 261.63, 220.0];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + idx * 0.06 + 0.4);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.06 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.6);
    });

    // Hollow wind / dark void undertone
    const noiseOsc = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noiseOsc.type = 'triangle';
    noiseOsc.frequency.setValueAtTime(110, now);
    noiseOsc.frequency.exponentialRampToValueAtTime(55, now + 0.45);

    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noiseOsc.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseOsc.start(now);
    noiseOsc.stop(now + 0.46);
  }

  // Card Flip Sound
  public playFlipSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Terror Radius Heartbeat
  public playHeartbeat(speedMultiplier = 1.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const playThump = (time: number, freq: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + 0.12);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.13);
    };

    playThump(now, 75, 0.25);
    playThump(now + 0.14 / speedMultiplier, 60, 0.18);
  }

  // Hover Tick / Eerie Whisper
  public playHoverTick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.03);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }
}

export const SmashSounds = new SmashSoundEngine();
