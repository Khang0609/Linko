# Implementation Plan — Linko Backend API Onboarding (Issue #7)

> **Tài liệu cho:** Agent thực thi (human hoặc AI).
> **Mục đích:** Implement API tiếp nhận, validate, điều phối hồ sơ doanh nghiệp — đạt DoD issue #7.
> **Self-contained:** Agent chỉ cần đọc file này + `temp/issue7/research.md` + `apps/api/` (code #4 hiện có) để thực hiện. Không cần hỏi lại user trừ khi gặp edge case ngoài scope.
> **Ngày tạo:** 2026-06-27
> **Prerequisite:** PR #14 (Issue #4) đã merge hoặc branch `feature/4-db-schema-backend` có code DB schema.

---

## 0. How to use this document

### 0.1 Read order (BẮT BUỘC trước khi code)
1. Đọc **Section 1 (Context)** — hiểu repo state, dependencies, decisions đã chốt.
2. Đọc **`temp/issue7/research.md`** toàn bộ — đây là "tại sao" cho mọi quyết định. Plan này là "làm thế nào".
3. Đọc **Section 4 (Steps 0–N)** theo thứ tự. Mỗi step có: Goal / Files / Content / Commands / Expected / Verify / On-failure / Commit.
4. Đối chiếu **Section 5 (DoD Checklist)** trước khi mở PR.

### 0.2 Khi nào được tự quyết vs. phải hỏi user
- **Được tự quyết:** lỗi cú pháp, version patch, naming biến, fix lint, thứ tự commit nhỏ.
- **PHẢI hỏi user:**
  - Đổi scope (thêm/bớt feature ngoài research.md).
  - Lật giả định trong research.md Mục 11.3 (đặc biệt **3b — error envelope RFC 9457** có hợp đồng 2 chiều với FE).
  - Gặp vấn đề C-related (claim chưa verify).
  - Thay đổi kiến trúc quyết định.

### 0.3 Không được làm
- ❌ Implement matching logic M2 (out of scope #7).
- ❌ Sinh embedding đồng bộ trong endpoint (research Mục 3: latency 0.4–12s → để NULL, M2 làm).
- ❌ Bắt buộc `persons[]` cứng ở v0.1 (research Q3: `PERSON_REQUIRED=False`).
- ❌ Đổi schema DB (models.py / 0001_init.py) — chỉ thêm migration `0002`.
- ❌ Commit trực tiếp lên `main` hoặc `develop`.

---

## 1. Context

### 1.1 Repo state (verify trước khi bắt đầu)
- **Repo:** `C:\Projects\Linko` — git repo.
- **Branch hiện tại:** `feature/4-db-schema-backend` (Issue #4 code) — cần tạo branch mới từ đây.
- **Backend code có sẵn (từ #4):**
  - `apps/api/app/{models.py, config.py, database.py, main.py}` — SQLAlchemy 2.0 models (9 tables), FastAPI app + `/health`.
  - `apps/api/alembic/versions/0001_init.py` — schema migration (ext + 9 tables + triggers + indexes).
  - `apps/api/scripts/seed.py` — seed demo (chạy tay, không idempotent).
  - `apps/api/{Dockerfile, docker-compose.yml}` — Docker setup với pgvector.
  - `apps/api/tests/test_health.py` — smoke test.
  - `.github/workflows/ci-backend.yml` — CI Python (chưa có Postgres service).
- **Chưa có:** Pydantic schemas, API routers, error handling module, idempotency, province mapping, reference data migration.

### 1.2 Dependencies / blockers
- **Issue #4 (PR #14):** Cần merged hoặc branch có code. Verify bằng `git log --oneline | grep "0001_init"`.
- **Issue #6 (FE onboarding):** Chưa làm — #7 làm BE trước, FE consume sau.
- **Issue #10 (Smart Analyzer):** Chưa làm — #7 không phụ thuộc, chỉ nhận data từ FE.

### 1.3 Tooling (verified available)
| Tool | Version | Dùng cho |
|---|---|---|
| Python | 3.11 (via uv) | Runtime |
| uv | 0.10.8 | venv + deps |
| Docker | 29.4.3 + Compose v5.1.3 | Local PG + API |
| pnpm | 10.33.2 | Frontend + codegen script |

### 1.4 Final structure sẽ tạo/sửa
```
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py                    # EDIT: register routers + exception handlers
│   ├── config.py                  # EDIT: thêm settings idempotency
│   ├── database.py                # giữ nguyên
│   ├── models.py                  # giữ nguyên (KHÔNG đụng)
│   ├── schemas.py                 # MỚI: Pydantic v2 DTOs + Literal enums
│   ├── exceptions.py              # MỚI: RFC 9457 problem+json + custom exceptions
│   └── routers/
│       ├── __init__.py
│       └── businesses.py          # MỚI: POST /businesses (onboarding endpoint)
├── core/                          # MỚI: business logic + shared utilities
│   ├── __init__.py
│   ├── province_mapping.py        # MỚI: 63→34 mapping (copy research Mục 8)
│   └── idempotency.py             # MỚI: Idempotency-Key middleware + storage
├── alembic/versions/
│   ├── 0001_init.py               # giữ nguyên
│   └── 0002_seed_reference_data.py # MỚI: idempotent data migration (industries + intent_types + certifications)
├── scripts/
│   └── seed.py                    # EDIT: tách demo data ra riêng, bỏ reference data (đã vào 0002)
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # MỚI: fixtures (TestClient, DB session, seed)
│   ├── test_health.py             # giữ nguyên
│   ├── test_businesses.py         # MỚI: integration test POST /businesses (happy path + 422 + 409 + idempotency)
│   ├── test_province_mapping.py   # MỚI: unit test 63→34 mapping
│   └── test_idempotency.py        # MỚI: unit test idempotency logic
├── pyproject.toml                 # EDIT: thêm deps (httpx test, openapi-typescript không cần ở BE)
├── Dockerfile                     # giữ nguyên
├── docker-compose.yml             # giữ nguyên
└── README.md                      # EDIT: thêm API docs section
.github/workflows/ci-backend.yml   # EDIT: thêm Postgres service + integration tests
```

---

## 2. Decisions (ĐÃ CHỐT trong research.md — không tự ý đổi)

Tất cả quyết định dưới đây đã chốt trong `temp/issue7/research.md`. Agent chỉ thực thi, không re-debate.

### 2.1 Validation (Q1, Q2, Mục 10)
| Quyết định | Chi tiết |
|---|---|
| **Bắt buộc** | `name` + ≥1 offer/need (kèm `intent_type`) + `industry_l1` + `province` |
| **Optional** | `tax_id`, `business_stage`, `revenue_range_vnd`, `employee_range`, `year_established`, `persons[]` |
| **Sentinel thay NULL** | `khong_tiet_lo` (revenue), `khac` (industry), `khong_xac_dinh` (province nếu FE cần) |
| **HTTP codes** | 201 (OK) · 400 (JSON hỏng, cần custom handler) · 422 (sai/thiếu/FK lạ) · 409 (trùng tax_id / idempotency-key đang xử lý) · 500 (lỗi nội bộ) |
| **Error envelope** | **RFC 9457** `application/problem+json` — gom trong `core/exceptions.py` (giả định 3b, cần báo FE) |

### 2.2 Idempotency (Q4)
| Tình huống | Mã | Hành vi |
|---|---|---|
| Key + payload y hệt, request gốc đã xong | 2xx/4xx (cache) | + header `Idempotent-Replayed: true` |
| Key đang xử lý | 409 | + `Retry-After` header |
| Reuse key + payload khác | 422 | Reject |
| Endpoint yêu cầu key nhưng thiếu | (optional v0.1) | Fallback anti-duplicate theo `tax_id` |

- **Storage:** table `idempotency_keys` (key, payload_hash, response_status, response_body, expires_at) — tạo trong migration `0002`.
- **Atomicity:** `INSERT ... ON CONFLICT (key) DO NOTHING RETURNING` + ghi response trong cùng transaction với business tạo.

### 2.3 Reference data (Mục 9 — Phương án B)
| Việc | Cách |
|---|---|
| Reference data (industries 30 + intent_types 8 + certifications 12) | Migration `0002_seed_reference_data.py` idempotent (`ON CONFLICT DO NOTHING`) |
| Demo data (2 businesses + offer/need) | Giữ trong `scripts/seed.py`, chỉ local |
| CI | Thêm Postgres service → migration tự seed → test FK thật |

### 2.4 Province (Mục 10 — Phương án A)
| Việc | Cách |
|---|---|
| `province` bắt buộc | Validate ở Pydantic + raise 422 nếu thiếu |
| Mapping 63→34 | `core/province_mapping.py` (copy research Mục 8 verbatim) |
| Province cũ quy đổi | Thêm vào `warnings[]` của response |
| Không khớp cả cũ lẫn mới | 422 `INVALID_PROVINCE` |

### 2.5 Persons (Q3)
| Việc | Cách |
|---|---|
| `PERSON_REQUIRED` | `False` ở v0.1 (config flag) |
| Nếu có persons | `full_name` bắt buộc, SĐT/Zalo/email optional |
| Contract | Nhận `persons[]` ngay từ v0.1 (định hình sớm) |

### 2.6 Embedding
| Việc | Cách |
|---|---|
| `profile_embedding`, `embedding` (offer/need) | **NULL** ở v0.1 — không sinh trong endpoint |
| Lý do | Latency 0.4–12s (research Mục 3) — M2 làm async |

---

## 3. Pre-flight checks (chạy trước Step 0)

```bash
cd "C:/Projects/Linko"
git status --short                    # expect: clean hoặc chỉ temp/ untracked
git branch --show-current             # expect: feature/4-db-schema-backend (hoặc develop nếu #4 merged)
git log --oneline -5 | grep "0001_init"  # verify #4 code có
cd apps/api && uv run python -c "from app.models import Base; print(len(Base.metadata.tables))"  # expect: 9
docker compose -f docker-compose.yml ps  # expect: db healthy (nếu không, start: docker compose up -d db)
```

**Port check:** `netstat -ano | findstr ":5432\|:8080"` — phải free hoặc dùng bởi Docker.

---

## 4. Implementation Steps

### Step 0 — Git setup

**Goal:** Tạo feature branch từ develop (hoặc feature/4 nếu chưa merge).

```bash
cd "C:/Projects/Linko"
git fetch origin
# Nếu PR #14 đã merge:
git checkout develop && git pull origin develop
# Nếu chưa merge (code #4 vẫn ở feature branch):
git checkout feature/4-db-schema-backend && git pull
git checkout -b feature/7-onboarding-api
```

**Verify:** `git branch --show-current` → `feature/7-onboarding-api`

---

### Step 1 — Pydantic schemas (`app/schemas.py`)

**Goal:** DTOs cho request/response, dùng `Literal` cho enum (để OpenAPI sinh đúng schema — phục vụ codegen FE).

**File:** `apps/api/app/schemas.py`

**Content spec:**
- Tạo `Literal` types cho mọi enum: `LegalType`, `BusinessStage`, `EmployeeRange`, `RevenueRangeVnd`, `DataSource`, `VerificationStatus`, `IntentTypeCode`, `InteractionType`.
- Giá trị enum **phải khớp 100%** `models.py` CHECK constraints + seed data.
- `BusinessCreate` (request): `name: str`, `tax_id: str | None`, `legal_type: LegalType | None`, `business_stage: BusinessStage | None`, `year_established: int | None`, `industry_l1: str`, `industry_l2: str | None`, `employee_range: EmployeeRange | None`, `revenue_range_vnd: RevenueRangeVnd | None`, `city: str | None`, `province: str`, `geo_operating: list[str] = []`, `description: str | None`, `offers: list[OfferCreate]`, `needs: list[NeedCreate]`, `persons: list[PersonCreate] = []`.
- `OfferCreate` / `NeedCreate`: `intent_type: IntentTypeCode`, `category_l1: str | None`, `category_l2: str | None`, `geo_scope: list[str] = []`, `title: str`, `description: str | None`, `structured_attrs: dict = {}`.
- `PersonCreate`: `full_name: str`, `phone: str | None`, `email: str | None`, `zalo_id: str | None`, `role_title: str | None`, `role: Literal[...] | None`.
- `BusinessResponse` (201): full BusinessCreate + `id: UUID` + `created_at` + `verification_status` + `warnings: list[str] = []`.
- **Pydantic v2 config:** `model_config = ConfigDict(from_attributes=True, use_enum_values=True)`.
- **Custom validator** cho `province`: normalize qua `core/province_mapping.py`, raise 422 nếu invalid.
- **Custom validator** cho `offers`/`needs`: ít nhất 1 trong 2 không rỗng (Q1 bắt buộc).

**Verify:** `uv run python -c "from app.schemas import BusinessCreate; print(BusinessCreate.model_json_schema()['properties'].keys())"`

**Commit:** `feat(api): add Pydantic v2 schemas with Literal enums for OpenAPI codegen`

---

### Step 2 — Province mapping (`core/province_mapping.py`)

**Goal:** Normalize 63→34 theo NQ 202/2025/QH15.

**File:** `apps/api/core/province_mapping.py`

**Content:** **COPY VERBATIM** từ `temp/issue7/research.md` Mục 8 phần C (code block `VALID_PROVINCES_34` + `LEGACY_TO_NEW`).

**Thêm hàm:**
```python
def normalize_province(raw: str) -> tuple[str | None, bool]:
    """Return (normalized_province, was_converted).
    - None if invalid (not in 34 and not in legacy).
    - was_converted=True if old name → new name.
    """
```
- Normalize: lowercase, strip, bỏ prefix "tỉnh "/"thành phố "/"tp ", dùng `unaccent` logic (hoặc `unicodedata.normalize('NFKD')` + strip combining marks).
- Handle aliases: "Thừa Thiên Huế", "TP HCM/TPHCM/Sài Gòn", "BR-VT/Vũng Tàu", "Đắc Lắc".

**File:** `apps/api/core/__init__.py` (rỗng)

**Verify:** `uv run python -c "from core.province_mapping import normalize_province; print(normalize_province('Bình Dương'))"  # → ('TP. Hồ Chí Minh', True)`

**Commit:** `feat(api): add province mapping 63→34 (NQ 202/2025/QH15)`

---

### Step 3 — Exception handling (`app/exceptions.py`)

**Goal:** RFC 9457 `application/problem+json` envelope + custom exceptions.

**File:** `apps/api/app/exceptions.py`

**Content spec:**
- Custom exceptions: `BusinessValidationError`, `DuplicateBusinessError`, `InvalidProvinceError`, `IdempotencyConflictError`, `IdempotencyReplayError`.
- `problem+json` response model (Pydantic): `type: str`, `title: str`, `status: int`, `detail: str`, `instance: str`, `errors: list[dict] | None` (mở rộng cho field-level).
- Exception handlers (register trong `main.py`):
  - `BusinessValidationError` → 422 + problem+json
  - `DuplicateBusinessError` → 409 + problem+json
  - `InvalidProvinceError` → 422 + problem+json
  - `IdempotencyConflictError` → 409 + `Retry-After` header
  - `IdempotencyReplayError` → replay cached response + `Idempotent-Replayed: true` header
  - `RequestValidationError` (FastAPI default) → override thành 400 nếu `json_invalid` type, 422 cho field validation (research Mục 5 lỗi 3a)
  - Generic `Exception` → 500 + log + problem+json

**Verify:** `uv run python -c "from app.exceptions import problem_response; print('OK')"`

**Commit:** `feat(api): add RFC 9457 problem+json error handling`

---

### Step 4 — Idempotency (`core/idempotency.py` + migration)

**Goal:** Anti-duplicate layer theo Stripe pattern.

**4.1 Migration `0002`:**
- Tạo table `idempotency_keys` (key TEXT PK, payload_hash TEXT, response_status INT, response_body JSONB, created_at, expires_at).
- Seed reference data (industries 30 + intent_types 8 + certifications 12) — idempotent `INSERT ... ON CONFLICT (key) DO NOTHING`.
- **Copy seed data từ `scripts/seed.py` hiện có** (phần L1, L2_BBL, L2_SX, INTENTS, CERTS) vào migration.

**4.2 `core/idempotency.py`:**
- `IdempotencyManager` class:
  - `get_or_create(key, payload_hash) -> tuple[response | None, is_new]` — atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING`.
  - `store_response(key, status, body)` — ghi response trong cùng transaction.
  - `is_expired(key) -> bool` — check TTL (default 24h).
- Hash payload: `hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()`.
- Dependency: `get_idempotency_key(request) -> str | None` — đọc header `Idempotency-Key`.

**4.3 Migration file:**
**File:** `apps/api/alembic/versions/0002_seed_reference_data.py`
- `revision = "0002_ref_data"`, `down_revision = "0001_init"`.
- `upgrade()`: `CREATE TABLE idempotency_keys` + seed reference data idempotent.
- `downgrade()`: drop table + delete seeded data (optional — data migration thường không rollback data).

**Verify:** `uv run alembic upgrade head` → check `SELECT count(*) FROM industries` = 30, `intent_types` = 8, `certifications` = 12.

**Commit:** `feat(api): add idempotency table + seed reference data migration (0002)`

---

### Step 5 — Onboarding router (`app/routers/businesses.py`)

**Goal:** POST `/businesses` — endpoint chính của issue #7.

**File:** `apps/api/app/routers/__init__.py` (rỗng)
**File:** `apps/api/app/routers/businesses.py`

**Content spec:**
```python
@router.post("", response_model=BusinessResponse, status_code=201)
async def create_business(
    payload: BusinessCreate,
    request: Request,
    session: AsyncSession = Depends(get_db),
    idem_key: str | None = Depends(get_idempotency_key),
) -> BusinessResponse:
    # 1. Idempotency check (nếu có key)
    # 2. Validate province → normalize or raise InvalidProvinceError
    # 3. Validate FK references (industry_l1, intent_type, category_l1/l2) against DB
    #    - raise BusinessValidationError 422 if FK invalid
    # 4. Check duplicate (tax_id if present) → raise DuplicateBusinessError 409
    # 5. ACID transaction: insert business + offers + needs + persons + business_persons
    #    - embedding fields = NULL (M2)
    #    - verified_by = NULL (no auth yet)
    # 6. Store idempotency response (nếu có key)
    # 7. Return 201 + BusinessResponse (with warnings[] if province converted)
```

- **Validation order:** idempotency → province → FK → duplicate → insert.
- **Transaction:** dùng `async with session.begin():` — lỗi bất kỳ → rollback toàn bộ (ACID).
- **Warnings:** nếu province cũ → mới, thêm `"province_converted: {old} → {new}"` vào `warnings[]`.
- **Logging:** log request (semathic), errors (warning+), success (info).

**File:** `apps/api/app/main.py` — EDIT: `app.include_router(businesses.router, prefix="/businesses", tags=["businesses"])` + register exception handlers.

**Verify:** `uv run uvicorn app.main:app` → `/docs` thấy POST /businesses.

**Commit:** `feat(api): add POST /businesses onboarding endpoint`

---

### Step 6 — Tests (integration + unit)

**Goal:** Đạt DoD #3 (edge cases tested) + #4 (<1s response).

**6.1 `tests/conftest.py`:**
- Fixtures: `test_client` (TestClient), `db_session` (async session against test DB), `seed_reference_data` (run migration 0002).
- Sử dụng test DB riêng (env `TEST_DATABASE_URL`) hoặc transactional rollback (mỗi test rollback).
- Fixture `sample_business_payload` — valid payload cho happy path.

**6.2 `tests/test_businesses.py`:**
```python
# Happy path
def test_create_business_201(sample_business_payload): ...
# Thiếu name → 422
def test_create_business_missing_name(): ...
# Thiếu province → 422
def test_create_business_missing_province(): ...
# Thiếu offers+needs → 422
def test_create_business_no_offers_needs(): ...
# Province cũ (Bình Dương) → 201 + warnings
def test_create_business_legacy_province(): ...
# Province invalid → 422
def test_create_business_invalid_province(): ...
# FK industry_l1 sai → 422
def test_create_business_invalid_industry_fk(): ...
# FK intent_type sai → 422
def test_create_business_invalid_intent_fk(): ...
# tax_id trùng → 409
def test_create_business_duplicate_tax_id(): ...
# Idempotency: same key + same payload → replay
def test_idempotency_replay(): ...
# Idempotency: same key + different payload → 422
def test_idempotency_key_reuse_different_payload(): ...
# JSON hỏng → 400 (custom handler)
def test_create_business_malformed_json(): ...
# Persons optional
def test_create_business_without_persons(): ...
# Persons with full_name
def test_create_business_with_persons(): ...
```

**6.3 `tests/test_province_mapping.py`:**
```python
def test_valid_34_provinces(): ...
def test_legacy_to_new_binh_duong(): ...
def test_alias_thua_thien_hue(): ...
def test_alias_tphcm_variants(): ...
def test_invalid_province(): ...
def test_normalize_with_diacritics(): ...
```

**6.4 `tests/test_idempotency.py`:**
```python
def test_hash_same_payload(): ...
def test_hash_different_payload(): ...
def test_ttl_expiry(): ...
```

**6.5 Performance test (DoD #4):**
```python
def test_response_time_under_1s(sample_business_payload):
    # measure response time, assert < 1s
```

**Verify:** `uv run pytest -q` → all pass.

**Commit:** `test(api): add integration + unit tests for onboarding endpoint`

---

### Step 7 — CI update (`.github/workflows/ci-backend.yml`)

**Goal:** Thêm Postgres service + integration tests.

**Edit:** Thêm `services.postgres` (pgvector image), env `DATABASE_URL`/`TEST_DATABASE_URL`, run `alembic upgrade head` trước test.

```yaml
jobs:
  lint-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: linko
          POSTGRES_PASSWORD: linko
          POSTGRES_DB: linko_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U linko"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      # ... existing setup ...
      - name: Run migrations
        env:
          ALEMBIC_DATABASE_URL: postgresql+psycopg://linko:linko@localhost:5432/linko_test
        run: uv run alembic upgrade head
      - name: Pytest
        env:
          DATABASE_URL: postgresql+asyncpg://linko:linko@localhost:5432/linko_test
          TEST_DATABASE_URL: postgresql+asyncpg://linko:linko@localhost:5432/linko_test
        run: uv run pytest -q
```

**Verify:** Push → CI chạy → green.

**Commit:** `ci: add postgres service + integration tests to backend CI`

---

### Step 8 — Edit seed.py (tách demo data)

**Goal:** `scripts/seed.py` chỉ còn demo data (2 businesses + offer/need). Reference data đã vào migration 0002.

**Edit `scripts/seed.py`:**
- Xóa phần L1, L2_BBL, L2_SX, INTENTS, CERTS (đã vào 0002).
- Giữ phần demo: 2 businesses (Nam Phúc + Minh Anh) + 1 offer + 1 need.
- Làm idempotent: check existence trước insert (or `ON CONFLICT DO NOTHING`).
- Entry point giữ nguyên.

**Verify:** `uv run python scripts/seed.py` → chỉ insert demo, không lỗi duplicate.

**Commit:** `refactor(api): split reference data to migration, keep demo in seed script`

---

### Step 9 — README update

**Goal:** Document API contract + error format + idempotency.

**Edit `apps/api/README.md`:** thêm section "API Endpoints":
- POST /businesses — request/response schema, required fields, error codes, idempotency header.
- Link đến `/docs` (FastAPI Swagger).
- Note error envelope RFC 9457.

**Commit:** `docs(api): document onboarding endpoint + error format`

---

### Step 10 — Verify local (DoD gate)

**Goal:** Chứng minh toàn bộ chạy được trước khi PR. **KHÔNG skip.**

```bash
# 10.1 Clean rebuild
docker compose down -v && docker compose up --build -d
docker compose logs -f api  # → "Application startup complete"

# 10.2 Health
curl http://localhost:8080/health  # → {"status":"ok"}

# 10.3 Reference data seeded (migration 0002)
docker compose exec db psql -U linko -c "SELECT count(*) FROM industries"      # → 30
docker compose exec db psql -U linko -c "SELECT count(*) FROM intent_types"    # → 8
docker compose exec db psql -U linko -c "SELECT count(*) FROM certifications"  # → 12

# 10.4 Happy path POST
curl -X POST http://localhost:8080/businesses \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-001" \
  -d @sample_payload.json
# → 201 + BusinessResponse

# 10.5 Validation errors
curl -X POST http://localhost:8080/businesses -H "Content-Type: application/json" -d '{"name":"Test"}'
# → 422 problem+json (missing province, offers, needs)

curl -X POST http://localhost:8080/businesses -H "Content-Type: application/json" -d 'not json'
# → 400 problem+json (malformed json)

# 10.6 Idempotency replay
curl -X POST http://localhost:8080/businesses \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-001" \
  -d @sample_payload.json
# → 201 + Idempotent-Replayed: true header

# 10.7 Province mapping
curl -X POST http://localhost:8080/businesses ... -d '{"province": "Bình Dương", ...}'
# → 201 + warnings: ["province_converted: Bình Dương → TP. Hồ Chí Minh"]

# 10.8 Tests
uv run ruff check .    # → All checks passed
uv run pytest -q       # → all pass
```

**On-failure bất kỳ:** KHÔNG push. Fix rồi re-verify. Nếu không fix được → hỏi user kèm log.

---

### Step 11 — Commit final + push + Draft PR

```bash
cd "C:/Projects/Linko"
git push -u origin feature/7-onboarding-api
gh pr create \
  --base develop \
  --head feature/7-onboarding-api \
  --draft \
  --title "feat(api): onboarding endpoint — validate + idempotency + province mapping (Issue #7)" \
  --body-file temp/issue7/pr-body.md
gh issue comment 7 --repo Khang0609/Linko --body "Đã mở Draft PR #<N> implement API onboarding. Body PR chứa reasoning + evidence. Local đã verify pass DoD."
```

---

## 5. DoD Checklist (final gate — đối chiếu issue #7)

| DoD issue #7 | Cách verify | Status |
|---|---|---|
| 100% Data Integrity (mọi trường cốt lõi đầy đủ mới lưu) | POST thiếu field → 422; đủ → 201 | ⬜ |
| Prompting Response (thiếu → mã + biết trường nào) | 422 problem+json có `errors[]` field-level | ⬜ |
| Edge Cases tested (sai format, mạng, DB disconnect → 4xx/5xx chuẩn, có log) | test_businesses.py cover + logging | ⬜ |
| < 1 giây phản hồi | performance test + curl local | ⬜ |
| Containerized (Dockerfile) | docker compose up --build OK | ⬜ |

Bonus (từ research):
| Item | Verify | Status |
|---|---|---|
| Idempotency-Key | test_idempotency_replay pass | ⬜ |
| Province 63→34 mapping | test_province_mapping pass | ⬜ |
| Reference data migration | industries=30, intent_types=8, certifications=12 | ⬜ |
| RFC 9457 error envelope | problem+json response format | ⬜ |
| OpenAPI codegen-ready | `/openapi.json` có Literal enums | ⬜ |
| FE shared types pipeline (Khang review #14) | `libs/shared/api-types/` tạo + codegen script | ⬜ (optional, see Section 6) |

---

## 6. Optional: FE Shared Types Pipeline (từ review PR #14)

> ⚠️ **Phần này có thể tách PR riêng** nếu scope quá lớn. Đề nghị hỏi user trước khi include.

Khang0609 yêu cầu trong review #14: Pydantic DTOs → FastAPI `openapi.json` → `openapi-typescript` → `libs/shared/api-types/`.

**Nếu include trong PR này:**
1. `npx nx g @nx/js:library shared/api-types --directory=libs/shared/api-types`
2. Thêm `openapi-typescript` vào root `package.json` devDeps.
3. Script: `"codegen:types": "openapi-typescript http://localhost:8080/openapi.json --output libs/shared/api-types/src/index.ts"`
4. Chạy codegen, commit generated types.
5. FE import: `import { components } from '@linko/shared/api-types'`.

**Nếu tách PR:** Note trong PR body "shared types pipeline sẽ làm PR riêng sau #7".

---

## 7. Pitfalls & Edge Cases (đã dự đoán)

| # | Pitfall | Cách tránh / fix |
|---|---|---|
| P1 | Async session trong test khó dùng | Dùng `httpx.AsyncClient` + `TestClient` (sync wrapper) cho integration test; DB session dùng sync psycopg cho test đơn giản |
| P2 | Migration 0002 seed data conflict với seed.py cũ | 0002 dùng `ON CONFLICT DO NOTHING`; seed.py chỉ insert demo, check exist trước |
| P3 | `geo_operating` / `geo_scope` empty → server_default `'{}'` hoạt động | Test INSERT raw SQL không qua ORM để verify F3 (server_default) |
| P4 | Province normalize với dấu tiếng Việt | Dùng `unicodedata.normalize('NFKD')` + strip combining marks; test với "Binh Duong" (không dấu) |
| P5 | Idempotency race condition | `INSERT ... ON CONFLICT DO NOTHING RETURNING` — atomic, không check-then-insert |
| P6 | FastAPI default 422 cho JSON hỏng | Custom handler bắt `RequestValidationError` với type `json_invalid` → return 400 |
| P7 | FK validation chậm nếu query từng cái | Batch query: `SELECT code FROM industries WHERE code IN (...)` một lần |
| P8 | Test DB dirty giữa các test | Transactional rollback: mỗi test trong transaction, rollback cuối; hoặc truncate tables trong fixture |
| P9 | `persons[]` insert cần `business_persons` join | Insert persons → flush → insert business_persons với person_id + business_id |
| P10 | OpenAPI không sinh enum đúng nếu dùng `str` thay `Literal` | Bắt buộc `Literal[...]` cho mọi enum trong schemas.py |
| P11 | Embedding field NULL khi insert | Explicit set `profile_embedding=None`, `embedding=None` trong ORM insert (không dựa default) |
| P12 | 34 provinces không có dấu → match khó | `normalize_province` handle cả có/không dấu; test với nhiều biến thể |

---

## 8. Rollback plan

```bash
cd "C:/Projects/Linko"
git checkout develop  # hoặc feature/4-db-schema-backend
git branch -D feature/7-onboarding-api
git push origin --delete feature/7-onboarding-api
docker compose -f apps/api/docker-compose.yml down -v
# revert migration 0002: uv run alembic downgrade 0001_init
```

---

## 9. Items cần hỏi user DURING implementation

| Trigger | Hỏi gì |
|---|---|
| FE shared types pipeline (Section 6) | "Include pipeline trong PR này hay tách PR riêng?" |
| Giả định 3b (RFC 9457) | "FE confirm dùng problem+json chưa? Nếu chưa, dùng FastAPI default tạm?" |
| DB develop chưa seed | "DB develop thực tế đã chạy seed chưa? Cần verify trước." |
| 10 ngành thiếu L2 | "Validate chặt theo FK hiện có (L2 optional) hay bổ sung L2 seed trước?" |
| Performance test fail | "Nếu response >1s do DB local chậm, accept hay optimize?" |

---

## 10. Success criteria (khi nào task DONE)

1. ✅ Commits trên `feature/7-onboarding-api`, Conventional Commits.
2. ✅ Draft PR mở về `develop`, body dùng `temp/issue7/pr-body.md`, `Closes #7`.
3. ✅ Step 10 (verify local) toàn bộ pass.
4. ✅ CI Python pass trên PR (với Postgres service).
5. ✅ Báo cáo user: tóm tắt + DoD + link PR.

---

## 11. Commit plan (Conventional Commits)

```
feat(api): add Pydantic v2 schemas with Literal enums for OpenAPI codegen
feat(api): add province mapping 63→34 (NQ 202/2025/QH15)
feat(api): add RFC 9457 problem+json error handling
feat(api): add idempotency table + seed reference data migration (0002)
feat(api): add POST /businesses onboarding endpoint
test(api): add integration + unit tests for onboarding endpoint
ci: add postgres service + integration tests to backend CI
refactor(api): split reference data to migration, keep demo in seed script
docs(api): document onboarding endpoint + error format
```

---

**End of plan. Agent: bắt đầu từ Section 3 (Pre-flight) → Step 0.**

---

## Phụ lục A — Sample payload cho testing

```json
{
  "name": "Công ty TNHH Thực phẩm Nam Phúc",
  "legal_type": "cong_ty_tnhh_2tv",
  "business_stage": "dang_tang_truong",
  "year_established": 2019,
  "industry_l1": "san_xuat_che_bien",
  "industry_l2": "san_xuat_che_bien.che_bien_thuc_pham",
  "employee_range": "11_50",
  "revenue_range_vnd": "3_ty_10_ty",
  "city": "TP.HCM",
  "province": "TP. Hồ Chí Minh",
  "geo_operating": ["TP. Hồ Chí Minh"],
  "description": "Chuyên sản xuất nước mắm truyền thống",
  "offers": [
    {
      "intent_type": "find_buyer",
      "category_l1": "ban_buon_ban_le",
      "category_l2": "ban_buon_ban_le.gia_vi_nuoc_cham",
      "geo_scope": ["TP. Hồ Chí Minh"],
      "title": "Bán sỉ nước mắm truyền thống",
      "structured_attrs": {"product_category": "gia_vi_nuoc_cham", "moq": {"value": 50, "unit": "thung"}}
    }
  ],
  "needs": [],
  "persons": [
    {"full_name": "Nguyễn Văn Nam", "phone": "0901234567", "role": "owner"}
  ]
}
```

## Phụ lục B — Enum values (phải khớp models.py + seed)

```
LegalType: ho_kinh_doanh | doanh_nghiep_tu_nhan | cong_ty_tnhh_1tv | cong_ty_tnhh_2tv | cong_ty_co_phan | hop_tac_xa | cong_ty_hop_danh | khac
BusinessStage: moi_thanh_lap | dang_tang_truong | on_dinh | mo_rong_vung | chuyen_doi_so
EmployeeRange: 0 | 1_5 | 6_10 | 11_50 | 51_100 | 101_200 | 200_plus
RevenueRangeVnd: duoi_100_trieu | 100_trieu_1_ty | 1_ty_3_ty | 3_ty_10_ty | 10_ty_50_ty | 50_ty_100_ty | 100_ty_300_ty | tren_300_ty | khong_tiet_lo
DataSource: self_reported | mst_lookup | admin_input
VerificationStatus: unverified | mst_matched | manually_verified
IntentTypeCode: find_supplier | find_buyer | find_distributor | find_local_partner | find_manufacturer | co_marketing | find_investment | service_partnership
InteractionType: view_profile | send_invite | accept_invite | message
```
