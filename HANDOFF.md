# HANDOFF: AcneScope (acne-clinic)

Ghi chú bàn giao cho người hoặc AI làm tiếp. Đọc hết file này là làm tiếp được, không phải đọc lại toàn bộ mã.
Cập nhật lần cuối: 2026-10-30, sau khi bật lọc khung trùng và chọn CONF_DEFAULT=0.175 từ quét 121 ảnh test.

> Lưu ý: dự án chưa phải git repo (chưa `git init`) nên không có lịch sử để khôi phục. Trước khi sửa lớn thì `git init` rồi commit, hoặc sao lưu thư mục. File `.gitignore` đã chặn `*.pt`, `.env`, `test_out`, `*.heic`.

---

## 1. Sản phẩm làm gì
Web app cho phòng khám da liễu. Người dùng tải lên hoặc chụp bằng camera tối đa 3 ảnh cận da mặt. Hệ thống đếm mụn từng ảnh bằng model YOLO26m, cộng tổng, xếp mức độ (thang Hayashi rút gọn, áp cho từng ảnh) và lấy lời khuyên chăm sóc từ LLM. Kết quả chỉ mang tính tham khảo.

## 2. Kiến trúc và cách chạy
Có hai cách chạy, cùng một code, chọn bằng biến `INFERENCE_URL`:
- Local (`INFERENCE_URL` rỗng): `backend/app/main.py` tự nạp và chạy model trên GPU của máy.
- Triển khai (2026-10-30, xem [DEPLOY.md](DEPLOY.md)): Frontend trên Vercel → Backend trên Render (khuyên dùng, không giới hạn 4,5 MB) hoặc Vercel (chỉ là cổng trung gian: `/api/config`, `/api/advice` gọi LLM, `/api/detect` chuyển ảnh sang) → ngrok → Colab GPU chạy `backend/infer_server.py` (`/health`, `/infer`, kiểm tra header `X-API-Key`). Code đưa lên Colab bằng `backend/pack_colab.py` (zip code `app/` + `best.pt`, tải lên Drive) và notebook `colab/AcneScope_Colab.ipynb`.

```
frontend (React 18 + Vite 5, HTTPS dev :5173)  --/api proxy-->  backend (FastAPI :8000)  --> YOLO26m (ultralytics) + LLM (httpx)
```
```bash
# Backend: chạy trong thư mục backend/ (đường dẫn tương đối tính từ đây) và BẰNG VENV backend/.venv
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
python test_model.py a.jpg b.heic c.jpg [--conf 0.25] [--out test_out] [--labels DIR] [--iou 0.5]   # test model độc lập

# Frontend
cd frontend && npm install && npm run dev      # build: npx vite build
```
Môi trường máy dev (Windows 11, RTX 3050 Laptop 4 GB):
- Venv riêng `backend/.venv` (tạo 2026-10-30, đã bị .gitignore). Gồm: `torch 2.14.1+cu132`, `torchvision 0.29.2+cu132` (CUDA OK, RTX 3050), `ultralytics 8.4.192`, `pillow-heif`, fastapi… Luôn chạy backend bằng venv này.
- Python toàn hệ thống (3.10.11) vẫn là `torch+cpu`. Chạy nhầm bằng `python` toàn cục thì model chạy CPU, chậm hơn khoảng 15 lần. Kiểm tra bằng `GET /api/health`: phải trả `cuda: true`.
- Cài lại venv: `pip install -r requirements-model.txt` rồi mới `pip install --force-reinstall --no-deps torch==2.14.1 torchvision==0.29.2 --index-url https://download.pytorch.org/whl/cu132`. Nếu làm ngược thứ tự, ultralytics sẽ kéo torch CPU từ PyPI đè lên. Chỉ index cu132 có torch 2.14.x cho Windows/cp310. Nếu pip báo WinError 32/1450 (antivirus khoá file, máy thiếu tài nguyên) thì cứ chạy lại.

