from dotenv import load_dotenv
import os

from .database_config import (
    DatabaseConfig,
    DatabaseDialect,
)

load_dotenv()

COUNDYS_CONFIG = DatabaseConfig(
    dialect=DatabaseDialect.POSTGRESQL,
    username=os.environ["POSTGRES_USER"],
    password=os.environ["POSTGRES_PASSWORD"],
    server=os.environ["POSTGRES_HOST"],
    database_name=os.environ["POSTGRES_DB"],
    port=int(os.getenv("POSTGRES_PORT", "5432")),
    parameters={},
)