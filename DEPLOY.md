# Triển khai: Frontend trên Vercel, Backend trên Render (hoặc Vercel), Model trên Colab (ngrok)

```
Điện thoại / máy tính
   │ HTTPS
   ▼
Frontend (Vercel, trang tĩnh)  ──►  Backend (Render/Vercel, Python nhẹ: cấu hình, LLM, chuyển ảnh)
                                         │ HTTPS + X-API-Key
                                         ▼
                                   ngrok ──► Colab GPU: infer_server.py (YOLO26m)
```

- **Backend không chứa model** (không có torch), chỉ chuyển ảnh sang Colab qua biến `INFERENCE_URL`.
- **Khuyên đặt backend trên Render** (Bước 2A): server chạy liên tục, **không giới hạn 4,5 MB**, nên gửi được ảnh gốc (kể cả HEIC lớn). Gói free tự ngủ sau 15 phút không dùng; lần gọi đầu chờ ~30–60 s. Gói Starter không ngủ.
- **Nếu đặt backend trên Vercel** (Bước 2B): Vercel chặn request lớn hơn ~4,5 MB. Frontend tự nén lại ảnh lớn thành JPEG, **giữ nguyên độ phân giải** (chỉ thu khi ảnh > 12,5 MP, vẫn lớn hơn ảnh lúc train). Ảnh HEIC quá 4 MB trên Chrome/Android không nén được: người dùng sẽ thấy hướng dẫn chuyển camera sang JPG.
- **Colab phải đang chạy** thì web mới đếm được mụn. Colab tự tắt khi rảnh lâu hoặc sau khoảng 12 giờ. Khi Colab tắt, web báo "Máy chủ AI đang tắt…".
- **Riêng tư:** ảnh khuôn mặt đi qua Vercel, ngrok và Google Colab. Code không lưu ảnh ở đâu cả.

Chạy local vẫn như cũ: không đặt `INFERENCE_URL` thì backend tự chạy model bằng GPU.

---

## Bước 0. Chuẩn bị (một lần)
1. Tài khoản **ngrok** (miễn phí): https://dashboard.ngrok.com
   - Lấy **Authtoken**: *Your Authtoken*.
   - Tạo **domain tĩnh miễn phí**: *Domains → New Domain*, ví dụ `ten-ban.ngrok-free.app`. Có domain tĩnh thì địa chỉ không đổi giữa các lần chạy Colab.
2. Tài khoản **Vercel** + cài CLI: `npm i -g vercel`, rồi `vercel login`.
3. Tự đặt một **khoá bí mật** dài (ví dụ chạy `python -c "import secrets;print(secrets.token_urlsafe(32))"`). Khoá này dùng cho cả Colab (`INFER_API_KEY`) và Vercel (`INFERENCE_API_KEY`), phải **giống nhau**.

## Bước 1. Colab: chạy model
1. Trên máy: `cd backend` rồi `.venv\Scripts\python pack_colab.py`, ra file `backend/colab_bundle.zip` (~41 MB, gồm code và `best.pt`, **không** chứa token).
2. Tải `colab_bundle.zip` lên Google Drive, vào thư mục **`MyDrive/acnescope/`**.
3. Mở https://colab.research.google.com → *File → Upload notebook* → chọn `colab/AcneScope_Colab.ipynb`.
4. *Runtime → Change runtime type → **T4 GPU***.
5. Biểu tượng 🔑 *Secrets* (thanh bên trái): thêm `NGROK_AUTHTOKEN`, `INFER_API_KEY`, `NGROK_DOMAIN`, bật *Notebook access*.
6. Chạy lần lượt các ô 1 → 4. Ô 4 in ra `INFERENCE_URL = https://...`. Ghi lại địa chỉ này.

Mỗi khi sửa code trong `backend/app/` hoặc đổi model: chạy lại `pack_colab.py`, tải lại zip lên Drive, rồi chạy lại notebook.

## Bước 2A. Backend lên Render (khuyên dùng)
Render deploy từ **GitHub/GitLab**, không deploy thẳng từ thư mục trên máy. Vì vậy cần đưa code lên một repo, **để private** cho an toàn.
```bash
cd D:cne-clinic
git init && git add . && git commit -m "AcneScope"
# tạo repo private trên GitHub rồi:
git remote add origin https://github.com/<ban>/acne-clinic.git && git push -u origin main
```
`.gitignore` đã chặn `*.pt`, `.env`, `backend/.venv`, `colab_bundle.zip`. Trước khi push, chạy `git status` để chắc chắn không có file nào trong số này bị đưa lên.