## 3. Bản đồ file (chỉ những file quan trọng)
| File | Vai trò |
|---|---|
| `model/y26m_1280/weights/best.pt` | Model đang dùng (YOLO26m, 1 lớp `acne`, train imgsz 1280 trên ảnh nửa mặt ~3112×3456). Không dùng `last.pt`/`epochXX.pt`. |
| `backend/weights/best.pt` | Model cũ (YOLOv5, md5 khác). Không còn dùng, có thể xoá. |
| `backend/app/config.py` | Toàn bộ cấu hình (pydantic-settings, đọc `backend/.env`). |
| `backend/app/imaging.py` | Đọc ảnh bằng PIL (+HEIC), xoay theo EXIF, chuyển BGR, tạo ảnh xem trước base64. |
| `backend/app/detector.py` | Nạp YOLO một lần + warm-up; `predict(bgr) -> ndarray (N,5) [x1,y1,x2,y2,conf]` theo pixel ảnh vào, đã bỏ khung trùng (`dedup()`). |
| `backend/app/severity.py` | `levels()`, `grade(count)` (mỗi ảnh), `overall(counts)` (gộp: max/mean). |
| `backend/app/main.py` | FastAPI: `/api/health`, `/api/config`, `/api/detect`, `/api/advice`. `REMOTE = bool(INFERENCE_URL)`: local thì chạy `pipeline.process` trong executor 1 luồng; remote thì gọi `INFERENCE_URL/infer` qua httpx (lỗi hoặc offline trả 503). Không import torch/PIL/numpy ở cấp module (Vercel). |
| `backend/app/pipeline.py` | `process(detector, bytes, preview_max)`: đọc ảnh, xoay EXIF, model, khung chuẩn hoá, preview. Dùng chung cho local và Colab. |
| `backend/infer_server.py` | Máy chủ model chạy trên Colab: `GET /health`, `POST /infer` (trả `{w,h,boxes,ms,preview}`), bắt buộc header `X-API-Key` = env `INFER_API_KEY`. |
| `backend/render.yaml` | Cấu hình Render (khuyên dùng cho backend trung gian): `uvicorn app.main:app`, `MAX_UPLOAD_MB=30`, Singapore. |
| `backend/api/index.py`, `backend/vercel.json`, `backend/.vercelignore` | Điểm vào Vercel (rewrite mọi đường dẫn về `api/index`). `.vercelignore` loại `.venv`, model, script test. |
| `backend/requirements.txt` / `requirements-model.txt` | Bản nhẹ (Vercel tự cài: fastapi, httpx…) / bản đầy đủ cho máy chạy model (`-r requirements.txt` + ultralytics, pillow-heif…). |
| `backend/pack_colab.py`, `colab/AcneScope_Colab.ipynb` | Đóng gói lên Colab / notebook chạy server + ngrok (Secrets: `NGROK_AUTHTOKEN`, `INFER_API_KEY`, `NGROK_DOMAIN`). |
| `backend/app/advice.py` | Gọi LLM (OpenAI-compatible hoặc Anthropic) ra JSON lời khuyên; lỗi hoặc thiếu key thì dùng `fallback`. |
| `backend/eval_conf.py` | Quét ngưỡng conf trên thư mục ảnh có nhãn: tổng đếm (sau/trước lọc trùng), lệch, MAE, tỉ lệ khớp mức độ, P/R/F1, độ nhạy ±0,05. Dùng để chọn `CONF_DEFAULT`. |
| `backend/test_model.py` | Script test độc lập, dùng chung `imaging` + `Detector` với web. Có nhãn YOLO thì so khớp: đỏ = đúng, cam = báo nhầm, xanh lá = bỏ sót, xám = dưới ngưỡng. |
| `frontend/src/api.js` | `getConfig`, `detectPhoto(file)` (gửi ảnh gốc), `getAdvice(counts, note)`, `MAX_PHOTOS=3`. |
| `frontend/src/severity.js` | Bản sao JS của `severity.py` + `countAt(boxes, conf)` + `DEFAULT_CFG`. |
| `frontend/src/capture.js` | `captureStill(video, track)`: chụp ảnh tĩnh độ phân giải cao (ImageCapture, không có thì lấy khung nét nhất trong 6 khung). |
| `frontend/src/hooks/useCamera.js` | `getUserMedia` xin 4096×3072 (ideal); trả `{error, devices, dims, mirror, track}`. |
| `frontend/src/components/ScanPage.jsx` | Trang `#/kham`: state chính, luồng ảnh → đếm → mức độ → lời khuyên. |
| `frontend/src/components/PhotoScan.jsx` | Lưới 3 ô ảnh, vẽ khung lọc theo `conf`; `HINTS`, `ACCEPT`. |
| `frontend/src/components/Stage.jsx` | Màn camera (xem trước + nút chụp). Không vẽ khung realtime. |
| `frontend/src/components/Report.jsx` | `Ring`, `LevelTable`, `AiBlock`, `colorOf`. |
| `frontend/src/components/Home.jsx`, `Nav.jsx` | Trang chủ marketing (không liên quan model). Ảnh 5 thẻ dịch vụ ở `public/images/services/*.jpg` (thay 2026-10-30, trước đó cắt từ hero.jpg); `SERVICES = [tiêu đề, mô tả, tên file, điểm lấy nét]`. |

