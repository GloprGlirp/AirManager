// FLIGHTLINE – Airbase Command · Client-Start
import * as R from '/shared/rules.js';
import * as api from './api.js';
import { Scene, HALF } from './scene.js';
import { World } from './world.js';
import { UI, fmtK } from './ui.js';
import { Audio } from './audio.js';

const $ = (s) => document.querySelector(s);
const sc = new Scene($('#view'));
sc.timeMode = localStorage.getItem('fl_time') || 'cycle';
const audio = new Audio();
const world = new World(sc, audio);

const game = {
  sc, world, audio, api,
  base: null, view: null, delta: 0, user: null, placing: null, lastLogId: 0, syncing: false, lastSync: 0,
  now() { return Date.now() + this.delta; },

  apply(resp, initial = false) {
    this.delta = resp.now - Date.now();
    this.base = resp.state;
    this.view = R.preview(structuredClone(resp.state), this.now());
    world.sync(this.view, this.now(), initial);
    const fresh = resp.state.log.filter(e => e.id > this.lastLogId);
    const maxId = resp.state.log.reduce((m, e) => Math.max(m, e.id), this.lastLogId);
    if (initial) this.offlineSummary(fresh); else this.handleLog(fresh);
    this.lastLogId = maxId;
    if (this.user) localStorage.setItem(`fl_log_${this.user.id}`, String(maxId));
    if (this.placing) this.updateGhost();
    ui.update(true);
  },
  async sync() {
    if (this.syncing) return;
    this.syncing = true; this.lastSync = Date.now();
    try { this.apply(await api.get('/api/state')); }
    catch (e) { if (e.status === 401) this.logout(true); }
    finally { this.syncing = false; }
  },
  async act(type, payload = {}) {
    try {
      const r = await api.post('/api/action', { type, ...payload });
      this.apply(r);
      return r.result;
    } catch (e) {
      if (e.data?.state) this.apply(e.data);
      if (e.status === 401) this.logout(true);
      throw e;
    }
  },
  async attack(targetId, ac) {
    try { const r = await api.post('/api/attack', { targetId, ac }); this.apply(r); return r.result; }
    catch (e) { if (e.data?.state) this.apply(e.data); throw e; }
  },
  async logout(silent) {
    if (!silent) { try { await api.post('/api/logout'); } catch {} }
    api.setToken(null); location.reload();
  },

  // ---------------------------------------------------------- Ereignisse
  handleLog(list) {
    for (const e of list) {
      const fresh = this.now() - e.t < 90_000;
      if (e.kind === 'raid') {
        if (fresh && !world.raid) world.playRaid(e, () => { ui.report(e); audio.chime(e.defended); });
        else ui.toast(e.defended ? 'good' : 'bad', e.text);
      } else if (e.kind === 'mission') {
        ui.toast(e.success ? 'good' : 'bad', e.text, (e.got && Object.keys(e.got).length ? '+ ' + ui.costHtml(e.got) : '') + (e.lost ? ` · <span class="bad">${R.AIRCRAFT[e.lost.model].name} verloren</span>` : '') + (e.overflow ? ' · <span class="amber">Lager voll</span>' : ''));
        audio.chime(e.success);
      } else if (e.kind === 'pvp') { ui.toast(e.stars ? 'good' : 'bad', e.text, e.got ? '+ ' + ui.costHtml(e.got) : ''); audio.chime(!!e.stars); }
      else if (e.kind === 'defense') { ui.toast(e.stars ? 'bad' : 'good', e.text); audio.chime(!e.stars); }
      else if (e.kind === 'build') { ui.toast('info', e.text); audio.chime(true); }
      else if (e.kind === 'train') ui.toast('info', e.text);
    }
  },
  offlineSummary(list) {
    const raids = list.filter(e => e.kind === 'raid');
    const def = raids.filter(e => e.defended).length;
    const mis = list.filter(e => e.kind === 'mission');
    const atk = list.filter(e => e.kind === 'defense');
    const parts = [];
    if (raids.length) parts.push(`${raids.length} Luftangriff(e), ${def} abgewehrt`);
    if (atk.length) parts.push(`${atk.length} Angriff(e) anderer Basen`);
    if (mis.length) parts.push(`${mis.length} Einsatz/Einsätze beendet`);
    const builds = list.filter(e => e.kind === 'build').length;
    if (builds) parts.push(`${builds} Bauprojekt(e) fertig`);
    if (parts.length && list.length < 80) setTimeout(() => ui.toast('info', 'Lage seit deinem letzten Besuch', parts.join(' · ')), 900);
    const last = raids[raids.length - 1];
    if (last && this.now() - last.t < 45_000) setTimeout(() => world.playRaid(last, () => ui.report(last)), 1500);
  },

  // ------------------------------------------------------------ Bauen
  startPlacement(kind) {
    const B = R.BUILDINGS[kind]; const [w, d] = B.size;
    const x = Math.round(sc.cam.x + HALF - w / 2), z = Math.round(sc.cam.z + HALF - d / 2);
    this.placing = { kind, rot: 0, x: Math.max(0, Math.min(R.GRID - w, x)), z: Math.max(0, Math.min(R.GRID - d, z)), move: null };
    ui.select(null); sc.grid.visible = true; this.updateGhost();
  },
  startMove(id) {
    const b = this.view.buildings.find(x => x.id === id); if (!b) return;
    this.placing = { kind: b.kind, rot: b.rot || 0, x: b.x, z: b.z, move: id };
    ui.select(null); world.hideBuilding(id, true); sc.grid.visible = true; this.updateGhost();
  },
  updateGhost() {
    const p = this.placing; if (!p) return;
    const ok = R.canPlace(this.view, p.kind, p.x, p.z, p.rot, p.move);
    world.setGhost(p.kind, p.x, p.z, p.rot, ok);
    ui.placebar(p.kind, ok, !!p.move);
    p.valid = ok;
  },
  movePlacementTo(cx, cy) {
    const p = this.placing; const pt = sc.groundPoint(cx, cy); if (!pt) return;
    const [w, d] = p.rot % 2 ? [R.BUILDINGS[p.kind].size[1], R.BUILDINGS[p.kind].size[0]] : R.BUILDINGS[p.kind].size;
    const x = Math.max(0, Math.min(R.GRID - w, Math.round(pt.x + HALF - w / 2)));
    const z = Math.max(0, Math.min(R.GRID - d, Math.round(pt.z + HALF - d / 2)));
    if (x !== p.x || z !== p.z) { p.x = x; p.z = z; this.updateGhost(); }
  },
  rotatePlacement() { if (!this.placing) return; this.placing.rot = (this.placing.rot + 1) % 4; this.updateGhost(); },
  async confirmPlacement() {
    const p = this.placing; if (!p) return;
    if (!p.valid) { ui.toast('bad', 'Hier ist kein Platz.'); return; }
    try {
      if (p.move) { await this.act('move', { id: p.move, x: p.x, z: p.z, rot: p.rot }); }
      else { const r = await this.act('build', { kind: p.kind, x: p.x, z: p.z, rot: p.rot }); ui.toast('good', `${R.BUILDINGS[p.kind].name} wird gebaut`); this.endPlacement(); if (r?.id) ui.select(r.id); return; }
      this.endPlacement();
    } catch (e) { ui.toast('bad', e.message); }
  },
  cancelPlacement() { this.endPlacement(); },
  endPlacement() {
    if (this.placing?.move) world.hideBuilding(this.placing.move, false);
    this.placing = null; world.clearGhost(); sc.grid.visible = false; ui.placebar(null);
  },

  focusRunway() { const r = world.runway(); sc.focus(r.x0 + 10, r.z + 8, 62); },
  focusBuilding(b) { const c = world.center(b); sc.focus(c.x, c.z); },
};
const ui = new UI(game);
game.ui = ui;

