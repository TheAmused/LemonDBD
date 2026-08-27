'use client';
// frontend/src/app/[locale]/perks/page.tsx

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard } from '@/components/PerkCard';
import { PerkModal } from '@/components/PerkModal';
import { PerkGenerator } from '@/components/PerkGenerator';
import { QuestsModal } from '@/components/QuestsModal';
import { Pagination } from '@/components/Pagination';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { Shield, Skull, Database, Flame, CheckCircle2 } from 'lucide-react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useAuth } from '@/context/AuthContext';
import {
  Perk,
  CharacterItem,
  CharacterOption,
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
  ViewDisplayMode,
  PerkDictionary,
} from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const DASHBOARD_TAB_KEY = 'lemon_dbd_active_tab_v3';
const DEFAULT_PERKS_PER_PAGE = 15;

function PerksContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();
  const { user } = useAuth();

  const paramTab = searchParams ? searchParams.get('tab') : null;
  const paramRole = searchParams ? searchParams.get('role') : null;

  const [dict, setDict] = useState<PerkDictionary | null>(null);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [allPerksForGenerator, setAllPerksForGenerator] = useState<Perk[]>([]);
  const [characterOptions, setCharacterOptions] = useState<CharacterOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'vault' | 'generator'>('vault');
  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [character, setCharacter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PERKS_PER_PAGE);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);

  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const [ownedPerksCount, setOwnedPerksCount] = useState<number>(0);

  const [viewMode, setViewMode] = useState<ViewDisplayMode>('grid');
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    getDictionary(locale).then((d) => setDict(d as PerkDictionary));
  }, [locale]);

  useEffect(() => {
    if (paramTab === 'generator') {
      setActiveTab('generator');
      document.title = dict?.app?.perkRandomizerPageTitle || 'LemonDBD - Perk Randomizer';
    } else {
      setActiveTab('vault');
      if (paramRole === 'Killer' || paramRole === 'Survivor') {
        setRole(paramRole);
      }
      document.title = dict?.app?.perksVaultPageTitle || 'LemonDBD - Dead by Daylight Perks Vault';
    }
  }, [paramTab, paramRole, dict]);

  const handleSelectCategoryFromSidebar = (selected: string) => {
    if (selected === 'generator') {
      setActiveTab('generator');
      try {
        localStorage.setItem(DASHBOARD_TAB_KEY, 'generator');
      } catch (e) {
        console.error('Failed saving tab preference:', e);
      }
    } else {
      setActiveTab('vault');
      if (selected === 'Survivor' || selected === 'Killer') {
        setRole(selected);
        setScope('all');
      } else if (selected === 'General') {
        setScope('general');
      } else {
        setScope('all');
      }
      setCharacter('all');
      setPage(1);
      try {
        localStorage.setItem(DASHBOARD_TAB_KEY, 'vault');
      } catch (e) {
        console.error('Failed saving tab preference:', e);
      }
    }
  };

  const fetchPerks = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        order: order,
        category: role,
        lang: locale,
      });

      if (scope === 'general') {
        queryParams.append('scope', 'general');
      }
      if (character !== 'all') {
        queryParams.append('character', character);
      }
      if (search) {
        queryParams.append('search', search);
      }
      if (ownershipFilter === 'owned' && user) {
        queryParams.append('owned_only', 'true');
      }
      if (user?.id) {
        queryParams.append('user_id', user.id.toString());
      }

      const allPerksUrl = new URLSearchParams({ limit: '1000', lang: locale });
      if (user?.id) {
        allPerksUrl.append('user_id', user.id.toString());
      }

      const [perksRes, charRes, allPerksRes, allCharsRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/perks?${queryParams.toString()}`),
        fetch(`${backendBase}/api/v1/characters?category=${role}&lang=${locale}`),
        fetch(`${backendBase}/api/v1/perks?${allPerksUrl.toString()}`),
        fetch(`${backendBase}/api/v1/characters?lang=${locale}`),
      ]);

      if (perksRes.ok) {
        const result = await perksRes.json();
        setPerks(result.data || []);
        if (result.pagination) {
          setTotalPages(result.pagination.total_pages);
          setTotalResults(result.pagination.total);
        }
      }

      if (allCharsRes.ok) {
        const acData = await allCharsRes.json();
        const fetchedCharactersList: CharacterItem[] = acData.data || [];
        setCharacterCount(fetchedCharactersList.length);
      }

      if (allPerksRes.ok) {
        const gResult = await allPerksRes.json();
        const fullList: Perk[] = gResult.data || [];
        setAllPerksForGenerator(fullList);

        setSurvivorCount(
          fullList.filter((p) => p.category === 'Survivor').length
        );
        setKillerCount(fullList.filter((p) => p.category === 'Killer').length);
        setOwnedPerksCount(
          fullList.filter((p) => p.is_owned !== false).length
        );
      }

      if (charRes.ok) {
        const cData = await charRes.json();
        const options: CharacterOption[] = (cData.data || []).map(
          (c: CharacterItem) => ({
            value: c.name,
            label:
              c.real_name && c.real_name !== c.name
                ? `${c.name} (${c.real_name})`
                : c.name,
            real_name: c.real_name || c.name,
          })
        );
        setCharacterOptions(options);
      }
    } catch (err) {
      console.error('Failed fetching perks:', err);
    } finally {
      setLoading(false);
    }
  }, [
    backendBase,
    role,
    scope,
    character,
    search,
    sortBy,
    order,
    page,
    limit,
    ownershipFilter,
    user,
  ]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  const handleResetFilters = () => {
    setSearch('');
    setCharacter('all');
    setScope('all');
    setOwnershipFilter('all');
    setSortBy('name');
    setOrder('asc');
    setPage(1);
  };

  const handleRoleChange = (newRole: RoleCategory) => {
    setRole(newRole);
    setCharacter('all');
    setPage(1);
  };

  const totalVaultPerks = allPerksForGenerator.length || totalResults;

  if (!dict) return null;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory={activeTab === 'generator' ? 'generator' : 'perks'}
        onSelectCategory={handleSelectCategoryFromSidebar}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalVaultPerks}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {activeTab !== 'generator' && (
          <header className="mb-6 flex flex-col gap-4 w-full">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 sm:p-7 backdrop-blur-xl shadow-2xl shadow-slate-950/60 border border-slate-800">
              <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-rose-600/10 blur-3xl" />

              <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 shadow-lg shadow-cyan-950/40 border border-cyan-500/20">
                    <Database className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-100 tracking-tight sm:text-3xl">
                      {dict?.app?.perksVaultTitle || 'Perks Vault & Codex'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      {dict?.app?.perksVaultSubtitle ||
                        'Complete catalog of Dead by Daylight Survivor and Killer teachables, general perks, and aliases.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                  <div className="flex items-center gap-2.5 rounded-2xl bg-slate-950/80 px-4 py-2.5 shadow-inner border border-slate-800">
                    <Flame className="h-4 w-4 text-cyan-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {dict?.stats?.vaultTotal || 'Vault Total'}
                      </span>
                      <span className="text-xs font-black text-slate-100">{totalVaultPerks}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-950/30 px-4 py-2.5 shadow-inner border border-emerald-500/20">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-emerald-400/80">
                        {dict?.generator?.survivor || 'Survivor'}
                      </span>
                      <span className="text-xs font-black text-emerald-300">{survivorCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-2xl bg-rose-950/30 px-4 py-2.5 shadow-inner border border-rose-500/20">
                    <Skull className="h-4 w-4 text-rose-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-rose-400/80">
                        {dict?.generator?.killer || 'Killer'}
                      </span>
                      <span className="text-xs font-black text-rose-300">{killerCount}</span>
                    </div>
                  </div>

                  {user && (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-cyan-950/30 px-4 py-2.5 shadow-inner border border-cyan-500/20">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-cyan-400/80">
                          {dict?.stats?.ownedPerks || 'Owned Perks'}
                        </span>
                        <span className="text-xs font-black text-cyan-300">{ownedPerksCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {activeTab === 'generator' ? (
          <PerkGenerator
            allPerks={allPerksForGenerator}
            onSelectPerk={setSelectedPerk}
            dict={dict}
          />
        ) : (
          <>
            <PerkFilters
              search={search}
              setSearch={(v) => {
                setSearch(v);
                setPage(1);
              }}
              role={role}
              setRole={handleRoleChange}
              scope={scope}
              setScope={(s) => {
                setScope(s);
                setPage(1);
              }}
              ownershipFilter={ownershipFilter}
              setOwnershipFilter={(o) => {
                setOwnershipFilter(o);
                setPage(1);
              }}
              character={character}
              setCharacter={(v) => {
                setCharacter(v);
                setPage(1);
              }}
              sortBy={sortBy}
              setSortBy={(s) => setSortBy(s)}
              order={order}
              setOrder={(o) => setOrder(o)}
              viewMode={viewMode}
              setViewMode={setViewMode}
              characterOptions={characterOptions}
              dict={dict}
              onReset={handleResetFilters}
            />

            {loading ? (
              <div
                aria-busy="true"
                aria-label={dict?.characterDetail?.loading || 'Loading perks'}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-10 justify-items-center w-full py-12"
              >
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48 rotate-45 animate-pulse rounded-2xl bg-slate-900/60 border border-slate-800"
                  />
                ))}
              </div>
            ) : perks.length === 0 ? (
              <section
                aria-live="polite"
                className="my-12 rounded-3xl bg-slate-900/40 p-12 text-center backdrop-blur-sm shadow-sm w-full border border-slate-800"
              >
                <Shield className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <h2 className="text-lg font-extrabold text-slate-200">
                  {dict?.empty?.title || 'No Perks Found'}
                </h2>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  {dict?.empty?.subtitle ||
                    'Try clearing your search query, switching ownership filters, or choosing another character.'}
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer shadow-sm border border-cyan-500/30"
                >
                  {dict?.app?.resetFilters || dict?.filters?.resetAllFilters || 'Reset Filters'}
                </button>
              </section>
            ) : (
              <section aria-label={dict?.filters?.viewMode || 'Perks Grid'} className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 lg:gap-8 justify-items-center w-full py-6">
                  {perks.map((perk, idx) => (
                    <PerkCard
                      key={`${perk.name}-${idx}`}
                      perk={perk}
                      viewMode={viewMode}
                      onSelect={setSelectedPerk}
                      dict={dict}
                    />
                  ))}
                </div>

                <div className="mt-8 w-full">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalResults={totalResults}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit);
                      setPage(1);
                    }}
                    dict={dict}
                  />
                </div>
              </section>
            )}
          </>
        )}

        <PerkModal
          perk={selectedPerk}
          onClose={() => setSelectedPerk(null)}
          dict={dict}
        />
        <QuestsModal
          isOpen={isQuestsOpen}
          onClose={() => setIsQuestsOpen(false)}
          dict={dict}
        />
      </main>
    </div>
  );
}

export default function PerksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-slate-400 font-mono text-xs">
          {'Loading...'}
        </div>
      }
    >
      <PerksContent />
    </Suspense>
  );
}
