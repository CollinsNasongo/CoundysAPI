# Coundys
A REST API and dashboard for Kenya's registered voter data from the **2017 and 2022 General Elections**.

Coundys transforms the IEBC's registered-voters-per-polling-station PDFs into a searchable API, making it easy to retrieve and compare registered voter counts from the national level down to individual polling stations.

## Features

- 🇰🇪 National voter summary per election year
- 🏛️ Counties
- 🗳️ Constituencies
- 📍 Wards
- 🏫 Polling stations
- 👥 Registered voter counts for 2017 and 2022
- 📊 Interactive dashboard: overview and year-on-year comparisons
- 📖 OpenAPI 3.1 documentation

## Links

| | |
|---|---|
| Dashboard | https://coundys.co.ke |
| Swagger UI | https://coundys.co.ke/docs |
| ReDoc | https://coundys.co.ke/redoc |
| OpenAPI spec | https://coundys.co.ke/api/v1/openapi.json |

## Using the API

Every data endpoint takes an optional `election_year` query parameter. When it is left out, the latest loaded year (currently 2022) is used. An unknown year returns `404`.

```http
GET /api/v1/national/years                          # years available, newest first
GET /api/v1/national?election_year=2017

GET /api/v1/counties                                # sorted by registered voters
GET /api/v1/counties?q=nairobi                      # search by name prefix or code
GET /api/v1/counties/047
GET /api/v1/counties/047/constituencies?election_year=2017

GET /api/v1/constituencies?county_code=1
GET /api/v1/wards?constituency_code=278
GET /api/v1/wards?codes=1&codes=2                   # specific areas (repeatable)

GET /api/v1/wards/Kilimani/polling-stations
GET /api/v1/polling-stations?q=Moi%20Avenue&county_code=47
```

List endpoints are paginated with `limit` (default 50, max 200) and `offset`, and return `{ items, total, limit, offset }`.

## Dashboard

`frontend/` is a React + Vite dashboard (County Electorate Explorer) built on the API:

- **Overview**: national totals for the selected year, change since the previous election, and the top 10 counties.
- **Compare**: pick up to 8 counties, constituencies or wards and compare them across two election years. You can narrow the picker to one county or constituency.

Local development (expects the API on `http://localhost:8000`; override with `API_PROXY_TARGET`):

```bash
cd frontend
npm install
npm run dev
```

## Running with Docker

The whole stack runs with Docker Compose:

| Service | Role |
|---|---|
| `postgres` | Database (bronze, silver, gold schemas) |
| `etl` | Loads the CSVs and builds the silver and gold layers, then exits |
| `api` | FastAPI app on port 8000 (internal) |
| `frontend` | Built dashboard; forwards `/api/`, `/docs`, `/redoc` and `/health` to the API |
| `nginx`, `certbot` | Public HTTPS entry point and certificate renewal |

1. Create `.env` in the repository root with at least `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST=postgres`, `POSTGRES_PORT`, `DATABASE_URL`, `CERTBOT_EMAIL` and `DOMAIN`. `BACKEND_CORS_ORIGINS` is optional; if set, it must be a JSON list such as `["https://example.com"]`.
2. Add an nginx site config in `nginx/` (git-ignored) that terminates HTTPS and proxies `/` to `http://frontend:80`.
3. Start the stack:

```bash
make up        # docker compose up -d
make rebuild   # after pulling new code; keeps the database
make reset     # rebuild from scratch, including a fresh database volume
```

Use `make reset` whenever `postgres/init/01-init.sql` changes, because Postgres only runs init scripts on an empty volume. The database only holds data the ETL rebuilds from the CSVs, so resetting it is safe.

## Data Pipeline

```
IEBC PDFs (2017, 2022)
    │
    ▼
Python Extraction  →  etl/app/data/<year>/*.csv
    │
    ▼
Bronze (Raw)        one row per station per year, as extracted
    │
    ▼
Silver (Cleaned)    county / constituency / ward lookup tables + stations
    │
    ▼
Gold (Aggregated)   national, county, constituency and ward summaries per year
    │
    ▼
FastAPI  →  Dashboard
```

To add an election year, drop its CSV into `etl/app/data/<year>/` with the same columns and rerun the ETL. The API and dashboard pick up new years automatically.

## Data Notes

- Percentages and ranks (e.g. a county's share of national voters) are calculated within each election year.
- Polling station codes are only unique within a ward and year: 2017 uses short ward-level codes, while 2022 uses 15-digit codes.
- The source data has 49 county codes, two more than Kenya's 47 counties.
- A small number of 2022 rows have inflated voter counts from the PDF extraction. Where a registration-centre name ends in a number (e.g. "STAGE 42"), that number was joined onto the voter count. This affects the 2022 maximum-voters-per-station figure and slightly overstates the 2022 total.

## Tech Stack

- Python, FastAPI, SQLAlchemy
- PostgreSQL
- React, TypeScript, Vite, Recharts
- Docker, nginx
- OpenAPI 3.1

## Why Coundys?

The project started with a simple question:

> Why should anyone have to scroll through a 712-page PDF just to find the registered voter count for a polling station?
<p align="center">
  <img src="assets/images/coundys.png" alt="Coundys API" width="900">
</p>
Coundys makes Kenya's voter registration data searchable, accessible, and developer-friendly.

## License

MIT
