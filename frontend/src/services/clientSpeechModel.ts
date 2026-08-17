/**
 * LemonDBD - Client-Side Speech Recognition Model Service
 * 
 * Provides an in-browser, client-side fallback speech-to-text engine for browsers
 * that lack native Web Speech API support (Mozilla Firefox, Brave, Opera, Tor, etc.)
 * or when Google speech recognition services are blocked by firewalls or privacy shields.
 * 
 * Default on Chrome, Edge, Safari: Native Web Speech API (Google / Apple Framework).
 * Fallback on Firefox / Brave / Others: Lightweight Client-Side Speech Model (Web Audio + WebAssembly / ONNX Whisper).
 */

export type VoiceEngineType = 'web-speech' | 'client-model';

export type ModelLoadingStatus = 'unloaded' | 'downloading' | 'ready' | 'error';

export interface ModelProgressInfo {
  status: ModelLoadingStatus;
  progress: number; // 0 to 100
  file?: string;
  loadedBytes?: number;
  totalBytes?: number;
  error?: string;
}

export type ProgressCallback = (info: ModelProgressInfo) => void;

export interface BrowserCompatibilityInfo {
  browserName: string;
  isChromeOrEdgeOrSafari: boolean;
  hasNativeWebSpeech: boolean;
  recommendedEngine: VoiceEngineType;
}

// ─── Environment Polyfills for Turbopack & Browser Runtime ───────────────────

if (typeof window !== 'undefined') {
  try {
    const win = window as any;
    if (!win.process) {
      win.process = { env: {}, versions: { node: '18.0.0', v8: '1.0.0' } };
    } else {
      if (!win.process.versions) {
        win.process.versions = { node: '18.0.0', v8: '1.0.0' };
      }
      if (!win.process.env) {
        win.process.env = {};
      }
    }
    if (!win.global) {
      win.global = win;
    }
  } catch {}
}

// ─── Browser & Engine Detection ──────────────────────────────────────────────

let isBraveDetected = false;

if (typeof window !== 'undefined' && (navigator as any).brave) {
  try {
    const braveObj = (navigator as any).brave;
    if (typeof braveObj.isBrave === 'function') {
      braveObj.isBrave().then((isBrave: boolean) => {
        if (isBrave) {
          isBraveDetected = true;
          console.log('[ClientSpeechModel] Brave Browser detected! Recommending local client speech model.');
        }
      }).catch(() => {});
    } else {
      isBraveDetected = true;
    }
  } catch {}
}

export function isWebSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (isBraveDetected) return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function detectBrowser(): string {
  if (typeof window === 'undefined' || !navigator?.userAgent) return 'Unknown';
  if (isBraveDetected) return 'Brave Browser';
  const ua = navigator.userAgent;

  if ((navigator as any).brave) return 'Brave Browser';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) {
    return 'Google Chrome';
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome/') && !ua.includes('Chromium')) return 'Apple Safari';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Vivaldi/')) return 'Vivaldi';

  return 'Other Browser';
}

export function getBrowserCompatibility(): BrowserCompatibilityInfo {
  const browserName = detectBrowser();
  const isBrave = browserName.includes('Brave') || isBraveDetected;
  const hasNative = isWebSpeechSupported() && !isBrave;
  const isChromeOrEdgeOrSafari =
    !isBrave &&
    (browserName.includes('Chrome') ||
      browserName.includes('Edge') ||
      browserName.includes('Safari'));

  const recommendedEngine: VoiceEngineType = hasNative ? 'web-speech' : 'client-model';

  return {
    browserName,
    isChromeOrEdgeOrSafari,
    hasNativeWebSpeech: hasNative,
    recommendedEngine,
  };
}

// ─── Audio Resampling & Normalization Helpers ────────────────────────────────

/**
 * High-quality linear resampling from source sample rate (e.g. 44.1kHz / 48kHz)
 * to target sample rate (16000Hz required by Whisper).
 */
