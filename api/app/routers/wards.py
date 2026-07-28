from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, name_or_code_filter, paginate, pagination_params
from app.database import get_db
from app.models import PollingStation, WardSummary
from app.schemas import Page, PollingStationRead, WardRead

router = APIRouter(prefix="/wards", tags=["wards"])


@router.get("", response_model=Page[WardRead], summary="List / search wards")
def list_wards(
    q: str | None = Query(default=None, description="Search by ward name or code"),
    constituency_code: int | None = Query(default=None, description="Filter by parent constituency"),
    county_code: int | None = Query(default=None, description="Filter by parent county"),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(WardSummary)
    if constituency_code is not None:
        stmt = stmt.where(WardSummary.constituency_code == constituency_code)
    if county_code is not None:
        stmt = stmt.where(WardSummary.county_code == county_code)
    if q:
        stmt = stmt.where(
            name_or_code_filter(
                q, code_col=WardSummary.ward_code, name_col=WardSummary.ward_name
            )
        )
    stmt = stmt.order_by(WardSummary.registered_voters.desc())
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get("/{ward_code}", response_model=WardRead, summary="Get one ward")
def get_ward(ward_code: int, db: Session = Depends(get_db)) -> WardSummary:
    row = db.get(WardSummary, ward_code)
    if row is None:
        raise HTTPException(status_code=404, detail="Ward not found")
    return row


@router.get(
    "/{ward_code}/polling-stations",
    response_model=Page[PollingStationRead],
    summary="Polling stations in a ward",
)
def ward_polling_stations(
    ward_code: int,
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    if db.get(WardSummary, ward_code) is None:
        raise HTTPException(status_code=404, detail="Ward not found")
    stmt = (
        select(PollingStation)
        .where(PollingStation.ward_code == ward_code)
        .order_by(PollingStation.polling_station_name)
    )
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)
