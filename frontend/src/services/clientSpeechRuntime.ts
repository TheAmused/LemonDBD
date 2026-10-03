import { getBraveApi, getRuntimeShimWindow, hasSpeechRecognition } from '@/utils/browserApis';
import { localeMetaFor } from '@/i18n/config';

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

export type ModelQuality = 'fast' | 'accurate';

const MODEL_QUALITY_STORAGE_KEY = 'lemondbd:voice:modelQuality';

export interface ModelDescriptor {
  name: string;
  /** Pinned Hugging Face commit, so an upstream change can never break voice input. */
  revision: string;
  approxSizeMb: number;
}

const MODEL_MATRIX: Record<ModelQuality, { english: ModelDescriptor; multilingual: ModelDescriptor }> = {
  fast: {
    english: { name: 'Xenova/whisper-tiny.en', revision: '79fb389fc764e7c395bd330e9531d9d32ada7049', approxSizeMb: 39 },
    multilingual: { name: 'Xenova/whisper-tiny', revision: '5332fcc35e32a33b86612b9a57a89be7906102b1', approxSizeMb: 42 },
  },
  accurate: {
    english: { name: 'Xenova/whisper-base.en', revision: '95bf40a508535962c6483ead40270b2e32267508', approxSizeMb: 78 },
    multilingual: { name: 'Xenova/whisper-base', revision: '64da57285918e20ea79ea5c88eed7197933abaa8', approxSizeMb: 82 },
  },
};

export function resolveModelDescriptor(locale: string = 'en', quality: ModelQuality = 'fast'): ModelDescriptor {
  const tier = MODEL_MATRIX[quality] || MODEL_MATRIX.fast;
  return localeMetaFor(locale).whisperLanguage === 'english' ? tier.english : tier.multilingual;
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
    const win = getRuntimeShimWindow();
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
      const shouldSuppress = (args: unknown[]): boolean => {
        try {
          const str = args
            .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
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

      console.warn = function (...args: unknown[]) {
        if (shouldSuppress(args)) return;
        return originalWarn.apply(console, args);
      };

      console.log = function (...args: unknown[]) {
        if (shouldSuppress(args)) return;
        return originalLog.apply(console, args);
      };
    }
  } catch {}
}

// ─── Browser & Engine Detection ──────────────────────────────────────────────

let isBraveDetected = false;

