// Prozedurale Low-Poly-Modelle: Gebäude, Flugzeuge, Fahrzeuge, Natur
import * as THREE from 'three';

export const COL = {
  concrete: 0xa9aba5, concreteL: 0xc4c4bc, concreteD: 0x7d807b, asphalt: 0x33373a, asphaltL: 0x464b4e,
  olive: 0x5b6844, oliveD: 0x434d32, sand: 0xb7a57a, roof: 0x4e555b, roofD: 0x3a3f44, metal: 0x8e959b,
  white: 0xe6e6e0, red: 0xb83a2e, yellow: 0xd9a92a, rust: 0x8a5a3c, blueGrey: 0x5f7380, glass: 0x1d2b33,
  grass: 0x4e6a3f, earth: 0x6b5e45, black: 0x1c1f21,
};

const cache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.r ?? 0.86, metalness: o.m ?? 0.04, flatShading: o.flat ?? true,
    emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.o ?? 1,
    side: o.ds ? THREE.DoubleSide : THREE.FrontSide, map: o.map || null,
  });
  cache.set(key, m);
  return m;
}
// Nachtleuchtende Materialien (Intensität steuert die Szene)
export const GLOW = {
  win: new THREE.MeshStandardMaterial({ color: 0x2b3238, emissive: 0xffc670, emissiveIntensity: 0, roughness: 0.4, flatShading: true }),
  cab: new THREE.MeshStandardMaterial({ color: 0x24404c, emissive: 0x9fe6ff, emissiveIntensity: 0, roughness: 0.2, metalness: 0.3, flatShading: true }),
  white: new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0xfff4d8, emissiveIntensity: 0.2 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2f8a3a, emissive: 0x4dff6a, emissiveIntensity: 0.2 }),
  red: new THREE.MeshStandardMaterial({ color: 0x8a2a24, emissive: 0xff3b2b, emissiveIntensity: 0.3 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x24508a, emissive: 0x3d8bff, emissiveIntensity: 0.2 }),
  amber: new THREE.MeshStandardMaterial({ color: 0x8a6a24, emissive: 0xffb547, emissiveIntensity: 0.3 }),
};

function mesh(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
  return o;
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z);
const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y + h / 2, z);
function flatShape(pts, t, m) { // Punkte (x,z), Dicke nach unten
  const s = new THREE.Shape(); pts.forEach(([x, z], i) => i ? s.lineTo(x, z) : s.moveTo(x, z));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, t / 2, 0);
  return mesh(g, m);
}
function finShape(pts, t, m) { // Punkte (z,y)
  const s = new THREE.Shape(); pts.forEach(([z, y], i) => i ? s.lineTo(z, y) : s.moveTo(z, y));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(t / 2, 0, 0);
  return mesh(g, m);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function decal(w, d, tex, y = 0.012) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: true }));
  m.position.y = y; m.receiveShadow = true;
  return m;
}
function hazard(w, h, m2 = COL.black) {
  return canvasTex(64, 16, (c) => { c.fillStyle = '#d9a92a'; c.fillRect(0, 0, 64, 16); c.fillStyle = '#1c1f21'; for (let i = -16; i < 64; i += 12) { c.beginPath(); c.moveTo(i, 16); c.lineTo(i + 6, 16); c.lineTo(i + 22, 0); c.lineTo(i + 16, 0); c.fill(); } });
}
let _hz = null; const hazardMat = () => (_hz ||= new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.8 }));

// ===========================================================================
//  GEBÄUDE
// ===========================================================================
export function building(kind, level = 1) {
  const g = new THREE.Group();
  const f = BUILDERS[kind];
  if (f) f(g, Math.max(1, level));
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow !== false; } });
  return g;
}

