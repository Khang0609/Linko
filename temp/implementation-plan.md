# Implementation Plan — Linko Backend (Issue #4)

> **Tài liệu cho:** Agent thực thi (human hoặc AI).
> **Mục đích:** Implement backend Python cho Linko theo schema FINAL, đạt DoD issue #4.
> **Self-contained:** Agent chỉ cần đọc file này + `temp/schema.md` + `temp/verification.md` để thực hiện. Không cần hỏi lại user trừ khi gặp edge case ngoài scope.
> **Ngày tạo:** 2026-06-25
> **Target completion:** 1 session làm việc.

---

## 0. How to use this document

### 0.1 Read order (BẮT BUỘC trước khi code)

1. Đọc **Section 1 (Context)** — hiểu repo state, tooling, conventions.
2. Đọc **Section 2 (Decisions)** — biết cái gì đã chốt, không được tự ý đổi.
3. Đọc **Section 3 (Pre-flight)** — verify môi trường trước khi bắt đầu.
4. Thực hiện **Section 4 (Steps 0–15)** theo thứ tự. Mỗi step có: Goal / Files / Content / Commands / Expected / Verify / On-failure / Commit.
5. Đối chiếu **Section 5 (Verification/DoD)** trước khi mở PR.

### 0.2 Khi nào được tự quyết vs. phải hỏi user

- **Được tự quyết:** lỗi cú pháp, version patch, thứ tự commit nhỏ, naming biến, fix lint.
- **PHẢI hỏi user:** thay đổi scope (thêm/bớt feature), đổi vị trí app, đổi tech stack, push/PR decision, gặp C1–C4 trong verification.md (claim chưa verify độc lập).

### 0.3 Không được làm

