# PR: feat(api): backend schema DB + migration + Docker (Issue #4)

> **Đây là nội dung PR body.** Agent: khi tạo PR, dùng `gh pr create --base develop --head feature/4-db-schema-backend --draft --title "feat(api): backend schema DB + migration + Docker (Issue #4)" --body-file temp/pr-body.md`
>
> Team review: đọc file này từ trên xuống. Mỗi quyết định đều có **Why** + **Evidence** + link tới tài liệu chi tiết. Nếu muốn xem code, vào tab Files changed. Nếu muốn xem proof đầy đủ, mở `temp/verification.md`.

---

## 🎯 TL;DR

PR này implement **backend Python** cho Linko — đặt nền móng dữ liệu để `Smart Analyzer` (M2) có chỗ đổ dữ liệu, và `A precise evaluator` có chất liệu so khớp đối tác. Đạt **đúng DoD issue #4**: schema + migration + seed + Docker chạy local được. **KHÔNG** làm matching logic (M2, issue riêng).

**Closes #4**

---

## 📋 What changed (tóm tắt)

| Area             | Files                                                                    | Mục đích                                          |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| Backend scaffold | `apps/api/{pyproject.toml, alembic.ini, .python-version, .dockerignore}` | Project Python mới, uv-managed                    |
| Models (SoT)     | `apps/api/app/models.py`                                                 | 9 bảng SQLAlchemy 2.0 — nguồn chân lý cho Alembic |
| App runtime      | `apps/api/app/{config,database,main}.py`                                 | FastAPI + async DB + `/health`                    |
| Migration        | `apps/api/alembic/{env.py, versions/0001_init.py}`                       | Autogenerate + ext + triggers                     |
| Seed             | `apps/api/scripts/seed.py`                                               | Demo cặp match find_buyer ↔ find_supplier         |
| Container        | `apps/api/{Dockerfile, docker-compose.yml}`                              | Local pgvector + API, 1 lệnh lên                  |
| Tests            | `apps/api/tests/test_health.py`                                          | Smoke test (CI)                                   |
| CI               | `.github/workflows/ci-backend.yml`                                       | Python CI riêng, path-filtered                    |
| Docs             | `apps/api/README.md`                                                     | Local run + handoff @dathuhu                      |

Backend đặt ở `apps/api/` (Python, uv-managed) — **không** đụng đến JS apps/Nx hiện có.

---

## ❓ Tại sao làm như này — Reasoning cho từng quyết định

Team review phần này trước khi xem code. Mỗi quyết định có **Why** + **Evidence** (link proof đầy đủ trong `temp/verification.md`).

### A. Kiến trúc & tooling

#### A1. Backend ở `apps/api/`, không phải `linko-backend/` ở root

- **Why:** `MONOREPO_GUIDE.md` quy định app đặt trong `apps/*` (như `apps/web-app`), scope `@linko/`. Đặt ở root sẽ break convention + khiến CI Nx không nhận.
- **Trade-off:** Schema Mục 12 gợi ý `linko-backend/`. Nhưng schema là _technical spec_, còn monorepo guide là _governance_ — governance thắng.
- **Evidence:** `MONOREPO_GUIDE.md` Section "Directory Layout".

#### A2. Dùng `pyproject.toml` + `uv.lock` thay `requirements.txt` + pip (T1)

- **Why:** uv có sẵn local (0.10.8). Lockfile → mọi môi trường cài đúng version → không "works on my machine". Docker cache mount tốt hơn pip.
- **Evidence:** `temp/verification.md` Section T1 — trích dẫn uv Docker docs: _"uv sync --locked — asserting the lockfile is up to date"_.
- **Trade-off:** Team phải cài uv (1 binary, không deps). Đổi lại: reproducible build, faster CI.

#### A3. Pin Python 3.11 (không dùng 3.14 local) (T3)

- **Why:** Local có Python 3.14.3 — quá mới, asyncpg/psycopg chưa chắc có wheel → rủi ro build fail. 3.11 là LTS thực tế, tất cả deps stable.
- **Evidence:** `temp/verification.md` Section T3.
- **Cách:** `.python-version=3.11` + `uv venv --python 3.11` (uv tự download 3.11 nếu thiếu).

#### A4. Thêm `ruff` + `pytest` (T2) + CI Python riêng (T5)

- **Why:** CI hiện (`.github/workflows/ci.yml`) chỉ setup Node + pnpm, chạy `nx affected` — **không cover Python**. Nếu để chung → mỗi PR JS cũng chạy Python setup → waste. Path filter `apps/api/**` → chỉ chạy khi backend đổi.
- **Evidence:** `temp/verification.md` Section T2 + T5. Đọc `ci.yml` hiện tại thấy không có Python.

### B. Schema — các fix FAIL đã sửa (F1–F10)

