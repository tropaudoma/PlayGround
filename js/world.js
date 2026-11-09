import * as THREE from '../vendor/three.module.js';
import {
  clamp, lerp, smoothstep, rand, randInt, mulberry32, makeCanvasTexture,
  mergeGeometries, mat4, terrainHeight, terrainNormal, pointInWater, TAU,
  pointSegmentDistance, pick,
} from './utils.js';
import { PATHS, REGIONS, LANDMARKS, CHEST_SPOTS, COLLECTIBLE_SPOTS } from './data.js';
import { FallingLeaves, Fireflies, ParticleSystem } from './particles.js';

const rng = mulberry32(20261109);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function cloudTexture() {
  return canvasTex(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = 35 + rng() * (w - 70);
      const y = 45 + rng() * (h - 80);
      const r = 16 + rng() * 34;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,245,220,0.16)');
      g.addColorStop(1, 'rgba(255,245,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  });
}

function leafTexture() {
  return canvasTex(64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(32, 32, 10, 25, Math.PI / 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,30,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 44); ctx.lineTo(44, 20); ctx.stroke();
  });
}

function grassGeometry() {
  const pos = [];
  const blades = 6;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * TAU + rng() * 0.6;
    const r = rng() * 0.12;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const w = 0.035 + rng() * 0.03;
    const h = 0.32 + rng() * 0.55;
    const lean = 0.08 + rng() * 0.16;
    const cx = Math.cos(a) * w;
    const cz = Math.sin(a) * w;
    // Two triangles per blade for a tapered silhouette.
    pos.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    pos.push(bx - cx, 0, bz - cz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean, bx - cx * 0.2 + Math.cos(a) * lean, h * 0.55, bz - cz * 0.2 + Math.sin(a) * lean);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function flowerGeometry() {
  const parts = [];
  parts.push({ geometry: new THREE.CylinderGeometry(0.014, 0.018, 0.32, 4), color: 0x52743a, matrix: mat4(0, 0.16, 0) });
  const cols = [0xffd6e2, 0xffe6a1, 0xffffff, 0xd9c4ff, 0xffb3a7];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    parts.push({
      geometry: new THREE.SphereGeometry(0.045, 5, 4), color: cols[i % cols.length],
      matrix: mat4(Math.cos(a) * 0.05, 0.34, Math.sin(a) * 0.05, 0, 0, 0, 1, 0.45, 1),
    });
  }
  parts.push({ geometry: new THREE.SphereGeometry(0.03, 5, 4), color: 0xffc94f, matrix: mat4(0, 0.36, 0) });
  return mergeGeometries(parts);
}

function mushroomGeometry() {
  const parts = [];
  parts.push({ geometry: new THREE.CylinderGeometry(0.06, 0.09, 0.32, 6), color: 0xe8dcc0, matrix: mat4(0, 0.16, 0) });
  parts.push({ geometry: new THREE.SphereGeometry(0.23, 8, 5, 0, TAU, 0, Math.PI / 2), color: 0xffffff, matrix: mat4(0, 0.31, 0, 0, 0, 0, 1, 0.62, 1) });
  return mergeGeometries(parts);
}

function rockGeometry() {
  const parts = [];
  parts.push({ geometry: new THREE.DodecahedronGeometry(1, 0), color: 0xffffff, matrix: mat4(0, 0.25, 0, 0.3, 0.4, 0.1, 1.15, 0.72, 0.95) });
  parts.push({ geometry: new THREE.DodecahedronGeometry(0.55, 0), color: 0xffffff, matrix: mat4(0.7, 0.05, 0.25, 0.7, 1.1, 0, 1, 0.6, 0.8) });
  return mergeGeometries(parts);
}

function treeGeometry(kind) {
  const trunk = [];
  const leaves = [];
  const bark = kind === 'birch' ? 0xd8d8c4 : kind === 'dead' ? 0x6d6659 : 0x59412c;
  const trunkH = kind === 'pine' ? 4.4 : kind === 'birch' ? 4.1 : 3.4;
  trunk.push({ geometry: new THREE.CylinderGeometry(kind === 'birch' ? 0.16 : 0.3, kind === 'birch' ? 0.24 : 0.42, trunkH, 7), color: bark, matrix: mat4(0, trunkH / 2, 0) });
  if (kind === 'birch') {
    for (let i = 0; i < 4; i++) {
      trunk.push({ geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.06, 3), color: 0x39352e, matrix: mat4(0.16, 0.7 + i * 0.72, 0.05, 0, 0, 1.2, 1, 1, 1) });
    }
  }
  if (kind === 'dead') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4;
      trunk.push({ geometry: new THREE.CylinderGeometry(0.06, 0.12, 1.6, 5), color: bark, matrix: mat4(Math.cos(a) * 0.55, 2.5 + (i % 2) * 0.7, Math.sin(a) * 0.55, 0.8, 0, -Math.cos(a) * 0.7) });
    }
  } else {
    // A couple of branches break up the silhouette.
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.7;
      trunk.push({ geometry: new THREE.CylinderGeometry(0.07, 0.13, 1.1, 5), color: bark, matrix: mat4(Math.cos(a) * 0.5, trunkH * 0.72, Math.sin(a) * 0.5, 0.7, 0, -Math.cos(a) * 0.8) });
    }
  }
  if (kind === 'pine') {
    const levels = [
      { r: 1.8, h: 2.2, y: 3.1 }, { r: 1.45, h: 2.0, y: 4.2 }, { r: 1.05, h: 1.8, y: 5.25 }, { r: 0.65, h: 1.4, y: 6.1 },
    ];
    for (const l of levels) leaves.push({ geometry: new THREE.ConeGeometry(l.r, l.h, 7), color: 0xffffff, matrix: mat4(0, l.y, 0) });
  } else if (kind === 'willow') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      leaves.push({ geometry: new THREE.SphereGeometry(0.9, 7, 5), color: 0xffffff, matrix: mat4(Math.cos(a) * 0.85, 3.5 + (i % 2) * 0.5, Math.sin(a) * 0.85, 0, 0, 0, 1.3, 0.65, 1.3) });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      leaves.push({ geometry: new THREE.ConeGeometry(0.18, 1.6, 4), color: 0xffffff, matrix: mat4(Math.cos(a) * 1.2, 2.8, Math.sin(a) * 1.2, Math.PI, 0, 0) });
    }
  } else if (kind === 'birch') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.3;
      leaves.push({ geometry: new THREE.SphereGeometry(1.0, 7, 5), color: 0xffffff, matrix: mat4(Math.cos(a) * 0.7, 4.3 + (i % 2) * 0.55, Math.sin(a) * 0.7, 0, 0, 0, 1.05, 0.9, 1.05) });
    }
    leaves.push({ geometry: new THREE.SphereGeometry(1.2, 7, 5), color: 0xffffff, matrix: mat4(0, 4.7, 0, 0, 0, 0, 1.2, 1, 1.2) });
  } else {
    const count = kind === 'autumn' ? 5 : 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + 0.25;
      const r = i === 0 ? 0 : 0.85;
      leaves.push({
        geometry: new THREE.IcosahedronGeometry(1.25 + (i % 2) * 0.18, 1), color: 0xffffff,
        matrix: mat4(Math.cos(a) * r, 3.7 + (i % 3) * 0.55, Math.sin(a) * r, 0, 0, 0, 1.05, 0.85, 1.05),
      });
    }
  }
  return {
    trunk: mergeGeometries(trunk),
    leaves: leaves.length ? mergeGeometries(leaves) : null,
    radius: kind === 'birch' ? 0.3 : kind === 'pine' ? 0.38 : 0.48,
  };
}

const LEAF_COLORS = {
  broadleaf: [0x507f38, 0x5d8a3d, 0x46732f, 0x6c9446, 0x3f6a2f],
  pine: [0x2f5b3a, 0x386844, 0x274f35, 0x426f49],
  birch: [0x7fa849, 0x8db654, 0x6f9b3f, 0x99bd5f],
  autumn: [0xc46a2c, 0xd18a34, 0xa94a27, 0xe0a13b, 0xb4572d],
  willow: [0x5c7f3b, 0x6f9046, 0x4e7234, 0x7d9c52],
  dead: [],
};

