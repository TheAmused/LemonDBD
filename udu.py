import os
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
AVATARS_DIR = os.path.join(ROOT_DIR, "backend", "app", "static", "avatars")
KILLERS_DIR = os.path.join(AVATARS_DIR, "killers")
SURVIVORS_DIR = os.path.join(AVATARS_DIR, "survivors")
ROSTERS_DIR = os.path.join(AVATARS_DIR, "rosters")

CHECKLIST_DATA = [
    # ========================== KILLERS ==========================
    {"role": "Killer", "slug": "naughty_bear", "name": "Naughty Bear", "base": "The Trapper", "target": "backend/app/static/avatars/killers/naughty_bear.webp"},
    {"role": "Killer", "slug": "minotaur", "name": "The Minotaur", "base": "The Oni", "target": "backend/app/static/avatars/killers/minotaur.webp"},
    {"role": "Killer", "slug": "william_birkin", "name": "William Birkin", "base": "The Blight", "target": "backend/app/static/avatars/killers/william_birkin.webp"},
    {"role": "Killer", "slug": "hunk", "name": "HUNK (Grim Reaper)", "base": "The Legion", "target": "backend/app/static/avatars/killers/hunk.webp"},
    {"role": "Killer", "slug": "baba_yaga", "name": "Baba Yaga", "base": "The Huntress", "target": "backend/app/static/avatars/killers/baba_yaga.webp"},
    {"role": "Killer", "slug": "the_look_see", "name": "The Look-See", "base": "The Doctor", "target": "backend/app/static/avatars/killers/the_look_see.webp"},
    {"role": "Killer", "slug": "tiffany_valentine", "name": "Tiffany Valentine", "base": "The Good Guy (Chucky)", "target": "backend/app/static/avatars/killers/tiffany_valentine.webp"},
    {"role": "Killer", "slug": "chatterer", "name": "Chatterer Cenobite", "base": "The Cenobite", "target": "backend/app/static/avatars/killers/chatterer.webp"},
    {"role": "Killer", "slug": "attack_titan", "name": "Attack Titan (Eren)", "base": "The Trapper", "target": "backend/app/static/avatars/killers/attack_titan.webp"},
    {"role": "Killer", "slug": "armored_titan", "name": "Armored Titan", "base": "The Oni", "target": "backend/app/static/avatars/killers/armored_titan.webp"},
    {"role": "Killer", "slug": "war_hammer_titan", "name": "War Hammer Titan", "base": "The Spirit", "target": "backend/app/static/avatars/killers/war_hammer_titan.webp"},
    {"role": "Killer", "slug": "samurai_eddie", "name": "Samurai Eddie", "base": "The Oni (Iron Maiden)", "target": "backend/app/static/avatars/killers/samurai_eddie.webp"},
    {"role": "Killer", "slug": "were_elk", "name": "The Were-Elk", "base": "The Huntress", "target": "backend/app/static/avatars/killers/were_elk.webp"},
    {"role": "Killer", "slug": "xenomorph_queen", "name": "Xenomorph Queen", "base": "The Xenomorph", "target": "backend/app/static/avatars/killers/xenomorph_queen.webp"},
    {"role": "Killer", "slug": "leshen", "name": "The Leshen", "base": "The Artist (The Witcher)", "target": "backend/app/static/avatars/killers/leshen.webp"},
    {"role": "Killer", "slug": "rize_kamishiro", "name": "Rize Kamishiro", "base": "The Ghoul (Tokyo Ghoul)", "target": "backend/app/static/avatars/killers/rize_kamishiro.webp"},
    {"role": "Killer", "slug": "yellow_rabbit", "name": "The Yellow Rabbit", "base": "The Animatronic (FNAF)", "target": "backend/app/static/avatars/killers/yellow_rabbit.webp"},
    {"role": "Killer", "slug": "glitchtrap", "name": "Glitchtrap", "base": "The Animatronic (FNAF)", "target": "backend/app/static/avatars/killers/glitchtrap.webp"},
    {"role": "Killer", "slug": "henry_creel", "name": "Henry Creel (001)", "base": "The First / Vecna", "target": "backend/app/static/avatars/killers/henry_creel.webp"},
    {"role": "Killer", "slug": "true_form_dracula", "name": "True Form Dracula", "base": "The Dark Lord", "target": "backend/app/static/avatars/killers/true_form_dracula.webp"},
    {"role": "Killer", "slug": "mina", "name": "MiNA", "base": "The Trickster", "target": "backend/app/static/avatars/killers/mina.webp"},
    {"role": "Killer", "slug": "tomie_kawakami", "name": "Tomie Kawakami", "base": "The Spirit (Junji Ito)", "target": "backend/app/static/avatars/killers/tomie_kawakami.webp"},
    {"role": "Killer", "slug": "jabberwock", "name": "The Jabberwock", "base": "The Artist", "target": "backend/app/static/avatars/killers/jabberwock.webp"},
    {"role": "Killer", "slug": "murderous_grizzly", "name": "Murderous Grizzly", "base": "The Oni", "target": "backend/app/static/avatars/killers/murderous_grizzly.webp"},

    # ========================== SURVIVORS ==========================
    {"role": "Survivor", "slug": "geralt_of_rivia", "name": "Geralt of Rivia", "base": "Vittorio Toscano (The Witcher)", "target": "backend/app/static/avatars/survivors/geralt_of_rivia.webp"},
    {"role": "Survivor", "slug": "alucard", "name": "Alucard", "base": "Trevor Belmont (Castlevania)", "target": "backend/app/static/avatars/survivors/alucard.webp"},
    {"role": "Survivor", "slug": "soma_cruz", "name": "Soma Cruz", "base": "Trevor Belmont (Castlevania)", "target": "backend/app/static/avatars/survivors/soma_cruz.webp"},
    {"role": "Survivor", "slug": "richter_belmont", "name": "Richter Belmont", "base": "Trevor Belmont (Castlevania)", "target": "backend/app/static/avatars/survivors/richter_belmont.webp"},
    {"role": "Survivor", "slug": "chris_redfield", "name": "Chris Redfield", "base": "Leon S. Kennedy (Resident Evil)", "target": "backend/app/static/avatars/survivors/chris_redfield.webp"},
    {"role": "Survivor", "slug": "carlos_oliveira", "name": "Carlos Oliveira", "base": "Leon S. Kennedy (Resident Evil)", "target": "backend/app/static/avatars/survivors/carlos_oliveira.webp"},
    {"role": "Survivor", "slug": "claire_redfield", "name": "Claire Redfield", "base": "Jill Valentine (Resident Evil)", "target": "backend/app/static/avatars/survivors/claire_redfield.webp"},
    {"role": "Survivor", "slug": "sheva_alomar", "name": "Sheva Alomar", "base": "Jill Valentine (Resident Evil)", "target": "backend/app/static/avatars/survivors/sheva_alomar.webp"},
    {"role": "Survivor", "slug": "james_sunderland", "name": "James Sunderland", "base": "Cheryl Mason (Silent Hill)", "target": "backend/app/static/avatars/survivors/james_sunderland.webp"},
    {"role": "Survivor", "slug": "maria", "name": "Maria", "base": "Cheryl Mason (Silent Hill)", "target": "backend/app/static/avatars/survivors/maria.webp"},
    {"role": "Survivor", "slug": "cybil_bennett", "name": "Cybil Bennett", "base": "Cheryl Mason (Silent Hill)", "target": "backend/app/static/avatars/survivors/cybil_bennett.webp"},
    {"role": "Survivor", "slug": "lisa_garland", "name": "Lisa Garland", "base": "Cheryl Mason (Silent Hill)", "target": "backend/app/static/avatars/survivors/lisa_garland.webp"},
    {"role": "Survivor", "slug": "tubarao", "name": "Tubarão", "base": "Renato Lyra (R6 Siege)", "target": "backend/app/static/avatars/survivors/tubarao.webp"},
    {"role": "Survivor", "slug": "saga_anderson", "name": "Saga Anderson", "base": "Alan Wake", "target": "backend/app/static/avatars/survivors/saga_anderson.webp"},
    {"role": "Survivor", "slug": "rose_marigold", "name": "Rose Marigold", "base": "Alan Wake", "target": "backend/app/static/avatars/survivors/rose_marigold.webp"},
    {"role": "Survivor", "slug": "rain_carradine", "name": "Rain Carradine", "base": "Ellen Ripley (Alien: Romulus)", "target": "backend/app/static/avatars/survivors/rain_carradine.webp"},
    {"role": "Survivor", "slug": "william_hudson", "name": "William Hudson", "base": "Ellen Ripley (Aliens)", "target": "backend/app/static/avatars/survivors/william_hudson.webp"},
    {"role": "Survivor", "slug": "daryl_dixon", "name": "Daryl Dixon", "base": "Rick Grimes (The Walking Dead)", "target": "backend/app/static/avatars/survivors/daryl_dixon.webp"},
    {"role": "Survivor", "slug": "glenn_rhee", "name": "Glenn Rhee", "base": "Rick Grimes (The Walking Dead)", "target": "backend/app/static/avatars/survivors/glenn_rhee.webp"},
    {"role": "Survivor", "slug": "maggie_rhee", "name": "Maggie Rhee", "base": "Michonne (The Walking Dead)", "target": "backend/app/static/avatars/survivors/maggie_rhee.webp"},
    {"role": "Survivor", "slug": "jonathan_byers", "name": "Jonathan Byers", "base": "Steve Harrington (Stranger Things)", "target": "backend/app/static/avatars/survivors/jonathan_byers.webp"},
    {"role": "Survivor", "slug": "robin_buckley", "name": "Robin Buckley", "base": "Nancy Wheeler (Stranger Things)", "target": "backend/app/static/avatars/survivors/robin_buckley.webp"},
    {"role": "Survivor", "slug": "eddie_munson", "name": "Eddie Munson", "base": "Dustin Henderson (Stranger Things)", "target": "backend/app/static/avatars/survivors/eddie_munson.webp"},
    {"role": "Survivor", "slug": "forest_guide", "name": "Forest Guide", "base": "Yui Kimura", "target": "backend/app/static/avatars/survivors/forest_guide.webp"},
    {"role": "Survivor", "slug": "hinako_shimizu", "name": "Hinako Shimizu", "base": "Cheryl Mason (Silent Hill f)", "target": "backend/app/static/avatars/survivors/hinako_shimizu.webp"},
]


