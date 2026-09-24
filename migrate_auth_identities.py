import pyodbc
import psycopg2
import json
from datetime import datetime

# ============================================================
# CONFIGURATION
# ============================================================

PG_CONFIG = {
    "host": "aws-1-eu-west-1.pooler.supabase.com",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres.oufvsybkuvkgqytfrwxt",
}

SQLSERVER_CONNECTION = (
    r"DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=DESKTOP-CU0HLSG\MSSQLSERVER01;"
    r"DATABASE=AzharManagementBackup_Migration;"
    r"Trusted_Connection=yes;"
)

# ============================================================
# HELPERS
# ============================================================

def normalize_datetime(value):
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is not None:
            value = value.replace(tzinfo=None)
        return value

    text = str(value).strip()

    if not text:
        return None

    try:
        text = text.replace("Z", "+00:00")
        value = datetime.fromisoformat(text)

        if value.tzinfo is not None:
            value = value.replace(tzinfo=None)

        return value

    except Exception:
        return None


def normalize_json(value):
    if value is None:
        return None

    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)

    text = str(value)

    try:
        parsed = json.loads(text)
        return json.dumps(parsed, ensure_ascii=False)
    except Exception:
        return text


# ============================================================
# START
# ============================================================

print("=" * 60)
print("AZHAR AUTH IDENTITIES MIGRATION")
print("=" * 60)

# ------------------------------------------------------------
# PostgreSQL connection
# ------------------------------------------------------------

print("\nConnecting to Supabase PostgreSQL...")

pg = psycopg2.connect(
    host=PG_CONFIG["host"],
    port=PG_CONFIG["port"],
    dbname=PG_CONFIG["dbname"],
    user=PG_CONFIG["user"],
)

pg_cursor = pg.cursor()

print("Supabase PostgreSQL connection OK")

# ------------------------------------------------------------
# Read identity data
# ------------------------------------------------------------

query = """
SELECT
    id,
    user_id,
    provider_id,
    provider,
    email,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
FROM auth.identities
ORDER BY created_at;
"""

pg_cursor.execute(query)

rows = pg_cursor.fetchall()

print(f"Auth identities found: {len(rows)}")

# ------------------------------------------------------------
# SQL Server connection
# ------------------------------------------------------------

print("\nConnecting to SQL Server...")

sql = pyodbc.connect(SQLSERVER_CONNECTION)
sql_cursor = sql.cursor()

print("SQL Server connection OK")

# ------------------------------------------------------------
# Remove previous table
# ------------------------------------------------------------

print("\nPreparing SQL Server table...")

sql_cursor.execute("""
IF OBJECT_ID('dbo.auth_identities_reference', 'U') IS NOT NULL
    DROP TABLE dbo.auth_identities_reference;
""")

sql.commit()

# ------------------------------------------------------------
# Create table
# ------------------------------------------------------------

sql_cursor.execute("""
CREATE TABLE dbo.auth_identities_reference
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,

    user_id UNIQUEIDENTIFIER NOT NULL,

    provider_id NVARCHAR(320) NULL,

    provider NVARCHAR(100) NULL,

    email NVARCHAR(320) NULL,

    identity_data NVARCHAR(MAX) NULL,

    last_sign_in_at DATETIME2(6) NULL,

    created_at DATETIME2(6) NULL,

    updated_at DATETIME2(6) NULL
);
""")

sql.commit()

print("CREATED: dbo.auth_identities_reference")

# ------------------------------------------------------------
# Insert
# ------------------------------------------------------------

insert_sql = """
INSERT INTO dbo.auth_identities_reference
(
    id,
    user_id,
    provider_id,
    provider,
    email,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES
(
    ?, ?, ?, ?, ?, ?, ?, ?, ?
);
"""

loaded = 0

for row in rows:

    (
        identity_id,
        user_id,
        provider_id,
        provider,
        email,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at,
    ) = row

    values = (
        str(identity_id),
        str(user_id),
        provider_id,
        provider,
        email,
        normalize_json(identity_data),
        normalize_datetime(last_sign_in_at),
        normalize_datetime(created_at),
        normalize_datetime(updated_at),
    )

    try:
        sql_cursor.execute(insert_sql, values)
        loaded += 1

    except Exception as error:
        print("\nERROR while inserting identity:")
        print(error)
        print("Identity ID:", identity_id)
        print("User ID:", user_id)
        print("Provider:", provider)
        raise

sql.commit()

print(f"LOADED: auth_identities_reference -> {loaded} rows")

# ------------------------------------------------------------
# Verification
# ------------------------------------------------------------

sql_cursor.execute("""
SELECT COUNT(*)
FROM dbo.auth_identities_reference;
""")

count = sql_cursor.fetchone()[0]

print(f"VERIFICATION: {count} rows")

# ------------------------------------------------------------
# Close
# ------------------------------------------------------------

pg_cursor.close()
pg.close()

sql_cursor.close()
sql.close()

print("\n" + "=" * 60)
print("AUTH IDENTITIES MIGRATION FINISHED")
print("=" * 60)

print("\nIMPORTANT:")
print("- No passwords were copied.")
print("- No authentication tokens were copied.")
print("- Supabase was NOT modified.")
print("- Only AzharManagementBackup_Migration was modified.")
print("=" * 60)