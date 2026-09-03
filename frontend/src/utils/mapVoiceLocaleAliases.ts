// frontend/src/utils/mapVoiceLocaleAliases.ts
/**
 * mapVoiceLocaleAliases.ts
 *
 * German, Spanish and Japanese voice aliases for every canonical Dead by Daylight
 * map, plus the localized navigation / provider-switch vocabulary and the filler
 * words each locale's recognizer tends to prepend.
 *
 * Why this file exists separately from mapVoiceMatcher.ts
 * ------------------------------------------------------
 * mapVoiceMatcher.ts already carries the English and Polish vocabulary inline and
 * is 1.8k lines. Rather than grow it by another 60%, the three added locales live
 * here and are merged into the matcher's dictionary at module load. That keeps the
 * matching *logic* reviewable and makes the per-locale vocabulary a pure data
 * artefact that a native speaker can audit without reading any code.
 *
 * What belongs in here
 * --------------------
 *  - The name a player of that locale would actually say. For most maps that is a
 *    translation of the English name ("Kohleturm", "torre de carbon", "石炭塔"),
 *    because that is what the locale's community calls it.
 *  - Katakana transliterations for Japanese, since Dead by Daylight's Japanese
 *    build renders most map names in katakana and ja-JP recognizers emit kana.
 *  - Nothing phonetic. Accent spellings ("kohl tauer", or a rolled-r "torre de
 *    carbon") are handled generatively by utils/voicePhonetics.ts - writing them
 *    out by hand is exactly the failure mode this refactor removes.
 */

export type AliasLocale = 'de' | 'es' | 'ja';

export type LocalizedAliases = Partial<Record<AliasLocale, string[]>>;

