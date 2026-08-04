'use client';

import React from 'react';
import { Role } from '@/types/challenge';
import { Flame, Trophy, Shield, User, Skull, BarChart2 } from 'lucide-react';

export interface ChallengeHeaderProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  currentStreak: number;
  bestStreak: number;
  lastCheckpointStreak: number;
  onOpenStats?: () => void;
}

export const ChallengeHeader: React.FC<ChallengeHeaderProps> = ({
  activeRole,
  onRoleChange,
  currentStreak,
  bestStreak,
  lastCheckpointStreak,
  onOpenStats,
}) => {
  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Title & Role Switcher */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-amber-500">DBD</span> Win Streak Challenge
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Conquer matches, build streaks, and master the roster
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-center">
            <button
              onClick={() => onRoleChange('survivor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeRole === 'survivor'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Survivor</span>
            </button>
            <button
              onClick={() => onRoleChange('killer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeRole === 'killer'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Skull className="w-4 h-4" />
              <span>Killer</span>
            </button>
          </div>
        </div>

        {/* Right: Streak Badges & Stats Trigger */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
          {/* Current Streak */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-amber-500/30 text-amber-400 shadow-sm">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                Current
              </span>
              <span className="text-lg font-black text-white leading-none mt-0.5">
                {currentStreak}
              </span>
            </div>
          </div>

          {/* Best Streak */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-yellow-500/30 text-yellow-400 shadow-sm">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                Best
              </span>
              <span className="text-lg font-black text-white leading-none mt-0.5">
                {bestStreak}
              </span>
            </div>
          </div>

          {/* Checkpoint Level */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-indigo-400 shadow-sm">
            <Shield className="w-5 h-5 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                Checkpoint
              </span>
              <span className="text-lg font-black text-white leading-none mt-0.5">
                {lastCheckpointStreak}
              </span>
            </div>
          </div>

          {/* Open Stats Drawer Button */}
          {onOpenStats && (
            <button
              onClick={onOpenStats}
              className="flex items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm ml-1 cursor-pointer"
              title="View Challenge Statistics"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
