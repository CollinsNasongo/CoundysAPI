"""Shared query helpers: pagination + name-or-code search."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Query
from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.config import settings


@dataclass
class Pagination:
    limit: int
    offset: int


def pagination_params(
    limit: int = Query(default=settings.DEFAULT_PAGE_SIZE, ge=1, le=settings.MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
) -> Pagination:
    return Pagination(limit=limit, offset=offset)


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
    # Plain LIKE: SQL Server's default collation is case-INsensitive, so this
    # matches regardless of case AND stays sargable (uses IX_*_name). Wrapping
    # the column in lower()/ilike would force a scan. If your DB uses a
    # case-SENSITIVE collation, switch to name_col.ilike(...) or add a
    # normalized lower-cased column to index instead.
    return name_col.like(f"{q}%")


def paginate(db: Session, stmt: Select, page: Pagination) -> tuple[list, int]:
    """Run a SELECT with total count + limit/offset.

    SQL Server requires an ORDER BY when OFFSET/FETCH is used; callers must
    apply .order_by(...) before passing the statement in.
    """
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.limit(page.limit).offset(page.offset)).all())
    return items, total
