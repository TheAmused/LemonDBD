// frontend/src/__tests__/unit/mapVoiceMatcherPolish.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  matchVoiceQuery,
} from '@/utils/mapVoiceMatcher';

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
