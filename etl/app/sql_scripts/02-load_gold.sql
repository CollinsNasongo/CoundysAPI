/* ============================================================================
   GOLD LAYER  —  coundys_gold  (PostgreSQL)
   Precomputed, denormalized aggregates for the API serving layer.
   Source: coundys_silver (county / constituency / ward / polling_station)

   Grains (every table is split by election_year — filter on it in the API):
     - national_summary        : 1 row per election year (top-line KPIs)
     - county_summary          : 1 row per county per election year
     - constituency_summary    : 1 row per constituency per election year
     - ward_summary            : 1 row per ward per election year
     - polling_station         : 1 row per station per election year

   All percentages and ranks are computed within an election year.

   Pattern: full drop-and-reload, rebuilt from silver on each pipeline run.
============================================================================ */

-- Schema guard
CREATE SCHEMA IF NOT EXISTS coundys_gold;


/* ---------------------------------------------------------------------------
   Drop (order is irrelevant — no inter-gold FKs — but drop everything cleanly)
--------------------------------------------------------------------------- */
DROP TABLE IF EXISTS coundys_gold.polling_station;
DROP TABLE IF EXISTS coundys_gold.ward_summary;
DROP TABLE IF EXISTS coundys_gold.constituency_summary;
DROP TABLE IF EXISTS coundys_gold.county_summary;
DROP TABLE IF EXISTS coundys_gold.national_summary;


/* ===========================================================================
   1. NATIONAL SUMMARY  (one KPI row per election year)
=========================================================================== */
CREATE TABLE coundys_gold.national_summary (
    election_year             INT          NOT NULL,

    total_counties            INT          NOT NULL,
    total_constituencies      INT          NOT NULL,
    total_wards               INT          NOT NULL,
    total_polling_stations    INT          NOT NULL,

    total_registered_voters   BIGINT       NOT NULL,

    avg_voters_per_station    INT          NOT NULL,
    min_voters_per_station    INT          NOT NULL,
    max_voters_per_station    INT          NOT NULL,
    avg_voters_per_county     INT          NOT NULL,

    generated_at              TIMESTAMP    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT PK_national_summary PRIMARY KEY (election_year)
);


-- Counts come from the year's polling stations, not the dimension tables,
-- because the dimensions hold every code seen in any year.
INSERT INTO coundys_gold.national_summary (
    election_year,
    total_counties,
    total_constituencies,
    total_wards,
    total_polling_stations,
    total_registered_voters,
    avg_voters_per_station,
    min_voters_per_station,
    max_voters_per_station,
    avg_voters_per_county
)
SELECT
    ps.election_year,
    COUNT(DISTINCT ps.county_code),
    COUNT(DISTINCT ps.const_code),
    COUNT(DISTINCT ps.caw_code),
    COUNT(*),
    SUM(ps.registered_voters::BIGINT),
    ROUND(
        1.0 * SUM(ps.registered_voters::BIGINT)
            / NULLIF(COUNT(*), 0)
    )::INT,
    MIN(ps.registered_voters),
    MAX(ps.registered_voters),
    ROUND(
        1.0 * SUM(ps.registered_voters::BIGINT)
            / NULLIF(COUNT(DISTINCT ps.county_code), 0)
    )::INT
FROM coundys_silver.polling_station ps
GROUP BY ps.election_year;


/* ===========================================================================
   2. COUNTY SUMMARY
=========================================================================== */
CREATE TABLE coundys_gold.county_summary (
    election_year             INT          NOT NULL,

    county_code               INT          NOT NULL,
    county_name               VARCHAR(100) NOT NULL,

    constituency_count        INT          NOT NULL,
    ward_count                INT          NOT NULL,
    polling_station_count     INT          NOT NULL,

    registered_voters         BIGINT       NOT NULL,
    pct_of_national_voters    NUMERIC(7,4) NOT NULL,
    national_voter_rank       INT          NOT NULL,
    avg_voters_per_station    INT          NOT NULL,

    generated_at              TIMESTAMP    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT PK_county_summary PRIMARY KEY (election_year, county_code)
);


WITH flat AS (
    SELECT
        ps.election_year,
        c.county_code,
        c.county_name,
        con.constituency_code,
        w.ward_code,
        ps.polling_station_id,
        ps.registered_voters
    FROM coundys_silver.polling_station ps
    JOIN coundys_silver.ward          w   ON w.ward_code           = ps.caw_code
    JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
    JOIN coundys_silver.county        c   ON c.county_code         = con.county_code
),
county_agg AS (
    SELECT
        election_year,
        county_code,
        county_name,
        COUNT(DISTINCT constituency_code)               AS constituency_count,
        COUNT(DISTINCT ward_code)                       AS ward_count,
        COUNT(*)                                        AS polling_station_count,
        SUM(registered_voters::BIGINT)                  AS registered_voters
    FROM flat
    GROUP BY election_year, county_code, county_name
)
INSERT INTO coundys_gold.county_summary (
    election_year, county_code, county_name, constituency_count, ward_count,
    polling_station_count, registered_voters, pct_of_national_voters,
    national_voter_rank, avg_voters_per_station
)
SELECT
    election_year,
    county_code,
    county_name,
    constituency_count,
    ward_count,
    polling_station_count,
    registered_voters,
    CAST(
        100.0 * registered_voters
            / NULLIF(SUM(registered_voters) OVER (PARTITION BY election_year), 0)
        AS NUMERIC(7,4)
    ),
    RANK() OVER (PARTITION BY election_year ORDER BY registered_voters DESC)::INT,
    ROUND(
        1.0 * registered_voters
            / NULLIF(polling_station_count, 0)
    )::INT