/** Keyed by the canonical map name used in mapVoiceMatcher.CANONICAL_MAPS. */
export const LOCALE_MAP_ALIASES: Record<string, LocalizedAliases> = {
  // ── Autohaven Wreckers ──────────────────────────────────────────────────────
  "Azarov's Resting Place": {
    de: ['azarovs ruhestatte', 'azarovs ruhestätte', 'ruhestatte von azarov', 'azarov ruheplatz'],
    es: ['lugar de descanso de azarov', 'descanso de azarov', 'morada de azarov', 'cementerio de azarov'],
    ja: ['アザロフの安息所', 'アザロフ', '安息所'],
  },
  'Blood Lodge': {
    de: ['bluthutte', 'bluthütte', 'blutlodge', 'blutige hutte', 'blutige hütte'],
    es: ['cabana sangrienta', 'cabaña sangrienta', 'cabana de sangre', 'cabaña de sangre', 'refugio sangriento'],
    ja: ['ブラッドロッジ', '血の山小屋', '血のロッジ'],
  },
  'Gas Heaven': {
    de: ['tankstelle', 'benzinhimmel', 'gas himmel', 'autohaven tankstelle', 'zapfsaule'],
    es: ['gasolinera', 'paraiso del gas', 'paraíso del gas', 'estacion de servicio', 'estación de servicio', 'bencinera'],
    ja: ['ガスヘブン', 'ガスヘヴン', 'ガソリンスタンド', '給油所'],
  },
  "Wreckers' Yard": {
    de: ['schrottplatz', 'autofriedhof', 'schrotthof', 'wrackhof'],
    es: ['desguace', 'chatarreria', 'chatarrería', 'patio de desguace', 'deposito de chatarra'],
    ja: ['レッカーズヤード', '廃車置き場', 'スクラップ置き場', '解体場'],
  },
  'Wretched Shop': {
    de: ['werkstatt', 'elende werkstatt', 'autowerkstatt', 'schrottwerkstatt'],
    es: ['taller', 'taller miserable', 'taller mecanico', 'taller mecánico', 'garaje'],
    ja: ['レッチドショップ', '修理工場', '整備工場', 'ガレージ'],
  },

  // ── Badham Preschool ───────────────────────────────────────────────────────
  'Preschool I': {
    de: ['vorschule 1', 'vorschule eins', 'badham eins', 'badham vorschule 1', 'kindergarten 1', 'kindergarten eins'],
    es: ['preescolar 1', 'preescolar uno', 'badham uno', 'guarderia 1', 'guardería 1', 'jardin de infancia 1'],
    ja: ['バダム1', 'バダム幼稚園1', '幼稚園1', 'プリスクール1'],
  },
  'Preschool II': {
    de: ['vorschule 2', 'vorschule zwei', 'badham zwei', 'badham vorschule 2', 'kindergarten 2', 'kindergarten zwei'],
    es: ['preescolar 2', 'preescolar dos', 'badham dos', 'guarderia 2', 'guardería 2', 'jardin de infancia 2'],
    ja: ['バダム2', 'バダム幼稚園2', '幼稚園2', 'プリスクール2'],
  },
  'Preschool III': {
    de: ['vorschule 3', 'vorschule drei', 'badham drei', 'badham vorschule 3', 'kindergarten 3', 'kindergarten drei'],
    es: ['preescolar 3', 'preescolar tres', 'badham tres', 'guarderia 3', 'guardería 3', 'jardin de infancia 3'],
    ja: ['バダム3', 'バダム幼稚園3', '幼稚園3', 'プリスクール3'],
  },
  'Preschool IIIV': {
    de: ['vorschule 4', 'vorschule vier', 'badham vier', 'badham vorschule 4', 'kindergarten 4', 'kindergarten vier'],
    es: ['preescolar 4', 'preescolar cuatro', 'badham cuatro', 'guarderia 4', 'guardería 4', 'jardin de infancia 4'],
    ja: ['バダム4', 'バダム幼稚園4', '幼稚園4', 'プリスクール4'],
  },
  'Preschool V': {
    de: ['vorschule 5', 'vorschule funf', 'vorschule fünf', 'badham funf', 'badham fünf', 'kindergarten 5'],
    es: ['preescolar 5', 'preescolar cinco', 'badham cinco', 'guarderia 5', 'guardería 5', 'jardin de infancia 5'],
    ja: ['バダム5', 'バダム幼稚園5', '幼稚園5', 'プリスクール5'],
  },

  // ── Coldwind Farm ──────────────────────────────────────────────────────────
  'Fractured Cowshed': {
    de: ['kuhstall', 'zerbrochener kuhstall', 'gebrochener kuhstall', 'kuhstall coldwind'],
    es: ['establo', 'establo fracturado', 'establo roto', 'vaqueria', 'vaquería', 'establo de vacas'],
    ja: ['カウシェッド', '牛舎', '壊れた牛舎'],
  },
  'Rancid Abbatoir': {
    de: ['schlachthaus', 'schlachthof', 'ranziger schlachthof', 'metzgerei coldwind'],
    es: ['matadero', 'matadero rancio', 'carniceria', 'carnicería', 'sala de despiece'],
    ja: ['ランシッドアバトワール', '屠殺場', '食肉処理場'],
  },
  'Rotten Fields': {
    de: ['verfaulte felder', 'faule felder', 'maisfeld', 'kornfeld', 'maisfelder'],
    es: ['campos podridos', 'campos putridos', 'campos pútridos', 'maizal', 'campo de maiz', 'campo de maíz'],
    ja: ['ロットンフィールド', '腐った畑', 'トウモロコシ畑', 'コーン畑'],
  },
  'The Thompson House': {
    de: ['thompson haus', 'das thompson haus', 'haus der thompsons', 'bauernhaus', 'farmhaus'],
    es: ['casa thompson', 'la casa thompson', 'casa de los thompson', 'granja', 'casa de la granja'],
    ja: ['トンプソンハウス', 'トンプソン邸', '農家'],
  },
  'Torment Creek': {
    de: ['qualbach', 'bach der qualen', 'silo', 'getreidesilo', 'coldwind silo'],
    es: ['arroyo del tormento', 'arroyo tormento', 'silo', 'granero silo'],
    ja: ['トーメントクリーク', '苦悶の小川', 'サイロ', '穀物サイロ'],
  },

  // ── Crotus Prenn Asylum ────────────────────────────────────────────────────
  'Disturbed Ward': {
    de: ['gestorte station', 'gestörte station', 'anstalt', 'irrenanstalt', 'psychiatrie', 'nervenheilanstalt'],
    es: ['pabellon perturbado', 'pabellón perturbado', 'manicomio', 'psiquiatrico', 'psiquiátrico', 'asilo'],
    ja: ['ディスターブドワード', '精神病棟', '病棟', '精神病院', 'アサイラム'],
  },
  'Father Campbells Chapel': {
    de: ['kapelle', 'vater campbells kapelle', 'pater campbells kapelle', 'kirche'],
    es: ['capilla', 'capilla del padre campbell', 'iglesia', 'capilla campbell'],
    ja: ['チャペル', '教会', 'キャンベル神父の礼拝堂', '礼拝堂'],
  },

  // ── Decimated Borgo ────────────────────────────────────────────────────────
  'Shattered Square': {
    de: ['zerschmetterter platz', 'zerbrochener platz', 'borgo', 'dorfplatz', 'der ritter'],
    es: ['plaza destrozada', 'plaza rota', 'borgo', 'plaza del pueblo', 'el caballero'],
    ja: ['シャッタードスクエア', '砕けた広場', 'ボルゴ', 'ナイト'],
  },
  'Forgotten Ruins': {
    de: ['vergessene ruinen', 'ruinen', 'verlies', 'dungeons and dragons map'],
    es: ['ruinas olvidadas', 'ruinas', 'mapa de vecna', 'mazmorra', 'calabozo'],
    ja: ['フォーゴットンルインズ', '忘れられた遺跡', '遺跡', 'ヴェクナ'],
  },

  // ── Forsaken Boneyard ──────────────────────────────────────────────────────
  'Eyrie of Crows': {
    de: ['krahenhorst', 'krähenhorst', 'horst der krahen', 'krahen', 'krähen'],
    es: ['nido de cuervos', 'aguilera de cuervos', 'cuervos', 'mapa de la artista'],
    ja: ['アイリーオブクロウズ', '烏の巣', 'カラスの巣', 'アーティスト'],
  },
  'Dead Sands': {
    de: ['tote sande', 'toter sand', 'wuste', 'wüste', 'sandwuste', 'sandwüste'],
    es: ['arenas muertas', 'arena muerta', 'desierto', 'dunas'],
    ja: ['デッドサンズ', '死の砂', '砂漠', '荒野'],
  },

  // ── Hawkins ────────────────────────────────────────────────────────────────
  'The Underground Complex': {
    de: ['untergrundkomplex', 'unterirdischer komplex', 'hawkins labor', 'labor', 'hawkins'],
    es: ['complejo subterraneo', 'complejo subterráneo', 'laboratorio hawkins', 'laboratorio', 'hawkins'],
    ja: ['アンダーグラウンドコンプレックス', '地下施設', 'ホーキンス研究所', 'ホーキンス', '研究所'],
  },

  // ── MacMillan Estate ───────────────────────────────────────────────────────
  'Coal Tower': {
    de: ['kohleturm', 'kohleturm 1', 'kohleturm eins', 'kohlenturm', 'macmillan turm'],
    es: ['torre de carbon', 'torre de carbón', 'torre de carbon 1', 'torre de carbon uno', 'torre carbonera'],
    ja: ['コールタワー', '石炭塔', 'コールタワー1', '石炭の塔'],
  },
  'Coal Tower II': {
    de: ['kohleturm 2', 'kohleturm zwei', 'kohlenturm 2', 'zweiter kohleturm'],
    es: ['torre de carbon 2', 'torre de carbón 2', 'torre de carbon dos', 'segunda torre de carbon'],
    ja: ['コールタワー2', '石炭塔2'],
  },
  'Groaning Storehouse': {
    de: ['achzendes lagerhaus', 'ächzendes lagerhaus', 'lagerhaus', 'lagerhaus 1', 'lagerhaus eins', 'speicher'],
    es: ['almacen', 'almacén', 'almacen quejumbroso', 'almacén quejumbroso', 'almacen 1'],
    ja: ['グローニングストアハウス', '倉庫', '軋む倉庫', '倉庫1'],
  },
  'Groaning Storehouse II': {
    de: ['achzendes lagerhaus 2', 'ächzendes lagerhaus 2', 'lagerhaus 2', 'lagerhaus zwei', 'zweites lagerhaus'],
    es: ['almacen 2', 'almacén 2', 'almacen dos', 'segundo almacen'],
    ja: ['グローニングストアハウス2', '倉庫2', '軋む倉庫2'],
  },
  'Ironworks Of Misery': {
    de: ['eisenhutte', 'eisenhütte', 'eisenwerk', 'eisenwerk des elends', 'eisenwerk 1'],
    es: ['herreria', 'herrería', 'fundicion', 'fundición', 'fundicion de la miseria', 'herreria 1'],
    ja: ['アイアンワークス', '製鉄所', '苦悩の製鉄所', '鍛冶場'],
  },
  'Ironworks Of Misery II': {
    de: ['eisenhutte 2', 'eisenhütte 2', 'eisenwerk 2', 'eisenwerk zwei', 'zweites eisenwerk'],
    es: ['herreria 2', 'herrería 2', 'fundicion 2', 'fundición 2', 'fundicion dos'],
    ja: ['アイアンワークス2', '製鉄所2', '苦悩の製鉄所2'],
  },
  'Shelter Woods': {
    de: ['schutzwald', 'zufluchtswald', 'wald', 'wald 1', 'grosser baum', 'großer baum'],
    es: ['bosque refugio', 'bosque', 'bosque 1', 'arbol grande', 'árbol grande', 'bosque del refugio'],
    ja: ['シェルターウッズ', '森', '大木', '避難の森', '森1'],
  },
  'Shelter Woods II': {
    de: ['schutzwald 2', 'zufluchtswald 2', 'wald 2', 'wald zwei', 'zweiter wald'],
    es: ['bosque refugio 2', 'bosque 2', 'bosque dos', 'segundo bosque'],
    ja: ['シェルターウッズ2', '森2', '避難の森2'],
  },
  'Suffocation Pit': {
    de: ['erstickungsgrube', 'grube', 'grube 1', 'erstickungsgrube 1', 'schacht'],
    es: ['fosa de asfixia', 'fosa', 'foso', 'fosa 1', 'pozo de asfixia'],
    ja: ['サフォケーションピット', '窒息坑', '坑道', '窒息の穴'],
  },
  'Suffocation Pit II': {
    de: ['erstickungsgrube 2', 'grube 2', 'grube zwei', 'zweite grube'],
    es: ['fosa de asfixia 2', 'fosa 2', 'foso 2', 'fosa dos'],
    ja: ['サフォケーションピット2', '窒息坑2', '坑道2'],
  },

  // ── Red Forest ─────────────────────────────────────────────────────────────
  "Mother's Dwelling": {
    de: ['mutters behausung', 'mutterhaus', 'haus der mutter', 'behausung der mutter'],
    es: ['morada de la madre', 'casa de la madre', 'vivienda de la madre', 'mapa de la cazadora'],
    ja: ['マザーズドウェリング', '母の住処', '母の家', 'ハントレス'],
  },
  'Temple of Purgation': {
    de: ['tempel der lauterung', 'tempel der läuterung', 'tempel', 'reinigungstempel'],
    es: ['templo de purgacion', 'templo de purgación', 'templo', 'templo de la purga'],
    ja: ['テンプルオブパージェーション', '浄化の神殿', '神殿', '寺院'],
  },

  // ── Backwater Swamp ────────────────────────────────────────────────────────
  'Grim Pantry': {
    de: ['dustere speisekammer', 'düstere speisekammer', 'speisekammer', 'vorratskammer', 'sumpfhutte'],
    es: ['despensa lugubre', 'despensa lúgubre', 'despensa', 'cabana del pantano', 'cabaña del pantano'],
    ja: ['グリムパントリー', '陰鬱な食料庫', '食料庫', '沼の小屋'],
  },
  'The Pale Rose': {
    de: ['die blasse rose', 'blasse rose', 'dampfer', 'schaufelraddampfer', 'sumpfboot'],
    es: ['la rosa palida', 'la rosa pálida', 'rosa palida', 'barco del pantano', 'vapor de ruedas'],
    ja: ['ペイルローズ', '蒼白のバラ', '沼の船', '外輪船'],
  },

  // ── Yamaoka Estate ─────────────────────────────────────────────────────────
  'Family Residence': {
    de: ['familienwohnsitz', 'familienhaus', 'familienresidenz', 'yamaoka anwesen', 'familienhaus 1'],
    es: ['residencia familiar', 'casa familiar', 'residencia yamaoka', 'residencia familiar 1'],
    ja: ['ファミリーレジデンス', '山岡邸', '家族の住居', '屋敷'],
  },
  'Family Residence II': {
    de: ['familienwohnsitz 2', 'familienhaus 2', 'familienresidenz 2', 'zweites familienhaus'],
    es: ['residencia familiar 2', 'casa familiar 2', 'residencia familiar dos'],
    ja: ['ファミリーレジデンス2', '山岡邸2', '家族の住居2'],
  },
  'Sanctum of Wrath': {
    de: ['heiligtum des zorns', 'zorn heiligtum', 'schrein des zorns', 'heiligtum', 'tempel des zorns'],
    es: ['santuario de la ira', 'santuario', 'santuario del furor', 'templo de la ira'],
    ja: ['サンクタムオブラース', '憤怒の聖域', '聖域', '怒りの聖堂'],
  },
  'Sanctum of Wrath II': {
    de: ['heiligtum des zorns 2', 'heiligtum 2', 'schrein des zorns 2', 'zweites heiligtum'],
    es: ['santuario de la ira 2', 'santuario 2', 'santuario dos'],
    ja: ['サンクタムオブラース2', '憤怒の聖域2', '聖域2'],
  },

  // ── Raccoon City ───────────────────────────────────────────────────────────
  'Police Station East Wing': {
    de: ['polizeirevier ostflugel', 'polizeirevier ostflügel', 'ostflugel', 'ostflügel', 'rpd ost', 'polizeiwache ost', 'revier ost'],
    es: ['comisaria ala este', 'comisaría ala este', 'ala este', 'rpd este', 'comisaria este', 'jefatura este'],
    ja: ['警察署東棟', '警察署東', '東棟', 'ラクーンシティ警察署東'],
  },
  'Police Station West Wing': {
    de: ['polizeirevier westflugel', 'polizeirevier westflügel', 'westflugel', 'westflügel', 'rpd west', 'polizeiwache west', 'revier west'],
    es: ['comisaria ala oeste', 'comisaría ala oeste', 'ala oeste', 'rpd oeste', 'comisaria oeste', 'jefatura oeste'],
    ja: ['警察署西棟', '警察署西', '西棟', 'ラクーンシティ警察署西'],
  },

  // ── Grave of Glennvale ─────────────────────────────────────────────────────
  'Dead Dawg Saloon': {
    de: ['saloon', 'toter hund saloon', 'westernsaloon', 'kneipe'],
    es: ['cantina', 'saloon del perro muerto', 'saloon', 'taberna', 'mapa del oeste'],
    ja: ['デッドドッグサルーン', '酒場', 'サルーン', '西部の酒場'],
  },

  // ── Withered Isle ──────────────────────────────────────────────────────────
  'Garden of Joy': {
    de: ['garten der freude', 'freudengarten', 'spukhaus', 'villa mit pool'],
    es: ['jardin de la alegria', 'jardín de la alegría', 'jardin del gozo', 'casa encantada', 'mansion con piscina'],
    ja: ['ガーデンオブジョイ', '喜びの庭', '歓喜の庭', 'ドレッジ'],
  },
  'Greenville Square': {
    de: ['greenville platz', 'kino', 'lichtspielhaus', 'stadtplatz', 'spielhalle'],
    es: ['plaza de greenville', 'plaza greenville', 'cine', 'teatro', 'salon recreativo'],
    ja: ['グリーンビルスクエア', '映画館', '劇場', 'ゲームセンター'],
  },

  // ── Castlevania ────────────────────────────────────────────────────────────
  'Fallen Refuge': {
    de: ['gefallene zuflucht', 'zuflucht', 'schloss', 'burg'],
    es: ['refugio caido', 'refugio caído', 'refugio', 'castillo', 'mapa de dracula'],
    ja: ['フォールンレフュージ', '堕ちた避難所', '城', 'ドラキュラ', 'キャッスルヴァニア'],
  },

  // ── Five Nights at Freddy's ────────────────────────────────────────────────
  'Freddy Fazbears Pizza': {
    de: ['freddy fazbears pizza', 'pizzeria', 'freddys pizzeria'],
    es: ['pizzeria de freddy fazbear', 'pizzería de freddy fazbear', 'pizzeria', 'pizzería', 'mapa de fnaf'],
    ja: ['フレディファズベアピザ', 'ピザ屋', 'ピザレストラン', 'フナフ'],
  },

  // ── Gideon Meat Plant ──────────────────────────────────────────────────────
  'The Game': {
    de: ['das spiel', 'gideon fleischfabrik', 'fleischfabrik', 'gideon'],
    es: ['el juego', 'planta de carne gideon', 'fabrica de carne', 'fábrica de carne', 'gideon', 'mapa de saw'],
    ja: ['ザゲーム', 'ゲーム', 'ギデオン食肉工場', '食肉工場', 'ソウ'],
  },

  // ── Haddonfield ────────────────────────────────────────────────────────────
  'Lampkin Lane': {
    de: ['lampkin strasse', 'lampkin straße', 'haddonfield', 'vorstadt'],
    es: ['calle lampkin', 'lampkin', 'haddonfield', 'mapa de myers', 'suburbio'],
    ja: ['ランプキンレーン', 'ハドンフィールド', 'マイヤーズ', '住宅街'],
  },

  // ── Silent Hill ────────────────────────────────────────────────────────────
  'Midwich Elementary School': {
    de: ['midwich grundschule', 'grundschule', 'schule', 'silent hill schule'],
    es: ['escuela primaria midwich', 'escuela midwich', 'escuela', 'colegio'],
    ja: ['ミッドウィッチ小学校', '小学校', '学校', 'サイレントヒル'],
  },

  // ── Ormond ─────────────────────────────────────────────────────────────────
  'Mount Ormond Resort': {
    de: ['ormond resort', 'berg ormond', 'skigebiet', 'skihutte', 'skihütte', 'ormond 1'],
    es: ['complejo de ormond', 'estacion de esqui', 'estación de esquí', 'ormond 1', 'centro de esqui'],
    ja: ['マウントオーモンドリゾート', 'オーモンド', 'スキー場', 'オーモンド1'],
  },
  'Mount Ormond Resort II': {
    de: ['ormond resort 2', 'berg ormond 2', 'skigebiet 2', 'ormond zwei'],
    es: ['complejo de ormond 2', 'estacion de esqui 2', 'ormond dos'],
    ja: ['マウントオーモンドリゾート2', 'オーモンド2', 'スキー場2'],
  },
  'Mount Ormond Resort III': {
    de: ['ormond resort 3', 'berg ormond 3', 'skigebiet 3', 'ormond drei'],
    es: ['complejo de ormond 3', 'estacion de esqui 3', 'ormond tres'],
    ja: ['マウントオーモンドリゾート3', 'オーモンド3', 'スキー場3'],
  },
  'Ormond Lake Mine': {
    de: ['ormond seemine', 'seemine', 'bergwerk', 'mine ormond', 'ormond mine', 'kohlemine'],
    es: ['mina del lago ormond', 'mina de ormond', 'mina', 'mina del lago'],
    ja: ['オーモンドレイクマイン', '鉱山', 'オーモンド鉱山', '湖の鉱山'],
  },

  // ── Léry's Memorial Institute ──────────────────────────────────────────────
  'Treatment Theatre': {
    de: ['behandlungsraum', 'operationssaal', 'op saal', 'lerys institut', 'krankenhaus', 'behandlungssaal'],
    es: ['sala de tratamiento', 'quirofano', 'quirófano', 'instituto lery', 'hospital', 'sala de operaciones'],
    ja: ['トリートメントシアター', '手術室', '治療室', 'レリー記念病院', '病院'],
  },

  // ── Dvarka Deepwood ────────────────────────────────────────────────────────
  'Toba Landing': {
    de: ['toba landeplatz', 'toba landung', 'toba', 'alien dschungel'],
    es: ['aterrizaje de toba', 'toba', 'jungla alienigena', 'jungla alienígena'],
    ja: ['トバランディング', 'トバ', 'エイリアンジャングル', 'シンギュラリティ'],
  },
  'Nostromo Wreckage': {
    de: ['nostromo wrack', 'nostromo', 'raumschiff'],
    es: ['restos del nostromo', 'nostromo', 'nave espacial', 'mapa de alien', 'xenomorfo'],
    ja: ['ノストロモ', 'ノストロモの残骸', '宇宙船', 'エイリアン', 'ゼノモーフ'],
  },

  // ── All-Kill ───────────────────────────────────────────────────────────────
  "Trickster's Delusion": {
    de: ['tricksters wahn', 'trickster wahn', 'wahnvorstellung'],
    es: ['delirio del trickster', 'ilusion del trickster', 'ilusión del trickster'],
    ja: ['トリックスターの妄想', 'トリックスター', 'オールキル'],
  },
};

