import { rand, clamp } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.enabled = true;
    this.volume = 0.7;
    this.birdTimer = 3;
    this.cricketTimer = 2;
    this.night = 0;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);
    this.noiseBuffer = this.makeNoise(3);
    this.startAmbient();
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.volume;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  startAmbient() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(this.musicGain);
    src.start();
    lfo.start();
    this.ambientGain = gain;
    this.ambientFilter = filter;
  }

  update(dt, nightFactor = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.night = nightFactor;
    this.birdTimer -= dt;
    this.cricketTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = rand(2.5, 7.5);
      if (nightFactor < 0.6 && Math.random() < 0.8) this.bird();
    }
    if (this.cricketTimer <= 0) {
      this.cricketTimer = rand(0.6, 2.2);
      if (nightFactor > 0.35 && Math.random() < 0.7) this.cricket();
    }
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(0.03 + nightFactor * 0.012, this.ctx.currentTime, 1.5);
    }
  }

  bird() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const base = rand(1700, 3100);
    const notes = Math.floor(rand(2, 5));
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base + rand(-180, 180), t + i * 0.075);
      o.frequency.exponentialRampToValueAtTime(base * rand(1.08, 1.3), t + i * 0.075 + 0.05);
      g.gain.setValueAtTime(0.0001, t + i * 0.075);
      g.gain.exponentialRampToValueAtTime(rand(0.012, 0.03), t + i * 0.075 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.075 + 0.07);
      o.connect(g).connect(this.musicGain);
      o.start(t + i * 0.075);
      o.stop(t + i * 0.075 + 0.1);
    }
  }

  cricket() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = rand(3600, 4700);
    const pulses = 4;
    for (let i = 0; i < pulses; i++) {
      const tt = t + i * 0.055;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.008, tt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03);
    }
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.3);
  }

  tone({ freq = 440, endFreq = null, duration = 0.2, type = 'sine', gain = 0.08, delay = 0, attack = 0.01 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.02);
  }

  noise({ duration = 0.2, freq = 800, endFreq = null, gain = 0.08, type = 'lowpass', q = 1, delay = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (endFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + duration);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.03);
  }

  step(water = false) {
    if (water) this.noise({ duration: 0.18, freq: 600, endFreq: 220, gain: 0.035, type: 'bandpass', q: 0.8 });
    else this.noise({ duration: 0.1, freq: 190, endFreq: 90, gain: 0.045, type: 'lowpass' });
  }

  sniff() {
    this.noise({ duration: 0.55, freq: 900, endFreq: 2600, gain: 0.05, type: 'bandpass', q: 1.2 });
    this.tone({ freq: 130, endFreq: 70, duration: 0.18, type: 'sine', gain: 0.03, delay: 0.1 });
  }

  dig() {
    this.noise({ duration: 0.16, freq: 320, endFreq: 120, gain: 0.05, type: 'lowpass' });
  }

  digComplete(rarity = 'common') {
    const notes = rarity === 'legendary' ? [523, 659, 784, 1047, 1319] : rarity === 'rare' ? [523, 659, 784, 1047] : [523, 659, 784];
    notes.forEach((f, i) => this.tone({ freq: f, duration: 0.28, type: 'triangle', gain: 0.07, delay: i * 0.075 }));
    this.noise({ duration: 0.25, freq: 900, endFreq: 240, gain: 0.035, type: 'bandpass' });
  }

  pickup() {
    this.tone({ freq: 720, endFreq: 1080, duration: 0.12, type: 'sine', gain: 0.05 });
  }

  coin() {
    this.tone({ freq: 1200, endFreq: 1600, duration: 0.08, type: 'square', gain: 0.025 });
  }

  attack() {
    this.noise({ duration: 0.18, freq: 1400, endFreq: 300, gain: 0.07, type: 'bandpass', q: 0.8 });
  }

  charge() {
    this.noise({ duration: 0.4, freq: 240, endFreq: 80, gain: 0.08, type: 'lowpass' });
    this.tone({ freq: 90, endFreq: 55, duration: 0.3, type: 'sawtooth', gain: 0.025 });
  }

  hit() {
    this.tone({ freq: 120, endFreq: 45, duration: 0.18, type: 'sine', gain: 0.1 });
    this.noise({ duration: 0.12, freq: 900, endFreq: 300, gain: 0.06, type: 'lowpass' });
  }

  hurt() {
    this.tone({ freq: 180, endFreq: 90, duration: 0.3, type: 'sawtooth', gain: 0.05 });
    this.noise({ duration: 0.18, freq: 500, endFreq: 200, gain: 0.04, type: 'lowpass' });
  }

  jump() {
    this.noise({ duration: 0.16, freq: 500, endFreq: 1400, gain: 0.025, type: 'bandpass' });
  }

  land() {
    this.noise({ duration: 0.16, freq: 260, endFreq: 80, gain: 0.06, type: 'lowpass' });
  }

  stomp() {
    this.tone({ freq: 65, endFreq: 28, duration: 0.5, type: 'sine', gain: 0.16 });
    this.noise({ duration: 0.45, freq: 500, endFreq: 90, gain: 0.12, type: 'lowpass' });
  }

  guard() {
    this.tone({ freq: 420, endFreq: 300, duration: 0.2, type: 'triangle', gain: 0.04 });
  }

  rage() {
    this.tone({ freq: 70, endFreq: 120, duration: 0.7, type: 'sawtooth', gain: 0.06 });
    this.tone({ freq: 140, endFreq: 240, duration: 0.7, type: 'square', gain: 0.02, delay: 0.05 });
  }

  roar() {
    this.tone({ freq: 85, endFreq: 42, duration: 1.1, type: 'sawtooth', gain: 0.09 });
    this.noise({ duration: 1.0, freq: 320, endFreq: 90, gain: 0.09, type: 'lowpass' });
  }

  howl() {
    this.tone({ freq: 340, endFreq: 520, duration: 0.5, type: 'sine', gain: 0.035 });
    this.tone({ freq: 520, endFreq: 300, duration: 0.7, type: 'sine', gain: 0.03, delay: 0.45 });
  }

  bark() {
    this.tone({ freq: 260, endFreq: 150, duration: 0.12, type: 'square', gain: 0.035 });
    this.tone({ freq: 230, endFreq: 140, duration: 0.12, type: 'square', gain: 0.03, delay: 0.17 });
  }

  levelUp() {
    [392, 523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, duration: 0.45, type: 'triangle', gain: 0.075, delay: i * 0.1 }));
    this.noise({ duration: 0.5, freq: 2200, endFreq: 500, gain: 0.03, type: 'bandpass', delay: 0.2 });
  }

  achievement() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone({ freq: f, duration: 0.5, type: 'sine', gain: 0.06, delay: i * 0.09 }));
  }

  quest() {
    [523, 659, 880].forEach((f, i) => this.tone({ freq: f, duration: 0.4, type: 'triangle', gain: 0.05, delay: i * 0.08 }));
  }

  chest() {
    this.noise({ duration: 0.3, freq: 700, endFreq: 1400, gain: 0.04, type: 'bandpass' });
    [523, 784, 1047].forEach((f, i) => this.tone({ freq: f, duration: 0.3, type: 'sine', gain: 0.05, delay: 0.15 + i * 0.08 }));
  }

  discover() {
    [440, 554, 659, 880].forEach((f, i) => this.tone({ freq: f, duration: 0.7, type: 'sine', gain: 0.045, delay: i * 0.11 }));
  }

  rest() {
    this.tone({ freq: 220, endFreq: 165, duration: 0.8, type: 'sine', gain: 0.03 });
  }

  eat() {
    this.noise({ duration: 0.12, freq: 600, endFreq: 300, gain: 0.04, type: 'bandpass' });
    this.noise({ duration: 0.12, freq: 500, endFreq: 240, gain: 0.035, type: 'bandpass', delay: 0.18 });
  }

  ui() {
    this.tone({ freq: 620, endFreq: 740, duration: 0.07, type: 'sine', gain: 0.025 });
  }

  splash() {
    this.noise({ duration: 0.35, freq: 900, endFreq: 300, gain: 0.05, type: 'bandpass' });
  }

  error() {
    this.tone({ freq: 180, endFreq: 120, duration: 0.15, type: 'square', gain: 0.025 });
  }
}