- ❌ Commit trực tiếp lên `main` hoặc `develop`.
- ❌ Push khi chưa verify local (Step 14).
- ❌ Đổi model/migration nội dung lõi (F1–F10, O1–O7) — đã chốt.
- ❌ Touch file `.roo/` (chứa credential, đã được user tự xử lý).
- ❌ Implement matching logic M2 (ngoài scope issue #4).

---

## 1. Context

### 1.1 Repo state (verify trước khi bắt đầu)

- **Repo:** `C:\Projects\Linko` — git repo, branch `main`, có `origin/develop`.
- **Type:** Monorepo **pnpm 10 + Nx 23** (Node 24), nhưng **backend Python** là app mới (không Nx-managed).
- **Existing apps:** `apps/web-app/` (JS stub), `packages/core-utils/` (JS).
- **Chưa có backend** — đây là lần đầu tạo.
- **Git conventions:** Conventional Commits bắt buộc (commitlint + husky), GitFlow (`feature/*` → `develop`), Draft PR bắt buộc. Lint-staged chạy prettier/eslint trên JS/JSON/YAML/MD — **không động Python** (chỉ format).

### 1.2 Tooling local (đã verify available)

| Tool   | Version                 | Dùng cho                              |
| ------ | ----------------------- | ------------------------------------- |
| Python | 3.14.3 (system)         | ⚠️ quá mới — **PHẢI pin 3.11** qua uv |
| uv     | 0.10.8                  | venv + deps + lock                    |
| Docker | 29.4.3 + Compose v5.1.3 | local PG + API                        |
| pnpm   | (có)                    | không dùng cho backend                |
| git    | (có)                    | branch + commit                       |

### 1.3 Key references (đọc khi cần)

- `temp/schema.md` — schema FINAL. **Mục 5** = DDL đối chiếu, **Mục 7** = SQLAlchemy models (SoT), **Mục 8** = Alembic env + migration skeleton, **Mục 11** = seed script, **Mục 12** = Dockerfile + docker-compose.
- `temp/verification.md` — proof cho 22 claims (18 verified, 4 cần manual confirm C1–C4).
- `temp/pr-body.md` — **PR body đã soạn sẵn** (reasoning + evidence cho team review). Agent DÙNG FILE NÀY khi `gh pr create --body-file`, KHÔNG tự viết body.
- `MONOREPO_GUIDE.md` — quy ước `@linko/` scope, apps/ packages/.
- `GITFLOW_GUIDE.md` — feature branch + Draft PR về develop.

### 1.4 Final structure sẽ tạo

```
apps/api/                          ← backend Python (uv-managed)
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI + GET /health
│   ├── config.py                  # pydantic-settings
│   ├── database.py                # async engine + sessionmaker
│   └── models.py                  # copy verbatim schema.md Mục 7
├── alembic/
│   ├── env.py                     # render_item pgvector + compare_type
│   ├── script.py.mako             # standard alembic template
│   └── versions/
│       └── 0001_init.py           # autogenerate → edit thêm ext+trigger
├── scripts/
│   └── seed.py                    # copy verbatim schema.md Mục 11 + entry point
├── tests/
│   ├── __init__.py
│   └── test_health.py
├── pyproject.toml
├── uv.lock                        # sinh bởi `uv lock`
├── alembic.ini
├── .python-version
├── .dockerignore
├── Dockerfile                     # uv-based (T1)
├── docker-compose.yml             # copy schema.md Mục 12
└── README.md
.github/workflows/ci-backend.yml   # Python CI (T5)
.gitignore                         # edit root, thêm Python entries
```

---

## 2. Decisions (ĐÃ CHỐT — không tự ý đổi)

### 2.1 Từ plan đã duyệt

| ID  | Quyết định                                                                       | Lý do                                              |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| D1  | Backend ở `apps/api/` (không phải `linko-backend/` ở root)                       | Tuân MONOREPO_GUIDE (`apps/*`), song song JS apps. |
| D2  | Scope = đúng DoD issue #4 (schema + migration + seed + Docker + health endpoint) | Bám issue. M2 matching là issue khác.              |
| D3  | Git flow = `feature/4-db-schema-backend` từ `develop` → Draft PR về `develop`    | Tuân GITFLOW_GUIDE.                                |

### 2.2 Cải tiến so với schema.md (T1–T5, đã verify trong verification.md)

| ID  | Schema đề xuất                 | Bản này                            | Lý do                                             |
| --- | ------------------------------ | ---------------------------------- | ------------------------------------------------- |
| T1  | `requirements.txt` + pip       | `pyproject.toml` + `uv.lock` + uv  | Lock reproducible, Docker cache tốt. uv có local. |
| T2  | (không lint/test)              | Thêm `ruff` + `pytest`             | CI Python riêng, convention monorepo.             |
| T3  | Dockerfile `python:3.11-slim`  | Giữ `3.11-slim`                    | 3.14 quá mới (asyncpg/psycopg wheel rủi ro).      |
| T4  | compose trong `linko-backend/` | Trong `apps/api/`                  | Cô lập backend, khớp vị trí.                      |
| T5  | (không CI Python)              | `.github/workflows/ci-backend.yml` | CI hiện chỉ Node. Path filter `apps/api/**`.      |

### 2.3 Giữ nguyên từ schema.md (KHÔNG đổi)

- Toàn bộ models (Mục 7) — đã fix F1–F7.
- DDL đối chiếu (Mục 5).
- Alembic env `render_item` (Mục 8).
- Seed script (Mục 11).
- Quyết định O1–O7 (embedding model, cosine, no provinces table, v.v.).

---

## 3. Pre-flight checks (chạy trước Step 0)

### 3.1 Verify tooling

```bash
python --version        # expect: 3.14.x (OK, sẽ pin 3.11)
uv --version            # expect: 0.10.x
docker --version        # expect: 29.x
docker compose version  # expect: v5.x
git -C "C:/Projects/Linko" status   # expect: clean (chỉ .roo/ untracked)
```

### 3.2 Verify ports free (Windows)

```bash
netstat -ano | findstr ":5432"   # expect: empty (PG port)
netstat -ano | findstr ":8080"   # expect: empty (API port)
```

**On-failure:** Nếu port bận → hỏi user hoặc đổi port trong docker-compose (mapping `5433:5432`, update DATABASE_URL tương ứng). Note trong PR nếu đổi.

### 3.3 Verify origin/develop tồn tại

```bash
git -C "C:/Projects/Linko" branch -r | findstr develop
# expect: origin/develop
```

---

## 4. Implementation Steps

### Step 0 — Git setup

**Goal:** Tạo feature branch từ develop.

```bash
cd "C:/Projects/Linko"
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/4-db-schema-backend
```

**Verify:** `git branch --show-current` → `feature/4-db-schema-backend`

**On-failure:** Nếu `develop` không pull được (conflict) → hỏi user. Không force.

---

### Step 1 — Scaffold cấu hình gốc

**Goal:** Tạo cấu hình project Python trước khi code.

**Files to create:**

#### `apps/api/.python-version`

```
3.11
```

#### `apps/api/pyproject.toml`

```toml
[project]
name = "linko-api"
version = "0.1.0"
description = "Linko backend - business matching platform (Issue #4)"
requires-python = ">=3.11,<3.13"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlalchemy>=2.0",
    "alembic>=1.13",
    "asyncpg>=0.29",
    "psycopg[binary]>=3.2",
    "pgvector>=0.3",
    "pydantic-settings>=2.0",
    "cloud-sql-python-connector[asyncpg]>=1.9",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.6",
    "pytest>=8.0",
    "httpx>=0.27",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

#### `apps/api/alembic.ini`

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
# sqlalchemy.url bị override trong env.py từ settings.alembic_database_url
sqlalchemy.url =

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

#### `apps/api/.dockerignore`

```
.venv
__pycache__
*.pyc
.pytest_cache
.ruff_cache
.git
.gitignore
.env
*.md
tests
```

**Commands:**

```bash
mkdir -p "C:/Projects/Linko/apps/api"
# tạo 4 file trên bằng editor
```

**Verify:** 4 file tồn tại.

**Commit:** (chưa commit — gộp với Step 2)

---

### Step 2 — SQLAlchemy models (SoT cho autogenerate)

**Goal:** Tạo models — nguồn chân lý cho Alembic.

**File:** `apps/api/app/models.py`

**Content:** **COPY VERBATIM** từ `temp/schema.md` **Mục 7** (từ dòng `from __future__ import annotations` đến hết class `MatchInteraction`). Không thay đổi gì — đã fix F1–F7.

Tạo thêm `apps/api/app/__init__.py` (rỗng).

**Verify:** `uv run python -c "from app.models import Base; print(len(Base.metadata.tables))"` (sau Step 5) → expect `9` (industries, intent_types, certifications, businesses, persons, business_persons, offers, needs, match_interactions).

**Commit:** `feat(api): scaffold backend app structure + SQLAlchemy models`

```bash
cd "C:/Projects/Linko"
git add apps/api/.python-version apps/api/pyproject.toml apps/api/alembic.ini apps/api/.dockerignore apps/api/app/__init__.py apps/api/app/models.py
git commit -m "feat(api): scaffold backend app structure + SQLAlchemy models

- apps/api with uv-managed pyproject.toml (T1)
- SQLAlchemy 2.0 models from schema.md Mục 7 (F1-F7 fixed)
- alembic.ini + .python-version (pin 3.11)

Refs: #4"
```

---

### Step 3 — App config + database + main

**Goal:** FastAPI app tối thiểu chạy được + health endpoint.

**Files:**

#### `apps/api/app/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Runtime (async) — asyncpg
    database_url: str = "postgresql+asyncpg://linko:linko@localhost:5432/linko"
    # Alembic (sync) — psycopg. Phải sync vì alembic env dùng engine_from_config.
    alembic_database_url: str = "postgresql+psycopg://linko:linko@localhost:5432/linko"


settings = Settings()
```

#### `apps/api/app/database.py`

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
```

#### `apps/api/app/main.py`

```python
from fastapi import FastAPI

app = FastAPI(title="Linko API", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

#### `apps/api/.env.example`

```
# Copy to .env for local dev. Real values come from docker-compose env.
DATABASE_URL=postgresql+asyncpg://linko:linko@localhost:5432/linko
ALEMBIC_DATABASE_URL=postgresql+psycopg://linko:linko@localhost:5432/linko
```

**Verify:** (sau Step 5) `uv run uvicorn app.main:app` → `curl localhost:8000/health` → `{"status":"ok"}`

**Commit:** `feat(api): add config, async database, FastAPI health endpoint`

---

### Step 4 — Alembic env + script template

**Goal:** env.py với `render_item` cho pgvector + `compare_type=True`.

**Files:**

#### `apps/api/alembic/env.py`

```python
"""Alembic env — sync engine (psycopg) + render_item for pgvector Vector type."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.models import Base  # noqa: F401 — register all models on metadata

config = context.config
# Override URL từ settings (không hardcode trong alembic.ini)
config.set_main_option("sqlalchemy.url", settings.alembic_database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# F8: tự render pgvector.sqlalchemy.Vector + thêm import vào file migration.
# Không có hook này → autogenerate sinh sa.Vector(...) không import → NameError.
def render_item(type_, obj, autogen_context):
    if type_ == "type" and obj.__class__.__module__.startswith("pgvector"):
        autogen_context.imports.add("import pgvector.sqlalchemy")
        return f"pgvector.sqlalchemy.Vector(dim={obj.dim})"
    return False


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_item=render_item,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_item=render_item,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

#### `apps/api/alembic/script.py.mako`

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

Tạo thư mục rỗng `apps/api/alembic/versions/` (thêm `.gitkeep`).

**Verify:** (sau Step 5) `uv run alembic check` → không lỗi import.

**Commit:** `feat(api): add alembic env with pgvector render_item`

---

### Step 5 — uv venv + sync deps

**Goal:** Cài deps vào venv 3.11, sinh `uv.lock`.

**Commands:**

```bash
cd "C:/Projects/Linko/apps/api"
uv venv --python 3.11
uv sync --extra dev          # cài cả dev deps (ruff, pytest, httpx)
```

**Expected:**

- `.venv/` tạo.
- `uv.lock` sinh.
- Output: `Resolved N packages, installed N packages`.

**On-failure:**

- `error: Python 3.11 not found` → `uv python install 3.11` rồi retry.
- Conflict deps → đọc error, hỏi user (không tự đổi version major).

**Verify:** `uv run python -c "import fastapi, sqlalchemy, alembic, asyncpg, pgvector; print('ok')"` → `ok`

**Note:** KHÔNG commit `.venv/`. `uv.lock` commit.

---

### Step 6 — Khởi động DB + autogenerate migration

**Goal:** Sinh migration skeleton từ models.

**6.1 Khởi động DB (background)**

```bash
cd "C:/Projects/Linko/apps/api"
# Tạo docker-compose.yml trước (Step 10) HOẶC chạy tạm:
docker run -d --name linko-pg-tmp -e POSTGRES_USER=linko -e POSTGRES_PASSWORD=linko -e POSTGRES_DB=linko -p 5432:5432 pgvector/pgvector:pg16
```

**Tốt hơn:** làm Step 10 (docker-compose) trước Step 6, rồi:

```bash
docker compose up -d db
# wait healthy
docker compose ps   # expect: db healthy
```

**6.2 Autogenerate**

```bash
cd "C:/Projects/Linko/apps/api"
uv run alembic revision --autogenerate -m "init schema v0.1"
```

**Expected:** File `apps/api/alembic/versions/<hash>_init_schema_v0_1.py` sinh ra, chứa:

- `op.create_table("industries", ...)` cho 9 bảng
- `op.create_foreign_key(...)` cho `fk_businesses_verified_by` (do `use_alter=True`)
- `op.create_index(...)` cho các index trong `__table_args__`/`Index()`
- Import `import pgvector.sqlalchemy` (do render_item)
- KHÔNG có `CREATE EXTENSION` (sẽ thêm Step 7)
- KHÔNG có trigger (sẽ thêm Step 7)

**6.3 Rename migration (tùy chọn cho rõ ràng)**

```bash
# Đổi tên file thành 0001_init.py cho convention
cd "C:/Projects/Linko/apps/api/alembic/versions"
# rename file, và edit bên trong: revision = "0001_init"
```

**6.4 Review migration skeleton** — kiểm tra:

- ✅ Có `import pgvector.sqlalchemy` đầu file.
- ✅ Có 9 `op.create_table`.
- ✅ Mỗi bảng có `server_default` cho ARRAY/JSONB/BOOLEAN (F3).
- ✅ Có `op.create_foreign_key("fk_businesses_verified_by", ...)`.
- ✅ Có các `op.create_index` cho `idx_*`.
- ✅ `CheckConstraint` xuất hiện trong `create_table` (F1, F2) — vì khai trong `__table_args__`.

**On-failure:**

- `Target database is not up to date` → `uv run alembic stamp head` (DB trống + chưa có revision) rồi retry. Hoặc DB đã có bảng → drop schema: `docker compose exec db psql -U linko -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`.
- `NameError: Vector` → render_item chưa đúng, check Step 4 env.py.
- Migration trống (0 thay đổi) → models không import đúng, check `from app.models import Base` trong env.py.

**Verify:** `uv run alembic upgrade head` (chạy skeleton) → DB có 9 bảng. Nhưng **chưa commit** — phải edit Step 7 trước.

---

### Step 7 — Edit migration: thêm extensions + triggers

**Goal:** Bổ sung phần autogenerate KHÔNG làm được.

**Edit file** `apps/api/alembic/versions/0001_init.py`:

**7.1 Thêm imports** (nếu chưa có):

```python
import pgvector.sqlalchemy  # đã có từ autogenerate
```

**7.2 Trong `upgrade()`, THÊM ĐẦU** (trước mọi `op.create_table`):

```python
def upgrade() -> None:
    # ===== Extensions =====
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")      # pgvector
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")    # full-text tiếng Việt (bỏ dấu)
    # F5: google_ml_integration chỉ có trên Cloud SQL (đã bật cờ). Bọc an toàn:
    op.execute(
        "DO $$ BEGIN "
        "  CREATE EXTENSION IF NOT EXISTS google_ml_integration; "
        "EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip google_ml_integration (local dev)'; "
        "END $$;"
    )

    # ===== (giữ nguyên các op.create_table / create_foreign_key / create_index do autogenerate sinh) =====
    ...
```

**7.3 Trong `upgrade()`, THÊM CUỐI** (sau mọi `op.create_index`):

```python
    # ===== Trigger updated_at (DB-level, chạy kể cả khi bypass ORM) =====
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $$ LANGUAGE plpgsql;
    """)
    for tbl in ("businesses", "persons", "offers", "needs"):
        op.execute(f"""
            CREATE TRIGGER trg_{tbl}_updated_at
            BEFORE UPDATE ON {tbl}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """)
