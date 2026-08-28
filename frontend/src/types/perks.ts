// frontend/src/types/perks.ts
export type RoleCategory = 'Survivor' | 'Killer';
export type GeneratorMode = 'instant' | 'wheel';
export type ScopeFilter = 'all' | 'general';
export type OwnershipFilter = 'all' | 'owned';
export type SortField = 'name' | 'character' | 'category';
export type SortOrder = 'asc' | 'desc';
export type ViewDisplayMode = 'grid' | 'list';

export interface Perk {
  id?: number;
  name: string;
  alternate_name?: string;
  is_generic_counterpart?: boolean;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  category: RoleCategory | string;
  description: string;
  icon_url: string;
  icon_local_path: string;
  is_owned?: boolean;
  is_unlocked?: boolean;
  is_disabled?: boolean;
  disabled_reason?: string | null;
}

export interface CharacterItem {
  id?: number;
  name: string;
  real_name?: string;
  category?: RoleCategory | string;
  avatar_local_path?: string;
  portrait_url?: string;
  is_disabled?: boolean;
  disabled_reason?: string | null;
}

export interface CharacterOption {
  value: string;
  label: string;
  real_name?: string;
}

export interface PerkSuggestion {
  id?: number;
  name: string;
  alternate_name?: string;
  category?: string;
  character?: string;
  icon_local_path?: string;
  icon_url?: string;
}

export interface DrawnSlot {
  page: number;
  slot: number;
  perk?: Perk;
}

export interface GeneratorStoredState {
  role: RoleCategory;
  genMode: GeneratorMode;
  noRepeatPerks: boolean;
  spinDurationSec: number;
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
}

export interface GeneratorConfigResponse {
  role?: RoleCategory;
  gen_mode?: GeneratorMode;
  no_repeat_perks?: number | boolean;
  spin_duration_sec?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total_pages: number;
  total: number;
}

export interface PerkDictionary {
  common?: {
    loading?: string;
    reset?: string;
    clear?: string;
    copy?: string;
    copied?: string;
  };
  pagination?: {
    showing?: string;
    of?: string;
    results?: string;
    perPage?: string;
    previous?: string;
    next?: string;
    firstPage?: string;
    lastPage?: string;
    goTo?: string;
    navAriaLabel?: string;
  };
  modal?: {
    close?: string;
    character?: string;
    role?: string;
    perkDescription?: string;
    slugCopied?: string;
    copySlug?: string;
    generalPerk?: string;
    alias?: string;
    clickToInspectPerk?: string;
    clickToInspect?: string;
    killerPerk?: string;
    survivorPerk?: string;
    unownedPerk?: string;
    equipment?: string;
    clickOutsideToClose?: string;
    [key: string]: string | undefined;
  };
  generator?: {
    titleSuffix?: string;
    pageLabel?: string;
    pagesLabel?: string;
    playableLabel?: string;
    subtitleOwned?: string;
    subtitleAll?: string;
    survivor?: string;
    killer?: string;
    modeWheel?: string;
    modeInstant?: string;
    perksButtonLabel?: string;
    noRepeatLabel?: string;
    resetAllLabel?: string;
    noPerksTitle?: string;
    noPerksDesc?: string;
    configureCharacters?: string;
    activeLoadoutTitle?: string;
    slotFocus?: string;
    emptySlot?: string;
    spinOrRollPrompt?: string;
    cursedBlindness?: string;
    clickToReveal?: string;
    rollCompleteLoadout?: string;
    selectRole?: string;
    generatorMode?: string;
    resetAllTooltip?: string;
    clearSlotTooltip?: string;
    inventoryCoordinatesNote?: string;
    slotLabel?: string;
    coordOpenPage?: string;
    coordSlot?: string;
    coordClose?: string;
    emptyCoordinate?: string;
  };
  empty?: {
    title?: string;
    subtitle?: string;
    loading?: string;
    [key: string]: string | undefined;
  };
  filters?: {
    searchPlaceholder?: string;
    clear?: string;
    survivor?: string;
    killer?: string;
    allPerks?: string;
    generalOnly?: string;
    everyPerk?: string;
    ownedOnly?: string;
    filterByCharacter?: string;
    allCharacters?: string;
    generalPerksOnly?: string;
    sortByName?: string;
    sortByCharacter?: string;
    sortByRole?: string;
    orderAsc?: string;
    orderDesc?: string;
    filtersTitle?: string;
    ownershipFilter?: string;
    clearSearch?: string;
    viewMode?: string;
    gridView?: string;
    listView?: string;
    resetAllFilters?: string;
    sortFields?: string;
    sortOrderLabel?: string;
    category?: string;
    [key: string]: string | undefined;
  };
  stats?: {
    vaultTotal?: string;
    ownedPerks?: string;
    [key: string]: string | undefined;
  };
  card?: {
    vaultTotal?: string;
    ownedPerks?: string;
    [key: string]: string | undefined;
  };
  landing?: {
    characterOverview?: string;
    [key: string]: string | undefined;
  };
  user?: {
    verifyEmailRequired?: string;
    [key: string]: string | undefined;
  };
  maps?: {
    voiceEngineAria?: string;
    providerAria?: string;
    variants?: string;
    [key: string]: string | undefined;
  };
  characterDetail?: {
    characterOverview?: string;
    loading?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}
