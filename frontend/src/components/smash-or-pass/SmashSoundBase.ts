// frontend/src/components/smash-or-pass/SmashSoundBase.ts
// Audio context and mix bus, and the music's controls. Whether anything plays is decided in one
// place only: the viewer's saved Effects / Music choice (prefs/), applied through
// `applyPreferences`. The one-shot effects live in SmashSoundEffects.ts, the music itself in
// sound/MusicEngine.ts.
import { getAudioContextCtor } from '@/utils/browserApis';
import { createAudioBus, type AudioBus } from './sound/audioBus';
import { MusicEngine } from './sound/MusicEngine';

/** How loud the music sits under the effects. */
const MUSIC_LEVEL = 0.1;
const SILENT = 0.0001;

export abstract class SmashSoundBase {
  protected ctx: AudioContext | null = null;
  protected bus: AudioBus | null = null;
  /** Nothing plays until the viewer has chosen; `applyPreferences` is what lets sound through. */
  protected effectsAllowed: boolean = false;
  protected musicAllowed: boolean = false;
  private music: MusicEngine | null = null;

  constructor() {
    // A page nobody is looking at should not keep playing.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
        } else {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  protected initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = getAudioContextCtor();
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.bus = createAudioBus(this.ctx);
        this.applyMusicLevel();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !(typeof document !== 'undefined' && document.hidden)) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** What an effect needs to play: the context and where to send it, or null when effects are off. */
  protected sfxTarget(): { ctx: AudioContext; out: AudioNode } | null {
    if (!this.effectsAllowed) return null;
    const ctx = this.initContext();
    if (!ctx || !this.bus) return null;
    return { ctx, out: this.bus.sfx };
  }

  /** Lets the music dip for a moment so an effect lands clearly; `depth` is the fraction it dips to. */
  protected duckMusic(depth = 0.5, holdS = 0.25, releaseS = 0.6): void {
    if (!this.ctx || !this.bus || !this.music) return;
    const gain = this.bus.music.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(MUSIC_LEVEL * depth, now, 0.03);
    gain.setTargetAtTime(MUSIC_LEVEL, now + holdS, releaseS / 3);
  }

  /** Moves the music to its level: audible while it is playing, silent otherwise. */
  private applyMusicLevel(): void {
    if (!this.ctx || !this.bus) return;
    const gain = this.bus.music.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(this.music ? MUSIC_LEVEL : SILENT, now, 0.05);
  }

  /** Called on the first click, touch or key press anywhere: the browser lets audio start now. */
  public handleUserInteraction() {
    const ctx = this.initContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (this.musicAllowed && !this.music) this.startBgm();
  }

  /**
   * Applies the viewer's sound-effects / music choice -- the only thing that switches sound on or off.
   * Music chosen starts it; until the page has had a click or key press the browser will not let
   * audio start, so a saved choice then waits for the first one (see `handleUserInteraction`).
   */
  public applyPreferences({ sounds, music }: { sounds: boolean; music: boolean }): void {
    this.effectsAllowed = sounds;
    this.musicAllowed = music;
    if (!music) {
      this.stopBgm();
      return;
    }
    const userHasActed = typeof navigator !== 'undefined' && navigator.userActivation?.isActive === true;
    if (!this.music && (this.ctx || userHasActed)) this.startBgm();
  }

  public startBgm() {
    if (!this.musicAllowed) return;
    const ctx = this.initContext();
    if (!ctx || !this.bus) return;
    this.music?.stop();
    this.music = new MusicEngine(ctx, this.bus.music);
    this.applyMusicLevel();
    this.music.start();
  }

  public stopBgm() {
    this.music?.stop();
    this.music = null;
    this.applyMusicLevel();
  }

  /**
   * Silences the music when the viewer leaves the page. Their choice is untouched, so coming back
   * starts it again (see `applyPreferences`).
   */
  public pauseBgm(): void {
    this.stopBgm();
  }

  abstract playSmashSound(): void;
}
