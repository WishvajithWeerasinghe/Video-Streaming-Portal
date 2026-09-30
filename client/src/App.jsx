import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { api } from './api.js';
import AuthPage from './AuthPage.jsx';
import AddTitle from './AddTitle.jsx';

const hue = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const Poster = ({ t }) => (
  <div className="poster" style={{ background: `linear-gradient(160deg, hsl(${hue(t.name)} 55% 40%), hsl(${(hue(t.name) + 60) % 360} 45% 14%))` }}>
    {t.posterUrl && <img src={t.posterUrl} alt="" />}
    <span>{t.name}</span>
  </div>
);
const PLANS = [
  { id: 'free', price: 'Free', note: 'Selected titles, no card needed' },
  { id: 'basic', price: '$5 / month', note: 'Everything in Free, plus the Basic library' },
  { id: 'premium', price: '$9 / month', note: 'The full catalog, including new releases' },
];

function PosterRow({ items, reverse, open }) {
  if (!items.length) return null;
  let row = [...items];
  while (row.length < 10) row = [...row, ...items];
  const loop = [...row, ...row];
  return (
    <div className="marquee-row">
      <div className={'marquee-track' + (reverse ? ' reverse' : '')}>
        {loop.map((t, i) => (
          <button key={t._id + '-' + i} className="marquee-item" onClick={() => open(t._id)} tabIndex={i < row.length ? 0 : -1} aria-hidden={i >= row.length}>
            <Poster t={t} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Browse({ open, go, user }) {
  const [featured, setFeatured] = useState([]);
  useEffect(() => {
    document.body.classList.add('home-page');
    return () => document.body.classList.remove('home-page');
  }, []);

  const [q, setQ] = useState(''), [genre, setGenre] = useState(''), [page, setPage] = useState(1);
  const [genres, setGenres] = useState([]), [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    api('/titles/meta/genres').then(setGenres).catch(() => {});
    api('/titles').then((r) => setFeatured(r.items)).catch(() => {});
  }, []);
  const toLibrary = () => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const id = setTimeout(() => {
      const p = new URLSearchParams({ page });
      if (q) p.set('q', q);
      if (genre) p.set('genre', genre);
      api('/titles?' + p).then((result) => { if (active) setData(result); }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(id); };
  }, [q, genre, page, retry]);
  return (
    <>
      <section className="hero">
        <span className="badge">Your all-in-one streaming portal</span>
        <h1>
          Every movie &amp; series you want,
          <br />
          <span className="grad">streaming in seconds.</span>
        </h1>
        <p className="hero-sub">Browse by genre, search by title, actor or plot, and pick up where you left off on any device.</p>
        <div className="hero-cta">
          <button className="btn btn-lg" onClick={() => (user ? toLibrary() : go('auth'))}>{user ? 'Start watching' : 'Get started'}</button>
          <button className="btn-ghost" onClick={toLibrary}>Explore the library</button>
        </div>
        {featured.length > 0 && (
          <div className="marquee">
            <PosterRow items={featured} open={open} />
            <PosterRow items={[...featured].reverse()} reverse open={open} />
          </div>
        )}
      </section>
      <section id="library" className="finder">
        <input className="search" placeholder="Search by title, actor or plot" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <div className="chips">
          {['', ...genres].map((g) => (
            <button key={g} className={g === genre ? 'chip on' : 'chip'} onClick={() => { setGenre(g); setPage(1); }}>{g || 'All'}</button>
          ))}
        </div>
      </section>
      {loading ? <p className="empty" role="status">Loading titles…</p> : error ? <div role="alert"><p className="error">Could not load titles: {error}</p><button className="btn" onClick={() => setRetry(retry + 1)}>Try again</button></div> : data.items.length === 0 ? <p className="empty">{q || genre ? 'No titles match. Try a different word or clear the genre filter.' : 'No titles yet. Add a title using an admin account or load the sample catalogue.'}</p> : (
        <div className="grid">
          {data.items.map((t) => (
            <button key={t._id} className="card" onClick={() => open(t._id)}>
              <Poster t={t} />
              <strong>{t.name}</strong>
              <small>{t.releaseYear} · {t.genres.join(', ')}{t.minPlan !== 'free' && <em className="tier">{t.minPlan}</em>}</small>
            </button>
          ))}
        </div>
      )}
      {!loading && !error && data.pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}

function Player({ url, start, onProgress }) {
  const ref = useRef();
  useEffect(() => {
    const v = ref.current; let hls;
    if (Hls.isSupported() && url.includes('.m3u8')) { hls = new Hls(); hls.loadSource(url); hls.attachMedia(v); } else v.src = url;
    v.onloadedmetadata = () => { if (start) v.currentTime = start; };
    const iv = setInterval(() => { if (!v.paused) onProgress(Math.floor(v.currentTime)); }, 10000);
    return () => { clearInterval(iv); if (v.currentTime > 0) onProgress(Math.floor(v.currentTime)); hls?.destroy(); };
  }, [url]);
  return <video ref={ref} controls autoPlay playsInline />;
}

function Detail({ id, token, go }) {
  const [t, setT] = useState(), [stream, setStream] = useState(), [err, setErr] = useState('');
  useEffect(() => { setStream(); setErr(''); api('/titles/' + id).then(setT).catch((e) => setErr(e.message)); }, [id]);
  const play = async () => {
    if (!token) return go('auth');
    try { setStream(await api(`/titles/${id}/stream`, { token })); setErr(''); } catch (e) { setErr(e.message); }
  };
  const save = (s) => api(`/watch/${id}`, { method: 'PUT', body: { progressSeconds: s }, token }).catch(() => {});
  if (!t) return <p className="empty">{err || 'Loading…'}</p>;
  return (
    <div className="detail">
      {stream ? <Player url={stream.url} start={stream.resume} onProgress={save} /> : <Poster t={t} />}
      <div>
        <h2>{t.name}</h2>
        <p className="meta">{t.releaseYear} · {t.type === 'series' ? 'Series' : 'Movie'} · {t.genres.join(', ')}</p>
        <p>{t.description}</p>
        <p className="meta">Starring {t.cast.join(', ')}</p>
        {!stream && <button className="btn" onClick={play}>{token ? 'Play' : 'Log in to play'}</button>}
        {err && <p className="error">{err} {err.includes('plan') && <a href="#" onClick={(e) => { e.preventDefault(); go('plans'); }}>See plans</a>}</p>}
      </div>
    </div>
  );
}

function Plans({ token, go, notify }) {
  const [plan, setPlan] = useState('free');
  useEffect(() => { if (token) api('/subscription', { token }).then((d) => setPlan(d.plan)); }, [token]);
  const choose = async (p) => {
    if (!token) return go('auth');
    try {
      const d = p === 'free' ? await api('/subscription', { method: 'DELETE', token }) : await api('/subscription', { method: 'POST', body: { plan: p }, token });
      setPlan(d.plan); notify(p === 'free' ? 'Subscription cancelled' : `Subscribed to ${p}`);
    } catch (e) { notify(e.message); }
  };
  return (
    <>
      <h2>Choose a plan</h2>
      <div className="plans">
        {PLANS.map((p) => (
          <div key={p.id} className={'plan' + (p.id === plan ? ' current' : '')}>
            <h3>{p.id[0].toUpperCase() + p.id.slice(1)}</h3>
            <p className="price">{p.price}</p><p>{p.note}</p>
            <button className="btn" disabled={p.id === plan} onClick={() => choose(p.id)}>
              {p.id === plan ? 'Current plan' : p.id === 'free' ? 'Cancel subscription' : `Subscribe to ${p.id}`}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function History({ token, open, go }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { token ? api('/watch', { token }).then(setRows) : go('auth'); }, [token]);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <>
      <h2>Continue watching</h2>
      {rows.length === 0 ? <p className="empty">Nothing here yet. Start a title and it will appear here.</p> : (
        <div className="grid">
          {rows.filter((r) => r.titleId).map((r) => (
            <button key={r._id} className="card" onClick={() => open(r.titleId._id)}>
              <Poster t={r.titleId} /><strong>{r.titleId.name}</strong><small>Stopped at {fmt(r.progressSeconds)}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.token || '');
  const [user, setUser] = useState(JSON.parse(localStorage.user || 'null'));
  const [view, setView] = useState({ name: 'browse' });
  const [toast, setToast] = useState('');
  const go = (name, id) => setView({ name, id });
  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const onAuth = (d) => {
    setToken(d.token); setUser(d.user); localStorage.token = d.token; localStorage.user = JSON.stringify(d.user);
    go('browse'); notify('Logged in as ' + d.user.email);
  };
  const logout = () => { localStorage.clear(); setToken(''); setUser(null); go('browse'); notify('Logged out'); };
  return (
    <>
      <header>
        <button className="logo" onClick={() => go('browse')}>Reelhouse</button>
        <nav>
          <button onClick={() => go('browse')}>Browse</button>
          <button onClick={() => go('history')}>Continue watching</button>
          <button onClick={() => go('plans')}>Plans</button>
          {user?.role === 'admin' && <button onClick={() => go('add-title')}>Add title</button>}
          {user ? <button onClick={logout}>Log out ({user.email})</button> : <button className="btn sm" onClick={() => go('auth')}>Log in</button>}
        </nav>
      </header>
      <main>
        {view.name === 'browse' && <Browse open={(id) => go('title', id)} go={go} user={user} />}
        {view.name === 'title' && <Detail id={view.id} token={token} go={go} />}
        {view.name === 'plans' && <Plans token={token} go={go} notify={notify} />}
        {view.name === 'history' && <History token={token} go={go} open={(id) => go('title', id)} />}
        {view.name === 'add-title' && user?.role === 'admin' && <AddTitle token={token} onSaved={(t) => { go('title', t._id); notify('Title saved to the catalogue'); }} />}
        {view.name === 'auth' && <AuthPage onAuth={onAuth} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

