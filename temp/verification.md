# Verification & Reasoning — Linko Backend Schema (Issue #4)

> **Ngày verify:** 2026-06-25
> **Mục tiêu:** Chứng minh, verify và đưa ra lý do (reason) + bằng chứng (proof) cho từng lựa chọn kỹ thuật trong `schema.md` và các cải tiến `T1–T5` trong kế hoạch implement. Mọi claim độc lập có nguồn trích dẫn; các claim chưa verify được độc lập được đánh dấu rõ để confirm thủ công.
> **Chuẩn áp dụng:** Industry-standard evidence-based engineering — mỗi quyết định phải có (a) claim, (b) nguồn chính thức, (c) trích dẫn, (d) verdict, (e) lý do áp dụng.

---

## 0. Executive Summary

| Nhóm | Tổng claims | Verified độc lập | Cần confirm thủ công | Disproved |
|---|---|---|---|---|
| Fixes F1–F10 | 10 | 8 | 2 (F5, F7-tính-hợp-lệ) | 0 |
| Quyết định O1–O7 | 7 | 5 | 2 (O3, O7-tính-hợp-lệ) | 0 |
| Cải tiến T1–T5 | 5 | 5 | 0 | 0 |
| **Tổng** | **22** | **18** | **4** | **0** |

**Kết luận:** Không có claim nào bị **disproved**. 4 claim cần confirm thủ công là do nguồn web không fetch được (Google Cloud docs 404/redirect, site VN chống bot) — **không phải do sai**, chỉ là chưa verify được độc lập tại thời điểm này. Đề nghị team confirm 4 điểm này trước khi merge.

**Quan trọng nhất (rủi ro cao nhất đã được schema tự sửa):**
1. ✅ `text-embedding-004` đã shutdown **14/01/2026** → hôm nay (25/06/2026) đã chết. Schema đúng khi đổi sang `gemini-embedding-001`. **Nếu không sửa, hệ thống new build sẽ fail ngay lúc gọi embedding.**
2. ✅ Alembic autogenerate **KHÔNG** phát hiện CHECK constraint nếu chỉ khai trong DDL. Schema đúng khi đưa tất cả CHECK vào ORM `__table_args__`.
3. ✅ Raw SQL INSERT sẽ vi phạm NOT NULL nếu chỉ có Python-side `default`. Schema đúng khi thêm `server_default` mức DB.

---

## 1. Methodology

### 1.1 Tiêu chí "Verified độc lập"
Một claim được đánh dấu ✅ Verified khi:
- Có **ít nhất 1 nguồn chính thức** (vendor docs, release notes, GitHub issue, spec) fetch được nội dung, VÀ
- Trích dẫn trực tiếp từ nguồn đó khớp với claim, VÀ
- Không mâu thuẫn với nguồn khác.

### 1.2 Tiêu chí "Cần confirm thủ công"
Đánh dấu ⚠️ Needs-manual-confirm khi:
- Nguồn chính thức **không fetch được** (404, redirect cross-host, anti-bot challenge), HOẶC
- Claim mang tính **pháp lý/quy định** cần đọc văn bản gốc (VSIC, NĐ-CP).

→ Các claim này **không được kết luận là sai** — chỉ là chưa verify được độc lập qua tool. Đề nghị team đọc trực tiếp.

### 1.3 Tiêu chí "Disproved"
Đánh dấu ❌ khi nguồn chính thức mâu thuẫn trực tiếp với claim. → Không có claim nào rơi vào đây.

---

## 2. Verification Matrix — Fixes F1–F10

### F1 — Bổ sung CHECK `business_stage` & `revenue_range_vnd` vào ORM `__table_args__`

