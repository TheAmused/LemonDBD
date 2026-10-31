// frontend/src/utils/mapVoiceMatcher.ts
import { type MapDataEntry, type MatchResult, normalizeString, cleanSpokenQuery, normalizeForComparison, createMapMatchResult, calculateSimilarity } from "./mapVoiceTextUtils";
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
 * - Navigation action commands ("Zoom in", "Przybliz", "Fullscreen", "Pelny ekran", "Close", "Zamknij")
 * - Levenshtein fuzzy matching and token similarity scoring with full diacritic normalization
 */

import {
  MAP_VARIANT_GROUPS,
  CANONICAL_MAPS,
  EXPLICIT_VARIANT_RULES,
  GENERIC_VARIANT_RULES,
  ACTION_COMMAND_RULES,
  type CanonicalMapDefinition,
} from './mapVoiceData';
// ─── Normalization & Levenshtein Distance ──────────────────────────────────────
// ─── Main Match Function ──────────────────────────────────────────────────────

/**
 * Matches a spoken voice query against DBD maps, navigation actions,
 * and variant disambiguation engine.
 */
export function matchVoiceQuery(
  spokenText: string,
  allMaps?: Array<MapDataEntry>
): MatchResult | null {
  if (!spokenText || typeof spokenText !== 'string') return null;

  const rawLower = normalizeString(spokenText)
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!rawLower) return null;

  const cleanRaw = cleanSpokenQuery(rawLower);
  const commandCandidates = [cleanRaw, rawLower].filter(Boolean);

  // 1. Check Pure Action Navigation Commands (exact string/normalized match so "backwater swamp" isn't caught by "back")
  for (const rule of ACTION_COMMAND_RULES) {
    for (const kw of rule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of commandCandidates) {
        const normCmd = normalizeForComparison(text);
        if (normCmd === normKw || text === normalizeString(kw)) {
          return {
            matchedMapName: '',
            confidence: 1.0,
            isVariant: false,
            action: rule.action,
          };
        }
      }
    }
  }

  // 2. Clean Spoken Text for Map Matching
  const clean = cleanSpokenQuery(spokenText);
  const candidateTexts = [clean, spokenText, rawLower].filter(Boolean);

  // 3. Check for Explicit Variants first (e.g. "rpd east", "preschool 3", "rpd wschod", "badham trzy", "kol tauer 2")
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
            allMaps
          );
        }
      }
    }
  }

  // 4. Check Generic Multi-Variant Rules (e.g. "badham", "przedszkole", "rpd", "posterunek", "coal tower", "wieza weglowa")
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
            allMaps,
            variants
          );
        }
      }
    }
  }

  // 5a. Check Exact Match across all Canonical Maps and Aliases
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
            allMaps
          );
        }
      }
    }
  }

  // 5b. Check Distinct Substring Match across all Canonical Maps and Aliases (e.g. "gideon meat plant", "dracula castle", "chata matki")
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
            allMaps
          );
        }
      }
    }
  }

  // 6. Fuzzy Levenshtein Distance & Token Similarity Search
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
      allMaps
    );
  }

  return null;
}

// ─── Result Factory ───────────────────────────────────────────────────────────
export { normalizeString, normalizeForComparison, levenshteinDistance, calculateSimilarity, getVariantsForMap } from "./mapVoiceTextUtils";
export type { MatchResult, MapDataEntry } from "./mapVoiceTextUtils";
