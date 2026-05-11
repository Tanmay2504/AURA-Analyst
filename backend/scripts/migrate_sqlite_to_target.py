"""
Migration helper: copy analysis records from the local SQLite DB to a target database.

Usage:
  - Set TARGET_DATABASE_URL (e.g. postgresql+psycopg2://user:pass@host:5432/dbname)
  - Optionally set SOURCE_DATABASE_URL (default: sqlite:///./sql_app.db)
  - Run: python migrate_sqlite_to_target.py

Notes:
  - Requires SQLAlchemy and a DB driver for the target (e.g. psycopg2-binary for Postgres).
  - The script will create the target table based on the ORM model if it does not exist.
  - Existing records (by `id`) are skipped to avoid collisions.
"""

import os
import json
from sqlalchemy import create_engine, select, Table, MetaData
from sqlalchemy.exc import SQLAlchemyError

SOURCE_URL = os.getenv("SOURCE_DATABASE_URL", "sqlite:///./sql_app.db")
TARGET_URL = os.getenv("TARGET_DATABASE_URL")

if not TARGET_URL:
    print("ERROR: Set TARGET_DATABASE_URL environment variable (e.g. postgresql+psycopg2://user:pass@host:5432/dbname)")
    raise SystemExit(1)

# Import ORM models so we can create tables on target if needed
from backend.database import models
from backend.database.session import Base

# Engines
def _engine_for(url):
    if url.startswith("sqlite:"):
        return create_engine(url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    return create_engine(url, pool_pre_ping=True)

source_engine = _engine_for(SOURCE_URL)
target_engine = _engine_for(TARGET_URL)

# Ensure target tables exist based on ORM
Base.metadata.create_all(bind=target_engine)

metadata = MetaData()

try:
    source_table = Table('analysis_results', metadata, autoload_with=source_engine)
except Exception as e:
    print(f"ERROR: Could not reflect source table: {e}")
    raise

# Reflect target table as well
try:
    target_table = Table('analysis_results', metadata, autoload_with=target_engine)
except Exception as e:
    print(f"ERROR: Could not reflect target table: {e}")
    raise

with source_engine.connect() as sconn, target_engine.connect() as tconn:
    # fetch existing ids in target to avoid collisions
    existing_ids = set()
    try:
        res = tconn.execute(select(target_table.c.id))
        existing_ids = {row[0] for row in res.fetchall()}
    except SQLAlchemyError:
        existing_ids = set()

    sel = select(source_table)
    rows = sconn.execute(sel).mappings().all()

    copied = 0
    skipped = 0
    for row in rows:
        row_id = row.get('id')
        if row_id in existing_ids:
            skipped += 1
            continue

        # Normalize JSON/text fields
        insights = row.get('insights')
        chart_data = row.get('chart_data')

        def _parse_json(value):
            if value is None:
                return None
            if isinstance(value, (bytes, bytearray)):
                try:
                    return json.loads(value.decode('utf-8'))
                except Exception:
                    return None
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except Exception:
                    return value
            return value

        parsed_insights = _parse_json(insights)
        parsed_chart = _parse_json(chart_data)

        insert_values = {
            'id': row_id,
            'filename': row.get('filename'),
            'summary': row.get('summary'),
            'insights': parsed_insights,
            'chart_data': parsed_chart,
            'raw_csv': row.get('raw_csv'),
            'created_at': row.get('created_at')
        }

        try:
            tconn.execute(target_table.insert().values(**insert_values))
            copied += 1
        except SQLAlchemyError as e:
            print(f"Failed to insert id={row_id}: {e}")
            skipped += 1

    print(f"Done. Copied={copied}, Skipped={skipped}, TotalSource={len(rows)}")
