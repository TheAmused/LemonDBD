'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Gamepad2,
  ArrowLeft,
  Trophy,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Lock,
  Skull,
  HelpCircle,
  Eye,
  Settings,
  Compass,
  Sparkles
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { QuestsModal } from '@/components/QuestsModal';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';

// Interfaces matching backend models
interface Character {
  name: string;
  real_name: string;
  category: string;
  avatar_local_path?: string;
  avatar_url?: string;
}

interface Perk {
  name: string;
  character: string;
  character_real_name?: string;
  category: string;
  description: string;
  icon_local_path: string;
  icon_url: string;
}

interface GuesserStat {
  guesser_type: string;
  current_streak: number;
  best_streak: number;
  total_guesses: number;
  correct_guesses: number;
}

interface MaskedWord {
  word: string;
  isWord: boolean;
  isMasked: boolean;
}

interface DifficultyEffects {
  grayscale: boolean;
  rotate: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface Question {
  type: 'real_to_name' | 'name_to_real' | 'power_to_killer' | 'description' | 'name_to_icon' | 'icon_to_name' | 'avatar_to_name' | 'memes';
  questionText: string;
  targetPerk?: Perk;
  targetCharacter?: Character;
  options: any[]; // Array of strings (names) or Perks (for icon choices)
  correctIndex: number;
  maskedDescription?: MaskedWord[];
  difficultyEffects?: DifficultyEffects;
}

const MEME_QUESTIONS = [
  {
    questionText: "How is Meg Thomas often called by the DBD community due to her stereotypical gameplay?",
    options: ["Meghead", "Megamind", "Sprint Master", "Brainless Meg"],
    correctIndex: 0
  },
  {
    questionText: "What is Nea Karlsson's true identity according to popular community memes?",
    options: ["The Entity", "The Pig's sister", "A secret Killer", "The Entity's boss"],
    correctIndex: 0
  },
  {
    questionText: "Which Killer do survivors famously try to 'Boop the Snoot'?",
    options: ["The Pig", "The Trapper", "The Ghost Face", "The Demogorgon"],
    correctIndex: 0
  },
  {
    questionText: "Which survivor is most famously stereotyped as 'Self-Caring in the corner of the map'?",
    options: ["Claudette Morel", "Meg Thomas", "Feng Min", "Dwight Fairfield"],
    correctIndex: 0
  },
  {
    questionText: "Where is Dwight Fairfield famously stereotyped to hide at the start of a match?",
    options: ["Inside a locker", "In the basement", "Behind a generator", "In the exit gate"],
    correctIndex: 0
  },
  {
    questionText: "What do survivors famously do at the exit gate to taunt the Killer?",
    options: ["Teabag repeatedly", "Point at the sky", "Drop all their items", "Give a thumbs up"],
    correctIndex: 0
  },
  {
    questionText: "Which Killer is notoriously associated with facecamping survivors in the basement?",
    options: ["The Cannibal (Bubba)", "The Hillbilly", "The Wraith", "The Trapper"],
    correctIndex: 0
  },
  {
    questionText: "What is the famous opening phrase used by DBD content creator Otzdarva in his videos?",
    options: ["Hello friends, this is Otz", "Welcome back survivors", "Today we are playing DBD", "What's up guys, Otz here"],
    correctIndex: 0
  },
  {
    questionText: "Which survivor offering is famously referred to as the 'Salt offering'?",
    options: ["Vigo's Jar of Salty Lips", "Salty Finger", "Jar of Tears", "Slightly Salty Lips"],
    correctIndex: 0
  },
  {
    questionText: "What is the name of the legendary 'god-tier' survivor perk that has 0 tokens, breaks you permanently, and is the ultimate meme?",
    options: ["No Mither", "Self-Care", "Slippery Meat", "Up the Ante"],
    correctIndex: 0
  }
];

export default function GuesserPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<any>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  // Game Data
  const [characters, setCharacters] = useState<Character[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [stats, setStats] = useState<Record<string, GuesserStat>>({});
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Active Game State
  const [activeMode, setActiveMode] = useState<
    'dashboard' | 'character' | 'perk_description' | 'perk_name_to_icon' | 'perk_icon_to_name' | 'map' | 'memes'
  >('dashboard');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'answered'>('playing');
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [submittingStats, setSubmittingStats] = useState<boolean>(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Load Translations
  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  // Fetch Characters, Perks & Streaks Stats
  const loadStatsAndData = useCallback(async () => {
    try {
      const [perksRes, charsRes, statsRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/perks?limit=1000`),
        fetch(`${backendBase}/api/v1/characters`),
        fetch(`${backendBase}/api/v1/guesser/stats`)
      ]);

      if (perksRes.ok) {
        const pData = await perksRes.json();
        const list = pData.data || [];
        setPerks(list);
        setTotalPerksCount(pData.pagination?.total || list.length);
        setSurvivorCount(list.filter((p: any) => p.category === 'Survivor').length);
        setKillerCount(list.filter((p: any) => p.category === 'Killer').length);
      }

      if (charsRes.ok) {
        const cData = await charsRes.json();
        const list = cData.data || [];
        setCharacters(list);
        setCharacterCount(cData.count || list.length);
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.data || {});
      }
    } catch (err) {
      console.error('Failed to load guesser data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [backendBase]);

  useEffect(() => {
    loadStatsAndData();
  }, [loadStatsAndData]);

  // Clean flavor text from perk description
  const cleanFlavorText = (desc: string): string => {
    if (!desc) return '';
    const parts = desc.split(/\n\s*["“\"'`”]/);
    return parts[0].trim();
  };

  // Helper to fetch local perk icon asset
  const getPerkIconUrl = (perk: Perk) => {
    const rawPath = perk.icon_local_path || '';
    if (!rawPath) return perk.icon_url || '';
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  };

  // Helper to fetch local character avatar asset
  const getAvatarUrl = (char: Character) => {
    let rawPath = char.avatar_local_path;
    if (!rawPath && char.name) {
      const subDir = char.category?.toLowerCase() === 'survivor' ? 'survivors' : 'killers';
      const sanitized = char.name
        .toLowerCase()
        .trim()
        .replace(/[\s\-/]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      rawPath = `avatars/${subDir}/${sanitized}.png`;
    }
    if (!rawPath) return char.avatar_url || '';
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  };

  // Get current streak for the active mode
  const getActiveStreak = (): number => {
    if (activeMode === 'dashboard') return 0;
    return stats[activeMode]?.current_streak || 0;
  };

  // Generate difficulty transformations based on current streak
  const generateDifficultyEffects = (streak: number): DifficultyEffects => {
    const grayscale = streak >= 3;
    const rotate = streak >= 6 ? [90, 180, 270][Math.floor(Math.random() * 3)] : 0;
    const scale = streak >= 10 ? 2.3 : 1.0;
    const offsetX = streak >= 10 ? (Math.random() * 24 - 12) : 0;
    const offsetY = streak >= 10 ? (Math.random() * 24 - 12) : 0;
    return { grayscale, rotate, scale, offsetX, offsetY };
  };

  // Play audio feedbacks
  const playFeedbackSound = (correct: boolean) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (correct) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130.81, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  // Generate next question based on active mode
  const generateQuestion = useCallback(() => {
    if (activeMode === 'dashboard' || activeMode === 'map') return;

    setGameState('playing');
    setSelectedAnswerIndex(null);

    const activeStreak = stats[activeMode]?.current_streak || 0;

    if (activeMode === 'character') {
      if (characters.length < 5) return;
      const qTypes: ('real_to_name' | 'name_to_real' | 'power_to_killer' | 'avatar_to_name')[] = [
        'real_to_name',
        'name_to_real',
        'power_to_killer',
        'avatar_to_name'
      ];
      const selectedType = qTypes[Math.floor(Math.random() * qTypes.length)];

      if (selectedType === 'power_to_killer') {
        const killerPowerMapKeys = [
          'The Trapper', 'The Wraith', 'The Hillbilly', 'The Nurse', 'The Shape',
          'The Hag', 'The Doctor', 'The Huntress', 'The Cannibal', 'The Nightmare',
          'The Pig', 'The Clown', 'The Spirit', 'The Legion', 'The Plague',
          'The Ghost Face', 'The Deathslinger', 'The Executioner', 'The Oni',
          'The Blight', 'The Twins', 'The Trickster', 'The Artist', 'The Mastermind',
          'The Knight', 'The Skull Merchant', 'The Singularity', 'The Good Guy',
          'The Unknown'
        ];
        const randomKillerName = killerPowerMapKeys[Math.floor(Math.random() * killerPowerMapKeys.length)];
        const killerDetail = characters.find(c => c.name.toLowerCase() === randomKillerName.toLowerCase());
        
        const powerNames: Record<string, string> = {
          'The Trapper': 'Bear Trap',
          'The Wraith': 'Wailing Bell',
          'The Hillbilly': 'Chainsaw',
          'The Nurse': "Spencer's Last Breath",
          'The Shape': 'Evil Within',
          'The Hag': 'Blackened Catalyst',
          'The Doctor': "Carter's Spark",
          'The Huntress': 'Hunting Hatchets',
          'The Cannibal': "Bubba's Chainsaw",
          'The Nightmare': 'Dream Demon',
          'The Pig': "Jigsaw's Baptism",
          'The Clown': 'Afterpiece Tonic',
          'The Spirit': "Yamaoka's Haunting",
          'The Legion': 'Feral Frenzy',
          'The Plague': 'Vile Purge',
          'The Ghost Face': 'Night Shroud',
          'The Deathslinger': 'The Redeemer',
          'The Executioner': 'Rites of Judgement',
          'The Oni': "Yamaoka's Wrath",
          'The Blight': 'Blighted Corruption',
          'The Twins': 'Blood Bond',
          'The Trickster': 'Show-Stopper',
          'The Artist': 'Birds of Torment',
          'The Mastermind': 'Virulent Bound',
          'The Knight': 'Guardia Compagnia',
          'The Skull Merchant': 'Eyes in the Sky',
          'The Singularity': 'Quantum Instantiation',
          'The Good Guy': "Playtime's Over",
          'The Unknown': 'UVX'
        };

        const targetPower = powerNames[randomKillerName] || 'Bear Trap';
        const targetChar = killerDetail || characters.find(c => c.category === 'Killer')!;

        const killerDistractors = characters
          .filter(c => c.category === 'Killer' && c.name !== targetChar.name)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        const options = [targetChar.name, ...killerDistractors.map(c => c.name)].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(targetChar.name);

        setCurrentQuestion({
          type: 'power_to_killer',
          questionText: `Which Killer's primary power is "${targetPower}"?`,
          targetCharacter: targetChar,
          options,
          correctIndex
        });
      } else if (selectedType === 'real_to_name') {
        const validChars = characters.filter(c => c.real_name && c.real_name.toLowerCase() !== c.name.toLowerCase());
        const targetChar = validChars[Math.floor(Math.random() * validChars.length)] || characters[0];

        const categoryDistractors = validChars
          .filter(c => c.category === targetChar.category && c.name !== targetChar.name)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        while (categoryDistractors.length < 3) {
          const extra = characters
            .filter(c => c.category === targetChar.category && c.name !== targetChar.name && !categoryDistractors.some(d => d.name === c.name))
            .sort(() => 0.5 - Math.random())[0];
          if (extra) {
            categoryDistractors.push(extra);
          } else {
            break;
          }
        }

        const options = [targetChar.name, ...categoryDistractors.map(c => c.name)].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(targetChar.name);

        setCurrentQuestion({
          type: 'real_to_name',
          questionText: `Which character is actually "${targetChar.real_name}"?`,
          targetCharacter: targetChar,
          options,
          correctIndex
        });
      } else if (selectedType === 'name_to_real') {
        const validChars = characters.filter(c => c.real_name && c.real_name.toLowerCase() !== c.name.toLowerCase());
        const targetChar = validChars[Math.floor(Math.random() * validChars.length)] || characters[0];

        const categoryDistractors = validChars
          .filter(c => c.category === targetChar.category && c.name !== targetChar.name)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        while (categoryDistractors.length < 3) {
          const extra = characters
            .filter(c => c.category === targetChar.category && c.name !== targetChar.name && !categoryDistractors.some(d => d.name === c.name))
            .sort(() => 0.5 - Math.random())[0];
          if (extra) {
            categoryDistractors.push(extra);
          } else {
            break;
          }
        }

        const options = [targetChar.real_name, ...categoryDistractors.map(c => c.real_name)].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(targetChar.real_name);

        setCurrentQuestion({
          type: 'name_to_real',
          questionText: `What is the real identity / name of "${targetChar.name}"?`,
          targetCharacter: targetChar,
          options,
          correctIndex
        });
      } else {
        const targetChar = characters[Math.floor(Math.random() * characters.length)];

        const categoryDistractors = characters
          .filter(c => c.category === targetChar.category && c.name !== targetChar.name)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        const options = [targetChar.name, ...categoryDistractors.map(c => c.name)].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(targetChar.name);

        setCurrentQuestion({
          type: 'avatar_to_name',
          questionText: `Which character's portrait is shown below?`,
          targetCharacter: targetChar,
          options,
          correctIndex
        });
      }
    } else if (activeMode === 'perk_description') {
      if (perks.length < 5) return;
      const targetPerk = perks[Math.floor(Math.random() * perks.length)];
      const cleanedDesc = cleanFlavorText(targetPerk.description);

      const maskPct = Math.min(0.65, (activeStreak * 3) / 100);
      const splitRegex = /(\s+)/;
      const rawWords = cleanedDesc.split(splitRegex);

      const maskedDescription: MaskedWord[] = rawWords.map((word) => {
        const isWord = /[a-zA-Z]{3,}/.test(word);
        const isMasked = isWord && Math.random() < maskPct;
        return { word, isWord, isMasked };
      });

      const roleDistractors = perks
        .filter(p => p.category === targetPerk.category && p.name !== targetPerk.name)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [targetPerk.name, ...roleDistractors.map(p => p.name)].sort(() => 0.5 - Math.random());
      const correctIndex = options.indexOf(targetPerk.name);

      setCurrentQuestion({
        type: 'description',
        questionText: `Guess the perk from its description (some words are obfuscated based on your streak):`,
        targetPerk,
        options,
        correctIndex,
        maskedDescription
      });
    } else if (activeMode === 'perk_name_to_icon') {
      if (perks.length < 5) return;
      const targetPerk = perks[Math.floor(Math.random() * perks.length)];

      const roleDistractors = perks
        .filter(p => p.category === targetPerk.category && p.name !== targetPerk.name)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [targetPerk, ...roleDistractors].sort(() => 0.5 - Math.random());
      const correctIndex = options.findIndex(p => p.name === targetPerk.name);

      const difficultyEffects = generateDifficultyEffects(activeStreak);

      setCurrentQuestion({
        type: 'name_to_icon',
        questionText: `Identify the icon belonging to the perk: "${targetPerk.name}"`,
        targetPerk,
        options,
        correctIndex,
        difficultyEffects
      });
    } else if (activeMode === 'perk_icon_to_name') {
      if (perks.length < 5) return;
      const targetPerk = perks[Math.floor(Math.random() * perks.length)];

      const roleDistractors = perks
        .filter(p => p.category === targetPerk.category && p.name !== targetPerk.name)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [targetPerk.name, ...roleDistractors.map(p => p.name)].sort(() => 0.5 - Math.random());
      const correctIndex = options.indexOf(targetPerk.name);

      const difficultyEffects = generateDifficultyEffects(activeStreak);

      setCurrentQuestion({
        type: 'icon_to_name',
        questionText: `Identify the name of this perk icon (adaptive distortions apply):`,
        targetPerk,
        options,
        correctIndex,
        difficultyEffects
      });
    } else if (activeMode === 'memes') {
      const q = MEME_QUESTIONS[Math.floor(Math.random() * MEME_QUESTIONS.length)];
      const optionsWithIndex = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctIndex }));
      optionsWithIndex.sort(() => 0.5 - Math.random());
      
      setCurrentQuestion({
        type: 'memes',
        questionText: q.questionText,
        options: optionsWithIndex.map(x => x.opt),
        correctIndex: optionsWithIndex.findIndex(x => x.isCorrect)
      });
    }
  }, [activeMode, characters, perks, stats]);

  useEffect(() => {
    if (activeMode === 'memes') {
      generateQuestion();
    } else if (activeMode !== 'dashboard' && activeMode !== 'map' && perks.length > 0 && characters.length > 0) {
      generateQuestion();
    }
  }, [activeMode, perks, characters, generateQuestion]);

  // Submit Answer to Backend Database
  const submitAnswer = async (index: number) => {
    if (gameState !== 'playing' || !currentQuestion || submittingStats) return;

    const isCorrect = index === currentQuestion.correctIndex;
    setSelectedAnswerIndex(index);
    setGameState('answered');
    playFeedbackSound(isCorrect);

    try {
      setSubmittingStats(true);
      const res = await fetch(`${backendBase}/api/v1/guesser/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guesser_type: activeMode,
          is_correct: isCorrect
        })
      });

      if (res.ok) {
        const resJson = await res.json();
        setStats((prev) => ({
          ...prev,
          [activeMode]: resJson.data
        }));
      }
    } catch (e) {
      console.error('Failed to persist score:', e);
    } finally {
      setSubmittingStats(false);
    }
  };

  // Reset Streak for current mode
  const resetStreak = async (guesserType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (submittingStats) return;

    try {
      setSubmittingStats(true);
      const res = await fetch(`${backendBase}/api/v1/guesser/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guesser_type: guesserType })
      });

