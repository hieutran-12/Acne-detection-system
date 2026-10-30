// Chụp 1 ảnh tĩnh độ phân giải cao từ camera trình duyệt.
// Chỉ bản xem trước bị lật gương, ảnh chụp thì không, nên khung luôn khớp với ảnh hiển thị.

const BURST = 6;
const GAP_MS = 90;

const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const withTimeout = (p, ms) => Promise.race([p, wait(ms).then(() => { throw new Error('timeout'); })]);
const toBlob = (c) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('blob'))), 'image/jpeg', 0.95));

/** Độ nét: phương sai Laplacian ở vùng giữa ảnh, thu nhỏ cho nhanh. Số càng lớn càng nét. */
function sharpness(src) {
  const S = 320;
  const c = document.createElement('canvas');
  const cw = src.width * 0.6, ch = src.height * 0.6;
  c.width = S;
  c.height = Math.round((S * ch) / cw);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, src.width * 0.2, src.height * 0.2, cw, ch, 0, 0, c.width, c.height);
  const { data, width: w, height: h } = g.getImageData(0, 0, c.width, c.height);
  const y = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) y[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  let n = 0, sum = 0, sq = 0;
  for (let r = 1; r < h - 1; r++) {
    for (let k = 1; k < w - 1; k++) {
      const i = r * w + k;
      const l = y[i - 1] + y[i + 1] + y[i - w] + y[i + w] - 4 * y[i];
      sum += l; sq += l * l; n++;
    }
  }
  return sq / n - (sum / n) ** 2;
}

async function burst(video) {
  let best = null, bestScore = -1;
  for (let i = 0; i < BURST; i++) {
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const s = sharpness(c);
    if (s > bestScore) { best = c; bestScore = s; }
    await wait(GAP_MS);
  }
  return best;
}

/** Trả về File JPEG. Ưu tiên ImageCapture.takePhoto, không có thì lấy khung nét nhất. */
export async function captureStill(video, track) {
  const name = `camera-${Date.now()}.jpg`;
  if (track && 'ImageCapture' in window) {
    try {
      const blob = await withTimeout(new window.ImageCapture(track).takePhoto(), 5000);
      const bmp = await createImageBitmap(blob);
      const big = bmp.width * bmp.height >= video.videoWidth * video.videoHeight;
      bmp.close();
      if (big) return new File([blob], name, { type: blob.type || 'image/jpeg' });
    } catch {
      // trình duyệt hoặc camera không hỗ trợ takePhoto thì dùng khung hình video
    }
  }
  return new File([await toBlob(await burst(video))], name, { type: 'image/jpeg' });
}
