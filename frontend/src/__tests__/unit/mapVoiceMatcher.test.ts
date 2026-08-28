// frontend/src/__tests__/unit/mapVoiceMatcher.test.ts
// frontend/src/utils/__tests__/mapVoiceMatcher.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  matchVoiceQuery,
  getVariantsForMap,
  levenshteinDistance,
} from '@/utils/mapVoiceMatcher';
import type {
  MapSource,
  MatchResult,
} from '@/utils/mapVoiceMatcher';

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

test('Polish phonetic accent voice recognition', () => {
  // "rpd ist" -> Police Station East Wing
  const rRpdIst = matchVoiceQuery("rpd ist");
  assert.ok(rRpdIst);
  assert.strictEqual(rRpdIst.matchedMapName, "Police Station East Wing");
  assert.strictEqual(rRpdIst.isVariant, true);

  // "ded dog" -> Dead Dawg Saloon
  const rDedDog = matchVoiceQuery("ded dog");
  assert.ok(rDedDog);
  assert.strictEqual(rDedDog.matchedMapName, "Dead Dawg Saloon");

  const rDedDogSalun = matchVoiceQuery("ded dog salun");
  assert.ok(rDedDogSalun);
  assert.strictEqual(rDedDogSalun.matchedMapName, "Dead Dawg Saloon");

  // "bedhem 3" -> Preschool III
  const rBedhem3 = matchVoiceQuery("bedhem 3");
  assert.ok(rBedhem3);
  assert.strictEqual(rBedhem3.matchedMapName, "Preschool III");
  assert.strictEqual(rBedhem3.isVariant, true);

  // "fader campbell" -> Father Campbells Chapel
  const rFader = matchVoiceQuery("fader campbell");
  assert.ok(rFader);
  assert.strictEqual(rFader.matchedMapName, "Father Campbells Chapel");

  // "kauszed" -> Fractured Cowshed
  const rKauszed = matchVoiceQuery("kauszed");
  assert.ok(rKauszed);
  assert.strictEqual(rKauszed.matchedMapName, "Fractured Cowshed");

  // "kol tauer 2" -> Coal Tower II
  const rKolTauer2 = matchVoiceQuery("kol tauer 2");
  assert.ok(rKolTauer2);
  assert.strictEqual(rKolTauer2.matchedMapName, "Coal Tower II");
  assert.strictEqual(rKolTauer2.isVariant, true);

  // "ajronlorks 1" -> Ironworks Of Misery
  const rAjron1 = matchVoiceQuery("ajronlorks 1");
  assert.ok(rAjron1);
  assert.strictEqual(rAjron1.matchedMapName, "Ironworks Of Misery");
  assert.strictEqual(rAjron1.isVariant, true);

  // Additional Polish phonetic accents
  const rTompson = matchVoiceQuery("tompson haus");
  assert.ok(rTompson);
  assert.strictEqual(rTompson.matchedMapName, "The Thompson House");

  const rSafok = matchVoiceQuery("safokejszyn");
  assert.ok(rSafok);
  assert.strictEqual(rSafok.matchedMapName, "Suffocation Pit");

  const rGroning = matchVoiceQuery("groning storhaus");
  assert.ok(rGroning);
  assert.strictEqual(rGroning.matchedMapName, "Groaning Storehouse");

  const rSzelter = matchVoiceQuery("szelter wuds");
  assert.ok(rSzelter);
  assert.strictEqual(rSzelter.matchedMapName, "Shelter Woods");

  const rMaders = matchVoiceQuery("maders dweling");
  assert.ok(rMaders);
  assert.strictEqual(rMaders.matchedMapName, "Mother's Dwelling");

  const rTempl = matchVoiceQuery("templ of purgeszyn");
  assert.ok(rTempl);
  assert.strictEqual(rTempl.matchedMapName, "Temple of Purgation");

  const rPejl = matchVoiceQuery("pejl rouz");
  assert.ok(rPejl);
  assert.strictEqual(rPejl.matchedMapName, "The Pale Rose");

  const rDeGejm = matchVoiceQuery("de gejm");
  assert.ok(rDeGejm);
  assert.strictEqual(rDeGejm.matchedMapName, "The Game");

  const rLampkin = matchVoiceQuery("lampkin lejn");
  assert.ok(rLampkin);
  assert.strictEqual(rLampkin.matchedMapName, "Lampkin Lane");

  const rMidlicz = matchVoiceQuery("midlicz");
  assert.ok(rMidlicz);
  assert.strictEqual(rMidlicz.matchedMapName, "Midwich Elementary School");

  const rTritment = matchVoiceQuery("tritment tiater");
  assert.ok(rTritment);
  assert.strictEqual(rTritment.matchedMapName, "Treatment Theatre");

  const rGrinvil = matchVoiceQuery("grinvil");
  assert.ok(rGrinvil);
  assert.strictEqual(rGrinvil.matchedMapName, "Greenville Square");

  const rRuins = matchVoiceQuery("forgoten ruins");
  assert.ok(rRuins);
  assert.strictEqual(rRuins.matchedMapName, "Forgotten Ruins");

  const rRefjudz = matchVoiceQuery("folen refjudz");
  assert.ok(rRefjudz);
  assert.strictEqual(rRefjudz.matchedMapName, "Fallen Refuge");

  const rFrediFnaf = matchVoiceQuery("fredi fnaf");
  assert.ok(rFrediFnaf);
  assert.strictEqual(rFrediFnaf.matchedMapName, "Freddy Fazbears Pizza");
});

