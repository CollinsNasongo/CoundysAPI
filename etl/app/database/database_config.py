from dataclasses import dataclass
from enum import StrEnum


class DatabaseDialect(StrEnum):
    POSTGRESQL = "postgresql+psycopg"
    MSSQL = "mssql+pyodbc"
    AZURE_SQL = "mssql+pyodbc"



@dataclass(frozen=True)
class DatabaseConfig:
    dialect: DatabaseDialect
    username: str
    password: str
    server: str
    database_name: str
    port: int | None = None
    parameters: dict[str, str] | None = None