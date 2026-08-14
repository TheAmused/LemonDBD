import test from 'node:test';
import assert from 'node:assert';
import {
  matchVoiceQuery,
  getVariantsForMap,
  levenshteinDistance,
} from '../mapVoiceMatcher';
import type {
  MapSource,
  MatchResult,
} from '../mapVoiceMatcher';

// Sample mock maps list reflecting backend/data/maps.json
const mockMaps = [
  { id: 'hens_azarovs_resting_place', name: "Azarov's Resting Place", realm: 'Autohaven Wreckers', source: 'hens333' },
  { id: 'hens_blood_lodge', name: 'Blood Lodge', realm: 'Autohaven Wreckers', source: 'hens333' },
  { id: 'hens_preschool_i', name: 'Preschool I', realm: 'Badham', source: 'hens333' },
  { id: 'hens_preschool_ii', name: 'Preschool II', realm: 'Badham', source: 'hens333' },
  { id: 'hens_preschool_iii', name: 'Preschool III', realm: 'Badham', source: 'hens333' },
  { id: 'hens_preschool_iiiv', name: 'Preschool IIIV', realm: 'Badham', source: 'hens333' },
  { id: 'hens_preschool_v', name: 'Preschool V', realm: 'Badham', source: 'hens333' },
  { id: 'hens_police_station_east_wing', name: 'Police Station East Wing', realm: 'Raccoon City', source: 'hens333' },
  { id: 'hens_police_station_west_wing', name: 'Police Station West Wing', realm: 'Raccoon City', source: 'hens333' },
  { id: 'hens_coal_tower', name: 'Coal Tower', realm: 'MacMillan Estate', source: 'hens333' },
  { id: 'hens_coal_tower_ii', name: 'Coal Tower II', realm: 'MacMillan Estate', source: 'hens333' },
  { id: 'hens_dead_dawg_saloon', name: 'Dead Dawg Saloon', realm: 'Grave of Glennvale', source: 'hens333' },
  { id: 'hens_the_game', name: 'The Game', realm: 'Gideon Meat Plant', source: 'hens333' },
  { id: 'hens_lampkin_lane', name: 'Lampkin Lane', realm: 'Haddonfield', source: 'hens333' },
  { id: 'samoel_coal_tower', name: 'Coal Tower', realm: 'MacMillan Estate', source: 'samoelcolt' },
  { id: 'samoel_dead_dawg', name: 'Dead Dawg Saloon', realm: 'Grave of Glennvale', source: 'samoelcolt' },
];

test('levenshteinDistance calculates standard edit distances correctly', () => {
  assert.strictEqual(levenshteinDistance('kitten', 'sitting'), 3);
  assert.strictEqual(levenshteinDistance('flaw', 'lawn'), 2);
  assert.strictEqual(levenshteinDistance('rpd', 'rpd'), 0);
  assert.strictEqual(levenshteinDistance('', 'abc'), 3);
  assert.strictEqual(levenshteinDistance('abc', ''), 3);
  assert.strictEqual(levenshteinDistance('RPD', 'rpd'), 0); // Case insensitive
});

test('Exact match recognition for canonical map names', () => {
  const r1 = matchVoiceQuery("Azarov's Resting Place", 'all', mockMaps);
  assert.ok(r1);
  assert.strictEqual(r1.matchedMapName, "Azarov's Resting Place");
  assert.strictEqual(r1.matchedMapId, 'hens_azarovs_resting_place');
  assert.strictEqual(r1.action, 'navigate');
  assert.ok(r1.confidence >= 0.95);

  const r2 = matchVoiceQuery("Dead Dawg Saloon", 'all', mockMaps);
  assert.ok(r2);
  assert.strictEqual(r2.matchedMapName, 'Dead Dawg Saloon');
  assert.strictEqual(r2.action, 'navigate');

  const r3 = matchVoiceQuery("The Game", 'all', mockMaps);
  assert.ok(r3);
  assert.strictEqual(r3.matchedMapName, 'The Game');
});