```

**7.4 Trong `downgrade()`, THÊM ĐẦU** (trước `op.drop_table`):

```python
def downgrade() -> None:
    # Drop triggers + function
    for tbl in ("businesses", "persons", "offers", "needs"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{tbl}_updated_at ON {tbl}")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")

    # ===== (giữ nguyên các op.drop_table / drop_foreign_key / drop_index do autogenerate sinh, THỨ TỰ NGƯỢC upgrade) =====
    ...

    # Drop extensions (cuối cùng)
    op.execute("DROP EXTENSION IF EXISTS google_ml_integration")
    op.execute("DROP EXTENSION IF EXISTS unaccent")
    op.execute("DROP EXTENSION IF EXISTS vector")
```

**Verify:**

```bash
cd "C:/Projects/Linko/apps/api"
# Reset DB sạch
docker compose exec db psql -U linko -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
uv run alembic upgrade head
# expect: chạy hết không lỗi
docker compose exec db psql -U linko -c "\d+ businesses" | findstr "ck_"
# expect: thấy ck_legal_type, ck_business_stage, ck_year_established, ck_employee_range, ck_revenue_range, ck_data_source, ck_verification_status
docker compose exec db psql -U linko -c "\df set_updated_at"
# expect: thấy function
docker compose exec db psql -U linko -c "SELECT extname FROM pg_extension WHERE extname IN ('vector','unaccent')"
# expect: vector, unaccent (KHÔNG có google_ml_integration ở local — bị skip OK)
uv run alembic downgrade base
# expect: drop hết sạch
uv run alembic upgrade head
# expect: chạy lại OK (idempotent)
```

**On-failure:**

- `extension "vector" already exists` → OK, `IF NOT EXISTS` xử lý. Nhưng nếu lỗi khác → image `pgvector/pgvector:pg16` sai, check `docker compose exec db psql -c "SELECT * FROM pg_extension"`.
- `google_ml_integration` fail dù bọc `DO $$` → check syntax, không nên fail (EXCEPTION catch all).

**Commit:** `feat(api): add 0001_init migration with extensions + updated_at triggers`

```bash
cd "C:/Projects/Linko"
git add apps/api/alembic/versions/0001_init.py apps/api/uv.lock
git commit -m "feat(api): add 0001_init migration with extensions + updated_at triggers

