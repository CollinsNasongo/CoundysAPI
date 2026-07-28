from abc import ABC, abstractmethod
from urllib.parse import urlencode, quote_plus
from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine
from .database_config import DatabaseConfig, DatabaseDialect



class DatabaseConnection(ABC):
    def __init__(self, config: DatabaseConfig):
        self._config = config
        self._engine: Engine | None = None

    @property
    def engine(self) -> Engine:
        """
        Lazily create and cache the SQLAlchemy engine.
        """
        if self._engine is None:
            self._engine = create_engine(
                self.build_connection_string()
            )

        return self._engine

    def connect(self) -> Connection:
        """
        Create a database connection.
        """
        return self.engine.connect()

    @abstractmethod
    def build_connection_string(self) -> str:
        """
        Build a SQLAlchemy connection string.
        """
        raise NotImplementedError

    def _build_query_string(self) -> str:
        if not self._config.parameters:
            return ""

        return urlencode(self._config.parameters)

    @property
    def _host(self) -> str:
        if self._config.port is None:
            return self._config.server

        return f"{self._config.server}:{self._config.port}"


class PostgreSqlConnection(DatabaseConnection):
    def build_connection_string(self) -> str:
        connection_string = (
            f"{self._config.dialect.value}://"
            f"{self._config.username}:"
            f"{self._config.password}@"
            f"{self._host}/"
            f"{self._config.database_name}"
        )

        params = self._build_query_string()

        if params:
            connection_string += f"?{params}"

        return connection_string


class MsSqlConnection(DatabaseConnection):
    def build_connection_string(self) -> str:
        connection_string = (
            f"{self._config.dialect.value}://"
            f"{self._config.username}:"
            f"{self._config.password}@"
            f"{self._host}/"
            f"{self._config.database_name}"
        )

        params = self._build_query_string()

        if params:
            connection_string += f"?{params}"

        return connection_string
    
from urllib.parse import quote_plus


class AzureSqlConnection(DatabaseConnection):
    def build_connection_string(self) -> str:
        odbc_string = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"Server=tcp:{self._host},1433;"
            f"Database={self._config.database_name};"
            f"Uid={self._config.username};"
            f"Pwd={self._config.password};"
            "Encrypt=yes;"
            "TrustServerCertificate=no;"
        )

        return (
            f"{self._config.dialect.value}:///?"
            f"odbc_connect={quote_plus(odbc_string)}"
        )

class DatabaseConnector:
    @staticmethod
    def create(config: DatabaseConfig) -> DatabaseConnection:
        match config.dialect:
            case DatabaseDialect.POSTGRESQL:
                return PostgreSqlConnection(config)

            case DatabaseDialect.MSSQL:
                return MsSqlConnection(config)
            
            case DatabaseDialect.AZURE_SQL:
                return AzureSqlConnection(config)

            case _:
                raise ValueError(
                    f"Unsupported database dialect: {config.dialect}"
                )