Đã xoá: `frontend/src/hooks/useDetector.js` và endpoint WebSocket `/ws/detect` (chế độ camera realtime 640 px cũ), `shrinkPhoto` (thu nhỏ ảnh về 1600 px ở FE), nhánh YOLOv5 `torch.hub` trong detector.

## 4. API
**`GET /api/health`** → `{mode: "local"|"remote", ok, device: "cpu"|"0", cuda: bool, heic: bool}` (remote: lấy từ Colab `/health`; Colab tắt thì `ok:false, error`)

**`GET /api/config`** → `{levels:[{key,label,max}], aggregate, conf_default, conf_floor, show_conf_slider, max_photos, max_upload_mb}`

**`POST /api/detect`** (multipart `file`, ảnh gốc JPG/PNG/HEIC, ≤ `MAX_UPLOAD_MB`)
```json
{ "w": 3024, "h": 4032,                 // kích thước ảnh SAU khi xoay EXIF (= ảnh đưa vào model)
  "boxes": [[x1,y1,x2,y2,conf], ...],    // toạ độ 0–1 theo ảnh đã xoay, conf >= CONF_FLOOR, sắp giảm dần theo conf
  "ms": 1014,                            // thời gian model (không gồm decode/preview)
  "preview": "data:image/jpeg;base64,...", // ảnh đã xoay, cạnh dài PREVIEW_MAX, FE dùng để hiển thị + vẽ khung
  "count": 7, "severity": {"key","label"} }  // tính ở CONF_DEFAULT
```
Lỗi: 400 (ảnh không đọc được), 413 (quá lớn).

**`POST /api/advice`** `{counts: [int 0..1000] (1..3 phần tử), note: str ≤500}` → `{counts, total, severity (overall), advice:{summary, routine[], avoid[], see_doctor}, source: "llm"|"fallback"}`

**`POST /api/chat`** `{counts, note, messages: [{role: "user"|"assistant", content ≤4000}] (1..20, tin cuối là user)}` → `{reply}`; LLM lỗi hoặc chưa cấu hình → 503. FE (`ChatBox` trong `Report.jsx`) giữ lịch sử, chỉ hiện khi `/api/advice` trả `source=llm`. Chỉ gửi chữ và số nốt cho LLM, **không gửi ảnh**.