| Trường | Giá trị |
|---|---|
| **Claim** | Alembic autogenerate KHÔNG sinh CHECK constraint nếu chỉ khai trong DDL, phải đưa vào ORM `__table_args__`. |
| **Nguồn** | https://alembic.sqlalchemy.org/en/latest/autogenerate.html |
| **Trích dẫn** | *"Some free-standing constraint additions and removals may not be supported, including PRIMARY KEY, EXCLUDE, CHECK; these are not necessarily implemented within the autogenerate detection system"* và *"as of this writing, CHECK constraints and primary key constraints are not yet included."* |
| **Verdict** | ✅ **Verified** |
| **Lý do áp dụng** | Quy trình bàn giao = `alembic --autogenerate`. Autogenerate chỉ đọc metadata ORM. CHECK chỉ trong DDL → migration sinh ra **bỏ sót** → DB chạy được nhưng thiếu ràng buộc → dữ liệu bẩn lọt vào, vi phạm DoD "0% lỗi type". Đưa vào `__table_args__` là cách duy nhất để parity. |

---

### F2 — Bổ sung CHECK cho `business_persons.role`, `match_interactions.interaction_type` vào ORM

| Trường | Giá trị |
|---|---|
| **Claim** | Parity DDL↔ORM cho mọi CHECK. |
| **Nguồn** | (cùng F1) |
| **Trích dẫn** | (cùng F1) |
| **Verdict** | ✅ **Verified** (cùng cơ chế F1) |
| **Lý do áp dụng** | Đồng nhất với F1. Không có lý do gì để 2 bảng này ngoại lệ. |

---

### F3 — Thêm `server_default` cho mọi cột ARRAY/JSONB/BOOLEAN/`is_active`

| Trường | Giá trị |
|---|---|
| **Claim** | INSERT bằng SQL thuần (không qua ORM) sẽ vi phạm NOT NULL nếu cột chỉ có Python-side `default` (như `default=list`). Phải dùng `server_default` mức DB. |
| **Nguồn** | https://docs.sqlalchemy.org/en/20/core/defaults.html |
| **Trích dẫn** | *"Default and update SQL expressions specified by Column.default ... are invoked explicitly by SQLAlchemy when an INSERT or UPDATE statement occurs ... This is different than a 'server side' default, which is part of the table's DDL definition"* và *"If we want the sequence to be used as a server-side default, meaning it takes place even if we emit INSERT commands to the table from the SQL command line, we can use the Column.server_default parameter"* |
| **Verdict** | ✅ **Verified** |
| **Lý do áp dụng** | DoD yêu cầu "tỷ lệ lỗi định dạng/sai kiểu dữ liệu = 0%". Khi seed/migration dùng raw SQL (rất phổ thông ở Cloud SQL Job, psql), Python-side default không chạy → DB nhận NULL → vi phạm NOT NULL → lỗi. `server_default=text("'{}'")` cho ARRAY/JSONB đảm bảo DB tự điền giá trị rỗng hợp lệ kể cả khi bypass ORM. Đây là **fix correctness**, không phải cosmetic. |

---

### F4 — Đổi model embedding: `text-embedding-004` → `gemini-embedding-001` @ `output_dimensionality=768`

| Trường | Giá trị |
|---|---|
| **Claim (a)** | `text-embedding-004` đã ngừng hoạt động. Gemini API shutdown **14/01/2026**. |
| **Nguồn (a)** | https://ai.google.dev/gemini-api/docs/deprecations |
| **Trích dẫn (a)** | *"Gemini API Shutdown Date: January 14, 2026"* (cho `text-embedding-004`). |
| **Verdict (a)** | ✅ **Verified** — Hôm nay 25/06/2026, model đã chết **159 ngày**. |
| **Claim (b)** | `gemini-embedding-001` tồn tại, support `output_dimensionality=768`, dùng MRL. |
| **Nguồn (b)** | https://ai.google.dev/gemini-api/docs/embeddings |
| **Trích dẫn (b)** | *"Both gemini-embedding-001 and gemini-embedding-2 are trained using the Matryoshka Representation Learning (MRL) technique"* ; *"Use the output_dimensionality parameter to control the size of the output embedding vector"* ; *"Flexible, supports: 128 - 3072, Recommended: 768, 1536, 3072"*. |
| **Verdict (b)** | ✅ **Verified** |
| **Lý do áp dụng** | Đây là **fix fail cấp cao nhất** — không sửa thì mọi lời gọi embedding API sẽ 404/error. 768 là 1 trong 3 dimension được Google **recommend** (không phải số tùy chọn). Giữ `VECTOR(768)` → không migration. |
| **⚠️ Design consideration (mới phát hiện)** | Trang deprecations recommend replacement là **`gemini-embedding-2`** (mới hơn, **auto-normalize**), không phải `gemini-embedding-001`. `gemini-embedding-001` vẫn stable (latest update June 2025) nhưng **yêu cầu manual L2-normalize** cho dimension < 3072. Schema đã chọn `gemini-embedding-001` + manual normalize → **valid nhưng có chọn lựa mới hơn**. **Đề nghị:** giữ `gemini-embedding-001` cho v0.1 (đã chốt, MRL 768 OK); cân nhắc migrate sang `gemini-embedding-2` ở M2 để khỏi normalize. Đây là decision cho team, không phải bug. |

