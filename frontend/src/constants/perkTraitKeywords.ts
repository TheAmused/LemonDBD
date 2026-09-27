// frontend/src/constants/perkTraitKeywords.ts
// Multilingual detection keywords for the Tarot Deck's "type predicts the
// perk" taxonomy. Sourced from the curated, vetted multilingual terms
// (EN/PL/DE/ES/JA) used across DBD terminology.
// Used as fallbacks to ensure perks with generic backend metadata (such as
// Survivor generator, chase, and stealth perks) resolve to their appropriate
// thematic Tarot cards instead of dumping into "The Entity".

export const AURA_KEYWORDS: readonly string[] = [
  'Aura Reading', 'Auras', 'Aura', // EN / ES
  'Czytanie Aur', 'Aury Zabójcy', 'Aury Ocalałych', 'Aury', 'Aurę', // PL
  'Auren', // DE
  'オーラ', // JA
];

export const GENERATOR_KEYWORDS: readonly string[] = [
  // EN
  'Generators', 'Generator', 'repair', 'repairing', 'repairs', 'repair speed', 'repair progression', 'repair progress',
  // PL
  'Generatory', 'Generator', 'Generatora', 'Generatorów', 'naprawianie', 'prędkość naprawy', 'naprawiasz', 'naprawiają', 'naprawę', 'naprawie',
  // DE
  'Generatoren', 'Generator', 'Reparatur', 'Reparaturgeschwindigkeit', 'reparieren',
  // ES
  'Generadores', 'Generador', 'reparación', 'velocidad de reparación', 'reparar',
  // JA
  '発電機', '修理', '修理速度',
];

export const HEALING_KEYWORDS: readonly string[] = [
  // EN
  'healing', 'heals', 'to heal', 'healed', 'self-heal', 'unhook', 'unhooking',
  'Med-Kit', 'Medkit', 'First Aid', 'Styptic', 'Serum', 'Bandage',
  // PL
  'Leczenie', 'leczyć', 'leczysz', 'ulecz', 'odczepienie', 'zdjęcie z haka', 'Apteczka', 'Apteczki',
  // DE
  'Heilung', 'heilen', 'heilt', 'aushaken', 'Sanitätskasten',
  // ES
  'Curación', 'curar', 'cura ', 'desenganchar', 'Botiquín',
  // JA
  '治療', '回復', 'フックから救出', '救急箱',
];

export const CHASE_KEYWORDS: readonly string[] = [
  // EN
  'Haste', 'Hindered', 'Pallets', 'Pallet', 'Windows', 'Window', 'Vault', 'Vaulting', 'fast-vault', 'medium-vault',
  'in chase', 'being chased', 'during a chase', 'chased by', 'starts chasing',
  // PL
  'Pośpiech', 'Pośpiechu', 'Spowolnienie', 'Palety', 'Paleta', 'Palet', 'Przeskok', 'Przeskakiwanie', 'podczas pościgu', 'w pościgu',
  // DE
  'Eile', 'Entorpecimiento', 'Paletten', 'Palette', 'Fenster', 'während einer Verfolgung', 'in einer Verfolgung',
  // ES
  'Celeridad', 'Entorpecimiento', 'Palés', 'Palé', 'Ventanas', 'Ventana', 'durante una persecución', 'en persecución',
  // JA
  '迅速', '妨害', 'パレット', '窓枠', 'チェイス中', 'チェイス',
];

export const STEALTH_KEYWORDS: readonly string[] = [
  // Status effects:
  'Undetectable', 'Niewykrywalność', 'Unentdeckbar', 'Indetectable', '探知不可',
  'Oblivious', 'Nieświadomość', 'Ahnungslos', 'Inconsciente', '忘却',
  // Specific Terror Radius suppression — active-voice ("reduces") and passive-voice ("is reduced")
  // (NOT raw "Terror Radius" which falsely matched Distressing/Starstruck):
  'reduces your Terror Radius', 'reduces Terror Radius', 'reduces the Terror Radius',
  'Terror Radius is reduced', 'Terror Radius wird reduziert',
  'suppresses your Terror Radius', 'suppress your Terror Radius',
  // PL
  'zmniejsza twój zasięg terroru', 'zmniejsza zasięg terroru', 'tłumi twój zasięg terroru',
  'Zasięg Terroru jest zmniejszony', 'zasięg terroru jest zmniejszony',
  // DE
  'verringert deinen Terrorradius',
  // ES
  'reduce tu radio de terror',
  // Audio & visual suppression:
  'Red Stain', 'Czerwoną Plamę', 'Czerwonej Plamy', 'Roten Schein', 'luz roja', '赤い光',
  'Grunts of Pain', 'Jęki bólu', 'Jęków bólu', 'Stöhnen vor Schmerz', 'Gemidos de dolor', 'うめき声',
  'Scratch Marks', 'Ślady zadrapań', 'Śladów zadrapań', 'Kratzspuren', 'Marcas de arañazos', '傷マーク',
  'silently', 'po cichu', 'geräuschlos', 'en silencio', '静かに',
];

export const OBSESSION_KEYWORDS: readonly string[] = [
  'Obsession', // EN
  'Obsesja', // PL
  'Besessenheit', // DE
  'Obsesión', // ES
  'オブセッション', // JA
];
