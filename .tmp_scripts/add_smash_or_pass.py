import json, io

PATH = "backend/app/seeds/data/smash_or_pass/rosters/legendary_cosplay.json"

NEW_ENTITIES = [
{
  "slug": "artist_miss_fuchi",
  "name": "Miss Fuchi",
  "role": "Killer",
  "gender": "monster_other",
  "media_url": "/static/avatars/killers/artist_miss_fuchi.webp",
  "media_type": "image",
  "archetype": "The Fog-Born Devourer",
  "bio": "Straight out of Junji Ito's Rumors, Miss Fuchi lured a crew of hapless filmmakers into the woods, let the fog roll in, and unhinged her jaw for the juiciest bite. She's looking for someone who won't run when the laughing starts.",
  "tagline": "Unhinged jaw, ravenous grin, and a laugh that echoes through the fog.",
  "quote": "\"Just a little closer... the juiciest bite is always worth the wait.\"",
  "meme": "Meme: Miss Fuchi's laugh echoing across the map while she just... keeps chewing.",
  "turn_on": "Slow torment, home movies, and a really good appetite",
  "dealbreaker": "Picky eaters and early credits rolling",
  "dating_vibe": "High-stakes Fog romance",
  "red_flags": ["Will absolutely eat you", "Finds your screaming hilarious"],
  "green_flags": ["Never skips a meal with you", "Devoted focus once she's picked her favorite"],
  "danger_level": "High",
  "chaos_score": 80,
  "translations": {
    "de": {
      "archetype": "Miss Fuchi: Die Nebelgeborene Fresserin",
      "bio": "Aus Junji Itos Rumors entsprungen, lockte Miss Fuchi ein Filmteam in den Wald und ließ den Nebel hereinrollen, bevor sie zubiss.",
      "tagline": "Ausgerenkter Kiefer, gieriges Grinsen und ein Lachen, das durch den Nebel hallt.",
      "meme": "Meme: Ihr Lachen hallt über die Karte, während sie einfach weiterkaut.",
      "turn_on": "Langsame Qual und Heimvideos",
      "dealbreaker": "Wählerische Esser",
      "dating_vibe": "Spannende, düstere Romanze im Nebel",
      "red_flags": ["Wird dich mit Sicherheit fressen", "Findet dein Schreien urkomisch"],
      "green_flags": ["Lässt keine Mahlzeit mit dir aus", "Volle Hingabe, sobald du ihr Favorit bist"]
    },
    "es": {
      "archetype": "Miss Fuchi: La Devoradora Nacida de la Niebla",
      "bio": "Salida directamente de Rumors de Junji Ito, Miss Fuchi atrajo a un equipo de cine al bosque, dejó caer la niebla y desencajó su mandíbula para el bocado más jugoso.",
      "tagline": "Mandíbula desencajada, sonrisa voraz y una risa que resuena en la niebla.",
      "meme": "Meme: Su risa resonando por todo el mapa mientras sigue masticando.",
      "turn_on": "Tortura lenta y películas caseras",
      "dealbreaker": "Comensales quisquillosos",
      "dating_vibe": "Romance intenso y peligroso en la Niebla",
      "red_flags": ["Definitivamente te comerá", "Le parece hilarante tu grito"],
      "green_flags": ["Nunca se salta una comida contigo", "Devoción total una vez que eres su favorito"]
    },
    "ja": {
      "archetype": "ミス・フチ: 霧より生まれし貪食者",
      "bio": "伊藤潤二の『Rumors』を基にした衣装。森で映画クルーをおびき寄せ、霧を呼び込み、顎を外して最高の一口を味わう。",
      "tagline": "外れた顎、貪欲な笑み、霧に響く高笑い。",
      "meme": "ミーム: 彼女の笑い声がマップ中に響く中、ただひたすら咀嚼を続ける。",
      "turn_on": "ゆっくりとした苦しみとホームムービー",
      "dealbreaker": "好き嫌いの多い相手",
      "dating_vibe": "妖しく危険に満ちた霧のロマンス",
      "red_flags": ["間違いなくあなたを食べる", "あなたの悲鳴を面白がる"],
      "green_flags": ["あなたとの食事を絶対に欠かさない", "お気に入りになれば全力で執着してくれる"]
    },
    "pl": {
      "archetype": "Miss Fuchi: Pożeraczka Zrodzona z Mgły",
      "bio": "Prosto z Rumors Junji Ito — Miss Fuchi zwabiła ekipę filmową w głąb lasu, wpuściła mgłę i wywichnęła szczękę dla najsoczystszego kęsa.",
      "tagline": "Wywichnięta szczęka, żarłoczny uśmiech i śmiech niosący się przez mgłę.",
      "quote": "„Jeszcze tylko krok bliżej... najsoczystszy kęs zawsze wart jest czekania.” – Miss Fuchi",
      "meme": "Meme: Jej śmiech niesie się po całej mapie, a ona po prostu... dalej przeżuwa.",
      "turn_on": "Powolna udręka, domowe filmiki i naprawdę dobry apetyt",
      "dealbreaker": "Wybredni jedzący i zbyt wczesne napisy końcowe",
      "dating_vibe": "Tajemniczy, zmysłowy i pełen napięcia romans we mgle",
      "red_flags": ["Na pewno cię zje", "Uważa twój krzyk za komiczny"],
      "green_flags": ["Nigdy nie opuszcza posiłku z tobą", "Pełne oddanie, gdy już zostaniesz jej faworytem"]
    }
  },
  "order_index": 47,
  "is_active": True
},
{
  "slug": "artist_boulet",
  "name": "Boulet Artist",
  "role": "Killer",
  "gender": "female",
  "media_url": "/static/avatars/killers/artist_boulet.webp",
  "media_type": "image",
  "archetype": "The Extradimensional Icon",
  "bio": "First spotted in Joshua Tree, CA in 1963, this shapeshifting entity was pulled into the Entity's Realm by cosmic and social upheaval -- and wept tears of joy the moment her nails turned to claws. Now every hunt is a runway, and she is not here to be sent home.",
  "tagline": "Dressed for the occasion, drip dripping bright-red blood, claws deadly in every sense of the word.",
  "quote": "\"The hunt isn't over until the judges say it's over, darling.\"",
  "meme": "Meme: Survivors getting eliminated one by one like a Dragula runway walk-off.",
  "turn_on": "Fabulous entrances, dramatic reveals, and a killer wardrobe",
  "dealbreaker": "Bad lighting and a rushed exit",
  "dating_vibe": "High-stakes Fog romance",
  "red_flags": ["Turns every chase into a performance", "Those claws aren't for manicures"],
  "green_flags": ["Always dressed to impress", "Full extradimensional glow-up", "Never misses a beat, even mid-hunt"],
  "danger_level": "High",
  "chaos_score": 82,
  "translations": {
    "de": {
      "archetype": "Boulet Artist: Die Extradimensionale Ikone",
      "bio": "1963 in Joshua Tree erstmals gesichtet, wurde dieses wandlungsfähige Wesen vom kosmischen Umbruch in das Reich des Wesens gezogen -- und weinte Freudentränen, als ihre Nägel zu Krallen wurden.",
      "tagline": "Perfekt gestylt, blutbefleckt und tödlich elegant.",
      "meme": "Meme: Überlebende, die einer nach dem anderen wie bei einer Dragula-Show ausscheiden.",
      "turn_on": "Spektakuläre Auftritte und dramatische Enthüllungen",
      "dealbreaker": "Schlechte Beleuchtung",
      "dating_vibe": "Spannende, düstere Romanze im Nebel",
      "red_flags": ["Macht aus jeder Jagd eine Performance", "Diese Krallen sind nicht zur Maniküre da"],
      "green_flags": ["Immer perfekt gestylt", "Volle extradimensionale Verwandlung", "Verpasst nie einen Auftritt, selbst mitten in der Jagd"]
    },
    "es": {
      "archetype": "Boulet Artist: El Ícono Extradimensional",
      "bio": "Avistada por primera vez en Joshua Tree, California, en 1963, esta entidad cambiaformas fue arrastrada al Reino del Ente por el caos cósmico y social -- y lloró de alegría en cuanto sus uñas se convirtieron en garras.",
      "tagline": "Vestida para la ocasión, goteando sangre roja brillante, con garras mortales en todo sentido.",
      "meme": "Meme: Los supervivientes siendo eliminados uno por uno como en un desfile de Dragula.",
      "turn_on": "Entradas fabulosas y revelaciones dramáticas",
      "dealbreaker": "Mala iluminación",
      "dating_vibe": "Romance intenso y peligroso en la Niebla",
      "red_flags": ["Convierte cada persecución en una actuación", "Esas garras no son para hacerse la manicura"],
      "green_flags": ["Siempre vestida para impresionar", "Transformación extradimensional completa", "Nunca pierde el ritmo, ni en plena cacería"]
    },
    "ja": {
      "archetype": "ブーレ・アーティスト: 異次元のアイコン",
      "bio": "1963年、米カリフォルニア州ジョシュア・ツリーで初めて目撃された変幻自在の存在。宇宙的・社会的激動に引かれてエンティティの領域へ引き込まれ、爪が鉤爪に変わった瞬間、歓喜の涙を流した。",
      "tagline": "その日のために着飾り、真紅の血を滴らせ、あらゆる意味で危険な鉤爪を持つ。",
      "meme": "ミーム: サバイバーたちがドラグーラのランウェイのように次々と脱落していく。",
      "turn_on": "華やかな登場と劇的な演出",
      "dealbreaker": "照明が悪いこと",
      "dating_vibe": "妖しく危険に満ちた霧のロマンス",
      "red_flags": ["どんなチェイスもパフォーマンスに変える", "その爪はネイルケア用ではない"],
      "green_flags": ["常に完璧な装い", "異次元からの完全な変身", "狩りの最中でも決して間を外さない"]
    },
    "pl": {
      "archetype": "Boulet Artist: Ekstradymensjonalna Ikona",
      "bio": "Po raz pierwszy dostrzeżona w Joshua Tree w Kalifornii w 1963 roku -- ta zmiennokształtna istota została wciągnięta do Królestwa Bytu przez kosmiczne i społeczne wstrząsy, a gdy jej paznokcie zmieniły się w pazury, popłynęły łzy radości.",
      "tagline": "Ubrana na tę okazję, ociekająca jaskrawoczerwoną krwią, ze śmiercionośnymi pazurami w każdym tego słowa znaczeniu.",
      "quote": "„Polowanie nie kończy się, dopóki jury nie powie, że się skończyło, kochanie.” – Boulet Artist",
      "meme": "Meme: Ocaleni eliminowani jedno po drugim jak na wybiegu Dragula.",
      "turn_on": "Spektakularne wejścia i dramatyczne efekty",
      "dealbreaker": "Kiepskie oświetlenie",
      "dating_vibe": "Tajemniczy, zmysłowy i pełen napięcia romans we mgle",
      "red_flags": ["Zamienia każdy pościg w występ", "Te pazury służą do czegoś więcej niż manicure"],
      "green_flags": ["Zawsze ubrana, by robić wrażenie", "Pełna ekstradymensjonalna przemiana", "Nigdy nie traci rytmu, nawet w środku polowania"]
    }
  },
  "order_index": 48,
  "is_active": True
},
{
  "slug": "dredge_half_spirits_torments",
  "name": "Half Spirits' Torments",
  "role": "Killer",
  "gender": "monster_other",
  "media_url": "/static/avatars/killers/dredge_half_spirits_torments.webp",
  "media_type": "image",
  "archetype": "The Sand-Swallowed Memory",
  "bio": "Based on Junji Ito's The Story of the Mysterious Tunnel, this skin remembers the moment everything went wrong -- the ground giving way, the sand pulling him under, and a tunnel that never quite lets its victims leave. He's looking for someone who understands that some things just keep resurfacing.",
  "tagline": "Sand-swallowed silhouette, tunnel-deep dread, and memories that never stay buried.",
  "quote": "\"He tried to run. The sand did not let him.\"",
  "meme": "Meme: The Dredge popping out of a locker like your worst memory finally caught up with you.",
  "turn_on": "Unresolved trauma, half-buried secrets, and a good locker to hide in",
  "dealbreaker": "Solid ground and closure",
  "dating_vibe": "High-stakes Fog romance",
  "red_flags": ["Reclaims you the moment the lights go out", "Never really lets go of the past"],
  "green_flags": ["Remembers every moment you shared", "Will always find you, wherever you're hiding"],
  "danger_level": "High",
  "chaos_score": 72,
  "translations": {
    "de": {
      "archetype": "The Dredge: Die Vom Sand Verschluckte Erinnerung",
      "bio": "Basierend auf Junji Itos The Story of the Mysterious Tunnel erinnert sich diese Verkleidung an den Moment, in dem alles schiefging -- der nachgebende Boden, der Sand, der ihn hinabzog.",
      "tagline": "Vom Sand verschluckte Silhouette und Erinnerungen, die niemals begraben bleiben.",
      "meme": "Meme: The Dredge, der aus einem Spind springt, als hätte dich die schlimmste Erinnerung endlich eingeholt.",
      "turn_on": "Ungelöste Traumata und halb vergrabene Geheimnisse",
      "dealbreaker": "Fester Boden und Abschluss",
      "dating_vibe": "Spannende, düstere Romanze im Nebel",
      "red_flags": ["Holt dich zurück, sobald das Licht erlischt", "Lässt die Vergangenheit nie wirklich los"],
      "green_flags": ["Erinnert sich an jeden gemeinsamen Moment", "Findet dich immer, egal wo du dich versteckst"]
    },
    "es": {
      "archetype": "The Dredge: El Recuerdo Tragado por la Arena",
      "bio": "Basado en The Story of the Mysterious Tunnel de Junji Ito, esta skin recuerda el momento en que todo salió terriblemente mal -- el suelo cediendo, la arena arrastrándolo hacia abajo.",
      "tagline": "Silueta tragada por la arena y recuerdos que nunca permanecen enterrados.",
      "meme": "Meme: The Dredge saliendo de una taquilla como si tu peor recuerdo por fin te hubiera alcanzado.",
      "turn_on": "Traumas sin resolver y secretos a medio enterrar",
      "dealbreaker": "Suelo firme y cierre emocional",
      "dating_vibe": "Romance intenso y peligroso en la Niebla",
      "red_flags": ["Te reclama en cuanto se apagan las luces", "Nunca suelta realmente el pasado"],
      "green_flags": ["Recuerda cada momento que compartieron", "Siempre te encontrará, sin importar dónde te escondas"]
    },
    "ja": {
      "archetype": "ドレッジ: 砂に飲まれた記憶",
      "bio": "伊藤潤二の『謎のトンネルの話』を基にした衣装。すべてが取り返しのつかないことになった瞬間 -- 崩れる地面、飲み込む砂、そして犠牲者を完全には解放しないトンネルを今も覚えている。",
      "tagline": "砂に飲まれたシルエットと、トンネルの奥に潜む恐怖、決して埋もれない記憶。",
      "meme": "ミーム: ロッカーから飛び出すドレッジ、まるで最悪の記憶がついに追いついてきたかのように。",
      "turn_on": "未解決のトラウマと半ば埋もれた秘密",
      "dealbreaker": "しっかりした地面と区切り",
      "dating_vibe": "妖しく危険に満ちた霧のロマンス",
      "red_flags": ["明かりが消えた瞬間に連れ戻す", "過去を本当の意味で手放さない"],
      "green_flags": ["共に過ごした瞬間をすべて覚えている", "どこに隠れていても必ず見つけ出す"]
    },
    "pl": {
      "archetype": "The Dredge: Wspomnienie Pochłonięte przez Piasek",
      "bio": "Oparty na Opowieści o Tajemniczym Tunelu Junji Ito, ten skin pamięta moment, w którym wszystko poszło strasznie źle -- grunt usuwający się spod stóp, piasek wciągający w głąb, i tunel, który nigdy do końca nie wypuszcza swoich ofiar.",
      "tagline": "Sylwetka pochłonięta przez piasek, tunelowa groza i wspomnienia, które nigdy nie zostają pogrzebane.",
      "quote": "„Próbował uciec. Piasek mu na to nie pozwolił.”",
      "meme": "Meme: The Dredge wyskakujący z szafki, jakby twoje najgorsze wspomnienie w końcu cię dogoniło.",
      "turn_on": "Nierozwiązana trauma, na wpół pogrzebane sekrety i dobra szafka do schowania się",
      "dealbreaker": "Pewny grunt pod nogami i domknięcie sprawy",
      "dating_vibe": "Tajemniczy, zmysłowy i pełen napięcia romans we mgle",
      "red_flags": ["Zabiera cię z powrotem, gdy tylko zgaśnie światło", "Nigdy tak naprawdę nie puszcza przeszłości"],
      "green_flags": ["Pamięta każdą wspólnie spędzoną chwilę", "Zawsze cię znajdzie, bez względu na kryjówkę"]
    }
  },
  "order_index": 49,
  "is_active": True
},
{
  "slug": "xenomorph_king",
  "name": "The King Xenomorph",
  "role": "Killer",
  "gender": "monster_other",
  "media_url": "/static/avatars/killers/xenomorph_king.webp",
  "media_type": "image",
  "archetype": "The Regal Hive Sovereign",
  "bio": "A more majestic, commanding counterpart to the Hive Matriarch, the Xenomorph King rules with the same biomechanical menace and none of the patience. Where the Queen protects the nest, he simply expects it to be protected for him.",
  "tagline": "Towering regal crest, commanding presence, and zero tolerance for power loaders.",
  "quote": "*A low, resonant hiss that makes the whole hive go silent.*",
  "meme": "Meme: The Xenomorph King demanding the Queen's throne back mid-chase.",
  "turn_on": "Absolute obedience and a well-run hive",
  "dealbreaker": "Power loaders and flame throwers",
  "dating_vibe": "High-stakes Fog romance",
  "red_flags": ["Acidic blood that dissolves floors", "Expects to be waited on hand and claw"],
  "green_flags": ["Regal, commanding presence", "Fiercely protective once you're part of the hive", "Apex predator through and through"],
  "danger_level": "High",
  "chaos_score": 83,
  "translations": {
    "de": {
      "archetype": "Xenomorph König: Der Majestätische Herrscher des Schwarms",
      "bio": "Ein noch majestätischerer, befehlsgewaltigerer Gegenpart zur Matriarchin -- der Xenomorph König regiert mit derselben biomechanischen Bedrohung, aber ohne ihre Geduld.",
      "tagline": "Gewaltige, königliche Krone und null Toleranz für Power Loader.",
      "meme": "Meme: Der König verlangt mitten in der Verfolgungsjagd den Thron der Königin zurück.",
      "turn_on": "Absoluter Gehorsam und ein gut geführter Bienenstock",
      "dealbreaker": "Flammenwerfer",
      "dating_vibe": "Spannende, düstere Romanze im Nebel",
      "red_flags": ["Säureblut, das Böden auflöst", "Erwartet, bedient zu werden"],
      "green_flags": ["Königliche, befehlsgewaltige Präsenz", "Fürsorglich, sobald du zum Schwarm gehörst", "Durch und durch Spitzenprädator"]
    },
    "es": {
      "archetype": "El Rey Xenomorfo: El Soberano Regio del Nido",
      "bio": "Una contraparte aún más majestuosa e imponente de la Matriarca -- el Rey Xenomorfo gobierna con la misma amenaza biomecánica, pero sin su paciencia.",
      "tagline": "Cresta regia colosal, presencia imponente y cero tolerancia hacia los power loaders.",
      "meme": "Meme: El Rey exigiendo de vuelta el trono de la Reina en plena persecución.",
      "turn_on": "Obediencia absoluta y una colmena bien dirigida",
      "dealbreaker": "Los lanzallamas",
      "dating_vibe": "Romance intenso y peligroso en la Niebla",
      "red_flags": ["Sangre ácida que disuelve el suelo", "Espera ser atendido de pies a garras"],
      "green_flags": ["Presencia regia e imponente", "Ferozmente protector una vez que formas parte de la colmena", "Depredador supremo de principio a fin"]
    },
    "ja": {
      "archetype": "ゼノモーフ・キング: 巣を統べる威厳ある君主",
      "bio": "女帝のさらに威厳あるカウンターパート。ゼノモーフ・キングは同じ生体機械的な脅威をまといながら、女帝ほどの忍耐は持ち合わせていない。",
      "tagline": "そびえ立つ王者の冠、威圧的な存在感、パワーローダーへの一切の容赦なし。",
      "meme": "ミーム: チェイスの最中に女帝の玉座を取り戻そうとするキング。",
      "turn_on": "絶対的な服従とよく統率された巣",
      "dealbreaker": "火炎放射器とパワーローダー",
      "dating_vibe": "妖しく危険に満ちた霧のロマンス",
      "red_flags": ["床を溶かす酸性の血液", "手も爪も尽くして仕えられることを期待する"],
      "green_flags": ["威厳に満ちた統率力", "巣の一員になれば徹底的に守ってくれる", "生粋の頂点捕食者"]
    },
    "pl": {
      "archetype": "Król Ksenomorfów: Dostojny Władca Roju",
      "bio": "Jeszcze bardziej majestatyczny i władczy odpowiednik Matriarchini -- Król Ksenomorfów rządzi z tym samym biomechanicznym zagrożeniem, ale bez jej cierpliwości. Tam, gdzie Królowa broni gniazda, on po prostu oczekuje, że zostanie ono obronione dla niego.",
      "tagline": "Górująca, królewska korona głowy, władcza obecność i zero tolerancji dla wózków Power Loader.",
      "quote": "*Niskie, rezonujące syczenie, od którego cały rój milknie.*",
      "meme": "Meme: Król domagający się z powrotem tronu Królowej w środku pościgu.",
      "turn_on": "Absolutne posłuszeństwo i dobrze prowadzony rój",
      "dealbreaker": "Miotacze ognia i wózki widłowe Power Loader",
      "dating_vibe": "Tajemniczy, zmysłowy i pełen napięcia romans we mgle",
      "red_flags": ["Krew wytapiająca dziury w podłodze", "Oczekuje obsługi na każdym kroku"],
      "green_flags": ["Dostojna, władcza obecność", "Bezwzględnie opiekuńczy, gdy jesteś częścią roju", "Drapieżnik absolutnego szczytu łańcucha pokarmowego"]
    }
  },
  "order_index": 50,
  "is_active": True
},
]

with io.open(PATH, encoding="utf-8") as f:
    data = json.load(f)

roster = data["rosters"][0]
entities = roster["entities"]

existing_slugs = {e["slug"] for e in entities}
for e in NEW_ENTITIES:
    assert e["slug"] not in existing_slugs, f"duplicate slug: {e['slug']}"

assert max(e["order_index"] for e in entities) == 46
entities.extend(NEW_ENTITIES)

with io.open(PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("Appended", len(NEW_ENTITIES), "entities. Total now:", len(roster["entities"]))
