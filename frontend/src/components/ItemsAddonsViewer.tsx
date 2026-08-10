'use client';

import React, { useState, useEffect } from 'react';
import { Search, Package, Sparkles, Filter, Shield, Skull, X } from 'lucide-react';

export interface ItemModel {
  name: string;
  category: string;
  role: string;
  description: string;
  icon_url: string;
  icon_local_path: string;
  rarity: string;
}

export interface AddonModel {
  name: string;
  associated_target: string;
  category: string;
  description: string;
  icon_url: string;
  icon_local_path: string;
  rarity: string;
}

export function ItemsAddonsViewer() {
  const [activeTab, setActiveTab] = useState<'items' | 'addons'>('items');
  const [items, setItems] = useState<ItemModel[]>([]);
  const [addons, setAddons] = useState<AddonModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [selectedDetail, setSelectedDetail] = useState<ItemModel | AddonModel | null>(null);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [resItems, resAddons] = await Promise.all([
          fetch(`${backendBase}/api/v1/items`),
          fetch(`${backendBase}/api/v1/addons`),
        ]);
        if (resItems.ok) {
          const dataItems = await resItems.json();
          setItems(dataItems.data || []);
        }
        if (resAddons.ok) {
          const dataAddons = await resAddons.json();
          setAddons(dataAddons.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch items/addons:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [backendBase]);

  const getRarityBadgeStyle = (rarity: string) => {
    const clean = (rarity || '').toLowerCase().replace(/\s+/g, '');
    if (clean.includes('ultrarare')) {
      return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
    }
    if (clean.includes('veryrare')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    if (clean.includes('rare')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (clean.includes('uncommon')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (clean.includes('common')) {
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesRarity =
      rarityFilter === 'all' ||
      item.rarity.toLowerCase().replace(/\s+/g, '') === rarityFilter.toLowerCase().replace(/\s+/g, '');
    return matchesSearch && matchesCategory && matchesRarity;
  });

  const filteredAddons = addons.filter((addon) => {
    const matchesSearch =
      !search ||
      addon.name.toLowerCase().includes(search.toLowerCase()) ||
      addon.description.toLowerCase().includes(search.toLowerCase()) ||
      addon.associated_target.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || addon.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesRarity =
      rarityFilter === 'all' ||
      addon.rarity.toLowerCase().replace(/\s+/g, '') === rarityFilter.toLowerCase().replace(/\s+/g, '');
    return matchesSearch && matchesCategory && matchesRarity;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Items &amp; Add-ons Vault
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore Survivor Equipment, Killer Add-ons, and Item Enhancements
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
          <button
            onClick={() => {
              setActiveTab('items');
              setSearch('');
            }}
            className={
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ' +
              (activeTab === 'items'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')
            }
          >
            <Package className="h-4 w-4" />
            <span>Survivor Items ({items.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('addons');
              setSearch('');
            }}
            className={
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ' +
              (activeTab === 'addons'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')
            }
          >
            <Sparkles className="h-4 w-4" />
            <span>Add-ons ({addons.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Bar */}
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab === 'items' ? 'items' : 'add-ons'} by name or text...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer font-bold"
          >
            <option value="all" className="dark:bg-slate-900">All Roles</option>
            <option value="Survivor" className="dark:bg-slate-900">Survivor</option>
            <option value="Killer" className="dark:bg-slate-900">Killer</option>
          </select>
        </div>

        {/* Rarity Filter */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <Sparkles className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer font-bold"
          >
            <option value="all" className="dark:bg-slate-900">All Rarities</option>
            <option value="common" className="dark:bg-slate-900">Common</option>
            <option value="uncommon" className="dark:bg-slate-900">Uncommon</option>
            <option value="rare" className="dark:bg-slate-900">Rare</option>
            <option value="veryrare" className="dark:bg-slate-900">Very Rare</option>
            <option value="ultrarare" className="dark:bg-slate-900">Ultra Rare</option>
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-300 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400" />
          <span className="text-xs font-bold text-slate-400">Loading {activeTab}...</span>
        </div>
      ) : activeTab === 'items' ? (
        filteredItems.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400">
            No survivor items match your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedDetail(item)}
                className="group relative flex flex-col justify-between p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/50 group-hover:scale-105 transition-transform">
                      {item.icon_local_path ? (
                        <img
                          src={`${backendBase}/static/${item.icon_local_path}`}
                          alt={item.name}
                          className="h-12 w-12 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    {item.rarity && (
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${getRarityBadgeStyle(item.rarity)}`}>
                        {item.rarity}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                    {item.description || 'No description available.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredAddons.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400">
          No add-ons match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAddons.map((addon, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedDetail(addon)}
              className="group relative flex flex-col justify-between p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/50 group-hover:scale-105 transition-transform">
                    {addon.icon_local_path ? (
                      <img
                        src={`${backendBase}/static/${addon.icon_local_path}`}
                        alt={addon.name}
                        className="h-12 w-12 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Sparkles className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {addon.rarity && (
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${getRarityBadgeStyle(addon.rarity)}`}>
                        {addon.rarity}
                      </span>
                    )}
                    {addon.category && (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {addon.category}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                  {addon.name}
                </h3>
                {addon.associated_target && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                    Target: {addon.associated_target}
                  </span>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {addon.description || 'No description available.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail View */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDetail(null);
          }}
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl p-6 space-y-4">
            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                {selectedDetail.icon_local_path ? (
                  <img
                    src={`${backendBase}/static/${selectedDetail.icon_local_path}`}
                    alt={selectedDetail.name}
                    className="h-14 w-14 object-contain"
                  />
                ) : (
                  <Package className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedDetail.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {selectedDetail.rarity && (
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${getRarityBadgeStyle(selectedDetail.rarity)}`}>
                      {selectedDetail.rarity}
                    </span>
                  )}
                  {('associated_target' in selectedDetail) && selectedDetail.associated_target && (
                    <span className="px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                      {selectedDetail.associated_target}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedDetail.description || 'No description available.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
