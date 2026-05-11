Migration helper
================

This folder contains a script to migrate existing SQLite `sql_app.db` data into a target database (Postgres recommended).

Quick steps
-----------
1. Install a Postgres client driver in the backend venv:

   PowerShell:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   python -m pip install psycopg2-binary
   ```

2. Set the `TARGET_DATABASE_URL` environment variable. Example:

   ```powershell
   $env:TARGET_DATABASE_URL = "postgresql+psycopg2://user:password@localhost:5432/aura_analyst"
   python backend\scripts\migrate_sqlite_to_target.py
   ```

3. The script will create the `analysis_results` table in the target DB (using ORM metadata) and copy records from `sql_app.db`.

Notes
-----
- The script skips records whose `id` already exists in the target to avoid collisions.
- It attempts to parse JSON fields stored as strings in SQLite into JSON objects for target JSON columns.
- For production, consider using `pgloader` or a more robust migration with backups.
