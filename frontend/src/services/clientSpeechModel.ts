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
 * Loads the standalone browser Transformers.js distribution from /transformers/transformers.min.js
 * or jsdelivr CDN. This avoids Turbopack trying to bundle node-specific fs/path modules.
 */
async function loadTransformersStandalone(): Promise<any> {
  if (typeof window === 'undefined') return null;

  const win = window as any;
  if (win.transformers && win.transformers.AutoModelForSpeechSeq2Seq) {
    return win.transformers;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-transformers-bundle]');
    if (existing) {
      if (win.transformers) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
      }
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-transformers-bundle', 'true');
    script.src = '/transformers/transformers.min.js';
    script.async = true;
    script.onload = () => {
      console.log('[ClientSpeechModel] Loaded local standalone Transformers.js bundle!');
      resolve();
    };
    script.onerror = (err) => {
      console.warn('[ClientSpeechModel] Local script load failed, trying CDN fallback...', err);
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
      cdnScript.async = true;
      cdnScript.onload = () => resolve();
      cdnScript.onerror = (cdnErr) => reject(cdnErr);
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  });

  return win.transformers;
}

/**
 * Initializes and downloads the client-side speech recognition model in the background.
 * Uses Transformers.js with direct Whisper-tiny models.
 */
export async function initClientSpeechModel(locale: string = 'en'): Promise<any> {
  if (cachedPipeline) {
    broadcastProgress({ status: 'ready', progress: 100 });
    return cachedPipeline;
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
      AutoTokenizer,
      AutoProcessor,
      AutoModelForSpeechSeq2Seq,
      AutomaticSpeechRecognitionPipeline,
    } = transformers;

    if (env) {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.allowRemoteModels = true;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.wasmPaths = '/transformers/';
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
      }
    }

    const modelName =
      locale === 'en' ? 'Xenova/whisper-tiny.en' : 'Xenova/whisper-tiny';

    console.log(`[ClientSpeechModel] Initializing Whisper model (${modelName})...`);

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

    const [tokenizer, processor, model] = await Promise.all([
      AutoTokenizer.from_pretrained(modelName, { progress_callback }),
      AutoProcessor.from_pretrained(modelName, { progress_callback }),
      AutoModelForSpeechSeq2Seq.from_pretrained(modelName, {
        quantized: true,
        progress_callback,
      }),
    ]);

    cachedPipeline = new AutomaticSpeechRecognitionPipeline({
      task: 'automatic-speech-recognition',
      tokenizer,
      processor,
      model,
    });

    broadcastProgress({ status: 'ready', progress: 100 });
    console.log(`[ClientSpeechModel] Whisper model ${modelName} initialized successfully in browser memory!`);
    return cachedPipeline;
  } catch (err: any) {
    console.warn('[ClientSpeechModel] Whisper pipeline initialization error:', err);
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
  if (!audioData || audioData.length < 1600) {
    console.log('[ClientSpeechModel] Audio too short (<100ms), skipping.');
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
      const output = await cachedPipeline(audioData, {
        language: locale === 'pl' ? 'polish' : locale === 'es' ? 'spanish' : 'english',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const text = (typeof output === 'string' ? output : output?.text || '').trim();
      console.log('[ClientSpeechModel] Whisper transcription result:', text);
      return text;
    } catch (e) {
      console.error('[ClientSpeechModel] Whisper inference failed:', e);
    }
  }

  return '';
}
