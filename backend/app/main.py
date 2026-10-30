import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .advice import get_advice
from .config import settings
from .severity import AGGREGATES, grade, levels, overall

# Hai chế độ:
#  - INFERENCE_URL rỗng  -> chạy model ngay trong process này (máy có GPU, dev local).
#  - INFERENCE_URL có    -> chỉ là cổng trung gian (Vercel): chuyển ảnh sang máy chủ model (Colab + ngrok).
#    Khi đó KHÔNG import torch/ultralytics/PIL (Vercel giới hạn 250 MB).
REMOTE = bool(settings.inference_url)
MAX_PHOTOS = 3
pool = ThreadPoolExecutor(max_workers=1)  # 4 GB VRAM + model không thread-safe -> xử lý từng ảnh một
state: dict = {}

if settings.sev_aggregate not in AGGREGATES:
    raise ValueError(f"SEV_AGGREGATE phải là một trong {AGGREGATES}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not REMOTE:
        from .detector import Detector

        state["detector"] = Detector(settings)
    yield


app = FastAPI(title="Acne Clinic API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _remote_headers() -> dict:
    # ngrok-skip-browser-warning: bỏ trang cảnh báo của ngrok bản free
    return {"X-API-Key": settings.inference_api_key, "ngrok-skip-browser-warning": "1"}


async def _remote(method: str, path: str, **kw) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=settings.inference_timeout) as c:
            r = await c.request(method, settings.inference_url.rstrip("/") + path, headers=_remote_headers(), **kw)
    except httpx.HTTPError as e:
        print(f"[remote] {e!r}")
        raise HTTPException(503, "Máy chủ AI đang tắt hoặc không kết nối được. Vui lòng thử lại sau.")
    if r.status_code == 400:
        raise HTTPException(400, "Không đọc được ảnh này. Hãy dùng ảnh JPG, PNG hoặc HEIC.")
    if r.status_code != 200 or "application/json" not in r.headers.get("content-type", ""):
        print(f"[remote] {r.status_code} {r.text[:200]!r}")  # ngrok offline trả HTML (ERR_NGROK_...)
        raise HTTPException(503, "Máy chủ AI đang tắt hoặc không kết nối được. Vui lòng thử lại sau.")
    return r


@app.get("/api/health")
async def health():
    if REMOTE:
        try:
            return {"mode": "remote", **(await _remote("GET", "/health")).json()}
        except HTTPException as e:
            return {"mode": "remote", "ok": False, "error": e.detail}
    from . import imaging

    d = state.get("detector")
    return {"mode": "local", "ok": d is not None, "device": d and d.device, "cuda": d and d.cuda, "heic": imaging.HEIF}


@app.get("/api/config")
def config():
    return {
        "levels": levels(settings),
        "aggregate": settings.sev_aggregate,
        "conf_default": settings.conf_default,
        "conf_floor": settings.conf_floor,
        "show_conf_slider": settings.show_conf_slider,
        "max_photos": MAX_PHOTOS,
        "max_upload_mb": settings.max_upload_mb,
    }


@app.post("/api/detect")
async def detect(file: UploadFile = File(...)):
    """1 ảnh -> mọi khung có conf >= CONF_FLOOR (toạ độ 0–1 theo ảnh đã xoay EXIF) + ảnh xem trước.
    `count`/`severity` tính ở CONF_DEFAULT; FE tự lọc lại khi người dùng đổi ngưỡng."""
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Ảnh quá lớn (tối đa {settings.max_upload_mb} MB)")
    if REMOTE:
        r = await _remote("POST", "/infer", files={"file": (file.filename or "photo", data, file.content_type)})
        res = r.json()
    else:
        from .pipeline import process

        res = await asyncio.get_running_loop().run_in_executor(
            pool, process, state["detector"], data, settings.preview_max)
        if "error" in res:
            raise HTTPException(400, "Không đọc được ảnh này. Hãy dùng ảnh JPG, PNG hoặc HEIC.")
    count = sum(b[4] >= settings.conf_default for b in res["boxes"])
    return {**res, "count": count, "severity": grade(count, settings)}


class AdviceIn(BaseModel):
    counts: list[int] = Field(min_length=1, max_length=MAX_PHOTOS)
    note: str = Field(default="", max_length=500)


@app.post("/api/advice")
async def advice(body: AdviceIn):
    if any(c < 0 or c > 1000 for c in body.counts):
        raise HTTPException(422, "Số mụn không hợp lệ")
    sev = overall(body.counts, settings)
    data, source = await get_advice(settings, body.counts, sev, body.note)
    return {"counts": body.counts, "total": sum(body.counts), "severity": sev, "advice": data, "source": source}
