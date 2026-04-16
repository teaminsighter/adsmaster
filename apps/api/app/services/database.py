"""
Database Service - PostgreSQL with SQLAlchemy

Provides a Supabase-compatible interface for database operations.
This allows us to keep existing query patterns while using local PostgreSQL.
"""

import os
import json
from typing import Any, Dict, List, Optional, Union
from contextlib import asynccontextmanager
from dataclasses import dataclass

from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.pool import QueuePool


# =============================================================================
# Configuration
# =============================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://adsmaster:adsmaster_secret@localhost:5432/adsmaster"
)

# Fix common URL format issues
# Coolify/Heroku use postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Convert async URL to sync for standard SQLAlchemy
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# Create engine with connection pooling
engine = create_engine(
    SYNC_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)


# =============================================================================
# Query Result Classes
# =============================================================================

@dataclass
class QueryResult:
    """Result from a database query."""
    data: List[Dict[str, Any]]
    count: Optional[int] = None
    error: Optional[str] = None


# =============================================================================
# Query Builder (Supabase-compatible interface)
# =============================================================================

class QueryBuilder:
    """
    Supabase-compatible query builder for PostgreSQL.

    Supports chaining methods like:
        db.table("users").select("*").eq("id", "123").execute()
    """

    def __init__(self, table_name: str):
        self.table_name = table_name
        self._select_columns = "*"
        self._conditions: List[str] = []
        self._params: Dict[str, Any] = {}
        self._order_by: Optional[str] = None
        self._order_desc: bool = False
        self._limit_val: Optional[int] = None
        self._offset_val: Optional[int] = None
        self._operation = "SELECT"
        self._insert_data: Optional[Dict] = None
        self._update_data: Optional[Dict] = None
        self._count_mode: Optional[str] = None
        self._param_counter = 0

    def _next_param(self) -> str:
        """Generate unique parameter name."""
        self._param_counter += 1
        return f"p{self._param_counter}"

    def select(self, columns: str = "*", count: Optional[str] = None) -> "QueryBuilder":
        """Select columns from table."""
        self._select_columns = columns
        self._count_mode = count
        return self

    def insert(self, data: Union[Dict, List[Dict]]) -> "QueryBuilder":
        """Insert data into table."""
        self._operation = "INSERT"
        self._insert_data = data if isinstance(data, list) else [data]
        return self

    def update(self, data: Dict) -> "QueryBuilder":
        """Update data in table."""
        self._operation = "UPDATE"
        self._update_data = data
        return self

    def delete(self) -> "QueryBuilder":
        """Delete from table."""
        self._operation = "DELETE"
        return self

    def eq(self, column: str, value: Any) -> "QueryBuilder":
        """Equal condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" = :{param}')
        self._params[param] = value
        return self

    def neq(self, column: str, value: Any) -> "QueryBuilder":
        """Not equal condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" != :{param}')
        self._params[param] = value
        return self

    def gt(self, column: str, value: Any) -> "QueryBuilder":
        """Greater than condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" > :{param}')
        self._params[param] = value
        return self

    def gte(self, column: str, value: Any) -> "QueryBuilder":
        """Greater than or equal condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" >= :{param}')
        self._params[param] = value
        return self

    def lt(self, column: str, value: Any) -> "QueryBuilder":
        """Less than condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" < :{param}')
        self._params[param] = value
        return self

    def lte(self, column: str, value: Any) -> "QueryBuilder":
        """Less than or equal condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" <= :{param}')
        self._params[param] = value
        return self

    def like(self, column: str, pattern: str) -> "QueryBuilder":
        """LIKE condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" LIKE :{param}')
        self._params[param] = pattern
        return self

    def ilike(self, column: str, pattern: str) -> "QueryBuilder":
        """Case-insensitive LIKE condition."""
        param = self._next_param()
        self._conditions.append(f'"{column}" ILIKE :{param}')
        self._params[param] = pattern
        return self

    def is_(self, column: str, value: Any) -> "QueryBuilder":
        """IS condition (for NULL checks)."""
        if value == "null" or value is None:
            self._conditions.append(f'"{column}" IS NULL')
        else:
            param = self._next_param()
            self._conditions.append(f'"{column}" IS :{param}')
            self._params[param] = value
        return self

    def in_(self, column: str, values: List[Any]) -> "QueryBuilder":
        """IN condition."""
        if not values:
            self._conditions.append("FALSE")  # Empty IN clause
            return self
        param = self._next_param()
        self._conditions.append(f'"{column}" = ANY(:{param})')
        self._params[param] = values
        return self

    def not_(self) -> "NotBuilder":
        """Return NOT builder for negation."""
        return NotBuilder(self)

    def contains(self, column: str, value: Any) -> "QueryBuilder":
        """Array contains condition."""
        param = self._next_param()
        self._conditions.append(f':{param} = ANY("{column}")')
        self._params[param] = value
        return self

    def order(self, column: str, desc: bool = False) -> "QueryBuilder":
        """Order by column."""
        self._order_by = column
        self._order_desc = desc
        return self

    def limit(self, count: int) -> "QueryBuilder":
        """Limit results."""
        self._limit_val = count
        return self

    def offset(self, count: int) -> "QueryBuilder":
        """Offset results."""
        self._offset_val = count
        return self

    def range(self, start: int, end: int) -> "QueryBuilder":
        """Range of results (inclusive)."""
        self._offset_val = start
        self._limit_val = end - start + 1
        return self

    def _build_where(self) -> str:
        """Build WHERE clause."""
        if not self._conditions:
            return ""
        return " WHERE " + " AND ".join(self._conditions)

    def _build_select_query(self) -> str:
        """Build SELECT query."""
        # Handle foreign key joins in select (e.g., "*, organizations(id, name)")
        columns = self._select_columns
        joins = ""

        # Simple column selection for now
        # TODO: Implement proper join parsing if needed
        if "(" in columns:
            # For now, just select from main table
            columns = "*"

        query = f'SELECT {columns} FROM "{self.table_name}"'
        query += self._build_where()

        if self._order_by:
            direction = "DESC" if self._order_desc else "ASC"
            query += f' ORDER BY "{self._order_by}" {direction}'

        if self._limit_val:
            query += f" LIMIT {self._limit_val}"

        if self._offset_val:
            query += f" OFFSET {self._offset_val}"

        return query

    def _build_insert_query(self) -> tuple[str, List[Dict]]:
        """Build INSERT query."""
        if not self._insert_data:
            raise ValueError("No data to insert")

        # Get columns from first record
        columns = list(self._insert_data[0].keys())
        col_names = ", ".join(f'"{c}"' for c in columns)

        # Build values placeholders for each record
        all_params = []
        value_groups = []

        for idx, record in enumerate(self._insert_data):
            placeholders = []
            for col in columns:
                param_name = f"v{idx}_{col}"
                placeholders.append(f":{param_name}")
                self._params[param_name] = self._serialize_value(record.get(col))
            value_groups.append(f"({', '.join(placeholders)})")

        values = ", ".join(value_groups)
        query = f'INSERT INTO "{self.table_name}" ({col_names}) VALUES {values} RETURNING *'

        return query

    def _build_update_query(self) -> str:
        """Build UPDATE query."""
        if not self._update_data:
            raise ValueError("No data to update")

        set_clauses = []
        for col, val in self._update_data.items():
            param = self._next_param()
            set_clauses.append(f'"{col}" = :{param}')
            self._params[param] = self._serialize_value(val)

        query = f'UPDATE "{self.table_name}" SET {", ".join(set_clauses)}'
        query += self._build_where()
        query += " RETURNING *"

        return query

    def _build_delete_query(self) -> str:
        """Build DELETE query."""
        query = f'DELETE FROM "{self.table_name}"'
        query += self._build_where()
        query += " RETURNING *"
        return query

    def _serialize_value(self, value: Any) -> Any:
        """Serialize value for database storage."""
        if isinstance(value, (dict, list)):
            return json.dumps(value)
        return value

    def _deserialize_row(self, row: Dict) -> Dict:
        """Deserialize row from database."""
        result = dict(row)
        # Try to parse JSON fields
        for key, value in result.items():
            if isinstance(value, str):
                try:
                    if value.startswith('{') or value.startswith('['):
                        result[key] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    pass
        return result

    def execute(self) -> QueryResult:
        """Execute the query and return results."""
        try:
            with engine.connect() as conn:
                if self._operation == "SELECT":
                    query = self._build_select_query()
                    result = conn.execute(text(query), self._params)
                    rows = [self._deserialize_row(dict(row._mapping)) for row in result]

                    # Handle count mode
                    count = None
                    if self._count_mode == "exact":
                        count_query = f'SELECT COUNT(*) FROM "{self.table_name}"' + self._build_where()
                        count_result = conn.execute(text(count_query), self._params)
                        count = count_result.scalar()

                    return QueryResult(data=rows, count=count)

                elif self._operation == "INSERT":
                    query = self._build_insert_query()
                    result = conn.execute(text(query), self._params)
                    conn.commit()
                    rows = [self._deserialize_row(dict(row._mapping)) for row in result]
                    return QueryResult(data=rows)

                elif self._operation == "UPDATE":
                    query = self._build_update_query()
                    result = conn.execute(text(query), self._params)
                    conn.commit()
                    rows = [self._deserialize_row(dict(row._mapping)) for row in result]
                    return QueryResult(data=rows)

                elif self._operation == "DELETE":
                    query = self._build_delete_query()
                    result = conn.execute(text(query), self._params)
                    conn.commit()
                    rows = [self._deserialize_row(dict(row._mapping)) for row in result]
                    return QueryResult(data=rows)

        except Exception as e:
            return QueryResult(data=[], error=str(e))


class NotBuilder:
    """Builder for NOT conditions."""

    def __init__(self, query_builder: QueryBuilder):
        self.qb = query_builder

    def is_(self, column: str, value: Any) -> QueryBuilder:
        """IS NOT condition."""
        if value == "null" or value is None:
            self.qb._conditions.append(f'"{column}" IS NOT NULL')
        else:
            param = self.qb._next_param()
            self.qb._conditions.append(f'"{column}" IS NOT :{param}')
            self.qb._params[param] = value
        return self.qb


# =============================================================================
# Database Client (Supabase-compatible interface)
# =============================================================================

class DatabaseClient:
    """
    Supabase-compatible database client.

    Usage:
        db = get_db_client()
        result = db.table("users").select("*").eq("id", "123").execute()
    """

    def table(self, name: str) -> QueryBuilder:
        """Start a query on a table."""
        return QueryBuilder(name)

    def rpc(self, function_name: str, params: Dict = None) -> QueryResult:
        """Call a database function."""
        try:
            with engine.connect() as conn:
                if params:
                    param_str = ", ".join(f":{k}" for k in params.keys())
                    query = f"SELECT * FROM {function_name}({param_str})"
                    result = conn.execute(text(query), params)
                else:
                    query = f"SELECT * FROM {function_name}()"
                    result = conn.execute(text(query))

                rows = [dict(row._mapping) for row in result]
                return QueryResult(data=rows)
        except Exception as e:
            return QueryResult(data=[], error=str(e))


# =============================================================================
# Singleton instance
# =============================================================================

_db_client: Optional[DatabaseClient] = None


def get_db_client() -> DatabaseClient:
    """Get the database client singleton."""
    global _db_client
    if _db_client is None:
        _db_client = DatabaseClient()
    return _db_client


# Alias for compatibility with existing code
def get_supabase_client() -> DatabaseClient:
    """Alias for get_db_client() - maintains compatibility with existing code."""
    return get_db_client()
