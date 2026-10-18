"""Shared query helpers: pagination + name-or-code search."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Query
from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.config import settings
from app.database import get_db
from app.models import NationalSummary


@dataclass
class Pagination:
    limit: int
    offset: int


def pagination_params(
    limit: int = Query(default=settings.DEFAULT_PAGE_SIZE, ge=1, le=settings.MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
) -> Pagination:
    return Pagination(limit=limit, offset=offset)


def election_year_param(
    election_year: int | None = Query(
        default=None,
        description="Election year (e.g. 2017, 2022). Defaults to the latest loaded year.",
    ),
    db: Session = Depends(get_db),
) -> int:
    """Resolve the requested election year, defaulting to the latest one loaded.

    national_summary has exactly one row per loaded year, so it doubles as the
    list of valid years.
    """
    if election_year is None:
        latest = db.scalar(select(func.max(NationalSummary.election_year)))
        if latest is None:
            raise HTTPException(status_code=404, detail="No election data loaded")
        return latest

    exists = db.scalar(
        select(NationalSummary.election_year).where(
            NationalSummary.election_year == election_year
        )
    )
    if exists is None:
        raise HTTPException(
            status_code=404, detail=f"No data for election year {election_year}"
        )
    return election_year


def name_or_code_filter(
    q: str,
    *,
    code_col: InstrumentedAttribute,
    name_col: InstrumentedAttribute,
) -> ColumnElement[bool]:
    """Build a WHERE predicate that searches by code or name from one box.

    - all-digit input  -> exact code match
    - otherwise        -> case-insensitive PREFIX match on name (sargable;
                          uses the IX_*_name indexes). Change to f"%{q}%" for
                          contains-search at the cost of an index scan.
    """
    q = q.strip()
    if q.isdigit():
        return code_col == int(q)
    return name_col.like(f"{q}%")


def paginate(db: Session, stmt: Select, page: Pagination) -> tuple[list, int]:
    """Run a SELECT with total count + limit/offset.

    SQL Server requires an ORDER BY when OFFSET/FETCH is used; callers must
    apply .order_by(...) before passing the statement in.
    """
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.limit(page.limit).offset(page.offset)).all())
    return items, total