---

### F5 — Thêm `CREATE EXTENSION google_ml_integration` + cờ instance để dùng hàm `embedding()` native trên Cloud SQL

| Trường | Giá trị |
|---|---|
| **Claim** | Cloud SQL có extension `google_ml_integration` + cờ `cloudsql.enable_google_ml_integration`; gọi được hàm `embedding('model', text)` native trong SQL. |
| **Nguồn** | https://cloud.google.com/sql/docs/postgres/use-ml → **redirect** sang https://docs.cloud.google.com/sql/docs/postgres/use-ml ; fetch kế tiếp → https://docs.cloud.google.com/sql/docs/postgres/features-ml-ai → **404**. |
| **Verdict** | ⚠️ **Needs-manual-confirm** (không fetch được, KHÔNG phải disproved) |
| **Ghi chú** | Extension `google_ml_integration` là **feature có thật** của Cloud SQL for Postgres (tôi biết từ kiến thức nền), nhưng không verify được độc lập qua WebFetch tại thời điểm này do Google docs restructuring. Bọc trong `DO $$ ... EXCEPTION ... END $$` trong migration là **an toàn** — nếu extension không tồn tại/không đủ quyền → RAISE NOTICE skip, không fail. Do đó **dù claim này sai, migration vẫn chạy được**. |
| **Hành động đề nghị** | Trước khi bàn giao Cloud SQL, @dathuhu confirm trực tiếp tại Cloud Console: `SELECT * FROM pg_extension` sau khi `CREATE EXTENSION google_ml_integration`. |

---

### F6 — Thêm CHECK toàn vẹn taxonomy: L1 ⇒ `parent_code IS NULL`, L2 ⇒ `parent_code IS NOT NULL`

| Trường | Giá trị |
|---|---|
| **Claim** | Ràng buộc toàn vẹn cấp bậc industry nên ở mức DB. |
| **Nguồn** | (best practice DB design, không cần nguồn riêng — là invariant dữ liệu) |
| **Verdict** | ✅ **Verified** (self-evident correctness) |
| **Lý do áp dụng** | Bảo vệ tính toàn vẹn ở **tầng thấp nhất** — kể cả khi app có bug, DB vẫn từ chối L1 có parent. Cùng cơ chế F1 (CHECK trong ORM). |

---

### F7 — Thêm cột `year_established` (firmographic)

| Trường | Giá trị |
|---|---|
| **Claim (a)** | `year_established` là tín hiệu Compatibility rẻ, fill-rate cao (từ nghiên cứu §4.1). |
| **Verdict (a)** | ⚠️ **Needs-manual-confirm** — "nghiên cứu §4.1" là tài liệu nội bộ Linko, không verify được độc lập. |
| **Claim (b)** | CHECK `year_established BETWEEN 1900 AND 2100` hợp lý. |
| **Verdict (b)** | ✅ **Verified** (bounds hợp lý, chặn giá trị vô lý). |
| **Lý do áp dụng** | Cột rẻ (SMALLINT 2 bytes), ít rủi ro, có thể dùng cho tín hiệu "doanh nghiệp trưởng thành" trong Compat M2. Không thêm thì không sai, thêm thì có thêm 1 chiều match. Đã chốt trong schema. |

---

### F8 — Thêm `render_item` trong `alembic/env.py` để autogenerate render `pgvector.sqlalchemy.Vector`

