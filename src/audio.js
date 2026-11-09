export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
    this.lastHit = 0;
    this.lastShoot = 0;
    this.musicTimer = 0;
    this.step = 0;
    this.playing = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.34;
      this.master.connect(this.ctx.destination);
      this.makeNoise();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  makeNoise() {
    if (!this.ctx) return;
    const length = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  setMuted(value) {
    this.muted = value;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(value ? 0 : 0.34, this.ctx.currentTime, 0.02);
    }
  }

  tone({ freq = 440, to = null, dur = 0.1, type = 'sine', vol = 0.1, delay = 0, attack = 0.004 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.1, vol = 0.08, freq = 900, q = 1, delay = 0 }) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  ui() {
    this.tone({ freq: 660, to: 880, dur: 0.055, type: 'triangle', vol: 0.045 });
  }

  shoot() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastShoot < 55) return;
    this.lastShoot = now;
    this.tone({ freq: 960, to: 1480, dur: 0.055, type: 'triangle', vol: 0.022 });
  }

  hit(big = false) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastHit < 38) return;
    this.lastHit = now;
    this.noise({ dur: big ? 0.12 : 0.055, vol: big ? 0.09 : 0.035, freq: big ? 420 : 1500, q: 0.8 });
    if (big) this.tone({ freq: 150, to: 60, dur: 0.16, type: 'sawtooth', vol: 0.05 });
  }

  hurt() {
    this.tone({ freq: 180, to: 70, dur: 0.3, type: 'sawtooth', vol: 0.11 });
    this.noise({ dur: 0.18, vol: 0.09, freq: 300, q: 0.7 });
  }

  pickup(tier = 1) {
    const notes = tier >= 4 ? [523, 659, 784, 1046, 1318] : tier === 3 ? [440, 554, 659, 880] : tier === 2 ? [392, 523, 659] : [330, 440];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.055, delay: i * 0.055 }));
    if (tier >= 4) {
      this.tone({ freq: 1046, dur: 0.8, type: 'sine', vol: 0.045, delay: 0.22 });
      this.noise({ dur: 0.5, vol: 0.035, freq: 3000, q: 1.6, delay: 0.04 });
    }
  }

  levelup() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.24, type: 'triangle', vol: 0.06, delay: i * 0.065 }));
    this.noise({ dur: 0.45, vol: 0.045, freq: 2400, q: 1.2 });
  }

  ability() {
    this.tone({ freq: 240, to: 880, dur: 0.28, type: 'sawtooth', vol: 0.05 });
    this.tone({ freq: 480, to: 1320, dur: 0.24, type: 'triangle', vol: 0.035, delay: 0.03 });
  }

  wave() {
    this.tone({ freq: 110, to: 90, dur: 0.5, type: 'sawtooth', vol: 0.055 });
    this.tone({ freq: 220, to: 180, dur: 0.5, type: 'triangle', vol: 0.04, delay: 0.05 });
  }

  boss() {
    this.tone({ freq: 82, to: 48, dur: 1.3, type: 'sawtooth', vol: 0.12 });
    this.tone({ freq: 123, to: 70, dur: 1.1, type: 'square', vol: 0.045, delay: 0.15 });
    this.noise({ dur: 0.9, vol: 0.06, freq: 180, q: 0.6 });
  }

  explode() {
    this.noise({ dur: 0.22, vol: 0.09, freq: 240, q: 0.5 });
    this.tone({ freq: 110, to: 42, dur: 0.25, type: 'sine', vol: 0.07 });
  }

  death() {
    [330, 247, 196, 147, 98].forEach((f, i) => this.tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.06, delay: i * 0.12 }));
    this.noise({ dur: 0.9, vol: 0.045, freq: 400, q: 0.5, delay: 0.1 });
  }

  music(dt) {
    if (!this.ctx || this.muted || !this.playing) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.28;
    const scale = [55, 65.41, 73.42, 82.41, 98, 110, 130.81, 146.83];
    const step = this.step++;
    if (step % 8 === 0) {
      this.tone({ freq: scale[0], to: scale[0] * 0.98, dur: 0.9, type: 'sine', vol: 0.035 });
      this.tone({ freq: scale[0] * 2, dur: 0.7, type: 'triangle', vol: 0.015 });
    }
    if (step % 2 === 0) {
      const note = scale[(step * 3 + 2) % scale.length] * 4;
      this.tone({ freq: note, dur: 0.22, type: 'triangle', vol: 0.009 });
    }
    if (step % 8 === 4) this.noise({ dur: 0.08, vol: 0.012, freq: 5000, q: 2 });
  }
}
