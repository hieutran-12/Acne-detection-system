import Icon from './Icon.jsx';

const LOW_RES = 1920; // cạnh dài camera dưới mức này -> khuyên dùng ảnh chụp từ ứng dụng camera

export default function Stage({ videoRef, on, error, dims, mirror, canFlip, shooting, taken, full, nextHint, onStart, onCapture, onFlip, onStop }) {
  const live = on && !error;
  const low = dims && Math.max(dims.w, dims.h) < LOW_RES;
  return (
    <section className="stage" aria-label="Camera">
      <div className="viewport" style={{ aspectRatio: dims ? `${dims.w} / ${dims.h}` : '16 / 10' }}>
        <div className={`feed ${mirror ? 'mirror' : ''}`}>
          <video ref={videoRef} playsInline muted />
        </div>

        {live && (
          <>
            <i className="guide" />
            <div className="chip-status">
              {shooting ? <><span className="spin" />Đang chụp, giữ yên…</> : full ? <><Icon name="check" size={16} />Đã đủ ảnh</> : <><Icon name="camera" size={16} />Đã chụp {taken} ảnh</>}
            </div>
            {dims && (
              <div className={`legend res ${low ? 'low' : ''}`}>
                <span>Độ phân giải</span>
                <b>{dims.w}×{dims.h}</b>
                {low && <em>Thấp, dễ bỏ sót mụn nhỏ</em>}
              </div>
            )}
            <p className="hint">{full ? 'Đã đủ ảnh. Xoá bớt ảnh nếu muốn chụp lại.' : `Ảnh tiếp theo: ${nextHint}. Đưa camera lại gần, giữ yên rồi bấm chụp.`}</p>
            <div className="dock">
              <button className="round" onClick={onFlip} disabled={!canFlip || shooting} aria-label="Đổi camera trước/sau"><Icon name="refresh" /></button>
              <button className="shutter" onClick={onCapture} disabled={shooting || full || !dims} aria-label="Chụp ảnh"><Icon name="camera" size={28} /></button>
              <button className="round" onClick={onStop} aria-label="Tắt camera"><Icon name="power" /></button>
            </div>
          </>
        )}

        {!on && (
          <div className="cover">
            <span className="cover-ico"><Icon name="face" size={34} /></span>
            <h2>Chụp ảnh da mặt bằng camera</h2>
            <p>Chụp tối đa 3 ảnh cận cảnh, mỗi ảnh một bên mặt. Ảnh chỉ được gửi để đếm mụn, không lưu lại. Trên điện thoại, “Tải ảnh lên” mở ứng dụng camera gốc sẽ cho ảnh nét hơn.</p>
            <button className="btn primary lg" onClick={onStart}><Icon name="camera" size={20} />Bật camera</button>
          </div>
        )}
        {on && error && (
          <div className="cover">
            <h2>Chưa mở được camera</h2>
            <p>{error}</p>
            <button className="btn primary lg" onClick={onStart}>Thử lại</button>
          </div>
        )}
      </div>
    </section>
  );
}
