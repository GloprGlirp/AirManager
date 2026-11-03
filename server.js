// FLIGHTLINE – Airbase Command · Server
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDb } from './db.js';
import * as R from './shared/rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DEV = process.env.DEV_TOOLS === '1';
const db = await createDb();
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Statische Dateien ---------------------------------------------------------
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three'), { maxAge: '7d' }));
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.use(express.static(path.join(__dirname, 'public')));

// Hilfen --------------------------------------------------------------------
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => e ? rej(e) : res(k.toString('hex'))));
const SESSION_DAYS = 30;
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}
const hits = new Map();
function rateLimit(ip, max = 12) {
  const now = Date.now(), w = hits.get(ip) || [];
  const recent = w.filter(t => now - t < 60_000);
  recent.push(now); hits.set(ip, recent);
  return recent.length <= max;
}
function meta(s, now) {
  return { trophies: s.trophies, hq: R.hqLevel(s), power: R.basePower(s, now), shieldUntil: s.shieldUntil, baseName: s.name, lastSeen: s.lastSeen, xp: s.xp };
}
async function persist(u, now) { await db.saveUser(u.id, u.state, meta(u.state, now)); }
function migrate(s) {
  s.vehicles ||= []; s.ops ||= []; s.log ||= []; s.logSeq ||= 0; s.medals ??= 0;
  return s;
}
const send = (res, u, now, extra = {}) => res.json({ now, user: { id: u.id, username: u.username }, state: u.state, ...extra });

// Auth ----------------------------------------------------------------------
const NAME_RE = /^[A-Za-z0-9_\-äöüÄÖÜß]{3,16}$/;
app.post('/api/register', async (req, res) => {
  if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Zu viele Versuche. Bitte kurz warten.' });
  const { username = '', password = '', baseName = '' } = req.body || {};
  if (!NAME_RE.test(username)) return res.status(400).json({ error: 'Name: 3–16 Zeichen, Buchstaben, Zahlen, _ oder -.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Passwort: mindestens 6 Zeichen.' });
  const bn = String(baseName).trim().slice(0, 24) || `Fliegerhorst ${username}`;
  if (await db.getUserByName(username)) return res.status(409).json({ error: 'Dieser Name ist schon vergeben.' });
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(String(password), salt);
  const now = Date.now();
  const state = R.newState({ commander: username, baseName: bn, seed: crypto.randomInt(1, 2 ** 31), now });
  const u = await db.createUser({ username, hash, salt, state });
  await persist(u, now);
  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, u.id, now + SESSION_DAYS * 86400e3);
  send(res, u, now, { token });
});

app.post('/api/login', async (req, res) => {
  if (!rateLimit(req.ip)) return res.status(429).json({ error: 'Zu viele Versuche. Bitte kurz warten.' });
  const { username = '', password = '' } = req.body || {};
  const u = await db.getUserByName(String(username));
  const hash = u ? await scrypt(String(password), u.salt) : await scrypt('x', 'y');
  if (!u || !crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(u.hash, 'hex'))) return res.status(401).json({ error: 'Name oder Passwort falsch.' });
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  await db.createSession(token, u.id, now + SESSION_DAYS * 86400e3);
  await withLock(u.id, async () => {
    const fresh = await db.getUserById(u.id);
    R.advance(migrate(fresh.state), now); fresh.state.lastSeen = now;
    await persist(fresh, now);
    send(res, fresh, now, { token });
  });
});

async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const s = token && await db.getSession(token);
  if (!s) return res.status(401).json({ error: 'Bitte neu anmelden.' });
  req.userId = s.userId; req.token = token;
  next();
}

app.post('/api/logout', auth, async (req, res) => { await db.deleteSession(req.token); res.json({ ok: true }); });

// Spielstand ----------------------------------------------------------------
app.get('/api/state', auth, (req, res) => withLock(req.userId, async () => {
  const u = await db.getUserById(req.userId);
  if (!u) return res.status(401).json({ error: 'Account nicht gefunden.' });
  const now = Date.now();
  R.advance(migrate(u.state), now); u.state.lastSeen = now;
  await persist(u, now);
  send(res, u, now);
}));

app.post('/api/action', auth, (req, res) => withLock(req.userId, async () => {
  const u = await db.getUserById(req.userId);
  if (!u) return res.status(401).json({ error: 'Account nicht gefunden.' });
  const now = Date.now();
  const s = migrate(u.state);
  R.advance(s, now); s.lastSeen = now;
  let result = {}, error = null;
  try { result = R.applyAction(s, req.body || {}, now) || {}; }
  catch (e) { if (e instanceof R.RuleError) error = e.message; else { console.error(e); error = 'Serverfehler.'; } }
  await persist(u, now);
  if (error) return res.status(400).json({ error, now, state: s });
  send(res, u, now, { result });
}));

// Rangliste -----------------------------------------------------------------
app.get('/api/leaderboard', auth, async (req, res) => {
  const all = await db.listUsersMeta();
  const list = all.filter(u => u.baseName)
    .sort((a, b) => (b.trophies || 0) - (a.trophies || 0) || (b.power || 0) - (a.power || 0))
    .slice(0, 50)
    .map((u, i) => ({ rank: i + 1, id: u.id, name: u.username, base: u.baseName, trophies: u.trophies || 0, hq: u.hq || 1, power: u.power || 0, me: u.id === req.userId }));
  res.json({ list });
});

