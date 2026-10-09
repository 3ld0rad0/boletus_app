from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(max_length=254, unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=utcnow)


class Spot(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=100)
    kind: str = Field(max_length=10)
    lat: float
    lon: float
    created_at: datetime = Field(default_factory=utcnow)
