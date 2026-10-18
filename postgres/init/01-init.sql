-- Create schemas
CREATE SCHEMA IF NOT EXISTS coundys_bronze;
CREATE SCHEMA IF NOT EXISTS coundys_silver;
CREATE SCHEMA IF NOT EXISTS coundys_gold;


-- Set default privileges
GRANT USAGE ON SCHEMA coundys_bronze TO PUBLIC;
GRANT USAGE ON SCHEMA coundys_silver TO PUBLIC;
GRANT USAGE ON SCHEMA coundys_gold TO PUBLIC;



CREATE TABLE IF NOT EXISTS coundys_bronze.polling_station (
    election_year          INTEGER NOT NULL,
    county_code            INTEGER NOT NULL,
    county_name            TEXT NOT NULL,

    const_code             INTEGER NOT NULL,
    const_name             TEXT NOT NULL,

    caw_code               INTEGER NOT NULL,
    caw_name               TEXT NOT NULL,

    reg_centre_code        INTEGER,
    reg_centre_name        TEXT,

    polling_station_code   BIGINT NOT NULL,
    polling_station_seq    INTEGER NOT NULL,
    polling_station_name   TEXT NOT NULL,

    registered_voters      INTEGER NOT NULL,

    PRIMARY KEY (election_year, caw_code, polling_station_code, polling_station_seq)
);