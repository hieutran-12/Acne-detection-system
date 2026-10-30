// Chép logic từ backend/app/severity.py để kéo thanh ngưỡng là đếm lại ngay, không phải gọi model.
// Sửa một bên thì sửa cả bên kia.

export const DEFAULT_CFG = {
  levels: [
    { key: 'mild', label: 'Nhẹ', max: 5 },
    { key: 'moderate', label: 'Trung bình', max: 20 },
    { key: 'severe', label: 'Nặng', max: null },
  ],
  aggregate: 'max',
  conf_default: 0.175,
  conf_floor: 0.05,
  show_conf_slider: true,
  max_upload_mb: 30,
};

const CLEAR = { key: 'clear', label: 'Không phát hiện mụn' };

/** boxes: [x1, y1, x2, y2, conf] */
export const countAt = (boxes, conf) => boxes.filter((b) => b[4] >= conf).length;

export function levelFor(count, levels) {
  if (count <= 0) return CLEAR;
  return levels.find((l) => l.max == null || count <= l.max);
}

/** Mức độ chung của nhiều ảnh. Không xếp mức trên tổng vì mỗi ảnh chỉ khoảng nửa mặt. */
export function overallLevel(counts, levels, aggregate) {
  if (!counts.length) return CLEAR;
  if (aggregate === 'mean') return levelFor(counts.reduce((s, c) => s + c, 0) / counts.length, levels);
  const order = ['clear', ...levels.map((l) => l.key)];
  return counts.map((c) => levelFor(c, levels)).reduce((a, b) => (order.indexOf(b.key) > order.indexOf(a.key) ? b : a));
}

export const AGGREGATE_TEXT = {
  max: 'Mức độ chung = mức cao nhất trong các ảnh.',
  mean: 'Mức độ chung xếp theo số mụn trung bình mỗi ảnh.',
};
