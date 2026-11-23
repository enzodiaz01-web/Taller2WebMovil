from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.library import LibraryEntry, LibraryStatus
from app.models.user import User
from app.services.security import create_access_token, hash_password


def _seed_user_and_games(db: Session) -> tuple[User, str, list[Game]]:
    user = User(
        username="mobilegamer",
        email="mobile@example.com",
        password_hash=hash_password("strongpass123"),
    )
    db.add(user)
    g1 = Game(igdb_id=5001, slug="hades", title="Hades", igdb_rating=92.0)
    g2 = Game(igdb_id=5002, slug="celeste", title="Celeste", igdb_rating=90.0)
    db.add_all([g1, g2])
    db.commit()
    db.refresh(user)
    db.refresh(g1)
    db.refresh(g2)
    token = create_access_token(user.id)
    return user, token, [g1, g2]


def test_review_with_gps_location(client: TestClient, db_session: Session) -> None:
    _, token, games = _seed_user_and_games(db_session)
    game = games[0]

    resp = client.post(
        f"/api/games/{game.id}/reviews",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "score": 9,
            "body": "Jugado desde la universidad",
            "latitude": -29.9667,
            "longitude": -71.3436,
            "location_label": "Coquimbo, CL",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["latitude"] == -29.9667
    assert data["longitude"] == -71.3436
    assert data["location_label"] == "Coquimbo, CL"

    detail = client.get(f"/api/reviews/{data['id']}")
    assert detail.status_code == 200
    assert detail.json()["location_label"] == "Coquimbo, CL"


def test_mobile_scan_game_user_and_barcode(client: TestClient, db_session: Session) -> None:
    user, token, games = _seed_user_and_games(db_session)
    game = games[0]

    # 1. Scan Gamelock Game QR
    r1 = client.post(
        "/api/mobile/scans",
        headers={"Authorization": f"Bearer {token}"},
        json={"code": f"gamelock:game:{game.id}", "format": "QR_CODE", "latitude": -33.45, "longitude": -70.66},
    )
    assert r1.status_code == 201
    d1 = r1.json()
    assert d1["kind"] == "game"
    assert d1["route"] == f"/games/{game.id}"
    assert d1["game"]["title"] == "Hades"

    # 2. Scan User Profile QR
    r2 = client.post(
        "/api/mobile/scans",
        headers={"Authorization": f"Bearer {token}"},
        json={"code": f"gamelock:user:{user.username}", "format": "QR_CODE"},
    )
    assert r2.status_code == 201
    d2 = r2.json()
    assert d2["kind"] == "user"
    assert d2["route"] == f"/u/{user.username}"

    # 3. Scan physical EAN barcode (unknown locally -> search)
    r3 = client.post(
        "/api/mobile/scans",
        json={"code": "0045496590420", "format": "EAN_13"},
    )
    assert r3.status_code == 201
    d3 = r3.json()
    assert d3["kind"] == "search"
    assert d3["query"] == "0045496590420"


def test_mobile_shake_pick_wishlist_and_activity(client: TestClient, db_session: Session) -> None:
    user, token, games = _seed_user_and_games(db_session)
    db_session.add(LibraryEntry(user_id=user.id, game_id=games[1].id, status=LibraryStatus.wishlist))
    db_session.commit()

    resp = client.post(
        "/api/mobile/shake-pick",
        headers={"Authorization": f"Bearer {token}"},
        json={"magnitude": 19.4, "source": "auto"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["from_wishlist"] is True
    assert data["game"]["id"] == games[1].id

    act = client.get("/api/mobile/activity", headers={"Authorization": f"Bearer {token}"})
    assert act.status_code == 200
    events = act.json()
    assert len(events) == 1
    assert events[0]["event_type"] == "shake_pick"
