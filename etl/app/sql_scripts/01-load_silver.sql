
BEGIN;

-- ============================================================
-- 1. SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS coundys_silver;


-- ============================================================
-- 2. DROP EXISTING TABLES
--    Drop child tables before parent tables.
-- ============================================================

DROP TABLE IF EXISTS coundys_silver.polling_station;
DROP TABLE IF EXISTS coundys_silver.ward;
DROP TABLE IF EXISTS coundys_silver.constituency;
DROP TABLE IF EXISTS coundys_silver.county;


-- ============================================================
-- 3. COUNTY DIMENSION
--    Grain: one row per county.
-- ============================================================

CREATE TABLE coundys_silver.county (
    county_code INTEGER NOT NULL,
    county_name VARCHAR(100) NOT NULL,

    CONSTRAINT pk_county
        PRIMARY KEY (county_code)
);


-- ============================================================
-- 4. CONSTITUENCY DIMENSION
--    Grain: one row per constituency.
-- ============================================================

CREATE TABLE coundys_silver.constituency (
    constituency_code INTEGER NOT NULL,
    constituency_name VARCHAR(150) NOT NULL,
    county_code INTEGER NOT NULL,

    CONSTRAINT pk_constituency
        PRIMARY KEY (constituency_code),

    CONSTRAINT fk_constituency_county
        FOREIGN KEY (county_code)
        REFERENCES coundys_silver.county (county_code)
);


-- ============================================================
-- 5. WARD DIMENSION
--    Grain: one row per ward.
-- ============================================================

CREATE TABLE coundys_silver.ward (
    ward_code INTEGER NOT NULL,
    ward_name VARCHAR(150) NOT NULL,
    constituency_code INTEGER NOT NULL,

    CONSTRAINT pk_ward
        PRIMARY KEY (ward_code),

    CONSTRAINT fk_ward_constituency
        FOREIGN KEY (constituency_code)
        REFERENCES coundys_silver.constituency (
            constituency_code
        )
);


-- ============================================================
-- 6. POLLING STATION
--    Grain: one row per polling station per election year.
--
--    IMPORTANT:
--    polling_station_id identifies an election-specific record.
--    It is NOT a cross-year physical station identifier.
--
--    Natural key:
--    (election_year, caw_code,
--     polling_station_code, polling_station_seq)
-- ============================================================

CREATE TABLE coundys_silver.polling_station (
    polling_station_id BIGINT
        GENERATED ALWAYS AS IDENTITY,

    election_year INTEGER NOT NULL,

    county_code INTEGER NOT NULL,
    const_code INTEGER NOT NULL,
    caw_code INTEGER NOT NULL,

    reg_centre_code INTEGER,
    reg_centre_name VARCHAR(250),

    polling_station_code BIGINT NOT NULL,
    polling_station_seq INTEGER NOT NULL,
    polling_station_name VARCHAR(250) NOT NULL,

    registered_voters INTEGER NOT NULL,

    CONSTRAINT pk_polling_station
        PRIMARY KEY (polling_station_id),

    CONSTRAINT uq_polling_station_election
        UNIQUE (
            election_year,
            caw_code,
            polling_station_code,
            polling_station_seq
        ),

    CONSTRAINT fk_polling_station_county
        FOREIGN KEY (county_code)
        REFERENCES coundys_silver.county (county_code),

    CONSTRAINT fk_polling_station_constituency
        FOREIGN KEY (const_code)
        REFERENCES coundys_silver.constituency (
            constituency_code
        ),

    CONSTRAINT fk_polling_station_ward
        FOREIGN KEY (caw_code)
        REFERENCES coundys_silver.ward (ward_code),

    CONSTRAINT chk_registered_voters
        CHECK (registered_voters >= 0)
);


-- ============================================================
-- 7. LOAD COUNTY
--    Names can differ between election years (e.g. extra spaces),
--    so keep one row per code, normalise whitespace, and prefer
--    the latest election year's spelling. Same for sections 8-9.
-- ============================================================

INSERT INTO coundys_silver.county (
    county_code,
    county_name
)
SELECT DISTINCT ON (county_code)
    county_code,
    REGEXP_REPLACE(TRIM(county_name), '\s+', ' ', 'g')
FROM coundys_bronze.polling_station
ORDER BY county_code, election_year DESC;


-- ============================================================
-- 8. LOAD CONSTITUENCY
-- ============================================================

INSERT INTO coundys_silver.constituency (
    constituency_code,
    constituency_name,
    county_code
)
SELECT DISTINCT ON (const_code)
    const_code,
    REGEXP_REPLACE(TRIM(const_name), '\s+', ' ', 'g'),
    county_code
FROM coundys_bronze.polling_station
ORDER BY const_code, election_year DESC;


-- ============================================================
-- 9. LOAD WARD
-- ============================================================

INSERT INTO coundys_silver.ward (
    ward_code,
    ward_name,
    constituency_code
)
SELECT DISTINCT ON (caw_code)
    caw_code,
    REGEXP_REPLACE(TRIM(caw_name), '\s+', ' ', 'g'),
    const_code
FROM coundys_bronze.polling_station
ORDER BY caw_code, election_year DESC;


-- ============================================================
-- 10. LOAD ELECTION-SPECIFIC POLLING STATIONS
--
--     Do not merge records across election years.
--     Retain source identifiers and registration-centre fields.
-- ============================================================

INSERT INTO coundys_silver.polling_station (
    election_year,
    county_code,
    const_code,
    caw_code,
    reg_centre_code,
    reg_centre_name,
    polling_station_code,
    polling_station_seq,
    polling_station_name,
    registered_voters
)
SELECT
    election_year,
    county_code,
    const_code,
    caw_code,
    reg_centre_code,
    reg_centre_name,
    polling_station_code,
    polling_station_seq,
    polling_station_name,
    registered_voters
FROM coundys_bronze.polling_station;


-- ============================================================
-- 11. INDEXES
-- ============================================================

CREATE INDEX ix_polling_station_election_year
    ON coundys_silver.polling_station (election_year);

CREATE INDEX ix_polling_station_ward_year
    ON coundys_silver.polling_station (
        caw_code,
        election_year
    );

CREATE INDEX ix_polling_station_constituency_year
    ON coundys_silver.polling_station (
        const_code,
        election_year
    );

CREATE INDEX ix_polling_station_county_year
    ON coundys_silver.polling_station (
        county_code,
        election_year
    );

CREATE INDEX ix_polling_station_reg_centre
    ON coundys_silver.polling_station (
        election_year,
        caw_code,
        reg_centre_code
    );


-- ============================================================
-- 12. GRANT SCHEMA ACCESS
-- ============================================================

GRANT USAGE ON SCHEMA coundys_silver TO PUBLIC;

COMMIT;