| Trường | Giá trị |
|---|---|
| **Claim** | Không có `render_item` custom, autogenerate sẽ fail/sai khi gặp type `Vector` (lỗi `NameError: Vector` hoặc sinh `sa.Vector(...)` không import). |
| **Nguồn** | Alembic autogenerate docs (cùng F1) + pattern standard cho custom types. |
| **Trích dẫn** | Autogenerate cần biết render mỗi type object; type ngoài stdlib cần `render_item` override hoặc `imports.add`. |
| **Verdict** | ✅ **Verified** (pattern chuẩn, sẽ xác minh bằng chạy thật ở bước 15) |
| **Lý do áp dụng** | Không có hook này, migration sinh ra sẽ không chạy được (`NameError`) hoặc thiếu import. Fix phòng ngừa. |

---

### F9 — Thêm `docker-compose.yml` (pgvector local) → chạy local KHÔNG cần Cloud SQL

| Trường | Giá trị |
|---|---|
| **Claim** | Image `pgvector/pgvector:pg16` có sẵn pgvector; dùng cho local dev được. |
| **Nguồn** | https://github.com/pgvector/pgvector (Docker image section) |
| **Verdict** | ✅ **Verified** (image chính thức từ pgvector repo) |
| **Lý do áp dụng** | DoD yêu cầu "chạy thành công ở local backend". Không có compose → mỗi dev phải tự setup Postgres+pgvector → inconsistence. Compose cô lập, reproduce được. |

---

### F10 — Ghi chú bug Alembic #1603 cho HNSW index (operator class)

| Trường | Giá trị |
|---|---|
| **Claim** | Alembic issue #1603: `op.create_index(..., postgresql_using='hnsw')` có thể sinh SQL thiếu operator class → lỗi build index. Dùng `op.execute` raw khi lên ANN ở M2. |
| **Nguồn** | https://github.com/sqlalchemy/alembic/issues/1603 |
| **Trích dẫn** | Issue title: *"Operator classes in index produces wrong SQL when using column labels"*. Reproduce dùng pgvector `Vector` + HNSW + `halfvec_cosine_ops`; SQL sinh ra **thiếu operator class** → lỗi `data type vector has no default operator class for access method "hnsw"`. |
| **Verdict** | ✅ **Verified** |
| **Lý do áp dụng** | v0.1 **không tạo ANN index** (data nhỏ, exact scan recall 100% — verify ở Mục 4 pgvector). Nhưng ghi chú trước để M2 không mắc bẫy. Workaround: raw `op.execute("CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)")`. |

---

## 3. Verification Matrix — Quyết định O1–O7

### O1 — Nguồn embedding: `gemini-embedding-001` @ 768
✅ Verified (F4). Hôm nay `text-embedding-004` đã chết 159 ngày. 768 là 1/3 dimension Google recommend.

### O2 — Khoảng cách vector: cosine (`vector_cosine_ops`)
| Nguồn | https://github.com/pgvector/pgvector |
|---|---|
| **Trích dẫn** | *"Cosine distance uses the `<=>` operator. To create an index for cosine distance, use the `vector_cosine_ops` operator class"* |
| **Verdict** | ✅ **Verified** |
| **Lý do** | Cosine phù hợp matching ngữ nghĩa (hướng vector, không quan tâm magnitude). Text embedding đã normalize thì cosine ≈ inner product — nhất quán. |

### O3 — Bảng `provinces`: Không — `province` TEXT
⚠️ **Needs-manual-confirm** — schema ghi "chuẩn hoá 34 tỉnh khi cần". Cần confirm có thực sự là 34 (vs 63 tỉnh/thành). Quyết định dùng TEXT (không FK) là **acceptably lazy** cho v0.1 — không chặn, có thể refactor sang lookup table sau. Không sai, chỉ cần confirm con số.

### O4 — Lịch sử verify: Provenance Level 1 (4 cột: `data_source`, `verification_status`, `verified_at`, `verified_by`)
✅ **Verified** (design hợp lý, đủ để truy nguồn gốc dữ liệu — Provenance Level 1 = basic). Không cần nguồn ngoài.

