import base64
import io

import numpy as np
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()  # cho phép PIL mở HEIC/HEIF (ảnh iPhone)
    HEIF = True
except ImportError:
    HEIF = False

Image.MAX_IMAGE_PIXELS = 80_000_000  # đủ cho ảnh 48MP, chặn ảnh "bom giải nén"


def load(data: bytes) -> Image.Image:
    """Đọc ảnh (JPG/PNG/HEIC...), xoay đúng theo EXIF, trả về ảnh RGB ở độ phân giải gốc (không thu nhỏ)."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def to_bgr(img: Image.Image) -> np.ndarray:
    return np.ascontiguousarray(np.asarray(img)[:, :, ::-1])


def preview_b64(img: Image.Image, max_side: int) -> str:
    """Ảnh JPEG thu nhỏ (đã xoay đúng) để FE hiển thị và vẽ khung. Không lưu ra đĩa."""
    p = img.copy()
    p.thumbnail((max_side, max_side), Image.LANCZOS)
    buf = io.BytesIO()
    p.save(buf, "JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
