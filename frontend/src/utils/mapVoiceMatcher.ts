// frontend/src/utils/mapVoiceMatcher.ts
/**
 * mapVoiceMatcher.ts
 *
 * Comprehensive Dead by Daylight Map Voice Matcher & Variant Disambiguation Engine.
 * Features:
 * - Complete dictionary for 40+ DBD maps and variants
 * - Slang, killer, and community nicknames (FNAF, Vecna, Dracula, Saw, Myers, etc.)
 * - Polish phonetic accent variations of English terms (rpd ist, bedhem 1-5, kauszed, tompson haus, etc.)
 * - Polish localized map names and nicknames (posterunek wschod/zachod, przedszkole 1-5, wieza weglowa 1-2, etc.)
 * - Explicit variant resolution (RPD East/West, Preschool I-V, Coal Tower I/II, etc.)
 * - Generic variant disambiguation pill groups
 * - Provider source switching ("Switch to Hens", "Zmien na Samoela", "Wszystkie mapy")
 * - Navigation action commands ("Zoom in", "Przybliz", "Fullscreen", "Pelny ekran", "Close", "Zamknij")
 * - Levenshtein fuzzy matching and token similarity scoring with full diacritic normalization
 */

import {
  MAP_VARIANT_GROUPS,
  CANONICAL_MAPS,
  EXPLICIT_VARIANT_RULES,
  GENERIC_VARIANT_RULES,
  SOURCE_COMMAND_RULES,
  ACTION_COMMAND_RULES,
  type CanonicalMapDefinition,
} from './mapVoiceData';

export type MapSource = 'all' | 'hens333' | 'samoelcolt';

export { MAP_VARIANT_GROUPS, CANONICAL_MAPS, EXPLICIT_VARIANT_RULES };

export interface MatchResult {
  matchedMapName: string;
  matchedMapId?: number;
  source: MapSource;
  confidence: number;
  isVariant: boolean;
  availableVariants?: string[];
  action?: 'navigate' | 'switch_source' | 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
  actionPayload?: any;
}

export interface MapDataEntry {
  /** The integer primary key, matching `MapRealm.id`. It used to be a slug
   *  (`hens_azarovs_resting_place`) that spelled out the callout provider and
   *  the map name -- both of which this row already carries as `source` and
   *  `name`. This is the subset of `MapRealm` the matcher reads; it stays a
   *  structural type rather than importing `MapRealm` so the matcher can be
   *  called with any row-like object. */
  id: number;
  name: string;
  realm?: string;
  source?: string;
}

// ─── Normalization & Levenshtein Distance ──────────────────────────────────────

/**
 * Normalizes a text string by decomposing Unicode diacritics (including Polish ł/Ł)
 * and converting to clean lowercase.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0142/gi, 'l')
    .toLowerCase()
    .trim();
}

/**
 * Normalizes a string for comparison by stripping non-alphanumeric characters.
 */
export function normalizeForComparison(str: string): string {
  if (!str) return '';
  return normalizeString(str).replace(/[^a-z0-9]/g, '');
}

/**
 * Computes standard Levenshtein distance between two strings (case-insensitive & accent-insensitive)
 * using an optimized 2-row memory allocation algorithm.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = normalizeString(a);
  const s2 = normalizeString(b);

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const len1 = s1.length;
  const len2 = s2.length;

  let prevRow = new Array<number>(len2 + 1);
  let currRow = new Array<number>(len2 + 1);

  for (let j = 0; j <= len2; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    currRow[0] = i;
    const char1 = s1[i - 1];

    for (let j = 1; j <= len2; j++) {
      const cost = char1 === s2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[len2];
}

/**
 * Calculates normalized string similarity score between 0 and 1.
 */