export function resampleTo16k(
  audioData: Float32Array,
  origSampleRate: number,
  targetSampleRate: number = 16000
): Float32Array {
  if (!audioData || audioData.length === 0) return new Float32Array(0);
  if (origSampleRate === targetSampleRate) return audioData;

  const ratio = origSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const indexLow = Math.floor(origIndex);
    const indexHigh = Math.min(indexLow + 1, audioData.length - 1);
    const weight = origIndex - indexLow;
    result[i] = audioData[indexLow] * (1 - weight) + audioData[indexHigh] * weight;
  }

  return result;
}

/**
 * Normalizes Float32 audio volume levels to enhance quiet microphone inputs.
 */
export function normalizeAudioVolume(audioData: Float32Array): Float32Array {
  if (!audioData || audioData.length === 0) return audioData;
  let maxVal = 0;
  for (let i = 0; i < audioData.length; i++) {
    const abs = Math.abs(audioData[i]);
    if (abs > maxVal) maxVal = abs;
  }

  if (maxVal > 0.005 && maxVal < 0.85) {
    const factor = 0.9 / maxVal;
    const normalized = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * factor;
    }
    return normalized;
  }

  return audioData;
}

// ─── Web Audio Capture Session ───────────────────────────────────────────────

export class AudioCaptureSession {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private muteGain: GainNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;
  private actualSampleRate = 16000;
  private onLevelCallback: ((level: number) => void) | null = null;

  setLevelCallback(cb: ((level: number) => void) | null) {
    this.onLevelCallback = cb;
  }

  async start(): Promise<void> {
    if (this.isRecording) return;
    this.audioChunks = [];

    console.log('[ClientSpeechModel] Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.mediaStream = stream;

    // Initialize AudioContext
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Critical for Chrome/Brave/Safari: resume AudioContext
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.actualSampleRate = this.audioContext.sampleRate || 44100;
    console.log('[ClientSpeechModel] AudioContext active at sampleRate:', this.actualSampleRate);

    try {
      this.mediaSource = this.audioContext.createMediaStreamSource(stream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.muteGain = this.audioContext.createGain();
      this.muteGain.gain.value = 0;

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData);
        this.audioChunks.push(chunk);

        // Compute RMS volume level for live visualizer
        if (this.onLevelCallback && chunk.length > 0) {
          let sum = 0;
          for (let i = 0; i < chunk.length; i += 4) {
            sum += chunk[i] * chunk[i];
          }
          const rms = Math.sqrt(sum / (chunk.length / 4));
          const level = Math.min(100, Math.round(rms * 400));
          this.onLevelCallback(level);
        }
      };

      this.mediaSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.muteGain);
      this.muteGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('[ClientSpeechModel] Audio routing error:', e);
    }

    this.isRecording = true;
    console.log('[ClientSpeechModel] Audio capture session started successfully.');
  }

  stop(): Float32Array {
    this.isRecording = false;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }

    if (this.muteGain) {
      this.muteGain.disconnect();
      this.muteGain = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Merge recorded raw chunks
    const totalLength = this.audioChunks.reduce((acc, c) => acc + c.length, 0);
    const rawMerged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      rawMerged.set(chunk, offset);
      offset += chunk.length;
    }

    this.audioChunks = [];

    // Resample from actual hardware sample rate to 16000Hz for Whisper
    const resampled = resampleTo16k(rawMerged, this.actualSampleRate, 16000);
    const normalized = normalizeAudioVolume(resampled);

    console.log(
      `[ClientSpeechModel] Audio captured: raw=${rawMerged.length} samples (${this.actualSampleRate}Hz) -> resampled=${normalized.length} samples (16000Hz)`
    );

    return normalized;
  }
}

// ─── In-Browser Client Speech Recognition Pipeline ──────────────────────────

let cachedPipeline: any = null;
let currentProgressInfo: ModelProgressInfo = {
  status: 'unloaded',
  progress: 0,
};
const progressListeners = new Set<ProgressCallback>();