// ------------------------------------------------------------ Eingaben
sc.onHover = (x, y, type) => { if (game.placing && type === 'mouse') game.movePlacementTo(x, y); };
sc.onTap = (x, y, type) => {
  if (!game.base) return;
  if (game.placing) { game.movePlacementTo(x, y); if (type === 'mouse') game.confirmPlacement(); return; }
  const acObjs = [...world.ac.values()].filter(e => e.obj.visible).map(e => e.obj);
  const hit = sc.pick(x, y, [...world.pickables(), ...acObjs]);
  if (!hit) { ui.select(null); return; }
  let o = hit.object; while (o && o.userData.acid == null && o.userData.bid == null) o = o.parent;
  if (o?.userData.acid != null) {
    const a = game.view.aircraft.find(x => x.id === o.userData.acid);
    if (a) { const M = R.AIRCRAFT[a.model]; const st = R.aircraftStatus(game.view, a, game.now()); ui.toast('info', M.name, `${R.ROLES[M.role]} · Zustand ${Math.floor(a.cond)} % · ${st.text}`); }
    return;
  }
  const id = world.buildingAt(hit.object);
  ui.select(id === ui.selId ? null : id);
};

// ------------------------------------------------------------ Anmeldung
let mode = 'login';
const form = $('#authform');
form.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  mode = t.dataset.mode;
  form.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
  form.classList.toggle('register', mode === 'register');
  form.password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('#autherr').textContent = '';
}));
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  $('#autherr').textContent = '';
  try {
    const body = { username: form.username.value.trim(), password: form.password.value, baseName: form.baseName.value.trim() };
    const r = await api.post(mode === 'register' ? '/api/register' : '/api/login', body);
    api.setToken(r.token);
    enter(r, mode === 'register');
  } catch (err) { $('#autherr').textContent = err.message; }
  finally { btn.disabled = false; }
});

