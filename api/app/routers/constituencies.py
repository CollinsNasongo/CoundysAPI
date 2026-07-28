from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, name_or_code_filter, paginate, pagination_params
from app.database import get_db
from app.models import ConstituencySummary, WardSummary
from app.schemas import ConstituencyRead, Page, WardRead

router = APIRouter(prefix="/constituencies", tags=["constituencies"])


@router.get("", response_model=Page[ConstituencyRead], summary="List / search constituencies")
def list_constituencies(
    q: str | None = Query(default=None, description="Search by constituency name or code"),
    county_code: int | None = Query(default=None, description="Filter by parent county"),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(ConstituencySummary)
    if county_code is not None:
        stmt = stmt.where(ConstituencySummary.county_code == county_code)
    if q:
        stmt = stmt.where(
            name_or_code_filter(
                q,
                code_col=ConstituencySummary.constituency_code,
                name_col=ConstituencySummary.constituency_name,
            )
        )
    stmt = stmt.order_by(ConstituencySummary.registered_voters.desc())
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get("/{constituency_code}", response_model=ConstituencyRead, summary="Get one constituency")
def get_constituency(constituency_code: int, db: Session = Depends(get_db)) -> ConstituencySummary:
    row = db.get(ConstituencySummary, constituency_code)
    if row is None:
        raise HTTPException(status_code=404, detail="Constituency not found")
    return row


@router.get(
    "/{constituency_code}/wards",
    response_model=Page[WardRead],
    summary="Wards in a constituency",
)
def constituency_wards(
    constituency_code: int,
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    if db.get(ConstituencySummary, constituency_code) is None:
        raise HTTPException(status_code=404, detail="Constituency not found")
    stmt = (
        select(WardSummary)
        .where(WardSummary.constituency_code == constituency_code)
        .order_by(WardSummary.registered_voters.desc())
    )
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)