const BUILDERS = {
  hq(g, L) {
    const floors = 2 + Math.floor(L / 3);
    g.add(box(3.9, 0.12, 3.9, mat(COL.concreteD)));
    const H = floors * 0.52;
    g.add(box(2.5, H, 2.3, mat(COL.concrete), -0.55, 0.12, 0.25));
    for (let i = 0; i < floors; i++) g.add(box(2.54, 0.13, 2.34, GLOW.win, -0.55, 0.12 + i * 0.52 + 0.24, 0.25));
    g.add(box(2.6, 0.08, 2.4, mat(COL.roofD), -0.55, 0.12 + H, 0.25));
    g.add(box(1.3, 0.75, 3.3, mat(COL.concreteL), 1.25, 0.12, 0));
    g.add(box(1.32, 0.12, 3.32, GLOW.win, 1.25, 0.5, 0));
    g.add(box(1.36, 0.06, 3.36, mat(COL.roof), 1.25, 0.87, 0));
    g.add(cyl(0.025, 0.035, 1.3, mat(COL.metal), -1.2, 0.12 + H, -0.4, 6));
    g.add(box(0.5, 0.04, 0.04, mat(COL.metal), -1.2, 0.12 + H + 1.0, -0.4));
    const dish = mesh(new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), mat(COL.white, { ds: true }), 1.25, 1.2, 1.0);
    dish.rotation.x = -Math.PI / 2.6; dish.rotation.z = 0.5; g.add(dish);
    g.add(cyl(0.05, 0.08, 0.3, mat(COL.metal), 1.25, 0.9, 1.0, 6));
    // Vordach + Eingang
    g.add(box(1.2, 0.05, 0.5, mat(COL.roof), -0.55, 0.62, -1.15));
    g.add(box(0.06, 0.5, 0.06, mat(COL.metal), -1.05, 0.12, -1.35));
    g.add(box(0.06, 0.5, 0.06, mat(COL.metal), -0.05, 0.12, -1.35));
    // Fahnenmast
    g.add(cyl(0.022, 0.03, 2.0, mat(COL.white), -1.7, 0.12, -1.7, 6));
    const flagTex = canvasTex(64, 40, (c) => { c.fillStyle = '#26323b'; c.fillRect(0, 0, 64, 40); c.fillStyle = '#ffb547'; c.beginPath(); c.moveTo(8, 30); c.lineTo(32, 10); c.lineTo(56, 30); c.lineTo(46, 30); c.lineTo(32, 19); c.lineTo(18, 30); c.fill(); });
    const fg = new THREE.PlaneGeometry(0.62, 0.38, 6, 1); fg.translate(0.31, 0, 0);
    const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(-1.7, 1.9, -1.7); flag.castShadow = true;
    g.add(flag); g.userData.flag = flag;
  },

  runway(g) {
    // Bahn liegt lokal bei z -2.5..0.5, Rollweg bei z 0.5..2.5
    const rwTex = canvasTex(2304, 192, (c, w, h) => {
      c.fillStyle = '#34383b'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 2 + Math.random() * 4); }
      c.fillStyle = '#e8e8e2';
      c.fillRect(8, 10, w - 16, 5); c.fillRect(8, h - 15, w - 16, 5);
      for (const side of [0, 1]) {
        const x0 = side ? w - 70 : 22;
        for (let i = 0; i < 8; i++) c.fillRect(x0, 26 + i * 18 - (i >= 4 ? -4 : 0), 48, 9);
        c.save(); c.translate(side ? w - 140 : 140, h / 2); c.rotate(side ? -Math.PI / 2 : Math.PI / 2);
        c.font = 'bold 64px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(side ? '27' : '09', 0, 0); c.restore();
        for (const dx of [260, 420]) for (const dy of [-38, 38]) c.fillRect(side ? w - dx - 70 : dx, h / 2 + dy - 9, 70, 18);
      }
      for (let x = 220; x < w - 220; x += 90) c.fillRect(x, h / 2 - 3, 50, 6);
      c.fillStyle = 'rgba(30,30,30,0.35)';
      for (const xx of [300, w - 300]) for (let i = 0; i < 60; i++) c.fillRect(xx - 120 + Math.random() * 240, h / 2 - 40 + Math.random() * 80, 40 + Math.random() * 60, 3);
    });
    const rw = decal(36, 3, rwTex, 0.015); rw.position.z = -1; rw.material.transparent = false; g.add(rw);
    const twTex = canvasTex(1024, 64, (c, w, h) => {
      c.fillStyle = '#4a4f52'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d9a92a'; c.fillRect(0, h * 0.55 - 2, w, 4);
    });
    const tw = decal(34, 1.6, twTex, 0.013); tw.position.z = 1.6; tw.material.transparent = false; g.add(tw);
    for (const x of [-16.6, -6, 6, 16.6]) {
      const st = decal(1.4, 1.2, twTex, 0.014); st.position.set(x, 0.014, 0.75); st.material.transparent = false; g.add(st);
    }
    // Befeuerung
    const lightGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const addLights = (m, pts) => {
      const im = new THREE.InstancedMesh(lightGeo, m, pts.length);
      const o = new THREE.Object3D();
      pts.forEach((p, i) => { o.position.set(p[0], 0.05, p[1]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      g.add(im);
    };
    const edge = [], blue = [];
    for (let x = -17.5; x <= 17.5; x += 1.5) { edge.push([x, -2.45], [x, 0.45]); }
    for (let x = -16.5; x <= 16.5; x += 2) { blue.push([x, 0.85], [x, 2.35]); }
    addLights(GLOW.white, edge);
    addLights(GLOW.blue, blue);
    const thr = []; const end = [];
    for (let z = -2.4; z <= 0.4; z += 0.35) { thr.push([-17.9, z]); end.push([17.9, z]); }
    addLights(GLOW.green, thr); addLights(GLOW.red, end);
    // Anflugbefeuerung jenseits der Schwelle
    const app = [];
    for (let i = 1; i <= 8; i++) { app.push([-18 - i * 1.1, -1]); if (i % 3 === 0) for (const dz of [-0.6, -0.3, 0.3, 0.6]) app.push([-18 - i * 1.1, -1 + dz]); }
    addLights(GLOW.white, app);
    // Windsack
    g.add(cyl(0.02, 0.03, 0.9, mat(COL.white), 14, 0, 2.9, 6));
    const sock = mesh(new THREE.ConeGeometry(0.1, 0.45, 8, 1, true), mat(0xf07a2a, { ds: true }), 14.22, 0.86, 2.9);
    sock.rotation.z = Math.PI / 2; g.add(sock); g.userData.sock = sock;
  },

  tower(g, L) {
    const h = 2.2 + L * 0.18;
    g.add(box(1.8, 0.4, 1.8, mat(COL.concreteD)));
    g.add(box(1.85, 0.08, 1.85, GLOW.win, 0, 0.18, 0));
    g.add(cyl(0.34, 0.44, h, mat(COL.concrete), 0, 0.4, 0, 8));
    g.add(cyl(0.46, 0.46, 0.14, mat(COL.red), 0, 0.4 + h - 0.3, 0, 8));
    g.add(cyl(0.72, 0.56, 0.5, GLOW.cab, 0, 0.4 + h, 0, 8));
    g.add(cyl(0.82, 0.78, 0.08, mat(COL.roofD), 0, 0.9 + h, 0, 8));
    g.add(cyl(0.015, 0.02, 0.7, mat(COL.metal), 0.3, 0.98 + h, 0, 5));
    const b = box(0.1, 0.1, 0.1, GLOW.red, 0, 0.98 + h, 0); g.add(b); g.userData.beacon = b;
  },

  hangar(g, L) {
    g.add(box(6, 0.04, 3, mat(COL.concreteL), 0, 0, -2));
    const lines = mat(COL.yellow);
    for (const x of [-2, 0, 2]) g.add(box(0.05, 0.01, 2.6, lines, x, 0.04, -2));
    g.add(box(6, 0.04, 4, mat(COL.concreteD), 0, 0, 1.5));
    const R = 2.95, sy = 0.72;
    const ag = new THREE.CylinderGeometry(R, R, 4, 18, 1, true, Math.PI / 2, Math.PI);
    ag.rotateX(Math.PI / 2);
    const arch = mesh(ag, mat(COL.olive, { ds: true }), 0, 0, 1.5); arch.scale.y = sy; g.add(arch);
    // Rippen
    for (let i = 0; i <= 4; i++) {
      const rg = new THREE.TorusGeometry(R + 0.02, 0.03, 4, 18, Math.PI);
      const rib = mesh(rg, mat(COL.oliveD), 0, 0, -0.5 + i); rib.scale.y = sy; g.add(rib);
    }
    const wallShape = (hole) => {
      const s = new THREE.Shape(); s.moveTo(-R, 0);
      for (let i = 0; i <= 18; i++) { const a = Math.PI - i / 18 * Math.PI; s.lineTo(Math.cos(a) * R, Math.sin(a) * R * sy); }
      s.lineTo(-R, 0);
      if (hole) { const h = new THREE.Path(); h.moveTo(-2.35, 0); h.lineTo(2.35, 0); h.lineTo(2.35, 1.55); h.lineTo(-2.35, 1.55); h.lineTo(-2.35, 0); s.holes.push(h); }
      return new THREE.ShapeGeometry(s);
    };
    g.add(mesh(wallShape(true), mat(COL.concrete, { ds: true }), 0, 0, -0.5));
    g.add(mesh(wallShape(false), mat(COL.concreteD, { ds: true }), 0, 0, 3.5));
    g.add(box(4.8, 0.1, 0.1, hazardMat(), 0, 1.55, -0.5));
    // Tore (halb geöffnet)
    g.add(box(0.9, 1.5, 0.08, mat(COL.roof), -2.6, 0.02, -0.45));
    g.add(box(0.9, 1.5, 0.08, mat(COL.roof), 2.6, 0.02, -0.45));
    g.add(box(0.5, 0.06, 0.06, GLOW.amber, -1.2, 1.75, -0.55));
    g.add(box(0.5, 0.06, 0.06, GLOW.amber, 1.2, 1.75, -0.55));
    g.userData.slots = [[-2, -2], [0, -2], [2, -2], [-1.2, 1.3], [1.2, 1.3], [0, 2.6]];
  },

  helipad(g) {
    const tex = canvasTex(256, 256, (c) => {
      c.fillStyle = '#8b8d88'; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#e8e8e2'; c.lineWidth = 10; c.beginPath(); c.arc(128, 128, 100, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#d9a92a'; c.fillRect(84, 70, 22, 116); c.fillRect(150, 70, 22, 116); c.fillRect(84, 118, 88, 20);
    });
    g.add(box(2.9, 0.06, 2.9, mat(COL.concreteD)));
    const d = decal(2.8, 2.8, tex, 0.065); d.material.transparent = false; g.add(d);
    for (const [x, z] of [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]]) g.add(box(0.08, 0.08, 0.08, GLOW.green, x, 0.06, z));
    g.userData.slots = [[0, 0]];
  },

  fuel(g, L) {
    g.add(box(3.9, 0.04, 3.9, mat(COL.concreteD)));
    for (const [w, d, x, z] of [[3.9, 0.15, 0, -1.9], [3.9, 0.15, 0, 1.9], [0.15, 3.9, -1.9, 0], [0.15, 3.9, 1.9, 0]]) g.add(box(w, 0.3, d, mat(COL.earth), x, 0, z));
    const n = 2 + (L >= 4) + (L >= 7);
    const pos = [[-0.85, -0.85], [0.85, 0.85], [0.85, -0.85], [-0.85, 0.85]];
    const h = 0.75 + L * 0.05;
    for (let i = 0; i < n; i++) {
      const [x, z] = pos[i];
      g.add(cyl(0.68, 0.68, h, mat(COL.concreteL), x, 0, z, 16));
      g.add(cyl(0.69, 0.69, 0.12, mat(COL.olive), x, h * 0.55, z, 16));
      g.add(cyl(0.5, 0.68, 0.14, mat(COL.concrete), x, h, z, 16));
      g.add(box(0.04, h + 0.1, 0.04, mat(COL.metal), x + 0.66, 0, z));
    }
    if (n < 4) g.add(box(0.7, 0.45, 0.5, mat(COL.white), -0.85, 0, 0.85));
    const pipe = cyl(0.06, 0.06, 2.4, mat(COL.yellow), 0, 0.1, 0, 6); pipe.rotation.z = Math.PI / 2; pipe.position.y = 0.16; g.add(pipe);
  },

  ammo(g, L) {
    g.add(box(2.9, 0.04, 2.9, mat(COL.concreteD)));
    const R = 1.15;
    const ig = new THREE.CylinderGeometry(R, R, 2.2, 12, 1, false, Math.PI / 2, Math.PI); ig.rotateX(Math.PI / 2);
    const igloo = mesh(ig, mat(COL.grass), 0, 0, 0.25); igloo.scale.y = 0.75; g.add(igloo);
    const mound = mesh(new THREE.SphereGeometry(R * 1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(COL.grass), 0, 0, 1.3);
    mound.scale.set(1, 0.7, 0.45); g.add(mound);
    const fs = new THREE.Shape(); fs.moveTo(-1.4, 0); fs.lineTo(1.4, 0); fs.lineTo(1.1, 1.0); fs.lineTo(-1.1, 1.0); fs.lineTo(-1.4, 0);
    g.add(mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.2, bevelEnabled: false }), mat(COL.concrete), 0, 0, -1.05));
    g.add(box(0.9, 0.7, 0.05, mat(COL.roof, { m: 0.3, r: 0.6 }), 0, 0.02, -1.08));
    g.add(box(1.0, 0.08, 0.05, hazardMat(), 0, 0.74, -1.08));
    const sign = mesh(new THREE.PlaneGeometry(0.22, 0.22), mat(0xf07a2a, { ds: true }), 0.75, 0.62, -1.09); sign.rotation.z = Math.PI / 4; g.add(sign);
    g.add(box(0.05, 0.05, 0.05, GLOW.red, -0.75, 0.85, -1.1));
  },

  depot(g, L) {
    g.add(box(3.9, 0.04, 2.9, mat(COL.concreteD)));
    g.add(box(2.4, 0.9, 2.4, mat(COL.concreteL), -0.6, 0, 0));
    const rg = new THREE.CylinderGeometry(1.35, 1.35, 2.5, 3, 1); rg.rotateZ(Math.PI / 2); rg.rotateX(-Math.PI / 2);
    const roof = mesh(rg, mat(COL.roof), -0.6, 0.9 + 0.36, 0); roof.scale.set(1, 0.55, 0.95); g.add(roof);
    g.add(box(0.8, 0.6, 0.05, mat(COL.roofD), -0.6, 0, -1.22));
    g.add(box(2.42, 0.1, 2.42, GLOW.win, -0.6, 0.62, 0));
    const cols = [COL.olive, COL.sand, COL.rust, COL.blueGrey, COL.oliveD];
    const n = 2 + Math.min(4, Math.floor(L / 2));
    for (let i = 0; i < n; i++) g.add(box(0.95, 0.42, 0.42, mat(cols[i % cols.length]), 1.3, (i >= 3 ? 0.42 : 0), -0.9 + (i % 3) * 0.48));
  },

  barracks(g, L) {
    g.add(box(3.9, 0.04, 2.9, mat(COL.concreteD)));
    const blk = (x, z, w, d, fl) => {
      g.add(box(w, fl * 0.5, d, mat(0xb9b3a4), x, 0, z));
      for (let i = 0; i < fl; i++) g.add(box(w + 0.02, 0.1, d + 0.02, GLOW.win, x, i * 0.5 + 0.22, z));
      g.add(box(w + 0.1, 0.06, d + 0.1, mat(COL.roof), x, fl * 0.5, z));
      g.add(box(0.3, 0.2, 0.25, mat(COL.metal), x + w / 3, fl * 0.5 + 0.06, z));
    };
    blk(0, -0.55, 3.6, 1.2, 2);
    if (L >= 3) blk(-1.05, 0.85, 1.5, 0.9, 2);
    if (L >= 5) blk(1.05, 0.85, 1.5, 0.9, 3);
    g.add(box(0.03, 0.9, 0.03, mat(COL.metal), 1.6, 0, 1.2));
  },

  maint(g, L) {
    g.add(box(4.9, 0.04, 3.9, mat(COL.concreteD)));
    g.add(box(4.2, 1.4, 3.0, mat(COL.concrete), 0, 0, 0.3));
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.05, 0); s.lineTo(0, 0.5); s.lineTo(0, 0);
      const ge = new THREE.ExtrudeGeometry(s, { depth: 3.0, bevelEnabled: false });
      const t = mesh(ge, mat(COL.roof), -2.1 + i * 1.05, 1.4, -1.2); g.add(t);
      g.add(box(0.04, 0.45, 3.0, GLOW.cab, -2.08 + i * 1.05, 1.4, 0.3));
    }
    g.add(box(2.6, 1.15, 0.06, mat(COL.roofD), 0, 0.02, -1.22));
    g.add(box(2.7, 0.1, 0.07, hazardMat(), 0, 1.17, -1.24));
    g.add(box(0.1, 1.9, 0.1, mat(COL.yellow), -2.3, 0, -1.7));
    g.add(box(0.1, 1.9, 0.1, mat(COL.yellow), 2.3, 0, -1.7));
    g.add(box(4.8, 0.14, 0.14, mat(COL.yellow), 0, 1.9, -1.7));
    g.add(box(0.2, 0.2, 0.2, mat(COL.metal), 0.8, 1.7, -1.7));
  },

  school(g, L) {
    g.add(box(3.9, 0.04, 3.9, mat(COL.concreteD)));
    g.add(box(2.2, 0.95, 2.0, mat(0xb7b9b2), -0.75, 0, 0.6));
    g.add(box(2.22, 0.12, 2.02, GLOW.win, -0.75, 0.55, 0.6));
    g.add(box(2.3, 0.06, 2.1, mat(COL.roof), -0.75, 0.95, 0.6));
    const dome = mesh(new THREE.SphereGeometry(0.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(COL.white, { flat: false, r: 0.5 }), 1.0, 0, 0.7);
    g.add(dome);
    g.add(cyl(0.05, 0.08, 0.8, mat(COL.metal), -0.6, 0, -1.2, 6));
    const mini = aircraft('turboprop', 'trainer'); mini.scale.setScalar(0.85); mini.position.set(-0.6, 0.92, -1.2); mini.rotation.set(-0.35, 0.6, 0.2);
    g.add(mini);
  },

  motorpool(g, L) {
    g.add(box(4.9, 0.04, 3.9, mat(COL.asphaltL)));
    for (let x = -2.2; x <= 2.2; x += 1.1) for (const z of [0.2, 1.6]) g.add(box(0.06, 0.9, 0.06, mat(COL.metal), x, 0, z));
    g.add(box(4.8, 0.06, 1.7, mat(COL.olive), 0, 0.9, 0.9));
    for (let x = -1.65; x <= 1.65; x += 1.1) g.add(box(0.04, 0.01, 1.2, mat(COL.white), x, 0.045, -1.0));
    g.add(box(1.0, 0.6, 0.8, mat(COL.concreteL), 1.9, 0, -1.4));
    g.add(box(1.02, 0.1, 0.82, GLOW.win, 1.9, 0.35, -1.4));
    g.userData.slots = [[-1.65, 0.9], [-0.55, 0.9], [0.55, 0.9], [1.65, 0.9], [-1.1, -1.0], [0, -1.0], [-2.1, -1.0]];
  },

  radar(g, L) {
    g.add(box(2.9, 0.04, 2.9, mat(COL.concreteD)));
    g.add(box(1.0, 0.55, 0.7, mat(COL.olive), 0.85, 0, 0.9));
    const h = 1.0 + L * 0.12;
    g.add(cyl(0.12, 0.22, h, mat(COL.metal), 0, 0, 0, 6));
    const head = new THREE.Group(); head.position.y = h;
    head.add(box(0.3, 0.25, 0.3, mat(COL.oliveD)));
    const panel = box(1.4 + L * 0.06, 0.7, 0.1, mat(0xc9ccc4), 0, 0.2, 0.15); panel.rotation.x = -0.35; head.add(panel);
    head.add(box(0.06, 0.06, 0.06, GLOW.red, 0, 0.78, 0.1));
    g.add(head); g.userData.spin = head;
    for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) g.add(box(0.04, 0.4, 0.04, mat(COL.metal), x, 0, z));
  },

  flak(g, L) {
    const sb = mesh(new THREE.TorusGeometry(0.75, 0.17, 5, 14), mat(COL.sand), 0, 0.12, 0); sb.rotation.x = Math.PI / 2; g.add(sb);
    g.add(cyl(0.6, 0.6, 0.04, mat(COL.concreteD), 0, 0, 0, 12));
    const t = new THREE.Group(); t.position.y = 0.05;
    t.add(cyl(0.32, 0.36, 0.22, mat(COL.olive), 0, 0, 0, 8));
    t.add(box(0.5, 0.28, 0.4, mat(COL.olive), 0, 0.2, -0.02));
    const bar = new THREE.Group(); bar.position.set(0, 0.36, 0.05);
    for (const x of [-0.13, 0.13]) { const b = cyl(0.025, 0.03, 0.85, mat(COL.black, { m: 0.4 }), x, 0, 0, 6); b.rotation.x = Math.PI / 2; b.position.set(x, 0, 0.45); bar.add(b); }
    bar.rotation.x = -0.6; t.add(bar);
    t.add(box(0.14, 0.14, 0.14, mat(COL.oliveD), 0.3, 0.42, -0.15));
    g.add(t); g.userData.turret = t; g.userData.barrel = bar;
    if (L >= 4) g.add(box(0.12, 0.1, 0.12, GLOW.amber, -0.6, 0.25, -0.6));
  },

  cram(g) {
    g.add(box(1.6, 0.25, 1.6, mat(COL.concreteD)));
    const t = new THREE.Group(); t.position.y = 0.25;
    t.add(cyl(0.3, 0.36, 0.3, mat(0xd9dbd6), 0, 0, 0, 10));
    t.add(cyl(0.24, 0.26, 0.5, mat(0xeeeeea, { flat: false }), 0, 0.3, -0.05, 12));
    t.add(mesh(new THREE.SphereGeometry(0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xeeeeea, { flat: false }), 0, 0.8, -0.05));
    const bar = new THREE.Group(); bar.position.set(0, 0.38, 0.12);
    const b = cyl(0.06, 0.06, 0.7, mat(COL.black, { m: 0.4 }), 0, 0, 0.35, 8); b.rotation.x = Math.PI / 2; bar.add(b);
    bar.rotation.x = -0.5; t.add(bar);
    g.add(t); g.userData.turret = t; g.userData.barrel = bar;
  },

  irist(g) {
    g.add(box(2.9, 0.04, 2.9, mat(COL.concreteD)));
    truckChassis(g, 1.5, 0.55, COL.olive);
    const t = new THREE.Group(); t.position.set(0, 0.55, -0.2);
    t.add(box(0.5, 0.12, 0.5, mat(COL.oliveD)));
    const rack = new THREE.Group(); rack.position.y = 0.1;
    const can = box(0.62, 0.42, 1.25, mat(COL.olive), 0, -0.21, 0.4);
    rack.add(can);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) rack.add(mesh(new THREE.CircleGeometry(0.06, 8), mat(COL.black), -0.21 + i * 0.14, -0.1 + j * 0.2 - 0.21 + 0.21, 1.03));
    rack.rotation.x = -0.9; t.add(rack);
    g.add(t); g.userData.turret = t; g.userData.barrel = rack;
    const net = flatShape([[-1.3, 0.6], [-0.4, 1.3], [0.9, 1.25], [1.35, 0.4], [0.6, -0.1], [-0.8, 0.1]], 0.02, mat(COL.oliveD, { ds: true }));
    net.position.y = 1.0; g.add(net);
    for (const [x, z] of [[-1.1, 0.7], [1.1, 0.5], [0.4, 1.1]]) g.add(box(0.03, 1.0, 0.03, mat(COL.earth), x, 0, z));
  },

  patriot(g) {
    g.add(box(3.9, 0.04, 3.9, mat(COL.concreteD)));
    // Startgerät
    const base = new THREE.Group(); base.position.set(-0.6, 0, 0.2);
    base.add(box(1.0, 0.25, 2.3, mat(COL.olive), 0, 0.15, 0));
    for (const z of [-0.8, 0, 0.8]) for (const x of [-0.5, 0.5]) { const w = cyl(0.16, 0.16, 0.12, mat(COL.black), x, 0.16, z, 10); w.rotation.z = Math.PI / 2; w.position.y = 0.16; base.add(w); }
    const t = new THREE.Group(); t.position.set(0, 0.42, 0.1);
    const rack = new THREE.Group();
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) rack.add(box(0.38, 0.32, 1.8, mat(0x6b7650), -0.2 + i * 0.4, j * 0.34, 0.6));
    rack.rotation.x = -0.66; t.add(rack); base.add(t);
    g.add(base); g.userData.turret = t; g.userData.barrel = rack; g.userData.turretOffset = base.position.clone();
    // Radar
    g.add(box(0.8, 0.5, 1.2, mat(COL.olive), 1.2, 0, -0.9));
    const pan = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10), mat(0xa0a597), 1.2, 0.95, -1.4); pan.rotation.x = 1.1; g.add(pan);
    const net = flatShape([[0.4, -1.8], [1.9, -1.9], [1.9, 0.2], [0.8, 0.4], [0.3, -0.5]], 0.02, mat(COL.oliveD, { ds: true }));
    net.position.y = 1.3; g.add(net);
    for (const [x, z] of [[0.5, -1.7], [1.8, -1.7], [1.8, 0.1], [0.6, 0.2]]) g.add(box(0.03, 1.3, 0.03, mat(COL.earth), x, 0, z));
  },
};

