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
    aliases: [
      "azarov", "azarovs", "azarovs resting place", "resting place", "autohaven resting place",
      "azarow", "azarofs", "azarof", "miejsce spoczynku azarowa", "spoczynek azarowa",
      "azarow resting plejs", "autohaven resting plejs", "cmentarzysko autohaven",
      "zlomowisko azarow", "złomowisko azarow"
    ],
  },
  {
    canonicalName: "Blood Lodge",
    realm: "Autohaven Wreckers",
    aliases: [
      "blood lodge", "lodge", "autohaven lodge",
      "blad lodz", "blad ladz", "blud lodz", "blod lodz", "blad lodż",
      "krwawa chata", "krwawa loza", "krwawa łoża", "krwawy domek", "loza krwi", "łoża krwi",
      "domek na zlomowisku", "domek na złomowisku"
    ],
  },
  {
    canonicalName: "Gas Heaven",
    realm: "Autohaven Wreckers",
    aliases: [
      "gas heaven", "gas station", "heaven", "autohaven gas",
      "gas hewen", "gas heven", "ges hewen", "ges heven",
      "stacja benzynowa", "stacja benzynowa autohaven", "stacja paliw",
      "niebianska benzyna", "niebiańska benzyna", "stacja"
    ],
  },
  {
    canonicalName: "Wreckers' Yard",
    realm: "Autohaven Wreckers",
    aliases: [
      "wreckers yard", "wrecker yard", "wreckers", "autohaven wreckers yard", "wrecker's yard",
      "rekers jard", "reker jard", "rekers",
      "zlomowisko", "złomowisko", "plac zlomowiska", "plac złomowiska", "zlom", "złom",
      "podworze zlomiarzy", "podwórze złomiarzy"
    ],
  },
  {
    canonicalName: "Wretched Shop",
    realm: "Autohaven Wreckers",
    aliases: [
      "wretched shop", "wretched", "garage", "car shop", "autohaven shop",
      "reczed szop", "reczed shop", "reczet szop",
      "nedzny sklep", "nędzny sklep", "warsztat samochodowy", "garaz", "garaż",
      "sklep na zlomowisku", "sklep na złomowisku", "warsztat autohaven"
    ],
  },

  // Badham Preschool / Springwood
  {
    canonicalName: "Preschool I",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 1", "badham one", "badham i", "badham jeden",
      "preschool 1", "preschool one", "preschool i", "preschool jeden",
      "badham preschool 1", "badham preschool i", "springwood 1", "springwood jeden", "freddy map 1",
      "bedhem 1", "bedhem jeden", "bedhem i", "przedszkole 1", "przedszkole jeden", "przedszkole i",
      "fredi 1", "fredi jeden", "fredi kruger 1", "freddy 1"
    ],
  },
  {
    canonicalName: "Preschool II",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 2", "badham two", "badham ii", "badham dwa",
      "preschool 2", "preschool two", "preschool ii", "preschool dwa",
      "badham preschool 2", "badham preschool ii", "springwood 2", "springwood dwa", "freddy map 2",
      "bedhem 2", "bedhem dwa", "bedhem ii", "przedszkole 2", "przedszkole dwa", "przedszkole ii",
      "fredi 2", "fredi dwa", "fredi kruger 2", "freddy 2"
    ],
  },
  {
    canonicalName: "Preschool III",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 3", "badham three", "badham iii", "badham trzy",
      "preschool 3", "preschool three", "preschool iii", "preschool trzy",
      "badham preschool 3", "badham preschool iii", "springwood 3", "springwood trzy", "freddy map 3",
      "bedhem 3", "bedhem trzy", "bedhem iii", "przedszkole 3", "przedszkole trzy", "przedszkole iii",
      "fredi 3", "fredi trzy", "fredi kruger 3", "freddy 3"
    ],
  },
  {
    canonicalName: "Preschool IIIV",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 4", "badham four", "badham iv", "badham iiiv", "badham cztery",
      "preschool 4", "preschool four", "preschool iv", "preschool iiiv", "preschool cztery",
      "badham preschool 4", "badham preschool iv", "springwood 4", "springwood cztery", "freddy map 4",
      "bedhem 4", "bedhem cztery", "bedhem iv", "bedhem iiiv",
      "przedszkole 4", "przedszkole cztery", "przedszkole iv", "przedszkole iiiv",
      "fredi 4", "fredi cztery", "fredi kruger 4", "freddy 4"
    ],
  },
  {
    canonicalName: "Preschool V",
    realm: "Badham",
    isExplicitVariant: true,
    aliases: [
      "badham 5", "badham five", "badham v", "badham piec", "badham pięć",
      "preschool 5", "preschool five", "preschool v", "preschool piec", "preschool pięć",
      "badham preschool 5", "badham preschool v", "springwood 5", "springwood piec", "springwood pięć", "freddy map 5",
      "bedhem 5", "bedhem piec", "bedhem pięć", "bedhem v",
      "przedszkole 5", "przedszkole piec", "przedszkole pięć", "przedszkole v",
      "fredi 5", "fredi piec", "fredi kruger 5", "freddy 5"
    ],
  },

  // Coldwind Farm
  {
    canonicalName: "Fractured Cowshed",
    realm: "Coldwind Farm",
    aliases: [
      "fractured cowshed", "cowshed", "cow shed", "coldwind cowshed", "cow map",
      "kauszed", "frakczurd kauszed", "frakturd kauszed", "kalszed", "kouszed",
      "obora", "peknieta obora", "pęknięta obora", "stodola", "stodoła", "obora coldwind",
      "krowy", "obora krow", "obora krów"
    ],
  },
  {
    canonicalName: "Rancid Abbatoir",
    realm: "Coldwind Farm",
    aliases: [
      "rancid abbatoir", "rancid abattoir", "abbatoir", "abattoir", "slaughterhouse", "meat house",
      "ransid abatuar", "ransid abatoar", "ransyd abatuar",
      "rzeznia", "rzeźnia", "zgnila rzeznia", "zgniła rzeźnia", "ubojnia", "ubójnia", "masarnia",
      "rzeznia coldwind", "rzeźnia coldwind"
    ],
  },
  {
    canonicalName: "Rotten Fields",
    realm: "Coldwind Farm",
    aliases: [
      "rotten fields", "cornfield", "corn field", "corn map", "rotten corn",
      "roten filds", "roten fild", "rotten filds",
      "kukurydza", "zgnile pola", "zgniłe pola", "pole kukurydzy", "kukurydziane pole",
      "kukurydza coldwind", "pola coldwind"
    ],
  },
  {
    canonicalName: "The Thompson House",
    realm: "Coldwind Farm",
    aliases: [
      "the thompson house", "thompson house", "farmhouse", "farm house", "hillbilly house",
      "tompson haus", "tompson house", "tompsona dom", "dom tompsona",
      "dom thompsonow", "dom thompsonów", "chata thompsona", "dom billiego", "chata billiego",
      "dwor thompsona", "dwór thompsona", "farma thompsona"
    ],
  },
  {
    canonicalName: "Torment Creek",
    realm: "Coldwind Farm",
    aliases: [
      "torment creek", "creek", "silo", "silo map", "coldwind silo",
      "torment krik", "torment kryk",
      "strumyk meki", "strumyk męki", "strumien udreki", "strumień udręki",
      "silos", "silos coldwind", "wiatrak", "potok meki", "potok męki"
    ],
  },

  // Crotus Prenn Asylum
  {
    canonicalName: "Disturbed Ward",
    realm: "Crotus Prenn Asylum",
    aliases: [
      "disturbed ward", "asylum", "crotus prenn", "mental hospital", "ward", "nurse map",
      "disturbd lord", "disturbd ward", "krotus pren", "crotus pren",
      "szpital psychiatryczny", "oddzial zaburzonych", "oddział zaburzonych", "psychiatryk",
      "azyl", "szpital pielegniarki", "szpital pielęgniarki", "oddzial zamkniety", "oddział zamknięty"
    ],
  },
  {
    canonicalName: "Father Campbells Chapel",
    realm: "Crotus Prenn Asylum",
    aliases: [
      "father campbells chapel", "father campbell's chapel", "father campbell", "campbells chapel",
      "campbell's chapel", "clown map", "chapel", "church", "church map",
      "fader campbell", "fader kempbel", "fader campbells czapel", "kempbel", "campbell czapel", "czapel",
      "kaplica", "kaplica ojca campbella", "kaplica campbella", "kosciol", "kościół",
      "kaplica klauna", "kosciol klauna", "kościół klauna"
    ],
  },

  // Decimated Borgo
  {
    canonicalName: "Shattered Square",
    realm: "Decimated Borgo",
    aliases: [
      "shattered square", "borgo", "the decimated borgo", "decimated borgo", "knight map", "knight", "medieval map",
      "szaterd skler", "szaterd skłer", "desimejtid borgo",
      "zrujnowany plac", "strzaskany plac", "spalona wioska", "wioska rycerza", "mapa rycerza",
      "sredniowiecze", "średniowiecze", "rycerz"
    ],
  },
  {
    canonicalName: "Forgotten Ruins",
    realm: "Decimated Borgo",
    aliases: [
      "forgotten ruins", "vecna", "vecna map", "dnd", "dnd map", "dungeons and dragons", "dungeons and dragons map", "ruins",
      "forgoten ruins", "forgoten ruyns", "wekna",
      "zapomniane ruiny", "ruiny vecna", "ruiny wekny", "ruiny", "lochy vecny", "lochy", "mapa vecny", "mapa dnd"
    ],
  },

  // Forsaken Boneyard
  {
    canonicalName: "Eyrie of Crows",
    realm: "Forsaken Boneyard",
    aliases: [
      "eyrie of crows", "eyrie", "crows", "artist map", "artist", "boneyard", "forsaken boneyard", "crow tower",
      "ejri of krous", "ejri of krols", "bonejard", "krous",
      "gory krukow", "góry kruków", "gniazdo krukow", "gniazdo kruków", "wieza artystki", "wieża artystki",
      "mapa artystki", "cmentarzysko krukow", "cmentarzysko kruków", "kruki"
    ],
  },
  {
    canonicalName: "Dead Sands",
    realm: "Forsaken Boneyard",
    aliases: [
      "dead sands", "sands", "boneyard sands",
      "ded sends", "ded sand",
      "martwe piaski", "piaski", "pustynia", "pustynia artystki"
    ],
  },

  // Hawkins National Laboratory
  {
    canonicalName: "The Underground Complex",
    realm: "Hawkins National Laboratory",
    aliases: [
      "the underground complex", "underground complex", "hawkins", "hawkins lab",
      "hawkins national laboratory", "stranger things", "stranger things map", "demogorgon map", "demo map", "lab",
      "andergraund kompleks", "hokins", "strendzer tings",
      "laboratorium hawkins", "lab hawkins", "podziemny kompleks", "laboratorium", "mapa hawkins", "demogorgon"
    ],
  },

  // MacMillan Estate
  {
    canonicalName: "Coal Tower",
    realm: "MacMillan Estate",
    aliases: [
      "coal tower", "coal tower 1", "coal tower one", "coal tower i", "coal tower jeden", "macmillan tower",
      "kol tauer", "kol tauer 1", "kol tauer jeden", "kol tauer i", "kol tower", "makmilan",
      "wieza weglowa", "wieża węglowa", "wieza weglowa 1", "wieza weglowa jeden", "wieza wegla", "wieża węgla",
      "wieza macmillan", "wieża macmillan", "silos weglowy", "silos węglowy"
    ],
  },
  {
    canonicalName: "Coal Tower II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: [
      "coal tower 2", "coal tower two", "coal tower ii", "coal tower part 2", "coal tower dwa",
      "kol tauer 2", "kol tauer dwa", "kol tauer ii",
      "wieza weglowa 2", "wieza weglowa dwa", "wieża węglowa 2", "wieża węglowa dwa",
      "wieza weglowa ii", "wieża węglowa ii"
    ],
  },
  {
    canonicalName: "Groaning Storehouse",
    realm: "MacMillan Estate",
    aliases: [
      "groaning storehouse", "groaning storehouse 1", "groaning storehouse one", "groaning storehouse i", "groaning storehouse jeden",
      "storehouse", "store house",
      "groning storhaus", "groning storhaus 1", "groning storhaus jeden", "storhaus",
      "magazyn jekow", "magazyn jęków", "magazyn jekow 1", "magazyn jekow jeden",
      "sklad jekow", "skład jęków", "magazyn macmillan"
    ],
  },
  {
    canonicalName: "Groaning Storehouse II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: [
      "groaning storehouse 2", "groaning storehouse two", "groaning storehouse ii", "storehouse 2",
      "groaning storehouse dwa", "groning storhaus 2", "groning storhaus dwa",
      "magazyn jekow 2", "magazyn jekow dwa", "magazyn jęków 2", "magazyn jęków dwa",
      "storhaus 2", "storhaus dwa"
    ],
  },
  {
    canonicalName: "Ironworks Of Misery",
    realm: "MacMillan Estate",
    aliases: [
      "ironworks of misery", "ironworks", "iron works", "ironworks 1", "ironworks one", "ironworks i", "ironworks jeden", "misery",
      "ajronlorks", "ajronlorks 1", "ajronlorks jeden", "ajronłorks", "ajronworks", "ajronworks 1", "ajronworks jeden",
      "huta cierpienia", "huta cierpienia 1", "huta cierpienia jeden", "huta", "odlewnia cierpienia",
      "odlewnia zelaza", "odlewnia żelaza", "huta macmillan"
    ],
  },
  {
    canonicalName: "Ironworks Of Misery II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: [
      "ironworks of misery 2", "ironworks 2", "ironworks two", "ironworks ii", "ironworks of misery ii",
      "ironworks dwa", "ironworks of misery dwa",
      "ajronlorks 2", "ajronlorks dwa", "ajronworks 2", "ajronworks dwa",
      "huta 2", "huta dwa", "huta cierpienia 2", "huta cierpienia dwa"
    ],
  },
  {
    canonicalName: "Shelter Woods",
    realm: "MacMillan Estate",
    aliases: [
      "shelter woods", "shelter woods 1", "shelter woods one", "shelter woods i", "shelter woods jeden",
      "big tree map", "tree map", "skull merchant map",
      "szelter wuds", "szelter wuds 1", "szelter wuds jeden", "szelter woods",
      "las schronienia", "las schronienia 1", "las schronienia jeden", "schronienie w lesie",
      "drzewo skull merchant", "wielkie drzewo", "drzewo macmillan", "las macmillan"
    ],
  },
  {
    canonicalName: "Shelter Woods II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: [
      "shelter woods 2", "shelter woods two", "shelter woods ii", "shelter woods dwa",
      "szelter wuds 2", "szelter wuds dwa", "las schronienia 2", "las schronienia dwa"
    ],
  },
  {
    canonicalName: "Suffocation Pit",
    realm: "MacMillan Estate",
    aliases: [
      "suffocation pit", "suffocation pit 1", "suffocation pit one", "suffocation pit i", "suffocation pit jeden", "the pit", "pit map",
      "safokejszyn", "safokejszyn pit", "safokejszyn 1", "safokejszyn jeden",
      "dol uduszenia", "dół uduszenia", "dol uduszenia 1", "dol uduszenia jeden", "dół uduszenia 1", "dół uduszenia jeden",
      "szyb uduszenia", "kopalnia uduszenia", "dol macmillan", "dół macmillan", "kopalnia trappera"
    ],
  },
  {
    canonicalName: "Suffocation Pit II",
    realm: "MacMillan Estate",
    isExplicitVariant: true,
    aliases: [
      "suffocation pit 2", "suffocation pit two", "suffocation pit ii", "suffocation pit dwa",
      "safokejszyn 2", "safokejszyn dwa", "dol uduszenia 2", "dol uduszenia dwa", "dół uduszenia 2", "dół uduszenia dwa"
    ],
  },

  // Red Forest
  {
    canonicalName: "Mother's Dwelling",
    realm: "Red Forest",
    aliases: [
      "mothers dwelling", "mother's dwelling", "huntress map", "huntress", "dwelling", "red forest house", "russian house",
      "maders dweling", "maders dwelyng",
      "dom matki", "chata matki", "mieszkanie matki", "siedziba matki",
      "chata huntress", "dom huntress", "mapa huntress", "chata huntreski",
      "rosyjski las", "czerwony las chata", "czerwony las"
    ],
  },
  {
    canonicalName: "Temple of Purgation",
    realm: "Red Forest",
    aliases: [
      "temple of purgation", "the temple of purgation", "temple", "plague map", "plague", "babylonian temple",
      "templ of purgeszyn", "templ of purgejszyn", "temple of purgeszyn",
      "swiatynia oczyszczenia", "świątynia oczyszczenia", "swiatynia", "świątynia",
      "swiatynia zarazy", "świątynia zarazy", "swiatynia plague", "świątynia plague",
      "babilonska swiatynia", "babilońska świątynia", "mapa rzygaczki"
    ],
  },

  // Backwater Swamp
  {
    canonicalName: "Grim Pantry",
    realm: "Backwater Swamp",
    aliases: [
      "grim pantry", "pantry", "swamp pantry", "hag map pantry", "swamp shack",
      "backwater swamp", "the swamp", "swamp", "backwater",
      "grim pantri", "grim pentri", "bakloter slomp",
      "ponura spizarnia", "ponura spiżarnia", "spizarnia", "spiżarnia",
      "bagna", "bagno", "chata wiedzmy", "chata wiedźmy", "bagienna chata", "mapa hagi"
    ],
  },
  {
    canonicalName: "The Pale Rose",
    realm: "Backwater Swamp",
    aliases: [
      "the pale rose", "pale rose", "swamp boat", "boat map", "steamer",
      "paddle steamer", "hag boat", "backwater swamp pale rose",
      "pejl rouz", "pejl roz", "pale rouz",
      "blada roza", "blada róża", "statek", "parostatek", "lodz", "łódź",
      "statek na bagnach", "parowiec", "lodz wiedzmy", "łódź wiedźmy"
    ],
  },

  // Yamaoka Estate
  {
    canonicalName: "Family Residence",
    realm: "Yamaoka Estate",
    aliases: [
      "family residence", "family residence 1", "family residence one", "family residence i", "family residence jeden",
      "spirit map", "oni map", "yamaoka house", "residence",
      "femili rezidens", "femili rezidens 1", "femili rezidens jeden",
      "posiadlosc rodzinna", "posiadłość rodzinna", "posiadlosc rodzinna 1", "posiadłość rodzinna 1",
      "posiadlosc yamaoka", "posiadłość yamaoka", "posiadlosc yamaoka 1",
      "dom yamaoka", "dom spirita", "chata spirita", "rezydencja yamaoka"
    ],
  },
  {
    canonicalName: "Family Residence II",
    realm: "Yamaoka Estate",
    isExplicitVariant: true,
    aliases: [
      "family residence 2", "family residence two", "family residence ii", "family residence dwa",
      "femili rezidens 2", "femili rezidens dwa",
      "posiadlosc rodzinna 2", "posiadłość rodzinna 2",
      "posiadlosc yamaoka 2", "posiadłość yamaoka 2"
    ],
  },
  {
    canonicalName: "Sanctum of Wrath",
    realm: "Yamaoka Estate",
    aliases: [
      "sanctum of wrath", "sanctum of wrath 1", "sanctum of wrath one", "sanctum of wrath i", "sanctum of wrath jeden",
      "sanctum", "sanctum 1", "sanctum jeden", "statue map", "yamaoka shrine", "shrine map",
      "sanktum of frat", "sanctum of frat",
      "sanktuarium gniewu", "sanktuarium gniewu 1", "swiatynia gniewu", "świątynia gniewu", "swiatynia gniewu 1",
      "kaplica yamaoka", "kaplica oni", "mapa oni", "posag oni", "posąg oni"
    ],
  },
  {
    canonicalName: "Sanctum of Wrath II",
    realm: "Yamaoka Estate",
    isExplicitVariant: true,
    aliases: [
      "sanctum of wrath 2", "sanctum of wrath two", "sanctum of wrath ii", "sanctum of wrath dwa",
      "sanctum 2", "sanctum dwa", "sanktum of frat 2",
      "sanktuarium gniewu 2", "sanktuarium gniewu dwa", "swiatynia gniewu 2", "świątynia gniewu 2"
    ],
  },

  // Raccoon City Police Department (RPD)
  {
    canonicalName: "Police Station East Wing",
    realm: "Raccoon City",
    isExplicitVariant: true,
    aliases: [
      "police station east wing", "police station east", "rpd east wing", "rpd east",
      "east wing", "raccoon east", "resident evil east", "re2 east", "rpd 1", "rpd jeden",
      "rpd ist", "rpd est", "er pi di ist", "er pe de ist", "er pi di east", "er pe de est",
      "rpd wschod", "rpd wschód", "posterunek wschod", "posterunek wschód",
      "komisariat wschod", "komisariat wschód", "skrzydlo wschodnie", "skrzydło wschodnie",
      "posterunek skrzydlo wschodnie", "posterunek 1", "posterunek jeden"
    ],
  },
  {
    canonicalName: "Police Station West Wing",
    realm: "Raccoon City",
    isExplicitVariant: true,
    aliases: [
      "police station west wing", "police station west", "rpd west wing", "rpd west",
      "west wing", "raccoon west", "resident evil west", "re2 west", "rpd 2", "rpd dwa",
      "rpd uest", "rpd west", "er pi di uest", "er pe de uest", "er pi di west", "er pe de west",
      "rpd zachod", "rpd zachód", "posterunek zachod", "posterunek zachód",
      "komisariat zachod", "komisariat zachód", "skrzydlo zachodnie", "skrzydło zachodnie",
      "posterunek skrzydlo zachodnie", "posterunek 2", "posterunek dwa"
    ],
  },

  // Grave of Glennvale
  {
    canonicalName: "Dead Dawg Saloon",
    realm: "Grave of Glennvale",
    aliases: [
      "dead dawg saloon", "dead dawg", "dead dog saloon", "dead dog", "saloon",
      "cowboy map", "cowboy", "gunslinger map", "gunslinger", "glennvale", "grave of glennvale", "western map",
      "ded dog salun", "ded dog salon", "glenlejl",
      "saloon martwego psa", "martwy pies", "salun martwego psa", "salun", "kowboje",
      "mapa kowboja", "dziki zachod", "dziki zachód", "western", "mapa deathslingera"
    ],
  },

  // Withered Isle
  {
    canonicalName: "Garden of Joy",
    realm: "Withered Isle",
    aliases: [
      "garden of joy", "dredge map", "dredge", "joy garden", "withered isle garden", "haunted house",
      "garden of dzoj", "garden of dżoj", "dredz",
      "ogrod radosci", "ogród radości", "ogrod", "ogród", "nawiedzony dom", "mapa dredga", "wioska dredge"
    ],
  },
  {
    canonicalName: "Greenville Square",
    realm: "Withered Isle",
    aliases: [
      "greenville square", "greenville", "theater", "cinema", "arcade", "unknown map", "the unknown map",
      "grinvil skler", "grinvil skłer", "grinvil", "anlon",
      "plac greenville", "kino", "kino unknown", "mapa unknown", "teatr greenville", "kino greenville", "arkada", "salon gier"
    ],
  },

  // Castlevania
  {
    canonicalName: "Fallen Refuge",
    realm: "Castlevania",
    aliases: [
      "fallen refuge", "dracula map", "dracula", "castlevania", "castlevania map", "castle", "castle map", "vampire castle",
      "folen refjudz", "folen refiudz", "kaselwania", "kastelwania", "drakula",
      "upadle schronienie", "upadłe schronienie", "zamek drakuli", "zamek dracula", "zamek", "zamek wampira", "mapa drakuli"
    ],
  },

  // Five Nights at Freddy's
  {
    canonicalName: "Freddy Fazbears Pizza",
    realm: "Five Nights at Freddy's",
    aliases: [
      "freddy fazbears pizza", "freddy fazbear's pizza", "freddy fazbear", "fnaf",
      "fnaf map", "five nights at freddys", "five nights at freddy's", "five nights", "pizzeria", "animatronic map",
      "fredi fnaf", "fredi fazber", "fnaf mapa", "animatroniki",
      "pizzeria freddyego", "pizzeria fnaf", "restauracja freddyego", "freddy fazbear",
      "piec nocy u freddyego", "pięć nocy u freddy'ego"
    ],
  },

  // Gideon Meat Plant
  {
    canonicalName: "The Game",
    realm: "Gideon Meat Plant",
    aliases: [
      "the game", "game", "gideon meat plant", "gideon", "gideons", "gideons meat plant",
      "meat plant", "saw map", "saw", "jigsaw map", "jigsaw", "pig map", "pallet map",
      "de gejm", "de gejm pila", "gidion", "soł", "dzigso",
      "gra", "zaklad miesny gideon", "zakład mięsny gideon", "zaklady miesne", "zakłady mięsne",
      "rzeznia gideon", "rzeźnia gideon", "mapa pily", "mapa piły", "mapa pig", "mapa swini", "mapa świni", "palety"
    ],
  },

  // Haddonfield
  {
    canonicalName: "Lampkin Lane",
    realm: "Haddonfield",
    aliases: [
      "lampkin lane", "lampkin", "haddonfield", "myers map", "michael myers map",
      "myers", "michael myers", "halloween", "halloween map", "suburb", "suburb map",
      "lampkin lejn", "lampkin len", "hedonfild", "majers", "halowin",
      "aleja lampkin", "ulica lampkin", "mapa myersa", "dom myersa", "osiedle myersa",
      "przedmiescia", "przedmieścia"
    ],
  },

  // Silent Hill
  {
    canonicalName: "Midwich Elementary School",
    realm: "Silent Hill",
    aliases: [
      "midwich elementary school", "midwich elementary", "midwich", "silent hill",
      "silent hill map", "pyramid head map", "pyramid head", "school", "school map",
      "midlicz", "midwicz", "midlycz", "sajlent hil", "piramidhed",
      "szkola podstawowa midwich", "szkoła podstawowa midwich", "szkola midwich", "szkoła midwich",
      "szkola silent hill", "szkoła silent hill", "szkola", "szkoła", "mapa pyramid heada"
    ],
  },

  // Ormond
  {
    canonicalName: "Mount Ormond Resort",
    realm: "Ormond",
    aliases: [
      "mount ormond resort", "mount ormond", "ormond", "ski resort", "snow map",
      "chalet", "legion map", "legion", "snow", "resort",
      "mont ormond", "ormont",
      "resort ormond", "osrodek narciarski ormond", "ośrodek narciarski ormond",
      "gora ormond", "góra ormond", "snieg", "śnieg", "mapa ze sniegiem", "mapa ze śniegiem",
      "chata ormond", "mapa legiona"
    ],
  },
  {
    canonicalName: "Mount Ormond Resort II",
    realm: "Ormond",
    isExplicitVariant: true,
    aliases: [
      "mount ormond resort 2", "mount ormond resort ii", "ormond 2", "mount ormond 2",
      "mount ormond resort dwa", "ormond dwa", "mount ormond dwa",
      "gora ormond 2", "góra ormond 2", "gora ormond dwa"
    ],
  },
  {
    canonicalName: "Mount Ormond Resort III",
    realm: "Ormond",
    isExplicitVariant: true,
    aliases: [
      "mount ormond resort 3", "mount ormond resort iii", "ormond 3", "mount ormond 3",
      "mount ormond resort trzy", "ormond trzy", "mount ormond trzy",
      "gora ormond 3", "góra ormond 3", "gora ormond trzy"
    ],
  },
  {
    canonicalName: "Ormond Lake Mine",
    realm: "Ormond",
    aliases: [
      "ormond lake mine", "lake mine", "mine map", "ormond mine", "mine",
      "ormond lejk majn", "lejk majn", "ormond kopalnia",
      "kopalnia ormond", "kopalnia nad jeziorem ormond", "kopalnia", "szyb ormond"
    ],
  },

  // Lery's Memorial Institute
  {
    canonicalName: "Treatment Theatre",
    realm: "Lery's Memorial Institute",
    aliases: [
      "treatment theatre", "treatment theater", "lerys", "lery's", "lerys memorial institute",
      "lery's memorial institute", "hospital", "hospital map", "doctor map", "doctor",
      "treatment", "treatment room", "medical center",
      "tritment tiater", "tritment teatr", "leris", "doktor",
      "sala zabiegowa", "teatr leczenia", "instytut lery", "instytut leryego",
      "szpital doktora", "mapa doktora", "szpital lery", "gabinet zabiegowy"
    ],
  },

  // Dvarka Deepwood
  {
    canonicalName: "Toba Landing",
    realm: "Dvarka Deepwood",
    aliases: [
      "toba landing", "toba", "singularity map", "singularity", "alien jungle", "dvarka deepwood", "dvarka", "landing",
      "toba lendyng", "singjuloriti", "dwarka",
      "ladowisko toba", "lądowisko toba", "mapa singularity", "kosmiczna dzungla", "kosmiczna dżungla", "stacja toba"
    ],
  },
  {
    canonicalName: "Nostromo Wreckage",
    realm: "Dvarka Deepwood",
    aliases: [
      "nostromo wreckage", "nostromo", "alien map", "alien", "xenomorph map",
      "xenomorph", "crashed ship", "spaceship", "nostromo ship",
      "nostromo rekydz", "nostromo rekidz", "ksenomorf", "obcy",
      "wrak nostromo", "statek nostromo", "mapa obcego", "rozbity statek", "wrak statku kosmicznego"
    ],
  },

  // Trickster
  {
    canonicalName: "Trickster's Delusion",
    realm: "All-Kill",
    aliases: [
      "tricksters delusion", "trickster's delusion", "trickster map", "trickster", "all-kill map", "delusion", "neon studio",
      "trikster deluzjon", "trikster", "ol kil",
      "zludzenie trickstera", "złudzenie trickstera", "iluzja trickstera", "studio trickstera",
      "mapa trickstera", "studio neonowe"
    ],
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
      "east wing", "raccoon east", "re2 east", "resident evil east", "rpd 1", "rpd one",
      "rpd ist", "rpd est", "er pi di ist", "er pe de ist", "er pi di east", "er pe de est",
      "rpd wschod", "rpd wschód", "posterunek wschod", "posterunek wschód",
      "komisariat wschod", "komisariat wschód", "skrzydlo wschodnie", "skrzydło wschodnie",
      "posterunek skrzydlo wschodnie", "posterunek 1", "posterunek jeden"
    ],
    canonicalName: "Police Station East Wing",
  },
  {
    keywords: [
      "police station west wing", "police station west", "rpd west wing", "rpd west",
      "west wing", "raccoon west", "re2 west", "resident evil west", "rpd 2", "rpd two",
      "rpd uest", "er pi di uest", "er pe de uest", "er pi di west", "er pe de west",
      "rpd zachod", "rpd zachód", "posterunek zachod", "posterunek zachód",
      "komisariat zachod", "komisariat zachód", "skrzydlo zachodnie", "skrzydło zachodnie",
      "posterunek skrzydlo zachodnie", "posterunek 2", "posterunek dwa"
    ],
    canonicalName: "Police Station West Wing",
  },

  // Badham / Preschool
  {
    keywords: [
      "badham 1", "badham one", "badham i", "badham jeden",
      "preschool 1", "preschool one", "preschool i", "preschool jeden",
      "badham preschool 1", "badham preschool i", "springwood 1", "springwood jeden",
      "bedhem 1", "bedhem jeden", "bedhem i", "przedszkole 1", "przedszkole jeden", "przedszkole i",
      "fredi 1", "fredi jeden", "fredi kruger 1", "freddy 1"
    ],
    canonicalName: "Preschool I",
  },
  {
    keywords: [
      "badham 2", "badham two", "badham ii", "badham dwa",
      "preschool 2", "preschool two", "preschool ii", "preschool dwa",
      "badham preschool 2", "badham preschool ii", "springwood 2", "springwood dwa",
      "bedhem 2", "bedhem dwa", "bedhem ii", "przedszkole 2", "przedszkole dwa", "przedszkole ii",
      "fredi 2", "fredi dwa", "fredi kruger 2", "freddy 2"
    ],
    canonicalName: "Preschool II",
  },
  {
    keywords: [
      "badham 3", "badham three", "badham iii", "badham trzy",
      "preschool 3", "preschool three", "preschool iii", "preschool trzy",
      "badham preschool 3", "badham preschool iii", "springwood 3", "springwood trzy",
      "bedhem 3", "bedhem trzy", "bedhem iii", "przedszkole 3", "przedszkole trzy", "przedszkole iii",
      "fredi 3", "fredi trzy", "fredi kruger 3", "freddy 3"
    ],
    canonicalName: "Preschool III",
  },
  {
    keywords: [
      "badham 4", "badham four", "badham iv", "badham iiiv", "badham cztery",
      "preschool 4", "preschool four", "preschool iv", "preschool iiiv", "preschool cztery",
      "badham preschool 4", "badham preschool iv", "springwood 4", "springwood cztery",
      "bedhem 4", "bedhem cztery", "bedhem iv", "bedhem iiiv",
      "przedszkole 4", "przedszkole cztery", "przedszkole iv", "przedszkole iiiv",
      "fredi 4", "fredi cztery", "fredi kruger 4", "freddy 4"
    ],
    canonicalName: "Preschool IIIV",
  },
  {
    keywords: [
      "badham 5", "badham five", "badham v", "badham piec", "badham pięć",
      "preschool 5", "preschool five", "preschool v", "preschool piec", "preschool pięć",
      "badham preschool 5", "badham preschool v", "springwood 5", "springwood piec", "springwood pięć",
      "bedhem 5", "bedhem piec", "bedhem pięć", "bedhem v",
      "przedszkole 5", "przedszkole piec", "przedszkole pięć", "przedszkole v",
      "fredi 5", "fredi piec", "fredi kruger 5", "freddy 5"
    ],
    canonicalName: "Preschool V",
  },

  // Coal Tower
  {
    keywords: [
      "coal tower 1", "coal tower one", "coal tower i", "coal tower part 1", "coal tower jeden",
      "kol tauer 1", "kol tauer jeden", "kol tauer i",
      "wieza weglowa 1", "wieza weglowa jeden", "wieża węglowa 1", "wieża węglowa jeden",
      "wieza weglowa i", "wieża węglowa i"
    ],
    canonicalName: "Coal Tower",
  },
  {
    keywords: [
      "coal tower 2", "coal tower two", "coal tower ii", "coal tower part 2", "coal tower dwa",
      "kol tauer 2", "kol tauer dwa", "kol tauer ii",
      "wieza weglowa 2", "wieza weglowa dwa", "wieża węglowa 2", "wieża węglowa dwa",
      "wieza weglowa ii", "wieża węglowa ii"
    ],
    canonicalName: "Coal Tower II",
  },

  // Groaning Storehouse
  {
    keywords: [
      "groaning storehouse 1", "groaning storehouse one", "groaning storehouse i", "groaning storehouse jeden",
      "storehouse 1", "storehouse jeden", "groning storhaus 1", "groning storhaus jeden",
      "magazyn jekow 1", "magazyn jekow jeden", "magazyn jęków 1", "magazyn jęków jeden"
    ],
    canonicalName: "Groaning Storehouse",
  },
  {
    keywords: [
      "groaning storehouse 2", "groaning storehouse two", "groaning storehouse ii", "groaning storehouse dwa",
      "storehouse 2", "storehouse dwa", "groning storhaus 2", "groning storhaus dwa",
      "magazyn jekow 2", "magazyn jekow dwa", "magazyn jęków 2", "magazyn jęków dwa"
    ],
    canonicalName: "Groaning Storehouse II",
  },

  // Ironworks of Misery
  {
    keywords: [
      "ironworks 1", "ironworks one", "ironworks i", "ironworks jeden",
      "ironworks of misery 1", "ironworks of misery one", "ironworks of misery i", "ironworks of misery jeden",
      "ajronlorks 1", "ajronlorks jeden", "ajronlorks i", "ajronworks 1", "ajronworks jeden",
      "huta 1", "huta jeden", "huta cierpienia 1", "huta cierpienia jeden"
    ],
    canonicalName: "Ironworks Of Misery",
  },
  {
    keywords: [
      "ironworks 2", "ironworks two", "ironworks ii", "ironworks dwa",
      "ironworks of misery 2", "ironworks of misery two", "ironworks of misery ii", "ironworks of misery dwa",
      "ajronlorks 2", "ajronlorks dwa", "ajronlorks ii", "ajronworks 2", "ajronworks dwa",
      "huta 2", "huta dwa", "huta cierpienia 2", "huta cierpienia dwa"
    ],
    canonicalName: "Ironworks Of Misery II",
  },

  // Shelter Woods
  {
    keywords: [
      "shelter woods 1", "shelter woods one", "shelter woods i", "shelter woods jeden",
      "szelter wuds 1", "szelter wuds jeden", "las schronienia 1", "las schronienia jeden"
    ],
    canonicalName: "Shelter Woods",
  },
  {
    keywords: [
      "shelter woods 2", "shelter woods two", "shelter woods ii", "shelter woods dwa",
      "szelter wuds 2", "szelter wuds dwa", "las schronienia 2", "las schronienia dwa"
    ],
    canonicalName: "Shelter Woods II",
  },

  // Suffocation Pit
  {
    keywords: [
      "suffocation pit 1", "suffocation pit one", "suffocation pit i", "suffocation pit jeden",
      "safokejszyn 1", "safokejszyn jeden", "dol uduszenia 1", "dol uduszenia jeden", "dół uduszenia 1", "dół uduszenia jeden"
    ],
    canonicalName: "Suffocation Pit",
  },
  {
    keywords: [
      "suffocation pit 2", "suffocation pit two", "suffocation pit ii", "suffocation pit dwa",
      "safokejszyn 2", "safokejszyn dwa", "dol uduszenia 2", "dol uduszenia dwa", "dół uduszenia 2", "dół uduszenia dwa"
    ],
    canonicalName: "Suffocation Pit II",
  },

  // Family Residence
  {
    keywords: [
      "family residence 1", "family residence one", "family residence i", "family residence jeden",
      "femili rezidens 1", "femili rezidens jeden", "posiadlosc rodzinna 1", "posiadłość rodzinna 1",
      "posiadlosc yamaoka 1", "posiadłość yamaoka 1"
    ],
    canonicalName: "Family Residence",
  },
  {
    keywords: [
      "family residence 2", "family residence two", "family residence ii", "family residence dwa",
      "femili rezidens 2", "femili rezidens dwa", "posiadlosc rodzinna 2", "posiadłość rodzinna 2",
      "posiadlosc yamaoka 2", "posiadłość yamaoka 2"
    ],
    canonicalName: "Family Residence II",
  },

  // Sanctum of Wrath
  {
    keywords: [
      "sanctum of wrath 1", "sanctum of wrath one", "sanctum of wrath i", "sanctum of wrath jeden",
      "sanctum 1", "sanctum jeden", "sanktum of frat 1", "sanktuarium gniewu 1",
      "swiatynia gniewu 1", "świątynia gniewu 1"
    ],
    canonicalName: "Sanctum of Wrath",
  },
  {
    keywords: [
      "sanctum of wrath 2", "sanctum of wrath two", "sanctum of wrath ii", "sanctum of wrath dwa",
      "sanctum 2", "sanctum dwa", "sanktum of frat 2", "sanktuarium gniewu 2",
      "swiatynia gniewu 2", "świątynia gniewu 2"
    ],
    canonicalName: "Sanctum of Wrath II",
  },

  // Mount Ormond
  {
    keywords: [
      "mount ormond 1", "mount ormond resort 1", "ormond 1", "ormond jeden", "mount ormond jeden",
      "gora ormond 1", "góra ormond 1", "gora ormond jeden"
    ],
    canonicalName: "Mount Ormond Resort",
  },
  {
    keywords: [
      "mount ormond 2", "mount ormond resort 2", "ormond 2", "ormond dwa", "mount ormond dwa",
      "gora ormond 2", "góra ormond 2", "gora ormond dwa"
    ],
    canonicalName: "Mount Ormond Resort II",
  },
  {
    keywords: [
      "mount ormond 3", "mount ormond resort 3", "ormond 3", "ormond trzy", "mount ormond trzy",
      "gora ormond 3", "góra ormond 3", "gora ormond trzy"
    ],
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
    keywords: ["badham", "preschool", "badham preschool", "springwood", "przedszkole", "bedhem"],
    defaultCanonical: "Preschool I",
    variantGroupKey: "badham",
  },
  {
    keywords: [
      "rpd", "police station", "raccoon city", "raccoon", "resident evil",
      "er pi di", "er pe de", "posterunek", "komisariat", "posterunek policji", "komisariat policji"
    ],
    defaultCanonical: "Police Station East Wing",
    variantGroupKey: "rpd",
  },
  {
    keywords: ["coal tower", "kol tauer", "wieza weglowa", "wieża węglowa"],
    defaultCanonical: "Coal Tower",
    variantGroupKey: "coal_tower",
  },
  {
    keywords: ["groaning storehouse", "storehouse", "groning storhaus", "magazyn jekow", "magazyn jęków"],
    defaultCanonical: "Groaning Storehouse",
    variantGroupKey: "groaning_storehouse",
  },
  {
    keywords: [
      "ironworks", "ironworks of misery", "iron works",
      "ajronlorks", "ajronłorks", "ajronworks", "huta cierpienia", "huta"
    ],
    defaultCanonical: "Ironworks Of Misery",
    variantGroupKey: "ironworks_of_misery",
  },
  {
    keywords: ["shelter woods", "szelter wuds", "las schronienia"],
    defaultCanonical: "Shelter Woods",
    variantGroupKey: "shelter_woods",
  },
  {
    keywords: ["suffocation pit", "safokejszyn", "dol uduszenia", "dół uduszenia"],
    defaultCanonical: "Suffocation Pit",
    variantGroupKey: "suffocation_pit",
  },
  {
    keywords: [
      "family residence", "femili rezidens",
      "posiadlosc yamaoka", "posiadłość yamaoka", "posiadlosc rodzinna", "posiadłość rodzinna"
    ],
    defaultCanonical: "Family Residence",
    variantGroupKey: "family_residence",
  },
  {
    keywords: ["sanctum of wrath", "sanctum", "sanktuarium gniewu", "swiatynia gniewu", "świątynia gniewu"],
    defaultCanonical: "Sanctum of Wrath",
    variantGroupKey: "sanctum_of_wrath",
  },
  {
    keywords: ["mount ormond", "ormond", "mount ormond resort", "gora ormond", "góra ormond", "resort ormond"],
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
      "12 o'clock", "twelve o'clock", "switch hens", "use hens", "hens provider", "hens",
      // Polish Provider Switching commands
      "zmien na hensa", "zmień na hensa", "wlacz hensa", "włącz hensa",
      "mapy hensa", "mapa hensa", "system zegarowy", "zegar hensa",
      "przelacz na hensa", "przełącz na hensa", "zrodlo hens", "źródło hens"
    ],
    source: "hens333",
  },
  {
    keywords: [
      "switch to samoel", "switch to samoelcolt", "samoel maps", "samoel map",
      "samoel callouts", "isometric", "isometric maps", "switch samoel", "use samoel",
      "samoel provider", "samoel",
      // Polish Provider Switching commands
      "zmien na samoela", "zmień na samoela", "wlacz samoela", "włącz samoela",
      "mapy samoela", "mapa samoela", "rzut izometryczny", "izometria", "mapy izometryczne",
      "przelacz na samoela", "przełącz na samoela", "zrodlo samoela", "źródło samoela"
    ],
    source: "samoelcolt",
  },
  {
    keywords: [
      "all maps", "all map", "all sources", "all source", "switch to all",
      "show all maps", "reset source", "all providers", "all provider", "both sources",
      // Polish Provider Switching commands
      "wszystkie mapy", "pokaz wszystko", "pokaż wszystko", "wszystkie zrodla", "wszystkie źródła",
      "pokaz wszystkie mapy", "pokaż wszystkie mapy", "wszystkie", "reset zrodla", "reset źródła"
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
    keywords: [
      "zoom in", "zoom plus", "magnify", "closer", "zoom up", "enlarge",
      // Polish Action Navigation commands
      "przybliz", "przybliż", "powieksz", "powiększ", "przyblizenie", "przybliżenie",
      "powiekszenie", "powiększenie", "blizej", "bliżej"
    ],
    action: "zoom_in",
  },
  {
    keywords: [
      "zoom out", "zoom minus", "further", "unzoom", "zoom down", "shrink",
      // Polish Action Navigation commands
      "oddal", "pomniejsz", "oddalenie", "pomniejszenie", "dalej"
    ],
    action: "zoom_out",
  },
  {
    keywords: [
      "fullscreen", "full screen", "maximize", "popout", "expand", "expand map",
      // Polish Action Navigation commands
      "pelny ekran", "pełny ekran", "otworz silnik", "otwórz silnik", "silnik 2d", "silnik",
      "tryb pelnoekranowy", "tryb pełnoekranowy", "maksymalizuj"
    ],
    action: "fullscreen",
  },
  {
    keywords: [
      "close", "close map", "exit", "dismiss", "back", "close modal", "quit",
      // Polish Action Navigation commands
      "zamknij", "zamknij mape", "zamknij mapę", "wyjdz", "wyjdź", "wroc", "wróć"
    ],
    action: "close",
  },
];

// ─── Conversational Cleaning ──────────────────────────────────────────────────

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