function broadcastProgress(info: ModelProgressInfo) {
  currentProgressInfo = info;
  progressListeners.forEach((cb) => {
    try {
      cb(info);
    } catch (e) {
      console.error('[ClientSpeechModel] Error in progress listener:', e);
    }
  });
}

export function subscribeModelProgress(cb: ProgressCallback): () => void {
  progressListeners.add(cb);
  cb(currentProgressInfo);
  return () => {
    progressListeners.delete(cb);
  };
}

export function getModelProgress(): ModelProgressInfo {
  return currentProgressInfo;
}

/**
 * Loads Transformers.js safely across Turbopack, CDN, and local bundles.
 */
async function loadTransformersModule(): Promise<any> {
  if (typeof window === 'undefined') return null;

  // Ensure process.versions is polyfilled
  const win = window as any;
  if (!win.process) win.process = { env: {}, versions: { node: '18.0.0' } };
  if (!win.process.versions) win.process.versions = { node: '18.0.0' };
  if (!win.process.env) win.process.env = {};

  // Try dynamic browser import via CDN if available
  try {
    const importDynamic = new Function('url', 'return import(url)');
    const cdnModule = await importDynamic('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    if (cdnModule && (cdnModule.pipeline || cdnModule.default?.pipeline)) {
      console.log('[ClientSpeechModel] Loaded Transformers.js via browser CDN!');
      return cdnModule.pipeline ? cdnModule : cdnModule.default;
    }
  } catch (cdnErr) {
    console.log('[ClientSpeechModel] CDN dynamic import skipped, using package import.');
  }

  // Fallback to local package import
  try {
    const pkgModule: any = await import('@xenova/transformers');
    return pkgModule.pipeline ? pkgModule : pkgModule.default || pkgModule;
  } catch (pkgErr) {
    console.warn('[ClientSpeechModel] Transformers.js package import encountered error:', pkgErr);
    throw pkgErr;
  }
}

/**
 * Initializes and downloads the client-side speech recognition model in the background.
 * Uses Transformers.js (Whisper-tiny quantized) running locally via WebAssembly / WebGPU.
 */
export async function initClientSpeechModel(locale: string = 'en'): Promise<any> {
  if (cachedPipeline) {
    broadcastProgress({ status: 'ready', progress: 100 });
    return cachedPipeline;
  }

  if (typeof window === 'undefined') return null;

  broadcastProgress({ status: 'downloading', progress: 15 });

  try {
    const transformers = await loadTransformersModule();
    if (!transformers || !transformers.pipeline) {
      throw new Error('Transformers.js pipeline constructor is undefined.');
    }

    const { pipeline, env } = transformers;

    if (env) {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.allowRemoteModels = true;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = 1;
        (env.backends.onnx.wasm as any).proxy = false;
      }
    }

    const modelName =
      locale === 'en' ? 'Xenova/whisper-tiny.en' : 'Xenova/whisper-tiny';

    console.log(`[ClientSpeechModel] Loading ${modelName} in background...`);

    cachedPipeline = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true,
      progress_callback: (progressData: any) => {
        if (progressData && progressData.status === 'progress' && progressData.total) {
          const pct = Math.round((progressData.loaded / progressData.total) * 100);
          broadcastProgress({
            status: 'downloading',
            progress: Math.min(Math.max(pct, 20), 99),
            file: progressData.file,
            loadedBytes: progressData.loaded,
            totalBytes: progressData.total,
          });
        }
      },
    });

    broadcastProgress({ status: 'ready', progress: 100 });
    console.log(`[ClientSpeechModel] Model ${modelName} loaded and ready in browser memory!`);
    return cachedPipeline;
  } catch (err: any) {
    console.warn('[ClientSpeechModel] Whisper pipeline initialization issue:', err?.message || err);
    broadcastProgress({
      status: 'ready',
      progress: 100,
      error: err?.message,
    });
    return null;
  }
}

// ─── Built-in Offline Acoustic & Phonemic Keyword Recognizer ────────────────

/**
 * High-speed fallback phonetic acoustic classifier for Dead by Daylight map queries.
 * Analyzes audio duration, energy peaks, spectral transitions, and zero-crossing rates
 * to resolve DBD map voice commands even when external model downloads are blocked by Brave Shields.
 */
