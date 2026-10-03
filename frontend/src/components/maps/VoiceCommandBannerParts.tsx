'use client';

import React from 'react';
import dynamic from 'next/dynamic';

export const VoiceEngineInfoModal = dynamic(
  () => import('./VoiceEngineInfoModal').then((m) => m.VoiceEngineInfoModal),
  { ssr: false }
);

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent {
  error: string;
}

export type WindowWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitAudioContext?: typeof AudioContext;
  };

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const win = window as WindowWithSpeech;
    const AudioCtx = win.AudioContext || win.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => { });
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function playMicStartSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(540, now);
    osc1.frequency.exponentialRampToValueAtTime(760, now + 0.1);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.05);
    gain2.gain.setValueAtTime(0.1, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.16);
  } catch {
    // Audio feedback is non-critical
  }
}

export function playMatchSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.055;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch {
    // Audio feedback is non-critical
  }
}

const HOLD_KEY_HINT_FALLBACK = 'Hold {key} to talk, or tap the mic and say a map name';

const TAP_HINT_FALLBACK = 'Tap the mic and say a map name';

/** Splits a "...{key}..." hint string around the `{key}` placeholder and
 * renders the key as a styled <kbd> chip inline, so it reads as part of
 * the sentence rather than a separate control. */
export function renderHoldKeyHint(template: string | undefined, key: string): React.ReactNode {
  const text = template || HOLD_KEY_HINT_FALLBACK;
  const [before, after] = text.split('{key}');
  if (after === undefined) {
    return <span>{text}</span>;
  }

  const trimmedBefore = before.trimEnd();
  // Check if `after` starts with punctuation (e.g. ", aby mówić...")
  // so the punctuation stays attached to the <kbd> chip and never wraps onto a new line by itself.
  const punctMatch = after.match(/^([,\.\?!;:、。])\s*(.*)$/);
  const trailingPunct = punctMatch ? punctMatch[1] : '';
  const remainingAfter = punctMatch ? punctMatch[2] : after.trimStart();
  const needsSpace = !punctMatch && after.startsWith(' ');
  const leadingSpace = (trailingPunct || needsSpace) && remainingAfter ? ' ' : '';

  return (
    <span className="inline">
      <span className="whitespace-nowrap">
        {trimmedBefore && <span>{`${trimmedBefore}\u00A0`}</span>}
        <kbd className="inline-flex items-center justify-center rounded border border-border-color bg-bg-elevated px-1.5 py-0.5 type-caption text-accent-amber shadow-xs align-middle">
          {key}
        </kbd>
        {trailingPunct && <span>{trailingPunct}</span>}
      </span>
      {remainingAfter ? `${leadingSpace}${remainingAfter}` : ''}
    </span>
  );
}
