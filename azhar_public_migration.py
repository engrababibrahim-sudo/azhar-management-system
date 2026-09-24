import re
import csv
import pyodbc


# ============================================================
# CONFIGURATION
# ============================================================

BACKUP_FILE = (
    r"C:\Users\Rabab Ibrahim\Documents\Azhar Backups"
    r"\database-backup-current.sql"
)

SQL_SERVER = r"DESKTOP-CU0HLSG\MSSQLSERVER01"
TARGET_DATABASE = "AzharManagementBackup_Migration"

CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    f"SERVER={SQL_SERVER};"
    f"DATABASE={TARGET_DATABASE};"
    "Trusted_Connection=yes;"
)


# ============================================================
# IDENTIFIERS
# ============================================================

def quote_identifier(name):
    return "[" + name.replace("]", "]]") + "]"


# ============================================================
# SPLIT CREATE TABLE
# ============================================================

def split_top_level(text):
    parts = []
    start = 0
    depth = 0
    quote = None
    i = 0

    while i < len(text):

        ch = text[i]

        if quote:

            if ch == quote:

                if i + 1 < len(text) and text[i + 1] == quote:
                    i += 2
                    continue

                quote = None

        else:

            if ch in ("'", '"'):
                quote = ch

            elif ch == "(":
                depth += 1

            elif ch == ")":
                depth -= 1

            elif ch == "," and depth == 0:

                parts.append(
                    text[start:i].strip()
                )

                start = i + 1

        i += 1

    tail = text[start:].strip()

    if tail:
        parts.append(tail)

    return parts


# ============================================================
# POSTGRES TYPE -> SQL SERVER TYPE
# ============================================================

def convert_type(pg_type):

    t = pg_type.strip()

    t = re.sub(
        r"\s+COLLATE\s+\S+",
        "",
        t,
        flags=re.I
    )

    t = re.sub(
        r"\s+DEFAULT\s+.+$",
        "",
        t,
        flags=re.I
    )

    # character varying(n)
    m = re.fullmatch(
        r"character varying\s*\(\s*(\d+)\s*\)",
        t,
        re.I
    )

    if m:
        return f"NVARCHAR({m.group(1)})"

    # varchar(n)
    m = re.fullmatch(
        r"varchar\s*\(\s*(\d+)\s*\)",
        t,
        re.I
    )

    if m:
        return f"NVARCHAR({m.group(1)})"

    # character(n)
    m = re.fullmatch(
        r"character\s*\(\s*(\d+)\s*\)",
        t,
        re.I
    )

    if m:
        return f"NCHAR({m.group(1)})"

    # numeric / decimal precision
    m = re.fullmatch(
        r"(numeric|decimal)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)",
        t,
        re.I
    )

    if m:

        precision = min(
            int(m.group(2)),
            38
        )

        scale = min(
            int(m.group(3)),
            precision
        )

        return f"DECIMAL({precision},{scale})"

    mappings = {

        "uuid": "UNIQUEIDENTIFIER",

        "text": "NVARCHAR(MAX)",
        "json": "NVARCHAR(MAX)",
        "jsonb": "NVARCHAR(MAX)",

        "boolean": "BIT",
        "bool": "BIT",

        "bigint": "BIGINT",
        "int8": "BIGINT",

        "integer": "INT",
        "int4": "INT",

        "smallint": "SMALLINT",
        "int2": "SMALLINT",

        "real": "REAL",

        "double precision": "FLOAT",

        "numeric": "DECIMAL(38,10)",
        "decimal": "DECIMAL(38,10)",

        "date": "DATE",

        "timestamp": "DATETIME2(6)",
        "timestamp without time zone": "DATETIME2(6)",
        "timestamp with time zone": "DATETIME2(6)",
        "timestamptz": "DATETIME2(6)",

        "time": "TIME",
        "time without time zone": "TIME",
        "time with time zone": "TIME",

        "bytea": "VARBINARY(MAX)",
    }

    key = t.lower()

    if key in mappings:
        return mappings[key]

    # PostgreSQL arrays
    if t.endswith("[]"):
        return "NVARCHAR(MAX)"

    # Unknown PostgreSQL types are preserved as text
    return "NVARCHAR(MAX)"


