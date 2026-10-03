// Typed access to vendor-prefixed / non-standard browser APIs, so callers never cast to `any`.

interface LegacyWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  process?: { env: Record<string, string>; browser: boolean; versions?: Record<string, string> };
  global?: unknown;
  __onnxLogFilterInstalled?: boolean;
}

interface BraveNavigator extends Navigator {
  brave?: { isBrave?: () => Promise<boolean> };
}

const legacyWindow = (): LegacyWindow => window as LegacyWindow;

/** AudioContext constructor, falling back to the WebKit-prefixed one. */
export function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || legacyWindow().webkitAudioContext;
}

/** True when the Web Speech API (standard or WebKit-prefixed) exists. */
export function hasSpeechRecognition(): boolean {
  const w = legacyWindow();
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Brave's `navigator.brave` object, when present. */
export function getBraveApi(): BraveNavigator['brave'] {
  return (navigator as BraveNavigator).brave;
}

/** Window with the optional globals the ONNX runtime shim sets. */
export function getRuntimeShimWindow(): LegacyWindow {
  return legacyWindow();
}
