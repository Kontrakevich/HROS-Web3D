from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def apply_schema_migrations(engine: Engine) -> None:
    """Apply the minimal additive migration required by HROS v0.4.

    The project intentionally keeps this migration small and deterministic until
    Alembic is introduced. It is safe to run repeatedly on SQLite and PostgreSQL.
    """
    inspector = inspect(engine)
    if "moments" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("moments")}
    if "details" in columns:
        return

    dialect = engine.dialect.name
    with engine.begin() as connection:
        if dialect == "postgresql":
            connection.execute(text("ALTER TABLE moments ADD COLUMN IF NOT EXISTS details JSON DEFAULT '{}'"))
        else:
            connection.execute(text("ALTER TABLE moments ADD COLUMN details JSON DEFAULT '{}'"))
