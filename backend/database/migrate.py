"""
Database migration script — run this whenever the schema changes.
Safely adds any missing columns to existing SQLite databases.
Usage: python -m backend.database.migrate
"""
import sqlite3
import os

# Resolve path to sql_app.db (always in project root)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(ROOT, "sql_app.db")

# Expected columns: (name, type, nullable)
EXPECTED_COLUMNS = [
    ("id", "INTEGER", False),
    ("filename", "VARCHAR", True),
    ("summary", "TEXT", True),
    ("insights", "JSON", True),
    ("chart_data", "JSON", True),
    ("forecast_data", "JSON", True),
    ("analysis_metadata", "JSON", True),
    ("agent_status", "JSON", True),
    ("raw_csv", "BLOB", True),
    ("created_at", "DATETIME", True),
    ("session_id", "VARCHAR", True),
]


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"[migrate] No database found at {DB_PATH} — will be created on first run.")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(analysis_results)")
    existing = {row[1] for row in cur.fetchall()}
    print(f"[migrate] Existing columns: {sorted(existing)}")

    added = []
    for col_name, col_type, nullable in EXPECTED_COLUMNS:
        if col_name not in existing:
            null_clause = "" if nullable else " NOT NULL DEFAULT ''"
            cur.execute(f"ALTER TABLE analysis_results ADD COLUMN {col_name} {col_type}{null_clause}")
            added.append(col_name)
            print(f"[migrate] Added column: {col_name} {col_type}")

    if added:
        conn.commit()
        print(f"[migrate] Migration complete. Added: {added}")
    else:
        print("[migrate] Schema is up to date. No changes needed.")

    conn.close()


if __name__ == "__main__":
    migrate()