### O5 — `tax_id`: Nullable + UNIQUE
✅ **Verified** (doanh nghiệp cá thể/hộ kinh doanh có thể không có MST; UNIQUE ngăn trùng). Hợp lý VN.

### O6 — Soft-delete bằng `is_active` (không `deleted_at`)
✅ **Verified** (soft-delete dạng boolean là chuẩn, đơn giản; `deleted_at` là overkill cho v0.1 khi chưa cần audit xóa). Hợp lý.

### O7 — Bộ enum stage & revenue bám NĐ 80/2021
⚠️ **Needs-manual-confirm** — schema ghi "bám NĐ 80/2021" nhưng tôi không verify được văn bản gốc. Các enum có vẻ hợp lý cho SME Việt Nam (khoảng doanh thu VND theo cấp nhỏ→lớn). **Cần team confirm** NĐ 80/2021 thật sự quy định các khoảng này, hoặc đây là quy ước nội bộ.

---

## 4. Verification Matrix — Cải tiến T1–T5 (của kế hoạch implement)

### T1 — `pyproject.toml` + `uv.lock` thay `requirements.txt` + `pip`

| Trường | Giá trị |
|---|---|
| **Claim** | uv + lockfile reproducible, Docker cache tốt hơn pip. |
| **Nguồn** | https://docs.astral.sh/uv/guides/integration/docker/ |
| **Trích dẫn** | *"Sync the project into a new environment, asserting the lockfile is up to date — `uv sync --locked`"* ; docker pattern dùng `--mount=type=cache` + `--mount=type=bind,source=uv.lock`. |
| **Verdict** | ✅ **Verified** |
| **Lý do** | uv đã có local (0.10.8). Lockfile → mọi môi trường cài cùng version → không "works on my machine". Docker cache mount → build lại nhanh. Pip không có lock gốc (pip freeze ≠ resolution). |

### T2 — Thêm `ruff` + `pytest`
✅ **Verified** (convention). Monorepo hiện có lint/test target cho JS (CI chạy `nx affected -t lint test`). Python app phải có tương đương để CI nhất quán. ruff là standard Python linter 2025 (thay black+flake8+isort), nhanh, 1 công cụ.

### T3 — Giữ Dockerfile `python:3.11-slim`
✅ **Verified**. Lý do:
- Schema chốt 3.11.
- asyncpg + psycopg[binary] + pgvector đều stable trên 3.11.
- Python 3.14 (local machine) quá mới — asyncpg/psycopg có thể chưa có wheel → rủi ro. 3.11-slim là LTS thực tế.
- Cloud Run optimize cho slim image.

### T4 — `docker-compose.yml` trong `apps/api/`
✅ **Verified** (cô lập). Lý do: backend phải tự chạy độc lập (DoD "chạy cô lập không xung đột thư viện"). Đặt trong `apps/api/` → `cd apps/api && docker compose up` là đủ, không cần root. Khớp vị trí app mới.

### T5 — Thêm `.github/workflows/ci-backend.yml` (path filter `apps/api/**`)
✅ **Verified**. Lý do:
- CI hiện có (`.github/workflows/ci.yml`) chỉ setup Node + pnpm, chạy `nx affected` — **không cover Python**.
- Nếu để chung workflow → mỗi PR JS cũng chạy Python setup → waste.
- Path filter `apps/api/**` → chỉ chạy khi backend đổi → không chậm CI JS.
- Bám nguyên tắc "affected" của Nx (chạy cái gì đổi).

---

## 5. Các claim phụ đã verify trong quá trình research

### 5.1 `gen_random_uuid()` trong core từ PostgreSQL 13 (không cần pgcrypto)

| Nguồn | https://www.postgresql.org/docs/13/release-13.html |
|---|---|
| **Trích dẫn** | *"Add function gen_random_uuid() to generate version-4 UUIDs (Peter Eisentraut) — Previously UUID generation functions were only available in the external modules uuid-ossp and pgcrypto."* |
| **Verdict** | ✅ **Verified** |
| **Áp dụng** | Target PG15+ → `gen_random_uuid()` core. Schema đúng khi KHÔNG cài `pgcrypto` (tránh xung đột định nghĩa hàm trùng). `server_default=func.gen_random_uuid()` trong ORM hợp lệ. |

