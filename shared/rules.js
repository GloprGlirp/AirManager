// ============================================================================
//  FLIGHTLINE – Airbase Command · gemeinsame Spielregeln (Server + Browser)
//  Alles hier ist reine Logik ohne DOM/Node-Abhängigkeiten.
// ============================================================================

export const VERSION = 1;
export const GRID = 44;                 // Bauraster 44 x 44 Felder
export const RES = ['budget', 'fuel', 'ammo', 'material'];
export const RES_NAMES = { budget: 'Budget', fuel: 'Kerosin', ammo: 'Munition', material: 'Material' };
export const MIN = 60 * 1000, HOUR = 60 * MIN;

export class RuleError extends Error {}
const fail = (m) => { throw new RuleError(m); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------------
//  Zufall (deterministisch, im Spielstand gespeichert)
// ---------------------------------------------------------------------------
export function rand(s) {
  s.rn = (s.rn + 0x6D2B79F5) | 0;
  let t = s.rn;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (s, a, b) => a + (b - a) * rand(s);
const ri = (s, a, b) => Math.floor(rr(s, a, b + 1));
const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length) % arr.length];

// ---------------------------------------------------------------------------
//  Gebäude
// ---------------------------------------------------------------------------
//  counts[hqLevel-1] = wie viele davon gebaut werden dürfen
export const BUILDINGS = {
  hq: {
    name: 'Kommandozentrale', cat: 'kern', size: [4, 4], max: 10,
    cost: { budget: 2000, material: 2000 }, cf: 1.75, time: 60,
    counts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    desc: 'Herz der Basis. Jede Stufe schaltet neue Gebäude, Flugzeuge, Bautrupps und Lagerplatz frei.',
  },
  runway: {
    name: 'Start- und Landebahn', cat: 'kern', size: [36, 5], max: 5, fixed: true,
    cost: { budget: 3000, material: 5000 }, cf: 2.3, time: 120,
    counts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    desc: 'Längere, verstärkte Bahnen erlauben schwerere Maschinen wie Transporter und Tanker.',
  },
  tower: {
    name: 'Kontrollturm', cat: 'kern', size: [2, 2], max: 8,
    cost: { budget: 1200, material: 1000 }, cf: 1.8, time: 45,
    counts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    desc: 'Flugleitung. Bestimmt, wie viele Einsätze gleichzeitig laufen und wie groß das Einsatzbrett ist.',
  },
  hangar: {
    name: 'Flugzeughangar', cat: 'luft', size: [6, 7], max: 8,
    cost: { budget: 1500, material: 2000 }, cf: 1.8, time: 40,
    counts: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    desc: 'Stellplätze für Flächenflugzeuge. Schwere Maschinen belegen zwei Plätze.',
  },
  helipad: {
    name: 'Hubschrauberlandeplatz', cat: 'luft', size: [3, 3], max: 5, unlock: 2,
    cost: { budget: 800, material: 1000 }, cf: 1.8, time: 30,
    counts: [0, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    desc: 'Ein Stellplatz für einen Hubschrauber. Höhere Stufen beschleunigen die Wartung.',
  },
  fuel: {
    name: 'Treibstofflager', cat: 'res', size: [4, 4], max: 10,
    cost: { budget: 600, material: 800 }, cf: 1.75, time: 20,
    counts: [1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
    desc: 'Pipeline-Anschluss und Tanks für JP-8 Kerosin. Produziert und lagert Treibstoff.',
  },
  ammo: {
    name: 'Munitionsbunker', cat: 'res', size: [3, 3], max: 10,
    cost: { budget: 700, material: 900 }, cf: 1.75, time: 20,
    counts: [1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
    desc: 'Erdgedeckter Bunker. Liefert Munition für Kampfeinsätze und die Flugabwehr.',
  },
  depot: {
    name: 'Logistikzentrum', cat: 'res', size: [4, 3], max: 10,
    cost: { budget: 600, material: 300 }, cf: 1.75, time: 20,
    counts: [1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
    desc: 'Nachschub per Straße. Produziert und lagert Material für Bau und Reparaturen.',
  },
  barracks: {
    name: 'Unterkunft', cat: 'support', size: [4, 3], max: 8,
    cost: { budget: 800, material: 1000 }, cf: 1.8, time: 30,
    counts: [1, 1, 2, 2, 3, 3, 3, 4, 4, 4],
    desc: 'Wohnraum für Personal. Jede Stufe erhöht die Personalobergrenze.',
  },
  maint: {
    name: 'Wartungshalle', cat: 'support', size: [5, 4], max: 8, unlock: 2,
    cost: { budget: 1500, material: 1800 }, cf: 1.8, time: 45,
    counts: [0, 1, 1, 1, 2, 2, 2, 2, 3, 3],
    desc: 'Beschleunigt die Instandsetzung beschädigter Maschinen deutlich.',
  },
  school: {
    name: 'Flugschule & Simulator', cat: 'support', size: [4, 4], max: 6, unlock: 3,
    cost: { budget: 3000, material: 2500 }, cf: 1.9, time: 60,
    counts: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    desc: 'Simulator-Training für Pilot:innen. Bringt Erfahrung ohne Einsatzrisiko.',
  },
  motorpool: {
    name: 'Fahrzeughof', cat: 'support', size: [5, 4], max: 6, unlock: 2,
    cost: { budget: 1500, material: 1500 }, cf: 1.8, time: 40,
    counts: [0, 1, 1, 1, 1, 2, 2, 2, 2, 2],
    desc: 'Stellplätze für Bodenfahrzeuge, die Produktion, Schutz und Abwehr verbessern.',
  },
  radar: {
    name: 'Radarstation TRML-4D', cat: 'abwehr', size: [3, 3], max: 8, unlock: 2,
    cost: { budget: 2500, material: 2000 }, cf: 1.85, time: 60,
    counts: [0, 1, 1, 1, 2, 2, 2, 2, 2, 3],
    desc: 'Frühwarnung: längere Vorwarnzeit und höhere Trefferquote aller Abwehranlagen.',
  },
  flak: {
    name: 'Flak Skyguard 35 mm', cat: 'abwehr', size: [2, 2], max: 10,
    cost: { budget: 500, material: 600 }, cf: 1.7, time: 15,
    counts: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7],
    desc: 'Oerlikon-Zwillingsgeschütz mit Skyguard-Feuerleitung. Günstig, solide Nahbereichsabwehr.',
  },
  cram: {
    name: 'Phalanx C-RAM', cat: 'abwehr', size: [2, 2], max: 8, unlock: 3,
    cost: { budget: 2500, material: 2500 }, cf: 1.8, time: 45,
    counts: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
    desc: '20-mm-Gatling für Drohnen und Marschflugkörper im letzten Moment.',
  },
  irist: {
    name: 'IRIS-T SLM', cat: 'abwehr', size: [3, 3], max: 8, unlock: 4,
    cost: { budget: 6000, material: 5000 }, cf: 1.8, time: 90,
    counts: [0, 0, 0, 1, 1, 2, 2, 2, 3, 3],
    desc: 'Flugabwehrraketensystem mittlerer Reichweite. Starke Allround-Abwehr.',
  },
  patriot: {
    name: 'MIM-104 Patriot', cat: 'abwehr', size: [4, 4], max: 6, unlock: 6,
    cost: { budget: 18000, material: 15000 }, cf: 1.85, time: 180,
    counts: [0, 0, 0, 0, 0, 1, 1, 1, 2, 2],
    desc: 'Weitreichende Luftverteidigung. Die stärkste Abwehr gegen schwere Angriffswellen.',
  },
};
export const BUILD_CATS = [
  ['kern', 'Kern'], ['luft', 'Flugbetrieb'], ['res', 'Ressourcen'], ['support', 'Unterstützung'], ['abwehr', 'Abwehr'],
];

export function buildCost(kind, level) {
  const B = BUILDINGS[kind]; const out = {};
  for (const k in B.cost) out[k] = Math.round(B.cost[k] * Math.pow(B.cf, level - 1) / 10) * 10;
  return out;
}
export function buildTime(kind, level) { // Sekunden bis Stufe `level` fertig ist
  return Math.round(Math.min(4 * 3600, BUILDINGS[kind].time * Math.pow(2, level - 1)));
}
export function footprint(b) {
  const [w, d] = BUILDINGS[b.kind].size;
  return (b.rot || 0) % 2 ? [d, w] : [w, d];
}

// Werte pro Stufe ------------------------------------------------------------
const P = (base, f, L) => base * Math.pow(f, L - 1);
export const PROD = {           // Produktion pro Stunde
  hq: (L) => ({ budget: P(220, 1.3, L) }),
  fuel: (L) => ({ fuel: P(700, 1.28, L) }),
  ammo: (L) => ({ ammo: P(300, 1.28, L) }),
  depot: (L) => ({ material: P(520, 1.28, L) }),
};
export const STORE = {
  hq: (L) => ({ budget: P(8000, 1.6, L), fuel: P(3000, 1.5, L), ammo: P(1500, 1.5, L), material: P(3000, 1.5, L) }),
  fuel: (L) => ({ fuel: P(5000, 1.45, L) }),
  ammo: (L) => ({ ammo: P(2500, 1.45, L) }),
  depot: (L) => ({ material: P(5000, 1.45, L) }),
};
export const DEF = {           // Abwehrkraft pro Stufe + Munitionsbedarf pro Angriff
  flak: { power: (L) => P(12, 1.3, L), ammo: (L) => 30 + 10 * L, range: 8 },
  cram: { power: (L) => P(21, 1.3, L), ammo: (L) => 50 + 15 * L, range: 6 },
  irist: { power: (L) => P(42, 1.3, L), ammo: (L) => 90 + 25 * L, range: 14 },
  patriot: { power: (L) => P(90, 1.3, L), ammo: (L) => 180 + 40 * L, range: 22 },
};
export const hangarSlots = (L) => [2, 2, 3, 3, 4, 4, 5, 6][L - 1] || 2;
export const barracksCap = (L) => 8 + 4 * (L - 1);
export const motorpoolCap = (L) => 1 + L;
export const ACC_HOURS = 3;    // Sammelpuffer der Produktionsgebäude

// ---------------------------------------------------------------------------
//  Flugzeuge  (power = Einsatzwert, fuel = Kerosin pro 10 Min Flug)
// ---------------------------------------------------------------------------
export const ROLES = {
  trainer: 'Trainer', fighter: 'Luftüberlegenheit', multirole: 'Mehrzweck', attack: 'Erdkampf',
  recon: 'Aufklärung', transport: 'Transport', tanker: 'Tanker', helo_attack: 'Kampfhubschrauber', helo_transport: 'Transporthubschrauber',
};
export const AIRCRAFT = {
  pc21:   { name: 'Pilatus PC-21', role: 'trainer', power: 10, cost: { budget: 2500, material: 500 }, hq: 1, rw: 1, crew: 1, fuel: 60, ammo: 0, shape: 'turboprop', paint: 'trainer' },
  gripen: { name: 'Saab JAS 39 Gripen E', role: 'multirole', power: 40, cost: { budget: 8500, material: 2200 }, hq: 2, rw: 1, crew: 1, fuel: 220, ammo: 110, shape: 'gripen', paint: 'grey' },
  f16:    { name: 'F-16C Fighting Falcon', role: 'multirole', power: 42, cost: { budget: 9000, material: 2500 }, hq: 1, rw: 1, crew: 1, fuel: 260, ammo: 120, shape: 'f16', paint: 'grey' },
  mq9:    { name: 'MQ-9B Reaper', role: 'recon', power: 20, cost: { budget: 6000, material: 1500 }, hq: 2, rw: 1, crew: 1, fuel: 40, ammo: 40, shape: 'mq9', paint: 'light' },
  c130:   { name: 'C-130J Super Hercules', role: 'transport', power: 36, cost: { budget: 12000, material: 4000 }, hq: 2, rw: 2, crew: 2, fuel: 520, ammo: 0, shape: 'c130', paint: 'transport', heavy: true },
  tornado:{ name: 'Panavia Tornado IDS', role: 'attack', power: 46, cost: { budget: 11000, material: 3000 }, hq: 3, rw: 2, crew: 2, fuel: 320, ammo: 200, shape: 'tornado', paint: 'camo' },
  a10:    { name: 'A-10C Thunderbolt II', role: 'attack', power: 48, cost: { budget: 12000, material: 3200 }, hq: 3, rw: 1, crew: 1, fuel: 240, ammo: 220, shape: 'a10', paint: 'dark' },
  f18:    { name: 'F/A-18E Super Hornet', role: 'multirole', power: 52, cost: { budget: 14000, material: 3800 }, hq: 4, rw: 2, crew: 1, fuel: 300, ammo: 150, shape: 'f18', paint: 'grey' },
  typhoon:{ name: 'Eurofighter Typhoon', role: 'fighter', power: 60, cost: { budget: 18000, material: 4500 }, hq: 4, rw: 2, crew: 1, fuel: 300, ammo: 130, shape: 'typhoon', paint: 'grey' },
  a400m:  { name: 'Airbus A400M Atlas', role: 'transport', power: 52, cost: { budget: 22000, material: 6500 }, hq: 4, rw: 3, crew: 2, fuel: 700, ammo: 0, shape: 'a400m', paint: 'transport', heavy: true },
  rafale: { name: 'Dassault Rafale C', role: 'multirole', power: 58, cost: { budget: 19000, material: 4800 }, hq: 5, rw: 2, crew: 1, fuel: 300, ammo: 160, shape: 'rafale', paint: 'grey' },
  mrtt:   { name: 'Airbus A330 MRTT', role: 'tanker', power: 58, cost: { budget: 28000, material: 8000 }, hq: 5, rw: 4, crew: 2, fuel: 400, ammo: 0, shape: 'mrtt', paint: 'light', heavy: true },
  f15ex:  { name: 'F-15EX Eagle II', role: 'fighter', power: 72, cost: { budget: 27000, material: 6500 }, hq: 6, rw: 3, crew: 2, fuel: 380, ammo: 170, shape: 'f15', paint: 'grey' },
  e7:     { name: 'Boeing E-7 Wedgetail', role: 'recon', power: 64, cost: { budget: 30000, material: 8500 }, hq: 6, rw: 4, crew: 2, fuel: 450, ammo: 0, shape: 'e7', paint: 'light', heavy: true },
  f35:    { name: 'F-35A Lightning II', role: 'multirole', power: 85, cost: { budget: 36000, material: 9000 }, hq: 7, rw: 3, crew: 1, fuel: 320, ammo: 170, shape: 'f35', paint: 'stealth' },
  h145m:  { name: 'Airbus H145M', role: 'helo_transport', power: 16, cost: { budget: 4500, material: 1200 }, hq: 2, crew: 2, fuel: 50, ammo: 0, shape: 'h145', paint: 'heli', helo: true },
  nh90:   { name: 'NH90 TTH', role: 'helo_transport', power: 26, cost: { budget: 9000, material: 2600 }, hq: 3, crew: 2, fuel: 90, ammo: 0, shape: 'nh90', paint: 'heli', helo: true },
  tiger:  { name: 'Airbus Tiger UHT', role: 'helo_attack', power: 34, cost: { budget: 14000, material: 3800 }, hq: 4, crew: 2, fuel: 80, ammo: 120, shape: 'tiger', paint: 'heli', helo: true },
  ch47:   { name: 'Boeing CH-47F Chinook', role: 'helo_transport', power: 38, cost: { budget: 15000, material: 4200 }, hq: 4, crew: 2, fuel: 160, ammo: 0, shape: 'ch47', paint: 'heli', helo: true },
  ah64:   { name: 'Boeing AH-64E Apache', role: 'helo_attack', power: 44, cost: { budget: 20000, material: 5200 }, hq: 5, crew: 2, fuel: 100, ammo: 160, shape: 'ah64', paint: 'heli', helo: true },
};

// ---------------------------------------------------------------------------
//  Bodenfahrzeuge (Fahrzeughof)
// ---------------------------------------------------------------------------
export const VEHICLES = {
  hx:      { name: 'MAN HX2 8×8 Logistik-LKW', cost: { budget: 3000, material: 800 }, hq: 2, fx: 'Material-Produktion +12 %', shape: 'truck' },
  refuel:  { name: 'MAN TGS Flugfeldtankwagen', cost: { budget: 3200, material: 800 }, hq: 2, fx: 'Kerosin-Produktion +12 %', shape: 'tanker' },
  jammer:  { name: 'MJ-1E Waffenlader „Jammer“', cost: { budget: 3500, material: 1000 }, hq: 2, fx: 'Munitionsverbrauch bei Einsätzen −15 %', shape: 'loader' },
  panther: { name: 'Rosenbauer Panther 6×6', cost: { budget: 5000, material: 1500 }, hq: 3, fx: 'Schäden durch Luftangriffe −40 %, Reparatur +10 %', shape: 'firetruck' },
  dingo:   { name: 'ATF Dingo 2 Objektschutz', cost: { budget: 4500, material: 1500 }, hq: 3, fx: 'Plünderung bei Angriffen −20 %', shape: 'dingo' },
  tug:     { name: 'Goldhofer AST-1 Schlepper', cost: { budget: 2500, material: 600 }, hq: 2, fx: 'Ruhezeit der Crews −20 %', shape: 'tug' },
  gepard:  { name: 'Flakpanzer Gepard 1A2', cost: { budget: 9000, material: 3000 }, hq: 4, fx: 'Mobile Flugabwehr: +35 Abwehrkraft', shape: 'gepard' },
};
const vcount = (s, k) => s.vehicles.filter(v => v.model === k).length;
export const VEHICLE_MAX_SAME = 2;

// ---------------------------------------------------------------------------
//  Personal
// ---------------------------------------------------------------------------
export const ROLES_P = {
  pilot: { name: 'Pilot:in', plural: 'Pilot:innen', cost: 1200, fx: 'fliegt die Maschinen' },
  mech:  { name: 'Mechaniker:in', plural: 'Mechaniker:innen', cost: 500, fx: 'Reparatur +3 %/h pro Person' },
  log:   { name: 'Logistiker:in', plural: 'Logistiker:innen', cost: 450, fx: 'Produktion +4 % pro Person (max. +40 %)' },
  atc:   { name: 'Fluglotse/-lotsin', plural: 'Fluglots:innen', cost: 800, fx: 'Einsatzdauer −3 % pro Person (max. −24 %)' },
};
export const PILOT_RANKS = ['Leutnant', 'Oberleutnant', 'Hauptmann', 'Major', 'Oberstleutnant', 'Oberst'];
export const PILOT_XP = [0, 120, 300, 560, 900, 1350, 1900, 2600, 3500, 4600];
export const CMD_RANKS = ['Leutnant', 'Oberleutnant', 'Hauptmann', 'Major', 'Oberstleutnant', 'Oberst', 'Brigadegeneral', 'Generalmajor', 'Generalleutnant', 'General'];
export const CMD_XP = [0, 200, 600, 1300, 2500, 4200, 6500, 9500, 13500, 18500];
export const pilotLevel = (xp) => { let l = 1; for (let i = 0; i < PILOT_XP.length; i++) if (xp >= PILOT_XP[i]) l = i + 1; return l; };
export const pilotRank = (lvl) => PILOT_RANKS[Math.min(PILOT_RANKS.length - 1, Math.floor((lvl - 1) / 2))];
export const cmdLevel = (xp) => { let l = 1; for (let i = 0; i < CMD_XP.length; i++) if (xp >= CMD_XP[i]) l = i + 1; return l; };

const FIRST = ['Lena', 'Jonas', 'Mia', 'Felix', 'Sophie', 'Lukas', 'Anna', 'Paul', 'Laura', 'Tim', 'Sarah', 'Max', 'Julia', 'Niklas', 'Emma', 'David', 'Hannah', 'Jan', 'Marie', 'Tobias', 'Elif', 'Mehmet', 'Aylin', 'Luca', 'Nina', 'Kai', 'Ole', 'Freya', 'Matteo', 'Zoe', 'Erik', 'Clara', 'Finn', 'Leonie', 'Moritz', 'Ida', 'Can', 'Amira', 'Jakob', 'Selin', 'Noah', 'Greta', 'Milan', 'Ronja', 'Theo', 'Valentina'];
const LAST = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Braun', 'Zimmermann', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Maier', 'Huber', 'Berger', 'Hofer', 'Gruber', 'Steiner', 'Yılmaz', 'Novak', 'Kowalski', 'Jansen', 'Larsen', 'Brandt', 'Vogel', 'Kaiser', 'Pichler', 'Moser', 'Lindqvist'];
const CALLSIGNS = ['Viper', 'Falke', 'Ghost', 'Nomad', 'Sturm', 'Blitz', 'Hawk', 'Raven', 'Frost', 'Saber', 'Wolf', 'Echo', 'Comet', 'Rook', 'Joker', 'Specter', 'Nova', 'Rogue', 'Bolt', 'Fury', 'Lynx', 'Orca', 'Polar', 'Taifun', 'Kobra', 'Phantom', 'Grizzly', 'Kestrel', 'Nordwind', 'Ember', 'Atlas', 'Moose', 'Pike', 'Sparrow', 'Halo', 'Dagger', 'Comanche', 'Rhino', 'Vandal', 'Zephyr'];

// ---------------------------------------------------------------------------
//  Einsätze
// ---------------------------------------------------------------------------
export const MTYPES = {
  train:   { name: 'Übungsflug', roles: ['trainer'], weak: ['fighter', 'multirole', 'attack', 'recon'], base: 9, dur: [2, 4], rew: { budget: 0.9 }, xpMul: 1.6, combat: false, ammoF: 0 },
  cap:     { name: 'Luftraumpatrouille (CAP)', roles: ['fighter', 'multirole'], weak: ['trainer'], base: 28, dur: [3, 8], rew: { budget: 1.0 }, combat: true, ammoF: 0.4 },
  qra:     { name: 'Alarmrotte – Abfangen', roles: ['fighter', 'multirole'], weak: [], base: 42, dur: [2, 5], rew: { budget: 1.25 }, combat: true, ammoF: 0.8 },
  recon:   { name: 'Aufklärungsflug', roles: ['recon'], weak: ['multirole', 'fighter', 'trainer'], base: 24, dur: [4, 10], rew: { budget: 0.85, material: 0.35 }, combat: false, ammoF: 0 },
  cas:     { name: 'Luftnahunterstützung (CAS)', roles: ['attack', 'helo_attack'], weak: ['multirole'], base: 40, dur: [4, 10], rew: { budget: 1.3 }, combat: true, ammoF: 1.0 },
  strike:  { name: 'Präzisionsschlag', roles: ['attack', 'multirole'], weak: ['fighter'], base: 70, dur: [6, 14], rew: { budget: 1.7, medals: 1 }, combat: true, ammoF: 1.4 },
  airlift: { name: 'Luftbrücke', roles: ['transport'], weak: ['helo_transport'], base: 30, dur: [5, 12], rew: { material: 1.5, budget: 0.5 }, combat: false, ammoF: 0 },
  sar:     { name: 'Such- und Rettungseinsatz (SAR)', roles: ['helo_transport'], weak: ['transport', 'helo_attack'], base: 20, dur: [3, 7], rew: { budget: 1.1 }, combat: false, ammoF: 0 },
  aar:     { name: 'Luftbetankung', roles: ['tanker'], weak: [], base: 46, dur: [6, 14], rew: { budget: 1.5, fuel: 0.7 }, combat: false, ammoF: 0 },
};
const OPS_A = ['STAHL', 'NORD', 'GRAU', 'SILBER', 'EIS', 'STURM', 'NACHT', 'BERG', 'FROST', 'EISEN', 'SCHATTEN', 'DONNER', 'KRISTALL', 'GRANIT', 'ASCHE', 'WINTER'];
const OPS_B = ['ADLER', 'LICHT', 'WOLF', 'PFEIL', 'BRECHER', 'VOGEL', 'FALKE', 'WACHT', 'SPEER', 'KRONE', 'HAMMER', 'LANZE', 'SCHILD', 'FUCHS', 'TOR', 'RABE'];
const PLACES = ['über der Ostsee', 'Nordsee-Sektor', 'Alpenkorridor', 'Küstensektor West', 'Grenzsektor Nord', 'Hochland Sektor 7', 'Fjordsektor', 'Sektor ECHO', 'Übungsraum TRA Lauter', 'Seegebiet Skagerrak', 'Mittelgebirge Ost', 'Inselgruppe Süd', 'Sektor TANGO', 'Polarlicht-Korridor', 'Flusstal Sektor 3'];

export const ENEMIES = {
  drone:  { name: 'Kamikaze-Drohne', hq: 2 },
  su25:   { name: 'Su-25 Frogfoot', hq: 2 },
  mig29:  { name: 'MiG-29 Fulcrum', hq: 3 },
  cruise: { name: 'Marschflugkörper', hq: 4 },
  su34:   { name: 'Su-34 Fullback', hq: 5 },
};

// ---------------------------------------------------------------------------
//  Neuer Spielstand
// ---------------------------------------------------------------------------
export function newState({ commander, baseName, seed, now }) {
  const s = {
    v: VERSION, seed: seed | 0, rn: seed | 0, t: now, created: now, lastSeen: now,
    commander, name: baseName,
    res: { budget: 7000, fuel: 4000, ammo: 2200, material: 4500 },
    medals: 12, xp: 0, trophies: 0, nextId: 1,
    buildings: [], aircraft: [], people: [], vehicles: [],
    board: { list: [], refreshAt: now }, ops: [],
    nextRaidAt: now + 25 * MIN, shieldUntil: 0, log: [], logSeq: 0,
  };
  const add = (kind, x, z, rot = 0) => s.buildings.push({ id: s.nextId++, kind, x, z, rot, level: 1, busy: null, acc: 0 });
  add('runway', 4, 1);
  add('tower', 41, 8);
  add('hangar', 8, 8);
  add('hq', 20, 19);
  add('fuel', 32, 9);
  add('ammo', 38, 15);
  add('depot', 28, 26);
  add('barracks', 11, 26);
  add('flak', 25, 12);
  for (const b of s.buildings) if (PROD[b.kind]) { const o = PROD[b.kind](1); b.acc = Object.values(o)[0] * 0.6; }
  for (let i = 0; i < 3; i++) s.people.push(makePerson(s, 'pilot'));
  s.people.push(makePerson(s, 'mech'), makePerson(s, 'mech'), makePerson(s, 'log'), makePerson(s, 'log'), makePerson(s, 'atc'));
  s.people[0].xp = 140; // erfahrene Staffelführung
  s.aircraft.push({ id: s.nextId++, model: 'f16', cond: 100, crew: [s.people[0].id], mission: null });
  s.aircraft.push({ id: s.nextId++, model: 'pc21', cond: 100, crew: [s.people[1].id], mission: null });
  refreshBoard(s, now, true);
  addLog(s, now, { kind: 'info', text: `Basis „${baseName}“ in Dienst gestellt. Willkommen, Kommandeur:in ${commander}!` });
  return s;
}

function makePerson(s, role) {
  const p = { id: s.nextId++, role, name: `${pick(s, FIRST)} ${pick(s, LAST)}`, xp: 0, restUntil: 0, trainUntil: 0, trainXp: 0, mission: null };
  if (role === 'pilot') p.call = pick(s, CALLSIGNS);
  return p;
}

export function addLog(s, t, e) {
  e.id = ++s.logSeq; e.t = t;
  s.log.push(e);
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
  return e;
}

// ---------------------------------------------------------------------------
//  Abgeleitete Werte
// ---------------------------------------------------------------------------
export const byKind = (s, k) => s.buildings.filter(b => b.kind === k);
export const hqLevel = (s) => (s.buildings.find(b => b.kind === 'hq') || { level: 1 }).level;
export const runwayLevel = (s) => (s.buildings.find(b => b.kind === 'runway') || { level: 1 }).level;
const lvlSum = (s, k) => byKind(s, k).reduce((a, b) => a + b.level, 0);
const role = (s, r) => s.people.filter(p => p.role === r);

export function stats(s) {
  const hq = hqLevel(s);
  const cap = { budget: 0, fuel: 0, ammo: 0, material: 0 };
  const rate = { budget: 0, fuel: 0, ammo: 0, material: 0 };
  const logBonus = Math.min(0.4, role(s, 'log').length * 0.04);
  const vb = { fuel: vcount(s, 'refuel') * 0.12, material: vcount(s, 'hx') * 0.12 };
  for (const b of s.buildings) {
    if (b.level < 1) continue;
    if (STORE[b.kind]) { const o = STORE[b.kind](b.level); for (const k in o) cap[k] += o[k]; }
    if (PROD[b.kind]) { const o = PROD[b.kind](b.level); for (const k in o) rate[k] += o[k] * (1 + logBonus + (vb[k] || 0)); }
  }
  for (const k in cap) cap[k] = Math.round(cap[k]);
  const towerL = (byKind(s, 'tower')[0] || { level: 1 }).level;
  const planeSlots = byKind(s, 'hangar').filter(b => b.level > 0).reduce((a, b) => a + hangarSlots(b.level), 0);
  const heloSlots = byKind(s, 'helipad').filter(b => b.level > 0).length;
  const planeUsed = s.aircraft.filter(a => !AIRCRAFT[a.model].helo).reduce((a, x) => a + (AIRCRAFT[x.model].heavy ? 2 : 1), 0);
  const heloUsed = s.aircraft.filter(a => AIRCRAFT[a.model].helo).length;
  const staffCap = byKind(s, 'barracks').filter(b => b.level > 0).reduce((a, b) => a + barracksCap(b.level), 0);
  const vehCap = byKind(s, 'motorpool').filter(b => b.level > 0).reduce((a, b) => a + motorpoolCap(b.level), 0);
  const repair = 6 + lvlSum(s, 'maint') * 9 + lvlSum(s, 'helipad') * 2 + Math.min(60, role(s, 'mech').length * 3) + (vcount(s, 'panther') ? 10 : 0);
  const radarL = lvlSum(s, 'radar');
  const schoolL = (byKind(s, 'school')[0] || { level: 0 }).level;
  return {
    hq, cap, rate, logBonus,
    builders: 2 + Math.floor((hq - 1) / 2),
    builderBusy: s.buildings.filter(b => b.busy).length,
    maxOps: 1 + towerL, boardSize: 4 + Math.floor(towerL / 2),
    planeSlots, heloSlots, planeUsed, heloUsed, staffCap, staff: s.people.length,
    vehCap, repair, radarL, schoolL,
    warn: radarL ? 45 + radarL * 15 : 15,  // Vorwarnzeit in Sekunden
    atcBonus: Math.min(0.24, role(s, 'atc').length * 0.03),
    trainSlots: schoolL ? 1 + Math.floor(schoolL / 2) : 0,
  };
}

// Rangfolge der Gebäude-Limits
export function buildLimit(s, kind) {
  const B = BUILDINGS[kind]; const hq = hqLevel(s);
  return B.counts[Math.min(hq, B.counts.length) - 1] || 0;
}

// Personen-Status -----------------------------------------------------------
export function crewOf(s) { const m = {}; for (const a of s.aircraft) for (const p of a.crew) m[p] = a.id; return m; }
export function personStatus(s, p, now) {
  if (p.mission) return 'mission';
  if (p.trainUntil > now) return 'training';
  if (p.restUntil > now) return 'rest';
  return 'ready';
}
export function aircraftStatus(s, a, now) {
  const M = AIRCRAFT[a.model];
  if (a.mission) return { code: 'mission', text: 'Im Einsatz' };
  if (a.crew.length < M.crew) return { code: 'nocrew', text: 'Crew fehlt' };
  for (const pid of a.crew) {
    const p = s.people.find(x => x.id === pid);
    const st = p ? personStatus(s, p, now) : 'missing';
    if (st !== 'ready') return { code: 'crewbusy', text: st === 'rest' ? 'Crew ruht' : st === 'training' ? 'Crew im Training' : 'Crew nicht bereit' };
  }
  if (a.cond < 40) return { code: 'damaged', text: 'Zu stark beschädigt' };
  return { code: 'ready', text: 'Einsatzbereit' };
}
export function acPower(s, a, mission) {
  const M = AIRCRAFT[a.model];
  const lv = a.crew.map(pid => s.people.find(p => p.id === pid)).filter(Boolean).map(p => pilotLevel(p.xp));
  const avg = lv.length ? lv.reduce((x, y) => x + y, 0) / lv.length : 1;
  let p = M.power * (0.55 + 0.45 * a.cond / 100) * (1 + 0.06 * (avg - 1));
  if (mission) {
    const T = MTYPES[mission.type];
    if (T.roles.includes(M.role)) p *= 1; else if (T.weak.includes(M.role)) p *= 0.55; else p = 0;
  }
  return p;
}
export const missionChance = (P, D) => clamp(0.5 + 0.45 * Math.tanh(2 * (P / D - 0.85)), 0.05, 0.97);
export function canFly(M, mission) { const T = MTYPES[mission.type]; return T.roles.includes(M.role) || T.weak.includes(M.role); }
export function missionCost(s, mission, acs) {
  let fuel = 0, ammo = 0;
  const T = MTYPES[mission.type];
  const durF = 0.5 + mission.dur / 600;
  for (const a of acs) {
    const M = AIRCRAFT[a.model];
    fuel += M.fuel * durF;
    ammo += M.ammo * T.ammoF * (vcount(s, 'jammer') ? 0.85 : 1);
  }
  return { fuel: Math.round(fuel), ammo: Math.round(ammo) };
}
export function missionPreview(s, mission, acIds) {
  const acs = acIds.map(id => s.aircraft.find(a => a.id === id)).filter(Boolean);
  const P = acs.reduce((t, a) => t + acPower(s, a, mission), 0);
  const chance = acs.length ? missionChance(P, mission.D) : 0;
  const cost = missionCost(s, mission, acs);
  const T = MTYPES[mission.type];
  const risk = T.combat ? (1 - chance) * 0.22 * (1 - chance) : 0;
  return { P: Math.round(P), chance, cost, risk };
}
export function missionDuration(s, mission) { return Math.round(mission.dur * (1 - stats(s).atcBonus)); }

// Abwehr ------------------------------------------------------------------
export function defenseBreakdown(s, now) {
  const st = stats(s);
  const items = [];
  let ammoNeed = 0;
  for (const b of s.buildings) {
    if (!DEF[b.kind] || b.level < 1) continue;
    items.push({ id: b.id, kind: b.kind, power: DEF[b.kind].power(b.level) });
    ammoNeed += DEF[b.kind].ammo(b.level);
  }
  const gep = vcount(s, 'gepard');
  if (gep) items.push({ id: 'gepard', kind: 'gepard', power: 35 * gep });
  let qra = 0;
  for (const a of s.aircraft) {
    const M = AIRCRAFT[a.model];
    if (!['fighter', 'multirole'].includes(M.role)) continue;
    if (aircraftStatus(s, a, now).code !== 'ready') continue;
    qra += acPower(s, a) * 0.25;
  }
  if (qra > 0) items.push({ id: 'qra', kind: 'qra', power: qra });
  const radarMult = 1 + Math.min(0.6, st.radarL * 0.06);
  const ammoEff = ammoNeed ? 0.5 + 0.5 * Math.min(1, s.res.ammo / ammoNeed) : 1;
  let total = 0;
  for (const it of items) {
    const fixed = it.kind === 'qra' || it.kind === 'gepard';
    it.power = it.power * radarMult * (fixed ? 1 : ammoEff);
    total += it.power;
  }
  return { items, total, ammoNeed, ammoEff, radarMult };
}
export function strikePower(s, acIds) {
  let p = 0;
  for (const id of acIds) {
    const a = s.aircraft.find(x => x.id === id); if (!a) continue;
    const M = AIRCRAFT[a.model];
    const f = ['fighter', 'multirole', 'attack'].includes(M.role) ? 1 : M.role === 'helo_attack' ? 0.6 : M.role === 'trainer' ? 0.3 : 0;
    p += acPower(s, a) * f;
  }
  return p;
}
export function basePower(s, now) {
  return Math.round(defenseBreakdown(s, now).total + s.aircraft.reduce((t, a) => t + AIRCRAFT[a.model].power, 0) * 0.5 + hqLevel(s) * 20);
}

// ---------------------------------------------------------------------------
//  Platzierung
// ---------------------------------------------------------------------------
export function canPlace(s, kind, x, z, rot, ignoreId) {
  const B = BUILDINGS[kind];
  const [w, d] = rot % 2 ? [B.size[1], B.size[0]] : B.size;
  if (!Number.isInteger(x) || !Number.isInteger(z)) return false;
  if (x < 0 || z < 0 || x + w > GRID || z + d > GRID) return false;
  for (const b of s.buildings) {
    if (b.id === ignoreId) continue;
    const [bw, bd] = footprint(b);
    if (x < b.x + bw && x + w > b.x && z < b.z + bd && z + d > b.z) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
//  Zeitsimulation
// ---------------------------------------------------------------------------
export function nextEventTime(s) {
  let t = Infinity;
  for (const b of s.buildings) if (b.busy && b.busy.end < t) t = b.busy.end;
  for (const o of s.ops) if (o.end < t) t = o.end;
  for (const p of s.people) if (p.trainXp && p.trainUntil < t) t = p.trainUntil;
  if (s.nextRaidAt < t) t = s.nextRaidAt;
  if (s.board.refreshAt < t) t = s.board.refreshAt;
  return t;
}

function produce(s, t0, t1) {
  if (t1 <= t0) return;
  const h = (t1 - t0) / HOUR;
  const st = stats(s);
  const logB = 1 + st.logBonus;
  for (const b of s.buildings) {
    if (!PROD[b.kind] || b.level < 1) continue;
    const o = PROD[b.kind](b.level);
    let r = 0; for (const k in o) r += o[k];
    const k = Object.keys(o)[0];
    const vb = k === 'fuel' ? vcount(s, 'refuel') * 0.12 : k === 'material' ? vcount(s, 'hx') * 0.12 : 0;
    r *= logB + vb;
    b.acc = Math.min(r * ACC_HOURS, (b.acc || 0) + r * h);
  }
  for (const a of s.aircraft) if (!a.mission && a.cond < 100) a.cond = Math.min(100, a.cond + st.repair * h);
}

// Fortschritt nur bis zum nächsten Ereignis (Browser-Vorschau, ohne Zufall)
export function preview(s, now) {
  const end = Math.min(now, nextEventTime(s));
  produce(s, s.t, end);
  s.t = Math.max(s.t, end);
  return s;
}

export function advance(s, now) {
  // Lange Abwesenheit: Zwischenschritte überspringen, die nichts Neues bringen
  if (now - s.board.refreshAt > HOUR) s.board.refreshAt = now - 1;
  if (now - s.nextRaidAt > 24 * HOUR) s.nextRaidAt = now - 24 * HOUR;
  let guard = 0;
  while (guard++ < 2000) {
    const t = nextEventTime(s);
    if (t > now) break;
    produce(s, s.t, t);
    s.t = Math.max(s.t, t);
    processEvents(s, t);
  }
  produce(s, s.t, now);
  s.t = Math.max(s.t, now);
  return s;
}

function processEvents(s, t) {
  for (const b of s.buildings) {
    if (b.busy && b.busy.end <= t) {
      b.level += 1; b.busy = null;
      s.xp += 8 * b.level;
      addLog(s, t, { kind: 'build', text: `${BUILDINGS[b.kind].name} – Stufe ${b.level} fertig`, bid: b.id });
    }
  }
  for (const o of [...s.ops]) if (o.end <= t) resolveOp(s, o, t);
  for (const p of s.people) {
    if (p.trainXp && p.trainUntil <= t) {
      const before = pilotLevel(p.xp);
      p.xp += p.trainXp; p.trainXp = 0;
      const after = pilotLevel(p.xp);
      addLog(s, t, { kind: 'train', text: `${p.name} „${p.call}“ hat das Simulator-Training abgeschlossen` + (after > before ? ` – Beförderung zum ${pilotRank(after)}!` : '.') });
    }
  }
  if (s.board.refreshAt <= t) refreshBoard(s, t, false);
  if (s.nextRaidAt <= t) resolveRaid(s, t);
}

// ---------------------------------------------------------------------------
//  Einsatzbrett
// ---------------------------------------------------------------------------
function genMission(s, t) {
  const hq = hqLevel(s);
  const owned = new Set(s.aircraft.map(a => AIRCRAFT[a.model].role));
  const types = Object.keys(MTYPES);
  const w = types.map(k => {
    const T = MTYPES[k];
    const has = T.roles.some(r => owned.has(r));
    const weak = T.weak.some(r => owned.has(r));
    let x = has ? 4 : weak ? 1.6 : 0.6;
    if (k === 'train' && hq > 3) x *= 0.4;
    if (k === 'strike' && hq < 3) x *= 0.25;
    return x;
  });
  let r = rand(s) * w.reduce((a, b) => a + b, 0), type = types[0];
  for (let i = 0; i < types.length; i++) { r -= w[i]; if (r <= 0) { type = types[i]; break; } }
  const T = MTYPES[type];
  const D = Math.round(T.base * Math.pow(1.32, hq - 1) * rr(s, 0.6, 1.45));
  const dur = Math.round(rr(s, T.dur[0], T.dur[1]) * (1 + (hq - 1) * 0.12) * 60);
  const k = 22 * (0.7 + dur / 600);
  const rew = {};
  for (const res in T.rew) {
    if (res === 'medals') continue;
    rew[res] = Math.round(D * k * T.rew[res] / 10) * 10;
  }
  rew.medals = (T.rew.medals || 0) + (rand(s) < 0.15 ? 1 : 0);
  const minAc = D > 260 ? 3 : D > 110 ? 2 : 1;
  return {
    id: s.nextId++, type, D, dur, minAc, maxAc: 4,
    op: `${pick(s, OPS_A)}${pick(s, OPS_B)}`, place: pick(s, PLACES),
    rew, xp: Math.round((25 + D * 0.7) * (T.xpMul || 1)), exp: t + Math.round(rr(s, 35, 70)) * MIN,
  };
}
export function refreshBoard(s, t, full) {
  const size = stats(s).boardSize;
  s.board.list = full ? [] : s.board.list.filter(m => m.exp > t);
  while (s.board.list.length < size) s.board.list.push(genMission(s, t));
  s.board.refreshAt = t + 10 * MIN;
}

// ---------------------------------------------------------------------------
//  Einsätze auflösen
// ---------------------------------------------------------------------------
function grant(s, rew) {
  const cap = stats(s).cap; const got = {}; let lost = 0;
  for (const k of RES) {
    if (!rew[k]) continue;
    const room = Math.max(0, cap[k] - s.res[k]);
    const g = Math.min(room, rew[k]);
    s.res[k] += g; got[k] = Math.round(g); lost += rew[k] - g;
  }
  if (rew.medals) { s.medals += rew.medals; got.medals = rew.medals; }
  return { got, overflow: lost > 0 };
}

function resolveOp(s, o, t) {
  s.ops = s.ops.filter(x => x !== o);
  const acs = o.ac.map(id => s.aircraft.find(a => a.id === id)).filter(Boolean);
  const tug = vcount(s, 'tug') ? 0.8 : 1;
  const crew = [];
  for (const a of acs) { a.mission = null; for (const pid of a.crew) { const p = s.people.find(x => x.id === pid); if (p) crew.push(p); } }

  if (o.kind === 'pvp') {
    const R = o.result;
    const { got, overflow } = grant(s, R.loot);
    s.trophies = Math.max(0, s.trophies + R.trophies);
    for (const a of acs) a.cond = Math.max(5, a.cond - (R.dmg[a.id] || 0));
    for (const p of crew) { p.mission = null; p.xp += R.stars ? 40 + R.stars * 25 : 15; p.restUntil = t + o.dur * 0.5 * 1000 * tug; }
    s.xp += R.stars * 40 + 10;
    addLog(s, t, {
      kind: 'pvp', text: R.stars ? `Angriff auf „${o.target}“: ${'★'.repeat(R.stars)} – Beute eingebracht` : `Angriff auf „${o.target}“ abgewehrt`,
      stars: R.stars, got, trophies: R.trophies, overflow, ac: o.ac,
    });
    return;
  }

  const m = o.m; const T = MTYPES[m.type];
  const success = rand(s) < o.chance;
  const rew = {};
  for (const k in m.rew) rew[k] = success ? m.rew[k] : (k === 'medals' ? 0 : Math.round(m.rew[k] * 0.25));
  const { got, overflow } = grant(s, rew);
  const dmg = {};
  for (const a of acs) {
    let d = T.combat ? rr(s, 4, 38) * (1.25 - o.chance) : rr(s, 0, 9);
    if (success) d *= 0.55;
    d = Math.round(d);
    a.cond = Math.max(5, a.cond - d); dmg[a.id] = d;
  }
  let lost = null;
  if (!success && T.combat && acs.length && rand(s) < 0.3 * (1 - o.chance)) {
    const a = pick(s, acs);
    lost = { model: a.model, id: a.id };
    s.aircraft = s.aircraft.filter(x => x !== a);
    for (const pid of a.crew) { const p = s.people.find(x => x.id === pid); if (p) p.restUntil = t + 3 * HOUR; }
  }
  for (const p of crew) {
    p.mission = null;
    if (!lost || !acs.find(a => a.id === lost.id)?.crew.includes(p.id)) p.restUntil = Math.max(p.restUntil, t + o.dur * 0.5 * 1000 * tug);
    p.xp += success ? m.xp : Math.round(m.xp * 0.35);
  }
  s.xp += success ? 12 + Math.round(m.D * 0.3) : 4;
  addLog(s, t, {
    kind: 'mission', success, text: `Operation ${m.op} (${T.name}) – ${success ? 'Erfolg' : 'Fehlschlag'}`,
    got, overflow, dmg, lost, ac: o.ac.filter(id => !lost || id !== lost.id),
  });
}

// ---------------------------------------------------------------------------
//  Luftangriffe (PvE)
// ---------------------------------------------------------------------------
function resolveRaid(s, t) {
  const hq = hqLevel(s);
  const active = t - s.lastSeen < 15 * MIN;
  s.nextRaidAt = t + (active ? rr(s, 22, 40) : rr(s, 120, 240)) * MIN;
  if (hq < 2) return; // Anfängerschutz
  const E = 16 * Math.pow(1.5, hq - 1) * rr(s, 0.85, 1.2);
  const def = defenseBreakdown(s, t);
  s.res.ammo = Math.max(0, s.res.ammo - def.ammoNeed);
  const r = def.total / E;
  const f = 1 - 1 / (1 + Math.pow(r, 1.3) * 3);
  const n = clamp(Math.round(3 + hq * 0.8 + rr(s, 0, 2)), 3, 12);
  const pool = Object.keys(ENEMIES).filter(k => ENEMIES[k].hq <= hq);
  const enemies = [];
  let down = 0;
  const wsum = def.items.reduce((a, b) => a + b.power, 0);
  for (let i = 0; i < n; i++) {
    const e = { type: pick(s, pool), killer: null };
    if (wsum > 0 && rand(s) < f) {
      down++;
      let x = rand(s) * wsum;
      for (const it of def.items) { x -= it.power; if (x <= 0) { e.killer = it.id; break; } }
      if (e.killer == null) e.killer = def.items[def.items.length - 1].id;
    }
    enemies.push(e);
  }
  const leak = n - down;
  const loss = {};
  const dmgAc = {};
  if (leak) {
    const pct = Math.min(0.3, leak * 0.035) * (vcount(s, 'dingo') ? 0.8 : 1);
    for (const k of RES) { loss[k] = Math.floor(s.res[k] * pct); s.res[k] -= loss[k]; }
    const home = s.aircraft.filter(a => !a.mission);
    const shield = vcount(s, 'panther') ? 0.6 : 1;
    for (let i = 0; i < leak; i++) {
      if (!home.length || rand(s) > 0.35) continue;
      const a = pick(s, home);
      const d = Math.round(rr(s, 12, 32) * shield);
      a.cond = Math.max(5, a.cond - d);
      dmgAc[a.id] = (dmgAc[a.id] || 0) + d;
    }
    for (const e of enemies) if (!e.killer) e.target = pick(s, s.buildings.filter(b => b.kind !== 'runway')).id;
    s.trophies = Math.max(0, s.trophies - Math.min(leak, 6));
    if (leak * 2 >= n) s.nextRaidAt = Math.max(s.nextRaidAt, t + rr(s, 120, 240) * MIN); // Schonfrist nach schwerem Treffer
  } else {
    s.medals += 1;
    const bonus = Math.round(E * 14 / 10) * 10;
    grant(s, { budget: bonus });
    loss.bonus = bonus;
    s.trophies += 3;
    s.xp += 20;
  }
  addLog(s, t, {
    kind: 'raid', defended: leak === 0, n, down, leak, enemies, loss, dmgAc, ammoEff: def.ammoEff,
    text: leak === 0 ? `Luftangriff abgewehrt – alle ${n} Ziele bekämpft` : `Luftangriff: ${down} von ${n} abgeschossen, ${leak} durchgebrochen`,
  });
}

// ---------------------------------------------------------------------------
//  PvP: Angriff auf andere Basen (vom Server orchestriert)
// ---------------------------------------------------------------------------
export function pvpOutcome(att, acIds, defTotal, defRes, attHq, rnd) {
  const A = strikePower(att, acIds);
  const q = (A / Math.max(1, defTotal)) * (0.85 + rnd() * 0.3);
  const stars = q >= 1.7 ? 3 : q >= 1.2 ? 2 : q >= 0.8 ? 1 : 0;
  const pct = [0, 0.08, 0.14, 0.2][stars];
  const capPer = 3000 * Math.pow(1.6, attHq - 1);
  const loot = {};
  for (const k of RES) loot[k] = Math.floor(Math.min(capPer, (defRes[k] || 0) * pct));
  const dmg = {};
  for (const id of acIds) dmg[id] = Math.round(clamp(30 / Math.max(0.4, q), 6, 45) * (0.7 + rnd() * 0.6));
  const trophies = stars ? 10 + stars * 6 : -8;
  return { stars, loot, dmg, trophies, A: Math.round(A), q };
}
export function startPvp(s, acIds, targetName, result, now) {
  const st = stats(s);
  if (s.ops.length >= st.maxOps) fail('Alle Einsatz-Slots belegt. Baue den Kontrollturm aus.');
  const acs = checkPackage(s, acIds, now, 1, 6);
  for (const a of acs) if (strikePower(s, [a.id]) <= 0) fail(`${AIRCRAFT[a.model].name} ist nicht für Angriffe geeignet.`);
  const fuel = acs.reduce((t, a) => t + AIRCRAFT[a.model].fuel * 1.2, 0);
  const ammo = acs.reduce((t, a) => t + AIRCRAFT[a.model].ammo * 1.2, 0);
  pay(s, { fuel: Math.round(fuel), ammo: Math.round(ammo) });
  const dur = 180;
  const o = { id: s.nextId++, kind: 'pvp', target: targetName, ac: acIds.slice(), start: now, end: now + dur * 1000, dur, result };
  s.ops.push(o);
  for (const a of acs) { a.mission = o.id; for (const pid of a.crew) { const p = s.people.find(x => x.id === pid); p.mission = o.id; } }
  s.shieldUntil = 0;
  return o;
}

// ---------------------------------------------------------------------------
//  Aktionen
// ---------------------------------------------------------------------------
function canAfford(s, c) { for (const k in c) if ((s.res[k] || 0) < c[k] - 1e-6) return false; return true; }
function pay(s, c) {
  for (const k in c) if ((s.res[k] || 0) < c[k] - 1e-6) fail(`Nicht genug ${RES_NAMES[k]} (${Math.floor(s.res[k])} / ${c[k]}).`);
  for (const k in c) s.res[k] -= c[k];
}
function getB(s, id) { const b = s.buildings.find(x => x.id === id); if (!b) fail('Gebäude nicht gefunden.'); return b; }
function getA(s, id) { const a = s.aircraft.find(x => x.id === id); if (!a) fail('Flugzeug nicht gefunden.'); return a; }
function getP(s, id) { const p = s.people.find(x => x.id === id); if (!p) fail('Person nicht gefunden.'); return p; }
export const speedupCost = (remainingMs) => Math.max(1, Math.ceil(remainingMs / (10 * MIN)));

function checkPackage(s, acIds, now, min, max) {
  if (!Array.isArray(acIds) || !acIds.length) fail('Keine Maschinen ausgewählt.');
  const ids = [...new Set(acIds.map(Number))];
  if (ids.length < min) fail(`Mindestens ${min} Maschine(n) nötig.`);
  if (ids.length > max) fail(`Höchstens ${max} Maschinen.`);
  return ids.map(id => {
    const a = getA(s, id);
    const st = aircraftStatus(s, a, now);
    if (st.code !== 'ready') fail(`${AIRCRAFT[a.model].name}: ${st.text}.`);
    return a;
  });
}

export function applyAction(s, act, now) {
  const st = stats(s);
  switch (act.type) {
    case 'build': {
      const B = BUILDINGS[act.kind];
      if (!B || B.fixed) fail('Dieses Gebäude kann nicht gebaut werden.');
      if (byKind(s, act.kind).length >= buildLimit(s, act.kind)) fail(`Limit erreicht – Kommandozentrale ausbauen für mehr ${B.name}.`);
      const rot = (act.rot | 0) & 3;
      if (!canPlace(s, act.kind, act.x, act.z, rot)) fail('Hier ist kein Platz.');
      if (st.builderBusy >= st.builders) fail('Alle Bautrupps sind beschäftigt.');
      pay(s, buildCost(act.kind, 1));
      const b = { id: s.nextId++, kind: act.kind, x: act.x, z: act.z, rot, level: 0, acc: 0, busy: { start: now, end: now + buildTime(act.kind, 1) * 1000 } };
      s.buildings.push(b);
      return { id: b.id };
    }
    case 'upgrade': {
      const b = getB(s, act.id); const B = BUILDINGS[b.kind];
      if (b.busy) fail('Wird bereits gebaut.');
      if (b.level >= B.max) fail('Höchststufe erreicht.');
      if (b.kind !== 'hq' && b.level + 1 > st.hq) fail(`Zuerst die Kommandozentrale auf Stufe ${b.level + 1} ausbauen.`);
      if (st.builderBusy >= st.builders) fail('Alle Bautrupps sind beschäftigt.');
      pay(s, buildCost(b.kind, b.level + 1));
      b.busy = { start: now, end: now + buildTime(b.kind, b.level + 1) * 1000 };
      return {};
    }
    case 'move': {
      const b = getB(s, act.id);
      if (BUILDINGS[b.kind].fixed) fail('Die Startbahn ist fest.');
      const rot = (act.rot | 0) & 3;
      if (!canPlace(s, b.kind, act.x, act.z, rot, b.id)) fail('Hier ist kein Platz.');
      b.x = act.x; b.z = act.z; b.rot = rot;
      return {};
    }
    case 'speedup': {
      const b = getB(s, act.id);
      if (!b.busy) fail('Hier wird nichts gebaut.');
      const c = speedupCost(b.busy.end - now);
      if (s.medals < c) fail(`Nicht genug Orden (${c} nötig).`);
      s.medals -= c; b.busy.end = now;
      advance(s, now);
      return {};
    }
    case 'cancel': {
      const b = getB(s, act.id);
      if (!b.busy) fail('Hier wird nichts gebaut.');
      const c = buildCost(b.kind, b.level + 1);
      for (const k in c) s.res[k] = Math.min(st.cap[k] || Infinity, s.res[k] + Math.round(c[k] * 0.5));
      b.busy = null;
      if (b.level === 0) s.buildings = s.buildings.filter(x => x !== b);
      return {};
    }
    case 'collect': {
      const list = act.id === 'all' ? s.buildings.filter(b => PROD[b.kind]) : [getB(s, act.id)];
      const got = {};
      for (const b of list) {
        if (!PROD[b.kind] || !b.acc) continue;
        const k = Object.keys(PROD[b.kind](1))[0];
        const room = Math.max(0, st.cap[k] - s.res[k]);
        const g = Math.min(room, b.acc);
        s.res[k] += g; b.acc -= g; got[k] = (got[k] || 0) + Math.floor(g);
      }
      return { got };
    }
    case 'buyAircraft': {
      const M = AIRCRAFT[act.model]; if (!M) fail('Unbekanntes Modell.');
      if (st.hq < M.hq) fail(`Benötigt Kommandozentrale Stufe ${M.hq}.`);
      if (M.helo) { if (st.heloUsed + 1 > st.heloSlots) fail('Kein freier Hubschrauberlandeplatz.'); }
      else {
        if (runwayLevel(s) < M.rw) fail(`Benötigt Startbahn Stufe ${M.rw}.`);
        if (st.planeUsed + (M.heavy ? 2 : 1) > st.planeSlots) fail('Kein freier Hangarplatz.');
      }
      pay(s, M.cost);
      const a = { id: s.nextId++, model: act.model, cond: 100, crew: [], mission: null };
      s.aircraft.push(a);
      autoCrew(s, now, a);
      return { id: a.id };
    }
    case 'sellAircraft': {
      const a = getA(s, act.id);
      if (a.mission) fail('Maschine ist im Einsatz.');
      s.aircraft = s.aircraft.filter(x => x !== a);
      s.res.budget = Math.min(st.cap.budget, s.res.budget + Math.round(AIRCRAFT[a.model].cost.budget * 0.35));
      return {};
    }
    case 'repair': {
      const a = getA(s, act.id);
      if (a.mission) fail('Maschine ist im Einsatz.');
      const c = repairCost(a);
      if (!c) fail('Keine Schäden.');
      pay(s, { material: c });
      a.cond = 100;
      return {};
    }
    case 'setCrew': {
      const a = getA(s, act.id); const M = AIRCRAFT[a.model];
      if (a.mission) fail('Maschine ist im Einsatz.');
      const ids = [...new Set((act.crew || []).map(Number))].slice(0, M.crew);
      for (const pid of ids) { const p = getP(s, pid); if (p.role !== 'pilot') fail('Nur Pilot:innen können fliegen.'); if (p.mission) fail(`${p.name} ist im Einsatz.`); }
      for (const o of s.aircraft) if (o !== a) o.crew = o.crew.filter(x => !ids.includes(x));
      a.crew = ids;
      return {};
    }
    case 'autoCrew': { for (const a of s.aircraft) autoCrew(s, now, a); return {}; }
    case 'recruit': {
      const R = ROLES_P[act.role]; if (!R) fail('Unbekannte Funktion.');
      if (st.staff >= st.staffCap) fail('Unterkünfte voll – baue oder erweitere eine Unterkunft.');
      pay(s, { budget: R.cost });
      const p = makePerson(s, act.role);
      s.people.push(p);
      if (act.role === 'pilot') for (const a of s.aircraft) if (autoCrew(s, now, a)) break;
      return { id: p.id };
    }
    case 'dismiss': {
      const p = getP(s, act.id);
      if (p.mission) fail('Person ist im Einsatz.');
      s.people = s.people.filter(x => x !== p);
      for (const a of s.aircraft) a.crew = a.crew.filter(x => x !== p.id);
      return {};
    }
    case 'train': {
      const p = getP(s, act.id);
      if (p.role !== 'pilot') fail('Nur Pilot:innen trainieren im Simulator.');
      if (!st.schoolL) fail('Benötigt eine Flugschule.');
      if (personStatus(s, p, now) !== 'ready') fail('Pilot:in ist nicht verfügbar.');
      const busy = s.people.filter(x => x.trainUntil > now).length;
      if (busy >= st.trainSlots) fail('Alle Simulatoren belegt.');
      const lvl = pilotLevel(p.xp);
      pay(s, { budget: 400 * lvl, fuel: 0 });
      p.trainUntil = now + Math.round(trainTime(st.schoolL) * 1000);
      p.trainXp = 60 + 35 * st.schoolL;
      return {};
    }
    case 'buyVehicle': {
      const V = VEHICLES[act.model]; if (!V) fail('Unbekanntes Fahrzeug.');
      if (st.hq < V.hq) fail(`Benötigt Kommandozentrale Stufe ${V.hq}.`);
      if (s.vehicles.length >= st.vehCap) fail('Fahrzeughof voll.');
      if (vcount(s, act.model) >= VEHICLE_MAX_SAME) fail(`Maximal ${VEHICLE_MAX_SAME} Stück pro Typ.`);
      pay(s, V.cost);
      s.vehicles.push({ id: s.nextId++, model: act.model });
      return {};
    }
    case 'sellVehicle': {
      const v = s.vehicles.find(x => x.id === act.id); if (!v) fail('Fahrzeug nicht gefunden.');
      s.vehicles = s.vehicles.filter(x => x !== v);
      s.res.budget = Math.min(st.cap.budget, s.res.budget + Math.round(VEHICLES[v.model].cost.budget * 0.35));
      return {};
    }
    case 'sendMission': {
      const m = s.board.list.find(x => x.id === Number(act.mid));
      if (!m || m.exp <= now) fail('Einsatz nicht mehr verfügbar.');
      if (s.ops.length >= st.maxOps) fail('Alle Einsatz-Slots belegt. Baue den Kontrollturm aus.');
      const acs = checkPackage(s, act.ac, now, m.minAc, m.maxAc);
      for (const a of acs) if (!canFly(AIRCRAFT[a.model], m)) fail(`${AIRCRAFT[a.model].name} kann diesen Einsatz nicht fliegen.`);
      const pv = missionPreview(s, m, acs.map(a => a.id));
      pay(s, pv.cost);
      const dur = missionDuration(s, m);
      const o = { id: s.nextId++, kind: 'mission', m, ac: acs.map(a => a.id), start: now, end: now + dur * 1000, dur, chance: pv.chance };
      s.ops.push(o);
      s.board.list = s.board.list.filter(x => x !== m);
      for (const a of acs) { a.mission = o.id; for (const pid of a.crew) getP(s, pid).mission = o.id; }
      return { op: o.id };
    }
    case 'refreshBoard': {
      pay(s, { budget: 250 * st.hq });
      refreshBoard(s, now, true);
      return {};
    }
    case 'rename': {
      const n = String(act.name || '').trim().slice(0, 24);
      if (n.length < 3) fail('Name zu kurz.');
      s.name = n; return {};
    }
    default: fail('Unbekannte Aktion.');
  }
}

export const repairCost = (a) => Math.ceil((100 - a.cond) * (AIRCRAFT[a.model].heavy ? 28 : 16));
export const trainTime = (L) => 15 * 60 / (1 + 0.2 * (L - 1));

function autoCrew(s, now, a) {
  const M = AIRCRAFT[a.model];
  if (a.mission || a.crew.length >= M.crew) return false;
  const used = crewOf(s);
  const free = s.people.filter(p => p.role === 'pilot' && used[p.id] == null && !p.mission)
    .sort((x, y) => y.xp - x.xp);
  let added = false;
  while (a.crew.length < M.crew && free.length) { a.crew.push(free.shift().id); added = true; }
  return added;
}

// ---------------------------------------------------------------------------
//  KI-Ziele für Angriffe, wenn es (noch) wenige Spieler gibt
// ---------------------------------------------------------------------------
export function aiTargets(hq, seed) {
  const names = ['Red-Force-Stützpunkt Delta', 'Feldflugplatz Grauwacke', 'Vorposten Nordkap', 'Radarposten Kestrel', 'Depot Eisenwald', 'Feldflugplatz Morast'];
  const out = [];
  let x = seed | 0;
  const r = () => { x = (x + 0x6D2B79F5) | 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const off = Math.floor(r() * names.length);
  for (let i = 0; i < 3; i++) {
    const h = Math.max(1, Math.min(10, hq + Math.floor(r() * 3) - 1));
    const def = Math.round(24 * Math.pow(1.45, h - 1) * (0.7 + r() * 0.6));
    const L = 1800 * Math.pow(1.55, h - 1);
    out.push({
      id: `ai:${i}`, name: names[(off + i) % names.length], hq: h, trophies: Math.round(h * 40 * (0.6 + r())), ai: true,
      def, res: { budget: Math.round(L * (0.6 + r())), fuel: Math.round(L * (0.5 + r())), ammo: Math.round(L * 0.4 * (0.5 + r())), material: Math.round(L * (0.6 + r())) },
    });
  }
  return out;
}

export function threatLabel(def, myPower) {
  const q = myPower / Math.max(1, def);
  return q > 1.6 ? 'gering' : q > 1.0 ? 'mittel' : q > 0.7 ? 'hoch' : 'sehr hoch';
}
