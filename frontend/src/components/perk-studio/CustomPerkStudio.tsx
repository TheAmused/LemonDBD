'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wand2,
  Sparkles,
  Shield,
  Skull,
  Zap,
  Eye,
  Heart,
  Ghost,
  Target,
  Flame,
  ThumbsUp,
  Search,
  Plus,
  Layers,
  User,
  Filter,
  CheckCircle2,
  Swords,
  Sliders,
  Clock,
} from 'lucide-react';

export interface CustomPerk {
  id: number;
  name: string;
  role: 'survivor' | 'killer';
  character_name: string;
  rarity: 'Iridescent' | 'Very Rare' | 'Uncommon';
  icon_preset: string;
  description: string;
  upvotes: number;
  author: string;
  created_at?: string;
}

interface CustomPerkStudioProps {
  dict?: any;
  currentLocale?: string;
}

const ICON_PRESETS = [
  { id: 'sparkles', label: 'Magic / Power', icon: Sparkles },
  { id: 'hex_totem', label: 'Hex Totem', icon: Flame },
  { id: 'sprint', label: 'Speed & Mobility', icon: Zap },
  { id: 'totem_cleanse', label: 'Cleanse / Blessing', icon: Sliders },
  { id: 'entity_claws', label: 'Entity Power', icon: Skull },
  { id: 'aura_reading', label: 'Aura Reading', icon: Eye },
  { id: 'healing', label: 'Healing & Vitality', icon: Heart },
  { id: 'stealth', label: 'Stealth & Concealment', icon: Ghost },
  { id: 'chase', label: 'Combat & Chase', icon: Swords },
  { id: 'endgame', label: 'Endgame & Objective', icon: Target },
];

const RARITY_OPTIONS = [
  {
    id: 'Iridescent',
    label: 'Iridescent',
    bg: 'from-pink-600/30 via-red-900/40 to-slate-950',
    border: 'border-pink-500/50',
    badgeBg: 'bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 dark:border-pink-500/40',
    glow: 'shadow-pink-900/30',
  },
  {
    id: 'Very Rare',
    label: 'Very Rare',
    bg: 'from-purple-600/30 via-indigo-900/40 to-slate-950',
    border: 'border-purple-500/50',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 dark:border-purple-500/40',
    glow: 'shadow-purple-900/30',
  },
  {
    id: 'Uncommon',
    label: 'Uncommon',
    bg: 'from-emerald-600/30 via-teal-900/40 to-slate-950',
    border: 'border-emerald-500/50',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40',
    glow: 'shadow-emerald-900/30',
  },
];

