import * as THREE from '../vendor/three.module.js';
import { clamp, rand, terrainHeight, pointInWater, TAU, pick, smoothstep } from './utils.js';
import { TRUFFLES, MUSHROOMS, RARITY, REGIONS } from './data.js';

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const glowTex = glowTexture();

function makeMound(color = 0x5c4630) {
  const g = new THREE.Group();
  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 6, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
  );
  mound.scale.set(1.2, 0.35, 1.1);
  mound.position.y = 0.01;
  mound.receiveShadow = true;
  g.add(mound);
  for (let i = 0; i < 4; i++) {
    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(rand(0.04, 0.09), 0),
      new THREE.MeshStandardMaterial({ color: 0x7a6b50, roughness: 1, flatShading: true })
    );
    const a = rand(0, TAU), r = rand(0.25, 0.55);
    pebble.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
    g.add(pebble);
  }
  return g;
}

function makeSpecialMushroom(def) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.42, 6),
    new THREE.MeshStandardMaterial({ color: 0xe4dbc5, roughness: 0.9 })
  );
  stem.position.y = 0.21;
  g.add(stem);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 6, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.glow, emissiveIntensity: 0.65, roughness: 0.55 })
  );
  cap.scale.y = 0.62;
  cap.position.y = 0.42;
  cap.castShadow = true;
  g.add(cap);
  for (let i = 0; i < 4; i++) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 5, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: def.glow, emissiveIntensity: 0.7 })
    );
    const a = (i / 4) * TAU;
    spot.position.set(Math.cos(a) * 0.16, 0.5, Math.sin(a) * 0.16);
    spot.scale.y = 0.4;
    g.add(spot);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: def.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.8, 1.8, 1);
  glow.position.y = 0.45;
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

export class TruffleManager {
  constructor(game) {
    this.game = game;
    this.truffles = [];
    this.mushrooms = [];
    this.maxTruffles = game.quality === 'low' ? 34 : 46;
    this.respawnTimer = 4;
    this.mushroomRespawnTimer = 20;
    this.sniffed = false;
    this.revealed = [];
    this.scentPulse = 0;
    this.seedSpecials();
    for (let i = 0; i < this.maxTruffles - 3; i++) this.spawnTruffle();
    for (let i = 0; i < 16; i++) this.spawnMushroom();
  }

  seedSpecials() {
    this.spawnTruffle(4, -97, 'heart');
    this.spawnTruffle(-53, -43, 'golden');
    this.spawnTruffle(-22, -16, 'white');
  }

