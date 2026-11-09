import * as THREE from '../vendor/three.module.js';
import { clamp, damp, lerp, rand, terrainHeight, angleLerp, TAU, pick } from './utils.js';
import { enemyStats, ENEMY_SPAWNS } from './data.js';

function std(color, rough = 0.95) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, flatShading: true });
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const glowTex = glowTexture();

export class Enemy {
  constructor(game, type, x, z, opts = {}) {
    this.game = game;
    this.type = type;
    this.stats = enemyStats(type);
    this.boss = !!this.stats.boss;
    this.scale = this.stats.scale;
    this.home = new THREE.Vector3(x, terrainHeight(x, z), z);
    this.pos = this.home.clone();
    this.spawnPos = this.home.clone();
    this.radius = this.stats.radius;
    this.maxHp = this.stats.hp;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = 'wander';
    this.stateTimer = rand(0, 2);
    this.attackCd = rand(0.5, 2);
    this.attackIndex = 0;
    this.hurtTimer = 0;
    this.flash = 0;
    this.yaw = rand(0, TAU);
    this.velocity = new THREE.Vector3();
    this.knockback = new THREE.Vector3();
    this.wanderTarget = this.home.clone();
    this.aggro = false;
    this.enraged = false;
    this.deathTimer = 0;
    this.respawnTimer = 0;
    this.packId = opts.packId ?? null;
    this.packLeader = !!opts.packLeader;
    this.soundTimer = rand(2, 8);
    this.fleeing = false;
    this.telegraphT = 0;
    this.attackDuration = 0;
    this.hitApplied = false;
    this.lunge = 0;
    this.barVisible = false;
    this.name = this.stats.name;
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.group.scale.setScalar(this.scale);
    this.scene = game.scene;
    this.scene.add(this.group);
    this.model = this.buildModel();
    this.group.add(this.model);
    this.buildExtras();
    this.updateHealthBar();
    this.phase = rand(0, TAU);
  }