function truckChassis(g, len, h, color) {
  g.add(box(0.7, 0.25, len, mat(color), 0, 0.18, 0));
  g.add(box(0.68, 0.4, 0.45, mat(color), 0, 0.3, len / 2 - 0.2));
  g.add(box(0.6, 0.15, 0.03, mat(COL.glass, { r: 0.2 }), 0, 0.5, len / 2 + 0.03));
  for (let z = -len / 2 + 0.25; z < len / 2; z += len / 3.2) for (const x of [-0.33, 0.33]) {
    const w = cyl(0.13, 0.13, 0.1, mat(COL.black), x, 0.13, z, 10); w.rotation.z = Math.PI / 2; w.position.y = 0.13; g.add(w);
  }
}

// Baustelle
export function scaffold(w, d, h) {
  const g = new THREE.Group();
  const pm = mat(COL.yellow, { m: 0.2 });
  const H = Math.max(0.8, h);
  for (const [x, z] of [[-w / 2 + 0.2, -d / 2 + 0.2], [w / 2 - 0.2, -d / 2 + 0.2], [-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2]]) g.add(box(0.06, H, 0.06, pm, x, 0, z));
  for (const y of [H * 0.5, H]) {
    g.add(box(w - 0.4, 0.05, 0.05, pm, 0, y, -d / 2 + 0.2)); g.add(box(w - 0.4, 0.05, 0.05, pm, 0, y, d / 2 - 0.2));
    g.add(box(0.05, 0.05, d - 0.4, pm, -w / 2 + 0.2, y, 0)); g.add(box(0.05, 0.05, d - 0.4, pm, w / 2 - 0.2, y, 0));
  }
  g.add(box(w - 0.5, 0.05, d - 0.5, mat(COL.sand), 0, 0, 0));
  // Kran
  const crane = new THREE.Group(); crane.position.set(w / 2 - 0.3, 0, -d / 2 + 0.3);
  crane.add(box(0.12, H + 1.2, 0.12, mat(COL.yellow)));
  const jib = new THREE.Group(); jib.position.y = H + 1.2;
  jib.add(box(2.2, 0.1, 0.1, mat(COL.yellow), -0.8, 0, 0));
  jib.add(box(0.3, 0.25, 0.25, mat(COL.concreteD), 0.4, -0.05, 0));
  jib.add(box(0.02, 0.8, 0.02, mat(COL.black), -1.6, -0.8, 0));
  crane.add(jib); g.add(crane); g.userData.jib = jib;
  return g;
}