test('Slang & community aliases resolution', () => {
  // FNAF
  const rFnaf = matchVoiceQuery("fnaf");
  assert.ok(rFnaf);
  assert.strictEqual(rFnaf.matchedMapName, "Freddy Fazbears Pizza");

  // Vecna / D&D
  const rVecna = matchVoiceQuery("vecna");
  assert.ok(rVecna);
  assert.strictEqual(rVecna.matchedMapName, "Forgotten Ruins");

  const rDnd = matchVoiceQuery("dnd ruins");
  assert.ok(rDnd);
  assert.strictEqual(rDnd.matchedMapName, "Forgotten Ruins");

  // Castlevania / Dracula / Castle
  const rDrac = matchVoiceQuery("castlevania");
  assert.ok(rDrac);
  assert.strictEqual(rDrac.matchedMapName, "Fallen Refuge");

  const rCastle = matchVoiceQuery("dracula castle");
  assert.ok(rCastle);
  assert.strictEqual(rCastle.matchedMapName, "Fallen Refuge");

  // Myers / Haddonfield
  const rMyers = matchVoiceQuery("myers map");
  assert.ok(rMyers);
  assert.strictEqual(rMyers.matchedMapName, "Lampkin Lane");

  const rHaddon = matchVoiceQuery("haddonfield");
  assert.ok(rHaddon);
  assert.strictEqual(rHaddon.matchedMapName, "Lampkin Lane");

  // Doctor / Lery's / Hospital
  const rLery = matchVoiceQuery("lerys");
  assert.ok(rLery);
  assert.strictEqual(rLery.matchedMapName, "Treatment Theatre");

  const rHosp = matchVoiceQuery("doctor hospital");
  assert.ok(rHosp);
  assert.strictEqual(rHosp.matchedMapName, "Treatment Theatre");

  // Saw / Gideon / Meat Plant
  const rGideon = matchVoiceQuery("gideon meat plant");
  assert.ok(rGideon);
  assert.strictEqual(rGideon.matchedMapName, "The Game");

  const rSaw = matchVoiceQuery("saw map");
  assert.ok(rSaw);
  assert.strictEqual(rSaw.matchedMapName, "The Game");

  // Clown / Chapel
  const rChapel = matchVoiceQuery("clown map");
  assert.ok(rChapel);
  assert.strictEqual(rChapel.matchedMapName, "Father Campbells Chapel");

  // Ormond / Ski Resort / Snow Map
  const rOrmond = matchVoiceQuery("ski resort");
  assert.ok(rOrmond);
  assert.strictEqual(rOrmond.matchedMapName, "Mount Ormond Resort");

  // Borgo / Knight
  const rBorgo = matchVoiceQuery("knight map");
  assert.ok(rBorgo);
  assert.strictEqual(rBorgo.matchedMapName, "Shattered Square");

  // Cowshed
  const rCow = matchVoiceQuery("cowshed");
  assert.ok(rCow);
  assert.strictEqual(rCow.matchedMapName, "Fractured Cowshed");
});