  regionAt(x, z) {
    let best = REGIONS[0], bd = 1e9;
    for (const r of REGIONS) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  rollTruffle(x, z) {
    const region = this.regionAt(x, z);
    const rareSkill = this.game.player?.stats?.rareFind ?? 0;
    let weights = { ...Object.fromEntries(TRUFFLES.map((t) => [t.id, RARITY[t.rarity].weight])) };
    if (region.id === 'elder') { weights.golden += 7; weights.white += 8; }
    if (region.id === 'crystal') { weights.heart += 3; weights.golden += 4; }
    if (region.id === 'ashen') { weights.golden += 3; }
    if (region.id === 'marsh') { weights.white += 8; weights.heart += 1; }
    weights.golden *= 1 + rareSkill * 0.12;
    weights.heart *= 1 + rareSkill * 0.12;
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let chosen = TRUFFLES[0];
    for (const t of TRUFFLES) {
      roll -= weights[t.id];
      if (roll <= 0) { chosen = t; break; }
    }
    return chosen;
  }

  spawnTruffle(x = null, z = null, forceId = null) {
    let tries = 0;
    if (x === null) {
      do {
        const a = rand(0, TAU);
        const r = rand(10, 116);
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        tries++;
      } while (tries < 80 && (pointInWater(x, z) || this.tooClose(x, z)));
    }
    if (pointInWater(x, z)) return null;
    const type = forceId ? TRUFFLES.find((t) => t.id === forceId) : this.rollTruffle(x, z);
    const group = new THREE.Group();
    const y = terrainHeight(x, z);
    group.position.set(x, y, z);
    const mound = makeMound(type.rarity === 'legendary' ? 0x4a5a48 : type.rarity === 'rare' ? 0x5c4a2a : 0x5b4530);
    group.add(mound);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: type.glow, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(type.rarity === 'legendary' ? 2.8 : 1.6, type.rarity === 'legendary' ? 2.8 : 1.6, 1);
    glow.position.y = 0.35;
    group.add(glow);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.66, 22),
      new THREE.MeshBasicMaterial({ color: type.glow, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);
    const wisp = new THREE.Group();
    const wispSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: type.glow, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    wispSprite.scale.set(0.55, 0.55, 1);
    wisp.add(wispSprite);
    wisp.position.y = 0.65;
    wisp.visible = false;
    group.add(wisp);
    this.game.scene.add(group);
    const item = {
      id: 'truffle-' + Math.random().toString(36).slice(2), type, x, z, y,
      group, glow, ring, wisp, dug: false, phase: rand(0, TAU), reveal: 0, emitted: 0,
    };
    this.truffles.push(item);
    return item;
  }

  tooClose(x, z) {
    if (Math.hypot(x, z) < 7) return true;
    for (const t of this.truffles) {
      if (Math.hypot(t.x - x, t.z - z) < 4) return true;
    }
    return false;
  }

  spawnMushroom() {
    const def = pick(MUSHROOMS);
    let x, z, tries = 0;
    do {
      const a = rand(0, TAU);
      const r = rand(14, 112);
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      tries++;
    } while (tries < 60 && (pointInWater(x, z) || this.tooClose(x, z)));
    const group = makeSpecialMushroom(def);
    const y = terrainHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = rand(0, TAU);
    this.game.scene.add(group);
    this.mushrooms.push({ id: 'mush-' + Math.random().toString(36).slice(2), def, x, z, group, taken: false, phase: rand(0, TAU) });
  }

  update(dt, player, sniffTimer, smellRadius) {
    const sniffing = sniffTimer > 0;
    this.sniffed = sniffing;
    this.revealed = [];
    const effects = this.game.effects;
    for (const t of this.truffles) {
      if (t.dug) continue;
      const d = Math.hypot(t.x - player.pos.x, t.z - player.pos.z);
      const inRange = sniffing && d < smellRadius;
      if (inRange) this.revealed.push(t);
      const target = inRange ? 1 : (t.type.rarity === 'legendary' ? 0.32 : t.type.rarity === 'rare' ? 0.14 : 0.04);
      t.reveal += (target - t.reveal) * Math.min(1, dt * 7);
      t.phase += dt;
      t.glow.material.opacity = t.reveal * (0.38 + Math.sin(t.phase * 3.1) * 0.13);
      t.glow.position.y = 0.32 + Math.sin(t.phase * 1.8) * 0.1;
      t.ring.material.opacity = inRange ? 0.55 + Math.sin(t.phase * 2.6) * 0.2 : 0;
      t.ring.rotation.z += dt * 0.8;
      t.ring.scale.setScalar(1 + Math.sin(t.phase * 2) * 0.08);
      t.wisp.visible = inRange;
      if (inRange) {
        t.wisp.position.y = 0.72 + Math.sin(t.phase * 2.3) * 0.16;
        t.wisp.position.x = Math.sin(t.phase * 1.3) * 0.1;
        t.wispSprite = t.wisp.children[0];
        t.wisp.children[0].material.opacity = 0.5 + Math.sin(t.phase * 4) * 0.25;
      }
      // A faint shimmer even without sniffing, so the forest feels alive.
      if (!inRange && d < 24 && Math.random() < dt * 0.4) {
        effects?.spawn({
          x: t.x + rand(-0.4, 0.4), y: t.y + 0.2, z: t.z + rand(-0.4, 0.4),
          vx: rand(-0.1, 0.1), vy: rand(0.15, 0.4), vz: rand(-0.1, 0.1),
          life: rand(0.5, 1.1), size: rand(0.25, 0.55), r: new THREE.Color(t.type.glow).r,
          g: new THREE.Color(t.type.glow).g, b: new THREE.Color(t.type.glow).b,
          gravity: -0.1, drag: 0.5,
        });
      }
      if (inRange && Math.random() < dt * 2.2) {
        const c = new THREE.Color(t.type.glow);
        effects?.spawn({
          x: t.x + rand(-0.25, 0.25), y: t.y + rand(0.15, 0.5), z: t.z + rand(-0.25, 0.25),
          vx: rand(-0.2, 0.2), vy: rand(0.5, 1.1), vz: rand(-0.2, 0.2),
          life: rand(0.6, 1.4), size: rand(0.35, 0.8), r: c.r, g: c.g, b: c.b,
          gravity: -0.2, drag: 0.5,
        });
      }
    }
    for (const m of this.mushrooms) {
      if (m.taken) continue;
      m.phase += dt;
      m.group.position.y = terrainHeight(m.x, m.z) + Math.sin(m.phase * 1.4) * 0.025;
      const glow = m.group.userData.glow;
      glow.material.opacity = 0.35 + Math.sin(m.phase * 2.2) * 0.14;
      const d = Math.hypot(m.x - player.pos.x, m.z - player.pos.z);
      if (d < 20 && Math.random() < dt * 0.9) {
        const c = new THREE.Color(m.def.glow);
        effects?.spawn({
          x: m.x + rand(-0.2, 0.2), y: m.group.position.y + 0.45, z: m.z + rand(-0.2, 0.2),
          vx: rand(-0.15, 0.15), vy: rand(0.3, 0.8), vz: rand(-0.15, 0.15),
          life: rand(0.5, 1.2), size: rand(0.25, 0.55), r: c.r, g: c.g, b: c.b,
          gravity: -0.1, drag: 0.4,
        });
      }
    }

    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0 && this.truffles.length < this.maxTruffles) {
      this.spawnTruffle();
      this.respawnTimer = rand(12, 24);
    }
    this.mushroomRespawnTimer -= dt;
    if (this.mushroomRespawnTimer <= 0) {
      this.mushroomRespawnTimer = rand(50, 90);
      if (this.mushrooms.filter((m) => !m.taken).length < 16) this.spawnMushroom();
    }
  }

