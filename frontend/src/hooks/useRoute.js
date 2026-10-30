import { useEffect, useState } from 'react';

const get = () => location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [r, setR] = useState(get);
  useEffect(() => {
    const f = () => setR(get());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}