test('Explicit variant resolution', () => {
  // RPD East / West
  const rEast = matchVoiceQuery("rpd east");
  assert.ok(rEast);
  assert.strictEqual(rEast.matchedMapName, "Police Station East Wing");
  assert.strictEqual(rEast.isVariant, true);
  assert.deepStrictEqual(rEast.availableVariants, ['Police Station East Wing', 'Police Station West Wing']);

  const rWest = matchVoiceQuery("police station west wing");
  assert.ok(rWest);
  assert.strictEqual(rWest.matchedMapName, "Police Station West Wing");
  assert.strictEqual(rWest.isVariant, true);

  // Badham / Preschool 1-5
  const rBad1 = matchVoiceQuery("badham 1");
  assert.ok(rBad1);
  assert.strictEqual(rBad1.matchedMapName, "Preschool I");
  assert.strictEqual(rBad1.isVariant, true);

  const rBad3 = matchVoiceQuery("preschool 3");
  assert.ok(rBad3);
  assert.strictEqual(rBad3.matchedMapName, "Preschool III");
  assert.strictEqual(rBad3.isVariant, true);

  const rBad4 = matchVoiceQuery("badham 4");
  assert.ok(rBad4);
  assert.strictEqual(rBad4.matchedMapName, "Preschool IIIV");
  assert.strictEqual(rBad4.isVariant, true);

  const rBad5 = matchVoiceQuery("badham preschool 5");
  assert.ok(rBad5);
  assert.strictEqual(rBad5.matchedMapName, "Preschool V");
  assert.strictEqual(rBad5.isVariant, true);

  // Coal Tower 1 / 2
  const rCt1 = matchVoiceQuery("coal tower 1");
  assert.ok(rCt1);
  assert.strictEqual(rCt1.matchedMapName, "Coal Tower");
  assert.strictEqual(rCt1.isVariant, true);

  const rCt2 = matchVoiceQuery("coal tower 2");
  assert.ok(rCt2);
  assert.strictEqual(rCt2.matchedMapName, "Coal Tower II");
  assert.strictEqual(rCt2.isVariant, true);
});

test('Generic query disambiguation for multi-variant maps', () => {
  // Badham returns all 5 variants
  const rBadham = matchVoiceQuery("badham");
  assert.ok(rBadham);
  assert.strictEqual(rBadham.matchedMapName, "Preschool I");
  assert.deepStrictEqual(rBadham.availableVariants, [
    'Preschool I',
    'Preschool II',
    'Preschool III',
    'Preschool IIIV',
    'Preschool V'
  ]);

  const rPreschool = matchVoiceQuery("preschool");
  assert.ok(rPreschool);
  assert.strictEqual(rPreschool.matchedMapName, "Preschool I");
  assert.ok(rPreschool.availableVariants && rPreschool.availableVariants.length === 5);

  // RPD returns East and West
  const rRpd = matchVoiceQuery("rpd");
  assert.ok(rRpd);
  assert.strictEqual(rRpd.matchedMapName, "Police Station East Wing");
  assert.deepStrictEqual(rRpd.availableVariants, [
    'Police Station East Wing',
    'Police Station West Wing'
  ]);

  // getVariantsForMap helper test
  assert.deepStrictEqual(getVariantsForMap('Preschool III'), [
    'Preschool I',
    'Preschool II',
    'Preschool III',
    'Preschool IIIV',
    'Preschool V'
  ]);
  assert.deepStrictEqual(getVariantsForMap('Police Station West Wing'), [
    'Police Station East Wing',
    'Police Station West Wing'
  ]);
  assert.deepStrictEqual(getVariantsForMap('Coal Tower'), [
    'Coal Tower',
    'Coal Tower II'
  ]);
  assert.deepStrictEqual(getVariantsForMap('Dead Dawg Saloon'), []);
});

test('Provider source switching commands', () => {
  const rHens1 = matchVoiceQuery("switch to hens");
  assert.ok(rHens1);
  assert.strictEqual(rHens1.action, 'switch_source');
  assert.strictEqual(rHens1.actionPayload, 'hens333');

  const rHens2 = matchVoiceQuery("12 clock");
  assert.ok(rHens2);
  assert.strictEqual(rHens2.action, 'switch_source');
  assert.strictEqual(rHens2.actionPayload, 'hens333');

  const rSamoel1 = matchVoiceQuery("switch to samoel");
  assert.ok(rSamoel1);
  assert.strictEqual(rSamoel1.action, 'switch_source');
  assert.strictEqual(rSamoel1.actionPayload, 'samoelcolt');

  const rSamoel2 = matchVoiceQuery("isometric");
  assert.ok(rSamoel2);
  assert.strictEqual(rSamoel2.action, 'switch_source');
  assert.strictEqual(rSamoel2.actionPayload, 'samoelcolt');

  const rAll = matchVoiceQuery("all maps");
  assert.ok(rAll);
  assert.strictEqual(rAll.action, 'switch_source');
  assert.strictEqual(rAll.actionPayload, 'all');
});

