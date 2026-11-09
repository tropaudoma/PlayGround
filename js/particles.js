import * as THREE from '../vendor/three.module.js';
import { rand } from './utils.js';

const vertexShader = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
}`;

const fragmentShader = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float a = smoothstep(0.5, 0.08, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}`;

export class ParticleSystem {
  constructor(scene, max = 900, additive = true) {
    this.max = max;
    this.count = 0;
    this.pool = [];
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    this.alphas = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.additive = additive;
    for (let i = 0; i < max; i++) {
      this.pool.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 1, r: 1, g: 1, b: 1, gravity: 0, drag: 0, grow: 0 });
    }
  }

  spawn(opts) {
    let p = null;
    for (let i = 0; i < this.max; i++) {
      if (!this.pool[i].active) { p = this.pool[i]; break; }
    }
    if (!p) p = this.pool[Math.floor(Math.random() * this.max)];
    p.active = true;
    p.x = opts.x; p.y = opts.y; p.z = opts.z;
    p.vx = opts.vx ?? 0; p.vy = opts.vy ?? 0; p.vz = opts.vz ?? 0;
    p.life = opts.life ?? 1; p.maxLife = p.life;
    p.size = opts.size ?? 1;
    p.r = opts.r ?? 1; p.g = opts.g ?? 0.8; p.b = opts.b ?? 0.4;
    p.gravity = opts.gravity ?? 0;
    p.drag = opts.drag ?? 1.5;
    p.grow = opts.grow ?? 0;
    p.baseSize = p.size;
  }

  burst(x, y, z, count, opts = {}) {
    const spread = opts.spread ?? 2;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(0.2, 1) * spread;
      this.spawn({
        x: x + rand(-0.2, 0.2), y: y + rand(-0.1, 0.3), z: z + rand(-0.2, 0.2),
        vx: Math.cos(a) * s, vy: rand(0.5, 1) * (opts.up ?? spread), vz: Math.sin(a) * s,
        life: rand(0.35, 1) * (opts.life ?? 1),
        size: rand(0.5, 1.2) * (opts.size ?? 1),
        r: opts.r ?? 1, g: opts.g ?? 0.8, b: opts.b ?? 0.3,
        gravity: opts.gravity ?? 2,
        drag: opts.drag ?? 1.5,
      });
    }
  }

  update(dt) {
    let visible = 0;
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) {
        this.alphas[i] = 0;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.alphas[i] = 0;
        continue;
      }
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag; p.vz *= drag;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.size += p.grow * dt;
      const t = p.life / p.maxLife;
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      this.colors[i * 3] = p.r;
      this.colors[i * 3 + 1] = p.g;
      this.colors[i * 3 + 2] = p.b;
      this.sizes[i] = p.size;
      this.alphas[i] = Math.min(1, t * 1.6) * (this.additive ? 1 : 0.85);
      visible++;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.points.visible = visible > 0;
  }
}

export class FallingLeaves {
  constructor(scene, count = 90) {
    this.count = count;
    this.items = [];
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;
    for (let i = 0; i < count; i++) {
      this.items.push({
        x: rand(-70, 70), y: rand(2, 18), z: rand(-70, 70),
        vy: rand(0.25, 0.65), phase: rand(0, 10), speed: rand(0.5, 1.5),
        r: rand(0.55, 0.95), g: rand(0.32, 0.62), b: rand(0.1, 0.25),
      });
    }
  }

  update(dt, playerPos) {
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      p.y -= p.vy * dt;
      p.phase += dt * p.speed;
      p.x += Math.sin(p.phase) * dt * 0.6;
      p.z += Math.cos(p.phase * 0.7) * dt * 0.35;
      if (p.y < 0.2) {
        p.y = rand(10, 20);
        p.x = playerPos.x + rand(-55, 55);
        p.z = playerPos.z + rand(-55, 55);
      }
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      this.colors[i * 3] = p.r;
      this.colors[i * 3 + 1] = p.g;
      this.colors[i * 3 + 2] = p.b;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

export class Fireflies {
  constructor(scene, count = 150) {
    this.count = count;
    this.items = [];
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;
    this.points.visible = false;
    for (let i = 0; i < count; i++) {
      this.items.push({
        x: rand(-80, 80), y: rand(0.4, 3.4), z: rand(-80, 80),
        phase: rand(0, 10), speed: rand(0.3, 1.1), radius: rand(0.4, 2.5),
        bx: 0, bz: 0, g: rand(0.7, 1),
      });
    }
  }

  update(dt, playerPos, nightFactor) {
    this.points.visible = nightFactor > 0.2;
    if (!this.points.visible) return;
    this.points.material.opacity = Math.min(0.95, nightFactor * 1.1);
    for (let i = 0; i < this.count; i++) {
      const p = this.items[i];
      p.phase += dt * p.speed;
      p.bx = playerPos.x + Math.sin(p.phase * 0.4) * 35;
      p.bz = playerPos.z + Math.cos(p.phase * 0.3) * 35;
      const x = p.bx + Math.cos(p.phase) * p.radius;
      const z = p.bz + Math.sin(p.phase * 1.3) * p.radius;
      const y = p.y + Math.sin(p.phase * 1.7) * 0.3;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      const flicker = 0.5 + Math.sin(p.phase * 3.1) * 0.5;
      this.colors[i * 3] = 0.75 * flicker;
      this.colors[i * 3 + 1] = 1.0 * flicker;
      this.colors[i * 3 + 2] = 0.45 * flicker;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
