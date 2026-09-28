import { useState } from 'react';
import { api } from './api.js';

export default function AddTitle({ token, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const list = (value) => value.split(',').map((s) => s.trim()).filter(Boolean);
    setBusy(true); setError('');
    try {
      const title = await api('/titles', { method: 'POST', token, body: {
        ...fields, name: fields.name.trim(),
        releaseYear: fields.releaseYear ? Number(fields.releaseYear) : undefined,
        genres: list(fields.genres), cast: list(fields.cast),
      } });
      onSaved(title);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return (
    <section className="add-title">
      <h2>Add a title</h2>
      <p className="meta">Save a movie or series to the catalogue. Separate genres and cast members with commas.</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label className="field">Title name<input name="name" required maxLength={200} /></label>
          <label className="field">Type<select name="type"><option value="movie">Movie</option><option value="series">Series</option></select></label>
          <label className="field">Release year<input name="releaseYear" type="number" min="1888" max="2100" /></label>
          <label className="field">Genres<input name="genres" placeholder="Drama, Thriller" /></label>
          <label className="field">Cast<input name="cast" placeholder="Actor one, Actor two" /></label>
          <label className="field">Description<textarea name="description" rows={4} maxLength={5000} /></label>
          <label className="field">Poster URL (optional)<input name="posterUrl" type="url" placeholder="https://example.com/poster.jpg" /></label>
          <label className="field">Stream URL (optional)<input name="streamUrl" type="url" placeholder="https://example.com/video.m3u8" /></label>
          <label className="field">Required plan<select name="minPlan"><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option></select></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit">{busy ? 'Saving…' : 'Save title'}</button>
        </fieldset>
      </form>
    </section>
  );
}
