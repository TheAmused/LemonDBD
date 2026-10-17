'use client';
// frontend/src/components/admin/AdminAvailabilitySection.tsx
//
// What challenges may use: each challenge mode as a switch, and every character and perk as a tile
// that toggles it in or out of new challenge pools. Switching something off asks for the reason
// players will see; switching it back on does not.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Sparkles } from 'lucide-react';
import { SearchInput } from '@/components/common/Field';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { AccordionSection } from '@/components/common/AccordionSection';
import { Switch } from '@/components/common/Switch';
import { TileButton } from '@/components/common/TileButton';
import { ToggleChip } from '@/components/common/ToggleChip';
import { EmptyState } from '@/components/common/EmptyState';
import { tip } from '@/components/common/Tooltip';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { AdminReasonModal } from '@/components/admin/AdminReasonModal';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';
import { useDictionary } from '@/context/DictionaryContext';
import { ADMIN_STORAGE, oneOf } from '@/components/admin/adminStorage';
import { usePersistentBoolean } from '@/hooks/usePersistentBoolean';
import { usePersistentString } from '@/hooks/usePersistentString';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import {
  listCharacters,
  listChallengeModes,
  listPerks,
  setChallengeModeEnabled,
  setCharacterDisabled,
  setPerkDisabled,
} from '@/services/adminApi';
import { getErrorMessage, staticUrl } from '@/utils/api';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, AdminCharacterRow, AdminPerkRow, ChallengeMode, ChallengeModeSetting } from '@/types/admin';

const KINDS = ['characters', 'perks'] as const;
const ROLES = ['Survivor', 'Killer'] as const;
type Kind = (typeof KINDS)[number];
type Role = (typeof ROLES)[number];
type Pending =
  | { kind: 'mode'; mode: ChallengeMode }
  | { kind: 'character'; item: AdminCharacterRow }
  | { kind: 'perk'; item: AdminPerkRow };

interface AdminAvailabilitySectionProps {
  refreshKey: number;
  notify: (message: ActionMessage) => void;
}

