from collections.abc import Sequence

from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import col, select

from app.models import Spot
from app.schemas import SpotCreate, SpotOut
from app.security import CurrentUser, DbSession

router = APIRouter(prefix="/spots", tags=["spots"])


@router.get("", response_model=list[SpotOut])
def list_spots(user: CurrentUser, session: DbSession) -> Sequence[Spot]:
    return session.exec(
        select(Spot).where(Spot.user_id == user.id).order_by(col(Spot.created_at).desc(), col(Spot.id).desc())
    ).all()


@router.post("", response_model=SpotOut, status_code=status.HTTP_201_CREATED)
def create_spot(data: SpotCreate, user: CurrentUser, session: DbSession) -> Spot:
    assert user.id is not None
    spot = Spot(user_id=user.id, **data.model_dump())
    session.add(spot)
    session.commit()
    session.refresh(spot)
    return spot


@router.delete("/{spot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_spot(spot_id: int, user: CurrentUser, session: DbSession) -> Response:
    spot = session.get(Spot, spot_id)
    # 404 anche se il punto esiste ma è di un altro utente, per non rivelarne l'esistenza.
    if spot is None or spot.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Punto non trovato")
    session.delete(spot)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
