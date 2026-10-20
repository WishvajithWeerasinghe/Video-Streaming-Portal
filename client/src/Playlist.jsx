import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function Playlist({ token, notify, onPlay, onCreated }) {
  const [titles, setTitles] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [firstPage, savedPlaylists] = await Promise.all([
          api('/titles?page=1'),
          api('/playlists', { token }),
        ]);
        const allTitles = [...firstPage.items];
        for (let page = 2; page <= firstPage.pages; page += 1) {
          const result = await api(`/titles?page=${page}`);
          allTitles.push(...result.items);
        }
        if (active) {
          setTitles(allTitles);
          setPlaylists(savedPlaylists);
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  const toggleTitle = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const createPlaylist = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api('/playlists', {
        method: 'POST',
        token,
        body: { name, description, titleIds: selected },
      });
      setPlaylists((current) => [created, ...current]);
      onCreated(created);
      setName('');
      setDescription('');
      setSelected([]);
      notify('Playlist created');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="playlists">
      <h2>Create a playlist</h2>
      <p className="meta">Give your playlist a name and choose titles from the catalog.</p>
      <form className="playlist-form" onSubmit={createPlaylist}>
        <fieldset disabled={busy || loading}>
          <label className="field">Playlist name
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
          </label>
          <label className="field">Description (optional)
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} />
          </label>
          <fieldset className="playlist-picker">
            <legend>Choose titles (optional)</legend>
            {loading ? <p className="meta">Loading titles…</p> : titles.length === 0
              ? <p className="meta">There are no titles in the catalog yet.</p>
              : titles.map((title) => (
                <label key={title._id} className="playlist-option">
                  <input type="checkbox" checked={selected.includes(title._id)} onChange={() => toggleTitle(title._id)} />
                  <span>{title.name}</span>
                </label>
              ))}
          </fieldset>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit">{busy ? 'Creating…' : 'Create playlist'}</button>
        </fieldset>
      </form>

      <h2 className="playlist-heading">Your playlists</h2>
      {loading ? <p className="empty" role="status">Loading playlists…</p> : playlists.length === 0
        ? <p className="empty">You haven’t created any playlists yet.</p>
        : <div className="playlist-list">
          {playlists.map((playlist) => (
            <button
              className="playlist-card"
              key={playlist._id}
              type="button"
              disabled={playlist.titleIds.length === 0}
              onClick={() => onPlay(playlist)}
              aria-label={`Play playlist ${playlist.name}`}
            >
              <h3>{playlist.name}</h3>
              {playlist.description && <p>{playlist.description}</p>}
              {playlist.titleIds.length === 0
                ? <p className="meta">No titles added yet.</p>
                : <ul>{playlist.titleIds.map((title) => <li key={title._id}>{title.name}</li>)}</ul>}
              {playlist.titleIds.length > 0 && <small className="meta">Click to play this playlist</small>}
            </button>
          ))}
        </div>}
    </section>
  );
}