# ============================================================
# EXTRACT PUBLIC TABLES
# ============================================================

def extract_tables(sql):

    pattern = re.compile(
        r"CREATE TABLE\s+"
        r"(?:IF NOT EXISTS\s+)?"
        r"public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(",
        re.I
    )

    tables = []

    for match in pattern.finditer(sql):

        table_name = match.group(1)

        start = match.end() - 1

        depth = 0
        quote = None
        end = None

        i = start

        while i < len(sql):

            ch = sql[i]

            if quote:

                if ch == quote:

                    if (
                        i + 1 < len(sql)
                        and sql[i + 1] == quote
                    ):
                        i += 2
                        continue

                    quote = None

            else:

                if ch == "'":
                    quote = "'"

                elif ch == "(":
                    depth += 1

                elif ch == ")":

                    depth -= 1

                    if depth == 0:
                        end = i
                        break

            i += 1

        if end is None:
            continue

        body = sql[start + 1:end]

        columns = []

        for item in split_top_level(body):

            item = item.strip()

            if not item:
                continue

            # Ignore table constraints
            if re.match(
                r"^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)",
                item,
                re.I
            ):
                continue

            column_match = re.match(
                r'^"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(.+)$',
                item,
                re.S
            )

            if not column_match:
                continue

            column_name = column_match.group(1)

            definition = column_match.group(2).strip()

            type_match = re.match(
                r"(.+?)(?=\s+"
                r"(?:DEFAULT|NOT\s+NULL|NULL|PRIMARY\s+KEY|"
                r"UNIQUE|CHECK|REFERENCES|COLLATE|GENERATED)"
                r"\b|$)",
                definition,
                re.I | re.S
            )

            if type_match:
                pg_type = type_match.group(1).strip()
            else:
                pg_type = definition

            sql_type = convert_type(pg_type)

            columns.append(
                (
                    column_name,
                    sql_type
                )
            )

        tables.append(
            (
                table_name,
                columns
            )
        )

    return tables


# ============================================================
# POSTGRES COPY VALUE DECODER
# ============================================================

def decode_postgres_copy_value(value):

    if value == r"\N":
        return None

    result = []

    i = 0

    while i < len(value):

        ch = value[i]

        if ch != "\\":
            result.append(ch)
            i += 1
            continue

        if i + 1 >= len(value):
            result.append("\\")
            i += 1
            continue

        next_char = value[i + 1]

        mappings = {
            "b": "\b",
            "f": "\f",
            "n": "\n",
            "r": "\r",
            "t": "\t",
            "v": "\v",
            "\\": "\\",
        }

        if next_char in mappings:

            result.append(
                mappings[next_char]
            )

            i += 2

            continue

        # Octal escape
        if next_char in "01234567":

            octal = next_char

            j = i + 2

            while (
                j < len(value)
                and len(octal) < 3
                and value[j] in "01234567"
            ):
                octal += value[j]
                j += 1

            try:

                result.append(
                    chr(int(octal, 8))
                )

            except Exception:

                result.append(octal)

            i = j

            continue

        result.append(next_char)

        i += 2

    return "".join(result)


# ============================================================
# PARSE ONE COPY LINE
# ============================================================

def parse_copy_line(line):

    raw_fields = []

    current = []

    escaped = False

    for ch in line:

        if escaped:

            current.append("\\")
            current.append(ch)

            escaped = False

        elif ch == "\\":

            escaped = True

        elif ch == "\t":

            raw_fields.append(
                "".join(current)
            )

            current = []

        else:

            current.append(ch)

    if escaped:
        current.append("\\")

    raw_fields.append(
        "".join(current)
    )

    return [
        decode_postgres_copy_value(value)
        for value in raw_fields
    ]


# ============================================================
# EXTRACT COPY DATA
# ============================================================