- autogenerate skeleton (9 tables, FK use_alter, indexes)
- CREATE EXTENSION vector + unaccent (F9)
- google_ml_integration fail-safe DO block (F5, local skip)
- set_updated_at() trigger for 4 tables (DB-level provenance)

Refs: #4"
```

---

### Step 8 — Seed script

**Goal:** Script seed data demo (cặp match find_buyer ↔ find_supplier).

**File:** `apps/api/scripts/seed.py`

**Content:** **COPY VERBATIM** từ `temp/schema.md` **Mục 11** (từ `from sqlalchemy.orm import Session` đến hết hàm `seed(session: Session) -> None:`).

**THÊM entry point** ở cuối file (để chạy `uv run python scripts/seed.py`):

```python
if __name__ == "__main__":
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.config import settings

    engine = create_engine(settings.alembic_database_url)
    with Session(engine) as session:
        seed(session)
        print("✅ Seed completed: 2 businesses, 1 offer (find_buyer), 1 need (find_supplier).")
```

Tạo `apps/api/scripts/__init__.py` (rỗng) nếu muốn import như package (tùy chọn).

**Verify:**

```bash
cd "C:/Projects/Linko/apps/api"
uv run python scripts/seed.py
# expect: ✅ Seed completed...
docker compose exec db psql -U linko -c "SELECT name, business_stage FROM businesses"
# expect: 2 rows (Nam Phúc / Minh Anh)
docker compose exec db psql -U linko -c "SELECT title, intent_type FROM offers"
# expect: 'Bán sỉ nước mắm truyền thống', find_buyer
docker compose exec db psql -U linko -c "SELECT title, intent_type FROM needs"
# expect: 'Cần nguồn nước mắm/gia vị giá sỉ', find_supplier
```

**On-failure:**

- `ForeignKeyViolation` industries → seed sai thứ tự (L1 flush trước L2). Check copy Mục 11 nguyên vẹn (có `session.flush()` giữa L1/L2).
- `CheckConstraintViolation` → enum sai. Check copy nguyên vẹn.
- `IntegrityError duplicate` → DB đã có data. `alembic downgrade base && alembic upgrade head` rồi retry.

**Commit:** `feat(api): add seed script with demo match pair`

---

### Step 9 — Dockerfile (uv-based, T1)

**Goal:** Image chạy được `alembic upgrade head && uvicorn`.

**File:** `apps/api/Dockerfile`

```dockerfile
# Python 3.11-slim (T3): 3.14 quá mới cho asyncpg/psycopg wheels.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# uv (T1): lockfile reproducible, cache mount tốt hơn pip.
COPY --from=ghcr.io/astral-sh/uv:0.10.8 /uv /uvx /bin/

