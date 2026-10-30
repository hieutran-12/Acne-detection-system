"""Test model độc lập, dùng CHUNG code đọc ảnh (xoay EXIF, HEIC) và detector với web.

    cd backend
    python test_model.py anh1.jpg anh2.heic anh3.jpg [--conf 0.25] [--out test_out]

In số mụn từng ảnh + tổng + thời gian suy luận, lưu ảnh đã vẽ khung vào --out (thư mục bị .gitignore).
Nếu có nhãn YOLO (mặc định tìm ở <thư mục ảnh>/../labels/<tên>.txt, hoặc --labels DIR) thì so khớp IoU>=0.5:
    đỏ = đúng (TP) | cam = báo nhầm (FP) | xanh lá = bỏ sót (FN) | xám mảnh = dưới ngưỡng conf
"""
import argparse
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image

from app import imaging
from app.config import settings
from app.detector import Detector
from app.severity import grade, overall

ap = argparse.ArgumentParser()
ap.add_argument("images", nargs="+")
ap.add_argument("--conf", type=float, default=settings.conf_default)
ap.add_argument("--out", default="test_out")
ap.add_argument("--labels", help="thư mục nhãn YOLO .txt (mặc định: <thư mục ảnh>/../labels)")
ap.add_argument("--iou", type=float, default=0.5, help="IoU để coi là khớp nhãn")
a = ap.parse_args()


def load_gt(p: Path, w: int, h: int):
    f = Path(a.labels) / f"{p.stem}.txt" if a.labels else p.parent.parent / "labels" / f"{p.stem}.txt"
    if not f.exists():
        return None
    rows = [list(map(float, l.split()[1:5])) for l in f.read_text().splitlines() if l.strip()]
    return np.array([[(cx - bw / 2) * w, (cy - bh / 2) * h, (cx + bw / 2) * w, (cy + bh / 2) * h] for cx, cy, bw, bh in rows]).reshape(-1, 4)


def iou(a4, b):
    x1, y1 = np.maximum(a4[0], b[:, 0]), np.maximum(a4[1], b[:, 1])
    x2, y2 = np.minimum(a4[2], b[:, 2]), np.minimum(a4[3], b[:, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    return inter / ((a4[2] - a4[0]) * (a4[3] - a4[1]) + (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1]) - inter)


def match(pred, gt):
    """Ghép tham lam theo conf giảm dần. Trả (chỉ số pred đúng, chỉ số pred sai, chỉ số gt bị sót)."""
    used, tp, fp = set(), [], []
    for i in np.argsort(-pred[:, 4]):
        if len(gt):
            o = iou(pred[i, :4], gt)
            o[list(used)] = 0
            j = int(o.argmax())
            if o[j] >= a.iou:
                used.add(j); tp.append(i); continue
        fp.append(i)
    return tp, fp, [j for j in range(len(gt)) if j not in used]


short = lambda b: np.minimum(b[:, 2] - b[:, 0], b[:, 3] - b[:, 1])
if len(a.images) > 3:
    print("Lưu ý: web chỉ nhận tối đa 3 ảnh; script vẫn chạy hết.")

print(f"torch {torch.__version__} | CUDA: {torch.cuda.is_available()} | weights: {settings.model_weights}")
t = time.perf_counter()
det = Detector(settings)
print(f"Nạp model + warm-up: {time.perf_counter() - t:.1f}s | device={det.device} | half={settings.model_half and det.cuda}")
print(f"imgsz={settings.model_imgsz} end2end={settings.model_end2end} iou={settings.model_iou} "
      f"max_det={settings.model_max_det} conf={a.conf}\n")

out = Path(a.out)
out.mkdir(exist_ok=True)
counts, gts = [], []
for p in map(Path, a.images):
    data = p.read_bytes()
    raw = Image.open(p)
    exif_orient = raw.getexif().get(0x0112, 1)
    img = imaging.load(data)
    bgr = imaging.to_bgr(img)
    t = time.perf_counter()
    dets = det.predict(bgr)
    ms = (time.perf_counter() - t) * 1000
    keep = dets[dets[:, 4] >= a.conf]
    counts.append(len(keep))
    sizes = sorted(min(x2 - x1, y2 - y1) for x1, y1, x2, y2, _ in keep)
    sweep = "  ".join(f"conf≥{c:.2f}:{int((dets[:, 4] >= c).sum())}" for c in (0.1, 0.15, 0.25, 0.35, 0.5))
    print(f"[{p.name}] gốc {raw.size[0]}x{raw.size[1]} EXIF-orientation={exif_orient} -> đưa vào model {img.size[0]}x{img.size[1]}")
    print(f"  số mụn = {len(keep)} | mức (ảnh này) = {grade(len(keep), settings)['label']} | suy luận {ms:.0f} ms")
    print(f"  {sweep}")
    if sizes:
        print(f"  cạnh ngắn khung (px ảnh gốc): nhỏ nhất {sizes[0]:.0f}, trung vị {sizes[len(sizes) // 2]:.0f}, lớn nhất {sizes[-1]:.0f}")

    gt = load_gt(p, *img.size)
    colors = {i: (60, 60, 255) for i in range(len(keep))}  # đỏ = được đếm
    if gt is not None:
        gts.append(len(gt))
        tp, fp, fn = match(keep, gt)
        colors.update({i: (0, 165, 255) for i in fp})  # cam = báo nhầm
        rec, prec = len(tp) / max(1, len(gt)), len(tp) / max(1, len(keep))
        print(f"  NHÃN GỐC = {len(gt)} | đúng {len(tp)} | báo nhầm {len(fp)} | bỏ sót {len(fn)} "
              f"| precision {prec:.2f} recall {rec:.2f} (IoU>={a.iou})")
        if fn:
            print(f"  cạnh ngắn khung BỎ SÓT: trung vị {np.median(short(gt[fn])):.0f}px | "
                  f"khung ĐÚNG: trung vị {np.median(short(keep[tp])) if tp else 0:.0f}px")
        for x1, y1, x2, y2 in gt[fn]:  # xanh lá = bỏ sót
            cv2.rectangle(bgr, (int(x1), int(y1)), (int(x2), int(y2)), (0, 200, 0), 3)

    lw = max(2, round(max(img.size) / 800))
    for x1, y1, x2, y2, c in dets[dets[:, 4] < a.conf]:  # xám mảnh = dưới ngưỡng
        cv2.rectangle(bgr, (int(x1), int(y1)), (int(x2), int(y2)), (200, 200, 200), 1)
    for i, (x1, y1, x2, y2, c) in enumerate(keep):
        cv2.rectangle(bgr, (int(x1), int(y1)), (int(x2), int(y2)), colors[i], lw)
        cv2.putText(bgr, f"{c:.2f}", (int(x1), int(y1) - 4), cv2.FONT_HERSHEY_SIMPLEX, lw / 3, colors[i], max(1, lw // 2))
    dst = out / f"{p.stem}_{p.suffix[1:]}_boxes.jpg"
    cv2.imwrite(str(dst), bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"  đã lưu: {dst}\n")

print(f"TỔNG {len(counts)} ảnh = {sum(counts)} nốt  (từng ảnh: {counts})")
if gts and len(gts) == len(counts):
    print(f"Nhãn gốc: tổng {sum(gts)} (từng ảnh: {gts})")
print(f"Mức độ chung (SEV_AGGREGATE={settings.sev_aggregate}): {overall(counts, settings)['label']}")
