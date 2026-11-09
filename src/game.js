import {
  TAU, CHARACTERS, ABILITIES, WEAPONS, WEAPON_MAX_LEVEL, getWeaponStats,
  PASSIVES, RELIC_RARITIES, RELICS, ENEMIES, BOSS_NAMES, WAVE_TITLES
} from './data.js';
import { SoundEngine } from './audio.js';

/* =========================================================================
   DOM + CORE
   ========================================================================= */
const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });

const ui = {
  hud: $('hud'), title: $('titleScreen'), levelup: $('levelupScreen'),
  pause: $('pauseScreen'), gameover: $('gameoverScreen'),
  charGrid: $('charGrid'), playBtn: $('playBtn'), bestRun: $('bestRun'),
  hudPortrait: $('hudPortrait'), hudName: $('hudName'), hudLevel: $('hudLevel'),
  hudKills: $('hudKills'), hudRelicCount: $('hudRelicCount'),
  hudTimer: $('hudTimer'), hudWave: $('hudWave'),
  xpFill: $('xpFill'), hpFill: $('hpFill'), shieldFill: $('shieldFill'), hpText: $('hpText'),
  abilityName: $('abilityName'), abilityIcon: $('abilityIcon'), abilityBtn: $('abilityBtn'),
  abilityCd: $('abilityCd'), statHint: $('statHint'), weaponStrip: $('weaponStrip'),
  relicStrip: $('relicStrip'), toastLayer: $('toastLayer'), waveBanner: $('waveBanner'),
  hint: $('hint'), bossBar: $('bossBar'), bossName: $('bossName'),
  bossFill: $('bossFill'), bossHpText: $('bossHpText'),
  pauseBtn: $('pauseBtn'), soundBtn: $('soundBtn'), resumeBtn: $('resumeBtn'),
  quitBtn: $('quitBtn'), retryBtn: $('retryBtn'), changeBtn: $('changeBtn'),
  gameoverKicker: $('gameoverKicker'), gameoverSub: $('gameoverSub'),
  gameoverStats: $('gameoverStats'), lootSummary: $('lootSummary'),
  levelupNum: $('levelupNum'), upgradeGrid: $('upgradeGrid'),
  joystick: $('joystick'), joyKnob: $('joyKnob')
};

const sound = new SoundEngine();
const keys = new Set();
const joystick = { active: false, pointerId: null, x: 0, y: 0 };

const RELIC_INFO = {};
for (const [rarity, list] of Object.entries(RELICS)) {
  for (const relic of list) RELIC_INFO[relic.id] = { ...relic, rarity };
}
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const TIER_NAMES = { 1: 'COMMON', 2: 'RARE', 3: 'EPIC', 4: 'LEGENDARY' };

// Readability palette: warm gold for player attacks, rust for enemy attacks,
// leaf green for experience. These stay consistent across the whole run.
const PLAYER_SHOT_COLOR = '#e6d3a3';
const ENEMY_SHOT_COLOR = '#b84f3a';
const XP_COLOR = '#7ed957';
const XP_BIG_COLOR = '#b6e35a';
const HEAL_COLOR = '#cfe8b8';

let W = 0, H = 0, DPR = 1, zoom = 1;
let state = 'title';
let selectedChar = CHARACTERS[0];
let player = null;
let run = null;
let camera = { x: 0, y: 0, shake: 0, shakeX: 0, shakeY: 0 };
let enemies = [], projectiles = [], enemyShots = [], gems = [], loot = [], heals = [];
let particles = [], texts = [], rings = [], effects = [];
let ambient = [], titleTime = 0;
let hitStop = 0;
let flash = { a: 0, color: '#ffffff' };
let deathTimer = 0;
let levelupChoices = [];
let lastFrame = 0;
let hudAcc = 0;
let bannerTimeout = null;
let hintTimeout = null;

/* =========================================================================
   HELPERS
   ========================================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const d2 = (x1, y1, x2, y2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// Steep, steadily increasing curve: early levels are quick enough to teach the
// systems, later levels demand real time in the run instead of constant menus.
const xpNextFor = level => Math.floor(10 + level * 6.5 + Math.pow(level, 1.55));
const tierColor = t => ({ 1: RELIC_RARITIES.common.color, 2: RELIC_RARITIES.rare.color, 3: RELIC_RARITIES.epic.color, 4: RELIC_RARITIES.legendary.color }[t] || '#fff');

function rgba(hex, a) {
  if (!hex || hex[0] !== '#') return `rgba(255,255,255,${a})`;
  const v = hex.length === 4
    ? [parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), parseInt(hex[3] + hex[3], 16)]
    : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  return `rgba(${v[0]},${v[1]},${v[2]},${a})`;
}
function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function weightedPick(list) {
  let total = 0;
  for (const item of list) total += item.w;
  let r = Math.random() * total;
  for (const item of list) {
    r -= item.w;
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}
function setText(el, value) {
  if (el && el.textContent !== String(value)) el.textContent = value;
}

/* =========================================================================
   CANVAS + AMBIENT
   ========================================================================= */
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  zoom = clamp(Math.min(W / 1060, H / 700) * 1.1, 0.7, 1.34);
  if (!ambient.length) initAmbient();
}

function initAmbient() {
  ambient = Array.from({ length: 76 }, () => ({
    x: rand(0, W), y: rand(0, H), vx: rand(-8, 8), vy: rand(-22, -5),
    r: rand(0.5, 2.1), a: rand(0.12, 0.6),
    c: pick(['#d8b56a', '#8fbf6a', '#c98a4b', '#b9b09a'])
  }));
}

function updateAmbient(dt) {
  titleTime += dt;
  for (const p of ambient) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
    if (p.x < -10) p.x = W + 10;
    if (p.x > W + 10) p.x = -10;
  }
}

/* =========================================================================
   TITLE / BEST RUN
   ========================================================================= */
function loadBest() {
  try { return JSON.parse(localStorage.getItem('gloamfall.best') || 'null'); }
  catch { return null; }
}
function saveBest() {
  const previous = loadBest();
  const candidate = { time: run.time, wave: run.wave, kills: run.kills, level: run.level, char: player.char.name };
  const isBest = !previous || candidate.time > previous.time || (candidate.time === previous.time && candidate.kills > previous.kills);
  if (isBest) {
    try { localStorage.setItem('gloamfall.best', JSON.stringify(candidate)); } catch {}
  }
  return isBest;
}
function refreshTitleBest() {
  const best = loadBest();
  ui.bestRun.textContent = best
    ? `BEST RUN  ${fmtTime(best.time)}  ·  WAVE ${best.wave}  ·  ${best.kills} KILLS`
    : 'NO RUNS YET — BE THE FIRST TO LAST';
}

function buildTitleCards() {
  ui.charGrid.innerHTML = CHARACTERS.map(c => {
    const weapon = WEAPONS[c.weapon];
    const ability = ABILITIES[c.ability];
    const bars = [
      ['POWER', c.bars.power], ['SPEED', c.bars.speed], ['GUARD', c.bars.guard]
    ].map(([label, value]) => `
      <div class="char-bar"><span>${label}</span><i><b style="width:${value * 20}%"></b></i></div>`).join('');
    return `
      <button class="char-card ${c.id === selectedChar.id ? 'selected' : ''}" data-char="${c.id}" style="--c:${c.color};--a:${c.accent}" aria-pressed="${c.id === selectedChar.id}">
        <span class="card-corner tl"></span><span class="card-corner br"></span>
        <div class="char-orb"><span>${c.icon}</span></div>
        <div class="char-head"><span class="char-name">${c.name}</span><span class="char-diff">${c.difficulty}</span></div>
        <div class="char-epithet">${c.epithet}</div>
        <div class="char-loadout"><span class="loadout-icon">${weapon.icon}</span><span>${weapon.name}</span></div>
        <div class="char-loadout ability"><span class="loadout-icon">${ability.icon}</span><span>${ability.name}</span></div>
        <div class="char-bars">${bars}</div>
      </button>`;
  }).join('');
}

function updateSoundButton() {
  ui.soundBtn.textContent = sound.muted ? '∅' : '♪';
  ui.soundBtn.classList.toggle('muted', sound.muted);
  ui.soundBtn.setAttribute('aria-pressed', String(!sound.muted));
}

/* =========================================================================
   RUN LIFECYCLE
   ========================================================================= */
function createPlayer(char) {
  const s = char.stats;
  return {
    char,
    x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0, r: 16,
    maxHp: s.maxHp, hp: s.maxHp, baseSpeed: s.speed,
    speedMul: 1, damageMul: s.damage, attackSpeed: s.attackSpeed, areaMul: s.area,
    critChance: s.crit, critMult: s.critMult,
    pickupMul: 1, basePickup: s.pickup, xpMul: s.xpGain, luck: s.luck,
    armor: s.armor, regen: s.regen,
    bonusProjectiles: 0, lifesteal: 0, igniteChance: 0, igniteDamage: 0,
    frost: 0, novaChance: 0, novaDamage: 0, chainHits: 0, execute: 0,
    cooldownMul: 1, stormLevel: 0, stormTimer: 3.5, lootMagnet: false,
    abilityCd: 0, guardTimer: 0, guardPulse: 0, shield: 0, overdriveTimer: 0,
    invuln: 1, facing: { x: 0, y: 1 }, moving: false, dead: false,
    trailTimer: 0,
    weapons: [{ type: char.weapon, level: 1, timer: 0.25, spin: rand(0, TAU) }]
  };
}

function startRun(char) {
  sound.init();
  sound.ui();
  selectedChar = char;
  state = 'playing';
  sound.playing = true;

  run = {
    time: 0, wave: 1, nextWaveAt: 25, kills: 0, level: 1, xp: 0, xpNext: xpNextFor(1),
    pendingLevels: 0, spawnTimer: 0.9, nextEliteAt: 34, nextBossAt: 62, bossCount: 0,
    lootPity: 0, passiveStacks: {}, relicCounts: {}, relicOrder: [], collected: { common: 0, rare: 0, epic: 0, legendary: 0 },
    damageDealt: 0, damageTaken: 0, startChar: char.id, newBest: false
  };
  player = createPlayer(char);
  enemies = []; projectiles = []; enemyShots = []; gems = []; loot = []; heals = [];
  particles = []; texts = []; rings = []; effects = [];
  camera = { x: 0, y: 0, shake: 5, shakeX: 0, shakeY: 0 };
  hitStop = 0; flash.a = 0; deathTimer = 0; levelupChoices = [];
  document.body.classList.add('in-run');
  document.body.classList.remove('low-hp');

  ui.title.classList.add('hidden');
  ui.levelup.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.bossBar.classList.add('hidden');
  ui.toastLayer.innerHTML = '';
  ui.upgradeGrid.innerHTML = '';
  ui.hint.classList.add('hidden');
  ui.relicStrip.innerHTML = '';
  ui.hudPortrait.textContent = char.icon;
  ui.hudPortrait.style.setProperty('--c', char.color);
  ui.hudPortrait.style.setProperty('--a', char.accent);
  ui.hudName.textContent = char.name.toUpperCase();
  ui.abilityName.textContent = ABILITIES[char.ability].name.toUpperCase();
  ui.abilityIcon.textContent = ABILITIES[char.ability].icon;

  spawnEnemy('grunt', { at: { x: 380, y: -120 } });
  spawnEnemy('grunt', { at: { x: -340, y: 150 } });
  spawnEnemy('runner', { at: { x: 80, y: 390 } });
  spawnLootAt(175, -55, 'rare');
  spawnLootAt(-160, 135, 'common');

  renderWeaponStrip();
  renderRelicStrip();
  updateHud();
  showBanner('WAVE 1', WAVE_TITLES[0], 'wave');
  showHint();
}

function renderWeaponStrip() {
  if (!player) return;
  ui.weaponStrip.innerHTML = player.weapons.map(w => {
    const def = WEAPONS[w.type];
    return `<div class="weapon-chip" style="--c:${def.color}" title="${def.name}">
      <span class="weapon-icon">${def.icon}</span><span class="weapon-name">${def.name}</span><b>LV ${w.level}</b>
    </div>`;
  }).join('');
}

function renderRelicStrip() {
  if (!run) return;
  const entries = Object.entries(run.relicCounts)
    .map(([id, count]) => ({ info: RELIC_INFO[id], count }))
    .filter(e => e.info)
    .sort((a, b) => RELIC_RARITIES[b.info.rarity].tier - RELIC_RARITIES[a.info.rarity].tier || b.count - a.count);
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const shown = entries.slice(0, 14);
  ui.relicStrip.innerHTML = shown.map(({ info, count }) => {
    const c = RELIC_RARITIES[info.rarity].color;
    return `<span class="relic-chip rarity-${info.rarity}" style="--c:${c}" title="${info.name} — ${info.text}">
      <span>${info.icon}</span>${count > 1 ? `<b>${count}</b>` : ''}
    </span>`;
  }).join('') + (entries.length > 14 ? `<span class="relic-more">+${entries.length - 14}</span>` : '');
  setText(ui.hudRelicCount, `${total} RELIC${total === 1 ? '' : 'S'}`);
}