/**
 * Localized keywords for the variant disambiguation groups. Merged into
 * GENERIC_VARIANT_RULES so that a bare "vorschule", "preescolar" or "幼稚園" opens
 * the Badham variant picker exactly like "badham" or "przedszkole" already do.
 * Keys match MAP_VARIANT_GROUPS.
 */
export const LOCALE_VARIANT_GROUP_KEYWORDS: Record<string, LocalizedAliases> = {
  badham: {
    de: ['vorschule', 'badham vorschule', 'kindergarten'],
    es: ['preescolar', 'guarderia', 'guardería', 'jardin de infancia'],
    ja: ['バダム', '幼稚園', 'プリスクール'],
  },
  rpd: {
    de: ['polizeirevier', 'polizeiwache', 'revier', 'raccoon city polizei'],
    es: ['comisaria', 'comisaría', 'jefatura de policia', 'estacion de policia'],
    ja: ['警察署', 'ラクーンシティ警察署'],
  },
  coal_tower: {
    de: ['kohleturm', 'kohlenturm'],
    es: ['torre de carbon', 'torre de carbón', 'torre carbonera'],
    ja: ['コールタワー', '石炭塔'],
  },
  groaning_storehouse: {
    de: ['lagerhaus', 'achzendes lagerhaus', 'ächzendes lagerhaus'],
    es: ['almacen', 'almacén', 'almacen quejumbroso'],
    ja: ['倉庫', 'グローニングストアハウス'],
  },
  ironworks_of_misery: {
    de: ['eisenwerk', 'eisenhutte', 'eisenhütte'],
    es: ['herreria', 'herrería', 'fundicion', 'fundición'],
    ja: ['アイアンワークス', '製鉄所'],
  },
  shelter_woods: {
    de: ['schutzwald', 'zufluchtswald'],
    es: ['bosque refugio', 'bosque del refugio'],
    ja: ['シェルターウッズ', '避難の森'],
  },
  suffocation_pit: {
    de: ['erstickungsgrube'],
    es: ['fosa de asfixia', 'pozo de asfixia'],
    ja: ['サフォケーションピット', '窒息坑'],
  },
  family_residence: {
    de: ['familienwohnsitz', 'familienhaus', 'familienresidenz'],
    es: ['residencia familiar', 'casa familiar'],
    ja: ['ファミリーレジデンス', '山岡邸'],
  },
  sanctum_of_wrath: {
    de: ['heiligtum des zorns', 'zorn heiligtum'],
    es: ['santuario de la ira'],
    ja: ['サンクタムオブラース', '憤怒の聖域'],
  },
  mount_ormond: {
    de: ['ormond resort', 'berg ormond', 'skigebiet'],
    es: ['complejo de ormond', 'estacion de esqui', 'estación de esquí'],
    ja: ['マウントオーモンドリゾート', 'オーモンド'],
  },
};

