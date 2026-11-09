import * as THREE from '../vendor/three.module.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}

export function dist2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

// A deterministic, walkable forest floor. The same function powers the mesh,
// collision and object placement so nothing ever floats.
export function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  let h = 0;
  h += Math.sin(x * 0.042 + 0.7) * Math.cos(z * 0.037 - 0.4) * 1.55;
  h += Math.sin(x * 0.093 - 1.1) * Math.sin(z * 0.081 + 2.2) * 0.62;
  h += Math.sin((x + z) * 0.155) * 0.22;
  h += Math.cos(x * 0.021 + z * 0.027) * 1.15;
  h += Math.sin(x * 0.33) * Math.sin(z * 0.29) * 0.055;
  // A soft clearing around the starting den.
  const clearing = 1 - smoothstep(10, 46, d);
  h *= 1 - clearing * 0.52;
  // Raised shoulders of the valley.
  h += smoothstep(78, 132, d) * 9.5;
  h += smoothstep(112, 140, d) * 12;
  // Elderwood hill.
  h += 3.4 * Math.exp(-((x + 55) ** 2 + (z + 38) ** 2) / 950);
  // Ashen Ridge and bear country.
  h += 6.2 * Math.exp(-((x + 60) ** 2 + (z - 65) ** 2) / 1500);
  h += 3.0 * Math.exp(-((x + 62) ** 2 + (z - 80) ** 2) / 380);
  // Crystal hollow dips, then rises behind it.
  h -= 1.4 * Math.exp(-((x - 2) ** 2 + (z + 92) ** 2) / 480);
  h += 2.4 * Math.exp(-((x - 8) ** 2 + (z + 112) ** 2) / 700);
  // Moonlit marsh basin.
  h -= 3.2 * Math.exp(-((x - 65) ** 2 + (z + 65) ** 2) / 1100);
  // A small pond in the glade.
  h -= 2.4 * Math.exp(-((x - 19) ** 2 + (z + 7) ** 2) / 95);
  // Gentle rim to keep the world readable.
  h += smoothstep(120, 150, d) * 8;
  return h;
}

export function terrainNormal(x, z, e = 0.6) {
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
}

export function pointInWater(x, z) {
  if (Math.hypot(x - 19, z + 7) < 8.4 && terrainHeight(x, z) < -0.42) return true;
  if (Math.hypot(x - 65, z + 65) < 27 && terrainHeight(x, z) < -0.75) return true;
  return false;
}

export function makeCanvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mergeGeometries(parts) {
  const positions = [];
  const normals = [];
  const colors = [];
  const uvs = [];
  const tmpColor = new THREE.Color();
  for (const part of parts) {
    let geo = part.geometry;
    if (geo.index) geo = geo.toNonIndexed();
    else geo = geo.clone();
    const matrix = part.matrix || new THREE.Matrix4();
    geo.applyMatrix4(matrix);
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const uv = geo.attributes.uv;
    tmpColor.set(part.color ?? 0xffffff);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
    }
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (uvs.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeBoundingSphere();
  return out;
}

export function mat4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
  return m;
}

export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'm';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.floor(n));
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function pointSegmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
