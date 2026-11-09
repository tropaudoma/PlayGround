import * as THREE from '../vendor/three.module.js';
import { clamp, damp, lerp, pointInWater, terrainHeight, angleLerp, TAU } from './utils.js';

function furMat(color, rough = 0.95) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, flatShading: true });
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class Boar {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.root = new THREE.Group();
    this.root.name = 'boar';
    scene.add(this.root);
    this.furMaterials = [];
    this.model = this.build();
    this.root.add(this.model);
    this.pos = this.root.position;
    this.pos.set(0, terrainHeight(0, 4), 4);
    this.yaw = Math.PI;
    this.velocity = new THREE.Vector3();
    this.knockback = new THREE.Vector3();
    this.vy = 0;
    this.grounded = true;
    this.radius = 0.62;
    this.phase = 0;
    this.walkDistance = 0;
    this.stepAccum = 0;
    this.idleTime = 0;
    this.action = null;
    this.actionTime = 0;
    this.actionDuration = 0;
    this.digging = false;
    this.resting = false;
    this.dead = false;
    this.celebrateTimer = 0;
    this.hurtTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.chargeDir = new THREE.Vector3(0, 0, -1);
    this.chargeSpeed = 0;
    this.chargeRemaining = 0;
    this.chargeHit = new Set();
    this.moving = false;
    this.speedNow = 0;
    this.airTime = 0;
    this.cosmetics = [];
    this.flash = 0;
    this.buildShadow();
  }

  buildShadow() {
    const tex = makeGlowTexture();
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x101408, transparent: true, opacity: 0.36, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.9), mat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.035;
    this.shadow = shadow;
    this.root.add(shadow);
  }

  build() {
    const g = new THREE.Group();
    const bodyGroup = new THREE.Group();
    this.bodyGroup = bodyGroup;
    g.add(bodyGroup);

    const fur = furMat(0x4c3526);
    const furDark = furMat(0x34251b);
    const furLight = furMat(0x6b4a31);
    const belly = furMat(0x7b5c42);
    const hoof = furMat(0x241a14, 0.75);
    const snout = furMat(0x8b6249);
    const nose = new THREE.MeshStandardMaterial({ color: 0x2b1b17, roughness: 0.55 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xf0e0b7, roughness: 0.4, metalness: 0.05 });
    this.tuskMat = tuskMat;
    this.furMaterials.push(fur, furDark, furLight, belly, snout);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), fur);
    torso.scale.set(0.82, 0.8, 1.3);
    torso.position.y = 1.23;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);
    this.torso = torso;

    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 9), furDark);
    hump.scale.set(0.8, 0.75, 0.72);
    hump.position.set(0, 1.5, 0.5);
    hump.castShadow = true;
    bodyGroup.add(hump);

    const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 10), belly);
    bellyMesh.scale.set(0.68, 0.4, 1.05);
    bellyMesh.position.set(0, 0.96, 0.05);
    bodyGroup.add(bellyMesh);

    // Coarse bristles along the spine.
    const spikeGeo = new THREE.ConeGeometry(0.1, 0.42, 4);
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(spikeGeo, furDark);
      const t = i / 6;
      spike.position.set(0, 1.78 - Math.abs(t - 0.4) * 0.25, 0.85 - t * 1.8);
      spike.rotation.x = -0.35 + t * 0.3;
      spike.scale.setScalar(0.7 + Math.sin(t * Math.PI) * 0.55);
      spike.castShadow = true;
      bodyGroup.add(spike);
    }

    // Neck and head.
    const neck = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 9), fur);
    neck.scale.set(0.75, 0.78, 0.9);
    neck.position.set(0, 1.34, 1.02);
    neck.castShadow = true;
    bodyGroup.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.46, 1.42);
    bodyGroup.add(headPivot);
    this.head = headPivot;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), fur);
    head.scale.set(0.8, 0.82, 1.05);
    head.position.set(0, 0.02, 0.12);
    head.castShadow = true;
    headPivot.add(head);
    this.headMesh = head;

    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), furLight);
    cheekL.scale.set(0.85, 0.7, 0.8);
    cheekL.position.set(0.25, -0.12, 0.16);
    headPivot.add(cheekL);
    const cheekR = cheekL.clone();
    cheekR.position.x = -0.25;
    headPivot.add(cheekR);

    const snoutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.48, 10), snout);
    snoutMesh.rotation.x = Math.PI / 2;
    snoutMesh.position.set(0, -0.11, 0.58);
    snoutMesh.castShadow = true;
    headPivot.add(snoutMesh);
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 7), nose);
    noseMesh.scale.set(1.1, 0.75, 0.55);
    noseMesh.position.set(0, -0.11, 0.82);
    headPivot.add(noseMesh);

    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.13, 0.5), furLight);
    jaw.position.set(0, -0.33, 0.5);
    jaw.castShadow = true;
    headPivot.add(jaw);
    this.jaw = jaw;

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0d0906, roughness: 0.15, metalness: 0.1 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffe9c2 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 6), eyeMat);
      eye.position.set(side * 0.27, 0.13, 0.42);
      headPivot.add(eye);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), glintMat);
      glint.position.set(side * 0.29, 0.15, 0.47);
      headPivot.add(glint);
    }

    const earGeo = new THREE.ConeGeometry(0.19, 0.42, 5);
    const earL = new THREE.Mesh(earGeo, furDark);
    earL.position.set(0.34, 0.43, 0.04);
    earL.rotation.z = -0.55;
    earL.rotation.x = -0.2;
    earL.castShadow = true;
    headPivot.add(earL);
    const earR = earL.clone();
    earR.position.x = -0.34;
    earR.rotation.z = 0.55;
    headPivot.add(earR);
    this.earL = earL;
    this.earR = earR;

    // Curved tusks.
    const tuskPoints = (side) => [
      new THREE.Vector3(side * 0.2, -0.24, 0.66),
      new THREE.Vector3(side * 0.34, -0.16, 0.86),
      new THREE.Vector3(side * 0.46, 0.06, 0.94),
      new THREE.Vector3(side * 0.53, 0.3, 0.9),
    ];
    this.tusks = [];
    for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3(tuskPoints(side));
      const tusk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.055, 6, false), tuskMat);
      tusk.castShadow = true;
      headPivot.add(tusk);
      this.tusks.push(tusk);
    }

    // Legs, two segments each.
    this.legs = [];
    const legDefs = [
      { x: 0.5, z: 0.76, front: true, phase: 0 },
      { x: -0.5, z: 0.76, front: true, phase: Math.PI },
      { x: 0.52, z: -0.76, front: false, phase: Math.PI },
      { x: -0.52, z: -0.76, front: false, phase: 0 },
    ];
    for (const def of legDefs) {
      const hip = new THREE.Group();
      hip.position.set(def.x, 1.02, def.z);
      bodyGroup.add(hip);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.52, 7), fur);
      upper.position.y = -0.26;
      upper.castShadow = true;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.y = -0.52;
      hip.add(knee);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.48, 7), furDark);
      lower.position.y = -0.24;
      lower.castShadow = true;
      knee.add(lower);
      const hoofMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.25), hoof);
      hoofMesh.position.set(0, -0.5, 0.03);
      hoofMesh.castShadow = true;
      knee.add(hoofMesh);
      this.legs.push({ hip, knee, def, phase: def.phase, front: def.front });
    }

    // Tail.
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.45, -1.14);
    bodyGroup.add(tailPivot);
    const tailSegs = [];
    let parent = tailPivot;
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Group();
      if (i > 0) seg.position.y = -0.16;
      parent.add(seg);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045 - i * 0.008, 0.035 - i * 0.006, 0.2, 5), furDark);
      m.position.y = -0.1;
      seg.add(m);
      tailSegs.push(seg);
      parent = seg;
    }
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 5), furDark);
    tuft.position.y = -0.22;
    tuft.rotation.x = Math.PI;
    parent.add(tuft);
    this.tail = tailSegs;
    this.tailPivot = tailPivot;

    // Cosmetics.
    this.buildCosmetics(headPivot);

    return g;
  }

  buildCosmetics(headPivot) {
    const crown = new THREE.Group();
    crown.position.set(0, 0.46, 0.1);
    const petalColors = [0xffd9e8, 0xffe7a3, 0xd7f0b2, 0xc9e4ff];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const flower = new THREE.Group();
      flower.position.set(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.3);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 4), furMat(0x6f8b3d));
      stem.position.y = -0.06;
      flower.add(stem);
      const petalMat = new THREE.MeshStandardMaterial({ color: petalColors[i % petalColors.length], roughness: 0.7, emissive: petalColors[i % petalColors.length], emissiveIntensity: 0.18 });
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), petalMat);
        const pa = (p / 5) * TAU;
        petal.position.set(Math.cos(pa) * 0.055, 0.02, Math.sin(pa) * 0.055);
        petal.scale.set(1, 0.55, 1);
        flower.add(petal);
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xaa7a20, emissiveIntensity: 0.4 }));
      center.position.y = 0.03;
      flower.add(center);
      crown.add(flower);
    }
    crown.visible = false;
    headPivot.add(crown);
    this.crown = crown;

    const forestCrown = new THREE.Group();
    forestCrown.position.set(0, 0.45, 0.08);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8b94b, metalness: 0.75, roughness: 0.25, emissive: 0x4a3208, emissiveIntensity: 0.5 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28 + (i % 2) * 0.1, 4), goldMat);
      spike.position.set(Math.cos(a) * 0.36, 0.13, Math.sin(a) * 0.31);
      spike.rotation.z = Math.cos(a) * 0.3;
      spike.rotation.x = -Math.sin(a) * 0.3;
      forestCrown.add(spike);
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 5, 16), goldMat);
    band.rotation.x = Math.PI / 2;
    forestCrown.add(band);
    forestCrown.visible = false;
    headPivot.add(forestCrown);
    this.forestCrown = forestCrown;

    const auraTex = makeGlowTexture();
    const auraMat = new THREE.SpriteMaterial({ map: auraTex, color: 0x8fffe6, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
    const aura = new THREE.Sprite(auraMat);
    aura.scale.set(3.4, 3.4, 1);
    aura.position.y = 1.15;
    aura.visible = false;
    this.root.add(aura);
    this.aura = aura;

    const paint = new THREE.Group();
    const paintMat = new THREE.MeshBasicMaterial({ color: 0xd75a4a, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 3; i++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.06), paintMat);
      mark.position.set(0.6 - i * 0.02, 1.3 + i * 0.05, 0.45 - i * 0.2);
      mark.rotation.z = -0.2;
      paint.add(mark);
    }
    paint.visible = false;
    this.root.add(paint);
    this.paint = paint;
  }

  applyCosmetics(list) {
    this.cosmetics = [...list];
    this.crown.visible = list.includes('moss_crown');
    this.forestCrown.visible = list.includes('forest_crown');
    this.aura.visible = list.includes('moon_aura');
    this.paint.visible = list.includes('spirit_paint');
    const golden = list.includes('golden_tusks');
    this.tuskMat.color.set(golden ? 0xffcf5c : 0xf0e0b7);
    this.tuskMat.emissive.set(golden ? 0x6b4a00 : 0x000000);
    this.tuskMat.emissiveIntensity = golden ? 0.45 : 0;
    this.tuskMat.metalness = golden ? 0.55 : 0.05;
    this.tuskMat.roughness = golden ? 0.22 : 0.4;
  }

  setAction(name, duration = 0.4) {
    this.action = name;
    this.actionTime = 0;
    this.actionDuration = duration;
    this.resting = false;
  }

  clearAction() {
    this.action = null;
    this.actionTime = 0;
    this.actionDuration = 0;
  }

  beginCharge(speed, duration, dir) {
    this.action = 'charge';
    this.actionTime = 0;
    this.actionDuration = duration;
    this.chargeDir.copy(dir);
    this.chargeSpeed = speed;
    this.chargeRemaining = duration;
    this.chargeHit.clear();
    this.resting = false;
  }

  playHurt() {
    this.hurtTimer = 0.32;
    this.flash = 1;
  }

  celebrate(duration = 2.4) {
    this.celebrateTimer = duration;
    this.setAction('celebrate', duration);
  }

  die() {
    this.dead = true;
    this.clearAction();
  }

  revive() {
    this.dead = false;
    this.root.rotation.z = 0;
    this.root.rotation.x = 0;
    this.hurtTimer = 0;
  }

  update(dt, input, camYaw) {
    const game = this.game;
    if (this.dead) {
      this.root.rotation.z = damp(this.root.rotation.z, Math.PI * 0.48, 5, dt);
      this.root.position.y = damp(this.root.position.y, terrainHeight(this.pos.x, this.pos.z) + 0.3, 3, dt);
      return;
    }
    if (this.celebrateTimer > 0) this.celebrateTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4.5);

    const stats = game.player.stats;
    const move = input.move || { x: 0, z: 0 };
    const moveLen = Math.hypot(move.x, move.z);
    const hasMove = moveLen > 0.05 && !input.locked;
    this.moving = hasMove;

    if (this.action && this.actionTime >= this.actionDuration) {
      if (this.action !== 'guard') this.clearAction();
    }
    if (this.action) this.actionTime += dt;
    if (this.digging && (!this.action || this.action === 'dig')) {
      this.action = 'dig';
      this.actionTime = 0;
      this.actionDuration = 999;
    }

    if (hasMove) {
      this.idleTime = 0;
      if (this.resting) this.resting = false;
    } else {
      this.idleTime += dt;
    }
    if (this.idleTime > 13 && !this.action && this.grounded && !this.resting) {
      this.resting = true;
      game.onRestStart?.();
    }
    if (this.resting && hasMove) this.resting = false;

    // Charging owns movement for its short duration.
    if (this.action === 'charge' && this.chargeRemaining > 0) {
      this.chargeRemaining -= dt;
      this.velocity.x = this.chargeDir.x * this.chargeSpeed;
      this.velocity.z = this.chargeDir.z * this.chargeSpeed;
      this.yaw = Math.atan2(this.chargeDir.x, this.chargeDir.z);
      this.pos.x += this.velocity.x * dt;
      this.pos.z += this.velocity.z * dt;
      this.stepAccum += Math.hypot(this.velocity.x, this.velocity.z) * dt;
      if (this.stepAccum > 1.2) {
        this.stepAccum = 0;
        game.onFootstep?.(true);
      }
      if (this.chargeRemaining <= 0) {
        this.clearAction();
        this.velocity.multiplyScalar(0.4);
      }
      const ground = terrainHeight(this.pos.x, this.pos.z);
      this.pos.y = damp(this.pos.y, ground, 16, dt);
      this.updateModel(dt, 1, true);
      this.applyCollision();
      return;
    }

    let speed = stats.speed;
    if (input.sprint && stats.stamina > 1 && !this.action) speed *= 1.55;
    if (this.action === 'guard') speed *= 0.28;
    if (this.action === 'attack') speed *= 0.5;
    if (this.action === 'stomp') speed *= 0.15;
    if (this.action === 'dig') speed *= 0.05;
    if (this.action === 'sniff') speed *= 0.55;
    if (this.action === 'eat') speed *= 0.1;
    if (this.resting) speed *= 0.1;
    if (input.slow) speed *= 0.4;

    const water = pointInWater(this.pos.x, this.pos.z);
    if (water) speed *= 0.58;

    let dx = 0, dz = 0;
    if (hasMove) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      dx = fx * move.z + rx * move.x;
      dz = fz * move.z + rz * move.x;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
    }

    const accel = this.grounded ? 17 : 7;
    const targetVx = dx * speed;
    const targetVz = dz * speed;
    this.velocity.x = damp(this.velocity.x, targetVx, accel, dt);
    this.velocity.z = damp(this.velocity.z, targetVz, accel, dt);
    this.velocity.x += this.knockback.x;
    this.velocity.z += this.knockback.z;
    this.knockback.multiplyScalar(Math.exp(-7 * dt));

    if (hasMove && !this.action) {
      const targetYaw = Math.atan2(dx, dz);
      this.yaw = angleLerp(this.yaw, targetYaw, 1 - Math.exp(-11 * dt));
    }
    if (this.action === 'dig' && game.digTarget) {
      const t = game.digTarget;
      const ty = Math.atan2(t.x - this.pos.x, t.z - this.pos.z);
      this.yaw = angleLerp(this.yaw, ty, 1 - Math.exp(-8 * dt));
    }

    this.pos.x += this.velocity.x * dt;
    this.pos.z += this.velocity.z * dt;

    // Jumping and gravity.
    if (input.jump && this.grounded && !this.action) {
      this.vy = 6.3;
      this.grounded = false;
      this.airTime = 0;
      game.onJump?.();
    }
    this.vy -= 19 * dt;
    this.pos.y += this.vy * dt;
    const ground = terrainHeight(this.pos.x, this.pos.z);
    if (this.pos.y <= ground) {
      if (!this.grounded && this.airTime > 0.15) game.onLand?.(Math.abs(this.vy));
      this.pos.y = ground;
      this.vy = 0;
      this.grounded = true;
      this.airTime = 0;
    } else {
      this.grounded = false;
      this.airTime += dt;
    }

    this.applyCollision();

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedNow = horizSpeed;
    this.walkDistance += horizSpeed * dt;
    this.stepAccum += horizSpeed * dt;
    const stepLength = input.sprint ? 1.7 : 1.35;
    if (this.grounded && this.stepAccum > stepLength && horizSpeed > 0.5) {
      this.stepAccum = 0;
      game.onFootstep?.(water);
    }
    this.updateModel(dt, horizSpeed, water);
    if (this.resting && this.idleTime > 13) game.onResting?.(dt);
  }

  applyCollision() {
    const world = this.game.world;
    if (!world) return;
    const solved = world.resolveCollision(this.pos.x, this.pos.z, this.radius);
    this.pos.x = solved.x;
    this.pos.z = solved.z;
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > 132) {
      this.pos.x = (this.pos.x / r) * 132;
      this.pos.z = (this.pos.z / r) * 132;
    }
  }

  updateModel(dt, speed, water) {
    const stats = this.game.player.stats;
    const sprinting = this.game.input.sprint && speed > 0.5;
    const animSpeed = clamp(speed / Math.max(2, stats.speed), 0, 1.8);
    this.phase += dt * (2.2 + animSpeed * 7.2);
    const p = this.phase;
    const amp = 0.18 + animSpeed * 0.62;
    const idle = 1 - clamp(animSpeed * 2, 0, 1);
    const breathe = Math.sin(performance.now() * 0.0016) * 0.012;

    this.bodyGroup.position.y = Math.abs(Math.sin(p)) * (0.02 + animSpeed * 0.045);
    this.bodyGroup.rotation.x = damp(this.bodyGroup.rotation.x, 0, 10, dt);
    this.bodyGroup.rotation.z = damp(this.bodyGroup.rotation.z, 0, 10, dt);
    this.head.rotation.x = damp(this.head.rotation.x, 0, 9, dt);
    this.head.rotation.y = damp(this.head.rotation.y, 0, 9, dt);
    this.jaw.rotation.x = damp(this.jaw.rotation.x, 0, 8, dt);
    this.earL.rotation.z = -0.55 + Math.sin(performance.now() * 0.0017 + 1) * 0.04 * idle;
    this.earR.rotation.z = 0.55 - Math.sin(performance.now() * 0.0019) * 0.04 * idle;

    // Legs: diagonal gait, with a faster and wider stride while sprinting.
    for (const leg of this.legs) {
      const swing = Math.sin(p + leg.phase) * amp * (leg.front ? 1 : 0.9);
      const lift = Math.max(0, Math.sin(p + leg.phase + Math.PI / 2)) * 0.25 * animSpeed;
      leg.hip.rotation.x = swing;
      leg.knee.rotation.x = lift + Math.max(0, -swing) * 0.25;
    }

    this.tailPivot.rotation.x = -0.25 + Math.sin(performance.now() * 0.0021) * 0.12 * idle;
    this.tailPivot.rotation.z = Math.sin(performance.now() * 0.003) * 0.18 * idle;
    this.tail[0].rotation.x = Math.sin(p * 0.4) * 0.08;
    this.tail[1].rotation.x = Math.sin(p * 0.4 + 0.5) * 0.1;

    // Idle breathing.
    this.torso.scale.y = 0.8 + breathe * idle;
    this.head.position.y = 1.46 + breathe * 0.5 * idle;

    const action = this.action;
    if (action === 'sniff') {
      const t = clamp(this.actionTime / 0.55, 0, 1);
      this.head.rotation.x = lerp(this.head.rotation.x, 0.7, 0.2);
      this.head.position.y = lerp(this.head.position.y, 1.16, 0.2);
      this.bodyGroup.rotation.x = lerp(this.bodyGroup.rotation.x, 0.12, 0.15);
      this.earL.rotation.z = -0.9;
      this.earR.rotation.z = 0.9;
    } else if (action === 'dig') {
      this.head.rotation.x = damp(this.head.rotation.x, 0.95, 10, dt);
      this.head.position.y = damp(this.head.position.y, 0.98, 10, dt);
      this.bodyGroup.rotation.x = damp(this.bodyGroup.rotation.x, 0.24, 8, dt);
      const digPhase = performance.now() * 0.012;
      this.legs[0].hip.rotation.x = Math.sin(digPhase) * 0.9 - 0.4;
      this.legs[0].knee.rotation.x = Math.max(0, Math.sin(digPhase)) * 0.8;
      this.legs[1].hip.rotation.x = Math.sin(digPhase + Math.PI) * 0.9 - 0.4;
      this.legs[1].knee.rotation.x = Math.max(0, Math.sin(digPhase + Math.PI)) * 0.8;
      this.bodyGroup.position.y = Math.abs(Math.sin(digPhase)) * 0.05;
    } else if (action === 'attack') {
      const t = this.actionTime / Math.max(0.01, this.actionDuration);
      const swing = Math.sin(t * Math.PI) * (this.combo % 2 === 0 ? 1 : -1);
      this.head.rotation.y = swing * 0.85;
      this.head.rotation.x = -0.15 + Math.sin(t * Math.PI) * 0.25;
      this.bodyGroup.rotation.z = -swing * 0.13;
      this.bodyGroup.rotation.x = 0.08;
    } else if (action === 'charge') {
      this.head.rotation.x = damp(this.head.rotation.x, 0.5, 12, dt);
      this.head.position.y = damp(this.head.position.y, 1.2, 12, dt);
      this.bodyGroup.rotation.x = damp(this.bodyGroup.rotation.x, 0.22, 10, dt);
      this.bodyGroup.position.y = 0.02;
    } else if (action === 'stomp') {
      const t = this.actionTime / Math.max(0.01, this.actionDuration);
      this.bodyGroup.rotation.x = -0.45 * Math.sin(t * Math.PI);
      this.bodyGroup.position.y = 0.1 + Math.sin(t * Math.PI) * 0.25;
      for (const leg of this.legs) leg.hip.rotation.x = -0.5 * Math.sin(t * Math.PI);
    } else if (action === 'guard') {
      this.bodyGroup.rotation.x = damp(this.bodyGroup.rotation.x, 0.12, 8, dt);
      this.head.rotation.x = damp(this.head.rotation.x, 0.38, 8, dt);
      this.head.position.y = damp(this.head.position.y, 1.28, 8, dt);
      this.bodyGroup.position.y = -0.06;
    } else if (action === 'eat') {
      const chew = Math.sin(performance.now() * 0.02);
      this.head.rotation.x = 0.85 + chew * 0.05;
      this.head.position.y = 1.02;
      this.jaw.rotation.x = Math.max(0, chew) * 0.35;
    } else if (action === 'celebrate') {
      const t = 1 - this.celebrateTimer / Math.max(0.01, this.actionDuration);
      const hop = Math.max(0, Math.sin(t * Math.PI * 3)) * 0.4;
      this.bodyGroup.position.y = hop;
      this.bodyGroup.rotation.x = -0.35 * Math.sin(t * Math.PI);
      this.head.rotation.x = -0.5;
      this.head.position.y = 1.68;
      for (const leg of this.legs) leg.hip.rotation.x = -0.6;
    } else if (this.resting) {
      this.bodyGroup.position.y = damp(this.bodyGroup.position.y, -0.44, 4, dt);
      this.bodyGroup.rotation.x = damp(this.bodyGroup.rotation.x, 0.04, 4, dt);
      this.head.rotation.x = damp(this.head.rotation.x, 0.48, 4, dt);
      this.head.position.y = damp(this.head.position.y, 0.72, 4, dt);
      for (const leg of this.legs) {
        leg.hip.rotation.x = damp(leg.hip.rotation.x, leg.front ? 1.25 : -1.1, 4, dt);
        leg.knee.rotation.x = damp(leg.knee.rotation.x, 1.1, 4, dt);
      }
    }

    // Water splash tint and bob.
    if (water) {
      this.bodyGroup.position.y += Math.sin(performance.now() * 0.004) * 0.015;
    }

    // Hurt flash.
    for (const mat of this.furMaterials) {
      mat.emissive.setRGB(this.flash * 0.55, this.flash * 0.06, this.flash * 0.02);
      mat.emissiveIntensity = this.flash;
    }

    this.root.rotation.y = this.yaw;
    this.shadow.position.y = terrainHeight(this.pos.x, this.pos.z) - this.pos.y + 0.035;
    this.shadow.material.opacity = this.grounded ? 0.36 : 0.18;
    this.shadow.scale.setScalar(this.grounded ? 1 : 0.8);
    if (this.aura.visible) {
      this.aura.material.opacity = 0.2 + Math.sin(performance.now() * 0.002) * 0.07;
    }
    if (this.forestCrown.visible) {
      this.forestCrown.rotation.y += dt * 0.15;
    }
  }

  setVisible(v) { this.root.visible = v; }
}