/** Provider-switch vocabulary, merged into SOURCE_COMMAND_RULES. */
export const LOCALE_SOURCE_COMMANDS: Record<'hens333' | 'samoelcolt' | 'all', LocalizedAliases> = {
  hens333: {
    de: ['wechsle zu hens', 'zu hens wechseln', 'hens karten', 'hens quelle', 'uhrzeit system', 'zwolf uhr', 'zwölf uhr'],
    es: ['cambiar a hens', 'cambia a hens', 'mapas de hens', 'fuente hens', 'sistema de reloj', 'las doce'],
    ja: ['ヘンズに切り替え', 'ヘンズのマップ', 'ヘンズ', '時計システム'],
  },
  samoelcolt: {
    de: ['wechsle zu samoel', 'zu samoel wechseln', 'samoel karten', 'samoel quelle', 'isometrisch', 'isometrische karten'],
    es: ['cambiar a samoel', 'cambia a samoel', 'mapas de samoel', 'fuente samoel', 'isometrico', 'isométrico'],
    ja: ['サモエルに切り替え', 'サモエルのマップ', 'サモエル', 'アイソメトリック'],
  },
  all: {
    de: ['alle karten', 'alle quellen', 'alles anzeigen', 'quelle zurucksetzen', 'quelle zurücksetzen', 'alle'],
    es: ['todos los mapas', 'todas las fuentes', 'mostrar todo', 'reiniciar fuente', 'todos'],
    ja: ['すべてのマップ', '全マップ', 'すべて表示', 'すべて'],
  },
};

