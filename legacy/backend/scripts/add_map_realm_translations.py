# backend/scripts/add_map_realm_translations.py
"""One-time content merge: writes "realms" and "maps" translation sections into
app/translations/translations.json, sourced from wiki.gg (pl/de/es) and kamigame.jp (ja).

Run inside the backend container:
    docker compose exec backend python -m scripts.add_map_realm_translations
"""
import json
from pathlib import Path

TRANSLATIONS_FILE = Path(__file__).resolve().parent.parent / "app" / "translations" / "translations.json"

# realm name (our DB's MapRealm.realm / Realm.name) -> {lang: translated name}
REALMS: dict[str, dict[str, str]] = {
    "Autohaven Wreckers": {"pl": "Złomowisko Autohaven", "de": "Autohaven-Schrottplatz", "es": "Desguace Autohaven", "ja": "オートヘイヴン・レッカーズ"},
    "Backwater Swamp": {"pl": "Bagienne Rozlewisko", "de": "Backwater-Sumpf", "es": "Pantano de Aguas Estancadas", "ja": "バックウォーター・スワンプ"},
    "Coldwind Farm": {"pl": "Farma Coldwind", "de": "Coldwind Farm", "es": "Granja Coldwind", "ja": "コールドウィンド・ファーム"},
    "Disturbed Ward": {"pl": "Przytułek Crotus Prenn", "de": "Crotus-Prenn-Anstalt", "es": "Psiquiátrico Crotus Prenn", "ja": "クロータス・プレン・アサイラム"},
    "Dvarka Deepwood": {"pl": "Gęsty Las Dvarki", "de": "Dvarka-Dschungel", "es": "Bosque Profundo de Dvarka", "ja": "ドヴァルカ・ディープウッド"},
    "Forsaken Boneyard": {"pl": "Zapomniany Cmentarz", "de": "Einsamer Friedhof", "es": "Cementerio Abandonado", "ja": "荒れ果てた墓場"},
    "Gideon Meat Plant": {"pl": "Zakład Mięsny Gideon", "de": "Gideon-Fleischfabrik", "es": "Planta Procesadora de Carne Gideon", "ja": "ギデオン食肉工場"},
    "Grave of Glenvale": {"pl": "Grób w Glenvale", "de": "Grab von Glenvale", "es": "Tumba de Glenvale", "ja": "グレンベールの墓場"},
    "Haddonfield": {"pl": "Haddonfield", "de": "Haddonfield", "es": "Haddonfield", "ja": "ハドンフィールド"},
    "Hawkins National Laboratory": {"pl": "Hawkins National Laboratory", "de": "Hawkins National Laboratory", "es": "Laboratorio Nacional Hawkins", "ja": "ホーキンス国立研究所"},
    "Lery's Memorial Institute": {"pl": "Instytut Pamięci Léry'ego", "de": "Lérys Gedenkinstitut", "es": "Instituto Conmemorativo Léry", "ja": "レリー記念研究所"},
    "Ormond": {"pl": "Ormond", "de": "Ormond", "es": "Ormond", "ja": "オーモンド"},
    "Raccoon City": {"pl": "Raccoon City", "de": "Raccoon City", "es": "Raccoon City", "ja": "ラクーンシティ"},
    "Red Forest": {"pl": "Czerwony Las", "de": "Roter Wald", "es": "Bosque Rojo", "ja": "レッド・フォレスト"},
    "Silent Hill": {"pl": "Silent Hill", "de": "Silent Hill", "es": "Silent Hill", "ja": "サイレントヒル"},
    "Sleepless District": {"pl": "Bezsenna Dzielnica", "de": "Schlafloses Viertel", "es": "Distrito Insomne", "ja": "眠らない界隈"},
    "Springwood": {"pl": "Springwood", "de": "Springwood", "es": "Springwood", "ja": "スプリングウッド"},
    "The Decimated Borgo": {"pl": "Zdziesiątkowane Borgo", "de": "Das dezimierte Borgo", "es": "El Pueblo Diezmado", "ja": "壊滅したボルゴ"},
    "The Macmillan Estate": {"pl": "Posiadłość Macmillanów", "de": "MacMillan-Anwesen", "es": "La Finca MacMillan", "ja": "マクミラン・エステート"},
    "Withered Isle": {"pl": "Uschnięta Wyspa", "de": "Verkümmerte Insel", "es": "Isla Marchita", "ja": "枯死の島"},
    "Yamaoka Estate": {"pl": "Posiadłość Rodziny Yamaoka", "de": "Yamaoka-Anwesen", "es": "Residencia Yamaoka", "ja": "山岡邸"},
}

