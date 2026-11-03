// Kleine Synthesizer-Klänge (kein Audio-Asset nötig)
export class Audio {
  constructor() {
    this.on = localStorage.getItem('fl_sound') !== '0';
    this.ctx = null;
    const unlock = () => { this.init(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
  }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    } catch { this.ctx = null; }
  }
  toggle(v) { this.on = v; localStorage.setItem('fl_sound', v ? '1' : '0'); if (!v) this.sirenStop(); }
  ok() { return this.on && this.ctx && this.ctx.state !== 'closed'; }
  noise(dur, type, f0, f1, g0, q = 1) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  boom(v = 1) { this.noise(1.4, 'lowpass', 900, 60, 0.9 * v); }
  gun() { this.noise(0.07, 'bandpass', 2200, 1200, 0.25, 2); }
  launch() { this.noise(1.6, 'bandpass', 400, 3000, 0.35, 1.5); }
  jet() { this.noise(4, 'lowpass', 300, 2400, 0.35); }
  rotor() { if (!this.ok()) return; for (let i = 0; i < 14; i++) setTimeout(() => this.noise(0.12, 'lowpass', 220, 90, 0.35), i * 140); }
  click() {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
    g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.07);
  }
  chime(good = true) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    (good ? [660, 880, 1320] : [520, 390]).forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.35);
      o.connect(g); g.connect(this.master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.4);
    });
  }
  siren() {
    if (!this.ok() || this.sir) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = 620; lfo.frequency.value = 0.35; lg.gain.value = 240;
    lfo.connect(lg); lg.connect(o.frequency);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.8); g.gain.setValueAtTime(0.05, t + 6); g.gain.exponentialRampToValueAtTime(0.0001, t + 8);
    o.connect(fl); fl.connect(g); g.connect(this.master); o.start(t); lfo.start(t); o.stop(t + 8.2); lfo.stop(t + 8.2);
    this.sir = { o, g, lfo }; setTimeout(() => { this.sir = null; }, 8300);
  }
  sirenStop() { if (this.sir && this.ctx) { try { const t = this.ctx.currentTime; this.sir.g.gain.cancelScheduledValues(t); this.sir.g.gain.setValueAtTime(this.sir.g.gain.value, t); this.sir.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); } catch {} } }
}
