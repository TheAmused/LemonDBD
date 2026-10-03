// frontend/src/components/smash-or-pass/SmashSoundBase.ts
// Audio context, mute/background-music state and the BGM synth. The one-shot effects live in SmashSoundEffects.ts.
import { getAudioContextCtor } from '@/utils/browserApis';

export abstract class SmashSoundBase {
  protected ctx: AudioContext | null = null;
  protected isMuted: boolean = false;
  protected isBgmPlaying: boolean = false;
  protected bgmGainNode: GainNode | null = null;
  protected bgmIntervalId: ReturnType<typeof setInterval> | null = null;
  protected bgmOscillators: OscillatorNode[] = [];

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

  protected initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = getAudioContextCtor();
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

  abstract playSmashSound(): void;
}
