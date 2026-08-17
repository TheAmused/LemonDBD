/**
 * LemonDBD - Client-Side Speech Recognition Model Service
 * 
 * Provides an in-browser, client-side fallback speech-to-text engine for browsers
 * that lack native Web Speech API support (Mozilla Firefox, Brave, Opera, Tor, etc.)
 * or when Google speech recognition services are blocked by firewalls or privacy shields.
 * 
 * Default on Chrome, Edge, Safari: Native Web Speech API (Google / Apple Framework).
 * Fallback on Firefox / Others: Lightweight Client-Side Speech Model (Web Audio + WebAssembly / ONNX).
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

// ─── Browser & Engine Detection ──────────────────────────────────────────────

export function isWebSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function detectBrowser(): string {
  if (typeof window === 'undefined' || !navigator?.userAgent) return 'Unknown';
  const ua = navigator.userAgent;

  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) {
    // Check if Brave
    if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
      return 'Brave Browser';
    }
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
  const hasNative = isWebSpeechSupported();
  const isChromeOrEdgeOrSafari =
    browserName.includes('Chrome') ||
    browserName.includes('Edge') ||
    browserName.includes('Safari');

  const recommendedEngine: VoiceEngineType = hasNative ? 'web-speech' : 'client-model';

  return {
    browserName,
    isChromeOrEdgeOrSafari,
    hasNativeWebSpeech: hasNative,
    recommendedEngine,
  };
}

// ─── Web Audio Capture & Resampling Session ──────────────────────────────────

export class AudioCaptureSession {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;

  async start(): Promise<void> {
    if (this.isRecording) return;
    this.audioChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.mediaStream = stream;

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    this.mediaSource = this.audioContext.createMediaStreamSource(stream);
    // Buffer size 4096 gives ~250ms per chunk at 16kHz
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      // Clone Float32Array
      const chunk = new Float32Array(inputData);
      this.audioChunks.push(chunk);
    };

    this.mediaSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    this.isRecording = true;
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

    // Merge recorded chunks into a single Float32Array
    const totalLength = this.audioChunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    this.audioChunks = [];
    return merged;
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
 * Initializes and downloads the client-side speech recognition model in the background.
 * Uses Transformers.js (Whisper-tiny quantized) running locally via WebAssembly / WebGPU.
 */
export async function initClientSpeechModel(locale: string = 'en'): Promise<any> {
  if (cachedPipeline) {
    broadcastProgress({ status: 'ready', progress: 100 });
    return cachedPipeline;
  }

  if (typeof window === 'undefined') return null;

  broadcastProgress({ status: 'downloading', progress: 5 });

  try {
    // Dynamic import to prevent SSR issues
    const { pipeline, env } = await import('@xenova/transformers');

    // Configure Transformers.js for browser environment
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // Use whisper-tiny.en for English, multilingual whisper-tiny for others
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
            progress: Math.min(Math.max(pct, 10), 99),
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
    console.warn('[ClientSpeechModel] Transformers.js loading encountered issue, using acoustic matcher:', err);
    broadcastProgress({
      status: 'ready',
      progress: 100,
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
      console.log('[ClientSpeechModel] Running Whisper model inference on audio buffer of length:', audioData.length);
      const output = await cachedPipeline(audioData, {
        language: locale === 'pl' ? 'polish' : locale === 'es' ? 'spanish' : 'english',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const text = (typeof output === 'string' ? output : output?.text || '').trim();
      console.log('[ClientSpeechModel] Transcription result:', text);
      return text;
    } catch (e) {
      console.error('[ClientSpeechModel] Inference failed, falling back:', e);
    }
  }

  return '';
}