test('Polish localized map names and disambiguation triggers', () => {
  // "posterunek wschod" -> Police Station East Wing
  const rRpdEast = matchVoiceQuery("posterunek wschod");
  assert.ok(rRpdEast);
  assert.strictEqual(rRpdEast.matchedMapName, "Police Station East Wing");
  assert.strictEqual(rRpdEast.isVariant, true);

  // "posterunek zachod" -> Police Station West Wing
  const rRpdWest = matchVoiceQuery("posterunek zachod");
  assert.ok(rRpdWest);
  assert.strictEqual(rRpdWest.matchedMapName, "Police Station West Wing");
  assert.strictEqual(rRpdWest.isVariant, true);

  // "przedszkole 2" -> Preschool II
  const rPrzedszkole2 = matchVoiceQuery("przedszkole 2");
  assert.ok(rPrzedszkole2);
  assert.strictEqual(rPrzedszkole2.matchedMapName, "Preschool II");
  assert.strictEqual(rPrzedszkole2.isVariant, true);

  // "badham trzy" -> Preschool III
  const rBadhamTrzy = matchVoiceQuery("badham trzy");
  assert.ok(rBadhamTrzy);
  assert.strictEqual(rBadhamTrzy.matchedMapName, "Preschool III");
  assert.strictEqual(rBadhamTrzy.isVariant, true);

  // "chata matki" / "dom matki" -> Mother's Dwelling
  const rChataMatki = matchVoiceQuery("chata matki");
  assert.ok(rChataMatki);
  assert.strictEqual(rChataMatki.matchedMapName, "Mother's Dwelling");

  const rDomMatki = matchVoiceQuery("dom matki");
  assert.ok(rDomMatki);
  assert.strictEqual(rDomMatki.matchedMapName, "Mother's Dwelling");

  // "szpital psychiatryczny" -> Disturbed Ward
  const rSzpital = matchVoiceQuery("szpital psychiatryczny");
  assert.ok(rSzpital);
  assert.strictEqual(rSzpital.matchedMapName, "Disturbed Ward");

  // "kukurydza" -> Rotten Fields
  const rKukurydza = matchVoiceQuery("kukurydza");
  assert.ok(rKukurydza);
  assert.strictEqual(rKukurydza.matchedMapName, "Rotten Fields");

  // "wieza weglowa 1" & "wieza weglowa 2"
  const rWieza1 = matchVoiceQuery("wieza weglowa 1");
  assert.ok(rWieza1);
  assert.strictEqual(rWieza1.matchedMapName, "Coal Tower");
  assert.strictEqual(rWieza1.isVariant, true);

  const rWieza2 = matchVoiceQuery("wieza weglowa 2");
  assert.ok(rWieza2);
  assert.strictEqual(rWieza2.matchedMapName, "Coal Tower II");
  assert.strictEqual(rWieza2.isVariant, true);

  const rKolDwa = matchVoiceQuery("kol tauer dwa");
  assert.ok(rKolDwa);
  assert.strictEqual(rKolDwa.matchedMapName, "Coal Tower II");
  assert.strictEqual(rKolDwa.isVariant, true);

  // "obora" -> Fractured Cowshed
  const rObora = matchVoiceQuery("obora");
  assert.ok(rObora);
  assert.strictEqual(rObora.matchedMapName, "Fractured Cowshed");

  // "rzeznia" -> Rancid Abbatoir
  const rRzeznia = matchVoiceQuery("rzeznia");
  assert.ok(rRzeznia);
  assert.strictEqual(rRzeznia.matchedMapName, "Rancid Abbatoir");

  // "kaplica" -> Father Campbells Chapel
  const rKaplica = matchVoiceQuery("kaplica");
  assert.ok(rKaplica);
  assert.strictEqual(rKaplica.matchedMapName, "Father Campbells Chapel");

  // "posiadlosc yamaoka" -> Family Residence
  const rYamaoka = matchVoiceQuery("posiadlosc yamaoka");
  assert.ok(rYamaoka);
  assert.strictEqual(rYamaoka.matchedMapName, "Family Residence");

  // "huta cierpienia" -> Ironworks Of Misery
  const rHuta = matchVoiceQuery("huta cierpienia");
  assert.ok(rHuta);
  assert.strictEqual(rHuta.matchedMapName, "Ironworks Of Misery");

  // "swiatynia" -> Temple of Purgation
  const rSwiatynia = matchVoiceQuery("swiatynia");
  assert.ok(rSwiatynia);
  assert.strictEqual(rSwiatynia.matchedMapName, "Temple of Purgation");

  // "ogrod radosci" -> Garden of Joy
  const rOgrod = matchVoiceQuery("ogrod radosci");
  assert.ok(rOgrod);
  assert.strictEqual(rOgrod.matchedMapName, "Garden of Joy");

  // "kino" -> Greenville Square
  const rKino = matchVoiceQuery("kino");
  assert.ok(rKino);
  assert.strictEqual(rKino.matchedMapName, "Greenville Square");

  // "ruiny vecna" -> Forgotten Ruins
  const rRuinyVecna = matchVoiceQuery("ruiny vecna");
  assert.ok(rRuinyVecna);
  assert.strictEqual(rRuinyVecna.matchedMapName, "Forgotten Ruins");

  // "zamek dracula" -> Fallen Refuge
  const rZamekDrac = matchVoiceQuery("zamek dracula");
  assert.ok(rZamekDrac);
  assert.strictEqual(rZamekDrac.matchedMapName, "Fallen Refuge");

  // "ormond dwa" -> Mount Ormond Resort II
  const rOrmondDwa = matchVoiceQuery("ormond dwa");
  assert.ok(rOrmondDwa);
  assert.strictEqual(rOrmondDwa.matchedMapName, "Mount Ormond Resort II");
  assert.strictEqual(rOrmondDwa.isVariant, true);
});