WORKDIR /app

# Build deps cho psycopg/asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Cài deps trước (cache layer) — chỉ cần pyproject + lock
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy source + install project
COPY . .
RUN uv sync --frozen --no-dev

EXPOSE 8080

# Cloud Run convention: port 8080. Migration chạy mỗi start (OK single-instance;
# multi-instance production: tách migration ra Cloud Run Job — xem README).
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8080"]
```

**Verify:** (sau Step 10) `docker compose build api` → build thành công không lỗi.

**Commit:** `feat(api): add uv-based Dockerfile`

---

### Step 10 — docker-compose.yml

**Goal:** Local PG (pgvector) + API chạy được với 1 lệnh.

**File:** `apps/api/docker-compose.yml`

**Content:** **COPY VERBATIM** từ `temp/schema.md` **Mục 12** (section `docker-compose.yml`). Nội dung:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: linko
      POSTGRES_PASSWORD: linko
      POSTGRES_DB: linko
    ports: ['5432:5432']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U linko']
      interval: 5s
      timeout: 5s
      retries: 10
    volumes: ['pgdata:/var/lib/postgresql/data']
  api:
    build: .
    depends_on:
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql+asyncpg://linko:linko@db:5432/linko
      ALEMBIC_DATABASE_URL: postgresql+psycopg://linko:linko@db:5432/linko
    ports: ['8080:8080']
volumes:
  pgdata:
```

**Verify:** `docker compose up -d db` → `docker compose ps` → db healthy.

**Commit:** `feat(api): add docker-compose for local pgvector dev`

---

### Step 11 — Tests + .gitignore

**Goal:** Smoke test cho health endpoint + ignore Python artifacts.

**Files:**

#### `apps/api/tests/__init__.py`

