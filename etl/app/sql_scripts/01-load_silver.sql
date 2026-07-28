DROP TABLE IF EXISTS coundys_silver.polling_station;
DROP TABLE IF EXISTS coundys_silver.ward;
DROP TABLE IF EXISTS coundys_silver.constituency;
DROP TABLE IF EXISTS coundys_silver.county;

CREATE TABLE coundys_silver.county (
    county_code INTEGER NOT NULL,
    county_name VARCHAR(100) NOT NULL,
    CONSTRAINT pk_county PRIMARY KEY (county_code)
);

CREATE TABLE coundys_silver.constituency (
    constituency_code INTEGER NOT NULL,
    constituency_name VARCHAR(150) NOT NULL,
    county_code INTEGER NOT NULL,

    CONSTRAINT pk_constituency PRIMARY KEY (constituency_code),

    CONSTRAINT fk_constituency_county
        FOREIGN KEY (county_code)
        REFERENCES coundys_silver.county (county_code)
);

CREATE TABLE coundys_silver.ward (
    ward_code INTEGER NOT NULL,
    ward_name VARCHAR(150) NOT NULL,
    constituency_code INTEGER NOT NULL,

    CONSTRAINT pk_ward PRIMARY KEY (ward_code),

    CONSTRAINT fk_ward_constituency
        FOREIGN KEY (constituency_code)
        REFERENCES coundys_silver.constituency (constituency_code)
);

CREATE TABLE coundys_silver.polling_station (
    polling_station_id BIGINT GENERATED ALWAYS AS IDENTITY,

    polling_station_code BIGINT NOT NULL,
    polling_station_seq INTEGER NOT NULL,
    polling_station_name VARCHAR(250) NOT NULL,

    ward_code INTEGER NOT NULL,

    number_of_registered_voters INTEGER NOT NULL,

    CONSTRAINT pk_polling_station
        PRIMARY KEY (polling_station_id),

    CONSTRAINT uq_polling_station
        UNIQUE (polling_station_code, polling_station_seq),

    CONSTRAINT fk_polling_station_ward
        FOREIGN KEY (ward_code)
        REFERENCES coundys_silver.ward (ward_code)
);

INSERT INTO coundys_silver.county (
    county_code,
    county_name
)
SELECT DISTINCT
    county_code,
    county_name
FROM coundys_bronze.polling_station;

INSERT INTO coundys_silver.constituency (
    constituency_code,
    constituency_name,
    county_code
)
SELECT DISTINCT
    const_code,
    const_name,
    county_code
FROM coundys_bronze.polling_station;

INSERT INTO coundys_silver.ward (
    ward_code,
    ward_name,
    constituency_code
)
SELECT DISTINCT
    caw_code,
    caw_name,
    const_code
FROM coundys_bronze.polling_station;

INSERT INTO coundys_silver.polling_station (
    polling_station_code,
    polling_station_seq,
    polling_station_name,
    ward_code,
    number_of_registered_voters
)
SELECT DISTINCT
    polling_station_code,
    polling_station_seq,
    polling_station_name,
    caw_code,
    registered_voters
FROM coundys_bronze.polling_station;