      if (res.ok) {
        const resJson = await res.json();
        setStats((prev) => ({
          ...prev,
          [guesserType]: resJson.data
        }));
      }
    } catch (e) {
      console.error('Failed to reset streak:', e);
    } finally {
      setSubmittingStats(false);
    }
  };

  // Keyboard Shortcuts (1-4, Escape, Space/Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeMode === 'dashboard') return;

      if (e.key === 'Escape') {
        setActiveMode('dashboard');
        return;
      }

      if (gameState === 'playing' && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (currentQuestion && idx < currentQuestion.options.length) {
          submitAnswer(idx);
        }
      }

      if (gameState === 'answered' && (e.key === ' ' || e.key === 'Enter')) {
        generateQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, gameState, currentQuestion, generateQuestion]);

  const getAccuracy = (stat?: GuesserStat) => {
    if (!stat || stat.total_guesses === 0) return '0%';
    const pct = Math.round((stat.correct_guesses / stat.total_guesses) * 100);
    return `${pct}%`;
  };

  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row dbd-fog-overlay relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950/40 to-slate-950 z-0"></div>

      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="guesser"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 z-10 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <div className="max-w-5xl mx-auto space-y-6">
          
          {activeMode === 'dashboard' ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                    <Gamepad2 className="h-5 w-5 animate-pulse" />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">
                    {dict.guesser?.title || 'DBD Knowledge Guesser'}
                  </h1>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium">
                  {dict.guesser?.subtitle || 'Test your mastery of survivors, killers, powers, and perks.'}
                </p>
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors shadow-sm"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="h-4 w-4 text-emerald-400" />
                    <span>Sound On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 text-rose-400" />
                    <span>Sound Off</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <button
                onClick={() => setActiveMode('dashboard')}
                className="flex items-center gap-2 text-xs font-black tracking-wider text-slate-400 hover:text-white uppercase font-mono transition-colors group px-3 py-1.5 rounded-xl border border-slate-800/80 bg-slate-900/40"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>{dict.guesser?.back || 'Back to modes'}</span>
              </button>

              <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {dict.guesser?.currentStreak || 'Current Streak'}:
                  </span>
                  <span className="font-black text-sm text-amber-500 font-mono">
                    {getActiveStreak()}
                  </span>
                </div>
                <div className="h-3 w-px bg-slate-800"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {dict.guesser?.bestStreak || 'Best Streak'}:
                  </span>
                  <span className="font-black text-sm text-violet-400 font-mono">
                    {stats[activeMode]?.best_streak || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {loadingData ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Loading game files...</p>
            </div>
          ) : activeMode === 'dashboard' ? (
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Character Guesser Card */}
              <div
                onClick={() => setActiveMode('character')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-950/20 hover:border-violet-500/30 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                  <Skull className="h-32 w-32 text-indigo-400" />
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                      Identity Mode
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Best: <strong className="text-white">{stats['character']?.best_streak || 0}</strong></span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight font-mono">
                      {dict.guesser?.modeCharacterTitle || 'Character Guesser'}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      {dict.guesser?.modeCharacterDesc || 'Identify survivors, killers, and powers based on descriptions and real names.'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 relative z-10">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</p>
                      <p className="font-extrabold text-white text-sm font-mono mt-0.5">
                        {getAccuracy(stats['character'])}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Streak</p>
                      <p className="font-extrabold text-amber-500 text-sm font-mono mt-0.5">
                        {stats['character']?.current_streak || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {stats['character']?.current_streak > 0 && (
                      <button
                        onClick={(e) => resetStreak('character', e)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-md group-hover:scale-105 active:scale-95">
                      <Play className="h-3 w-3 fill-current" />
                      <span>{dict.guesser?.play || 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Perk Description Guesser Card */}
              <div
                onClick={() => setActiveMode('perk_description')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-950/20 hover:border-violet-500/30 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                  <Gamepad2 className="h-32 w-32 text-violet-400" />
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                      Redacted Mode
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Best: <strong className="text-white">{stats['perk_description']?.best_streak || 0}</strong></span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight font-mono">
                      {dict.guesser?.modePerkDescTitle || 'Perk Description Guesser'}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      {dict.guesser?.modePerkDescDesc || 'Guess the perk from its text. Words are progressively scratched out at higher streaks!'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 relative z-10">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</p>
                      <p className="font-extrabold text-white text-sm font-mono mt-0.5">
                        {getAccuracy(stats['perk_description'])}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Streak</p>
                      <p className="font-extrabold text-amber-500 text-sm font-mono mt-0.5">
                        {stats['perk_description']?.current_streak || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {stats['perk_description']?.current_streak > 0 && (
                      <button
                        onClick={(e) => resetStreak('perk_description', e)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-md group-hover:scale-105 active:scale-95">
                      <Play className="h-3 w-3 fill-current" />
                      <span>{dict.guesser?.play || 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Perk Name-to-Icon Card */}
              <div
                onClick={() => setActiveMode('perk_name_to_icon')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-950/20 hover:border-violet-500/30 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                  <Eye className="h-32 w-32 text-emerald-400" />
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      Visual Choice
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Best: <strong className="text-white">{stats['perk_name_to_icon']?.best_streak || 0}</strong></span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight font-mono">
                      {dict.guesser?.modePerkNameToIconTitle || 'Name to Icon Guesser'}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      {dict.guesser?.modePerkNameToIconDesc || 'Pick the right perk icon. Icons rotate, gray out, and crop at higher streaks!'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 relative z-10">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</p>
                      <p className="font-extrabold text-white text-sm font-mono mt-0.5">
                        {getAccuracy(stats['perk_name_to_icon'])}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Streak</p>
                      <p className="font-extrabold text-amber-500 text-sm font-mono mt-0.5">
                        {stats['perk_name_to_icon']?.current_streak || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {stats['perk_name_to_icon']?.current_streak > 0 && (
                      <button
                        onClick={(e) => resetStreak('perk_name_to_icon', e)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-md group-hover:scale-105 active:scale-95">
                      <Play className="h-3 w-3 fill-current" />
                      <span>{dict.guesser?.play || 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Perk Icon-to-Name Card */}
              <div
                onClick={() => setActiveMode('perk_icon_to_name')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-950/20 hover:border-violet-500/30 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                  <Settings className="h-32 w-32 text-amber-400" />
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                      Distortion Mode
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Best: <strong className="text-white">{stats['perk_icon_to_name']?.best_streak || 0}</strong></span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight font-mono">
                      {dict.guesser?.modePerkIconToNameTitle || 'Icon to Name Guesser'}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      {dict.guesser?.modePerkIconToNameDesc || 'Guess the perk name from its icon. Adaptive distortion applies to icons!'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 relative z-10">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</p>
                      <p className="font-extrabold text-white text-sm font-mono mt-0.5">
                        {getAccuracy(stats['perk_icon_to_name'])}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Streak</p>
                      <p className="font-extrabold text-amber-500 text-sm font-mono mt-0.5">
                        {stats['perk_icon_to_name']?.current_streak || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {stats['perk_icon_to_name']?.current_streak > 0 && (
                      <button
                        onClick={(e) => resetStreak('perk_icon_to_name', e)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-md group-hover:scale-105 active:scale-95">
                      <Play className="h-3 w-3 fill-current" />
                      <span>{dict.guesser?.play || 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Meme Guesser Card */}
              <div
                onClick={() => setActiveMode('memes')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-950/20 hover:border-violet-500/30 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                  <Sparkles className="h-32 w-32 text-pink-400" />
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-wider">
                      Community Jokes
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Best: <strong className="text-white">{stats['memes']?.best_streak || 0}</strong></span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight font-mono">
                      {dict.guesser?.modeMemesTitle || 'Meme Guesser'}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      {dict.guesser?.modeMemesDesc || 'Guess the jokes and names from popular Dead by Daylight community memes.'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 relative z-10">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</p>
                      <p className="font-extrabold text-white text-sm font-mono mt-0.5">
                        {getAccuracy(stats['memes'])}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Streak</p>
                      <p className="font-extrabold text-amber-500 text-sm font-mono mt-0.5">
                        {stats['memes']?.current_streak || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {stats['memes']?.current_streak > 0 && (
                      <button
                        onClick={(e) => resetStreak('memes', e)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-all shadow-md group-hover:scale-105 active:scale-95">
                      <Play className="h-3 w-3 fill-current" />
                      <span>{dict.guesser?.play || 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Guesser Card */}
              <div
                onClick={() => setActiveMode('map')}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-800/40 bg-slate-950/20 hover:bg-slate-900/30 transition-all duration-300 cursor-pointer shadow-lg overflow-hidden border-dashed border-2 hover:border-violet-500/20"
              >
                <div className="space-y-3 relative z-10 flex flex-col justify-between h-full">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700 uppercase tracking-wider">
                        Realms & Seeds
                      </span>
                      <span className="px-2 py-0.5 rounded bg-violet-600/10 text-[9px] font-bold text-violet-400 border border-violet-500/20">
                        WIP
                      </span>
                    </div>
                    <h2 className="text-base font-black text-slate-400 group-hover:text-slate-300 transition-colors uppercase tracking-wider font-mono flex items-center gap-2 mt-2">
                      <Compass className="h-4 w-4" />
                      {dict.guesser?.modeMapTitle || 'Map Guesser'}
                    </h2>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1">
                      {dict.guesser?.modeMapDesc || 'Test your visual recognition of realms, seeds, tiles, and generator loops.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-end">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold transition-all shadow-md group-hover:text-slate-300">
                      <Lock className="h-3 w-3" />
                      <span>WIP</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : activeMode === 'map' ? (
            
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 border border-red-500/10 pointer-events-none animate-pulse rounded-3xl"></div>
              <div className="h-16 w-16 bg-violet-600/10 border border-violet-500/20 rounded-2xl text-violet-400 flex items-center justify-center mx-auto shadow-lg shadow-violet-950/20">
                <Compass className="h-8 w-8 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black text-white uppercase tracking-wider font-mono">
                  Realm Survey: Map Guesser
                </h2>
                <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  System: Data Stream Corrupted
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                The entity is currently reconstructing mapping protocols for seeds, jungle gym vaults, loops, and totem spawning tiles. This module will allow players to guess spawn locations and structures in real-time. Check back later!
              </p>

              <div className="w-full bg-slate-950/80 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-500 h-1.5 rounded-full w-2/3 animate-pulse"></div>
              </div>

              <button
                onClick={() => setActiveMode('dashboard')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700/80 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            
            <div className="space-y-6">
              
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-7 shadow-2xl space-y-6">
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-violet-400 tracking-widest">
                      {activeMode.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Keyboard: press [1], [2], [3] or [4]
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white">
                    {currentQuestion?.questionText}
                  </h2>
                </div>

                {currentQuestion && (
                  <div className="flex justify-center py-2">
                    
                    {activeMode === 'character' && currentQuestion.targetCharacter && (
                      <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shadow-lg">
                          {currentQuestion.type === 'avatar_to_name' ? (
                            <img
                              src={getAvatarUrl(currentQuestion.targetCharacter)}
                              alt="Character avatar hint"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950/60">
                              <HelpCircle className="h-8 w-8 text-slate-700/80 animate-pulse" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800">
                          {currentQuestion.targetCharacter.category}
                        </span>
                      </div>
                    )}

                    {activeMode === 'memes' && (
                      <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-pink-500/20 bg-slate-950/80 flex items-center justify-center shadow-lg">
                          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5 rounded-2xl"></div>
                          <Sparkles className="h-8 w-8 text-pink-400 animate-pulse relative z-10" />
                        </div>
                        <span className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
                          Meme Mode
                        </span>
                      </div>
                    )}

                    {activeMode === 'perk_description' && currentQuestion.maskedDescription && (
                      <div className="w-full max-w-2xl bg-slate-950/85 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-inner text-xs sm:text-sm leading-relaxed text-slate-300 font-medium select-none overflow-y-auto max-h-40 sm:max-h-56">
                        {currentQuestion.maskedDescription.map((item, idx) => {
                          if (!item.isMasked) {
                            return <span key={idx}>{item.word}</span>;
                          }

                          const activeStreak = stats['perk_description']?.current_streak || 0;
                          if (activeStreak >= 15) {
                            return (
                              <span
                                key={idx}
                                title="Redacted (High Streak)"
                                className="bg-red-950/80 text-transparent select-none rounded px-0.5 border-b border-red-500/20 font-mono tracking-tight cursor-help mx-0.5"
                              >
                                {'█'.repeat(Math.max(3, item.word.length))}
                              </span>
                            );
                          } else {
                            return (
                              <span
                                key={idx}
                                title="Blurred (Medium Streak)"
                                className="blur-[3px] opacity-75 select-none text-slate-500 bg-slate-850 rounded px-0.5 cursor-help mx-0.5 font-mono"
                              >
                                {item.word}
                              </span>
                            );
                          }
                        })}
                      </div>
                    )}

                    {activeMode === 'perk_icon_to_name' && currentQuestion.targetPerk && currentQuestion.difficultyEffects && (
                      <div className="relative flex flex-col items-center gap-3">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden shadow-lg shadow-violet-950/30 relative">
                          <img
                            src={getPerkIconUrl(currentQuestion.targetPerk)}
                            alt="Distorted perk icon hint"
                            className="object-contain transition-transform"
                            style={{
                              transform: `rotate(${currentQuestion.difficultyEffects.rotate}deg) scale(${currentQuestion.difficultyEffects.scale}) translate(${currentQuestion.difficultyEffects.offsetX}px, ${currentQuestion.difficultyEffects.offsetY}px)`,
                              filter: currentQuestion.difficultyEffects.grayscale
                                ? 'grayscale(100%) brightness(0.85) contrast(1.2)'
                                : 'none',
                              width: '80%',
                              height: '80%'
                            }}
                          />
                        </div>
                        
                        <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
                          {currentQuestion.difficultyEffects.grayscale && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">
                              Grayscale
                            </span>
                          )}
                          {currentQuestion.difficultyEffects.rotate > 0 && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">
                              Rotated {currentQuestion.difficultyEffects.rotate}°
                            </span>
                          )}
                          {currentQuestion.difficultyEffects.scale > 1 && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">
                              Cropped Zoom
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {currentQuestion?.options.map((option, idx) => {
                    const isCorrect = idx === currentQuestion.correctIndex;
                    const isSelected = idx === selectedAnswerIndex;

                    let buttonClass =
                      'w-full flex items-center justify-between p-4 rounded-2xl border text-xs sm:text-sm font-extrabold text-left transition-all relative overflow-hidden select-none active:scale-98 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 ';
                    
                    if (gameState === 'playing') {
                      buttonClass +=
                        'border-slate-800 bg-slate-950/50 hover:bg-slate-900/60 hover:border-slate-700 text-slate-300 hover:text-white shadow-sm';
                    } else {
                      if (isCorrect) {
                        buttonClass +=
                          'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-950/20';
                      } else if (isSelected) {
                        buttonClass +=
                          'border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-md shadow-rose-950/20';
                      } else {
                        buttonClass +=
                          'border-slate-850 bg-slate-950/20 text-slate-600 opacity-60';
                      }
                    }

                    if (currentQuestion.type === 'name_to_icon') {
                      const perkOpt = option as Perk;
                      return (
                        <button
                          key={idx}
                          disabled={gameState !== 'playing'}
                          onClick={() => submitAnswer(idx)}
                          className={buttonClass}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-black text-slate-400">
                              {idx + 1}
                            </span>
                            <div className="h-12 w-12 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
                              <img
                                src={getPerkIconUrl(perkOpt)}
                                alt="Perk Icon Choice"
                                className="object-contain"
                                style={{
                                  transform: currentQuestion.difficultyEffects
                                    ? `rotate(${currentQuestion.difficultyEffects.rotate}deg) scale(${currentQuestion.difficultyEffects.scale}) translate(${currentQuestion.difficultyEffects.offsetX}px, ${currentQuestion.difficultyEffects.offsetY}px)`
                                    : 'none',
                                  filter: currentQuestion.difficultyEffects?.grayscale
                                    ? 'grayscale(100%) brightness(0.85) contrast(1.2)'
                                    : 'none',
                                  width: '80%',
                                  height: '80%'
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {gameState !== 'playing' && isCorrect && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            )}
                            {gameState !== 'playing' && isSelected && !isCorrect && (
                              <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    }

                    const textOption = option as string;
                    return (
                      <button
                        key={idx}
                        disabled={gameState !== 'playing'}
                        onClick={() => submitAnswer(idx)}
                        className={buttonClass}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-black text-slate-400">
                            {idx + 1}
                          </span>
                          <span className="truncate">{textOption}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {gameState !== 'playing' && isCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          )}
                          {gameState !== 'playing' && isSelected && !isCorrect && (
                            <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {gameState === 'answered' && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                      {selectedAnswerIndex === currentQuestion?.correctIndex ? (
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                          <XCircle className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          {selectedAnswerIndex === currentQuestion?.correctIndex
                            ? (dict.guesser?.correct || 'Correct!')
                            : (dict.guesser?.incorrect || 'Incorrect!')}
                        </p>
                        {selectedAnswerIndex !== currentQuestion?.correctIndex && currentQuestion && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Correct answer:{' '}
                            <strong className="text-white">
                              {currentQuestion.type === 'name_to_icon'
                                ? (currentQuestion.options[currentQuestion.correctIndex] as Perk).name
                                : (currentQuestion.options[currentQuestion.correctIndex] as string)}
                            </strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={generateQuestion}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 active:scale-95 transition-all shadow-md text-xs uppercase tracking-wider font-mono cursor-pointer"
                    >
                      <span>{dict.guesser?.next || 'Next Question'}</span>
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-black bg-violet-700/60 rounded text-violet-100 uppercase">
                        Space
                      </kbd>
                    </button>
                  </div>
                )}

              </div>
              
              <div className="flex justify-between items-center text-xs text-slate-500 px-2 font-mono">
                <span>Esc: Return</span>
                <span>Space: Continue</span>
              </div>

            </div>
          )}

        </div>
        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}