function updateHud() {
  if (!player || !run) return;
  setText(ui.hudTimer, fmtTime(run.time));
  setText(ui.hudWave, `WAVE ${run.wave}`);
  setText(ui.hudLevel, `LV ${run.level}`);
  setText(ui.hudKills, `${run.kills} KILLS`);
  ui.xpFill.style.width = clamp((run.xp / run.xpNext) * 100, 0, 100).toFixed(2) + '%';
  const hpPct = clamp((player.hp / player.maxHp) * 100, 0, 100);
  ui.hpFill.style.width = hpPct.toFixed(2) + '%';
  ui.shieldFill.style.width = clamp((player.shield / player.maxHp) * 100, 0, 100).toFixed(2) + '%';
  setText(ui.hpText, `${Math.max(0, Math.ceil(player.hp))} / ${Math.ceil(player.maxHp)}`);
  const ability = ABILITIES[player.char.ability];
  const maxCd = ability.cooldown * player.cooldownMul;
  const ratio = player.abilityCd > 0 ? clamp(player.abilityCd / maxCd, 0, 1) : 0;
  ui.abilityCd.style.setProperty('--cd', ratio.toFixed(3));
  setText(ui.abilityCd, player.abilityCd > 0 ? Math.ceil(player.abilityCd) : '');
  ui.abilityBtn.classList.toggle('ready', player.abilityCd <= 0);
  setText(ui.statHint, player.abilityCd > 0 ? 'CHARGING' : 'READY');
  document.body.classList.toggle('low-hp', player.hp / player.maxHp < 0.3 && !player.dead);
  const boss = enemies.find(e => e.boss && !e.dead);
  if (boss) {
    ui.bossBar.classList.remove('hidden');
    setText(ui.bossName, boss.name);
    ui.bossFill.style.width = clamp((boss.hp / boss.maxHp) * 100, 0, 100).toFixed(2) + '%';
    setText(ui.bossHpText, `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`);
  } else {
    ui.bossBar.classList.add('hidden');
  }
}

function showToast(rarity, relic, suffix = '') {
  const meta = RELIC_RARITIES[rarity];
  const el = document.createElement('div');
  el.className = `toast rarity-${rarity}`;
  el.style.setProperty('--c', meta.color);
  el.innerHTML = `<span class="toast-icon">${relic.icon}</span>
    <div class="toast-copy"><span class="toast-rarity">${meta.name} RELIC${suffix}</span>
    <strong>${relic.name}</strong><small>${relic.text}</small></div>`;
  ui.toastLayer.prepend(el);
  while (ui.toastLayer.children.length > 4) ui.toastLayer.lastElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, 3400);
}

function showBanner(title, sub, kind = '') {
  clearTimeout(bannerTimeout);
  ui.waveBanner.className = `wave-banner ${kind}`;
  ui.waveBanner.innerHTML = `<span class="banner-title">${title}</span><span class="banner-sub">${sub}</span>`;
  void ui.waveBanner.offsetWidth;
  ui.waveBanner.classList.add('show');
  bannerTimeout = setTimeout(() => ui.waveBanner.classList.remove('show'), 2350);
}

function showHint() {
  clearTimeout(hintTimeout);
  ui.hint.classList.remove('hidden', 'fade');
  hintTimeout = setTimeout(() => ui.hint.classList.add('fade'), 4200);
  setTimeout(() => ui.hint.classList.add('hidden'), 5000);
}

function toTitle() {
  state = 'title';
  sound.playing = false;
  player = null;
  run = null;
  enemies = []; projectiles = []; enemyShots = []; gems = []; loot = []; heals = [];
  particles = []; texts = []; rings = []; effects = [];
  hitStop = 0; flash.a = 0;
  ui.hud.classList.add('hidden');
  ui.levelup.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.title.classList.remove('hidden');
  ui.toastLayer.innerHTML = '';
  ui.hint.classList.add('hidden');
  document.body.classList.remove('in-run', 'low-hp');
  buildTitleCards();
  refreshTitleBest();
  initAmbient();
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    sound.playing = false;
    ui.pause.classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'playing';
    sound.playing = true;
    ui.pause.classList.add('hidden');
  }
}

function toggleSound() {
  sound.init();
  sound.setMuted(!sound.muted);
  updateSoundButton();
  if (!sound.muted) sound.ui();
}

function die() {
  if (state !== 'playing') return;
  state = 'dying';
  deathTimer = 1.05;
  player.dead = true;
  player.hp = 0;
  sound.playing = false;
  sound.death();
  shake(24);
  flashScreen('#a8452f', 0.42);
  addRing(player.x, player.y, 160, '#b65a3c', 0.8, 5);
  spawnBurst(player.x, player.y, '#b65a3c', 48, 420, 0.9);
  spawnBurst(player.x, player.y, '#ffffff', 18, 300, 0.5);
  for (let i = 0; i < 12; i++) {
    addText(player.x + rand(-30, 30), player.y + rand(-30, 10), pick(['NO', 'NO', 'NO']), '#b65a3c', rand(12, 22));
  }
}

function endRun() {
  if (!run || !player) return;
  state = 'gameover';
  sound.playing = false;
  run.newBest = saveBest();
  ui.gameoverKicker.textContent = run.newBest ? 'NEW BEST RUN' : 'RUN ENDED';
  ui.gameoverKicker.classList.toggle('gold', run.newBest);
  const flavor = run.time < 45 ? 'The dark barely noticed you.' : run.time < 120 ? 'You made the gloam work for it.' : run.time < 240 ? 'A worthy offering to the night.' : 'The horde will remember your name.';
  ui.gameoverSub.textContent = flavor;
  ui.gameoverStats.innerHTML = [
    ['SURVIVED', fmtTime(run.time)], ['WAVE', run.wave], ['KILLS', run.kills],
    ['LEVEL', run.level], ['DAMAGE', Math.round(run.damageDealt)], ['SURVIVOR', player.char.name.toUpperCase()]
  ].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
  ui.lootSummary.innerHTML = RARITY_ORDER.map(r =>
    `<span class="loot-pill rarity-${r}" style="--c:${RELIC_RARITIES[r].color}">${run.collected[r]} ${RELIC_RARITIES[r].name}</span>`
  ).join('');
  ui.gameover.classList.remove('hidden');
  document.body.classList.remove('low-hp');
  if (run.newBest) {
    flashScreen('#d8b56a', 0.2);
    showToast('legendary', { icon: '★', name: 'New Best Run', text: `${fmtTime(run.time)} survived — wave ${run.wave}` }, '');
  }
}

/* =========================================================================
   MAIN UPDATE
   ========================================================================= */
function updateGame(dt) {
  run.time += dt;
  updateSpawner(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateEnemyShots(dt);
  updatePickups(dt);
  updateEffects(dt);
  updateParticles(dt);
  updateTexts(dt);
  updateRings(dt);
  updateCamera(dt);
  flash.a = Math.max(0, flash.a - dt * 2.1);
  sound.music(dt);
  hudAcc += dt;
  if (hudAcc > 0.05) { hudAcc = 0; updateHud(); }
}

function enemyTable(time) {
  const table = [{ type: 'grunt', w: 10 }];
  if (time > 15) table.push({ type: 'runner', w: 6 });
  if (time > 40) table.push({ type: 'tank', w: 3 });
  if (time > 58) table.push({ type: 'shooter', w: 3.4 });
  if (time > 85) table.push({ type: 'splitter', w: 3 });
  return table;
}

function updateSpawner(dt) {
  if (run.time >= run.nextWaveAt) {
    run.wave++;
    run.nextWaveAt += 25;
    showBanner(`WAVE ${run.wave}`, WAVE_TITLES[(run.wave - 1) % WAVE_TITLES.length], 'wave');
    sound.wave();
    shake(5);
    const burst = 3 + Math.min(8, Math.floor(run.wave / 2));
    for (let i = 0; i < burst; i++) spawnEnemy(weightedPick(enemyTable(run.time)).type);
  }
  if (run.time >= run.nextEliteAt && run.time > 30) {
    spawnElite();
    run.nextEliteAt += rand(24, 34);
  }
  if (run.time >= run.nextBossAt) {
    run.nextBossAt += 72;
    spawnBoss();
  }
  run.spawnTimer -= dt;
  if (run.spawnTimer > 0) return;
  run.spawnTimer = Math.max(0.32, 1.12 - run.time * 0.0024) * rand(0.88, 1.14);
  const cap = 125 + run.wave * 6;
  if (enemies.length >= cap) return;
  let count = 1 + Math.floor(run.time / 70) + (Math.random() < 0.26 ? 1 : 0);
  if (run.time < 15) count = 1;
  const table = enemyTable(run.time);
  for (let i = 0; i < count; i++) spawnEnemy(weightedPick(table).type);
}

function spawnElite() {
  const base = pick(enemyTable(run.time)).type;
  const e = spawnEnemy(base, { elite: true });
  e.name = `ELITE ${ENEMIES[base].name.toUpperCase()}`;
  showBanner('ELITE', e.name, 'elite');
  sound.wave();
  shake(7);
}

function spawnBoss() {
  if (enemies.some(e => e.boss && !e.dead)) { run.nextBossAt += 8; return; }
  const e = spawnEnemy('boss');
  e.name = BOSS_NAMES[run.bossCount % BOSS_NAMES.length];
  run.bossCount++;
  showBanner('BOSS', e.name, 'boss');
  sound.boss();
  shake(16);
  flashScreen('#b65a3c', 0.12);
}

function spawnEnemy(type, opts = {}) {
  const cfg = ENEMIES[type];
  const elite = !!opts.elite;
  const boss = !!opts.boss || !!cfg.boss;
  let x = opts.at?.x;
  let y = opts.at?.y;
  if (x === undefined || y === undefined) {
    // Spawn just beyond the visible edge rather than at a huge circular radius,
    // so desktop players are not left staring at an empty arena.
    const pad = 70;
    const halfW = W / (2 * zoom) + pad;
    const halfH = H / (2 * zoom) + pad;
    const side = randInt(0, 3);
    if (side === 0) {
      x = player.x + rand(-halfW, halfW);
      y = player.y - halfH;
    } else if (side === 1) {
      x = player.x + halfW;
      y = player.y + rand(-halfH, halfH);
    } else if (side === 2) {
      x = player.x + rand(-halfW, halfW);
      y = player.y + halfH;
    } else {
      x = player.x - halfW;
      y = player.y + rand(-halfH, halfH);
    }
  }
  const hpScale = 1 + run.time * 0.011 + (run.wave - 1) * 0.07;
  let hp = cfg.hp * hpScale;
  if (boss) hp = cfg.hp * 0.64 * (1 + run.time * 0.012 + run.wave * 0.08);
  if (elite) hp *= 6;
  const damage = cfg.damage * (1 + run.time * 0.0045 + (run.wave - 1) * 0.035) * (elite ? 1.5 : 1) * (boss ? 1.1 : 1);
  const speed = cfg.speed * (1 + Math.min(0.28, run.time * 0.0009)) * (elite ? 0.93 : 1) * (boss ? 1.05 : 1);
  const e = {
    type, cfg, x, y, vx: 0, vy: 0, kx: 0, ky: 0,
    r: cfg.radius * (elite ? 1.3 : 1), hp, maxHp: hp, speed, damage,
    xp: cfg.xp * (elite ? 8 : 1), color: cfg.color, accent: cfg.accent,
    elite, boss, name: cfg.name.toUpperCase(), dead: false,
    hitFlash: 0, contactCd: 0, slowTimer: 0, slowAmt: 0,
    burn: 0, burnDps: 0, burnTick: 0, thornCd: 0, spawnTime: 0,
    wobble: rand(0, TAU), phase: rand(0, TAU), shootCd: rand(1.2, 2.4),
    burstCd: rand(2, 3.2), summonCd: rand(4, 7)
  };
  enemies.push(e);
  return e;
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.dead) continue;
    e.spawnTime += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.contactCd = Math.max(0, e.contactCd - dt);
    e.thornCd = Math.max(0, e.thornCd - dt);
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.35;
        hitEnemy(e, e.burnDps * 0.35, { source: 'burn', color: '#c9743f', noCrit: true, silent: true });
      }
      if (e.dead) continue;
    }
    let slow = 1;
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      slow = 1 - e.slowAmt;
    }
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dd = Math.max(1, Math.hypot(dx, dy));
    let mx = dx / dd;
    let my = dy / dd;

    if (e.cfg.ranged) {
      e.shootCd -= dt;
      if (dd > 340) { mx = dx / dd; my = dy / dd; }
      else if (dd < 220) { mx = -dx / dd; my = -dy / dd; }
      else { mx = -dy / dd * 0.7; my = dx / dd * 0.7; }
      if (e.shootCd <= 0 && dd < 540) {
        e.shootCd = rand(1.8, 2.8);
        const ang = Math.atan2(dy, dx);
        spawnEnemyShot(e.x, e.y, ang, 140, e.damage * 0.6, ENEMY_SHOT_COLOR);
      }
    } else if (e.boss) {
      e.burstCd -= dt;
      e.summonCd -= dt;
      if (e.burstCd <= 0) {
        e.burstCd = 3.1;
        radialBurst(e, 10 + Math.floor(run.wave / 4));
      }
      if (e.summonCd <= 0) {
        e.summonCd = 8.5;
        if (enemies.length < 220) {
          for (let i = 0; i < 4; i++) {
            const ang = rand(0, TAU);
            spawnEnemy(pick(['grunt', 'runner']), { at: { x: e.x + Math.cos(ang) * rand(55, 120), y: e.y + Math.sin(ang) * rand(55, 120) } });
          }
          addRing(e.x, e.y, 130, '#d8b56a', 0.6, 3);
        }
      }
      if (e.hp < e.maxHp * 0.45) { mx *= 1.16; my *= 1.16; }
    }
    if (e.type === 'runner') {
      const wob = Math.sin(run.time * 7 + e.wobble) * 0.4;
      const nx = mx, ny = my;
      mx = nx - ny * wob;
      my = ny + nx * wob;
    }
    if (e.type === 'splitter') {
      const wob = Math.sin(run.time * 3 + e.wobble) * 0.18;
      const nx = mx, ny = my;
      mx = nx - ny * wob;
      my = ny + nx * wob;
    }
    e.x += (mx * e.speed * slow + e.kx) * dt;
    e.y += (my * e.speed * slow + e.ky) * dt;
    const decay = 1 - Math.exp(-8 * dt);
    e.kx = lerp(e.kx, 0, decay);
    e.ky = lerp(e.ky, 0, decay);
    if (dd < e.r + player.r + 2 && e.contactCd <= 0) {
      e.contactCd = 0.82;
      hurtPlayer(e.damage, e);
    }
  }

  // Soft separation so the horde reads as a horde, not one blob.
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.8;
      const dd = dx * dx + dy * dy;
      if (dd > 0.001 && dd < min * min) {
        const d = Math.sqrt(dd);
        const push = (min - d) / d * 0.42;
        const wa = a.boss ? 0.15 : 1;
        const wb = b.boss ? 0.15 : 1;
        a.x -= dx * push * wa;
        a.y -= dy * push * wa;
        b.x += dx * push * wb;
        b.y += dy * push * wb;
      }
    }
  }
  enemies = enemies.filter(e => !e.dead);
}

