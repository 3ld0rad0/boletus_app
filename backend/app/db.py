from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine


def create_db_engine(url: str) -> Engine:
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


def init_db(engine: Engine) -> None:
    # Importa i modelli per registrarli nei metadata prima di creare le tabelle.
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as session:
        yield session
