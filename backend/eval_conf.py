"""Quét ngưỡng conf trên một thư mục ảnh có nhãn YOLO, để chọn CONF_DEFAULT.

    cd backend
    .venv/Scripts/python eval_conf.py D:/acne04v2/acne04v2_yolo/test/images [--labels DIR]

Model chạy MỘT lần mỗi ảnh ở CONF_FLOOR (đã bỏ khung trùng như web), sau đó lọc lại theo từng ngưỡng.
Nhãn gốc có thể thiếu, nên P/R/F1 chỉ để tham khảo. Nên chú ý độ lệch số đếm, mức độ khớp
và độ ổn định (số đếm thay đổi bao nhiêu khi ngưỡng lệch ±0.05).
Không lưu ảnh, chỉ in bảng.
"""
import argparse
from pathlib import Path

import numpy as np

from app import imaging
from app.config import settings
from app.detector import Detector, dedup
from app.severity import grade

ap = argparse.ArgumentParser()
ap.add_argument("images")
ap.add_argument("--labels", help="mặc định: <images>/../labels")
ap.add_argument("--iou", type=float, default=0.5)
a = ap.parse_args()
img_dir = Path(a.images)
lab_dir = Path(a.labels) if a.labels else img_dir.parent / "labels"


def iou_m(p, g):
    x1 = np.maximum(p[:, None, 0], g[None, :, 0]); y1 = np.maximum(p[:, None, 1], g[None, :, 1])
    x2 = np.minimum(p[:, None, 2], g[None, :, 2]); y2 = np.minimum(p[:, None, 3], g[None, :, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    ap_ = (p[:, 2] - p[:, 0]) * (p[:, 3] - p[:, 1]); ag = (g[:, 2] - g[:, 0]) * (g[:, 3] - g[:, 1])
    return inter / (ap_[:, None] + ag[None, :] - inter)


def tp_count(p, g):
    if not len(p) or not len(g):
        return 0
    m = iou_m(p[np.argsort(-p[:, 4])], g)
    used, tp = set(), 0
    for row in m:
        row = row.copy(); row[list(used)] = 0
        j = int(row.argmax())
        if row[j] >= a.iou:
            used.add(j); tp += 1
    return tp


det = Detector(settings)
print(f"device={det.device} | dedup iou={settings.dedup_iou} contain={settings.dedup_contain} | floor={settings.conf_floor}")
data = []  # (boxes đã dedup, boxes thô, gt)
files = sorted(p for p in img_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".heic"})
for n, p in enumerate(files, 1):
    img = imaging.load(p.read_bytes()); w, h = img.size
    s0 = settings.dedup_iou, settings.dedup_contain
    settings.dedup_iou = settings.dedup_contain = 0  # lấy khung thô một lần, tự bỏ trùng bên dưới để so sánh
    raw = det.predict(imaging.to_bgr(img))
    settings.dedup_iou, settings.dedup_contain = s0
    lf = lab_dir / f"{p.stem}.txt"
    rows = [list(map(float, l.split()[1:5])) for l in lf.read_text().splitlines() if l.strip()] if lf.exists() else []
    g = np.array([[(cx - bw / 2) * w, (cy - bh / 2) * h, (cx + bw / 2) * w, (cy + bh / 2) * h] for cx, cy, bw, bh in rows]).reshape(-1, 4)
    data.append((dedup(raw, *s0), raw, g))
    print(f"\r{n}/{len(files)}", end="", flush=True)
print()

# Kiểm tra: bỏ trùng ở FLOOR rồi lọc ngưỡng == lọc ngưỡng rồi bỏ trùng (FE dựa vào tính chất này)
for t in (0.15, 0.25, 0.4):
    assert all(len(d[d[:, 4] >= t]) == len(dedup(r[r[:, 4] >= t], *s0)) for d, r, _ in data), t

gt_n = np.array([len(g) for _, _, g in data])
lv = lambda c: grade(c, settings)["key"]
print(f"{len(data)} ảnh | tổng nhãn {gt_n.sum()} | mức theo nhãn: " + ", ".join(f"{k}={sum(lv(c) == k for c in gt_n)}" for k in ("clear", "mild", "moderate", "severe")))
print(f"{'conf':>5} {'tổng':>6} {'thô':>6} {'lệch TB':>8} {'MAE':>6} {'mức khớp':>9} {'±1 mức':>7} {'P':>5} {'R':>5} {'F1':>5} {'Δ±0.05':>7}")
order = ["clear", "mild", "moderate", "severe"]
tot = lambda t: sum(int((d[:, 4] >= t).sum()) for d, _, _ in data)
for t in np.round(np.arange(0.10, 0.51, 0.025), 3):
    pn = np.array([int((d[:, 4] >= t).sum()) for d, _, _ in data])
    rawn = sum(int((r[:, 4] >= t).sum()) for _, r, _ in data)
    tp = sum(tp_count(d[d[:, 4] >= t], g) for d, _, g in data)
    P = tp / max(1, pn.sum()); R = tp / max(1, gt_n.sum()); F1 = 2 * P * R / max(1e-9, P + R)
    same = np.mean([lv(x) == lv(y) for x, y in zip(pn, gt_n)])
    near = np.mean([abs(order.index(lv(x)) - order.index(lv(y))) <= 1 for x, y in zip(pn, gt_n)])
    slope = (tot(t - 0.05) - tot(t + 0.05)) / max(1, pn.sum())
    print(f"{t:5.3f} {pn.sum():6d} {rawn:6d} {np.mean(pn - gt_n):+8.2f} {np.mean(abs(pn - gt_n)):6.2f} {same:9.2f} {near:7.2f} {P:5.2f} {R:5.2f} {F1:5.2f} {slope:7.0%}")