if (typeof window !== 'undefined' && getBraveApi()) {
  try {
    const braveObj = getBraveApi();
    if (typeof braveObj?.isBrave === 'function') {
      braveObj.isBrave().then((isBrave: boolean) => {
        if (isBrave) {
          isBraveDetected = true;
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
  return hasSpeechRecognition();
}

export function detectBrowser(): string {
  if (typeof window === 'undefined' || !navigator?.userAgent) return 'Unknown';
  if (isBraveDetected) return 'Brave Browser';
  const ua = navigator.userAgent;

  if (getBraveApi()) return 'Brave Browser';
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

// ─── In-Browser Client Speech Recognition Pipeline ──────────────────────────

// Structural subset of the Transformers.js CDN bundle that this module uses.
type WhisperItem = string | { text?: string };

type WhisperOutput = WhisperItem | WhisperItem[];

type SpeechPipeline = (audio: Float32Array, options: Record<string, unknown>) => Promise<WhisperOutput>;

interface DownloadProgress {
  status?: string;
  loaded?: number;
  total?: number;
  file?: string;
}

type PretrainedLoader = { from_pretrained: (name: string, options: Record<string, unknown>) => Promise<unknown> };

interface TransformersModule {
  env?: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    allowRemoteModels: boolean;
    backends?: {
      onnx?: {
        logLevel?: string;
        wasm?: { numThreads?: number; proxy?: boolean; simd?: boolean; wasmPaths?: string };
      };
    };
  };
  pipeline?: (task: string, model: string, options: Record<string, unknown>) => Promise<SpeechPipeline>;
  AutoTokenizer: PretrainedLoader;
  AutoProcessor: PretrainedLoader;
  AutoModelForSpeechSeq2Seq: PretrainedLoader;
  AutomaticSpeechRecognitionPipeline?: new (config: Record<string, unknown>) => SpeechPipeline;
  Pipeline: new (config: Record<string, unknown>) => SpeechPipeline;
  default?: TransformersModule;
}

let cachedPipeline: SpeechPipeline | null = null;

let cachedModelName: string | null = null;

let currentProgressInfo: ModelProgressInfo = {
  status: 'unloaded',
  progress: 0,
};

const progressListeners = new Set<ProgressCallback>();

let modelQuality: ModelQuality = 'fast';

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage?.getItem(MODEL_QUALITY_STORAGE_KEY);
    if (stored === 'fast' || stored === 'accurate') modelQuality = stored;
  } catch {}
}

export function getModelQuality(): ModelQuality {
  return modelQuality;
}

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
    } catch {}
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

// Runtime and models are NOT bundled with the app: the browser fetches the
// pinned Transformers.js build (and its ONNX wasm) from jsDelivr and the Whisper
// weights from the Hugging Face Hub, then keeps them in the browser cache.
const TRANSFORMERS_VERSION = '2.17.2';

const TRANSFORMERS_CDN = `https://cdn.jsdelivr.net/npm/@xenova/transformers@${TRANSFORMERS_VERSION}/dist/`;

/**
 * Loads the standalone browser Transformers.js ES module from the CDN.
 */
async function loadTransformersStandalone(): Promise<TransformersModule | null> {
  if (typeof window === 'undefined') return null;

  try {
    const importDynamic = new Function('url', 'return import(url)');
    const mod: TransformersModule | undefined = await importDynamic(`${TRANSFORMERS_CDN}transformers.min.js`);
    if (mod && (mod.AutoModelForSpeechSeq2Seq || mod.default?.AutoModelForSpeechSeq2Seq || mod.pipeline || mod.default?.pipeline)) {
      return mod.AutoModelForSpeechSeq2Seq || mod.pipeline ? mod : mod.default ?? null;
    }
  } catch (err) {
    console.warn('[ClientSpeechModel] Transformers.js CDN import error:', err);
  }

  return null;
}

/**
 * Initializes and downloads the client-side speech recognition model in the background.
 * Uses Transformers.js with direct Whisper-tiny models.
 */
export async function initClientSpeechModel(locale: string = 'en'): Promise<SpeechPipeline | null> {
  const descriptor = resolveModelDescriptor(locale, modelQuality);

  if (cachedPipeline && cachedModelName === descriptor.name) {
    broadcastProgress({ status: 'ready', progress: 100 });
    return cachedPipeline;
  }

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
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.allowRemoteModels = true;
      if (env.backends?.onnx) {
        // Suppress ONNX runtime graph optimization warnings (CleanUnusedInitializersAndNodeArgs)
        env.backends.onnx.logLevel = 'error';
        if (env.backends.onnx.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
          env.backends.onnx.wasm.proxy = false;
          env.backends.onnx.wasm.simd = true;
          // ONNX Runtime Web wasmPaths is the directory prefix the runtime picks its wasm from.
          env.backends.onnx.wasm.wasmPaths = TRANSFORMERS_CDN;
        }
      }
    }

    const modelName = descriptor.name;
    const revision = descriptor.revision;
    const progress_callback = (progressData: DownloadProgress) => {
      if (progressData && progressData.status === 'progress' && progressData.total) {
        const pct = Math.round(((progressData.loaded ?? 0) / progressData.total) * 100);
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
        revision,
        progress_callback,
        session_options,
      });
    } else {
      const [tokenizer, processor, model] = await Promise.all([
        AutoTokenizer.from_pretrained(modelName, { revision, progress_callback }),
        AutoProcessor.from_pretrained(modelName, { revision, progress_callback }),
        AutoModelForSpeechSeq2Seq.from_pretrained(modelName, {
          quantized: true,
          revision,
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
    return cachedPipeline;
  } catch (err) {
    console.warn('[ClientSpeechModel] Whisper pipeline initialization error:', err);
    cachedModelName = null;
    broadcastProgress({
      status: 'error',
      progress: 0,
      error: err instanceof Error ? err.message : undefined,
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
  if (!audioData || audioData.length < 1600) {
    return '';
  }

  // If pipeline is not loaded, initialize it
  if (!cachedPipeline) {
    await initClientSpeechModel(locale);
  }

  if (cachedPipeline) {
    try {
      const whisperLanguage = localeMetaFor(locale).whisperLanguage;
      const isEnglish = whisperLanguage === 'english';
      const options: Record<string, unknown> = {
        chunk_length_s: 30,
        stride_length_s: 5,
      };

      // Whisper English-only models (whisper-tiny.en) do NOT accept language tokens in vocabulary
      if (!isEnglish) {
        options.language = whisperLanguage;
        options.task = 'transcribe';
      }

      const output = await cachedPipeline(audioData, options);

      let text = '';
      if (typeof output === 'string') {
        text = output;
      } else if (Array.isArray(output) && output.length > 0) {
        text = output
          .map((item) => (typeof item === 'string' ? item : item?.text ?? ''))
          .filter(Boolean)
          .join(' ');
      } else if (output && !Array.isArray(output) && typeof output.text === 'string') {
        text = output.text;
      }

      text = text.trim();
      return text;
    } catch (e) {
      console.error('[ClientSpeechModel] Whisper inference failed:', e);
    }
  }

  return '';
}