test('Polish provider source switching commands', () => {
  // Hens333 switching
  const rHens1 = matchVoiceQuery("zmien na hensa");
  assert.ok(rHens1);
  assert.strictEqual(rHens1.action, 'switch_source');
  assert.strictEqual(rHens1.actionPayload, 'hens333');

  const rHens2 = matchVoiceQuery("wlacz hensa");
  assert.ok(rHens2);
  assert.strictEqual(rHens2.action, 'switch_source');
  assert.strictEqual(rHens2.actionPayload, 'hens333');

  const rHens3 = matchVoiceQuery("mapy hensa");
  assert.ok(rHens3);
  assert.strictEqual(rHens3.action, 'switch_source');
  assert.strictEqual(rHens3.actionPayload, 'hens333');

  const rHens4 = matchVoiceQuery("system zegarowy");
  assert.ok(rHens4);
  assert.strictEqual(rHens4.action, 'switch_source');
  assert.strictEqual(rHens4.actionPayload, 'hens333');

  // Polish diacritics
  const rHensDiacritics = matchVoiceQuery("włącz hensa");
  assert.ok(rHensDiacritics);
  assert.strictEqual(rHensDiacritics.action, 'switch_source');
  assert.strictEqual(rHensDiacritics.actionPayload, 'hens333');

  // SamoelColt switching
  const rSamoel1 = matchVoiceQuery("zmien na samoela");
  assert.ok(rSamoel1);
  assert.strictEqual(rSamoel1.action, 'switch_source');
  assert.strictEqual(rSamoel1.actionPayload, 'samoelcolt');

  const rSamoel2 = matchVoiceQuery("wlacz samoela");
  assert.ok(rSamoel2);
  assert.strictEqual(rSamoel2.action, 'switch_source');
  assert.strictEqual(rSamoel2.actionPayload, 'samoelcolt');

  const rSamoel3 = matchVoiceQuery("mapy samoela");
  assert.ok(rSamoel3);
  assert.strictEqual(rSamoel3.action, 'switch_source');
  assert.strictEqual(rSamoel3.actionPayload, 'samoelcolt');

  const rSamoel4 = matchVoiceQuery("rzut izometryczny");
  assert.ok(rSamoel4);
  assert.strictEqual(rSamoel4.action, 'switch_source');
  assert.strictEqual(rSamoel4.actionPayload, 'samoelcolt');

  const rSamoel5 = matchVoiceQuery("izometria");
  assert.ok(rSamoel5);
  assert.strictEqual(rSamoel5.action, 'switch_source');
  assert.strictEqual(rSamoel5.actionPayload, 'samoelcolt');

  // All maps switching
  const rAll1 = matchVoiceQuery("wszystkie mapy");
  assert.ok(rAll1);
  assert.strictEqual(rAll1.action, 'switch_source');
  assert.strictEqual(rAll1.actionPayload, 'all');

  const rAll2 = matchVoiceQuery("pokaz wszystko");
  assert.ok(rAll2);
  assert.strictEqual(rAll2.action, 'switch_source');
  assert.strictEqual(rAll2.actionPayload, 'all');

  const rAll3 = matchVoiceQuery("wszystkie zrodla");
  assert.ok(rAll3);
  assert.strictEqual(rAll3.action, 'switch_source');
  assert.strictEqual(rAll3.actionPayload, 'all');

  const rAllDiacritics = matchVoiceQuery("pokaż wszystko");
  assert.ok(rAllDiacritics);
  assert.strictEqual(rAllDiacritics.action, 'switch_source');
  assert.strictEqual(rAllDiacritics.actionPayload, 'all');
});

