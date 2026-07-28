/* ============================================================================
   GOLD LAYER  —  coundys_gold  (PostgreSQL)
   Precomputed, denormalized aggregates for the API serving layer.
   Source: coundys_silver (county / constituency / ward / polling_station)

   Grains:
     - national_summary        : 1 row  (top-line KPIs)
     - county_summary          : 1 row per county
     - constituency_summary    : 1 row per constituency (county denormalized)
     - ward_summary            : 1 row per ward (constituency + county denormalized)
     - polling_station         : 1 row per station, fully denormalized hierarchy

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
   1. NATIONAL SUMMARY  (single KPI row)
=========================================================================== */
CREATE TABLE coundys_gold.national_summary (
    id                        SMALLINT     NOT NULL,

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

    CONSTRAINT PK_national_summary PRIMARY KEY (id),
    CONSTRAINT CK_national_summary_single_row CHECK (id = 1)
);


INSERT INTO coundys_gold.national_summary (
    id,
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
    1,
    (SELECT COUNT(*) FROM coundys_silver.county),
    (SELECT COUNT(*) FROM coundys_silver.constituency),
    (SELECT COUNT(*) FROM coundys_silver.ward),
    COUNT(*),
    SUM(ps.number_of_registered_voters::BIGINT),
    ROUND(
        1.0 * SUM(ps.number_of_registered_voters::BIGINT)
            / NULLIF(COUNT(*), 0)
    )::INT,
    MIN(ps.number_of_registered_voters),
    MAX(ps.number_of_registered_voters),
    ROUND(
        1.0 * SUM(ps.number_of_registered_voters::BIGINT)
            / NULLIF((SELECT COUNT(*) FROM coundys_silver.county), 0)
    )::INT
FROM coundys_silver.polling_station ps;


/* ===========================================================================
   2. COUNTY SUMMARY
=========================================================================== */
CREATE TABLE coundys_gold.county_summary (
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

    CONSTRAINT PK_county_summary PRIMARY KEY (county_code)
);


WITH flat AS (
    SELECT
        c.county_code,
        c.county_name,
        con.constituency_code,
        w.ward_code,
        ps.polling_station_id,
        ps.number_of_registered_voters
    FROM coundys_silver.polling_station ps
    JOIN coundys_silver.ward          w   ON w.ward_code           = ps.ward_code
    JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
    JOIN coundys_silver.county        c   ON c.county_code         = con.county_code
),
county_agg AS (
    SELECT
        county_code,
        county_name,
        COUNT(DISTINCT constituency_code)               AS constituency_count,
        COUNT(DISTINCT ward_code)                       AS ward_count,
        COUNT(*)                                        AS polling_station_count,
        SUM(number_of_registered_voters::BIGINT)        AS registered_voters
    FROM flat
    GROUP BY county_code, county_name
)
INSERT INTO coundys_gold.county_summary (
    county_code, county_name, constituency_count, ward_count,
    polling_station_count, registered_voters, pct_of_national_voters,
    national_voter_rank, avg_voters_per_station
)
SELECT
    county_code,
    county_name,
    constituency_count,
    ward_count,
    polling_station_count,
    registered_voters,
    CAST(
        100.0 * registered_voters
            / NULLIF(SUM(registered_voters) OVER (), 0)
        AS NUMERIC(7,4)
    ),
    RANK() OVER (ORDER BY registered_voters DESC)::INT,
    ROUND(
        1.0 * registered_voters
            / NULLIF(polling_station_count, 0)
    )::INT
FROM county_agg;


/* ===========================================================================
   3. CONSTITUENCY SUMMARY  (county denormalized)
=========================================================================== */
CREATE TABLE coundys_gold.constituency_summary (
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

    CONSTRAINT PK_constituency_summary PRIMARY KEY (constituency_code)
);


WITH flat AS (
    SELECT
        c.county_code,
        c.county_name,
        con.constituency_code,
        con.constituency_name,
        w.ward_code,
        ps.number_of_registered_voters
    FROM coundys_silver.polling_station ps
    JOIN coundys_silver.ward          w   ON w.ward_code           = ps.ward_code
    JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
    JOIN coundys_silver.county        c   ON c.county_code         = con.county_code
),
const_agg AS (
    SELECT
        constituency_code,
        constituency_name,
        county_code,
        county_name,
        COUNT(DISTINCT ward_code)                       AS ward_count,
        COUNT(*)                                        AS polling_station_count,
        SUM(number_of_registered_voters::BIGINT)        AS registered_voters
    FROM flat
    GROUP BY constituency_code, constituency_name, county_code, county_name
)
INSERT INTO coundys_gold.constituency_summary (
    constituency_code, constituency_name, county_code, county_name,
    ward_count, polling_station_count, registered_voters,
    pct_of_county_voters, rank_in_county, avg_voters_per_station
)
SELECT
    constituency_code,
    constituency_name,
    county_code,
    county_name,
    ward_count,
    polling_station_count,
    registered_voters,
    CAST(
        100.0 * registered_voters
            / NULLIF(SUM(registered_voters) OVER (PARTITION BY county_code), 0)
        AS NUMERIC(7,4)
    ),
    RANK() OVER (PARTITION BY county_code ORDER BY registered_voters DESC)::INT,
    ROUND(
        1.0 * registered_voters
            / NULLIF(polling_station_count, 0)
    )::INT
FROM const_agg;


/* ===========================================================================
   4. WARD SUMMARY  (constituency + county denormalized)
=========================================================================== */
CREATE TABLE coundys_gold.ward_summary (
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

    CONSTRAINT PK_ward_summary PRIMARY KEY (ward_code)
);


WITH flat AS (
    SELECT
        c.county_code,
        c.county_name,
        con.constituency_code,
        con.constituency_name,
        w.ward_code,
        w.ward_name,
        ps.number_of_registered_voters
    FROM coundys_silver.polling_station ps
    JOIN coundys_silver.ward          w   ON w.ward_code           = ps.ward_code
    JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
    JOIN coundys_silver.county        c   ON c.county_code         = con.county_code
),
ward_agg AS (
    SELECT
        ward_code,
        ward_name,
        constituency_code,
        constituency_name,
        county_code,
        county_name,
        COUNT(*)                                        AS polling_station_count,
        SUM(number_of_registered_voters::BIGINT)        AS registered_voters
    FROM flat
    GROUP BY
        ward_code, ward_name,
        constituency_code, constituency_name,
        county_code, county_name
)
INSERT INTO coundys_gold.ward_summary (
    ward_code, ward_name, constituency_code, constituency_name,
    county_code, county_name, polling_station_count, registered_voters,
    pct_of_constituency_voters, rank_in_constituency, avg_voters_per_station
)
SELECT
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
            / NULLIF(SUM(registered_voters) OVER (PARTITION BY constituency_code), 0)
        AS NUMERIC(7,4)
    ),
    RANK() OVER (PARTITION BY constituency_code ORDER BY registered_voters DESC)::INT,
    ROUND(
        1.0 * registered_voters
            / NULLIF(polling_station_count, 0)
    )::INT