def wipe_directory(dir_path: str, preserve: list[str] = None):
    """Usuwa wszystkie pliki z podanego katalogu z opcjonalnym zachowaniem wybranych."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
        return

    preserve = preserve or []
    deleted_count = 0
    for item in os.listdir(dir_path):
        item_path = os.path.join(dir_path, item)
        if item in preserve:
            continue
        try:
            if os.path.isfile(item_path) or os.path.islink(item_path):
                os.remove(item_path)
                deleted_count += 1
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
                deleted_count += 1
        except Exception as e:
            print(f"⚠️ Nie udało się usunąć {item_path}: {e}")

    print(f"🧹 Wyczyszczono: {dir_path} (usunięto {deleted_count} plików/folderów)")


def export_markdown_checklist(filepath: str):
    """Zapisuje kompletną listę postaci do pliku Markdown."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("# Dead by Daylight – Lista postaci do pobrania\n\n")
        f.write("| Rola | Slug | Nazwa postaci | Baza w DBD | Ścieżka docelowa pliku |\n")
        f.write("| :--- | :--- | :------------ | :--------- | :--------------------- |\n")
        for item in CHECKLIST_DATA:
            f.write(f"| {item['role']} | `{item['slug']}` | **{item['name']}** | {item['base']} | `{item['target']}` |\n")
    print(f"📄 Wygenerowano plik checklisty: {filepath}")


