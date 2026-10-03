// frontend/src/services/clientSpeechModel.ts
import { getAudioContextCtor } from '@/utils/browserApis';
import { resampleTo16k, normalizeAudioVolume } from "./clientSpeechRuntime";
// ─── Environment Polyfills for Turbopack & Browser Runtime ───────────────────
// ─── Browser & Engine Detection ──────────────────────────────────────────────
// ─── Audio Resampling & Normalization Helpers ────────────────────────────────
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
        getAudioContextCtor();
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
    return normalized;
  }
}

// ─── In-Browser Client Speech Recognition Pipeline ──────────────────────────

// Structural subset of the Transformers.js CDN bundle that this module uses.
// Runtime and models are NOT bundled with the app: the browser fetches the
// pinned Transformers.js build (and its ONNX wasm) from jsDelivr and the Whisper
// weights from the Hugging Face Hub, then keeps them in the browser cache.
export { resolveModelDescriptor, isWebSpeechSupported, detectBrowser, getBrowserCompatibility, resampleTo16k, normalizeAudioVolume, getModelQuality, setModelQuality, subscribeModelProgress, getModelProgress, initClientSpeechModel, transcribeClientAudio } from "./clientSpeechRuntime";
export type { VoiceEngineType, ModelQuality, ModelDescriptor, ModelLoadingStatus, ModelProgressInfo, ProgressCallback, BrowserCompatibilityInfo } from "./clientSpeechRuntime";