def extract_copy_data(sql):

    pattern = re.compile(
        r"COPY\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s*"
        r"\((.*?)\)\s+FROM\s+stdin;\s*\n"
        r"(.*?)"
        r"^\\\.\s*$",
        re.I | re.S | re.M
    )

    result = {}

    for match in pattern.finditer(sql):

        table_name = match.group(1)

        columns_text = match.group(2)

        columns = [
            column.strip().strip('"')
            for column in columns_text.split(",")
            if column.strip()
        ]

        data_text = match.group(3)

        rows = []

        for line in data_text.splitlines():

            if not line:
                continue

            row = parse_copy_line(line)

            rows.append(row)

        result[table_name] = (
            columns,
            rows
        )

    return result


# ============================================================
# SQL SERVER HELPERS
# ============================================================

def table_exists(cur, table_name):

    cur.execute(
        """
        SELECT 1
        FROM sys.tables
        WHERE name = ?
        AND schema_id = SCHEMA_ID('dbo')
        """,
        table_name
    )

    return cur.fetchone() is not None


def drop_existing_tables(
    cur,
    conn,
    tables
):

    print()
    print(
        "Removing previous migration tables..."
    )

    for table_name, _ in reversed(tables):

        if table_exists(
            cur,
            table_name
        ):

            cur.execute(
                f"DROP TABLE dbo."
                f"{quote_identifier(table_name)}"
            )

            conn.commit()

            print(
                "DROPPED:",
                table_name
            )


def create_tables(
    cur,
    conn,
    tables
):

    print()
    print(
        "Creating SQL Server tables..."
    )

    for table_name, columns in tables:

        if not columns:
            continue

        definitions = ",\n".join(
            f"    {quote_identifier(name)} "
            f"{sql_type} NULL"
            for name, sql_type
            in columns
        )

        create_sql = (
            f"CREATE TABLE dbo."
            f"{quote_identifier(table_name)} "
            f"(\n"
            f"{definitions}\n"
            f")"
        )

        cur.execute(create_sql)

        conn.commit()

        print(
            "CREATED:",
            table_name
        )


# ============================================================
# VALUE CONVERSION
# ============================================================

def convert_value(
    value,
    sql_type
):

    if value is None:
        return None

    # --------------------------------------------------------
    # BOOLEAN
    # --------------------------------------------------------

    if sql_type == "BIT":

        value_lower = str(value).strip().lower()

        if value_lower in (
            "true",
            "t",
            "1"
        ):
            return 1

        if value_lower in (
            "false",
            "f",
            "0"
        ):
            return 0

        return None

    # --------------------------------------------------------
    # DATETIME2
    # --------------------------------------------------------

    if sql_type.startswith("DATETIME2"):

        text = str(value).strip()

        # Remove Z
        if text.endswith("Z"):
            text = text[:-1]

        # Remove timezone +00
        text = re.sub(
            r"([+-])\d{2}$",
            "",
            text
        )

        # Remove timezone +00:00
        text = re.sub(
            r"([+-])\d{2}:\d{2}$",
            "",
            text
        )

        # PostgreSQL ISO separator
        text = text.replace(
            "T",
            " "
        )

        return text

    # --------------------------------------------------------
    # DATE
    # --------------------------------------------------------

    if sql_type == "DATE":

        text = str(value).strip()

        match = re.match(
            r"^(\d{4}-\d{2}-\d{2})",
            text
        )

        if match:
            return match.group(1)

        return text

    # --------------------------------------------------------
    # TIME
    # --------------------------------------------------------

    if sql_type == "TIME":

        text = str(value).strip()

        text = re.sub(
            r"([+-])\d{2}:\d{2}$",
            "",
            text
        )

        text = re.sub(
            r"([+-])\d{2}$",
            "",
            text
        )

        return text

    # --------------------------------------------------------
    # DEFAULT
    # --------------------------------------------------------

    return value


# ============================================================
# LOAD TABLE
# ============================================================