export class World {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.colliders = [];
    this.chests = [];
    this.collectibles = [];
    this.crystals = [];
    this.fireMeshes = [];
    this.glowSprites = [];
    this.mist = [];
    this.birds = [];
    this.landmarkMeshes = {};
    this.time = 0;
    this.quality = game.quality;
    this.waterMeshes = [];
    this.restSpot = { x: 5.2, z: 6.5, radius: 3.6 };
    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildWater();
    this.buildForest();
    this.buildDetails();
    this.buildLandmarks();
    this.buildChests();
    this.buildCollectibles();
    this.buildAmbient();
    this.buildSpatialGrid();
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(440, 32, 20);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x5f86ad) },
        bottomColor: { value: new THREE.Color(0xe9c98c) },
        sunColor: { value: new THREE.Color(0xffe2a0) },
        sunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, pow(h, 0.9));
          float d = max(dot(dir, normalize(sunDir)), 0.0);
          col += sunColor * pow(d, 420.0) * 1.6;
          col += sunColor * pow(d, 10.0) * 0.22;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    const tex = glowTexture();
    const sunMat = new THREE.SpriteMaterial({ map: tex, color: 0xffe4a8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.sunSprite = new THREE.Sprite(sunMat);
    this.sunSprite.scale.set(55, 55, 1);
    this.scene.add(this.sunSprite);

    const moonMat = new THREE.SpriteMaterial({ map: tex, color: 0xcfe4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.moonSprite = new THREE.Sprite(moonMat);
    this.moonSprite.scale.set(24, 24, 1);
    this.scene.add(this.moonSprite);

    const cloudTex = cloudTexture();
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.SpriteMaterial({ map: cloudTex, color: 0xfff2d8, transparent: true, opacity: rand(0.18, 0.4), depthWrite: false, fog: false });
      const s = new THREE.Sprite(mat);
      const a = rand(0, TAU), r = rand(70, 210);
      s.position.set(Math.cos(a) * r, rand(48, 90), Math.sin(a) * r);
      s.scale.set(rand(55, 110), rand(18, 34), 1);
      s.userData.speed = rand(0.15, 0.5);
      this.scene.add(s);
      this.mist.push({ sprite: s, baseY: s.position.y, phase: rand(0, 10) });
    }

    // Distant mountain silhouettes.
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x54624d, roughness: 1, flatShading: true, fog: false });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU + rand(-0.08, 0.08);
      const r = rand(150, 205);
      const h = rand(35, 85);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rand(18, 34), h, 5), mountainMat);
      cone.position.set(Math.cos(a) * r, h * 0.32 - 8, Math.sin(a) * r);
      cone.rotation.y = rand(0, TAU);
      cone.scale.z = rand(0.7, 1.3);
      this.scene.add(cone);
    }
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffeccb, 0x33402a, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffd9a6, 2.35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.quality === 'low' ? 1024 : 2048, this.quality === 'low' ? 1024 : 2048);
    this.sun.shadow.camera.left = -48;
    this.sun.shadow.camera.right = 48;
    this.sun.shadow.camera.top = 48;
    this.sun.shadow.camera.bottom = -48;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 170;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.ambient = new THREE.AmbientLight(0xffe7c8, 0.22);
    this.scene.add(this.ambient);
  }

  buildTerrain() {
    const size = 290;
    const seg = this.quality === 'low' ? 130 : 180;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grass1 = new THREE.Color(0x5c7b3a);
    const grass2 = new THREE.Color(0x79984a);
    const grass3 = new THREE.Color(0x47662f);
    const dirt = new THREE.Color(0x8c6a44);
    const rock = new THREE.Color(0x6d6b5b);
    const sand = new THREE.Color(0xb3a06f);
    const ashen = new THREE.Color(0x8a6844);
    const marsh = new THREE.Color(0x4e6f55);
    const crystal = new THREE.Color(0x666780);
    const regionColors = REGIONS.map((r) => ({ ...r, color: new THREE.Color(r.color) }));
    const waterY = this.waterLevels();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeight(x, z);
      pos.setY(i, y);
      // Region tint.
      let nearest = regionColors[0], nd = 1e9;
      for (const r of regionColors) {
        const d = Math.hypot(x - r.x, z - r.z);
        if (d < nd) { nd = d; nearest = r; }
      }
      const regionMix = clamp(1 - nd / 95, 0, 0.55);
      c.copy(grass1).lerp(grass2, (Math.sin(x * 0.15 + z * 0.11) + 1) * 0.24);
      c.lerp(grass3, (Math.sin(x * 0.42 - z * 0.3) + 1) * 0.18);
      c.lerp(nearest.color, regionMix * 0.32);
      if (nearest.id === 'ashen') c.lerp(ashen, regionMix * 0.45);
      if (nearest.id === 'marsh') c.lerp(marsh, regionMix * 0.5);
      if (nearest.id === 'crystal') c.lerp(crystal, regionMix * 0.4);
      // Paths.
      let pathDist = 1e9;
      for (const path of PATHS) {
        for (let p = 0; p < path.length - 1; p++) {
          const d = pointSegmentDistance(x, z, path[p][0], path[p][1], path[p + 1][0], path[p + 1][1]);
          if (d < pathDist) pathDist = d;
        }
      }
      if (pathDist < 6.5) {
        const m = smoothstep(6.5, 1.5, pathDist);
        c.lerp(dirt, m * 0.72);
        c.lerp(grass2, (1 - m) * 0.1);
      }
      // Sandy shores and dark wet earth.
      if (y < waterY.pond + 0.6 && Math.hypot(x - 19, z + 7) < 14) c.lerp(sand, 0.55);
      if (y < waterY.marsh + 0.7 && Math.hypot(x - 65, z + 65) < 38) c.lerp(marsh, 0.65);
      // Exposed stone on slopes and high ground.
      const n = terrainNormal(x, z, 1.1);
      if (n.y < 0.82) c.lerp(rock, smoothstep(0.82, 0.62, n.y) * 0.65);
      if (y > 9) c.lerp(rock, smoothstep(9, 15, y) * 0.6);
      // Mottled forest floor.
      const mottle = Math.sin(x * 1.7 + z * 0.8) * Math.sin(z * 2.1 - x * 0.6);
      c.offsetHSL(0, 0, mottle * 0.018);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const detail = makeCanvasTexture(256, (ctx, s) => {
      ctx.fillStyle = '#b8b8a8';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) {
        const v = 150 + Math.floor(Math.random() * 90);
        ctx.fillStyle = `rgba(${v},${v},${v - 8},${0.12 + Math.random() * 0.2})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      for (let i = 0; i < 80; i++) {
        ctx.strokeStyle = `rgba(70,90,40,${0.08 + Math.random() * 0.1})`;
        ctx.beginPath();
        const x = Math.random() * s, y = Math.random() * s;
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand(-6, 6), y + rand(-10, 10));
        ctx.stroke();
      }
    }, 55, 55);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 1, metalness: 0 });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.terrain.castShadow = false;
    this.scene.add(this.terrain);
  }

  waterLevels() {
    return {
      pond: terrainHeight(19, -7) + 1.42,
      marsh: terrainHeight(65, -65) + 1.2,
    };
  }

  waterMaterial(deep, shallow, sky) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(deep) },
        uShallow: { value: new THREE.Color(shallow) },
        uSky: { value: new THREE.Color(sky) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.y += sin(p.x * 0.55 + uTime * 1.2) * 0.028 + cos(p.z * 0.7 - uTime * 1.6) * 0.022;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSky;
        varying vec3 vWorld;
        varying vec2 vUv;
        void main() {
          float wave = sin(vWorld.x * 0.8 + uTime * 1.4) * sin(vWorld.z * 1.1 - uTime * 1.1);
          float wave2 = sin(vWorld.x * 2.4 - uTime * 2.2 + vWorld.z * 1.3);
          vec3 col = mix(uDeep, uShallow, 0.45 + wave * 0.18 + wave2 * 0.08);
          vec3 viewDir = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 2.2);
          col = mix(col, uSky, fres * 0.58);
          float sparkle = smoothstep(0.86, 1.0, sin(vWorld.x * 3.2 + uTime * 2.1) * sin(vWorld.z * 2.7 - uTime * 1.7));
          col += vec3(sparkle) * 0.35;
          float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x) * smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
          float alpha = 0.62 + fres * 0.22;
          gl_FragColor = vec4(col, alpha * (0.35 + edge * 0.65));
        }`,
    });
  }

  buildWater() {
    const wl = this.waterLevels();
    const pondGeo = new THREE.CircleGeometry(9.2, 48);
    pondGeo.rotateX(-Math.PI / 2);
    const pondMat = this.waterMaterial(0x1d3e3a, 0x5f8c78, 0xd8d5a4);
    const pond = new THREE.Mesh(pondGeo, pondMat);
    pond.position.set(19, wl.pond, -7);
    pond.renderOrder = 2;
    this.scene.add(pond);
    this.waterMeshes.push(pondMat);

    const marshGeo = new THREE.CircleGeometry(29, 56);
    marshGeo.rotateX(-Math.PI / 2);
    const marshMat = this.waterMaterial(0x1c3230, 0x4f6e61, 0xaab8a0);
    const marsh = new THREE.Mesh(marshGeo, marshMat);
    marsh.position.set(65, wl.marsh, -65);
    marsh.renderOrder = 2;
    this.scene.add(marsh);
    this.waterMeshes.push(marshMat);

    // Lily pads.
    const padMat = new THREE.MeshStandardMaterial({ color: 0x3f6d3c, roughness: 0.8, side: THREE.DoubleSide });
    const padGeo = new THREE.CircleGeometry(0.55, 9, 0.35, TAU - 0.6);
    padGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 28; i++) {
      const inMarsh = i > 14;
      const cx = inMarsh ? 65 : 19, cz = inMarsh ? -65 : -7;
      const r = inMarsh ? rand(3, 24) : rand(2, 7.5);
      const a = rand(0, TAU);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(cx + Math.cos(a) * r, (inMarsh ? wl.marsh : wl.pond) + 0.035, cz + Math.sin(a) * r);
      pad.rotation.y = rand(0, TAU);
      pad.scale.setScalar(rand(0.6, 1.5));
      this.scene.add(pad);
    }

    // Reeds at the marsh edge.
    const reedGeo = new THREE.CylinderGeometry(0.02, 0.035, 1.4, 4);
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x6b7a42, roughness: 1 });
    const reeds = new THREE.InstancedMesh(reedGeo, reedMat, 260);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 260; i++) {
      const a = rand(0, TAU);
      const r = rand(22, 34);
      const x = 65 + Math.cos(a) * r;
      const z = -65 + Math.sin(a) * r;
      dummy.position.set(x, wl.marsh + rand(0.3, 1.0), z);
      dummy.scale.set(rand(0.7, 1.5), rand(0.7, 1.5), rand(0.7, 1.5));
      dummy.rotation.set(rand(-0.1, 0.1), rand(0, TAU), rand(-0.1, 0.1));
      dummy.updateMatrix();
      reeds.setMatrixAt(i, dummy.matrix);
    }
    reeds.frustumCulled = false;
    this.scene.add(reeds);
  }

  addCollider(x, z, r, camR = r) {
    this.colliders.push({ x, z, r, camR });
  }

  buildForest() {
    const types = ['broadleaf', 'pine', 'birch', 'autumn', 'willow', 'dead'];
    const geos = {};
    for (const t of types) geos[t] = treeGeometry(t);
    const buckets = Object.fromEntries(types.map((t) => [t, []]));
    const regionType = {
      glade: ['broadleaf', 'birch', 'broadleaf'],
      fern: ['broadleaf', 'willow', 'broadleaf', 'birch'],
      elder: ['broadleaf', 'birch', 'broadleaf', 'willow'],
      ashen: ['autumn', 'pine', 'dead', 'autumn'],
      marsh: ['willow', 'birch', 'willow', 'dead'],
      crystal: ['pine', 'dead', 'pine', 'birch'],
    };
    const regionById = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
    const nearestRegion = (x, z) => {
      let best = REGIONS[0], bd = 1e9;
      for (const r of REGIONS) {
        const d = Math.hypot(x - r.x, z - r.z);
        if (d < bd) { bd = d; best = r; }
      }
      return best;
    };
    const pathDist = (x, z) => {
      let d = 1e9;
      for (const path of PATHS) {
        for (let p = 0; p < path.length - 1; p++) {
          d = Math.min(d, pointSegmentDistance(x, z, path[p][0], path[p][1], path[p + 1][0], path[p + 1][1]));
        }
      }
      return d;
    };
    const blocked = (x, z, extra = 0) => {
      if (pointInWater(x, z)) return true;
      if (pathDist(x, z) < 3.4 + extra) return true;
      for (const l of LANDMARKS) {
        if (Math.hypot(x - l.x, z - l.z) < l.radius * 0.75 + extra) return true;
      }
      return false;
    };
    const tryAdd = (x, z, type, scale) => {
      if (blocked(x, z, 0.5)) return false;
      if (Math.hypot(x, z) < 12) return false;
      const r = nearestRegion(x, z);
      const region = regionById[r.id];
      if (Math.hypot(x - region.x, z - region.z) > region.radius + 35) return false;
      const tint = new THREE.Color(pick(LEAF_COLORS[type] || [0xffffff]));
      tint.offsetHSL(rand(-0.02, 0.02), rand(-0.06, 0.06), rand(-0.07, 0.07));
      buckets[type].push({
        x, z, y: terrainHeight(x, z) - 0.08, scale, rot: rand(0, TAU), tint,
        radius: geos[type].radius * scale,
      });
      return true;
    };

    // Core forest.
    for (let i = 0; i < 1350; i++) {
      const a = rand(0, TAU);
      const r = 16 + Math.pow(rng(), 0.62) * 114;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const region = nearestRegion(x, z);
      const options = regionType[region.id] || regionType.glade;
      const type = pick(options);
      tryAdd(x, z, type, rand(0.75, 1.55));
    }
    // A denser living wall at the edge of the valley.
    for (let i = 0; i < 260; i++) {
      const a = (i / 260) * TAU + rand(-0.02, 0.02);
      const r = rand(124, 140);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const type = pick(['pine', 'dead', 'pine', 'autumn', 'broadleaf']);
      const tint = new THREE.Color(pick(LEAF_COLORS[type] || [0xffffff])).offsetHSL(0, -0.08, -0.06);
      buckets[type].push({ x, z, y: terrainHeight(x, z) - 0.1, scale: rand(1.1, 2.0), rot: rand(0, TAU), tint, radius: 0.5 });
    }

    const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
    const dummy = new THREE.Object3D();
    for (const type of types) {
      const items = buckets[type];
      if (!items.length) continue;
      const trunks = new THREE.InstancedMesh(geos[type].trunk, trunkMat, items.length);
      trunks.castShadow = true;
      trunks.receiveShadow = true;
      trunks.frustumCulled = false;
      let leaves = null;
      if (geos[type].leaves) {
        leaves = new THREE.InstancedMesh(geos[type].leaves, leafMat, items.length);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        leaves.frustumCulled = false;
      }
      items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.rot, 0);
        dummy.scale.set(it.scale, it.scale * rand(0.92, 1.12), it.scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        if (leaves) {
          leaves.setMatrixAt(i, dummy.matrix);
          leaves.setColorAt(i, it.tint);
        }
        if (it.radius > 0.25) {
          this.addCollider(it.x, it.z, Math.max(0.28, it.radius * 0.8), Math.max(1.8, it.radius * 3.8));
        }
      });
      trunks.instanceMatrix.needsUpdate = true;
      if (leaves) {
        leaves.instanceMatrix.needsUpdate = true;
        leaves.instanceColor.needsUpdate = true;
      }
      this.scene.add(trunks);
      if (leaves) this.scene.add(leaves);
    }

    this.buildGrass();
  }

  buildGrass() {
    const count = this.quality === 'low' ? 1400 : 3000;
    const geo = grassGeometry();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide });
    mat.userData.time = { value: 0 };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = mat.userData.time;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float sway = sin(uTime * 1.7 + instanceMatrix[3][0] * 0.33 + instanceMatrix[3][2] * 0.27);
        float sway2 = cos(uTime * 1.1 + instanceMatrix[3][0] * 0.17);
        transformed.x += (sway * 0.16 + sway2 * 0.05) * max(transformed.y, 0.0);
        transformed.z += (cos(uTime * 1.4 + instanceMatrix[3][2] * 0.3) * 0.1) * max(transformed.y, 0.0);
      `);
    };
    this.grassMat = mat;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const colors = [0x6f8f42, 0x7fa24c, 0x5b7c37, 0x8cac56, 0x66883d, 0x9aad5c];
    const c = new THREE.Color();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 8) {
      guard++;
      const a = rand(0, TAU);
      const r = 5 + Math.pow(rng(), 0.55) * 124;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (pointInWater(x, z)) continue;
      let onPath = false;
      for (const path of PATHS) {
        for (let p = 0; p < path.length - 1; p++) {
          if (pointSegmentDistance(x, z, path[p][0], path[p][1], path[p + 1][0], path[p + 1][1]) < 2.4) { onPath = true; break; }
        }
        if (onPath) break;
      }
      if (onPath) continue;
      dummy.position.set(x, terrainHeight(x, z) - 0.02, z);
      dummy.rotation.set(0, rand(0, TAU), 0);
      const s = rand(0.7, 1.7);
      dummy.scale.set(s, s * rand(0.8, 1.4), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      c.set(pick(colors)).offsetHSL(rand(-0.02, 0.02), rand(-0.05, 0.05), rand(-0.06, 0.05));
      mesh.setColorAt(placed, c);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this.grass = mesh;

    // Ferns, larger and darker, concentrated in Fernhollow and the marsh.
    const fernCount = 320;
    const fern = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x4e7539, roughness: 1, side: THREE.DoubleSide }), fernCount);
    fern.frustumCulled = false;
    let f = 0;
    let fguard = 0;
    while (f < fernCount && fguard < fernCount * 10) {
      fguard++;
      const a = rand(0, TAU);
      const r = rand(20, 118);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const nearFern = Math.hypot(x - 56, z - 20) < 40 || Math.hypot(x - 65, z + 65) < 38 || Math.hypot(x + 55, z + 38) < 35;
      if (!nearFern || pointInWater(x, z)) continue;
      dummy.position.set(x, terrainHeight(x, z) - 0.02, z);
      dummy.rotation.set(0, rand(0, TAU), 0);
      const s = rand(1.8, 3.6);
      dummy.scale.set(s, s * rand(0.7, 1.2), s);
      dummy.updateMatrix();
      fern.setMatrixAt(f, dummy.matrix);
      f++;
    }
    fern.count = f;
    fern.instanceMatrix.needsUpdate = true;
    this.scene.add(fern);

    // Flowers.
    const flowerCount = 420;
    const flowers = new THREE.InstancedMesh(flowerGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), flowerCount);
    flowers.frustumCulled = false;
    let fl = 0, flGuard = 0;
    while (fl < flowerCount && flGuard < flowerCount * 8) {
      flGuard++;
      const a = rand(0, TAU);
      const r = 8 + Math.pow(rng(), 0.6) * 105;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInWater(x, z)) continue;
      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.set(0, rand(0, TAU), 0);
      const s = rand(0.6, 1.25);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      flowers.setMatrixAt(fl, dummy.matrix);
      fl++;
    }
    flowers.count = fl;
    flowers.instanceMatrix.needsUpdate = true;
    this.scene.add(flowers);

    // Decorative mushrooms.
    const mushCount = 180;
    const mushGeo = mushroomGeometry();
    const mushrooms = new THREE.InstancedMesh(mushGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), mushCount);
    mushrooms.frustumCulled = false;
    const capColors = [0xc9553f, 0xd8b16a, 0xa97a55, 0x8f6bae, 0xd4d0b0];
    let mi = 0, mg = 0;
    while (mi < mushCount && mg < mushCount * 10) {
      mg++;
      const a = rand(0, TAU);
      const r = 14 + Math.pow(rng(), 0.55) * 105;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInWater(x, z)) continue;
      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.set(0, rand(0, TAU), 0);
      const s = rand(0.5, 1.2);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mushrooms.setMatrixAt(mi, dummy.matrix);
      mushrooms.setColorAt(mi, c.set(pick(capColors)));
      mi++;
    }
    mushrooms.count = mi;
    mushrooms.instanceMatrix.needsUpdate = true;
    mushrooms.instanceColor.needsUpdate = true;
    this.scene.add(mushrooms);
  }

  buildDetails() {
    // Rocks.
    const rockCount = this.quality === 'low' ? 120 : 210;
    const geo = rockGeometry();
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, flatShading: true }), rockCount);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    const rockColors = [0x7a7768, 0x6b6c60, 0x8a8474, 0x5d6158, 0x746a5a];
    let ri = 0, guard = 0;
    while (ri < rockCount && guard < rockCount * 8) {
      guard++;
      const a = rand(0, TAU);
      const r = 12 + Math.pow(rng(), 0.5) * 115;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInWater(x, z)) continue;
      let nearPath = false;
      for (const path of PATHS) for (let p = 0; p < path.length - 1; p++) {
        if (pointSegmentDistance(x, z, path[p][0], path[p][1], path[p + 1][0], path[p + 1][1]) < 3) nearPath = true;
      }
      if (nearPath) continue;
      const s = rand(0.35, 2.1);
      dummy.position.set(x, terrainHeight(x, z) + s * 0.05, z);
      dummy.rotation.set(rand(-0.2, 0.2), rand(0, TAU), rand(-0.15, 0.15));
      dummy.scale.set(s * rand(0.8, 1.4), s * rand(0.5, 1.1), s * rand(0.8, 1.3));
      dummy.updateMatrix();
      mesh.setMatrixAt(ri, dummy.matrix);
      mesh.setColorAt(ri, c.set(pick(rockColors)).offsetHSL(0, 0, rand(-0.04, 0.04)));
      if (s > 0.8) this.addCollider(x, z, s * 0.72);
      ri++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);

    // Fallen logs.
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5b432c, roughness: 1, flatShading: true });
    const logGeo = new THREE.CylinderGeometry(0.28, 0.35, 3.2, 7);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU), r = rand(24, 110);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInWater(x, z)) continue;
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.set(x, terrainHeight(x, z) + 0.24, z);
      log.rotation.set(Math.PI / 2 + rand(-0.15, 0.15), rand(0, TAU), rand(-0.1, 0.1));
      log.scale.set(rand(0.7, 1.4), rand(0.7, 1.2), rand(0.7, 1.2));
      log.castShadow = true;
      log.receiveShadow = true;
      this.scene.add(log);
    }

    // Stumps.
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0x62452c, roughness: 1 });
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU), r = rand(25, 105);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInWater(x, z)) continue;
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.6, 7), stumpMat);
      stump.position.set(x, terrainHeight(x, z) + 0.3, z);
      stump.rotation.y = rand(0, TAU);
      stump.castShadow = true;
      this.scene.add(stump);
    }

    // Bone piles and skulls.
    this.addBones(-60, 78, 6, 8);
    this.addBones(72, 36, 3, 4);
    this.addBones(-66, 88, 4, 5);
  }

  makeBone(len = 0.8, radius = 0.05) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd7d1b8, roughness: 0.85 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.8, len, 5), mat);
    shaft.rotation.z = Math.PI / 2;
    g.add(shaft);
    for (const s of [-1, 1]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.8, 6, 4), mat);
      knob.position.x = s * len / 2;
      g.add(knob);
    }
    return g;
  }

  addBones(cx, cz, spread, count) {
    for (let i = 0; i < count; i++) {
      const x = cx + rand(-spread, spread), z = cz + rand(-spread, spread);
      const bone = this.makeBone(rand(0.5, 1.2), rand(0.035, 0.07));
      bone.position.set(x, terrainHeight(x, z) + 0.08, z);
      bone.rotation.y = rand(0, TAU);
      bone.rotation.x = rand(-0.3, 0.3);
      this.scene.add(bone);
    }
    const skull = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xd7d1b8, roughness: 0.85 });
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat);
    cranium.scale.set(1, 0.85, 1.15);
    skull.add(cranium);
    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 5), mat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.z = 0.45;
    skull.add(muzzle);
    for (const s of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0x17130f }));
      socket.position.set(s * 0.16, 0.08, 0.22);
      skull.add(socket);
    }
    skull.position.set(cx + rand(-1, 1), terrainHeight(cx, cz) + 0.3, cz + rand(-1, 1));
    skull.rotation.y = rand(0, TAU);
    this.scene.add(skull);
  }

  makeSign(text, sub, x, z, rot = 0) {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4b2d, roughness: 1 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 5), wood);
    post.position.y = 1.1;
    post.castShadow = true;
    group.add(post);
    const tex = canvasTex(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#c9a878';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(80,50,20,0.22)';
      for (let i = 0; i < 70; i++) ctx.fillRect(rand(0, w), rand(0, h), rand(10, 70), rand(1, 4));
      ctx.strokeStyle = '#6b4b2a';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#3c2a17';
      ctx.textAlign = 'center';
      ctx.font = 'bold 54px Georgia';
      ctx.fillText(text, w / 2, 108);
      ctx.font = 'italic 30px Georgia';
      ctx.fillStyle = '#5b4227';
      ctx.fillText(sub, w / 2, 166);
      ctx.beginPath();
      ctx.arc(w / 2, 208, 6, 0, TAU);
      ctx.fill();
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
    sign.position.y = 1.85;
    sign.castShadow = true;
    group.add(sign);
    group.position.set(x, terrainHeight(x, z), z);
    group.rotation.y = rot;
    this.scene.add(group);
    return group;
  }

  buildLandmarks() {
    this.makeSign('MOSSWOOD GLADE', 'the old den', 8, 2.5, -0.6);
    this.makeSign('ELDERWOOD', 'mind the roots', -43, -27, 0.7);
    this.makeSign('ASHEN RIDGE', 'bears about', -47, 51, 0.8);
    this.makeSign('MOONLIT MARSH', 'soft ground', 46, -52, 2.5);
    this.makeSign('CRYSTAL HOLLOW', 'listen closely', 8, -72, 0.2);

    for (const l of LANDMARKS) {
      this.landmarkMeshes[l.id] = new THREE.Group();
      this.landmarkMeshes[l.id].position.set(l.x, terrainHeight(l.x, l.z), l.z);
      this.scene.add(this.landmarkMeshes[l.id]);
      switch (l.id) {
        case 'den': this.buildDen(l); break;
        case 'fairy': this.buildFairyRing(l); break;
        case 'stones': this.buildStones(l); break;
        case 'elder': this.buildElderTree(l); break;
        case 'grotto': this.buildGrotto(l); break;
        case 'shrine': this.buildShrine(l); break;
        case 'abandoned': this.buildAbandonedDen(l); break;
        case 'lair': this.buildLair(l); break;
        case 'lookout': this.buildLookout(l); break;
      }
    }
  }

  buildDen(l) {
    const g = this.landmarkMeshes.den;
    const moundMat = new THREE.MeshStandardMaterial({ color: 0x5b4530, roughness: 1, flatShading: true });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8), moundMat);
    mound.scale.set(1.25, 0.7, 1);
    mound.position.y = 0.3;
    mound.castShadow = true;
    mound.receiveShadow = true;
    g.add(mound);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.2, 18), new THREE.MeshBasicMaterial({ color: 0x120d09 }));
    hole.position.set(0, 0.6, 2.9);
    hole.rotation.x = -0.12;
    g.add(hole);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 6, 20), moundMat);
    rim.position.set(0, 0.6, 2.88);
    g.add(rim);
    for (let i = 0; i < 6; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.25, 0.6), 0), new THREE.MeshStandardMaterial({ color: 0x6b6759, roughness: 1, flatShading: true }));
      rock.position.set(rand(-3.2, 3.2), 0.2, rand(-2, 2.8));
      g.add(rock);
    }
    this.addCollider(l.x, l.z, 2.6);

    // Campfire.
    const fx = this.restSpot.x, fz = this.restSpot.z;
    const fireGroup = new THREE.Group();
    fireGroup.position.set(fx, terrainHeight(fx, fz), fz);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.15, 0.28), 0), stoneMat);
      stone.position.set(Math.cos(a) * 0.85, 0.12, Math.sin(a) * 0.85);
      fireGroup.add(stone);
    }
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4d3520, roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 5), logMat);
      log.position.set(0, 0.18, 0);
      log.rotation.set(Math.PI / 2.2, (i / 3) * TAU, 0);
      fireGroup.add(log);
    }
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26 - i * 0.05, 0.9 - i * 0.18, 6), flameMat.clone());
      flame.material.color.setHex(i === 0 ? 0xff7a2d : i === 1 ? 0xffc15c : 0xfff0b0);
      flame.position.y = 0.5 + i * 0.12;
      flame.userData.baseY = flame.position.y;
      fireGroup.add(flame);
      this.fireMeshes.push(flame);
    }
    const light = new THREE.PointLight(0xff9a4d, 14, 14, 1.7);
    light.position.y = 1.1;
    fireGroup.add(light);
    this.fireLight = light;
    this.scene.add(fireGroup);
    this.fireGroup = fireGroup;
    // Log seats.
    for (let i = 0; i < 2; i++) {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 1.8, 7), logMat);
      seat.rotation.z = Math.PI / 2;
      seat.rotation.y = i * 1.2;
      seat.position.set(fx + (i === 0 ? 1.8 : -1.6), terrainHeight(fx, fz) + 0.3, fz + (i === 0 ? 0.8 : -0.9));
      seat.castShadow = true;
      this.scene.add(seat);
    }
    // Quest board.
    const board = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4026, roughness: 1 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.8, 5), postMat);
      post.position.set(s * 0.7, 0.9, 0);
      board.add(post);
    }
    const btex = canvasTex(512, 320, (ctx, w, h) => {
      ctx.fillStyle = '#c7a676'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#5d4024'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.fillStyle = '#3d2b18'; ctx.textAlign = 'center'; ctx.font = 'bold 46px Georgia';
      ctx.fillText('FOREST BOUNTIES', w / 2, 70);
      ctx.font = '26px Georgia';
      ctx.fillText('Truffles wanted', w / 2, 130);
      ctx.fillText('Wolves driven off', w / 2, 170);
      ctx.fillText('Secrets found', w / 2, 210);
      ctx.fillStyle = '#7b4f2d'; ctx.fillRect(90, 240, w - 180, 3);
      ctx.font = 'italic 24px Georgia'; ctx.fillStyle = '#5a4028';
      ctx.fillText('ask Old Root', w / 2, 285);
    });
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshStandardMaterial({ map: btex, roughness: 0.9, side: THREE.DoubleSide }));
    boardMesh.position.y = 1.45;
    boardMesh.castShadow = true;
    board.add(boardMesh);
    board.position.set(-2.2, terrainHeight(fx - 2.2, fz + 1), fz + 1);
    board.rotation.y = 0.4;
    this.scene.add(board);
  }

  buildFairyRing(l) {
    const g = this.landmarkMeshes.fairy;
    const mushMat = new THREE.MeshStandardMaterial({ color: 0xd7e8ff, emissive: 0x9dd8ff, emissiveIntensity: 0.7, roughness: 0.7 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xe6dfcb, roughness: 0.9 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const r = 3.3 + Math.sin(i * 2.7) * 0.25;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.55, 6), stemMat);
      stem.position.set(x, 0.27, z);
      g.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, TAU, 0, Math.PI / 2), mushMat);
      cap.scale.y = 0.55;
      cap.position.set(x, 0.55, z);
      g.add(cap);
    }
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 7), new THREE.MeshStandardMaterial({ color: 0x6b7464, roughness: 1, flatShading: true }));
    altar.position.y = 0.25;
    g.add(altar);
    const light = new THREE.PointLight(0xa8e6ff, 5, 12, 1.8);
    light.position.y = 1.2;
    g.add(light);
    this.glowSprites.push({ sprite: this.addGlowSprite(g, 0xa8e6ff, 5, 1.3), base: 5, phase: 0 });
  }

  addGlowSprite(parent, color, scale, y) {
    const mat = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    s.position.y = y;
    parent.add(s);
    return s;
  }

  buildStones(l) {
    const g = this.landmarkMeshes.stones;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x77786b, roughness: 1, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const r = 6;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = rand(2.2, 3.8);
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(rand(0.4, 0.65), rand(0.6, 0.9), h, 5), stoneMat);
      stone.position.set(x, h / 2, z);
      stone.rotation.set(rand(-0.1, 0.1), rand(0, TAU), rand(-0.1, 0.1));
      stone.castShadow = true;
      g.add(stone);
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.55), new THREE.MeshBasicMaterial({ color: 0x9ce6b6, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      rune.position.set(x * 0.98, h * 0.55, z * 0.98);
      rune.lookAt(0, h * 0.55, 0);
      g.add(rune);
      this.addCollider(l.x + x, l.z + z, 0.65);
    }
    const center = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.35, 8), stoneMat);
    center.position.y = 0.18;
    center.receiveShadow = true;
    g.add(center);
    const glow = this.addGlowSprite(g, 0x9ce6b6, 4, 0.7);
    this.glowSprites.push({ sprite: glow, base: 4, phase: 1.3 });
  }

  buildElderTree(l) {
    const g = this.landmarkMeshes.elder;
    const bark = new THREE.MeshStandardMaterial({ color: 0x4b3827, roughness: 1, flatShading: true });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.4, 15, 10), bark);
    trunk.position.y = 7.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    g.add(trunk);
    // Roots.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.2;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.7, 5.2, 6), bark);
      root.position.set(Math.cos(a) * 2.8, 1.1, Math.sin(a) * 2.8);
      root.rotation.z = Math.PI / 2.7 * Math.cos(a);
      root.rotation.x = Math.PI / 2.7 * Math.sin(a);
      root.castShadow = true;
      g.add(root);
    }
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f6b3c, roughness: 0.95, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const r = i === 0 ? 0 : rand(2.5, 5.5);
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(3, 5), 1), leafMat);
      canopy.position.set(Math.cos(a) * r, rand(13, 18), Math.sin(a) * r);
      canopy.scale.y = 0.75;
      canopy.castShadow = true;
      g.add(canopy);
    }
    // Runes and fireflies.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.7), new THREE.MeshBasicMaterial({ color: 0xa8ffc8, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      rune.position.set(Math.cos(a) * 2.9, 2.6 + (i % 3) * 1.2, Math.sin(a) * 2.9);
      rune.lookAt(0, rune.position.y, 0);
      g.add(rune);
    }
    const light = new THREE.PointLight(0x9dffc4, 7, 24, 1.8);
    light.position.y = 6;
    g.add(light);
    const glow = this.addGlowSprite(g, 0x9dffc4, 14, 8);
    this.glowSprites.push({ sprite: glow, base: 14, phase: 2.1 });
    this.addCollider(l.x, l.z, 3.1);
  }

  buildGrotto(l) {
    const g = this.landmarkMeshes.grotto;
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555766, roughness: 1, flatShading: true });
    // U-shaped rock walls with a dark back.
    const defs = [
      [-5.2, -1.5, 2.6], [-4.6, 3.4, 2.3], [-2.2, 6.1, 2.4], [2.2, 6.1, 2.4], [4.6, 3.4, 2.3], [5.2, -1.5, 2.6],
      [-5.6, 2.2, 2.1], [5.6, 2.2, 2.1], [0, 6.8, 3.2],
    ];
    for (const [x, z, s] of defs) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
      rock.position.set(x, s * 0.55, z);
      rock.rotation.set(rand(-0.2, 0.2), rand(0, TAU), rand(-0.2, 0.2));
      rock.scale.set(1, rand(0.9, 1.4), 1);
      rock.castShadow = true;
      rock.receiveShadow = true;
      g.add(rock);
      this.addCollider(l.x + x, l.z + z, s * 0.72);
    }
    const roof = new THREE.Mesh(new THREE.DodecahedronGeometry(4.2, 0), rockMat);
    roof.position.set(0, 5.0, 2.8);
    roof.scale.set(1.5, 0.55, 1.1);
    roof.rotation.y = 0.3;
    roof.castShadow = true;
    g.add(roof);
    const back = new THREE.Mesh(new THREE.CircleGeometry(4.6, 20), new THREE.MeshBasicMaterial({ color: 0x07080c }));
    back.position.set(0, 2.2, 4.6);
    back.rotation.y = Math.PI;
    g.add(back);
    // Crystals.
    const crystalColors = [0x9a7dff, 0x6fd8ff, 0xb38cff, 0x7affd7];
    for (let i = 0; i < 14; i++) {
      const color = pick(crystalColors);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.92 });
      const h = rand(0.6, 2.4);
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(rand(0.15, 0.4), h, 5), mat);
      crystal.position.set(rand(-4, 4), h * 0.45, rand(-1, 4));
      crystal.rotation.set(rand(-0.4, 0.4), rand(0, TAU), rand(-0.4, 0.4));
      g.add(crystal);
      this.crystals.push(crystal);
    }
    const light = new THREE.PointLight(0x9a7dff, 10, 20, 1.8);
    light.position.set(0, 2.6, 2);
    g.add(light);
    this.grottoLight = light;
    const glow = this.addGlowSprite(g, 0x9a7dff, 9, 2.5);
    this.glowSprites.push({ sprite: glow, base: 9, phase: 3.2 });
  }

  buildShrine(l) {
    const g = this.landmarkMeshes.shrine;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6d7568, roughness: 1, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.2;
      const r = 5.2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = i % 2 ? rand(1.4, 2.6) : rand(3.2, 4.5);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, h, 7), stoneMat);
      col.position.set(x, h / 2, z);
      col.castShadow = true;
      g.add(col);
      if (i % 2 === 0) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3), stoneMat);
        cap.position.set(x, h + 0.15, z);
        g.add(cap);
      }
      this.addCollider(l.x + x, l.z + z, 0.6);
    }
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.2), stoneMat);
    altar.position.y = 0.35;
    altar.castShadow = true;
    g.add(altar);
    const glow = this.addGlowSprite(g, 0x8fe4ff, 5, 1.4);
    this.glowSprites.push({ sprite: glow, base: 5, phase: 1.7 });
    const light = new THREE.PointLight(0x8fe4ff, 5, 14, 1.8);
    light.position.y = 1.6;
    g.add(light);
  }

  buildAbandonedDen(l) {
    const g = this.landmarkMeshes.abandoned;
    const mat = new THREE.MeshStandardMaterial({ color: 0x5f4a34, roughness: 1, flatShading: true });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(3, 11, 8), mat);
    mound.scale.set(1.3, 0.62, 1.1);
    mound.position.y = 0.25;
    mound.castShadow = true;
    g.add(mound);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0x0d0b08 }));
    hole.position.set(0.5, 0.42, 2.55);
    g.add(hole);
    this.addBones(l.x + 1, l.z + 3, 2, 4);
    const glow = this.addGlowSprite(g, 0xffd37a, 3.5, 1.0);
    this.glowSprites.push({ sprite: glow, base: 3.5, phase: 0.8 });
    this.addCollider(l.x, l.z, 2.4);
  }

  buildLair(l) {
    const g = this.landmarkMeshes.lair;
    const mat = new THREE.MeshStandardMaterial({ color: 0x4c4a43, roughness: 1, flatShading: true });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const r = 6.5;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1.6, 2.7), 0), mat);
      rock.position.set(x, rand(1.2, 2.4), z);
      rock.rotation.set(rand(-0.2, 0.2), rand(0, TAU), rand(-0.2, 0.2));
      rock.castShadow = true;
      g.add(rock);
      this.addCollider(l.x + x, l.z + z, 1.8);
    }
    const back = new THREE.Mesh(new THREE.CircleGeometry(5.4, 20), new THREE.MeshBasicMaterial({ color: 0x090807 }));
    back.position.set(0, 2.3, 4.4);
    g.add(back);
    // Claw marks.
    const clawMat = new THREE.MeshBasicMaterial({ color: 0x2a241d });
    for (let i = 0; i < 4; i++) {
      const claw = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.5), clawMat);
      claw.position.set(-3.5 + i * 0.35, 2.2, 4.32);
      claw.rotation.z = 0.25;
      g.add(claw);
    }
    this.addBones(l.x, l.z + 2, 5, 10);
    const light = new THREE.PointLight(0xff7040, 4, 16, 1.8);
    light.position.set(0, 1.8, 2);
    g.add(light);
  }

  buildLookout(l) {
    const g = this.landmarkMeshes.lookout;
    const mat = new THREE.MeshStandardMaterial({ color: 0x737668, roughness: 1, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, rand(1.4, 2.2), 6), mat);
      stone.position.set(Math.cos(a) * 2, 1, Math.sin(a) * 2);
      stone.castShadow = true;
      g.add(stone);
    }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.6), new THREE.MeshStandardMaterial({ color: 0x8c3f32, roughness: 1, side: THREE.DoubleSide }));
    banner.position.set(0, 2.4, 0);
    banner.rotation.y = 0.3;
    g.add(banner);
    const glow = this.addGlowSprite(g, 0xffe6a0, 4, 2);
    this.glowSprites.push({ sprite: glow, base: 4, phase: 2.7 });
  }

  buildChests() {
    for (const spot of CHEST_SPOTS) {
      const chest = this.makeChest(spot);
      this.chests.push(chest);
    }
  }

  makeChest(spot) {
    const group = new THREE.Group();
    const y = terrainHeight(spot.x, spot.z);
    group.position.set(spot.x, y, spot.z);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4528, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd5a94d, metalness: 0.7, roughness: 0.3, emissive: 0x3b2a08, emissiveIntensity: 0.3 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.05), wood);
    base.position.y = 0.44;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    for (const x of [-0.55, 0.55]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 1.1), gold);
      band.position.set(x, 0.45, 0);
      group.add(band);
    }
    const lid = new THREE.Group();
    lid.position.set(0, 0.86, -0.52);
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 1.05), dark);
    lidMesh.position.set(0, 0.18, 0.52);
    lidMesh.castShadow = true;
    lid.add(lidMesh);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.08), gold);
    lock.position.set(0, 0.0, 1.06);
    lid.add(lock);
    group.add(lid);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd36a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(3.2, 3.2, 1);
    glow.position.y = 1;
    group.add(glow);
    group.rotation.y = rand(0, TAU);
    this.scene.add(group);
    return {
      ...spot, group, lid, glow, opened: false, openT: 0, baseY: y,
      radius: 2.2, sparkle: 0,
    };
  }

  buildCollectibles() {
    for (let i = 0; i < COLLECTIBLE_SPOTS.length; i++) {
      const [x, z] = COLLECTIBLE_SPOTS[i];
      const group = new THREE.Group();
      const y = terrainHeight(x, z);
      group.position.set(x, y + 0.75, z);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe0a83c, metalness: 0.45, roughness: 0.35, emissive: 0x6b3d00, emissiveIntensity: 0.35 }));
      body.scale.y = 1.15;
      group.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 5, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a4c22, roughness: 0.8 }));
      cap.position.y = 0.14;
      cap.scale.y = 0.6;
      group.add(cap);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0x5b3a1c }));
      stem.position.y = 0.3;
      group.add(stem);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd35e, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(1.4, 1.4, 1);
      group.add(glow);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.015, 4, 20), new THREE.MeshBasicMaterial({ color: 0xffdd7a, transparent: true, opacity: 0.55 }));
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      this.scene.add(group);
      this.collectibles.push({ id: 'acorn' + i, x, z, group, taken: false, phase: rand(0, TAU), ring });
    }
  }

  buildAmbient() {
    this.leaves = new FallingLeaves(this.scene, this.quality === 'low' ? 50 : 100);
    this.fireflies = new Fireflies(this.scene, this.quality === 'low' ? 80 : 160);
    this.motes = new ParticleSystem(this.scene, 260, true);
    this.moteTimer = 0;

    // Drifting mist banks in the marsh.
    const mistTex = glowTexture();
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.SpriteMaterial({ map: mistTex, color: 0xd7e6dc, transparent: true, opacity: rand(0.06, 0.14), depthWrite: false });
      const s = new THREE.Sprite(mat);
      const a = rand(0, TAU), r = rand(0, 28);
      s.position.set(65 + Math.cos(a) * r, this.waterLevels().marsh + rand(0.2, 1.2), -65 + Math.sin(a) * r);
      s.scale.set(rand(10, 22), rand(3, 6), 1);
      this.scene.add(s);
      this.mist.push({ sprite: s, baseY: s.position.y, phase: rand(0, 10), drift: rand(0.05, 0.2) });
    }

    // Birds circling high above the valley.
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x2f2a22, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const bird = new THREE.Group();
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0, 0.8, 0.1, 0.15, 0.2, 0, 0.5,
      ], 3));
      wingGeo.computeVertexNormals();
      const left = new THREE.Mesh(wingGeo, birdMat);
      const right = new THREE.Mesh(wingGeo, birdMat);
      right.scale.x = -1;
      bird.add(left, right);
      bird.userData = { left, right, radius: rand(45, 95), speed: rand(0.05, 0.12), phase: rand(0, TAU), height: rand(24, 42) };
      this.scene.add(bird);
      this.birds.push(bird);
    }

    // Butterflies near the glade.
    const bfGeo = new THREE.PlaneGeometry(0.22, 0.16);
    const bfMat = new THREE.MeshBasicMaterial({ color: 0xffe28a, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    this.butterflies = [];
    for (let i = 0; i < 18; i++) {
      const bf = new THREE.Mesh(bfGeo, bfMat.clone());
      bf.material.color.setHex(pick([0xffe28a, 0xffb4c8, 0xc8e6ff, 0xffd1a1]));
      bf.userData = { cx: rand(-30, 40), cz: rand(-25, 35), phase: rand(0, 10), speed: rand(0.5, 1.4), r: rand(1, 5), h: rand(0.8, 2.2) };
      this.scene.add(bf);
      this.butterflies.push(bf);
    }
  }

  buildSpatialGrid() {
    this.grid = new Map();
    const cell = 10;
    for (const c of this.colliders) {
      const gx = Math.floor(c.x / cell);
      const gz = Math.floor(c.z / cell);
      const key = gx + ',' + gz;
      if (!this.grid.has(key)) this.grid.set(key, []);
      this.grid.get(key).push(c);
    }
    this.cell = cell;
  }

  resolveCollision(x, z, radius) {
    const cell = this.cell;
    const gx = Math.floor(x / cell);
    const gz = Math.floor(z / cell);
    let px = x, pz = z;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const arr = this.grid.get((gx + ox) + ',' + (gz + oz));
        if (!arr) continue;
        for (const c of arr) {
          const dx = px - c.x;
          const dz = pz - c.z;
          const d = Math.hypot(dx, dz);
          const min = c.r + radius;
          if (d < min && d > 0.0001) {
            const push = (min - d);
            px += (dx / d) * push;
            pz += (dz / d) * push;
          }
        }
      }
    }
    return { x: px, z: pz };
  }

  update(dt, playerPos, clock, nightFactor) {
    this.time += dt;
    const t = this.time;
    for (const m of this.waterMeshes) m.uniforms.uTime.value = t;
    if (this.grassMat) this.grassMat.userData.time.value = t;

    // Sky and sun.
    const day = clock; // 0..24
    const sunAngle = ((day - 6) / 12) * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(sunAngle), Math.sin(sunAngle), 0.35).normalize();
    this.sun.position.copy(playerPos).addScaledVector(sunDir, 75);
    this.sun.position.y = Math.max(8, this.sun.position.y);
    this.sun.target.position.copy(playerPos);
    this.sun.target.updateMatrixWorld();
    const daylight = clamp(Math.sin(sunAngle), 0, 1);
    const dusk = smoothstep(0.0, 0.35, Math.abs(day - 18.5));
    const warm = 1 - smoothstep(7, 10, day) * (1 - smoothstep(17, 20, day));
    const sunColor = new THREE.Color(0xffd7a0);
    if (day > 18 || day < 7) sunColor.setHex(0xff9d6a);
    this.sun.color.copy(sunColor);
    this.sun.intensity = lerp(0.25, 2.5, Math.pow(daylight, 0.55));
    this.hemi.intensity = lerp(0.35, 1.05, daylight);
    this.hemi.color.setHex(day > 19 || day < 6 ? 0x8ca6d8 : 0xffeccb);
    this.ambient.intensity = lerp(0.16, 0.3, daylight);

    const topDay = new THREE.Color(0x5f86ad);
    const topNight = new THREE.Color(0x121c38);
    const bottomDay = new THREE.Color(0xf0cf94);
    const bottomNight = new THREE.Color(0x2a3550);
    this.skyMat.uniforms.topColor.value.copy(topNight).lerp(topDay, daylight);
    this.skyMat.uniforms.bottomColor.value.copy(bottomNight).lerp(bottomDay, daylight);
    this.skyMat.uniforms.sunColor.value.copy(sunColor);
    this.skyMat.uniforms.sunDir.value.copy(sunDir);
    this.sunSprite.position.copy(playerPos).addScaledVector(sunDir, 360);
    this.sunSprite.material.opacity = clamp(daylight * 1.2, 0, 0.95);
    this.sunSprite.material.color.copy(sunColor);
    const moonDir = new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z);
    this.moonSprite.position.copy(playerPos).addScaledVector(moonDir, 340);
    this.moonSprite.material.opacity = clamp((1 - daylight) * 0.75, 0, 0.75);
    this.scene.fog.color.copy(bottomNight).lerp(bottomDay, daylight).lerp(new THREE.Color(0x9fb48a), 0.25);
    this.scene.fog.near = lerp(28, 55, daylight);
    this.scene.fog.far = lerp(150, 220, daylight);
    this.renderer?.setClearColor?.(this.scene.fog.color);

    // Fire flicker.
    if (this.fireLight) {
      const flicker = 0.82 + Math.sin(t * 9.3) * 0.08 + Math.sin(t * 17.7) * 0.05;
      this.fireLight.intensity = 11 * flicker;
      for (let i = 0; i < this.fireMeshes.length; i++) {
        const f = this.fireMeshes[i];
        f.scale.y = 0.85 + Math.sin(t * (10 + i * 2) + i) * 0.18;
        f.scale.x = f.scale.z = 0.9 + Math.cos(t * (8 + i) + i) * 0.12;
        f.position.y = f.userData.baseY + Math.sin(t * 7 + i) * 0.04;
      }
      if (Math.random() < dt * 5) {
        this.game.effects?.spawn({
          x: this.fireGroup.position.x + rand(-0.3, 0.3),
          y: this.fireGroup.position.y + 0.8,
          z: this.fireGroup.position.z + rand(-0.3, 0.3),
          vx: rand(-0.3, 0.3), vy: rand(0.8, 1.8), vz: rand(-0.3, 0.3),
          life: rand(0.8, 1.8), size: rand(0.4, 1), r: 1, g: rand(0.35, 0.65), b: 0.12,
          gravity: -0.1, drag: 0.4,
        });
      }
    }
    if (this.crystals.length) {
      for (let i = 0; i < this.crystals.length; i++) {
        const c = this.crystals[i];
        c.material.emissiveIntensity = 1.1 + Math.sin(t * 1.4 + i) * 0.45;
      }
    }
    for (const g of this.glowSprites) {
      g.sprite.material.opacity = 0.18 + Math.sin(t * 1.3 + g.phase) * 0.08;
      const s = g.base * (0.95 + Math.sin(t * 0.9 + g.phase) * 0.05);
      g.sprite.scale.set(s, s, 1);
    }

    // Chest lids.
    for (const c of this.chests) {
      if (c.openT > 0) {
        c.openT = Math.max(0, c.openT - dt * 2.4);
        c.lid.rotation.x = lerp(0, -1.35, 1 - c.openT);
      }
      if (c.opened) c.glow.material.opacity = 0.05;
      else c.glow.material.opacity = 0.18 + Math.sin(t * 1.7 + c.x) * 0.06;
    }

    // Collectibles bob.
    for (const c of this.collectibles) {
      if (c.taken) continue;
      c.phase += dt;
      c.group.position.y = terrainHeight(c.x, c.z) + 0.78 + Math.sin(c.phase * 1.8) * 0.12;
      c.group.rotation.y += dt * 0.9;
      c.ring.rotation.z += dt * 0.7;
      c.ring.material.opacity = 0.35 + Math.sin(c.phase * 2.2) * 0.2;
    }

    this.leaves.update(dt, playerPos);
    this.fireflies.update(dt, playerPos, nightFactor);

    // Sun motes / pollen.
    this.moteTimer -= dt;
    if (this.moteTimer <= 0 && daylight > 0.25) {
      this.moteTimer = 0.06;
      const a = rand(0, TAU), r = rand(2, 20);
      this.motes.spawn({
        x: playerPos.x + Math.cos(a) * r,
        y: playerPos.y + rand(0.4, 4.5),
        z: playerPos.z + Math.sin(a) * r,
        vx: rand(-0.1, 0.1), vy: rand(-0.03, 0.08), vz: rand(-0.1, 0.1),
        life: rand(2, 5), size: rand(0.3, 0.7), r: 1, g: 0.9, b: 0.55,
        gravity: -0.02, drag: 0.2,
      });
    }
    this.motes.update(dt);

    // Mist drift.
    for (const m of this.mist) {
      m.phase += dt * (m.drift || 0.1);
      if (m.drift) {
        m.sprite.position.y = m.baseY + Math.sin(m.phase) * 0.3;
        m.sprite.material.opacity = 0.07 + Math.sin(m.phase * 0.8) * 0.03;
      } else {
        m.sprite.position.x += Math.sin(m.phase * 0.4) * dt * 0.6;
      }
    }

    // Birds.
    for (const b of this.birds) {
      const u = b.userData;
      u.phase += dt * u.speed;
      const x = Math.cos(u.phase) * u.radius;
      const z = Math.sin(u.phase) * u.radius;
      b.position.set(x, u.height + Math.sin(u.phase * 2.3) * 2, z);
      b.rotation.y = -u.phase + Math.PI / 2;
      const flap = Math.sin(t * 9 + u.phase * 5) * 0.5;
      u.left.rotation.z = flap;
      u.right.rotation.z = -flap;
    }
    for (const bf of this.butterflies) {
      const u = bf.userData;
      u.phase += dt * u.speed;
      bf.position.set(u.cx + Math.cos(u.phase) * u.r, terrainHeight(u.cx, u.cz) + u.h + Math.sin(u.phase * 2.1) * 0.3, u.cz + Math.sin(u.phase * 0.8) * u.r);
      bf.rotation.y = u.phase;
      bf.rotation.z = Math.sin(u.phase * 3) * 0.4;
    }
  }

  findChestNear(x, z, radius = 2.4) {
    let best = null, bd = radius;
    for (const c of this.chests) {
      if (c.opened) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  findCollectibleNear(x, z, radius = 2) {
    let best = null, bd = radius;
    for (const c of this.collectibles) {
      if (c.taken) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  openChest(chest) {
    chest.opened = true;
    chest.openT = 1;
    chest.lid.rotation.x = -1.35;
    chest.glow.material.opacity = 0.04;
  }

  takeCollectible(item) {
    item.taken = true;
    item.group.visible = false;
  }

  resetChests() {
    for (const c of this.chests) {
      c.opened = false;
      c.openT = 0;
      c.lid.rotation.x = 0;
      c.glow.material.opacity = 0.2;
    }
    for (const c of this.collectibles) {
      c.taken = false;
      c.group.visible = true;
    }
  }
}
