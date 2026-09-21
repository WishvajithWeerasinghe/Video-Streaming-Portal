const base = import.meta.env.VITE_API_URL || '';
export async function api(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Request failed'), { data: d });
  return d;
}
