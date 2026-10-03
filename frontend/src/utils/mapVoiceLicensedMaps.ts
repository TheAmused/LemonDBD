// frontend/src/utils/mapVoiceLicensedMaps.ts
// Canonical voice-matcher aliases for the licensed-chapter maps (split out of mapVoiceData.ts).
import type { CanonicalMapDefinition } from './mapVoiceData';

export const LICENSED_CANONICAL_MAPS: CanonicalMapDefinition[] = [
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