/** Navigation vocabulary, merged into ACTION_COMMAND_RULES. */
export const LOCALE_ACTION_COMMANDS: Record<'zoom_in' | 'zoom_out' | 'fullscreen' | 'close', LocalizedAliases> = {
  zoom_in: {
    de: ['heranzoomen', 'reinzoomen', 'vergrossern', 'vergrößern', 'naher', 'näher', 'zoom rein'],
    es: ['acercar', 'ampliar', 'zoom mas', 'zoom más', 'mas cerca', 'más cerca'],
    ja: ['ズームイン', '拡大', '近づける', 'ズームアップ'],
  },
  zoom_out: {
    de: ['rauszoomen', 'wegzoomen', 'verkleinern', 'weiter weg', 'zoom raus'],
    es: ['alejar', 'reducir', 'zoom menos', 'mas lejos', 'más lejos'],
    ja: ['ズームアウト', '縮小', '遠ざける'],
  },
  fullscreen: {
    de: ['vollbild', 'vollbildmodus', 'maximieren', 'karte vergrossern', 'bildschirmfullend'],
    es: ['pantalla completa', 'maximizar', 'ampliar pantalla', 'modo pantalla completa'],
    ja: ['全画面', 'フルスクリーン', '最大化', '全画面表示'],
  },
  close: {
    de: ['schliessen', 'schließen', 'karte schliessen', 'karte schließen', 'beenden', 'zuruck', 'zurück', 'abbrechen'],
    es: ['cerrar', 'cerrar mapa', 'salir', 'volver', 'atras', 'atrás'],
    ja: ['閉じる', 'マップを閉じる', '終了', '戻る'],
  },
};

