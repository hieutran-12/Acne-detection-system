import { useEffect, useRef, useState } from 'react';
import { MAX_PHOTOS, detectPhoto, fitUpload, getAdvice, getConfig } from '../api.js';
import { captureStill } from '../capture.js';
import { BOOKING_URL } from '../config.js';
import { useCamera } from '../hooks/useCamera.js';
import { AGGREGATE_TEXT, DEFAULT_CFG, countAt, levelFor, overallLevel } from '../severity.js';
import Icon from './Icon.jsx';
import PhotoScan, { HINTS } from './PhotoScan.jsx';
import Stage from './Stage.jsx';
import { AiBlock, LevelTable, Ring, colorOf } from './Report.jsx';

const STEPS = {
  photo: ['Chụp / chọn ảnh', 'AI đếm nốt mụn', 'AI nhận xét', 'Xem kết quả'],
  camera: ['Bật camera & chụp', 'AI đếm nốt mụn', 'AI nhận xét', 'Xem kết quả'],
};
const TIPS = {
  photo: [
    ['frame', 'Chụp cận nửa mặt', 'Một bên má chiếm gần hết khung, chạm màn hình để lấy nét'],
    ['sun', 'Ánh sáng đều', 'Ánh sáng tự nhiên, tránh bóng đổ, đèn vàng và flash'],
    ['glasses', 'Không filter, mặt mộc', 'Tắt chế độ làm đẹp / bộ lọc, không trang điểm'],
    ['image', 'Mỗi ảnh một vùng', 'Trái, phải, trán / cằm, không chồng lên nhau'],
  ],
  camera: [
    ['frame', 'Đưa camera lại gần', 'Một bên má chiếm gần hết khung hình'],
    ['sun', 'Ánh sáng đều', 'Tránh ngược sáng, bóng đổ và đèn quá vàng'],
    ['timer', 'Giữ yên khi chụp', 'Ảnh mờ dễ làm bỏ sót mụn nhỏ'],
    ['glasses', 'Không filter, mặt mộc', 'Tắt hiệu ứng làm đẹp của webcam'],
  ],
};
const MODES = [['photo', 'image', 'Tải ảnh lên', 'Khuyên dùng'], ['camera', 'video', 'Chụp bằng camera', '']];
const isImage = (f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name);

