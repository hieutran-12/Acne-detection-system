AGGREGATES = ("max", "mean")


def levels(s):
    """Thang Hayashi rút gọn, áp cho từng ảnh (nửa mặt)."""
    return [
        {"key": "mild", "label": "Nhẹ", "max": s.sev_mild_max},
        {"key": "moderate", "label": "Trung bình", "max": s.sev_moderate_max},
        {"key": "severe", "label": "Nặng", "max": None},
    ]


def grade(count: float, s) -> dict:
    if count <= 0:
        return {"key": "clear", "label": "Không phát hiện mụn"}
    for lv in levels(s):
        if lv["max"] is None or count <= lv["max"]:
            return {"key": lv["key"], "label": lv["label"]}


def overall(counts: list[int], s) -> dict:
    """Mức độ chung của nhiều ảnh. Không xếp mức trên tổng, vì cộng 3 ảnh nửa mặt sẽ đẩy mức lên sai."""
    if not counts:
        return grade(0, s)
    if s.sev_aggregate == "mean":
        return grade(sum(counts) / len(counts), s)
    order = ["clear"] + [lv["key"] for lv in levels(s)]
    return max((grade(c, s) for c in counts), key=lambda g: order.index(g["key"]))
