// frontend/src/utils/mapVoiceRules.ts
// Variant, source and action command rule tables for the map voice matcher (split out of mapVoiceData.ts).
import type { MapSource } from './mapVoiceMatcher';

// ─── Explicit Variant Resolution Rules ────────────────────────────────────────

export interface ExplicitVariantRule {
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

export interface GenericVariantRule {
  keywords: string[];
  defaultCanonical: string;
  variantGroupKey: string;
}

export const GENERIC_VARIANT_RULES: GenericVariantRule[] = [
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

export interface SourceCommandRule {
  keywords: string[];
  source: MapSource;
}

export const SOURCE_COMMAND_RULES: SourceCommandRule[] = [
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

export interface ActionCommandRule {
  keywords: string[];
  action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close';
}

export const ACTION_COMMAND_RULES: ActionCommandRule[] = [
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
