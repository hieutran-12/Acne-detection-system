import { useState } from 'react';
import { sendChat } from '../api.js';
import Icon from './Icon.jsx';

const COLORS = { mild: '#3f9a76', moderate: '#e0a526', severe: '#e0662b', clear: '#3f9a76' };
export const colorOf = (key) => COLORS[key] || '#617b77';

export const rangeOf = (levels, i) => {
  const lo = i === 0 ? 1 : levels[i - 1].max + 1;
  const hi = levels[i].max;
  return hi == null ? `trên ${levels[i - 1].max} nốt` : `${lo}–${hi} nốt`;
};

export function Ring({ count, level, levels, color }) {
  const R = 54, C = 2 * Math.PI * R;
  const f = (levels.findIndex((l) => l.key === level.key) + 1) / levels.length; // vòng đầy theo mức độ chung
  return (
    <div className="ring" role="img" aria-label={`${count} nốt mụn`}>
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} className="bg" />
        <circle cx="70" cy="70" r={R} className="fg" transform="rotate(-90 70 70)" style={{ stroke: color, strokeDasharray: C, strokeDashoffset: C * (1 - f) }} />
      </svg>
      <div><small>Tổng số mụn</small><strong>{count}</strong><small>nốt</small></div>
    </div>
  );
}

export function LevelTable({ levels, activeKey }) {
  return (
    <div className="lv">
      <h4>Thang mức độ</h4>
      <small>Áp cho từng ảnh (~ nửa mặt)</small>
      <ul>
        {levels.map((l, i) => (
          <li key={l.key} className={l.key === activeKey ? 'on' : ''}>
            <i style={{ background: colorOf(l.key) }} /><span>{l.label}</span><b>{rangeOf(levels, i)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MAX_TURNS = 20; // BE nhận tối đa 20 tin gần nhất

export function ChatBox({ counts, note }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next);
    setText('');
    setErr('');
    setSending(true);
    try {
      const { reply } = await sendChat(counts, note, next.slice(-MAX_TURNS));
      setMsgs([...next, { role: 'assistant', content: reply }]);
    } catch (ex) {
      setMsgs(msgs);
      setText(content);
      setErr(ex.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="chat">
      <h4><Icon name="sparkle" size={18} />Hỏi thêm AI tư vấn</h4>
      {msgs.length > 0 && (
        <ul aria-live="polite">
          {msgs.map((m, i) => <li key={i} className={m.role}>{m.content}</li>)}
          {sending && <li className="assistant muted">Đang trả lời…</li>}
        </ul>
      )}
      {err && <p className="error" role="alert">{err}</p>}
      <form onSubmit={send}>
        <textarea
          rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
          placeholder="Ví dụ: mụn của tôi hay đau và lâu lặn, tôi nên chăm sóc thế nào?" aria-label="Tin nhắn cho AI tư vấn"
        />
        <button className="btn primary sm" disabled={sending || !text.trim()}>Gửi <Icon name="arrow" size={14} /></button>
      </form>
    </section>
  );
}

export function AiBlock({ result, more, setMore, hint }) {
  const body = () => {
    if (!result) return <p className="muted">{hint}</p>;
    if (result.loading) return <div className="skeleton"><i /><i /><i style={{ width: '60%' }} /></div>;
    if (result.error) return <p className="error">Không lấy được nhận xét: {result.error}. Hãy thử lại lần nữa.</p>;
    const a = result.data.advice;
    const severe = result.data.severity.key === 'severe'; // mức Nặng thì luôn hiện lời khuyên đi khám, không giấu trong phần chi tiết
    return (
      <>
        <p>{a.summary}</p>
        {severe && a.see_doctor && <p className="urgent" role="alert"><Icon name="calendar" size={18} />{a.see_doctor}</p>}
        {a.routine.length > 0 && (
          <div className="suggest"><b><Icon name="sparkle" size={16} />AI đề xuất:</b><ul>{a.routine.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        )}
        {more && (
          <div className="more-box">
            {a.avoid.length > 0 && <><h5>Nên tránh</h5><ul>{a.avoid.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
            {!severe && a.see_doctor && <><h5>Khi nào nên đi khám</h5><p>{a.see_doctor}</p></>}
          </div>
        )}
        <button className="btn primary sm" onClick={() => setMore(!more)}>{more ? 'Thu gọn' : 'Xem chi tiết phân tích'} <Icon name="arrow" size={14} /></button>
        <p className="fine">{result.data.source === 'llm' ? 'Nhận xét do AI soạn. ' : 'Nhận xét mặc định (chưa cấu hình AI). '}Dựa trên {result.counts.join(' + ')} nốt từ {result.counts.length} ảnh.</p>
      </>
    );
  };
  return (
    <section className="ai" aria-live="polite">
      <h4><Icon name="sparkle" size={18} />Nhận xét từ AI</h4>
      {body()}
    </section>
  );
}
