"""Đóng gói code model + best.pt thành colab_bundle.zip để tải lên Google Drive cho Colab.

    cd backend
    python pack_colab.py            # -> backend/colab_bundle.zip (bị .gitignore, KHÔNG chứa .env/token)

Chạy lại mỗi khi sửa code trong app/ hoặc đổi model, rồi tải lại file zip lên Drive.
"""
import zipfile
from pathlib import Path

from app.config import settings

ROOT = Path(__file__).parent
FILES = ["infer_server.py", "requirements.txt", "requirements-model.txt",
         *(f"app/{p.name}" for p in sorted((ROOT / "app").glob("*.py")))]
weights = (ROOT / settings.model_weights).resolve()
out = ROOT / "colab_bundle.zip"

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in FILES:
        z.write(ROOT / f, f)
    z.write(weights, "best.pt")  # Colab đặt MODEL_WEIGHTS=best.pt
print(f"Đã tạo {out} ({out.stat().st_size / 1e6:.1f} MB): {len(FILES)} file code + {weights.name}")
