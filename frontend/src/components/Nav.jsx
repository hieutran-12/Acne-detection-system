import { useEffect, useState } from 'react';
import { BOOKING_URL, BRAND, TAGLINE } from '../config.js';
import Icon from './Icon.jsx';

const LINKS = [['/', 'Trang chủ'], ['/kham', 'Thăm khám AI'], ['/dich-vu', 'Dịch vụ'], ['/quy-trinh', 'Quy trình'], ['/cau-hoi', 'Câu hỏi thường gặp']];

export function Logo({ light }) {
  return (
    <a className={`brand ${light ? 'light' : ''}`} href="#/" aria-label={BRAND}>
      <img src="/logo.svg" alt="" width="44" height="44" />
      <span><b>{BRAND}</b><small>{TAGLINE}</small></span>
    </a>
  );
}

export default function Nav({ route }) {
  const [open, setOpen] = useState(false);
  const active = route === '/kham' ? '/kham' : LINKS.some(([p]) => p === route) ? route : '/';
  useEffect(() => setOpen(false), [route]);

  return (
    <nav className={`nav ${open ? 'open' : ''}`}>
      <div className="nav-in">
        <Logo />
        <div className="links" id="nav-links">
          {LINKS.map(([p, t]) => (
            <a key={p} href={`#${p}`} className={active === p ? 'on' : ''} onClick={() => setOpen(false)}>{t}</a>
          ))}
        </div>
        <a className="btn primary nav-book" href={BOOKING_URL}><Icon name="calendar" size={18} /><span>Đặt lịch tư vấn</span></a>
        <button className="burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="nav-links" aria-label="Mở menu">
          <Icon name={open ? 'x' : 'menu'} />
        </button>
      </div>
    </nav>
  );
}
