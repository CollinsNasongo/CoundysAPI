from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import election_year_param
from app.database import get_db
from app.models import NationalSummary
from app.schemas import NationalSummaryRead

router = APIRouter(prefix="/national", tags=["national"])


@router.get("", response_model=NationalSummaryRead, summary="National KPI summary")
def get_national(
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
) -> NationalSummary:
    row = db.scalar(
        select(NationalSummary).where(NationalSummary.election_year == election_year)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="National summary not loaded")
    return row


@router.get("/years", response_model=list[int], summary="Election years available")
def list_election_years(db: Session = Depends(get_db)) -> list[int]:
    stmt = select(NationalSummary.election_year).order_by(
        NationalSummary.election_year.desc()
    )
    return list(db.scalars(stmt).all())
