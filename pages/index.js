import { useState, useEffect, useRef } from 'react';

const LAUNCH = new Date('2026-11-19T00:00:00-05:00');

function pad(n) {
  return String(n).padStart(2, '0');
}

function Countdown() {
  const [t, setT] = useState(LAUNCH - Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(LAUNCH - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (t <= 0) {
    return (
      <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 'clamp(3rem,10vw,7rem)', color: '#FF2E88' }}>
        IT&apos;S OUT.
      </div>
    );
  }
  const d = Math.floor(t / 864e5);
  const h = Math.floor(t / 36e5) % 24;
  const m = Math.floor(t / 6e4) % 60;
  const s = Math.floor(t / 1e3) % 60;
  const units = [[d, 'DAYS'], [pad(h), 'HRS'], [pad(m), 'MIN'], [pad(s), 'SEC']];
  return (
    <div style={{ display: 'flex', gap: 'clamp(14px,4vw,36px)', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
      {units.map(([v, label]) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 'clamp(3.2rem, 11vw, 7.5rem)', lineHeight: 1, color: '#FFF', textShadow: '0 0 22px rgba(255,46,136,.85)' }}>
            {v}
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, letterSpacing: '0.35em', color: '#00E5FF', marginTop: 6 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ViceWire() {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const fetchedOnce = useRef(false);

  async function loadNews() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/gta6-news.json');
      if (!response.ok) throw new Error('Feed not ready');
      const items = await response.json();
      setNews(items);
      setUpdatedAt(new Date());
    } catch (e) {
      console.error(e);
      setError('Could not load the wire. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      loadNews();
      const interval = setInterval(loadNews, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const tagColor = { OFFICIAL: '#00E5FF', NEWS: '#FFB347', RUMOR: '#FF2E88', BUSINESS: '#B9B3D9' };

  return (
    <div style={{ background: '#0A0A1F', minHeight: '100vh', color: '#F5F0FF', fontFamily: "'Space Grotesk', sans-serif", overflowX: 'hidden' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900&family=Space+Grotesk:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A1F; }
      `}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '20px clamp(16px,5vw,48px)', borderBottom: '1px solid #14142E' }}>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: '0.08em' }}>
          VICE<span style={{ color: '#FF2E88' }}>WIRE</span>
        </div>
        <div style={{ fontSize: 11, color: '#B9B3D9', letterSpacing: '0.2em' }}>UNOFFICIAL GTA VI TRACKER</div>
      </header>

      <section style={{ position: 'relative', textAlign: 'center', padding: 'clamp(48px,9vw,96px) 16px', overflow: 'hidden', borderBottom: '1px solid #14142E' }}>
        <p style={{ letterSpacing: '0.4em', fontSize: 12, color: '#FFB347', marginBottom: 26 }}>
          NOVEMBER 19, 2026 · PS5 &amp; XBOX SERIES X|S
        </p>
        <Countdown />
        <p style={{ marginTop: 34, color: '#B9B3D9', fontSize: 14 }}>
          until the biggest launch in entertainment history
        </p>
      </section>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px clamp(16px,5vw,48px) 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700, fontSize: 30, letterSpacing: '0.06em' }}>
            THE WIRE <span style={{ color: '#00E5FF', fontSize: 14, verticalAlign: 'middle' }}>● LIVE</span>
          </h2>
          <button onClick={loadNews} disabled={loading} style={{ background: 'transparent', color: '#00E5FF', border: '1px solid #00E5FF', padding: '8px 18px', borderRadius: 999, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.1em' }}>
            {loading ? 'SCANNING…' : 'REFRESH'}
          </button>
        </div>

        {updatedAt && !loading && (
          <p style={{ fontSize: 12, color: '#B9B3D9', marginBottom: 18 }}>
            Updated {updatedAt.toLocaleTimeString()}
          </p>
        )}

        {loading && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#FF2E88', fontFamily: "'Big Shoulders Display', sans-serif", fontSize: 22, letterSpacing: '0.2em' }}>
            SCANNING THE WIRE…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 24, border: '1px solid #FF2E88', borderRadius: 12, color: '#FF9AC5' }}>{error}</div>
        )}

        {news && !loading && news.map((item, i) => (
          <article key={i} style={{ background: '#14142E', border: '1px solid #1F1F44', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: tagColor[item.tag] || '#B9B3D9', border: `1px solid ${tagColor[item.tag] || '#B9B3D9'}`, borderRadius: 999, padding: '3px 10px' }}>
                {item.tag}
              </span>
              <span style={{ fontSize: 12, color: '#B9B3D9' }}>{item.source} · {item.date}</span>
            </div>
            <h3 style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '0.03em', marginBottom: 6 }}>{item.title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#D8D3EE' }}>{item.summary}</p>
          </article>
        ))}
      </main>

      <footer style={{ borderTop: '1px solid #14142E', padding: '26px 16px', textAlign: 'center', fontSize: 12, color: '#B9B3D9', lineHeight: 1.8 }}>
        VICEWIRE is a fan-made tracker. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.
      </footer>
    </div>
  );
}
