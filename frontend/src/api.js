const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const MAX_PHOTOS = 3;

async function req(path, opts) {
  let r;
  try {
    r = await fetch(BASE + path, opts);
  } catch {
    throw new Error('Không kết nối được máy chủ phân tích');
  }
  if (!r.ok) {
    const detail = (await r.json().catch(() => null))?.detail;
    if (typeof detail === 'string') throw new Error(detail);
    throw new Error(r.status >= 500 ? `Máy chủ phân tích chưa sẵn sàng (lỗi ${r.status})` : `Máy chủ trả lỗi ${r.status}`);
  }
  return r.json();
}

export const getConfig = () => req('/api/config');

/** Gửi NGUYÊN ảnh gốc (không thu nhỏ, kể cả HEIC). BE tự xoay EXIF, trả khung + ảnh xem trước đã xoay đúng. */
export function detectPhoto(file) {
  const fd = new FormData();
  fd.append('file', file, file.name || 'photo.jpg');
  return req('/api/detect', { method: 'POST', body: fd });
}

// iOS Safari không vẽ được canvas > ~16,7 MP; model train trên ảnh ~10,7 MP (3112×3456) nên 12,5 MP là đủ chi tiết
const MAX_PX = 12_500_000;
const toJpeg = (c, q) => new Promise((ok) => c.toBlob(ok, 'image/jpeg', q));

/** Ảnh vượt giới hạn upload (Vercel ~4,5 MB) -> nén lại JPEG, GIỮ độ phân giải (chỉ thu khi > MAX_PX).
 *  Trình duyệt tự xoay theo EXIF khi vẽ, nên ảnh gửi đi đã đúng chiều. Ảnh đủ nhỏ thì gửi nguyên gốc. */
export async function fitUpload(file, maxMB) {
  const limit = maxMB * 1024 * 1024 * 0.95;
  if (file.size <= limit) return file;
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`Ảnh ${(file.size / 1048576).toFixed(1)} MB quá lớn và trình duyệt không mở được để nén (thường gặp với HEIC). Hãy chụp ở định dạng JPG: Cài đặt → Camera → Định dạng → Tương thích nhất.`);
  }
  const k = Math.min(1, Math.sqrt(MAX_PX / (bmp.width * bmp.height)));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  for (const q of [0.92, 0.85, 0.78, 0.7]) {
    const blob = await toJpeg(c, q);
    if (blob && blob.size <= limit) return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  throw new Error(`Ảnh quá lớn, không nén được xuống dưới ${maxMB} MB.`);
}

export const sendChat = (counts, note, messages) =>
  req('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counts, note, messages }),
  });

export const getAdvice = (counts, note) =>
  req('/api/advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counts, note }),
  });
