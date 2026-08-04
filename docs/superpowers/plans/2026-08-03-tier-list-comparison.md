# Tier List & Perk Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive, role-segmented perk tier list maker and side-by-side perk comparison tool with URL sharing and PNG export for LemonDBD.

**Architecture:** A dedicated Next.js App Router route (`/[locale]/tierlist`) renders client components for drag-and-drop tier management (`S`, `A`, `B`, `C`, `D`), unranked perk pool filtering, and a slide-up perk comparison drawer. Tier list state auto-saves in `localStorage` and serializes into compressed URL query parameters (`?role=survivor&data=...`) for instant link sharing.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph Frontend Page: /[locale]/tierlist
        Page[TierList Page] --> Header[TierListHeader]
        Page --> Board[TierListBoard]
        Page --> Pool[UnrankedPool]
        Page --> Drawer[PerkCompareDrawer]
        Page --> Modal[ShareModal]
        
        Board --> TierRow[TierRow Component]
        TierRow --> PerkCard[Perk Cards]
        Pool --> PerkCard
    end
    
    subgraph Utilities & State
        Page --> Storage[localStorage Sync]
        Page --> URLState[URL Encoder / Decoder]
        Header --> PNGExporter[html-to-image Exporter]
    end
```

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide React icons, `html-to-image`, `next-themes`.

## Global Constraints

- Must maintain full i18n support across `en`, `es`, and `pl` locales.
- Mobile and desktop responsive layout with glassmorphism dark-mode styling matching LemonDBD theme.
- Client-side state persistence via `localStorage` keys (`lemon_dbd_tierlist_survivor`, `lemon_dbd_tierlist_killer`).
- Compact URL query parameter structure (`?role=<role>&data=<encoded_tier_placements>`).

---

### Task 1: Tier List Types & State Serializer Utility

**Files:**
- Create: `frontend/src/types/tierlist.ts`
- Create: `frontend/src/utils/tierlistSerializer.ts`
- Create: `frontend/src/utils/__tests__/tierlistSerializer.test.ts`

**Interfaces:**
- Consumes: Perk data model `{ id: string, name: string, icon: string, role: string }`
- Produces: `Tier`, `TierListState`, `encodeTierListState(state: TierListState): string`, `decodeTierListState(dataStr: string, role: Role): Tier[]`

- [ ] **Step 1: Create TypeScript type definitions**

Create `frontend/src/types/tierlist.ts`:
```typescript
export type Role = 'survivor' | 'killer';

export interface Tier {
  id: string;
  name: string;
  color: string; // Tailwind color class / hex for header badge
  perkIds: string[];
}

export interface TierListState {
  role: Role;
  tiers: Tier[];
  comparePerkIds: string[];
}

