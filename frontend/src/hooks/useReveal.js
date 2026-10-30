import { useEffect } from 'react';

/** Phần tử class "reveal" hiện dần khi cuộn tới; thêm class "scrolled" cho body khi đã cuộn. */
export function useReveal(dep) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.12 },
    );
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);

  useEffect(() => {
    const on = () => document.body.classList.toggle('scrolled', window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
}
