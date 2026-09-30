import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function AddTitle({ token, titleId, onSaved, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(null);
  const [loading, setLoading] = useState(Boolean(titleId));

  useEffect(() => {
    if (!titleId) return;
    let active = true;
    api(`/titles/${titleId}/edit`, { token })
      .then((result) => { if (active) setTitle(result); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [titleId, token]);

  const submit = async (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const list = (value) => value.split(',').map((s) => s.trim()).filter(Boolean);
    setBusy(true); setError('');
    try {
      const saved = await api(titleId ? `/titles/${titleId}` : '/titles', { method: titleId ? 'PUT' : 'POST', token, body: {
        ...fields, name: fields.name.trim(),
        releaseYear: fields.releaseYear ? Number(fields.releaseYear) : null,
        genres: list(fields.genres), cast: list(fields.cast),
      } });
      onSaved(saved);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  if (loading) return <p className="empty" role="status">Loading title…</p>;
  if (titleId && !title) return <section className="add-title"><p className="error" role="alert">{error || 'Title could not be loaded'}</p><button className="btn" onClick={onCancel}>Back</button></section>;

  return (
    <section className="add-title">
      <h2>{titleId ? 'Edit tile' : 'Add a title'}</h2>
      <p className="meta">Save a movie or series to the catalogue. Separate genres and cast members with commas.</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="field">Title name<input name="name" required maxLength={200} defaultValue={title?.name || ''} /></label>
          <label className="field">Type<select name="type" defaultValue={title?.type || 'movie'}><option value="movie">Movie</option><option value="music">Music Series</option><option value="short">Short</option></select></label>
          <label className="field">Release year<input name="releaseYear" type="number" min="1888" max="2100" defaultValue={title?.releaseYear || ''} /></label>
          <label className="field">Genres<input name="genres" placeholder="Drama, Thriller" defaultValue={title?.genres?.join(', ') || ''} /></label>
          <label className="field">Cast<input name="cast" placeholder="Actor one, Actor two" defaultValue={title?.cast?.join(', ') || ''} /></label>
          <label className="field">Description<textarea name="description" rows={4} maxLength={5000} defaultValue={title?.description || ''} /></label>
          <label className="field">Poster URL (optional)<input name="posterUrl" type="url" placeholder="https://example.com/poster.jpg" defaultValue={title?.posterUrl || ''} /></label>
          <label className="field">Stream URL (optional)<input name="streamUrl" type="url" placeholder="https://example.com/video.m3u8" defaultValue={title?.streamUrl || ''} /></label>
          <label className="field">Required plan<select name="minPlan" defaultValue={title?.minPlan || 'free'}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option></select></label>
          {error && <p className="error" role="alert">{error}</p>}
          <div>
            <button className="btn" type="submit">{busy ? 'Saving…' : titleId ? 'Save changes' : 'Save title'}</button>
            {titleId && <button type="button" onClick={onCancel}>Cancel</button>}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