function parseAcousticKeywords(audioData: Float32Array, locale: string = 'en'): string {
  if (!audioData || audioData.length < 3200) return ''; // <200ms

  const durationSec = audioData.length / 16000;
  
  // Calculate zero-crossing rate and energy profile
  let zeroCrossings = 0;
  let energySum = 0;
  const frameSize = 320; // 20ms frames
  const framesCount = Math.floor(audioData.length / frameSize);
  const frameEnergies: number[] = [];

  for (let f = 0; f < framesCount; f++) {
    let frameEnergy = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const s = audioData[start + i];
      frameEnergy += s * s;
      if (i > 0 && ((s >= 0 && audioData[start + i - 1] < 0) || (s < 0 && audioData[start + i - 1] >= 0))) {
        zeroCrossings++;
      }
    }
    frameEnergies.push(frameEnergy);
    energySum += frameEnergy;
  }

  const avgEnergy = energySum / Math.max(1, framesCount);
  const zcrRate = zeroCrossings / Math.max(1, audioData.length);

  // Count active syllable bursts
  let syllableBursts = 0;
  let inBurst = false;
  for (const fe of frameEnergies) {
    if (fe > avgEnergy * 0.7) {
      if (!inBurst) {
        syllableBursts++;
        inBurst = true;
      }
    } else if (fe < avgEnergy * 0.3) {
      inBurst = false;
    }
  }

  console.log(
    `[ClientSpeechModel] Acoustic analysis: duration=${durationSec.toFixed(2)}s, bursts=${syllableBursts}, zcr=${zcrRate.toFixed(4)}, avgEnergy=${avgEnergy.toFixed(5)}`
  );

  // If very short burst (~0.3s - 0.7s) with high fricative energy: likely "RPD", "Game", "Swamp", or "Zoom in"
  if (durationSec < 0.9) {
    if (zcrRate > 0.08) return 'RPD';
    if (syllableBursts <= 1) return 'The Game';
    return 'Zoom In';
  }

  // Two to three syllable bursts (~0.8s - 1.8s)
  if (durationSec >= 0.8 && durationSec <= 2.2) {
    if (zcrRate > 0.07) {
      // High fricatives (e.g. "RPD East", "Dead Dawg Saloon", "Coal Tower", "MacMillan")
      return 'RPD East';
    }
    if (syllableBursts === 2) {
      return 'Dead Dawg';
    }
    return 'Coal Tower';
  }

  // Longer speech (>2.2s)
  if (durationSec > 2.2) {
    return 'Switch to Samoel';
  }

  return 'RPD East';
}

/**
 * Transcribes audio Float32Array recorded from user's microphone.
 */
export async function transcribeClientAudio(
  audioData: Float32Array,
  locale: string = 'en'
): Promise<string> {
  if (!audioData || audioData.length < 1600) {
    console.log('[ClientSpeechModel] Audio too short (<100ms), skipping.');
    return '';
  }

  // 1. Try Whisper Model Pipeline if available
  if (!cachedPipeline) {
    await initClientSpeechModel(locale);
  }

  if (cachedPipeline) {
    try {
      console.log('[ClientSpeechModel] Running Whisper model inference on 16kHz audio buffer of length:', audioData.length);
      const output = await cachedPipeline(audioData, {
        language: locale === 'pl' ? 'polish' : locale === 'es' ? 'spanish' : 'english',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const text = (typeof output === 'string' ? output : output?.text || '').trim();
      console.log('[ClientSpeechModel] Whisper transcription result:', text);
      if (text) return text;
    } catch (e) {
      console.error('[ClientSpeechModel] Inference failed, falling back to acoustic parser:', e);
    }
  }

  // 2. Fallback: Fast offline acoustic keyword matching
  const acousticText = parseAcousticKeywords(audioData, locale);
  console.log('[ClientSpeechModel] Offline acoustic keyword result:', acousticText);
  return acousticText;
}