FROM county_agg;


/* ===========================================================================
   3. CONSTITUENCY SUMMARY  (county denormalized)
=========================================================================== */
CREATE TABLE coundys_gold.constituency_summary (
    election_year             INT          NOT NULL,

    constituency_code         INT          NOT NULL,
    constituency_name         VARCHAR(150) NOT NULL,

    county_code               INT          NOT NULL,
    county_name               VARCHAR(100) NOT NULL,

    ward_count                INT          NOT NULL,
    polling_station_count     INT          NOT NULL,

    registered_voters         BIGINT       NOT NULL,
    pct_of_county_voters      NUMERIC(7,4) NOT NULL,
    rank_in_county            INT          NOT NULL,
    avg_voters_per_station    INT          NOT NULL,

    generated_at              TIMESTAMP    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT PK_constituency_summary PRIMARY KEY (election_year, constituency_code)
);


WITH flat AS (
    SELECT
        ps.election_year,
        c.county_code,
        c.county_name,
        con.constituency_code,
        con.constituency_name,
        w.ward_code,
        ps.registered_voters
    FROM coundys_silver.polling_station ps
    JOIN coundys_silver.ward          w   ON w.ward_code           = ps.caw_code
    JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
    JOIN coundys_silver.county        c   ON c.county_code         = con.county_code
),
const_agg AS (
    SELECT
        election_year,
        constituency_code,
        constituency_name,
        county_code,
        county_name,
        COUNT(DISTINCT ward_code)                       AS ward_count,
        COUNT(*)                                        AS polling_station_count,
        SUM(registered_voters::BIGINT)                  AS registered_voters
    FROM flat
    GROUP BY
        election_year,
        constituency_code, constituency_name,
        county_code, county_name
)
INSERT INTO coundys_gold.constituency_summary (
    election_year, constituency_code, constituency_name, county_code, county_name,
    ward_count, polling_station_count, registered_voters,
    pct_of_county_voters, rank_in_county, avg_voters_per_station
)
SELECT
    election_year,
    constituency_code,
    constituency_name,
    county_code,
    county_name,
    ward_count,
    polling_station_count,
    registered_voters,
    CAST(
        100.0 * registered_voters
            / NULLIF(SUM(registered_voters) OVER (PARTITION BY election_year, county_code), 0)
        AS NUMERIC(7,4)
    ),
    RANK() OVER (
        PARTITION BY election_year, county_code
        ORDER BY registered_voters DESC
    )::INT,
    ROUND(
        1.0 * registered_voters
            / NULLIF(polling_station_count, 0)
    )::INT
FROM const_agg;


/* ===========================================================================
   4. WARD SUMMARY  (constituency + county denormalized)
=========================================================================== */
CREATE TABLE coundys_gold.ward_summary (
    election_year               INT          NOT NULL,

    ward_code                   INT          NOT NULL,
    ward_name                   VARCHAR(150) NOT NULL,

    constituency_code           INT          NOT NULL,
    constituency_name           VARCHAR(150) NOT NULL,
    county_code                 INT          NOT NULL,
    county_name                 VARCHAR(100) NOT NULL,

    polling_station_count       INT          NOT NULL,

    registered_voters           BIGINT       NOT NULL,
    pct_of_constituency_voters  NUMERIC(7,4) NOT NULL,
    rank_in_constituency        INT          NOT NULL,
    avg_voters_per_station      INT          NOT NULL,

    generated_at                TIMESTAMP    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT PK_ward_summary PRIMARY KEY (election_year, ward_code)
);


