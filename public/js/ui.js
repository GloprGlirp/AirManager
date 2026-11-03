// Benutzeroberfläche: HUD, Menüs, Labels, Toasts
import * as THREE from 'three';
import * as R from '/shared/rules.js';
import { thumb } from './thumbs.js';

const $ = (s, r = document) => r.querySelector(s);
const NF = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
export const fmt = (n) => NF.format(Math.floor(n || 0));
export const fmtK = (n) => { n = Math.floor(n || 0); if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' Mio'; if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.', ',') + 'k'; return NF.format(n); };
export function fmtDur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')} m`;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (x) => `${Math.round(x * 100)} %`;

// ------------------------------------------------------------------- Icons
const S = (p, f = 'none') => `<svg class="ico" viewBox="0 0 24 24" fill="${f}" stroke="${f === 'none' ? 'currentColor' : 'none'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
export const IC = {
  budget: S('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4M5 14v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4"/>'),
  fuel: S('<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>'),
  ammo: S('<path d="M9 21V10c0-3 1.5-5.5 3-7 1.5 1.5 3 4 3 7v11z"/><path d="M9 16h6M7 21h10"/>'),
  material: S('<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'),
  medals: S('<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/>', 'currentColor'),
  trophy: S('<path d="M4 9l8-5 8 5M4 14.5l8-5 8 5M4 20l8-5 8 5"/>'),
  staff: S('<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  plane: S('<path d="M12 2c.8 0 1.3 1.2 1.3 2.6V9l7.7 4.5v2l-7.7-2.2v4.3l2.2 1.7V21L12 20l-3.5 1v-1.7l2.2-1.7v-4.3L3 15.5v-2L10.7 9V4.6C10.7 3.2 11.2 2 12 2z"/>', 'currentColor'),
  build: S('<path d="M5 21V4h13M5 4l4 4M18 4v5"/><rect x="15" y="9" width="6" height="4"/><path d="M2 21h9M14 21v-5h6v5"/>'),
  mission: S('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>'),
  attack: S('<path d="M4 20l6-6M14 4h6v6M20 4L9 15M6 13l5 5"/>'),
  rank: S('<path d="M8 21V11h8v10M2 21v-6h6M16 21v-8h6v8M2 21h20"/><path d="M12 3l1.2 2.5 2.8.3-2 1.9.5 2.8L12 9.2 9.5 10.5l.5-2.8-2-1.9 2.8-.3z"/>'),
  log: S('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  truck: S('<path d="M2 16V6h11v10M13 9h5l4 4v3h-9"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'),
  radar: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.5-6.5"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  shield: S('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
  wrench: S('<path d="M14.5 5.5a4.5 4.5 0 0 0 5.6 5.9L11 20.5a2.1 2.1 0 0 1-3-3l9.1-9.1a4.5 4.5 0 0 1-2.6-2.9z"/><path d="M14.5 5.5L17 3l1 3 3 1-2.5 2.5"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  boom: S('<path d="M12 2l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"/>'),
  sound: S('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'),
};
const RC = { budget: '#e8c56a', fuel: '#63d3e6', ammo: '#ff8a5c', material: '#cdb68a' };
const resIcon = (k) => `<span style="color:${RC[k]}">${IC[k]}</span>`;
function costHtml(c, have) {
  return `<span class="cost">${Object.keys(c).filter(k => c[k] > 0).map(k => `<span class="${have && (have[k] || 0) < c[k] ? 'no' : ''}">${resIcon(k)}${fmtK(c[k])}</span>`).join('')}</span>`;
}
const affordable = (c, have) => Object.keys(c).every(k => (have[k] || 0) >= c[k]);

const LBL_H = { hq: 3.4, runway: 1, tower: 4.6, hangar: 2.6, helipad: 0.8, fuel: 1.6, ammo: 1.6, depot: 2.2, barracks: 1.8, maint: 2.4, school: 1.8, motorpool: 1.4, radar: 2.8, flak: 1.4, cram: 1.6, irist: 1.8, patriot: 2.2 };
const STATUS_CHIP = { ready: ['ok', 'Einsatzbereit'], mission: ['info', 'Im Einsatz'], nocrew: ['bad', 'Crew fehlt'], crewbusy: ['warn', ''], damaged: ['bad', 'Beschädigt'] };
const PSTAT = { ready: ['ok', 'Bereit'], mission: ['info', 'Im Einsatz'], rest: ['warn', 'Ruhezeit'], training: ['info', 'Simulator'] };

export class UI {
  constructor(game) {
    this.g = game;
    this.panel = null;
    this.pkg = { mid: null, ac: new Set() };
    this.atk = { target: null, ac: new Set(), list: null, err: null };
    this.crewEdit = null;
    this.labels = new Map();
    this.floats = [];
    this.selId = null;
    this.last = {};
    this.bind();
    this.renderDock();
    $('#sysbtns [data-p="settings"]').innerHTML = IC.gear;
  }

  // --------------------------------------------------------------- Events
  bind() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      this.g.audio.click();
      this.handle(el.dataset.act, el.dataset, el);
    });
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('[data-pick-ac]')) { const id = +el.value; el.checked ? this.pkg.ac.add(id) : this.pkg.ac.delete(id); this.update(true); }
      if (el.matches('[data-atk-ac]')) { const id = +el.value; el.checked ? this.atk.ac.add(id) : this.atk.ac.delete(id); this.update(true); }
      if (el.matches('[data-crew]')) {
        const a = this.g.view.aircraft.find(x => x.id === this.crewEdit); const max = a ? R.AIRCRAFT[a.model].crew : 1;
        const boxes = [...document.querySelectorAll('[data-crew]:checked')];
        if (boxes.length > max) { el.checked = false; this.toast('info', `Diese Maschine braucht ${max} Pilot:in(nen).`); }
      }
      if (el.matches('[data-set-time]')) { this.g.sc.timeMode = el.value; localStorage.setItem('fl_time', el.value); }
    });
    $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') this.closePanel(); });
    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input,textarea,select')) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (this.g.placing) this.g.cancelPlacement(); else if (this.panel) this.closePanel(); else this.select(null); return; }
      if (this.g.placing) { if (k === 'r') this.g.rotatePlacement(); if (k === 'enter') this.g.confirmPlacement(); return; }
      const map = { b: 'build', f: 'fleet', p: 'staff', m: 'missions', x: 'attack', l: 'log' };
      if (map[k] && !e.ctrlKey && !e.metaKey) { this.panel?.name === map[k] ? this.closePanel() : this.openPanel(map[k]); }
    });
  }

  async handle(act, d, el) {
    const g = this.g;
    const run = async (type, payload, okMsg) => { try { const r = await g.act(type, payload); if (okMsg) this.toast('good', okMsg); return r || true; } catch (e) { this.toast('bad', e.message); return null; } };
    switch (act) {
      case 'panel': this.openPanel(d.p, d.tab); break;
      case 'close': this.closePanel(); break;
      case 'tab': this.panel.tab = d.tab; this.crewEdit = null; this.update(true); break;
      case 'sel-close': this.select(null); break;
      case 'buildStart': this.closePanel(); g.startPlacement(d.k); break;
      case 'upgrade': await run('upgrade', { id: +d.id }); break;
      case 'speedup': await run('speedup', { id: +d.id }, 'Bau beschleunigt'); break;
      case 'cancel': if (confirm('Bau abbrechen? Du erhältst 50 % der Kosten zurück.')) await run('cancel', { id: +d.id }); break;
      case 'move': g.startMove(+d.id); break;
      case 'collect': {
        const r = await run('collect', { id: d.id === 'all' ? 'all' : +d.id });
        if (r?.got) { localStorage.setItem('fl_g_collect', '1'); this.showGot(r.got, d.id === 'all' ? null : +d.id); }
        break;
      }
      case 'place-ok': g.confirmPlacement(); break;
      case 'place-rot': g.rotatePlacement(); break;
      case 'place-cancel': g.cancelPlacement(); break;
      case 'buyAc': if (await run('buyAircraft', { model: d.m }, `${R.AIRCRAFT[d.m].name} beschafft`)) { this.panel.tab = 'fleet'; this.update(true); } break;
      case 'sellAc': if (confirm('Maschine wirklich ausmustern? Du erhältst 35 % des Budgets zurück.')) await run('sellAircraft', { id: +d.id }); break;
      case 'repairAc': await run('repair', { id: +d.id }, 'Instandsetzung abgeschlossen'); break;
      case 'crewEdit': this.crewEdit = this.crewEdit === +d.id ? null : +d.id; this.update(true); break;
      case 'crewSave': {
        const crew = [...document.querySelectorAll('[data-crew]:checked')].map(x => +x.value);
        if (await run('setCrew', { id: +d.id, crew }, 'Crew zugewiesen')) { this.crewEdit = null; this.update(true); }
        break;
      }
      case 'autoCrew': await run('autoCrew', {}, 'Freie Pilot:innen zugewiesen'); break;
      case 'recruit': await run('recruit', { role: d.r }, `${R.ROLES_P[d.r].name} eingestellt`); break;
      case 'dismiss': if (confirm('Person wirklich entlassen?')) await run('dismiss', { id: +d.id }); break;
      case 'train': await run('train', { id: +d.id }, 'Simulator-Training gestartet'); break;
      case 'buyVeh': await run('buyVehicle', { model: d.m }, `${R.VEHICLES[d.m].name} beschafft`); break;
      case 'sellVeh': if (confirm('Fahrzeug verkaufen?')) await run('sellVehicle', { id: +d.id }); break;
      case 'mSel': this.pkg = { mid: +d.id, ac: new Set() }; this.autoPick(); this.update(true); if (innerWidth < 720) $('.pkg')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'mSend': {
        const r = await run('sendMission', { mid: this.pkg.mid, ac: [...this.pkg.ac] });
        if (r) { this.toast('good', 'Rotte startet', 'Die Maschinen rollen zur Startbahn.'); this.pkg = { mid: null, ac: new Set() }; this.closePanel(); g.focusRunway(); }
        break;
      }
      case 'refreshBoard': await run('refreshBoard', {}, 'Neue Lagemeldungen eingegangen'); break;
      case 'tSel': this.atk.target = d.id; this.atk.ac = new Set(); this.update(true); if (innerWidth < 720) $('.pkg')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'tReload': this.atk.list = null; this.loadTargets(); break;
      case 'atkSend': {
        try {
          await g.attack(this.atk.target, [...this.atk.ac]);
          this.toast('good', 'Angriffspaket gestartet', 'Ergebnis bei Rückkehr in ca. 3 Minuten.');
          this.atk = { target: null, ac: new Set(), list: null }; this.closePanel(); g.focusRunway();
        } catch (e) { this.toast('bad', e.message); }
        break;
      }
      case 'sound': g.audio.toggle(!g.audio.on); g.audio.init(); this.update(true); break;
      case 'rename': { const v = $('#renameInput')?.value; await run('rename', { name: v }, 'Basis umbenannt'); break; }
      case 'logout': g.logout(); break;
      case 'guideHide': localStorage.setItem('fl_guide_off', '1'); this.renderOps(); break;
      case 'focusB': { const b = g.view.buildings.find(x => x.id === +d.id); if (b) { this.closePanel(); this.select(b.id); g.focusBuilding(b); } break; }
      case 'report-close': this.closePanel(); break;
    }
  }

  // --------------------------------------------------------------- Dock
  renderDock() {
    const items = [['build', 'Bauen', IC.build, 'B'], ['fleet', 'Flotte', IC.plane, 'F'], ['staff', 'Personal', IC.staff, 'P'], ['missions', 'Einsätze', IC.mission, 'M'], ['attack', 'Angriff', IC.attack, 'X'], ['rank', 'Rangliste', IC.rank, ''], ['log', 'Lagebuch', IC.log, 'L']];
    $('#dock').innerHTML = items.map(([p, n, ic, k]) => `<button class="dbtn" data-act="panel" data-p="${p}">${k ? `<kbd>${k}</kbd>` : ''}<span class="badge" data-badge="${p}" hidden></span>${ic.replace('class="ico"', '')}<span>${n}</span></button>`).join('');
  }

  // --------------------------------------------------------------- Tick
  update(force = false) {
    const v = this.g.view; if (!v) return;
    const now = this.g.now();
    const st = R.stats(v);
    this.st = st;
    this.renderTop(v, st, now);
    this.setHtml('ops', $('#ops'), this.opsHtml(v, st, now), force);
    if (this.selId != null) this.renderSel(force);
    if (this.panel) this.renderPanel(force);
    this.badges(v, st, now);
    this.updateLabelsContent(v, st, now);
    this.tickTimers(now);
  }
  setHtml(key, el, html, force) {
    if (!force && this.last[key] === html) return false;
    const sc = el.scrollTop; el.innerHTML = html; el.scrollTop = sc; this.last[key] = html; return true;
  }
  tickTimers(now) {
    for (const el of document.querySelectorAll('[data-cd]')) el.textContent = fmtDur(+el.dataset.cd - now);
    for (const el of document.querySelectorAll('[data-pe]')) { const s = +el.dataset.ps, e = +el.dataset.pe; el.style.width = `${Math.max(0, Math.min(100, (now - s) / (e - s) * 100))}%`; }
  }
  badges(v, st, now) {
    const set = (p, n) => { const b = document.querySelector(`[data-badge="${p}"]`); if (!b) return; b.hidden = !n; b.textContent = n; };
    set('missions', v.board.list.filter(m => m.exp > now).length);
    set('fleet', v.aircraft.filter(a => R.aircraftStatus(v, a, now).code === 'nocrew').length || 0);
    set('build', Math.max(0, st.builders - st.builderBusy) || 0);
  }

  renderTop(v, st, now) {
    const lvl = R.cmdLevel(v.xp), next = R.CMD_XP[lvl] ?? R.CMD_XP[R.CMD_XP.length - 1], cur = R.CMD_XP[lvl - 1];
    const prog = lvl >= R.CMD_XP.length ? 1 : (v.xp - cur) / (next - cur);
    const cmd = `<div class="base">${esc(v.name)}</div>
      <div class="rank"><span><b>${R.CMD_RANKS[lvl - 1]}</b> ${esc(v.commander)}</span></div>
      <div class="bar"><i style="width:${prog * 100}%"></i></div>
      <div class="stats"><span class="amber" title="Ruhm">${IC.trophy}${fmt(v.trophies)}</span><span style="color:#ffd27a" title="Orden">${IC.medals}${fmt(v.medals)}</span><span class="muted" title="Personal">${IC.staff}${st.staff}/${st.staffCap}</span>${v.shieldUntil > now ? `<span class="cyan" title="Schutzschild">${IC.shield}<span data-cd="${v.shieldUntil}"></span></span>` : ''}</div>`;
    this.setHtml('cmd', $('#cmd'), cmd);
    $('#cmd').dataset.act = 'panel'; $('#cmd').dataset.p = 'settings';
    const res = R.RES.map(k => {
      const val = v.res[k], cap = st.cap[k];
      return `<div class="res panel ${val >= cap - 1 ? 'full' : ''}" title="${R.RES_NAMES[k]}"><div class="ic" style="color:${RC[k]}">${IC[k]}</div><div class="v">${fmtK(val)} <small>/ ${fmtK(cap)}</small></div><div class="r">+${fmtK(st.rate[k])}/h</div><div class="bar"><i style="width:${Math.min(100, val / cap * 100)}%;background:${RC[k]}"></i></div></div>`;
    }).join('');
    $('#resbar').innerHTML = res;
  }

  opsHtml(v, st, now) {
    let h = '';
    if (!localStorage.getItem('fl_guide_off')) {
      const steps = [
        ['Ressourcen an den Lagern einsammeln', !!localStorage.getItem('fl_g_collect')],
        ['Einen Einsatz fliegen', v.log.some(l => l.kind === 'mission') || v.ops.length > 0],
        ['Kommandozentrale auf Stufe 2', R.hqLevel(v) >= 2],
        ['Eine zweite Flak bauen', R.byKind(v, 'flak').length >= 2],
        ['Ein neues Flugzeug beschaffen', v.aircraft.length >= 3],
      ];
      if (steps.some(s => !s[1])) h += `<div class="op panel guide"><div class="t"><b class="cyan">Erste Befehle</b><button class="btn small" data-act="guideHide" style="min-height:22px;padding:0 6px">×</button></div><ol>${steps.map(s => `<li class="${s[1] ? 'done' : ''}">${s[0]}</li>`).join('')}</ol></div>`;
    }
    for (const o of v.ops) {
      const title = o.kind === 'pvp' ? `Angriff: ${esc(o.target)}` : `Op. ${o.m.op}`;
      const sub = o.kind === 'pvp' ? `${o.ac.length} Maschine(n)` : `${R.MTYPES[o.m.type].name} · ${o.ac.length} Masch.`;
      h += `<div class="op panel" data-act="panel" data-p="missions"><div class="t"><b>${title}</b><span class="mono" data-cd="${o.end}"></span></div><div class="s">${esc(sub)}</div><div class="bar"><i data-ps="${o.start}" data-pe="${o.end}"></i></div></div>`;
    }
    for (const b of v.buildings.filter(x => x.busy).sort((a, b) => a.busy.end - b.busy.end)) {
      h += `<div class="op panel kind-build" data-act="focusB" data-id="${b.id}"><div class="t"><b>${R.BUILDINGS[b.kind].name}</b><span class="mono" data-cd="${b.busy.end}"></span></div><div class="s">${b.level ? `Ausbau auf Stufe ${b.level + 1}` : 'Neubau'}</div><div class="bar"><i data-ps="${b.busy.start}" data-pe="${b.busy.end}"></i></div></div>`;
    }
    for (const p of v.people.filter(x => x.trainXp && x.trainUntil > now)) {
      h += `<div class="op panel kind-train" data-act="panel" data-p="staff"><div class="t"><b>Simulator: ${esc(p.call || p.name)}</b><span class="mono" data-cd="${p.trainUntil}"></span></div></div>`;
    }
    if (st.builders - st.builderBusy > 0 && v.buildings.length > 0) h += `<div class="op panel" data-act="panel" data-p="build" style="opacity:.8"><div class="t"><b class="muted">${st.builders - st.builderBusy} Bautrupp(s) frei</b><span class="muted">${IC.build}</span></div></div>`;
    return h;
  }

  // -------------------------------------------------------- Auswahlkarte
  select(id) {
    this.selId = id;
    this.g.world.select(id);
    if (id == null) { $('#sel').hidden = true; this.last.sel = null; return; }
    this.renderSel(true);
  }
  renderSel(force) {
    const v = this.g.view; const b = v.buildings.find(x => x.id === this.selId);
    if (!b) { this.select(null); return; }
    const el = $('#sel'); el.hidden = false;
    this.setHtml('sel', el, this.selHtml(v, b), force);
  }
  statLines(kind, L, v, st) {
    if (L < 1) return [];
    const D = R.DEF[kind];
    switch (kind) {
      case 'hq': return [['Budget-Produktion', `${fmt(R.PROD.hq(L).budget)}/h`], ['Lager Budget', fmt(R.STORE.hq(L).budget)], ['Lager je Rohstoff', fmt(R.STORE.hq(L).fuel)], ['Bautrupps', 2 + Math.floor((L - 1) / 2)]];
      case 'runway': return [['Startbahn-Stufe', L], ['Freigegeben', Object.values(R.AIRCRAFT).filter(a => !a.helo && a.rw <= L).length + ' Flugzeugtypen']];
      case 'tower': return [['Gleichzeitige Einsätze', 1 + L], ['Einsatzbrett', `${4 + Math.floor(L / 2)} Aufträge`]];
      case 'hangar': return [['Stellplätze', R.hangarSlots(L)]];
      case 'helipad': return [['Stellplätze', 1], ['Wartungsbonus', `+${2 * L} %/h`]];
      case 'fuel': case 'ammo': case 'depot': {
        const k = Object.keys(R.PROD[kind](L))[0];
        return [['Produktion', `${fmt(R.PROD[kind](L)[k])}/h`], ['Lagerkapazität', fmt(R.STORE[kind](L)[k])], ['Sammelpuffer', fmt(R.PROD[kind](L)[k] * R.ACC_HOURS)]];
      }
      case 'barracks': return [['Personalplätze', R.barracksCap(L)]];
      case 'maint': return [['Reparaturtempo', `+${9 * L} %/h`]];
      case 'school': return [['Simulatoren', 1 + Math.floor(L / 2)], ['Erfahrung je Training', `${60 + 35 * L} EP`], ['Dauer', fmtDur(R.trainTime(L) * 1000)]];
      case 'motorpool': return [['Fahrzeugplätze', R.motorpoolCap(L)]];
      case 'radar': return [['Vorwarnzeit', `+${15 * L} s`], ['Trefferbonus Abwehr', `+${6 * L} %`]];
      default: if (D) return [['Abwehrkraft', fmt(D.power(L))], ['Reichweite', `${D.range} km`], ['Munition je Gefecht', fmt(D.ammo(L))]];
    }
    return [];
  }
  selHtml(v, b) {
    const B = R.BUILDINGS[b.kind]; const st = this.st; const now = this.g.now();
    const cur = this.statLines(b.kind, b.level, v, st);
    let h = `<button class="x" data-act="sel-close">×</button><div class="lvl">STUFE ${b.level}${b.busy ? ' → ' + (b.level + 1) : ''} / ${B.max}</div><h3>${B.name}</h3><p class="d">${B.desc}</p>`;
    if (cur.length) h += `<dl class="kv">${cur.map(([k, val]) => `<dt>${k}</dt><dd>${val}</dd>`).join('')}</dl>`;
    if (R.PROD[b.kind] && b.level > 0) {
      const k = Object.keys(R.PROD[b.kind](1))[0];
      h += `<div class="up row"><span class="grow">Gesammelt: <span class="mono">${resIcon(k)} ${fmt(b.acc)}</span></span><button class="btn small" data-act="collect" data-id="${b.id}" ${b.acc < 1 ? 'disabled' : ''}>Einsammeln</button></div>`;
    }
    if (b.busy) {
      const sp = R.speedupCost(b.busy.end - now);
      h += `<div class="up"><div class="row"><span class="grow cyan">${b.level ? 'Ausbau läuft' : 'Im Bau'}</span><span class="mono cyan" data-cd="${b.busy.end}"></span></div><div class="bar cyan" style="margin:6px 0 10px"><i data-ps="${b.busy.start}" data-pe="${b.busy.end}"></i></div>
        <div class="row"><button class="btn small" data-act="speedup" data-id="${b.id}" ${v.medals < sp ? 'disabled' : ''}>${IC.medals} ${sp} Orden: Sofort fertig</button><button class="btn small danger" data-act="cancel" data-id="${b.id}">Abbrechen</button></div></div>`;
    } else if (b.level < B.max) {
      const L = b.level + 1;
      const c = R.buildCost(b.kind, L);
      const nxt = this.statLines(b.kind, L, v, st);
      const lock = b.kind !== 'hq' && L > st.hq ? `Kommandozentrale Stufe ${L} nötig` : st.builderBusy >= st.builders ? 'Alle Bautrupps beschäftigt' : null;
      const can = !lock && affordable(c, v.res);
      h += `<div class="up"><div class="label" style="margin-bottom:6px">Ausbau auf Stufe ${L} · ${fmtDur(R.buildTime(b.kind, L) * 1000)}</div>`;
      if (nxt.length) h += `<dl class="kv" style="margin-bottom:8px">${nxt.map(([k, val], i) => `<dt>${k}</dt><dd>${cur[i] && String(cur[i][1]) !== String(val) ? `<b>${val}</b>` : val}</dd>`).join('')}</dl>`;
      h += `<div class="row"><span class="grow">${costHtml(c, v.res)}</span><button class="btn small primary" data-act="upgrade" data-id="${b.id}" ${can ? '' : 'disabled'}>Ausbauen</button></div>${lock ? `<div class="bad" style="font-size:12px;margin-top:6px">${lock}</div>` : ''}</div>`;
    } else h += `<div class="up good">Höchststufe erreicht.</div>`;
    const acts = [];
    if (!B.fixed) acts.push(`<button class="btn small" data-act="move" data-id="${b.id}">Verschieben</button>`);
    const open = { hangar: ['fleet', 'Flotte'], maint: ['fleet', 'Flotte'], helipad: ['fleet', 'Flotte'], barracks: ['staff', 'Personal'], school: ['staff', 'Training'], tower: ['missions', 'Einsätze'], motorpool: ['fleet', 'Fahrzeuge', 'veh'], hq: ['build', 'Bauen'], radar: ['log', 'Lagebuch'] }[b.kind];
    if (open) acts.push(`<button class="btn small" data-act="panel" data-p="${open[0]}" ${open[2] ? `data-tab="${open[2]}"` : ''}>${open[1]}</button>`);
    if (R.PROD[b.kind]) acts.push(`<button class="btn small" data-act="collect" data-id="all">Alles einsammeln</button>`);
    if (acts.length) h += `<div class="acts">${acts.join('')}</div>`;
    return h;
  }

  // ------------------------------------------------------------ Panels
  openPanel(name, tab) {
    const defaults = { build: 'kern', fleet: 'fleet', staff: 'pilot', missions: 'board', attack: 'targets', rank: 'all', log: 'all', settings: 'main' };
    this.panel = { name, tab: tab || defaults[name] };
    this.crewEdit = null;
    $('#modal').hidden = false;
    this.last.pHead = this.last.pBody = null;
    if (name === 'attack') this.loadTargets();
    if (name === 'rank') this.loadRank();
    if (name === 'missions' && this.pkg.mid && !this.g.view.board.list.find(m => m.id === this.pkg.mid)) this.pkg = { mid: null, ac: new Set() };
    this.renderPanel(true);
  }
  closePanel() { this.panel = null; $('#modal').hidden = true; this.last.pHead = this.last.pBody = null; }
  renderPanel(force) {
    const v = this.g.view; const sh = $('#modal .sheet');
    if (!sh.querySelector('.body')) sh.innerHTML = '<button class="x" data-act="close">×</button><header></header><div class="body"></div>';
    const P = this.panel; const now = this.g.now(); const st = this.st || R.stats(v);
    const fn = { build: this.pBuild, fleet: this.pFleet, staff: this.pStaff, missions: this.pMissions, attack: this.pAttack, rank: this.pRank, log: this.pLog, settings: this.pSettings, report: this.pReport, brief: this.pBrief }[P.name];
    const { title, sub, tabs, body } = fn.call(this, v, st, now, P);
    const head = `<h2>${title}</h2><div class="sub">${sub || ''}</div>${tabs ? `<div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${P.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</div>` : '<div style="height:8px"></div>'}`;
    this.setHtml('pHead', sh.querySelector('header'), head, force);
    if (this.setHtml('pBody', sh.querySelector('.body'), body, force)) this.tickTimers(now);
  }

  pBuild(v, st, now, P) {
    const cards = Object.entries(R.BUILDINGS).filter(([k, B]) => B.cat === P.tab && !B.fixed).map(([k, B]) => {
      const n = R.byKind(v, k).length, lim = R.buildLimit(v, k);
      const c = R.buildCost(k, 1);
      const unlockAt = B.counts.findIndex(x => x > n) + 1;
      const why = lim <= n ? (unlockAt > 0 ? `Mehr ab Kommandozentrale Stufe ${unlockAt}` : 'Maximum erreicht') : st.builderBusy >= st.builders ? 'Alle Bautrupps beschäftigt' : !affordable(c, v.res) ? 'Nicht genug Ressourcen' : '';
      const lines = this.statLines(k, 1, v, st).slice(0, 2);
      return `<div class="card ${lim <= n ? 'locked' : ''}"><div class="row"><h4 class="grow">${B.name}</h4><span class="chip">${n}/${lim}</span></div>
        <div class="meta"><span class="chip">${B.size[0]}×${B.size[1]}</span><span class="chip">${IC.clock} ${fmtDur(R.buildTime(k, 1) * 1000)}</span></div>
        <p>${B.desc}</p>${lines.length ? `<dl class="kv">${lines.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>` : ''}
        <div class="foot">${costHtml(c, v.res)}<button class="btn small primary" data-act="buildStart" data-k="${k}" ${why ? 'disabled' : ''}>Platzieren</button></div>${why ? `<div class="why">${why}</div>` : ''}</div>`;
    }).join('');
    return { title: 'Bauen', sub: `Bautrupps: ${st.builders - st.builderBusy} von ${st.builders} frei · Kommandozentrale Stufe ${st.hq}`, tabs: R.BUILD_CATS, body: `<div class="grid">${cards}</div>` };
  }

  pFleet(v, st, now, P) {
    const tabs = [['fleet', `Staffel (${v.aircraft.length})`], ['buy', 'Beschaffung'], ['veh', `Fahrzeuge (${v.vehicles.length})`]];
    let body = '';
    if (P.tab === 'fleet') {
      body += `<div class="section-h"><h3>Hangar ${st.planeUsed}/${st.planeSlots} · Hubschrauber ${st.heloUsed}/${st.heloSlots} · Reparatur +${Math.round(st.repair)} %/h</h3><button class="btn small" data-act="autoCrew">Crews automatisch zuweisen</button></div>`;
      if (!v.aircraft.length) body += `<div class="empty">Keine Maschinen. Wechsle zu „Beschaffung“.</div>`;
      const crewMap = R.crewOf(v);
      body += '<div class="list">' + v.aircraft.map(a => {
        const M = R.AIRCRAFT[a.model]; const s = R.aircraftStatus(v, a, now);
        const [cls, txt] = STATUS_CHIP[s.code]; const crew = a.crew.map(pid => v.people.find(p => p.id === pid)).filter(Boolean);
        const rc = R.repairCost(a);
        let edit = '';
        if (this.crewEdit === a.id) {
          const pilots = v.people.filter(p => p.role === 'pilot');
          edit = `<div class="crew">${pilots.map(p => { const on = crewMap[p.id]; const other = on && on !== a.id ? R.AIRCRAFT[v.aircraft.find(x => x.id === on)?.model]?.name : null; return `<label title="${other ? 'zurzeit: ' + esc(other) : ''}"><input type="checkbox" data-crew value="${p.id}" ${on === a.id ? 'checked' : ''} ${p.mission ? 'disabled' : ''}>${esc(p.call)} · ${R.pilotRank(R.pilotLevel(p.xp))} L${R.pilotLevel(p.xp)}${other ? ` <span class="muted">(${esc(other.split(' ').slice(-1)[0])})</span>` : ''}</label>`; }).join('') || '<span class="muted">Keine Pilot:innen – stelle welche im Personal-Menü ein.</span>'}<button class="btn small primary" data-act="crewSave" data-id="${a.id}">Übernehmen</button></div>`;
        }
        return `<div class="item ${this.crewEdit === a.id ? 'sel' : ''}"><img class="th" src="${thumb('ac', M.shape, M.paint)}" alt="">
          <div><div class="n">${M.name}</div><div class="s"><span class="chip">${R.ROLES[M.role]}</span><span class="chip ${cls}">${txt || s.text}</span><span>Einsatzwert <b class="mono">${Math.round(R.acPower(v, a))}</b></span></div>
          <div class="s"><span style="width:110px" class="bar ${a.cond < 40 ? 'red' : a.cond < 75 ? '' : 'green'}"><i style="width:${a.cond}%"></i></span><span class="mono">${Math.floor(a.cond)} %</span><span>Crew: ${crew.length ? crew.map(p => `<b>${esc(p.call)}</b>`).join(', ') : '<span class="bad">keine</span>'} (${crew.length}/${M.crew})</span></div></div>
          <div class="a">${a.mission ? '' : `<button class="btn small" data-act="crewEdit" data-id="${a.id}">Crew</button>${rc ? `<button class="btn small" data-act="repairAc" data-id="${a.id}" ${v.res.material < rc ? 'disabled' : ''}>${IC.wrench} ${fmtK(rc)}</button>` : ''}<button class="btn small danger" data-act="sellAc" data-id="${a.id}">Ausmustern</button>`}</div>${edit}</div>`;
      }).join('') + '</div>';
    } else if (P.tab === 'buy') {
      body += `<div class="section-h"><h3>Freie Plätze: Hangar ${st.planeSlots - st.planeUsed} · Landeplätze ${st.heloSlots - st.heloUsed} · Startbahn Stufe ${R.runwayLevel(v)}</h3></div><div class="grid">`;
      body += Object.entries(R.AIRCRAFT).map(([k, M]) => {
        let why = '';
        if (st.hq < M.hq) why = `Kommandozentrale Stufe ${M.hq} nötig`;
        else if (M.helo && st.heloUsed + 1 > st.heloSlots) why = 'Kein freier Hubschrauberlandeplatz';
        else if (!M.helo && R.runwayLevel(v) < M.rw) why = `Startbahn Stufe ${M.rw} nötig`;
        else if (!M.helo && st.planeUsed + (M.heavy ? 2 : 1) > st.planeSlots) why = M.heavy ? 'Braucht 2 freie Hangarplätze' : 'Kein freier Hangarplatz';
        else if (!affordable(M.cost, v.res)) why = 'Nicht genug Ressourcen';
        return `<div class="card ${st.hq < M.hq ? 'locked' : ''}"><img class="th" src="${thumb('ac', M.shape, M.paint)}" alt=""><h4>${M.name}</h4>
          <div class="meta"><span class="chip info">${R.ROLES[M.role]}</span><span class="chip">Einsatzwert ${M.power}</span><span class="chip">${M.crew} Crew</span>${M.heavy ? '<span class="chip warn">schwer</span>' : ''}</div>
          <dl class="kv"><dt>Kerosin / 10 Min</dt><dd>${M.fuel}</dd><dt>Munition / Einsatz</dt><dd>${M.ammo || '–'}</dd><dt>Voraussetzung</dt><dd>HQ&nbsp;${M.hq}${M.helo ? ' · Landeplatz' : ` · Bahn&nbsp;${M.rw}`}</dd></dl>
          <div class="foot">${costHtml(M.cost, v.res)}<button class="btn small primary" data-act="buyAc" data-m="${k}" ${why ? 'disabled' : ''}>Kaufen</button></div>${why ? `<div class="why">${why}</div>` : ''}</div>`;
      }).join('') + '</div>';
    } else {
      const mp = R.byKind(v, 'motorpool').filter(b => b.level > 0).length;
      body += `<div class="section-h"><h3>Fahrzeughof ${v.vehicles.length}/${st.vehCap} Plätze</h3></div>`;
      if (!mp) body += `<div class="empty">Baue zuerst einen Fahrzeughof (ab Kommandozentrale Stufe 2).</div>`;
      if (v.vehicles.length) body += '<div class="list" style="margin-bottom:14px">' + v.vehicles.map(x => { const V = R.VEHICLES[x.model]; return `<div class="item"><img class="th" src="${thumb('veh', V.shape)}" alt=""><div><div class="n">${V.name}</div><div class="s good">${V.fx}</div></div><div class="a"><button class="btn small danger" data-act="sellVeh" data-id="${x.id}">Verkaufen</button></div></div>`; }).join('') + '</div>';
      body += '<div class="grid">' + Object.entries(R.VEHICLES).map(([k, V]) => {
        const n = v.vehicles.filter(x => x.model === k).length;
        const why = !mp ? 'Fahrzeughof nötig' : st.hq < V.hq ? `Kommandozentrale Stufe ${V.hq} nötig` : v.vehicles.length >= st.vehCap ? 'Fahrzeughof voll' : n >= R.VEHICLE_MAX_SAME ? 'Maximum dieses Typs' : !affordable(V.cost, v.res) ? 'Nicht genug Ressourcen' : '';
        return `<div class="card"><img class="th" src="${thumb('veh', V.shape)}" alt=""><div class="row"><h4 class="grow">${V.name}</h4><span class="chip">${n}/${R.VEHICLE_MAX_SAME}</span></div><p class="good">${V.fx}</p><div class="foot">${costHtml(V.cost, v.res)}<button class="btn small primary" data-act="buyVeh" data-m="${k}" ${why ? 'disabled' : ''}>Kaufen</button></div>${why ? `<div class="why">${why}</div>` : ''}</div>`;
      }).join('') + '</div>';
    }
    return { title: 'Flotte & Fuhrpark', sub: 'Maschinen beschaffen, Crews einteilen, Schäden beheben', tabs, body };
  }

  pStaff(v, st, now, P) {
    const roles = Object.keys(R.ROLES_P);
    const tabs = roles.map(r => [r, `${R.ROLES_P[r].plural} (${v.people.filter(p => p.role === r).length})`]);
    const Rr = R.ROLES_P[P.tab];
    const full = st.staff >= st.staffCap;
    let body = `<div class="section-h"><h3>Unterkünfte ${st.staff}/${st.staffCap} · ${Rr.fx}</h3><span class="row">${costHtml({ budget: Rr.cost }, v.res)}<button class="btn small primary" data-act="recruit" data-r="${P.tab}" ${full || v.res.budget < Rr.cost ? 'disabled' : ''}>${Rr.name} einstellen</button></span></div>`;
    if (full) body += `<div class="bad" style="margin:-4px 0 10px;font-size:13px">Unterkünfte voll – baue oder erweitere eine Unterkunft.</div>`;
    const list = v.people.filter(p => p.role === P.tab);
    if (!list.length) body += `<div class="empty">Noch niemand in dieser Funktion.</div>`;
    const crewMap = R.crewOf(v);
    body += '<div class="list">' + list.map(p => {
      const s = R.personStatus(v, p, now); const [cls, txt] = PSTAT[s];
      let extra = '', acts = '';
      if (p.role === 'pilot') {
        const L = R.pilotLevel(p.xp), nx = R.PILOT_XP[L], cu = R.PILOT_XP[L - 1];
        const ac = crewMap[p.id] ? v.aircraft.find(a => a.id === crewMap[p.id]) : null;
        extra = `<div class="s"><span class="amber">${R.pilotRank(L)} · Stufe ${L}</span><span class="bar" style="width:90px"><i style="width:${nx ? (p.xp - cu) / (nx - cu) * 100 : 100}%"></i></span><span class="mono">${fmt(p.xp)} EP</span><span>${ac ? `Fliegt: <b>${R.AIRCRAFT[ac.model].name}</b>` : '<span class="muted">nicht eingeteilt</span>'}</span></div>`;
        if (st.schoolL) acts += `<button class="btn small" data-act="train" data-id="${p.id}" ${s !== 'ready' || v.res.budget < 400 * L ? 'disabled' : ''}>Simulator (${fmtK(400 * L)})</button>`;
      }
      const until = s === 'rest' ? p.restUntil : s === 'training' ? p.trainUntil : 0;
      acts += `<button class="btn small danger" data-act="dismiss" data-id="${p.id}" ${p.mission ? 'disabled' : ''}>Entlassen</button>`;
      return `<div class="item" style="grid-template-columns:1fr auto"><div><div class="n">${esc(p.name)}${p.call ? ` <span class="amber">„${esc(p.call)}“</span>` : ''}</div><div class="s"><span class="chip ${cls}">${txt}${until ? ` <span data-cd="${until}"></span>` : ''}</span><span>${R.ROLES_P[p.role].name}</span></div>${extra}</div><div class="a">${acts}</div></div>`;
    }).join('') + '</div>';
    if (P.tab === 'pilot' && !st.schoolL) body += `<p class="muted" style="font-size:13px;margin-top:12px">Tipp: Mit einer Flugschule (ab Kommandozentrale Stufe 3) können Pilot:innen im Simulator Erfahrung sammeln.</p>`;
    return { title: 'Personal', sub: 'Pilot:innen, Technik, Logistik und Flugleitung', tabs, body };
  }

  autoPick() {
    const v = this.g.view; const m = v.board.list.find(x => x.id === this.pkg.mid); if (!m) return;
    const now = this.g.now();
    const cand = v.aircraft.filter(a => R.canFly(R.AIRCRAFT[a.model], m) && R.aircraftStatus(v, a, now).code === 'ready')
      .sort((a, b) => R.acPower(v, b, m) - R.acPower(v, a, m));
    let P = 0;
    for (const a of cand) { if (this.pkg.ac.size >= m.minAc && P >= m.D * 1.25) break; if (this.pkg.ac.size >= m.maxAc) break; this.pkg.ac.add(a.id); P += R.acPower(v, a, m); }
  }
  pMissions(v, st, now, P) {
    const board = v.board.list.filter(m => m.exp > now);
    const sel = board.find(m => m.id === this.pkg.mid);
    const left = board.length ? board.map(m => {
      const T = R.MTYPES[m.type];
      const fits = v.aircraft.filter(a => R.canFly(R.AIRCRAFT[a.model], m)).length;
      return `<div class="item ${sel === m ? 'sel' : ''}" style="grid-template-columns:1fr auto;cursor:pointer" data-act="mSel" data-id="${m.id}">
        <div><div class="n">Op. ${m.op}</div><div class="s"><span class="chip ${T.combat ? 'warn' : 'info'}">${T.name}</span><span>${esc(m.place)}</span></div>
        <div class="s"><span>Bedrohung <b class="mono">${m.D}</b></span><span>${IC.clock} ${fmtDur(R.missionDuration(v, m) * 1000)}</span><span>min. ${m.minAc} Masch.</span>${fits ? '' : '<span class="bad">keine passende Maschine</span>'}</div>
        <div class="s">${costHtml(m.rew)}${m.rew.medals ? `<span style="color:#ffd27a">${IC.medals} ${m.rew.medals}</span>` : ''}<span class="muted">verfällt in <span data-cd="${m.exp}"></span></span></div></div>
        <div class="a"><span class="chip">${T.roles.map(r => R.ROLES[r]).join(' / ')}</span></div></div>`;
    }).join('') : `<div class="empty">Keine Aufträge – neue Lagemeldungen in <span data-cd="${v.board.refreshAt}"></span>.</div>`;
    let right = '';
    if (!sel) right = `<div class="pkg"><h3>Einsatzplanung</h3><p class="muted" style="font-size:13.5px;line-height:1.5">Wähle links einen Auftrag. Stelle dann eine Rotte zusammen: Der <b>Einsatzwert</b> deiner Maschinen (Typ, Zustand, Erfahrung der Crew) gegen die <b>Bedrohung</b> bestimmt die Erfolgschance. Kampfeinsätze verbrauchen Munition und können Maschinen beschädigen.</p><p class="muted" style="font-size:13px">Einsätze aktiv: <b class="mono">${v.ops.length}/${st.maxOps}</b></p></div>`;
    else {
      const T = R.MTYPES[sel.type];
      const pv = R.missionPreview(v, sel, [...this.pkg.ac]);
      const cand = v.aircraft.filter(a => R.canFly(R.AIRCRAFT[a.model], sel));
      const opsFull = v.ops.length >= st.maxOps;
      const n = this.pkg.ac.size;
      const canPay = v.res.fuel >= pv.cost.fuel && v.res.ammo >= pv.cost.ammo;
      const why = opsFull ? 'Alle Einsatz-Slots belegt – Kontrollturm ausbauen' : n < sel.minAc ? `Mindestens ${sel.minAc} Maschine(n) wählen` : !canPay ? 'Nicht genug Kerosin/Munition' : '';
      const col = pv.chance >= 0.75 ? 'var(--green)' : pv.chance >= 0.5 ? 'var(--amber)' : 'var(--red)';
      const maxP = Math.max(pv.P, sel.D) * 1.4 || 1;
      right = `<div class="pkg"><div class="label">Operation</div><h3>${sel.op}</h3><div class="muted" style="font-size:13px">${T.name} · ${esc(sel.place)}</div>
        <div class="acpick">${cand.length ? cand.map(a => {
          const M = R.AIRCRAFT[a.model]; const s = R.aircraftStatus(v, a, now); const fit = R.MTYPES[sel.type].roles.includes(M.role);
          const off = s.code !== 'ready';
          return `<label class="${off ? 'off' : ''}"><input type="checkbox" data-pick-ac value="${a.id}" ${this.pkg.ac.has(a.id) ? 'checked' : ''} ${off ? 'disabled' : ''}><span><b>${M.name}</b><br><span class="muted" style="font-size:11.5px">${off ? s.text : `${Math.floor(a.cond)} % · ${a.crew.map(pid => v.people.find(p => p.id === pid)?.call).join(', ')}`}</span></span><span class="chip ${fit ? 'ok' : 'warn'}">${fit ? 'geeignet' : 'bedingt'} · ${Math.round(R.acPower(v, a, sel))}</span></label>`;
        }).join('') : '<div class="empty" style="padding:14px">Keine geeigneten Maschinen. Benötigt: ' + T.roles.map(r => R.ROLES[r]).join(', ') + '</div>'}</div>
        <div class="row" style="align-items:flex-end"><div class="grow"><div class="label">Erfolgschance</div><div class="chance" style="color:${n ? col : 'var(--dim)'}">${n ? pct(pv.chance) : '–'}</div></div>
          <div style="text-align:right"><div class="label">Einsatzwert / Bedrohung</div><div class="mono" style="font-size:18px">${pv.P} / ${sel.D}</div></div></div>
        <div class="meter"><i style="width:${pv.P / maxP * 100}%;background:${col}"></i><span class="d" style="left:${sel.D / maxP * 100}%"></span></div>
        <dl class="kv" style="margin-top:10px"><dt>Kosten</dt><dd>${costHtml({ fuel: pv.cost.fuel, ammo: pv.cost.ammo }, v.res)}</dd><dt>Dauer</dt><dd>${fmtDur(R.missionDuration(v, sel) * 1000)}</dd><dt>Belohnung</dt><dd>${costHtml(sel.rew)}${sel.rew.medals ? ` <span style="color:#ffd27a">${IC.medals}${sel.rew.medals}</span>` : ''}</dd><dt>Verlustrisiko</dt><dd class="${pv.risk > 0.06 ? 'bad' : pv.risk > 0.02 ? 'amber' : 'good'}">${T.combat ? (pv.risk > 0.06 ? 'hoch' : pv.risk > 0.02 ? 'mittel' : 'gering') : 'keins'}</dd></dl>
        <button class="btn primary big" style="margin-top:12px" data-act="mSend" ${why ? 'disabled' : ''}>Rotte starten</button>${why ? `<div class="why bad" style="font-size:12px;margin-top:6px">${why}</div>` : ''}</div>`;
    }
    const sub = `Aktive Einsätze ${v.ops.length}/${st.maxOps} · nächste Lagemeldung in <span data-cd="${v.board.refreshAt}"></span>`;
    const body = `<div class="section-h"><h3>Einsatzbrett</h3><button class="btn small" data-act="refreshBoard" ${v.res.budget < 250 * st.hq ? 'disabled' : ''}>Neue Aufträge anfordern (${fmtK(250 * st.hq)})</button></div><div class="split"><div class="list">${left}</div><div>${right}</div></div>`;
    return { title: 'Einsätze', sub, body };
  }

  async loadTargets() {
    try { const r = await this.g.api.get('/api/targets'); this.atk.list = r.list; this.atk.err = null; }
    catch (e) { this.atk.err = e.message; this.atk.list = []; }
    if (this.panel?.name === 'attack') this.update(true);
  }
  async loadRank() {
    try { const r = await this.g.api.get('/api/leaderboard'); this.rank = r.list; } catch { this.rank = []; }
    if (this.panel?.name === 'rank') this.update(true);
  }
  pAttack(v, st, now) {
    const list = this.atk.list;
    const tgt = list?.find(t => t.id === this.atk.target);
    const myPow = R.strikePower(v, [...this.atk.ac]);
    let left = !list ? '<div class="empty">Aufklärung läuft …</div>' : !list.length ? `<div class="empty">${this.atk.err || 'Keine Ziele in Reichweite.'}</div>` :
      list.map(t => `<div class="item ${t.id === this.atk.target ? 'sel' : ''}" style="grid-template-columns:1fr auto;cursor:pointer" data-act="tSel" data-id="${esc(t.id)}"><div><div class="n">${esc(t.name)}</div><div class="s"><span class="chip ${t.ai ? 'warn' : 'info'}">${esc(t.owner)}</span><span>HQ ${t.hq}</span><span class="amber">${IC.trophy}${t.trophies}</span></div></div><div class="a"><span class="mono">Abwehr ~${fmt(t.def)}</span></div></div>`).join('');
    let right;
    if (!tgt) right = `<div class="pkg"><h3>Angriffsplanung</h3><p class="muted" style="font-size:13.5px;line-height:1.5">Greife andere Fliegerhorste oder Stellungen der Red Force an, um Ressourcen und Ruhm zu erbeuten. Je stärker dein Paket aus Kampfflugzeugen im Verhältnis zur gegnerischen Abwehr, desto mehr Sterne (★) und Beute. Wer angegriffen wurde, erhält einen Schutzschild.</p><p class="muted" style="font-size:13px">Dein Ruhm: <b class="amber mono">${v.trophies}</b></p></div>`;
    else {
      const cand = v.aircraft.filter(a => R.strikePower(v, [a.id]) > 0);
      const q = myPow / Math.max(1, tgt.def);
      const est = q >= 1.7 ? 3 : q >= 1.2 ? 2 : q >= 0.8 ? 1 : 0;
      const fuel = [...this.atk.ac].reduce((t, id) => t + R.AIRCRAFT[v.aircraft.find(a => a.id === id)?.model]?.fuel * 1.2 || 0, 0);
      const ammo = [...this.atk.ac].reduce((t, id) => t + R.AIRCRAFT[v.aircraft.find(a => a.id === id)?.model]?.ammo * 1.2 || 0, 0);
      const why = v.ops.length >= st.maxOps ? 'Alle Einsatz-Slots belegt' : !this.atk.ac.size ? 'Maschinen wählen' : v.res.fuel < fuel || v.res.ammo < ammo ? 'Nicht genug Kerosin/Munition' : '';
      right = `<div class="pkg"><div class="label">Ziel</div><h3>${esc(tgt.name)}</h3><div class="muted" style="font-size:13px">${esc(tgt.owner)} · HQ ${tgt.hq} · geschätzte Abwehr ${fmt(tgt.def)}</div>
        <div class="acpick">${cand.map(a => { const M = R.AIRCRAFT[a.model]; const s = R.aircraftStatus(v, a, now); const off = s.code !== 'ready'; return `<label class="${off ? 'off' : ''}"><input type="checkbox" data-atk-ac value="${a.id}" ${this.atk.ac.has(a.id) ? 'checked' : ''} ${off ? 'disabled' : ''}><span><b>${M.name}</b><br><span class="muted" style="font-size:11.5px">${off ? s.text : Math.floor(a.cond) + ' %'}</span></span><span class="chip">${Math.round(R.strikePower(v, [a.id]))}</span></label>`; }).join('') || '<div class="empty" style="padding:14px">Keine angriffsfähigen Maschinen.</div>'}</div>
        <div class="row"><div class="grow"><div class="label">Erwartung</div><div class="report"><div class="stars" style="text-align:left">${'★'.repeat(est)}<span style="opacity:.2">${'★'.repeat(3 - est)}</span></div></div></div><div style="text-align:right"><div class="label">Schlagkraft / Abwehr</div><div class="mono" style="font-size:18px">${Math.round(myPow)} / ${fmt(tgt.def)}</div></div></div>
        <dl class="kv"><dt>Kosten</dt><dd>${costHtml({ fuel: Math.round(fuel), ammo: Math.round(ammo) }, v.res)}</dd><dt>Flugzeit</dt><dd>3:00</dd></dl>
        <button class="btn primary big" style="margin-top:12px" data-act="atkSend" ${why ? 'disabled' : ''}>Angriff starten</button>${why ? `<div class="bad" style="font-size:12px;margin-top:6px">${why}</div>` : ''}</div>`;
    }
    const body = `<div class="section-h"><h3>Ziele in deiner Liga</h3><button class="btn small" data-act="tReload">Neu aufklären</button></div><div class="split"><div class="list">${left}</div><div>${right}</div></div>`;
    return { title: 'Angriff', sub: v.shieldUntil > now ? `Dein Schutzschild endet beim Angriff (noch <span data-cd="${v.shieldUntil}"></span>)` : 'Fremde Basen angreifen, Beute machen, Ruhm sammeln', body };
  }

  pRank() {
    const l = this.rank;
    const body = !l ? '<div class="empty">Lade Rangliste …</div>' : `<table class="lb"><tr><th>#</th><th>Kommandeur:in</th><th>Basis</th><th>HQ</th><th>Ruhm</th><th>Stärke</th></tr>${l.map(u => `<tr class="${u.me ? 'me' : ''}"><td class="mono">${u.rank}</td><td>${esc(u.name)}</td><td>${esc(u.base)}</td><td class="mono">${u.hq}</td><td class="mono amber">${fmt(u.trophies)}</td><td class="mono">${fmt(u.power)}</td></tr>`).join('')}</table>`;
    return { title: 'Rangliste', sub: 'Die ruhmreichsten Fliegerhorste', body };
  }

  logEntryHtml(e) {
    const K = { raid: [e.defended ? 'good' : 'bad', IC.radar], mission: [e.success ? 'good' : 'bad', IC.mission], build: ['cyan', IC.build], pvp: [e.stars ? 'good' : 'bad', IC.attack], defense: [e.stars ? 'bad' : 'good', IC.shield], train: ['cyan', IC.staff], info: ['amber', IC.info] }[e.kind] || ['muted', IC.info];
    let dt = '';
    if (e.got && Object.keys(e.got).length) dt += `+ ${costHtml(e.got)}${e.got.medals ? ` <span style="color:#ffd27a">${IC.medals}${e.got.medals}</span>` : ''}`;
    if (e.overflow) dt += ' <span class="amber">(Lager voll)</span>';
    if (e.lost) dt += ` <span class="bad">· Verlust: ${R.AIRCRAFT[e.lost.model].name}</span>`;
    if (e.kind === 'raid' && e.leak) dt += `Verluste: ${costHtml(Object.fromEntries(R.RES.map(k => [k, e.loss[k] || 0])))}`;
    if (e.kind === 'raid' && !e.leak) dt += `Prämie: ${costHtml({ budget: e.loss.bonus || 0 })} · ${IC.medals} 1`;
    if (e.kind === 'defense' && e.stars) dt += `Verluste: ${costHtml(e.loss)}`;
    if (e.trophies) dt += ` <span class="${e.trophies > 0 ? 'good' : 'bad'}">${e.trophies > 0 ? '+' : ''}${e.trophies} Ruhm</span>`;
    const t = new Date(e.t);
    return `<div class="logi"><span class="ic ${K[0]}">${K[1]}</span><div><div>${esc(e.text)}</div>${dt ? `<div class="dt">${dt}</div>` : ''}</div><span class="tm">${t.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
  }
  pLog(v, st, now, P) {
    const f = { all: () => true, combat: e => ['raid', 'defense', 'pvp'].includes(e.kind), ops: e => e.kind === 'mission', base: e => ['build', 'train', 'info'].includes(e.kind) }[P.tab];
    const l = v.log.filter(f).slice().reverse();
    return { title: 'Lagebuch', sub: `Nächste Radarlage: ${st.radarL ? 'Radar aktiv · Vorwarnung ' + st.warn + ' s' : 'kein Radar – nur 15 s Vorwarnung'}`, tabs: [['all', 'Alles'], ['combat', 'Gefechte'], ['ops', 'Einsätze'], ['base', 'Basis']], body: l.length ? l.map(e => this.logEntryHtml(e)).join('') : '<div class="empty">Noch keine Einträge.</div>' };
  }

  pSettings(v, st) {
    const tm = this.g.sc.timeMode;
    const body = `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
      <div class="card"><h4>Basis</h4><div class="formrow"><input id="renameInput" maxlength="24" value="${esc(v.name)}"><button class="btn small" data-act="rename">Umbenennen</button></div><p>Kommandeur:in <b>${esc(v.commander)}</b> · Stärke ${fmt(R.basePower(v, this.g.now()))}</p></div>
      <div class="card"><h4>Darstellung & Ton</h4><div class="formrow"><span class="muted">Tageszeit</span><select data-set-time><option value="cycle" ${tm === 'cycle' ? 'selected' : ''}>Tag-/Nachtzyklus</option><option value="day" ${tm === 'day' ? 'selected' : ''}>Immer Tag</option><option value="night" ${tm === 'night' ? 'selected' : ''}>Immer Nacht</option></select></div><div class="formrow"><button class="btn small" data-act="sound">${IC.sound} Ton ${this.g.audio.on ? 'an' : 'aus'}</button></div></div>
      <div class="card"><h4>Steuerung</h4><p>Ziehen: Karte verschieben · Rechte Maustaste/Shift + Ziehen: drehen · Mausrad/Pinch: Zoom · WASD/Pfeile, Q/E · Tasten B F P M X L öffnen Menüs · R dreht beim Bauen · Esc schließt</p></div>
      <div class="card"><h4>Account</h4><p>Dein Fortschritt wird automatisch auf dem Server gespeichert.</p><div class="foot"><span></span><button class="btn small danger" data-act="logout">Abmelden</button></div></div></div>`;
    return { title: 'Kommando', sub: `${R.CMD_RANKS[R.cmdLevel(v.xp) - 1]} ${esc(v.commander)} · ${fmt(v.xp)} EP`, body };
  }

  brief() { this.panel = { name: 'brief' }; $('#modal').hidden = false; this.last.pHead = this.last.pBody = null; this.renderPanel(true); }
  pBrief(v) {
    const pts = [
      [IC.budget, 'Ressourcen', 'Budget, Kerosin, Munition und Material entstehen in Kommandozentrale und Lagern. Tippe auf die schwebenden Symbole, um sie einzusammeln.'],
      [IC.build, 'Ausbauen', 'Wähle ein Gebäude und baue es aus. Die Kommandozentrale bestimmt die Höchststufe aller anderen Gebäude und schaltet Neues frei.'],
      [IC.mission, 'Einsätze', 'Im Einsatzbrett stellst du Rotten zusammen. Erfolg bringt Budget, Material, Orden und Erfahrung für deine Crews.'],
      [IC.radar, 'Luftverteidigung', 'Ab Kommandozentrale Stufe 2 greift die Red Force an. Flak, C-RAM, IRIS-T und Patriot verteidigen – solange genug Munition da ist.'],
      [IC.attack, 'Angriff & Ruhm', 'Greife andere Spieler:innen oder KI-Stellungen an, erbeute Ressourcen und steige in der Rangliste auf.'],
    ];
    const body = `<div style="max-width:640px;margin:0 auto"><p style="font-size:15px;line-height:1.55">Kommandeur:in <b class="amber">${esc(v.commander)}</b>, willkommen auf <b>${esc(v.name)}</b>. Die Basis ist einsatzbereit – mit einer F-16C, einem Pilatus-Trainer und einer kleinen Mannschaft. Lagebesprechung:</p>
      <div class="list">${pts.map(([i, t, d]) => `<div class="item" style="grid-template-columns:auto 1fr"><span class="amber" style="display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line)">${i}</span><div><div class="n">${t}</div><div class="s" style="font-size:13px;line-height:1.45">${d}</div></div></div>`).join('')}</div>
      <div style="text-align:center;margin-top:16px"><button class="btn primary big" style="max-width:280px" data-act="close">Dienst antreten</button></div></div>`;
    return { title: 'Lagebesprechung', sub: 'Erste Orientierung', body };
  }

  // Gefechtsbericht
  report(e) { this.reportEntry = e; this.panel = { name: 'report' }; $('#modal').hidden = false; this.last.pHead = this.last.pBody = null; this.renderPanel(true); }
  pReport() {
    const e = this.reportEntry;
    const ok = e.defended;
    const types = {};
    for (const en of e.enemies || []) types[en.type] = (types[en.type] || 0) + 1;
    const body = `<div class="report"><div class="label">Gefechtsbericht · ${new Date(e.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="big ${ok ? 'good' : 'bad'}" style="margin:12px 0">${ok ? 'Angriff abgewehrt' : 'Durchbruch'}</div>
      <div class="mono" style="font-size:20px">${e.down} / ${e.n} abgeschossen</div>
      <p class="muted">${Object.entries(types).map(([k, n]) => `${n}× ${R.ENEMIES[k].name}`).join(' · ')}</p>
      ${ok ? `<p>Prämie: ${costHtml({ budget: e.loss.bonus || 0 })} · <span style="color:#ffd27a">${IC.medals} 1 Orden</span> · <span class="good">+3 Ruhm</span></p>` : `<p>Verluste: ${costHtml(Object.fromEntries(R.RES.map(k => [k, e.loss[k] || 0])))}${Object.keys(e.dmgAc || {}).length ? ` · ${Object.keys(e.dmgAc).length} Maschine(n) beschädigt` : ''}</p><p class="muted" style="font-size:13px">Tipp: Mehr Abwehranlagen bauen, Radar errichten und genug Munition vorhalten.</p>`}
      ${e.ammoEff < 1 ? `<p class="bad" style="font-size:13px">Munitionsmangel: Abwehr nur mit ${pct(e.ammoEff)} Leistung!</p>` : ''}
      <button class="btn primary" style="margin-top:14px;min-width:200px" data-act="report-close">Verstanden</button></div>`;
    return { title: 'Luftverteidigung', sub: '', body };
  }

  // ------------------------------------------------------------ Labels
  updateLabelsContent(v, st, now) {
    const want = new Map();
    for (const b of v.buildings) {
      if (b.busy) want.set('p' + b.id, { b, type: 'prog', html: `<div data-cd="${b.busy.end}"></div><div class="bar"><i data-ps="${b.busy.start}" data-pe="${b.busy.end}"></i></div>` });
      if (R.PROD[b.kind] && b.level > 0 && !b.busy) {
        const o = R.PROD[b.kind](b.level); const k = Object.keys(o)[0];
        const cap = o[k] * R.ACC_HOURS * (1 + st.logBonus);
        if (b.acc >= Math.max(20, o[k] * 0.08)) want.set('c' + b.id, { b, type: 'bub' + (b.acc >= cap * 0.98 ? ' full' : ''), html: `<span style="color:${RC[k]}">${IC[k]}</span>`, act: b.id });
      }
    }
    const layer = $('#labels');
    for (const [key, d] of want) {
      let L = this.labels.get(key);
      if (!L) {
        const el = document.createElement('div'); el.className = 'lbl ' + d.type; layer.appendChild(el);
        if (d.act) { el.dataset.act = 'collect'; el.dataset.id = d.act; }
        L = { el, html: '' }; this.labels.set(key, L);
      }
      L.b = d.b; L.el.className = 'lbl ' + d.type;
      if (L.html !== d.html) { L.el.innerHTML = d.html; L.html = d.html; }
    }
    for (const [key, L] of this.labels) if (!want.has(key)) { L.el.remove(); this.labels.delete(key); }
  }
  frame() {
    const w = this.g.world; const sc = this.g.sc;
    const tmp = new THREE.Vector3();
    for (const L of this.labels.values()) {
      const e = w.b.get(L.b.id); if (!e) { L.el.style.display = 'none'; continue; }
      tmp.copy(e.g.position); tmp.y = LBL_H[L.b.kind] ?? 1.6;
      const p = sc.project(tmp);
      L.el.style.display = p.vis ? '' : 'none';
      L.el.style.left = p.x + 'px'; L.el.style.top = p.y + 'px';
    }
    this.floats = this.floats.filter(f => {
      if (performance.now() - f.t0 > 1500) { f.el.remove(); return false; }
      const p = sc.project(f.pos); f.el.style.left = p.x + 'px'; f.el.style.top = p.y + 'px'; return true;
    });
  }
  showGot(got, bid) {
    const w = this.g.world;
    const targets = bid ? [bid] : [...w.b.values()].filter(e => R.PROD[e.kind]).map(e => e.data.id);
    let i = 0;
    for (const k of Object.keys(got)) {
      if (!got[k]) continue;
      const e = w.b.get(targets.find(id => Object.keys(R.PROD[w.b.get(id).kind](1))[0] === k) ?? targets[0]); if (!e) continue;
      const el = document.createElement('div'); el.className = 'lbl float'; el.innerHTML = `+${fmtK(got[k])}`; el.style.color = RC[k];
      $('#labels').appendChild(el);
      this.floats.push({ el, pos: e.g.position.clone().setY(2.2 + i * 0.3), t0: performance.now() }); i++;
    }
    this.g.audio.chime(true);
  }

  // ------------------------------------------------------------ Diverses
  toast(type, title, detail) {
    const el = document.createElement('div'); el.className = `toast ${type}`;
    el.innerHTML = `<div><b>${esc(title)}</b>${detail ? `<div class="d">${detail}</div>` : ''}</div>`;
    $('#toasts').prepend(el);
    while ($('#toasts').children.length > 4) $('#toasts').lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, type === 'bad' ? 5200 : 4200);
  }
  costHtml(c) { return costHtml(c); }
  setAlert(text, end) {
    const el = $('#alert');
    if (!text) { el.hidden = true; $('#vignette').classList.remove('on'); return; }
    el.hidden = false; $('#vignette').classList.add('on');
    const html = `${IC.radar}<span>${text}</span>${end ? `<span class="mono" data-cd="${end}"></span>` : ''}`;
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  }
  placebar(kind, valid, move) {
    const el = $('#placebar');
    if (!kind) { el.hidden = true; return; }
    el.hidden = false;
    const c = R.buildCost(kind, 1);
    const html = `<b>${R.BUILDINGS[kind].name}</b>${move ? '<span class="muted">verschieben</span>' : costHtml(c, this.g.view.res)}<button class="btn small" data-act="place-rot">↻ Drehen</button><button class="btn small primary" data-act="place-ok" ${valid ? '' : 'disabled'}>${move ? 'Hier abstellen' : 'Bauen'}</button><button class="btn small danger" data-act="place-cancel">Abbrechen</button>`;
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  }
}
