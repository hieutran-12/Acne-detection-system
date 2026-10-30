# AcneScope - đánh giá mụn qua camera

Backend FastAPI, frontend React/Vite. Người dùng tải lên hoặc chụp tối đa 3 ảnh cận da mặt, model YOLO26m đếm mụn từng ảnh rồi cộng tổng. Mức độ xếp theo thang Hayashi rút gọn cho từng ảnh, sau đó AI đưa lời khuyên.

Ghi chú bàn giao cho người hoặc AI làm tiếp: [HANDOFF.md](HANDOFF.md). Cách đưa lên Vercel + Colab/ngrok: [DEPLOY.md](DEPLOY.md).

## 1. Backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate     # venv riêng của dự án (đã tạo sẵn ở backend/.venv)
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
- Điện thoại (cùng Wi-Fi): mở `https://<IP-máy-tính>:5173`, bấm "Nâng cao → vẫn tiếp tục" vì chứng chỉ tự ký. Trình duyệt chỉ cho mở camera trên HTTPS nên phải để `VITE_HTTPS=true`.
- Cổng 5173 và 8000 cần được firewall cho phép.

## 3. File môi trường (chỉ cần sửa 2 file này)
- `backend/.env`: `MODEL_*` (model), `DEDUP_*` (bỏ khung trùng), `CONF_DEFAULT` (ngưỡng đếm, mặc định 0.175), `SEV_*` (thang mức độ + cách gộp), `LLM_*` (AI lời khuyên). Xem `backend/.env.example`.
- `frontend/.env`: địa chỉ backend, HTTPS, thương hiệu.

## Mức độ (thang Hayashi rút gọn, áp cho từng ảnh ~ nửa mặt)
| Số nốt / ảnh | Mức |
|---|---|
| 0 | Không phát hiện |
| 1–5 | Nhẹ |
| 6–20 | Trung bình |
| >20 | Nặng |

Mức độ chung nhiều ảnh: `SEV_AGGREGATE=max` (mức cao nhất trong các ảnh, mặc định) hoặc `mean`. Không áp ngưỡng lên tổng.

## Luồng hoạt động
1. Người dùng tải ảnh lên (trên điện thoại sẽ mở luôn camera gốc, ảnh nét nhất) hoặc chụp bằng camera trình duyệt (ảnh tĩnh độ phân giải cao nhất qua `ImageCapture.takePhoto`, không có thì lấy khung nét nhất trong 6 khung). Tối đa 3 ảnh.
2. FE gửi từng ảnh gốc tới `POST /api/detect`, không thu nhỏ, kể cả HEIC. BE xoay theo EXIF, chạy model (imgsz 1280), rồi trả mọi khung có conf ≥ `CONF_FLOOR` kèm ảnh xem trước đã xoay đúng. Ảnh không được lưu lại.
3. FE đếm số khung ≥ ngưỡng, cộng tổng và tính mức độ. Kéo thanh trượt thì lọc lại ngay, không chạy lại model.
4. Bấm "Phân tích & nhận lời khuyên" sẽ gọi `POST /api/advice {counts:[...]}`, AI trả JSON lời khuyên. Không có token thì dùng lời khuyên mặc định.

## Giao diện
- Hai trang: Trang chủ (`#/`) và Thăm khám AI (`#/kham`). Nav cuộn tới Dịch vụ, Quy trình, Câu hỏi thường gặp.
- Ảnh nền hero: `frontend/public/images/hero.jpg`. Ảnh 5 thẻ dịch vụ: `frontend/public/images/services/*.jpg` (tên file + điểm lấy nét khai báo trong `SERVICES` ở `Home.jsx`). Thay file là đổi ảnh.
- Logo: `frontend/public/logo.svg`. Tên công ty, slogan, link đặt lịch, hotline, email: `frontend/.env` (`VITE_BRAND_*`, `VITE_BOOKING_URL`, `VITE_HOTLINE`, `VITE_CONTACT_EMAIL`).