Quy tắc tư vấn: (1) Không tự nêu loại mụn, chỉ khuyên theo loại khi người dùng tự khai. (2) Mức Nặng vẫn có đủ lời khuyên và luôn khuyên đi khám: `_ensure_doctor` trong `advice.py` ghi đè `see_doctor` bằng `SEVERE_DOCTOR`, FE hiện câu này ngay (`.urgent`), không ẩn trong "Xem chi tiết". Với chat chỉ dựa vào prompt.

## 5. Cấu hình (`backend/.env`, mẫu ở `backend/.env.example`)
| Key | Mặc định | Ghi chú |
|---|---|---|
| `MODEL_WEIGHTS` | `../model/y26m_1280/weights/best.pt` | tính từ `backend/` |
| `MODEL_DEVICE` | `""` | rỗng = cuda `0` nếu có, không thì `cpu` |
| `MODEL_IMGSZ` / `MODEL_IOU` / `MODEL_MAX_DET` | 1280 / 0.7 / 500 | theo spec của người train |
| `MODEL_END2END` | true | ultralytics 8.4 đổi tên: truyền `nms=False` |
| `MODEL_HALF` | true | chỉ áp khi CUDA; 8.4 đổi tên: `quantize=16` |
| `DEDUP_IOU` / `DEDUP_CONTAIN` | 0.3 / 0.7 | bỏ khung trùng: IoU ≥ 0.3 hoặc khung nhỏ nằm ≥ 70% trong khung conf cao hơn; 0 = tắt |
| `CONF_DEFAULT` | 0.175 | chọn 2026-10-30 (§8c); chủ dự án sẽ thử thực tế và có thể chỉnh |
| `CONF_FLOOR` | 0.05 | model trả mọi khung ≥ mức này để FE lọc lại |
| `SHOW_CONF_SLIDER` | true | hiện thanh trượt ngưỡng ở kết quả |
| `SEV_MILD_MAX` / `SEV_MODERATE_MAX` | 5 / 20 | thang Hayashi rút gọn mỗi ảnh |
| `SEV_AGGREGATE` | `max` | `max` hoặc `mean`; giá trị khác thì server không khởi động |
| `MAX_UPLOAD_MB` / `PREVIEW_MAX` | 30 / 1600 | |
| `LLM_*` | | `LLM_PROVIDER=gemini` (gọi REST qua httpx, không dùng SDK `google-genai` để gateway nhẹ), `LLM_MODEL=gemini-2.5-flash`, `LLM_MAX_TOKENS=1500`. Key chỉ để trong `.env`/biến môi trường, không viết vào code. Đổi model khác 2.5-flash thì kiểm tra lại `thinkingBudget` trong `advice.py` |

Lưu ý: file `backend/.env` thật chưa được đọc (chứa token, bị chặn quyền đọc). Nó có thể còn các key cũ (`DETECTOR_BACKEND`, `WEIGHTS_PATH`, `IMG_SIZE`, `PHOTO_IMG_SIZE`, `CONF_THRESHOLD`, `IOU_THRESHOLD`, `MAX_DET`, `SEV_SEVERE_MAX`, `YOLOV5_DIR`, `DEVICE`). Các key này bị bỏ qua vì `extra="ignore"` và tên mới có tiền tố `MODEL_`/`CONF_`, nên xoá đi cũng không sao. Pydantic có `protected_namespaces=("settings_",)` để cho phép tên `model_*`.

