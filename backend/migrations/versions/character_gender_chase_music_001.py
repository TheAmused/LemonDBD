# backend/migrations/versions/character_gender_chase_music_001.py
"""add gender, emoji_riddle, and chase_music columns directly to character models

Revision ID: character_gender_chase_music_001
Revises: minigames_001
Create Date: 2026-09-29 00:00:00.000000

Idempotent: inspects existing columns before adding.
"""
from alembic import op
import sqlalchemy as sa

revision = "character_gender_chase_music_001"
down_revision = "minigames_001"
branch_labels = None
depends_on = None

# Canon data mappings for database population
SURVIVOR_DATA = {
    # Female survivors
    "Meg Thomas": ("female", "Average", "🏃‍♀️ 👟 💨"),
    "Claudette Morel": ("female", "Average", "🌿 🩹 🧪"),
    "Nea Karlsson": ("female", "Average", "🛹 🎨 🐱"),
    "Laurie Strode": ("female", "Average", "🔪 🎃 🩸"),
    "Feng Min": ("female", "Average", "🎮 🎧 ⚡"),
    "Kate Denson": ("female", "Average", "🎸 🕊️ 🎶"),
    "Jane Romero": ("female", "Average", "🎙️ 📺 👠"),
    "Nancy Wheeler": ("female", "Average", "📰 🔦 🚲"),
    "Yui Kimura": ("female", "Average", "🏍️ 🏁 🛡️"),
    "Zarina Kassir": ("female", "Average", "🎥 🎙️ 🕯️"),
    "Cheryl Mason": ("female", "Average", "📻 🪞 ✝️"),
    "Élodie Rakoto": ("female", "Average", "🗝️ 📜 💎"),
    "Elodie Rakoto": ("female", "Average", "🗝️ 📜 💎"),
    "Lee Yun-jin": ("female", "Average", "🎤 💎 🕶️"),
    "Yun-Jin Lee": ("female", "Average", "🎤 💎 🕶️"),
    "Jill Valentine": ("female", "Average", "🧟‍♀️ 🔫 🌟"),
    "Mikaela Reid": ("female", "Average", "🧙‍♀️ 🕯️ 🔮"),
    "Haddie Kaur": ("female", "Average", "🎙️ 👻 🔦"),
    "Ada Wong": ("female", "Average", "🕶️ 👠 🔫"),
    "Rebecca Chambers": ("female", "Average", "💊 🩹 🚑"),
    "Thalita Lyra": ("female", "Average", "🪁 🏖️ 🏃‍♀️"),
    "Ellen Ripley": ("female", "Average", "👽 🐱 🚀"),
    "Sable Ward": ("female", "Average", "🕯️ 🖤 📖"),
    "Lara Croft": ("female", "Average", "🏹 🧗‍♀️ 🏺"),
    "Taurie Cain": ("female", "Average", "🗡️ 🏛️ 🌑"),
    "Orela Rose": ("female", "Average", "🌹 📜 🕯️"),
    "Michonne Grimes": ("female", "Average", "🗡️ 🧟 ⛓️"),
    "Vee Boonyasak": ("female", "Average", "🎬 🎥 🏙️"),
    "Eleven": ("female", "Average", "🧇 🩸 🧠"),
    "Aurora Stardotter": ("female", "Average", "✨ 🌌 🔭"),
    # Male survivors
    "Dwight Fairfield": ("male", "Average", "👔 👓 📦"),
    "Jake Park": ("male", "Average", "🪓 🌲 🦅"),
    "Ace Visconti": ("male", "Average", "🎰 🎲 🃏"),
    "Bill Overbeck": ("male", "Average", "🚬 🎖️ 🧟"),
    "David King": ("male", "Average", "🥊 🍺 💥"),
    "Quentin Smith": ("male", "Average", "💊 😴 ☕"),
    "David Tapp": ("male", "Average", "👮 🔍 ⏱️"),
    "Detective Tapp": ("male", "Average", "👮 🔍 ⏱️"),
    "Adam Francis": ("male", "Average", "🎒 👓 🪨"),
    "Jeff Johansen": ("male", "Average", "🎨 🎸 🐕"),
    "Ash Williams": ("male", "Average", "🪚 🦾 📖"),
    "Steve Harrington": ("male", "Average", "🍦 🏏 🧒"),
    "Felix Richter": ("male", "Average", "📐 🏛️ 👔"),
    "Leon Scott Kennedy": ("male", "Average", "👮‍♂️ 🔫 🧟"),
    "Leon S. Kennedy": ("male", "Average", "👮‍♂️ 🔫 🧟"),
    "Jonah Vasquez": ("male", "Average", "💻 📡 🧮"),
    "Yoichi Asakawa": ("male", "Average", "🌊 📼 🧭"),
    "Vittorio Toscano": ("male", "Average", "📜 🔮 🗝️"),
    "Renato Lyra": ("male", "Average", "🪁 🏖️ 🏃‍♂️"),
    "Gabriel Soma": ("male", "Average", "🚀 🔧 🧬"),
    "Nicolas Cage": ("male", "Average", "🎬 🏆 🕶️"),
    "Alan Wake": ("male", "Average", "🔦 📖 ☕"),
    "The Troupe": ("male", "Average", "🎭 🪕 🎲"),
    "Trevor Belmont": ("male", "Average", "⚔️ 🦇 🏰"),
    "Rick Grimes": ("male", "Average", "🤠 🔫 🧟"),
    "Dustin Henderson": ("male", "Average", "📻 🧢 🚲"),
    "Kwon Tae-young": ("male", "Average", "🎤 🏙️ 🕶️"),
    "Shane Wiigwaas": ("male", "Average", "🌲 🛶 🏕️"),
}

