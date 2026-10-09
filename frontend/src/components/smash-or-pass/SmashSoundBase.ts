// frontend/src/components/smash-or-pass/SmashSoundBase.ts
// Audio context and mix bus, mute / background-music state and the music's controls. The one-shot
// effects live in SmashSoundEffects.ts, the music itself in sound/MusicEngine.ts.
import { getAudioContextCtor } from '@/utils/browserApis';
import { createAudioBus, type AudioBus } from './sound/audioBus';
import { MusicEngine } from './sound/MusicEngine';

const MUTED_KEY = 'lemondbd_smash_sound_muted';
const BGM_KEY = 'lemondbd_smash_bgm_playing';
/** How loud the music sits under the effects. */
const MUSIC_LEVEL = 0.1;
const SILENT = 0.0001;

function readFlag(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? null : saved === 'true';
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}

export abstract class SmashSoundBase {
  protected ctx: AudioContext | null = null;
  protected bus: AudioBus | null = null;
  protected isMuted: boolean = false;
  protected isBgmPlaying: boolean = false;
  /** The viewer's choice on the page's warning: effects and music can each be switched off outright. */
  protected effectsAllowed: boolean = true;
  protected musicAllowed: boolean = true;
  private music: MusicEngine | null = null;

  constructor() {
    this.isMuted = readFlag(MUTED_KEY) ?? this.isMuted;
    this.isBgmPlaying = readFlag(BGM_KEY) ?? this.isBgmPlaying;

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

  /** What an effect needs to play: the context and where to send it, or null when muted or unavailable. */
  protected sfxTarget(): { ctx: AudioContext; out: AudioNode } | null {
    if (this.isMuted || !this.effectsAllowed) return null;
    const ctx = this.initContext();
    if (!ctx || !this.bus) return null;
    return { ctx, out: this.bus.sfx };
  }

  /** Lets the music dip for a moment so an effect lands clearly; `depth` is the fraction it dips to. */
  protected duckMusic(depth = 0.5, holdS = 0.25, releaseS = 0.6): void {
    if (!this.ctx || !this.bus || this.isMuted || !this.isBgmPlaying) return;
    const gain = this.bus.music.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(MUSIC_LEVEL * depth, now, 0.03);
    gain.setTargetAtTime(MUSIC_LEVEL, now + holdS, releaseS / 3);
  }

  /** Moves the music to its level for the current mute / playing state. */
  private applyMusicLevel(): void {
    if (!this.ctx || !this.bus) return;
    const audible = !this.isMuted && this.isBgmPlaying;
    const gain = this.bus.music.gain;
    const now = this.ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(audible ? MUSIC_LEVEL : SILENT, now, 0.05);
  }

  // Called on first user interaction anywhere on the window (click/touch/key)
  public handleUserInteraction() {
    const ctx = this.initContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!this.isMuted && this.isBgmPlaying && !this.music) {
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
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    writeFlag(MUTED_KEY, muted);
    this.applyMusicLevel();
    if (!muted && this.isBgmPlaying && !this.music) this.startBgm();
  }

  public isSoundActive(): boolean {
    return !this.isMuted;
  }

  public toggleMasterSound(): boolean {
    if (this.isMuted || !this.isBgmPlaying) {
      // Turn sound ON
      this.isMuted = false;
      this.isBgmPlaying = true;
      writeFlag(MUTED_KEY, false);
      writeFlag(BGM_KEY, true);
      this.startBgm();
      this.playSmashSound();
      return true;
    }
    // Turn sound OFF
    this.isMuted = true;
    this.isBgmPlaying = false;
    writeFlag(MUTED_KEY, true);
    writeFlag(BGM_KEY, false);
    this.stopBgm();
    return false;
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

  /**
   * Applies the viewer's effects / music choice. Switching music off stops it for good; switching
   * it on starts it, which only ever happens on their click (the warning's Continue button).
   */
  public applyPreferences({ effects, music }: { effects: boolean; music: boolean }): void {
    this.effectsAllowed = effects;
    this.musicAllowed = music;
    if (!music) {
      this.music?.stop();
      this.music = null;
      this.applyMusicLevel();
      return;
    }
    // Music chosen: it plays from now on. Until the page has had a click or key press the browser
    // will not let audio start, so a saved choice then waits for the first one (see
    // `handleUserInteraction`) rather than opening a context that cannot run yet.
    if (!this.isBgmPlaying) {
      this.isBgmPlaying = true;
      writeFlag(BGM_KEY, true);
    }
    const userHasActed = typeof navigator !== 'undefined' && navigator.userActivation?.isActive === true;
    if (!this.isMuted && !this.music && (this.ctx || userHasActed)) this.startBgm();
  }

  public startBgm() {
    if (!this.musicAllowed) return;
    const ctx = this.initContext();
    if (!ctx || !this.bus) return;
    this.music?.stop();

    this.isBgmPlaying = true;
    writeFlag(BGM_KEY, true);
    this.applyMusicLevel();

    this.music = new MusicEngine(ctx, this.bus.music);
    this.music.start();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    writeFlag(BGM_KEY, false);
    this.music?.stop();
    this.music = null;
    this.applyMusicLevel();
  }

  abstract playSmashSound(): void;
}
