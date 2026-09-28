// frontend/src/constants/perkTraitKeywords.ts
//
// ⚠️  NO LONGER USED — kept for historical reference only.
//
// perk.perk_type is now the single source of truth for all classification
// (Chaos Mutator weighting AND Tarot Deck archetype assignment). The backend
// seed file (backend/app/seeds/data/content/perks.json) classifies every
// perk into exactly one of the 11 tarot archetypes:
//
//   hex | boon | sacrifice | exhaustion | obsession
//   aura | generator | healing | chase | stealth | entity
//
// The keyword arrays below were the old fallback logic used when perk_type
// was too coarse to distinguish Tarot types. They are intentionally NOT
// exported so importing them causes a compile error rather than silently
// re-introducing the dual-classification problem.
//
// If you need to re-classify perks, update backend/app/seeds/data/content/perks.json
// and run the backend seeder.
