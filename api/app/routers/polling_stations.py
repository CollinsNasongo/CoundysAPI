from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, paginate, pagination_params
from app.database import get_db
from app.models import PollingStation
from app.schemas import Page, PollingStationRead

router = APIRouter(prefix="/polling-stations", tags=["polling-stations"])


@router.get("", response_model=Page[PollingStationRead], summary="List / search polling stations")
def list_polling_stations(
    q: str | None = Query(default=None, description="Search by station name"),
    ward_name: str | None = Query(default=None, description="Filter by parent ward name (partial match)"),
    constituency_name: str | None = Query(default=None, description="Filter by parent constituency name (partial match)"),
    county_code: int | None = Query(default=None, description="Filter by parent county code"),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(PollingStation)

    if ward_name:
        stmt = stmt.where(PollingStation.ward_name.ilike(f"%{ward_name}%"))
    if constituency_name:
        stmt = stmt.where(PollingStation.constituency_name.ilike(f"%{constituency_name}%"))
    if county_code is not None:
        stmt = stmt.where(PollingStation.county_code == county_code)
    if q:
        stmt = stmt.where(PollingStation.polling_station_name.ilike(f"%{q}%"))

    stmt = stmt.order_by(PollingStation.polling_station_name)
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get(
    "/{polling_station_name}",
    response_model=list[PollingStationRead],
    summary="Get polling station(s) by name",
)
def get_polling_station(
    polling_station_name: str,
    ward_name: str | None = Query(default=None, description="Disambiguate if multiple stations share this name"),
    constituency_name: str | None = Query(default=None, description="Disambiguate if multiple stations share this name"),
    county_code: int | None = Query(default=None, description="Disambiguate if multiple stations share this name"),
    db: Session = Depends(get_db),
) -> list[PollingStation]:
    stmt = select(PollingStation).where(
        PollingStation.polling_station_name.ilike(polling_station_name)
    )
    if ward_name:
        stmt = stmt.where(PollingStation.ward_name.ilike(f"%{ward_name}%"))
    if constituency_name:
        stmt = stmt.where(PollingStation.constituency_name.ilike(f"%{constituency_name}%"))
    if county_code is not None:
        stmt = stmt.where(PollingStation.county_code == county_code)

    rows = db.execute(stmt).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="Polling station not found")
    return rows