## 6. Những điều không được phá
0. Backend trung gian phải nhẹ: `app/main.py`, `app/config.py`, `app/severity.py`, `app/advice.py` không được import torch/ultralytics/PIL/numpy/cv2 ở cấp module (Vercel giới hạn 250 MB; `requirements.txt` cố ý không có các gói này). Chỉ import muộn trong nhánh local. Kiểm tra: `INFERENCE_URL=x python -c "import sys, api.index; print([m for m in ('torch','PIL','numpy') if m in sys.modules])"` phải in `[]`.
1. Nạp model một lần ở `lifespan`, không nạp lại mỗi request. Executor `max_workers=1`: xử lý từng ảnh một (VRAM 4 GB, model không thread-safe). Không chuyển sang batch.
2. Không thu nhỏ ảnh trước model. FE gửi file gốc, BE đưa ảnh độ phân giải gốc vào `predict`, ultralytics tự resize về 1280. `preview` chỉ để hiển thị.
3. Phải `ImageOps.exif_transpose` trước model (đã kiểm chứng ở §8). Toạ độ khung chuẩn hoá theo ảnh đã xoay, và `preview` cũng là ảnh đã xoay, nên khung luôn khớp với ảnh hiển thị.
4. Lật gương: chỉ thẻ `<video>` xem trước được lật bằng CSS (`.feed.mirror`). Ảnh chụp gửi lên không bị lật, và kết quả hiển thị dùng `preview` từ BE, nên khung khớp. Không được lật ảnh chụp ở một phía mà quên phía kia.
5. Không xếp mức độ trên tổng 3 ảnh. Mức mỗi ảnh dùng `grade()`, mức chung dùng `overall()` (max/mean). `severity.py` và `frontend/src/severity.js` phải giống nhau: sửa một bên thì sửa cả bên kia.
6. Số mụn = số khung (đã bỏ trùng) có conf ≥ ngưỡng. FE tự đếm lại bằng `countAt(boxes, conf)`, nên BE phải tiếp tục trả khung ở `CONF_FLOOR` (thấp hơn ngưỡng đếm). Bỏ trùng làm ở BE trên tập ≥ CONF_FLOOR là đúng, vì lọc tham lam theo conf giảm dần (mỗi khung chỉ bị khung conf cao hơn loại), nên lọc ngưỡng sau vẫn cho kết quả như lọc lại từ đầu (`eval_conf.py` có assert kiểm tra). Nếu đổi thuật toán bỏ trùng thì phải giữ tính chất này.
6b. Chỉ bỏ khung trùng, không bỏ khung "báo nhầm" đứng riêng. Chủ dự án quyết định (2026-10-30): nhãn train và test đều còn thiếu, nên khung không khớp nhãn có thể là mụn thật.
7. Không lưu ảnh lên đĩa hoặc server (dữ liệu nhạy cảm). Hiện mọi thứ nằm trong RAM. Muốn lưu thì phải hỏi chủ dự án trước. Trang chủ đang cam kết "Hình ảnh không được lưu lại".
8. Luôn hiện câu: *"Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ."* (`.disclaimer` trong `ScanPage.jsx`).
9. Không commit file `.pt`. Chỉ dùng `best.pt`.
10. Phiên bản: `ultralytics==8.4.192` cố định. Ở bản này `predict()` không còn `end2end`/`half`, thay bằng `nms=False`/`quantize=16` (tên cũ vẫn chạy nhưng in cảnh báo deprecated). Đổi bản ultralytics thì phải kiểm tra lại `detector.py`.

## 7. Luồng FE chi tiết (`ScanPage.jsx`)
- `photos[]`: `{id, status: loading|done|error, file (bị xoá sau khi gửi), preview, w, h, boxes, ms, error}`. `photosRef` giữ bản mới nhất để chụp camera liên tiếp không bị đọc state cũ.
- `addPhotos(files)`: lọc ảnh (MIME `image/*` hoặc đuôi `.heic/.heif`), kiểm tra dung lượng, cắt cho đủ tối đa 3 ảnh, rồi gửi song song (BE vẫn xếp hàng xử lý tuần tự).
- Chế độ `photo` (mặc định, khuyên dùng) và `camera` dùng chung danh sách ảnh. Chế độ camera tự tắt camera khi đủ 3 ảnh. `Stage` cảnh báo khi độ phân giải camera < 1920 (cạnh dài).
- Ngưỡng `conf` (state) mặc định lấy `conf_default` từ `/api/config`. Kéo thanh trượt thì đếm lại ngay. Nếu đã có lời khuyên mà số đếm thay đổi (`stale`), nút "Số mụn đã đổi, phân tích lại" xuất hiện.
- Kết quả hiển thị: tổng (`Ring`), mức độ chung, bảng từng ảnh (số nốt + mức), câu giải thích cách gộp, cảnh báo đếm trùng khi có ≥2 ảnh, thanh trượt, lời khuyên AI, câu miễn trừ trách nhiệm.
- Gợi ý chụp: `HINTS = ['Nửa mặt trái','Nửa mặt phải','Vùng còn lại (trán / cằm)']` và `TIPS` (chụp cận, ánh sáng đều, không filter, không chồng ảnh).