(rỗng)

#### `apps/api/tests/test_health.py`

```python
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

#### Edit `C:/Projects/Linko/.gitignore` — THÊM cuối file:

```gitignore

# Python (apps/api)
.venv/
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
apps/api/.env
```

**Verify:**

```bash
cd "C:/Projects/Linko/apps/api"
uv run ruff check .
# expect: All checks passed
uv run pytest -q
# expect: 1 passed
```

**On-failure ruff:** fix tự (đa số là import order, line length). Nếu là logic error → hỏi.

**Commit:** `test(api): add health endpoint smoke test + python gitignore`

---

### Step 12 — CI workflow (T5)

**Goal:** CI Python riêng, path-filtered.

**File:** `.github/workflows/ci-backend.yml`

```yaml
name: CI Backend (Python)

on:
  push:
    branches: [main, develop]
    paths: ['apps/api/**', '.github/workflows/ci-backend.yml']
  pull_request:
    paths: ['apps/api/**', '.github/workflows/ci-backend.yml']

defaults:
  run:
    working-directory: apps/api

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install uv
        uses: astral-sh/setup-uv@v3
        with:
          version: '0.10.8'

      - name: Sync dependencies
        run: uv sync --frozen --extra dev

      - name: Ruff lint
        run: uv run ruff check .

      - name: Pytest
        run: uv run pytest -q
```

**Verify:** YAML valid (prettier check khi commit). Logic verify khi PR mở (CI chạy).

**Commit:** `ci: add python backend ci workflow`

---

### Step 13 — README

**Goal:** Hướng dẫn chạy local + verify + handoff notes.

**File:** `apps/api/README.md`

````markdown
# Linko API (Backend)

Backend Python cho Linko — business matching platform. Implement issue #4 (Schema DB).

## Stack

- **Python 3.11** + **uv** (lockfile reproducible)
- **FastAPI** + **SQLAlchemy 2.0** (async, asyncpg)
- **Alembic** (sync, psycopg) — migrations
- **PostgreSQL 16** + **pgvector** (local: `pgvector/pgvector:pg16`)

## Quick start (local)

```bash
cd apps/api
docker compose up --build -d
# API: http://localhost:8080/health → {"status":"ok"}
```

Migration tự chạy trong CMD (`alembic upgrade head`).

## Dev commands

```bash
uv venv --python 3.11 && uv sync --extra dev   # setup
uv run uvicorn app.main:app --reload            # dev server (cần DB đang chạy)
uv run alembic upgrade head                     # migrate
uv run alembic downgrade base                   # rollback
uv run python scripts/seed.py                   # seed demo data
uv run ruff check .                             # lint
uv run pytest -q                                # test
```

## Verify schema (DoD)

```bash
docker compose exec db psql -U linko -c "\d+ businesses"   # thấy đủ CHECK ck_*
docker compose exec db psql -U linko -c "\df set_updated_at" # trigger function
docker compose exec db psql -U linko -c "SELECT extname FROM pg_extension" # vector, unaccent
```

## Architecture

- `app/models.py` — **SoT** cho Alembic (đã fix F1–F7, xem `temp/verification.md`).
- `alembic/env.py` — `render_item` cho `pgvector.sqlalchemy.Vector` (F8).
- `alembic/versions/0001_init.py` — ext + 9 tables + triggers.

## Embedding (Cloud SQL only — M2)

- Model: `gemini-embedding-001` @ `output_dimensionality=768` (F4: `text-embedding-004` đã shutdown 14/01/2026).
- Cloud SQL: `CREATE EXTENSION google_ml_integration` + cờ `cloudsql.enable_google_ml_integration` (F5, confirm C1).
- Local: embedding NULL khi seed; sinh app-layer khi cần.

## Production notes (M2+)

- **Multi-instance:** tách migration ra Cloud Run Job (tránh race khi N container cùng `alembic upgrade head`).
- **ANN index:** tạo HNSW raw SQL khi >vài nghìn vector (F10: Alembic #1603 bug, không dùng `op.create_index`).
  ```sql
  CREATE INDEX ON offers USING hnsw (embedding vector_cosine_ops);
  CREATE INDEX ON needs  USING hnsw (embedding vector_cosine_ops);
  ```

## Handoff (cho @dathuhu — Cloud SQL)

1. `docker compose up --build` → verify local OK.
2. Tạo Cloud SQL PG16 + bật `vector`, `unaccent`, `google_ml_integration`.
3. Set `cloudsql.enable_google_ml_integration = on` (database flag).
4. Cấp IAM Vertex AI cho service account Cloud SQL.
5. Chạy `alembic upgrade head` (qua Cloud Run Job hoặc psql).
6. Verify `\d+ businesses` thấy đủ CHECK.
7. Cấu hình `DATABASE_URL` dùng `cloud-sql-python-connector`.

## Refs

- Issue: https://github.com/Khang0609/Linko/issues/4
- Schema: `temp/schema.md`
- Verification: `temp/verification.md`
````

**Commit:** `docs(api): add backend README with local run + handoff guide`

---

### Step 14 — Verify local (DoD gate)

**Goal:** Chứng minh toàn bộ chạy được trước khi PR. **KHÔNG skip.**

**14.1 Clean rebuild**

```bash
cd "C:/Projects/Linko/apps/api"
docker compose down -v          # xóa hẳn volume
docker compose up --build -d
docker compose logs -f api      # theo dõi till: "Application startup complete."
```

**14.2 Health**

```bash
curl http://localhost:8080/health
# expect: {"status":"ok"}
```

**14.3 Schema verify**

```bash
docker compose exec db psql -U linko -c "\d+ businesses"
# expect: thấy 7 CHECK (ck_legal_type, ck_business_stage, ck_year_established, ck_employee_range, ck_revenue_range, ck_data_source, ck_verification_status)