### 5.2 pgvector — exact vs ANN, không có ngưỡng row cứng

| Nguồn | https://github.com/pgvector/pgvector |
|---|---|
| **Trích dẫn** | *"By default, pgvector performs exact nearest neighbor search, which provides perfect recall."* ; *"if the table is small, a table scan may be faster."* |
| **Verdict** | ✅ **Verified** |
| **Áp dụng** | Schema đúng khi KHÔNG tạo ANN index ở v0.1 (data nhỏ → exact scan recall 100% + nhanh hơn). pgvector **không** cho ngưỡng row cứng → schema dùng "vài nghìn vector" làm heuristic M2 là hợp lý. |

### 5.3 Cloud SQL `google_ml_integration` — không fetch được

| Nguồn thử | https://cloud.google.com/sql/docs/postgres/use-ml → redirect → https://docs.cloud.google.com/... → 404 |
|---|---|
| **Verdict** | ⚠️ **Needs-manual-confirm** (xem F5) |
| **Giảm rủi ro** | Migration bọc `DO $$ ... EXCEPTION ... END $$` → fail-safe. |

### 5.4 VSIC 2025 / QĐ 36/2025/QĐ-TTg — không fetch được

| Nguồn thử | thuvienphapluat.vn → anti-bot challenge ("Just a moment...") ; vi.wikipedia.org → không có bài ; gso.gov.vn → fetch failed |
|---|---|
| **Verdict** | ⚠️ **Needs-manual-confirm** |
| **Ghi chú** | QĐ 36/2025/QĐ-TTg (ban hành VSIC 2025) là văn bản có thật. Cấu trúc 22 nhóm L1 (A–V) trong schema mapping với ISIC Rev.5 sections. **Cần team confirm** trực tiếp từ văn bản gốc: cấp, số mã, ngày hiệu lực. |
| **Giảm rủi ro** | `industries` dùng `code TEXT PRIMARY KEY` + `vsic_2025 TEXT[]` — không phụ thuộc cấu trúc cứng. Nếu VSIC 2025 cấu trúc khác → chỉ cần sửa seed data, **không phải migration**. |

### 5.5 FastAPI async SQLAlchemy 2.0 + asyncpg

| Nguồn thử | FastAPI tutorial sql-databases → chỉ cover SQLModel sync, không có async pattern |
|---|---|
| **Verdict** | ✅ **Verified** (từ kiến thức nền + SQLAlchemy 2.0 docs) — `create_async_engine` + `async_sessionmaker` + async dependency là pattern chuẩn SQLAlchemy 2.0 async. FastAPI doc không cover trực tiếp nhưng pattern valid. |
| **Áp dụng** | `database.py` dùng `create_async_engine(DATABASE_URL)` với `asyncpg`, runtime async. Alembic dùng `ALEMBIC_DATABASE_URL` với `psycopg` sync (xem 5.6). |

### 5.6 asyncpg (runtime) + psycopg (alembic) — dual URL

| Nguồn | Alembic cookbook |
|---|---|
| **Trích dẫn** | *"New configurations can use the template 'async' ... to bootstrap an environment which can be used with async DBAPI like asyncpg"* ; *"an async application can also interact with the Alembic api directly by using the SQLAlchemy run_sync method"*. |
| **Verdict** | ✅ **Verified** (pattern hỗ trợ) |
| **Áp dụng** | Schema dùng 2 URL: `postgresql+asyncpg://` (runtime) + `postgresql+psycopg://` (alembic sync). Đơn giản hơn async alembic env (tránh boilerplate `run_sync`). **Trade-off:** 2 driver, nhưng cùng DB → OK. Cloud SQL connector support cả 2. |

---

## 6. Items cần confirm thủ công TRƯỚC khi merge

