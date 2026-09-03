// frontend/src/services/clientSpeechModel.ts
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

/**
 * Which Whisper checkpoint the local engine downloads.
 *
 * 'fast'     whisper-tiny  (~40MB quantized) - the historical default.
 * 'accurate' whisper-base  (~80MB quantized) - roughly 2x the download and
 *            inference cost, noticeably better on proper nouns like
 *            "Azarov's Resting Place" and on non-native accents.
 */
export type ModelQuality = 'fast' | 'accurate';

export const MODEL_QUALITY_STORAGE_KEY = 'lemondbd:voice:modelQuality';

export interface ModelDescriptor {
  /** Hugging Face repo id passed to Transformers.js. */
  name: string;
  /** Approximate quantized download size, for the UI. */
  approxSizeMb: number;
  /** English-only checkpoints reject language tokens entirely. */
  multilingual: boolean;
}

/**
 * Model matrix.
 *
 * The previous implementation loaded `whisper-tiny.en` for every locale except
 * Polish, then passed `language: 'spanish' | 'german'` to it. English-only Whisper
 * checkpoints do not carry language tokens in their vocabulary, so German, Spanish
 * and Japanese users were being transcribed by an English-only model with an
 * option it cannot honour - the local engine was effectively dead in three of the
 * five shipped locales.
 */
const MODEL_MATRIX: Record<ModelQuality, { english: ModelDescriptor; multilingual: ModelDescriptor }> = {
  fast: {
    english: { name: 'Xenova/whisper-tiny.en', approxSizeMb: 39, multilingual: false },
    multilingual: { name: 'Xenova/whisper-tiny', approxSizeMb: 42, multilingual: true },
  },
  accurate: {
    english: { name: 'Xenova/whisper-base.en', approxSizeMb: 78, multilingual: false },
    multilingual: { name: 'Xenova/whisper-base', approxSizeMb: 82, multilingual: true },
  },
};

/** Whisper language names, keyed by the app's UI locales. */
const WHISPER_LANGUAGES: Record<string, string> = {
  en: 'english',
  pl: 'polish',
  es: 'spanish',
  de: 'german',
  ja: 'japanese',
};

export function resolveModelDescriptor(locale: string = 'en', quality: ModelQuality = 'fast'): ModelDescriptor {
  const tier = MODEL_MATRIX[quality] || MODEL_MATRIX.fast;
  return !locale || locale === 'en' ? tier.english : tier.multilingual;
}

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
      win.process = { env: {}, browser: true };
    } else {
      if (!win.process.env) {
        win.process.env = {};
      }
      // Ensure browser mode is respected; do not set process.versions.node
      // as it causes emscripten and onnxruntime-web to falsely detect Node.js runtime.
      if (win.process.versions?.node) {
        delete win.process.versions.node;
      }
    }
    if (!win.global) {
      win.global = win;
    }

    // Suppress noisy ONNX wasm graph cleaner and response header warnings in browser console
    if (!win.__onnxLogFilterInstalled) {
      win.__onnxLogFilterInstalled = true;
      const originalWarn = console.warn;
      const originalLog = console.log;
      const shouldSuppress = (args: any[]): boolean => {
        try {
          const str = args
            .map((a) => (typeof a === 'string' ? a : a?.message || ''))
            .join(' ');
          if (
            str.includes('CleanUnusedInitializersAndNodeArgs') ||
            str.includes('Removing initializer') ||
            str.includes('Constant_1_output_0') ||
            str.includes('Unable to determine content-length')
          ) {
            return true;
          }
        } catch {}
        return false;
      };

      console.warn = function (...args: any[]) {
        if (shouldSuppress(args)) return;
        return originalWarn.apply(console, args);
      };

      console.log = function (...args: any[]) {
        if (shouldSuppress(args)) return;
        return originalLog.apply(console, args);
      };
    }
  } catch {}
}

// ─── Browser & Engine Detection ──────────────────────────────────────────────

let isBraveDetected = false;