# base map name (our " II"/" III"/" IIIV"/" V" seed-variant suffix stripped) -> {lang: translated name}
MAPS: dict[str, dict[str, str]] = {
    "Azarov's Resting Place": {"pl": "Miejsce Spoczynku Azarova", "de": "Azarovs Ruhestätte", "es": "Lugar de Descanso de Azarov", "ja": "アザロフの休憩所"},
    "Blood Lodge": {"pl": "Krwawa Stróżówka", "de": "Bluthütte", "es": "Cabaña de Sangre", "ja": "ブラッド・ロッジ"},
    "Gas Heaven": {"pl": "Stacja Paliw", "de": "Sprithimmel", "es": "Gasolinera", "ja": "ガス・ヘヴン"},
    "Wreckers' Yard": {"pl": "Podwórze Złomowiska", "de": "Schrottplatz", "es": "Desguace", "ja": "レッカーズ・ヤード"},
    "Wretched Shop": {"pl": "Sklep Nędzy", "de": "Werkstatt", "es": "Taller Ruinoso", "ja": "レッチド・ショップ"},
    "Grim Pantry": {"pl": "Ponura Spiżarnia", "de": "Schaurige Speisekammer", "es": "Despensa Sombría", "ja": "おぞましい貯蔵室"},
    "The Pale Rose": {"pl": "Blada Róża", "de": "Die Pale Rose", "es": "La Rosa Pálida", "ja": "ペイル・ローズ"},
    "Fractured Cowshed": {"pl": "Spękana Obora", "de": "Verfallener Kuhstall", "es": "Establo en Ruinas", "ja": "フラクチャード・カウシェッド"},
    "Rancid Abbatoir": {"pl": "Zjęłczała Rzeźnia", "de": "Widerliches Schlachthaus", "es": "Matadero Pestilente", "ja": "ランシッド・アバトワー"},
    "Rotten Fields": {"pl": "Zbutwiałe Pola", "de": "Faulige Felder", "es": "Campos Podridos", "ja": "ロトン・フィールズ"},
    "The Thompson House": {"pl": "Dom Thompsona", "de": "Das Thompson-Haus", "es": "La Casa de los Thompson", "ja": "トンプソン・ハウス"},
    "Torment Creek": {"pl": "Przełęcz Udręki", "de": "Tal der Qual", "es": "Arroyo del Tormento", "ja": "トーメント・クリーク"},
    "Disturbed Ward": {"pl": "Niespokojny Oddział", "de": "Gestörtenabteilung", "es": "Sala de Trastornados", "ja": "ディスターブド・ウォード"},
    "Father Campbells Chapel": {"pl": "Kaplica Ojca Campbella", "de": "Pater Campbells Kapelle", "es": "Capilla del Padre Campbell", "ja": "ファザー・キャンベルズ・チャペル"},
    "Nostromo Wreckage": {"pl": "Wrak Nostromo", "de": "Nostromo-Wrack", "es": "Ruinas de la Nostromo", "ja": "ノストロモ号の残骸"},
    "Toba Landing": {"pl": "Ziemie Toba", "de": "Toba-Landeplatz", "es": "Desembarco en Toba", "ja": "トーバ着陸地点"},
    "Dead Sands": {"pl": "Martwe Piaski", "de": "Tote Sande", "es": "Arenas Mortales", "ja": "死の砂漠"},
    "Eyrie of Crows": {"pl": "Gniazdo Kruków", "de": "Krähenhorst", "es": "Aviario de Cuervos", "ja": "カラスの巣"},
    "The Game": {"pl": "Rozgrywka", "de": "Das Spiel", "es": "El Juego", "ja": "ザ・ゲーム"},
    "Dead Dawg Saloon": {"pl": "Knajpa pod Martwym Ziomkiem", "de": "Dead Dawg Saloon", "es": "Cantina El Perro Muerto", "ja": "死んだ犬の酒場"},
    "Lampkin Lane": {"pl": "Alejka Lampkin", "de": "Lampkin Lane", "es": "Avenida Lampkin", "ja": "ランプキン・レーン"},
    "The Underground Complex": {"pl": "Podziemny Kompleks", "de": "Der Untergrundkomplex", "es": "El Complejo Subterráneo", "ja": "地下施設"},
    "Treatment Theatre": {"pl": "Placówka Medyczna", "de": "Behandlungsbereich", "es": "Centro de Tratamiento", "ja": "治療シアター"},
    "Mount Ormond Resort": {"pl": "Ośrodek Mount Ormond", "de": "Skiort am Mount Ormond", "es": "Complejo del Monte Ormond", "ja": "オーモンド山のリゾート"},
    "Ormond Lake Mine": {"pl": "Kopalnia nad Jeziorem Ormond", "de": "Mine am Ormond-See", "es": "Mina del Lago Ormond", "ja": "オーモンド湖採掘場"},
    "Police Station East Wing": {"pl": "Posterunek Policji Raccoon City – Wschodnie Skrzydło", "de": "Ostflügel der Polizeistation von Raccoon City", "es": "Ala Este del Departamento de Policía de Raccoon City", "ja": "ラクーンシティ警察署東棟"},
    "Police Station West Wing": {"pl": "Posterunek Policji Raccoon City – Zachodnie Skrzydło", "de": "Westflügel der Polizeistation von Raccoon City", "es": "Ala Oeste del Departamento de Policía de Raccoon City", "ja": "ラクーンシティ警察署西棟"},
    "Mother's Dwelling": {"pl": "Dom Matki", "de": "Mutters Behausung", "es": "Morada Maternal", "ja": "マザーズ・ドゥエリング"},
    "Temple of Purgation": {"pl": "Świątynia Oczyszczenia", "de": "Der Tempel der Reinigung", "es": "El Templo de la Purgación", "ja": "浄罪の神殿"},
    "Midwich Elementary School": {"pl": "Szkoła Podstawowa Midwich", "de": "Midwich Elementary School", "es": "Escuela Primaria Midwich", "ja": "ミッドウィッチ小学校"},
    "Trickster's Delusion": {"pl": "Urojenia Magika", "de": "Illusion des Tricksters", "es": "Delirio del Embaucador", "ja": "トリックスターの妄想"},
    # Base name for our 5 numbered "Preschool I".."Preschool V" rows -- wiki's single map is "Badham Preschool".
    "Preschool": {"pl": "Przedszkole w Badham", "de": "Badham-Vorschule", "es": "Guardería Badham", "ja": "バダム幼稚園"},
    "Forgotten Ruins": {"pl": "Zapomniane Ruiny", "de": "Vergessene Ruinen", "es": "Ruinas Olvidadas", "ja": "忘れ去られた遺跡"},
    "Shattered Square": {"pl": "Roztrzaskany Plac", "de": "Der zerstörte Platz", "es": "El Cuadrado Roto", "ja": "瓦礫と化した広場"},
    "Coal Tower": {"pl": "Wieża Węglowa", "de": "Kohlelager", "es": "Torre de Carbón", "ja": "コール・タワー"},
    "Groaning Storehouse": {"pl": "Jęczący Magazyn", "de": "Seufzendes Lagerhaus", "es": "Almacén Quejumbroso", "ja": "グロウニング・ストアハウス"},
    "Ironworks Of Misery": {"pl": "Huta Niedoli", "de": "Eisenwerk der Qual", "es": "Fundición de la Miseria", "ja": "アイアンワークス・オブ・ミザリー"},
    "Shelter Woods": {"pl": "Leśne Schronisko", "de": "Schutzwald", "es": "Bosque Refugio", "ja": "シェルター・ウッズ"},
    "Suffocation Pit": {"pl": "Duszna Kopalnia", "de": "Grubenschacht", "es": "Pozo de Asfixia", "ja": "サファケーション・ピット"},
    "Fallen Refuge": {"pl": "Upadły Azyl", "de": "Gefallene Zuflucht", "es": "Refugio Caído", "ja": "落ちた避難所"},
    "Freddy Fazbears Pizza": {"pl": "Pizzeria Freddy Fazbear", "de": "Freddy Fazbear's Pizza", "es": "Freddy Fazbear's Pizza", "ja": "フレディファズベアーズピザ"},
    "Garden of Joy": {"pl": "Ogród Radości", "de": "Garten der Freude", "es": "Jardín de Dicha", "ja": "喜びの庭"},
    "Greenville Square": {"pl": "Plac Greenville", "de": "Hauptplatz von Greenville", "es": "Plaza de Greenville", "ja": "グリーンビル広場"},
    "Family Residence": {"pl": "Rezydencja Rodzinna", "de": "Familiensitz", "es": "Residencia Familiar", "ja": "ファミリー・レジデンス"},
    "Sanctum of Wrath": {"pl": "Sanktuarium Gniewu", "de": "Heiligtum des Zorns", "es": "Santuario de la Ira", "ja": "怒りの聖所"},
}


def main() -> None:
    with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["realms"] = {
        name: {"name": name, "translations": {lang: {"name": val} for lang, val in trans.items()}}
        for name, trans in REALMS.items()
    }
    data["maps"] = {
        name: {"name": name, "translations": {lang: {"name": val} for lang, val in trans.items()}}
        for name, trans in MAPS.items()
    }

    with open(TRANSLATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Added {len(REALMS)} realms and {len(MAPS)} maps to {TRANSLATIONS_FILE}")


if __name__ == "__main__":
    main()
