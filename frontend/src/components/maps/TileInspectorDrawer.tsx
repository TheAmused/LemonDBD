// frontend/src/components/maps/TileInspectorDrawer.tsx
'use client';

import React from 'react';
import { X, Compass, Footprints, Flame, Shield } from 'lucide-react';
import { MapTile, MapObjective, TotemSpawn, KeyTile, PalletSafetyRating } from '@/types/map';

export type InspectorSelectedItem = MapTile | MapObjective | TotemSpawn | KeyTile | null;

interface TileInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InspectorSelectedItem;
}

export const TileInspectorDrawer: React.FC<TileInspectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedItem,
}) => {
  if (!isOpen || !selectedItem) return null;

  // Normalize fields across MapTile / MapObjective / KeyTile / TotemSpawn
  const name =
    'name' in selectedItem && selectedItem.name
      ? selectedItem.name
      : 'location' in selectedItem && selectedItem.location
        ? selectedItem.location
        : 'location_description' in selectedItem && selectedItem.location_description
          ? selectedItem.location_description
          : 'Map Feature';

  const itemType =
    'type' in selectedItem && selectedItem.type
      ? selectedItem.type
      : 'Totem Spawn Point';

  const palletSafety: PalletSafetyRating | null =
    'pallet_safety_rating' in selectedItem && selectedItem.pallet_safety_rating
      ? (selectedItem.pallet_safety_rating as PalletSafetyRating)
      : null;

  const hasPallet =
    'has_pallet' in selectedItem ? selectedItem.has_pallet : itemType === 'pallet';

  const hasWindow =
    'has_window' in selectedItem ? selectedItem.has_window : itemType === 'window';

  const vaultDirections =
    'vault_directions' in selectedItem && selectedItem.vault_directions
      ? Array.isArray(selectedItem.vault_directions)
        ? selectedItem.vault_directions.join(', ')
        : selectedItem.vault_directions
      : 'vault_direction' in selectedItem && selectedItem.vault_direction
        ? selectedItem.vault_direction
        : null;

  const loopingTips =
    'looping_tips' in selectedItem && selectedItem.looping_tips
      ? selectedItem.looping_tips
      : null;

  const mindgameCounter =
    'mindgame_counter' in selectedItem && selectedItem.mindgame_counter
      ? selectedItem.mindgame_counter
      : null;

  const locationDesc =
    'location_description' in selectedItem
      ? selectedItem.location_description
      : 'location' in selectedItem
        ? selectedItem.location
        : null;

  const renderPalletSafetyBadge = (rating: PalletSafetyRating | null) => {
    if (!rating) {
      if (hasPallet) {
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/40 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold">
            <span>🪵 Standard Pallet Present</span>
          </div>
        );
      }
      return null;
    }

    switch (rating) {
      case 'god':
        return (
          <div className="flex items-center justify-between p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-300 shadow-lg shadow-emerald-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-lg">
                🟩
              </div>
              <div>
                <div className="font-extrabold text-sm text-emerald-200">God Pallet</div>
                <div className="text-[11px] text-emerald-400/80">Forces killer to break pallet. Safe 100% loop reset.</div>
              </div>
            </div>
          </div>
        );
      case 'safe':
        return (
          <div className="flex items-center justify-between p-3 bg-blue-950/80 border border-blue-500/60 rounded-xl text-blue-300 shadow-lg shadow-blue-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400 text-lg">
                🟦
              </div>
              <div>
                <div className="font-extrabold text-sm text-blue-200">Safe Pallet</div>
                <div className="text-[11px] text-blue-400/80">High safety margin. Difficult for killer to mindgame without breaking.</div>
              </div>
            </div>
          </div>
        );
      case 'mindgameable':
        return (
          <div className="flex items-center justify-between p-3 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-300 shadow-lg shadow-amber-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 text-lg">
                🟨
              </div>
              <div>
                <div className="font-extrabold text-sm text-amber-200">Mindgameable Pallet</div>
                <div className="text-[11px] text-amber-400/80">Medium safety. Watch out for red stain hiding and double-backs.</div>
              </div>
            </div>
          </div>
        );
      case 'unsafe':
        return (
          <div className="flex items-center justify-between p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-300 shadow-lg shadow-rose-950/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-400 text-lg">
                🟥
              </div>
              <div>
                <div className="font-extrabold text-sm text-rose-200">Death Trap / Unsafe Pallet</div>
                <div className="text-[11px] text-rose-400/80">Low wall / short loop. Pre-drop & stun, or abandon immediately!</div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl z-[60] flex flex-col justify-between transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xl font-bold">
            {itemType === 'shack' ? '🛖' : itemType === 'main' ? '🏛️' : itemType === 'totem' ? '💀' : itemType === 'generator' ? '⚡' : itemType === 'exit_gate' ? '🚪' : itemType === 'hatch' ? '🕳️' : '🧱'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{name}</h3>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400/90">{itemType}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
        {/* Pallet Safety Badge */}
        {(hasPallet || palletSafety) && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Pallet Safety Assessment
            </h4>
            {renderPalletSafetyBadge(palletSafety)}
          </div>
        )}

        {/* Vault Direction Warnings & Vault Speed Angle Tips */}
        {(hasWindow || vaultDirections) && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-indigo-500/30 rounded-2xl space-y-2.5 shadow-sm">
            <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Vault Direction & Speed Angle Tips
            </h4>
            {vaultDirections && (
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="text-slate-500">Allowed Directions:</span>
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-500/40 text-indigo-800 dark:text-indigo-300 rounded font-mono text-[11px]">
                  {vaultDirections}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              ⚡ <strong className="text-indigo-800 dark:text-indigo-200">Fast Vault (0.5s):</strong> Requires running straight at window with at least 2.5m momentum.
              <br />
              🏃 <strong className="text-slate-500 dark:text-slate-400">Medium Vault (0.9s):</strong> Triggers on angled approach. High risk of killer hit!
            </p>
          </div>
        )}

        {/* Survivor Looping Pathing Tips */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-2 shadow-sm">
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            Survivor Looping Pathing Tips
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {loopingTips || (
              <>
                Hug high walls tightly to minimize loop distance. Watch killer red stain over low obstacles and keep camera focused behind you while pathing.
              </>
            )}
          </p>
        </div>

        {/* Killer Counterplay Strategy */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-red-500/30 rounded-2xl space-y-2 shadow-sm">
          <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
            Killer Mindgame Counterplay
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {mindgameCounter || (
              <>
                Killers will attempt to hide red stain by moonwalking backward around high walls or faking window vault angles to force premature pallet drops.
              </>
            )}
          </p>
        </div>

        {/* Location / Description Meta */}
        {locationDesc && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between shadow-sm">
            <span className="text-slate-500">Location Note:</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium text-right">{locationDesc}</span>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center">
        <span className="text-[11px] text-slate-500 font-mono">LemonDBD Interactive Realm Inspector</span>
      </div>
    </div>
  );
};
