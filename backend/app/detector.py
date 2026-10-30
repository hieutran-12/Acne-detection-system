from pathlib import Path

import numpy as np


def dedup(b: np.ndarray, iou_thr: float, contain_thr: float) -> np.ndarray:
    """Bỏ khung trùng: duyệt conf giảm dần, bỏ khung có IoU >= iou_thr hoặc nằm >= contain_thr diện tích
    trong một khung conf cao hơn đã giữ. Khung đứng riêng thì giữ lại, kể cả khi nhãn không có.
    Mỗi khung chỉ phụ thuộc các khung conf cao hơn nó, nên FE lọc ngưỡng sau đó vẫn ra kết quả như lọc lại từ đầu."""
    if len(b) < 2 or (iou_thr <= 0 and contain_thr <= 0):
        return b
    b = b[np.argsort(-b[:, 4])]
    area = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
    keep: list[int] = []
    for i in range(len(b)):
        if keep:
            k = np.array(keep)
            iw = np.clip(np.minimum(b[i, 2], b[k, 2]) - np.maximum(b[i, 0], b[k, 0]), 0, None)
            ih = np.clip(np.minimum(b[i, 3], b[k, 3]) - np.maximum(b[i, 1], b[k, 1]), 0, None)
            inter = iw * ih
            iou = inter / (area[i] + area[k] - inter)
            contain = inter / np.minimum(area[i], area[k])
            if (iou_thr > 0 and (iou >= iou_thr).any()) or (contain_thr > 0 and (contain >= contain_thr).any()):
                continue
        keep.append(i)
    return b[keep]


class Detector:
    """YOLO26m, nạp một lần lúc khởi động. Chỉ có 1 lớp "acne" nên chỉ đếm, không phân loại."""

    def __init__(self, s):
        import torch
        from ultralytics import YOLO

        self.s = s
        if not Path(s.model_weights).exists():
            raise FileNotFoundError(f"Không thấy weights: {s.model_weights}. Sửa MODEL_WEIGHTS trong backend/.env")
        self.device = s.model_device or ("0" if torch.cuda.is_available() else "cpu")
        self.cuda = self.device != "cpu" and torch.cuda.is_available()
        self.model = YOLO(s.model_weights)
        self.predict(np.zeros((640, 480, 3), np.uint8))  # chạy thử để request đầu không bị chậm

    def predict(self, bgr: np.ndarray) -> np.ndarray:
        """Trả mảng (N, 5) gồm x1, y1, x2, y2, conf theo pixel ảnh vào, conf >= CONF_FLOOR, đã bỏ khung trùng."""
        s = self.s
        r = self.model.predict(
            bgr, imgsz=s.model_imgsz, conf=s.conf_floor, iou=s.model_iou, max_det=s.model_max_det,
            nms=False if s.model_end2end else None,  # chính là end2end=True, tên cũ bị deprecated ở 8.4
            quantize=16 if (s.model_half and self.cuda) else None,  # chính là half=True
            device=self.device, verbose=False,
        )[0]
        b = np.c_[r.boxes.xyxy.cpu().numpy(), r.boxes.conf.cpu().numpy()]
        return dedup(b, s.dedup_iou, s.dedup_contain)
