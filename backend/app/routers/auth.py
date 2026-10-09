from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.config import Settings
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, Token, UserOut
from app.security import (
    CurrentUser,
    DbSession,
    create_access_token,
    get_settings,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, session: DbSession) -> User:
    if session.exec(select(User).where(User.email == data.email)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email già registrata")
    user = User(email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email già registrata") from None
    session.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    data: LoginRequest,
    session: DbSession,
    settings: Annotated[Settings, Depends(get_settings)],
) -> Token:
    user = session.exec(select(User).where(User.email == data.email)).first()
    valid = verify_password(data.password, user.password_hash if user else None)
    if user is None or user.id is None or not valid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email o password non validi")
    return Token(access_token=create_access_token(user.id, settings))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