def main():
    print("=" * 70)
    print("🔥 SKRYPT CZYSZCZENIA FOLDERU ASSETÓW LEMONDBD")
    print(f"📂 Folder bazowy: {AVATARS_DIR}")
    print("=" * 70)

    choice = input("Czy chcesz zachować dobre pliki (naughty_bear.webp i minotaur.webp)? [T/n]: ").strip().lower()
    preserve = ["naughty_bear.webp", "minotaur.webp"] if choice != "n" else []

    wipe_directory(KILLERS_DIR, preserve=preserve)
    wipe_directory(SURVIVORS_DIR, preserve=[])
    os.makedirs(ROSTERS_DIR, exist_ok=True)

    print("=" * 70)
    print("📋 PEŁNA LISTA POSTACI DO POBRANIA:")
    print("=" * 70)

    current_role = ""
    for item in CHECKLIST_DATA:
        if item["role"] != current_role:
            current_role = item["role"]
            print(f"\n--- {current_role.upper()}S ({sum(1 for x in CHECKLIST_DATA if x['role'] == current_role)}) ---")
        print(f"• [{item['slug']:<18}] {item['name']:<24} (Baza: {item['base']:<30}) -> {item['target']}")

    checklist_md_path = os.path.join(ROOT_DIR, "characters_checklist.md")
    export_markdown_checklist(checklist_md_path)

    print("\n" + "=" * 70)
    print("✨ Foldery są puste i gotowe na właściwe grafiki.")
    print("=" * 70)


if __name__ == "__main__":
    main()