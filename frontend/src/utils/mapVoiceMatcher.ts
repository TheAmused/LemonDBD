/**
 * mapVoiceMatcher.ts
 *
 * Comprehensive Dead by Daylight Map Voice Matcher & Variant Disambiguation Engine.
 * Features:
 * - Complete dictionary for 40+ DBD maps and variants
 * - Slang, killer, and community nicknames (FNAF, Vecna, Dracula, Saw, Myers, etc.)
 * - Explicit variant resolution (RPD East/West, Preschool I-V, Coal Tower I/II, etc.)
 * - Generic variant disambiguation pill groups
 * - Provider source switching ("Switch to Hens", "Switch to Samoel", "All Maps")
 * - Navigation action commands ("Zoom in", "Zoom out", "Fullscreen", "Close")
 * - Levenshtein fuzzy matching and token similarity scoring
 */

export type MapSource = 'all' | 'hens333' | 'samoelcolt';

export interface MatchResult {
  matchedMapName: string;
  matchedMapId?: string;
  source: MapSource;
  confidence: number;
  isVariant: boolean;
  availableVariants?: string[];
  action?: 'navigate' | 'switch_source' | 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
  actionPayload?: any;
}

export interface MapDataEntry {
  id: string;
  name: string;
  realm: string;
  source: string;
}

// ─── Levenshtein Distance & Similarity ────────────────────────────────────────

/**
 * Computes standard Levenshtein distance between two strings (case-insensitive).
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Calculates normalized string similarity score between 0 and 1.
 */
export function calculateSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

// ─── Map Variant Group Definitions ────────────────────────────────────────────

export const MAP_VARIANT_GROUPS: Record<string, string[]> = {
  badham: [
    'Preschool I',
    'Preschool II',
    'Preschool III',
    'Preschool IIIV',
    'Preschool V',
  ],
  rpd: [
    'Police Station East Wing',
    'Police Station West Wing',
  ],
  coal_tower: [
    'Coal Tower',
    'Coal Tower II',
  ],
  groaning_storehouse: [
    'Groaning Storehouse',
    'Groaning Storehouse II',
  ],
  ironworks_of_misery: [
    'Ironworks Of Misery',
    'Ironworks Of Misery II',
  ],
  shelter_woods: [
    'Shelter Woods',
    'Shelter Woods II',
  ],
  suffocation_pit: [
    'Suffocation Pit',
    'Suffocation Pit II',
  ],
  family_residence: [
    'Family Residence',
    'Family Residence II',
  ],
  sanctum_of_wrath: [
    'Sanctum of Wrath',
    'Sanctum of Wrath II',
  ],
  mount_ormond: [
    'Mount Ormond Resort',
    'Mount Ormond Resort II',
    'Mount Ormond Resort III',
  ],
};

