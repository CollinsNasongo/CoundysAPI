from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, name_or_code_filter, paginate, pagination_params
from app.database import get_db
from app.models import PollingStation
from app.schemas import Page, PollingStationRead

router = APIRouter(prefix="/polling-stations", tags=["polling-stations"])


@router.get("", response_model=Page[PollingStationRead], summary="List / search polling stations")
def list_polling_stations(
    q: str | None = Query(default=None, description="Search by station name or code"),
    ward_code: int | None = Query(default=None),
    constituency_code: int | None = Query(default=None),
    county_code: int | None = Query(default=None),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(PollingStation)
    if ward_code is not None:
        stmt = stmt.where(PollingStation.ward_code == ward_code)
    if constituency_code is not None:
        stmt = stmt.where(PollingStation.constituency_code == constituency_code)
    if county_code is not None:
        stmt = stmt.where(PollingStation.county_code == county_code)
    if q:
        stmt = stmt.where(
            name_or_code_filter(
                q,
                code_col=PollingStation.polling_station_code,
                name_col=PollingStation.polling_station_name,
            )
        )
    stmt = stmt.order_by(PollingStation.polling_station_name)
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get(
    "/{polling_station_id}",
    response_model=PollingStationRead,
    summary="Get one polling station",
)
def get_polling_station(polling_station_id: int, db: Session = Depends(get_db)) -> PollingStation:
    row = db.get(PollingStation, polling_station_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Polling station not found")
    return row