Đây là phần **quan trọng nhất** — schema gốc (Canonical) có **2 lỗi sẽ fail khi chạy thật**, đã được sửa. Team cần hiểu tại sao.

#### B1. 🔴 `text-embedding-004` đã CHẾT → đổi sang `gemini-embedding-001` (F4)

- **Why:** `text-embedding-004` đã bị Google shutdown **14/01/2026**. Hôm nay (25/06/2026) = đã chết **159 ngày**. Nếu giữ nguyên, mọi lời gọi embedding API sẽ **404/error ngay lúc runtime**.
- **Evidence:** `temp/verification.md` Section F4 — trích dẫn Gemini deprecations page: _"Gemini API Shutdown Date: January 14, 2026"_.
- **Giải pháp:** `gemini-embedding-001` @ `output_dimensionality=768` (MRL — cắt 3072→768 gần không mất chất lượng). Giữ `VECTOR(768)` → **không cần migration**.
- **⚠️ Note cho team:** Google recommend replacement là `gemini-embedding-2` (mới hơn, auto-normalize). Schema chốt `gemini-embedding-001` (cần manual L2-normalize) → valid, nhưng cân nhắc migrate sang v2 ở M2. **Đây là decision, không phải bug.**

#### B2. 🔴 Alembic autogenerate KHÔNG sinh CHECK nếu chỉ trong DDL (F1, F2)

- **Why:** Quy trình bàn giao = `alembic --autogenerate`. Autogenerate **chỉ đọc metadata ORM**, không đọc DDL. Nếu CHECK chỉ khai trong DDL (như schema gốc) → migration sinh ra **bỏ sót** → DB chạy được nhưng thiếu ràng buộc → dữ liệu bẩn lọt vào, vi phạm DoD "0% lỗi type".
- **Evidence:** `temp/verification.md` Section F1 — trích dẫn Alembic docs: _"Some free-standing constraint additions ... including PRIMARY KEY, EXCLUDE, CHECK; these are not necessarily implemented within the autogenerate detection system"_.
- **Giải pháp:** Đưa **TẤT CẢ** CHECK vào `__table_args__` của model. DDL chỉ là bản đối chiếu.

#### B3. 🔴 Raw SQL INSERT vi phạm NOT NULL nếu chỉ có Python `default` (F3)

- **Why:** `default=list` (Python-side) chỉ chạy khi INSERT qua SQLAlchemy ORM. Khi seed/migration dùng raw SQL (psql, Cloud SQL Job) → DB nhận NULL → vi phạm NOT NULL → lỗi.
- **Evidence:** `temp/verification.md` Section F3 — trích dẫn SQLAlchemy 2.0 docs: _"server side default ... takes place even if we emit INSERT commands to the table from the SQL command line"_.
- **Giải pháp:** Thêm `server_default=text("'{}'")` cho mọi ARRAY/JSONB/BOOLEAN ở mức DB.

#### B4. 🟠 Alembic `render_item` cho pgvector (F8)

- **Why:** Type `pgvector.sqlalchemy.Vector` ngoài stdlib. Không có `render_item` custom → autogenerate sinh `sa.Vector(...)` không import → `NameError` khi chạy migration.
- **Evidence:** `temp/verification.md` Section F8.
- **Giải pháp:** `render_item` hook trong `env.py` + `import pgvector.sqlalchemy` tự thêm vào file migration.

#### B5. 🟠 `google_ml_integration` fail-safe (F5)

- **Why:** Cloud SQL có extension `google_ml_integration` để gọi `embedding()` native. Local `pgvector/pgvector` image **không có**. Nếu migration hardcode `CREATE EXTENSION google_ml_integration` → fail local.
- **Evidence:** `temp/verification.md` Section F5 — **⚠️ chưa verify độc lập được** (Google docs 404/redirect). Đánh dấu **C1 cần confirm**.
- **Giải pháp:** Bọc `DO $$ BEGIN CREATE EXTENSION ... EXCEPTION WHEN OTHERS THEN RAISE NOTICE ... END $$` → local skip OK, Cloud SQL tạo OK.

#### B6. 🟢 CHECK toàn vẹn taxonomy (F6), thêm `year_established` (F7)

- **Why:** Bảo vệ invariant ở tầng DB (L1 không có parent, L2 có parent). `year_established` là tín hiệu Compatibility rẻ, fill-rate cao.
- **Evidence:** F6 self-evident correctness. F7 ⚠️ "nghiên cứu §4.1" là nội bộ, đánh dấu C-related.

#### B7. 🟢 Ghi chú Alembic #1603 (F10) + docker-compose (F9)

- **Why:** F10 — bug thật của Alembic: HNSW index sinh SQL thiếu operator class → lỗi build. v0.1 không tạo ANN (data nhỏ), nhưng note trước để M2 không mắc bẫy. F9 — image `pgvector/pgvector:pg16` chính thức.
- **Evidence:** `temp/verification.md` Section F10 — trích dẫn issue gốc: _"Operator classes in index produces wrong SQL when using column labels"_.

