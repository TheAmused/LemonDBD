'use client';
// frontend/src/components/CharactersHub.tsx

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { User } from 'lucide-react';
import { ownershipKey } from '@/utils/characterUtils';
import { useAuth } from '@/context/AuthContext';
import { PerksTogglePopup } from '@/components/characters/PerksTogglePopup';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchJson } from '@/services/dataCache';
import { EmptyState } from '@/components/common/EmptyState';
import { CharacterCard } from '@/components/characters/hub/CharacterCard';
import { CharactersToolbar } from '@/components/characters/hub/CharactersToolbar';
import { OwnershipSaveBar } from '@/components/characters/hub/OwnershipSaveBar';
import { SavedChangesModal } from '@/components/characters/hub/SavedChangesModal';
import { VerificationNotice } from '@/components/characters/hub/VerificationNotice';
import { useCharacterOwnership } from '@/components/characters/hub/useCharacterOwnership';
import { CharacterItem, PerkItem, AddonItem, EquipmentItem } from '@/components/character-detail/types';
import { RoleCategory } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useDictionary } from '@/context/DictionaryContext';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });
const DisabledReasonModal = dynamic(
  () => import('@/components/DisabledReasonModal').then((m) => m.DisabledReasonModal),
  { ssr: false }
);

export interface CharacterDetailData {
  character: CharacterItem;
  perks: PerkItem[];
  addons: AddonItem[];
  items?: EquipmentItem[];
}

export const CharactersHub: React.FC = () => {
  const dict = useDictionary();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<RoleCategory>('Survivor');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const roleParam = searchParams?.get('role') || searchParams?.get('tab') || '';

  useEffect(() => {
    if (roleParam) {
      const lower = roleParam.toLowerCase();
      if (lower === 'killer' || lower === 'killers') {
        setActiveTab('Killer');
      } else if (lower === 'survivor' || lower === 'survivors') {
        setActiveTab('Survivor');
      }
    }
  }, [roleParam]);

  const handleTabChange = (tab: RoleCategory) => {
    setActiveTab(tab);
    router.replace(`/${locale}/characters?role=${tab}`, { scroll: false });
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');
  const [verificationNoticeOpen, setVerificationNoticeOpen] = useState<boolean>(false);
  const [disabledModalCharacter, setDisabledModalCharacter] = useState<CharacterItem | null>(null);

  const ownership = useCharacterOwnership({
    locale,
    onLoginRequired: () => {
      setAuthModalIntent('login');
      setIsAuthModalOpen(true);
    },
    onVerificationRequired: () => setVerificationNoticeOpen(true),
  });
  const {
    ownershipMode, ownershipLoading, ownershipSaving, ownershipSaveError, savedModalOpen, closeSavedModal,
    characterOwnershipDraft, allPerks, perkUnlockDraft, perksPopupCharacter, setPerksPopupCharacter,
    handleToggleOwnershipMode, handleToggleCharacterOwned, handleTogglePerkUnlocked,
    handleCancelOwnershipMode, handleSaveOwnership, getCharacterPerkStats,
  } = ownership;

  const backendBase = getBackendBaseUrl();

  const charactersKey = `${backendBase}/api/v1/characters?lang=${locale}`;
  const { data: charactersResponse, loading: charactersLoading } = useCachedData<{
    data?: CharacterItem[];
  }>(charactersKey, () => fetchJson<{ data?: CharacterItem[] }>(charactersKey));

  const characters = charactersResponse?.data ?? [];
  const loading = charactersLoading;

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const matchesTab =
        c.category?.toLowerCase() === activeTab.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.real_name && c.real_name.toLowerCase().includes(query));
      return matchesTab && matchesSearch;
    });
  }, [characters, activeTab, searchQuery]);

  const survivorCount = characters.filter((c) => c.category === 'Survivor').length;
  const killerCount = characters.filter((c) => c.category === 'Killer').length;

  return (
    <div className={`space-y-6 ${ownershipMode ? 'pb-20' : ''}`}>
      <CharactersToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        survivorCount={survivorCount}
        killerCount={killerCount}
        ownershipMode={ownershipMode}
        ownershipLoading={ownershipLoading}
        onToggleOwnershipMode={handleToggleOwnershipMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {loading ? (
        <div className="w-full py-12 flex items-center justify-center">
          <CharactersGridSkeleton />
        </div>
      ) : filteredCharacters.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={User}
          className="my-8 sm:my-12 rounded-3xl border border-dashed border-border-color p-8 sm:p-12 text-center bg-bg-surface backdrop-blur-sm shadow-sm"
          iconClassName="mx-auto h-12 w-12 text-text-muted mb-3"
          headingClassName="text-lg font-bold text-text-primary"
          subtitleClassName="mt-1 text-xs text-text-secondary max-w-sm mx-auto"
          title={dict.characterDetail.noCharactersFound}
          subtitle={
            dict.characterDetail.hubNoMatchingCharacters
          }
          action={
            searchQuery
              ? {
                  label: dict.app.resetFilters,
                  onClick: () => setSearchQuery(''),
                }
              : undefined
          }
        />
      ) : (
        <section
          aria-label={dict.characterDetail.characterOverview}
          className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 md:gap-6"
        >
          {filteredCharacters.map((char, idx) => {
            const isOwned = char.id
              ? characterOwnershipDraft[ownershipKey(char.id, char.category)] ?? true
              : true;
            const perkStats = ownershipMode
              ? getCharacterPerkStats(char.id, char.category)
              : { total: 0, unlocked: 0 };

            return (
              <CharacterCard
                key={`${char.name}-${idx}`}
                char={char}
                locale={locale}
                backendBase={backendBase}
                ownershipMode={ownershipMode}
                isOwned={isOwned}
                perkStats={perkStats}
                onToggleOwned={handleToggleCharacterOwned}
                onOpenPerks={setPerksPopupCharacter}
                onOpenDisabled={setDisabledModalCharacter}
              />
            );
          })}
        </section>
      )}

      <PerksTogglePopup
        character={perksPopupCharacter}
        perks={allPerks}
        isPerkUnlocked={(perkId) => perkUnlockDraft[perkId] ?? true}
        onTogglePerk={handleTogglePerkUnlocked}
        onClose={() => setPerksPopupCharacter(null)}
        backendBase={backendBase}
        perksLabel={dict.filters.perks}
      />

      {ownershipMode && (
        <OwnershipSaveBar
          ownershipSaveError={ownershipSaveError}
          ownershipSaving={ownershipSaving}
          onCancel={handleCancelOwnershipMode}
          onSave={handleSaveOwnership}
        />
      )}

      <SavedChangesModal open={savedModalOpen} onClose={closeSavedModal} />

      {verificationNoticeOpen && user && (
        <VerificationNotice
          onVerify={() => {
            setVerificationNoticeOpen(false);
            setAuthModalIntent('verify');
            setIsAuthModalOpen(true);
          }}
          onDismiss={() => setVerificationNoticeOpen(false)}
        />
      )}

      <DisabledReasonModal
        isOpen={disabledModalCharacter !== null}
        onClose={() => setDisabledModalCharacter(null)}
        label={disabledModalCharacter?.name ?? ''}
        reason={disabledModalCharacter?.disabled_reason}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        verifyEmailFor={authModalIntent === 'verify' ? user?.email : undefined}
      />
    </div>
  );
};