test('Action navigation commands', () => {
  const rZoomIn = matchVoiceQuery("zoom in");
  assert.ok(rZoomIn);
  assert.strictEqual(rZoomIn.action, 'zoom_in');

  const rZoomOut = matchVoiceQuery("zoom out");
  assert.ok(rZoomOut);
  assert.strictEqual(rZoomOut.action, 'zoom_out');

  const rFull = matchVoiceQuery("fullscreen");
  assert.ok(rFull);
  assert.strictEqual(rFull.action, 'fullscreen');

  const rClose = matchVoiceQuery("close");
  assert.ok(rClose);
  assert.strictEqual(rClose.action, 'close');
});

test('Conversational filler words stripping', () => {
  const r1 = matchVoiceQuery("please open dead dawg saloon");
  assert.ok(r1);
  assert.strictEqual(r1.matchedMapName, "Dead Dawg Saloon");

  const r2 = matchVoiceQuery("can you show me haddonfield map please");
  assert.ok(r2);
  assert.strictEqual(r2.matchedMapName, "Lampkin Lane");

  const r3 = matchVoiceQuery("navigate to coal tower 2");
  assert.ok(r3);
  assert.strictEqual(r3.matchedMapName, "Coal Tower II");
});

test('Fuzzy matching on misrecognitions and typos', () => {
  const r1 = matchVoiceQuery("azarov resting");
  assert.ok(r1);
  assert.strictEqual(r1.matchedMapName, "Azarov's Resting Place");

  const r2 = matchVoiceQuery("rotton filds");
  assert.ok(r2);
  assert.strictEqual(r2.matchedMapName, "Rotten Fields");

  const r3 = matchVoiceQuery("eyre of crows");
  assert.ok(r3);
  assert.strictEqual(r3.matchedMapName, "Eyrie of Crows");

  // Total gibberish should return null
  const rGibberish = matchVoiceQuery("xyz123 random nonesense banana apple pear");
  assert.strictEqual(rGibberish, null);
});

test('Source-aware map ID resolution', () => {
  // If currentSource is samoelcolt, should prefer samoel map ID
  const rSamoel = matchVoiceQuery("coal tower", 'samoelcolt', mockMaps);
  assert.ok(rSamoel);
  assert.strictEqual(rSamoel.matchedMapId, 'samoel_coal_tower');
  assert.strictEqual(rSamoel.source, 'samoelcolt');

  // If currentSource is hens333, should prefer hens map ID
  const rHens = matchVoiceQuery("coal tower", 'hens333', mockMaps);
  assert.ok(rHens);
  assert.strictEqual(rHens.matchedMapId, 'hens_coal_tower');
  assert.strictEqual(rHens.source, 'hens333');
});

test('Additional variant groups and generic mappings', () => {
  // Groaning storehouse
  const rGs2 = matchVoiceQuery("groaning storehouse 2");
  assert.ok(rGs2);
  assert.strictEqual(rGs2.matchedMapName, "Groaning Storehouse II");
  assert.strictEqual(rGs2.isVariant, true);

  const rGsGen = matchVoiceQuery("groaning storehouse");
  assert.ok(rGsGen);
  assert.strictEqual(rGsGen.matchedMapName, "Groaning Storehouse");
  assert.deepStrictEqual(rGsGen.availableVariants, ['Groaning Storehouse', 'Groaning Storehouse II']);

  // Ironworks
  const rIw2 = matchVoiceQuery("ironworks 2");
  assert.ok(rIw2);
  assert.strictEqual(rIw2.matchedMapName, "Ironworks Of Misery II");
  assert.strictEqual(rIw2.isVariant, true);

  const rIwGen = matchVoiceQuery("ironworks");
  assert.ok(rIwGen);
  assert.strictEqual(rIwGen.matchedMapName, "Ironworks Of Misery");
  assert.deepStrictEqual(rIwGen.availableVariants, ['Ironworks Of Misery', 'Ironworks Of Misery II']);

  // Shelter woods
  const rSw2 = matchVoiceQuery("shelter woods 2");
  assert.ok(rSw2);
  assert.strictEqual(rSw2.matchedMapName, "Shelter Woods II");
  assert.strictEqual(rSw2.isVariant, true);

  // Suffocation pit
  const rSp2 = matchVoiceQuery("suffocation pit 2");
  assert.ok(rSp2);
  assert.strictEqual(rSp2.matchedMapName, "Suffocation Pit II");
  assert.strictEqual(rSp2.isVariant, true);

  // Family residence
  const rFr2 = matchVoiceQuery("family residence 2");
  assert.ok(rFr2);
  assert.strictEqual(rFr2.matchedMapName, "Family Residence II");
  assert.strictEqual(rFr2.isVariant, true);

  // Sanctum of wrath
  const rSoW2 = matchVoiceQuery("sanctum of wrath 2");
  assert.ok(rSoW2);
  assert.strictEqual(rSoW2.matchedMapName, "Sanctum of Wrath II");
  assert.strictEqual(rSoW2.isVariant, true);
});