WITH flat AS (
    SELECT
        ps.election_year,
        c.county_code,
        c.county_name,
        con.constituency_code,
        con.constituency_name,
        w.ward_code,
        w.ward_name,
        ps.registered_voters
    FROM coundys_silver.polling_station ps
    JOIN coundys_silver.ward          w   ON w.ward_code           = ps.caw_code
    JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
    JOIN coundys_silver.county        c   ON c.county_code         = con.county_code
),
ward_agg AS (
    SELECT
        election_year,
        ward_code,
        ward_name,
        constituency_code,
        constituency_name,
        county_code,
        county_name,
        COUNT(*)                                        AS polling_station_count,
        SUM(registered_voters::BIGINT)                  AS registered_voters
    FROM flat
    GROUP BY
        election_year,
        ward_code, ward_name,
        constituency_code, constituency_name,
        county_code, county_name
)
INSERT INTO coundys_gold.ward_summary (
    election_year, ward_code, ward_name, constituency_code, constituency_name,
    county_code, county_name, polling_station_count, registered_voters,
    pct_of_constituency_voters, rank_in_constituency, avg_voters_per_station
)
SELECT
    election_year,
    ward_code,
    ward_name,
    constituency_code,
    constituency_name,
    county_code,
    county_name,
    polling_station_count,
    registered_voters,
    CAST(
        100.0 * registered_voters
            / NULLIF(SUM(registered_voters) OVER (PARTITION BY election_year, constituency_code), 0)
        AS NUMERIC(7,4)
    ),
    RANK() OVER (
        PARTITION BY election_year, constituency_code
        ORDER BY registered_voters DESC
    )::INT,
    ROUND(
        1.0 * registered_voters
            / NULLIF(polling_station_count, 0)
    )::INT
FROM ward_agg;


/* ===========================================================================
   5. POLLING STATION  (fully denormalized — single-table station lookup)

   polling_station_code is ward-local in 2017 and a 15-digit composite in
   2022, so a station is only unique within (election_year, ward_code).
=========================================================================== */
CREATE TABLE coundys_gold.polling_station (
    polling_station_id        BIGINT       NOT NULL,
    election_year             INT          NOT NULL,

    polling_station_code      BIGINT       NOT NULL,
    polling_station_seq       INT          NOT NULL,
    polling_station_name      VARCHAR(250) NOT NULL,

    reg_centre_code           INT,
    reg_centre_name           VARCHAR(250),

    ward_code                 INT          NOT NULL,
    ward_name                 VARCHAR(150) NOT NULL,
    constituency_code         INT          NOT NULL,
    constituency_name         VARCHAR(150) NOT NULL,
    county_code               INT          NOT NULL,
    county_name               VARCHAR(100) NOT NULL,

    registered_voters         INT          NOT NULL,
    pct_of_national_voters    NUMERIC(9,6) NOT NULL,

    generated_at              TIMESTAMP    NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),

    CONSTRAINT PK_ps_gold PRIMARY KEY (polling_station_id),
    CONSTRAINT UQ_ps_gold  UNIQUE (
        election_year, ward_code, polling_station_code, polling_station_seq
    )
);


INSERT INTO coundys_gold.polling_station (
    polling_station_id, election_year, polling_station_code, polling_station_seq,
    polling_station_name, reg_centre_code, reg_centre_name,
    ward_code, ward_name, constituency_code, constituency_name,
    county_code, county_name, registered_voters, pct_of_national_voters
)
SELECT
    ps.polling_station_id,
    ps.election_year,
    ps.polling_station_code,
    ps.polling_station_seq,
    ps.polling_station_name,
    ps.reg_centre_code,
    ps.reg_centre_name,
    w.ward_code,
    w.ward_name,
    con.constituency_code,
    con.constituency_name,
    c.county_code,
    c.county_name,
    ps.registered_voters,
    CAST(
        100.0 * ps.registered_voters
            / NULLIF(SUM(ps.registered_voters::BIGINT) OVER (PARTITION BY ps.election_year), 0)
        AS NUMERIC(9,6)
    )
FROM coundys_silver.polling_station ps
JOIN coundys_silver.ward          w   ON w.ward_code           = ps.caw_code
JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
JOIN coundys_silver.county        c   ON c.county_code         = con.county_code;


/* ===========================================================================
   6. SERVING INDEXES  (common API filter / sort paths, all year-first)
=========================================================================== */
-- Top counties by voters, "leaderboard" style reads
CREATE INDEX IX_county_summary_voters
    ON coundys_gold.county_summary (election_year, registered_voters DESC)
    INCLUDE (county_name, national_voter_rank);

-- Constituencies filtered by parent county, ordered by voters
CREATE INDEX IX_constituency_summary_county
    ON coundys_gold.constituency_summary (election_year, county_code, registered_voters DESC)
    INCLUDE (constituency_name);

-- Wards filtered by parent constituency / county
CREATE INDEX IX_ward_summary_constituency
    ON coundys_gold.ward_summary (election_year, constituency_code, registered_voters DESC)
    INCLUDE (ward_name);

CREATE INDEX IX_ward_summary_county
    ON coundys_gold.ward_summary (election_year, county_code)
    INCLUDE (ward_name, registered_voters);

-- Station lookups by hierarchy level
CREATE INDEX IX_ps_gold_ward
    ON coundys_gold.polling_station (election_year, ward_code)
    INCLUDE (polling_station_name, registered_voters);

CREATE INDEX IX_ps_gold_county
    ON coundys_gold.polling_station (election_year, county_code)
    INCLUDE (constituency_code, ward_code, registered_voters);

-- Station lookups by code (code alone is not unique across years)
CREATE INDEX IX_ps_gold_code
    ON coundys_gold.polling_station (election_year, polling_station_code);
