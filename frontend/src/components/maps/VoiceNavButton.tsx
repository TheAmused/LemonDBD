'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';

type VoiceState = 'idle' | 'listening' | 'processing' | 'navigating' | 'nomatch' | 'error';

// Known DBD map names — matched against the spoken transcript
// Each entry is the canonical spoken form the user would say
const DBD_MAP_NAMES: string[] = [
  "Autohaven Wreckers",
  "Azarov's Resting Place",
  "Blood Lodge",
  "Gas Heaven",
  "Wretched Shop",
  "Coldwind Farm",
  "Rotten Fields",
  "Thompson House",
  "Torment Creek",
  "Growling Storehouse",
  "The Game",
  "Gideon Meat Plant",
  "Gideon's Meat Plant",
  "Haddonfield",
  "Lampkin Lane",
  "Hawkins National Laboratory",
  "The Underground Complex",
  "Underground Complex",
  "Lery's Memorial Institute",
  "Treatment Theatre",
  "MacMillan Estate",
  "Coal Tower",
  "Groaning Storehouse",
  "Suffocation Pit",
  "Mount Ormond Resort",
  "Mount Ormond",
  "Ormond",
  "Red Forest",
  "Mother's Dwelling",
  "Temple of Purgation",
  "The Swamp",
  "Pale Rose",
  "Grim Pantry",
  "Springwood",
  "Badham Preschool",
  "Raccoon City",
  "Dead Dawg Saloon",
  "Midwich Elementary School",
  "Eyrie of Crows",
  "Garden of Joy",
  "Shattered Square",
  "Forgotten Ruins",
  "The Decimated Borgo",
  "Borgo",
  "Toba Landing",
  "Greenville Square",
  "Father Campbell's Chapel",
  "Campbell's Chapel",
  "Ironworks of Misery",
  "Family Residence",
];

interface VoiceNavButtonProps {
  locale?: string;
}

export default function VoiceNavButton({ locale = 'en' }: VoiceNavButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [matchedMap, setMatchedMap] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SpeechRecognition) setIsSupported(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Fuzzy match: find the best DBD map name that the transcript contains or is contained by
  const findMapMatch = useCallback((spoken: string): string | null => {
    const lower = spoken.toLowerCase().trim();
    // Exact or partial match
    for (const name of DBD_MAP_NAMES) {
      if (lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)) {
        return name;
      }
    }
    return null;
  }, []);

  const startListening = useCallback(() => {
    if (voiceState === 'listening') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setVoiceState('idle');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceState('error'); return; }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    recognition.onstart = () => {
      setVoiceState('listening');
      setTranscript('');
      setMatchedMap('');
    };

    recognition.onend = () => {
      setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setVoiceState('error');
      } else if (event.error === 'no-speech') {
        setVoiceState('nomatch');
        timeoutRef.current = setTimeout(() => setVoiceState('idle'), 2500);
      } else {
        setVoiceState('idle');
      }
    };

    recognition.onresult = (event: any) => {
      setVoiceState('processing');

      // Collect all alternatives for best-effort matching
      const allTranscripts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          allTranscripts.push(event.results[i][j].transcript);
        }
      }

      const primaryTranscript = allTranscripts[0] || '';
      setTranscript(primaryTranscript);

      let match: string | null = null;
      for (const t of allTranscripts) {
        match = findMapMatch(t);
        if (match) break;
      }

      if (match) {
        setMatchedMap(match);
        setVoiceState('navigating');
        timeoutRef.current = setTimeout(() => {
          // Navigate to maps page, passing the matched map name so it auto-opens
          router.push(`/${locale}/maps?mapName=${encodeURIComponent(match!)}`);
          timeoutRef.current = setTimeout(() => {
            setVoiceState('idle');
            setTranscript('');
            setMatchedMap('');
          }, 2000);
        }, 600);
      } else {
        setVoiceState('nomatch');
        timeoutRef.current = setTimeout(() => setVoiceState('idle'), 2500);
      }
    };

    recognition.start();
  }, [voiceState, findMapMatch, locale, router]);

  // ─── State-based display config ────────────────────────────────────────────
  const stateConfig: Record<VoiceState, {
    label: string; subtext: string; ringClass: string; btnClass: string; icon: any;
  }> = {
    idle: {
      label: 'Push to Speak',
      subtext: 'Say a map name to open it',
      ringClass: 'ring-cyan-500/20',
      btnClass: 'bg-gradient-to-br from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 shadow-cyan-900/40',
      icon: Mic,
    },
    listening: {
      label: 'Listening…',
      subtext: 'Speak a DBD map name',
      ringClass: 'ring-red-500/50 animate-pulse',
      btnClass: 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/50',
      icon: Volume2,
    },
    processing: {
      label: 'Processing…',
      subtext: 'Matching your command',
      ringClass: 'ring-amber-500/40',
      btnClass: 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-amber-900/40',
      icon: Mic,
    },
    navigating: {
      label: 'Opening map…',
      subtext: matchedMap ? `→ ${matchedMap}` : '',
      ringClass: 'ring-emerald-500/50',
      btnClass: 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-900/40',
      icon: Navigation,
    },
    nomatch: {
      label: 'No Match',
      subtext: 'Try again with a map name',
      ringClass: 'ring-slate-500/30',
      btnClass: 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-900/30',
      icon: MicOff,
    },
    error: {
      label: 'Mic Blocked',
      subtext: 'Allow microphone access in browser settings',
      ringClass: 'ring-red-500/40',
      btnClass: 'bg-gradient-to-br from-red-700 to-red-900 shadow-red-900/40',
      icon: AlertCircle,
    },
  };

  const cfg = stateConfig[voiceState];
  const Icon = cfg.icon;
  const isClickable = voiceState === 'idle' || voiceState === 'listening';

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-500 backdrop-blur-sm">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
        <span>Voice commands require Chrome, Edge, or Safari.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* ── Mic button with animated rings ── */}
      <div className="relative flex shrink-0 items-center justify-center">
        <span
          className={`absolute h-16 w-16 rounded-full ring-4 transition-all duration-300 ${cfg.ringClass}`}
        />
        {voiceState === 'listening' && (
          <>
            <span className="absolute h-20 w-20 animate-ping rounded-full bg-red-500/10" />
            <span className="absolute h-24 w-24 animate-ping rounded-full bg-red-500/5 [animation-delay:150ms]" />
          </>
        )}
        <button
          id="voice-nav-btn"
          onClick={startListening}
          disabled={!isClickable}
          aria-label={cfg.label}
          aria-pressed={voiceState === 'listening'}
          className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${cfg.btnClass} ${isClickable ? 'cursor-pointer active:scale-95 hover:scale-105' : 'cursor-not-allowed opacity-80'}`}
        >
          <Icon className={`h-6 w-6 ${voiceState === 'listening' ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* ── Text info ── */}
      <div className="flex min-w-0 flex-col gap-1 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <span className={`text-sm font-bold transition-colors ${
            voiceState === 'listening' ? 'text-red-400'
            : voiceState === 'navigating' ? 'text-emerald-400'
            : voiceState === 'nomatch' || voiceState === 'error' ? 'text-slate-400'
            : 'text-slate-100'
          }`}>
            {cfg.label}
          </span>
          {voiceState === 'navigating' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        </div>

        <p className="text-xs text-slate-500">{cfg.subtext}</p>

        {transcript && voiceState !== 'idle' && (
          <div className="mt-1 inline-flex max-w-[240px] items-center gap-1.5 self-center rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 sm:self-start">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
            <span className="truncate text-[11px] font-medium text-slate-300">
              &ldquo;{transcript}&rdquo;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
