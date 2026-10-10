'use client';
// frontend/src/components/maps/voice/VoiceMicButton.tsx

import React from 'react';
import type { RefObject } from 'react';
import type { VoiceStatusConfigEntry } from './voiceStatusConfig';
import type { VoiceStatusState } from './voiceTypes';

interface VoiceMicButtonProps {
  voiceStatus: VoiceStatusState;
  currentCfg: VoiceStatusConfigEntry;
  isListeningRef: RefObject<boolean>;
  isHoldingRef: RefObject<boolean>;
  holdStartTimeRef: RefObject<number>;
  mouseDownListeningStateRef: RefObject<boolean>;
  startListening: (isHold?: boolean) => Promise<void>;
  stopListeningAndProcess: () => Promise<void>;
}

/** The push-to-talk mic button: hold to talk, or click to toggle. */
export function VoiceMicButton({
  voiceStatus,
  currentCfg,
  isListeningRef,
  isHoldingRef,
  holdStartTimeRef,
  mouseDownListeningStateRef,
  startListening,
  stopListeningAndProcess,
}: VoiceMicButtonProps) {
  const StatusIcon = currentCfg.icon;

  return (
    <div className="flex items-center justify-center">
     <div className="relative inline-flex items-center justify-center">
      {voiceStatus === 'listening' && (
        <>
          <span className="absolute h-20 w-20 animate-ping rounded-full bg-accent-red/20 pointer-events-none" aria-hidden="true" />
          <span className="absolute h-24 w-24 animate-ping rounded-full bg-accent-red/10 [animation-delay:200ms] pointer-events-none" aria-hidden="true" />
        </>
      )}

      <button
        id="voice-command-mic-btn"
        type="button"
        onTouchStart={() => {
          mouseDownListeningStateRef.current =
            isListeningRef.current || voiceStatus === 'listening';
          isHoldingRef.current = true;
          holdStartTimeRef.current = Date.now();
          if (!isListeningRef.current) {
            startListening(true);
          }
        }}
        onTouchEnd={(e) => {
          const duration =
            holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
          isHoldingRef.current = false;
          if (duration > 250 && isListeningRef.current) {
            e.preventDefault();
            stopListeningAndProcess();
          }
        }}
        onMouseDown={() => {
          mouseDownListeningStateRef.current =
            isListeningRef.current || voiceStatus === 'listening';
          isHoldingRef.current = true;
          holdStartTimeRef.current = Date.now();
          if (!isListeningRef.current) {
            startListening(true);
          }
        }}
        onMouseUp={() => {
          const duration =
            holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
          isHoldingRef.current = false;
          if (duration > 250 && isListeningRef.current) {
            stopListeningAndProcess();
          }
        }}
        onMouseLeave={() => {
          if (isHoldingRef.current) {
            const duration =
              holdStartTimeRef.current > 0 ? Date.now() - holdStartTimeRef.current : 0;
            isHoldingRef.current = false;
            if (duration > 250 && isListeningRef.current) {
              stopListeningAndProcess();
            }
          }
        }}
        onClick={() => {
          const isClickFromMouse = holdStartTimeRef.current > 0;
          const duration = isClickFromMouse ? Date.now() - holdStartTimeRef.current : 0;
          holdStartTimeRef.current = 0;

          if (duration > 250) return;

          if (isListeningRef.current || voiceStatus === 'listening') {
            if (!isClickFromMouse || mouseDownListeningStateRef.current) {
              stopListeningAndProcess();
            }
          } else {
            startListening(false);
          }
        }}
        aria-label={currentCfg.badge || ''}
        aria-pressed={voiceStatus === 'listening'}
        className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-[1.4rem] shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-red/50 cursor-pointer active:scale-95 hover:scale-105 select-none ${currentCfg.buttonColor}`}
      >
        <StatusIcon
          className={`h-7 w-7 ${voiceStatus === 'listening' ? 'animate-bounce' : ''}`}
          aria-hidden="true"
        />
      </button>

     </div>
    </div>
  );
}
