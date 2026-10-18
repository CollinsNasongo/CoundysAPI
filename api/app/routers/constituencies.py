from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, election_year_param, paginate, pagination_params
from app.database import get_db
from app.models import ConstituencySummary, WardSummary
from app.schemas import ConstituencyRead, Page, WardRead

router = APIRouter(prefix="/constituencies", tags=["constituencies"])


@router.get("", response_model=Page[ConstituencyRead], summary="List / search constituencies")
def list_constituencies(
    q: str | None = Query(default=None, description="Search by constituency name"),
    county_code: int | None = Query(default=None, description="Filter by parent county"),
    codes: list[int] | None = Query(default=None, description="Only these constituency codes (repeatable)"),
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    stmt = select(ConstituencySummary).where(
        ConstituencySummary.election_year == election_year
    )
    if codes:
        stmt = stmt.where(ConstituencySummary.constituency_code.in_(codes))
    if county_code is not None:
        stmt = stmt.where(ConstituencySummary.county_code == county_code)
    if q:
        stmt = stmt.where(ConstituencySummary.constituency_name.ilike(f"%{q}%"))
    stmt = stmt.order_by(ConstituencySummary.registered_voters.desc())
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.get(
    "/{constituency_name}",
    response_model=list[ConstituencyRead],
    summary="Get constituency(ies) by name",
)
def get_constituency(
    constituency_name: str,
    county_code: int | None = Query(default=None, description="Disambiguate if multiple constituencies share this name"),
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
) -> list[ConstituencySummary]:
    stmt = select(ConstituencySummary).where(
        ConstituencySummary.election_year == election_year,
        ConstituencySummary.constituency_name.ilike(constituency_name),
    )
    if county_code is not None:
        stmt = stmt.where(ConstituencySummary.county_code == county_code)

    rows = db.execute(stmt).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="Constituency not found")
    return rows


@router.get(
    "/{constituency_name}/wards",
    response_model=Page[WardRead],
    summary="Wards in a constituency",
)
def constituency_wards(
    constituency_name: str,
    county_code: int | None = Query(default=None, description="Disambiguate if multiple constituencies share this name"),
    election_year: int = Depends(election_year_param),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    const_stmt = select(ConstituencySummary).where(
        ConstituencySummary.election_year == election_year,
        ConstituencySummary.constituency_name.ilike(constituency_name),
    )
    if county_code is not None:
        const_stmt = const_stmt.where(ConstituencySummary.county_code == county_code)

    constituencies = db.execute(const_stmt).scalars().all()
    if not constituencies:
        raise HTTPException(status_code=404, detail="Constituency not found")
    if len(constituencies) > 1:
        raise HTTPException(
            status_code=409,
            detail="Multiple constituencies match this name; narrow with county_code",
        )

    constituency_code = constituencies[0].constituency_code
    stmt = (
        select(WardSummary)
        .where(
            WardSummary.election_year == election_year,
            WardSummary.constituency_code == constituency_code,
        )
        .order_by(WardSummary.registered_voters.desc())
    )
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)
