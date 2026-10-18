"""Settings loaded from environment / .env (validated at startup)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Registered Voters Per Polling Station"
    API_PREFIX: str = "/api/v1"
    GOLD_SCHEMA: str = "coundys_gold"
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_ECHO: bool = False
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 200
    BACKEND_CORS_ORIGINS: list[str] = []


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
