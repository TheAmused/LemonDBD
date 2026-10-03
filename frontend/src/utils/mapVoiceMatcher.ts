// frontend/src/utils/mapVoiceMatcher.ts
import { type MapSource, type MapDataEntry, type MatchResult, normalizeString, cleanSpokenQuery, normalizeForComparison, createMapMatchResult, calculateSimilarity } from "./mapVoiceTextUtils";
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
export { MAP_VARIANT_GROUPS };
// ─── Normalization & Levenshtein Distance ──────────────────────────────────────
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
export { normalizeString, normalizeForComparison, levenshteinDistance, calculateSimilarity, getVariantsForMap } from "./mapVoiceTextUtils";
export type { MapSource, MatchResult, MapDataEntry } from "./mapVoiceTextUtils";
