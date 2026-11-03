// Renderer, Kamera, Landschaft, Tageszeit und Effekte
import * as THREE from 'three';
import { GRID } from '/shared/rules.js';
import { GLOW, treeGeometries, mat, COL } from './models.js';
export { terrainHeight as heightAt };

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// Wertrauschen für die Landschaft
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, z * 4.3) * 0.17;

export const HALF = GRID / 2;
export function terrainHeight(x, z) {
  const q = Math.max(Math.abs(x), Math.abs(z)) - (HALF + 4.5);
  if (q < 0) return 0;
  const hills = fbm(x * 0.045 + 10, z * 0.045 - 4) * 5.2 - 0.6;
  let h = smooth(0, 12, q) * Math.max(-0.2, hills);
  const r = Math.hypot(x * 0.95, z * 1.1) + (fbm(x * 0.03, z * 0.03) - 0.5) * 22;
  h -= smooth(58, 84, r) * 7;
  // Fjord im Osten
  const fj = Math.abs(z - 8 - Math.sin(x * 0.05) * 6);
  h -= smooth(46, 70, x) * smooth(9, 0, fj) * 6;
  return h;
}

export class Scene {
  constructor(container) {
    this.container = container;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc9d6dc, 70, 190);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);
    this.cam = { x: 0, z: 2, yaw: -0.62, pitch: 0.92, dist: 72, tx: 0, tz: 2, tyaw: -0.62, tpitch: 0.92, tdist: 72, shake: 0 };
    this.ray = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.timeMode = 'cycle';
    this.clockStart = performance.now();
    this.fx = [];
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup);
    this.buildLights(); this.buildSky(); this.buildTerrain(); this.buildBaseGround(); this.buildNature();
    this.flash = new THREE.PointLight(0xffa050, 0, 18, 1.6); this.scene.add(this.flash);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.bindInput();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ Licht
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbcd3e6, 0x4a4a36, 1.0); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera; c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 1; c.far = 160;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    this.scene.add(sun); this.scene.add(sun.target);
  }
  buildSky() {
    const g = new THREE.SphereGeometry(500, 24, 12);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x6f9bc0) }, hor: { value: new THREE.Color(0xc9d6dc) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float t = smoothstep(-0.05, 0.55, vP.y); gl_FragColor = vec4(mix(hor, top, t), 1.); }',
    });
    this.sky = new THREE.Mesh(g, this.skyMat); this.scene.add(this.sky);
    const sp = []; for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.08; sp.push(Math.cos(a) * Math.cos(e) * 480, Math.sin(e) * 480, Math.sin(a) * Math.cos(e) * 480); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.scene.add(this.stars);
  }

  // ------------------------------------------------------------- Landschaft
  buildTerrain() {
    const S = 260, N = 170;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    const ng = g.toNonIndexed(); ng.computeVertexNormals();
    const p = ng.attributes.position, n = ng.attributes.normal;
    const col = new Float32Array(p.count * 3), c = new THREE.Color();
    const sand = new THREE.Color(0xb3a17a), g1 = new THREE.Color(0x4f6b3f), g2 = new THREE.Color(0x63794a), g3 = new THREE.Color(0x3d5636), rock = new THREE.Color(0x7c7d76), base = new THREE.Color(0x5a7447), wet = new THREE.Color(0x56604a);
    for (let i = 0; i < p.count; i += 3) {
      let y = 0, x = 0, z = 0, ny = 0;
      for (let k = 0; k < 3; k++) { y += p.getY(i + k) / 3; x += p.getX(i + k) / 3; z += p.getZ(i + k) / 3; ny += n.getY(i + k) / 3; }
      const q = Math.max(Math.abs(x), Math.abs(z)) - (HALF + 4.5);
      const nz = fbm(x * 0.12, z * 0.12);
      if (q < 0) c.copy(base).lerp(g2, nz * 0.5);
      else if (y < -0.25) c.copy(wet);
      else if (y < 0.15 && q > 6) c.copy(sand).lerp(g1, nz * 0.4);
      else if (ny < 0.8 || y > 3.4) c.copy(rock).lerp(g3, nz * 0.3);
      else c.copy(nz > 0.55 ? g2 : g1).lerp(g3, smooth(1, 3.2, y) * 0.8);
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const t = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    t.receiveShadow = true; this.scene.add(t); this.terrain = t;
    const wm = this.waterMat = new THREE.MeshStandardMaterial({ color: 0x2c5568, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.9, flatShading: true });
    const wg = new THREE.PlaneGeometry(900, 900, 60, 60); wg.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, wm); this.water.position.y = -0.45; this.water.receiveShadow = true; this.scene.add(this.water);
    this.waterBase = Float32Array.from(wg.attributes.position.array);
  }
  buildBaseGround() {
    // Gemähte Basisfläche + Ringstraße + Zaun
    const tex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
      x.fillStyle = '#5b7548'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)'; x.fillRect(0, i * 32, 512, 32); }
      for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '30,50,20' : '140,160,100'},${Math.random() * 0.15})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
    })();
    const gp = new THREE.PlaneGeometry(GRID + 2, GRID + 2); gp.rotateX(-Math.PI / 2);
    const gm = new THREE.Mesh(gp, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    gm.position.y = 0.004; gm.receiveShadow = true; this.scene.add(gm);
    const road = mat(COL.asphalt, { r: 0.95 });
    const R = HALF + 2, W = 1.3;
    for (const [w, d, x, z] of [[2 * R + W, W, 0, -R], [2 * R + W, W, 0, R], [W, 2 * R + W, -R, 0], [W, 2 * R + W, R, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), road); m.position.set(x, 0.0, z); m.receiveShadow = true; this.scene.add(m);
    }
    const F = HALF + 3.6;
    const post = new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5); post.translate(0, 0.45, 0);
    const pts = [];
    for (let i = -F; i <= F; i += 2) pts.push([i, -F], [i, F], [-F, i], [F, i]);
    const im = new THREE.InstancedMesh(post, mat(COL.metal), pts.length); const o = new THREE.Object3D();
    pts.forEach(([x, z], i) => { o.position.set(x, 0, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = true; this.scene.add(im);
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 0.6 });
    for (const [w, d, x, z] of [[2 * F, 0.01, 0, -F], [2 * F, 0.01, 0, F], [0.01, 2 * F, -F, 0], [0.01, 2 * F, F, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), fenceMat); m.position.set(x, 0.5, z); this.scene.add(m);
    }
    // Wachtürme
    for (const [x, z] of [[-F, -F], [F, -F], [-F, F], [F, F]]) {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      for (const [a, b] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2, 0.06), mat(COL.oliveD)); l.position.set(a, 1, b); l.castShadow = true; g.add(l); }
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), mat(COL.olive)); cab.position.y = 2.2; cab.castShadow = true; g.add(cab);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.35, 4), mat(COL.roofD)); roof.position.y = 2.62; roof.rotation.y = Math.PI / 4; g.add(roof);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), GLOW.amber); lamp.position.set(0, 2.2, 0.47); g.add(lamp);
      this.scene.add(g);
    }
    // Bauraster (nur im Baumodus sichtbar)
    const cv = document.createElement('canvas'); cv.width = cv.height = GRID * 16; const x = cv.getContext('2d');
    x.strokeStyle = 'rgba(255,200,110,0.55)'; x.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) { x.beginPath(); x.moveTo(i * 16 + 0.5, 0); x.lineTo(i * 16 + 0.5, GRID * 16); x.stroke(); x.beginPath(); x.moveTo(0, i * 16 + 0.5); x.lineTo(GRID * 16, i * 16 + 0.5); x.stroke(); }
    x.strokeStyle = 'rgba(255,181,71,0.95)'; x.lineWidth = 4; x.strokeRect(2, 2, GRID * 16 - 4, GRID * 16 - 4);
    const gt = new THREE.CanvasTexture(cv);
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, opacity: 0.6 }));
    grid.position.y = 0.03; grid.visible = false; grid.renderOrder = 2;
    this.grid = grid; this.scene.add(grid);
  }
  buildNature() {
    const { trunk, crown, crown2, birch } = treeGeometries();
    const N = 1100;
    const tm = mat(0x5a4632), cm = mat(0x2f4a2e), cm2 = mat(0x395a34), bm = mat(0x6f8a45);
    const T = new THREE.InstancedMesh(trunk, tm, N), C1 = new THREE.InstancedMesh(crown, cm, N), C2 = new THREE.InstancedMesh(crown2, cm2, N), B = new THREE.InstancedMesh(birch, bm, N);
    const o = new THREE.Object3D(); let ti = 0, bi = 0, tries = 0;
    while ((ti + bi) < N && tries++ < 20000) {
      const x = (Math.random() - 0.5) * 220, z = (Math.random() - 0.5) * 220;
      const q = Math.max(Math.abs(x), Math.abs(z)) - (HALF + 5.5);
      if (q < 0) continue;
      const y = terrainHeight(x, z);
      if (y < 0.05 || y > 4.2) continue;
      if (fbm(x * 0.06, z * 0.06) < 0.42 && Math.random() < 0.75) continue;
      const s = 0.7 + Math.random() * 0.9;
      o.position.set(x, y - 0.05, z); o.rotation.set(0, Math.random() * 6, 0); o.scale.set(s, s * (0.9 + Math.random() * 0.4), s); o.updateMatrix();
      if (Math.random() < 0.25 && bi < N) { B.setMatrixAt(bi, o.matrix); T.setMatrixAt(ti + bi, o.matrix); bi++; }
      else { C1.setMatrixAt(ti, o.matrix); C2.setMatrixAt(ti, o.matrix); T.setMatrixAt(ti + bi, o.matrix); ti++; }
    }
    T.count = ti + bi; C1.count = ti; C2.count = ti; B.count = bi;
    for (const m of [T, C1, C2, B]) { m.castShadow = true; m.receiveShadow = true; this.scene.add(m); }
    const rg = new THREE.DodecahedronGeometry(0.5, 0);
    const R = new THREE.InstancedMesh(rg, mat(0x80817a), 260); let ri = 0;
    for (let i = 0; i < 3000 && ri < 260; i++) {
      const x = (Math.random() - 0.5) * 220, z = (Math.random() - 0.5) * 220;
      if (Math.max(Math.abs(x), Math.abs(z)) < HALF + 6) continue;
      const y = terrainHeight(x, z); if (y < -0.4 || y > 5) continue;
      const s = 0.3 + Math.random() * 1.1;
      o.position.set(x, y, z); o.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); o.scale.set(s, s * 0.7, s); o.updateMatrix();
      R.setMatrixAt(ri++, o.matrix);
    }
    R.count = ri; R.castShadow = true; R.receiveShadow = true; this.scene.add(R);
  }

  // -------------------------------------------------------------- Tageszeit
  updateDaylight() {
    let p;
    if (this.timeMode === 'day') p = 0.22; else if (this.timeMode === 'night') p = 0.75;
    else p = (((performance.now() - this.clockStart) / 1000 / 960) + 0.12) % 1;
    const a = p * Math.PI * 2;
    const elev = Math.sin(a);
    const day = smooth(-0.12, 0.3, elev);
    const dusk = Math.max(0, 1 - Math.abs(elev) / 0.35) * (elev > -0.2 ? 1 : 0);
    const night = 1 - day;
    this.night = night;
    const sunDir = new THREE.Vector3(Math.cos(a) * 0.8, Math.max(0.18, Math.abs(elev)), 0.55).normalize();
    if (elev < 0) sunDir.x *= -1;
    const t = new THREE.Vector3(this.cam.x, 0, this.cam.z);
    this.sun.position.copy(t).addScaledVector(sunDir, 80); this.sun.target.position.copy(t);
    const cDay = new THREE.Color(0xfff2dc), cDusk = new THREE.Color(0xffa565), cNight = new THREE.Color(0xa6bde6);
    const sc = cDay.clone().lerp(cDusk, dusk * 0.8).lerp(cNight, night);
    this.sun.color.copy(sc);
    this.sun.intensity = lerp(1.0, 2.7, day);
    this.hemi.intensity = lerp(0.85, 1.0, day);
    this.hemi.color.set(0xbcd3e6).lerp(new THREE.Color(0x5b74a6), night);
    this.hemi.groundColor.set(0x4a4a36).lerp(new THREE.Color(0x232c38), night);
    const top = new THREE.Color(0x6f9bc0).lerp(new THREE.Color(0x46588a), dusk * 0.7).lerp(new THREE.Color(0x0d1428), night);
    const hor = new THREE.Color(0xcfdbe0).lerp(new THREE.Color(0xf2a66a), dusk * 0.85).lerp(new THREE.Color(0x26354f), night);
    this.skyMat.uniforms.top.value.copy(top); this.skyMat.uniforms.hor.value.copy(hor);
    this.scene.fog.color.copy(hor);
    this.stars.material.opacity = smooth(0.4, 0.95, night);
    this.renderer.toneMappingExposure = lerp(0.95, 1.08, day);
    GLOW.win.emissiveIntensity = 0.05 + 1.5 * smooth(0.3, 0.8, night);
    GLOW.cab.emissiveIntensity = 0.08 + 1.0 * smooth(0.3, 0.8, night);
    for (const k of ['white', 'green', 'red', 'blue', 'amber']) GLOW[k].emissiveIntensity = 0.25 + 2.6 * smooth(0.25, 0.8, night);
    this.waterMat.color.set(0x2c5568).lerp(new THREE.Color(0x0e1c2a), night * 0.8);
  }

  // ------------------------------------------------------------------ Kamera
  bindInput() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    const P = this.pointers = new Map();
    let downAt = null, moved = 0, last = null, pinch = null;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      P.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button });
      if (P.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now(), b: e.button, type: e.pointerType }; moved = 0; last = { x: e.clientX, y: e.clientY }; }
      if (P.size === 2) { const [a, b] = [...P.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; moved = 99; }
    });
    el.addEventListener('pointermove', (e) => {
      this.onHover && this.onHover(e.clientX, e.clientY, e.pointerType);
      if (!P.has(e.pointerId)) return;
      P.set(e.pointerId, { ...P.get(e.pointerId), x: e.clientX, y: e.clientY });
      if (P.size === 1 && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) {
          if (downAt?.b === 2 || e.shiftKey) { this.cam.tyaw -= dx * 0.006; this.cam.tpitch = Math.max(0.5, Math.min(1.35, this.cam.tpitch + dy * 0.004)); }
          else if (!(this.dragGuard && this.dragGuard(e))) this.panScreen(last.x, last.y, e.clientX, e.clientY);
        }
        last = { x: e.clientX, y: e.clientY };
      } else if (P.size === 2 && pinch) {
        const [a, b] = [...P.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        this.cam.tdist = Math.max(18, Math.min(120, this.cam.tdist * pinch.d / d));
        this.cam.tyaw += (ang - pinch.ang);
        this.panScreen(pinch.mx, pinch.my, mx, my);
        pinch = { d, ang, mx, my };
      }
    });
    const up = (e) => {
      if (!P.has(e.pointerId)) return;
      P.delete(e.pointerId);
      if (P.size === 0) {
        if (downAt && moved <= 6 && performance.now() - downAt.t < 600 && downAt.b !== 2) this.onTap && this.onTap(e.clientX, e.clientY, downAt.type);
        downAt = null; pinch = null; last = null;
      } else if (P.size === 1) { const v = [...P.values()][0]; last = { x: v.x, y: v.y }; pinch = null; }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.cam.tdist = Math.max(18, Math.min(120, this.cam.tdist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    this.keys = new Set();
    window.addEventListener('keydown', (e) => { if (e.target.closest('input,textarea')) return; this.keys.add(e.key.toLowerCase()); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }
  panScreen(x0, y0, x1, y1) {
    const a = this.groundPoint(x0, y0), b = this.groundPoint(x1, y1);
    if (!a || !b) return;
    this.cam.tx -= b.x - a.x; this.cam.tz -= b.z - a.z;
    this.clampTarget();
    this.cam.x = this.cam.tx; this.cam.z = this.cam.tz; // direkt folgen
    this.applyCamera();
  }
  clampTarget() { const L = HALF + 14; this.cam.tx = Math.max(-L, Math.min(L, this.cam.tx)); this.cam.tz = Math.max(-L, Math.min(L, this.cam.tz)); }
  focus(x, z, dist) { this.cam.tx = x; this.cam.tz = z; if (dist) this.cam.tdist = dist; this.clampTarget(); }
  applyCamera() {
    const c = this.cam;
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const sx = (Math.random() - 0.5) * c.shake, sz = (Math.random() - 0.5) * c.shake;
    this.camera.position.set(c.x + Math.sin(c.yaw) * cp * c.dist + sx, sp * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist + sz);
    this.camera.lookAt(c.x + sx * 0.5, 0, c.z + sz * 0.5);
  }
  updateCamera(dt) {
    const c = this.cam, k = 1 - Math.exp(-dt * 8);
    const sp = c.dist * 0.6 * dt;
    const fw = { x: -Math.sin(c.yaw), z: -Math.cos(c.yaw) }, rt = { x: Math.cos(c.yaw), z: -Math.sin(c.yaw) };
    const K = this.keys;
    if (K.has('w') || K.has('arrowup')) { c.tx += fw.x * sp; c.tz += fw.z * sp; }
    if (K.has('s') || K.has('arrowdown')) { c.tx -= fw.x * sp; c.tz -= fw.z * sp; }
    if (K.has('a') || K.has('arrowleft')) { c.tx -= rt.x * sp; c.tz -= rt.z * sp; }
    if (K.has('d') || K.has('arrowright')) { c.tx += rt.x * sp; c.tz += rt.z * sp; }
    if (K.has('q')) c.tyaw += dt * 1.4;
    if (K.has('e')) c.tyaw -= dt * 1.4;
    this.clampTarget();
    c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k;
    c.yaw += (c.tyaw - c.yaw) * k; c.pitch += (c.tpitch - c.pitch) * k; c.dist += (c.tdist - c.dist) * k;
    c.shake *= Math.exp(-dt * 5);
    this.applyCamera();
  }
  ndc(x, y) { const r = this.renderer.domElement.getBoundingClientRect(); return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); }
  groundPoint(x, y) { this.ray.setFromCamera(this.ndc(x, y), this.camera); const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(this.ground, p) ? p : null; }
  pick(x, y, objs) { this.ray.setFromCamera(this.ndc(x, y), this.camera); return this.ray.intersectObjects(objs, true)[0] || null; }
  project(v) { const p = v.clone().project(this.camera); const r = this.renderer.domElement.getBoundingClientRect(); return { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height, vis: p.z < 1 }; }

  // ------------------------------------------------------------------ Effekte
  explosion(pos, s = 1) {
    const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 1), new THREE.MeshBasicMaterial({ color: 0xffb35a, transparent: true, opacity: 1, fog: false }));
    fl.position.copy(pos); this.fxGroup.add(fl);
    this.fx.push({ o: fl, life: 0.55, t: 0, up(f, k) { f.o.scale.setScalar(1 + k * 2.6); f.o.material.opacity = 1 - k; f.o.material.color.setHSL(0.08 - k * 0.06, 1, 0.6 - k * 0.3); } });
    for (let i = 0; i < 6; i++) this.smoke(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * s, Math.random() * 0.5 * s, (Math.random() - 0.5) * s)), 0.5 * s, 1.6 + Math.random(), 0x3b3836);
    this.flash.position.copy(pos).add(new THREE.Vector3(0, 1, 0)); this.flash.intensity = 60 * s;
    if (pos.y < 2) this.cam.shake = Math.max(this.cam.shake, 0.35 * s);
  }
  smoke(pos, size = 0.3, life = 1.2, color = 0x6b6b68, vel = null) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.7, roughness: 1, flatShading: true, depthWrite: false }));
    m.position.copy(pos); this.fxGroup.add(m);
    const v = vel || new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
    this.fx.push({ o: m, life, t: 0, v, up(f, k, dt) { f.o.position.addScaledVector(f.v, dt); f.o.scale.setScalar(1 + k * 2); f.o.material.opacity = 0.7 * (1 - k); } });
  }
  tracer(from, to, color = 0xffd27a, speed = 70) {
    const len = from.distanceTo(to);
    const g = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4); g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.copy(from); m.lookAt(to); this.fxGroup.add(m);
    const dir = to.clone().sub(from).normalize();
    this.fx.push({ o: m, life: len / speed, t: 0, up(f, k) { f.o.position.copy(from).addScaledVector(dir, len * k); } });
  }
  missile(from, getTarget, speed, onHit) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdedcd4, roughness: 0.6 }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd080, fog: false })); glow.position.z = -0.3;
    g.add(body, glow); g.position.copy(from); this.fxGroup.add(g);
    const vel = new THREE.Vector3(0, speed * 0.6, 0);
    let puff = 0;
    this.fx.push({
      o: g, life: 8, t: 0, up: (f, k, dt) => {
        const tg = getTarget();
        const want = tg.clone().sub(g.position);
        const dist = want.length();
        want.normalize().multiplyScalar(speed);
        vel.lerp(want, Math.min(1, dt * 4));
        g.position.addScaledVector(vel, dt);
        g.lookAt(g.position.clone().add(vel));
        puff -= dt; if (puff <= 0) { puff = 0.035; this.smoke(g.position.clone(), 0.12, 1.4, 0xd6d4ce, new THREE.Vector3(0, 0.15, 0)); }
        if (dist < 0.6) { f.life = 0; onHit && onHit(); }
      },
    });
  }
  updateFx(dt) {
    for (const f of this.fx) { f.t += dt; const k = Math.min(1, f.t / f.life); f.up(f, k, dt); if (f.t >= f.life) { f.dead = true; } }
    const alive = [];
    for (const f of this.fx) { if (f.dead) { this.fxGroup.remove(f.o); f.o.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.dispose && !o.material.userData?.shared) o.material.dispose(); } }); } else alive.push(f); }
    this.fx = alive;
    this.flash.intensity *= Math.exp(-dt * 9);
  }
  updateWater(t) {
    const pos = this.water.geometry.attributes.position, b = this.waterBase;
    for (let i = 0; i < pos.count; i++) pos.setY(i, Math.sin(b[i * 3] * 0.15 + t * 0.9) * 0.06 + Math.cos(b[i * 3 + 2] * 0.13 + t * 0.7) * 0.06);
    pos.needsUpdate = true;
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