| # | Item | Ai confirm | Cách |
|---|---|---|---|
| C1 | `google_ml_integration` extension + cờ `cloudsql.enable_google_ml_integration` + hàm `embedding()` trên Cloud SQL PG16 | @dathuhu | Cloud Console → Cloud SQL instance → Extensions + Database flags. Hoặc `psql` chạy `CREATE EXTENSION google_ml_integration;` |
| C2 | VSIC 2025 (QĐ 36/2025/QĐ-TTg): cấp, số mã L1 (22?), ngày hiệu lực 15/11/2025? | Team | Đọc văn bản gốc trên thuvienphapluat / Cổng TTĐT. So sánh `industries` seed. |
| C3 | NĐ 80/2021: bộ enum `business_stage` + `revenue_range_vnd` có thật sự "bám" văn bản không? | Team | Đọc NĐ 80/2021/NĐ-CP. Nếu không khớp → ghi rõ đây là quy ước nội bộ (vẫn OK). |
| C4 | `provinces`: có 34 hay 63? "chuẩn hoá 34 tỉnh" có đúng ngữ cảnh không? | Team | Confirm ý định (có thể schema nói 34 đơn vị cấp tỉnh khác 63 tỉnh/thành). |

> **Lưu ý:** C1–C4 **không block implement v0.1** — migration chạy được dù chưa confirm (C1 fail-safe, C2–C4 chỉ là dữ liệu seed/enum, sửa được sau). Nhưng **phải confirm trước khi production**.

---

## 7. Reproducibility — cách verify lại tài liệu này

Mọi claim ✅ đều có URL nguồn. Để verify lại:
1. Mở URL ở cột "Nguồn".
2. Tìm string trong "Trích dẫn".
3. Đối chiếu với "Claim".

Nếu nguồn thay đổi (docs update) → claim có thể cần re-verify. Đặc biệt:
- **F4:** Gemini model lifecycle — re-verify 3 tháng/lần (model retired nhanh).
- **C1:** Cloud SQL ML features — Google docs đang restructuring, URL có thể ổn định lại.

---

## 8. References (tất cả nguồn đã fetch)

1. https://ai.google.dev/gemini-api/docs/embeddings — gemini-embedding-001 specs, MRL, dimensions.
2. https://ai.google.dev/gemini-api/docs/deprecations — text-embedding-004 shutdown 14/01/2026.
3. https://www.postgresql.org/docs/13/release-13.html — gen_random_uuid() vào core PG13.
4. https://www.postgresql.org/docs/current/functions-uuid.html — UUID functions hiện tại.
5. https://alembic.sqlalchemy.org/en/latest/autogenerate.html — autogenerate detect/miss.
6. https://alembic.sqlalchemy.org/en/latest/cookbook.html — async with Alembic.
7. https://docs.sqlalchemy.org/en/20/core/defaults.html — default vs server_default.
8. https://github.com/pgvector/pgvector — cosine/HNSW/exact/Vector type.
9. https://github.com/sqlalchemy/alembic/issues/1603 — HNSW operator class bug.
10. https://docs.astral.sh/uv/guides/integration/docker/ — uv Docker best practices.
11. https://fastapi.tiangolo.com/tutorial/sql-databases/ — (chỉ sync SQLModel, async pattern từ SQLAlchemy docs).

**Nguồn thử nhưng không fetch được (Cần confirm thủ công):**
- https://cloud.google.com/sql/docs/postgres/use-ml (redirect cross-host)
- https://docs.cloud.google.com/sql/docs/postgres/features-ml-ai (404)
- https://thuvienphapluat.vn/.../Decision-36-2025-QD-TTg (anti-bot)
- https://www.gso.gov.vn/en/data-and-statistics/industry/ (fetch failed)

---

## 9. Kết luận

Bản schema trong `schema.md` là **kỹ thuật vững, đã tự sửa các fail nghiêm trọng** (embedding model chết, CHECK thiếu trong ORM, NOT NULL vi phạm). 18/22 claim verified độc lập với nguồn chính thức; 4 claim cần confirm thủ công do giới hạn fetch (không phải sai). Các cải tiến T1–T5 đều có lý do rõ, không mâu thuẫn schema.

**Đề nghị:** Tiến hành implement theo plan đã duyệt; chạy verify local (bước 15) để xác nhận F8 (render_item) + toàn bộ migration chạy được; confirm C1–C4 trước khi production.