docker compose exec db psql -U linko -c "\d industries"
# expect: ck_industry_level, ck_industry_hierarchy

docker compose exec db psql -U linko -c "\df set_updated_at"
# expect: function tồn tại

docker compose exec db psql -U linko -c "SELECT extname FROM pg_extension"
# expect: vector, unaccent (KHÔNG có google_ml_integration — skip OK ở local)
```

**14.4 Seed verify**

```bash
docker compose exec api uv run python scripts/seed.py
# expect: ✅ Seed completed...

docker compose exec db psql -U linko -c "SELECT b.name, o.title AS offer, n.title AS need FROM businesses b LEFT JOIN offers o ON o.business_id=b.id LEFT JOIN needs n ON n.business_id=b.id"
# expect: 2 business, 1 offer find_buyer, 1 need find_supplier
```

**14.5 Lint + test**

```bash
cd "C:/Projects/Linko/apps/api"
uv run ruff check .   # expect: All checks passed
uv run pytest -q      # expect: 1 passed
```

**14.6 Idempotency**

```bash
docker compose exec api uv run alembic downgrade base
docker compose exec api uv run alembic upgrade head
# expect: chạy lại OK không lỗi
```

**On-failure bất kỳ:** KHÔNG push. Fix rồi re-verify từ 14.1. Nếu không fix được → hỏi user kèm log.

**Verify:** Tất cả 14.1–14.6 pass → proceed Step 15.

---

### Step 15 — Commit final + push + Draft PR

**15.1 Final commit check**

```bash
cd "C:/Projects/Linko"
git status                    # expect: clean (tất cả đã commit)
git log --oneline develop..HEAD
# expect: 8 commits (Steps 2,3,4,7,8,9,10,11,12,13 — gộp lại khoảng 8)
```

**15.2 Push**

```bash
git push -u origin feature/4-db-schema-backend
```

**15.3 Tạo Draft PR** (dùng gh CLI)

PR body đã được soạn sẵn tại `temp/pr-body.md` — chứa đầy đủ reasoning + evidence cho team review (không chỉ checklist). Agent **KHÔNG tự viết body** — chỉ dùng file đã có.

```bash
cd "C:/Projects/Linko"
gh pr create \
  --base develop \
  --head feature/4-db-schema-backend \
  --draft \
  --title "feat(api): backend schema DB + migration + Docker (Issue #4)" \
  --body-file temp/pr-body.md
```

**Verify:** `gh pr view --json number,state,isDraft,url` → state OPEN, isDraft true. In URL ra cho user.

**15.4 Link issue**
PR body (`temp/pr-body.md`) đã có `Closes #4` → tự link khi merge.

**15.5 Comment vào issue #4** (optional, thông báo team)

```bash
gh issue comment 4 --repo Khang0609/Linko --body "Đã mở Draft PR #<PR_NUMBER> implement backend schema DB. Body PR chứa đầy đủ reasoning + evidence cho từng quyết định (A1-A4 kiến trúc, B1-B7 fix, C1-C4 items cần confirm). Review guide trong PR. Local đã verify pass DoD."
```

---

## 5. Verification / DoD Checklist (final gate)

Đối chiếu với issue #4 DoD trước khi thông báo hoàn thành:

| DoD issue #4                                   | Cách verify                                            | Status |
| ---------------------------------------------- | ------------------------------------------------------ | ------ |
| Bộ chỉ số "Vừa đủ"                             | 9 bảng ánh xạ M2 (xem `temp/schema.md` Mục 2)          | ⬜     |
| Dữ liệu cấu trúc sạch (0% lỗi type)            | `\d+ businesses` thấy 7 CHECK; `server_default` đầy đủ | ⬜     |
| Sẵn sàng kết nối (script/migration chạy local) | `alembic upgrade head` OK                              | ⬜     |
| Tự đóng gói môi trường (Dockerfile)            | `docker compose up --build` OK                         | ⬜     |

Bonus (plan):
| Item | Verify | Status |
|---|---|---|
| Health endpoint | `curl /health` 200 | ⬜ |
| Seed demo match | `scripts/seed.py` + query | ⬜ |
| Lint clean | `ruff check` pass | ⬜ |
| Test pass | `pytest` 1 passed | ⬜ |
| Idempotent migration | downgrade + upgrade OK | ⬜ |
| CI Python | `.github/workflows/ci-backend.yml` tồn tại | ⬜ |

---

## 6. Pitfalls & Edge Cases (đã dự đoán)

