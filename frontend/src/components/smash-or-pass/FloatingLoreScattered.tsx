// frontend/src/components/smash-or-pass/FloatingLoreScattered.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Skull,
  Shield,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Quote,
  Flame,
  User,
  Compass,
} from 'lucide-react';
import { CharacterRosterItem } from './characterRoster';

interface FloatingLoreScatteredProps {
  character: CharacterRosterItem | null;
  locale?: string;
}

export const FloatingLoreScattered: React.FC<FloatingLoreScatteredProps> = ({
  character,
}) => {
  if (!character) return null;

  const isSurvivor = character.role === 'Survivor';
  const isMonster = character.gender === 'monster_other';
  const isFemale = character.gender === 'female';

  // Seed randomized but collision-safe coordinates for this character
  const layout = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < character.slug.length; i++) {
      seed = (seed << 5) - seed + character.slug.charCodeAt(i);
      seed |= 0;
    }
    const rand = (min: number, max: number, offset: number) => {
      const v = Math.abs((seed * (offset + 1) * 9301 + 49297) % 233280) / 233280;
      return Math.floor(min + v * (max - min));
    };

    return {
      // Left Wing: Role Badge (Top-Left safe zone: top 170px - 260px, left 3% - 15%)
      roleTop: rand(170, 240, 1),
      roleLeft: rand(2, 8, 2),

      // Left Wing: Title & Tagline (Mid-Left safe zone: top 310px - 440px, left 2% - 10%)
      titleTop: rand(310, 420, 3),
      titleLeft: rand(1, 6, 4),

      // Left Wing: Green Flag (Bottom-Left safe zone: top 510px - 640px, left 3% - 12%)
      greenTop: rand(510, 620, 5),
      greenLeft: rand(2, 9, 6),

      // Right Wing: Gender/Identity Badge (Top-Right safe zone: top 170px - 250px, right 3% - 15%)
      genderTop: rand(170, 240, 7),
      genderRight: rand(2, 8, 8),

      // Right Wing: Quote Card (Mid-Right safe zone: top 310px - 430px, right 2% - 10%)
      quoteTop: rand(310, 420, 9),
      quoteRight: rand(1, 6, 10),

      // Right Wing: Red Flag / Turn-On (Bottom-Right safe zone: top 510px - 640px, right 3% - 12%)
      redTop: rand(510, 620, 11),
      redRight: rand(2, 9, 12),
    };
  }, [character.slug]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none hidden lg:block">
      {/* 1. Giant Background Watermark Name */}
      <div
        key={`watermark-${character.slug}`}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center opacity-[0.045] pointer-events-none transition-all duration-700 animate-in fade-in zoom-in-95"
      >
        <span className="text-8xl xl:text-[11rem] font-black uppercase tracking-widest text-white font-mono blur-[0.5px]">
          {character.name}
        </span>
      </div>

      {/* 2. Left Wing - Role Classification Badge */}
      <div
        key={`role-${character.slug}`}
        style={{ top: `${layout.roleTop}px`, left: `${layout.roleLeft}vw` }}
        className="absolute max-w-[280px] transition-all duration-700 animate-in fade-in slide-in-from-left-6"
      >
        <div
          className={`flex items-center gap-3 p-4 rounded-3xl border-2 backdrop-blur-xl shadow-2xl ${
            isSurvivor
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
              : isMonster
              ? 'bg-purple-950/60 border-purple-500/40 text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/40 border border-white/10 shrink-0">
            {isSurvivor ? <Shield className="h-6 w-6" /> : <Skull className="h-6 w-6" />}
          </div>
          <div className="text-left">
            <span className="text-xs font-black uppercase tracking-widest block opacity-75">
              Role Classification
            </span>
            <span className="text-base font-black tracking-wide">{character.role}</span>
          </div>
        </div>
      </div>

      {/* 3. Left Wing - Character Title & Tagline */}
      <div
        key={`title-${character.slug}`}
        style={{ top: `${layout.titleTop}px`, left: `${layout.titleLeft}vw` }}
        className="absolute max-w-[320px] transition-all duration-700 animate-in fade-in slide-in-from-left-8"
      >
        <div className="p-5 rounded-3xl bg-slate-950/80 border-2 border-pink-500/30 backdrop-blur-xl shadow-2xl space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-pink-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-widest">Character Lore</span>
          </div>
          <h4 className="text-base font-black text-slate-100 italic tracking-tight">{character.title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed font-medium pt-0.5">{character.tagline}</p>
        </div>
      </div>

      {/* 4. Left Wing - Green Flag */}
      {character.greenFlags?.[0] && (
        <div
          key={`green-${character.slug}`}
          style={{ top: `${layout.greenTop}px`, left: `${layout.greenLeft}vw` }}
          className="absolute max-w-[300px] transition-all duration-700 animate-in fade-in slide-in-from-left-6"
        >
          <div className="flex items-start gap-3 p-4 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-200 backdrop-blur-xl shadow-2xl text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                Green Flag
              </span>
              <p className="text-xs font-semibold leading-snug pt-0.5">{character.greenFlags[0]}</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Right Wing - Gender & Identity Badge */}
      <div
        key={`gender-${character.slug}`}
        style={{ top: `${layout.genderTop}px`, right: `${layout.genderRight}vw` }}
        className="absolute max-w-[280px] transition-all duration-700 animate-in fade-in slide-in-from-right-6"
      >
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-slate-950/70 border-2 border-slate-700/60 text-slate-200 backdrop-blur-xl shadow-2xl">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
            <User className="h-6 w-6" />
          </div>
          <div className="text-left">
            <span className="text-xs font-black uppercase tracking-widest block text-slate-400">
              Identity &amp; Gender
            </span>
            <span className="text-base font-black capitalize text-slate-100">
              {isFemale ? 'Female' : isMonster ? 'Monster & Eldritch' : 'Male'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Right Wing - Atmospheric Voice Quote */}
      {character.quote && (
        <div
          key={`quote-${character.slug}`}
          style={{ top: `${layout.quoteTop}px`, right: `${layout.quoteRight}vw` }}
          className="absolute max-w-[320px] transition-all duration-700 animate-in fade-in slide-in-from-right-8"
        >
          <div className="p-5 rounded-3xl bg-slate-950/80 border-2 border-rose-500/30 backdrop-blur-xl shadow-2xl space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-rose-400">
              <Quote className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">Voice of the Trial</span>
            </div>
            <p className="text-xs italic font-serif text-slate-200 leading-relaxed pt-0.5">
              {character.quote}
            </p>
          </div>
        </div>
      )}

      {/* 7. Right Wing - Red Flag / Warning */}
      {character.redFlags?.[0] && (
        <div
          key={`red-${character.slug}`}
          style={{ top: `${layout.redTop}px`, right: `${layout.redRight}vw` }}
          className="absolute max-w-[300px] transition-all duration-700 animate-in fade-in slide-in-from-right-6"
        >
          <div className="flex items-start gap-3 p-4 rounded-3xl bg-rose-950/60 border-2 border-rose-500/40 text-rose-200 backdrop-blur-xl shadow-2xl text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">
                Red Flag
              </span>
              <p className="text-xs font-semibold leading-snug pt-0.5">{character.redFlags[0]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
