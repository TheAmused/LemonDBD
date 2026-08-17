'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Shield,
  Skull,
  Search,
  Plus,
  ThumbsUp,
  Copy,
  Share2,
  Check,
  X,
  QrCode,
  Sparkles,
  Award,
  Filter,
  ExternalLink,
} from 'lucide-react';

export interface Build {
  id: number;
  title: string;
  description: string;
  role: 'survivor' | 'killer';
  category: string;
  character_id: string;
  perks: string[];
  upvotes: number;
  author: string;
  created_at?: string;
}

interface BuildVaultProps {
  dict?: any;
  currentLocale?: string;
}

const FILTER_TABS = [
  { id: 'all', label: 'All Builds' },
  { id: 'survivor', label: 'Survivor', icon: Shield, color: 'text-emerald-400' },
  { id: 'killer', label: 'Killer', icon: Skull, color: 'text-rose-400' },
  { id: 'otzdarva', label: 'Otzdarva Recommended', icon: Award, color: 'text-amber-400' },
  { id: 'meta', label: 'Meta', icon: Sparkles, color: 'text-purple-400' },
  { id: 'meme', label: 'Meme', icon: Flame, color: 'text-orange-400' },
  { id: 'stealth', label: 'Stealth', icon: Filter, color: 'text-blue-400' },
  { id: 'chase', label: 'Chase', icon: Flame, color: 'text-red-400' },
];

