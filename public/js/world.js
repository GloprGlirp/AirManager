// Verbindet den Spielstand mit der 3D-Welt: Gebäude, Flugzeuge, Fahrzeuge, Animationen
import * as THREE from 'three';
import * as R from '/shared/rules.js';
import { building, scaffold, aircraft, vehicle, enemy, mat, COL } from './models.js';
import { HALF } from './scene.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function setOpacity(obj, a) {
  obj.traverse(o => {
    if (!o.isMesh || !o.material || o.material.isMeshBasicMaterial) return;
    if (!o.userData.ownMat) { o.material = o.material.clone(); o.userData.ownMat = true; }
    const tr = a < 0.999;
    if (o.material.transparent !== tr) { o.material.transparent = tr; o.material.needsUpdate = true; }
    o.material.opacity = a;
    o.castShadow = a > 0.5;
  });
}

export class World {
  constructor(sc, audio) {
    this.sc = sc; this.audio = audio;
    this.root = new THREE.Group(); sc.world.add(this.root);
    this.b = new Map();      // Gebäude
    this.ac = new Map();     // Flugzeuge
    this.veh = new Map();    // Fahrzeuge
    this.anims = [];
    this.selected = null;
    this.state = null;
    this.raid = null;
    this.t = 0;
    this.traffic = [];
    this.addServiceTraffic();
  }

  clearDemo() {
    for (const e of this.b.values()) this.root.remove(e.g);
    for (const e of this.ac.values()) this.root.remove(e.obj);
    for (const e of this.veh.values()) this.root.remove(e.o);
    this.b.clear(); this.ac.clear(); this.veh.clear(); this.anims = []; this.select(null);
  }

  // ------------------------------------------------------------ Koordinaten
  center(b) { const [w, d] = R.footprint(b); return V(b.x + w / 2 - HALF, 0, b.z + d / 2 - HALF); }
  runway() {
    const rw = this.state?.buildings.find(b => b.kind === 'runway') || { x: 4, z: 1, rot: 0, kind: 'runway' };
    const c = this.center(rw);
    return { z: c.z - 1, x0: c.x - 17.2, x1: c.x + 17.2 };
  }

  // ------------------------------------------------------------- Gebäude
  sync(state, now, initial = false) {
    const prev = this.state;
    this.state = state;
    const seen = new Set();
    for (const b of state.buildings) {
      seen.add(b.id);
      let e = this.b.get(b.id);
      const key = `${b.kind}:${b.level}:${b.busy ? 1 : 0}`;
      if (!e || e.key !== key) {
        if (e) this.root.remove(e.g);
        const g = new THREE.Group();
        const [w, d] = R.BUILDINGS[b.kind].size;
        if (b.level > 0) g.add(e?.model && e.modelLevel === b.level ? e.model : building(b.kind, b.level));
        const model = g.children[0] || null;
        if (b.busy) {
          const sc = scaffold(Math.min(w, 6), Math.min(d, 6), b.level > 0 ? 1.6 : 0.9);
          if (b.kind === 'runway') sc.position.set(-14, 0, 1.5);
          g.add(sc); g.userData.jib = sc.userData.jib;
        }
        g.userData.bid = b.id;
        g.traverse(o => { o.userData.bid = b.id; });
        this.root.add(g);
        const pulse = e && e.level < b.level;
        e = { g, key, model, modelLevel: b.level, kind: b.kind, level: b.level };
        this.b.set(b.id, e);
        if (pulse && !initial) this.popIn(g);
      }
      const c = this.center(b);
      e.g.position.copy(c);
      e.g.rotation.y = -(b.rot || 0) * Math.PI / 2;
      e.data = b;
    }
    for (const [id, e] of this.b) if (!seen.has(id)) { this.root.remove(e.g); this.b.delete(id); }
    this.root.updateMatrixWorld(true);
    this.syncAircraft(state, now, initial);
    this.syncVehicles(state);
    if (this.selected && !this.b.has(this.selected)) this.select(null);
    else if (this.selected) this.select(this.selected);
  }
  popIn(g) {
    const t0 = this.t;
    this.anims.push({ up: () => { const k = Math.min(1, (this.t - t0) / 0.5); g.scale.setScalar(0.85 + 0.15 * (1 - Math.pow(1 - k, 3))); return k < 1; } });
  }
  pickables() { return [...this.b.values()].map(e => e.g); }
  buildingAt(obj) { while (obj && obj.userData.bid == null) obj = obj.parent; return obj ? obj.userData.bid : null; }