// PvP -----------------------------------------------------------------------
app.get('/api/targets', auth, async (req, res) => {
  const me = await db.getUserById(req.userId);
  const now = Date.now();
  const s = me.state;
  const myHq = R.hqLevel(s);
  const all = await db.listUsersMeta();
  const players = all
    .filter(u => u.id !== req.userId && u.baseName && (u.shieldUntil || 0) < now && Math.abs((u.hq || 1) - myHq) <= 2)
    .sort((a, b) => Math.abs((a.trophies || 0) - s.trophies) - Math.abs((b.trophies || 0) - s.trophies))
    .slice(0, 8)
    .map(u => ({ id: String(u.id), name: u.baseName, owner: u.username, hq: u.hq || 1, trophies: u.trophies || 0, def: Math.round((u.power || 0) * 0.55) }));
  const seed = (s.seed ^ Math.floor(now / (30 * R.MIN))) | 0;
  const ai = R.aiTargets(myHq, seed).map(t => ({ id: t.id, name: t.name, owner: 'KI · Red Force', hq: t.hq, trophies: t.trophies, def: t.def, ai: true }));
  res.json({ list: [...players, ...(players.length < 5 ? ai : ai.slice(0, 1))] });
});

app.post('/api/attack', auth, async (req, res) => {
  const { targetId, ac } = req.body || {};
  const now = Date.now();
  const isAi = String(targetId).startsWith('ai:');
  const defId = isAi ? null : Number(targetId);
  if (defId === req.userId) return res.status(400).json({ error: 'Du kannst dich nicht selbst angreifen.' });
  // Locks immer in fester Reihenfolge holen
  const keys = [req.userId, defId].filter(x => x != null).sort((a, b) => a - b);
  const run = async () => {
    const u = await db.getUserById(req.userId);
    const s = migrate(u.state);
    R.advance(s, now); s.lastSeen = now;
    try {
      const rnd = () => R.rand(s);
      let target, outcome;
      if (isAi) {
        const t = R.aiTargets(R.hqLevel(s), (s.seed ^ Math.floor(now / (30 * R.MIN))) | 0).find(x => x.id === targetId);
        if (!t) throw new R.RuleError('Ziel nicht mehr verfügbar.');
        outcome = R.pvpOutcome(s, ac || [], t.def, t.res, R.hqLevel(s), rnd);
        target = t.name;
        if (outcome.trophies < 0) outcome.trophies = -4;
        else outcome.trophies = Math.round(outcome.trophies * 0.5);
        R.startPvp(s, ac || [], target, outcome, now);
      } else {
        const d = await db.getUserById(defId);
        if (!d) throw new R.RuleError('Ziel nicht gefunden.');
        const ds = migrate(d.state);
        R.advance(ds, now);
        if (ds.shieldUntil > now) throw new R.RuleError('Diese Basis steht unter Schutzschild.');
        if (Math.abs(R.hqLevel(ds) - R.hqLevel(s)) > 2) throw new R.RuleError('Ziel ist außerhalb deiner Liga.');
        const def = R.defenseBreakdown(ds, now);
        outcome = R.pvpOutcome(s, ac || [], def.total, ds.res, R.hqLevel(s), rnd);
        target = ds.name;
        R.startPvp(s, ac || [], target, outcome, now); // wirft bei ungültigem Paket, bevor der Verteidiger etwas verliert
        for (const k of R.RES) ds.res[k] = Math.max(0, ds.res[k] - outcome.loot[k]);
        const tr = outcome.stars ? -outcome.trophies : 6;
        ds.trophies = Math.max(0, ds.trophies + tr);
        if (outcome.stars >= 1) ds.shieldUntil = now + (outcome.stars >= 2 ? 3 : 1) * R.HOUR;
        ds.res.ammo = Math.max(0, ds.res.ammo - Math.round(def.ammoNeed * 0.5));
        R.addLog(ds, now, {
          kind: 'defense', stars: outcome.stars, loss: outcome.loot, trophies: tr, attacker: u.username,
          text: outcome.stars ? `${u.username} hat deine Basis angegriffen: ${'★'.repeat(outcome.stars)} – Verluste erlitten` : `Angriff von ${u.username} abgewehrt!`,
        });
        await persist(d, now);
      }
      await persist(u, now);
      send(res, u, now, { result: { target } });
    } catch (e) {
      await persist(u, now);
      if (e instanceof R.RuleError) return res.status(400).json({ error: e.message, now, state: s });
      console.error(e); res.status(500).json({ error: 'Serverfehler.' });
    }
  };
  if (keys.length === 1) return withLock(keys[0], run);
  return withLock(keys[0], () => withLock(keys[1], run));
});

// Entwickler-Werkzeuge (nur mit DEV_TOOLS=1) ---------------------------------
if (DEV) {
  app.post('/api/dev/:what', auth, (req, res) => withLock(req.userId, async () => {
    const u = await db.getUserById(req.userId); const s = u.state; const now = Date.now();
    R.advance(s, now);
    if (req.params.what === 'raid') s.nextRaidAt = now + 20_000;
    if (req.params.what === 'rich') { const c = R.stats(s).cap; for (const k of R.RES) s.res[k] = c[k]; s.medals += 50; }
    if (req.params.what === 'finish') { for (const o of s.ops) o.end = now; for (const b of s.buildings) if (b.busy) b.busy.end = now; R.advance(s, now); }
    await persist(u, now); send(res, u, now);
  }));
}

app.listen(PORT, () => console.log(`FLIGHTLINE läuft auf http://localhost:${PORT}  (Speicher: ${db.kind}${DEV ? ', DEV_TOOLS an' : ''})`));
