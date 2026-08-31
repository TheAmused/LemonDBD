// frontend/src/constants/perkTraitKeywords.ts
// Multilingual detection keywords for the Tarot Deck's "type predicts the
// perk" taxonomy. Sourced from the same curated, already-vetted multilingual
// term lists already used in `utils/textFormatter.tsx`'s DBD_KEYWORDS
// (EN/PL/DE/ES/JA) -- not invented here. Some categories (Generator,
// Healing) only have partial language coverage because DBD_KEYWORDS itself
// doesn't yet have full per-language terms for every one of these concepts.
// A perk whose description has no matching keyword for the active locale
// simply falls through to the "entity" catch-all in getPerkTarotType --
// never a broken match, just a lower hit-rate for that language/category
// combination.

export const AURA_KEYWORDS: readonly string[] = [
  'Aura Reading', 'Auras', 'Aura', // EN / ES (identical spelling)
  'Czytanie Aur', 'Aury Zabójcy', 'Aury', 'Aurę', // PL
  'Auren', // DE
  'オーラ', // JA
];

export const GENERATOR_KEYWORDS: readonly string[] = [
  'Generators', 'Generator', // EN
  'Generatory', // PL
];

export const HEALING_KEYWORDS: readonly string[] = [
  'Med-Kit', 'Medkit', 'First Aid', 'Styptic', 'Serum', 'Bandage', 'Healthy State', // EN
];

export const CHASE_KEYWORDS: readonly string[] = [
  'Haste', 'Hindered', 'Pallets', 'Pallet', 'Windows', 'Window', // EN
  'Pośpiech', 'Pośpiechu', 'Spowolnienie', 'Palety', 'Paleta', // PL
  'Eile', // DE
  'Celeridad', 'Entorpecimiento', // ES
  '迅速', '妨害', // JA
];

export const STEALTH_KEYWORDS: readonly string[] = [
  'Terror Radius', 'Undetectable', 'Oblivious', // EN
  'Zasięg Terroru', 'Zasięgu Terroru', 'Niewykrywalność', 'Nieświadomość', // PL
  'Terrorradius', 'Unentdeckbar', 'Ahnungslos', // DE
  'Radio de terror', 'Indetectable', 'Inconsciente', // ES
  '脅威範囲', '探知不可', '忘却', // JA
];

export const OBSESSION_KEYWORDS: readonly string[] = [
  'Obsession', // EN
  'Obsesja', // PL
  'Besessenheit', // DE
  'Obsesión', // ES
  'オブセッション', // JA
];
