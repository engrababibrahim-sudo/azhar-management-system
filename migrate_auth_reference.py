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
# SAFE AUTH COLUMNS
# ============================================================

SAFE_COLUMNS = [
    "id",
    "email",
    "role",
    "phone",
    "email_confirmed_at",
    "phone_confirmed_at",
    "confirmed_at",
    "invited_at",
    "last_sign_in_at",
    "created_at",
    "updated_at",
    "raw_app_meta_data",
    "raw_user_meta_data",
    "is_super_admin",
]

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
# MAIN
# ============================================================

print("=" * 60)
print("AZHAR AUTH REFERENCE MIGRATION")
print("=" * 60)

# ------------------------------------------------------------
# Connect PostgreSQL
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
# Read safe auth data
# ------------------------------------------------------------

column_sql = ", ".join(SAFE_COLUMNS)

query = f"""
SELECT {column_sql}
FROM auth.users
ORDER BY created_at;
"""

pg_cursor.execute(query)

rows = pg_cursor.fetchall()

print(f"Auth users found: {len(rows)}")

# ------------------------------------------------------------
# Connect SQL Server
# ------------------------------------------------------------

print("\nConnecting to SQL Server...")

sql = pyodbc.connect(SQLSERVER_CONNECTION)
sql_cursor = sql.cursor()

print("SQL Server connection OK")

# ------------------------------------------------------------
# Remove old reference table
# ------------------------------------------------------------

print("\nPreparing SQL Server table...")

sql_cursor.execute("""
IF OBJECT_ID('dbo.auth_users_reference', 'U') IS NOT NULL
    DROP TABLE dbo.auth_users_reference;
""")

sql.commit()

# ------------------------------------------------------------
# Create safe reference table
# ------------------------------------------------------------

sql_cursor.execute("""
CREATE TABLE dbo.auth_users_reference
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,

    email NVARCHAR(320) NULL,

    role NVARCHAR(100) NULL,

    phone NVARCHAR(100) NULL,

    email_confirmed_at DATETIME2(6) NULL,

    phone_confirmed_at DATETIME2(6) NULL,

    confirmed_at DATETIME2(6) NULL,

    invited_at DATETIME2(6) NULL,

    last_sign_in_at DATETIME2(6) NULL,

    created_at DATETIME2(6) NULL,

    updated_at DATETIME2(6) NULL,

    raw_app_meta_data NVARCHAR(MAX) NULL,

    raw_user_meta_data NVARCHAR(MAX) NULL,

    is_super_admin BIT NULL
);
""")

sql.commit()

print("CREATED: dbo.auth_users_reference")

# ------------------------------------------------------------
# Insert data
# ------------------------------------------------------------

insert_sql = """
INSERT INTO dbo.auth_users_reference
(
    id,
    email,
    role,
    phone,
    email_confirmed_at,
    phone_confirmed_at,
    confirmed_at,
    invited_at,
    last_sign_in_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES
(
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
);
"""

loaded = 0

for row in rows:

    (
        user_id,
        email,
        role,
        phone,
        email_confirmed_at,
        phone_confirmed_at,
        confirmed_at,
        invited_at,
        last_sign_in_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
    ) = row

    values = (
        str(user_id),
        email,
        role,
        phone,
        normalize_datetime(email_confirmed_at),
        normalize_datetime(phone_confirmed_at),
        normalize_datetime(confirmed_at),
        normalize_datetime(invited_at),
        normalize_datetime(last_sign_in_at),
        normalize_datetime(created_at),
        normalize_datetime(updated_at),
        normalize_json(raw_app_meta_data),
        normalize_json(raw_user_meta_data),
        bool(is_super_admin) if is_super_admin is not None else None,
    )

    try:
        sql_cursor.execute(insert_sql, values)
        loaded += 1

    except Exception as error:
        print("\nERROR while inserting Auth user:")
        print(error)
        print("User ID:", user_id)
        print("Email:", email)
        raise

sql.commit()

print(f"LOADED: auth_users_reference -> {loaded} rows")

# ------------------------------------------------------------
# Verification
# ------------------------------------------------------------

sql_cursor.execute("""
SELECT COUNT(*)
FROM dbo.auth_users_reference;
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
print("AUTH REFERENCE MIGRATION FINISHED")
print("=" * 60)

print("\nIMPORTANT:")
print("- Passwords were NOT copied.")
print("- Confirmation tokens were NOT copied.")
print("- Recovery tokens were NOT copied.")
print("- Sessions were NOT copied.")
print("- Refresh tokens were NOT copied.")
print("- Supabase was NOT modified.")
print("- Only AzharManagementBackup_Migration was modified.")
print("=" * 60)