KILLER_DATA = {
    "The Trapper": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default01.ogg/TerrorRadius_Default01.ogg.mp3", "🐻 ⚙️ 🩸"),
    "The Wraith": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default02.ogg/TerrorRadius_Default02.ogg.mp3", "🔔 👻 🌲"),
    "The Hillbilly": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Hillbilly.ogg/TerrorRadius_Hillbilly.ogg.mp3", "🪚 🏃 ⚡"),
    "The Nurse": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Nurse.ogg/TerrorRadius_Nurse.ogg.mp3", "👁️ 💨 🏥"),
    "The Shape": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Shape.ogg/TerrorRadius_Shape.ogg.mp3", "🔪 🎃 👥"),
    "The Hag": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Hag.ogg/TerrorRadius_Hag.ogg.mp3", "✋ 🌾 🪞"),
    "The Doctor": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Doctor.ogg/TerrorRadius_Doctor.ogg.mp3", "⚡ 🧠 💉"),
    "The Huntress": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/Huntress_Lullaby.ogg/Huntress_Lullaby.ogg.mp3", "🪓 🎶 🐰"),
    "The Cannibal": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default03.ogg/TerrorRadius_Default03.ogg.mp3", "🍖 🪚 👨"),
    "The Nightmare": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/Nightmare_Lullaby.ogg/Nightmare_Lullaby.ogg.mp3", "😴 🧤 🕒"),
    "The Pig": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default04.ogg/TerrorRadius_Default04.ogg.mp3", "🐷 ⏱️ 🗝️"),
    "The Clown": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Clown.ogg/TerrorRadius_Clown.ogg.mp3", "🎪 🍾 💨"),
    "The Spirit": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Spirit.ogg/TerrorRadius_Spirit.ogg.mp3", "🗡️ 👘 👻"),
    "The Legion": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Legion.ogg/TerrorRadius_Legion.ogg.mp3", "🔪 🏃 🎭"),
    "The Plague": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default05.ogg/TerrorRadius_Default05.ogg.mp3", "🤢 🤮 🏛️"),
    "The Ghost Face": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_GhostFace.ogg/TerrorRadius_GhostFace.ogg.mp3", "📸 🔪 👻"),
    "The Demogorgon": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Demogorgon.ogg/TerrorRadius_Demogorgon.ogg.mp3", "🌺 🌀 🐕"),
    "The Oni": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Oni.ogg/TerrorRadius_Oni.ogg.mp3", "👹 🩸 🔨"),
    "The Deathslinger": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Deathslinger.ogg/TerrorRadius_Deathslinger.ogg.mp3", "🤠 🔫 ⛓️"),
    "The Executioner": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Executioner.ogg/TerrorRadius_Executioner.ogg.mp3", "🗡️ 📐 ⛓️"),
    "The Blight": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Blight.ogg/TerrorRadius_Blight.ogg.mp3", "🧪 💥 🏃"),
    "The Twins": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/Twins_Lullaby.ogg/Twins_Lullaby.ogg.mp3", "👶 🧰 💔"),
    "The Trickster": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/Trickster_Lullaby.ogg/Trickster_Lullaby.ogg.mp3", "🔪 🎤 🦇"),
    "The Nemesis": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Nemesis.ogg/TerrorRadius_Nemesis.ogg.mp3", "🧟 💉 👊"),
    "The Cenobite": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Cenobite.ogg/TerrorRadius_Cenobite.ogg.mp3", "📦 ⛓️ 🪡"),
    "The Artist": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Artist.ogg/TerrorRadius_Artist.ogg.mp3", "🐦 🎨 ✒️"),
    "The Onryō": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/Onry%C5%8D_Lullaby.ogg/Onry%C5%8D_Lullaby.ogg.mp3", "📺 📼 👁️"),
    "The Dredge": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Dredge.ogg/TerrorRadius_Dredge.ogg.mp3", "🚪 ☁️ 🦃"),
    "The Mastermind": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Mastermind.ogg/TerrorRadius_Mastermind.ogg.mp3", "🕶️ 🦠 💥"),
    "The Knight": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Knight.ogg/TerrorRadius_Knight.ogg.mp3", "🛡️ ⚔️ 🏰"),
    "The Skull Merchant": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_SkullMerchant.ogg/TerrorRadius_SkullMerchant.ogg.mp3", "🚁 💻 👁️"),
    "The Singularity": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Singularity.ogg/TerrorRadius_Singularity.ogg.mp3", "🤖 📹 🧬"),
    "The Xenomorph": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Xenomorph.ogg/TerrorRadius_Xenomorph.ogg.mp3", "👽 🛸 🐾"),
    "The Good Guy": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_GoodGuy.ogg/TerrorRadius_GoodGuy.ogg.mp3", "🔪 🧸 👟"),
    "The Unknown": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Unknown.ogg/TerrorRadius_Unknown.ogg.mp3", "🪓 🗣️ 🕳️"),
    "The Lich": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Lich.ogg/TerrorRadius_Lich.ogg.mp3", "💀 🪄 🎲"),
    "The Dark Lord": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/Dark_Lord_Lullaby.ogg/Dark_Lord_Lullaby.ogg.mp3", "🧛 🦇 🐺"),
    "The Houndmaster": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Houndmaster.ogg/TerrorRadius_Houndmaster.ogg.mp3", "🐕 🍖 🏹"),
    "The Ghoul": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default01.ogg/TerrorRadius_Default01.ogg.mp3", "👁️ 🩸 💀"),
    "The Animatronic": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default02.ogg/TerrorRadius_Default02.ogg.mp3", "🤖 🍕 🔪"),
    "The Krasue": ("female", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default03.ogg/TerrorRadius_Default03.ogg.mp3", "👻 🩸 🌾"),
    "The First": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default04.ogg/TerrorRadius_Default04.ogg.mp3", "👁️ 🌌 🌑"),
    "The Slasher": ("male", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default05.ogg/TerrorRadius_Default05.ogg.mp3", "🔪 🩸 🏕️"),
    "The Judgment": ("monster_other", "https://deadbydaylight.wiki.gg/images/transcoded/TerrorRadius_Default06.ogg/TerrorRadius_Default06.ogg.mp3", "⚖️ ⚡ 💀"),
}


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    survivor_cols = {c["name"] for c in inspector.get_columns("survivors")}
    killer_cols = {c["name"] for c in inspector.get_columns("killers")}

    # 1. Add columns to survivors
    if "gender" not in survivor_cols:
        op.add_column("survivors", sa.Column("gender", sa.String(length=32), nullable=True))
    if "height" not in survivor_cols:
        op.add_column("survivors", sa.Column("height", sa.String(length=20), nullable=True, server_default="Average"))
    if "emoji_riddle" not in survivor_cols:
        op.add_column("survivors", sa.Column("emoji_riddle", sa.String(length=64), nullable=True))

    # 2. Add columns to killers
    if "gender" not in killer_cols:
        op.add_column("killers", sa.Column("gender", sa.String(length=32), nullable=True))
    if "emoji_riddle" not in killer_cols:
        op.add_column("killers", sa.Column("emoji_riddle", sa.String(length=64), nullable=True))
    if "chase_music_url" not in killer_cols:
        op.add_column("killers", sa.Column("chase_music_url", sa.String(length=500), nullable=True))
    if "chase_music_local_path" not in killer_cols:
        op.add_column("killers", sa.Column("chase_music_local_path", sa.String(length=255), nullable=True))

    # 3. Populate survivors
    for s_name, (s_gender, s_height, s_emoji) in SURVIVOR_DATA.items():
        bind.execute(
            sa.text(
                "UPDATE survivors SET gender = :gender, height = :height, emoji_riddle = :emoji "
                "WHERE name = :name"
            ),
            {"gender": s_gender, "height": s_height, "emoji": s_emoji, "name": s_name}
        )

    # 4. Populate killers
    for k_name, (k_gender, k_music, k_emoji) in KILLER_DATA.items():
        bind.execute(
            sa.text(
                "UPDATE killers SET gender = :gender, chase_music_url = :music, emoji_riddle = :emoji "
                "WHERE name = :name"
            ),
            {"gender": k_gender, "music": k_music, "emoji": k_emoji, "name": k_name}
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    survivor_cols = {c["name"] for c in inspector.get_columns("survivors")}
    killer_cols = {c["name"] for c in inspector.get_columns("killers")}

    if "chase_music_local_path" in killer_cols:
        op.drop_column("killers", "chase_music_local_path")
    if "chase_music_url" in killer_cols:
        op.drop_column("killers", "chase_music_url")
    if "emoji_riddle" in killer_cols:
        op.drop_column("killers", "emoji_riddle")
    if "gender" in killer_cols:
        op.drop_column("killers", "gender")

    if "emoji_riddle" in survivor_cols:
        op.drop_column("survivors", "emoji_riddle")
    if "height" in survivor_cols:
        op.drop_column("survivors", "height")
    if "gender" in survivor_cols:
        op.drop_column("survivors", "gender")