function normalizeForComparison(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieves the available variants for a given DBD map name.
 * If the map does not belong to a multi-variant group, returns an empty array.
 */
export function getVariantsForMap(mapName: string): string[] {
  const normName = normalizeForComparison(mapName);
  if (!normName) return [];

  // Special checks for aliases / group keys
  if (normName.includes('badham') || normName.includes('preschool') || normName.includes('springwood')) {
    return [...MAP_VARIANT_GROUPS.badham];
  }
  if (normName.includes('rpd') || normName.includes('policestation') || normName.includes('raccoon')) {
    return [...MAP_VARIANT_GROUPS.rpd];
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

// ─── Canonical Map & Alias Dictionary ─────────────────────────────────────────

interface CanonicalMapDefinition {
  canonicalName: string;
  realm: string;
  aliases: string[];
  isExplicitVariant?: boolean;
}

export const CANONICAL_MAPS: CanonicalMapDefinition[] = [
  // Autohaven Wreckers
  {
    canonicalName: "Azarov's Resting Place",
    realm: "Autohaven Wreckers",
    aliases: ["azarov", "azarovs", "azarovs resting place", "resting place", "autohaven resting place"],
  },
  {
    canonicalName: "Blood Lodge",
    realm: "Autohaven Wreckers",
    aliases: ["blood lodge", "lodge", "autohaven lodge"],
  },
  {
    canonicalName: "Gas Heaven",
    realm: "Autohaven Wreckers",
    aliases: ["gas heaven", "gas station", "heaven", "autohaven gas"],
  },
  {
    canonicalName: "Wreckers' Yard",
    realm: "Autohaven Wreckers",
    aliases: ["wreckers yard", "wrecker yard", "wreckers", "autohaven wreckers yard", "wrecker's yard"],
  },
  {
    canonicalName: "Wretched Shop",
    realm: "Autohaven Wreckers",
    aliases: ["wretched shop", "wretched", "garage", "car shop", "autohaven shop"],
  },

  // Badham Preschool / Springwood
  {
    canonicalName: "Preschool I",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 1", "badham one", "badham i", "preschool 1", "preschool one", "preschool i",
      "badham preschool 1", "badham preschool i", "springwood 1", "freddy map 1"
    ],
  },
  {
    canonicalName: "Preschool II",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 2", "badham two", "badham ii", "preschool 2", "preschool two", "preschool ii",
      "badham preschool 2", "badham preschool ii", "springwood 2", "freddy map 2"
    ],
  },
  {
    canonicalName: "Preschool III",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 3", "badham three", "badham iii", "preschool 3", "preschool three", "preschool iii",
      "badham preschool 3", "badham preschool iii", "springwood 3", "freddy map 3"
    ],
  },
  {
    canonicalName: "Preschool IIIV",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 4", "badham four", "badham iv", "badham iiiv", "preschool 4", "preschool four",
      "preschool iv", "preschool iiiv", "badham preschool 4", "badham preschool iv", "springwood 4", "freddy map 4"
    ],
  },
  {
    canonicalName: "Preschool V",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 5", "badham five", "badham v", "preschool 5", "preschool five", "preschool v",
      "badham preschool 5", "badham preschool v", "springwood 5", "freddy map 5"
    ],
  },

  // Coldwind Farm
  {
    canonicalName: "Fractured Cowshed",
    realm: "Coldwind Farm",
    aliases: ["fractured cowshed", "cowshed", "cow shed", "coldwind cowshed", "cow map"],
  },
  {
    canonicalName: "Rancid Abbatoir",
    realm: "Coldwind Farm",
    aliases: ["rancid abbatoir", "rancid abattoir", "abbatoir", "abattoir", "slaughterhouse", "meat house"],
  },
  {
    canonicalName: "Rotten Fields",
    realm: "Coldwind Farm",
    aliases: ["rotten fields", "cornfield", "corn field", "corn map", "rotten corn"],
  },
  {
    canonicalName: "The Thompson House",
    realm: "Coldwind Farm",
    aliases: ["the thompson house", "thompson house", "farmhouse", "farm house", "hillbilly house"],
  },
  {
    canonicalName: "Torment Creek",
    realm: "Coldwind Farm",
    aliases: ["torment creek", "creek", "silo", "silo map", "coldwind silo"],
  },

  // Crotus Prenn Asylum
  {
    canonicalName: "Disturbed Ward",
    realm: "Crotus Prenn Asylum",
    aliases: ["disturbed ward", "asylum", "crotus prenn", "mental hospital", "ward", "nurse map"],
  },
  {
    canonicalName: "Father Campbells Chapel",
    realm: "Crotus Prenn Asylum",
    aliases: [
      "father campbells chapel", "father campbell's chapel", "father campbell", "campbells chapel",
      "campbell's chapel", "clown map", "chapel", "church", "church map"
    ],
  },

  // Decimated Borgo
  {
    canonicalName: "Shattered Square",
    realm: "Decimated Borgo",
    aliases: ["shattered square", "borgo", "the decimated borgo", "decimated borgo", "knight map", "knight", "medieval map"],
  },
  {
    canonicalName: "Forgotten Ruins",
    realm: "Decimated Borgo",
    aliases: ["forgotten ruins", "vecna", "vecna map", "dnd", "dnd map", "dungeons and dragons", "dungeons and dragons map", "ruins"],
  },

  // Forsaken Boneyard
  {
    canonicalName: "Eyrie of Crows",
    realm: "Forsaken Boneyard",
    aliases: ["eyrie of crows", "eyrie", "crows", "artist map", "artist", "boneyard", "forsaken boneyard", "crow tower"],
  },
  {
    canonicalName: "Dead Sands",
    realm: "Forsaken Boneyard",
    aliases: ["dead sands", "sands", "boneyard sands"],
  },

  // Hawkins National Laboratory
  {
    canonicalName: "The Underground Complex",
    realm: "Hawkins National Laboratory",
    aliases: [
      "the underground complex", "underground complex", "hawkins", "hawkins lab",
      "hawkins national laboratory", "stranger things", "stranger things map", "demogorgon map", "demo map", "lab"
    ],
  },

  // MacMillan Estate
  {
    canonicalName: "Coal Tower",
    realm: "MacMillan Estate",
    aliases: ["coal tower", "coal tower 1", "coal tower one", "coal tower i", "macmillan tower"],
  },
  {
    canonicalName: "Coal Tower II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: ["coal tower 2", "coal tower two", "coal tower ii", "coal tower part 2"],
  },
  {
    canonicalName: "Groaning Storehouse",
    realm: "MacMillan Estate",
    aliases: ["groaning storehouse", "groaning storehouse 1", "groaning storehouse one", "storehouse", "store house"],
  },
  {
    canonicalName: "Groaning Storehouse II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: ["groaning storehouse 2", "groaning storehouse two", "groaning storehouse ii", "storehouse 2"],
  },
  {
    canonicalName: "Ironworks Of Misery",
    realm: "MacMillan Estate",
    aliases: ["ironworks of misery", "ironworks", "iron works", "ironworks 1", "ironworks one", "ironworks i", "misery"],
  },
  {
    canonicalName: "Ironworks Of Misery II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: ["ironworks of misery 2", "ironworks 2", "ironworks two", "ironworks ii", "ironworks of misery ii"],
  },
  {
    canonicalName: "Shelter Woods",
    realm: "MacMillan Estate",
    aliases: ["shelter woods", "shelter woods 1", "shelter woods one", "shelter woods i", "big tree map", "tree map", "skull merchant map"],
  },
  {
    canonicalName: "Shelter Woods II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: ["shelter woods 2", "shelter woods two", "shelter woods ii"],
  },
  {
    canonicalName: "Suffocation Pit",
    realm: "MacMillan Estate",
    aliases: ["suffocation pit", "suffocation pit 1", "suffocation pit one", "suffocation pit i", "the pit", "pit map"],
  },
  {
    canonicalName: "Suffocation Pit II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: ["suffocation pit 2", "suffocation pit two", "suffocation pit ii"],
  },

  // Red Forest
  {
    canonicalName: "Mother's Dwelling",
    realm: "Red Forest",
    aliases: ["mothers dwelling", "mother's dwelling", "huntress map", "huntress", "dwelling", "red forest house", "russian house"],
  },
  {
    canonicalName: "Temple of Purgation",
    realm: "Red Forest",
    aliases: ["temple of purgation", "the temple of purgation", "temple", "plague map", "plague", "babylonian temple"],
  },

  // Backwater Swamp
  {
    canonicalName: "Grim Pantry",
    realm: "Backwater Swamp",
    aliases: ["grim pantry", "pantry", "swamp pantry", "hag map pantry", "swamp shack"],
  },
  {
    canonicalName: "The Pale Rose",
    realm: "Backwater Swamp",
    aliases: ["the pale rose", "pale rose", "swamp boat", "boat map", "steamer", "paddle steamer", "hag boat"],
  },

  // Yamaoka Estate
  {
    canonicalName: "Family Residence",
    realm: "Yamaoka Estate",
    aliases: ["family residence", "family residence 1", "family residence one", "spirit map", "oni map", "yamaoka house", "residence"],
  },
  {
    canonicalName: "Family Residence II",
    realm: "Yamaoka Estate",
    isExplicitVariant: true,
    aliases: ["family residence 2", "family residence two", "family residence ii"],
  },
  {
    canonicalName: "Sanctum of Wrath",
    realm: "Yamaoka Estate",
    aliases: ["sanctum of wrath", "sanctum of wrath 1", "sanctum of wrath one", "sanctum", "statue map", "yamaoka shrine", "shrine map"],
  },
  {
    canonicalName: "Sanctum of Wrath II",
    realm: "Yamaoka Estate",
    isExplicitVariant: true,
    aliases: ["sanctum of wrath 2", "sanctum of wrath two", "sanctum of wrath ii"],
  },

  // Raccoon City Police Department (RPD)
  {
    canonicalName: "Police Station East Wing",
    realm: "Raccoon City",
    isExplicitVariant: true,
    aliases: [
      "police station east wing", "police station east", "rpd east wing", "rpd east",
      "east wing", "raccoon east", "resident evil east", "re2 east", "rpd 1"
    ],
  },
  {
    canonicalName: "Police Station West Wing",
    realm: "Raccoon City",
    isExplicitVariant: true,
    aliases: [
      "police station west wing", "police station west", "rpd west wing", "rpd west",
      "west wing", "raccoon west", "resident evil west", "re2 west", "rpd 2"
    ],
  },

  // Grave of Glennvale
  {
    canonicalName: "Dead Dawg Saloon",
    realm: "Grave of Glennvale",
    aliases: [
      "dead dawg saloon", "dead dawg", "dead dog saloon", "dead dog", "saloon",
      "cowboy map", "cowboy", "gunslinger map", "gunslinger", "glennvale", "grave of glennvale", "western map"
    ],
  },

  // Withered Isle
  {
    canonicalName: "Garden of Joy",
    realm: "Withered Isle",
    aliases: ["garden of joy", "dredge map", "dredge", "joy garden", "withered isle garden", "haunted house"],
  },
  {
    canonicalName: "Greenville Square",
    realm: "Withered Isle",
    aliases: ["greenville square", "greenville", "theater", "cinema", "arcade", "unknown map", "the unknown map"],
  },

  // Castlevania
  {
    canonicalName: "Fallen Refuge",
    realm: "Castlevania",
    aliases: ["fallen refuge", "dracula map", "dracula", "castlevania", "castlevania map", "castle", "castle map", "vampire castle"],
  },

  // Five Nights at Freddy's
  {
    canonicalName: "Freddy Fazbears Pizza",
    realm: "Five Nights at Freddy's",
    aliases: [
      "freddy fazbears pizza", "freddy fazbear's pizza", "freddy fazbear", "fnaf",
      "fnaf map", "five nights at freddys", "five nights at freddy's", "five nights", "pizzeria", "animatronic map"
    ],
  },

  // Gideon Meat Plant
  {
    canonicalName: "The Game",
    realm: "Gideon Meat Plant",
    aliases: [
      "the game", "game", "gideon meat plant", "gideon", "gideons", "gideons meat plant",
      "meat plant", "saw map", "saw", "jigsaw map", "jigsaw", "pig map", "pallet map"
    ],
  },

  // Haddonfield
  {
    canonicalName: "Lampkin Lane",
    realm: "Haddonfield",
    aliases: [
      "lampkin lane", "lampkin", "haddonfield", "myers map", "michael myers map",
      "myers", "michael myers", "halloween", "halloween map", "suburb", "suburb map"
    ],
  },

  // Silent Hill
  {
    canonicalName: "Midwich Elementary School",
    realm: "Silent Hill",
    aliases: [
      "midwich elementary school", "midwich elementary", "midwich", "silent hill",
      "silent hill map", "pyramid head map", "pyramid head", "school", "school map"
    ],
  },

  // Ormond
  {
    canonicalName: "Mount Ormond Resort",
    realm: "Ormond",
    aliases: [
      "mount ormond resort", "mount ormond", "ormond", "ski resort", "snow map",
      "chalet", "legion map", "legion", "snow", "resort"
    ],
  },
  {
    canonicalName: "Mount Ormond Resort II",
    realm: "Ormond",
    isExplicitVariant: true,
    aliases: ["mount ormond resort 2", "mount ormond resort ii", "ormond 2", "mount ormond 2"],
  },
  {
    canonicalName: "Mount Ormond Resort III",
    realm: "Ormond",
    isExplicitVariant: true,
    aliases: ["mount ormond resort 3", "mount ormond resort iii", "ormond 3", "mount ormond 3"],
  },
  {
    canonicalName: "Ormond Lake Mine",
    realm: "Ormond",
    aliases: ["ormond lake mine", "lake mine", "mine map", "ormond mine", "mine"],
  },

  // Lery's Memorial Institute
  {
    canonicalName: "Treatment Theatre",
    realm: "Lery's Memorial Institute",
    aliases: [
      "treatment theatre", "treatment theater", "lerys", "lery's", "lerys memorial institute",
      "lery's memorial institute", "hospital", "hospital map", "doctor map", "doctor",
      "treatment", "treatment room", "medical center"
    ],
  },

  // Dvarka Deepwood
  {
    canonicalName: "Toba Landing",
    realm: "Dvarka Deepwood",
    aliases: ["toba landing", "toba", "singularity map", "singularity", "alien jungle", "dvarka deepwood", "dvarka", "landing"],
  },
  {
    canonicalName: "Nostromo Wreckage",
    realm: "Dvarka Deepwood",
    aliases: [
      "nostromo wreckage", "nostromo", "alien map", "alien", "xenomorph map",
      "xenomorph", "crashed ship", "spaceship", "nostromo ship"
    ],
  },

  // Trickster
  {
    canonicalName: "Trickster's Delusion",
    realm: "All-Kill",
    aliases: ["tricksters delusion", "trickster's delusion", "trickster map", "trickster", "all-kill map", "delusion", "neon studio"],
  },
];