  buildModel() {
    const type = this.type;
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    this.bodyGroup = bodyGroup;
    root.add(bodyGroup);

    const palette = {
      wolf: { fur: 0x70736f, dark: 0x4a4d4a, light: 0xa8a99f, eye: 0xffcf5c, belly: 0xb8b5a6 },
      fox: { fur: 0xb75c2c, dark: 0x7c3c1c, light: 0xf3e4cf, eye: 0x2b1c0e, belly: 0xf1dfc7 },
      dog: { fur: 0x7d5b3c, dark: 0x4f3724, light: 0xa98560, eye: 0xe0b04a, belly: 0xa17d58 },
      boar: { fur: 0x4a3528, dark: 0x2d211a, light: 0x6b4b33, eye: 0xffb35c, belly: 0x6f5238 },
      bear: { fur: 0x4e3524, dark: 0x2f1f16, light: 0x6d4a32, eye: 0xff6b45, belly: 0x5d402b },
    }[type];
    const fur = std(palette.fur);
    const dark = std(palette.dark);
    const light = std(palette.light);
    const belly = std(palette.belly);
    this.flashMats = [fur, dark, light, belly];

    const bodyScale = this.boss ? { x: 1.15, y: 1.02, z: 1.5 } : type === 'fox' ? { x: 0.62, y: 0.58, z: 0.95 } : { x: 0.72, y: 0.66, z: 1.1 };
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), fur);
    body.scale.set(bodyScale.x, bodyScale.y, bodyScale.z);
    body.position.y = this.boss ? 1.42 : type === 'fox' ? 0.92 : 1.04;
    body.castShadow = true;
    body.receiveShadow = true;
    bodyGroup.add(body);
    this.body = body;

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(this.boss ? 0.78 : 0.55, 10, 7), dark);
    shoulder.scale.set(0.8, 0.8, 0.9);
    shoulder.position.set(0, (this.boss ? 1.75 : 1.25), 0.45);
    bodyGroup.add(shoulder);

    const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 7), belly);
    bellyMesh.scale.set(0.75, 0.5, 1);
    bellyMesh.position.set(0, this.boss ? 1.15 : 0.82, 0.05);
    bodyGroup.add(bellyMesh);

    const neck = new THREE.Mesh(new THREE.SphereGeometry(this.boss ? 0.65 : 0.45, 10, 7), fur);
    neck.position.set(0, this.boss ? 1.72 : 1.28, 0.9);
    bodyGroup.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, this.boss ? 1.92 : 1.4, 1.25);
    bodyGroup.add(headPivot);
    this.head = headPivot;

    const head = new THREE.Mesh(new THREE.SphereGeometry(this.boss ? 0.55 : 0.4, 10, 7), fur);
    head.scale.set(1, 0.9, 1.05);
    head.castShadow = true;
    headPivot.add(head);
    this.headMesh = head;

    const snoutLen = type === 'fox' ? 0.5 : type === 'wolf' ? 0.55 : type === 'bear' ? 0.5 : 0.4;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(type === 'bear' ? 0.22 : 0.14, 0.24, snoutLen, 6), type === 'fox' ? light : fur);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.12, 0.48);
    headPivot.add(snout);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), std(0x1c1511, 0.5));
    nose.position.set(0, -0.1, 0.75);
    headPivot.add(nose);

    const eyeMat = new THREE.MeshStandardMaterial({ color: palette.eye, emissive: palette.eye, emissiveIntensity: 0.45, roughness: 0.25 });
    this.eyeMat = eyeMat;
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 4), eyeMat);
      eye.position.set(side * 0.21, 0.1, 0.34);
      headPivot.add(eye);
    }

    const earGeo = new THREE.ConeGeometry(type === 'bear' ? 0.15 : 0.17, type === 'fox' ? 0.55 : 0.4, 4);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, dark);
      if (type === 'dog') {
        ear.position.set(side * 0.32, 0.02, 0.08);
        ear.rotation.z = side * 1.2;
        ear.scale.y = 1.3;
      } else {
        ear.position.set(side * 0.28, 0.37, 0.04);
        ear.rotation.z = side * -0.45;
      }
      headPivot.add(ear);
    }

    if (type === 'boar') {
      const tuskMat = std(0xead9ae, 0.4);
      for (const side of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.14, -0.2, 0.6),
          new THREE.Vector3(side * 0.28, -0.12, 0.78),
          new THREE.Vector3(side * 0.36, 0.12, 0.85),
        ]);
        const tusk = new THREE.Mesh(new THREE.TubeGeometry(curve, 7, 0.045, 5, false), tuskMat);
        headPivot.add(tusk);
      }
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), dark);
        spike.position.set(0, 1.58 - i * 0.05, 0.75 - i * 0.34);
        spike.rotation.x = -0.3;
        bodyGroup.add(spike);
      }
    }
    if (type === 'bear') {
      const clawMat = std(0xe0d6b8, 0.5);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), clawMat);
          claw.position.set(side * (0.3 + i * 0.08), -0.28, 0.6);
          claw.rotation.x = -0.8;
          headPivot.add(claw);
        }
      }
      // Old scars.
      const scarMat = new THREE.MeshBasicMaterial({ color: 0x8a5a44 });
      for (let i = 0; i < 3; i++) {
        const scar = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.34), scarMat);
        scar.position.set(-0.18 + i * 0.09, 0.05, 0.4);
        scar.rotation.z = 0.3;
        headPivot.add(scar);
      }
    }

    // Legs.
    this.legs = [];
    const legX = this.boss ? 0.62 : type === 'fox' ? 0.36 : 0.46;
    const legZ = this.boss ? 0.75 : type === 'fox' ? 0.6 : 0.68;
    const hipY = this.boss ? 1.0 : type === 'fox' ? 0.72 : 0.82;
    const legLen = this.boss ? 0.88 : type === 'fox' ? 0.62 : 0.72;
    const defs = [
      [legX, legZ, 0], [-legX, legZ, Math.PI], [legX, -legZ, Math.PI], [-legX, -legZ, 0],
    ];
    for (const [x, z, phase] of defs) {
      const hip = new THREE.Group();
      hip.position.set(x, hipY, z);
      bodyGroup.add(hip);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, legLen, 6), type === 'bear' ? fur : dark);
      leg.position.y = -legLen / 2;
      leg.castShadow = true;
      hip.add(leg);
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.24), dark);
      paw.position.set(0, -legLen, 0.04);
      hip.add(paw);
      this.legs.push({ hip, phase });
    }

    // Tail.
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, this.boss ? 1.55 : 1.05, this.boss ? -1.3 : type === 'fox' ? -0.95 : -1.05);
    bodyGroup.add(tailPivot);
    if (type === 'fox') {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), fur);
      tail.scale.set(1, 1, 2.5);
      tail.position.z = -0.55;
      tail.rotation.x = -0.5;
      tail.castShadow = true;
      tailPivot.add(tail);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), light);
      tip.scale.set(1, 1, 1.5);
      tip.position.set(0, 0.18, -1.1);
      tailPivot.add(tip);
    } else if (type === 'bear') {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), dark);
      tailPivot.add(tail);
    } else {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.9, 5), dark);
      tail.rotation.x = Math.PI / 2.4;
      tail.position.z = -0.4;
      tailPivot.add(tail);
    }
    this.tail = tailPivot;

    this.modelRoot = root;
    return root;
  }

  buildExtras() {
    // Soft contact shadow.
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(this.boss ? 4.2 : 2.4, this.boss ? 4.8 : 2.8),
      new THREE.MeshBasicMaterial({ map: glowTex, color: 0x0b0c07, transparent: true, opacity: 0.34, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    this.group.add(shadow);
    this.shadow = shadow;

    // Attack telegraph ring.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.1, 28),
      new THREE.MeshBasicMaterial({ color: 0xff4a32, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.group.add(ring);
    this.ring = ring;

    // Health bar.
    this.barCanvas = document.createElement('canvas');
    this.barCanvas.width = 192;
    this.barCanvas.height = 28;
    this.barCtx = this.barCanvas.getContext('2d');
    this.barTex = new THREE.CanvasTexture(this.barCanvas);
    this.barTex.colorSpace = THREE.SRGBColorSpace;
    const barMat = new THREE.SpriteMaterial({ map: this.barTex, transparent: true, depthTest: true, depthWrite: false });
    this.barSprite = new THREE.Sprite(barMat);
    this.barSprite.scale.set(this.boss ? 4 : 2.4, this.boss ? 0.6 : 0.35, 1);
    this.barSprite.position.y = this.boss ? 4.8 : 2.5;
    this.barSprite.visible = false;
    this.group.add(this.barSprite);

    if (this.boss) {
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff5a30, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      aura.scale.set(8, 8, 1);
      aura.position.y = 1.6;
      this.group.add(aura);
      this.aura = aura;
    }
  }

  updateHealthBar() {
    const ctx = this.barCtx;
    const w = this.barCanvas.width, h = this.barCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const p = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(12,14,9,0.72)';
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 8);
    ctx.fill();
    const color = this.boss ? '#d35b39' : p > 0.5 ? '#b6d86a' : p > 0.25 ? '#e0b85a' : '#d35b39';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(6, 6, (w - 12) * p, h - 12, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,235,190,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 8);
    ctx.stroke();
    this.barTex.needsUpdate = true;
  }

  takeDamage(amount, fromX, fromZ, opts = {}) {
    if (!this.alive) return false;
    const dmg = Math.max(1, Math.round(amount));
    this.hp -= dmg;
    this.flash = 1;
    this.hurtTimer = opts.stun ?? 0.24;
    this.aggro = true;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    const kb = (opts.knockback ?? 4) / (this.boss ? 4 : 1);
    this.knockback.x += (dx / d) * kb;
    this.knockback.z += (dz / d) * kb;
    if (this.state !== 'attack') this.state = 'hurt';
    this.stateTimer = this.hurtTimer;
    this.updateHealthBar();
    this.barSprite.visible = true;
    this.barVisible = true;
    this.game.onEnemyHit?.(this, dmg, opts);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    if (this.boss) this.game.setBossBar?.(this);
    else if (this.packId != null) this.game.enemyManager.alertPack(this.packId, this.pos);
    return true;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'dead';
    this.deathTimer = 2.2;
    this.aggro = false;
    this.barSprite.visible = false;
    this.ring.material.opacity = 0;
    this.game.onEnemyDefeated?.(this);
  }

  respawn() {
    this.alive = true;
    this.hp = this.maxHp;
    this.state = 'wander';
    this.pos.copy(this.spawnPos);
    this.home.copy(this.spawnPos);
    this.group.position.copy(this.pos);
    this.group.rotation.z = 0;
    this.group.visible = true;
    this.modelRoot.rotation.z = 0;
    this.modelRoot.position.y = 0;
    this.modelRoot.scale.setScalar(1);
    this.knockback.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.enraged = false;
    this.fleeing = false;
    this.attackCd = 1.5;
    this.barSprite.visible = false;
    this.updateHealthBar();
    if (this.boss) {
      this.game.setBossBar?.(null);
    }
  }

  update(dt, player) {
    if (!this.alive) {
      this.deathTimer -= dt;
      const t = clamp(1 - this.deathTimer / 2.2, 0, 1);
      this.modelRoot.rotation.z = damp(this.modelRoot.rotation.z, 1.45, 4, dt);
      this.modelRoot.position.y = -t * 0.25;
      this.modelRoot.scale.setScalar(1 - t * 0.12);
      if (this.deathTimer <= 0) this.group.visible = false;
      return;
    }
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5);
    for (const m of this.flashMats) {
      m.emissive.setRGB(this.flash * 0.7, this.flash * 0.12, this.flash * 0.05);
      m.emissiveIntensity = this.flash;
    }
    if (this.eyeMat) this.eyeMat.emissiveIntensity = this.enraged ? 1.2 : 0.45;

    const playerDead = player.dead || this.game.state !== 'playing';
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const playerWater = false;
    let desiredX = 0, desiredZ = 0;
    let speed = this.stats.speed;

    if (this.hurtTimer > 0) {
      this.stateTimer -= dt;
      this.velocity.x = damp(this.velocity.x, 0, 12, dt);
      this.velocity.z = damp(this.velocity.z, 0, 12, dt);
    } else if (this.state === 'attack') {
      this.stateTimer -= dt;
      this.attackDuration -= dt;
      if (this.attackDuration <= 0) {
        this.state = 'recover';
        this.stateTimer = 0.55;
        this.attackCd = this.boss ? rand(1.5, 2.3) : rand(1.2, 2.4);
      }
    } else if (this.state === 'recover') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.state = 'chase';
    } else if (this.state === 'windup') {
      this.stateTimer -= dt;
      this.telegraphT += dt;
      const t = clamp(this.telegraphT / this.attackDuration, 0, 1);
      this.ring.material.opacity = 0.25 + t * 0.55;
      const s = (this.stats.attackRange / this.scale) * (0.6 + t * 0.55);
      this.ring.scale.setScalar(s);
      this.yaw = angleLerp(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt));
      if (this.stateTimer <= 0) {
        this.performAttack(player, dist, dx, dz);
      }
    } else if (this.state === 'flee') {
      desiredX = -dx / (dist || 1);
      desiredZ = -dz / (dist || 1);
      speed *= 1.2;
      if (dist > 24) this.state = 'wander';
    } else {
      this.ring.material.opacity = Math.max(0, this.ring.material.opacity - dt * 2.4);
      if (!playerDead && (dist < this.stats.aggro || this.aggro)) {
        if (!this.aggro && this.packId != null) {
          this.game.enemyManager.alertPack(this.packId, this.pos);
        }
        this.aggro = true;
        if (this.state !== 'chase' && this.state !== 'windup') this.state = 'chase';
      } else if (dist > this.stats.aggro * 2.2 && this.aggro) {
        this.aggro = false;
        this.state = 'return';
      }

      if (this.state === 'chase') {
        if (dist < this.stats.attackRange * 0.92 && this.attackCd <= 0 && !playerDead) {
          this.beginWindup(dist);
        } else {
          desiredX = dx / (dist || 1);
          desiredZ = dz / (dist || 1);
          // Slight orbit for foxes and wolves so packs do not stack.
          if (this.type === 'fox' && dist < 6) {
            const orbit = Math.sin(performance.now() * 0.0015 + this.packId) * 0.65;
            const nx = -desiredZ, nz = desiredX;
            desiredX += nx * orbit;
            desiredZ += nz * orbit;
          }
          if (dist > this.stats.aggro * 1.8) this.aggro = false;
        }
        if (this.type === 'fox' && this.hp < this.maxHp * 0.25 && dist < 7 && Math.random() < dt * 0.8) {
          this.state = 'flee';
          this.fleeing = true;
        }
      } else if (this.state === 'return') {
        const hx = this.home.x - this.pos.x, hz = this.home.z - this.pos.z;
        const hd = Math.hypot(hx, hz);
        if (hd < 2) this.state = 'wander';
        else { desiredX = hx / hd; desiredZ = hz / hd; speed *= 0.7; }
      } else {
        // Wander around the den.
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.stateTimer = rand(3, 7);
          const a = rand(0, TAU), r = rand(1, this.boss ? 6 : 5);
          this.wanderTarget.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
        }
        const wx = this.wanderTarget.x - this.pos.x;
        const wz = this.wanderTarget.z - this.pos.z;
        const wd = Math.hypot(wx, wz);
        if (wd > 0.8) {
          desiredX = wx / wd;
          desiredZ = wz / wd;
          speed *= 0.28;
        }
      }
    }

    // Separation from pack mates.
    for (const other of this.game.enemyManager.enemies) {
      if (other === this || !other.alive) continue;
      const ox = this.pos.x - other.pos.x;
      const oz = this.pos.z - other.pos.z;
      const od = Math.hypot(ox, oz);
      const min = (this.radius + other.radius) * 1.25;
      if (od < min && od > 0.001) {
        desiredX += (ox / od) * (1 - od / min) * 1.1;
        desiredZ += (oz / od) * (1 - od / min) * 1.1;
      }
    }

    if (this.hurtTimer <= 0 && this.state !== 'attack' && this.state !== 'windup') {
      const dl = Math.hypot(desiredX, desiredZ);
      if (dl > 0.001) {
        desiredX /= dl; desiredZ /= dl;
        this.velocity.x = damp(this.velocity.x, desiredX * speed, 8, dt);
        this.velocity.z = damp(this.velocity.z, desiredZ * speed, 8, dt);
        this.yaw = angleLerp(this.yaw, Math.atan2(desiredX, desiredZ), 1 - Math.exp(-9 * dt));
      } else {
        this.velocity.x = damp(this.velocity.x, 0, 10, dt);
        this.velocity.z = damp(this.velocity.z, 0, 10, dt);
      }
    }

    this.velocity.x += this.knockback.x;
    this.velocity.z += this.knockback.z;
    this.knockback.multiplyScalar(Math.exp(-6.5 * dt));
    this.pos.x += this.velocity.x * dt;
    this.pos.z += this.velocity.z * dt;
    const solved = this.game.world.resolveCollision(this.pos.x, this.pos.z, this.radius * 0.8);
    this.pos.x = solved.x;
    this.pos.z = solved.z;
    const rad = Math.hypot(this.pos.x, this.pos.z);
    if (rad > 130) {
      this.pos.x = (this.pos.x / rad) * 130;
      this.pos.z = (this.pos.z / rad) * 130;
    }
    this.pos.y = terrainHeight(this.pos.x, this.pos.z);
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.soundTimer -= dt;
    if (this.soundTimer <= 0) {
      this.soundTimer = rand(4, 10);
      if (this.aggro && dist < 20 && Math.random() < 0.35) {
        if (this.type === 'wolf') this.game.audio.howl();
        else if (this.type === 'fox') this.game.audio.bark();
        else if (this.type === 'dog') this.game.audio.bark();
        else if (this.type === 'bear') this.game.audio.roar();
        else this.game.audio.bark();
      }
    }

    this.animate(dt, speed, dist);
    if (this.boss) {
      if (this.aggro && !playerDead) this.game.setBossBar?.(this);
      else if (!this.aggro) this.game.setBossBar?.(null);
    }
  }

  beginWindup(dist) {
    this.state = 'windup';
    this.attackIndex++;
    this.telegraphT = 0;
    this.attackDuration = this.stats.windup;
    this.stateTimer = this.stats.windup;
    this.ring.material.opacity = 0.3;
    this.ring.scale.setScalar(1);
    this.ring.position.y = 0.08;
    this.hitApplied = false;
    if (this.boss) {
      const special = this.attackIndex % 3 === 0;
      if (special) {
        this.attackDuration = 1.0;
        this.stateTimer = 1.0;
        this.ring.material.color.setHex(0xff8a2e);
        this.game.ui?.showWarning?.('Old Gnarl rears up!');
      } else {
        this.ring.material.color.setHex(0xff4a32);
      }
    }
  }

  performAttack(player, dist, dx, dz) {
    this.state = 'attack';
    this.attackDuration = 0.3;
    this.stateTimer = 0.3;
    this.lunge = 1;
    const bossSlam = this.boss && this.attackIndex % 3 === 0;
    const reach = this.stats.attackRange + (bossSlam ? 2.2 : 0.5);
    this.game.audio.attack();
    if (this.boss) this.game.audio.roar();
    if (bossSlam) {
      this.game.shake?.(0.8, 0.4);
      this.game.effects?.burst(this.pos.x, this.pos.y + 0.2, this.pos.z, 32, { spread: 6, up: 4, size: 1.5, r: 0.95, g: 0.7, b: 0.4, life: 1.1 });
      this.game.spawnShockwave?.(this.pos.x, this.pos.y, this.pos.z, 6.5, 0xff8a2e);
    }
    if (dist < reach && !player.dead) {
      const dmg = this.stats.damage * (this.enraged ? 1.25 : 1) * (bossSlam ? 1.3 : 1);
      this.game.damagePlayer(dmg, this, { source: this.type });
      // Extra shove.
      player.knockback.x += (dx / (dist || 1)) * 3.5;
      player.knockback.z += (dz / (dist || 1)) * 3.5;
    }
    if (this.boss) {
      this.game.effects?.burst(this.pos.x, this.pos.y + 1, this.pos.z, 16, { spread: 3, up: 2, size: 1.2, r: 0.7, g: 0.5, b: 0.3 });
    }
    if (!this.boss) this.attackCd = rand(1.1, 2.0);
  }

  animate(dt, speed, dist) {
    const move = clamp(Math.hypot(this.velocity.x, this.velocity.z) / Math.max(1, speed), 0, 1.6);
    this.phase += dt * (2 + move * 8);
    const p = this.phase;
    const amp = 0.12 + move * 0.5;
    this.bodyGroup.position.y = Math.abs(Math.sin(p)) * (0.015 + move * 0.04);
    for (const leg of this.legs) {
      leg.hip.rotation.x = Math.sin(p + leg.phase) * amp;
    }
    this.tail.rotation.y = Math.sin(p * 0.35) * 0.25;
    this.head.rotation.x = damp(this.head.rotation.x, 0, 8, dt);
    this.head.rotation.y = damp(this.head.rotation.y, 0, 8, dt);
    this.bodyGroup.rotation.x = damp(this.bodyGroup.rotation.x, 0, 8, dt);
    this.bodyGroup.position.z = damp(this.bodyGroup.position.z, 0, 8, dt);

    if (this.state === 'windup') {
      const t = clamp(this.telegraphT / this.attackDuration, 0, 1);
      this.bodyGroup.position.y = -0.08 * t;
      this.head.rotation.x = 0.25 * t;
      this.bodyGroup.rotation.x = 0.12 * t;
    } else if (this.state === 'attack') {
      const t = 1 - clamp(this.attackDuration / 0.3, 0, 1);
      this.bodyGroup.position.z = Math.sin(t * Math.PI) * 0.45;
      this.head.rotation.x = -0.3 * Math.sin(t * Math.PI);
    } else if (this.state === 'flee') {
      this.tail.rotation.x = 0.9;
    }
    if (this.hurtTimer > 0) {
      this.bodyGroup.rotation.x = -0.18;
    }
    if (this.enraged) {
      this.aura.material.opacity = 0.12 + Math.sin(performance.now() * 0.004) * 0.05;
    }
    if (this.boss && this.hp < this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      this.game.ui?.showWarning?.('Old Gnarl is enraged!');
      this.game.audio.roar();
      this.eyeMat.color.setHex(0xff2a1a);
    }
    if (this.barSprite.visible) {
      const cam = this.game.camera.position;
      this.barSprite.material.rotation = 0;
      // Keep the health bar readable above tall grass.
      this.barSprite.position.y = (this.boss ? 4.8 : 2.5) + Math.sin(performance.now() * 0.002) * 0.03;
    }
    this.shadow.position.y = 0.04;
  }
}

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.spawns = [];
    this.defeated = 0;
    this.boss = null;
  }

  spawnAll() {
    for (const spawn of ENEMY_SPAWNS) {
      const packId = spawn.pack > 1 ? `${spawn.type}-${spawn.x}-${spawn.z}` : null;
      for (let i = 0; i < spawn.pack; i++) {
        const a = (i / spawn.pack) * TAU + rand(-0.3, 0.3);
        const r = spawn.pack > 1 ? rand(1.5, 4.2) : 0;
        const x = spawn.x + Math.cos(a) * r;
        const z = spawn.z + Math.sin(a) * r;
        const enemy = new Enemy(this.game, spawn.type, x, z, { packId, packLeader: i === 0 });
        if (enemy.boss) this.boss = enemy;
        this.enemies.push(enemy);
        this.spawns.push({ type: spawn.type, x, z, enemy });
      }
    }
  }

  update(dt, player) {
    for (const e of this.enemies) {
      e.update(dt, player);
      if (!e.alive && e.group.visible === false) {
        if (e.respawnTimer <= 0) e.respawnTimer = e.boss ? 180 : 42;
        e.respawnTimer -= dt;
        if (e.respawnTimer <= 0) e.respawn();
      }
    }
  }

  alertPack(packId, origin) {
    if (!packId) return;
    for (const e of this.enemies) {
      if (!e.alive || e.packId !== packId) continue;
      const d = Math.hypot(e.pos.x - origin.x, e.pos.z - origin.z);
      if (d < 22 && !e.aggro) {
        e.aggro = true;
        e.state = 'chase';
      }
    }
  }

  near(x, z, radius) {
    const out = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d < radius) out.push({ enemy: e, dist: d });
    }
    return out;
  }

  reset() {
    for (const e of this.enemies) {
      e.respawn();
      e.group.visible = true;
    }
    this.defeated = 0;
  }
}