function radialBurst(e, count) {
  for (let i = 0; i < count; i++) {
    const ang = i / count * TAU + rand(-0.08, 0.08);
    spawnEnemyShot(e.x + Math.cos(ang) * e.r, e.y + Math.sin(ang) * e.r, ang, 132, e.damage * 0.52, ENEMY_SHOT_COLOR);
  }
  addRing(e.x, e.y, 90, '#d8b56a', 0.4, 3);
  sound.explode();
}

function spawnEnemyShot(x, y, angle, speed, damage, color) {
  enemyShots.push({
    x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    r: 6, damage, color, life: 4.5, spin: rand(0, TAU)
  });
}

function updatePlayer(dt) {
  if (!player || player.dead) return;
  player.abilityCd = Math.max(0, player.abilityCd - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.guardTimer = Math.max(0, player.guardTimer - dt);
  player.overdriveTimer = Math.max(0, player.overdriveTimer - dt);
  if (player.guardTimer <= 0) player.shield = 0;
  if (player.regen > 0) player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);

  if (player.guardTimer > 0) {
    player.guardPulse -= dt;
    if (player.guardPulse <= 0) {
      player.guardPulse = 0.5;
      const radius = 92 * player.areaMul;
      for (const e of enemies) {
        if (!e.dead && d2(e.x, e.y, player.x, player.y) < (radius + e.r) ** 2) {
          hitEnemy(e, 13 * player.damageMul, { source: 'guard', color: '#8fbf6a', noChain: true });
        }
      }
      addRing(player.x, player.y, radius, '#8fbf6a', 0.35, 2);
      spawnBurst(player.x, player.y, '#8fbf6a', 5, 130, 0.35);
    }
  }

  if (player.stormLevel > 0) {
    player.stormTimer -= dt;
    if (player.stormTimer <= 0) {
      player.stormTimer = Math.max(1.9, 3.6 - player.stormLevel * 0.18);
      const target = nearestEnemy(player.x, player.y, 720);
      if (target) castChain(target, 3 + player.stormLevel * 2, (17 + player.stormLevel * 5) * player.damageMul, '#d8b56a');
    }
  }

  const input = getMoveInput();
  const speed = player.baseSpeed * player.speedMul * (player.overdriveTimer > 0 ? 1.35 : 1) * (player.guardTimer > 0 ? 0.9 : 1);
  const accel = 1 - Math.exp(-15 * dt);
  player.vx = lerp(player.vx, input.x * speed, accel);
  player.vy = lerp(player.vy, input.y * speed, accel);
  player.x += (player.vx + player.kx) * dt;
  player.y += (player.vy + player.ky) * dt;
  const kdecay = 1 - Math.exp(-10 * dt);
  player.kx = lerp(player.kx, 0, kdecay);
  player.ky = lerp(player.ky, 0, kdecay);
  player.moving = Math.hypot(player.vx, player.vy) > 12;
  if (Math.hypot(input.x, input.y) > 0.08) {
    player.facing.x = input.x;
    player.facing.y = input.y;
  }
  player.trailTimer -= dt;
  if (player.moving && player.trailTimer <= 0) {
    player.trailTimer = 0.055;
    spawnParticle(player.x + rand(-6, 6), player.y + rand(-4, 8), rand(-10, 10), rand(-4, 18), rand(2, 5), player.char.color, rand(0.2, 0.42), 0, 0.9, true);
  }
  for (const weapon of player.weapons) updateWeapon(weapon, dt);
}

function updateWeapon(weapon, dt) {
  const stats = getWeaponStats(weapon.type, weapon.level, player);
  if (weapon.type === 'thorn') {
    weapon.spin += stats.speed * dt;
    checkOrbitHits(weapon, stats);
    return;
  }
  if (weapon.type === 'flame') {
    weapon.timer -= dt;
    if (weapon.timer <= 0) {
      weapon.timer = stats.cooldown;
      auraPulse(stats);
    }
    return;
  }
  weapon.timer -= dt;
  if (weapon.timer > 0) return;
  const target = nearestEnemy(player.x, player.y, stats.range || 700);
  if (!target) { weapon.timer = 0.1; return; }
  weapon.timer = stats.cooldown;
  fireWeapon(weapon, stats, target);
}

function fireWeapon(weapon, stats, target) {
  const baseAng = Math.atan2(target.y - player.y, target.x - player.x);
  if (weapon.type === 'bolt') {
    const count = Math.floor(stats.count);
    for (let i = 0; i < count; i++) {
      const ang = baseAng + (i - (count - 1) / 2) * 0.13;
      spawnProjectile({
        x: player.x + Math.cos(ang) * 6, y: player.y + Math.sin(ang) * 6,
        vx: Math.cos(ang) * stats.speed, vy: Math.sin(ang) * stats.speed,
        r: stats.radius, damage: stats.damage, pierce: stats.pierce,
        color: PLAYER_SHOT_COLOR, kind: 'bolt', homing: stats.homing, life: 1.35, angle: ang
      });
    }
    spawnBurst(player.x + Math.cos(baseAng) * 10, player.y + Math.sin(baseAng) * 10, PLAYER_SHOT_COLOR, 3, 110, 0.25);
  } else if (weapon.type === 'scatter') {
    const count = Math.floor(stats.count);
    for (let i = 0; i < count; i++) {
      const ang = baseAng + (i - (count - 1) / 2) * (stats.spread / Math.max(1, count - 1)) + rand(-0.04, 0.04);
      spawnProjectile({
        x: player.x + Math.cos(ang) * 6, y: player.y + Math.sin(ang) * 6,
        vx: Math.cos(ang) * stats.speed * rand(0.9, 1.1), vy: Math.sin(ang) * stats.speed * rand(0.9, 1.1),
        r: stats.radius, damage: stats.damage, pierce: stats.pierce,
        color: PLAYER_SHOT_COLOR, kind: 'shard', homing: 0, life: 0.95, angle: ang
      });
    }
    spawnBurst(player.x + Math.cos(baseAng) * 10, player.y + Math.sin(baseAng) * 10, PLAYER_SHOT_COLOR, 5, 150, 0.3);
  } else if (weapon.type === 'boomerang') {
    const count = Math.floor(stats.count);
    for (let i = 0; i < count; i++) {
      const ang = baseAng + (i - (count - 1) / 2) * 0.28;
      spawnProjectile({
        x: player.x, y: player.y,
        vx: Math.cos(ang) * stats.speed, vy: Math.sin(ang) * stats.speed,
        r: stats.radius, damage: stats.damage, pierce: 999,
        color: PLAYER_SHOT_COLOR, kind: 'chakram', homing: 0, life: 2.1,
        angle: ang, mode: 'out', outTimer: 0.5, spin: 0
      });
    }
  } else if (weapon.type === 'chain') {
    castChain(target, stats.chains, stats.damage, PLAYER_SHOT_COLOR);
    spawnBurst(target.x, target.y, PLAYER_SHOT_COLOR, 7, 160, 0.35);
  }
  sound.shoot();
}

function spawnProjectile(opts) {
  projectiles.push({
    ...opts, life: opts.life ?? 1.2, maxLife: opts.life ?? 1.2,
    hit: new Set(), dead: false, trailTimer: 0, spin: opts.spin ?? 0,
    mode: opts.mode || 'straight'
  });
}

function checkOrbitHits(weapon, stats) {
  const count = Math.max(1, Math.floor(stats.count));
  for (let i = 0; i < count; i++) {
    const ang = weapon.spin + i * TAU / count;
    const bx = player.x + Math.cos(ang) * stats.radius;
    const by = player.y + Math.sin(ang) * stats.radius;
    for (const e of enemies) {
      if (e.dead || e.thornCd > 0) continue;
      if (d2(e.x, e.y, bx, by) < (e.r + 13) ** 2) {
        e.thornCd = 0.3;
        hitEnemy(e, stats.damage, { source: 'thorn', color: '#8fbf6a' });
        spawnBurst(bx, by, '#8fbf6a', 4, 130, 0.25);
      }
    }
  }
}

function auraPulse(stats) {
  const radius = stats.radius;
  for (const e of enemies) {
    if (!e.dead && d2(e.x, e.y, player.x, player.y) < (radius + e.r) ** 2) {
      hitEnemy(e, stats.damage, { source: 'flame', color: '#c9743f', noChain: true });
    }
  }
  for (let i = 0; i < 3; i++) {
    const ang = rand(0, TAU);
    const rr = rand(radius * 0.45, radius);
    spawnParticle(player.x + Math.cos(ang) * rr, player.y + Math.sin(ang) * rr, rand(-15, 15), rand(-55, -20), rand(2, 5), pick(['#c9743f', '#d8b56a', '#b65a3c']), rand(0.3, 0.7), -20, 0.9, true);
  }
}

function useAbility() {
  if (state !== 'playing' || !player || player.abilityCd > 0 || player.dead) return;
  const ability = ABILITIES[player.char.ability];
  player.abilityCd = ability.cooldown * player.cooldownMul;
  sound.ability();
  shake(6);
  const input = getMoveInput();
  const dir = Math.hypot(input.x, input.y) > 0.1 ? input : player.facing;
  const len = Math.max(0.001, Math.hypot(dir.x, dir.y));
  const nx = dir.x / len;
  const ny = dir.y / len;
  if (ability.id === 'blink') {
    const ox = player.x, oy = player.y;
    player.x += nx * 190;
    player.y += ny * 190;
    player.invuln = Math.max(player.invuln, 0.62);
    explodeAt(ox, oy, 98 * player.areaMul, 42 * player.damageMul, '#d8b56a', { fromAbility: true });
    explodeAt(player.x, player.y, 98 * player.areaMul, 42 * player.damageMul, '#7f9a63', { fromAbility: true });
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      spawnParticle(lerp(ox, player.x, t), lerp(oy, player.y, t), rand(-20, 20), rand(-20, 20), rand(3, 7), pick(['#d8b56a', '#7f9a63']), 0.4, 0, 0.9, true);
    }
    flashScreen('#d8b56a', 0.09);
  } else if (ability.id === 'guard') {
    player.guardTimer = 4.2;
    player.shield = 58 + player.level * 5;
    player.guardPulse = 0;
    addRing(player.x, player.y, 120, '#8fbf6a', 0.6, 4);
    spawnBurst(player.x, player.y, '#8fbf6a', 20, 230, 0.6);
    flashScreen('#8fbf6a', 0.08);
  } else if (ability.id === 'overdrive') {
    player.overdriveTimer = 5.2;
    addRing(player.x, player.y, 100, '#c98a4b', 0.55, 4);
    spawnBurst(player.x, player.y, '#c98a4b', 22, 260, 0.55);
    flashScreen('#c98a4b', 0.08);
  } else if (ability.id === 'singularity') {
    let tx = player.x + nx * 250;
    let ty = player.y + ny * 250;
    const target = nearestEnemy(player.x, player.y, 560);
    if (target) { tx = target.x; ty = target.y; }
    effects.push({ type: 'vortex', x: tx, y: ty, radius: 180 * player.areaMul, life: 1.8, duration: 1.8, tick: 0, color: '#9b6bb3' });
    addRing(tx, ty, 190 * player.areaMul, '#9b6bb3', 0.6, 4);
    spawnBurst(tx, ty, '#9b6bb3', 24, 260, 0.7);
    flashScreen('#9b6bb3', 0.1);
  }
  updateHud();
}