/**
 * navigator.brave exists synchronously on Brave; navigator.brave.isBrave() only
 * confirms it asynchronously. The previous code waited for the promise, so every
 * call to isWebSpeechSupported() made before it resolved reported Brave as having
 * working Web Speech - which it does not, and the user got a recognizer that
 * silently fails. Treating the namespace itself as the signal is correct today
 * (no other browser ships it) and the promise result still refines it.
 */
if (typeof window !== 'undefined' && (navigator as any).brave) {
  isBraveDetected = true;
  try {
    const braveObj = (navigator as any).brave;
    if (typeof braveObj.isBrave === 'function') {
      braveObj
        .isBrave()
        .then((isBrave: boolean) => {
          isBraveDetected = !!isBrave;
          if (isBrave) {
            console.log('[ClientSpeechModel] Brave Browser detected! Recommending local client speech model.');
          }
        })
        .catch(() => {});
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
  private isStarting = false;
  private isStopped = false;
  private actualSampleRate = 16000;
  private onLevelCallback: ((level: number) => void) | null = null;

  setLevelCallback(cb: ((level: number) => void) | null) {
    this.onLevelCallback = cb;
  }

  async start(): Promise<void> {
    if (this.isRecording || this.isStarting) return;
    this.isStarting = true;
    this.isStopped = false;
    this.audioChunks = [];

    try {
      console.log('[ClientSpeechModel] Requesting microphone access...');
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone mediaDevices API is not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Handle abort if stop() was called during getUserMedia prompt
      if (this.isStopped) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        return;
      }

      this.mediaStream = stream;

      // Initialize AudioContext
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web AudioContext is not supported');
      }

      this.audioContext = new AudioContextClass();

      // Critical for Chrome/Brave/Safari/Firefox: resume AudioContext
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.isStopped) {
        this.cleanup();
        return;
      }

      this.actualSampleRate = this.audioContext.sampleRate || 44100;
      console.log('[ClientSpeechModel] AudioContext active at sampleRate:', this.actualSampleRate);

      this.mediaSource = this.audioContext.createMediaStreamSource(stream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.muteGain = this.audioContext.createGain();
      this.muteGain.gain.value = 0;

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRecording || this.isStopped) return;
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

      this.isRecording = true;
      console.log('[ClientSpeechModel] Audio capture session started successfully.');
    } catch (e) {
      this.cleanup();
      throw e;
    } finally {
      this.isStarting = false;
    }
  }

  private cleanup() {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {}
      this.mediaSource = null;
    }

    if (this.muteGain) {
      try {
        this.muteGain.disconnect();
      } catch {}
      this.muteGain = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }
  }

  stop(): Float32Array {
    this.isStopped = true;
    this.isRecording = false;

    this.cleanup();

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
/** Model the cached pipeline was built from; a change invalidates the cache. */
let cachedModelName: string | null = null;
let currentProgressInfo: ModelProgressInfo = {
  status: 'unloaded',
  progress: 0,
};
const progressListeners = new Set<ProgressCallback>();
let isLocalBundleActive = false;
let modelQuality: ModelQuality = 'fast';

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage?.getItem(MODEL_QUALITY_STORAGE_KEY);
    if (stored === 'fast' || stored === 'accurate') modelQuality = stored;
  } catch {
    // Storage can throw in private mode / when site data is blocked; the default stands.
  }
}

export function getModelQuality(): ModelQuality {
  return modelQuality;
}

/**
 * Switches the local engine between the tiny and base checkpoints.
 * Returns true when the setting actually changed, in which case the cached
 * pipeline has been dropped and the next transcription will download the new
 * model. The already-downloaded one stays in CacheStorage, so switching back is
 * free.
 */
export function setModelQuality(quality: ModelQuality): boolean {
  if (quality !== 'fast' && quality !== 'accurate') return false;
  if (quality === modelQuality) return false;

  modelQuality = quality;
  cachedPipeline = null;
  cachedModelName = null;
  broadcastProgress({ status: 'unloaded', progress: 0 });

  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(MODEL_QUALITY_STORAGE_KEY, quality);
    } catch {
      // Non-fatal: the choice simply will not survive a reload.
    }
  }
  return true;
}

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
 * Loads the standalone browser Transformers.js ES module via dynamic import.
 */
