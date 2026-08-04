'use client';

import React, { useEffect, useState } from 'react';
import { Map, Skull, Shield, Compass, Search, Eye, Sparkles, Maximize2 } from 'lucide-react';
import { MapRealm } from '@/types/map';
import { fetchMaps, fetchMapDetail } from '@/services/mapApi';
import { FullscreenMapEngine } from './FullscreenMapEngine';

export const MapExplorer: React.FC = () => {
  const [maps, setMaps] = useState<MapRealm[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('coal_tower');
  const [activeMap, setActiveMap] = useState<MapRealm | null>(null);
  const [search, setSearch] = useState('');
  const [showTotems, setShowTotems] = useState(true);
  const [showTiles, setShowTiles] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  useEffect(() => {
    async function loadMaps() {
      try {
        const data = await fetchMaps(undefined, search);
        setMaps(data.maps);
        if (data.maps.length > 0 && !selectedMapId) {
          setSelectedMapId(data.maps[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMaps();
  }, [search]);

  useEffect(() => {
    if (!selectedMapId) return;
    async function loadDetail() {
      setLoading(true);
      try {
        const data = await fetchMapDetail(selectedMapId);
        setActiveMap(data.map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [selectedMapId]);

  return (
    <div className="space-y-6">
      {/* Search & Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-500 animate-spin" style={{ animationDuration: '10s' }} />
            Interactive Realm Maps & Totem Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explore 2D map layouts, totem spawn points, killer shack locations, and tile density.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsFullscreenOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Maximize2 className="w-4 h-4" />
            <span>⛶ Launch Fullscreen Interactive Engine</span>
          </button>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search map or realm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Map Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {maps.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMapId(m.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedMapId === m.id
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 scale-105'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Main Map View & Radar Stage */}
      {activeMap && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive 2D Map Canvas Stage */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{activeMap.name}</h3>
                <span className="text-xs text-amber-400">{activeMap.realm}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFullscreenOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fullscreen Engine</span>
                </button>
                <button
                  onClick={() => setShowTotems(!showTotems)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    showTotems ? 'bg-red-950 border border-red-500/40 text-red-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Skull className="w-3.5 h-3.5" />
                  <span>Totems ({activeMap.totem_spawns_count})</span>
                </button>
                <button
                  onClick={() => setShowTiles(!showTiles)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    showTiles ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Tiles ({activeMap.jungle_gyms_count})</span>
                </button>
              </div>
            </div>

            {/* 2D Interactive Canvas Overlay Simulation */}
            <div className="relative flex-1 w-full bg-slate-950 rounded-xl border border-slate-800/80 p-4 min-h-[300px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

              {/* Map Layout Grid Preview */}
              <div className="relative w-full h-full max-w-lg max-h-80 border-2 border-slate-700/60 rounded-xl bg-slate-900/60 p-4 flex flex-col justify-between">
                <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500 uppercase">
                  Layout: {activeMap.layout_type}
                </div>

                {/* Key Tiles Render */}
                {showTiles && (activeMap.tiles || activeMap.key_tiles)?.map((tile, i) => (
                  <div
                    key={i}
                    style={{ left: `${tile.x}%`, top: `${tile.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-[10px] px-2 py-1 rounded-md font-bold shadow-lg flex items-center gap-1"
                  >
                    <span>{tile.type === 'shack' ? '🛖' : tile.type === 'main' ? '🏛️' : '🧱'}</span>
                    <span>{tile.name}</span>
                  </div>
                ))}

                {/* Totem Spawns Render */}
                {showTotems && (activeMap.totem_spawns || activeMap.objectives?.filter(o => o.type === 'totem'))?.map((totem: any, i: number) => (
                  <div
                    key={totem.id || i}
                    style={{ left: `${totem.x}%`, top: `${totem.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-red-950/90 border border-red-500 text-red-400 p-1.5 rounded-full shadow-lg hover:scale-125 transition-transform group cursor-pointer"
                  >
                    <Skull className="w-3 h-3" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-slate-950 text-white text-[10px] p-1.5 rounded border border-slate-700 z-20">
                      {totem.location || totem.location_description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map Info Sidebar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-white mb-2">Map Specifications</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{activeMap.description}</p>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Pallet Density:</span>
                  <span className="text-amber-400 font-bold">{activeMap.pallet_density}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Jungle Gyms:</span>
                  <span className="text-emerald-400 font-bold">{activeMap.jungle_gyms_count} Loops</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Totem Spawns:</span>
                  <span className="text-red-400 font-bold">{activeMap.totem_spawns_count} Totems</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Basement Shack:</span>
                  <span className={activeMap.shack_has_basement ? "text-emerald-400 font-bold" : "text-slate-400"}>
                    {activeMap.shack_has_basement ? "Yes (Shack Basement)" : "Main Building / Alternate"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Hatch Logic: Hatch spawns when only 1 survivor remains in the trial.</span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Interactive Canvas Engine Modal Overlay */}
      {isFullscreenOpen && selectedMapId && (
        <FullscreenMapEngine
          mapId={selectedMapId}
          availableMaps={maps}
          onSelectMapId={(id) => setSelectedMapId(id)}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
    </div>
  );
};