| #   | Pitfall                                                               | Cách tránh / fix                                                                                                    |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P1  | Python 3.14 local quá mới → asyncpg/psycopg không có wheel            | Pin `.python-version=3.11`, `uv venv --python 3.11` (Step 5).                                                       |
| P2  | Autogenerate cần DB connect được                                      | Step 6.1 phải `docker compose up -d db` trước.                                                                      |
| P3  | Autogenerate KHÔNG sinh CREATE EXTENSION / trigger                    | Step 7 edit tay.                                                                                                    |
| P4  | `use_alter=True` FK → autogenerate phát `op.create_foreign_key` riêng | Giữ nguyên, không xóa.                                                                                              |
| P5  | pgvector type trong migration → `NameError` nếu thiếu render_item     | env.py `render_item` (Step 4) + `import pgvector.sqlalchemy` trong migration.                                       |
| P6  | `gen_random_uuid()` server_default render sai                         | Review migration skeleton Step 6.4. Nếu render `text("gen_random_uuid()")` → OK. Nếu `func.gen_random_uuid()` → OK. |
| P7  | Seed vi phạm FK nếu sai thứ tự                                        | Copy verbatim Mục 11 (có `session.flush()` giữa L1/L2).                                                             |
| P8  | Docker port 5432/8080 bận                                             | Pre-flight 3.2. Đổi port mapping nếu cần.                                                                           |
| P9  | lint-staged chạy prettier lên `.md`/`.yml` → có thể reformat          | OK, để nó format. Không revert.                                                                                     |
| P10 | `pnpm-workspace.yaml` glob `apps/*` — apps/api không có package.json  | pnpm skip folder không có package.json → OK. Không cần thêm package.json giả.                                       |
| P11 | CI JS (`nx affected`) không nhận apps/api (không package.json)        | OK — đó là lý do tạo CI Python riêng (T5).                                                                          |
| P12 | `cloud-sql-python-connector` trong deps nhưng local không dùng        | OK để sẵn, chỉ active khi `DATABASE_URL` dùng Cloud SQL socket.                                                     |
| P13 | Multi-instance prod: `alembic upgrade head` race                      | Note trong README — M2 tách Cloud Run Job.                                                                          |
| P14 | HNSW index M2 bug Alembic #1603                                       | Note trong README — dùng raw `op.execute` (F10).                                                                    |

---

## 7. Rollback plan

Nếu cần undo toàn bộ:

```bash
cd "C:/Projects/Linko"
git checkout develop
git branch -D feature/4-db-schema-backend
git push origin --delete feature/4-db-schema-backend   # nếu đã push
docker compose -f apps/api/docker-compose.yml down -v   # xóa DB volume
rm -rf apps/api
```

Repo về trạng thái trước Step 0.

---

## 8. Items cần hỏi user DURING implementation (chỉ khi gặp)

| Trigger                                                      | Hỏi gì                                            |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Port 5432/8080 bận, không đổi được                           | "Port X bận, đổi sang Y được không?"              |
| Deps conflict không resolve                                  | "Conflict giữa A và B, ưu tiên cái nào?"          |
| Autogenerate sinh migration bất thường (thiếu bảng, thừa op) | Paste migration, hỏi "có đúng ý không?"           |
| Gặp claim C1–C4 cần quyết                                    | "C1 (Cloud SQL ML) cần confirm — bạn biết không?" |
| Step 14 bất kỳ fail không fix được                           | Paste log, hỏi                                    |

**Không hỏi:** thứ tự commit, naming, fix lint, version patch, có nên commit `.gitkeep` không.

---

## 9. Success criteria (khi nào task DONE)

Task hoàn thành khi TẤT CẢ đúng:

1. ✅ 8 commits trên `feature/4-db-schema-backend`, Conventional Commits.
2. ✅ Draft PR mở về `develop`, body dùng `temp/pr-body.md` (có `Closes #4` + reasoning + evidence + DoD checklist + C1–C4).
3. ✅ Step 14 (verify local) toàn bộ pass.
4. ✅ CI Python (`.github/workflows/ci-backend.yml`) pass trên PR (chờ ~2 phút sau push).
5. ✅ Báo cáo user: tóm tắt đã làm + DoD + C1–C4 cần confirm + link PR.

**Không cần:** merge PR (user/lead review), production deploy (M2), implement matching.

---

## 10. Quick reference — lệnh thường dùng

```bash
# Setup
cd "C:/Projects/Linko/apps/api"
uv venv --python 3.11 && uv sync --extra dev

# Dev (cần DB chạy)
docker compose up -d db
uv run uvicorn app.main:app --reload

# Migration
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic revision --autogenerate -m "desc"

# Seed
uv run python scripts/seed.py

# Quality
uv run ruff check .
uv run ruff format .
uv run pytest -q

# Docker full
docker compose up --build -d
docker compose logs -f api
docker compose down -v

# DB inspect
docker compose exec db psql -U linko -c "\dt"
docker compose exec db psql -U linko -c "\d+ businesses"
```

---

**End of plan. Agent: bắt đầu từ Section 3 (Pre-flight) → Step 0.**
