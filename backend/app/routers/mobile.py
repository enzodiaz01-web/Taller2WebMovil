import json
import re
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_optional_user
from app.models.game import Game
from app.models.library import LibraryEntry, LibraryStatus
from app.models.mobile import MobileEvent
from app.models.review import Review
from app.models.user import User
from app.schemas.mobile import MobileEventOut, ScanIn, ScanOut, ShakePickIn, ShakePickOut
from app.services.game_cards import build_game_cards

router = APIRouter(prefix="/mobile", tags=["mobile"])

GAME_PATTERN = re.compile(r"^(?:gamelock:game:|https?://[^/]+/games/|/games/)(\d+)/?$", re.IGNORECASE)
USER_PATTERN = re.compile(r"^(?:gamelock:user:|https?://[^/]+/u/|/u/)([A-Za-z0-9_.-]+)/?$", re.IGNORECASE)
REVIEW_PATTERN = re.compile(r"^(?:gamelock:review:|https?://[^/]+/reviews/|/reviews/)(\d+)/?$", re.IGNORECASE)


def _record_event(
    db: Session,
    user: User | None,
    event_type: str,
    payload_data: dict,
    latitude: float | None = None,
    longitude: float | None = None,
) -> MobileEvent:
    event = MobileEvent(
        user_id=user.id if user else None,
        event_type=event_type,
        payload=json.dumps(payload_data, ensure_ascii=False),
        latitude=latitude,
        longitude=longitude,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/scans", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
def process_scan(
    payload: ScanIn,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> ScanOut:
    raw = payload.code.strip()

    # 1. Check Game QR / URL
    m_game = GAME_PATTERN.match(raw)
    if m_game:
        game_id = int(m_game.group(1))
        cards = build_game_cards(db, [game_id])
        event = _record_event(
            db,
            current_user,
            "scan",
            {"code": raw, "format": payload.format, "resolved": f"game:{game_id}"},
            payload.latitude,
            payload.longitude,
        )
        if game_id in cards:
            return ScanOut(
                event_id=event.id,
                kind="game",
                route=f"/games/{game_id}",
                message=f"Juego encontrado: {cards[game_id].title}",
                game=cards[game_id],
            )
        return ScanOut(
            event_id=event.id,
            kind="unknown",
            message=f"No se encontró el juego con ID {game_id}",
        )

    # 2. Check User profile QR / URL
    m_user = USER_PATTERN.match(raw)
    if m_user:
        username = m_user.group(1)
        user = db.scalar(select(User).where(func.lower(User.username) == username.lower()))
        event = _record_event(
            db,
            current_user,
            "scan",
            {"code": raw, "format": payload.format, "resolved": f"user:{username}"},
            payload.latitude,
            payload.longitude,
        )
        if user:
            return ScanOut(
                event_id=event.id,
                kind="user",
                route=f"/u/{user.username}",
                message=f"Perfil encontrado: @{user.username}",
                username=user.username,
            )
        return ScanOut(
            event_id=event.id,
            kind="unknown",
            message=f"No se encontró el usuario @{username}",
        )

    # 3. Check Review QR / URL
    m_review = REVIEW_PATTERN.match(raw)
    if m_review:
        review_id = int(m_review.group(1))
        rev_exists = db.scalar(select(Review.id).where(Review.id == review_id))
        event = _record_event(
            db,
            current_user,
            "scan",
            {"code": raw, "format": payload.format, "resolved": f"review:{review_id}"},
            payload.latitude,
            payload.longitude,
        )
        if rev_exists:
            return ScanOut(
                event_id=event.id,
                kind="review",
                route=f"/reviews/{review_id}",
                message=f"Reseña #{review_id} encontrada",
                review_id=review_id,
            )
        return ScanOut(
            event_id=event.id,
            kind="unknown",
            message=f"No se encontró la reseña #{review_id}",
        )

    # 4. Pure numeric code (e.g. direct game ID, IGDB ID, or EAN/UPC barcode)
    if raw.isdigit():
        num = int(raw)
        matched_game = db.scalar(
            select(Game).where((Game.id == num) | (Game.igdb_id == num))
        )
        event = _record_event(
            db,
            current_user,
            "scan",
            {"code": raw, "format": payload.format, "resolved": "numeric"},
            payload.latitude,
            payload.longitude,
        )
        if matched_game:
            cards = build_game_cards(db, [matched_game.id])
            return ScanOut(
                event_id=event.id,
                kind="game",
                route=f"/games/{matched_game.id}",
                message=f"Juego identificado: {matched_game.title}",
                game=cards.get(matched_game.id),
            )
        # Barcode fallback: send user to catalog search with the scanned barcode
        return ScanOut(
            event_id=event.id,
            kind="search",
            route="/games",
            query=raw,
            message=f"Código de barras {raw} registrado. Buscando en el catálogo...",
        )

    # 5. Text / slug match in local catalog
    matched_by_title = db.scalar(
        select(Game).where(
            (func.lower(Game.slug) == raw.lower())
            | (Game.title.ilike(f"%{raw}%"))
        ).limit(1)
    )
    event = _record_event(
        db,
        current_user,
        "scan",
        {"code": raw, "format": payload.format, "resolved": "text"},
        payload.latitude,
        payload.longitude,
    )
    if matched_by_title:
        cards = build_game_cards(db, [matched_by_title.id])
        return ScanOut(
            event_id=event.id,
            kind="game",
            route=f"/games/{matched_by_title.id}",
            message=f"Juego encontrado: {matched_by_title.title}",
            game=cards.get(matched_by_title.id),
        )

    return ScanOut(
        event_id=event.id,
        kind="search",
        route="/games",
        query=raw,
        message=f"Buscando '{raw}' en Gamelock...",
    )


@router.post("/shake-pick", response_model=ShakePickOut, status_code=status.HTTP_201_CREATED)
def shake_pick_game(
    payload: ShakePickIn,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)],
) -> ShakePickOut:
    picked_game_id: int | None = None
    from_wishlist = False

    if current_user and payload.source in ("auto", "wishlist"):
        picked_game_id = db.scalar(
            select(LibraryEntry.game_id)
            .where(
                LibraryEntry.user_id == current_user.id,
                LibraryEntry.status == LibraryStatus.wishlist,
            )
            .order_by(func.random())
            .limit(1)
        )
        if picked_game_id is not None:
            from_wishlist = True

    if picked_game_id is None:
        if payload.source == "wishlist":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tu lista de deseos está vacía",
            )
        picked_game_id = db.scalar(
            select(Game.id).order_by(func.random()).limit(1)
        )

    if picked_game_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay juegos disponibles en el catálogo",
        )

    cards = build_game_cards(db, [picked_game_id])
    game_card = cards[picked_game_id]

    event = _record_event(
        db,
        current_user,
        "shake_pick",
        {
            "magnitude": round(payload.magnitude, 2),
            "source": "wishlist" if from_wishlist else "catalog",
            "game_id": picked_game_id,
            "game_title": game_card.title,
        },
        payload.latitude,
        payload.longitude,
    )

    msg = (
        f"Elegido de tu lista de deseos: {game_card.title}"
        if from_wishlist
        else f"Recomendación del catálogo: {game_card.title}"
    )

    return ShakePickOut(
        event_id=event.id,
        game=game_card,
        from_wishlist=from_wishlist,
        message=msg,
    )


@router.get("/activity", response_model=list[MobileEventOut])
def get_mobile_activity(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=20, ge=1, le=50),
) -> list[MobileEventOut]:
    events = db.scalars(
        select(MobileEvent)
        .where(MobileEvent.user_id == current_user.id)
        .order_by(MobileEvent.created_at.desc(), MobileEvent.id.desc())
        .limit(limit)
    ).all()
    return [MobileEventOut.model_validate(e) for e in events]