test('Polish action navigation commands', () => {
  // Zoom in
  const rZoomIn1 = matchVoiceQuery("przybliz");
  assert.ok(rZoomIn1);
  assert.strictEqual(rZoomIn1.action, 'zoom_in');

  const rZoomIn2 = matchVoiceQuery("powieksz");
  assert.ok(rZoomIn2);
  assert.strictEqual(rZoomIn2.action, 'zoom_in');

  const rZoomInDiacritics = matchVoiceQuery("przybliż");
  assert.ok(rZoomInDiacritics);
  assert.strictEqual(rZoomInDiacritics.action, 'zoom_in');

  // Zoom out
  const rZoomOut1 = matchVoiceQuery("oddal");
  assert.ok(rZoomOut1);
  assert.strictEqual(rZoomOut1.action, 'zoom_out');

  const rZoomOut2 = matchVoiceQuery("pomniejsz");
  assert.ok(rZoomOut2);
  assert.strictEqual(rZoomOut2.action, 'zoom_out');

  // Fullscreen
  const rFull1 = matchVoiceQuery("pelny ekran");
  assert.ok(rFull1);
  assert.strictEqual(rFull1.action, 'fullscreen');

  const rFull2 = matchVoiceQuery("otworz silnik");
  assert.ok(rFull2);
  assert.strictEqual(rFull2.action, 'fullscreen');

  const rFull3 = matchVoiceQuery("silnik 2d");
  assert.ok(rFull3);
  assert.strictEqual(rFull3.action, 'fullscreen');

  const rFullDiacritics = matchVoiceQuery("pełny ekran");
  assert.ok(rFullDiacritics);
  assert.strictEqual(rFullDiacritics.action, 'fullscreen');

  // Close
  const rClose = matchVoiceQuery("zamknij");
  assert.ok(rClose);
  assert.strictEqual(rClose.action, 'close');

  // Conversational action commands
  const rFullPlease = matchVoiceQuery("fullscreen please");
  assert.ok(rFullPlease);
  assert.strictEqual(rFullPlease.action, 'fullscreen');

  const rZamknijProsze = matchVoiceQuery("zamknij prosze");
  assert.ok(rZamknijProsze);
  assert.strictEqual(rZamknijProsze.action, 'close');

  const rProszePrzybliz = matchVoiceQuery("prosze przybliz");
  assert.ok(rProszePrzybliz);
  assert.strictEqual(rProszePrzybliz.action, 'zoom_in');

  const rSwitchHensPlease = matchVoiceQuery("switch to hens please");
  assert.ok(rSwitchHensPlease);
  assert.strictEqual(rSwitchHensPlease.action, 'switch_source');
  assert.strictEqual(rSwitchHensPlease.actionPayload, 'hens333');
});

test('Ormond Lake Mine does not return mount_ormond resort variants', () => {
  assert.deepStrictEqual(getVariantsForMap('Ormond Lake Mine'), []);
  assert.deepStrictEqual(getVariantsForMap('ormond kopalnia'), []);
  assert.deepStrictEqual(getVariantsForMap('lake mine'), []);
});