def load_table(
    cur,
    conn,
    table_name,
    table_columns,
    copy_columns,
    rows
):

    if not rows:

        print(
            "EMPTY:",
            table_name
        )

        return 0

    type_map = {
        name.lower(): sql_type
        for name, sql_type
        in table_columns
    }

    column_sql = ", ".join(
        quote_identifier(column)
        for column in copy_columns
    )

    placeholders = ", ".join(
        "?"
        for _ in copy_columns
    )

    insert_sql = (
        f"INSERT INTO dbo."
        f"{quote_identifier(table_name)} "
        f"({column_sql}) "
        f"VALUES ({placeholders})"
    )

    count = 0

    # NO fast_executemany
    # This avoids the previous pyodbc buffer problem.

    for row_number, row in enumerate(
        rows,
        start=1
    ):

        if len(row) != len(copy_columns):

            raise RuntimeError(
                f"Column/value count mismatch "
                f"in {table_name}, row {row_number}: "
                f"{len(copy_columns)} columns vs "
                f"{len(row)} values"
            )

        values = []

        for index, value in enumerate(row):

            column_name = copy_columns[index]

            sql_type = type_map.get(
                column_name.lower(),
                "NVARCHAR(MAX)"
            )

            values.append(
                convert_value(
                    value,
                    sql_type
                )
            )

        try:

            cur.execute(
                insert_sql,
                values
            )

            count += 1

            if count % 100 == 0:
                conn.commit()

        except Exception as error:

            conn.rollback()

            print()
            print(
                "ERROR while loading:"
            )

            print(
                "Table:",
                table_name
            )

            print(
                "Row:",
                row_number
            )

            print(
                "Values:",
                values
            )

            print(
                "Error:",
                error
            )

            raise

    conn.commit()

    return count


# ============================================================
# MAIN
# ============================================================

def main():

    print(
        "=========================================="
    )

    print(
        "AZHAR PUBLIC DATA MIGRATION V4"
    )

    print(
        "=========================================="
    )

    # --------------------------------------------------------
    # READ BACKUP
    # --------------------------------------------------------

    print()
    print(
        "Reading backup..."
    )

    with open(
        BACKUP_FILE,
        "r",
        encoding="utf-8",
        errors="replace"
    ) as file:

        sql = file.read()

    print(
        "Backup read OK:",
        len(sql),
        "characters"
    )

    # --------------------------------------------------------
    # PARSE
    # --------------------------------------------------------

    print()
    print(
        "Parsing tables..."
    )

    tables = extract_tables(sql)

    data = extract_copy_data(sql)

    print(
        "Public tables found:",
        len(tables)
    )

    print(
        "COPY blocks found:",
        len(data)
    )

    if not tables:

        raise RuntimeError(
            "No public tables were found "
            "inside the backup."
        )

    if not data:

        raise RuntimeError(
            "No PostgreSQL COPY blocks were found "
            "inside the backup."
        )

    # --------------------------------------------------------
    # CONNECT
    # --------------------------------------------------------

    print()
    print(
        "Connecting to SQL Server..."
    )

    conn = pyodbc.connect(
        CONNECTION_STRING
    )

    cur = conn.cursor()

    print(
        "SQL Server migration database "
        "connection OK"
    )

    # --------------------------------------------------------
    # RESET
    # --------------------------------------------------------

    drop_existing_tables(
        cur,
        conn,
        tables
    )

    # --------------------------------------------------------
    # CREATE
    # --------------------------------------------------------

    create_tables(
        cur,
        conn,
        tables
    )

    # --------------------------------------------------------
    # LOAD
    # --------------------------------------------------------

    print()
    print(
        "Loading data..."
    )

    total_rows = 0

    for table_name, table_columns in tables:

        if table_name not in data:

            print(
                "NO COPY DATA:",
                table_name
            )

            continue

        copy_columns, rows = data[
            table_name
        ]

        count = load_table(
            cur,
            conn,
            table_name,
            table_columns,
            copy_columns,
            rows
        )

        total_rows += count

        print(
            f"LOADED: {table_name} "
            f"-> {count} rows"
        )

    # --------------------------------------------------------
    # CLOSE
    # --------------------------------------------------------

    cur.close()

    conn.close()

    print()
    print(
        "=========================================="
    )

    print(
        "MIGRATION FINISHED SUCCESSFULLY"
    )

    print(
        "TOTAL ROWS:",
        total_rows
    )

    print(
        "=========================================="
    )

    print()
    print(
        "Supabase was NOT modified."
    )

    print(
        "AzharManagementBackup was NOT modified."
    )

    print(
        "Only AzharManagementBackup_Migration "
        "was modified."
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    main()