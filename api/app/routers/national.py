from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NationalSummary
from app.schemas import NationalSummaryRead

router = APIRouter(prefix="/national", tags=["national"])


@router.get("", response_model=NationalSummaryRead, summary="National KPI summary")
def get_national(db: Session = Depends(get_db)) -> NationalSummary:
    row = db.scalar(select(NationalSummary).where(NationalSummary.id == 1))
    if row is None:
        raise HTTPException(status_code=404, detail="National summary not loaded")
    return row