// ===========================================================================
//  FLUGZEUGE (Nase zeigt nach +z)
// ===========================================================================
const PAINT = {
  grey: [0x8a949b, 0x6f7a82], dark: [0x5d6569, 0x4b5256], camo: [0x6a7150, 0x4b5038], transport: [0x76827a, 0x5d6a62],
  light: [0xc8ccce, 0xa7adb1], stealth: [0x6c7378, 0x585f64], trainer: [0xe9e9e4, 0xc4352c], heli: [0x56603f, 0x3f4730],
  enemy: [0x7d6c56, 0x5a4c3c], enemy2: [0x6f7d84, 0x8a6a4c],
};
function fuselage(g, len, r, m, mDark, opts = {}) {
  const body = mesh(new THREE.CylinderGeometry(r, r * (opts.taper ?? 0.75), len * 0.62, 8), m, 0, 0, len * 0.04);
  body.rotation.x = Math.PI / 2; body.scale.x = opts.wide ?? 1; g.add(body);
  const nose = mesh(new THREE.ConeGeometry(r, len * 0.3, 8), m, 0, 0, len * 0.04 + len * 0.31 + len * 0.15);
  nose.rotation.x = Math.PI / 2; nose.scale.x = opts.wide ?? 1; g.add(nose);
  const tail = mesh(new THREE.CylinderGeometry(r * (opts.taper ?? 0.75), r * 0.45, len * 0.2, 8), mDark, 0, 0, len * 0.04 - len * 0.31 - len * 0.1);
  tail.rotation.x = Math.PI / 2; g.add(tail);
  return { front: len * 0.04 + len * 0.46, back: -len * 0.5 };
}
function canopy(g, r, z, y = 0.6, l = 1.5) {
  const c = mesh(new THREE.SphereGeometry(r, 8, 6), mat(COL.glass, { r: 0.15, m: 0.5 }), 0, r * y, z);
  c.scale.set(0.62, 0.55, l); g.add(c);
}
function wingPair(g, half, t, m) { // half: [[x,z],...] rechte Seite
  g.add(flatShape(half, t, m));
  g.add(flatShape(half.map(([x, z]) => [-x, z]).reverse(), t, m));
}
function nozzle(g, x, z, r) {
  const n = mesh(new THREE.CylinderGeometry(r * 0.85, r, 0.1, 8, 1, true), mat(0x2e3133, { ds: true, m: 0.5 }), x, 0, z);
  n.rotation.x = Math.PI / 2; g.add(n);
  const fl = mesh(new THREE.ConeGeometry(r * 0.8, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xffa04a, transparent: true, opacity: 0.85 }), x, 0, z - 0.3);
  fl.rotation.x = -Math.PI / 2; fl.visible = false; g.add(fl);
  (g.userData.burners ||= []).push(fl);
}
function prop(g, x, y, z, r, axis = 'z') {
  const p = new THREE.Group(); p.position.set(x, y, z);
  const pm = mat(COL.black);
  for (let i = 0; i < 4; i++) { const b = box(0.04, r * 2, 0.015, pm, 0, -r, 0); const h = new THREE.Group(); h.add(b); h.rotation.z = i * Math.PI / 2; p.add(h); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
  p.add(disc);
  if (axis === 'y') p.rotation.x = Math.PI / 2;
  g.add(p); (g.userData.props ||= []).push(p);
  return p;
}

const SHAPES = {
  f16(g, m, d) {
    fuselage(g, 1.5, 0.09, m, d); canopy(g, 0.09, 0.45);
    g.add(box(0.16, 0.08, 0.3, d, 0, -0.14, 0.15));
    wingPair(g, [[0.07, 0.25], [0.52, -0.22], [0.52, -0.33], [0.07, -0.38]], 0.025, m);
    g.add(finShape([[-0.4, 0.06], [-0.7, 0.06], [-0.74, 0.44], [-0.62, 0.44]], 0.02, d));
    wingPair(g, [[0.06, -0.52], [0.33, -0.66], [0.33, -0.72], [0.06, -0.72]], 0.02, m);
    nozzle(g, 0, -0.76, 0.07);
  },
  gripen(g, m, d) {
    fuselage(g, 1.35, 0.085, m, d); canopy(g, 0.085, 0.38);
    wingPair(g, [[0.06, 0.05], [0.48, -0.4], [0.48, -0.47], [0.06, -0.52]], 0.025, m);
    wingPair(g, [[0.06, 0.32], [0.24, 0.22], [0.24, 0.18], [0.06, 0.19]], 0.018, d);
    g.add(finShape([[-0.32, 0.06], [-0.62, 0.06], [-0.68, 0.4], [-0.56, 0.4]], 0.02, d));
    nozzle(g, 0, -0.68, 0.065);
  },
  typhoon(g, m, d) {
    fuselage(g, 1.6, 0.095, m, d); canopy(g, 0.095, 0.45);
    g.add(box(0.26, 0.1, 0.4, d, 0, -0.12, 0.05));
    wingPair(g, [[0.08, 0.0], [0.58, -0.56], [0.58, -0.64], [0.08, -0.7]], 0.025, m);
    wingPair(g, [[0.08, 0.55], [0.26, 0.42], [0.26, 0.38], [0.08, 0.4]], 0.018, d);
    g.add(finShape([[-0.42, 0.07], [-0.76, 0.07], [-0.82, 0.48], [-0.68, 0.48]], 0.02, d));
    nozzle(g, -0.06, -0.82, 0.06); nozzle(g, 0.06, -0.82, 0.06);
  },
  rafale(g, m, d) {
    fuselage(g, 1.55, 0.092, m, d); canopy(g, 0.092, 0.42);
    wingPair(g, [[0.08, 0.02], [0.55, -0.5], [0.55, -0.58], [0.08, -0.66]], 0.025, m);
    wingPair(g, [[0.09, 0.26], [0.27, 0.14], [0.27, 0.1], [0.09, 0.1]], 0.018, d);
    g.add(finShape([[-0.4, 0.07], [-0.72, 0.07], [-0.78, 0.44], [-0.64, 0.44]], 0.02, d));
    nozzle(g, -0.06, -0.8, 0.06); nozzle(g, 0.06, -0.8, 0.06);
  },
  f18(g, m, d) {
    fuselage(g, 1.6, 0.1, m, d, { wide: 1.15 }); canopy(g, 0.1, 0.42);
    wingPair(g, [[0.1, 0.42], [0.18, 0.05], [0.6, -0.22], [0.6, -0.34], [0.1, -0.38]], 0.025, m);
    for (const s of [-1, 1]) { const f = finShape([[-0.3, 0.06], [-0.58, 0.06], [-0.64, 0.42], [-0.5, 0.42]], 0.02, d); f.position.x = 0.13 * s; f.rotation.z = -0.3 * s; g.add(f); }
    wingPair(g, [[0.09, -0.56], [0.36, -0.72], [0.36, -0.8], [0.09, -0.8]], 0.02, m);
    nozzle(g, -0.07, -0.84, 0.065); nozzle(g, 0.07, -0.84, 0.065);
  },
  f15(g, m, d) {
    fuselage(g, 1.8, 0.11, m, d, { wide: 1.3 }); canopy(g, 0.11, 0.55);
    g.add(box(0.42, 0.14, 0.7, m, 0, -0.04, 0.0));
    wingPair(g, [[0.12, 0.15], [0.66, -0.28], [0.66, -0.42], [0.12, -0.48]], 0.03, m);
    for (const s of [-1, 1]) { const f = finShape([[-0.5, 0.05], [-0.8, 0.05], [-0.86, 0.5], [-0.72, 0.5]], 0.02, d); f.position.x = 0.16 * s; g.add(f); }
    wingPair(g, [[0.12, -0.62], [0.42, -0.8], [0.42, -0.88], [0.12, -0.88]], 0.02, m);
    nozzle(g, -0.08, -0.94, 0.07); nozzle(g, 0.08, -0.94, 0.07);
  },
  f35(g, m, d) {
    fuselage(g, 1.55, 0.12, m, d, { wide: 1.35, taper: 0.85 }); canopy(g, 0.11, 0.42);
    wingPair(g, [[0.12, 0.12], [0.55, -0.26], [0.55, -0.36], [0.12, -0.44]], 0.03, m);
    for (const s of [-1, 1]) { const f = finShape([[-0.4, 0.06], [-0.64, 0.06], [-0.7, 0.36], [-0.56, 0.36]], 0.02, d); f.position.x = 0.15 * s; f.rotation.z = -0.45 * s; g.add(f); }
    wingPair(g, [[0.12, -0.56], [0.36, -0.68], [0.36, -0.76], [0.12, -0.78]], 0.02, m);
    nozzle(g, 0, -0.8, 0.085);
  },
  tornado(g, m, d) {
    fuselage(g, 1.7, 0.1, m, d, { wide: 1.15 }); canopy(g, 0.1, 0.5, 0.6, 1.9);
    g.add(box(0.32, 0.12, 0.5, d, 0, -0.05, -0.05));
    wingPair(g, [[0.14, 0.08], [0.62, -0.32], [0.62, -0.42], [0.14, -0.22]], 0.025, m);
    g.add(finShape([[-0.4, 0.07], [-0.8, 0.07], [-0.85, 0.55], [-0.66, 0.55]], 0.022, d));
    wingPair(g, [[0.1, -0.55], [0.4, -0.76], [0.4, -0.84], [0.1, -0.84]], 0.02, m);
    nozzle(g, -0.06, -0.88, 0.06); nozzle(g, 0.06, -0.88, 0.06);
  },
  a10(g, m, d) {
    fuselage(g, 1.55, 0.09, m, d); canopy(g, 0.09, 0.5);
    wingPair(g, [[0.08, 0.12], [0.85, 0.06], [0.85, -0.1], [0.08, -0.16]], 0.03, m);
    for (const s of [-1, 1]) {
      const e = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.38, 10), d, 0.16 * s, 0.16, -0.38); e.rotation.x = Math.PI / 2; g.add(e);
      const f = finShape([[-0.6, 0.0], [-0.82, 0.0], [-0.82, 0.32], [-0.68, 0.32]], 0.02, d); f.position.set(0.32 * s, 0.05, 0); g.add(f);
    }
    wingPair(g, [[0.06, -0.64], [0.34, -0.64], [0.34, -0.8], [0.06, -0.8]], 0.02, m);
  },
  turboprop(g, m, d) {
    fuselage(g, 1.1, 0.08, m, m); canopy(g, 0.08, 0.15, 0.7, 2.2);
    wingPair(g, [[0.06, 0.12], [0.5, 0.04], [0.5, -0.06], [0.06, -0.14]], 0.022, m);
    for (const s of [-1, 1]) g.add(box(0.08, 0.026, 0.12, d, 0.46 * s, -0.01, -0.01));
    g.add(finShape([[-0.32, 0.05], [-0.54, 0.05], [-0.56, 0.3], [-0.46, 0.3]], 0.02, d));
    wingPair(g, [[0.04, -0.4], [0.22, -0.46], [0.22, -0.52], [0.04, -0.54]], 0.018, m);
    prop(g, 0, 0, 0.6, 0.17);
  },
  mq9(g, m, d) {
    fuselage(g, 0.95, 0.06, m, m); g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), m, 0, 0.02, 0.35));
    wingPair(g, [[0.04, 0.06], [0.95, 0.02], [0.95, -0.05], [0.04, -0.06]], 0.016, m);
    for (const s of [-1, 1]) { const f = finShape([[-0.3, 0.0], [-0.46, 0.0], [-0.48, 0.2], [-0.4, 0.2]], 0.015, d); f.rotation.z = 0.8 * s; g.add(f); }
    const fd = finShape([[-0.32, 0.0], [-0.44, 0.0], [-0.45, -0.16], [-0.38, -0.16]], 0.015, d); g.add(fd);
    prop(g, 0, 0, -0.5, 0.12);
  },
  c130(g, m, d) { heavyProp(g, m, d, false); },
  a400m(g, m, d) { heavyProp(g, m, d, true); },
  mrtt(g, m, d) { airliner(g, m, d, 'mrtt'); },
  e7(g, m, d) { airliner(g, m, d, 'e7'); },
  h145(g, m, d) { heli(g, m, d, { len: 0.55, w: 0.28, h: 0.3, rotor: 0.52, skids: true }); },
  nh90(g, m, d) { heli(g, m, d, { len: 0.85, w: 0.36, h: 0.38, rotor: 0.62 }); },
  tiger(g, m, d) { heli(g, m, d, { len: 0.75, w: 0.18, h: 0.3, rotor: 0.56, attack: true }); },
  ah64(g, m, d) { heli(g, m, d, { len: 0.82, w: 0.2, h: 0.32, rotor: 0.62, attack: true, chin: true }); },
  ch47(g, m, d) { heli(g, m, d, { len: 1.35, w: 0.34, h: 0.38, rotor: 0.6, tandem: true }); },
  // Gegner
  su25(g, m, d) {
    fuselage(g, 1.45, 0.09, m, d); canopy(g, 0.09, 0.42);
    wingPair(g, [[0.08, 0.12], [0.7, -0.04], [0.7, -0.16], [0.08, -0.2]], 0.026, m);
    g.add(finShape([[-0.4, 0.06], [-0.7, 0.06], [-0.74, 0.42], [-0.6, 0.42]], 0.02, d));
    wingPair(g, [[0.06, -0.5], [0.3, -0.62], [0.3, -0.7], [0.06, -0.7]], 0.02, m);
    for (const s of [-1, 1]) { const e = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), d, 0.14 * s, -0.02, -0.1); e.rotation.x = Math.PI / 2; g.add(e); }
  },
  mig29(g, m, d) {
    fuselage(g, 1.55, 0.09, m, d, { wide: 1.2 }); canopy(g, 0.09, 0.46);
    wingPair(g, [[0.1, 0.3], [0.2, 0.02], [0.6, -0.3], [0.6, -0.38], [0.1, -0.42]], 0.025, m);
    for (const s of [-1, 1]) { const f = finShape([[-0.42, 0.06], [-0.7, 0.06], [-0.74, 0.42], [-0.6, 0.42]], 0.02, d); f.position.x = 0.15 * s; f.rotation.z = -0.15 * s; g.add(f); }
    wingPair(g, [[0.1, -0.58], [0.38, -0.72], [0.38, -0.8], [0.1, -0.8]], 0.02, m);
  },
  su34(g, m, d) {
    fuselage(g, 1.9, 0.12, m, d, { wide: 1.4 }); canopy(g, 0.12, 0.6, 0.6, 1.6);
    wingPair(g, [[0.12, 0.25], [0.24, 0.0], [0.72, -0.34], [0.72, -0.44], [0.12, -0.5]], 0.03, m);
    wingPair(g, [[0.1, 0.5], [0.24, 0.42], [0.24, 0.38], [0.1, 0.38]], 0.02, d);
    for (const s of [-1, 1]) { const f = finShape([[-0.5, 0.06], [-0.84, 0.06], [-0.9, 0.5], [-0.74, 0.5]], 0.02, d); f.position.x = 0.18 * s; g.add(f); }
    wingPair(g, [[0.12, -0.66], [0.42, -0.86], [0.42, -0.94], [0.12, -0.94]], 0.02, m);
  },
  drone(g, m, d) {
    g.add(box(0.1, 0.08, 0.55, m, 0, -0.04, 0));
    wingPair(g, [[0.04, 0.2], [0.42, -0.18], [0.42, -0.26], [0.04, -0.24]], 0.02, m);
    for (const s of [-1, 1]) { const f = finShape([[-0.1, 0.0], [-0.26, 0.0], [-0.26, 0.14], [-0.18, 0.14]], 0.012, d); f.position.x = 0.42 * s; g.add(f); }
    prop(g, 0, 0, -0.3, 0.09);
  },
  cruise(g, m, d) {
    const b = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), m, 0, 0, 0); b.rotation.x = Math.PI / 2; g.add(b);
    const n = mesh(new THREE.ConeGeometry(0.06, 0.18, 8), m, 0, 0, 0.54); n.rotation.x = Math.PI / 2; g.add(n);
    wingPair(g, [[0.04, 0.05], [0.4, -0.05], [0.4, -0.1], [0.04, -0.08]], 0.012, d);
    g.add(finShape([[-0.32, 0.04], [-0.45, 0.04], [-0.46, 0.18], [-0.4, 0.18]], 0.012, d));
  },
};