### C. Quyết định thiết kế (O1–O7)

| #   | Quyết định                        | Why (1 dòng)                   | Evidence                    |
| --- | --------------------------------- | ------------------------------ | --------------------------- |
| O1  | `gemini-embedding-001` @ 768      | text-embedding-004 chết (F4)   | ✅ F4                       |
| O2  | Cosine (`vector_cosine_ops`)      | Phù hợp matching ngữ nghĩa     | ✅ pgvector docs            |
| O3  | Không bảng `provinces`, dùng TEXT | v0.1 lazy OK, refactor sau     | ⚠️ C4 (34 vs 63?)           |
| O4  | Provenance 4 cột                  | Đủ truy nguồn gốc cơ bản       | ✅ design                   |
| O5  | `tax_id` nullable + UNIQUE        | Hộ kinh doanh có thể không MST | ✅ hợp lý VN                |
| O6  | Soft-delete `is_active`           | Đơn giản, đủ v0.1              | ✅                          |
| O7  | Enum bám NĐ 80/2021               | (claim)                        | ⚠️ C3 (cần confirm văn bản) |

### D. Những gì KHÔNG làm (và tại sao)

| Không làm                               | Tại sao                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| Matching logic `Score(A→B)`             | Đó là M2 — issue riêng, không phải #4                              |
| HNSW ANN index                          | Data v0.1 nhỏ → exact scan recall 100% + nhanh hơn (pgvector docs) |
| FastAPI routers `/match`, `/businesses` | Out of scope issue #4 (chỉ cần health để CMD chạy)                 |
| Auth / RBAC                             | Chưa yêu cầu v0.1                                                  |
| Bảng `provinces` lookup                 | O3 — TEXT đủ cho v0.1                                              |
| Cloud SQL deploy                        | Handoff cho @dathuhu (README Section Handoff)                      |

---

## 📊 Evidence index (proof đầy đủ)

PR này dựa trên **22 claims kỹ thuật**, đã verify trong `temp/verification.md`:

| Nhóm             | Verified ✅ | Cần confirm ⚠️     | Disproved ❌ |
| ---------------- | ----------- | ------------------ | ------------ |
| Fixes F1–F10     | 8           | 2 (F5, F7-nội-bộ)  | 0            |
| Quyết định O1–O7 | 5           | 2 (O3, O7-pháp-lý) | 0            |
| Cải tiến T1–T5   | 5           | 0                  | 0            |
| **Tổng**         | **18**      | **4**              | **0**        |

**Không có claim nào bị disproved.** 4 claim cần confirm thủ công là do giới hạn fetch web (Google docs 404, site VN chống bot) — **không phải sai**, chỉ chưa verify độc lập được, và **không block merge v0.1**.

Mỗi claim ✅ đều có URL nguồn + trích dẫn trực tiếp trong `temp/verification.md`. Reproduce bằng cách: mở URL → tìm string trích dẫn → đối chiếu claim.

### Key sources (đã fetch)

1. https://ai.google.dev/gemini-api/docs/deprecations — `text-embedding-004` shutdown 14/01/2026
2. https://www.postgresql.org/docs/13/release-13.html — `gen_random_uuid()` vào core PG13
3. https://alembic.sqlalchemy.org/en/latest/autogenerate.html — CHECK không detect
4. https://docs.sqlalchemy.org/en/20/core/defaults.html — `server_default` vs `default`
5. https://github.com/sqlalchemy/alembic/issues/1603 — HNSW operator class bug
6. https://github.com/pgvector/pgvector — cosine/exact/ANN
7. https://docs.astral.sh/uv/guides/integration/docker/ — uv Docker

---

## ✅ DoD checklist (đối chiếu issue #4)

| DoD issue #4                        | Status | Verify                                                                                                             |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Bộ chỉ số "Vừa đủ"                  | ✅     | 9 bảng ánh xạ trực tiếp công thức M2 (xem `temp/schema.md` Mục 2). Không trường thừa.                              |
| Dữ liệu cấu trúc sạch (0% lỗi type) | ✅     | TEXT+CHECK, FK, UNIQUE, ARRAY/JSONB có `server_default` (F3); CHECK trong ORM (F1–F2). `\d+ businesses` → 7 CHECK. |
| Sẵn sàng kết nối                    | ✅     | `alembic upgrade head` chạy local. Bàn giao Cloud SQL chỉ thêm `google_ml_integration`.                            |
| Containerized                       | ✅     | `Dockerfile` + `docker-compose.yml` (pgvector) chạy cô lập, không xung đột thư viện.                               |

---

## 🔬 Verified locally (agent đã chạy)