export const DEFAULT_TIERS: Tier[] = [
  { id: 'tier-s', name: 'S Tier', color: 'bg-red-500/20 text-red-400 border-red-500/30', perkIds: [] },
  { id: 'tier-a', name: 'A Tier', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', perkIds: [] },
  { id: 'tier-b', name: 'B Tier', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', perkIds: [] },
  { id: 'tier-c', name: 'C Tier', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', perkIds: [] },
  { id: 'tier-d', name: 'D Tier', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', perkIds: [] },
];
```

- [ ] **Step 2: Write failing unit test for URL encoding/decoding**

Create `frontend/src/utils/__tests__/tierlistSerializer.test.ts`:
```typescript
import { encodeTierListState, decodeTierListState } from '../tierlistSerializer';
import { DEFAULT_TIERS } from '../../types/tierlist';

describe('tierlistSerializer', () => {
  it('should encode and decode tier list state correctly', () => {
    const mockTiers = DEFAULT_TIERS.map((t, idx) => 
      idx === 0 ? { ...t, perkIds: ['perk-1', 'perk-2'] } : t
    );

    const encoded = encodeTierListState(mockTiers);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeTierListState(encoded);
    expect(decoded).toHaveLength(5);
    expect(decoded[0].perkIds).toEqual(['perk-1', 'perk-2']);
  });

  it('should return default tiers on empty or corrupted string', () => {
    const decoded = decodeTierListState('invalid-corrupted-data');
    expect(decoded).toHaveLength(5);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm test src/utils/__tests__/tierlistSerializer.test.ts` (or run jest/vitest if configured, or build verification)
Expected: Fail with `Cannot find module '../tierlistSerializer'`

- [ ] **Step 4: Implement `tierlistSerializer.ts`**

Create `frontend/src/utils/tierlistSerializer.ts`:
```typescript
import { Tier, DEFAULT_TIERS } from '../types/tierlist';

/**
 * Encodes tier perk IDs into a compact URL parameter string.
 * Format: "tier-s:1,2|tier-a:5,6|tier-b:..."
 */
export function encodeTierListState(tiers: Tier[]): string {
  return tiers
    .map((tier) => `${tier.id}:${tier.perkIds.join(',')}`)
    .join('|');
}

/**
 * Decodes a URL parameter string into Tier object structure.
 * Falls back to DEFAULT_TIERS if data string is empty or invalid.
 */
export function decodeTierListState(dataStr?: string | null): Tier[] {
  if (!dataStr || typeof dataStr !== 'string') {
    return DEFAULT_TIERS.map((t) => ({ ...t, perkIds: [] }));
  }

  try {
    const tierMap = new Map<string, string[]>();
    const segments = dataStr.split('|');

    for (const segment of segments) {
      const [tierId, perkIdList] = segment.split(':');
      if (tierId && perkIdList) {
        const ids = perkIdList.split(',').filter(Boolean);
        tierMap.set(tierId, ids);
      }
    }

    return DEFAULT_TIERS.map((defaultTier) => ({
      ...defaultTier,
      perkIds: tierMap.get(defaultTier.id) || [],
    }));
  } catch (error) {
    console.error('Failed to decode tier list state:', error);
    return DEFAULT_TIERS.map((t) => ({ ...t, perkIds: [] }));
  }
}
```

- [ ] **Step 5: Commit changes**

```bash
git add frontend/src/types/tierlist.ts frontend/src/utils/tierlistSerializer.ts frontend/src/utils/__tests__/tierlistSerializer.test.ts
git commit -m "feat(tierlist): add tierlist state types and url serializer utility"
```

---

### Task 2: Add i18n Dictionaries & Navbar Navigation Link

**Files:**
- Modify: `frontend/src/locales/en.json`
- Modify: `frontend/src/locales/es.json`
- Modify: `frontend/src/locales/pl.json`
- Modify: `frontend/src/components/Navbar.tsx:82-105`

**Interfaces:**
- Consumes: Navbar locale dictionaries
- Produces: Tier List navigation link in top navbar, translated UI text for `/tierlist`

- [ ] **Step 1: Update `en.json`, `es.json`, `pl.json` with `"tierlist"` namespace**

Modify `frontend/src/locales/en.json`:
```diff
   "empty": {
     "title": "No Perks Found",
     "subtitle": "Try adjusting your search terms or filter combinations."
+  },
+  "tierlist": {
+    "navTitle": "Tier List",
+    "title": "Perk Tier List & Comparison",
+    "subtitle": "Rank, organize, and compare Dead by Daylight perks side-by-side.",
+    "survivor": "Survivor Perks",
+    "killer": "Killer Perks",
+    "unranked": "Unranked Perk Pool",
+    "exportPng": "Export PNG",
+    "shareLink": "Share List",
+    "copied": "Copied to clipboard!",
+    "reset": "Reset Tiers",
+    "searchPlaceholder": "Search perks to assign or compare...",
+    "compareTitle": "Perk Comparison Matrix",
+    "compareButton": "Compare Selected ({count})",
+    "clearCompare": "Clear Selection",
+    "noSelection": "Click 'Compare' on perks below to start side-by-side analysis."
   }
 }
```

Modify `frontend/src/locales/es.json` and `frontend/src/locales/pl.json` with corresponding translated strings.

- [ ] **Step 2: Update `Navbar.tsx` to include Tier List Link**

Modify `frontend/src/components/Navbar.tsx`:
```diff
         {/* Brand Logo */}
         <Link href={`/${currentLocale}`} className="flex items-center gap-3 group">
           <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-900 text-white shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
             <Flame className="h-5 w-5 text-red-100 animate-pulse" />
           </div>
           <div>
             <div className="flex items-center gap-1.5">
               <span className="font-extrabold text-sm tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                 {dict.app.title}
               </span>
               <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                 PRO
               </span>
             </div>
             <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
               {dict.app.subtitle}
             </p>
           </div>
         </Link>

+        {/* Nav Navigation Links */}
+        <nav className="hidden md:flex items-center gap-1">
+          <Link
+            href={`/${currentLocale}`}
+            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
+              pathname === `/${currentLocale}`
+                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
+                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
+            }`}
+          >
+            {dict.filters?.allCategories || 'Explorer'}
+          </Link>
+          <Link
+            href={`/${currentLocale}/tierlist`}
+            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
+              pathname?.includes('/tierlist')
+                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
+                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
+            }`}
+          >
+            {dict.tierlist?.navTitle || 'Tier List'}
+          </Link>
+        </nav>
```

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/locales/ frontend/src/components/Navbar.tsx
git commit -m "feat(i18n): add tierlist dictionary keys and navbar link"
```

---

### Task 3: Build Tier List Board & Drag-and-Drop Components

**Files:**
- Create: `frontend/src/components/tierlist/TierRow.tsx`
- Create: `frontend/src/components/tierlist/TierListBoard.tsx`
- Create: `frontend/src/components/tierlist/UnrankedPool.tsx`

**Interfaces:**
- Consumes: `Tier`, `Perk` objects
- Produces: Interactive Tier list rows with move/remove perk actions and searchable perk selection pool.

- [ ] **Step 1: Create `TierRow.tsx`**

Create `frontend/src/components/tierlist/TierRow.tsx`:
```tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Tier } from '../../types/tierlist';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

interface TierRowProps {
  tier: Tier;
  perksMap: Map<string, any>;
  onRemovePerk: (tierId: string, perkId: string) => void;
  onMovePerk: (perkId: string, targetTierId: string) => void;
  onSelectCompare: (perkId: string) => void;
  comparePerkIds: string[];
}

export const TierRow: React.FC<TierRowProps> = ({
  tier,
  perksMap,
  onRemovePerk,
  onMovePerk,
  onSelectCompare,
  comparePerkIds,
}) => {
  return (
    <div className="flex flex-col sm:flex-row min-h-[90px] w-full rounded-2xl border border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-slate-900/60 overflow-hidden shadow-sm backdrop-blur-md">
      {/* Tier Label Badge */}
      <div className={`flex w-full sm:w-28 items-center justify-center p-4 font-black text-lg sm:text-xl tracking-wider border-b sm:border-b-0 sm:border-r border-slate-200/80 dark:border-slate-800/80 ${tier.color}`}>
        {tier.name}
      </div>

      {/* Perk Drop Zone / Grid */}
      <div className="flex-1 p-3 flex flex-wrap items-center gap-2 min-h-[70px]">
        {tier.perkIds.length === 0 ? (
          <span className="text-xs italic text-slate-400 dark:text-slate-600 px-2">
            No perks assigned yet. Drag or click perks below to add.
          </span>
        ) : (
          tier.perkIds.map((perkId) => {
            const perk = perksMap.get(perkId);
            if (!perk) return null;
            const isCompared = comparePerkIds.includes(perkId);

            return (
              <div
                key={perkId}
                className="group relative flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-950 p-1.5 shadow-md hover:scale-105 transition-all cursor-pointer"
                onClick={() => onSelectCompare(perkId)}
                title={`${perk.name} - Click to compare`}
              >
                <img
                  src={perk.icon_url || '/placeholder.png'}
                  alt={perk.name}
                  className="h-full w-full object-contain"
                />
                
                {/* Remove Quick Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePerk(tier.id, perkId);
                  }}
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] shadow"
                >
                  <X className="h-3 w-3" />
                </button>

                {isCompared && (
                  <span className="absolute bottom-0 inset-x-0 bg-red-600 text-[9px] font-extrabold text-white text-center rounded-b-lg py-0.5">
                    COMPARE
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `TierListBoard.tsx`**

Create `frontend/src/components/tierlist/TierListBoard.tsx`:
```tsx
'use client';

import React from 'react';
import { Tier } from '../../types/tierlist';
import { TierRow } from './TierRow';

interface TierListBoardProps {
  tiers: Tier[];
  perksMap: Map<string, any>;
  onRemovePerk: (tierId: string, perkId: string) => void;
  onMovePerk: (perkId: string, targetTierId: string) => void;
  onSelectCompare: (perkId: string) => void;
  comparePerkIds: string[];
}

export const TierListBoard: React.FC<TierListBoardProps> = ({
  tiers,
  perksMap,
  onRemovePerk,
  onMovePerk,
  onSelectCompare,
  comparePerkIds,
}) => {
  return (
    <div id="tier-list-board" className="flex flex-col gap-3 w-full">
      {tiers.map((tier) => (
        <TierRow
          key={tier.id}
          tier={tier}
          perksMap={perksMap}
          onRemovePerk={onRemovePerk}
          onMovePerk={onMovePerk}
          onSelectCompare={onSelectCompare}
          comparePerkIds={comparePerkIds}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Create `UnrankedPool.tsx`**

Create `frontend/src/components/tierlist/UnrankedPool.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Tier } from '../../types/tierlist';

interface UnrankedPoolProps {
  perks: any[];
  assignedPerkIds: Set<string>;
  tiers: Tier[];
  onAssignPerk: (tierId: string, perkId: string) => void;
  onSelectCompare: (perkId: string) => void;
  comparePerkIds: string[];
  dict: any;
}

export const UnrankedPool: React.FC<UnrankedPoolProps> = ({
  perks,
  assignedPerkIds,
  tiers,
  onAssignPerk,
  onSelectCompare,
  comparePerkIds,
  dict,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTierTarget, setSelectedTierTarget] = useState<string>('tier-s');

  const unassignedPerks = perks.filter(
    (p) => !assignedPerkIds.has(p.id) && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.character?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/60 p-5 dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
            {dict.tierlist?.unranked || 'Unranked Perk Pool'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any perk card to assign it to your target tier or compare stats.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Target Tier Selector */}
          <select
            value={selectedTierTarget}
            onChange={(e) => setSelectedTierTarget(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                Add to {t.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict.tierlist?.searchPlaceholder || 'Filter perks...'}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Perk Cards Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3.5 max-h-[360px] overflow-y-auto p-1">
        {unassignedPerks.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400">
            All matching perks assigned or none found.
          </div>
        ) : (
          unassignedPerks.map((perk) => {
            const isCompared = comparePerkIds.includes(perk.id);

            return (
              <div
                key={perk.id}
                onClick={() => onAssignPerk(selectedTierTarget, perk.id)}
                className="group relative flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-slate-950 p-2 shadow-sm hover:scale-105 hover:border-red-500/50 transition-all cursor-pointer"
                title={`${perk.name} (${perk.character || 'General'})`}
              >
                <img
                  src={perk.icon_url || '/placeholder.png'}
                  alt={perk.name}
                  className="h-12 w-12 object-contain"
                />
                <span className="mt-1 line-clamp-1 text-[10px] font-medium text-slate-300 text-center">
                  {perk.name}
                </span>

                {/* Compare toggle trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCompare(perk.id);
                  }}
                  className="mt-1 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                >
                  {isCompared ? 'Comparing' : '+ Compare'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Commit changes**

```bash
git add frontend/src/components/tierlist/
git commit -m "feat(tierlist): build TierRow, TierListBoard and UnrankedPool components"
```

---

### Task 4: Build PerkCompareDrawer & ShareModal Components

**Files:**
- Create: `frontend/src/components/tierlist/PerkCompareDrawer.tsx`
- Create: `frontend/src/components/tierlist/ShareModal.tsx`

**Interfaces:**
- Consumes: Selected perk IDs array, Share URL string
- Produces: Slide-up side-by-side comparison spec matrix and URL copy modal.

- [ ] **Step 1: Create `PerkCompareDrawer.tsx`**

Create `frontend/src/components/tierlist/PerkCompareDrawer.tsx`:
```tsx
'use client';

import React from 'react';
import { X, Layers, Shield, User } from 'lucide-react';

interface PerkCompareDrawerProps {
  comparePerkIds: string[];
  perksMap: Map<string, any>;
  onClear: () => void;
  onRemove: (perkId: string) => void;
  dict: any;
}

export const PerkCompareDrawer: React.FC<PerkCompareDrawerProps> = ({
  comparePerkIds,
  perksMap,
  onClear,
  onRemove,
  dict,
}) => {
  if (comparePerkIds.length === 0) return null;

  const selectedPerks = comparePerkIds
    .map((id) => perksMap.get(id))
    .filter(Boolean);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-800 bg-slate-950/95 p-4 sm:p-6 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-red-500" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-100">
              {dict.tierlist?.compareTitle || 'Perk Comparison Matrix'}
            </h3>
            <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-400 border border-red-500/30">
              {selectedPerks.length} / 4
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              {dict.tierlist?.clearCompare || 'Clear All'}
            </button>
            <button
              onClick={onClear}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Cards Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto">
          {selectedPerks.map((perk) => (
            <div
              key={perk.id}
              className="relative flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <button
                onClick={() => onRemove(perk.id)}
                className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>

              <div className="flex items-center gap-3">
                <img
                  src={perk.icon_url || '/placeholder.png'}
                  alt={perk.name}
                  className="h-12 w-12 object-contain bg-slate-950 p-1 rounded-lg border border-slate-800"
                />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-100">{perk.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <User className="h-3 w-3 text-red-400" />
                    <span>{perk.character || 'General Perk'}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed max-h-28 overflow-y-auto">
                {perk.description || 'No description available.'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `ShareModal.tsx`**

Create `frontend/src/components/tierlist/ShareModal.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { Copy, Check, X, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  dict: any;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  dict,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy share link:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-red-500" />
            <h3 className="font-extrabold text-base text-slate-100">
              {dict.tierlist?.shareLink || 'Share Tier List'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Anyone with this link will be able to view your custom tier list configuration.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500 transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/components/tierlist/PerkCompareDrawer.tsx frontend/src/components/tierlist/ShareModal.tsx
git commit -m "feat(tierlist): create PerkCompareDrawer and ShareModal components"
```

---

### Task 5: Build `/[locale]/tierlist` Page & State Wiring

**Files:**
- Create: `frontend/src/app/[locale]/tierlist/page.tsx`

**Interfaces:**
- Consumes: Backend API `/api/v1/perks`, URL search params, `localStorage`
- Produces: Complete, interactive Tier List & Perk Comparison page.

- [ ] **Step 1: Create `page.tsx` for `/[locale]/tierlist`**

Create `frontend/src/app/[locale]/tierlist/page.tsx`:
```tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getDictionary } from '../../../i18n/get-dictionary';
import { Locale } from '../../../i18n/config';
import { Role, Tier, DEFAULT_TIERS } from '../../../types/tierlist';
import { encodeTierListState, decodeTierListState } from '../../../utils/tierlistSerializer';
import { TierListBoard } from '../../../components/tierlist/TierListBoard';
import { UnrankedPool } from '../../../components/tierlist/UnrankedPool';
import { PerkCompareDrawer } from '../../../components/tierlist/PerkCompareDrawer';
import { ShareModal } from '../../../components/tierlist/ShareModal';
import { Share2, Download, RotateCcw, Shield, User } from 'lucide-react';

export default function TierListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';

  const [dict, setDict] = useState<any>({});
  const [perks, setPerks] = useState<any[]>([]);
  const [role, setRole] = useState<Role>('survivor');
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [comparePerkIds, setComparePerkIds] = useState<string[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Load Dictionary
  useEffect(() => {
    getDictionary(locale).then((res) => setDict(res));
  }, [locale]);

  // Fetch Perks from Backend
  useEffect(() => {
    fetch(`${backendBase}/api/v1/perks?limit=500`)
      .then((res) => res.json())
      .then((data) => {
        if (data.perks) setPerks(data.perks);
      })
      .catch((err) => console.error('Failed to fetch perks:', err));
  }, [backendBase]);

  // Hydrate from URL or LocalStorage
  useEffect(() => {
    const urlRole = searchParams.get('role') as Role;
    const urlData = searchParams.get('data');

    if (urlRole && (urlRole === 'survivor' || urlRole === 'killer')) {
      setRole(urlRole);
    }

    if (urlData) {
      setTiers(decodeTierListState(urlData));
    } else {
      const activeRole = urlRole || 'survivor';
      const local = localStorage.getItem(`lemon_dbd_tierlist_${activeRole}`);
      if (local) {
        setTiers(decodeTierListState(local));
      }
    }
  }, [searchParams]);

  // Sync to LocalStorage on tier changes
  useEffect(() => {
    const encoded = encodeTierListState(tiers);
    localStorage.setItem(`lemon_dbd_tierlist_${role}`, encoded);
  }, [tiers, role]);

  const perksMap = useMemo(() => {
    const map = new Map<string, any>();
    perks.forEach((p) => map.set(p.id, p));
    return map;
  }, [perks]);

  const roleFilteredPerks = useMemo(() => {
    return perks.filter((p) => p.role?.toLowerCase() === role);
  }, [perks, role]);

  const assignedPerkIds = useMemo(() => {
    const set = new Set<string>();
    tiers.forEach((t) => t.perkIds.forEach((id) => set.add(id)));
    return set;
  }, [tiers]);

  const handleAssignPerk = (tierId: string, perkId: string) => {
    setTiers((prev) =>
      prev.map((t) => {
        if (t.id === tierId) {
          return t.perkIds.includes(perkId) ? t : { ...t, perkIds: [...t.perkIds, perkId] };
        }
        return { ...t, perkIds: t.perkIds.filter((id) => id !== perkId) };
      })
    );
  };

  const handleRemovePerk = (tierId: string, perkId: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, perkIds: t.perkIds.filter((id) => id !== perkId) } : t))
    );
  };

  const handleResetTiers = () => {
    setTiers(DEFAULT_TIERS.map((t) => ({ ...t, perkIds: [] })));
  };

  const handleSelectCompare = (perkId: string) => {
    setComparePerkIds((prev) =>
      prev.includes(perkId) ? prev.filter((id) => id !== perkId) : [...prev.slice(-3), perkId]
    );
  };

  const handleGenerateShare = () => {
    const encoded = encodeTierListState(tiers);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/${locale}/tierlist?role=${role}&data=${encodeURIComponent(encoded)}`;
    setShareUrl(url);
    setIsShareOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 pb-32">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {dict.tierlist?.title || 'Perk Tier List & Comparison'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {dict.tierlist?.subtitle || 'Rank, organize, and compare Dead by Daylight perks side-by-side.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateShare}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Share2 className="h-4 w-4 text-red-500" />
              <span>{dict.tierlist?.shareLink || 'Share'}</span>
            </button>
            <button
              onClick={handleResetTiers}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              title={dict.tierlist?.reset || 'Reset Tiers'}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Role Toggle Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRole('survivor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              role === 'survivor'
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-900/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <User className="h-4 w-4" />
            <span>{dict.tierlist?.survivor || 'Survivor Perks'}</span>
          </button>
          <button
            onClick={() => setRole('killer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              role === 'killer'
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-900/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>{dict.tierlist?.killer || 'Killer Perks'}</span>
          </button>
        </div>

        {/* Tier List Canvas */}
        <TierListBoard
          tiers={tiers}
          perksMap={perksMap}
          onRemovePerk={handleRemovePerk}
          onMovePerk={handleAssignPerk}
          onSelectCompare={handleSelectCompare}
          comparePerkIds={comparePerkIds}
        />

        {/* Unranked Perks Pool */}
        <UnrankedPool
          perks={roleFilteredPerks}
          assignedPerkIds={assignedPerkIds}
          tiers={tiers}
          onAssignPerk={handleAssignPerk}
          onSelectCompare={handleSelectCompare}
          comparePerkIds={comparePerkIds}
          dict={dict}
        />

        {/* Comparison Drawer */}
        <PerkCompareDrawer
          comparePerkIds={comparePerkIds}
          perksMap={perksMap}
          onClear={() => setComparePerkIds([])}
          onRemove={handleSelectCompare}
          dict={dict}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          shareUrl={shareUrl}
          dict={dict}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit changes**

```bash
git add frontend/src/app/\[locale\]/tierlist/page.tsx
git commit -m "feat(tierlist): create /[locale]/tierlist page and wire state & storage"
```

---

### Task 6: Add PNG Canvas Export with `html-to-image`

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/app/[locale]/tierlist/page.tsx`

**Interfaces:**
- Consumes: `#tier-list-board` DOM node
- Produces: Client-side PNG file download (`LemonDBD-TierList-Survivor.png`)

- [ ] **Step 1: Install `html-to-image` dependency in frontend**

Run: `cd frontend && npm install html-to-image`

- [ ] **Step 2: Add `handleExportPNG` function to `TierListPage`**

Modify `frontend/src/app/[locale]/tierlist/page.tsx`:
```diff
+import { toPng } from 'html-to-image';

+  const handleExportPNG = async () => {
+    const node = document.getElementById('tier-list-board');
+    if (!node) return;
+    try {
+      const dataUrl = await toPng(node, { cacheBust: true });
+      const link = document.createElement('a');
+      link.download = `LemonDBD-TierList-${role}.png`;
+      link.href = dataUrl;
+      link.click();
+    } catch (err) {
+      console.error('Failed to export PNG:', err);
+    }
+  };
```

Update action button in page header:
```diff
           <div className="flex items-center gap-2">
+            <button
+              onClick={handleExportPNG}
+              className="flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-500 transition-colors"
+            >
+              <Download className="h-4 w-4" />
+              <span>{dict.tierlist?.exportPng || 'Export PNG'}</span>
+            </button>
             <button
               onClick={handleGenerateShare}
```

- [ ] **Step 3: Test Build & Commit**

Run: `cd frontend && npm run build`
Expected: Successful Next.js build without TypeScript or lint errors.

```bash
git add frontend/package.json frontend/src/app/\[locale\]/tierlist/page.tsx
git commit -m "feat(tierlist): add PNG image export via html-to-image"
```
