from pathlib import Path
import csv

from sqlalchemy import text

from app.database.connection import DatabaseConnection
from app.database.database_config import DatabaseConfig


INSERT_SQL = text("""
    INSERT INTO coundys_bronze.polling_station (
        county_code,
        county_name,
        const_code,
        const_name,
        caw_code,
        caw_name,
        reg_centre_code,
        reg_centre_name,
        polling_station_code,
        polling_station_seq,
        polling_station_name,
        registered_voters
    )
    VALUES (
        :county_code,
        :county_name,
        :const_code,
        :const_name,
        :caw_code,
        :caw_name,
        :reg_centre_code,
        :reg_centre_name,
        :polling_station_code,
        :polling_station_seq,
        :polling_station_name,
        :registered_voters
    )
""")


def _read_csv(csv_file: Path) -> list[dict]:
    rows = []

    with open(csv_file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            row["county_code"] = int(row["county_code"])
            row["const_code"] = int(row["const_code"])
            row["caw_code"] = int(row["caw_code"])

            row["reg_centre_code"] = (
                int(row["reg_centre_code"])
                if row["reg_centre_code"]
                else None
            )

            row["polling_station_code"] = int(
                row["polling_station_code"]
            )
            row["polling_station_seq"] = int(
                row["polling_station_seq"]
            )
            row["registered_voters"] = int(
                row["registered_voters"]
            )

            rows.append(row)

    return rows


def load_bronze_csvs(
    csv_dir: Path,
    db_connection: DatabaseConnection
) -> None:

    try:
        with db_connection.connect() as conn:
            print(f"csv_dir: {csv_dir}")
            print(f"exists: {csv_dir.exists()}")
            print(f"is_dir: {csv_dir.is_dir()}")

            for csv_file in csv_dir.glob("*.csv"):
                print(f"Loading file: {csv_file.name}")

                rows = _read_csv(csv_file)

                if rows:
                    conn.execute(INSERT_SQL, rows)
                    conn.commit()

                print(
                    f"Loaded {csv_file.name}: "
                    f"{len(rows):,} rows"
                )

    except Exception as e:
        print(
            f"Failed to load bronze CSVs from "
            f"{csv_dir}: {str(e)}"
        )
        raise