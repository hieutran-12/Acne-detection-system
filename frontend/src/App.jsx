import { useEffect } from 'react';
import Nav from './components/Nav.jsx';
import Home from './components/Home.jsx';
import ScanPage from './components/ScanPage.jsx';
import { useReveal } from './hooks/useReveal.js';
import { useRoute } from './hooks/useRoute.js';

const ANCHORS = { '/dich-vu': 'dich-vu', '/quy-trinh': 'quy-trinh', '/cau-hoi': 'cau-hoi', '/lien-he': 'lien-he' };

export default function App() {
  const route = useRoute();
  const scan = route === '/kham';
  useReveal(scan);

  useEffect(() => {
    const el = ANCHORS[route] && document.getElementById(ANCHORS[route]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <>
      <Nav route={route} />
      {scan ? <ScanPage /> : <Home />}
    </>
  );
}
