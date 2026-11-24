import { useEffect, useState } from 'react';

type Slide = { src: string; alt: string; caption?: string };

export default function Carousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(x => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (!n) return null;
  const s = slides[i];
  return (
    <div className="carousel" role="group" aria-roledescription="carousel" aria-label="Miniature photos"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <figure className="slide"><img src={s.src} alt={s.alt} /><figcaption>{s.caption}</figcaption></figure>
      {n > 1 && (
        <div className="ctrl">
          <button className="btn-sm" onClick={() => setI((i - 1 + n) % n)}>Previous</button>
          <div className="dots">
            {slides.map((_, k) => <button key={k} aria-label={`Photo ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} />)}
          </div>
          <button className="btn-sm" onClick={() => setI((i + 1) % n)}>Next</button>
        </div>
      )}
    </div>
  );
}