export const CustomPerkStudio: React.FC<CustomPerkStudioProps> = ({ dict, currentLocale = 'en' }) => {
  const [activeTab, setActiveTab] = useState<'designer' | 'gallery'>('designer');

  // Form State
  const [name, setName] = useState('Hex: Shadow Veil');
  const [role, setRole] = useState<'survivor' | 'killer'>('killer');
  const [characterName, setCharacterName] = useState('The Wraith');
  const [rarity, setRarity] = useState<'Iridescent' | 'Very Rare' | 'Uncommon'>('Iridescent');
  const [iconPreset, setIconPreset] = useState('hex_totem');
  const [description, setDescription] = useState(
    "A Hex that cloaks the killer's terror radius while totem is active. When survivors get within 12 meters of the totem, their aura is revealed to the Killer for 4 seconds."
  );
  const [author, setAuthor] = useState('EntityArchitect');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Gallery State
  const [customPerks, setCustomPerks] = useState<CustomPerk[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [upvotedIds, setUpvotedIds] = useState<Record<number, boolean>>({});

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch Community Perks
  const fetchCommunityPerks = useCallback(async () => {
    setLoadingGallery(true);
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterRarity !== 'all') params.append('rarity', filterRarity);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortBy) params.append('sort_by', sortBy);

      const res = await fetch(`${backendBase}/api/v1/custom-perks/?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomPerks(data.custom_perks || []);
      }
    } catch (err) {
      console.error('Failed to load custom perk concepts:', err);
    } finally {
      setLoadingGallery(false);
    }
  }, [backendBase, filterRole, filterRarity, searchQuery, sortBy]);

  useEffect(() => {
    fetchCommunityPerks();
  }, [fetchCommunityPerks]);

  // Handle Perk Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter a perk name.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please provide a perk description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        role,
        character_name: characterName.trim(),
        rarity,
        icon_preset: iconPreset,
        description: description.trim(),
        author: author.trim() || 'Anonymous',
      };

      const res = await fetch(`${backendBase}/api/v1/custom-perks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create custom perk');
      }

      const resData = await res.json();
      setSuccessToast(`Successfully published "${payload.name}"!`);
      setTimeout(() => setSuccessToast(''), 4000);

      // Refresh gallery
      fetchCommunityPerks();
      setActiveTab('gallery');
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while publishing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Upvote
  const handleUpvote = async (id: number) => {
    if (upvotedIds[id]) return;

    setUpvotedIds((prev) => ({ ...prev, [id]: true }));
    setCustomPerks((prev) =>
      prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p))
    );

    try {
      const res = await fetch(`${backendBase}/api/v1/custom-perks/${id}/upvote`, {
        method: 'POST',
      });
      if (!res.ok) {
        // revert optimistic upvote
        setUpvotedIds((prev) => ({ ...prev, [id]: false }));
        setCustomPerks((prev) =>
          prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes - 1 } : p))
        );
      }
    } catch (err) {
      console.error('Failed to upvote custom perk:', err);
    }
  };

  // Helper for rendering Icon component based on preset id
  const getPresetIconComponent = (presetId: string) => {
    const matched = ICON_PRESETS.find((p) => p.id === presetId);
    return matched ? matched.icon : Sparkles;
  };

  // Markdown renderer helper
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
        {lines.map((line, lIdx) => {
          if (!line.trim()) return <div key={lIdx} className="h-1" />;
          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);

          return (
            <p key={lIdx}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const content = part.slice(2, -2);
                  return (
                    <strong key={pIdx} className="font-bold text-amber-700 dark:text-amber-400">
                      {content}
                    </strong>
                  );
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                  const content = part.slice(1, -1);
                  return (
                    <em key={pIdx} className="italic text-slate-900 dark:text-slate-200">
                      {content}
                    </em>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  const getRarityConfig = (rName: string) => {
    return RARITY_OPTIONS.find((r) => r.id === rName) || RARITY_OPTIONS[1];
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-50 via-slate-100 to-purple-50 dark:from-red-950 dark:via-slate-900 dark:to-purple-950 p-6 sm:p-8 border border-red-500/20 shadow-sm dark:shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400">
              <Wand2 className="h-3.5 w-3.5 animate-pulse" />
              <span>Studio & Concept Lab</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              Custom Perk Creator Studio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Design original Dead by Daylight perk concepts with a live interactive diamond card preview, or explore and upvote community-created perks.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
            <button
              onClick={() => setActiveTab('designer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'designer'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              <span>Perk Designer</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Community Gallery ({customPerks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* TAB 1: PERK DESIGNER STUDIO */}
      {activeTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-red-500" />
                <span>Configure Perk Concept</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">* Required fields</span>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Perk Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Perk Title *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hex: Shadow Veil, Adrenaline Overdrive..."
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  required
                />
              </div>

              {/* Role & Character */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Role *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('survivor')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        role === 'survivor'
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Survivor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('killer')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        role === 'killer'
                          ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Skull className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <span>Killer</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Character / Teachable
                  </label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="e.g. Meg Thomas, The Trapper, Teachable..."
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>

              {/* Rarity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Rarity *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {RARITY_OPTIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRarity(r.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        rarity === r.id
                          ? r.badgeBg
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Preset Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Icon Preset *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ICON_PRESETS.map((preset) => {
                    const IconComp = preset.icon;
                    const isSelected = iconPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setIconPreset(preset.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <IconComp className="h-5 w-5 mb-1" />
                        <span className="text-[10px] font-semibold truncate w-full">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Author */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Creator / Author Name
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. EntityArchitect"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              {/* Description Markdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Perk Description (Markdown Supported) *
                  </label>
                  <div className="flex gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + ' **Exhausted**')}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-sm"
                    >
                      +**Exhausted**
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + ' **Hindered**')}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-sm"
                    >
                      +**Hindered**
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + ' **Aura**')}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-sm"
                    >
                      +**Aura**
                    </button>
                  </div>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Write perk mechanics... Use **bold** for key status terms."
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-900/30 hover:from-red-500 hover:to-red-600 disabled:opacity-60 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{isSubmitting ? 'Publishing Perk Concept...' : 'Publish Custom Perk Concept'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Live Interactive Perk Card Preview (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-red-500" />
                Live Card Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 animate-pulse">
                REAL-TIME
              </span>
            </div>

            {/* DBD Styled Custom Perk Card */}
            {(() => {
              const rConfig = getRarityConfig(rarity);
              const CurrentIcon = getPresetIconComponent(iconPreset);

              return (
                <div
                  className={`relative rounded-3xl bg-gradient-to-b ${rConfig.bg} border ${rConfig.border} p-6 shadow-2xl ${rConfig.glow} transition-all duration-300`}
                >
                  {/* Perk Diamond Header */}
                  <div className="flex flex-col items-center text-center space-y-4 pb-4 border-b border-slate-800/80">
                    {/* Diamond Frame */}
                    <div className="relative group">
                      <div className="w-24 h-24 rotate-45 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-slate-700/80 flex items-center justify-center shadow-2xl shadow-slate-950 group-hover:scale-105 transition-transform overflow-hidden">
                        {/* Glow accent */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${rConfig.bg} opacity-50 blur-sm`}
                        />
                        <div className="-rotate-45 relative z-10 flex items-center justify-center">
                          <CurrentIcon className="h-10 w-10 text-slate-100 drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" />
                        </div>
                      </div>
                    </div>

                    {/* Perk Title & Metadata */}
                    <div className="space-y-1.5 pt-2">
                      <h3 className="text-lg font-black text-slate-100 font-mono tracking-tight">
                        {name || 'Untitled Perk'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400">
                        {characterName ? `Teachable — ${characterName}` : 'General Perk'}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          role === 'survivor'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {role}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${rConfig.badgeBg}`}
                      >
                        {rarity}
                      </span>
                    </div>
                  </div>

                  {/* Markdown Mechanics Description Body */}
                  <div className="py-4 px-2 min-h-[100px]">
                    {description ? (
                      renderMarkdown(description)
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center">
                        Perk description will render live here...
                      </p>
                    )}
                  </div>

                  {/* Footer Author Tag */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>{author || 'Community'}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">LemonDBD Concept</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNITY PERK GALLERY */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Gallery Filters & Search */}
          <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Search Bar (5 cols) */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search concepts by title, mechanic, character..."
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm"
                />
              </div>

              {/* Role Filters (3 cols) */}
              <div className="md:col-span-3 flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                {['all', 'survivor', 'killer'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRole(r)}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all cursor-pointer ${
                      filterRole === r
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Rarity Filters (2 cols) */}
              <div className="md:col-span-2">
                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm"
                >
                  <option value="all" className="dark:bg-slate-900">All Rarities</option>
                  <option value="Iridescent" className="dark:bg-slate-900">Iridescent</option>
                  <option value="Very Rare" className="dark:bg-slate-900">Very Rare</option>
                  <option value="Uncommon" className="dark:bg-slate-900">Uncommon</option>
                </select>
              </div>

              {/* Sort By (2 cols) */}
              <div className="md:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm"
                >
                  <option value="newest" className="dark:bg-slate-900">Newest First</option>
                  <option value="upvotes" className="dark:bg-slate-900">Most Upvoted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {loadingGallery ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 animate-pulse font-mono text-xs">
              Loading perk concepts...
            </div>
          ) : customPerks.length === 0 ? (
            <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-300">No Custom Perks Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No perk concepts match your current filter settings. Try clearing filters or create a new concept!
              </p>
              <button
                onClick={() => setActiveTab('designer')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors cursor-pointer shadow-md shadow-red-900/20"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Concept</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customPerks.map((perk) => {
                const rConfig = getRarityConfig(perk.rarity);
                const CurrentIcon = getPresetIconComponent(perk.icon_preset);
                const isUpvoted = upvotedIds[perk.id];

                return (
                  <div
                    key={perk.id}
                    className={`flex flex-col justify-between rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 hover:border-red-500/40 dark:hover:border-slate-700 transition-all duration-200 shadow-sm dark:shadow-xl group`}
                  >
                    <div>
                      {/* Top Bar: Icon + Rarity & Role Badges */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition-transform overflow-hidden shadow-inner">
                            <div className={`absolute inset-0 bg-gradient-to-br ${rConfig.bg} opacity-40`} />
                            <CurrentIcon className="h-6 w-6 text-slate-800 dark:text-slate-100 relative z-10" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-mono line-clamp-1">
                              {perk.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {perk.character_name || 'Teachable'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0 ${
                            perk.role === 'survivor'
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {perk.role}
                        </span>
                      </div>

                      {/* Rarity Pill */}
                      <div className="mb-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${rConfig.badgeBg}`}
                        >
                          {perk.rarity}
                        </span>
                      </div>

                      {/* Mechanics Description */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800/80 mb-4 min-h-[90px] shadow-inner">
                        {renderMarkdown(perk.description)}
                      </div>
                    </div>

                    {/* Bottom Metadata & Upvote Action */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[110px]">{perk.author}</span>
                      </div>

                      <button
                        onClick={() => handleUpvote(perk.id)}
                        disabled={isUpvoted}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                          isUpvoted
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${isUpvoted ? 'fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400' : ''}`} />
                        <span>{perk.upvotes}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