## 8. Kết quả kiểm thử (2026-10-30)
### 8a. Pipeline (smoke test)
- EXIF: ảnh lưu nằm ngang + EXIF orientation=6 cho cùng khung với ảnh gốc (lệch tối đa 0,0003 toạ độ chuẩn hoá). Đối chứng không xoay thì model nhận ảnh sai hướng.
- HEIC: đọc được, kết quả gần như nhau. Ảnh hỏng trả 400.
- `/api/advice [4,3,5]` (tổng 12) cho Nhẹ, đúng quy tắc max. `source=fallback` (LLM chưa cấu hình hoặc lỗi; chưa kiểm tra vì không đọc được `.env`).
- `npx vite build` OK. Chưa test giao diện trên trình duyệt hoặc điện thoại thật.

### 8b. Ảnh test thật: `D:\acne04v2\acne04v2_yolo\test\images` (121 ảnh, có nhãn ở `../labels`)
Chủ dự án chọn 3 ảnh ở giữa danh sách. Đã kiểm tra: không nằm trong tập train. Ảnh 3112×3456, không có EXIF. Chạy conf 0,25 trên GPU, FP16.

| Ảnh | Model đếm | Nhãn gốc | Đúng / Nhầm / Sót (IoU≥0,5) | Đúng / Nhầm / Sót (IoU≥0,3) |
|---|---|---|---|---|
| levle1_175 | 21 | 28 | 11 / 10 / 17 | 14 / 7 / 14 |
| levle1_186 | 38 | 43 | 23 / 15 / 20 | 25 / 13 / 18 |
| levle1_194 | 31 | 44 | 18 / 13 / 26 | 23 / 9 / 21 |
| **Tổng** | **90** | **115** | P 0,57 · R 0,45 | P 0,69 · R 0,54 |

Mức độ: cả 3 ảnh đều Nặng (>20), mức chung Nặng.
Thời gian: GPU FP16 ~70 ms/ảnh trong script (ảnh đầu 125 ms), ~160 ms trong server, ~0,65 s/request (gồm đọc JPEG 10 MP + ảnh xem trước). CPU: ~1,3 s model/ảnh. VRAM thấp (nvidia-smi ~300 MB sau khi chạy).

