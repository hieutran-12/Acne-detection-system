# Triển khai: Frontend trên Vercel, Backend trên Render (hoặc Vercel), Model trên Colab (ngrok)

Điện thoại hoặc máy tính mở frontend trên Vercel. Frontend gọi backend trên Render hoặc Vercel, backend chỉ lo cấu hình, LLM và chuyển ảnh qua ngrok sang Colab GPU chạy `infer_server.py`. Backend gọi Colab bằng HTTPS kèm header `X-API-Key`.

- Backend không chứa model, không có torch, chỉ chuyển ảnh sang Colab qua biến `INFERENCE_URL`.
- Nên đặt backend trên Render (Bước 2A) vì server chạy liên tục và không bị chặn 4,5 MB, gửi được cả ảnh HEIC lớn. Gói free ngủ sau 15 phút không dùng, lần gọi đầu phải chờ 30 đến 60 giây. Gói Starter thì không ngủ.
- Nếu đặt trên Vercel (Bước 2B) thì request trên khoảng 4,5 MB sẽ bị chặn. Frontend tự nén ảnh lớn thành JPEG và giữ độ phân giải, chỉ thu nhỏ khi ảnh trên 12,5 MP. Ảnh HEIC quá 4 MB trên Chrome Android thì không nén được, người dùng sẽ thấy hướng dẫn chuyển camera sang JPG.
- Colab phải đang chạy thì web mới đếm được mụn. Colab tự tắt khi rảnh lâu hoặc sau khoảng 12 tiếng, lúc đó web sẽ báo "Máy chủ AI đang tắt…".
- Ảnh khuôn mặt sẽ đi qua backend, ngrok và Google Colab. Code không lưu ảnh ở đâu cả, nhưng cần cân nhắc điều này khi dùng với dữ liệu thật của phòng khám.

Chạy local thì không cần đặt `INFERENCE_URL`, backend tự chạy model bằng GPU.

---

## Bước 0. Chuẩn bị (một lần)
1. Tài khoản ngrok (miễn phí): https://dashboard.ngrok.com
   - Lấy Authtoken: *Your Authtoken*.
   - Tạo domain tĩnh miễn phí ở *Domains → New Domain*, ví dụ `ten-ban.ngrok-free.app`, để địa chỉ không đổi giữa các lần chạy Colab.
2. Tài khoản Vercel + cài CLI: `npm i -g vercel`, rồi `vercel login`.
3. Tạo một khoá bí mật dài, ví dụ bằng `python -c "import secrets;print(secrets.token_urlsafe(32))"`. Khoá này điền vào `INFER_API_KEY` trên Colab và `INFERENCE_API_KEY` trên backend, hai bên phải giống nhau.

## Bước 0b. Đẩy code lên GitHub
Repo: `https://github.com/hieutran-12/Acne-detection-system.git`. Nên để Private (*Settings → General → Danger Zone → Change visibility*).

### Đẩy lần đầu
Mở cmd trong thư mục dự án rồi chạy:
```cmd
cd /d D:\acne-clinic
git init -b main
git add .
git status
git commit -m "AcneScope: web + backend + colab"
git remote add origin https://github.com/hieutran-12/Acne-detection-system.git
git push -u origin main
```
- Sau `git status` nhớ đọc lại danh sách file. Không được có `.venv`, `node_modules`, `.env`, `*.pt`, `*.zip`, `test_out`, ảnh `train_batch*` hay `val_batch*`. `.gitignore` đã chặn sẵn, nếu vẫn thấy thì dừng lại kiểm tra.

### Những lần sau
```cmd
git add .
git commit -m "mô tả ngắn thay đổi"
git push
```
Render và Vercel, nếu đã nối GitHub, sẽ tự deploy lại sau mỗi lần push.

Lỡ đẩy `.env` hoặc token thì chạy `git rm --cached backend/.env`, commit rồi push, và đổi token ngay vì nó đã nằm trong lịch sử git.

## Bước 1. Colab: chạy model
1. Trên máy chạy `cd backend` rồi `.venv\Scripts\python pack_colab.py`, ra file `backend/colab_bundle.zip` khoảng 41 MB, gồm code và `best.pt`, không chứa token.
2. Tải `colab_bundle.zip` lên Google Drive vào thư mục `MyDrive/acnescope/`.
3. Mở https://colab.research.google.com, chọn *File → Upload notebook* rồi chọn `colab/AcneScope_Colab.ipynb`.
4. Vào *Runtime → Change runtime type* và chọn T4 GPU.
5. Mở *Secrets* (biểu tượng chìa khoá bên trái), thêm `NGROK_AUTHTOKEN`, `INFER_API_KEY`, `NGROK_DOMAIN` rồi bật *Notebook access*.
6. Chạy lần lượt các ô 1 đến 4. Ô 4 in ra `INFERENCE_URL = https://...`, ghi lại địa chỉ này.

Sửa code trong `backend/app/` hoặc đổi model thì chạy lại `pack_colab.py`, tải lại zip lên Drive rồi chạy lại notebook.