async function loadTransformersStandalone(): Promise<any> {
  if (typeof window === 'undefined') return null;

  // 1. Try local ESM distribution from /transformers/transformers.min.js
  try {
    const importDynamic = new Function('url', 'return import(url)');
    const mod = await importDynamic('/transformers/transformers.min.js');
    if (mod && (mod.AutoModelForSpeechSeq2Seq || mod.default?.AutoModelForSpeechSeq2Seq || mod.pipeline || mod.default?.pipeline)) {
      console.log('[ClientSpeechModel] Loaded local ESM Transformers.js successfully!');
      isLocalBundleActive = true;
      return mod.AutoModelForSpeechSeq2Seq || mod.pipeline ? mod : mod.default;
    }
  } catch (err) {
    console.warn('[ClientSpeechModel] Local ESM import error, trying CDN fallback...', err);
  }

  // 2. Fallback to CDN ESM distribution
  try {
    const importDynamic = new Function('url', 'return import(url)');
    const cdnMod = await importDynamic('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
    if (cdnMod && (cdnMod.AutoModelForSpeechSeq2Seq || cdnMod.default?.AutoModelForSpeechSeq2Seq || cdnMod.pipeline || cdnMod.default?.pipeline)) {
      console.log('[ClientSpeechModel] Loaded CDN ESM Transformers.js successfully!');
      isLocalBundleActive = false;
      return cdnMod.AutoModelForSpeechSeq2Seq || cdnMod.pipeline ? cdnMod : cdnMod.default;
    }
  } catch (cdnErr) {
    console.warn('[ClientSpeechModel] CDN ESM import error:', cdnErr);
  }

  return null;
}

/**
 * Initializes and downloads the client-side speech recognition model in the background.
 * Uses Transformers.js with direct Whisper-tiny models.
 */
export async function initClientSpeechModel(locale: string = 'en'): Promise<any> {
  const descriptor = resolveModelDescriptor(locale, modelQuality);

  if (cachedPipeline && cachedModelName === descriptor.name) {
    broadcastProgress({ status: 'ready', progress: 100 });
    return cachedPipeline;
  }

  // Locale or quality changed under us: the old pipeline is the wrong model.
  if (cachedPipeline && cachedModelName !== descriptor.name) {
    cachedPipeline = null;
    cachedModelName = null;
  }

  if (typeof window === 'undefined') return null;

  broadcastProgress({ status: 'downloading', progress: 10 });

  try {
    const transformers = await loadTransformersStandalone();
    if (!transformers) {
      throw new Error('Could not load standalone Transformers.js bundle.');
    }

    const {
      env,
      pipeline,
      AutoTokenizer,
      AutoProcessor,
      AutoModelForSpeechSeq2Seq,
      AutomaticSpeechRecognitionPipeline,
    } = transformers;

    if (env) {
      env.allowLocalModels = true;
      env.localModelPath = '/models/';
      env.useBrowserCache = true;
      env.allowRemoteModels = true;
      if (env.backends?.onnx) {
        // Suppress ONNX runtime graph optimization warnings (CleanUnusedInitializersAndNodeArgs)
        env.backends.onnx.logLevel = 'error';
        if (env.backends.onnx.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
          env.backends.onnx.wasm.proxy = false;
          env.backends.onnx.wasm.simd = true;
          // In ONNX Runtime Web, wasmPaths must be the directory prefix string (e.g. '/transformers/')
          // or an object keyed by the exact filenames ('ort-wasm.wasm', 'ort-wasm-simd.wasm', etc.).
          env.backends.onnx.wasm.wasmPaths = isLocalBundleActive
            ? '/transformers/'
            : 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/';
        }
      }
    }

    const modelName = descriptor.name;

    console.log(
      `[ClientSpeechModel] Initializing Whisper model (${modelName}, locale=${locale}, quality=${modelQuality})...`
    );

    const progress_callback = (progressData: any) => {
      if (progressData && progressData.status === 'progress' && progressData.total) {
        const pct = Math.round((progressData.loaded / progressData.total) * 100);
        broadcastProgress({
          status: 'downloading',
          progress: Math.min(Math.max(pct, 15), 99),
          file: progressData.file,
          loadedBytes: progressData.loaded,
          totalBytes: progressData.total,
        });
      }
    };

    const session_options = {
      logSeverityLevel: 3, // 3 = Error only (suppress warnings and info logs)
    };

    if (typeof pipeline === 'function') {
      cachedPipeline = await pipeline('automatic-speech-recognition', modelName, {
        quantized: true,
        progress_callback,
        session_options,
      });
    } else {
      const [tokenizer, processor, model] = await Promise.all([
        AutoTokenizer.from_pretrained(modelName, { progress_callback }),
        AutoProcessor.from_pretrained(modelName, { progress_callback }),
        AutoModelForSpeechSeq2Seq.from_pretrained(modelName, {
          quantized: true,
          progress_callback,
          session_options,
        }),
      ]);

      const PipelineClass = AutomaticSpeechRecognitionPipeline || transformers.Pipeline;
      cachedPipeline = new PipelineClass({
        task: 'automatic-speech-recognition',
        tokenizer,
        processor,
        model,
      });
    }

    cachedModelName = modelName;
    broadcastProgress({ status: 'ready', progress: 100 });
    console.log(`[ClientSpeechModel] Whisper model ${modelName} initialized successfully in browser memory!`);
    return cachedPipeline;
  } catch (err: any) {
    console.warn('[ClientSpeechModel] Whisper pipeline initialization error:', err);
    cachedModelName = null;
    broadcastProgress({
      status: 'error',
      progress: 0,
      error: err?.message,
    });
    return null;
  }
}

/**
 * Transcribes audio Float32Array recorded from user's microphone.
 */
export async function transcribeClientAudio(
  audioData: Float32Array,
  locale: string = 'en'
): Promise<string> {
  // Whisper is unreliable below roughly a quarter second and a shorter clip is
  // almost always an accidental key tap rather than a map name.
  if (!audioData || audioData.length < 4000) {
    console.log('[ClientSpeechModel] Audio too short (<250ms), skipping.');
    return '';
  }

  // If pipeline is not loaded, initialize it
  if (!cachedPipeline) {
    await initClientSpeechModel(locale);
  }

  if (cachedPipeline) {
    try {
      console.log(
        '[ClientSpeechModel] Running Whisper model inference on 16kHz audio buffer of length:',
        audioData.length
      );

      const descriptor = resolveModelDescriptor(locale, modelQuality);
      const durationSeconds = audioData.length / 16000;

      const options: Record<string, any> = {};

      // Chunking only pays for itself on audio longer than Whisper's 30s window.
      // A two-second voice command was being run through a 30s chunker with a 5s
      // stride, which is pure overhead on every single utterance.
      if (durationSeconds > 28) {
        options.chunk_length_s = 30;
        options.stride_length_s = 5;
      }

      // Language tokens exist only in the multilingual checkpoints. Passing one to
      // whisper-*.en is not just ignored, it can throw on tokenizer lookup.
      if (descriptor.multilingual) {
        options.language = WHISPER_LANGUAGES[locale] || 'english';
        options.task = 'transcribe';
      }

      const output = await cachedPipeline(audioData, options);

      let text = '';
      if (typeof output === 'string') {
        text = output;
      } else if (Array.isArray(output) && output.length > 0) {
        text = output
          .map((item: any) => item?.text || (typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .join(' ');
      } else if (output && typeof output.text === 'string') {
        text = output.text;
      }

      text = text.trim();
      console.log('[ClientSpeechModel] Whisper transcription result:', text);
      return text;
    } catch (e) {
      console.error('[ClientSpeechModel] Whisper inference failed:', e);
    }
  }

  return '';
}