Trường hợp nghi lỗi (xem ảnh trong `backend/test_out/`):
1. Khung trùng (nặng nhất, đã xử lý, xem §8c): head end2end vẫn sinh 2 khung lồng nhau trên cùng một nốt (khung nhỏ nằm ≥70% trong khung lớn), nên một nốt bị đếm 2 lần. Có 5 / 9 / 7 cặp, tức 21 trên 90–91 nốt. `MODEL_IOU=0.7` không có tác dụng ở chế độ end2end (không chạy NMS), và kể cả có chạy NMS 0.7 cũng không loại được khung lồng (IoU thấp). Thử lọc trùng tham lam theo conf (bỏ khung có IoU≥0,3 hoặc ≥70% nằm trong khung conf cao hơn): số đếm 91 → 70, cả 21 khung bị bỏ đều là báo nhầm (đúng vẫn 52, sót vẫn 63), precision 0,57 → 0,74. Đã áp vào code (`DEDUP_*`). Lọc ở BE trên tập ≥ CONF_FLOOR là đủ, vì lọc tham lam theo conf giảm dần cho cùng kết quả với lọc lại sau khi FE áp ngưỡng (mỗi khung chỉ phụ thuộc các khung conf cao hơn nó).
2. Bỏ sót mụn nhỏ: ở 175/186, khung bị sót có cạnh trung vị ~28 px so với ~36–52 px của khung đúng. Sót nhiều nhất ở cụm nốt li ti trên má (175) và vùng thái dương sát tóc (186).
3. Vùng mũi (194): các khung cam/xanh đan xen quanh cánh mũi. Một phần là lệch vị trí so với nhãn (vùng đỏ viêm lớn được gán nhãn, model khoanh nốt nhỏ bên trong), một phần nghi do lỗ chân lông to hoặc nếp cánh mũi (khung 0,29 ở mép cánh mũi).
4. Lệch vị trí khung: nhiều "báo nhầm" ở IoU 0,5 thành "đúng" ở IoU 0,3. Khung model thường to hơn hoặc lệch so với nhãn rất nhỏ. Lỗi này không ảnh hưởng số đếm.
5. Lông mày: không thấy khung nào nằm trên lông mày. Hai khung sát đầu chân mày ở 186 là nốt thật (có nhãn) bị trùng khung.
6. Nhãn có thể thiếu hoặc nhiễu: vài "báo nhầm" trên trán 186 trông giống nốt thật. 175 có một nhãn nằm ngoài da (góc dưới phải). Nên để bác sĩ xem lại trước khi kết luận.
7. Xoay sai: không gặp (ảnh test không có EXIF; bài test EXIF ở 8a đạt).
Mới có 3 ảnh thì chưa đủ để kết luận model tốt hay kém. Muốn đánh giá thì chạy cả 121 ảnh test (script có sẵn phần so khớp nhãn).

### 8c. Sau khi bật lọc trùng: quét ngưỡng conf trên cả 121 ảnh test (`eval_conf.py`, GPU)
121 ảnh, 3507 nhãn (~29/ảnh). Mức theo nhãn: Nhẹ 13, Trung bình 47, Nặng 61.

| conf | tổng (lọc trùng) | tổng thô | lệch TB/ảnh | MAE | mức khớp | ±1 mức | P | R | F1 | Δ±0.05 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.100 | 4227 | 7253 | +5,95 | 10,68 | 0,79 | 0,99 | 0,51 | 0,62 | 0,56 | 49% |
| 0.150 | 3461 | 5164 | −0,38 | 8,08 | 0,81 | 1,00 | 0,58 | 0,57 | 0,57 | 39% |
| **0.175** | **3149** | 4426 | −2,96 | **7,98** | **0,80** | 1,00 | 0,61 | 0,54 | 0,57 | 38% |
| 0.200 | 2882 | 3853 | −5,17 | 8,50 | 0,79 | 1,00 | 0,63 | 0,52 | 0,57 | 37% |
| 0.250 | 2397 | 2900 | −9,17 | 10,53 | 0,64 | 0,99 | 0,68 | 0,46 | 0,55 | 39% |
| 0.300 | 1939 | 2159 | −12,96 | 13,29 | 0,55 | 0,98 | 0,72 | 0,40 | 0,52 | 45% |
| 0.400 | 1146 | 1163 | −19,51 | 19,55 | 0,29 | 0,88 | 0,81 | 0,27 | 0,40 | 61% |

- Lọc trùng bỏ rất nhiều khung ở ngưỡng thấp (ví dụ 0,2: 3853 → 2882, khoảng 25%).
- Vùng ổn định 0,15–0,20: mức độ khớp nhãn ~80%, MAE thấp nhất, F1 không đổi, số đếm ít nhạy nhất. Chọn 0,175 (giữa vùng). Ngưỡng 0,25 cũ đếm thiếu ~9 nốt/ảnh, mức độ chỉ khớp 64%.
- Vì nhãn còn thiếu, số đếm thật có thể cao hơn nhãn. Nếu thấy báo nhầm nhiều thì tăng dần lên 0,20–0,25; nếu thấy bỏ sót thì hạ về 0,15.
- 3 ảnh ở §8b với cấu hình mới: 25 / 38 / 33 = 96 nốt (nhãn 28 / 43 / 44 = 115); đúng / nhầm / sót = 14/11/14, 25/13/18, 21/12/23.

