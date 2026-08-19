// frontend/src/components/draft/DraftRoom.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Swords,
  Shield,
  Skull,
  Ban,
  CheckCircle2,
  Copy,
  Users,
  Eye,
  Search,
  RefreshCw,
  Sparkles,
  Share2,
} from 'lucide-react';
import { DraftRoom as DraftRoomType, DraftPhase } from '@/types/draft';
import { createDraftRoom, getDraftRoom, processDraftAction } from '@/services/draftApi';
import { Perk } from '@/components/PerkCard';

interface DraftRoomProps {
  initialRoomCode?: string;
  dict?: any;
}

export const DraftRoom: React.FC<DraftRoomProps> = ({ initialRoomCode, dict }) => {
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode || '');
  const [room, setRoom] = useState<DraftRoomType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // User Role: 'survivor' | 'killer' | 'spectator'
  const [userRole, setUserRole] = useState<'survivor' | 'killer' | 'spectator'>('survivor');

  // Perks Vault Data for selection modal/grid
  const [allPerks, setAllPerks] = useState<Perk[]>([]);
  const [perkSearch, setPerkSearch] = useState<string>('');
  const [activeTabRole, setActiveTabRole] = useState<'Survivor' | 'Killer'>('Survivor');
  const [isPerkModalOpen, setIsPerkModalOpen] = useState<boolean>(false);
  const [actionTypeModal, setActionTypeModal] = useState<'ban' | 'pick'>('ban');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch all perks for selection
  useEffect(() => {
    async function loadPerks() {
      try {
        const res = await fetch(`${backendBase}/api/v1/perks?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          setAllPerks(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch perks for draft room:', err);
      }
    }
    loadPerks();
  }, [backendBase]);

  // Load existing room if room code in URL or passed
  const handleLoadRoom = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDraftRoom(code.trim().toUpperCase());
      setRoom(res.room);
    } catch (err: any) {
      console.error('Failed to load draft room:', err);
      setError(err.message || 'Room not found.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialRoomCode) {
      handleLoadRoom(initialRoomCode);
    }
  }, [initialRoomCode, handleLoadRoom]);

  // Create New Room
  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createDraftRoom();
      setRoom(res.room);
      setRoomCodeInput(res.room.room_code);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', res.room.room_code);
        window.history.pushState({}, '', url.toString());
      }
    } catch (err: any) {
      console.error('Failed to create draft room:', err);
      setError(err.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  // Join Room button click
  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) return;
    handleLoadRoom(roomCodeInput.trim());
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCodeInput.trim().toUpperCase());
      window.history.pushState({}, '', url.toString());
    }
  };

  useEffect(() => {
    if (!isPerkModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPerkModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPerkModalOpen]);

  // Copy Room Link
  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.room_code}`;
    navigator.clipboard.writeText(url);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  // Execute Ban or Pick Action
  const handleExecuteAction = async (perkName: string) => {
    if (!room || userRole === 'spectator') return;

    try {
      let targetRole: 'survivor' | 'killer' = activeTabRole === 'Survivor' ? 'survivor' : 'killer';
      let nextPhase: DraftPhase | undefined = room.phase;

      if (actionTypeModal === 'ban') {
        const newBans = [...room.banned_perks, perkName];
        // Transition from bans to picks if 6 bans total (3 per side)
        if (newBans.length >= 6) {
          nextPhase = 'picks';
        }
      } else if (actionTypeModal === 'pick') {
        const survivorPicksCount = room.picked_survivor_perks.length + (targetRole === 'survivor' ? 1 : 0);
        const killerPicksCount = room.picked_killer_perks.length + (targetRole === 'killer' ? 1 : 0);
        if (survivorPicksCount >= 4 && killerPicksCount >= 4) {
          nextPhase = 'complete';
        }
      }

      const res = await processDraftAction(room.room_code, {
        action: actionTypeModal,
        perk_name: perkName,
        role: targetRole,
        phase: nextPhase,
      });

      setRoom(res.room);
      setIsPerkModalOpen(false);
    } catch (err: any) {
      console.error('Failed to process draft action:', err);
      setError(err.message || 'Failed to update draft action.');
    }
  };

  // Advance Phase manually if captain chooses
  const handleAdvancePhase = async (newPhase: DraftPhase) => {
    if (!room) return;
    try {
      const res = await processDraftAction(room.room_code, {
        phase: newPhase,
      });
      setRoom(res.room);
    } catch (err: any) {
      console.error('Failed to advance phase:', err);
    }
  };

  // Filtered Perks for Selector Modal
  const availablePerks = allPerks.filter((p) => {
    if (p.category !== activeTabRole) return false;
    if (room?.banned_perks.includes(p.name)) return false;
    if (room?.picked_survivor_perks.includes(p.name)) return false;
    if (room?.picked_killer_perks.includes(p.name)) return false;
    if (perkSearch.trim()) {
      const term = perkSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.character && p.character.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-red-50 via-slate-100 to-rose-50 dark:from-slate-900 dark:via-red-950/40 dark:to-slate-900 p-6 shadow-sm dark:shadow-xl text-slate-900 dark:text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-400 shadow-sm dark:shadow-lg dark:shadow-red-950/50">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-wide text-slate-900 dark:text-white font-mono">
                  Tournament Draft Room
                </h1>
                <span className="rounded-full bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                  Phase 1 Competitive
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Ban & Pick perks interactively for tournament matches with live spectator support.
              </p>
            </div>
          </div>

          {/* Lobby Actions */}
          {!room ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter 6-char Code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-36 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              />
              <button
                onClick={handleJoinRoom}
                disabled={loading || !roomCodeInput.trim()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Join Room
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-md shadow-red-900/30 transition-all cursor-pointer"
              >
                + Create Room
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 font-mono text-xs text-amber-700 dark:text-amber-400 shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 font-sans text-[10px] uppercase">Room Code:</span>
                <span className="font-extrabold text-sm tracking-wider">{room.room_code}</span>
              </div>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <Share2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                <span>{copiedToast ? 'Copied URL!' : 'Share Room'}</span>
              </button>

              <button
                onClick={() => setRoom(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                Leave Room
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-200 text-xs flex justify-between items-center shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Draft Room Interface */}
      {room && (
        <div className="space-y-6">
          {/* Status & Role Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm">
            {/* Phase Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Draft Phase:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    room.phase === 'bans'
                      ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 animate-pulse'
                      : room.phase === 'picks'
                      ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 animate-pulse'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {room.phase === 'bans'
                    ? '🚫 Ban Phase (3 Perks / Side)'
                    : room.phase === 'picks'
                    ? '⚔️ Pick Phase'
                    : '✅ Draft Complete'}
                </span>
              </div>

              {room.phase !== 'complete' && (
                <button
                  onClick={() =>
                    handleAdvancePhase(room.phase === 'bans' ? 'picks' : 'complete')
                  }
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-sm"
                >
                  Next Phase →
                </button>
              )}
            </div>

            {/* Spectator / Role Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <span className="text-[10px] font-bold uppercase text-slate-500 px-2">Role:</span>
              <button
                onClick={() => setUserRole('survivor')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  userRole === 'survivor'
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Survivor Captain</span>
              </button>
              <button
                onClick={() => setUserRole('killer')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  userRole === 'killer'
                    ? 'bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Skull className="h-3.5 w-3.5" />
                <span>Killer Captain</span>
              </button>
              <button
                onClick={() => setUserRole('spectator')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  userRole === 'spectator'
                    ? 'bg-purple-500/20 text-purple-800 dark:text-purple-400 border border-purple-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Spectator</span>
              </button>
            </div>
          </div>

          {/* Banned Perks Section */}
          <div className="rounded-3xl border border-rose-500/30 dark:border-rose-900/40 bg-white/90 dark:bg-slate-900/80 p-6 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Banned Perks (Max 3 Per Side)</h2>
              </div>
              {room.phase === 'bans' && userRole !== 'spectator' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTabRole('Survivor');
                      setActionTypeModal('ban');
                      setIsPerkModalOpen(true);
                    }}
                    disabled={room.banned_perks.length >= 6}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    + Ban Survivor Perk
                  </button>
                  <button
                    onClick={() => {
                      setActiveTabRole('Killer');
                      setActionTypeModal('ban');
                      setIsPerkModalOpen(true);
                    }}
                    disabled={room.banned_perks.length >= 6}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    + Ban Killer Perk
                  </button>
                </div>
              )}
            </div>

            {room.banned_perks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No perks banned yet. Select "Ban Survivor Perk" or "Ban Killer Perk" to start.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {room.banned_perks.map((perkName, idx) => (
                  <div
                    key={`${perkName}-${idx}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-700/60 text-xs font-bold text-rose-800 dark:text-rose-200 shadow-sm"
                  >
                    <Ban className="h-3.5 w-3.5 text-rose-500" />
                    <span>{perkName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Picked Perks Grids (Survivor vs Killer) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Survivor Team Picks */}
            <div className="rounded-3xl border border-emerald-500/30 dark:border-emerald-900/40 bg-white/90 dark:bg-slate-900/80 p-6 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400">Survivor Team Picks</h3>
                </div>
                {room.phase === 'picks' &&
                  (userRole === 'survivor' || userRole === 'killer') && (
                    <button
                      onClick={() => {
                        setActiveTabRole('Survivor');
                        setActionTypeModal('pick');
                        setIsPerkModalOpen(true);
                      }}
                      disabled={room.picked_survivor_perks.length >= 4}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      + Pick Perk ({room.picked_survivor_perks.length}/4)
                    </button>
                  )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const perkName = room.picked_survivor_perks[slotIdx];
                  const perkObj = allPerks.find((p) => p.name === perkName);

                  return (
                    <div
                      key={slotIdx}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all shadow-sm ${
                        perkName
                          ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30'
                          : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 shrink-0">
                        S{slotIdx + 1}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {perkName || 'Empty Pick Slot'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {perkObj?.character || 'Survivor Perk'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Killer Team Picks */}
            <div className="rounded-3xl border border-rose-500/30 dark:border-rose-900/40 bg-white/90 dark:bg-slate-900/80 p-6 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skull className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Killer Team Picks</h3>
                </div>
                {room.phase === 'picks' &&
                  (userRole === 'killer' || userRole === 'survivor') && (
                    <button
                      onClick={() => {
                        setActiveTabRole('Killer');
                        setActionTypeModal('pick');
                        setIsPerkModalOpen(true);
                      }}
                      disabled={room.picked_killer_perks.length >= 4}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      + Pick Perk ({room.picked_killer_perks.length}/4)
                    </button>
                  )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const perkName = room.picked_killer_perks[slotIdx];
                  const perkObj = allPerks.find((p) => p.name === perkName);

                  return (
                    <div
                      key={slotIdx}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all shadow-sm ${
                        perkName
                          ? 'border-rose-500/40 bg-rose-50/70 dark:bg-rose-950/30'
                          : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 shrink-0">
                        K{slotIdx + 1}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {perkName || 'Empty Pick Slot'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {perkObj?.character || 'Killer Perk'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Perk Selection Modal for Ban or Pick */}
      {isPerkModalOpen && (
        <div
          onClick={() => setIsPerkModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Select Perk to {actionTypeModal === 'ban' ? 'Ban' : 'Pick'} ({activeTabRole})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search and click any available perk to confirm.
                </p>
              </div>
              <button
                onClick={() => setIsPerkModalOpen(false)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                Cancel
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search perk name or character..."
                value={perkSearch}
                onChange={(e) => setPerkSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              />
            </div>

            {/* Perks Grid */}
            <div className="max-h-[50vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
              {availablePerks.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
                  No matching available perks.
                </div>
              ) : (
                availablePerks.map((perk) => (
                  <button
                    key={perk.name}
                    onClick={() => handleExecuteAction(perk.name)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group cursor-pointer shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {perk.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{perk.character || 'General'}</p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-red-600 group-hover:text-white transition-colors">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