export function calculateSimilarity(a: string, b: string): number {
  const s1 = normalizeString(a);
  const s2 = normalizeString(b);
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Retrieves the available variants for a given DBD map name.
 * If the map does not belong to a multi-variant group, returns an empty array.
 */
export function getVariantsForMap(mapName: string): string[] {
  const normName = normalizeForComparison(mapName);
  if (!normName) return [];

  // Special checks for aliases / group keys
  if (
    normName.includes('badham') ||
    normName.includes('preschool') ||
    normName.includes('springwood') ||
    normName.includes('przedszkole') ||
    normName.includes('bedhem')
  ) {
    return [...MAP_VARIANT_GROUPS.badham];
  }
  if (
    normName.includes('rpd') ||
    normName.includes('policestation') ||
    normName.includes('raccoon') ||
    normName.includes('posterunek') ||
    normName.includes('komisariat')
  ) {
    return [...MAP_VARIANT_GROUPS.rpd];
  }
  if (
    normName.includes('coaltower') ||
    normName.includes('koltauer') ||
    normName.includes('wiezaweglowa')
  ) {
    return [...MAP_VARIANT_GROUPS.coal_tower];
  }
  if (
    normName.includes('groaningstorehouse') ||
    normName.includes('groningstorhaus') ||
    normName.includes('magazynjekow')
  ) {
    return [...MAP_VARIANT_GROUPS.groaning_storehouse];
  }
  if (
    normName.includes('ironworksofmisery') ||
    normName.includes('ironworks') ||
    normName.includes('ajronlorks') ||
    normName.includes('ajronworks') ||
    normName.includes('hutacierpienia')
  ) {
    return [...MAP_VARIANT_GROUPS.ironworks_of_misery];
  }
  if (
    normName.includes('shelterwoods') ||
    normName.includes('szelterwuds') ||
    normName.includes('lasschronienia')
  ) {
    return [...MAP_VARIANT_GROUPS.shelter_woods];
  }
  if (
    normName.includes('suffocationpit') ||
    normName.includes('safokejszyn') ||
    normName.includes('doluduszenia')
  ) {
    return [...MAP_VARIANT_GROUPS.suffocation_pit];
  }
  if (
    normName.includes('familyresidence') ||
    normName.includes('femilirezidens') ||
    normName.includes('posiadloscrodzinna') ||
    normName.includes('posiadloscyamaoka')
  ) {
    return [...MAP_VARIANT_GROUPS.family_residence];
  }
  if (
    normName.includes('sanctumofwrath') ||
    normName.includes('sanktuariumgniewu') ||
    normName.includes('swiatyniagniewu')
  ) {
    return [...MAP_VARIANT_GROUPS.sanctum_of_wrath];
  }
  if (
    (normName.includes('mountormond') ||
    normName.includes('ormond') ||
    normName.includes('goraormond')) &&
    !normName.includes('mine') &&
    !normName.includes('kopalnia') &&
    !normName.includes('majn')
  ) {
    return [...MAP_VARIANT_GROUPS.mount_ormond];
  }

  for (const group of Object.values(MAP_VARIANT_GROUPS)) {
    for (const variant of group) {
      if (
        normName === normalizeForComparison(variant) ||
        normName.includes(normalizeForComparison(variant)) ||
        normalizeForComparison(variant).includes(normName)
      ) {
        return [...group];
      }
    }
  }

  return [];
}


/**
 * Strips filler words and conversational phrases from spoken speech in English & Polish.
 */
function cleanSpokenQuery(spoken: string): string {
  let cleaned = normalizeString(spoken)
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const leadingPrefixes = [
    // English conversational prefixes
    'can you please show me the',
    'can you please show me',
    'can you please show',
    'can you please open the',
    'can you please open',
    'can you please find',
    'can you open the',
    'can you open',
    'can you show me the',
    'can you show me',
    'can you show the',
    'can you show',
    'can you find the',
    'can you find',
    'please navigate to the',
    'please navigate to',
    'please open the',
    'please open',
    'please show me the',
    'please show me',
    'please show the',
    'please show',
    'please find the',
    'please find',
    'navigate to the',
    'navigate to',
    'search for the',
    'search for',
    'look at the',
    'look at',
    'switch to the',
    'go to the',
    'go to',
    'open the',
    'open',
    'show me the',
    'show me',
    'show the',
    'show',
    'find the',
    'find',
    'display the',
    'display',
    'view the',
    'view',
    'please',
    // Polish conversational prefixes
    'czy mozesz prosze pokazac mi',
    'czy mozesz prosze pokazac',
    'czy mozesz pokazac mi',
    'czy mozesz pokazac',
    'czy mozesz otworzyc',
    'prosze nawiguj do',
    'prosze przejdz do',
    'prosze pokaz mi',
    'prosze pokaz',
    'prosze otworz',
    'prosze wyswietl',
    'prosze znajdz',
    'prosze wlacz',
    'prosze',
    'proszę',
    'pokaz mi',
    'pokaz',
    'otworz',
    'wyswietl',
    'znajdz',
    'przejdz do',
    'wlacz',
    'nawiguj do',
    'szukaj',
    'zobacz',
  ];

  let prefixChanged = true;
  while (prefixChanged) {
    prefixChanged = false;
    for (const prefix of leadingPrefixes) {
      const normPrefix = normalizeString(prefix);
      if (cleaned.startsWith(normPrefix + ' ')) {
        cleaned = cleaned.slice(normPrefix.length).trim();
        prefixChanged = true;
        break;
      }
    }
  }

  const trailingSuffixes = [
    'please',
    'map',
    'callout',
    'callouts',
    'diagram',
    'prosze',
    'mapa',
    'mape',
    'mapy',
    'callouty',
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of trailingSuffixes) {
      const normSuffix = normalizeString(suffix);
      if (cleaned.endsWith(' ' + normSuffix)) {
        cleaned = cleaned.slice(0, -(normSuffix.length + 1)).trim();
        changed = true;
      }
    }
  }

  return cleaned.trim();
}

