// frontend/src/utils/minigames/MinigameSoundEngine.ts
import { getAudioContextCtor } from '@/utils/browserApis';

class MinigameSoundEngine {
  private ctx: AudioContext | null = null;
  private activeNodes: Array<AudioNode | { stop: () => void }> = [];
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
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

  public stopAll(): void {
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        } else if ('disconnect' in node && typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch {}
    }
    this.activeNodes = [];
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  /**
   * Generates a Dead by Daylight style heartbeat pulse.
   * bpm controls distance:
   *  - 32m: ~50 bpm (far, low frequency thump)
   *  - 16m: ~85 bpm (closer, double thump)
   *  - 8m:  ~130 bpm (intense rapid double thump)
   *  - 0m:  ~160 bpm (frantic chase beat with distortion)
   */
  public playHeartbeat(distanceMeters: number = 32, durationSeconds: number = 5): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopAll();

    const bpm = distanceMeters <= 8 ? 140 : distanceMeters <= 16 ? 90 : 54;
    const intervalSec = 60 / bpm;
    const now = ctx.currentTime;
    const beatsCount = Math.floor(durationSeconds / intervalSec);

    for (let i = 0; i < beatsCount; i++) {
      const beatTime = now + i * intervalSec;

      // First 'lub' thump
      this.createThump(ctx, beatTime, 65, 38, 0.14, 0.45);

      // Second 'dub' thump shortly after
      const dubDelay = intervalSec * 0.28;
      this.createThump(ctx, beatTime + dubDelay, 72, 34, 0.12, 0.38);

      // If close (<= 8m), add eerie terror drone
      if (distanceMeters <= 8) {
        this.createTensionDrone(ctx, beatTime, intervalSec * 0.9);
      }
    }
  }

  private createThump(
    ctx: AudioContext,
    time: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    gainLevel: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
    this.activeNodes.push(osc);
  }

  private createTensionDrone(ctx: AudioContext, time: number, duration: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.linearRampToValueAtTime(116, time + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
    this.activeNodes.push(osc);
  }

  /**
   * Hook scream & grunt simulation:
   * - steve: iconic high screech descending pitch
   * - elodie: sharp high resonance
   * - doctor: staccato psychotic laughter modulation
   */
  public playScreamSound(characterType: 'steve' | 'elodie' | 'doctor' | 'general' = 'general'): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopAll();
    const now = ctx.currentTime;

    if (characterType === 'doctor') {
      // Doctor laugh: repetitive bursts of modulated frequency
      for (let i = 0; i < 5; i++) {
        const t = now + i * 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320 - i * 15, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
        this.activeNodes.push(osc);
      }
      return;
    }

    // Hook scream slide
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = characterType === 'steve' ? 'sawtooth' : 'triangle';
    const startFreq = characterType === 'steve' ? 880 : characterType === 'elodie' ? 950 : 640;
    const endFreq = characterType === 'steve' ? 440 : 380;
    const duration = characterType === 'steve' ? 1.6 : 1.2;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq * 0.9, now);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
    this.activeNodes.push(osc);
  }

  /**
   * Sound effect for correct or incorrect guess.
   */
  public playFeedback(type: 'correct' | 'incorrect' | 'victory'): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (type === 'correct') {
      // Pleasant high double chime
      [523.25, 659.25, 783.99].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.45);
        this.activeNodes.push(osc);
      });
    } else if (type === 'victory') {
      // Grand chord
      [261.63, 329.63, 392.0, 523.25].forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.25);
        this.activeNodes.push(osc);
      });
    } else {
      // Low thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
      this.activeNodes.push(osc);
    }
  }
}

export const soundEngine = new MinigameSoundEngine();
