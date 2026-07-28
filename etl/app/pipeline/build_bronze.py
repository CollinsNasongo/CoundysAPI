from app.database.connection import DatabaseConnector
from app.database.settings import COUNDYS_CONFIG
from app.paths.config import RAW_DATA_DIR
from app.loader.load_bronze import load_bronze_csvs


def load_bronze() -> None:
    db_connection = None

    try:
        print("Loading bronze layer...")

        db_connection = DatabaseConnector.create(COUNDYS_CONFIG)

        load_bronze_csvs(
            csv_dir=RAW_DATA_DIR,
            db_connection=db_connection
        )

        print("Bronze load complete.")

    except Exception as e:
        print(f"Bronze load failed: {e}")
        raise

    finally:
        if db_connection:
            db_connection.engine.dispose()