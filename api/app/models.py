"""ORM models mapped to the existing gold tables (read-only)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.config import settings
from app.database import Base

_SCHEMA = {"schema": settings.GOLD_SCHEMA}


class NationalSummary(Base):
    __tablename__ = "national_summary"
    __table_args__ = _SCHEMA

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    total_counties: Mapped[int] = mapped_column(Integer)
    total_constituencies: Mapped[int] = mapped_column(Integer)
    total_wards: Mapped[int] = mapped_column(Integer)
    total_polling_stations: Mapped[int] = mapped_column(Integer)
    total_registered_voters: Mapped[int] = mapped_column(BigInteger)
    avg_voters_per_station: Mapped[int] = mapped_column(Integer)
    min_voters_per_station: Mapped[int] = mapped_column(Integer)
    max_voters_per_station: Mapped[int] = mapped_column(Integer)
    avg_voters_per_county: Mapped[int] = mapped_column(Integer)
    generated_at: Mapped[datetime] = mapped_column(DateTime)


class CountySummary(Base):
    __tablename__ = "county_summary"
    __table_args__ = _SCHEMA

    county_code: Mapped[int] = mapped_column(Integer, primary_key=True)
    county_name: Mapped[str] = mapped_column(String(100))
    constituency_count: Mapped[int] = mapped_column(Integer)
    ward_count: Mapped[int] = mapped_column(Integer)
    polling_station_count: Mapped[int] = mapped_column(Integer)
    registered_voters: Mapped[int] = mapped_column(BigInteger)
    pct_of_national_voters: Mapped[float] = mapped_column(Numeric(7, 4))
    national_voter_rank: Mapped[int] = mapped_column(Integer)
    avg_voters_per_station: Mapped[int] = mapped_column(Integer)
    generated_at: Mapped[datetime] = mapped_column(DateTime)


class ConstituencySummary(Base):
    __tablename__ = "constituency_summary"
    __table_args__ = _SCHEMA

    constituency_code: Mapped[int] = mapped_column(Integer, primary_key=True)
    constituency_name: Mapped[str] = mapped_column(String(150))
    county_code: Mapped[int] = mapped_column(Integer, index=True)
    county_name: Mapped[str] = mapped_column(String(100))
    ward_count: Mapped[int] = mapped_column(Integer)
    polling_station_count: Mapped[int] = mapped_column(Integer)
    registered_voters: Mapped[int] = mapped_column(BigInteger)
    pct_of_county_voters: Mapped[float] = mapped_column(Numeric(7, 4))
    rank_in_county: Mapped[int] = mapped_column(Integer)
    avg_voters_per_station: Mapped[int] = mapped_column(Integer)
    generated_at: Mapped[datetime] = mapped_column(DateTime)


class WardSummary(Base):
    __tablename__ = "ward_summary"
    __table_args__ = _SCHEMA

    ward_code: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_name: Mapped[str] = mapped_column(String(150))
    constituency_code: Mapped[int] = mapped_column(Integer, index=True)
    constituency_name: Mapped[str] = mapped_column(String(150))
    county_code: Mapped[int] = mapped_column(Integer, index=True)
    county_name: Mapped[str] = mapped_column(String(100))
    polling_station_count: Mapped[int] = mapped_column(Integer)
    registered_voters: Mapped[int] = mapped_column(BigInteger)
    pct_of_constituency_voters: Mapped[float] = mapped_column(Numeric(7, 4))
    rank_in_constituency: Mapped[int] = mapped_column(Integer)
    avg_voters_per_station: Mapped[int] = mapped_column(Integer)
    generated_at: Mapped[datetime] = mapped_column(DateTime)


class PollingStation(Base):
    __tablename__ = "polling_station"
    __table_args__ = _SCHEMA

    polling_station_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    polling_station_code: Mapped[int] = mapped_column(BigInteger, index=True)
    polling_station_seq: Mapped[int] = mapped_column(Integer)
    polling_station_name: Mapped[str] = mapped_column(String(250))
    ward_code: Mapped[int] = mapped_column(Integer, index=True)
    ward_name: Mapped[str] = mapped_column(String(150))
    constituency_code: Mapped[int] = mapped_column(Integer, index=True)
    constituency_name: Mapped[str] = mapped_column(String(150))
    county_code: Mapped[int] = mapped_column(Integer, index=True)
    county_name: Mapped[str] = mapped_column(String(100))
    registered_voters: Mapped[int] = mapped_column(Integer)
    pct_of_national_voters: Mapped[float] = mapped_column(Numeric(9, 6))
    generated_at: Mapped[datetime] = mapped_column(DateTime)