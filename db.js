// Speicher-Schicht: PostgreSQL (wenn DATABASE_URL gesetzt) oder lokale JSON-Datei.
import fs from 'fs';
import path from 'path';

export async function createDb() {
  if (process.env.DATABASE_URL) return pgDb(process.env.DATABASE_URL);
  return fileDb(process.env.DATA_DIR || path.resolve('data'));
}

// ---------------------------------------------------------------------------
//  JSON-Datei (Standard, ideal lokal oder mit persistenter Disk)
// ---------------------------------------------------------------------------
function fileDb(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'db.json');
  let data = { nextId: 1, users: {}, sessions: {} };
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('db.json defekt, starte neu:', e.message); }
  }
  let timer = null;
  const flush = () => {
    timer = null;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };
  const save = () => { if (!timer) timer = setTimeout(flush, 800); };
  process.on('SIGINT', () => { if (timer) { clearTimeout(timer); flush(); } process.exit(0); });
  process.on('SIGTERM', () => { if (timer) { clearTimeout(timer); flush(); } process.exit(0); });
  const pub = (u) => u && ({ ...u });

  return {
    kind: 'file:' + file,
    async getUserByName(name) { return pub(Object.values(data.users).find(u => u.lower === name.toLowerCase())); },
    async getUserById(id) { return pub(data.users[id]); },
    async createUser({ username, hash, salt, state }) {
      const id = data.nextId++;
      data.users[id] = { id, username, lower: username.toLowerCase(), hash, salt, state, meta: {}, created: Date.now() };
      save(); return pub(data.users[id]);
    },
    async saveUser(id, state, meta) { const u = data.users[id]; if (!u) return; u.state = state; u.meta = meta; save(); },
    async createSession(token, userId, expires) { data.sessions[token] = { userId, expires }; save(); },
    async getSession(token) {
      const s = data.sessions[token];
      if (!s) return null;
      if (s.expires < Date.now()) { delete data.sessions[token]; save(); return null; }
      return s;
    },
    async deleteSession(token) { delete data.sessions[token]; save(); },
    async listUsersMeta() { return Object.values(data.users).map(u => ({ id: u.id, username: u.username, ...u.meta })); },
  };
}

// ---------------------------------------------------------------------------
//  PostgreSQL (z. B. kostenlose Render-Datenbank)
// ---------------------------------------------------------------------------
async function pgDb(url) {
  const { default: pg } = await import('pg');
  // Erst mit SSL versuchen (externe URLs), sonst ohne (interne Render-URL, lokal)
  let pool = null;
  for (const ssl of [{ rejectUnauthorized: false }, false]) {
    const p = new pg.Pool({ connectionString: url, ssl, max: 5 });
    try { await p.query('SELECT 1'); pool = p; break; }
    catch (e) { await p.end().catch(() => {}); if (ssl === false) throw e; }
  }
  // Eigene Tabellen mit Präfix ab_ – verträgt sich mit anderen Spielen in derselben Datenbank
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ab_users (
      id SERIAL PRIMARY KEY, username TEXT NOT NULL, lower TEXT UNIQUE NOT NULL,
      hash TEXT NOT NULL, salt TEXT NOT NULL, state JSONB NOT NULL, meta JSONB NOT NULL DEFAULT '{}',
      created BIGINT NOT NULL);
    CREATE TABLE IF NOT EXISTS ab_sessions (token TEXT PRIMARY KEY, user_id INT NOT NULL, expires BIGINT NOT NULL);
  `);
  const row = (r) => r && { id: r.id, username: r.username, lower: r.lower, hash: r.hash, salt: r.salt, state: r.state, meta: r.meta, created: Number(r.created) };
  return {
    kind: 'postgres',
    async getUserByName(name) { const r = await pool.query('SELECT * FROM ab_users WHERE lower=$1', [name.toLowerCase()]); return row(r.rows[0]); },
    async getUserById(id) { const r = await pool.query('SELECT * FROM ab_users WHERE id=$1', [id]); return row(r.rows[0]); },
    async createUser({ username, hash, salt, state }) {
      const r = await pool.query('INSERT INTO ab_users (username, lower, hash, salt, state, created) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [username, username.toLowerCase(), hash, salt, state, Date.now()]);
      return row(r.rows[0]);
    },
    async saveUser(id, state, meta) { await pool.query('UPDATE ab_users SET state=$2, meta=$3 WHERE id=$1', [id, state, meta]); },
    async createSession(token, userId, expires) { await pool.query('INSERT INTO ab_sessions VALUES ($1,$2,$3)', [token, userId, expires]); },
    async getSession(token) {
      const r = await pool.query('SELECT * FROM ab_sessions WHERE token=$1', [token]);
      const s = r.rows[0]; if (!s) return null;
      if (Number(s.expires) < Date.now()) { await pool.query('DELETE FROM ab_sessions WHERE token=$1', [token]); return null; }
      return { userId: s.user_id, expires: Number(s.expires) };
    },
    async deleteSession(token) { await pool.query('DELETE FROM ab_sessions WHERE token=$1', [token]); },
    async listUsersMeta() {
      const r = await pool.query('SELECT id, username, meta FROM ab_users');
      return r.rows.map(x => ({ id: x.id, username: x.username, ...x.meta }));
    },
  };
}