// ─── Main Match Function ──────────────────────────────────────────────────────

/**
 * Matches a spoken voice query against DBD maps, provider switches, navigation actions,
 * and variant disambiguation engine.
 */
export function matchVoiceQuery(
  spokenText: string,
  currentSource: MapSource = 'all',
  allMaps?: Array<MapDataEntry>
): MatchResult | null {
  if (!spokenText || typeof spokenText !== 'string') return null;

  const rawLower = normalizeString(spokenText)
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!rawLower) return null;

  const cleanRaw = cleanSpokenQuery(rawLower);
  const commandCandidates = [cleanRaw, rawLower].filter(Boolean);

  // 1. Check Pure Source Switching Commands (exact string/normalized match)
  for (const rule of SOURCE_COMMAND_RULES) {
    for (const kw of rule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of commandCandidates) {
        const normCmd = normalizeForComparison(text);
        if (normCmd === normKw || text === normalizeString(kw)) {
          return {
            matchedMapName: '',
            source: rule.source,
            confidence: 1.0,
            isVariant: false,
            action: 'switch_source',
            actionPayload: rule.source,
          };
        }
      }
    }
  }

  // 2. Check Pure Action Navigation Commands (exact string/normalized match so "backwater swamp" isn't caught by "back")
  for (const rule of ACTION_COMMAND_RULES) {
    for (const kw of rule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of commandCandidates) {
        const normCmd = normalizeForComparison(text);
        if (normCmd === normKw || text === normalizeString(kw)) {
          return {
            matchedMapName: '',
            source: currentSource,
            confidence: 1.0,
            isVariant: false,
            action: rule.action,
          };
        }
      }
    }
  }

  // 3. Check for Source Prefix followed by a Map query (e.g. "hens blood lodge", "samoel dead dawg", "wlacz hensa blood lodge")
  let effectiveSource: MapSource = currentSource;
  let queryText = spokenText;

  const sourcePrefixes: Array<{ prefix: string; source: MapSource }> = [
    { prefix: 'switch to hens333', source: 'hens333' },
    { prefix: 'switch to hens', source: 'hens333' },
    { prefix: 'hens333 maps', source: 'hens333' },
    { prefix: 'hens maps', source: 'hens333' },
    { prefix: 'hens333', source: 'hens333' },
    { prefix: 'hens', source: 'hens333' },
    { prefix: 'zmien na hensa', source: 'hens333' },
    { prefix: 'zmień na hensa', source: 'hens333' },
    { prefix: 'wlacz hensa', source: 'hens333' },
    { prefix: 'włącz hensa', source: 'hens333' },
    { prefix: 'mapy hensa', source: 'hens333' },
    { prefix: 'hensa', source: 'hens333' },
    { prefix: 'switch to samoelcolt', source: 'samoelcolt' },
    { prefix: 'switch to samoel', source: 'samoelcolt' },
    { prefix: 'samoelcolt maps', source: 'samoelcolt' },
    { prefix: 'samoel maps', source: 'samoelcolt' },
    { prefix: 'samoelcolt', source: 'samoelcolt' },
    { prefix: 'samoel', source: 'samoelcolt' },
    { prefix: 'zmien na samoela', source: 'samoelcolt' },
    { prefix: 'zmień na samoela', source: 'samoelcolt' },
    { prefix: 'wlacz samoela', source: 'samoelcolt' },
    { prefix: 'włącz samoela', source: 'samoelcolt' },
    { prefix: 'mapy samoela', source: 'samoelcolt' },
    { prefix: 'samoela', source: 'samoelcolt' },
  ];

  for (const sp of sourcePrefixes) {
    const normPrefix = normalizeString(sp.prefix);
    if (rawLower.startsWith(normPrefix + ' ')) {
      effectiveSource = sp.source;
      queryText = rawLower.slice(normPrefix.length).trim();
      break;
    }
  }

  // 4. Clean Spoken Text for Map Matching
  const clean = cleanSpokenQuery(queryText);
  const candidateTexts = [clean, queryText, rawLower].filter(Boolean);

  // 5. Check for Explicit Variants first (e.g. "rpd east", "preschool 3", "rpd wschod", "badham trzy", "kol tauer 2")
  for (const expRule of EXPLICIT_VARIANT_RULES) {
    for (const kw of expRule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of candidateTexts) {
        const normText = normalizeForComparison(text);
        if (normText === normKw || text === normalizeString(kw) || normText.includes(normKw)) {
          return createMapMatchResult(
            expRule.canonicalName,
            1.0,
            true,
            effectiveSource,
            allMaps
          );
        }
      }
    }
  }

  // 6. Check Generic Multi-Variant Rules (e.g. "badham", "przedszkole", "rpd", "posterunek", "coal tower", "wieza weglowa")
  for (const genRule of GENERIC_VARIANT_RULES) {
    for (const kw of genRule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of candidateTexts) {
        const normText = normalizeForComparison(text);
        if (normText === normKw || text === normalizeString(kw)) {
          const variants = MAP_VARIANT_GROUPS[genRule.variantGroupKey] || [];
          return createMapMatchResult(
            genRule.defaultCanonical,
            0.98,
            false,
            effectiveSource,
            allMaps,
            variants
          );
        }
      }
    }
  }

  // 7a. Check Exact Match across all Canonical Maps and Aliases
  for (const mapDef of CANONICAL_MAPS) {
    const allKeys = [mapDef.canonicalName, ...mapDef.aliases];
    for (const key of allKeys) {
      for (const text of candidateTexts) {
        const normKey = normalizeForComparison(key);
        const normText = normalizeForComparison(text);

        if (normText === normKey || text === normalizeString(key)) {
          return createMapMatchResult(
            mapDef.canonicalName,
            1.0,
            !!mapDef.isExplicitVariant,
            effectiveSource,
            allMaps
          );
        }
      }
    }
  }

  // 7b. Check Distinct Substring Match across all Canonical Maps and Aliases (e.g. "gideon meat plant", "dracula castle", "chata matki")
  for (const mapDef of CANONICAL_MAPS) {
    const allKeys = [mapDef.canonicalName, ...mapDef.aliases];
    for (const key of allKeys) {
      for (const text of candidateTexts) {
        const normKey = normalizeForComparison(key);
        const normText = normalizeForComparison(text);

        if (
          normKey.length >= 4 &&
          (normText.includes(normKey) || (normKey.includes(normText) && normText.length >= 4))
        ) {
          return createMapMatchResult(
            mapDef.canonicalName,
            0.95,
            !!mapDef.isExplicitVariant,
            effectiveSource,
            allMaps
          );
        }
      }
    }
  }

  // 8. Fuzzy Levenshtein Distance & Token Similarity Search
  let bestMap: CanonicalMapDefinition | null = null;
  let bestScore = 0;

  for (const mapDef of CANONICAL_MAPS) {
    const candidateKeys = [mapDef.canonicalName, ...mapDef.aliases];
    for (const key of candidateKeys) {
      for (const text of candidateTexts) {
        // Direct string similarity
        const score = calculateSimilarity(text, key);
        if (score > bestScore) {
          bestScore = score;
          bestMap = mapDef;
        }

        // Word token similarity
        const textTokens = text.split(' ').filter((t) => t.length > 2);
        const keyTokens = normalizeString(key).split(' ').filter((t) => t.length > 2);

        if (textTokens.length > 0 && keyTokens.length > 0) {
          let tokenMatches = 0;
          for (const tt of textTokens) {
            for (const kt of keyTokens) {
              if (tt === kt || calculateSimilarity(tt, kt) >= 0.8) {
                tokenMatches++;
                break;
              }
            }
          }
          const tokenScore = (tokenMatches / Math.max(textTokens.length, keyTokens.length)) * 0.9;
          if (tokenScore > bestScore) {
            bestScore = tokenScore;
            bestMap = mapDef;
          }
        }
      }
    }
  }

  // Minimum confidence threshold to reject random speech or irrelevant queries
  if (bestMap && bestScore >= 0.60) {
    return createMapMatchResult(
      bestMap.canonicalName,
      Math.min(1.0, Number(bestScore.toFixed(2))),
      !!bestMap.isExplicitVariant,
      effectiveSource,
      allMaps
    );
  }

  return null;
}

