from app.database.connection import DatabaseConnector
from app.database.settings import COUNDYS_CONFIG
from app.paths.config import LOAD_SILVER_SCRIPT


def load_silver() -> None:
    db_connection = None

    try:
        print("Building silver layer...")

        db_connection = DatabaseConnector.create(COUNDYS_CONFIG)

        with open(LOAD_SILVER_SCRIPT, "r", encoding="utf-8") as f:
            sql = f.read()

        with db_connection.engine.raw_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.commit()

        print("Silver layer complete.")

    except Exception as e:
        print(f"Silver build failed: {e}")
        raise

    finally:
        if db_connection:
            db_connection.engine.dispose()