export default function ScanPage() {
  const videoRef = useRef(null);
  const nextId = useRef(1);
  const photosRef = useRef([]);
  const [mode, setMode] = useState('photo');
  const [photos, setPhotos] = useState([]);
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [conf, setConf] = useState(DEFAULT_CFG.conf_default);
  const [on, setOn] = useState(false);
  const [facing, setFacing] = useState('user');
  const [deviceId, setDeviceId] = useState('');
  const [shooting, setShooting] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [at, setAt] = useState('');
  const [more, setMore] = useState(false);
  const [msg, setMsg] = useState('');
  photosRef.current = photos;

  const { error, devices, dims, mirror, track } = useCamera(videoRef, { on, facing, deviceId });

  useEffect(() => {
    getConfig().then((c) => { setCfg({ ...DEFAULT_CFG, ...c }); setConf(c.conf_default ?? DEFAULT_CFG.conf_default); }).catch(() => {});
  }, []);

  // Đếm lại ngay trên client theo ngưỡng conf hiện tại (BE đã trả mọi khung >= conf_floor)
  const done = photos.filter((p) => p.status === 'done');
  const counts = done.map((p) => countAt(p.boxes, conf));
  const total = counts.reduce((s, c) => s + c, 0);
  const busy = photos.some((p) => p.status === 'loading');
  const level = overallLevel(counts, cfg.levels, cfg.aggregate);
  const color = colorOf(level.key);
  const ready = done.length > 0 && !busy;
  const stale = result?.data && result.counts.join() !== counts.join();
  const step = !photos.length ? 0 : !result ? 1 : result.loading ? 2 : 3;

  function clearResult() {
    setResult(null);
    setAt('');
    setMore(false);
  }

  async function advise() {
    const cs = counts;
    setMore(false);
    setAt(new Date().toLocaleString('vi-VN'));
    setResult({ counts: cs, loading: true });
    try {
      setResult({ counts: cs, data: await getAdvice(cs, note) });
    } catch (e) {
      setResult({ counts: cs, error: e.message });
    }
  }

  function addPhotos(files) {
    const ok = files.filter(isImage);
    const list = ok.slice(0, MAX_PHOTOS - photosRef.current.length);
    setMsg(
      ok.length < files.length ? 'Có tệp không phải ảnh, đã bỏ qua.'
        : list.length < ok.length ? `Chỉ nhận tối đa ${MAX_PHOTOS} ảnh.` : '',
    );
    if (!list.length) return;
    clearResult();
    const items = list.map((file) => ({ id: nextId.current++, status: 'loading', file }));
    photosRef.current = [...photosRef.current, ...items];
    setPhotos(photosRef.current);
    items.forEach(analyse);
  }

  async function analyse({ id, file }) {
    const patch = (v) => setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...v } : p)));
    try {
      const r = await detectPhoto(await fitUpload(file, cfg.max_upload_mb));
      patch({ status: 'done', file: null, preview: r.preview, w: r.w, h: r.h, boxes: r.boxes, ms: r.ms });
    } catch (e) {
      patch({ status: 'error', file: null, error: e.message });
    }
  }

  function removePhoto(id) {
    clearResult();
    setPhotos((ps) => ps.filter((x) => x.id !== id));
  }

  async function shoot() {
    setShooting(true);
    try {
      addPhotos([await captureStill(videoRef.current, track.current)]);
      if (photosRef.current.length >= MAX_PHOTOS) setOn(false);
    } catch {
      setMsg('Không chụp được ảnh từ camera, hãy thử lại.');
    } finally {
      setShooting(false);
    }
  }

  function again() {
    clearResult();
    setPhotos([]);
    setMsg('');
  }

  function switchMode(m) {
    if (m === mode) return;
    setOn(false);
    setMode(m);
  }

  const ms = done.map((p) => p.ms);
  const sub = at
    ? `Thời gian phân tích: ${at}`
    : busy ? 'Đang đếm nốt mụn trên ảnh…' : done.length ? `Đã phân tích ${done.length} ảnh` : 'Chưa có kết quả';

  return (
    <main className="scan">
      <div className="wrap scan-grid">
        <div className="scan-left">
          <span className="pill">Phân tích da bằng AI</span>
          <h1>Thăm khám da bằng AI</h1>
          <p className="lead">Chụp hoặc tải lên tối đa 3 ảnh cận cảnh da mặt (mỗi ảnh một bên mặt), AI sẽ đếm số nốt mụn trên từng ảnh, đánh giá mức độ và đưa ra gợi ý chăm sóc phù hợp.</p>

          <ol className="stepper">
            {STEPS[mode].map((t, i) => (
              <li key={t} className={i < step ? 'done' : i === step ? 'cur' : ''}>
                <span>{i < step ? <Icon name="check" size={16} /> : i + 1}</span>{t}
              </li>
            ))}
          </ol>

          <div className="modes" role="tablist" aria-label="Cách lấy ảnh">
            {MODES.map(([m, ic, t, tag]) => (
              <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => switchMode(m)}>
                <Icon name={ic} size={18} />{t}{tag && <em>{tag}</em>}
              </button>
            ))}
          </div>

          {mode === 'camera' && (
            <>
              <Stage
                videoRef={videoRef} on={on} error={error} dims={dims} mirror={mirror} canFlip={devices.length > 1}
                shooting={shooting} taken={photos.length} full={photos.length >= MAX_PHOTOS} nextHint={HINTS[photos.length]?.toLowerCase()}
                onStart={() => setOn(true)} onCapture={shoot} onStop={() => setOn(false)}
                onFlip={() => { setDeviceId(''); setFacing((f) => (f === 'user' ? 'environment' : 'user')); }}
              />
              {devices.length > 2 && (
                <label className="devsel">Chọn camera
                  <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                    <option value="">Mặc định</option>
                    {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
                  </select>
                </label>
              )}
            </>
          )}
          <PhotoScan photos={photos} conf={conf} onAdd={addPhotos} onRemove={removePhoto} />
          {msg && <p className="error" role="alert">{msg}</p>}
        </div>

        <div className="below">
          <div className="care">
            <span className="leafbox"><Icon name="leaf" size={24} /></span>
            <h3>Chăm sóc da bắt đầu từ việc hiểu rõ làn da của bạn.</h3>
            <p>Công nghệ AI giúp bạn phát hiện sớm vấn đề về da và nhận được lời khuyên phù hợp.</p>
          </div>
          <div className="tips">
            <h3><Icon name="bulb" size={20} />Hướng dẫn chụp để kết quả chính xác hơn</h3>
            <ul>
              {TIPS[mode].map(([i, t, d]) => (
                <li key={t}><span className="ico"><Icon name={i} /></span><b>{t}</b><small>{d}</small></li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="result">
          <header>
            <span className={`tick ${result?.data ? 'ok' : ''}`}><Icon name="check" size={22} /></span>
            <div><h2>Kết quả phân tích da</h2><small>{sub}</small></div>
            {photos.length > 0 && <button className="btn sm" onClick={again}><Icon name="refresh" size={16} />Làm lại</button>}
          </header>

          <div className="summary">
            <Ring count={total} level={level} levels={cfg.levels} color={color} />
            <div className="sev">
              <small>Mức độ chung</small>
              <b style={{ color }}>{done.length ? level.label : 'Chờ ảnh'}</b>
              <LevelTable levels={cfg.levels} activeKey={level.key} />
            </div>
          </div>

          {photos.length > 0 && (
            <ul className="breakdown">
              {photos.map((p, i) => {
                const c = p.status === 'done' ? countAt(p.boxes, conf) : 0;
                return (
                  <li key={p.id}>
                    <span>Ảnh {i + 1}</span>
                    <b>{p.status === 'done' ? `${c} nốt · ${levelFor(c, cfg.levels).label}` : p.status === 'loading' ? 'Đang đếm…' : 'Lỗi'}</b>
                  </li>
                );
              })}
              <li className="sum"><span>Tổng cộng</span><b>{total} nốt</b></li>
            </ul>
          )}

          {done.length > 0 && (
            <p className="fine">
              {AGGREGATE_TEXT[cfg.aggregate]} Thang mức độ áp cho từng ảnh, không áp lên tổng.
              {done.length > 1 && ' Nếu các ảnh chụp chồng lên nhau, một nốt mụn có thể bị đếm hai lần trong tổng.'}
            </p>
          )}

          {cfg.show_conf_slider && (
            <details className="conf">
              <summary>Ngưỡng tin cậy: <b>{+conf.toFixed(3)}</b></summary>
              <input
                type="range" min={cfg.conf_floor} max={0.9} step={0.005} value={conf}
                onChange={(e) => setConf(Number(e.target.value))} aria-label="Ngưỡng tin cậy"
              />
              <div>
                <small>Chỉ đếm khung có độ tin cậy ≥ ngưỡng. Thấp: đếm nhiều hơn, dễ nhầm. Cao: chắc chắn hơn, dễ bỏ sót.{ms.length > 0 && ` Suy luận: ${ms.join(' / ')} ms.`}</small>
                {conf !== cfg.conf_default && <button className="btn sm" onClick={() => setConf(cfg.conf_default)}>Mặc định {cfg.conf_default}</button>}
              </div>
            </details>
          )}

          {!(result?.data && !stale) && (
            <>
              <label className="note">Ghi chú cho AI (không bắt buộc)
                <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: da dầu, mụn xuất hiện 2 tuần nay" />
              </label>
              <button className="btn primary wide" onClick={advise} disabled={!ready || result?.loading}>
                <Icon name="sparkle" size={18} />{busy ? 'Đang đếm nốt mụn…' : stale ? 'Số mụn đã đổi, phân tích lại' : 'Phân tích & nhận lời khuyên'}
              </button>
            </>
          )}

          <AiBlock
            result={result} more={more} setMore={setMore}
            hint={mode === 'photo'
              ? 'Thêm ít nhất 1 ảnh rồi bấm “Phân tích & nhận lời khuyên”, AI sẽ nhận xét và đề xuất cách chăm sóc.'
              : 'Bật camera, chụp 1–3 ảnh rồi bấm “Phân tích & nhận lời khuyên”.'}
          />

          <p className="disclaimer"><Icon name="shield" size={16} />Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.</p>

          <a className="btn outline wide" href={BOOKING_URL}><Icon name="calendar" size={18} />Đặt lịch tư vấn với bác sĩ da liễu <Icon name="arrow" size={16} /></a>
        </aside>
      </div>
    </main>
  );
}