1. https://dashboard.render.com → *New → Web Service* → chọn repo.
2. Cấu hình (hoặc dùng Blueprint: chuyển `backend/render.yaml` ra thư mục gốc repo rồi chọn *New → Blueprint*):
   - **Root Directory:** `backend`
   - **Runtime:** Python · **Region:** Singapore
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free (ngủ khi rảnh) hoặc Starter (không ngủ)
3. *Environment*: `PYTHON_VERSION=3.12.7`, `INFERENCE_URL`, `INFERENCE_API_KEY`, **`MAX_UPLOAD_MB=30`**, `CONF_DEFAULT=0.175`, `CORS_ORIGINS`, `LLM_*` (ý nghĩa như bảng ở Bước 2B).
4. Deploy. Kiểm tra `https://acnescope-api.onrender.com/api/health` phải thấy `"mode":"remote","ok":true,"cuda":true`.
5. Ở Bước 3, đặt `VITE_API_URL=https://acnescope-api.onrender.com`.

Đổi biến môi trường trên Render thì Render tự khởi động lại, không cần build lại.

## Bước 2B. Backend lên Vercel (thay thế)
```bash
cd backend
vercel                 # lần đầu: tạo project (ví dụ "acnescope-api"), "Other" framework, giữ mặc định
```
Đặt biến môi trường: *Vercel Dashboard → project → Settings → Environment Variables*, chọn môi trường **Production**.

| Biến | Giá trị |
|---|---|
| `INFERENCE_URL` | địa chỉ ngrok ở Bước 1, ví dụ `https://ten-ban.ngrok-free.app` |
| `INFERENCE_API_KEY` | khoá bí mật (giống `INFER_API_KEY` trên Colab) |
| `MAX_UPLOAD_MB` | `4` (bắt buộc trên Vercel; Render để `30`) |
| `CORS_ORIGINS` | tạm thời `*`, sau Bước 3 đổi thành domain frontend |
| `CONF_DEFAULT` | `0.175` (hoặc ngưỡng bạn chốt) |
| `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | như trong `backend/.env` (nếu dùng AI lời khuyên) |

```bash
vercel --prod          # deploy thật. Mỗi lần đổi biến môi trường phải chạy lại lệnh này
```
**Kiểm tra:** mở `https://acnescope-api.vercel.app/api/health`. Phải thấy `"mode":"remote","ok":true,"cuda":true`.

## Bước 3. Frontend lên Vercel
Biến `VITE_*` được đóng cứng vào lúc build, nên **phải đặt trước** khi deploy.
```bash
cd frontend
vercel                 # tạo project (ví dụ "acnescope"), Vercel tự nhận Vite
```
Biến môi trường (Production):

| Biến | Giá trị |
|---|---|
| `VITE_API_URL` | `https://acnescope-api.vercel.app` (domain backend ở Bước 2, không có `/` cuối) |
| `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`, `VITE_BOOKING_URL`, `VITE_HOTLINE`, `VITE_CONTACT_EMAIL` | tuỳ chọn |

```bash
vercel --prod
```
Cuối cùng quay lại project backend: đổi `CORS_ORIGINS` thành domain frontend (ví dụ `https://acnescope.vercel.app`), rồi chạy `vercel --prod` trong `backend/`.

## Vận hành hằng ngày
- Muốn web chạy: mở notebook Colab, chạy ô 1 → 4, **giữ tab mở**.
- Nếu **không** dùng domain ngrok tĩnh: mỗi lần chạy Colab có địa chỉ mới, phải sửa `INFERENCE_URL` trên Vercel rồi chạy `vercel --prod` trong `backend/`.
- Đổi ngưỡng conf: sửa `CONF_DEFAULT` trên Vercel (project backend) rồi chạy `vercel --prod`. Không cần sửa Colab.

## Lỗi thường gặp
| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| Web báo "Máy chủ AI đang tắt…" | Colab đã tắt, ngrok chưa chạy, hoặc `INFERENCE_URL` sai. Chạy lại notebook; xem `/api/health` của backend. |
| `/api/health` báo `ok:false` dù Colab chạy | Khoá không khớp: `INFERENCE_API_KEY` (Vercel) phải bằng `INFER_API_KEY` (Colab). |
| Trình duyệt báo lỗi CORS | `CORS_ORIGINS` trên backend chưa có đúng domain frontend (có `https://`, không có `/` cuối). |
| "Ảnh … quá lớn và trình duyệt không mở được để nén" | Chỉ xảy ra khi backend ở Vercel: ảnh HEIC > 4 MB trên Chrome/Android. Chụp ở JPG, dùng Safari, hoặc chuyển backend sang Render. |
| Lần đầu mở web chờ rất lâu (Render) | Gói Free đang ngủ, chờ ~30–60 s để thức dậy; hoặc nâng lên Starter. |
| Colab báo không có GPU | Chưa chọn T4 GPU, hoặc hết hạn mức GPU miễn phí trong ngày. |
| Frontend vẫn gọi sai địa chỉ backend | Đổi `VITE_API_URL` xong phải chạy lại `vercel --prod` (biến này đóng cứng lúc build). |