export const BuildVault: React.FC<BuildVaultProps> = ({ dict, currentLocale = 'en' }) => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('upvotes');

  // Optimistic upvote tracking
  const [upvotedIds, setUpvotedIds] = useState<Record<number, boolean>>({});
  const [copiedBuildId, setCopiedBuildId] = useState<number | null>(null);

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [shareBuild, setShareBuild] = useState<Build | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  // Submit Build form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRole, setNewRole] = useState<'survivor' | 'killer'>('survivor');
  const [newCategory, setNewCategory] = useState('meta');
  const [newCharacter, setNewCharacter] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newPerk1, setNewPerk1] = useState('');
  const [newPerk2, setNewPerk2] = useState('');
  const [newPerk3, setNewPerk3] = useState('');
  const [newPerk4, setNewPerk4] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'survivor' || activeTab === 'killer') {
        params.append('role', activeTab);
      } else if (activeTab !== 'all') {
        params.append('category', activeTab);
      }

      if (search) params.append('search', search);
      if (sortBy) params.append('sort_by', sortBy);

      const res = await fetch(`${backendBase}/api/v1/builds?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBuilds(data.builds || []);
      }
    } catch (err) {
      console.error('Failed to fetch builds:', err);
    } finally {
      setLoading(false);
    }
  }, [backendBase, activeTab, search, sortBy]);

  useEffect(() => {
    fetchBuilds();
  }, [fetchBuilds]);

  useEffect(() => {
    if (!isSubmitModalOpen && !shareBuild) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSubmitModalOpen(false);
        setShareBuild(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitModalOpen, shareBuild]);

  // Handle optimistic upvote
  const handleUpvote = async (buildId: number) => {
    if (upvotedIds[buildId]) return;

    // Optimistic update
    setUpvotedIds((prev) => ({ ...prev, [buildId]: true }));
    setBuilds((prev) =>
      prev.map((b) => (b.id === buildId ? { ...b, upvotes: b.upvotes + 1 } : b))
    );

    try {
      const res = await fetch(`${backendBase}/api/v1/builds/${buildId}/upvote`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.build) {
          setBuilds((prev) =>
            prev.map((b) => (b.id === buildId ? { ...b, upvotes: data.build.upvotes } : b))
          );
        }
      }
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  // Handle Copy Build text
  const handleCopyBuild = (build: Build) => {
    const perksText = build.perks.filter(Boolean).join(', ');
    const text = `[${build.title}] (${build.role.toUpperCase()} - ${build.category.toUpperCase()})\nPerks: ${perksText}\nCreated by ${build.author} on LemonDBD Build Vault`;

    navigator.clipboard.writeText(text);
    setCopiedBuildId(build.id);
    setTimeout(() => setCopiedBuildId(null), 2500);
  };

  // Handle submit custom build
  const handleSubmitBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!newTitle.trim()) {
      setSubmitError('Build Title is required.');
      return;
    }

    const perks = [newPerk1, newPerk2, newPerk3, newPerk4].map((p) => p.trim()).filter(Boolean);
    if (perks.length === 0) {
      setSubmitError('Please enter at least 1 perk.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        role: newRole,
        category: newCategory,
        character_id: newCharacter.trim() || 'all',
        perks: perks,
        author: newAuthor.trim() || 'Community',
      };

      const res = await fetch(`${backendBase}/api/v1/builds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.build) {
          setBuilds((prev) => [data.build, ...prev]);
        }
        setIsSubmitModalOpen(false);
        // Reset form
        setNewTitle('');
        setNewDescription('');
        setNewRole('survivor');
        setNewCategory('meta');
        setNewCharacter('');
        setNewAuthor('');
        setNewPerk1('');
        setNewPerk2('');
        setNewPerk3('');
        setNewPerk4('');
      } else {
        const errData = await res.json();
        setSubmitError(errData.error || 'Failed to submit build.');
      }
    } catch (err) {
      setSubmitError('Network error while submitting build.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share URL for modal
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${currentLocale}/builds${shareBuild ? `?id=${shareBuild.id}` : ''}`
    : '';

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-50 via-red-100/40 to-slate-50 dark:from-slate-900 dark:via-red-950/60 dark:to-slate-900 p-6 sm:p-8 shadow-sm dark:shadow-2xl">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-400 shadow-inner">
                <Flame className="h-5 w-5 animate-pulse" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400 font-mono">
                LemonDBD Meta Vault
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Community Build Vault & Otzdarva Meta Integration
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Explore battle-tested Meta loadouts, Otzdarva recommended builds, and top community strategies. Create, upvote, and share your custom perk combinations.
            </p>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:from-red-500 hover:to-red-600 transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Build</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/30 border border-red-500/40'
                    : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                  }`}
              >
                {Icon && <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : tab.color}`} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description, character, author, or perk..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:border-red-500 focus:outline-none cursor-pointer shadow-sm"
            >
              <option value="upvotes" className="dark:bg-slate-900">🔥 Most Upvoted</option>
              <option value="newest" className="dark:bg-slate-900">✨ Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Build Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800"
            />
          ))}
        </div>
      ) : builds.length === 0 ? (
        <div className="my-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <Flame className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Builds Found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search criteria or submit a new custom loadout!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {builds.map((build) => {
            const isOtz = build.category.toLowerCase() === 'otzdarva';
            const isUpvoted = !!upvotedIds[build.id];

            return (
              <div
                key={build.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-5 shadow-sm dark:shadow-xl hover:border-red-500/40 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-2xl transition-all"
              >
                <div>
                  {/* Top Row Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${build.role === 'survivor'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                          }`}
                      >
                        {build.role === 'survivor' ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <Skull className="h-3 w-3" />
                        )}
                        {build.role}
                      </span>

                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isOtz
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                          }`}
                      >
                        {isOtz && <Award className="h-3 w-3 text-amber-500 dark:text-amber-400" />}
                        {build.category}
                      </span>
                    </div>

                    {/* Author Badge */}
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      by {build.author}
                    </span>
                  </div>

                  {/* Build Title */}
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {build.title}
                  </h3>

                  {/* Build Description */}
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {build.description}
                  </p>

                  {/* Character Info */}
                  {build.character_id && build.character_id !== 'all' && (
                    <div className="mt-2 text-[11px] font-semibold text-slate-500">
                      Target Character:{' '}
                      <span className="text-slate-800 dark:text-slate-300 capitalize">
                        {build.character_id.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {/* Perks Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {build.perks.map((perk, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/80 p-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-inner group-hover:border-slate-300 dark:group-hover:border-slate-700/80 transition-colors"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-red-600/10 dark:bg-red-600/20 text-[10px] font-extrabold text-red-600 dark:text-red-400 font-mono">
                          {pIdx + 1}
                        </span>
                        <span className="truncate text-[11px] font-medium" title={perk}>
                          {perk}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  {/* Upvote Button */}
                  <button
                    onClick={() => handleUpvote(build.id)}
                    disabled={isUpvoted}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${isUpvoted
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${isUpvoted ? 'fill-amber-500 dark:fill-amber-400' : ''}`} />
                    <span>{build.upvotes}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Copy Build Button */}
                    <button
                      onClick={() => handleCopyBuild(build)}
                      title="Copy loadout text"
                      className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                      {copiedBuildId === build.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>

                    {/* Share Modal Button */}
                    <button
                      onClick={() => setShareBuild(build)}
                      title="Shareable Build Card & QR Code"
                      className="flex items-center gap-1 rounded-xl bg-red-600/10 border border-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-600/20 transition-all cursor-pointer shadow-sm"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Build Modal */}
      {isSubmitModalOpen && (
        <div
          onClick={() => setIsSubmitModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl cursor-default"
          >
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Plus className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Submit Custom Build</h2>
                <p className="text-xs text-slate-400">Share your custom loadout with the community</p>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitBuild} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Build Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enduring Spirit Nurse"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly explain the strategy or perk interactions..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'survivor' | 'killer')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-red-500 focus:outline-none"
                  >
                    <option value="survivor">🛡️ Survivor</option>
                    <option value="killer">💀 Killer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-red-500 focus:outline-none capitalize"
                  >
                    <option value="meta">Meta</option>
                    <option value="otzdarva">Otzdarva Recommended</option>
                    <option value="meme">Meme</option>
                    <option value="stealth">Stealth</option>
                    <option value="chase">Chase</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Target Character</label>
                  <input
                    type="text"
                    placeholder="e.g. Huntress or Meg"
                    value={newCharacter}
                    onChange={(e) => setNewCharacter(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Author Name</label>
                  <input
                    type="text"
                    placeholder="Your username"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Loadout Perks (4 Slots) *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Perk 1 (e.g. Sprint Burst)"
                    value={newPerk1}
                    onChange={(e) => setNewPerk1(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Perk 2 (e.g. Adrenaline)"
                    value={newPerk2}
                    onChange={(e) => setNewPerk2(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Perk 3 (e.g. Resilience)"
                    value={newPerk3}
                    onChange={(e) => setNewPerk3(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Perk 4 (e.g. Windows of Opportunity)"
                    value={newPerk4}
                    onChange={(e) => setNewPerk4(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 placeholder-slate-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-red-500 hover:to-red-600 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Loadout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shareable Build Card Modal */}
      {shareBuild && (
        <div
          onClick={() => setShareBuild(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 cursor-default"
          >
            <button
              onClick={() => setShareBuild(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Share2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-100">Share Build Card</h2>
                <p className="text-xs text-slate-400">Scan QR code or copy link to share</p>
              </div>
            </div>

            {/* Build Card Preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase ${shareBuild.role === 'survivor'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                >
                  {shareBuild.role}
                </span>
                <span className="text-[10px] font-bold text-amber-400 uppercase">
                  {shareBuild.category}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-100">{shareBuild.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{shareBuild.description}</p>
              </div>

              {/* Perk Badges */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {shareBuild.perks.map((perk, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-1.5 text-xs font-semibold text-slate-200"
                  >
                    <span className="h-4 w-4 shrink-0 rounded bg-red-600/20 text-[9px] font-bold text-red-400 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="truncate text-[11px]">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code & Share Link */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="shrink-0 bg-white p-1.5 rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}`}
                  alt="Build QR Code"
                  className="h-24 w-24 object-contain"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <QrCode className="h-3.5 w-3.5 text-red-400" />
                  <span>Scan with mobile device</span>
                </div>

                <button
                  onClick={handleCopyShareLink}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Share Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
