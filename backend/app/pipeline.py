"""Xử lý 1 ảnh: đọc, xoay EXIF, chạy model, trả khung chuẩn hoá và ảnh xem trước. Backend chạy model tại chỗ
(app.main, khi không đặt INFERENCE_URL) và máy chủ trên Colab (infer_server.py) đều dùng file này."""
import time

from PIL import Image, UnidentifiedImageError

from . import imaging


def process(detector, data: bytes, preview_max: int) -> dict:
    """Mọi thứ nằm trong RAM, không ghi ảnh ra đĩa."""
    try:
        img = imaging.load(data)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        return {"error": "bad_image"}
    w, h = img.size
    t = time.perf_counter()
    dets = detector.predict(imaging.to_bgr(img))
    ms = round((time.perf_counter() - t) * 1000)
    boxes = [[round(float(x1) / w, 5), round(float(y1) / h, 5), round(float(x2) / w, 5),
              round(float(y2) / h, 5), round(float(c), 3)] for x1, y1, x2, y2, c in dets]
    boxes.sort(key=lambda b: -b[4])
    return {"w": w, "h": h, "boxes": boxes, "ms": ms, "preview": imaging.preview_b64(img, preview_max)}
