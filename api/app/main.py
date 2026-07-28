from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    constituencies,
    counties,
    national,
    polling_stations,
    wards,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    docs_url="/docs",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_methods=["GET"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["health"], summary="Liveness probe")
def health() -> dict[str, str]:
    return {"status": "ok"}


for r in (national, counties, constituencies, wards, polling_stations):
    app.include_router(r.router, prefix=settings.API_PREFIX)
