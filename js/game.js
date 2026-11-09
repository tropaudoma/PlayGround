import * as THREE from '../vendor/three.module.js';
import { clamp, damp, lerp, rand, terrainHeight, pointInWater, smoothstep, todayKey, formatNumber } from './utils.js';
import {
  SAVE_KEY, TRUFFLES, MUSHROOMS, REGIONS, LANDMARKS, PATHS, COSMETICS,
  SKILL_MAP, QUESTS, ACHIEVEMENTS, getDailyChallenges, levelFromXp, xpForLevel,
} from './data.js';
import { AudioEngine } from './audio.js';
import { ParticleSystem } from './particles.js';
import { Boar } from './boar.js';
import { World } from './world.js';
import { EnemyManager } from './enemies.js';
import { TruffleManager } from './truffles.js';
import { UI } from './ui.js';

const SETTINGS_KEY = 'boar-truffle-hunter-settings-v1';

const TITLES = [
  [1, 'Young Boar'], [3, 'Root Scout'], [5, 'Moss Runner'], [7, 'Tuskbearer'],
  [10, 'Elder Tusks'], [13, 'Forest Warden'], [16, 'Valley Champion'],
  [20, 'Legend of the Forest'], [25, 'The Truffle King'], [30, 'Myth of the Glade'],
];

const ABILITY_COOLDOWNS = {
  attack: 0.52, charge: 3.6, sniff: 1.2, stomp: 7.5, guard: 0, rush: 13, rage: 22,
};

