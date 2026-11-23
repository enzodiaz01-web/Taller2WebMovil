from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.game import GameCard


class ScanIn(BaseModel):
    code: str = Field(min_length=1, max_length=500)
    format: str = Field(default="QR_CODE", max_length=50)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)


class ScanOut(BaseModel):
    event_id: int
    kind: Literal["game", "user", "review", "search", "unknown"]
    route: str | None = None
    message: str
    game: GameCard | None = None
    username: str | None = None
    review_id: int | None = None
    query: str | None = None


class ShakePickIn(BaseModel):
    magnitude: float = Field(default=0.0, ge=0.0, le=1000.0)
    source: Literal["wishlist", "catalog", "auto"] = "auto"
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)


class ShakePickOut(BaseModel):
    event_id: int
    game: GameCard
    from_wishlist: bool
    message: str


class MobileEventOut(BaseModel):
    id: int
    event_type: str
    payload: str | None
    latitude: float | None
    longitude: float | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
