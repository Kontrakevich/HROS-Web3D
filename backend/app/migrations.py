from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def apply_schema_migrations(engine: Engine) -> None:
    """Apply additive, idempotent migrations for legacy HROS databases.

    Base.metadata.create_all creates new v1 tables such as domain_records. This
    function only repairs columns missing from databases created before v0.4.
    Existing rows, IDs and revisions are never removed here.
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