FROM ward_agg;


/* ===========================================================================
   5. POLLING STATION  (fully denormalized — single-table station lookup)
=========================================================================== */
CREATE TABLE coundys_gold.polling_station (
    polling_station_id        BIGINT       NOT NULL,
    polling_station_code      BIGINT       NOT NULL,
    polling_station_seq       INT          NOT NULL,
    polling_station_name      VARCHAR(250) NOT NULL,

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
    CONSTRAINT UQ_ps_gold  UNIQUE (polling_station_code, polling_station_seq)
);


INSERT INTO coundys_gold.polling_station (
    polling_station_id, polling_station_code, polling_station_seq,
    polling_station_name, ward_code, ward_name, constituency_code,
    constituency_name, county_code, county_name, registered_voters,
    pct_of_national_voters
)
SELECT
    ps.polling_station_id,
    ps.polling_station_code,
    ps.polling_station_seq,
    ps.polling_station_name,
    w.ward_code,
    w.ward_name,
    con.constituency_code,
    con.constituency_name,
    c.county_code,
    c.county_name,
    ps.number_of_registered_voters,
    CAST(
        100.0 * ps.number_of_registered_voters
            / NULLIF(SUM(ps.number_of_registered_voters::BIGINT) OVER (), 0)
        AS NUMERIC(9,6)
    )
FROM coundys_silver.polling_station ps
JOIN coundys_silver.ward          w   ON w.ward_code           = ps.ward_code
JOIN coundys_silver.constituency  con ON con.constituency_code = w.constituency_code
JOIN coundys_silver.county        c   ON c.county_code         = con.county_code;


/* ===========================================================================
   6. SERVING INDEXES  (common API filter / sort paths)
=========================================================================== */
-- Top counties by voters, "leaderboard" style reads
CREATE INDEX IX_county_summary_voters
    ON coundys_gold.county_summary (registered_voters DESC)
    INCLUDE (county_name, national_voter_rank);

-- Constituencies filtered by parent county, ordered by voters
CREATE INDEX IX_constituency_summary_county
    ON coundys_gold.constituency_summary (county_code, registered_voters DESC)
    INCLUDE (constituency_name);

-- Wards filtered by parent constituency / county
CREATE INDEX IX_ward_summary_constituency
    ON coundys_gold.ward_summary (constituency_code, registered_voters DESC)
    INCLUDE (ward_name);

CREATE INDEX IX_ward_summary_county
    ON coundys_gold.ward_summary (county_code)
    INCLUDE (ward_name, registered_voters);

-- Station lookups by hierarchy level
CREATE INDEX IX_ps_gold_ward
    ON coundys_gold.polling_station (ward_code)
    INCLUDE (polling_station_name, registered_voters);

CREATE INDEX IX_ps_gold_county
    ON coundys_gold.polling_station (county_code)
    INCLUDE (constituency_code, ward_code, registered_voters);