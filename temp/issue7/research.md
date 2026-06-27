<aside>
🔬

**Tài liệu này chứa gì:** toàn bộ *nghiên cứu, lập luận và nguồn kiểm chứng* đằng sau các quyết định thiết kế cho Issue #7. Đây là phần "tại sao" để cả team đọc và verify. **Phần kế hoạch triển khai (how-to) được maintain riêng bởi người phụ trách.**

</aside>

## 0. Phương pháp làm việc

- **Verify tận nguồn gốc (primary source):** ưu tiên tài liệu chính thức (MDN, Stripe, văn bản luật, schema của chính dự án) thay vì bài blog thứ cấp.
- **Đánh giá nhiều phương án:** mỗi quyết định đều liệt kê các lựa chọn + trade-off, không chốt vội.
- **Tự audit:** ghi nhận rõ chỗ lập luận ban đầu sai/quá mạnh và đã sửa (Mục 5).
- **Gắn mức độ tin cậy (confidence)** cho từng kết luận (Mục 6).

---

## 1. Bốn câu hỏi quyết định — lập luận & bằng chứng

### Q1 — Trường nào bắt buộc?

**Lập luận gốc (từ schema của chính dự án):** `temp/schema.md` nói rõ *"Mỗi cột tồn tại vì phục vụ trực tiếp một số hạng trong công thức Score(A→B)"*. Dựa vào bảng ánh xạ cột→số hạng:

| Trường | Phục vụ số hạng nào | Bắt buộc? | Độ chắc |
| --- | --- | --- | --- |
| Tên DN | Định danh | Có | Cao |
| ≥1 offer/need + intent | w₁ Complementarity + w₅ IntentMatch (lõi) | Có — thiếu là "vô hình", không bao giờ lên match | Rất cao |
| industry_l1 | w₁/w₃ (nhóm lõi "Mặt hàng") | Có | Cao |
| province | chỉ w₄ Compatibility(geo) | **Đã chốt: Bắt buộc** (xem Mục 10) | Trung bình → Cao |

**Ba phương án cho `province` đã cân nhắc:**

- **A — Bắt buộc luôn:** geo rất quan trọng trong B2B VN; intent `find_local_partner` gần như vô nghĩa nếu thiếu tỉnh; chi phí điền ~0 (1 dropdown 34 lựa chọn). → *Đề xuất.*
- **B — Bắt buộc có điều kiện:** chỉ bắt buộc khi intent thiên địa phương. Tinh tế hơn nhưng phức tạp hoá luật validate ở v0.1.
- **C — Optional:** tối giản nhất, hại chất lượng match geo.

**Bằng chứng ngoài (grounding):** các sàn matching B2B thực tế đều dựa vào ngành, quy mô, sản phẩm/nhu cầu, địa điểm — và đặt một số trường "bắt buộc" để *matching mạnh hơn* (b2match, Grip).

<aside>
⚠️

**Cảnh báo về số liệu form thường bị trích sai:** các con số "mỗi field +1 thì -4.1% chuyển đổi" hay "11→4 field = +120%" đến từ **form marketing/checkout**, KHÔNG phải onboarding sản phẩm. Nghiên cứu gốc của HubSpot cho thấy quan hệ **không tuyến tính** (3–5 field có khi tốt hơn 1–2). Với Linko, người dùng **động lực cao** và #10 đã trích sẵn (chủ yếu *duyệt* chứ không gõ) → friction thấp hơn form lạnh → có thể đòi nhiều hơn một chút. **Chỗ dựa chính cho "ít trường bắt buộc" là logic matching-necessity (schema), KHÔNG phải số liệu form.**

</aside>

Nguồn: Baymard — checkout form fields · HubSpot form length (qua Mailmunch) · CXL — reduce form fields

---

### Q2 — "Đủ 100%" + sentinel vs null + mã HTTP

**Lập luận:**

- Dùng **sentinel** (`khong_tiet_lo`, `khac`) thay NULL: NULL gây mơ hồ (quên? cố giấu? lỗi?). Sentinel rõ ràng, máy đọc được — đúng ý đồ gốc của schema (enum `khong_tiet_lo` đã có sẵn).
- Thiếu trường bắt buộc → **HTTP 422**, không phải 400.

**Bằng chứng (primary, MDN):** 422 = *"server hiểu kiểu nội dung, cú pháp đúng, nhưng không xử lý được… gửi lại y nguyên sẽ lỗi y vậy"* — đúng tình huống thiếu dữ liệu. 400 dành cho cú pháp hỏng. FastAPI cũng mặc định 422 cho lỗi validation.

Nguồn: MDN — HTTP 422

**Bảng mã đề xuất:** 201 (lưu OK) · 400 (JSON hỏng) · 422 (sai định dạng / thiếu / FK lạ) · 409 (trùng tax_id / idempotency-key đang xử lý) · 500 (lỗi nội bộ, có log).

<aside>
⚙️

**Lưu ý triển khai (bổ sung sau vòng research sâu):**

