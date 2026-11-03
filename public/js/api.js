// Server-Kommunikation
let token = localStorage.getItem('fl_token') || '';
export const hasToken = () => !!token;
export function setToken(t) { token = t || ''; if (t) localStorage.setItem('fl_token', t); else localStorage.removeItem('fl_token'); }
export async function call(method, path, body) {
  const res = await fetch(path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) { const e = new Error(data.error || `Fehler ${res.status}`); e.status = res.status; e.data = data; throw e; }
  return data;
}
export const get = (p) => call('GET', p);
export const post = (p, b) => call('POST', p, b || {});