// ─── Explicit Variant Resolution Rules ────────────────────────────────────────

interface ExplicitVariantRule {
  keywords: string[];
  canonicalName: string;
}

export const EXPLICIT_VARIANT_RULES: ExplicitVariantRule[] = [
  // RPD
  {
    keywords: [
      "police station east wing", "police station east", "rpd east wing", "rpd east",
      "east wing", "raccoon east", "re2 east", "resident evil east", "rpd 1", "rpd one"
    ],
    canonicalName: "Police Station East Wing",
  },
  {
    keywords: [
      "police station west wing", "police station west", "rpd west wing", "rpd west",
      "west wing", "raccoon west", "re2 west", "resident evil west", "rpd 2", "rpd two"
    ],
    canonicalName: "Police Station West Wing",
  },

  // Badham / Preschool
  {
    keywords: [
      "badham 1", "badham one", "badham i", "preschool 1", "preschool one", "preschool i",
      "badham preschool 1", "badham preschool i", "springwood 1"
    ],
    canonicalName: "Preschool I",
  },
  {
    keywords: [
      "badham 2", "badham two", "badham ii", "preschool 2", "preschool two", "preschool ii",
      "badham preschool 2", "badham preschool ii", "springwood 2"
    ],
    canonicalName: "Preschool II",
  },
  {
    keywords: [
      "badham 3", "badham three", "badham iii", "preschool 3", "preschool three", "preschool iii",
      "badham preschool 3", "badham preschool iii", "springwood 3"
    ],
    canonicalName: "Preschool III",
  },
  {
    keywords: [
      "badham 4", "badham four", "badham iv", "badham iiiv", "preschool 4", "preschool four",
      "preschool iv", "preschool iiiv", "badham preschool 4", "badham preschool iv", "springwood 4"
    ],
    canonicalName: "Preschool IIIV",
  },
  {
    keywords: [
      "badham 5", "badham five", "badham v", "preschool 5", "preschool five", "preschool v",
      "badham preschool 5", "badham preschool v", "springwood 5"
    ],
    canonicalName: "Preschool V",
  },

  // Coal Tower
  {
    keywords: ["coal tower 1", "coal tower one", "coal tower i", "coal tower part 1"],
    canonicalName: "Coal Tower",
  },
  {
    keywords: ["coal tower 2", "coal tower two", "coal tower ii", "coal tower part 2"],
    canonicalName: "Coal Tower II",
  },

  // Groaning Storehouse
  {
    keywords: ["groaning storehouse 1", "groaning storehouse one", "groaning storehouse i", "storehouse 1"],
    canonicalName: "Groaning Storehouse",
  },
  {
    keywords: ["groaning storehouse 2", "groaning storehouse two", "groaning storehouse ii", "storehouse 2"],
    canonicalName: "Groaning Storehouse II",
  },

  // Ironworks of Misery
  {
    keywords: [
      "ironworks 1", "ironworks one", "ironworks i", "ironworks of misery 1",
      "ironworks of misery one", "ironworks of misery i"
    ],
    canonicalName: "Ironworks Of Misery",
  },
  {
    keywords: [
      "ironworks 2", "ironworks two", "ironworks ii", "ironworks of misery 2",
      "ironworks of misery two", "ironworks of misery ii"
    ],
    canonicalName: "Ironworks Of Misery II",
  },

  // Shelter Woods
  {
    keywords: ["shelter woods 1", "shelter woods one", "shelter woods i"],
    canonicalName: "Shelter Woods",
  },
  {
    keywords: ["shelter woods 2", "shelter woods two", "shelter woods ii"],
    canonicalName: "Shelter Woods II",
  },

  // Suffocation Pit
  {
    keywords: ["suffocation pit 1", "suffocation pit one", "suffocation pit i"],
    canonicalName: "Suffocation Pit",
  },
  {
    keywords: ["suffocation pit 2", "suffocation pit two", "suffocation pit ii"],
    canonicalName: "Suffocation Pit II",
  },

  // Family Residence
  {
    keywords: ["family residence 1", "family residence one", "family residence i"],
    canonicalName: "Family Residence",
  },
  {
    keywords: ["family residence 2", "family residence two", "family residence ii"],
    canonicalName: "Family Residence II",
  },

  // Sanctum of Wrath
  {
    keywords: ["sanctum of wrath 1", "sanctum of wrath one", "sanctum of wrath i", "sanctum 1"],
    canonicalName: "Sanctum of Wrath",
  },
  {
    keywords: ["sanctum of wrath 2", "sanctum of wrath two", "sanctum of wrath ii", "sanctum 2"],
    canonicalName: "Sanctum of Wrath II",
  },

  // Mount Ormond
  {
    keywords: ["mount ormond 1", "mount ormond resort 1", "ormond 1"],
    canonicalName: "Mount Ormond Resort",
  },
  {
    keywords: ["mount ormond 2", "mount ormond resort 2", "ormond 2"],
    canonicalName: "Mount Ormond Resort II",
  },
  {
    keywords: ["mount ormond 3", "mount ormond resort 3", "ormond 3"],
    canonicalName: "Mount Ormond Resort III",
  },
];

