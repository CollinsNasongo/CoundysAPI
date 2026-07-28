from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]

RAW_DATA_DIR = APP_DIR / "data"

LOAD_SILVER_SCRIPT = APP_DIR / "sql_scripts" / "01-load_silver.sql"

LOAD_GOLD_SCRIPT = APP_DIR / "sql_scripts" / "02-load_gold.sql"