  select(id) {
    this.selected = id;
    if (this.selRing) { this.root.remove(this.selRing); this.selRing = null; }
    if (id == null) return;
    const e = this.b.get(id); if (!e) return;
    const b = e.data; const [w, d] = R.footprint(b);
    const g = new THREE.Group();
    const pts = [V(-w / 2, 0, -d / 2), V(w / 2, 0, -d / 2), V(w / 2, 0, d / 2), V(-w / 2, 0, d / 2), V(-w / 2, 0, -d / 2)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffb547 }));
    line.position.y = 0.07; g.add(line);
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.12, depthWrite: false }));
    fill.position.y = 0.05; g.add(fill);
    const D = R.DEF[b.kind];
    if (D) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(D.range - 0.08, D.range, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7b52, transparent: true, opacity: 0.55, depthWrite: false }));
      ring.position.y = 0.06; g.add(ring);
    }
    g.position.copy(this.center(b));
    this.root.add(g); this.selRing = g;
  }

  // Bauvorschau
  setGhost(kind, x, z, rot, valid) {
    if (!this.ghost || this.ghost.kind !== kind) {
      if (this.ghost) this.root.remove(this.ghost.g);
      const g = new THREE.Group();
      const m = building(kind, 1); setOpacity(m, 0.6); g.add(m);
      const [w, d] = R.BUILDINGS[kind].size;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7ce38b, transparent: true, opacity: 0.35, depthWrite: false }));
      pad.position.y = 0.06; g.add(pad);
      const D = R.DEF[kind];
      if (D) { const ring = new THREE.Mesh(new THREE.RingGeometry(D.range - 0.08, D.range, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7b52, transparent: true, opacity: 0.5, depthWrite: false })); ring.position.y = 0.06; g.add(ring); }
      this.ghost = { g, kind, pad };
      this.root.add(g);
    }
    const [w, d] = rot % 2 ? [R.BUILDINGS[kind].size[1], R.BUILDINGS[kind].size[0]] : R.BUILDINGS[kind].size;
    this.ghost.g.position.set(x + w / 2 - HALF, 0.02, z + d / 2 - HALF);
    this.ghost.g.rotation.y = -rot * Math.PI / 2;
    this.ghost.pad.material.color.set(valid ? 0x7ce38b : 0xff5a4e);
    this.ghost.g.visible = true;
  }
  clearGhost() { if (this.ghost) { this.root.remove(this.ghost.g); this.ghost = null; } }
  hideBuilding(id, hide) { const e = this.b.get(id); if (e) e.g.visible = !hide; }

  // ---------------------------------------------------------- Flugzeuge
  parking(state) {
    const spots = new Map();
    const hangars = state.buildings.filter(b => b.kind === 'hangar' && b.level > 0).sort((a, b) => a.id - b.id);
    const pads = state.buildings.filter(b => b.kind === 'helipad' && b.level > 0).sort((a, b) => a.id - b.id);
    const planes = state.aircraft.filter(a => !R.AIRCRAFT[a.model].helo).sort((a, b) => a.id - b.id);
    const helos = state.aircraft.filter(a => R.AIRCRAFT[a.model].helo).sort((a, b) => a.id - b.id);
    const slotWorld = (hb, i) => {
      const e = this.b.get(hb.id); if (!e) return null;
      const s = e.model?.userData.slots || [[0, 0]];
      const p = s[Math.min(i, s.length - 1)];
      const v = V(p[0], 0, p[1]); e.g.localToWorld(v);
      return { v, yaw: e.g.rotation.y + Math.PI, inside: i >= 3 };
    };
    let hi = 0, used = 0;
    for (const a of planes) {
      const need = R.AIRCRAFT[a.model].heavy ? 2 : 1;
      while (hi < hangars.length && used + need > R.hangarSlots(hangars[hi].level)) { hi++; used = 0; }
      if (hi >= hangars.length) break;
      const hb = hangars[hi];
      let sp;
      if (need === 2) {
        const s1 = slotWorld(hb, used), s2 = slotWorld(hb, used + 1);
        if (s1 && s2) sp = { v: s1.v.clone().lerp(s2.v, 0.5), yaw: s1.yaw, inside: s1.inside };
      } else sp = slotWorld(hb, used);
      if (sp) spots.set(a.id, { ...sp, hangar: hb.id });
      used += need;
    }
    helos.forEach((a, i) => { if (pads[i]) { const sp = slotWorld(pads[i], 0); if (sp) spots.set(a.id, { ...sp, yaw: sp.yaw + Math.PI, pad: true }); } });
    return spots;
  }
  syncAircraft(state, now, initial) {
    const spots = this.parking(state);
    const seen = new Set();
    let stagger = 0, lstagger = 0;
    for (const a of state.aircraft) {
      seen.add(a.id);
      const M = R.AIRCRAFT[a.model];
      let e = this.ac.get(a.id);
      if (!e) {
        const obj = aircraft(M.shape, M.paint);
        if (M.heavy) obj.scale.setScalar(0.85);
        obj.userData.lift = Math.max(0, -new THREE.Box3().setFromObject(obj).min.y) + 0.04;
        obj.traverse(o => { o.userData.acid = a.id; });
        this.root.add(obj);
        e = { obj, mode: a.mission ? 'away' : 'parked', helo: !!M.helo, heavy: !!M.heavy, model: a.model };
        this.ac.set(a.id, e);
        if (!initial && !a.mission) this.popIn(obj);
      }
      e.spot = spots.get(a.id);
      e.data = a;
      if (initial) e.mode = a.mission ? 'away' : 'parked';
      if (a.mission && e.mode === 'parked') { this.takeoff(e, stagger); stagger += e.helo ? 1.2 : 2.6; }
      else if (!a.mission && e.mode === 'away') { this.landing(e, lstagger); lstagger += e.helo ? 1.5 : 3.0; }
      if (e.mode === 'parked') this.placeParked(e);
      if (e.mode === 'away') e.obj.visible = false;
    }
    for (const [id, e] of this.ac) if (!seen.has(id)) { this.root.remove(e.obj); this.ac.delete(id); }
  }
  placeParked(e) {
    if (!e.spot) { e.obj.visible = false; return; }
    e.obj.visible = true;
    e.obj.position.copy(e.spot.v); e.obj.position.y = (e.helo ? 0.06 : 0) + e.obj.userData.lift;
    e.obj.rotation.set(0, e.spot.yaw, 0);
    setOpacity(e.obj, 1);
    this.burners(e, false);
  }
  burners(e, on) { for (const b of e.obj.userData.burners || []) b.visible = on; }

  takeoff(e, delay) {
    e.mode = 'anim';
    const o = e.obj; const t0 = this.t + delay;
    const start = e.spot ? e.spot.v.clone() : V(0, 0, 0);
    const yaw0 = e.spot ? e.spot.yaw : 0;
    const fwd = V(Math.sin(yaw0), 0, Math.cos(yaw0));
    if (e.helo) {
      const dir = Math.random() * Math.PI * 2;
      const far = start.clone().add(V(Math.cos(dir) * 70, 14, Math.sin(dir) * 70));
      const curve = new THREE.CatmullRomCurve3([start.clone().setY(2.4), start.clone().add(V(Math.cos(dir) * 8, 4, Math.sin(dir) * 8)), far]);
      this.anims.push({ up: () => {
        const t = this.t - t0; if (t < 0) { this.placeParked(e); return true; }
        this.spin(e, 1);
        if (t < 2.2) { o.position.copy(start).setY(0.08 + ease(t / 2.2) * 2.3); return true; }
        const k = Math.min(1, (t - 2.2) / 6); const u = k * k;
        const p = curve.getPointAt(u); o.lookAt(curve.getPointAt(Math.min(1, u + 0.02))); o.position.copy(p);
        if (k > 0.8) setOpacity(o, (1 - k) / 0.2);
        if (k >= 1) { e.mode = 'away'; o.visible = false; setOpacity(o, 1); return false; }
        return true;
      } });
      this.audio?.rotor();
      return;
    }
    const rw = this.runway();
    const taxiEnd = start.clone().addScaledVector(fwd, 2.2);
    const L = o.userData.lift - 0.02;
    const pts = [V(rw.x0, L, rw.z), V(rw.x0 + 14, L, rw.z), V(rw.x0 + 22, 0.9 + L, rw.z), V(rw.x0 + 34, 3.6, rw.z), V(rw.x0 + 60, 10, rw.z - 2), V(rw.x0 + 100, 20, rw.z - 8)];
    const curve = new THREE.CatmullRomCurve3(pts);
    let boom = false;
    this.anims.push({ up: () => {
      const t = this.t - t0; if (t < 0) { this.placeParked(e); return true; }
      this.spin(e, 1);
      if (t < 2.2) { o.position.lerpVectors(start, taxiEnd, ease(t / 2.2)); o.position.y = o.userData.lift; return true; }
      if (t < 2.7) { setOpacity(o, 1 - (t - 2.2) / 0.5); return true; }
      const tt = t - 2.7; const T = 9;
      if (tt < 0.5) { o.position.copy(pts[0]); o.lookAt(pts[1]); setOpacity(o, tt / 0.5); return true; }
      if (!boom) { boom = true; this.burners(e, true); this.audio?.jet(); }
      const k = Math.min(1, (tt - 0.5) / T); const u = Math.pow(k, 1.7);
      o.position.copy(curve.getPointAt(u)); o.lookAt(curve.getPointAt(Math.min(1, u + 0.01)));
      if (k > 0.85) setOpacity(o, (1 - k) / 0.15);
      if (k >= 1) { e.mode = 'away'; o.visible = false; setOpacity(o, 1); this.burners(e, false); return false; }
      return true;
    } });
  }
  landing(e, delay) {
    e.mode = 'anim';
    const o = e.obj; const t0 = this.t + delay;
    o.visible = false;
    if (e.helo) {
      const dest = e.spot ? e.spot.v.clone() : V(0, 0, 0);
      const dir = Math.random() * Math.PI * 2;
      const curve = new THREE.CatmullRomCurve3([dest.clone().add(V(Math.cos(dir) * 70, 14, Math.sin(dir) * 70)), dest.clone().add(V(Math.cos(dir) * 10, 5, Math.sin(dir) * 10)), dest.clone().setY(2.6)]);
      this.anims.push({ up: () => {
        const t = this.t - t0; if (t < 0) return true;
        o.visible = true; this.spin(e, 1);
        if (t < 6) { const k = t / 6; const u = 1 - Math.pow(1 - k, 2); o.position.copy(curve.getPointAt(u)); o.lookAt(curve.getPointAt(Math.min(1, u + 0.02)).setY(o.position.y - (1 - k) * 0.5)); setOpacity(o, Math.min(1, k * 4)); return true; }
        if (t < 8.4) { const k = (t - 6) / 2.4; o.position.copy(dest).setY(2.6 - ease(k) * 2.52); o.rotation.set(0, o.rotation.y + ((e.spot?.yaw ?? 0) - o.rotation.y) * 0.08, 0); return true; }
        e.mode = 'parked'; this.placeParked(e); return false;
      } });
      return;
    }
    const rw = this.runway();
    const L = o.userData.lift - 0.02;
    const pts = [V(rw.x0 - 70, 13, rw.z + 6), V(rw.x0 - 35, 6, rw.z + 1), V(rw.x0 + 2, 0.5 + L, rw.z), V(rw.x0 + 6, L, rw.z), V(rw.x0 + 20, L, rw.z), V(rw.x0 + 26, L, rw.z)];
    const curve = new THREE.CatmullRomCurve3(pts);
    this.anims.push({ up: () => {
      const t = this.t - t0; if (t < 0) return true;
      o.visible = true; this.spin(e, 1);
      const T = 9;
      if (t < T) {
        const k = t / T; const u = 1 - Math.pow(1 - k, 1.8);
        o.position.copy(curve.getPointAt(u)); const nx = curve.getPointAt(Math.min(1, u + 0.01)); if (o.position.y > L + 0.1) nx.y += 0.12; else nx.y = o.position.y; o.lookAt(nx);
        setOpacity(o, Math.min(1, k * 5));
        return true;
      }
      if (t < T + 0.5) { setOpacity(o, 1 - (t - T) / 0.5); return true; }
      if (t < T + 1.0) { this.placeParked(e); setOpacity(o, (t - T - 0.5) / 0.5); return true; }
      e.mode = 'parked'; this.placeParked(e); return false;
    } });
  }
  spin(e, s) {
    for (const p of e.obj.userData.props || []) p.rotation.z += 0.9 * s;
    for (const r of e.obj.userData.rotors || []) r.rotation.y += 0.7 * s;
  }

  // ---------------------------------------------------------- Fahrzeuge
  ringPos(s) {
    const Rr = HALF + 2, L = 8 * Rr; s = ((s % L) + L) % L;
    const seg = Math.floor(s / (2 * Rr)), f = s % (2 * Rr);
    const c = [[-Rr, -Rr, 1, 0], [Rr, -Rr, 0, 1], [Rr, Rr, -1, 0], [-Rr, Rr, 0, -1]][seg];
    const lane = 0.3;
    return { x: c[0] + c[2] * f - c[3] * lane, z: c[1] + c[3] * f + c[2] * lane, yaw: Math.atan2(c[2], c[3]) };
  }
  addServiceTraffic() {
    for (const [shape, s0, sp] of [['truck', 0, 2.4], ['tug', 60, 1.6]]) {
      const o = vehicle(shape); this.root.add(o); this.traffic.push({ o, s: s0, sp });
    }
  }
  syncVehicles(state) {
    const seen = new Set();
    const pools = state.buildings.filter(b => b.kind === 'motorpool' && b.level > 0).sort((a, b) => a.id - b.id);
    let pi = 0, si = 0;
    const drivers = new Set(['hx', 'refuel', 'dingo']);
    for (const v of state.vehicles) {
      seen.add(v.id);
      let e = this.veh.get(v.id);
      if (!e) { e = { o: vehicle(R.VEHICLES[v.model].shape), model: v.model }; this.root.add(e.o); this.veh.set(v.id, e); }
      e.drive = drivers.has(v.model);
      if (e.drive) { e.s ??= Math.random() * 300; e.sp = 2 + Math.random(); continue; }
      const pool = pools[pi];
      if (!pool) { e.o.visible = false; continue; }
      const pe = this.b.get(pool.id); const slots = pe?.model?.userData.slots || [];
      if (si >= Math.min(slots.length, R.motorpoolCap(pool.level))) { pi++; si = 0; }
      const p2 = pools[pi]; const pe2 = p2 && this.b.get(p2.id);
      const sl = pe2?.model?.userData.slots?.[si];
      if (!sl) { e.o.visible = false; continue; }
      const w = V(sl[0], 0, sl[1]); pe2.g.localToWorld(w);
      e.o.visible = true; e.o.position.copy(w); e.o.rotation.y = pe2.g.rotation.y + Math.PI; e.home = w;
      si++;
    }
    for (const [id, e] of this.veh) if (!seen.has(id)) { this.root.remove(e.o); this.veh.delete(id); }
  }

  // ------------------------------------------------------------- Luftangriff
  defensePos(id) {
    if (id === 'qra') return V((Math.random() - 0.5) * 60, 22, -50);
    if (id === 'gepard') {
      for (const e of this.veh.values()) if (e.model === 'gepard' && e.o.visible) return e.o.position.clone().setY(0.6);
      return V(0, 0.6, 0);
    }
    const e = this.b.get(id); return e ? e.g.position.clone().setY(0.8) : V(0, 0.8, 0);
  }
  playRaid(entry, onDone) {
    if (this.raid) return;
    const enemies = entry.enemies || [];
    const base = Math.random() * Math.PI * 2;
    const actors = [];
    enemies.forEach((en, i) => {
      const obj = enemy(en.type); this.sc.fxGroup.add(obj);
      const ang = base + (Math.random() - 0.5) * 1.1;
      const alt = en.type === 'cruise' ? 2.2 : en.type === 'drone' ? 3.5 : 5 + Math.random() * 3.5;
      const speed = en.type === 'cruise' ? 15 : en.type === 'drone' ? 8.5 : 12;
      const start = V(Math.cos(ang) * 95, alt, Math.sin(ang) * 95);
      let tgt = V((Math.random() - 0.5) * 20, alt, (Math.random() - 0.5) * 20);
      if (en.target != null && this.b.get(en.target)) tgt = this.b.get(en.target).g.position.clone().setY(alt);
      const exit = tgt.clone().add(tgt.clone().sub(start).setY(0).normalize().multiplyScalar(90)).setY(alt + 6);
      const killR = 12 + Math.random() * 16;
      const a = { obj, en, start, tgt, exit, speed, delay: i * 0.55 + Math.random() * 0.4, state: 'in', s: 0, fired: false, bombs: false, pos: start.clone() };
      a.killAt = en.killer != null ? Math.max(0.5, (start.distanceTo(tgt) - killR) / speed) : Infinity;
      obj.position.copy(start); obj.visible = false;
      actors.push(a);
    });
    this.raid = { actors, t: 0, onDone, entry, idleFire: 0 };
    this.audio?.siren();
  }
  updateRaid(dt) {
    const r = this.raid; if (!r) return;
    r.t += dt;
    let alive = 0;
    for (const a of r.actors) {
      const t = r.t - a.delay;
      if (t < 0) { alive++; continue; }
      a.obj.visible = a.state !== 'gone';
      if (a.state === 'in' || a.state === 'out') {
        alive++;
        const from = a.state === 'in' ? a.start : a.tgt, to = a.state === 'in' ? a.tgt : a.exit;
        const dir = to.clone().sub(from); const len = dir.length(); dir.normalize();
        a.s += a.speed * dt;
        a.pos.copy(from).addScaledVector(dir, Math.min(a.s, len));
        a.obj.position.copy(a.pos); a.obj.lookAt(a.pos.clone().add(dir));
        if (a.obj.userData.props) for (const p of a.obj.userData.props) p.rotation.z += 0.8;
        // Abschuss vorbereiten
        if (a.state === 'in' && !a.fired && t >= a.killAt - 1.6) { a.fired = true; this.fireAt(a); }
        if (a.state === 'in' && a.s >= len) {
          if (!a.en.killer && !a.bombs) { a.bombs = true; this.bombRun(a); }
          a.state = 'out'; a.s = 0;
        } else if (a.state === 'out' && a.s >= len) { a.state = 'gone'; a.obj.visible = false; }
      } else if (a.state === 'fall') {
        alive++;
        a.vel.y -= 9 * dt; a.pos.addScaledVector(a.vel, dt); a.obj.position.copy(a.pos);
        a.obj.rotation.z += dt * 4; a.obj.rotation.x += dt * 0.8;
        a.trail -= dt; if (a.trail <= 0) { a.trail = 0.05; this.sc.smoke(a.pos.clone(), 0.22, 1.8, 0x2a2826, V(0, 0.3, 0)); }
        if (a.pos.y < 0.2) { a.state = 'gone'; a.obj.visible = false; this.sc.explosion(a.pos.clone().setY(0.3), 1.1); this.audio?.boom(0.6); }
      }
    }
    // Sperrfeuer der Flak
    r.idleFire -= dt;
    if (r.idleFire <= 0) {
      r.idleFire = 0.18;
      const targets = r.actors.filter(a => (a.state === 'in' || a.state === 'out') && a.obj.visible && a.pos.length() < 40);
      for (const [id, e] of this.b) {
        if (!['flak', 'cram'].includes(e.kind) || !targets.length || Math.random() < 0.4) continue;
        const tg = targets[Math.floor(Math.random() * targets.length)];
        this.aim(id, tg.pos);
        const from = e.g.position.clone().setY(0.9);
        const miss = tg.pos.clone().add(V((Math.random() - 0.5) * 3, (Math.random() - 0.3) * 2, (Math.random() - 0.5) * 3));
        this.sc.tracer(from, miss, e.kind === 'cram' ? 0xfff0a0 : 0xffc06a);
        if (Math.random() < 0.3) this.audio?.gun();
      }
    }
    if (alive === 0 && r.t > 3) {
      for (const a of r.actors) this.sc.fxGroup.remove(a.obj);
      this.raid = null;
      this.audio?.sirenStop();
      r.onDone && r.onDone(r.entry);
    }
  }
  aim(id, p) {
    const e = this.b.get(id); if (!e?.model) return;
    const t = e.model.userData.turret; if (!t) return;
    const wp = e.g.position;
    const yaw = Math.atan2(p.x - wp.x, p.z - wp.z) - e.g.rotation.y;
    t.rotation.y = yaw;
    const bar = e.model.userData.barrel;
    if (bar && (e.kind === 'flak' || e.kind === 'cram')) bar.rotation.x = -Math.atan2(p.y, Math.hypot(p.x - wp.x, p.z - wp.z));
  }
  fireAt(a) {
    const id = a.en.killer;
    const kill = () => {
      if (a.state !== 'in' && a.state !== 'out') return;
      this.sc.explosion(a.pos.clone(), 0.8); this.audio?.boom(0.4);
      a.state = 'fall'; a.vel = a.obj.getWorldDirection(new THREE.Vector3()).multiplyScalar(a.speed * 0.6); a.trail = 0;
    };
    const kind = typeof id === 'number' ? this.b.get(id)?.kind : id;
    const from = this.defensePos(id);
    if (typeof id === 'number') this.aim(id, a.pos);
    if (kind === 'flak' || kind === 'cram' || kind === 'gepard') {
      let n = 0;
      const burst = () => {
        if (a.state !== 'in') return;
        this.aim(id, a.pos);
        this.sc.tracer(from.clone(), a.pos.clone().add(V((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)), kind === 'cram' ? 0xfff0a0 : 0xffc06a, 90);
        if (n % 3 === 0) this.audio?.gun();
        if (++n < 12) setTimeout(burst, 90); else kill();
      };
      burst();
    } else {
      this.audio?.launch();
      this.sc.missile(from.clone().add(V(0, 0.4, 0)), () => a.pos, kind === 'patriot' ? 30 : 24, kill);
    }
  }
  bombRun(a) {
    const p = a.tgt.clone().setY(0.4);
    for (let i = 0; i < 3; i++) setTimeout(() => { this.sc.explosion(p.clone().add(V((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), 1.3); this.audio?.boom(1); }, 250 + i * 260);
  }

  // ------------------------------------------------------------- Update
  update(dt, now) {
    this.t += dt;
    this.anims = this.anims.filter(a => a.up(dt));
    const t = this.t;
    for (const e of this.b.values()) {
      const u = e.model?.userData; if (!u) continue;
      if (u.spin) u.spin.rotation.y += dt * 1.6;
      if (u.beacon) u.beacon.visible = (t % 1.4) < 0.7;
      if (u.flag) u.flag.rotation.y = Math.sin(t * 2.3) * 0.25 + 0.3;
      if (u.sock) u.sock.rotation.y = Math.sin(t * 0.6) * 0.3;
      if (u.turret && !this.raid) { u.turret.rotation.y += Math.sin(t * 0.4 + e.data.id) * dt * 0.35; }
      if (e.g.userData.jib) e.g.userData.jib.rotation.y = Math.sin(t * 0.5 + e.data.id) * 1.2;
    }
    for (const e of this.veh.values()) {
      if (e.drive) { e.s += e.sp * dt; const p = this.ringPos(e.s); e.o.visible = true; e.o.position.set(p.x, 0.02, p.z); e.o.rotation.y = p.yaw; }
      if (e.o.userData.turret) e.o.userData.turret.rotation.y = Math.sin(t * 0.5) * 1.2;
    }
    for (const tr of this.traffic) { tr.s += tr.sp * dt; const p = this.ringPos(tr.s); tr.o.position.set(p.x, 0.02, p.z); tr.o.rotation.y = p.yaw; }
    this.updateRaid(dt);
  }
}