// ─── Generic Multi-Variant Default Resolutions ────────────────────────────────

interface GenericVariantRule {
  keywords: string[];
  defaultCanonical: string;
  variantGroupKey: string;
}

const GENERIC_VARIANT_RULES: GenericVariantRule[] = [
  {
    keywords: ["badham", "preschool", "badham preschool", "springwood"],
    defaultCanonical: "Preschool I",
    variantGroupKey: "badham",
  },
  {
    keywords: ["rpd", "police station", "raccoon city", "raccoon", "resident evil"],
    defaultCanonical: "Police Station East Wing",
    variantGroupKey: "rpd",
  },
  {
    keywords: ["coal tower"],
    defaultCanonical: "Coal Tower",
    variantGroupKey: "coal_tower",
  },
  {
    keywords: ["groaning storehouse", "storehouse"],
    defaultCanonical: "Groaning Storehouse",
    variantGroupKey: "groaning_storehouse",
  },
  {
    keywords: ["ironworks", "ironworks of misery", "iron works"],
    defaultCanonical: "Ironworks Of Misery",
    variantGroupKey: "ironworks_of_misery",
  },
  {
    keywords: ["shelter woods"],
    defaultCanonical: "Shelter Woods",
    variantGroupKey: "shelter_woods",
  },
  {
    keywords: ["suffocation pit"],
    defaultCanonical: "Suffocation Pit",
    variantGroupKey: "suffocation_pit",
  },
  {
    keywords: ["family residence"],
    defaultCanonical: "Family Residence",
    variantGroupKey: "family_residence",
  },
  {
    keywords: ["sanctum of wrath", "sanctum"],
    defaultCanonical: "Sanctum of Wrath",
    variantGroupKey: "sanctum_of_wrath",
  },
  {
    keywords: ["mount ormond", "ormond", "mount ormond resort"],
    defaultCanonical: "Mount Ormond Resort",
    variantGroupKey: "mount_ormond",
  },
];