/* =========================================================================
   PROJECTILES, PICKUPS, EFFECTS
   ========================================================================= */
function updateProjectiles(dt) {
  for (const p of projectiles) {
    if (p.dead) continue;
    p.life -= dt;
    p.spin += 19 * dt;
    if (p.homing > 0 && p.kind === 'bolt') {
      const target = nearestEnemy(p.x, p.y, 440);
      if (target) {
        const ang = Math.atan2(target.y - p.y, target.x - p.x);
        const cur = Math.atan2(p.vy, p.vx);
        const diff = angleDiff(ang, cur);
        const turn = Math.min(Math.abs(diff), p.homing * dt);
        const na = cur + Math.sign(diff) * turn;
        const sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(na) * sp;
        p.vy = Math.sin(na) * sp;
      }
    }
    if (p.kind === 'chakram') {
      if (p.mode === 'out') {
        p.outTimer -= dt;
        if (p.outTimer <= 0) { p.mode = 'back'; p.hit.clear(); }
      } else {
        const ang = Math.atan2(player.y - p.y, player.x - p.x);
        const sp = Math.hypot(p.vx, p.vy);
        const turn = 1 - Math.exp(-9 * dt);
        p.vx = lerp(p.vx, Math.cos(ang) * sp, turn);
        p.vy = lerp(p.vy, Math.sin(ang) * sp, turn);
        if (d2(p.x, p.y, player.x, player.y) < 26 * 26) { p.dead = true; continue; }
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.trailTimer -= dt;
    if (p.trailTimer <= 0) {
      p.trailTimer = 0.028;
      spawnParticle(p.x, p.y, rand(-10, 10), rand(-10, 10), rand(1.5, 3.5), p.color, rand(0.16, 0.32), 0, 0.85, true);
    }
    for (const e of enemies) {
      if (e.dead || p.hit.has(e)) continue;
      if (d2(p.x, p.y, e.x, e.y) < (p.r + e.r) ** 2) {
        p.hit.add(e);
        hitEnemy(e, p.damage, { source: p.kind, color: p.color, knock: p.kind === 'chakram' ? 75 : 45 });
        spawnBurst(p.x, p.y, p.color, 4, 150, 0.28);
        p.pierce--;
        if (p.pierce < 0) { p.dead = true; break; }
      }
    }
    if (p.life <= 0 || d2(p.x, p.y, player.x, player.y) > 2100 * 2100) p.dead = true;
  }
  projectiles = projectiles.filter(p => !p.dead);
}

function updateEnemyShots(dt) {
  for (const s of enemyShots) {
    s.life -= dt;
    s.spin += dt * 6;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d2(s.x, s.y, player.x, player.y) < (s.r + player.r) ** 2) {
      hurtPlayer(s.damage, s);
      spawnBurst(s.x, s.y, s.color, 8, 190, 0.35);
      s.life = 0;
    }
  }
  enemyShots = enemyShots.filter(s => s.life > 0);
}

function updatePickups(dt) {
  const pickupRadius = player.basePickup * player.pickupMul;
  for (const g of gems) {
    if (g.dead) continue;
    g.phase += dt * 4;
    if (!g.magnet) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      const decay = Math.exp(-5 * dt);
      g.vx *= decay;
      g.vy *= decay;
    }
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dd = Math.hypot(dx, dy);
    if (g.magnet || dd < pickupRadius) {
      g.magnet = true;
      const sp = 340 + (1 - clamp(dd / 260, 0, 1)) * 300;
      g.x += dx / Math.max(1, dd) * sp * dt;
      g.y += dy / Math.max(1, dd) * sp * dt;
    } else if (dd > 26) {
      // Kills happen at range, so let stray motes drift home instead of being lost.
      g.x += dx / dd * 58 * dt;
      g.y += dy / dd * 58 * dt;
    }
    if (dd < 24) {
      gainXp(g.value);
      spawnBurst(g.x, g.y, '#7ed957', 5, 120, 0.3);
      g.dead = true;
    }
  }
  gems = gems.filter(g => !g.dead);

  for (const l of loot) {
    if (l.dead) continue;
    l.phase += dt * 3;
    l.rot += dt * 1.6;
    if (!l.magnet) {
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      const decay = Math.exp(-5 * dt);
      l.vx *= decay;
      l.vy *= decay;
    }
    const dx = player.x - l.x;
    const dy = player.y - l.y;
    const dd = Math.hypot(dx, dy);
    if (l.magnet || player.lootMagnet || dd < pickupRadius) {
      l.magnet = true;
      const sp = 330 + (1 - clamp(dd / 300, 0, 1)) * 300;
      l.x += dx / Math.max(1, dd) * sp * dt;
      l.y += dy / Math.max(1, dd) * sp * dt;
    } else if (dd > 28) {
      l.x += dx / dd * 40 * dt;
      l.y += dy / dd * 40 * dt;
    }
    if (dd < 28) {
      collectLoot(l);
      l.dead = true;
    }
  }
  loot = loot.filter(l => !l.dead);

  for (const h of heals) {
    if (h.dead) continue;
    h.phase += dt * 4;
    const dx = player.x - h.x;
    const dy = player.y - h.y;
    const dd = Math.hypot(dx, dy);
    if (dd < pickupRadius) {
      h.x += dx / Math.max(1, dd) * 260 * dt;
      h.y += dy / Math.max(1, dd) * 260 * dt;
    } else if (dd > 26) {
      h.x += dx / dd * 34 * dt;
      h.y += dy / dd * 34 * dt;
    }
    if (dd < 26) {
      player.hp = Math.min(player.maxHp, player.hp + h.amount);
      addText(player.x, player.y - 34, `+${Math.round(h.amount)}`, '#8fbf6a', 16);
      addRing(player.x, player.y, 50, '#8fbf6a', 0.4, 2);
      spawnBurst(h.x, h.y, '#8fbf6a', 10, 160, 0.4);
      sound.pickup(1);
      h.dead = true;
    }
  }
  heals = heals.filter(h => !h.dead);
}

function updateEffects(dt) {
  for (const fx of effects) {
    fx.life -= dt;
    if (fx.type === 'vortex') {
      fx.tick -= dt;
      const pull = 150 * dt;
      for (const e of enemies) {
        if (e.dead || e.boss) continue;
        const dx = fx.x - e.x;
        const dy = fx.y - e.y;
        const dd = Math.hypot(dx, dy);
        if (dd < fx.radius * 1.35 && dd > 2) {
          const force = pull * (1 - clamp(dd / (fx.radius * 1.35), 0, 1));
          e.x += dx / dd * force;
          e.y += dy / dd * force;
        }
      }
      if (fx.tick <= 0) {
        fx.tick = 0.22;
        for (const e of enemies) {
          if (!e.dead && d2(e.x, e.y, fx.x, fx.y) < (fx.radius * 0.82 + e.r) ** 2) {
            hitEnemy(e, 10 * player.damageMul, { source: 'vortex', color: fx.color, noChain: true });
          }
        }
        for (let i = 0; i < 4; i++) {
          const ang = rand(0, TAU);
          spawnParticle(fx.x + Math.cos(ang) * fx.radius * rand(0.3, 0.9), fx.y + Math.sin(ang) * fx.radius * rand(0.3, 0.9), -Math.cos(ang) * 100, -Math.sin(ang) * 100, rand(2, 5), fx.color, 0.4, 0, 0.9, true);
        }
      }
    }
  }
  effects = effects.filter(fx => fx.life > 0);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    const drag = Math.max(0, 1 - p.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
  }
  particles = particles.filter(p => p.life > 0);
  if (particles.length > 520) particles.splice(0, particles.length - 520);
}

function updateTexts(dt) {
  for (const t of texts) {
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy *= 0.97;
  }
  texts = texts.filter(t => t.life > 0);
  if (texts.length > 90) texts.splice(0, texts.length - 90);
}

function updateRings(dt) {
  for (const r of rings) {
    r.life -= dt;
    const t = 1 - clamp(r.life / r.maxLife, 0, 1);
    r.r = lerp(4, r.maxR, t);
  }
  rings = rings.filter(r => r.life > 0);
}

function updateCamera(dt) {
  if (player && !player.dead) {
    const k = 1 - Math.exp(-6.5 * dt);
    camera.x = lerp(camera.x, player.x, k);
    camera.y = lerp(camera.y, player.y, k);
  }
  camera.shake = Math.max(0, camera.shake - 31 * dt);
  camera.shakeX = rand(-1, 1) * camera.shake;
  camera.shakeY = rand(-1, 1) * camera.shake;
}

/* =========================================================================
   INPUT + FEEDBACK PRIMITIVES
   ========================================================================= */
function getMoveInput() {
  let x = 0, y = 0;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (joystick.active) { x += joystick.x; y += joystick.y; }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

function shake(amount) { camera.shake = Math.max(camera.shake, amount * 0.62); }
function flashScreen(color, a) { flash.color = color; flash.a = Math.max(flash.a, Math.min(0.18, a * 0.58)); }

function spawnParticle(x, y, vx, vy, size, color, life, gravity = 0, drag = 0.9, glow = false) {
  particles.push({ x, y, vx, vy, size, color, life, maxLife: life, gravity, drag, glow, shape: Math.random() < 0.22 ? 'spark' : 'dot' });
}

function spawnBurst(x, y, color, count, speed, life) {
  const n = Math.max(2, Math.round(count * 0.6));
  for (let i = 0; i < n; i++) {
    const ang = rand(0, TAU);
    const sp = rand(0.15, 1) * speed;
    spawnParticle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, rand(1.2, 3.8), color, rand(0.25, 1) * life, 40, 1.8, false);
  }
}

function addText(x, y, text, color, size = 14) {
  texts.push({ x: x + rand(-7, 7), y, text, color, size, life: 0.9, maxLife: 0.9, vy: -38 });
}

function addRing(x, y, maxR, color, life = 0.4, width = 2) {
  rings.push({ x, y, r: 4, maxR, color, life, maxLife: life, width });
}

function nearestEnemy(x, y, range = 700) {
  let best = null;
  let bestD = range * range;
  for (const e of enemies) {
    if (e.dead) continue;
    const dd = d2(x, y, e.x, e.y);
    if (dd < bestD) { bestD = dd; best = e; }
  }
  return best;
}

function hurtPlayer(amount, source) {
  if (!player || player.dead || player.invuln > 0 || state !== 'playing') return;
  let dmg = Math.max(1, amount - player.armor);
  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, dmg);
    player.shield -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0) addText(player.x, player.y - 36, `-${Math.round(absorbed)} SHIELD`, '#8fbf6a', 12);
  }
  if (dmg <= 0) { player.invuln = 0.3; return; }
  player.hp -= dmg;
  run.damageTaken += dmg;
  player.invuln = 0.78;
  if (source && source.x !== undefined) {
    const ang = Math.atan2(player.y - source.y, player.x - source.x);
    player.kx += Math.cos(ang) * 170;
    player.ky += Math.sin(ang) * 170;
  }
  shake(10);
  flashScreen('#a8452f', 0.3);
  sound.hurt();
  addText(player.x + rand(-8, 8), player.y - 30, `-${Math.round(dmg)}`, '#b65a3c', 18);
  spawnBurst(player.x, player.y, '#b65a3c', 14, 230, 0.55);
  if (player.hp <= 0) die();
}

/* =========================================================================
   COMBAT
   ========================================================================= */