const DEFAULT_STATS = {
  maxHealth: 100, maxStamina: 100, maxRage: 100,
  attack: 13, speed: 5.2, smellRadius: 23, digSpeed: 1,
  damageReduction: 0, critChance: 0.06, chargeMultiplier: 2.15, rareFind: 0,
};

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.isTouch = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window || window.innerWidth < 720;
    this.settings = this.loadSettings();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isTouch,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isTouch ? 1.35 : 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    let gpuName = '';
    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) gpuName = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    } catch { /* debug info is optional */ }
    this.softwareRenderer = /swiftshader|llvmpipe|software/i.test(gpuName);
    this.quality = this.isTouch || this.softwareRenderer || window.innerWidth < 920 ? 'low' : 'high';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x9fb48a, 48, 205);
    this.scene.background = new THREE.Color(0x9fb48a);

    this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 5, 13);

    this.effects = new ParticleSystem(this.scene, this.quality === 'low' ? 620 : 1050, true);
    this.dust = new ParticleSystem(this.scene, this.quality === 'low' ? 260 : 440, false);

    this.player = this.createDefaultPlayer();
    this.boar = new Boar(this.scene, this);
    this.player.pos = this.boar.pos;
    this.player.yaw = this.boar.yaw;
    this.paths = PATHS;

    this.world = new World(this.scene, this);
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.spawnAll();
    this.truffleManager = new TruffleManager(this);
    this.ui = new UI(this);
    this.audio = new AudioEngine();
    this.audio.setVolume(this.settings.volume);
    this.audio.setEnabled(this.settings.sound);

    this.state = 'title';
    this.time = 0;
    this.timeOfDay = 14.2;
    this.dayCount = 1;
    this.nightFactor = 0;
    this.currentRegion = REGIONS[0];
    this.lastRegionId = null;

    this.cameraYaw = 0;
    this.cameraPitch = 0.33;
    this.cameraDist = this.isTouch ? 10.2 : 9.2;
    this.cameraTarget = new THREE.Vector3();
    this.camSmooth = new THREE.Vector3(0, 0, 0);
    this.dragging = false;
    this.dragMoved = 0;
    this.dragButton = -1;
    this.lastPointer = { x: 0, y: 0 };

    this.sniffTimer = 0;
    this.cooldowns = { attack: 0, charge: 0, sniff: 0, stomp: 0, guard: 0, rush: 0, rage: 0 };
    this.cooldownMax = { ...ABILITY_COOLDOWNS };
    this.skillPoints = 0;
    this.buffs = { damage: 0, smell: 0, rush: 0, rage: 0, guardBreak: 0 };
    this.guardReflectCd = 0;
    this.secondWindCd = 0;

    this.digProgress = 0;
    this.digTarget = null;
    this.digKind = null;
    this.digSoundTimer = 0;
    this.digWasDown = false;
    this.interaction = null;
    this.interactionKey = '';

    this.shakeTime = 0;
    this.shakeAmount = 0;
    this.shockwaves = [];
    this.introTimer = 0;
    this.deathTimer = 0;
    this.autoSaveTimer = 45;
    this.achievementQueue = [];

    this.input = {
      move: { x: 0, z: 0 }, sprint: false, jump: false, slow: false,
      locked: false, guard: false, dig: false, guardToggle: false,
    };
    this.keys = new Set();
    this.pressed = new Set();
    this.touchMove = { x: 0, z: 0, active: false };
    this.joystickPointer = null;

    this.questState = this.makeQuestState();
    this.daily = this.loadDaily();
    this.setupInput();
    this.bindUIExtras();
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.loadGame();
    this.daily = this.player.daily || this.daily;
    this.player.daily = this.daily;
    this.refreshQuestAvailability(false);
    this.recomputeStats(true);
    this.checkAchievements(false);

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());

    // Let the title breathe in over the rendered forest.
    requestAnimationFrame(() => {
      this.ui.showTitle(this.loadedSave, this.loadedSave ? { level: this.player.level } : null);
    });
  }

  loadSettings() {
    const fallback = { sound: true, volume: 0.72, sensitivity: 1, questTracker: true, autosave: true };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return fallback;
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* private mode */ }
  }

  createDefaultPlayer() {
    return {
      pos: new THREE.Vector3(0, 0, 4),
      yaw: Math.PI,
      level: 1,
      xp: 0,
      xpNeeded: xpForLevel(1),
      totalXp: 0,
      skillPoints: 0,
      coins: 25,
      berries: 3,
      truffleCount: 0,
      title: 'Young Boar',
      regions: new Set(['glade']),
      landmarks: new Set(['den']),
      skills: {},
      abilities: { attack: true, charge: true, sniff: true, dig: true, stomp: false, guard: false, rush: false, rage: false },
      equippedCosmetics: [],
      cosmeticsUnlocked: [],
      truffleCounts: {},
      mushroomCounts: {},
      achievements: {},
      enemiesDefeated: 0,
      bossesDefeated: 0,
      goldenFound: 0,
      legendaryFound: 0,
      chestsOpened: 0,
      collectibles: 0,
      dailiesCompleted: 0,
      dailyStreak: 0,
      daily: null,
      questState: {},
      stats: { ...DEFAULT_STATS, health: DEFAULT_STATS.maxHealth, stamina: DEFAULT_STATS.maxStamina, rage: 0 },
      statsBase: { ...DEFAULT_STATS },
      lastPlayed: Date.now(),
    };
  }

  recomputeStats(preserve = false) {
    const p = this.player;
    const s = p.skills || {};
    const old = p.stats || {};
    const levelBonus = Math.max(0, p.level - 1);
    const base = {
      ...DEFAULT_STATS,
      maxHealth: DEFAULT_STATS.maxHealth + levelBonus * 5 + (s.thick_hide || 0) * 14,
      maxStamina: DEFAULT_STATS.maxStamina + levelBonus * 2 + (s.iron_lungs || 0) * 16,
      attack: DEFAULT_STATS.attack + levelBonus * 1.15 + (s.sharp_tusks || 0) * DEFAULT_STATS.attack * 0.12,
      speed: DEFAULT_STATS.speed + levelBonus * 0.045 + (s.fleet_hooves || 0) * DEFAULT_STATS.speed * 0.05,
      smellRadius: DEFAULT_STATS.smellRadius * (1 + (s.keen_nose || 0) * 0.2),
      digSpeed: 1 + (s.swift_paws || 0) * 0.2,
      damageReduction: Math.min(0.55, (s.pain_resist || 0) * 0.06),
      critChance: DEFAULT_STATS.critChance + (s.keen_nose || 0) * 0.006,
      chargeMultiplier: DEFAULT_STATS.chargeMultiplier + (s.crushing_charge || 0) * 0.18,
      rareFind: (s.rare_sense || 0) * 0.12,
    };
    base.health = preserve ? clamp(old.health ?? base.maxHealth, 1, base.maxHealth) : base.maxHealth;
    base.stamina = preserve ? clamp(old.stamina ?? base.maxStamina, 0, base.maxStamina) : base.maxStamina;
    base.rage = preserve ? clamp(old.rage ?? 0, 0, base.maxRage) : 0;
    p.statsBase = base;
    p.stats = base;
    p.abilities = {
      attack: true, charge: true, sniff: true, dig: true,
      stomp: (p.skills.stomp || 0) > 0,
      guard: (p.skills.guard || 0) > 0,
      rush: (p.skills.rush || 0) > 0,
      rage: (p.skills.rage || 0) > 0,
    };
    p.title = this.titleForLevel(p.level);
    p.xpNeeded = xpForLevel(p.level);
    this.skillPoints = p.skillPoints;
    this.boar?.applyCosmetics?.(p.equippedCosmetics || []);
  }

  titleForLevel(level) {
    let title = TITLES[0][1];
    for (const [lv, name] of TITLES) if (level >= lv) title = name;
    return title;
  }

  makeQuestState() {
    const state = {};
    for (const q of QUESTS) {
      state[q.id] = {
        status: q.auto ? 'active' : 'locked',
        visible: true,
        progress: q.objectives.map(() => 0),
      };
    }
    return state;
  }

  loadDaily() {
    try {
      const raw = localStorage.getItem('boar-truffle-daily-v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.date === todayKey()) return data;
      }
    } catch { /* ignore */ }
    return getDailyChallenges();
  }

  saveDaily() {
    try { localStorage.setItem('boar-truffle-daily-v1', JSON.stringify(this.daily)); } catch { /* ignore */ }
  }

  setupInput() {
    const canvas = this.canvas;
    const down = (e) => {
      if (this.state === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.begin();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.state === 'playing') this.openMenu();
        else if (this.state === 'paused') this.closeMenu();
        return;
      }
      if (this.state !== 'playing') return;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (this.keys.has(e.code)) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      this.handleKey(e.code, true);
    };
    const up = (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyE') this.input.guard = false;
      if (e.code === 'KeyV') {
        this.input.dig = false;
        this.boar.digging = false;
        this.digProgress = 0;
        if (this.boar.action === 'dig') this.boar.clearAction();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.input.sprint = false;
      this.input.guard = false;
      this.input.dig = false;
      this.input.move.x = 0;
      this.input.move.z = 0;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return;
      canvas.setPointerCapture?.(e.pointerId);
      this.dragging = true;
      this.dragButton = e.button;
      this.dragMoved = 0;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
      if (e.button === 0 && e.pointerType !== 'touch') {
        this.attack();
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.dragMoved += Math.abs(dx) + Math.abs(dy);
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
      this.cameraYaw -= dx * 0.0042 * this.settings.sensitivity;
      this.cameraPitch = clamp(this.cameraPitch + dy * 0.0032 * this.settings.sensitivity, -0.08, 0.86);
    });
    const release = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.state === 'playing' && e.button === 2 && this.dragMoved < 7) this.charge();
      this.dragButton = -1;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => { this.dragging = false; this.dragButton = -1; });
    canvas.addEventListener('wheel', (e) => {
      if (this.state !== 'playing') return;
      e.preventDefault();
      this.cameraDist = clamp(this.cameraDist + e.deltaY * 0.006, 4.5, 15);
    }, { passive: false });
  }

  handleKey(code, isDown) {
    switch (code) {
      case 'Space': this.input.jump = true; break;
      case 'KeyJ': this.attack(); break;
      case 'KeyK': this.charge(); break;
      case 'KeyX': this.sniff(); break;
      case 'KeyV':
        if (isDown) this.input.dig = true;
        break;
      case 'KeyQ': this.stomp(); break;
      case 'KeyE':
        this.input.guard = isDown;
        if (isDown) this.audio?.guard?.();
        break;
      case 'KeyR': this.rush(); break;
      case 'KeyF': this.useRage(); break;
      case 'KeyH': this.eatBerries(); break;
      default: break;
    }
  }

  bindUIExtras() {
    document.querySelectorAll('#hotbar .slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        if (this.state === 'playing') this.triggerAbility(slot.dataset.ability);
      });
    });

    const touch = document.getElementById('touch-controls');
    if (!touch) return;
    for (const btn of touch.querySelectorAll('.tbtn[data-touch]')) {
      const name = btn.dataset.touch;
      const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.state !== 'playing') return;
        if (name === 'dig') {
          this.input.dig = true;
          return;
        }
        if (name === 'guard') {
          this.input.guard = !this.input.guard;
          this.audio?.guard?.();
          return;
        }
        if (name === 'jump') {
          this.input.jump = true;
          return;
        }
        this.triggerAbility(name);
      };
      const end = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (name === 'dig') {
          this.input.dig = false;
          this.boar.digging = false;
          this.digProgress = 0;
          if (this.boar.action === 'dig') this.boar.clearAction();
        }
      };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('pointerleave', end);
    }

    const stick = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (stick) {
      const move = (e) => {
        if (this.joystickPointer !== e.pointerId) return;
        const r = stick.getBoundingClientRect();
        let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        let dz = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const len = Math.hypot(dx, dz);
        if (len > 1) { dx /= len; dz /= len; }
        this.touchMove.x = dx;
        this.touchMove.z = -dz;
        this.touchMove.active = true;
        if (knob) knob.style.transform = `translate(calc(-50% + ${dx * 36}px), calc(-50% + ${dz * 36}px))`;
      };
      stick.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.joystickPointer = e.pointerId;
        stick.setPointerCapture?.(e.pointerId);
        move(e);
      });
      stick.addEventListener('pointermove', move);
      const end = (e) => {
        if (this.joystickPointer !== e.pointerId) return;
        this.joystickPointer = null;
        this.touchMove.x = 0;
        this.touchMove.z = 0;
        this.touchMove.active = false;
        if (knob) knob.style.transform = 'translate(-50%, -50%)';
      };
      stick.addEventListener('pointerup', end);
      stick.addEventListener('pointercancel', end);
    }
  }

  triggerAbility(name) {
    switch (name) {
      case 'attack': this.attack(); break;
      case 'charge': this.charge(); break;
      case 'sniff': this.sniff(); break;
      case 'stomp': this.stomp(); break;
      case 'guard': this.input.guard = !this.input.guard; break;
      case 'rush': this.rush(); break;
      case 'rage': this.useRage(); break;
      case 'eat': this.eatBerries(); break;
      default: break;
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isTouch ? 1.35 : 1.75));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  hasSaveData() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  loadGame() {
    this.loadedSave = false;
    let data = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch { data = null; }
    if (!data) return;

    const p = this.player;
    p.level = clamp(data.level || 1, 1, 40);
    p.totalXp = Math.max(0, data.totalXp || 0);
    p.xp = Math.max(0, data.xp || 0);
    p.skillPoints = Math.max(0, data.skillPoints || 0);
    p.coins = Math.max(0, data.coins || 0);
    p.berries = Math.max(0, data.berries || 0);
    p.truffleCount = Math.max(0, data.truffleCount || 0);
    p.skills = data.skills || {};
    p.equippedCosmetics = Array.isArray(data.equippedCosmetics) ? data.equippedCosmetics : [];
    p.cosmeticsUnlocked = Array.isArray(data.cosmeticsUnlocked) ? data.cosmeticsUnlocked : [];
    p.truffleCounts = data.truffleCounts || {};
    p.mushroomCounts = data.mushroomCounts || {};
    p.achievements = data.achievements || {};
    p.enemiesDefeated = data.enemiesDefeated || 0;
    p.bossesDefeated = data.bossesDefeated || 0;
    p.goldenFound = data.goldenFound || 0;
    p.legendaryFound = data.legendaryFound || 0;
    p.chestsOpened = data.chestsOpened || 0;
    p.collectibles = data.collectibles || 0;
    p.dailiesCompleted = data.dailiesCompleted || 0;
    p.dailyStreak = data.dailyStreak || 0;
    p.regions = new Set(Array.isArray(data.regions) ? data.regions : ['glade']);
    p.landmarks = new Set(Array.isArray(data.landmarks) ? data.landmarks : ['den']);
    p.questState = data.questState && typeof data.questState === 'object' ? data.questState : this.makeQuestState();
    p.daily = data.daily && data.daily.date === todayKey() ? data.daily : getDailyChallenges();
    p.stats.health = data.health ?? p.stats.maxHealth;
    p.stats.stamina = data.stamina ?? p.stats.maxStamina;
    p.stats.rage = data.rage ?? 0;
    p.lastPlayed = data.lastPlayed || Date.now();

    if (typeof data.x === 'number') {
      this.boar.pos.set(data.x, terrainHeight(data.x, data.z), data.z);
      this.boar.yaw = data.yaw ?? Math.PI;
    }
    this.timeOfDay = data.timeOfDay ?? 16.35;
    this.dayCount = data.dayCount || 1;
    this.cameraYaw = this.boar.yaw + Math.PI;

    // Restore world pickups.
    const opened = new Set(data.openedChests || []);
    for (const c of this.world.chests) {
      if (opened.has(c.id)) {
        c.opened = true;
        c.lid.rotation.x = -1.35;
        c.glow.material.opacity = 0.04;
      }
    }
    const taken = new Set(data.takenCollectibles || []);
    for (const c of this.world.collectibles) {
      if (taken.has(c.id)) {
        c.taken = true;
        c.group.visible = false;
      }
    }
    this.loadedSave = true;
    this.questState = p.questState;
    this.daily = p.daily;
    this.recomputeStats(true);
  }

  begin(forceContinue = false) {
    if (this.state !== 'title') return;
    this.audio.init();
    this.audio.setEnabled(this.settings.sound);
    this.audio.setVolume(this.settings.volume);
    this.state = 'playing';
    this.ui.hideTitle();
    this.ui.showHUD();
    this.ui.el['quest-tracker'].classList.toggle('hidden', !this.settings.questTracker);
    this.recomputeStats(true);
    this.player.stats.health = this.player.stats.maxHealth;
    this.player.stats.stamina = this.player.stats.maxStamina;
    this.player.stats.rage = 0;
    this.boar.revive();
    this.cameraYaw = this.boar.yaw + Math.PI;
    if (!this.loadedSave) this.timeOfDay = 14.2;
    this.currentRegion = this.regionAt(this.boar.pos.x, this.boar.pos.z);
    this.lastRegionId = this.currentRegion?.id ?? null;
    if (this.currentRegion) this.ui.showRegion(this.currentRegion);
    this.showIntro();
    this.ui.showHint('Press <kbd>X</kbd> to sniff the air. <kbd>V</kbd> digs when the scent is close.', 10);
    if (!this.loadedSave) {
      this.ui.toast('A new journey', 'Old Root is watching from the den. The forest is yours.', 'info', '❧');
    }
    this.saveGame(false);
  }

  showIntro() {
    const el = document.getElementById('intro-cinematic');
    if (!el) return;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    const line = el.querySelector('.intro-line');
    if (line) line.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    if (line) line.style.animation = '';
    this.introTimer = 6.4;
    clearTimeout(this.introHideTimer);
    this.introHideTimer = setTimeout(() => el.classList.add('hidden'), 6400);
  }

  openMenu() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.dragging = false;
    this.input.move.x = 0;
    this.input.move.z = 0;
    this.input.sprint = false;
    this.input.dig = false;
    this.boar.digging = false;
    this.audio.ui();
    this.ui.openMenu();
  }

  closeMenu() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.audio.ui();
    this.ui.closeMenu();
    this.clock.getDelta();
  }

  saveGame(manual = false) {
    const p = this.player;
    const data = {
      version: 1,
      level: p.level,
      totalXp: p.totalXp,
      xp: p.xp,
      skillPoints: p.skillPoints,
      coins: p.coins,
      berries: p.berries,
      truffleCount: p.truffleCount,
      skills: p.skills,
      equippedCosmetics: p.equippedCosmetics,
      cosmeticsUnlocked: p.cosmeticsUnlocked,
      truffleCounts: p.truffleCounts,
      mushroomCounts: p.mushroomCounts,
      achievements: p.achievements,
      enemiesDefeated: p.enemiesDefeated,
      bossesDefeated: p.bossesDefeated,
      goldenFound: p.goldenFound,
      legendaryFound: p.legendaryFound,
      chestsOpened: p.chestsOpened,
      collectibles: p.collectibles,
      dailiesCompleted: p.dailiesCompleted,
      dailyStreak: p.dailyStreak,
      regions: [...p.regions],
      landmarks: [...p.landmarks],
      questState: p.questState,
      daily: p.daily,
      health: p.stats.health,
      stamina: p.stats.stamina,
      rage: p.stats.rage,
      x: this.boar.pos.x,
      z: this.boar.pos.z,
      yaw: this.boar.yaw,
      timeOfDay: this.timeOfDay,
      dayCount: this.dayCount,
      openedChests: this.world.chests.filter((c) => c.opened).map((c) => c.id),
      takenCollectibles: this.world.collectibles.filter((c) => c.taken).map((c) => c.id),
      lastPlayed: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.loadedSave = true;
      const dot = document.getElementById('save-dot');
      if (dot) {
        dot.style.background = '#f0d58c';
        setTimeout(() => { dot.style.background = ''; }, 700);
      }
      if (manual) this.ui.toast('Journey saved', 'The den will remember where you left off.', 'level', '◈');
    } catch {
      if (manual) this.ui.toast('Could not save', 'Browser storage is unavailable.', 'warn', '!');
    }
    this.autoSaveTimer = 45;
  }

  resetSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem('boar-truffle-daily-v1');
    } catch { /* ignore */ }
    window.location.reload();
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta() || 0.016);
    this.time += dt;
    if (this.state === 'title') this.updateTitle(dt);
    else if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'dead') this.updateDead(dt);
    else this.updatePaused(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateTitle(dt) {
    this.timeOfDay = 16.2 + Math.sin(this.time * 0.035) * 0.45;
    this.updateEnvironment(dt);
    this.enemyManager.update(dt, this.player);
    this.truffleManager.update(dt, this.player, 0, 0);
    this.effects.update(dt);
    this.dust.update(dt);
    this.updateShockwaves(dt);
    this.boar.update(dt, { move: { x: 0, z: 0 }, locked: true, sprint: false, jump: false }, this.cameraYaw);
    this.boar.idleTime = 0;
    this.updateCamera(dt, true);
    this.ui.update(dt);
    this.audio.update(dt, this.nightFactor);
  }

  updatePaused(dt) {
    // A slow living forest behind the den menu.
    this.effects.update(dt * 0.35);
    this.dust.update(dt * 0.35);
    this.world.leaves.update(dt * 0.35, this.player.pos);
    this.world.fireflies.update(dt * 0.35, this.player.pos, this.nightFactor);
    this.ui.update(0);
  }

  updateDead(dt) {
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.showDeath();
    }
    this.effects.update(dt * 0.5);
    this.dust.update(dt * 0.5);
    this.world.leaves.update(dt * 0.5, this.player.pos);
    this.world.fireflies.update(dt * 0.5, this.player.pos, this.nightFactor);
    this.boar.update(dt, { move: { x: 0, z: 0 }, locked: true, sprint: false, jump: false }, this.cameraYaw);
    this.updateCamera(dt, false);
    this.ui.update(dt);
  }

  updatePlaying(dt) {
    const p = this.player;
    const stats = p.stats;

    this.updateBuffs(dt);
    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    this.guardReflectCd = Math.max(0, this.guardReflectCd - dt);
    this.secondWindCd = Math.max(0, this.secondWindCd - dt);
    if (this.sniffTimer > 0) this.sniffTimer = Math.max(0, this.sniffTimer - dt);

    // Movement input, keyboard plus the touch joystick.
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const fwd = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const back = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    let mx = (right ? 1 : 0) - (left ? 1 : 0);
    let mz = (fwd ? 1 : 0) - (back ? 1 : 0);
    if (this.touchMove.active) {
      mx = this.touchMove.x;
      mz = this.touchMove.z;
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    this.input.move.x = mx;
    this.input.move.z = mz;
    this.input.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || (this.touchMove.active && len > 0.72);
    this.input.slow = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    this.input.locked = false;
    this.input.jump = this.pressed.has('Space') || this.input.jump;

    // Guard stance.
    if (this.input.guard && p.abilities.guard) {
      if (stats.stamina > 1) {
        this.boar.setAction('guard', 999);
        stats.stamina = Math.max(0, stats.stamina - dt * 4.5);
      } else {
        this.input.guard = false;
        this.ui.showWarning('Too tired to guard');
      }
    } else if (this.boar.action === 'guard') {
      this.boar.clearAction();
    }

    // Stamina economy.
    const moving = Math.hypot(this.boar.velocity.x, this.boar.velocity.z) > 0.4;
    if (this.input.sprint && moving && stats.stamina > 0) {
      stats.stamina = Math.max(0, stats.stamina - dt * 9.5);
      if (stats.stamina <= 0) this.input.sprint = false;
    } else {
      const regen = 12 + (p.skills.quick_breath || 0) * 2.4;
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + dt * regen);
    }
    if (this.boar.resting) stats.stamina = Math.min(stats.maxStamina, stats.stamina + dt * 10);

    // The boar moves first, then the rest of the world reacts to it.
    this.boar.update(dt, this.input, this.cameraYaw);
    p.yaw = this.boar.yaw;

    // Speed buffs are applied to the stats the boar reads.
    const baseSpeed = p.statsBase.speed;
    const rush = this.buffs.rush > 0 ? 1.75 : 1;
    const rage = this.buffs.rage > 0 ? 1.08 : 1;
    stats.speed = baseSpeed * rush * rage;

    this.updateEnvironment(dt);
    this.updateCamera(dt, false);
    this.enemyManager.update(dt, p);
    const smellRadius = stats.smellRadius * (this.buffs.smell > 0 ? 2 : 1);
    this.truffleManager.update(dt, p, this.sniffTimer, smellRadius);
    this.updateChargeHits();
    this.updateRegionAndLandmarks();
    this.updateInteraction(dt);
    this.updateShockwaves(dt);
    this.effects.update(dt);
    this.dust.update(dt);

    // Resting by the fire slowly mends the boar.
    const rest = this.world.restSpot;
    if (Math.hypot(p.pos.x - rest.x, p.pos.z - rest.z) < rest.radius && !moving) {
      stats.health = Math.min(stats.maxHealth, stats.health + dt * 2.2);
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + dt * 8);
    }

    this.input.jump = false;
    this.pressed.clear();

    this.ui.update(dt);
    this.audio.update(dt, this.nightFactor);

    this.autoSaveTimer -= dt;
    if (this.autoSaveTimer <= 0 && this.settings.autosave) this.saveGame(false);

    if (this.introTimer > 0) this.introTimer -= dt;
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.showDeath();
    }
  }

  updateEnvironment(dt) {
    // Day/night cycle: roughly twenty minutes for a full valley day.
    this.timeOfDay += dt * 0.02;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
      this.dayCount++;
      this.ui.toast('A new day', `Day ${this.dayCount} in the valley. The forest has regrown.`, 'level', '☀');
    }
    const sunAngle = ((this.timeOfDay - 6) / 12) * Math.PI;
    const daylight = clamp(Math.sin(sunAngle), 0, 1);
    this.nightFactor = 1 - smoothstep(0.02, 0.42, daylight);
    this.world.update(dt, this.player.pos, this.timeOfDay, this.nightFactor);
  }

  updateCamera(dt, titleMode) {
    const p = this.boar.pos;
    if (titleMode) {
      const a = this.time * 0.09;
      const target = new THREE.Vector3(0, terrainHeight(0, 5) + 1.7, 5);
      this.camSmooth.lerp(target, 1 - Math.exp(-3 * dt));
      const dist = 9.5;
      this.camera.position.set(
        this.camSmooth.x + Math.sin(a) * dist,
        this.camSmooth.y + 2.4 + Math.sin(this.time * 0.13) * 0.35,
        this.camSmooth.z + Math.cos(a) * dist
      );
      this.camera.lookAt(this.camSmooth.x, this.camSmooth.y + 0.3, this.camSmooth.z);
      return;
    }

    // Drift behind the boar while moving, unless the player is dragging.
    if (!this.dragging && this.boar.speedNow > 0.8) {
      const desired = this.boar.yaw + Math.PI;
      let delta = ((desired - this.cameraYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.cameraYaw += delta * (1 - Math.exp(-1.15 * dt));
    }

    const target = new THREE.Vector3(p.x, p.y + 1.55, p.z);
    const fx = Math.sin(this.boar.yaw);
    const fz = Math.cos(this.boar.yaw);
    const look = new THREE.Vector3(p.x + fx * 2.1, p.y + 1.45, p.z + fz * 2.1);
    this.camSmooth.lerp(look, 1 - Math.exp(-10 * dt));
    const horiz = Math.cos(this.cameraPitch) * this.cameraDist;
    const vert = Math.sin(this.cameraPitch) * this.cameraDist;
    let cx = this.camSmooth.x + Math.sin(this.cameraYaw) * horiz;
    let cz = this.camSmooth.z + Math.cos(this.cameraYaw) * horiz;
    let cy = this.camSmooth.y + vert + 0.55;
    // A gentle over-the-shoulder offset keeps the boar's tusks and head readable.
    cx += Math.cos(this.cameraYaw) * 1.05;
    cz -= Math.sin(this.cameraYaw) * 1.05;

    // Pull the camera in when a trunk or low canopy would block the view.
    const block = this.cameraBlockT(this.camSmooth.x, this.camSmooth.z, cx, cz);
    if (block < 1) {
      cx = this.camSmooth.x + (cx - this.camSmooth.x) * block;
      cz = this.camSmooth.z + (cz - this.camSmooth.z) * block;
      cy = this.camSmooth.y + (cy - this.camSmooth.y) * block;
    }

    // Keep the camera above the forest floor and out of the pond surface.
    const ground = terrainHeight(cx, cz);
    cy = Math.max(cy, ground + 1.1);
    if (pointInWater(cx, cz)) cy = Math.max(cy, this.world.waterLevels().pond + 1.1);

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.camSmooth.x, this.camSmooth.y + 0.25, this.camSmooth.z);

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = clamp(this.shakeTime * 6, 0, 1) * this.shakeAmount;
      this.camera.position.x += rand(-k, k);
      this.camera.position.y += rand(-k, k) * 0.6;
      this.camera.position.z += rand(-k, k);
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }
  }

  cameraBlockT(x0, z0, x1, z1) {
    const world = this.world;
    if (!world?.grid || !world.cell) return 1;
    const cell = world.cell;
    const steps = 10;
    for (let i = 5; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const gx = Math.floor(x / cell);
      const gz = Math.floor(z / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const arr = world.grid.get((gx + ox) + ',' + (gz + oz));
          if (!arr) continue;
          for (const c of arr) {
            const r = c.camR ?? c.r;
            if (Math.hypot(x - c.x, z - c.z) < r) return Math.max(0.58, t - 0.6 / steps);
          }
        }
      }
    }
    return 1;
  }

  updateBuffs(dt) {
    for (const key of ['damage', 'smell', 'rush', 'rage']) {
      if (this.buffs[key] > 0) {
        this.buffs[key] = Math.max(0, this.buffs[key] - dt);
        if (this.buffs[key] === 0 && (key === 'rush' || key === 'rage')) {
          this.ui.showHint(key === 'rage' ? 'The rage cools. Your tusks feel ordinary again.' : 'Your hooves slow to a steady trot.', 3);
        }
      }
    }
  }

  updateShockwaves(dt) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      const t = 1 - s.life / s.maxLife;
      s.mesh.scale.setScalar(0.6 + t * s.radius);
      s.mesh.material.opacity = Math.max(0, (1 - t) * 0.7);
      s.mesh.position.y = terrainHeight(s.x, s.z) + 0.1;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  spawnShockwave(x, y, z, radius = 6, color = 0xd9b567) {
    const geo = new THREE.RingGeometry(0.72, 1, 40);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, terrainHeight(x, z) + 0.1, z);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, x, z, life: 0.65, maxLife: 0.65, radius });
  }

  shake(amount = 0.3, duration = 0.25) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  regionAt(x, z) {
    let best = null;
    let bestScore = Infinity;
    for (const r of REGIONS) {
      const d = Math.hypot(x - r.x, z - r.z) / r.radius;
      if (d < 1.05 && d < bestScore) { bestScore = d; best = r; }
    }
    return best;
  }

  updateRegionAndLandmarks() {
    const p = this.player;
    const region = this.regionAt(p.pos.x, p.pos.z);
    if (region) {
      if (region.id !== this.currentRegion?.id) {
        this.currentRegion = region;
        this.ui.showRegion(region);
        this.audio.discover();
        if (!p.regions.has(region.id)) {
          p.regions.add(region.id);
          this.addXp(55);
          this.progressDaily('regions', 1);
          this.progressQuest('regions', 1, { region });
          this.ui.toast('Region discovered', region.name, 'info', '⌖');
        }
      }
      this.lastRegionId = region.id;
    }

    for (const l of LANDMARKS) {
      if (p.landmarks.has(l.id)) continue;
      if (Math.hypot(p.pos.x - l.x, p.pos.z - l.z) < l.radius + 1.5) {
        p.landmarks.add(l.id);
        this.audio.discover();
        this.addXp(l.secret ? 95 : 55);
        this.progressQuest('landmarks', 1, { landmark: l });
        this.progressDaily('landmarks', 1);
        this.ui.showBanner(l.secret ? 'SECRET DISCOVERED' : 'LANDMARK DISCOVERED', l.name, l.desc);
        this.ui.toast(l.secret ? 'A hidden place' : 'A place remembered', l.name, 'achievement', l.secret ? '✦' : '◆');
        this.effects.burst(l.x, terrainHeight(l.x, l.z) + 1.2, l.z, 30, {
          spread: 2.4, up: 3, size: 1, r: 0.95, g: 0.85, b: 0.5, life: 1.2, gravity: 1.4,
        });
      }
    }
  }

  updateInteraction(dt) {
    const p = this.player;
    const x = p.pos.x, z = p.pos.z;
    const digEdge = this.input.dig && !this.digWasDown;
    this.digWasDown = this.input.dig;
    let target = null;
    let kind = null;
    let text = '';
    let progress = null;

    const truffle = this.truffleManager.nearest(x, z, 2.9);
    const mushroom = this.truffleManager.nearestMushroom(x, z, 2.4);
    const chest = this.world.findChestNear(x, z, 2.7);
    const acorn = this.world.findCollectibleNear(x, z, 2.2);

    if (chest) {
      target = chest; kind = 'chest'; text = 'Press V — open the old chest';
      this.resetDig();
      if (this.pressed.has('KeyV') || digEdge) this.openChest(chest);
    } else if (acorn) {
      target = acorn; kind = 'acorn'; text = 'Press V — take the golden acorn';
      this.resetDig();
      if (this.pressed.has('KeyV') || digEdge) this.takeCollectible(acorn);
    } else if (truffle) {
      target = truffle; kind = 'truffle'; text = `Hold V — dig the ${truffle.type.name}`;
      if (this.input.dig) {
        this.digProgress += dt * p.stats.digSpeed / 1.55;
        progress = clamp(this.digProgress, 0, 1);
        this.boar.digging = true;
        this.digTarget = { x: truffle.x, z: truffle.z };
        if (this.boar.action !== 'dig') this.boar.setAction('dig', 999);
        this.digSoundTimer -= dt;
        if (this.digSoundTimer <= 0) {
          this.digSoundTimer = 0.24;
          this.audio.dig();
          this.dust.burst(truffle.x, truffle.y + 0.2, truffle.z, 5, {
            spread: 0.9, up: 1.4, size: 0.6, r: 0.42, g: 0.29, b: 0.16, life: 0.7, gravity: 2.4,
          });
        }
        if (this.digProgress >= 1) this.completeDig(truffle);
      } else {
        this.resetDig();
      }
    } else if (mushroom) {
      target = mushroom; kind = 'mushroom'; text = `Hold V — pick the ${mushroom.def.name}`;
      if (this.input.dig) {
        this.digProgress += dt * p.stats.digSpeed / 0.85;
        progress = clamp(this.digProgress, 0, 1);
        this.boar.digging = true;
        this.digTarget = { x: mushroom.x, z: mushroom.z };
        if (this.boar.action !== 'dig') this.boar.setAction('dig', 999);
        if (this.digProgress >= 1) this.collectMushroom(mushroom);
      } else {
        this.resetDig();
      }
    } else {
      this.resetDig();
      const rest = this.world.restSpot;
      if (Math.hypot(x - rest.x, z - rest.z) < rest.radius) {
        text = 'Hold V — rest by the fire';
        if (this.input.dig) {
          this.digProgress += dt / 2.2;
          progress = clamp(this.digProgress, 0, 1);
          this.boar.resting = true;
          if (this.digProgress >= 1) {
            p.stats.health = p.stats.maxHealth;
            p.stats.stamina = p.stats.maxStamina;
            p.stats.rage = Math.min(p.stats.maxRage, p.stats.rage + 20);
            this.audio.rest();
            this.ui.toast('Rested', 'The fire warms your bristles. Health and stamina restored.', 'level', '♨');
            this.digProgress = 0;
            this.boar.resting = false;
          }
        } else {
          this.digProgress = 0;
        }
      }
    }

    this.interaction = target ? { kind, target, text, progress } : null;
    if (target) {
      this.ui.setInteraction({ text, key: 'V', progress });
    } else {
      this.ui.setInteraction(null);
    }
  }

  resetDig() {
    if (this.digProgress > 0) this.digProgress = 0;
    this.boar.digging = false;
    this.digTarget = null;
    if (this.boar.action === 'dig') this.boar.clearAction();
  }

  updateChargeHits() {
    if (this.boar.action !== 'charge') return;
    const p = this.player;
    const stats = p.stats;
    const hitRadius = 1.65 + (p.skills.titan_charge ? 0.65 : 0);
    for (const e of this.enemyManager.enemies) {
      if (!e.alive || this.boar.chargeHit.has(e)) continue;
      const d = Math.hypot(e.pos.x - this.boar.pos.x, e.pos.z - this.boar.pos.z);
      if (d < hitRadius + e.radius) {
        this.boar.chargeHit.add(e);
        const crit = Math.random() < stats.critChance;
        let dmg = stats.attack * stats.chargeMultiplier * (crit ? 1.6 : 1) * (this.buffs.damage > 0 ? 1.25 : 1);
        if (this.buffs.rage > 0) dmg *= 1.4;
        e.takeDamage(dmg, this.boar.pos.x, this.boar.pos.z, { knockback: 7.5 + (p.skills.crushing_charge || 0) * 2, stun: 0.5, crit });
        this.audio.hit();
        this.shake(0.22, 0.16);
        this.dust.burst(e.pos.x, e.pos.y + 0.5, e.pos.z, 14, {
          spread: 2.4, up: 2.2, size: 0.8, r: 0.5, g: 0.36, b: 0.2, life: 0.7, gravity: 2.2,
        });
        this.progressDaily('charges', 1);
        this.gainRage(6);
      }
    }
  }

  gainRage(amount) {
    const s = this.player.stats;
    s.rage = clamp(s.rage + amount, 0, s.maxRage);
  }

  attack() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (this.cooldowns.attack > 0) return;
    const stats = this.player.stats;
    if (stats.stamina < 4) { this.ui.showWarning('Too tired to strike'); return; }
    this.cooldowns.attack = this.cooldownMax.attack;
    stats.stamina = Math.max(0, stats.stamina - 5);
    this.boar.setAction('attack', 0.46);
    this.audio.attack();
    this.boar.combo++;
    this.boar.comboTimer = 1.2;

    const fx = Math.sin(this.boar.yaw);
    const fz = Math.cos(this.boar.yaw);
    let hitAny = false;
    for (const e of this.enemyManager.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - this.boar.pos.x;
      const dz = e.pos.z - this.boar.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.25 + e.radius) continue;
      if ((dx / (d || 1)) * fx + (dz / (d || 1)) * fz < 0.05) continue;
      hitAny = true;
      const crit = Math.random() < stats.critChance;
      let dmg = stats.attack * (crit ? 1.65 : 1) * (this.buffs.damage > 0 ? 1.25 : 1);
      if (this.buffs.rage > 0) dmg *= 1.4;
      e.takeDamage(dmg, this.boar.pos.x, this.boar.pos.z, { knockback: 4.5, crit, stun: 0.28 });
      this.effects.burst(e.pos.x, e.pos.y + 0.8, e.pos.z, 12, {
        spread: 1.6, up: 2, size: 0.8, r: 1, g: 0.75, b: 0.35, life: 0.55, gravity: 2.4,
      });
      this.audio.hit();
      this.shake(0.18, 0.14);
      this.gainRage(7);
      if (this.player.skills.bloodlust) {
        stats.health = Math.min(stats.maxHealth, stats.health + 4 * (this.player.skills.bloodlust || 1));
      }
    }
    if (!hitAny) {
      this.dust.burst(this.boar.pos.x + fx * 1.2, this.boar.pos.y + 0.1, this.boar.pos.z + fz * 1.2, 5, {
        spread: 0.9, up: 1, size: 0.6, r: 0.5, g: 0.4, b: 0.25, life: 0.5, gravity: 2.4,
      });
    }
  }

  charge() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (!this.player.abilities.charge) { this.ui.showWarning('Charge is not unlocked'); return; }
    if (this.cooldowns.charge > 0) { this.ui.showWarning('Catch your breath'); return; }
    const stats = this.player.stats;
    if (stats.stamina < 20) { this.ui.showWarning('Too tired to charge'); return; }
    this.cooldowns.charge = this.cooldownMax.charge;
    stats.stamina -= 20;
    const dir = new THREE.Vector3(Math.sin(this.boar.yaw), 0, Math.cos(this.boar.yaw));
    this.boar.beginCharge(stats.speed * (this.player.skills.titan_charge ? 2.9 : 2.45), this.player.skills.titan_charge ? 0.95 : 0.72, dir);
    this.audio.charge();
    this.shake(0.22, 0.25);
    this.dust.burst(this.boar.pos.x, this.boar.pos.y + 0.15, this.boar.pos.z, 14, {
      spread: 1.8, up: 1.5, size: 0.9, r: 0.55, g: 0.42, b: 0.27, life: 0.8, gravity: 2.2,
    });
    this.gainRage(4);
  }

  stomp() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (!this.player.abilities.stomp) { this.ui.showWarning('Learn Ground Stomp in the Skills tab'); return; }
    if (this.cooldowns.stomp > 0) return;
    const stats = this.player.stats;
    if (stats.stamina < 18) { this.ui.showWarning('Too tired to stomp'); return; }
    this.cooldowns.stomp = this.cooldownMax.stomp;
    stats.stamina -= 18;
    const rank = this.player.skills.stomp_master || 0;
    const radius = 6.2 * (1 + rank * 0.35);
    this.boar.setAction('stomp', 0.6);
    this.audio.stomp();
    this.shake(0.65, 0.4);
    this.spawnShockwave(this.boar.pos.x, this.boar.pos.y, this.boar.pos.z, radius, 0xd9b567);
    this.effects.burst(this.boar.pos.x, this.boar.pos.y + 0.2, this.boar.pos.z, 34, {
      spread: 5.5, up: 3.5, size: 1.2, r: 0.72, g: 0.6, b: 0.38, life: 1, gravity: 2.6,
    });
    for (const e of this.enemyManager.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - this.boar.pos.x, e.pos.z - this.boar.pos.z);
      if (d < radius + e.radius) {
        const dmg = stats.attack * 1.35 * (1 + rank * 0.35) * (this.buffs.rage > 0 ? 1.35 : 1);
        e.takeDamage(dmg, this.boar.pos.x, this.boar.pos.z, { knockback: 9, stun: 0.65 });
        this.ui.damageNumber(e.pos, Math.round(dmg), 'crit');
      }
    }
    this.gainRage(12);
  }

  rush() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (!this.player.abilities.rush) { this.ui.showWarning('Learn Battle Rush in the Skills tab'); return; }
    if (this.cooldowns.rush > 0) return;
    const stats = this.player.stats;
    if (stats.stamina < 16) { this.ui.showWarning('Too tired to rush'); return; }
    this.cooldowns.rush = this.cooldownMax.rush;
    stats.stamina -= 16;
    this.buffs.rush = 3.2;
    this.audio.charge();
    this.audio.jump();
    this.ui.showWarning('Battle Rush!');
    this.boar.celebrate(0.6);
    this.effects.burst(this.boar.pos.x, this.boar.pos.y + 0.6, this.boar.pos.z, 24, {
      spread: 2.6, up: 2, size: 0.8, r: 0.7, g: 0.95, b: 0.7, life: 0.8, gravity: 0.6,
    });
    this.gainRage(5);
  }

  useRage() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (!this.player.abilities.rage) { this.ui.showWarning('Learn Primal Rage in the Skills tab'); return; }
    const stats = this.player.stats;
    if (stats.rage < stats.maxRage) {
      this.ui.showWarning(`Rage ${Math.floor(stats.rage)} / ${stats.maxRage}`);
      this.audio.error();
      return;
    }
    if (this.cooldowns.rage > 0) return;
    this.cooldowns.rage = this.cooldownMax.rage;
    stats.rage = 0;
    this.buffs.rage = 8 + (this.player.skills.rage_master ? 3 : 0);
    this.audio.rage();
    this.shake(0.4, 0.5);
    this.boar.celebrate(1.2);
    this.ui.showBanner('PRIMAL RAGE', 'The forest answers', 'Your tusks burn with old forest fury. Damage and speed are raised.');
    this.effects.burst(this.boar.pos.x, this.boar.pos.y + 0.8, this.boar.pos.z, 42, {
      spread: 2.4, up: 4, size: 1.2, r: 1, g: 0.35, b: 0.18, life: 1.2, gravity: 1.2,
    });
  }

  eatBerries() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (this.player.berries <= 0) { this.ui.showWarning('No berries left'); return; }
    this.player.berries--;
    const stats = this.player.stats;
    stats.health = Math.min(stats.maxHealth, stats.health + 35);
    stats.stamina = Math.min(stats.maxStamina, stats.stamina + 22);
    this.boar.setAction('eat', 1.1);
    this.audio.eat();
    this.effects.burst(this.boar.pos.x, this.boar.pos.y + 0.9, this.boar.pos.z, 10, {
      spread: 0.7, up: 1.2, size: 0.55, r: 0.8, g: 0.25, b: 0.35, life: 0.8, gravity: 1.2,
    });
    this.ui.damageNumber(this.boar.pos, '+35', 'heal');
  }

  sniff() {
    if (this.state !== 'playing' || this.boar.dead) return;
    if (this.cooldowns.sniff > 0) return;
    const stats = this.player.stats;
    if (stats.stamina < 6) { this.ui.showWarning('Too tired to sniff'); return; }
    this.cooldowns.sniff = this.cooldownMax.sniff;
    stats.stamina -= 6;
    this.sniffTimer = 7.5 + (this.player.skills.keen_nose || 0) * 1.4;
    this.boar.setAction('sniff', 0.9);
    this.audio.sniff();
    this.effects.burst(this.boar.pos.x, this.boar.pos.y + 1.2, this.boar.pos.z, 26, {
      spread: 2.4, up: 1.4, size: 0.7, r: 0.95, g: 0.82, b: 0.45, life: 1.3, gravity: 0.2,
    });
    this.ui.showHint('Scent trails glow for a few heartbeats. Follow the wisps to buried treasure.', 5);
  }

  completeDig(t) {
    if (!t || t.dug) return;
    this.collectTruffle(t);
    this.resetDig();
  }

  collectTruffle(t) {
    if (!t) return;
    const type = t.type;
    this.truffleManager.collect(t);
    const p = this.player;
    p.truffleCount++;
    p.truffleCounts[type.id] = (p.truffleCounts[type.id] || 0) + 1;
    p.coins += type.value;
    if (type.id === 'golden') p.goldenFound++;
    if (type.id === 'heart') p.legendaryFound++;
    this.addXp(type.xp);
    this.progressQuest('truffles', 1, { truffle: type });
    this.progressDaily('truffles', 1);
    if (type.rarity !== 'common') this.progressDaily('rareTruffle', 1);
    this.audio.digComplete(type.rarity);
    const label = type.rarity.charAt(0).toUpperCase() + type.rarity.slice(1);
    this.ui.toast(`${label} find`, `${type.name} · +${type.value} coins · +${type.xp} XP`, type.rarity === 'legendary' ? 'achievement' : 'level', '✦');
    this.effects.burst(t.x, t.y + 0.5, t.z, type.rarity === 'legendary' ? 48 : 22, {
      spread: 2, up: 3, size: type.rarity === 'legendary' ? 1.3 : 0.8,
      r: 1, g: 0.85, b: 0.45, life: 1.2, gravity: 1.8,
    });
    if (type.rarity === 'legendary' || type.rarity === 'rare') {
      this.boar.celebrate(1.8);
      this.ui.showBanner(type.rarity === 'legendary' ? 'LEGENDARY FIND' : 'A RARE FIND', type.name, type.lore);
      this.audio.achievement();
    }
    this.checkAchievements();
    this.saveGame(false);
  }

  collectMushroom(m) {
    if (!m) return;
    const def = m.def;
    this.truffleManager.collectMushroom(m);
    const p = this.player;
    p.mushroomCounts[def.id] = (p.mushroomCounts[def.id] || 0) + 1;
    p.coins += def.value;
    this.addXp(22);
    const stats = p.stats;
    switch (def.effect) {
      case 'heal': stats.health = Math.min(stats.maxHealth, stats.health + 35); break;
      case 'damage': this.buffs.damage = 45; break;
      case 'smell': this.buffs.smell = 45; break;
      case 'stamina': stats.stamina = Math.min(stats.maxStamina, stats.stamina + 60); break;
      case 'xp': this.addXp(120); break;
      default: break;
    }
    this.audio.pickup();
    this.ui.toast(def.name, `${def.effectText} · +${def.value} coins`, 'level', '♠');
    this.progressDaily('mushrooms', 1);
    this.progressQuest('mushroomsAll', 1, { count: Object.keys(p.mushroomCounts).length });
    this.resetDig();
    this.checkAchievements();
    this.saveGame(false);
  }

  openChest(chest) {
    if (!chest || chest.opened) return;
    this.world.openChest(chest);
    const p = this.player;
    p.chestsOpened++;
    const coins = 45 + Math.floor(Math.random() * 75);
    const xp = 55 + Math.floor(Math.random() * 35);
    p.coins += coins;
    this.addXp(xp);
    this.audio.chest();
    this.effects.burst(chest.x, terrainHeight(chest.x, chest.z) + 0.7, chest.z, 26, {
      spread: 1.8, up: 2.6, size: 0.9, r: 1, g: 0.82, b: 0.4, life: 1.1, gravity: 1.6,
    });
    this.ui.toast('Chest opened', `+${coins} coins · +${xp} XP`, 'level', '▣');
    this.progressQuest('chests', 1, { chest });
    this.progressDaily('chests', 1);
    this.checkAchievements();
    this.saveGame(false);
  }

  takeCollectible(item) {
    if (!item || item.taken) return;
    this.world.takeCollectible(item);
    const p = this.player;
    p.collectibles++;
    p.coins += 18;
    this.addXp(14);
    this.audio.coin();
    this.ui.toast('Golden acorn', '+18 coins · +14 XP', 'info', '◉');
    this.progressDaily('collectibles', 1);
    this.checkAchievements();
    this.saveGame(false);
  }

  damagePlayer(amount, enemy = null, opts = {}) {
    if (this.state !== 'playing' || this.boar.dead) return;
    const p = this.player;
    const stats = p.stats;
    let dmg = amount;

    if (p.skills.nimble && !this.boar.grounded) {
      this.ui.damageNumber(this.boar.pos, 'DODGE', 'heal');
      return;
    }
    if (this.input.guard && p.abilities.guard) {
      dmg *= 0.22;
      stats.stamina = Math.max(0, stats.stamina - 12);
      this.audio.guard();
      if (p.skills.guard_master && this.guardReflectCd <= 0 && enemy?.alive) {
        this.guardReflectCd = 0.65;
        enemy.takeDamage(stats.attack * 0.55, this.boar.pos.x, this.boar.pos.z, { knockback: 3, stun: 0.25 });
        this.audio.hit();
      }
    }
    if (this.buffs.rage > 0) dmg *= 0.78;
    dmg *= (1 - stats.damageReduction);
    dmg = Math.max(1, Math.round(dmg));
    stats.health = Math.max(0, stats.health - dmg);
    this.boar.playHurt();
    this.audio.hurt();
    this.shake(0.38, 0.28);
    this.ui.damageNumber(this.boar.pos, `-${dmg}`, 'hurt');
    this.flashHurt();
    this.gainRage(dmg * 0.65);

    if (p.skills.second_wind && stats.health > 0 && stats.health < stats.maxHealth * 0.2 && this.secondWindCd <= 0) {
      this.secondWindCd = 60;
      stats.health = Math.min(stats.maxHealth, stats.health + stats.maxHealth * 0.3);
      this.ui.toast('Second Wind', 'You refuse to fall. 30% health restored.', 'level', '♨');
      this.audio.levelUp();
      this.effects.burst(this.boar.pos.x, this.boar.pos.y + 1, this.boar.pos.z, 28, {
        spread: 2, up: 3, size: 1, r: 0.7, g: 1, b: 0.6, life: 1, gravity: 0.8,
      });
    }

    if (stats.health <= 0) this.die();
  }

  flashHurt() {
    const v = document.getElementById('vignette');
    if (!v) return;
    v.classList.remove('hurt');
    void v.offsetWidth;
    v.classList.add('hurt');
    clearTimeout(this.hurtClassTimer);
    this.hurtClassTimer = setTimeout(() => v.classList.remove('hurt'), 520);
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.player.stats.health = 0;
    this.boar.die();
    this.boar.digging = false;
    this.input.move.x = 0;
    this.input.move.z = 0;
    this.input.sprint = false;
    this.input.guard = false;
    this.input.dig = false;
    this.ui.setInteraction(null);
    this.audio.hurt();
    this.audio.roar();
    this.ui.showBossBar(null);
    this.deathTimer = 1.25;
    this.saveGame(false);
  }

  showDeath() {
    this.ui.el['death-screen'].classList.remove('hidden');
    this.ui.hideHUD();
  }

  respawn() {
    const p = this.player;
    p.coins = Math.floor(p.coins * 0.9);
    p.stats.health = p.stats.maxHealth;
    p.stats.stamina = p.stats.maxStamina;
    p.stats.rage = 0;
    this.boar.revive();
    this.boar.pos.set(0, terrainHeight(0, 4), 4);
    this.boar.yaw = Math.PI;
    this.player.yaw = this.boar.yaw;
    this.cameraYaw = this.boar.yaw + Math.PI;
    this.camSmooth.set(0, terrainHeight(0, 4) + 1.5, 4);
    this.state = 'playing';
    this.deathTimer = 0;
    this.ui.el['death-screen'].classList.add('hidden');
    this.ui.showHUD();
    this.ui.showRegion(REGIONS[0]);
    this.currentRegion = REGIONS[0];
    this.ui.toast('Back at the den', 'The forest carried you home. A little coin was lost.', 'info', '❧');
    this.enemyManager.enemies.forEach((e) => { if (e.aggro) { e.aggro = false; e.state = 'return'; } });
    this.saveGame(false);
  }

  onEnemyHit(enemy, dmg, opts = {}) {
    this.ui.damageNumber(enemy.pos, Math.round(dmg), opts.crit ? 'crit' : 'normal');
    this.effects.burst(enemy.pos.x, enemy.pos.y + 0.9, enemy.pos.z, 8, {
      spread: 1.2, up: 1.8, size: 0.7, r: 1, g: 0.4, b: 0.25, life: 0.5, gravity: 2.5,
    });
  }

  onEnemyDefeated(enemy) {
    const p = this.player;
    p.coins += enemy.stats.coins;
    this.addXp(enemy.stats.xp);
    p.enemiesDefeated++;
    this.enemyManager.defeated++;
    this.progressQuest('enemies', 1, { enemy });
    this.progressDaily('enemies', 1);
    this.audio.hit();
    this.effects.burst(enemy.pos.x, enemy.pos.y + 0.8, enemy.pos.z, 28, {
      spread: 2.6, up: 3, size: 1, r: 0.85, g: 0.55, b: 0.3, life: 1, gravity: 2,
    });
    if (enemy.boss) {
      p.bossesDefeated++;
      this.progressQuest('boss', 1, { enemy });
      this.unlockCosmetic('forest_crown');
      this.ui.showBanner('THE OLD GNARL FALLS', 'Ashen Ridge is free', 'The great bear is beaten. The forest will remember the boar who ended his reign.');
      this.ui.showBossBar(null);
      this.audio.quest();
      this.audio.levelUp();
      this.boar.celebrate(3);
    } else {
      this.ui.toast('Pack driven back', `${enemy.stats.name} defeated · +${enemy.stats.coins} coins`, 'info', '✦');
    }
    this.checkAchievements();
    this.saveGame(false);
  }

  setBossBar(enemy) {
    this.ui.showBossBar(enemy);
  }

  onFootstep(water = false) {
    this.audio.step(water);
    if (water) {
      this.audio.splash();
      this.dust.burst(this.boar.pos.x, this.boar.pos.y + 0.05, this.boar.pos.z, 6, {
        spread: 0.8, up: 1.2, size: 0.7, r: 0.55, g: 0.75, b: 0.7, life: 0.5, gravity: 2.4,
      });
    } else {
      this.dust.burst(this.boar.pos.x, this.boar.pos.y + 0.04, this.boar.pos.z, 3, {
        spread: 0.45, up: 0.7, size: 0.55, r: 0.48, g: 0.38, b: 0.24, life: 0.45, gravity: 2.2,
      });
    }
  }

  onJump() {
    this.audio.jump();
    this.dust.burst(this.boar.pos.x, this.boar.pos.y + 0.05, this.boar.pos.z, 7, {
      spread: 0.9, up: 1, size: 0.65, r: 0.5, g: 0.4, b: 0.26, life: 0.5, gravity: 2.2,
    });
  }

  onLand(power = 0) {
    this.audio.land();
    if (power > 4) this.shake(0.18, 0.16);
    this.dust.burst(this.boar.pos.x, this.boar.pos.y + 0.05, this.boar.pos.z, 10, {
      spread: 1.2, up: 1.2, size: 0.75, r: 0.5, g: 0.4, b: 0.26, life: 0.6, gravity: 2.2,
    });
  }

  onRestStart() {
    this.audio.rest();
    this.ui.showHint('The boar settles into the moss. Move to wake.', 4);
  }

  onResting(dt) {
    const s = this.player.stats;
    s.health = Math.min(s.maxHealth, s.health + dt * 1.4);
    s.stamina = Math.min(s.maxStamina, s.stamina + dt * 5);
  }

  progressQuest(type, amount = 1, detail = {}) {
    const completed = [];
    for (const q of QUESTS) {
      const st = this.questState[q.id];
      if (!st || st.status !== 'active') continue;
      let touched = false;
      q.objectives.forEach((o, i) => {
        let value = null;
        if (o.type === 'truffles' && type === 'truffles') value = (st.progress[i] || 0) + amount;
        else if (o.type === 'rarity' && type === 'truffles' && detail.truffle?.id === o.filter) value = (st.progress[i] || 0) + amount;
        else if (o.type === 'enemies' && type === 'enemies' && (!o.filter || detail.enemy?.type === o.filter)) value = (st.progress[i] || 0) + amount;
        else if (o.type === 'boss' && type === 'boss') value = (st.progress[i] || 0) + amount;
        else if (o.type === 'landmarks' && type === 'landmarks' && (!o.ids || o.ids.includes(detail.landmark?.id))) value = (st.progress[i] || 0) + amount;
        else if (o.type === 'chests' && type === 'chests' && (!o.ids || o.ids.includes(detail.chest?.id))) value = (st.progress[i] || 0) + amount;
        else if (o.type === 'mushroomsAll' && type === 'mushroomsAll') value = detail.count ?? (st.progress[i] || 0) + amount;
        else if (o.type === 'regions' && type === 'regions') value = detail.count ?? (st.progress[i] || 0) + amount;
        if (value !== null) {
          st.progress[i] = clamp(Math.max(st.progress[i] || 0, value), 0, o.count);
          touched = true;
        }
      });
      if (touched && q.objectives.every((o, i) => (st.progress[i] || 0) >= o.count)) completed.push(q);
    }
    for (const q of completed) this.completeQuest(q);
  }

  completeQuest(q) {
    const st = this.questState[q.id];
    if (!st || st.status === 'done') return;
    st.status = 'done';
    const p = this.player;
    const r = q.reward || {};
    if (r.coins) p.coins += r.coins;
    if (r.berries) p.berries += r.berries;
    if (r.cosmetic) this.unlockCosmetic(r.cosmetic);
    if (r.xp) this.addXp(r.xp);
    const rewardText = [r.xp ? `+${r.xp} XP` : '', r.coins ? `+${r.coins} coins` : '', r.berries ? `+${r.berries} berries` : ''].filter(Boolean).join(' · ');
    this.ui.toast('Quest complete', `${q.name}${rewardText ? ' · ' + rewardText : ''}`, 'achievement', '✦');
    this.audio.quest();
    this.effects.burst(this.player.pos.x, this.player.pos.y + 1.3, this.player.pos.z, 34, {
      spread: 2.2, up: 3.5, size: 1, r: 1, g: 0.9, b: 0.55, life: 1.4, gravity: 1.1,
    });
    this.refreshQuestAvailability(true);
    this.checkAchievements();
    this.saveGame(false);
  }

  refreshQuestAvailability(notify = true) {
    const p = this.player;
    for (const q of QUESTS) {
      let st = this.questState[q.id];
      if (!st) {
        st = { status: 'locked', visible: true, progress: q.objectives.map(() => 0) };
        this.questState[q.id] = st;
      }
      if (!Array.isArray(st.progress)) st.progress = q.objectives.map(() => 0);
      st.progress = q.objectives.map((o, i) => clamp(st.progress[i] || 0, 0, o.count));
      if (typeof st.visible !== 'boolean') st.visible = true;
      if (st.status === 'done') continue;
      const reqOk = (q.requires || []).every((id) => this.questState[id]?.status === 'done');
      const levelOk = !q.level || p.level >= q.level;
      const available = q.auto || (reqOk && levelOk);
      if (available && st.status !== 'active') {
        st.status = 'active';
        if (notify) {
          this.ui.toast('New forest task', q.name, 'info', '❧');
          this.audio.ui();
        }
      }
    }
  }

  getActiveQuests() {
    return QUESTS.filter((q) => this.questState[q.id]?.status === 'active');
  }

  achievementValue(metric) {
    const p = this.player;
    switch (metric) {
      case 'truffles': return p.truffleCount;
      case 'golden': return p.goldenFound;
      case 'legendary': return p.legendaryFound;
      case 'enemies': return p.enemiesDefeated;
      case 'bosses': return p.bossesDefeated;
      case 'regions': return p.regions.size;
      case 'landmarks': return p.landmarks.size;
      case 'level': return p.level;
      case 'mushroomsAll': return Object.keys(p.mushroomCounts).length;
      case 'chests': return p.chestsOpened;
      case 'collectibles': return p.collectibles;
      case 'dailies': return p.dailiesCompleted;
      default: return 0;
    }
  }

  checkAchievements(notify = true) {
    if (this.checkingAchievements) return;
    this.checkingAchievements = true;
    const p = this.player;
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      let st = p.achievements[a.id];
      if (!st) st = { progress: 0, done: false };
      const value = Math.min(a.target, this.achievementValue(a.metric));
      if (value > (st.progress || 0)) st.progress = value;
      if (!st.done && st.progress >= a.target) {
        st.done = true;
        st.progress = a.target;
        changed = true;
        if (a.reward?.coins) p.coins += a.reward.coins;
        if (a.reward?.cosmetic) this.unlockCosmetic(a.reward.cosmetic);
        if (a.reward?.xp) this.addXp(a.reward.xp);
        if (notify) {
          this.ui.toast('Trophy earned', `${a.name} · ${a.desc}`, 'achievement', '✦');
          this.audio.achievement();
        }
      }
      p.achievements[a.id] = st;
    }
    this.checkingAchievements = false;
    if (changed) {
      this.refreshQuestAvailability(false);
      this.saveGame(false);
    }
  }

  addXp(amount) {
    if (!amount || amount <= 0) return;
    const p = this.player;
    p.totalXp += amount;
    const result = levelFromXp(p.totalXp);
    p.xp = result.remaining;
    p.xpNeeded = result.needed;
    if (result.level > p.level) {
      const gained = result.level - p.level;
      p.level = result.level;
      p.skillPoints += gained * 2;
      p.title = this.titleForLevel(p.level);
      this.recomputeStats(true);
      p.stats.health = p.stats.maxHealth;
      p.stats.stamina = p.stats.maxStamina;
      this.audio.levelUp();
      this.boar.celebrate(2.6);
      this.effects.burst(p.pos.x, p.pos.y + 1.2, p.pos.z, 44, {
        spread: 2.6, up: 4, size: 1.2, r: 1, g: 0.9, b: 0.5, life: 1.4, gravity: 0.9,
      });
      this.ui.toast(`Level ${p.level}`, `${p.title} · +${gained * 2} skill points`, 'level', '▲');
      this.ui.showBanner('LEVEL ' + p.level, p.title, 'The forest knows your name a little better now.');
      this.checkAchievements();
    }
    this.checkAchievements();
  }

  progressDaily(metric, amount = 1) {
    if (!this.daily?.challenges) return;
    for (const c of this.daily.challenges) {
      if (c.claimed || c.complete) continue;
      if (c.metric !== metric) continue;
      c.progress = Math.min(c.target, (c.progress || 0) + amount);
      if (c.progress >= c.target) {
        c.complete = true;
        this.ui.toast('Daily challenge complete', `${c.name} — claim it in Quests.`, 'level', '☀');
        this.audio.quest();
      }
    }
    this.saveDaily();
  }

  claimDaily(index) {
    const c = this.daily?.challenges?.[index];
    if (!c || !c.complete || c.claimed) return;
    c.claimed = true;
    const p = this.player;
    p.coins += c.reward.coins;
    this.addXp(c.reward.xp);
    p.dailiesCompleted++;
    if (!this.daily.dayCredited) {
      this.daily.dayCredited = true;
      p.dailyStreak++;
    }
    this.audio.quest();
    this.ui.toast('Daily reward claimed', `${c.name} · +${c.reward.xp} XP · +${c.reward.coins} coins`, 'level', '☀');
    this.checkAchievements();
    this.saveDaily();
    this.saveGame(false);
  }

  buySkill(id) {
    const node = SKILL_MAP[id];
    if (!node) return false;
    const p = this.player;
    const rank = p.skills[id] || 0;
    if (rank >= node.max) return false;
    if (node.level && p.level < node.level) return false;
    if (!node.req.every((r) => (p.skills[r] || 0) > 0)) return false;
    if (this.skillPoints < node.cost) return false;
    p.skillPoints -= node.cost;
    p.skills[id] = rank + 1;
    this.recomputeStats(true);
    this.skillPoints = p.skillPoints;
    const unlocked = ['stomp', 'guard', 'rush', 'rage'].includes(id) && rank === 0;
    this.ui.toast(unlocked ? 'Primal art unlocked' : 'Skill improved', `${node.name}${unlocked ? ' — a new ability is yours' : ` · rank ${rank + 1}/${node.max}`}`, 'level', '✦');
    this.audio.levelUp();
    this.effects.burst(p.pos.x, p.pos.y + 1.1, p.pos.z, 24, {
      spread: 1.8, up: 2.6, size: 0.9, r: 0.9, g: 0.75, b: 0.4, life: 1, gravity: 1,
    });
    this.saveGame(false);
    return true;
  }

  equipCosmetic(id) {
    const p = this.player;
    if (!p.cosmeticsUnlocked.includes(id)) return false;
    const i = p.equippedCosmetics.indexOf(id);
    if (i >= 0) p.equippedCosmetics.splice(i, 1);
    else p.equippedCosmetics.push(id);
    this.boar.applyCosmetics(p.equippedCosmetics);
    this.saveGame(false);
    return true;
  }

  unlockCosmetic(id) {
    const p = this.player;
    if (p.cosmeticsUnlocked.includes(id)) return false;
    p.cosmeticsUnlocked.push(id);
    const def = COSMETICS.find((c) => c.id === id);
    if (def) {
      this.ui.toast('Cosmetic unlocked', `${def.name} — equip it in the Boar tab.`, 'achievement', def.icon);
      this.audio.achievement();
    }
    this.saveGame(false);
    return true;
  }
}