// ─── Provider Source Switching Rules ──────────────────────────────────────────

interface SourceCommandRule {
  keywords: string[];
  source: MapSource;
}

const SOURCE_COMMAND_RULES: SourceCommandRule[] = [
  {
    keywords: [
      "switch to hens", "switch to hens333", "hens maps", "hens map",
      "hens callouts", "12 clock", "twelve clock", "12 o clock", "twelve o clock",
      "12 o'clock", "twelve o'clock", "switch hens", "use hens", "hens provider", "hens"
    ],
    source: "hens333",
  },
  {
    keywords: [
      "switch to samoel", "switch to samoelcolt", "samoel maps", "samoel map",
      "samoel callouts", "isometric", "isometric maps", "switch samoel", "use samoel",
      "samoel provider", "samoel"
    ],
    source: "samoelcolt",
  },
  {
    keywords: [
      "all maps", "all map", "all sources", "all source", "switch to all",
      "show all maps", "reset source", "all providers", "all provider", "both sources"
    ],
    source: "all",
  },
];

// ─── Navigation Action Commands ───────────────────────────────────────────────

interface ActionCommandRule {
  keywords: string[];
  action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
}

const ACTION_COMMAND_RULES: ActionCommandRule[] = [
  {
    keywords: ["zoom in", "zoom plus", "magnify", "closer", "zoom up", "enlarge"],
    action: "zoom_in",
  },
  {
    keywords: ["zoom out", "zoom minus", "further", "unzoom", "zoom down", "shrink"],
    action: "zoom_out",
  },
  {
    keywords: ["fullscreen", "full screen", "maximize", "popout", "expand", "expand map"],
    action: "fullscreen",
  },
  {
    keywords: ["close", "close map", "exit", "dismiss", "back", "close modal", "quit"],
    action: "close",
  },
];