function hitEnemy(enemy, amount, opts = {}) {
  if (!enemy || enemy.dead) return;
  const crit = !opts.noCrit && Math.random() < player.critChance;
  let dmg = amount * (crit ? player.critMult : 1);
  if (player.execute > 0 && enemy.hp / enemy.maxHp < 0.3) dmg *= 1 + player.execute;
  dmg = Math.max(1, dmg);
  enemy.hp -= dmg;
  run.damageDealt += dmg;
  enemy.hitFlash = 0.09;
  if (player.lifesteal > 0) {
    player.hp = Math.min(player.maxHp, player.hp + dmg * player.lifesteal);
  }
  if (opts.knock && !enemy.boss) {
    const ang = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    enemy.kx += Math.cos(ang) * opts.knock;
    enemy.ky += Math.sin(ang) * opts.knock;
  }
  if (!opts.silent) {
    const color = crit ? '#d8b56a' : (opts.color || '#f3ead7');
    addText(enemy.x, enemy.y - enemy.r - 4, crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`, color, crit ? 19 : 13);
    sound.hit(crit || dmg > 32);
  }
  if (!opts.noStatus) {
    if (player.igniteChance > 0 && opts.source !== 'burn' && Math.random() < player.igniteChance) {
      enemy.burn = Math.max(enemy.burn, 2.4);
      enemy.burnDps = Math.max(enemy.burnDps, 5 + player.igniteDamage + player.damageMul * 3);
      enemy.burnTick = 0.35;
    }
    if (player.frost > 0) {
      enemy.slowTimer = Math.max(enemy.slowTimer, 1.7);
      enemy.slowAmt = Math.max(enemy.slowAmt, player.frost);
    }
    if (!opts.noChain && player.chainHits > 0 && Math.random() < 0.16) {
      castChain(enemy, 1 + player.chainHits, dmg * 0.42, PLAYER_SHOT_COLOR, null, true);
    }
  }
  if (enemy.hp <= 0) killEnemy(enemy, opts);
}

function killEnemy(enemy, opts = {}) {
  if (enemy.dead) return;
  enemy.dead = true;
  run.kills++;
  const color = enemy.color;
  spawnBurst(enemy.x, enemy.y, color, enemy.boss ? 60 : enemy.elite ? 24 : 11, enemy.boss ? 430 : 230, enemy.boss ? 1.1 : 0.55);
  addRing(enemy.x, enemy.y, enemy.boss ? 210 : enemy.elite ? 70 : 34, color, enemy.boss ? 0.9 : 0.4, enemy.boss ? 6 : 2);
  if (enemy.boss) {
    hitStop = Math.max(hitStop, 0.1);
    shake(22);
    flashScreen('#d8b56a', 0.22);
    sound.explode();
    showBanner('BOSS SLAIN', enemy.name, 'legendary');
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.18);
    for (let i = 0; i < 8; i++) spawnGem(enemy.x + rand(-50, 50), enemy.y + rand(-50, 50), Math.ceil(enemy.xp / 8));
    maybeDropLoot(enemy);
  } else {
    spawnGem(enemy.x, enemy.y, Math.max(1, Math.round(enemy.xp)));
    maybeDropLoot(enemy);
    if (enemy.elite) {
      hitStop = Math.max(hitStop, 0.04);
      shake(9);
      flashScreen('#d8b56a', 0.1);
    }
  }
  const healChance = player.hp / player.maxHp < 0.45 ? 0.065 : 0.018;
  if (!enemy.boss && Math.random() < healChance) spawnHeal(enemy.x, enemy.y, 12 + run.wave * 1.4);
  if (enemy.cfg.split && !opts.fromNova) {
    for (let i = 0; i < 2; i++) {
      spawnEnemy('grunt', { at: { x: enemy.x + rand(-22, 22), y: enemy.y + rand(-22, 22) } });
    }
  }
  if (!opts.fromNova && player.novaChance > 0 && Math.random() < player.novaChance) {
    explodeAt(enemy.x, enemy.y, 82 * player.areaMul, (17 + player.novaDamage) * player.damageMul, '#9b6bb3', { fromNova: true });
  }
  if (!opts.silent && (enemy.boss || enemy.elite)) sound.hit(true);
}

function nearestEnemyExcluding(x, y, range, exclude) {
  let best = null;
  let bestD = range * range;
  for (const e of enemies) {
    if (e.dead || exclude.has(e)) continue;
    const dd = d2(x, y, e.x, e.y);
    if (dd < bestD) { bestD = dd; best = e; }
  }
  return best;
}

function castChain(target, chains, damage, color, origin = null, silent = false) {
  if (!target || target.dead) return;
  const points = [{ x: origin ? origin.x : player.x, y: origin ? origin.y : player.y }];
  const hit = new Set();
  let current = target;
  for (let i = 0; i < chains && current; i++) {
    points.push({ x: current.x, y: current.y });
    hit.add(current);
    hitEnemy(current, damage, { source: 'chain', color, noChain: true, silent: i > 0 || silent });
    current = nearestEnemyExcluding(current.x, current.y, 300, hit);
  }
  effects.push({ type: 'lightning', points, life: 0.24, maxLife: 0.24, color, width: 3 });
  if (points.length > 2) spawnBurst(points[points.length - 1].x, points[points.length - 1].y, color, 5, 130, 0.3);
}

function explodeAt(x, y, radius, damage, color, opts = {}) {
  for (const e of enemies) {
    if (e.dead) continue;
    if (d2(e.x, e.y, x, y) < (radius + e.r) ** 2) {
      hitEnemy(e, damage, { source: 'nova', color, noChain: true, fromNova: opts.fromNova, silent: true });
    }
  }
  addRing(x, y, radius, color, 0.55, 4);
  addRing(x, y, radius * 0.62, '#ffffff', 0.35, 2);
  spawnBurst(x, y, color, 28, 300, 0.7);
  if (!opts.silent) {
    shake(7);
    sound.explode();
  }
}

/* =========================================================================
   LOOT + XP
   ========================================================================= */
function rollRarity(minTier = 'common', boost = 0) {
  const minIdx = RARITY_ORDER.indexOf(minTier);
  const luck = player ? player.luck : 0;
  const timeBoost = 1 + Math.min(1.5, run.time / 260);
  const list = [];
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    const key = RARITY_ORDER[i];
    if (i < minIdx) continue;
    let w = RELIC_RARITIES[key].weight;
    if (key === 'common') w /= 1 + luck * 0.45;
    if (key === 'rare') w *= 1 + luck * 0.5;
    if (key === 'epic') w *= (1 + luck * 1.0) * timeBoost;
    if (key === 'legendary') w *= (1 + luck * 1.9) * timeBoost * (1 + boost);
    list.push({ key, w });
  }
  return weightedPick(list).key;
}

function spawnLootAt(x, y, rarity) {
  if (loot.length > 70) loot.shift();
  const relic = pick(RELICS[rarity]);
  const ang = rand(0, TAU);
  const sp = rand(25, 105);
  loot.push({
    x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
    rarity, relic, phase: rand(0, TAU), rot: rand(0, TAU), magnet: false, dead: false
  });
}

function spawnGem(x, y, value) {
  if (gems.length > 520) gems.shift();
  const ang = rand(0, TAU);
  const sp = rand(25, 95);
  gems.push({
    x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
    value, phase: rand(0, TAU), magnet: false, dead: false
  });
}

function spawnHeal(x, y, amount) {
  heals.push({ x, y, amount, phase: rand(0, TAU), dead: false });
}

function maybeDropLoot(enemy) {
  run.lootPity++;
  if (enemy.boss) {
    for (let i = 0; i < 5; i++) {
      const rarity = i === 0 ? rollRarity('epic', 1.5) : rollRarity('epic', 0.5);
      spawnLootAt(enemy.x + rand(-55, 55), enemy.y + rand(-55, 55), rarity);
    }
    run.lootPity = 0;
    return;
  }
  if (enemy.elite) {
    spawnLootAt(enemy.x, enemy.y, rollRarity('rare', 0.5));
    run.lootPity = 0;
    return;
  }
  const chance = 0.11 + player.luck * 0.02;
  if (Math.random() < chance || run.lootPity >= 14) {
    run.lootPity = 0;
    spawnLootAt(enemy.x, enemy.y, rollRarity('common', 0));
  }
}

function collectLoot(item) {
  const relic = item.relic;
  const rarity = item.rarity;
  relic.apply(player);
  player.hp = Math.min(player.maxHp, player.hp);
  run.collected[rarity]++;
  run.relicCounts[relic.id] = (run.relicCounts[relic.id] || 0) + 1;
  if (!run.relicOrder.includes(relic.id)) run.relicOrder.push(relic.id);
  const meta = RELIC_RARITIES[rarity];
  const tier = meta.tier;
  showToast(rarity, relic);
  sound.pickup(tier);
  flashScreen(meta.color, tier >= 4 ? 0.17 : tier === 3 ? 0.1 : 0.045);
  addRing(item.x, item.y, tier >= 4 ? 150 : tier === 3 ? 90 : 48, meta.color, 0.6, tier >= 4 ? 5 : 2);
  spawnBurst(item.x, item.y, meta.color, tier >= 4 ? 45 : tier === 3 ? 22 : 10, tier >= 4 ? 320 : 190, 0.8);
  if (tier >= 4) {
    shake(9);
    showBanner('LEGENDARY', relic.name, 'legendary');
  } else if (tier === 3) {
    shake(3);
  }
  renderRelicStrip();
  updateHud();
}

function gainXp(amount) {
  if (!player || !run) return;
  run.xp += amount * player.xpMul;
  let leveled = false;
  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level++;
    run.xpNext = xpNextFor(run.level);
    run.pendingLevels++;
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.06);
    leveled = true;
  }
  if (leveled) {
    addRing(player.x, player.y, 80, '#d8b56a', 0.6, 3);
    spawnBurst(player.x, player.y, '#d8b56a', 20, 250, 0.7);
    if (state === 'playing') openLevelUp();
  }
}

/* =========================================================================
   LEVEL UP
   ========================================================================= */
function buildUpgradeChoices() {
  const pool = [];
  for (const def of Object.values(WEAPONS)) {
    const owned = player.weapons.find(w => w.type === def.id);
    if (owned && owned.level >= WEAPON_MAX_LEVEL) continue;
    const level = owned ? owned.level : 0;
    const tier = owned ? Math.min(4, 1 + Math.floor(level / 3)) : def.tier;
    pool.push({
      kind: 'weapon', tier, icon: def.icon, color: def.color, name: def.name,
      meta: owned ? `WEAPON · LV ${level} → ${level + 1}` : 'NEW WEAPON',
      desc: owned ? def.levelDesc : def.desc,
      w: owned ? 1.0 : 1.35,
      apply: () => {
        if (owned) owned.level++;
        else player.weapons.push({ type: def.id, level: 1, timer: 0.15, spin: rand(0, TAU) });
      }
    });
  }
  for (const passive of PASSIVES) {
    const stacks = run.passiveStacks[passive.id] || 0;
    if (stacks >= passive.max) continue;
    pool.push({
      kind: 'passive', tier: passive.tier, icon: passive.icon, color: tierColor(passive.tier),
      name: passive.name, meta: `STACK ${stacks + 1} / ${passive.max}`, desc: passive.desc,
      w: passive.weight,
      apply: () => { passive.apply(player); run.passiveStacks[passive.id] = stacks + 1; }
    });
  }
  if (player.hp / player.maxHp < 0.5) {
    pool.push({
      kind: 'heal', tier: 2, icon: '✚', color: '#8fbf6a', name: 'Second Wind',
      meta: 'EMERGENCY · ONE TIME', desc: 'Restore 45% of max HP right now.', w: 0.75,
      apply: () => { player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.45); }
    });
  }
  for (const card of pool) card.w *= 1 + player.luck * (card.tier - 1) * 0.45;
  const choices = [];
  const remaining = pool.slice();
  while (choices.length < 3 && remaining.length) {
    const card = weightedPick(remaining);
    choices.push(card);
    remaining.splice(remaining.indexOf(card), 1);
  }
  return choices;
}

function renderUpgradeCards() {
  ui.levelupNum.textContent = run.level;
  ui.upgradeGrid.innerHTML = levelupChoices.map((card, i) => `
    <button class="upgrade-card tier-${card.tier}" data-index="${i}" style="--c:${tierColor(card.tier)};--ic:${card.color}" aria-label="Choose ${card.name}">
      <span class="upgrade-key">${i + 1}</span>
      <span class="upgrade-top"><span class="upgrade-icon">${card.icon}</span><span class="upgrade-tier">${TIER_NAMES[card.tier]}</span></span>
      <strong class="upgrade-name">${card.name}</strong>
      <span class="upgrade-meta">${card.meta}</span>
      <span class="upgrade-desc">${card.desc}</span>
      <span class="upgrade-glow"></span>
    </button>`).join('');
}

function openLevelUp() {
  if (state !== 'playing' || !player) return;
  state = 'levelup';
  sound.playing = false;
  levelupChoices = buildUpgradeChoices();
  if (!levelupChoices.length) { state = 'playing'; sound.playing = true; return; }
  renderUpgradeCards();
  updateHud();
  ui.levelup.classList.remove('hidden');
  sound.levelup();
  flashScreen('#d8b56a', 0.18);
  shake(5);
}

function chooseUpgrade(index) {
  if (state !== 'levelup') return;
  const card = levelupChoices[index];
  if (!card) return;
  card.apply();
  sound.ui();
  flashScreen(tierColor(card.tier), 0.1);
  addRing(player.x, player.y, 90, tierColor(card.tier), 0.55, 3);
  spawnBurst(player.x, player.y, tierColor(card.tier), 20, 230, 0.6);
  run.pendingLevels = Math.max(0, run.pendingLevels - 1);
  ui.levelup.classList.add('hidden');
  renderWeaponStrip();
  updateHud();
  if (run.pendingLevels > 0) {
    state = 'playing';
    setTimeout(() => { if (state === 'playing') openLevelUp(); }, 240);
  } else {
    state = 'playing';
    sound.playing = true;
  }
}

/* =========================================================================
   RENDER
   ========================================================================= */
function applyCamera() {
  ctx.translate(W / 2 + camera.shakeX, H / 2 + camera.shakeY);
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (state === 'title' || !player) {
    renderTitle();
    return;
  }
  drawBackground();
  ctx.save();
  applyCamera();
  drawGroundAuras();
  drawLoot();
  drawGems();
  drawHeals();
  drawEnemies();
  drawPlayer();
  drawOrbitWeapons();
  drawProjectiles();
  drawEnemyShots();
  drawEffects();
  drawRings();
  drawParticles();
  drawTexts();
  ctx.restore();
  drawFlash();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#171a12');
  g.addColorStop(0.52, '#10130d');
  g.addColorStop(1, '#080a07');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const halfW = W / (2 * zoom);
  const halfH = H / (2 * zoom);
  const left = camera.x - halfW - 140;
  const right = camera.x + halfW + 140;
  const top = camera.y - halfH - 140;
  const bottom = camera.y + halfH + 140;

  ctx.save();
  applyCamera();

  // Warm torchlight around the survivor, not a sci-fi aura.
  const glow = ctx.createRadialGradient(player.x, player.y, 20, player.x, player.y, 560);
  glow.addColorStop(0, 'rgba(208,168,96,0.10)');
  glow.addColorStop(0.55, 'rgba(120,100,60,0.045)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(left, top, right - left, bottom - top);

  // Broad moss and soil patches.
  const patch = 250;
  const px0 = Math.floor(left / patch);
  const px1 = Math.ceil(right / patch);
  const py0 = Math.floor(top / patch);
  const py1 = Math.ceil(bottom / patch);
  for (let tx = px0; tx <= px1; tx++) {
    for (let ty = py0; ty <= py1; ty++) {
      const h = hash2(tx + 11, ty + 5);
      if (h > 0.58) continue;
      const x = tx * patch + hash2(tx + 2, ty + 9) * patch;
      const y = ty * patch + hash2(tx + 7, ty + 3) * patch;
      ctx.fillStyle = h < 0.28 ? 'rgba(62,76,44,0.13)' : 'rgba(78,64,44,0.10)';
      ctx.beginPath();
      ctx.ellipse(x, y, 70 + h * 90, 38 + h * 48, h * TAU, 0, TAU);
      ctx.fill();
    }
  }

  // Small organic details: grass, pebbles, roots, mushrooms, bare earth.
  const tile = 94;
  const tx0 = Math.floor(left / tile);
  const tx1 = Math.ceil(right / tile);
  const ty0 = Math.floor(top / tile);
  const ty1 = Math.ceil(bottom / tile);
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const h = hash2(tx + 3, ty + 7);
      const x = tx * tile + hash2(tx + 4, ty + 8) * tile;
      const y = ty * tile + hash2(tx + 9, ty + 2) * tile;
      if (h < 0.10) {
        ctx.strokeStyle = 'rgba(112,132,78,0.22)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) {
          ctx.moveTo(x + i * 3, y + 6);
          ctx.quadraticCurveTo(x + i * 4 + 1, y - 2, x + i * 5 + 2, y - 8 - Math.abs(i) * 2);
        }
        ctx.stroke();
      } else if (h < 0.16) {
        ctx.fillStyle = 'rgba(130,120,100,0.16)';
        ctx.beginPath(); ctx.ellipse(x, y, 4.5, 2.6, h * 4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 7, y + 3, 2.8, 1.8, h * 5, 0, TAU); ctx.fill();
      } else if (h < 0.20) {
        ctx.strokeStyle = 'rgba(92,72,50,0.17)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - 15, y + 5);
        ctx.bezierCurveTo(x - 5, y - 3, x + 4, y + 6, x + 16, y - 5);
        ctx.stroke();
      } else if (h < 0.23) {
        ctx.fillStyle = 'rgba(168,118,76,0.24)';
        ctx.beginPath(); ctx.arc(x, y - 1, 3.6, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(208,190,160,0.28)';
        ctx.fillRect(x - 0.8, y - 1, 1.6, 5);
      } else if (h < 0.26) {
        ctx.fillStyle = 'rgba(70,60,42,0.16)';
        ctx.beginPath(); ctx.ellipse(x, y, 13, 7, h * 4, 0, TAU); ctx.fill();
      }
    }
  }

  // A few drifting fireflies keep the dark forest alive without stealing focus.
  for (let i = 0; i < 18; i++) {
    const h1 = hash2(i + 21, 4);
    const h2 = hash2(i + 8, 17);
    const x = left + ((h1 * (right - left) + run.time * (6 + h1 * 8)) % (right - left));
    const y = top + ((h2 * (bottom - top) + Math.sin(run.time * 0.7 + i) * 18 + (bottom - top)) % (bottom - top));
    ctx.fillStyle = `rgba(216,181,106,${0.10 + 0.07 * Math.sin(run.time * 2 + i)})`;
    ctx.beginPath(); ctx.arc(x, y, 1.2 + h1, 0, TAU); ctx.fill();
  }

  ctx.restore();
}

function drawGroundAuras() {
  if (!player) return;
  for (const weapon of player.weapons) {
    if (weapon.type !== 'flame') continue;
    const stats = getWeaponStats('flame', weapon.level, player);
    const pulse = 1 + Math.sin(run.time * 7) * 0.025;
    const grad = ctx.createRadialGradient(player.x, player.y, stats.radius * 0.2, player.x, player.y, stats.radius * pulse);
    grad.addColorStop(0, 'rgba(201,116,63,0.015)');
    grad.addColorStop(0.72, 'rgba(201,116,63,0.055)');
    grad.addColorStop(1, 'rgba(201,116,63,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, stats.radius * pulse, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,138,75,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, stats.radius * pulse, 0, TAU);
    ctx.stroke();
  }
  if (player.guardTimer > 0) {
    ctx.strokeStyle = 'rgba(143,191,106,0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 92 * player.areaMul, 0, TAU);
    ctx.stroke();
  }
}

function drawLoot() {
  for (const l of loot) {
    const meta = RELIC_RARITIES[l.rarity];
    const color = meta.color;
    const bob = Math.sin(run.time * 3.2 + l.phase) * 2.5;
    const tier = meta.tier;

    if (tier >= 3) {
      const beamH = tier >= 4 ? 150 : 92;
      const beamW = tier >= 4 ? 13 : 6;
      const grad = ctx.createLinearGradient(l.x, l.y - beamH, l.x, l.y);
      grad.addColorStop(0, rgba(color, 0));
      grad.addColorStop(0.72, rgba(color, tier >= 4 ? 0.10 : 0.06));
      grad.addColorStop(1, rgba(color, tier >= 4 ? 0.24 : 0.13));
      ctx.fillStyle = grad;
      ctx.fillRect(l.x - beamW / 2, l.y - beamH, beamW, beamH);
    }

    const halo = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, tier >= 4 ? 48 : 28);
    halo.addColorStop(0, rgba(color, tier >= 4 ? 0.28 : 0.16));
    halo.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(l.x, l.y, tier >= 4 ? 48 : 28, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(l.x, l.y + bob);
    ctx.rotate(l.rot * 0.35);
    if (tier >= 4) {
      ctx.strokeStyle = rgba(color, 0.22);
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i++) {
        const a = run.time * 0.7 + i / 6 * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
        ctx.stroke();
      }
    }

    const size = tier >= 4 ? 13 : tier === 3 ? 11 : tier === 2 ? 9 : 7;
    // Dark backing and a warm rim make relics read as objects, not particles.
    ctx.fillStyle = 'rgba(16,14,10,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.55);
    ctx.lineTo(size * 1.15, 0);
    ctx.lineTo(0, size * 1.55);
    ctx.lineTo(-size * 1.15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = rgba(color, 0.9);
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.12);
    ctx.lineTo(size * 0.72, 0);
    ctx.lineTo(0, size * 1.12);
    ctx.lineTo(-size * 0.72, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(246,238,220,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.58);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, size * 0.58);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    // Small loop above the gem: an amulet silhouette instead of a neon shard.
    ctx.strokeStyle = rgba(color, 0.75);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -size * 1.75, size * 0.34, 0, TAU);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < (tier >= 4 ? 4 : 1); i++) {
      const a = run.time * 1.8 + l.phase + i / 3 * TAU;
      const rr = tier >= 4 ? 26 : 18;
      ctx.fillStyle = rgba(color, 0.55);
      ctx.beginPath();
      ctx.arc(l.x + Math.cos(a) * rr, l.y + Math.sin(a * 1.4) * 7 - 2, 1.5, 0, TAU);
      ctx.fill();
    }
    if (tier >= 3) {
      ctx.font = '700 8px "Palatino Linotype", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(color, 0.8);
      ctx.fillText(meta.name, l.x, l.y - 24);
    }
  }
}

function drawGems() {
  for (const g of gems) {
    const big = g.value >= 8;
    const size = clamp(3.4 + Math.log2(g.value + 1) * 1.8, 3.4, big ? 9 : 6.6);
    const bob = Math.sin(run.time * 4 + g.phase) * 1.8;
    const color = big ? XP_BIG_COLOR : XP_COLOR;
    ctx.save();
    ctx.translate(g.x, g.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 5, size * 1.05, size * 0.4, 0, 0, TAU);
    ctx.fill();
    // Dark green rim keeps motes readable over grass and soil.
    ctx.fillStyle = '#1d4a1a';
    ctx.beginPath(); ctx.arc(0, 0, size * 1.16, 0, TAU); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, size, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(240,255,214,0.85)';
    ctx.beginPath(); ctx.arc(-size * 0.28, -size * 0.32, size * 0.34, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawHeals() {
  for (const h of heals) {
    const bob = Math.sin(run.time * 4 + h.phase) * 2.2;
    ctx.save();
    ctx.translate(h.x, h.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 9, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(26,34,20,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = HEAL_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = HEAL_COLOR;
    ctx.fillRect(-2.2, -6, 4.4, 12);
    ctx.fillRect(-6, -2.2, 12, 4.4);
    ctx.restore();
  }
}

/* =========================================================================
   ENTITY RENDERERS
   ========================================================================= */
function drawEnemies() {
  for (const e of enemies) if (!e.dead) drawEnemy(e);
}

function drawEnemy(e) {
  const t = run.time;
  const look = Math.atan2(player.y - e.y, player.x - e.x);
  const spawnScale = clamp(e.spawnTime * 4.5, 0, 1);
  const bodyColor = e.hitFlash > 0 ? '#f3ead7' : e.color;
  const bob = Math.sin(t * (e.type === 'runner' ? 9 : 4.5) + e.phase) * (e.type === 'runner' ? 1.5 : 1.1);
  const lean = Math.sin(t * 3 + e.phase) * 0.06;

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.globalAlpha = 0.3 + spawnScale * 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, e.r * 0.8, e.r * 1.02, e.r * 0.33, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.scale(spawnScale, spawnScale);
  ctx.translate(0, bob);

  if (e.boss || e.elite) {
    const auraR = e.r * (e.boss ? 2.3 : 1.8);
    const aura = ctx.createRadialGradient(0, 0, e.r * 0.3, 0, 0, auraR);
    aura.addColorStop(0, rgba(e.elite ? '#d8b56a' : e.accent, 0.16));
    aura.addColorStop(1, rgba(e.elite ? '#d8b56a' : e.accent, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(e.elite ? '#d8b56a' : e.accent, 0.28);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 8 + Math.sin(t * 4) * 2, 0, TAU);
    ctx.stroke();
  }

  if (e.type === 'grunt') {
    // Hunched husk: two planted legs, ragged torso, hanging arms.
    const stride = Math.sin(t * 6 + e.phase) * e.r * 0.18;
    ctx.strokeStyle = 'rgba(28,22,14,0.9)';
    ctx.lineWidth = Math.max(2.4, e.r * 0.2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.38, e.r * 0.45); ctx.lineTo(-e.r * 0.42, e.r * 0.95 + stride);
    ctx.moveTo(e.r * 0.38, e.r * 0.45); ctx.lineTo(e.r * 0.42, e.r * 0.95 - stride);
    ctx.stroke();

    ctx.save();
    ctx.rotate(lean);
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = 'rgba(26,21,13,0.95)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.9, e.r * 0.55);
    ctx.quadraticCurveTo(-e.r * 1.08, -e.r * 0.45, -e.r * 0.38, -e.r * 0.98);
    ctx.quadraticCurveTo(e.r * 0.15, -e.r * 1.22, e.r * 0.72, -e.r * 0.5);
    ctx.quadraticCurveTo(e.r * 1.02, e.r * 0.15, e.r * 0.85, e.r * 0.62);
    ctx.quadraticCurveTo(0, e.r * 0.92, -e.r * 0.9, e.r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ragged cloth across the torso.
    ctx.fillStyle = 'rgba(34,28,18,0.55)';
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.82, e.r * 0.08);
    ctx.lineTo(e.r * 0.82, e.r * 0.02);
    ctx.lineTo(e.r * 0.55, e.r * 0.72);
    ctx.lineTo(e.r * 0.18, e.r * 0.38);
    ctx.lineTo(-e.r * 0.12, e.r * 0.78);
    ctx.lineTo(-e.r * 0.44, e.r * 0.34);
    ctx.lineTo(-e.r * 0.8, e.r * 0.66);
    ctx.closePath();
    ctx.fill();

    // Long arms.
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = Math.max(2.2, e.r * 0.22);
    const armSwing = Math.sin(t * 5 + e.phase) * e.r * 0.12;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.78, -e.r * 0.3);
    ctx.quadraticCurveTo(-e.r * 1.25, e.r * 0.2, -e.r * 1.05, e.r * 0.75 + armSwing);
    ctx.moveTo(e.r * 0.78, -e.r * 0.3);
    ctx.quadraticCurveTo(e.r * 1.25, e.r * 0.2, e.r * 1.05, e.r * 0.75 - armSwing);
    ctx.stroke();
    ctx.restore();

    // Dim, sunken eyes.
    const ex = Math.cos(look) * 1.6;
    const ey = Math.sin(look) * 1.6;
    ctx.fillStyle = 'rgba(232,206,142,0.85)';
    ctx.beginPath(); ctx.arc(-e.r * 0.3 + ex, -e.r * 0.42 + ey, e.r * 0.13, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.r * 0.28 + ex, -e.r * 0.42 + ey, e.r * 0.13, 0, TAU); ctx.fill();
  } else if (e.type === 'runner') {
    // Low, wide skitterer with spindly legs.
    ctx.save();
    ctx.rotate(look + Math.PI / 2);
    ctx.strokeStyle = 'rgba(34,24,12,0.95)';
    ctx.lineWidth = Math.max(1.8, e.r * 0.16);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * e.r * 0.48;
      const kick = Math.sin(t * 11 + i * 2 + e.phase) * e.r * 0.22;
      ctx.beginPath();
      ctx.moveTo(off, -e.r * 0.15);
      ctx.lineTo(off + e.r * 1.55, e.r * 0.35 + kick);
      ctx.moveTo(off, -e.r * 0.15);
      ctx.lineTo(off - e.r * 1.55, e.r * 0.35 - kick);
      ctx.stroke();
    }
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = 'rgba(28,19,10,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.34, e.r * 0.6, e.r * 0.88, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -e.r * 0.68, e.r * 0.48, e.r * 0.52, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(236,214,158,0.9)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * e.r * 0.2, -e.r * 0.78, e.r * 0.11, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  } else if (e.type === 'tank') {
    // Stone golem: heavy plated hexagon with a cracked ember core.
    ctx.rotate(Math.sin(t * 0.6 + e.phase) * 0.08);
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = Math.max(3, e.r * 0.26);
    ctx.lineCap = 'round';
    const sway = Math.sin(t * 1.6 + e.phase) * e.r * 0.1;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.85, -e.r * 0.2); ctx.lineTo(-e.r * 1.25, e.r * 0.55 + sway);
    ctx.moveTo(e.r * 0.85, -e.r * 0.2); ctx.lineTo(e.r * 1.25, e.r * 0.55 - sway);
    ctx.stroke();

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = 'rgba(20,22,18,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + Math.PI / 6;
      const x = Math.cos(a) * e.r;
      const y = Math.sin(a) * e.r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plate seams.
    ctx.strokeStyle = 'rgba(20,22,18,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.6, -e.r * 0.35); ctx.lineTo(0, -e.r * 0.05); ctx.lineTo(e.r * 0.55, -e.r * 0.45);
    ctx.moveTo(-e.r * 0.45, e.r * 0.55); ctx.lineTo(0, e.r * 0.18); ctx.lineTo(e.r * 0.4, e.r * 0.6);
    ctx.stroke();

    // Ember core.
    ctx.fillStyle = rgba(e.accent, 0.85);
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(e.accent, 0.45);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.36 + Math.sin(t * 3) * 1.5, 0, TAU); ctx.stroke();
  } else if (e.type === 'shooter') {
    // Moth-like wisp: flapping wings, furred body, antennae.
    ctx.save();
    ctx.rotate(look + Math.PI / 2);
    const flap = Math.sin(t * 10 + e.phase) * 0.35;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(flap * 0.7);
      ctx.fillStyle = rgba(e.accent, 0.5);
      ctx.strokeStyle = 'rgba(38,26,32,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(e.r * 1.9, -e.r * 1.15, e.r * 2.0, e.r * 0.25);
      ctx.quadraticCurveTo(e.r * 1.35, e.r * 0.9, 0, e.r * 0.4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba(e.color, 0.9);
      ctx.beginPath(); ctx.arc(e.r * 1.05, -e.r * 0.12, e.r * 0.2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = 'rgba(30,20,24,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, e.r * 0.12, e.r * 0.32, e.r * 0.82, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -e.r * 0.78, e.r * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(e.accent, 0.9);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.1, -e.r * 0.98);
    ctx.quadraticCurveTo(-e.r * 0.75, -e.r * 1.5, -e.r * 0.95, -e.r * 1.85);
    ctx.moveTo(e.r * 0.1, -e.r * 0.98);
    ctx.quadraticCurveTo(e.r * 0.75, -e.r * 1.5, e.r * 0.95, -e.r * 1.85);
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,220,170,0.95)';
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sx * e.r * 0.15, -e.r * 0.82, e.r * 0.1, 0, TAU); ctx.fill();
    }
    ctx.restore();
  } else if (e.type === 'splitter') {
    // Maw: wobbling flesh blob split by a toothy mouth.
    const wobble = 1 + Math.sin(t * 4 + e.phase) * 0.08;
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = 'rgba(24,30,18,0.95)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      const rr = e.r * wobble * (1 + 0.1 * Math.sin(a * 3 + t * 3 + e.phase));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(28,18,16,0.92)';
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.18, e.r * 0.5, e.r * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9dcbc';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * e.r * 0.2 - e.r * 0.08, e.r * 0.05);
      ctx.lineTo(i * e.r * 0.2 + e.r * 0.08, e.r * 0.05);
      ctx.lineTo(i * e.r * 0.2, e.r * 0.24);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,220,170,0.9)';
    ctx.beginPath(); ctx.arc(-e.r * 0.32, -e.r * 0.42, e.r * 0.11, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.r * 0.32, -e.r * 0.42, e.r * 0.11, 0, TAU); ctx.fill();
  } else if (e.type === 'boss') {
    // The Hollow King: antlered crown, heavy cloak, hollow mask.
    const aura = ctx.createRadialGradient(0, 0, e.r * 0.4, 0, 0, e.r * 2.2);
    aura.addColorStop(0, 'rgba(109,91,69,0.3)');
    aura.addColorStop(0.6, 'rgba(109,91,69,0.12)');
    aura.addColorStop(1, 'rgba(109,91,69,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 2.2, 0, TAU); ctx.fill();

    ctx.save();
    ctx.rotate(t * 0.22);
    ctx.strokeStyle = 'rgba(216,181,106,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 15]);
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.55, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Tattered cloak.
    ctx.fillStyle = 'rgba(34,28,20,0.95)';
    ctx.strokeStyle = 'rgba(18,14,10,0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.5, -e.r * 0.7);
    ctx.lineTo(e.r * 0.5, -e.r * 0.7);
    ctx.lineTo(e.r * 1.05, e.r * 1.1);
    ctx.lineTo(e.r * 0.5, e.r * 0.78);
    ctx.lineTo(e.r * 0.1, e.r * 1.18);
    ctx.lineTo(-e.r * 0.35, e.r * 0.8);
    ctx.lineTo(-e.r * 0.8, e.r * 1.12);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Mask/body.
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = 'rgba(24,18,12,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -e.r * 0.1, e.r * 0.82, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(30,24,16,0.9)';
    ctx.beginPath(); ctx.arc(0, -e.r * 0.1, e.r * 0.58, 0, TAU); ctx.fill();

    // Antlered crown.
    ctx.strokeStyle = '#d8b56a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * e.r * 0.42, -e.r * 0.62);
      ctx.lineTo(side * e.r * 0.82, -e.r * 1.22);
      ctx.lineTo(side * e.r * 1.22, -e.r * 1.5);
      ctx.moveTo(side * e.r * 0.72, -e.r * 1.06);
      ctx.lineTo(side * e.r * 1.28, -e.r * 1.05);
      ctx.moveTo(side * e.r * 0.86, -e.r * 1.3);
      ctx.lineTo(side * e.r * 1.42, -e.r * 1.34);
      ctx.stroke();
    }

    // Hollow eyes.
    for (const ex of [-e.r * 0.3, e.r * 0.3]) {
      ctx.fillStyle = '#e8d6a6';
      ctx.beginPath(); ctx.ellipse(ex, -e.r * 0.2, e.r * 0.15, e.r * 0.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1c140c';
      ctx.beginPath(); ctx.arc(ex + Math.cos(look) * e.r * 0.06, -e.r * 0.2 + Math.sin(look) * e.r * 0.06, e.r * 0.07, 0, TAU); ctx.fill();
    }
  }

  if (e.burn > 0) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.1 + e.phase;
      ctx.fillStyle = rgba(i % 2 ? '#d8b56a' : '#c9743f', 0.75);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.r * 0.8, Math.sin(a) * e.r * 0.8, 2.2, 0, TAU);
      ctx.fill();
    }
  }
  if (e.slowTimer > 0) {
    ctx.strokeStyle = 'rgba(160,190,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, e.r * 0.4, e.r * 0.8, 0, TAU); ctx.stroke();
  }
  if (e.elite) {
    ctx.fillStyle = '#d8b56a';
    ctx.beginPath();
    ctx.moveTo(-8, -e.r - 8);
    ctx.lineTo(-4, -e.r - 18);
    ctx.lineTo(0, -e.r - 10);
    ctx.lineTo(4, -e.r - 18);
    ctx.lineTo(8, -e.r - 8);
    ctx.closePath();
    ctx.fill();
  }
  if (e.elite || e.boss) {
    const bw = e.r * 2.3;
    const ratio = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(-bw / 2, -e.r - 15, bw, 4);
    ctx.fillStyle = e.boss ? '#d8b56a' : '#b65a3c';
    ctx.fillRect(-bw / 2, -e.r - 15, bw * ratio, 4);
  }
  ctx.restore();
}

function drawPlayer() {
  if (!player || player.dead) return;
  const char = player.char;
  const t = run.time;
  const ang = Math.atan2(player.facing.y, player.facing.x);
  const bob = player.moving ? Math.sin(t * 9) * 1.6 : Math.sin(t * 2.4) * 0.6;
  const stride = player.moving ? Math.sin(t * 9) * 2.6 : 0;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 17, 6.5, 0, 0, TAU);
  ctx.fill();

  if (player.guardTimer > 0) {
    ctx.fillStyle = 'rgba(143,191,106,0.06)';
    ctx.strokeStyle = 'rgba(160,198,128,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.rotate(t * 1.4);
    ctx.strokeStyle = 'rgba(207,232,184,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU;
      ctx.beginPath(); ctx.arc(0, 0, 30, a, a + 0.45); ctx.stroke();
    }
    ctx.restore();
  }
  if (player.overdriveTimer > 0) {
    ctx.save();
    ctx.rotate(-t * 2);
    ctx.strokeStyle = 'rgba(201,138,75,0.6)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU;
      ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(t * 8 + i) * 2, a, a + 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.translate(0, bob);
  if (player.invuln > 0 && Math.sin(t * 44) > 0.1) ctx.globalAlpha = 0.6;

  // Cloak trailing behind the direction of travel.
  ctx.save();
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(28,24,18,0.85)';
  ctx.strokeStyle = 'rgba(14,12,9,0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.quadraticCurveTo(-20, -6 + stride * 0.4, -30, 3);
  ctx.quadraticCurveTo(-21, 7, -22, 12);
  ctx.quadraticCurveTo(-13, 10, -7, 13);
  ctx.quadraticCurveTo(-4, 4, -3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Legs.
  ctx.strokeStyle = 'rgba(34,28,20,0.95)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3.5, 8); ctx.lineTo(-4.5, 15 + stride * 0.5);
  ctx.moveTo(3.5, 8); ctx.lineTo(4.5, 15 - stride * 0.5);
  ctx.stroke();

  // Torso / tunic in the survivor's color.
  ctx.fillStyle = char.color;
  ctx.strokeStyle = 'rgba(20,17,12,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.quadraticCurveTo(-10, 4, -7, 10);
  ctx.lineTo(7, 10);
  ctx.quadraticCurveTo(10, 4, 8, -6);
  ctx.quadraticCurveTo(0, -10, -8, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Belt.
  ctx.fillStyle = 'rgba(58,42,26,0.95)';
  ctx.fillRect(-7.5, 4, 15, 2.6);
  ctx.fillStyle = '#d8b56a';
  ctx.fillRect(-1.4, 4, 2.8, 2.6);

  // Head with hood.
  ctx.fillStyle = char.accent;
  ctx.strokeStyle = 'rgba(20,17,12,0.9)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -13, 7.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Hood shadow.
  ctx.fillStyle = 'rgba(30,25,18,0.85)';
  ctx.beginPath();
  ctx.arc(0, -12, 5.2, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.fill();
  // Eyes follow facing.
  const fx = Math.cos(ang) * 1.6;
  const fy = Math.sin(ang) * 1.1;
  ctx.fillStyle = 'rgba(244,232,200,0.95)';
  ctx.beginPath(); ctx.arc(-2.4 + fx, -13.5 + fy, 1.35, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(2.4 + fx, -13.5 + fy, 1.35, 0, TAU); ctx.fill();
  ctx.fillStyle = '#141009';
  ctx.beginPath(); ctx.arc(-2.4 + fx * 1.6, -13.5 + fy * 1.6, 0.7, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(2.4 + fx * 1.6, -13.5 + fy * 1.6, 0.7, 0, TAU); ctx.fill();

  // Per-survivor silhouette details.
  if (char.id === 'vesper') {
    // Ember staff with a small caged flame.
    ctx.save();
    ctx.rotate(ang + 0.9);
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(16, -12); ctx.stroke();
    ctx.fillStyle = '#d8b56a';
    ctx.beginPath(); ctx.arc(16, -12, 3.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,44,26,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(16, -12, 3.2, 0, TAU); ctx.stroke();
    ctx.restore();
  } else if (char.id === 'bramble') {
    // Round thorn shield on the off-hand.
    ctx.save();
    ctx.rotate(ang - 0.8);
    ctx.fillStyle = 'rgba(58,72,42,0.95)';
    ctx.strokeStyle = 'rgba(24,30,18,0.95)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(11, 4, 7.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9d39a';
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU;
      ctx.beginPath();
      ctx.moveTo(11 + Math.cos(a) * 5, 4 + Math.sin(a) * 5);
      ctx.lineTo(11 + Math.cos(a) * 10, 4 + Math.sin(a) * 10);
      ctx.lineTo(11 + Math.cos(a + 0.5) * 5, 4 + Math.sin(a + 0.5) * 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } else if (char.id === 'kite') {
    // Short bow held forward.
    ctx.save();
    ctx.rotate(ang);
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(12, 0, 8, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,211,163,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12 + Math.cos(-Math.PI * 0.42) * 8, Math.sin(-Math.PI * 0.42) * 8);
    ctx.lineTo(12 + Math.cos(Math.PI * 0.42) * 8, Math.sin(Math.PI * 0.42) * 8);
    ctx.stroke();
    ctx.restore();
  } else if (char.id === 'sable') {
    // Floating oracle stones.
    for (let i = 0; i < 3; i++) {
      const a = t * 1.1 + i / 3 * TAU;
      ctx.save();
      ctx.translate(Math.cos(a) * 23, Math.sin(a) * 20 - 4);
      ctx.rotate(a);
      ctx.fillStyle = char.accent;
      ctx.strokeStyle = 'rgba(20,17,12,0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -3.4); ctx.lineTo(3.2, 0); ctx.lineTo(0, 3.4); ctx.lineTo(-3.2, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawOrbitWeapons() {
  if (!player) return;
  for (const weapon of player.weapons) {
    if (weapon.type !== 'thorn') continue;
    const stats = getWeaponStats('thorn', weapon.level, player);
    const count = Math.max(1, Math.floor(stats.count));
    ctx.save();
    ctx.strokeStyle = 'rgba(143,191,106,0.10)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.arc(player.x, player.y, stats.radius, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < count; i++) {
      const a = weapon.spin + i / count * TAU;
      const x = player.x + Math.cos(a) * stats.radius;
      const y = player.y + Math.sin(a) * stats.radius;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2 + run.time * 4);
      ctx.strokeStyle = 'rgba(22,28,16,0.9)';
      ctx.lineWidth = 5.6;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0.18, Math.PI * 1.42); ctx.stroke();
      ctx.strokeStyle = '#a9bf7a';
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0.18, Math.PI * 1.42); ctx.stroke();
      ctx.strokeStyle = 'rgba(236,240,210,0.7)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0.18, Math.PI * 1.42); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    const ang = Math.atan2(p.vy, p.vx);
    if (p.kind === 'chakram') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.strokeStyle = 'rgba(24,20,12,0.85)';
      ctx.lineWidth = 5.6;
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0.2, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0.2, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(250,244,220,0.8)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0.2, Math.PI * 1.5); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'shard') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(24,20,12,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(-4, 3.5); ctx.lineTo(-2, 0); ctx.lineTo(-4, -3.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(252,246,222,0.9)';
      ctx.beginPath(); ctx.arc(2, 0, 1.4, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(24,20,12,0.75)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.55, p.r * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(252,246,222,0.9)';
      ctx.beginPath(); ctx.arc(2, 0, p.r * 0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}

function drawEnemyShots() {
  for (const s of enemyShots) {
    const ang = Math.atan2(s.vy, s.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    // Rust dart shape: unmistakably hostile and unlike round green XP.
    ctx.fillStyle = s.color;
    ctx.strokeStyle = 'rgba(30,12,8,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(s.r * 1.7, 0);
    ctx.lineTo(-s.r * 0.6, s.r * 0.95);
    ctx.lineTo(-s.r * 1.2, 0);
    ctx.lineTo(-s.r * 0.6, -s.r * 0.95);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,226,190,0.7)';
    ctx.beginPath(); ctx.arc(s.r * 0.35, 0, s.r * 0.28, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawEffects() {
  for (const fx of effects) {
    if (fx.type === 'lightning') {
      const alpha = clamp(fx.life / fx.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < fx.points.length; i++) {
        const p = fx.points[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(24,20,12,0.6)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(252,246,222,0.8)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    } else if (fx.type === 'vortex') {
      const fade = clamp(fx.life / fx.duration, 0, 1);
      const pulse = 0.9 + Math.sin(run.time * 9) * 0.1;
      const grad = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, fx.radius * pulse);
      grad.addColorStop(0, `rgba(30,26,20,${0.5 * fade})`);
      grad.addColorStop(0.45, rgba(fx.color, 0.14 * fade));
      grad.addColorStop(1, rgba(fx.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius * pulse, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(fx.x, fx.y);
      ctx.rotate(run.time * 4);
      ctx.strokeStyle = rgba(fx.color, 0.5 * fade);
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU;
        ctx.beginPath();
        ctx.arc(0, 0, fx.radius * (0.35 + i * 0.16), a, a + 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawRings() {
  for (const r of rings) {
    const alpha = clamp(r.life / r.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(20,16,10,0.4)';
    ctx.lineWidth = r.width + 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.shape === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, p.size * 0.5);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of texts) {
    const alpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${t.size}px "Trebuchet MS", Verdana, sans-serif`;
    ctx.strokeStyle = 'rgba(2,4,9,0.75)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

function drawFlash() {
  if (flash.a <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = flash.a;
  ctx.fillStyle = flash.color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function renderTitle() {
  const t = titleTime;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1216');
  g.addColorStop(0.45, '#101a15');
  g.addColorStop(0.78, '#0c130f');
  g.addColorStop(1, '#050805');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Moon and its soft halo.
  const moonX = W * 0.77;
  const moonY = H * 0.24;
  const moonR = Math.min(W, H) * 0.105;
  const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 4.4);
  halo.addColorStop(0, 'rgba(226,214,176,0.18)');
  halo.addColorStop(0.4, 'rgba(200,190,150,0.06)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ded3b0';
  ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(150,145,120,0.3)';
  ctx.beginPath(); ctx.arc(moonX - moonR * 0.3, moonY - moonR * 0.2, moonR * 0.22, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + moonR * 0.35, moonY + moonR * 0.28, moonR * 0.16, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + moonR * 0.08, moonY - moonR * 0.45, moonR * 0.1, 0, TAU); ctx.fill();

  // Two layers of distant pine forest.
  const layers = [
    { base: H * 0.68, h: H * 0.2, color: 'rgba(24,36,28,0.85)', step: 44, seed: 3 },
    { base: H * 0.8, h: H * 0.28, color: 'rgba(11,18,13,0.96)', step: 60, seed: 11 }
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = -60; x < W + 80; x += layer.step) {
      const h = layer.h * (0.68 + hash2(Math.round(x) + layer.seed, layer.seed) * 0.62);
      const base = layer.base + 12;
      ctx.lineTo(x, base);
      ctx.lineTo(x + layer.step * 0.5, base - h);
      ctx.lineTo(x + layer.step, base);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  // Drifting mist bands.
  for (let i = 0; i < 3; i++) {
    const y = H * (0.62 + i * 0.09);
    const drift = Math.sin(t * 0.12 + i * 1.7) * 40;
    const mist = ctx.createLinearGradient(0, y - 46, 0, y + 46);
    mist.addColorStop(0, 'rgba(150,160,140,0)');
    mist.addColorStop(0.5, `rgba(150,160,140,${0.055 - i * 0.012})`);
    mist.addColorStop(1, 'rgba(150,160,140,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(drift - 80, y - 46, W + 160, 92);
  }

  // Foreground forest floor.
  ctx.fillStyle = 'rgba(5,9,6,0.97)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, H * 0.9);
  for (let x = 0; x <= W + 40; x += 40) {
    ctx.lineTo(x, H * 0.9 + Math.sin(x * 0.011 + 1.2) * 10);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  for (const p of ambient) {
    ctx.globalAlpha = p.a * 0.9;
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const bottom = ctx.createLinearGradient(0, H * 0.5, 0, H);
  bottom.addColorStop(0, 'rgba(5,8,6,0)');
  bottom.addColorStop(1, 'rgba(5,8,6,0.92)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);
}

/* =========================================================================
   INPUT + BOOT
   ========================================================================= */
function resetJoystick() {
  joystick.active = false;
  joystick.pointerId = null;
  joystick.x = 0;
  joystick.y = 0;
  ui.joyKnob.style.transform = 'translate(0px, 0px)';
}

function bindJoystick() {
  const el = ui.joystick;
  const move = e => {
    if (!joystick.active || e.pointerId !== joystick.pointerId) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const max = rect.width * 0.31;
    const len = Math.hypot(dx, dy);
    const k = len > 0 ? Math.min(1, len / max) : 0;
    joystick.x = len > 0 ? dx / len * k : 0;
    joystick.y = len > 0 ? dy / len * k : 0;
    ui.joyKnob.style.transform = `translate(${joystick.x * max}px, ${joystick.y * max}px)`;
    e.preventDefault();
  };
  el.addEventListener('pointerdown', e => {
    if (state !== 'playing') return;
    joystick.active = true;
    joystick.pointerId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch {}
    move(e);
  });
  window.addEventListener('pointermove', move, { passive: false });
  const end = e => {
    if (e.pointerId !== joystick.pointerId) return;
    resetJoystick();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

function setupEvents() {
  window.addEventListener('resize', resize);
  window.addEventListener('contextmenu', e => { if (state === 'playing') e.preventDefault(); });
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'm') { toggleSound(); return; }
    if (k === 'escape' || k === 'p') {
      if (state === 'playing' || state === 'paused') togglePause();
      return;
    }
    if (state === 'title') {
      if (k === 'enter' || k === ' ') startRun(selectedChar);
      return;
    }
    if (state === 'gameover') {
      if (k === 'enter' || k === 'r') startRun(selectedChar);
      return;
    }
    if (state === 'levelup') {
      if (k === '1' || k === '2' || k === '3') chooseUpgrade(Number(k) - 1);
      return;
    }
    if (state === 'playing') {
      keys.add(k);
      if (k === ' ') useAbility();
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { if (state === 'playing') togglePause(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') togglePause();
  });

  ui.playBtn.addEventListener('click', () => startRun(selectedChar));
  ui.charGrid.addEventListener('click', e => {
    const card = e.target.closest('[data-char]');
    if (!card) return;
    const char = CHARACTERS.find(c => c.id === card.dataset.char);
    if (!char) return;
    selectedChar = char;
    sound.init();
    sound.ui();
    buildTitleCards();
  });
  ui.pauseBtn.addEventListener('click', togglePause);
  ui.soundBtn.addEventListener('click', toggleSound);
  ui.resumeBtn.addEventListener('click', togglePause);
  ui.quitBtn.addEventListener('click', toTitle);
  ui.retryBtn.addEventListener('click', () => startRun(selectedChar));
  ui.changeBtn.addEventListener('click', toTitle);
  ui.abilityBtn.addEventListener('pointerdown', e => { e.preventDefault(); useAbility(); });
  ui.upgradeGrid.addEventListener('click', e => {
    const card = e.target.closest('[data-index]');
    if (card) chooseUpgrade(Number(card.dataset.index));
  });
  bindJoystick();
}

function frame(now) {
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
  lastFrame = now;
  if (state === 'playing') {
    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - dt);
      flash.a = Math.max(0, flash.a - dt * 2.1);
      updateCamera(dt);
      updateParticles(dt * 0.35);
      updateTexts(dt);
      updateRings(dt);
    } else {
      updateGame(dt);
    }
  } else if (state === 'dying') {
    deathTimer -= dt;
    flash.a = Math.max(0, flash.a - dt * 2.1);
    updateParticles(dt);
    updateTexts(dt);
    updateRings(dt);
    updateCamera(dt);
    if (deathTimer <= 0) endRun();
  } else if (state === 'title') {
    updateAmbient(dt);
  } else if (state === 'gameover') {
    flash.a = Math.max(0, flash.a - dt * 2.1);
    updateParticles(dt * 0.4);
    updateTexts(dt * 0.4);
    updateRings(dt * 0.4);
    updateCamera(dt);
  } else {
    flash.a = Math.max(0, flash.a - dt * 2.1);
  }
  render();
  requestAnimationFrame(frame);
}

function boot() {
  resize();
  initAmbient();
  buildTitleCards();
  refreshTitleBest();
  updateSoundButton();
  setupEvents();
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

boot();