/**
 * Conversational lead-ins the recognizer transcribes before the map name.
 * Merged into cleanSpokenQuery's prefix list; order-insensitive because the
 * matcher sorts by length before stripping.
 */
export const LOCALE_FILLER_PREFIXES: LocalizedAliases = {
  de: [
    'kannst du mir bitte zeigen', 'kannst du mir zeigen', 'kannst du zeigen', 'kannst du offnen',
    'zeig mir bitte die karte', 'zeig mir bitte', 'zeige mir bitte', 'zeig mir die karte',
    'zeig mir', 'zeige mir', 'zeig', 'zeige', 'offne bitte', 'öffne bitte', 'offne', 'öffne',
    'bitte zeige', 'bitte zeig', 'bitte offne', 'bitte öffne', 'bitte', 'suche nach', 'suche',
    'finde', 'gehe zu', 'geh zu', 'wechsle zu', 'navigiere zu', 'anzeigen',
  ],
  es: [
    'puedes mostrarme por favor', 'puedes mostrarme', 'puedes abrir', 'puedes ensenarme',
    'muestrame por favor', 'muéstrame por favor', 'muestrame el mapa', 'muéstrame el mapa',
    'muestrame', 'muéstrame', 'ensename', 'enséñame', 'por favor muestra', 'por favor abre',
    'por favor', 'abre el mapa', 'abre', 'busca el', 'busca', 'encuentra', 've a', 'ir a',
    'cambia a', 'navega a', 'mostrar', 'ver',
  ],
  ja: [
    'を見せてください', 'を表示してください', 'を開いてください', 'に移動してください',
    'を見せて', 'を表示して', 'を開いて', 'に移動', 'を探して', 'を検索',
    'みせて', 'ひらいて', 'ください', 'お願いします', 'おねがい',
  ],
};

/** Trailing words the recognizer appends; merged into cleanSpokenQuery's suffixes. */
export const LOCALE_FILLER_SUFFIXES: LocalizedAliases = {
  de: ['bitte', 'karte', 'die karte', 'map', 'ansagen', 'callouts', 'diagramm'],
  es: ['por favor', 'mapa', 'el mapa', 'plano', 'diagrama', 'callouts'],
  ja: ['マップ', 'のマップ', '地図', 'の地図', 'を', 'は', 'ください'],
};
