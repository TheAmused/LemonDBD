// frontend/src/components/smash-or-pass/hub/useSmashRosters.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { useSmashRosterStore } from '@/hooks/useSmashRosterStore';
import { fetchRosters } from '@/services/smashApi';
import type { RosterItem } from '@/types/smashOrPass';
import { acknowledgeNsfwRoster, hasAcknowledgedNsfwRoster } from '@/utils/nsfwAck';
import {
  customRosterToRosterItem,
  isLocalRosterSlug,
  localRosterIdFromSlug,
} from '@/utils/smashOrPass/localRoster';
import { initialRosterSlug, rememberRoster } from './voteStorage';

/** Roster slugs from the API -> the key their names live under in dict.smashOrPass.rosters. */
const ROSTER_DICT_KEY: Record<string, string> = {
  hooked_on_you: 'hoy',
  legendary_characters: 'legendary',
  cyberpunk_2077: 'cyberpunk',
  anime_manga: 'anime',
  gothic_eldritch: 'gothic',
};

/** What stands in while the roster list is still loading, or the remembered slug no longer exists. */
const CANON_PLACEHOLDER: RosterItem = {
  id: 'canon',
  slug: 'canon',
  name: 'Dead by Daylight: Fog Canon',
  description: 'Official 98 Characters',
  theme_color: '#dc2626',
  category: 'DBD Canon',
  is_nsfw: false,
  is_active: true,
};

/**
 * The rosters on offer and which one is being played: the official ones the database serves
 * plus the viewer's own saved in this browser, the active roster's role/gender filters, and its
 * NSFW acknowledgment. The picker and `activeRoster` never distinguish the two kinds beyond
 * `is_local` -- see utils/smashOrPass/localRoster.ts.
 */
export function useSmashRosters(locale: string) {
  const dict = useDictionary();
  const { state: customRosterStore } = useSmashRosterStore();

  const [rosters, setRosters] = useState<RosterItem[]>([]);
  const [selectedRosterSlug, setSelectedRosterSlug] = useState<string>(initialRosterSlug);
  const [rosterSwitchEffect, setRosterSwitchEffect] = useState<string | null>(null);

  // NSFW Content Gate: a roster flagged is_nsfw is blurred/blocked behind an explicit
  // confirmation until the viewer clicks through it, once per roster per browser (persisted
  // via nsfwAck.ts, not re-prompted every card).
  const [nsfwAcknowledged, setNsfwAcknowledged] = useState<boolean>(false);

  const allRosters = useMemo<RosterItem[]>(() => {
    const local = Object.values(customRosterStore.custom).map(customRosterToRosterItem);
    return [...rosters, ...local];
  }, [rosters, customRosterStore]);

  const activeRoster: RosterItem = useMemo(
    () => allRosters.find((r) => r.slug === selectedRosterSlug) || CANON_PLACEHOLDER,
    [allRosters, selectedRosterSlug]
  );

  /** A local roster offers the roles/genders its own entities use; official ones the standard set. */
  const distinctOf = useCallback(
    (field: 'role' | 'gender', fallback: string[]) => {
      if (isLocalRosterSlug(selectedRosterSlug)) {
        const stored = customRosterStore.custom[localRosterIdFromSlug(selectedRosterSlug)];
        const set = new Set<string>();
        (stored?.entities || []).forEach((e) => {
          if (e[field]) set.add(e[field]);
        });
        if (set.size > 0) return Array.from(set);
      }
      return fallback;
    },
    [selectedRosterSlug, customRosterStore]
  );

  const availableRoles = useMemo(() => distinctOf('role', ['Survivor', 'Killer']), [distinctOf]);
  const availableGenders = useMemo(
    () => distinctOf('gender', ['female', 'male', 'monster_other']),
    [distinctOf]
  );

  // Re-check acknowledgment whenever the active roster changes (including on first mount for
  // whatever roster was restored from localStorage).
  useEffect(() => {
    setNsfwAcknowledged(hasAcknowledgedNsfwRoster(activeRoster.slug));
  }, [activeRoster.slug]);

  const handleAcknowledgeNsfw = useCallback(() => {
    acknowledgeNsfwRoster(activeRoster.slug);
    setNsfwAcknowledged(true);
  }, [activeRoster.slug]);

  const loadRosters = useCallback(async () => {
    try {
      const rosterList = await fetchRosters();
      if (rosterList && rosterList.length > 0) {
        setRosters(rosterList);
      }
    } catch {
      // Best-effort: failure here is non-fatal.
    }
  }, []);

  useEffect(() => {
    loadRosters();
  }, [loadRosters]);

  const getRosterDisplayName = useCallback(
    (r: { slug: string; name?: string }) => {
      if (r.name) return r.name;
      const key = ROSTER_DICT_KEY[r.slug] ?? r.slug;
      const locName = (dict.smashOrPass.rosters as Record<string, { name?: string } | undefined>)?.[key]?.name;
      if (locName) return locName;
      return r.name || r.slug;
    },
    [dict, locale]
  );

  /** Switches roster and remembers the choice. */
  const pickRoster = useCallback((slug: string) => {
    setSelectedRosterSlug(slug);
    rememberRoster(slug);
  }, []);

  /** `pickRoster`, plus the brief full-screen roster-name flash a deliberate switch gets. */
  const selectRoster = useCallback(
    (slug: string) => {
      pickRoster(slug);
      setRosterSwitchEffect(slug);
      setTimeout(() => setRosterSwitchEffect(null), 1200);
    },
    [pickRoster]
  );

  return {
    allRosters,
    activeRoster,
    selectedRosterSlug,
    customRosterStore,
    availableRoles,
    availableGenders,
    nsfwAcknowledged,
    handleAcknowledgeNsfw,
    rosterSwitchEffect,
    getRosterDisplayName,
    pickRoster,
    selectRoster,
  };
}
