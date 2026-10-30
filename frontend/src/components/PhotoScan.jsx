import { useRef, useState } from 'react';
import { MAX_PHOTOS } from '../api.js';
import Icon from './Icon.jsx';

// Model train trên ảnh nửa mặt chụp cận nên gợi ý mỗi ảnh một bên, không chồng lên nhau
export const HINTS = ['Nửa mặt trái', 'Nửa mặt phải', 'Vùng còn lại (trán / cằm)'];
export const ACCEPT = 'image/*,.heic,.heif';

function Shot({ p, i, conf, onRemove }) {
  const boxes = p.boxes || [];
  return (
    <figure className="shot">
      {p.preview && (
        <div className="shot-img" style={{ '--ar': p.w / p.h }}>
          <img src={p.preview} alt={`Ảnh ${i + 1}`} />
          {boxes.map(([x1, y1, x2, y2, c], k) => c >= conf && (
            <i key={k} className="box" style={{ left: `${x1 * 100}%`, top: `${y1 * 100}%`, width: `${(x2 - x1) * 100}%`, height: `${(y2 - y1) * 100}%` }} />
          ))}
        </div>
      )}
      <figcaption>
        <span>Ảnh {i + 1}</span>
        {p.status === 'done' && <b>{boxes.filter((b) => b[4] >= conf).length} nốt</b>}
      </figcaption>
      <button className="shot-x" onClick={() => onRemove(p.id)} aria-label={`Xóa ảnh ${i + 1}`}><Icon name="x" size={16} /></button>
      {p.status === 'loading' && <div className="shot-busy"><span className="spin" />Đang đếm nốt mụn…</div>}
      {p.status === 'error' && <div className="shot-busy err">{p.error}</div>}
    </figure>
  );
}

export default function PhotoScan({ photos, conf, onAdd, onRemove }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const full = photos.length >= MAX_PHOTOS;
  const pick = () => input.current?.click();

  return (
    <section
      className={`photos ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { if (!full) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onAdd([...e.dataTransfer.files]); }}
    >
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { onAdd([...e.target.files]); e.target.value = ''; }} />
      <div className="photos-head">
        <div>
          <h2>Ảnh da mặt của bạn</h2>
          <small>Ít nhất 1, tối đa {MAX_PHOTOS} ảnh · đã có {photos.length}/{MAX_PHOTOS}</small>
        </div>
        <button className="btn primary" onClick={pick} disabled={full}><Icon name="upload" size={18} />Chụp / chọn ảnh</button>
      </div>

      <div className="shots">
        {HINTS.map((hint, i) =>
          photos[i] ? (
            <Shot key={photos[i].id} p={photos[i]} i={i} conf={conf} onRemove={onRemove} />
          ) : (
            <button key={hint} className="slot" onClick={pick}>
              <span className="ico"><Icon name={i === photos.length ? 'plus' : 'image'} /></span>
              <b>Thêm ảnh {i + 1}</b>
              <small>Gợi ý: {hint.toLowerCase()}{i === 0 ? ' (bắt buộc)' : ''}</small>
            </button>
          ),
        )}
      </div>

      <p className="photos-note">
        <Icon name="bulb" size={16} />
        Mỗi ảnh chụp một vùng mặt riêng, để một bên má chiếm gần hết khung. Tổng số mụn là cộng các ảnh lại, nên ảnh chồng lên nhau thì có nốt sẽ bị đếm hai lần.
      </p>
    </section>
  );
}
