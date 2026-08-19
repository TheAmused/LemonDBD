// frontend/src/components/killer/KillerCalculator.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Skull,
  Radio,
  Zap,
  Sliders,
  Check,
  Plus,
  X,
  Volume2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface PerkOptionState {
  in_chase: boolean;
  carrying_survivor: boolean;
  furtive_chase_tokens: number;
}

interface KillerCalculatorProps {
  dict?: any;
}

export const KillerCalculator: React.FC<KillerCalculatorProps> = ({ dict }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedKillerId, setSelectedKillerId] = useState<string>('huntress');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedPerkIds, setSelectedPerkIds] = useState<string[]>([]);
  const [perkOptions, setPerkOptions] = useState<PerkOptionState>({
    in_chase: false,
    carrying_survivor: false,
    furtive_chase_tokens: 0,
  });

  const [calculationResult, setCalculationResult] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch initial data (killers, perks, add-ons)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`${backendBase}/api/v1/killer-calc/data`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch killer calc data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [backendBase]);

  // Recalculate stats when killer, addons, or perks change
  useEffect(() => {
    async function doCalculation() {
      if (!selectedKillerId) return;
      try {
        const res = await fetch(`${backendBase}/api/v1/killer-calc/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            killer_id: selectedKillerId,
            addon_ids: selectedAddonIds,
            perk_ids: selectedPerkIds,
            perk_options: perkOptions,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          setCalculationResult(json);
        }
      } catch (err) {
        console.error('Failed to calculate stats:', err);
      }
    }

    doCalculation();
  }, [selectedKillerId, selectedAddonIds, selectedPerkIds, perkOptions, backendBase]);

  // Handle killer change (reset add-ons)
  const handleSelectKiller = (killerId: string) => {
    setSelectedKillerId(killerId);
    setSelectedAddonIds([]);
  };

  // Toggle add-on selection (max 2)
  const handleToggleAddon = (addonId: string) => {
    if (selectedAddonIds.includes(addonId)) {
      setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addonId));
    } else {
      if (selectedAddonIds.length >= 2) {
        // Replace second add-on if 2 already selected
        setSelectedAddonIds([selectedAddonIds[0], addonId]);
      } else {
        setSelectedAddonIds([...selectedAddonIds, addonId]);
      }
    }
  };

  // Toggle perk selection
  const handleTogglePerk = (perkId: string) => {
    if (selectedPerkIds.includes(perkId)) {
      setSelectedPerkIds(selectedPerkIds.filter((id) => id !== perkId));
    } else {
      setSelectedPerkIds([...selectedPerkIds, perkId]);
    }
  };

  // Draw Interactive 2D Radar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !calculationResult) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const baseTR = calculationResult.terror_radius.base;
    const modifiedTR = calculationResult.terror_radius.modified;
    const lullaby = calculationResult.lullaby.base;

    // Max radius for scaling: max meters to display is around 50m
    const maxDistanceMeters = Math.max(55, baseTR, modifiedTR, lullaby);
    const scale = (Math.min(width, height) / 2 - 30) / maxDistanceMeters;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid concentric rings
    ctx.lineWidth = 1;
    for (let m = 10; m <= 50; m += 10) {
      const r = m * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.stroke();

      // Meter labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(`${m}m`, centerX + 4, centerY - r + 12);
    }

    // Draw Lullaby Circle (if present)
    if (lullaby > 0) {
      const lullabyRadiusPx = lullaby * scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, lullabyRadiusPx, 0, 2 * Math.PI);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`Lullaby (${lullaby}m)`, centerX - 35, centerY - lullabyRadiusPx - 6);
      ctx.restore();
    }

    // Draw Base Terror Radius Circle (dashed outline)
    if (baseTR > 0) {
      const baseRadiusPx = baseTR * scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadiusPx, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Modified Terror Radius Circle (solid glowing crimson circle)
    if (modifiedTR > 0) {
      const modRadiusPx = modifiedTR * scale;

      // Glow fill
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, modRadiusPx);
      gradient.addColorStop(0, 'rgba(225, 29, 72, 0.35)');
      gradient.addColorStop(0.7, 'rgba(225, 29, 72, 0.15)');
      gradient.addColorStop(1, 'rgba(225, 29, 72, 0.05)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, modRadiusPx, 0, 2 * Math.PI);
      ctx.fill();

      // Outer Stroke
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, modRadiusPx, 0, 2 * Math.PI);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`TR: ${modifiedTR}m`, centerX - 25, centerY - modRadiusPx - 6);
    }

    // Draw Killer Center Point (pulsing core)
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [calculationResult]);

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <span className="font-semibold text-sm">Loading Killer Stat Calculator...</span>
        </div>
      </div>
    );
  }

  const killers = data.killers || {};
  const perks = data.perks || {};
  const currentKiller = killers[selectedKillerId] || {};
  const currentAddons = currentKiller.addons || {};

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'Ultra Rare':
        return 'bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30';
      case 'Very Rare':
        return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30';
      case 'Rare':
        return 'bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
      case 'Uncommon':
        return 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-50 via-slate-100 to-red-50 dark:from-slate-900 dark:via-rose-950/60 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm dark:shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Phase 3 Feature
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-3">
              <Skull className="h-7 w-7 text-rose-500" />
              Killer Add-on Stat Calculator & TR Radar
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Select a Killer, pair 2 Add-ons to calculate exact stat deltas (windup time, charge speed, power cooldowns), and toggle Terror Radius perks to view live 2D Radar circle dynamics.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Section: Killer Selection + Add-on Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Killer Selector (Left Column) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-sm shadow-sm dark:shadow-xl">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2 mb-4">
              <Skull className="h-4 w-4 text-rose-500 dark:text-rose-400" /> Select Killer
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              {Object.keys(killers).map((kid) => {
                const k = killers[kid];
                const isSelected = kid === selectedKillerId;

                return (
                  <button
                    key={kid}
                    onClick={() => handleSelectKiller(kid)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/50 text-rose-900 dark:text-white shadow-sm dark:shadow-lg dark:shadow-rose-950/40 ring-1 ring-rose-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold text-sm font-mono ${
                        isSelected ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {k.name.charAt(4) || k.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">{k.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        TR: {k.base_terror_radius}m {k.lullaby_radius > 0 ? `| Lullaby: ${k.lullaby_radius}m` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add-ons Selector */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-sm shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" /> Select 2 Add-ons
              </h2>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono border border-slate-200 dark:border-slate-700">
                {selectedAddonIds.length}/2 Selected
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {Object.keys(currentAddons).map((aid) => {
                const addon = currentAddons[aid];
                const isSelected = selectedAddonIds.includes(aid);
                const selectionIndex = selectedAddonIds.indexOf(aid);

                return (
                  <button
                    key={aid}
                    onClick={() => handleToggleAddon(aid)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{addon.name}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getRarityBadge(
                            addon.rarity
                          )}`}
                        >
                          {addon.rarity}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                          #{selectionIndex + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{addon.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Terror Radius Perks & Options */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-sm shadow-sm dark:shadow-xl">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2 mb-4">
              <ShieldAlert className="h-4 w-4 text-purple-500 dark:text-purple-400" /> TR Modifier Perks
            </h2>

            <div className="space-y-3">
              {Object.keys(perks).map((pid) => {
                const perk = perks[pid];
                const isSelected = selectedPerkIds.includes(pid);

                return (
                  <div key={pid} className="space-y-2">
                    <button
                      onClick={() => handleTogglePerk(pid)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-800 dark:text-purple-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-slate-200">{perk.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{perk.description}</div>
                        </div>
                      </div>
                    </button>

                    {/* Dynamic Perk Controls when selected */}
                    {isSelected && pid === 'monitor_and_abuse' && (
                      <div className="ml-7 flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">Chase Status:</span>
                        <button
                          onClick={() => setPerkOptions({ ...perkOptions, in_chase: !perkOptions.in_chase })}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                            perkOptions.in_chase
                              ? 'bg-rose-500 text-white'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {perkOptions.in_chase ? '🔥 In Chase (+8m)' : '👟 Outside Chase (-8m)'}
                        </button>
                      </div>
                    )}

                    {isSelected && pid === 'agitation' && (
                      <div className="ml-7 flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">Carrying Survivor:</span>
                        <button
                          onClick={() =>
                            setPerkOptions({ ...perkOptions, carrying_survivor: !perkOptions.carrying_survivor })
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                            perkOptions.carrying_survivor
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {perkOptions.carrying_survivor ? '💪 Carrying (+12m)' : '🚫 Normal (0m)'}
                        </button>
                      </div>
                    )}

                    {isSelected && pid === 'furtive_chase' && (
                      <div className="ml-7 flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">Tokens (-4m each):</span>
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2, 3, 4].map((t) => (
                            <button
                              key={t}
                              onClick={() => setPerkOptions({ ...perkOptions, furtive_chase_tokens: t })}
                              className={`h-6 w-6 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                perkOptions.furtive_chase_tokens === t
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visualizer Radar + Live Stat Deltas (Right Column) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 2D Canvas Radar Visualizer */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-sm shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Interactive 2D Terror Radius Radar
              </h2>
              {calculationResult && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">
                    Base TR: <strong className="text-slate-800 dark:text-slate-200">{calculationResult.terror_radius.base}m</strong>
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                    Modified: <strong>{calculationResult.terror_radius.modified}m</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Canvas Container */}
            <div className="relative flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800/80 p-4 shadow-inner">
              <canvas ref={canvasRef} width={420} height={380} className="w-full max-w-[420px] h-[380px]" />
            </div>

            {/* Radar Legend */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-bold text-center">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">BASE TERROR RADIUS</span>
                <span className="text-rose-600 dark:text-rose-400 font-mono">{calculationResult?.terror_radius?.base || 0}m</span>
              </div>

              <div className="rounded-lg bg-rose-50 dark:bg-slate-950 p-2 border border-rose-500/30 bg-rose-500/5 shadow-sm">
                <span className="text-rose-700 dark:text-rose-300 block text-[10px]">MODIFIED TERROR RADIUS</span>
                <span className="text-rose-600 dark:text-rose-500 font-mono text-xs">
                  {calculationResult?.terror_radius?.modified || 0}m
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-amber-700 dark:text-amber-400/80 block text-[10px]">LULLABY RADIUS</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono">{calculationResult?.lullaby?.base || 0}m</span>
              </div>
            </div>
          </div>

          {/* Live Stat Delta Cards */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-sm shadow-sm dark:shadow-xl space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Live Power Stat Deltas
            </h2>

            {calculationResult?.stat_deltas?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {calculationResult.stat_deltas.map((stat: any) => (
                  <div
                    key={stat.stat_id}
                    className={`p-4 rounded-xl border transition-all shadow-sm ${
                      stat.is_changed
                        ? stat.is_buff
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200">{stat.name}</span>
                      {stat.is_changed && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                            stat.is_buff
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {stat.is_buff ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {stat.formatted_delta}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="text-slate-400 dark:text-slate-500 text-xs line-through">
                        {stat.base} {stat.unit}
                      </span>
                      <span className={`text-lg font-black ${stat.is_buff ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {stat.modified} {stat.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No power stats modified.</p>
            )}

            {/* TR Breakdown Summary */}
            {calculationResult?.terror_radius?.breakdown?.length > 0 && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 shadow-inner">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Terror Radius Modifier Breakdown
                </span>
                <div className="space-y-1 text-xs">
                  {calculationResult.terror_radius.breakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-slate-800 dark:text-slate-300">
                      <span>{item.source}</span>
                      <span className="font-mono font-bold">
                        {item.value >= 0 ? `+${item.value}` : item.value}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