function enter(r, isNew) {
  game.user = r.user;
  game.lastLogId = +(localStorage.getItem(`fl_log_${r.user.id}`) || 0);
  world.clearDemo?.();
  game.apply(r, true);
  game.lastSync = Date.now();
  $('#auth').hidden = true; $('#hud').hidden = false;
  sc.cam.tdist = innerWidth < 720 ? 96 : 64; sc.focus(-2, 4);
  audio.init();
  if (isNew || !localStorage.getItem(`fl_brief_${r.user.id}`)) { localStorage.setItem(`fl_brief_${r.user.id}`, '1'); setTimeout(() => ui.brief(), 400); }
}

// Demo-Basis hinter dem Login
function demo() {
  const now = Date.now();
  const s = R.newState({ commander: 'Demo', baseName: 'Demo', seed: 4242, now });
  const add = (kind, x, z, level = 3, rot = 0) => s.buildings.push({ id: s.nextId++, kind, x, z, rot, level, busy: null, acc: 0 });
  add('hangar', 15, 8, 5); add('radar', 3, 14); add('irist', 33, 21); add('cram', 18, 14); add('helipad', 26, 8); add('helipad', 30, 4 + 2, 2);
  add('maint', 2, 20); add('flak', 13, 33); add('patriot', 37, 30); add('school', 20, 32); add('motorpool', 2, 30);
  s.buildings = s.buildings.filter(b => R.canPlace({ buildings: s.buildings.filter(x => x !== b) }, b.kind, b.x, b.z, b.rot));
  for (const b of s.buildings) b.level = Math.max(b.level, 3);
  s.aircraft.push({ id: s.nextId++, model: 'typhoon', cond: 100, crew: [], mission: null }, { id: s.nextId++, model: 'c130', cond: 100, crew: [], mission: null }, { id: s.nextId++, model: 'f35', cond: 100, crew: [], mission: null }, { id: s.nextId++, model: 'nh90', cond: 100, crew: [], mission: null });
  s.vehicles.push({ id: s.nextId++, model: 'gepard' }, { id: s.nextId++, model: 'panther' }, { id: s.nextId++, model: 'refuel' });
  world.sync(s, now, true);
}

// ------------------------------------------------------------ Schleife
let lastT = performance.now(), acc = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
  if (!game.base) sc.cam.tyaw += dt * 0.04;
  sc.updateCamera(dt); sc.updateDaylight(); world.update(dt, game.now()); sc.updateFx(dt); sc.updateWater(t / 1000);
  if (game.base) ui.frame();
  sc.render();
  acc += dt;
  if (acc >= 1 && game.base) { acc = 0; tick(); }
  requestAnimationFrame(frame);
}
function tick() {
  const now = game.now();
  game.view = R.preview(structuredClone(game.base), now);
  ui.update();
  const nev = R.nextEventTime(game.base);
  if ((now >= nev + 300 && Date.now() - game.lastSync > 1500) || Date.now() - game.lastSync > 30000) game.sync();
  const st = ui.st;
  const raidIn = game.base.nextRaidAt - now;
  if (world.raid) ui.setAlert('Luftalarm – Flugabwehr im Gefecht');
  else if (st && st.hq >= 2 && raidIn > 0 && raidIn <= st.warn * 1000) ui.setAlert('Radarkontakt – Feindverband im Anflug', game.base.nextRaidAt);
  else ui.setAlert(null);
}

// ------------------------------------------------------------ Start
(async () => {
  demo();
  requestAnimationFrame(frame);
  if (api.hasToken()) {
    try { const r = await api.get('/api/state'); enter(r, false); }
    catch { api.setToken(null); }
  }
  $('#loading').classList.add('done');
  setTimeout(() => $('#loading').remove(), 600);
})();

// Kostenanzeige im Bau-Modus aktuell halten
setInterval(() => { if (game.placing) game.updateGhost(); }, 1000);
window.__game = game;