- **Muốn 400 cho JSON hỏng thì phải tự viết handler.** FastAPI *mặc định* trả **422** cả khi JSON sai cú pháp (gói trong `RequestValidationError`, type `json_invalid`). Muốn đúng chuẩn HTTP (400 = cú pháp hỏng) phải override `RequestValidationError` / bắt `json.JSONDecodeError`. (FastAPI — Handling Errors) · (FastAPI #3993)
- **Thân lỗi nên theo RFC 9457 (`application/problem+json`).** Chuẩn IETF (thay RFC 7807) cho error envelope máy-đọc-được: `type`/`title`/`status`/`detail`/`instance` + field mở rộng. FastAPI mặc định trả `{"detail": [...]}` — *không* phải 9457; team nên chọn 1 format thống nhất ngay từ #7. (RFC 9457)
</aside>

---

### Q3 — Người liên hệ

**Lập luận (từ schema):** `persons`/`business_persons` phục vụ *north-star = hội thoại* (match người↔người). Match xong mà không có đầu mối liên hệ thì không kết nối được.

**Đề xuất:** API **chấp nhận** `persons[]` ngay từ v0.1 (định hình contract sớm, khỏi đổi về sau); tối thiểu `full_name`; SĐT/Zalo tùy chọn. Chưa bắt buộc cứng ở v0.1.

**Kết luận sau khi đọc kỹ #6 và #10 (đã chốt hướng để báo team):**

Phát hiện chính:

- Cả #6 và #10 **đều không nhắc tới thông tin người liên hệ** (tên/SĐT/Zalo) — chỉ tập trung *chỉ số doanh nghiệp*.
- #10 (Smart Analyzer) bóc tách số liệu từ tài liệu với mục tiêu chính xác ≥85% → **không đáng tin để lấy số liên hệ cá nhân** (sai 1 chữ số là gọi nhầm/vô dụng). Vậy nếu cần người liên hệ thì phải **user tự nhập ở #6**, không phải #10.
- #6 đã mở sẵn cửa: *"nếu vẫn thiếu dữ liệu quan trọng sau khi phân tích, buộc phải bàn bạc với Backend"* → đây đúng là điểm phối hợp #6↔#7.

**Khuyến nghị (3 việc):**

1. **#7 (v0.1): `PERSON_REQUIRED = False`**, nhưng contract vẫn nhận `persons[]` từ đầu; nếu có person thì `full_name` bắt buộc.
2. **Đề nghị #6 thêm 1 ô nhập nhẹ "Khi có kết nối, liên hệ ai?"** — tên + 1 kênh (SĐT/Zalo/email), mặc định bật nhưng không chặn.
3. **Chốt #10 KHÔNG bóc tách thông tin liên hệ cá nhân** (vừa không đáng tin, vừa là chuyện riêng tư).

**Thời điểm bắt buộc:** nhận *optional* ở M1, **bắt buộc đúng lúc bấm "kết nối" ở M2** — theo nguyên tắc *progressive profiling* (thu thập tối thiểu lúc đầu, làm giàu hồ sơ khi user đã có động lực). Đòi số điện thoại quá sớm ở form lạnh có thể làm rớt ~48% chuyển đổi, nhưng lúc "sẵn sàng kết nối" thì user không ngại cho.

Nguồn: Auth0 — Progressive Profiling · Ping Identity · Vital Design — phone field case study · Issue #6 · Issue #10

---

### Q4 — Chống trùng

**Hai lớp:**

1. **Idempotency-Key (lớp chính):** client tự sinh ID duy nhất, gửi kèm POST; nếu lỗi lúc trả kết quả thì server trả lại bản cache; nhờ ACID rollback nên retry an toàn. Mô hình đã được Stripe dùng cho thanh toán.
2. **`UNIQUE(tax_id)` → 409 (lưới đỡ):** chỉ cho DN có MST thật.

**Vì sao Idempotency là chính chứ không phải tax_id?** Xem Mục 2 (VN-2): tax_id giờ thường là định danh cá nhân, có thể trống hoặc trùng → không đáng tin làm khoá chống trùng chính.

Nguồn: Stripe — Designing robust and predictable APIs with idempotency

**Mã trạng thái cho Idempotency-Key (chuẩn hoá sau vòng research sâu):**

| Tình huống | Mã | Hành vi |
| --- | --- | --- |
| Key + payload y hệt, request gốc đã xong | 2xx/4xx | Trả lại bản cache, kèm header `Idempotent-Replayed: true` |
| Key đang được xử lý (request gốc chưa xong) | 409 | Báo client chờ rồi retry (kèm `Retry-After`) |
| Reuse key với **payload khác** | 422 | Từ chối — client dùng sai key (so khớp bằng fingerprint/hash payload) |
| Endpoint yêu cầu key nhưng thiếu | 400 | Vi phạm contract cơ bản |
- **Hiện thực an toàn trong Postgres:** `INSERT ... ON CONFLICT DO NOTHING RETURNING` (insert-or-fail nguyên tử) để khử race; ghi key + fingerprint + response **trong cùng transaction** với việc tạo business. Tránh tách "check" khỏi "insert".
- **TTL khoá:** Stripe giữ ≈24h; nên đặt **≥ 2× cửa sổ retry tối đa** của client và ghi rõ trong tài liệu API.

Nguồn bổ sung: IETF draft-ietf-httpapi-idempotency-key-header-05 (422 khi reuse khác payload) · MDN — Idempotency-Key · brandur — Idempotency keys in Postgres

---

## 2. Hai yếu tố pháp lý Việt Nam (ảnh hưởng trực tiếp thiết kế)

<aside>
🇻🇳

**VN-1 — Việt Nam còn 34 tỉnh/thành (từ 12/6/2025).** Trước đây 63, nay 28 tỉnh + 6 thành phố = 34. **Hệ quả:** dropdown tỉnh ở #6 và validate ở #7 phải dùng bộ 34 mới; #10 trích từ giấy tờ cũ sẽ ra tên cũ → cần bảng ánh xạ cũ (63) → mới (34) để chuẩn hoá, nếu không sẽ hỏng số hạng Compatibility(geo) ở M2.

</aside>

Nguồn: Báo Chính phủ — chi tiết 34 đơn vị hành chính cấp tỉnh · Nghị quyết 202/2025/QH15 · Wikipedia — Sáp nhập tỉnh thành 2025

<aside>
🆔

**VN-2 — Từ 1/7/2025, hộ kinh doanh dùng số định danh cá nhân (CCCD 12 số) thay cho Mã số thuế.** **Hệ quả:** nhiều hộ nhỏ không có "MST" kiểu công ty → `tax_id` phải **nullable, không bắt buộc**. Ngoài ra 1 người có nhiều địa điểm kinh doanh dùng **chung 1 số định danh** → `UNIQUE(tax_id)` có thể chặn nhầm → củng cố việc dùng Idempotency-Key làm lớp chống trùng chính.

</aside>

Nguồn: Báo Chính phủ — Số định danh cá nhân thay Mã số thuế từ 1/7/2025 · Bkav — hộ/cá nhân kinh doanh không còn lo có 2 mã số thuế · Luật QLT 38/2019/QH14, TT 86/2024/TT-BTC, NĐ 168/2025

---

## 3. Các trụ kỹ thuật (đã verify)

| Trụ | Kết luận | Nguồn |
| --- | --- | --- |
| Mã 422 vs 400 | 422 cho "thiếu/không xử lý được", 400 cho cú pháp hỏng | MDN 422 |
| Idempotency | Client-generated key + cache kết quả; retry an toàn nhờ ACID | Stripe |
| Atomicity / ACID | Ghi nhiều bảng kiểu "được ăn cả ngã về không"; lỗi → rollback toàn bộ | MotherDuck — ACID |
| Embedding latency | Sinh embedding ngoài: tốt ~0,4s nhưng có khi 11–12s → KHÔNG gọi đồng bộ trong endpoint; để NULL, sinh ở M2 | Google Dev Forum · Google Dev Blog (median 420ms) |
| Tránh gọi dịch vụ ngoài đồng bộ | Blocking call làm chậm + tight coupling (hệ thống sống chết theo dịch vụ ngoài) | Nordic APIs · Tyk |
| Defense in depth (validate) | Validate ở cả lớp ứng dụng và ràng buộc DB; OpenAPI/JSON Schema làm "single source of truth" | StackOverflow · Azion |
| Sàn matching B2B | Dựa vào ngành, quy mô, sản phẩm/nhu cầu, địa điểm; trường bắt buộc để matching mạnh hơn | b2match · Grip |
| Error envelope | Nên dùng RFC 9457 (`application/problem+json`); FastAPI mặc định `{"detail":[...]}` ≠ 9457 → chọn 1 format thống nhất | RFC 9457 |
| Mã Idempotency-Key | 409 (đang xử lý) · 422 (reuse khác payload) · 400 (thiếu key); insert-or-fail bằng `ON CONFLICT DO NOTHING` | IETF draft-05 · MDN |
| Embedding 768 chiều | `gemini-embedding-001` mặc định 3072; truncate xuống 768 được nhưng **phải tự chuẩn hoá L2** (chỉ `gemini-embedding-2` tự normalize) → lưu ý khi sinh embedding M2 | Google AI — Embeddings |

---

## 4. Tổng hợp quyết định (1 dòng/câu)

| # | Quyết định | Trụ lý lẽ chính |
| --- | --- | --- |
| Q1 | Bắt buộc: name + ≥1 offer/need(+intent) + industry_l1 + province | Schema mapping (số hạng lõi Score) |
| Q2 | Sentinel thay null; thiếu → 422 | Chất lượng dữ liệu + chuẩn MDN/FastAPI |
| Q3 | Nhận persons từ v0.1, chưa bắt buộc cứng | north-star = hội thoại |
| Q4 | Idempotency-Key (chính) + UNIQUE(tax_id)→409 | Stripe + luật MST mới |
| VN-1 | Chuẩn hoá province 63→34 | NQ 202/2025/QH15 |
| VN-2 | tax_id nullable | TT 86/2024/TT-BTC |
| Perf | Embedding để NULL ở v0.1 | Latency embedding không ổn + tránh blocking |
| Seed | Reference data thành data migration idempotent + tách demo (Phương án B) | Tránh DB rỗng làm #7 reject sạch (Mục 9) |
| Province | Bắt buộc luôn (Phương án A) | Geo quan trọng + chi phí ≈0 nhờ #10 pre-fill (Mục 10) |
| Err-format | problem+json (RFC 9457); 400 cho JSON hỏng cần handler riêng | Chuẩn hoá lỗi máy-đọc-được (Q2) |

---

## 5. Tự audit — những điều đã thay đổi sau khi soi kỹ

<aside>
🧠

**Lỗi 1 — Dùng số liệu form sai ngữ cảnh.** Ban đầu trích "mỗi field +1 = -4.1% chuyển đổi" làm lý do chính cho "ít trường bắt buộc". Soi lại: số liệu từ form marketing/checkout, quan hệ phi tuyến, và bối cảnh Linko (động lực cao + auto-extract) khác hẳn. → Đã chuyển chỗ dựa chính sang **logic matching-necessity từ schema**.

</aside>

<aside>
🧠

**Lỗi 2 — Nói "industry + province bắt buộc vì không có thì không match được" là QUÁ MẠNH.** Theo công thức Score: chỉ offer/need+intent (và industry thuộc nhóm lõi) mới là matching-blocking. `province` chỉ phục vụ w₄ Compatibility(geo) → về lý thuyết matching vẫn chạy được nếu thiếu tỉnh. → Đã hạ `province` xuống mức "nên bắt buộc" (lựa chọn sản phẩm, không phải ép buộc kỹ thuật).

</aside>

<aside>
🧠

**Tinh chỉnh 3 (vòng research sâu) — Mã lỗi chi tiết hơn.** (a) Trước đây ghi "400 cho JSON hỏng" như thể tự động; thực tế **FastAPI mặc định trả 422 cả khi JSON sai cú pháp** → muốn 400 phải tự viết handler. (b) Idempotency không chỉ 1 mã: **409** (key đang xử lý) vs **422** (reuse khác payload) vs **400** (thiếu key) — đã bổ sung bảng ở Q4. (c) Dùng `gemini-embedding-001` ở **768 chiều** thì phải **tự chuẩn hoá L2** (model này không tự normalize cho chiều ≠ 3072) → ghi vào nợ kỹ thuật M2.

</aside>

---

## 6. Danh sách nguồn & mức độ tin cậy

| Chủ đề | Nguồn | Loại | Confidence |
| --- | --- | --- | --- |
| HTTP 422 | MDN | Primary | Cao |
| Idempotency | Stripe | Primary (industry) | Cao |
| ACID | MotherDuck | Secondary | Cao |
| Embedding latency | Google Dev Forum · Dev Blog | Primary + community | Trung bình–cao |
| Blocking calls | Nordic APIs | Secondary | Cao |
| Defense in depth | StackOverflow · Azion | Community + vendor | Cao |
| Form/onboarding | Baymard · HubSpot/Mailmunch · CXL | Secondary | Trung bình (bối cảnh khác) |
| Sàn matching B2B | b2match · Grip | Vendor | Trung bình |
| 34 tỉnh | Báo Chính phủ | Primary (luật) | Cao |
| Định danh thay MST | Báo Chính phủ · Bkav | Primary (luật) + thứ cấp | Cao |
| Schema/Score Linko | `temp/schema.md` (nội bộ dự án) | Primary nội bộ | Cao |
| Mã Idempotency-Key | IETF draft-05 · MDN · brandur | Primary (IETF) + community | Cao |
| Error envelope | RFC 9457 | Primary (IETF) | Cao |
| FastAPI error handling | FastAPI docs · issue #3993 | Primary (vendor) | Cao |
| Embedding chiều/normalize | Google AI — Embeddings | Primary (vendor) | Cao |
| Geo/proximity B2B | ScienceDirect · ScienceDirect · IDC | Academic + vendor | Trung bình–cao |
| UX trường bắt buộc | UX Tigers/Nielsen · NN/g · Baymard | Secondary | Cao |

---

## 7. Câu hỏi mở để team verify

- [x]  #6/#10 có thu thập thông tin người liên hệ không? → **Đã chốt hướng:** #10 không bóc tách liên hệ cá nhân; #7 để `persons` optional ở v0.1; đề nghị #6 thêm ô nhập nhẹ; bắt buộc ở bước kết nối M2. (Chi tiết ở Q3)
- [x]  Bảng ánh xạ 63→34 đầy đủ → **Đã hoàn tất** (xem Mục 8 — Phụ lục). Nguồn: NQ 202/2025/QH15.
- [x]  `industries` / `intent_types` đã seed trên DB `develop` chưa? → **Đã chốt Phương án B**: nâng dữ liệu danh mục thành *data migration* tự chạy cùng `alembic upgrade head` (chi tiết Mục 9). Vẫn cần team xác nhận trạng thái DB `develop` hiện tại.
- [x]  province chọn phương án A (bắt buộc) hay B (có điều kiện)? → **Đã chốt Phương án A** (bắt buộc luôn), chi tiết Mục 10.

<aside>
📝

**Nợ kỹ thuật ghi nhận cho M2:** (a) nới `UNIQUE(tax_id)` cho 1 người nhiều hộ KD; (b) job sinh embedding nền; (c) province bắt buộc-có-điều-kiện theo intent.

</aside>

---

## 8. Phụ lục — Bảng ánh xạ địa giới 63 → 34 (đầy đủ)

<aside>
🗺️

**Cách dùng:** #10 trích từ giấy tờ cũ thường ra tên tỉnh **cũ (63)**. #7 phải quy đổi về 1 trong **34 tên mới** trước khi lưu, nếu không sẽ hỏng số hạng Compatibility(geo) ở M2. Bảng này là nguồn cho `core/province_mapping.py`. Chuẩn theo **NQ 202/2025/QH15** (hiệu lực 12/6/2025): **11 đơn vị giữ nguyên + 23 đơn vị mới** (hợp nhất từ 52 tỉnh) = **34** (6 thành phố + 28 tỉnh).

</aside>

### A. 11 đơn vị giữ nguyên (tên cũ = tên mới)

Hà Nội (TP) · Huế (TP) · Lai Châu · Điện Biên · Sơn La · Lạng Sơn · Quảng Ninh · Thanh Hóa · Nghệ An · Hà Tĩnh · Cao Bằng.

### B. 23 đơn vị mới sau hợp nhất

| STT | Đơn vị mới | Loại | Hợp nhất từ các tỉnh cũ |
| --- | --- | --- | --- |
| 1 | Tuyên Quang | Tỉnh | Hà Giang + Tuyên Quang |
| 2 | Lào Cai | Tỉnh | Yên Bái + Lào Cai |
| 3 | Thái Nguyên | Tỉnh | Bắc Kạn + Thái Nguyên |
| 4 | Phú Thọ | Tỉnh | Vĩnh Phúc + Hòa Bình + Phú Thọ |
| 5 | Bắc Ninh | Tỉnh | Bắc Giang + Bắc Ninh |
| 6 | Hưng Yên | Tỉnh | Thái Bình + Hưng Yên |
| 7 | Hải Phòng | TP | Hải Dương + Hải Phòng |
| 8 | Ninh Bình | Tỉnh | Hà Nam + Nam Định + Ninh Bình |
| 9 | Quảng Trị | Tỉnh | Quảng Bình + Quảng Trị |
| 10 | Đà Nẵng | TP | Quảng Nam + Đà Nẵng |
| 11 | Quảng Ngãi | Tỉnh | Kon Tum + Quảng Ngãi |
| 12 | Gia Lai | Tỉnh | Bình Định + Gia Lai |
| 13 | Khánh Hòa | Tỉnh | Ninh Thuận + Khánh Hòa |
| 14 | Lâm Đồng | Tỉnh | Đắk Nông + Bình Thuận + Lâm Đồng |
| 15 | Đắk Lắk | Tỉnh | Phú Yên + Đắk Lắk |
| 16 | TP. Hồ Chí Minh | TP | Bà Rịa - Vũng Tàu + Bình Dương + TP.HCM |
| 17 | Đồng Nai | Tỉnh | Bình Phước + Đồng Nai |
| 18 | Tây Ninh | Tỉnh | Long An + Tây Ninh |
| 19 | Cần Thơ | TP | Sóc Trăng + Hậu Giang + Cần Thơ |
| 20 | Vĩnh Long | Tỉnh | Bến Tre + Trà Vinh + Vĩnh Long |
| 21 | Đồng Tháp | Tỉnh | Tiền Giang + Đồng Tháp |
| 22 | Cà Mau | Tỉnh | Bạc Liêu + Cà Mau |
| 23 | An Giang | Tỉnh | Kiên Giang + An Giang |

### C. Bảng tra cứu code-ready (tên cũ → tên mới)

```python
# core/province_mapping.py — chuẩn NQ 202/2025/QH15 (12/6/2025)

# 34 đơn vị hợp lệ (6 thành phố + 28 tỉnh)
VALID_PROVINCES_34 = {
    "Hà Nội", "Huế", "Hải Phòng", "Đà Nẵng", "Cần Thơ", "TP. Hồ Chí Minh",
    "Lai Châu", "Điện Biên", "Sơn La", "Lạng Sơn", "Quảng Ninh", "Thanh Hóa",
    "Nghệ An", "Hà Tĩnh", "Cao Bằng", "Tuyên Quang", "Lào Cai", "Thái Nguyên",
    "Phú Thọ", "Bắc Ninh", "Hưng Yên", "Ninh Bình", "Quảng Trị", "Quảng Ngãi",
    "Gia Lai", "Khánh Hòa", "Lâm Đồng", "Đắk Lắk", "Đồng Nai", "Tây Ninh",
    "Vĩnh Long", "Đồng Tháp", "Cà Mau", "An Giang",
}

# Tên cũ (63) -> tên mới (34). Tên giữ nguyên ánh xạ về chính nó.
LEGACY_TO_NEW = {
    # --- 11 đơn vị giữ nguyên ---
    "Hà Nội": "Hà Nội",
    "Huế": "Huế", "Thừa Thiên Huế": "Huế",
    "Lai Châu": "Lai Châu", "Điện Biên": "Điện Biên", "Sơn La": "Sơn La",
    "Lạng Sơn": "Lạng Sơn", "Quảng Ninh": "Quảng Ninh", "Thanh Hóa": "Thanh Hóa",
    "Nghệ An": "Nghệ An", "Hà Tĩnh": "Hà Tĩnh", "Cao Bằng": "Cao Bằng",
    # --- Miền Bắc hợp nhất ---
    "Hà Giang": "Tuyên Quang", "Tuyên Quang": "Tuyên Quang",
    "Yên Bái": "Lào Cai", "Lào Cai": "Lào Cai",
    "Bắc Kạn": "Thái Nguyên", "Thái Nguyên": "Thái Nguyên",
    "Vĩnh Phúc": "Phú Thọ", "Hòa Bình": "Phú Thọ", "Phú Thọ": "Phú Thọ",
    "Bắc Giang": "Bắc Ninh", "Bắc Ninh": "Bắc Ninh",
    "Thái Bình": "Hưng Yên", "Hưng Yên": "Hưng Yên",
    "Hải Dương": "Hải Phòng", "Hải Phòng": "Hải Phòng",
    "Hà Nam": "Ninh Bình", "Nam Định": "Ninh Bình", "Ninh Bình": "Ninh Bình",
    # --- Miền Trung & Tây Nguyên hợp nhất ---
    "Quảng Bình": "Quảng Trị", "Quảng Trị": "Quảng Trị",
    "Quảng Nam": "Đà Nẵng", "Đà Nẵng": "Đà Nẵng",
    "Kon Tum": "Quảng Ngãi", "Quảng Ngãi": "Quảng Ngãi",
    "Bình Định": "Gia Lai", "Gia Lai": "Gia Lai",
    "Ninh Thuận": "Khánh Hòa", "Khánh Hòa": "Khánh Hòa",
    "Đắk Nông": "Lâm Đồng", "Bình Thuận": "Lâm Đồng", "Lâm Đồng": "Lâm Đồng",
    "Phú Yên": "Đắk Lắk", "Đắk Lắk": "Đắk Lắk",
    # --- Miền Nam hợp nhất ---
    "Bà Rịa - Vũng Tàu": "TP. Hồ Chí Minh", "Bình Dương": "TP. Hồ Chí Minh",
    "TP. Hồ Chí Minh": "TP. Hồ Chí Minh",
    "Bình Phước": "Đồng Nai", "Đồng Nai": "Đồng Nai",
    "Long An": "Tây Ninh", "Tây Ninh": "Tây Ninh",
    "Sóc Trăng": "Cần Thơ", "Hậu Giang": "Cần Thơ", "Cần Thơ": "Cần Thơ",
    "Bến Tre": "Vĩnh Long", "Trà Vinh": "Vĩnh Long", "Vĩnh Long": "Vĩnh Long",
    "Tiền Giang": "Đồng Tháp", "Đồng Tháp": "Đồng Tháp",
    "Bạc Liêu": "Cà Mau", "Cà Mau": "Cà Mau",
    "Kiên Giang": "An Giang", "An Giang": "An Giang",
}
```

### D. Lưu ý khi chuẩn hoá (cho người code)

- **Khử dấu + chuẩn hoá trước khi tra:** lower-case, bỏ tiền tố "Tỉnh "/"Thành phố "/"TP ", trim khoảng trắng, dùng `unaccent` (extension đã có ở `0001_init.py`) để khớp cả khi nhập không dấu.
- **Alias cần xử lý thêm:** `Thừa Thiên Huế → Huế`; `TP HCM / TPHCM / Sài Gòn / Hồ Chí Minh → TP. Hồ Chí Minh`; `BR-VT / Vũng Tàu → (qua Bà Rịa - Vũng Tàu) → TP. Hồ Chí Minh`; lỗi chính tả phổ biến `Đắc Lắc → Đắk Lắk`.
- **Có quy đổi (tên cũ ≠ tên mới):** thêm vào `warnings[]` của response để FE hiển thị cho user xác nhận.
- **Không khớp cả tên cũ lẫn mới:** trả **422 `INVALID_PROVINCE`** (không tự đoán bừa).
- **Đối chiếu số lượng:** 52 tỉnh cũ được hợp nhất + 11 giữ nguyên = 63 ✓ → 23 mới + 11 = 34 ✓.

Nguồn: Toàn văn NQ 202/2025/QH15 (Chinhphu.vn) · Chi tiết 34 ĐVHC · 11 tỉnh giữ nguyên (Thành ủy TP.HCM) · Wikipedia — Sáp nhập tỉnh thành 2025

---

## 9. Seed / reference data — `industries` · `intent_types` · `certifications` (CHỐT: Phương án B)

<aside>
🗂️

**Quyết định:** nâng **dữ liệu danh mục** (ngành, intent, chứng nhận) thành **data migration tự chạy** (`0002_seed_reference_data.py`, idempotent) đi cùng `alembic upgrade head`; **tách riêng** dữ liệu demo (doanh nghiệp/offer/need mẫu) để chỉ dùng ở local. → #7 luôn có sẵn "từ điển chuẩn" để validate FK ở **mọi** môi trường (dev · CI · staging · prod).

</aside>

### 9.1 Trạng thái hiện tại (bằng chứng từ nhánh `develop`)

- `alembic/versions/0001_init.py`: chỉ `CREATE TABLE` + index + trigger — **không có một câu `INSERT` nào** → migrate xong là bảng danh mục **rỗng**.
- `scripts/seed.py` (đã có sẵn): **30 ngành** (12 cấp 1 + 18 cấp 2) · **8 intent_types** · **12 certifications** · 2 DN demo. Nhưng chạy qua `if __name__ == "__main__"` → **chỉ chạy khi gõ tay** `python scripts/seed.py`.
- `Dockerfile`: chỉ `alembic upgrade head` + `uvicorn` — **không gọi seed**.
- `ci-backend.yml`: chỉ `ruff` + `pytest -q`, **không có Postgres** → test không đụng DB, không seed.
- 2 điểm yếu của `seed.py`: **không idempotent** (chạy lại sẽ lỗi trùng khóa chính) và **danh mục cấp 2 mới chỉ phủ 2/12 ngành** (`ban_buon_ban_le`, `san_xuat_che_bien`).

<aside>
🔎

Chỉ đọc được **repo**, không thấy **DB đang chạy thực tế**. Kết luận chính xác: *cơ chế hiện tại không đảm bảo dữ liệu được nạp*. DB cụ thể của team có rồi hay chưa cần hỏi người đã dựng (xem Mục 9.6).

</aside>

### 9.2 Vì sao đây là rủi ro sống còn cho #7

3 bảng danh mục là "từ điển chuẩn" để #7 đối chiếu FK. Nếu rỗng → **mọi** hồ sơ hợp lệ đều bị reject `UNKNOWN_REFERENCE` (422). Việc nạp danh mục hiện đang là một thao tác tay tách rời quy trình dựng hệ thống → ai quên chạy là DB không có từ điển.

### 9.3 Cost-benefit 3 phương án

| Phương án | Lợi | Hại |
| --- | --- | --- |
| A — Giữ script thủ công (status quo) | Không tốn công thêm | Rủi ro cao: quên chạy là DB rỗng → #7 reject sạch; CI không test được FK; không idempotent |
| **B — Danh mục thành data migration, tách demo riêng** ⭐ | Mọi môi trường luôn có từ điển; #7 yên tâm dựa vào FK; CI test được FK thật; prod sạch (không lẫn DN giả); danh mục có version/audit | Tốn ~1 buổi viết migration idempotent; đổi danh mục sau này phải qua migration (thực ra là ưu điểm) |
| C — Bỏ FK theo DB, validate bằng hằng số trong code | #7 không phụ thuộc DB; validate nhanh | Phá thiết kế FK hiện có; sinh 2 nguồn sự thật (code vs DB) dễ lệch; trái schema.md |

### 9.4 Lý do chốt Phương án B

1. **Đúng bản chất:** danh mục là *cấu hình hệ thống* → phải đi cùng schema, không phải thao tác tay tách rời.
2. **Khử rủi ro tận gốc cho #7:** không còn cảnh "DB rỗng làm #7 trượt hết"; #7 chỉ việc tin vào FK.
3. **Mở khóa test thật cho CI:** kết hợp việc thêm Postgres service vào `ci-backend.yml` → test đúng 2 nhánh quan trọng nhất của #7: tham chiếu hợp lệ → 201, tham chiếu sai → 422.
4. **Giữ prod sạch:** dữ liệu demo không bao giờ lẫn vào môi trường thật.

### 9.5 Việc cần làm khi triển khai

- Tạo `0002_seed_reference_data.py` **idempotent** (dùng `ON CONFLICT DO NOTHING` hoặc kiểm tra tồn tại) nạp 30 ngành + 8 intent_types + 12 certifications.
- Giữ 2 DN demo (+ offer/need) trong `scripts/seed.py` làm fixture **chỉ cho local/dev**.
- Thêm **Postgres service** vào `ci-backend.yml` để integration test chạy migrate (tự có danh mục) rồi kiểm tra FK.
- ⚠️ Việc này **vượt phạm vi #7 thuần** (đụng migration chung) → cần báo & thống nhất với team, vì có thể chạm phần việc người đã dựng schema.

### 9.6 Còn cần team xác nhận

- **DB `develop` thực tế đã có ai chạy `seed.py` chưa?** (chỉ thấy được repo, không thấy DB chạy).
- **10 ngành chưa có danh mục cấp 2:** #7 validate chặt theo dữ liệu hiện có, hay cần bổ sung danh mục cấp 2 trước? (ảnh hưởng trực tiếp tỉ lệ hồ sơ bị 422).

Nguồn (nội bộ repo, nhánh `develop`): `apps/api/alembic/versions/0001_init.py` · `apps/api/scripts/seed.py` · `apps/api/Dockerfile` · `.github/workflows/ci-backend.yml`

---

## 10. Trường `province` bắt buộc hay không (CHỐT: Phương án A)

<aside>
📍

**Quyết định:** `province` **bắt buộc luôn** ở tầng validate của #7 (thiếu → 422). Kèm 2 điều kiện đi cùng để không thành gánh nặng (xem 10.4).

</aside>

### 10.1 Bản chất vấn đề

`province` **không phải** trường chặn-matching: theo công thức Score nó chỉ nuôi **một** số hạng `w₄ Compatibility(geo)` — thiếu thì match vẫn chạy, chỉ kém chính xác về địa lý. Đây là **quyết định sản phẩm** (đánh đổi chất lượng dữ liệu ↔ friction), không phải ràng buộc kỹ thuật.

### 10.2 Năm phát hiện từ research (grounding)

1. **Địa lý thực sự quan trọng với SME, đặc biệt B2B nội địa** (giao tiếp dễ, chi phí thấp, giao hàng nhanh; mạnh trong "cụm ngành" địa phương) — đúng tệp Linko. (ScienceDirect — local SME suppliers) · (IDC — Proximity Sourcing)
2. **Nhưng không tuyệt đối** — quan hệ chữ U ngược (quá gần sinh lock-in; nhiều giao dịch vẫn vượt khoảng cách) → không ép cứng tuyệt đối ở mọi trường hợp. (ScienceDirect — proximity & resilience)
3. **Nguyên tắc "ít trường bắt buộc" nhắm vào trường high-friction (SĐT, ngày sinh) vì riêng tư** — `province` **friction thấp, không nhạy cảm** → chi phí bắt buộc thấp hơn nhiều so với SĐT. (UX Tigers / Nielsen) · (NN/g — Required Fields)
4. **Lưu ý UX cho FE:** 34 lựa chọn là quá nhiều cho dropdown thường (nên dùng ô tìm-gõ); và trường *bắt buộc-có-điều-kiện* gây rối hiển thị → điểm trừ cho phương án B. (Baymard — Drop-Down) · (UX SE — conditionally required)
5. **Yếu tố Linko đặc thù:** #10 thường trích được tỉnh từ giấy tờ → FE pre-fill → user chỉ *xác nhận* → chi phí nhập province **gần 0**.

### 10.3 Cost-benefit 3 phương án

| Phương án | Lợi | Hại |
| --- | --- | --- |
| **A — Bắt buộc luôn** ⭐ | 100% hồ sơ có geo → `w₄ Compat(geo)` luôn tính được; validate đơn giản nhất (1 luật, dễ test); khớp DoD "đủ 100% mới lưu"; chi phí user gần 0 nhờ #10 pre-fill | Cứng với intent không cần geo (vd `find_investment`, `co_marketing` online); có thể đẩy 422 nếu #10 không trích được và user bỏ trống |
| B — Bắt buộc có điều kiện (theo intent) | "Tinh" về lý thuyết: bắt đúng lúc cần; giảm friction cho intent online-only | Phức tạp hoá lu-ật validate v0.1 (map intent→geo, nhiều nhánh, nhiều test, dễ bug); UX rối; ranh giới chủ quan dễ sửa tới lui; lợi ích biên thấp vì chi phí nhập vốn đã nhỏ |
| C — Optional | Friction thấp nhất; validate đơn giản | Hổng dữ liệu geo → `w₄ Compat(geo)` thường thiếu → match địa lý kém (đúng thứ SME VN cần nhất); trái DoD "đủ 100%"; phí lợi thế #10 đã trích sẵn |

### 10.4 Lý do chốt A + 2 điều kiện đi kèm

**Lý do:**

1. **Chi phí thấp bất thường:** province không nhạy cảm + #10 pre-fill → bắt buộc gần như miễn phí (khác hẳn SĐT).
2. **Lợi ích thật:** geo quan trọng đúng tệp SME nội địa của Linko.
3. **Đơn giản & robust:** 1 luật validate, dễ test 201/422 — hợp phạm vi v0.1; tránh sự phức tạp của B trong khi lợi ích biên của B nhỏ.
4. **B để dành cho M2:** đã ghi trong "Nợ kỹ thuật"; khi có dữ liệu thực tế chứng minh một số intent không cần geo thì nâng lên B sau, có cơ sở hơn.

**2 điều kiện đi kèm (cần phối hợp #6):**

- FE dùng ô tỉnh kiểu **tìm-gõ (searchable)**, không dropdown 34 dòng; pre-fill từ #10.
- Cân nhắc **sentinel `khong_xac_dinh`** cho trường hợp thật sự không xác định được (để user không bịa bừa mà vẫn "đủ 100%" về schema) — cần bàn với #6 vì ảnh hưởng FE.

Nguồn: ScienceDirect — local SME suppliers · IDC — Proximity Sourcing · ScienceDirect — proximity & resilience · UX Tigers / Nielsen — Required Fields · NN/g — Required Fields · Baymard — Drop-Down Usability · UX SE — conditionally required

---

## 11. Trạng thái tài liệu & changelog

<aside>
✅

**Tất cả câu hỏi quyết định & câu hỏi mở trong tài liệu đã đóng.** Còn lại chỉ là các điểm cần *team xác nhận từ bên ngoài* (không phải để tài liệu này quyết) — gom ở 11.2.

</aside>

### 11.1 Changelog

- **v1.0** — Bản nghiên cứu gốc: Q1–Q4, pháp lý VN (VN-1/VN-2), trụ kỹ thuật, tự audit, nguồn & confidence.
- **v1.1** — Thêm Mục 8 (ánh xạ tỉnh 63→34 đầy đủ + code-ready), Mục 9 (CHỐT seed = Phương án B), Mục 10 (CHỐT province = Phương án A).
- **v1.2** — Vòng research chuyên sâu bổ sung: chuẩn hoá mã trạng thái Idempotency-Key (409/422/400 theo IETF draft-05), khuyến nghị error envelope RFC 9457, lưu ý FastAPI mặc định 422 cho JSON hỏng, cảnh báo chuẩn hoá L2 cho embedding 768 chiều; đồng bộ bảng quyết định (Mục 4) & nguồn (Mục 6).
- **v1.3 (bản này)** — Thêm Mục 11.3: danh sách giả định để *tiến hành trước, team review sau* (assumption-driven), kèm mức rủi ro và ảnh hưởng nếu phải lật giả định.

### 11.2 Việc cần team xác nhận từ bên ngoài (ngoài phạm vi quyết của tài liệu)

- DB `develop` thực tế đã chạy `seed.py` chưa (để #7 tin được FK)? (Mục 9.6)
- 10 ngành chưa có danh mục cấp 2: validate chặt theo dữ liệu hiện có hay bổ sung cấp 2 trước? (Mục 9.6)
- FE có luôn gửi `Idempotency-Key` không, và chọn error envelope nào (FastAPI mặc định vs RFC 9457)? (Q2, Q4)
- Đề nghị #6 thêm ô "liên hệ ai khi kết nối" + dùng ô tỉnh searchable + sentinel `khong_xac_dinh`. (Q3, Mục 10.4)

### 11.3 Giả định tiến hành trước — chờ team review

<aside>
🚀

**Cách làm (assumption-driven):** không chờ đủ 4 câu trả lời ở 11.2 mới code. Mỗi giả định dưới đây được **ghi rõ trong mô tả Draft PR** + 1 dòng test/comment trong code, để review diễn ra ngay trên PR (`Closes #7`). Chỉ giả định những thứ **dễ đảo ngược**; riêng cái có *hợp đồng 2 chiều* với FE thì báo sớm.

</aside>

| # | Giả định đang dùng | Rủi ro | Ảnh hưởng nếu phải lật |
| --- | --- | --- | --- |
| 1 | Reference data (industries/intent_types/certifications) sẽ luôn có sẵn vì #7 **tự tạo** migration `0002_seed_reference_data.py` (Phương án B). Không phụ thuộc ai seed tay. | Thấp | ≈0 — nằm trong tầm kiểm soát của #7; chỉ cần kiểm tra DB `develop` (chạy SQL `count`) để xác nhận trạng thái hiện tại. |
| 2 | 10 ngành chưa có danh mục cấp 2 → validate **theo FK hiện có**, `category_l2` cho phép null ở các ngành đó. | Thấp–TB | Bổ sung cấp 2 sau là *thêm dữ liệu seed*, **không đụng code API** → đảo ngược rẻ. |
| 3a | `Idempotency-Key`: **có thì dùng, không có thì fallback** chống trùng theo `tax_id`. API không block nếu FE chưa gửi. | Thấp | Ít — đã hỗ trợ sẵn cả 2 đường; FE bật/tắt gửi key đều chạy đúng. |
| 3b | Error envelope dùng **RFC 9457 (`application/problem+json`)**, gom toàn bộ format lỗi vào 1 module (`core/exceptions.py`). | **TB — cần báo FE sớm** | Hợp đồng 2 chiều: nếu FE muốn format khác → sửa 1 module ở BE + parser ở FE. Gom 1 chỗ nên lật rẻ, nhưng phải thống nhất *trước khi* FE viết parser. |
| 4 | `persons[]` **optional** ở v0.1 (`PERSON_REQUIRED=False`); sentinel `khong_xac_dinh` (province) & `khong_tiet_lo` (revenue) cho "đủ 100%". | Thấp | Chỉ là đổi cờ cấu hình / luật validate → đảo ngược trong vài dòng. |

<aside>
📌

**Điểm duy nhất nên hỏi FE trước khi code sâu:** giả định **3b (error envelope)** — vì nó ràng buộc cách FE parse lỗi. Ba giả định còn lại cứ tiến hành, review sau trên PR.

</aside>