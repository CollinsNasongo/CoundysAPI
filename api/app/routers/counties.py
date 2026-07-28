from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, name_or_code_filter, paginate, pagination_params
from app.database import get_db
from app.models import ConstituencySummary, CountySummary
from app.schemas import ConstituencyRead, CountyRead, Page

router = APIRouter(prefix="/counties", tags=["counties"])


@router.get("", response_model=Page[CountyRead], summary="List / search counties")
def list_counties(
    q: str | None = Query(default=None, description="Search by county name or code"),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(CountySummary)
    if q:
        stmt = stmt.where(
            name_or_code_filter(
                q, code_col=CountySummary.county_code, name_col=CountySummary.county_name
            )
        )
    stmt = stmt.order_by(CountySummary.registered_voters.desc())
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get("/{county_code}", response_model=CountyRead, summary="Get one county")
def get_county(county_code: int, db: Session = Depends(get_db)) -> CountySummary:
    row = db.get(CountySummary, county_code)
    if row is None:
        raise HTTPException(status_code=404, detail="County not found")
    return row


@router.get(
    "/{county_code}/constituencies",
    response_model=Page[ConstituencyRead],
    summary="Constituencies in a county",
)
def county_constituencies(
    county_code: int,
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    if db.get(CountySummary, county_code) is None:
        raise HTTPException(status_code=404, detail="County not found")
    stmt = (
        select(ConstituencySummary)
        .where(ConstituencySummary.county_code == county_code)
        .order_by(ConstituencySummary.registered_voters.desc())
    )
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)
