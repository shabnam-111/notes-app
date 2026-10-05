"""Tiny additive migrations.

db.create_all() creates missing TABLES but never adds COLUMNS to existing ones, so a database created by
an older release would break the new code. Every change here is additive with a server-side default, which
keeps the previous release working too - that is what makes Blue-Green safe across a schema change
(expand first, remove old columns in a later release).
"""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

log = logging.getLogger("notes.schema")

# (table, column, DDL type + default)
ADDITIVE_COLUMNS = [
    ("notes", "body_format", "VARCHAR(10) NOT NULL DEFAULT 'text'"),
    ("notes", "pinned", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("notes", "search_text", "TEXT NOT NULL DEFAULT ''"),
]


def ensure_schema(db):
    for table, column, ddl in ADDITIVE_COLUMNS:
        existing = {c["name"] for c in inspect(db.engine).get_columns(table)}
        if column in existing:
            continue
        try:
            with db.engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            log.warning("added column %s.%s", table, column)
        except SQLAlchemyError:
            # Another replica probably added it first; re-check instead of failing the start-up.
            if column not in {c["name"] for c in inspect(db.engine).get_columns(table)}:
                raise
