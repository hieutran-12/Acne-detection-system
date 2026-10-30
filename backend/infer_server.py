"""Máy chủ model chạy trên Colab GPU, mở ra ngoài qua ngrok. Backend gọi vào đây để đếm mụn.

    INFER_API_KEY=... MODEL_WEIGHTS=best.pt uvicorn infer_server:app --port 8001

Chỉ có 2 endpoint, không có LLM hay giao diện. Ảnh nằm trong RAM, không lưu.
"""
import asyncio
import hmac
import os
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from app import imaging
from app.config import settings
from app.detector import Detector
from app.pipeline import process

API_KEY = os.environ.get("INFER_API_KEY", "")
MAX_BYTES = 30 * 1024 * 1024
pool = ThreadPoolExecutor(max_workers=1)  # xử lý từng ảnh một
state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not API_KEY:
        print("CẢNH BÁO: chưa đặt INFER_API_KEY, ai có địa chỉ ngrok cũng gọi được model.")
    state["detector"] = Detector(settings)
    yield


app = FastAPI(title="AcneScope inference", lifespan=lifespan, docs_url=None, redoc_url=None)


def check(key: str | None):
    if API_KEY and not hmac.compare_digest(key or "", API_KEY):
        raise HTTPException(401, "Sai API key")


@app.get("/health")
def health(x_api_key: str | None = Header(default=None)):
    check(x_api_key)
    d = state.get("detector")
    return {"ok": d is not None, "device": d and d.device, "cuda": d and d.cuda, "heic": imaging.HEIF,
            "weights": settings.model_weights, "dedup": [settings.dedup_iou, settings.dedup_contain]}


@app.post("/infer")
async def infer(file: UploadFile = File(...), x_api_key: str | None = Header(default=None)):
    check(x_api_key)
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Ảnh quá lớn")
    res = await asyncio.get_running_loop().run_in_executor(pool, process, state["detector"], data, settings.preview_max)
    if "error" in res:
        raise HTTPException(400, "bad_image")
    return res