// ─── Result Factory ───────────────────────────────────────────────────────────

function createMapMatchResult(
  matchedMapName: string,
  confidence: number,
  isVariant: boolean,
  currentSource: MapSource = 'all',
  allMaps?: Array<MapDataEntry>,
  customVariants?: string[]
): MatchResult {
  const availableVariants = customVariants && customVariants.length > 0
    ? customVariants
    : getVariantsForMap(matchedMapName);

  let matchedMapId: number | undefined;
  let finalSource: MapSource = currentSource;

  if (allMaps && allMaps.length > 0) {
    const targetNorm = normalizeForComparison(matchedMapName);

    // Try finding exact name and preferred source
    let found: MapDataEntry | undefined;

    if (currentSource !== 'all') {
      found = allMaps.find(
        (m) =>
          normalizeForComparison(m.name) === targetNorm &&
          m.source?.toLowerCase() === currentSource.toLowerCase()
      );
    }

    if (!found) {
      // Find matching map from any source, prioritizing hens333 then samoelcolt
      found = allMaps.find(
        (m) =>
          normalizeForComparison(m.name) === targetNorm &&
          m.source?.toLowerCase() === 'hens333'
      );
    }

    if (!found) {
      found = allMaps.find((m) => normalizeForComparison(m.name) === targetNorm);
    }

    if (!found) {
      // Fuzzy lookup within allMaps
      let bestMapScore = 0;
      for (const m of allMaps) {
        const sim = calculateSimilarity(m.name, matchedMapName);
        if (sim > bestMapScore && sim >= 0.75) {
          bestMapScore = sim;
          found = m;
        }
      }
    }

    if (found) {
      matchedMapId = found.id;
      matchedMapName = found.name;
      finalSource = (found.source as MapSource) || currentSource;
    }
  }

  return {
    matchedMapName,
    matchedMapId,
    source: finalSource,
    confidence,
    isVariant,
    availableVariants: availableVariants.length > 0 ? availableVariants : undefined,
    action: 'navigate',
  };
}
