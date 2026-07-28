from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class NationalSummaryRead(ORMModel):
    total_counties: int
    total_constituencies: int
    total_wards: int
    total_polling_stations: int
    total_registered_voters: int
    avg_voters_per_station: int
    min_voters_per_station: int
    max_voters_per_station: int
    avg_voters_per_county: int
    generated_at: datetime


class CountyRead(ORMModel):
    county_code: int
    county_name: str
    constituency_count: int
    ward_count: int
    polling_station_count: int
    registered_voters: int
    pct_of_national_voters: float
    national_voter_rank: int
    avg_voters_per_station: int


class ConstituencyRead(ORMModel):
    constituency_code: int
    constituency_name: str
    county_code: int
    county_name: str
    ward_count: int
    polling_station_count: int
    registered_voters: int
    pct_of_county_voters: float
    rank_in_county: int
    avg_voters_per_station: int


class WardRead(ORMModel):
    ward_code: int
    ward_name: str
    constituency_code: int
    constituency_name: str
    county_code: int
    county_name: str
    polling_station_count: int
    registered_voters: int
    pct_of_constituency_voters: float
    rank_in_constituency: int
    avg_voters_per_station: int


class PollingStationRead(ORMModel):
    polling_station_id: int
    polling_station_code: int
    polling_station_seq: int
    polling_station_name: str
    ward_code: int
    ward_name: str
    constituency_code: int
    constituency_name: str
    county_code: int
    county_name: str
    registered_voters: int
    pct_of_national_voters: float