  nearest(x, z, radius = 2.8) {
    let best = null, bd = radius;
    for (const t of this.truffles) {
      if (t.dug) continue;
      const d = Math.hypot(t.x - x, t.z - z);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  nearestMushroom(x, z, radius = 2.2) {
    let best = null, bd = radius;
    for (const m of this.mushrooms) {
      if (m.taken) continue;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  collect(t) {
    t.dug = true;
    t.group.visible = false;
    this.truffles = this.truffles.filter((x) => x !== t);
    const c = new THREE.Color(t.type.glow);
    this.game.effects?.burst(t.x, t.y + 0.35, t.z, t.type.rarity === 'legendary' ? 60 : 26, {
      spread: 2.4, up: 4, size: t.type.rarity === 'legendary' ? 1.5 : 0.9,
      r: c.r, g: c.g, b: c.b, life: 1.4, gravity: 2.2,
    });
    this.respawnTimer = Math.min(this.respawnTimer, rand(8, 16));
    return t;
  }

  collectMushroom(m) {
    m.taken = true;
    m.group.visible = false;
    const c = new THREE.Color(m.def.glow);
    this.game.effects?.burst(m.x, terrainHeight(m.x, m.z) + 0.5, m.z, 22, {
      spread: 1.5, up: 2.5, size: 0.8, r: c.r, g: c.g, b: c.b, life: 1.1, gravity: 1.5,
    });
    return m;
  }

  reset() {
    for (const t of this.truffles) t.group.visible = false;
    for (const m of this.mushrooms) m.group.visible = false;
    this.truffles = [];
    this.mushrooms = [];
    for (let i = 0; i < this.maxTruffles; i++) this.spawnTruffle();
    for (let i = 0; i < 16; i++) this.spawnMushroom();
  }
}
