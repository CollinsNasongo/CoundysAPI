from app.database.connection import DatabaseConnector
from app.database.settings import COUNDYS_CONFIG
from app.paths.config import LOAD_GOLD_SCRIPT


def load_gold() -> None:
    db_connection = None

    try:
        print("Building gold layer...")

        db_connection = DatabaseConnector.create(COUNDYS_CONFIG)

        with open(LOAD_GOLD_SCRIPT, "r", encoding="utf-8") as f:
            sql = f.read()

        raw_conn = db_connection.engine.raw_connection()

        try:
            cursor = raw_conn.cursor()
            cursor.execute(sql)
            raw_conn.commit()
        finally:
            raw_conn.close()

        print("Gold layer complete.")

    except Exception:
        print("Gold build failed.")
        raise

    finally:
        if db_connection:
            db_connection.engine.dispose()