function heavyProp(g, m, d, tTail) {
  fuselage(g, 2.6, 0.2, m, d, { taper: 0.9 });
  g.add(box(0.36, 0.06, 0.4, mat(COL.glass, { r: 0.2 }), 0, 0.1, 1.1));
  const wy = 0.17;
  const w = [[0.12, 0.42], [1.55, 0.3], [1.55, 0.1], [0.12, 0.0]];
  const wing = new THREE.Group(); wing.position.y = wy;
  wingPair(wing, tTail ? [[0.12, 0.42], [1.55, 0.22], [1.55, 0.04], [0.12, 0.0]] : w, 0.05, m);
  g.add(wing);
  for (const x of [-1.05, -0.55, 0.55, 1.05]) {
    const n = mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8), d, x, wy - 0.04, 0.35); n.rotation.x = Math.PI / 2; g.add(n);
    prop(g, x, wy - 0.04, 0.6, 0.24);
  }
  g.add(finShape([[-0.65, 0.12], [-1.25, 0.12], [-1.38, 0.82], [-1.06, 0.82]], 0.03, d));
  const ht = tTail ? 0.82 : 0.2;
  const hs = new THREE.Group(); hs.position.y = ht;
  wingPair(hs, [[0.04, -0.95], [0.7, -1.18], [0.7, -1.3], [0.04, -1.32]], 0.03, m); g.add(hs);
  g.add(box(0.24, 0.12, 0.4, d, 0, -0.2, -0.05));
}
function airliner(g, m, d, kind) {
  fuselage(g, 3.2, 0.2, m, d, { taper: 0.95 });
  g.add(box(0.3, 0.05, 0.2, mat(COL.glass, { r: 0.2 }), 0, 0.12, 1.42));
  const w = [[0.14, 0.45], [1.6, -0.35], [1.6, -0.52], [0.14, -0.18]];
  const wing = new THREE.Group(); wing.position.y = -0.1; wingPair(wing, w, 0.05, m); g.add(wing);
  for (const x of [-0.65, 0.65]) {
    const e = mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.5, 10), d, x, -0.24, 0.32); e.rotation.x = Math.PI / 2; g.add(e);
  }
  g.add(finShape([[-1.0, 0.12], [-1.6, 0.12], [-1.72, 0.85], [-1.42, 0.85]], 0.03, d));
  const hs = new THREE.Group(); hs.position.y = 0.05;
  wingPair(hs, [[0.04, -1.2], [0.7, -1.55], [0.7, -1.66], [0.04, -1.6]], 0.03, m); g.add(hs);
  if (kind === 'mrtt') {
    for (const x of [-1.25, 1.25]) { const p = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), d, x, -0.18, -0.2); p.rotation.x = Math.PI / 2; g.add(p); }
    const boom = box(0.04, 0.04, 0.7, d, 0, -0.25, -1.75); boom.rotation.x = 0.4; g.add(boom);
  } else {
    g.add(box(0.12, 0.2, 0.2, d, 0, 0.18, -0.1));
    g.add(box(0.14, 0.12, 1.1, mat(0xd2d6d8), 0, 0.36, -0.1));
  }
}
function heli(g, m, d, o) {
  const body = mesh(new THREE.SphereGeometry(0.5, 10, 8), m, 0, o.h * 0.55, 0.05);
  body.scale.set(o.w, o.h, o.len); g.add(body);
  if (o.tandem) { g.add(box(o.w * 0.95, o.h * 0.9, o.len * 0.9, m, 0, o.h * 0.15, 0)); }
  canopy(g, o.w * 0.45, o.len * 0.38, 0.8, 1.2);
  g.children[g.children.length - 1].position.y += o.h * 0.45;
  if (!o.tandem) {
    const boom = mesh(new THREE.CylinderGeometry(0.04, 0.07, o.len * 1.0, 6), m, 0, o.h * 0.68, -o.len * 0.75); boom.rotation.x = Math.PI / 2; g.add(boom);
    g.add(finShape([[-o.len * 1.15, o.h * 0.6], [-o.len * 1.32, o.h * 0.6], [-o.len * 1.36, o.h * 1.15], [-o.len * 1.24, o.h * 1.15]], 0.02, d));
    const tr = prop(g, 0.05, o.h * 0.95, -o.len * 1.28, 0.12); tr.rotation.y = Math.PI / 2;
  }
  if (o.attack) {
    for (const s of [-1, 1]) { g.add(box(0.28, 0.025, 0.12, d, 0.18 * s, o.h * 0.45, 0.02)); g.add(box(0.06, 0.06, 0.18, d, 0.28 * s, o.h * 0.38, 0.02)); }
    if (o.chin) g.add(box(0.06, 0.06, 0.12, mat(COL.black), 0, o.h * 0.15, o.len * 0.42));
  }
  if (o.skids) for (const s of [-1, 1]) g.add(box(0.025, 0.025, o.len * 0.95, mat(COL.black), 0.14 * s, 0.02, 0.02));
  else for (const [x, z] of [[-o.w * 0.4, o.len * 0.3], [o.w * 0.4, o.len * 0.3], [0, -o.len * 0.4]]) g.add(box(0.05, 0.08, 0.06, mat(COL.black), x, 0, z));
  const rotors = [];
  const mk = (z, y) => {
    const r = new THREE.Group(); r.position.set(0, y, z);
    r.add(cyl(0.03, 0.03, 0.08, mat(COL.metal), 0, -0.06, 0, 6));
    for (let i = 0; i < 2; i++) { const b = box(o.rotor * 2, 0.012, 0.05, mat(COL.black), 0, 0, 0); b.rotation.y = i * Math.PI / 2 + (o.tandem ? 0.4 : 0); r.add(b); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(o.rotor, 20), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.1, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; r.add(disc);
    g.add(r); rotors.push(r);
  };
  if (o.tandem) { g.add(box(0.12, 0.25, 0.2, m, 0, o.h * 0.8, -o.len * 0.42)); mk(o.len * 0.42, o.h * 0.95); mk(-o.len * 0.42, o.h * 1.08); }
  else mk(0.05, o.h * 1.08);
  g.userData.rotors = rotors;
}

export function aircraft(shape, paint) {
  const g = new THREE.Group();
  const [c1, c2] = PAINT[paint] || PAINT.grey;
  const m = mat(c1, { r: 0.6, m: 0.15 }), d = mat(c2, { r: 0.6, m: 0.15 });
  (SHAPES[shape] || SHAPES.f16)(g, m, d);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return g;
}
export function enemy(type) {
  return aircraft(type, type === 'cruise' || type === 'drone' ? 'enemy2' : 'enemy');
}

// ===========================================================================
//  BODENFAHRZEUGE (Front +z)
// ===========================================================================
export function vehicle(shape) {
  const g = new THREE.Group();
  const wheels = (n, len, x = 0.17, r = 0.07) => { for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const w = cyl(r, r, 0.05, mat(COL.black), x * s, r, -len / 2 + 0.08 + i * (len - 0.16) / Math.max(1, n - 1), 8); w.rotation.z = Math.PI / 2; w.position.y = r; g.add(w); } };
  const O = mat(COL.olive), OD = mat(COL.oliveD);
  switch (shape) {
    case 'truck': g.add(box(0.36, 0.2, 0.75, OD, 0, 0.1, -0.05)); g.add(box(0.36, 0.22, 0.2, O, 0, 0.1, 0.3)); g.add(box(0.37, 0.16, 0.5, mat(COL.sand), 0, 0.3, -0.12)); wheels(4, 0.75); break;
    case 'tanker': g.add(box(0.34, 0.12, 0.72, OD, 0, 0.1, 0)); g.add(box(0.34, 0.22, 0.18, mat(COL.white), 0, 0.1, 0.28)); { const t = cyl(0.15, 0.15, 0.5, mat(0xd8d8d0), 0, 0.3, -0.1, 10); t.rotation.x = Math.PI / 2; t.position.y = 0.33; g.add(t); } g.add(box(0.1, 0.03, 0.1, GLOW.amber, 0, 0.32, 0.3)); wheels(3, 0.72); break;
    case 'loader': g.add(box(0.32, 0.12, 0.5, mat(COL.yellow), 0, 0.06, 0)); g.add(box(0.1, 0.12, 0.12, mat(COL.black), 0.1, 0.18, -0.1)); g.add(box(0.06, 0.06, 0.32, mat(COL.yellow), -0.06, 0.14, 0.3)); wheels(2, 0.5, 0.16, 0.06); break;
    case 'firetruck': g.add(box(0.38, 0.3, 0.8, mat(0xc0322a), 0, 0.12, 0)); g.add(box(0.38, 0.06, 0.2, mat(COL.white), 0, 0.42, 0.25)); g.add(box(0.3, 0.12, 0.04, mat(COL.glass), 0, 0.3, 0.41)); g.add(box(0.14, 0.04, 0.05, GLOW.blue, 0, 0.48, 0.25)); g.add(box(0.05, 0.05, 0.25, mat(COL.metal), 0, 0.48, 0.0)); wheels(3, 0.8, 0.18, 0.08); g.userData.light = true; break;
    case 'dingo': g.add(box(0.34, 0.26, 0.6, O, 0, 0.1, 0)); g.add(box(0.3, 0.1, 0.3, OD, 0, 0.36, -0.05)); g.add(box(0.03, 0.03, 0.18, mat(COL.black), 0, 0.44, 0.08)); wheels(2, 0.6, 0.18, 0.08); break;
    case 'tug': g.add(box(0.34, 0.1, 0.44, mat(COL.yellow), 0, 0.06, 0)); g.add(box(0.16, 0.14, 0.12, mat(COL.black), 0.06, 0.16, -0.1)); wheels(2, 0.44, 0.16, 0.06); break;
    case 'gepard': {
      g.add(box(0.42, 0.16, 0.85, O, 0, 0.08, 0));
      for (const s of [-1, 1]) g.add(box(0.08, 0.12, 0.8, mat(COL.black), 0.22 * s, 0.03, 0));
      const t = new THREE.Group(); t.position.set(0, 0.24, -0.05);
      t.add(box(0.36, 0.2, 0.4, OD, 0, 0, 0));
      for (const s of [-1, 1]) { const b = box(0.03, 0.03, 0.5, mat(COL.black), 0.21 * s, 0.1, 0.3); t.add(b); }
      const dish = cyl(0.12, 0.12, 0.03, mat(COL.white), 0, 0.28, -0.12, 10); dish.rotation.x = 1.2; t.add(dish);
      g.add(t); g.userData.turret = t; break;
    }
    default: g.add(box(0.3, 0.2, 0.5, O, 0, 0.08, 0)); wheels(2, 0.5);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ===========================================================================
//  NATUR
// ===========================================================================
export function treeGeometries() {
  const trunk = new THREE.CylinderGeometry(0.05, 0.07, 0.35, 5); trunk.translate(0, 0.175, 0);
  const crown = new THREE.ConeGeometry(0.38, 1.1, 6); crown.translate(0, 0.85, 0);
  const crown2 = new THREE.ConeGeometry(0.28, 0.7, 6); crown2.translate(0, 1.3, 0);
  const birch = new THREE.IcosahedronGeometry(0.42, 0); birch.translate(0, 0.9, 0);
  return { trunk, crown, crown2, birch };
}