### 8d. Kiến trúc Vercel + Colab (2026-10-30, giả lập trên máy: infer_server cổng 8001 + backend trung gian cổng 8012)
- Backend trung gian không import thư viện nặng nào. Sai `X-API-Key` thì trả 401.
- `/api/detect` qua trung gian: levle1_186 ra 38 nốt (giống chạy trực tiếp), 0,82 s. HEIC trả 200, ảnh hỏng trả 400, file > `MAX_UPLOAD_MB=4` trả 413, `/api/advice` chạy được.
- Tắt máy chủ model thì `/api/detect` trả 503 "Máy chủ AI đang tắt…", `/api/health` trả `ok:false`.
- Chưa test thật trên Vercel, Colab hay ngrok (cần tài khoản của chủ dự án). Chưa test `fitUpload` (nén ảnh > 4 MB) trên điện thoại thật.

## 9. Việc còn mở / TODO
1. Xong: torch CUDA, trong venv `backend/.venv`.
2. Xong: `SEV_AGGREGATE=max`, chủ dự án đã đồng ý (2026-10-30).
3. Xong: lọc khung trùng (`DEDUP_IOU=0.3`, `DEDUP_CONTAIN=0.7`).
4. Tạm chốt `CONF_DEFAULT=0.175`. Chủ dự án sẽ thử thực tế và chỉnh nếu báo nhầm nhiều. Đổi bằng `CONF_DEFAULT` trong `backend/.env`, rồi khởi động lại backend. Khi chốt xong có thể tắt thanh trượt (`SHOW_CONF_SLIDER=false`).
5. Test với ảnh iPhone thật (HEIC, chụp dọc) và test giao diện trên điện thoại.
6. Chưa có cảnh báo ảnh mờ phía BE (FE camera đã chọn khung nét nhất). Có thể thêm phương sai Laplacian ở `imaging.py`, nhưng cần hiệu chỉnh ngưỡng trên ảnh thật.
7. `Stage` "Thử lại" khi lỗi camera: `setOn(true)` lúc `on` đã là true sẽ không mở lại camera (lỗi có từ trước). Cần thêm key để buộc chạy lại effect.
8. Deploy thật theo DEPLOY.md, rồi kiểm tra: `/api/health` của backend Vercel có `mode:remote, cuda:true`; upload ảnh iPhone > 4 MB (JPEG và HEIC) trên Safari và Chrome Android.
9. Có thể xoá `backend/weights/best.pt` (model cũ) và `frontend/dist/` (build cũ, đã bị .gitignore).

## 10. Kiểm tra nhanh sau mỗi lần sửa
```bash
cd backend && .venv/Scripts/python -c "import app.main" && .venv/Scripts/python test_model.py <ảnh>   # BE import được + model chạy
.venv/Scripts/python -m uvicorn app.main:app --port 8000 &   curl localhost:8000/api/health  # phải "cuda": true
curl -F file=@<ảnh.heic> localhost:8000/api/detect                     # 200, w/h đúng hướng dọc/ngang
curl -X POST localhost:8000/api/advice -H "Content-Type: application/json" -d '{"counts":[4,3,5]}'  # severity = Nhẹ
cd ../frontend && npx vite build                                         # FE build sạch
```
Trên trình duyệt (`https://localhost:5173/#/kham`): tải 3 ảnh (có 1 ảnh HEIC dọc từ iPhone), kiểm tra khung nằm đúng trên nốt mụn, kéo thanh trượt thì số nhảy ngay, chế độ camera chụp được và ảnh không bị lật hoặc lệch khung.