// ─── Conversational Cleaning ──────────────────────────────────────────────────

/**
 * Strips filler words and conversational phrases from spoken speech.
 */
function cleanSpokenQuery(spoken: string): string {
  let cleaned = spoken
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const leadingPrefixes = [
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
  ];

  for (const prefix of leadingPrefixes) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.slice(prefix.length).trim();
      break;
    }
  }

  const trailingSuffixes = ['please', 'map', 'callout', 'callouts', 'diagram'];
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of trailingSuffixes) {
      if (cleaned.endsWith(' ' + suffix)) {
        cleaned = cleaned.slice(0, -(suffix.length + 1)).trim();
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

  const rawLower = spokenText
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!rawLower) return null;

  // 1. Check Source Switching Commands
  for (const rule of SOURCE_COMMAND_RULES) {
    for (const kw of rule.keywords) {
      const normKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normRaw = rawLower.replace(/[^a-z0-9]/g, '');
      if (normRaw === normKw || rawLower === kw || rawLower.includes(kw)) {
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

  // 2. Check Action Navigation Commands
  for (const rule of ACTION_COMMAND_RULES) {
    for (const kw of rule.keywords) {
      const normKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normRaw = rawLower.replace(/[^a-z0-9]/g, '');
      if (normRaw === normKw || rawLower === kw || rawLower.includes(kw)) {
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

  // 3. Clean Spoken Text for Map Matching
  const clean = cleanSpokenQuery(spokenText);
  const candidateTexts = [clean, rawLower].filter(Boolean);

  // 4. Check for Explicit Variants first (e.g. "rpd east", "preschool 3", "coal tower 2", "coal tower 1")
  for (const expRule of EXPLICIT_VARIANT_RULES) {
    for (const kw of expRule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of candidateTexts) {
        const normText = normalizeForComparison(text);
        if (normText === normKw || text === kw.toLowerCase() || normText.includes(normKw)) {
          return createMapMatchResult(
            expRule.canonicalName,
            1.0,
            true,
            currentSource,
            allMaps
          );
        }
      }
    }
  }

  // 5. Check Generic Multi-Variant Rules (e.g. "badham", "rpd", "preschool", "coal tower")
  for (const genRule of GENERIC_VARIANT_RULES) {
    for (const kw of genRule.keywords) {
      const normKw = normalizeForComparison(kw);
      for (const text of candidateTexts) {
        const normText = normalizeForComparison(text);
        if (normText === normKw || text === kw.toLowerCase()) {
          const variants = MAP_VARIANT_GROUPS[genRule.variantGroupKey] || [];
          return createMapMatchResult(
            genRule.defaultCanonical,
            0.98,
            false,
            currentSource,
            allMaps,
            variants
          );
        }
      }
    }
  }

  // 6. Check Exact & Substring Match across all Canonical Maps and Aliases
  for (const mapDef of CANONICAL_MAPS) {
    const allKeys = [mapDef.canonicalName, ...mapDef.aliases];
    for (const key of allKeys) {
      for (const text of candidateTexts) {
        const normKey = normalizeForComparison(key);
        const normText = normalizeForComparison(text);

        if (normText === normKey || text === key.toLowerCase()) {
          return createMapMatchResult(
            mapDef.canonicalName,
            1.0,
            !!mapDef.isExplicitVariant,
            currentSource,
            allMaps
          );
        }

        // Substring match for distinct multi-word aliases (e.g. "gideon meat plant", "dracula castle")
        if (
          normKey.length >= 4 &&
          (normText.includes(normKey) || (normKey.includes(normText) && normText.length >= 4))
        ) {
          return createMapMatchResult(
            mapDef.canonicalName,
            0.95,
            !!mapDef.isExplicitVariant,
            currentSource,
            allMaps
          );
        }
      }
    }
  }

  // 7. Fuzzy Levenshtein Distance & Token Similarity Search
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
        const keyTokens = key.toLowerCase().split(' ').filter((t) => t.length > 2);

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
      currentSource,
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

  let matchedMapId: string | undefined;
  let finalSource: MapSource = currentSource;

  if (allMaps && allMaps.length > 0) {
    const targetNorm = normalizeForComparison(matchedMapName);

    // Try finding exact name and preferred source
    let found: MapDataEntry | undefined;

    if (currentSource !== 'all') {
      found = allMaps.find(
        (m) =>
          normalizeForComparison(m.name) === targetNorm &&
          m.source.toLowerCase() === currentSource.toLowerCase()
      );
    }

    if (!found) {
      // Find matching map from any source, prioritizing hens333 then samoelcolt
      found = allMaps.find(
        (m) =>
          normalizeForComparison(m.name) === targetNorm &&
          m.source.toLowerCase() === 'hens333'
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