export function AdminAvailabilitySection({ refreshKey, notify }: AdminAvailabilitySectionProps) {
  const dict = useDictionary();
  const t = dict.admin;
  const [modes, setModes] = useState<ChallengeModeSetting[]>([]);
  const [kind, setKind] = usePersistentString<Kind>(ADMIN_STORAGE.availabilityKind, 'characters', oneOf(KINDS));
  const [role, setRole] = usePersistentString<Role>(ADMIN_STORAGE.availabilityRole, 'Survivor', oneOf(ROLES));
  const [search, setSearch] = useState('');
  const [disabledOnly, setDisabledOnly] = usePersistentBoolean(ADMIN_STORAGE.availabilityDisabledOnly, false);
  const [characters, setCharacters] = useState<AdminCharacterRow[]>([]);
  const [perks, setPerks] = useState<AdminPerkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isModesOpen, toggleModes] = usePersistentDrawer(ADMIN_STORAGE.availabilityModesOpen, true);
  const [isRosterOpen, toggleRoster] = usePersistentDrawer(ADMIN_STORAGE.availabilityRosterOpen, true);

  const modeLabel: Record<ChallengeMode, string> = {
    gauntlet: dict.streaks.gauntlet,
    chaos: dict.streaks.chaosStreak,
    history: dict.streaks.historyStreak,
    page_streak: dict.streaks.pageStreak,
  };

  const fail = useCallback((err: unknown) => notify({ type: 'error', text: getErrorMessage(err, t.networkError) }), [notify, t.networkError]);

  useEffect(() => {
    listChallengeModes()
      .then((data) => setModes(data.modes ?? []))
      .catch(fail);
  }, [refreshKey, reloadKey, fail]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      Promise.all([listCharacters(role, search.trim()), listPerks(role, search.trim())])
        .then(([chars, perkList]) => {
          if (cancelled) return;
          setCharacters(chars.data ?? []);
          setPerks(perkList.data ?? []);
        })
        .catch((err: unknown) => !cancelled && fail(err))
        .finally(() => !cancelled && setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [role, search, refreshKey, reloadKey, fail]);

  /** Applies one switch and reports it by name. */
  const apply = async (name: string, enable: boolean, action: () => Promise<unknown>) => {
    try {
      await action();
      notify({ type: 'success', text: formatMessage(enable ? t.availabilityEnabled : t.availabilityDisabled, { name }) });
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      fail(err);
    }
  };

  const toggleMode = (setting: ChallengeModeSetting) =>
    setting.is_enabled
      ? setPending({ kind: 'mode', mode: setting.mode })
      : apply(modeLabel[setting.mode], true, () => setChallengeModeEnabled(setting.mode, true, null));
  const toggleCharacter = (item: AdminCharacterRow) =>
    item.is_disabled ? apply(item.name, true, () => setCharacterDisabled(item, false, null)) : setPending({ kind: 'character', item });
  const togglePerk = (item: AdminPerkRow) =>
    item.is_disabled ? apply(item.name, true, () => setPerkDisabled(item, false, null)) : setPending({ kind: 'perk', item });

  const confirmDisable = (reason: string) => {
    const action = pending;
    setPending(null);
    if (!action) return;
    const why = reason || null;
    if (action.kind === 'mode') void apply(modeLabel[action.mode], false, () => setChallengeModeEnabled(action.mode, false, why));
    if (action.kind === 'character') void apply(action.item.name, false, () => setCharacterDisabled(action.item, true, why));
    if (action.kind === 'perk') void apply(action.item.name, false, () => setPerkDisabled(action.item, true, why));
  };

  const pendingName = pending ? (pending.kind === 'mode' ? modeLabel[pending.mode] : pending.item.name) : '';
  const pendingSubtitle = !pending
    ? undefined
    : pending.kind === 'mode'
      ? t.disableModeSubtitle
      : pending.kind === 'character'
        ? t.disableCharacterSubtitle
        : t.disablePerkSubtitle;

  const list = kind === 'characters' ? characters : perks;
  const disabledCount = useMemo(() => list.filter((item) => item.is_disabled).length, [list]);
  const shown = disabledOnly ? list.filter((item) => item.is_disabled) : list;

  return (
    <div className="space-y-5">
      <AccordionSection as="section" title={t.challengeModesTitle} open={isModesOpen} onToggle={toggleModes} bodyClassName="p-0">
        <p className="border-b border-border-color p-4 text-center type-body text-text-muted sm:px-5">{t.challengeModesSubtitle}</p>
        <ul className="grid grid-cols-1 items-stretch gap-px overflow-hidden rounded-b-card bg-border-subtle sm:grid-cols-2">
          {modes.map((setting) => (
            <li key={setting.mode} className="flex items-center justify-between gap-4 bg-bg-surface p-4 sm:px-5">
              <div className="min-w-0">
                <p className="type-strong text-text-primary">{modeLabel[setting.mode]}</p>
                <p className={cn('type-caption', setting.is_enabled ? 'text-text-muted' : 'text-accent-red')}>
                  {setting.is_enabled ? t.enabledLabel : setting.disabled_reason || t.disabledLabel}
                </p>
              </div>
              <Switch checked={setting.is_enabled} onChange={() => toggleMode(setting)} ariaLabel={modeLabel[setting.mode]} />
            </li>
          ))}
        </ul>
      </AccordionSection>

      <AccordionSection as="section" title={t.rosterTitle} open={isRosterOpen} onToggle={toggleRoster} bodyClassName="p-0">
        <div className="space-y-3 border-b border-border-color p-4 sm:px-5">
          <p className="text-center type-body text-text-muted">{t.rosterSubtitle}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl<Kind>
              ariaLabel={t.rosterTitle}
              size="sm"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'characters', label: t.characters, icon: <KillerIcon className="icon-sm" /> },
                { value: 'perks', label: t.perks, icon: <Sparkles className="icon-sm" /> },
              ]}
            />
            <SegmentedControl<Role>
              ariaLabel={t.thRole}
              size="sm"
              value={role}
              onChange={setRole}
              options={[
                { value: 'Survivor', label: t.roleSurvivor, icon: <SurvivorIcon className="icon-sm" />, activeClassName: 'bg-accent-green text-text-inverted' },
                { value: 'Killer', label: t.roleKiller, icon: <KillerIcon className="icon-sm" /> },
              ]}
            />
            <ToggleChip size="sm" pressed={disabledOnly} onClick={() => setDisabledOnly((v) => !v)}>
              <Ban className="icon-sm" aria-hidden="true" />
              {formatMessage(t.disabledOnly, { count: disabledCount })}
            </ToggleChip>
            <SearchInput
              fieldSize="sm"
              wrapperClassName="min-w-field-sm flex-1 sm:max-w-xs sm:ml-auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchGenericPlaceholder}
              aria-label={t.searchGenericPlaceholder}
            />
          </div>
        </div>

        <div className={cn('p-4 transition-opacity sm:px-5', loading && 'opacity-60')} aria-busy={loading}>
          {shown.length === 0 ? (
            <EmptyState variant="inline" title={loading ? t.loading : t.rosterEmpty} />
          ) : (
            <ul className="grid max-h-roster grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
              {shown.map((item) => {
                const isCharacter = 'role' in item;
                const image = isCharacter ? (item as AdminCharacterRow).avatar_local_path : (item as AdminPerkRow).icon_local_path;
                const label = item.disabled_reason ? `${item.name}: ${item.disabled_reason}` : item.name;
                return (
                  <li key={`${kind}-${item.id}`}>
                    <TileButton
                      press={false}
                      onClick={() => (isCharacter ? toggleCharacter(item as AdminCharacterRow) : togglePerk(item as AdminPerkRow))}
                      aria-pressed={!item.is_disabled}
                      aria-label={label}
                      {...tip(item.name, item.disabled_reason || undefined, 'status')}
                      className="group flex w-full flex-col items-center gap-1.5 rounded-control p-1"
                    >
                      <span
                        className={cn(
                          'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-control border bg-bg-elevated transition-colors',
                          item.is_disabled ? 'border-accent-red/60' : 'border-border-color group-hover:border-text-muted',
                          !isCharacter && 'p-1.5'
                        )}
                      >
                        {image ? (
                          <img
                            src={staticUrl(image)}
                            alt=""
                            loading="lazy"
                            className={cn('h-full w-full', isCharacter ? 'object-cover' : 'object-contain', item.is_disabled && 'opacity-40 grayscale')}
                          />
                        ) : isCharacter ? (
                          <KillerIcon className="h-8 w-8 text-text-muted" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-6 w-6 text-text-muted" aria-hidden="true" />
                        )}
                        {item.is_disabled && (
                          <span className="absolute inset-x-0 bottom-0 bg-accent-red py-0.5 text-center type-micro font-bold text-text-inverted">
                            {t.disabledLabel}
                          </span>
                        )}
                      </span>
                      <span className={cn('line-clamp-2 w-full text-center type-micro', item.is_disabled ? 'text-accent-red' : 'text-text-secondary')}>
                        {item.name}
                      </span>
                    </TileButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AccordionSection>

      <AdminReasonModal
        isOpen={pending !== null}
        title={formatMessage(t.disableConfirmTitle, { name: pendingName })}
        subtitle={pendingSubtitle}
        confirmLabel={t.disable}
        onCancel={() => setPending(null)}
        onConfirm={confirmDisable}
      />
    </div>
  );
}
