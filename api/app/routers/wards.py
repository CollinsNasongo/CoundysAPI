from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, election_year_param, paginate, pagination_params
from app.database import get_db
from app.models import PollingStation, WardSummary
from app.schemas import Page, PollingStationRead, WardRead

router = APIRouter(prefix="/wards", tags=["wards"])


@router.get("", response_model=Page[WardRead], summary="List / search wards")
def list_wards(
    q: str | None = Query(default=None, description="Search by ward name"),
    constituency_name: str | None = Query(default=None, description="Filter by parent constituency name (partial match)"),
    county_code: int | None = Query(default=None, description="Filter by parent county code"),
    constituency_code: int | None = Query(default=None, description="Filter by parent constituency code"),
    codes: list[int] | None = Query(default=None, description="Only these ward codes (repeatable)"),
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(WardSummary).where(WardSummary.election_year == election_year)

    if codes:
        stmt = stmt.where(WardSummary.ward_code.in_(codes))

    if constituency_code is not None:
        stmt = stmt.where(WardSummary.constituency_code == constituency_code)

    if constituency_name:
        stmt = stmt.where(WardSummary.constituency_name.ilike(f"%{constituency_name}%"))

    if county_code is not None:
        stmt = stmt.where(WardSummary.county_code == county_code)

    if q:
        stmt = stmt.where(WardSummary.ward_name.ilike(f"%{q}%"))

    stmt = stmt.order_by(WardSummary.registered_voters.desc())
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get("/{ward_name}", response_model=list[WardRead], summary="Get ward(s) by name")
def get_ward(
    ward_name: str,
    constituency_name: str | None = Query(default=None, description="Disambiguate if multiple wards share this name"),
    county_code: int | None = Query(default=None, description="Disambiguate if multiple wards share this name"),
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
) -> list[WardSummary]:
    stmt = select(WardSummary).where(
        WardSummary.election_year == election_year,
        WardSummary.ward_name.ilike(ward_name),
    )
    if constituency_name:
        stmt = stmt.where(WardSummary.constituency_name.ilike(f"%{constituency_name}%"))
    if county_code is not None:
        stmt = stmt.where(WardSummary.county_code == county_code)

    rows = db.execute(stmt).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="Ward not found")
    return rows


@router.get(
    "/{ward_name}/polling-stations",
    response_model=Page[PollingStationRead],
    summary="Polling stations in a ward",
)
def ward_polling_stations(
    ward_name: str,
    constituency_name: str | None = Query(default=None, description="Disambiguate if multiple wards share this name"),
    county_code: int | None = Query(default=None, description="Disambiguate if multiple wards share this name"),
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    ward_stmt = select(WardSummary).where(
        WardSummary.election_year == election_year,
        WardSummary.ward_name.ilike(ward_name),
    )
    if constituency_name:
        ward_stmt = ward_stmt.where(WardSummary.constituency_name.ilike(f"%{constituency_name}%"))
    if county_code is not None:
        ward_stmt = ward_stmt.where(WardSummary.county_code == county_code)

    wards = db.execute(ward_stmt).scalars().all()
    if not wards:
        raise HTTPException(status_code=404, detail="Ward not found")
    if len(wards) > 1:
        raise HTTPException(
            status_code=409,
            detail="Multiple wards match this name; narrow with constituency_name or county_code",
        )

    ward_code = wards[0].ward_code
    stmt = (
        select(PollingStation)
        .where(
            PollingStation.election_year == election_year,
            PollingStation.ward_code == ward_code,
        )
        .order_by(PollingStation.polling_station_name)
    )
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)