## Bước 2A. Backend lên Render (khuyên dùng)
Render deploy từ GitHub nên phải làm [Bước 0b](#bước-0b-đẩy-code-lên-github) trước. Frontend và backend chung một repo, Render chỉ lấy thư mục `backend`, Vercel chỉ lấy thư mục `frontend`.

1. Vào https://dashboard.render.com, chọn *New → Web Service* rồi chọn repo.
2. Điền cấu hình như dưới. Muốn dùng Blueprint thì chuyển `backend/render.yaml` ra gốc repo rồi chọn *New → Blueprint*.
   - Root Directory: `backend`
   - Runtime: Python
   - Region: Singapore
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Instance type: Free (có ngủ) hoặc Starter (không ngủ)
3. *Environment*: `PYTHON_VERSION=3.12.7`, `INFERENCE_URL`, `INFERENCE_API_KEY`, `MAX_UPLOAD_MB=30`, `CONF_DEFAULT=0.175`, `CORS_ORIGINS`, `LLM_*` (ý nghĩa như bảng ở Bước 2B).
4. Deploy xong mở `https://acnescope-api.onrender.com/api/health`, phải thấy `"mode":"remote","ok":true,"cuda":true`.
5. Ở Bước 3, đặt `VITE_API_URL=https://acnescope-api.onrender.com`.

Đổi biến môi trường thì Render tự khởi động lại, không cần build lại.

## Bước 2B. Backend lên Vercel (thay thế)
```bash
cd backend
vercel                 # lần đầu: tạo project (ví dụ "acnescope-api"), "Other" framework, giữ mặc định
```
Đặt biến môi trường ở *Vercel Dashboard → project → Settings → Environment Variables*, chọn Production.

| Biến | Giá trị |
|---|---|
| `INFERENCE_URL` | địa chỉ ngrok ở Bước 1, ví dụ `https://ten-ban.ngrok-free.app` |
| `INFERENCE_API_KEY` | khoá bí mật (giống `INFER_API_KEY` trên Colab) |
| `MAX_UPLOAD_MB` | `4` (bắt buộc trên Vercel; Render để `30`) |
| `CORS_ORIGINS` | tạm thời `*`, sau Bước 3 đổi thành domain frontend |
| `CONF_DEFAULT` | `0.175` |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_MAX_TOKENS` | `gemini`, key Gemini, `gemini-2.5-flash`, `1500`. Thiếu thì web dùng lời khuyên có sẵn và ẩn khung chat |

```bash
vercel --prod          # đổi biến môi trường xong cũng phải chạy lại lệnh này
```
Mở `https://acnescope-api.vercel.app/api/health`, phải thấy `"mode":"remote","ok":true,"cuda":true`.

## Bước 3. Frontend lên Vercel
Biến `VITE_*` được gắn cứng lúc build nên phải đặt trước khi deploy.
```bash
cd frontend
vercel                 # tạo project (ví dụ "acnescope"), Vercel tự nhận Vite
```
Biến môi trường (Production):

| Biến | Giá trị |
|---|---|
| `VITE_API_URL` | domain backend ở Bước 2, ví dụ `https://acnescope-api.onrender.com`, không có `/` cuối |
| `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`, `VITE_BOOKING_URL`, `VITE_HOTLINE`, `VITE_CONTACT_EMAIL` | tuỳ chọn |

```bash
vercel --prod
```
Cuối cùng quay lại backend, đổi `CORS_ORIGINS` thành domain frontend (ví dụ `https://acnescope.vercel.app`). Render tự khởi động lại, còn Vercel thì chạy `vercel --prod` trong `backend/`.

## Vận hành hằng ngày
- Muốn web chạy thì mở notebook Colab, chạy ô 1 đến 4 và giữ tab mở.
- Không dùng domain ngrok tĩnh thì mỗi lần chạy Colab sẽ có địa chỉ mới, phải sửa `INFERENCE_URL` trên backend (Vercel thì chạy thêm `vercel --prod`).
- Đổi ngưỡng conf thì sửa `CONF_DEFAULT` trên backend (Vercel thì chạy thêm `vercel --prod`), không cần đụng tới Colab.

## Lỗi thường gặp
| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| Web báo "Máy chủ AI đang tắt…" | Colab đã tắt, ngrok chưa chạy, hoặc `INFERENCE_URL` sai. Chạy lại notebook; xem `/api/health` của backend. |
| `/api/health` báo `ok:false` dù Colab đang chạy | Khoá không khớp, `INFERENCE_API_KEY` trên backend phải bằng `INFER_API_KEY` trên Colab. |
| Trình duyệt báo lỗi CORS | `CORS_ORIGINS` trên backend chưa có đúng domain frontend (có `https://`, không có `/` cuối). |
| "Ảnh … quá lớn và trình duyệt không mở được để nén" | Chỉ xảy ra khi backend ở Vercel: ảnh HEIC > 4 MB trên Chrome/Android. Chụp ở JPG, dùng Safari, hoặc chuyển backend sang Render. |
| Lần đầu mở web chờ rất lâu (Render) | Gói Free đang ngủ, chờ 30 đến 60 giây hoặc nâng lên Starter. |
| Colab báo không có GPU | Chưa chọn T4 GPU, hoặc hết hạn mức GPU miễn phí trong ngày. |
| Frontend vẫn gọi sai địa chỉ backend | Đổi `VITE_API_URL` xong phải chạy lại `vercel --prod` vì biến này gắn cứng lúc build. |
