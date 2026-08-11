from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common import Pagination, name_or_code_filter, paginate, pagination_params
from app.database import get_db
from app.models import ConstituencySummary, CountySummary
from app.schemas import ConstituencyRead, CountyRead, Page

router = APIRouter(prefix="/counties", tags=["counties"])


def _resolve_county(identifier: str, db: Session) -> list[CountySummary]:
    """Look up counties by exact code (numeric) or name search (same semantics as list_counties)."""
    stmt = select(CountySummary).where(
        name_or_code_filter(
            identifier, code_col=CountySummary.county_code, name_col=CountySummary.county_name
        )
    )
    return list(db.execute(stmt).scalars().all())


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


@router.get(
    "/{identifier}",
    response_model=CountyRead | list[CountyRead],
    summary="Get county by exact code, or search by name",
)
def get_county(identifier: str, db: Session = Depends(get_db)) -> CountySummary | list[CountySummary]:
    rows = _resolve_county(identifier, db)
    if not rows:
        raise HTTPException(status_code=404, detail="County not found")
    if identifier.strip().isdigit():
        return rows[0]
    return rows


@router.get(
    "/{identifier}/constituencies",
    response_model=Page[ConstituencyRead],
    summary="Constituencies in a county",
)
def county_constituencies(
    identifier: str,
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination_params),
) -> Page:
    counties = _resolve_county(identifier, db)
    if not counties:
        raise HTTPException(status_code=404, detail="County not found")
    if len(counties) > 1:
        raise HTTPException(
            status_code=409,
            detail="Multiple counties match this name; use the county code instead",
        )

    county_code = counties[0].county_code
    stmt = (
        select(ConstituencySummary)
        .where(ConstituencySummary.county_code == county_code)
        .order_by(ConstituencySummary.registered_voters.desc())
    )
    items, total = paginate(db, stmt, page)
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)