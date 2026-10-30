# AcneScope – đánh giá mụn qua camera

FastAPI (backend) + React/Vite (frontend). Người dùng tải lên / chụp tối đa 3 ảnh cận da mặt → model YOLO26m đếm mụn từng ảnh → cộng tổng → mức độ (Hayashi rút gọn, theo từng ảnh) → AI đưa lời khuyên.

> Tài liệu bàn giao chi tiết cho người/AI tiếp theo: **[HANDOFF.md](HANDOFF.md)**. Triển khai lên Vercel + Colab/ngrok: **[DEPLOY.md](DEPLOY.md)**.

## 1. Backend
```bash
cd backend
python -m venv .venv && .venv\Scriptsctivate     # venv riêng của dự án (đã tạo sẵn ở backend/.venv)
pip install -r requirements-model.txt    # gồm ultralytics==8.4.192, pillow-heif (requirements.txt chỉ là bản nhẹ cho Vercel)
# torch CUDA cho RTX 3050: cài SAU, vì bước trên kéo torch bản CPU
pip install --force-reinstall --no-deps torch==2.14.1 torchvision==0.29.2 --index-url https://download.pytorch.org/whl/cu132
# Model: ../model/y26m_1280/weights/best.pt (MODEL_WEIGHTS trong backend/.env)
python test_model.py anh1.jpg anh2.heic anh3.jpg   # test model độc lập, lưu ảnh vẽ khung vào backend/test_out/
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Test nhanh: `curl -F file=@anh.jpg http://localhost:8000/api/detect` · Swagger: http://localhost:8000/docs · `GET /api/health` cho biết đang chạy CPU hay CUDA.

## 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
- Máy tính: mở `https://localhost:5173`
- Điện thoại (cùng Wi-Fi): mở `https://<IP-máy-tính>:5173`, bấm "Nâng cao → vẫn tiếp tục" cho chứng chỉ tự ký. **Trình duyệt chỉ cho mở camera trên HTTPS**, nên `VITE_HTTPS=true`.
- Cổng 5173 và 8000 cần được firewall cho phép.

## 3. File môi trường (chỉ cần sửa 2 file này)
- `backend/.env`: `MODEL_*` (model), `DEDUP_*` (bỏ khung trùng), `CONF_DEFAULT` (ngưỡng đếm, mặc định 0.175), `SEV_*` (thang mức độ + cách gộp), `LLM_*` (AI lời khuyên). Xem `backend/.env.example`.
- `frontend/.env`: địa chỉ backend, HTTPS, thương hiệu.

## Mức độ (thang Hayashi rút gọn, áp cho TỪNG ẢNH ~ nửa mặt)
| Số nốt / ảnh | Mức |
|---|---|
| 0 | Không phát hiện |
| 1–5 | Nhẹ |
| 6–20 | Trung bình |
| >20 | Nặng |

Mức độ chung nhiều ảnh: `SEV_AGGREGATE=max` (mức cao nhất trong các ảnh, mặc định) hoặc `mean`. Không áp ngưỡng lên tổng.

## Luồng hoạt động
1. Người dùng **tải ảnh lên** (trên điện thoại mở luôn camera gốc, nét nhất) hoặc **chụp bằng camera trình duyệt** (ảnh tĩnh độ phân giải cao nhất: `ImageCapture.takePhoto`, không có thì lấy khung nét nhất trong 6 khung). Tối đa 3 ảnh.
2. FE gửi **nguyên ảnh gốc** (không thu nhỏ, kể cả HEIC) tới `POST /api/detect`, từng ảnh. BE xoay theo EXIF, chạy model (imgsz 1280), trả mọi khung có conf ≥ `CONF_FLOOR` + ảnh xem trước đã xoay đúng. Không lưu ảnh.
3. FE đếm số khung ≥ ngưỡng (thanh trượt, lọc lại ngay không chạy lại model), cộng tổng, tính mức độ.
4. Bấm "Phân tích & nhận lời khuyên" → `POST /api/advice {counts:[...]}` → AI trả JSON lời khuyên (không có token → lời khuyên mặc định).

## Giao diện
- Hai trang: Trang chủ (`#/`) và Thăm khám AI (`#/kham`). Nav cuộn tới Dịch vụ, Quy trình, Câu hỏi thường gặp.
- Ảnh nền hero: `frontend/public/images/hero.jpg`. Ảnh 5 thẻ dịch vụ: `frontend/public/images/services/*.jpg` (tên file + điểm lấy nét khai báo trong `SERVICES` ở `Home.jsx`). Thay file là đổi ảnh.
- Logo: `frontend/public/logo.svg`. Tên công ty, slogan, link đặt lịch, hotline, email: `frontend/.env` (`VITE_BRAND_*`, `VITE_BOOKING_URL`, `VITE_HOTLINE`, `VITE_CONTACT_EMAIL`).
