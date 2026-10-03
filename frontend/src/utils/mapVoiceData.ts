// frontend/src/utils/mapVoiceData.ts
/**
 * Static data tables for the map voice matcher (variant groups, canonical map
 * aliases, explicit/generic variant rules, source and action commands).
 * Pure data -- the matching logic lives in mapVoiceMatcher.ts, which re-exports
 * the public tables from here.
 */
import { LICENSED_CANONICAL_MAPS } from './mapVoiceLicensedMaps';

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

// ─── Canonical Map & Alias Dictionary ─────────────────────────────────────────

export interface CanonicalMapDefinition {
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

  ...LICENSED_CANONICAL_MAPS,
];

export * from './mapVoiceRules';