test('Edge cases and empty/invalid input handling', () => {
  assert.strictEqual(matchVoiceQuery(""), null);
  assert.strictEqual(matchVoiceQuery("   "), null);
  assert.strictEqual(matchVoiceQuery("???!!!..."), null);
  // @ts-expect-error test invalid type handling
  assert.strictEqual(matchVoiceQuery(null), null);
  // @ts-expect-error test invalid type handling
  assert.strictEqual(matchVoiceQuery(undefined), null);

  assert.deepStrictEqual(getVariantsForMap(""), []);
  assert.deepStrictEqual(getVariantsForMap("Unknown Map Name 999"), []);
  assert.deepStrictEqual(getVariantsForMap("The Game"), []);
  assert.deepStrictEqual(getVariantsForMap("Freddy Fazbears Pizza"), []);
});

test('Exact action matching does not intercept substring phrases (e.g. backwater swamp)', () => {
  const rSwamp = matchVoiceQuery("backwater swamp");
  assert.ok(rSwamp);
  assert.strictEqual(rSwamp.action, 'navigate');
  assert.strictEqual(rSwamp.matchedMapName, "Grim Pantry");
  assert.notStrictEqual(rSwamp.action, 'close');
});

test('Source-prefixed map queries route to appropriate source provider', () => {
  // "hens blood lodge"
  const rHens = matchVoiceQuery("hens blood lodge", 'all', mockMaps);
  assert.ok(rHens);
  assert.strictEqual(rHens.matchedMapName, "Blood Lodge");
  assert.strictEqual(rHens.source, 'hens333');
  assert.strictEqual(rHens.matchedMapId, 'hens_blood_lodge');
  assert.strictEqual(rHens.action, 'navigate');

  // "samoel dead dawg"
  const rSamoel = matchVoiceQuery("samoel dead dawg", 'all', mockMaps);
  assert.ok(rSamoel);
  assert.strictEqual(rSamoel.matchedMapName, "Dead Dawg Saloon");
  assert.strictEqual(rSamoel.source, 'samoelcolt');
  assert.strictEqual(rSamoel.matchedMapId, 'samoel_dead_dawg');
  assert.strictEqual(rSamoel.action, 'navigate');
});

test('Unicode NFD accents resolution (e.g. Léry\'s)', () => {
  const rLeryAccented = matchVoiceQuery("Léry's Memorial Institute");
  assert.ok(rLeryAccented);
  assert.strictEqual(rLeryAccented.matchedMapName, "Treatment Theatre");

  const rLeryShort = matchVoiceQuery("Léry's");
  assert.ok(rLeryShort);
  assert.strictEqual(rLeryShort.matchedMapName, "Treatment Theatre");

  // Accent-insensitive Levenshtein distance
  assert.strictEqual(levenshteinDistance("Léry", "Lery"), 0);
  assert.strictEqual(levenshteinDistance("café", "cafe"), 0);
});