```bash
# Clean rebuild
docker compose down -v && docker compose up --build -d
# → API + DB healthy

curl http://localhost:8080/health
# → {"status":"ok"}

docker compose exec db psql -U linko -c "\d+ businesses"
# → thấy 7 CHECK: ck_legal_type, ck_business_stage, ck_year_established,
#   ck_employee_range, ck_revenue_range, ck_data_source, ck_verification_status

docker compose exec api uv run python scripts/seed.py
# → ✅ Seed completed: 2 businesses, 1 offer (find_buyer), 1 need (find_supplier)

uv run ruff check .   # → All checks passed
uv run pytest -q      # → 1 passed

# Idempotency
docker compose exec api uv run alembic downgrade base
docker compose exec api uv run alembic upgrade head
# → chạy lại OK
```

---

## ⚠️ Items cần confirm TRƯỚC production (C1–C4)

Không block merge v0.1 (migration fail-safe, C2–C4 chỉ là seed/enum sửa được sau). Nhưng **phải confirm trước khi deploy production**.

| #   | Item                                                                                                         | Ai confirm | Cách                                                    | Lý do chưa verify được                        |
| --- | ------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------- | --------------------------------------------- |
| C1  | Cloud SQL `google_ml_integration` extension + cờ `cloudsql.enable_google_ml_integration` + hàm `embedding()` | @dathuhu   | Cloud Console → Cloud SQL → Extensions + Database flags | Google docs đang restructuring (404/redirect) |
| C2  | VSIC 2025 (QĐ 36/2025/QĐ-TTg): cấp, số mã L1 (22?), ngày hiệu lực 15/11/2025?                                | Team       | Đọc văn bản gốc thuvienphapluat / Cổng TTĐT             | Site chống bot                                |
| C3  | NĐ 80/2021 quy định enum `business_stage` + `revenue_range_vnd`?                                             | Team       | Đọc NĐ 80/2021/NĐ-CP                                    | Cần đọc văn bản gốc                           |
| C4  | `provinces`: 34 hay 63?                                                                                      | Team       | Confirm ý định schema                                   | —                                             |

---

## 🤝 Handoff cho @dathuhu (Cloud SQL)

Sau khi PR merge, để lên Cloud SQL:

1. `docker compose up --build` → verify local OK (xem `apps/api/README.md`).
2. Tạo Cloud SQL PG16 instance.
3. Bật extensions: `vector`, `unaccent`, `google_ml_integration` (C1).
4. Set database flag `cloudsql.enable_google_ml_integration = on`.
5. Cấp IAM Vertex AI cho Cloud SQL service account.
6. Chạy `alembic upgrade head` (qua Cloud Run Job hoặc psql).
7. Verify `\d+ businesses` thấy đủ CHECK.
8. Cấu hình `DATABASE_URL` dùng `cloud-sql-python-connector` (socket path `/cloudsql/PROJECT:REGION:INSTANCE`).

Chi tiết: `apps/api/README.md` Section Handoff.

---

## 📚 Tài liệu tham khảo (trong repo)

| File                          | Mục đích                                                 |
| ----------------------------- | -------------------------------------------------------- |
| `temp/schema.md`              | Schema FINAL — spec kỹ thuật (DDL, models, seed, Docker) |
| `temp/verification.md`        | Proof 22 claims + reasoning + sources                    |
| `temp/implementation-plan.md` | Plan thực thi (15 steps, pitfalls, rollback)             |
| `apps/api/README.md`          | Hướng dẫn chạy local + handoff                           |

---

## 🧪 Review guide cho team

Khi review PR này, gợi ý thứ tự:

1. **Đọc PR body này** (đang xem) — hiểu why + evidence.
2. **Mở `temp/verification.md`** — check claim nào bạn quan tâm, verify source.
3. **Review code** (tab Files changed) — focus:
   - `app/models.py` — đối chiếu `temp/schema.md` Mục 7 (phải identical).
   - `alembic/versions/0001_init.py` — check ext + trigger + thứ tự drop.
   - `alembic/env.py` — check `render_item`.
   - `Dockerfile` — check uv + 3.11 + CMD.
4. **Nếu muốn chạy thử local:** `cd apps/api && docker compose up --build` rồi `curl localhost:8080/health`.
5. **Comment** vào dòng bạn muốn thảo luận. Đặc biệt quan tâm:
   - F4 (embedding model) — confirm đổi `gemini-embedding-001` OK?
   - C1–C4 — ai confirm?
   - A1 (vị trí `apps/api`) — OK với convention?

---

## 🔗 Links

- Issue: https://github.com/Khang0609/Linko/issues/4
- Milestone: M1: Smart Onboarding & Profile Extraction (MVP v0.1) — due 08/07/2026
- Branch: `feature/4-db-schema-backend` → `develop`
