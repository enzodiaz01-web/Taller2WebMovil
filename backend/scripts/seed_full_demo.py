import sys
from pathlib import Path
from datetime import date, datetime, timezone
import random

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models.game import Game, Genre
from app.models.user import User
from app.models.library import LibraryEntry, LibraryStatus
from app.services.security import hash_password
from scripts.seed_demo import seed_demo_data

GAMES_DATA = [
    {
        "title": "The Legend of Zelda: Breath of the Wild",
        "slug": "the-legend-of-zelda-breath-of-the-wild",
        "genres": ["Action", "Adventure", "RPG"],
        "rating": 4.9,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.png",
        "desc": "Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild."
    },
    {
        "title": "Elden Ring",
        "slug": "elden-ring",
        "genres": ["RPG", "Action"],
        "rating": 4.8,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.png",
        "desc": "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between."
    },
    {
        "title": "Cyberpunk 2077",
        "slug": "cyberpunk-2077",
        "genres": ["RPG", "Action", "Shooter"],
        "rating": 4.3,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co71h9.png",
        "desc": "An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification."
    },
    {
        "title": "The Witcher 3: Wild Hunt",
        "slug": "the-witcher-3-wild-hunt",
        "genres": ["RPG", "Adventure", "Action"],
        "rating": 4.9,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.png",
        "desc": "As war rages on throughout the Northern Realms, you take on the greatest contract of your life — tracking down the Child of Prophecy."
    },
    {
        "title": "God of War Ragnarök",
        "slug": "god-of-war-ragnarok",
        "genres": ["Action", "Adventure"],
        "rating": 4.8,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.png",
        "desc": "Kratos and Atreus must journey to each of the Nine Realms in search of answers as Asgardian forces prepare for a prophesied battle."
    },
    {
        "title": "Hades",
        "slug": "hades",
        "genres": ["Action", "Indie", "RPG"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r76.png",
        "desc": "Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion."
    },
    {
        "title": "Hollow Knight",
        "slug": "hollow-knight",
        "genres": ["Platformer", "Action", "Indie"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rba.png",
        "desc": "Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes."
    },
    {
        "title": "Red Dead Redemption 2",
        "slug": "red-dead-redemption-2",
        "genres": ["Action", "Adventure", "Shooter"],
        "rating": 4.9,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.png",
        "desc": "America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run in the rugged heartland of America."
    },
    {
        "title": "Baldur's Gate 3",
        "slug": "baldurs-gate-3",
        "genres": ["RPG", "Strategy", "Adventure"],
        "rating": 4.9,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.png",
        "desc": "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power."
    },
    {
        "title": "Minecraft",
        "slug": "minecraft",
        "genres": ["Adventure", "Indie", "Simulation"],
        "rating": 4.5,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co49x5.png",
        "desc": "Explore randomly generated worlds and build amazing things from the simplest of homes to the grandest of castles."
    },
    {
        "title": "Super Mario Odyssey",
        "slug": "super-mario-odyssey",
        "genres": ["Platformer", "Adventure"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1m5a.png",
        "desc": "Embark on a captivating, globe-trotting adventure with Mario and his new ally Cappy."
    },
    {
        "title": "Persona 5 Royal",
        "slug": "persona-5-royal",
        "genres": ["RPG"],
        "rating": 4.8,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1nic.png",
        "desc": "Don the mask of Joker and join the Phantom Thieves of Hearts as you break the chains of modern society."
    },
    {
        "title": "Grand Theft Auto V",
        "slug": "grand-theft-auto-v",
        "genres": ["Action", "Shooter", "Adventure"],
        "rating": 4.6,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co29t4.png",
        "desc": "When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with the criminal underworld."
    },
    {
        "title": "Celeste",
        "slug": "celeste",
        "genres": ["Platformer", "Indie"],
        "rating": 4.6,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1t22.png",
        "desc": "Help Madeline survive her inner demons on her journey to the top of Celeste Mountain, in this super-tight platformer."
    },
    {
        "title": "Disco Elysium",
        "slug": "disco-elysium",
        "genres": ["RPG", "Indie"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1sfk.png",
        "desc": "A groundbreaking open world role playing game. You're a detective with a unique skill system at your disposal."
    },
    {
        "title": "Ghost of Tsushima",
        "slug": "ghost-of-tsushima",
        "genres": ["Action", "Adventure"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2crj.png",
        "desc": "In the late 13th century, the Mongol empire has laid waste to entire nations along their campaign to conquer the East."
    },
    {
        "title": "Monster Hunter: World",
        "slug": "monster-hunter-world",
        "genres": ["Action", "RPG"],
        "rating": 4.5,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1m35.png",
        "desc": "Welcome to a new world! In Monster Hunter: World, the latest installment in the series, you can enjoy the ultimate hunting experience."
    },
    {
        "title": "Stardew Valley",
        "slug": "stardew-valley",
        "genres": ["Simulation", "RPG", "Indie"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/xrpmydnu9rnxvvgqi88e.png",
        "desc": "You've inherited your grandfather's old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins."
    },
    {
        "title": "Sekiro: Shadows Die Twice",
        "slug": "sekiro-shadows-die-twice",
        "genres": ["Action", "Adventure"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1qm8.png",
        "desc": "Carve your own clever path to vengeance in the critically acclaimed adventure from developer FromSoftware."
    },
    {
        "title": "Resident Evil 4",
        "slug": "resident-evil-4-remake",
        "genres": ["Action", "Shooter"],
        "rating": 4.8,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co5w3d.png",
        "desc": "Survival is only the beginning. Six years have passed since the biological disaster in Raccoon City."
    },
    {
        "title": "Dark Souls III",
        "slug": "dark-souls-iii",
        "genres": ["Action", "RPG"],
        "rating": 4.6,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1vce.png",
        "desc": "As fires fade and the world falls into ruin, developer FROMSOFTWARE and director Hidetaka Miyazaki continue their critically-acclaimed series."
    },
    {
        "title": "Bloodborne",
        "slug": "bloodborne",
        "genres": ["Action", "RPG"],
        "rating": 4.8,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rba.png",
        "desc": "Face your fears as you search for answers in the ancient city of Yharnam, now cursed with a strange endemic illness."
    },
    {
        "title": "Marvel's Spider-Man Remastered",
        "slug": "marvels-spider-man-remastered",
        "genres": ["Action", "Adventure"],
        "rating": 4.6,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co20au.png",
        "desc": "In Marvel’s Spider-Man Remastered, the worlds of Peter Parker and Spider-Man collide in an original action-packed story."
    },
    {
        "title": "Sea of Stars",
        "slug": "sea-of-stars",
        "genres": ["RPG", "Indie"],
        "rating": 4.5,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co6q55.png",
        "desc": "Sea of Stars is a turn-based RPG inspired by the classics. It tells the story of two Children of the Solstice."
    },
    {
        "title": "Metroid Dread",
        "slug": "metroid-dread",
        "genres": ["Platformer", "Action", "Adventure"],
        "rating": 4.5,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co390b.png",
        "desc": "Join intergalactic bounty hunter Samus Aran in her first new 2D Metroid story in 19 years."
    },
    {
        "title": "Death Stranding",
        "slug": "death-stranding",
        "genres": ["Action", "Adventure"],
        "rating": 4.3,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.png",
        "desc": "From legendary game creator Hideo Kojima comes an all-new, genre-defying experience."
    },
    {
        "title": "Horizon Zero Dawn",
        "slug": "horizon-zero-dawn",
        "genres": ["Action", "RPG", "Adventure"],
        "rating": 4.6,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rba.png",
        "desc": "Experience Aloy’s entire legendary quest to unravel the mysteries of a world ruled by deadly Machines."
    },
    {
        "title": "Ori and the Will of the Wisps",
        "slug": "ori-and-the-will-of-the-wisps",
        "genres": ["Platformer", "Adventure"],
        "rating": 4.6,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1nl7.png",
        "desc": "Play the critically acclaimed masterpiece. Embark on a new journey in a vast, exotic world."
    },
    {
        "title": "Portal 2",
        "slug": "portal-2",
        "genres": ["Shooter", "Platformer"],
        "rating": 4.9,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs4.png",
        "desc": "The Perpetual Testing Initiative has been expanded to allow you to design co-op puzzles for you and your friends!"
    },
    {
        "title": "Chrono Trigger",
        "slug": "chrono-trigger",
        "genres": ["RPG"],
        "rating": 4.9,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2k9u.png",
        "desc": "When a newly developed teleportation device malfunctions, young Crono must travel through time to rescue his companion."
    },
    {
        "title": "Final Fantasy VII Rebirth",
        "slug": "final-fantasy-vii-rebirth",
        "genres": ["RPG", "Action"],
        "rating": 4.7,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co72f3.png",
        "desc": "The Unknown Journey Continues... After escaping from the dystopian city of Midgar, Cloud and his friends set out on a journey."
    },
    {
        "title": "Mass Effect Legendary Edition",
        "slug": "mass-effect-legendary-edition",
        "genres": ["RPG", "Shooter"],
        "rating": 4.8,
        "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2t01.png",
        "desc": "The Mass Effect Legendary Edition includes single-player base content and over 40 DLC from Mass Effect, Mass Effect 2, and Mass Effect 3."
    }
]

def seed_database():
    with SessionLocal() as db:
        print("Checking genres and games...")
        genre_cache = {}
        for g_data in GAMES_DATA:
            for g_name in g_data["genres"]:
                slug = g_name.lower().replace(" ", "-")
                if slug not in genre_cache:
                    existing = db.query(Genre).filter_by(slug=slug).first()
                    if not existing:
                        existing = Genre(name=g_name, slug=slug)
                        db.add(existing)
                        db.flush()
                    genre_cache[slug] = existing

        igdb_base = 200000
        created_games = []
        for i, g_data in enumerate(GAMES_DATA, 1):
            existing = db.query(Game).filter_by(slug=g_data["slug"]).first()
            if not existing:
                game_genres_objs = [genre_cache[g_name.lower().replace(" ", "-")] for g_name in g_data["genres"]]
                existing = Game(
                    igdb_id=igdb_base + i,
                    title=g_data["title"],
                    slug=g_data["slug"],
                    cover_url=g_data["cover"],
                    background_url=g_data["cover"],
                    description=g_data["desc"],
                    release_date=date(2020 + (i % 4), (i % 12) + 1, (i % 28) + 1),
                    platforms=["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X"],
                    igdb_rating=g_data["rating"],
                    genres=game_genres_objs
                )
                db.add(existing)
                db.flush()
            created_games.append(existing)
        db.commit()
        print(f"Total games in DB: {len(created_games)}")

        # Run demo seeding for users, reviews, comments
        print("Seeding demo data (users, reviews, comments)...")
        seed_demo_data(db, password="demo_password_123", min_games=30, reset=False)

        # Create main demo user
        demo_user = db.query(User).filter_by(email="demo@gamelock.app").first()
        if not demo_user:
            demo_user = User(
                username="demo",
                email="demo@gamelock.app",
                password_hash=hash_password("demo_password_123"),
                created_at=datetime.now(timezone.utc)
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print("Created main demo user: demo@gamelock.app")

        # Ensure demo user has games in wishlist for Shake to Pick
        existing_entries = db.query(LibraryEntry).filter_by(user_id=demo_user.id).count()
        if existing_entries == 0:
            for g in created_games[:8]:
                db.add(LibraryEntry(
                    user_id=demo_user.id,
                    game_id=g.id,
                    status=LibraryStatus.wishlist,
                    updated_at=datetime.now(timezone.utc)
                ))
            for g in created_games[8:12]:
                db.add(LibraryEntry(
                    user_id=demo_user.id,
                    game_id=g.id,
                    status=LibraryStatus.playing,
                    updated_at=datetime.now(timezone.utc)
                ))
            db.commit()
            print("Populated demo user library entries (wishlist + playing).")

    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
