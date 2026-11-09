import * as THREE from '../vendor/three.module.js';
import { clamp, formatNumber, todayKey } from './utils.js';
import {
  TRUFFLES, MUSHROOMS, RARITY, REGIONS, LANDMARKS, QUESTS, ACHIEVEMENTS,
  SKILL_BRANCHES, SKILL_MAP, COSMETICS, MUSHROOMS as MUSH,
} from './data.js';

const ICONS = {
  attack: `<svg viewBox="0 0 24 24"><path d="M4 19c3-1 5-3 7-6 1.5-2.2 3-3.4 5-4"/><path d="M13 5c2.6.3 4.6 2 5.4 5.4M13 5c1.4 1.1 2.6 2.4 3.3 4.2"/><path d="M3 21l4-1"/></svg>`,
  charge: `<svg viewBox="0 0 24 24"><path d="M3 12h9M3 8h6M3 16h6"/><path d="M12 7l7 5-7 5z"/></svg>`,
  sniff: `<svg viewBox="0 0 24 24"><path d="M9 20c-3 0-5-2-5-5 0-2 1-3 3-4V6c0-1.5 1-2.5 2.5-2.5S12 4.5 12 6v3c0 2 2 2.5 3.5 3.5S18 15 18 17c0 1.7-1.3 3-3 3z"/><path d="M9 17h2"/><path d="M16 4c1.5 1 2.5 2.5 2.5 4.5"/></svg>`,
  dig: `<svg viewBox="0 0 24 24"><path d="M13 3l8 8-3 3-8-8z"/><path d="M13 11L5 19"/><path d="M5 15v4h4"/></svg>`,
  stomp: `<svg viewBox="0 0 24 24"><path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5"/><circle cx="12" cy="12" r="3"/></svg>`,
  guard: `<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M8 12l3 3 5-6"/></svg>`,
  rush: `<svg viewBox="0 0 24 24"><path d="M3 8h10M3 12h7M3 16h10"/><path d="M14 8l6 4-6 4z"/></svg>`,
  rage: `<svg viewBox="0 0 24 24"><path d="M12 21c-4 0-7-3-7-7 0-3 2-5 3-7 1-1.5 1.5-2.5 1.5-4C12 5 14 7 14 9c1-1 1.5-2 1.5-3 2 2 3.5 4.4 3.5 7 0 4.5-3 8-7 8z"/><path d="M12 21c-1.7 0-3-1.4-3-3 0-1.7 1.3-2.5 2-4 .5 1.3 2 2 2 4 0 1.6-1 3-1 3z"/></svg>`,
  tusk: `<svg viewBox="0 0 24 24"><path d="M5 4c7 0 12 4 13 10-4-2-7-2-10 0C9 10 7 7 5 4z"/><path d="M18 14l2 4"/></svg>`,
  shield: `<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></svg>`,
  wind: `<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 100-6"/><path d="M3 13h15a3 3 0 110 6"/><path d="M3 18h6"/></svg>`,
  nose: `<svg viewBox="0 0 24 24"><path d="M9 20c-3 0-5-2-5-5 0-2 1-3 3-4V6c0-1.5 1-2.5 2.5-2.5S12 4.5 12 6v3c0 2 2 2.5 3.5 3.5S18 15 18 17c0 1.7-1.3 3-3 3z"/><path d="M9 17h2"/></svg>`,
  flame: `<svg viewBox="0 0 24 24"><path d="M12 21c-4 0-7-3-7-7 0-3 2-5 3-7 1-1.5 1.5-2.5 1.5-4C12 5 14 7 14 9c1-1 1.5-2 1.5-3 2 2 3.5 4.4 3.5 7 0 4.5-3 8-7 8z"/></svg>`,
  star: '✦', heart: '♥', map: '⌖', level: '▲', crown: '♛', mushroom: '♠', chest: '▣', acorn: '◉', sun: '☀', truffle: '✦',
};

const ABILITY_KEYS = {
  attack: 'J', charge: 'K', sniff: 'X', dig: 'V', stomp: 'Q', guard: 'E', rush: 'R', rage: 'F',
};

function icon(name) {
  if (ICONS[name]) return ICONS[name];
  return ICONS.truffle;
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class UI {
  constructor(game) {
    this.game = game;
    this.menuTab = 'boar';
    this.menuOpen = false;
    this.lastInteraction = '';
    this.hintTimer = 0;
    this.regionTimer = 0;
    this.toastCount = 0;
    this.damageCount = 0;
    this.trackerOpen = true;
    this.el = {};
    const ids = [
      'loading', 'title-screen', 'hud', 'pause-screen', 'death-screen', 'touch-controls',
      'start-btn', 'continue-btn', 'pause-btn', 'resume-btn', 'respawn-btn', 'tracker-toggle',
      'level-num', 'player-title', 'region-chip', 'health-fill', 'health-text', 'stamina-fill',
      'stamina-text', 'rage-fill', 'rage-text', 'xp-fill', 'xp-text', 'coins', 'truffle-count',
      'berry-count', 'clock-text', 'clock-icon', 'day-text', 'quest-list', 'quest-tracker',
      'minimap', 'scent-badge', 'region-popup', 'region-popup-name', 'region-popup-desc',
      'toasts', 'damage-layer', 'interaction', 'interaction-text', 'dig-meter', 'dig-fill',
      'ability-hint', 'hint-bar', 'hint-text', 'hotbar', 'pause-coins', 'pause-truffles',
      'pause-level', 'menu-tabs', 'menu-content', 'boss-wrap', 'boss-fill', 'boss-title',
      'skill-dot', 'save-dot', 'world-map', 'intro-cinematic', 'reticle',
    ];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.slots = [...document.querySelectorAll('#hotbar .slot')];
    this.touchBtns = [...document.querySelectorAll('.tbtn[data-touch]')];
    this.initIcons();
    this.bindStatic();
  }

  initIcons() {
    for (const slot of this.slots) {
      const ico = slot.querySelector('.ico');
      if (ico) ico.innerHTML = icon(slot.dataset.ability);
    }
    for (const btn of document.querySelectorAll('.tbtn[data-touch]')) {
      const name = btn.dataset.touch;
      if (name && ICONS[name]) {
        const span = btn.querySelector('span');
        if (span && typeof ICONS[name] === 'string' && ICONS[name].startsWith('<svg')) span.innerHTML = ICONS[name];
      }
    }
  }

  bindStatic() {
    this.el['start-btn'].addEventListener('click', () => this.game.begin());
    this.el['continue-btn'].addEventListener('click', () => this.game.begin(true));
    this.el['pause-btn'].addEventListener('click', () => this.game.openMenu());
    document.getElementById('touch-pause')?.addEventListener('click', () => this.game.openMenu());
    this.el['resume-btn'].addEventListener('click', () => this.game.closeMenu());
    this.el['respawn-btn'].addEventListener('click', () => this.game.respawn());
    this.el['tracker-toggle'].addEventListener('click', () => {
      this.trackerOpen = !this.trackerOpen;
      this.el['quest-list'].classList.toggle('hidden', !this.trackerOpen);
      this.el['tracker-toggle'].textContent = this.trackerOpen ? '–' : '+';
      this.game.audio.ui();
    });
    for (const tab of this.el['menu-tabs'].querySelectorAll('button')) {
      tab.addEventListener('click', () => {
        this.menuTab = tab.dataset.tab;
        this.game.audio.ui();
        this.renderMenu();
      });
    }
    this.el['menu-content'].addEventListener('click', (event) => this.onMenuClick(event));
  }

  onMenuClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'skill') {
      const id = target.dataset.id;
      if (this.game.buySkill(id)) {
        this.game.audio.ui();
        this.renderMenu();
      } else {
        this.game.audio.error();
      }
    } else if (action === 'cosmetic') {
      this.game.equipCosmetic(target.dataset.id);
      this.game.audio.ui();
      this.renderMenu();
    } else if (action === 'claimDaily') {
      this.game.claimDaily(Number(target.dataset.index));
      this.renderMenu();
    } else if (action === 'save') {
      this.game.saveGame(true);
      this.toast('Saved', 'Your journey is safe in the den.', 'level', '◈');
    } else if (action === 'reset') {
      if (window.confirm('Erase this journey and begin again? This cannot be undone.')) {
        this.game.resetSave();
      }
    } else if (action === 'volume') {
      // handled by input listener
    }
  }

  showTitle(hasSave, saveInfo = null) {
    this.el.loading.classList.add('fade');
    setTimeout(() => this.el.loading.classList.add('hidden'), 900);
    this.el['title-screen'].classList.remove('hidden');
    this.el['continue-btn'].classList.toggle('hidden', !hasSave);
    if (hasSave && saveInfo) {
      this.el['continue-btn'].textContent = `Continue — Level ${saveInfo.level}`;
    }
    this.el.hud.classList.add('hidden');
  }

  hideTitle() {
    this.el['title-screen'].classList.add('fade');
    setTimeout(() => this.el['title-screen'].classList.add('hidden'), 1000);
  }

  showHUD() {
    this.el.hud.classList.remove('hidden');
    this.el['title-screen'].classList.add('hidden');
    document.body.classList.toggle('touch-device', this.game.isTouch);
    this.el['touch-controls'].classList.toggle('hidden', !this.game.isTouch);
  }

  hideHUD() {
    this.el.hud.classList.add('hidden');
    this.el['touch-controls'].classList.add('hidden');
  }

  update(dt) {
    const p = this.game.player;
    if (!p) return;
    const s = p.stats;
    this.el['level-num'].textContent = p.level;
    this.el['player-title'].textContent = p.title;
    this.el['region-chip'].textContent = this.game.currentRegion?.name ?? 'The Forest';
    this.el['health-fill'].style.width = `${clamp((s.health / s.maxHealth) * 100, 0, 100)}%`;
    this.el['health-text'].textContent = `${Math.ceil(s.health)} / ${Math.round(s.maxHealth)}`;
    this.el['stamina-fill'].style.width = `${clamp((s.stamina / s.maxStamina) * 100, 0, 100)}%`;
    this.el['stamina-text'].textContent = `${Math.ceil(s.stamina)} / ${Math.round(s.maxStamina)}`;
    this.el['rage-fill'].style.width = `${clamp((s.rage / s.maxRage) * 100, 0, 100)}%`;
    this.el['rage-text'].textContent = s.rage >= s.maxRage ? 'RAGE READY' : `${Math.floor(s.rage)} / ${s.maxRage}`;
    this.el['xp-fill'].style.width = `${clamp((p.xp / p.xpNeeded) * 100, 0, 100)}%`;
    this.el['xp-text'].textContent = `${formatNumber(p.xp)} / ${formatNumber(p.xpNeeded)} XP`;
    this.el.coins.textContent = formatNumber(p.coins);
    this.el['truffle-count'].textContent = formatNumber(p.truffleCount);
    this.el['berry-count'].textContent = formatNumber(p.berries);
    this.el['pause-coins'].textContent = formatNumber(p.coins);
    this.el['pause-truffles'].textContent = formatNumber(p.truffleCount);
    this.el['pause-level'].textContent = p.level;

    const time = this.game.timeOfDay;
    const hh = Math.floor(time) % 24;
    const mm = Math.floor((time % 1) * 60);
    this.el['clock-text'].textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    this.el['clock-icon'].textContent = this.game.nightFactor > 0.45 ? '☾' : '☀';
    this.el['day-text'].textContent = `Day ${this.game.dayCount}`;
    this.el['scent-badge'].classList.toggle('on', this.game.sniffTimer > 0);
    if (this.game.sniffTimer > 0) this.el['scent-badge'].innerHTML = `<span>◌</span> Scent ${Math.ceil(this.game.sniffTimer)}s`;

    // Ability slots.
    const unlocked = this.game.player.abilities;
    for (const slot of this.slots) {
      const name = slot.dataset.ability;
      const locked = name in unlocked ? !unlocked[name] : false;
      slot.classList.toggle('locked', locked);
      const cd = this.game.cooldowns[name] || 0;
      const max = this.game.cooldownMax[name] || 1;
      const cdEl = slot.querySelector('.cooldown');
      if (cdEl) cdEl.style.setProperty('--cd', `${clamp(cd / max, 0, 1) * 360}deg`);
      slot.classList.toggle('rage-full', name === 'rage' && s.rage >= s.maxRage);
    }
    for (const btn of this.touchBtns) {
      const name = btn.dataset.touch;
      if (name in unlocked) btn.classList.toggle('locked', !unlocked[name]);
    }
    if (this.el['skill-dot']) this.el['skill-dot'].classList.toggle('hidden', this.game.skillPoints <= 0);

    this.updateQuestTracker();
    this.updateMinimap();
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.el['hint-bar'].classList.add('fade');
    }
    if (this.regionTimer > 0) {
      this.regionTimer -= dt;
      if (this.regionTimer <= 0) this.el['region-popup'].classList.add('hidden');
    }
    if (this.menuOpen) this.updateMenuLive();
  }

  updateQuestTracker() {
    const active = this.game.getActiveQuests().slice(0, 3);
    if (!active.length) {
      this.el['quest-list'].innerHTML = '<div class="quest-empty">No tasks. The forest is yours to explore.</div>';
      return;
    }
    this.el['quest-list'].innerHTML = active.map((q) => {
      const state = this.game.questState[q.id];
      const obj = q.objectives[0];
      const prog = state?.progress?.[0] ?? 0;
      return `<div class="quest-row">
        <b>${esc(q.name)}</b>
        <span>${esc(obj.label)} ${prog}/${obj.count}</span>
        <div class="qprog"><i style="width:${clamp((prog / obj.count) * 100, 0, 100)}%"></i></div>
      </div>`;
    }).join('');
  }

  updateMinimap() {
    const canvas = this.el.minimap;
    if (!canvas || canvas.offsetParent === null) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const scale = (w / 2) / 52;
    const player = this.game.player.pos;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    // Ground.
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
    g.addColorStop(0, '#37492b');
    g.addColorStop(0.6, '#2a3921');
    g.addColorStop(1, '#1b2616');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Region washes.
    for (const r of REGIONS) {
      const dx = cx + (r.x - player.x) * scale;
      const dy = cy + (r.z - player.z) * scale;
      const rr = r.radius * scale;
      const discovered = this.game.player.regions.has(r.id);
      ctx.beginPath();
      ctx.arc(dx, dy, rr, 0, Math.PI * 2);
      ctx.fillStyle = discovered ? this.hexA(r.color, 0.2) : 'rgba(90,100,75,0.08)';
      ctx.fill();
      if (discovered) {
        ctx.strokeStyle = this.hexA(r.color, 0.32);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // Paths.
    ctx.strokeStyle = 'rgba(205,180,125,0.22)';
    ctx.lineWidth = 2;
    for (const path of this.game.paths) {
      ctx.beginPath();
      path.forEach(([x, z], i) => {
        const dx = cx + (x - player.x) * scale;
        const dy = cy + (z - player.z) * scale;
        if (i === 0) ctx.moveTo(dx, dy); else ctx.lineTo(dx, dy);
      });
      ctx.stroke();
    }
    // Landmarks.
    for (const l of LANDMARKS) {
      if (!this.game.player.landmarks.has(l.id)) continue;
      const dx = cx + (l.x - player.x) * scale;
      const dy = cy + (l.z - player.z) * scale;
      ctx.fillStyle = '#d9b567';
      ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(15,20,11,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Treasure sense.
    if (this.game.player.skills.treasure_sense) {
      for (const c of this.game.world.chests) {
        if (c.opened) continue;
        const dx = cx + (c.x - player.x) * scale;
        const dy = cy + (c.z - player.z) * scale;
        ctx.fillStyle = '#ffd36a';
        ctx.fillRect(dx - 2.5, dy - 2.5, 5, 5);
      }
      for (const c of this.game.world.collectibles) {
        if (c.taken) continue;
        const dx = cx + (c.x - player.x) * scale;
        const dy = cy + (c.z - player.z) * scale;
        ctx.fillStyle = '#e0a83c';
        ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Truffles while sniffing.
    if (this.game.sniffTimer > 0) {
      for (const t of this.game.truffleManager.revealed) {
        const dx = cx + (t.x - player.x) * scale;
        const dy = cy + (t.z - player.z) * scale;
        ctx.fillStyle = t.type.glow;
        ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,25,14,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    // Enemies.
    for (const e of this.game.enemyManager.enemies) {
      if (!e.alive) continue;
      const dx = cx + (e.pos.x - player.x) * scale;
      const dy = cy + (e.pos.z - player.z) * scale;
      if (Math.hypot(dx - cx, dy - cy) > w / 2) continue;
      ctx.fillStyle = e.boss ? '#ff7a45' : '#d35b45';
      ctx.beginPath(); ctx.arc(dx, dy, e.boss ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.game.player.yaw + Math.PI);
    ctx.fillStyle = '#f5e9c9';
    ctx.strokeStyle = '#1a2114';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // Scan ring.
    const t = performance.now() * 0.001;
    ctx.strokeStyle = 'rgba(240,213,140,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, (t % 2) * 40 + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Inner vignette.
    const v = ctx.createRadialGradient(cx, cy, w * 0.28, cx, cy, w * 0.5);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,12,6,0.45)');
    ctx.fillStyle = v;
    ctx.beginPath(); ctx.arc(cx, cy, w / 2, 0, Math.PI * 2); ctx.fill();
  }

  hexA(hex, a) {
    const c = new THREE.Color(hex);
    return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  }

  setInteraction(state) {
    if (!state) {
      if (this.lastInteraction !== '') {
        this.el.interaction.classList.add('hidden');
        this.lastInteraction = '';
      }
      return;
    }
    const key = `${state.text}|${state.hold}|${state.progress ?? -1}`;
    if (key === this.lastInteraction) return;
    this.lastInteraction = key;
    this.el.interaction.classList.remove('hidden');
    this.el['interaction-text'].textContent = state.text;
    const keyEl = this.el.interaction.querySelector('.interact-key');
    keyEl.textContent = state.key ?? 'V';
    if (state.progress !== undefined && state.progress !== null) {
      this.el['dig-meter'].classList.remove('hidden');
      this.el['dig-fill'].style.width = `${clamp(state.progress, 0, 1) * 100}%`;
    } else {
      this.el['dig-meter'].classList.add('hidden');
    }
  }

  showHint(text, duration = 8) {
    this.el['hint-text'].innerHTML = text;
    this.el['hint-bar'].classList.remove('fade');
    this.hintTimer = duration;
  }

  showRegion(region) {
    this.showBanner('ENTERING', region.name, region.desc);
  }

  showBanner(kicker, title, desc) {
    const popup = this.el['region-popup'];
    if (!popup) return;
    const small = popup.querySelector('small');
    if (small) small.textContent = kicker;
    this.el['region-popup-name'].textContent = title;
    this.el['region-popup-desc'].textContent = desc;
    popup.classList.remove('hidden');
    popup.style.animation = 'none';
    void popup.offsetWidth;
    popup.style.animation = '';
    this.regionTimer = 5.4;
  }

  showWarning(text) {
    this.el['ability-hint'].textContent = text;
    this.el['ability-hint'].classList.remove('hidden');
    clearTimeout(this.warningTimer);
    this.warningTimer = setTimeout(() => this.el['ability-hint'].classList.add('hidden'), 1800);
  }

  toast(title, text, type = 'info', iconChar = '✦') {
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = `<div class="t-ico">${iconChar}</div><div class="t-body"><b>${esc(title)}</b><span>${esc(text)}</span></div>`;
    this.el.toasts.appendChild(div);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => {
      div.classList.add('out');
      setTimeout(() => div.remove(), 420);
    }, type === 'achievement' ? 5200 : 4200);
  }

  damageNumber(worldPos, value, type = 'normal') {
    const v = worldPos.clone ? worldPos.clone() : new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    v.y += 1.4;
    v.project(this.game.camera);
    if (v.z > 1 || v.z < -1) return;
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) return;
    const div = document.createElement('div');
    div.className = `dmg ${type}`;
    div.textContent = value;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    this.el['damage-layer'].appendChild(div);
    setTimeout(() => div.remove(), 950);
  }

  showBossBar(enemy) {
    if (!enemy) {
      this.el['boss-wrap'].classList.add('hidden');
      return;
    }
    this.el['boss-wrap'].classList.remove('hidden');
    this.el['boss-title'].textContent = enemy.stats.name.toUpperCase();
    this.el['boss-fill'].style.width = `${clamp(enemy.hp / enemy.maxHp, 0, 1) * 100}%`;
  }

  setHudVisible(visible) {
    this.el.hud.classList.toggle('hidden', !visible);
  }

  openMenu() {
    this.menuOpen = true;
    this.el['pause-screen'].classList.remove('hidden');
    this.renderMenu();
  }

  closeMenu() {
    this.menuOpen = false;
    this.el['pause-screen'].classList.add('hidden');
  }

  updateMenuLive() {
    // Only the map needs live updates while the menu is open.
    if (this.menuTab === 'map') this.drawWorldMap();
  }

  renderMenu() {
    for (const tab of this.el['menu-tabs'].querySelectorAll('button')) {
      tab.classList.toggle('active', tab.dataset.tab === this.menuTab);
    }
    const c = this.el['menu-content'];
    c.scrollTop = 0;
    if (this.menuTab === 'boar') c.innerHTML = this.renderBoar();
    else if (this.menuTab === 'skills') c.innerHTML = this.renderSkills();
    else if (this.menuTab === 'quests') c.innerHTML = this.renderQuests();
    else if (this.menuTab === 'journal') c.innerHTML = this.renderJournal();
    else if (this.menuTab === 'trophies') c.innerHTML = this.renderTrophies();
    else if (this.menuTab === 'map') c.innerHTML = this.renderMap();
    else c.innerHTML = this.renderSettings();
    if (this.menuTab === 'settings') this.bindSettings();
    if (this.menuTab === 'map') setTimeout(() => this.drawWorldMap(), 0);
  }

  renderBoar() {
    const p = this.game.player;
    const s = p.stats;
    const equipped = p.equippedCosmetics;
    const cosmetics = COSMETICS.map((c) => {
      const unlocked = p.cosmeticsUnlocked.includes(c.id);
      const active = equipped.includes(c.id);
      return `<button class="cosmetic ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-action="cosmetic" data-id="${c.id}" ${unlocked ? '' : 'disabled'}>
        <span class="c-ico">${c.icon}</span>
        <span><b>${c.name}</b><span>${unlocked ? c.desc : 'Locked — discover it in the forest.'}</span></span>
        ${active ? '<span class="c-check">✓</span>' : ''}
      </button>`;
    }).join('');
    const statLine = (label, value, pct) => `<div class="stat-line"><span>${label}</span><b>${value}</b><div class="mini-bar"><i style="width:${clamp(pct, 0, 100)}%"></i></div></div>`;
    return `
      <div class="menu-section-title">Your Boar</div>
      <div class="menu-section-sub">A sturdy snout, a stubborn heart, and a nose that remembers every root.</div>
      <div class="panel-grid">
        <div class="card">
          <div class="big-level">
            <div class="ring"><b>${p.level}</b><small>LEVEL</small></div>
            <div><h3>${p.title}</h3><p>${formatNumber(p.xp)} / ${formatNumber(p.xpNeeded)} XP to the next level</p></div>
          </div>
          <div class="stat-list">
            ${statLine('Health', `${Math.round(s.maxHealth)}`, s.maxHealth / 2.4)}
            ${statLine('Stamina', `${Math.round(s.maxStamina)}`, s.maxStamina / 2.4)}
            ${statLine('Tusk Damage', `${Math.round(s.attack)}`, s.attack / 40)}
            ${statLine('Charge Power', `${Math.round(s.attack * s.chargeMultiplier)}`, s.attack * s.chargeMultiplier / 70)}
            ${statLine('Speed', `${s.speed.toFixed(1)} m/s`, s.speed / 11)}
            ${statLine('Scent Range', `${Math.round(s.smellRadius)} m`, s.smellRadius / 55)}
            ${statLine('Dig Speed', `${(s.digSpeed * 100).toFixed(0)}%`, s.digSpeed * 55)}
            ${statLine('Damage Reduction', `${Math.round(s.damageReduction * 100)}%`, s.damageReduction * 160)}
            ${statLine('Critical Chance', `${Math.round(s.critChance * 100)}%`, s.critChance * 250)}
          </div>
        </div>
        <div class="card">
          <div class="card-kicker">Renown</div>
          <h3>Known to the Forest</h3>
          <p>Every root dug and every pack turned away adds to your legend.</p>
          <div class="stat-list">
            ${statLine('Truffles found', formatNumber(p.truffleCount), Math.min(100, p.truffleCount))}
            ${statLine('Enemies defeated', formatNumber(p.enemiesDefeated), Math.min(100, p.enemiesDefeated))}
            ${statLine('Secrets found', `${p.landmarks.size} / ${LANDMARKS.length}`, p.landmarks.size / LANDMARKS.length * 100)}
            ${statLine('Regions walked', `${p.regions.size} / ${REGIONS.length}`, p.regions.size / REGIONS.length * 100)}
            ${statLine('Daily streak', `${p.dailyStreak}`, p.dailyStreak * 10)}
          </div>
          <div class="card-kicker" style="margin-top:18px">Cosmetics</div>
          <div class="cosmetics">${cosmetics}</div>
          <div class="equip-note">Click an unlocked cosmetic to wear or remove it.</div>
        </div>
      </div>`;
  }

  renderSkills() {
    const p = this.game.player;
    const branches = SKILL_BRANCHES.map((b) => {
      const nodes = b.nodes.map((n) => {
        const rank = p.skills[n.id] || 0;
        const maxed = rank >= n.max;
        const reqOk = n.req.every((r) => (p.skills[r] || 0) > 0);
        const levelOk = !n.level || p.level >= n.level;
        const canBuy = !maxed && reqOk && levelOk && this.game.skillPoints >= n.cost;
        const cls = maxed ? 'maxed' : rank > 0 ? 'owned' : canBuy ? 'available' : 'locked';
        let reqText = '';
        if (maxed) reqText = '<div class="req">Mastered</div>';
        else if (!levelOk) reqText = `<div class="req">Requires level ${n.level}</div>`;
        else if (!reqOk) reqText = `<div class="req">Requires ${n.req.map((r) => SKILL_MAP[r]?.name ?? r).join(', ')}</div>`;
        else if (this.game.skillPoints < n.cost) reqText = `<div class="req">Need ${n.cost} skill point${n.cost > 1 ? 's' : ''}</div>`;
        return `<button class="skill-node ${cls}" data-action="skill" data-id="${n.id}" ${canBuy ? '' : 'disabled'}>
          <div class="connector"></div>
          <div class="n-top"><b>${n.name}</b><span class="rank">${rank}/${n.max}</span></div>
          <p>${n.desc}</p>
          ${reqText}
          ${canBuy ? `<span class="buy">+</span>` : ''}
        </button>`;
      }).join('');
      return `<div class="skill-branch" style="--branch:${b.color}">
        <div class="branch-head"><span class="b-ico">${icon(b.icon)}</span><b>${b.name}</b><span>${b.nodes.filter((n) => (p.skills[n.id] || 0) > 0).length}/${b.nodes.length}</span></div>
        <div class="branch-nodes">${nodes}</div>
      </div>`;
    }).join('');
    return `
      <div class="skills-head">
        <div><div class="menu-section-title">Primal Paths</div><div class="menu-section-sub" style="margin-bottom:0">Spend skill points to shape the boar you will become. Choices are permanent.</div></div>
        <div class="skill-points"><b>${this.game.skillPoints}</b><span>skill points</span></div>
      </div>
      <div class="skills-grid">${branches}</div>`;
  }

  renderQuests() {
    const p = this.game.player;
    const rows = QUESTS.map((q) => {
      const state = this.game.questState[q.id];
      const status = state?.status ?? 'locked';
      if (status === 'locked' && !state?.visible) return '';
      const objs = q.objectives.map((o, i) => {
        const prog = state?.progress?.[i] ?? 0;
        return `<div class="obj-line"><span>${o.label}</span><em>${prog} / ${o.count}</em></div>`;
      }).join('');
      const reward = [];
      if (q.reward.xp) reward.push(`<span><b>${q.reward.xp}</b> XP</span>`);
      if (q.reward.coins) reward.push(`<span><b>${q.reward.coins}</b> coins</span>`);
      if (q.reward.berries) reward.push(`<span><b>${q.reward.berries}</b> berries</span>`);
      if (q.reward.cosmetic) reward.push(`<span><b>${COSMETICS.find((c) => c.id === q.reward.cosmetic)?.name ?? 'Cosmetic'}</b></span>`);
      return `<div class="quest-card ${status === 'done' ? 'done' : status === 'locked' ? 'locked' : ''}">
        <div class="q-kicker">${status === 'done' ? 'Completed' : status === 'active' ? 'In progress' : 'Not yet offered'}</div>
        <h4>${q.name}</h4>
        <div class="giver">${q.giver}</div>
        <p class="desc">${q.desc}</p>
        <div class="obj">${objs}</div>
        <div class="reward">${reward.join('')}</div>
        ${status === 'done' ? '<span class="q-status">✓ Done</span>' : ''}
      </div>`;
    }).filter(Boolean).join('');
    const daily = p.daily?.challenges ?? [];
    const dailyCards = daily.map((d, i) => {
      const complete = d.progress >= d.target;
      const claimed = d.claimed;
      return `<div class="daily-card ${complete ? 'complete' : ''}">
        <h4>${d.name}</h4>
        <p>${d.desc}</p>
        <div class="d-prog"><i style="width:${clamp(d.progress / d.target, 0, 1) * 100}%"></i></div>
        <div class="d-foot"><span>${Math.min(d.progress, d.target)} / ${d.target}</span><b>+${d.reward.xp} XP · +${d.reward.coins} coins</b></div>
        ${complete && !claimed ? `<button class="claim-btn" data-action="claimDaily" data-index="${i}">Claim reward</button>` : ''}
        ${claimed ? '<div class="claimed-note">Claimed</div>' : ''}
      </div>`;
    }).join('');
    return `
      <div class="menu-section-title">The Forest Asks</div>
      <div class="menu-section-sub">Old Root's tasks, whispered secrets, and the small daily work of keeping the valley safe.</div>
      <div class="quest-board">${rows || '<div class="card"><p>Explore the forest to find new tasks.</p></div>'}</div>
      <div class="daily-wrap">
        <div class="menu-section-title" style="font-size:16px">Daily Challenges <span style="font-size:9px;color:var(--cream-dim);font-family:var(--sans)">— ${p.daily?.date ?? todayKey()}</span></div>
        <div class="menu-section-sub">Three small promises for today. They reset at midnight.</div>
        <div class="daily-grid">${dailyCards}</div>
      </div>`;
  }

  renderJournal() {
    const p = this.game.player;
    const truffleEntries = TRUFFLES.map((t) => {
      const count = p.truffleCounts[t.id] || 0;
      const r = RARITY[t.rarity];
      return `<div class="entry ${count ? '' : 'unknown'}" style="--e-color:${r.glow}">
        <div class="e-ico">${count ? '✦' : '?'}</div>
        <div><b>${count ? t.name : 'Undiscovered'}</b><small>${r.label} · ${t.value} coins</small>${count ? `<p>${t.lore}</p>` : '<p>The forest keeps this one hidden.</p>'}</div>
        <div class="count">${count}</div>
      </div>`;
    }).join('');
    const mushroomEntries = MUSH.map((m) => {
      const count = p.mushroomCounts[m.id] || 0;
      return `<div class="entry ${count ? '' : 'unknown'}" style="--e-color:${m.glow}">
        <div class="e-ico">${count ? '♠' : '?'}</div>
        <div><b>${count ? m.name : 'Undiscovered'}</b><small>${count ? m.effectText : 'A mushroom yet to be found'}</small>${count ? `<p>${m.lore}</p>` : ''}</div>
        <div class="count">${count}</div>
      </div>`;
    }).join('');
    const landmarks = LANDMARKS.map((l) => {
      const found = p.landmarks.has(l.id);
      return `<div class="landmark ${found ? '' : 'unknown'}"><span class="l-ico">${found ? (l.secret ? '✦' : '◆') : '?'}</span><span>${found ? l.name : 'Unknown place'}</span><small>${found ? (l.secret ? 'Secret' : 'Landmark') : 'Undiscovered'}</small></div>`;
    }).join('');
    return `
      <div class="menu-section-title">Field Journal</div>
      <div class="menu-section-sub">The nose remembers what the eyes forget. Every truffle and mushroom you have found.</div>
      <div class="journal-grid">${truffleEntries}${mushroomEntries}</div>
      <div class="menu-section-title" style="font-size:16px;margin-top:24px">Places Discovered</div>
      <div class="menu-section-sub">${p.regions.size} of ${REGIONS.length} regions · ${p.landmarks.size} of ${LANDMARKS.length} landmarks</div>
      <div class="landmark-list">${landmarks}</div>`;
  }

  renderTrophies() {
    const p = this.game.player;
    const rows = ACHIEVEMENTS.map((a) => {
      const state = p.achievements[a.id] || { progress: 0, done: false };
      const done = state.done;
      const prog = Math.min(state.progress, a.target);
      const reward = [];
      if (a.reward.xp) reward.push(`+${a.reward.xp} XP`);
      if (a.reward.coins) reward.push(`+${a.reward.coins} coins`);
      if (a.reward.cosmetic) reward.push(COSMETICS.find((c) => c.id === a.reward.cosmetic)?.name ?? 'Cosmetic');
      return `<div class="ach ${done ? 'done' : ''}">
        <div class="a-ico">${done ? '✓' : icon(a.icon)}</div>
        <div class="a-body"><b>${a.name}</b><p>${a.desc}</p></div>
        <div class="a-prog"><div class="mini"><i style="width:${clamp(prog / a.target, 0, 1) * 100}%"></i></div><span>${prog} / ${a.target}</span></div>
        <div class="a-reward">${reward.join('<br>')}</div>
      </div>`;
    }).join('');
    return `
      <div class="menu-section-title">Trophies &amp; Tales</div>
      <div class="menu-section-sub">A boar's worth is written in the forest, not in stone. But a few trophies help.</div>
      <div class="ach-list">${rows}</div>`;
  }

  renderMap() {
    const p = this.game.player;
    return `
      <div class="menu-section-title">The Valley</div>
      <div class="menu-section-sub">Six regions, one stubborn boar. Gold marks are places you have found.</div>
      <div class="map-panel">
        <canvas id="world-map" width="900" height="900"></canvas>
        <div class="map-legend">
          <div><i style="background:#f5e9c9"></i> You are here</div>
          <div><i style="background:#d9b567"></i> Discovered landmark</div>
          <div><i style="background:#d35b45"></i> Dangerous creature</div>
          <div><i style="background:#8fb45c"></i> Region discovered</div>
          <div class="map-note">Regions you have not visited remain veiled. Treasure Sense reveals chests and ancient acorns on your minimap.</div>
          <div class="map-note" style="margin-top:0">${p.regions.size} / ${REGIONS.length} regions · ${p.landmarks.size} / ${LANDMARKS.length} landmarks</div>
        </div>
      </div>`;
  }

  drawWorldMap() {
    const canvas = document.getElementById('world-map');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const p = this.game.player;
    const scale = (w * 0.44) / 140;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
    bg.addColorStop(0, '#2c3c24');
    bg.addColorStop(0.7, '#1d2918');
    bg.addColorStop(1, '#121a0e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // World boundary.
    ctx.beginPath(); ctx.arc(cx, cy, 140 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(217,181,103,0.22)'; ctx.lineWidth = 2; ctx.stroke();
    // Regions.
    for (const r of REGIONS) {
      const found = p.regions.has(r.id);
      const x = cx + r.x * scale, y = cy + r.z * scale;
      ctx.beginPath(); ctx.arc(x, y, r.radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = found ? this.hexA(r.color, 0.18) : 'rgba(80,90,70,0.07)';
      ctx.fill();
      ctx.strokeStyle = found ? this.hexA(r.color, 0.45) : 'rgba(80,90,70,0.12)';
      ctx.lineWidth = 2; ctx.stroke();
      if (found) {
        ctx.fillStyle = 'rgba(245,235,210,0.75)';
        ctx.font = '600 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(r.short, x, y + r.radius * scale + 24);
      }
    }
    // Paths.
    ctx.strokeStyle = 'rgba(205,180,125,0.2)'; ctx.lineWidth = 3;
    for (const path of this.game.paths) {
      ctx.beginPath();
      path.forEach(([x, z], i) => {
        if (i === 0) ctx.moveTo(cx + x * scale, cy + z * scale);
        else ctx.lineTo(cx + x * scale, cy + z * scale);
      });
      ctx.stroke();
    }
    // Landmarks.
    for (const l of LANDMARKS) {
      if (!p.landmarks.has(l.id)) continue;
      const x = cx + l.x * scale, y = cy + l.z * scale;
      ctx.fillStyle = l.secret ? '#f0d58c' : '#d9b567';
      ctx.beginPath();
      if (l.secret) { ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); }
      else { ctx.arc(x, y, 5, 0, Math.PI * 2); }
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,20,11,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(242,231,201,0.8)';
      ctx.font = 'italic 17px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(l.name, x, y - 12);
    }
    // Boss lair.
    if (this.game.enemyManager.boss?.alive) {
      const b = this.game.enemyManager.boss;
      const x = cx + b.pos.x * scale, y = cy + b.pos.z * scale;
      ctx.fillStyle = '#d35b45';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,160,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    }
    // Player.
    const px = cx + p.pos.x * scale, py = cy + p.pos.z * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-p.yaw + Math.PI);
    ctx.fillStyle = '#f5e9c9';
    ctx.strokeStyle = '#1a2114';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(245,235,210,0.6)';
    ctx.font = 'italic 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('You', px, py + 28);
  }

  renderSettings() {
    const g = this.game;
    const settings = g.settings;
    return `
      <div class="menu-section-title">Den Settings</div>
      <div class="menu-section-sub">Make the forest comfortable. Changes save automatically.</div>
      <div class="settings-list">
        <div class="setting">
          <label>Forest sound<small>Ambient wind, birds, paws and tusks.</small></label>
          <button class="toggle ${settings.sound ? 'on' : ''}" id="set-sound" type="button" aria-label="Toggle sound"></button>
        </div>
        <div class="setting">
          <label>Volume<small>Overall sound level.</small></label>
          <input id="set-volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" />
          <span class="value" id="volume-val">${Math.round(settings.volume * 100)}%</span>
        </div>
        <div class="setting">
          <label>Camera sensitivity<small>How quickly the camera swings with a drag.</small></label>
          <input id="set-sens" type="range" min="30" max="180" value="${Math.round(settings.sensitivity * 100)}" />
          <span class="value" id="sens-val">${Math.round(settings.sensitivity * 100)}</span>
        </div>
        <div class="setting">
          <label>Show quest tracker<small>The small list of tasks on the left.</small></label>
          <button class="toggle ${settings.questTracker ? 'on' : ''}" id="set-tracker" type="button" aria-label="Toggle quest tracker"></button>
        </div>
        <div class="setting">
          <label>Autosave<small>The forest remembers every few minutes.</small></label>
          <button class="toggle ${settings.autosave ? 'on' : ''}" id="set-autosave" type="button" aria-label="Toggle autosave"></button>
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="card-kicker">Controls</div>
        <div class="controls-grid">
          <div><span>Move</span><b>W A S D</b></div>
          <div><span>Sprint</span><b>Shift</b></div>
          <div><span>Look around</span><b>Drag / Right mouse</b></div>
          <div><span>Jump</span><b>Space</b></div>
          <div><span>Tusk strike</span><b>J / Left click</b></div>
          <div><span>Charge</span><b>K / Right click</b></div>
          <div><span>Sniff</span><b>X</b></div>
          <div><span>Dig / interact</span><b>Hold V</b></div>
          <div><span>Ground stomp</span><b>Q</b></div>
          <div><span>Guard</span><b>E</b></div>
          <div><span>Battle rush</span><b>R</b></div>
          <div><span>Primal rage</span><b>F</b></div>
          <div><span>Open the den</span><b>Esc</b></div>
          <div><span>Eat berries</span><b>H</b></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="flex:1"><h3>Save &amp; journey</h3><p>Autosave is ${settings.autosave ? 'on' : 'off'}. You can also save right now.</p></div>
        <button class="btn btn-small" data-action="save" type="button">Save now</button>
        <button class="danger-btn" data-action="reset" type="button">Begin again</button>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-kicker">A note from the valley</div>
        <p style="font-family:var(--serif);font-size:14px;color:#e7d9b8;line-height:1.6">“A boar does not measure the forest by the distance walked, but by the roots remembered.”<br/><span style="font-size:10px;color:var(--cream-dim)">— Old Root, keeper of the den</span></p>
      </div>`;
  }

  bindSettings() {
    const g = this.game;
    const sound = document.getElementById('set-sound');
    sound?.addEventListener('click', () => {
      g.settings.sound = !g.settings.sound;
      g.audio.setEnabled(g.settings.sound);
      sound.classList.toggle('on', g.settings.sound);
      g.audio.ui();
      g.saveSettings();
    });
    const vol = document.getElementById('set-volume');
    vol?.addEventListener('input', () => {
      g.settings.volume = Number(vol.value) / 100;
      document.getElementById('volume-val').textContent = `${vol.value}%`;
      g.audio.setVolume(g.settings.volume);
    });
    vol?.addEventListener('change', () => g.saveSettings());
    const sens = document.getElementById('set-sens');
    sens?.addEventListener('input', () => {
      g.settings.sensitivity = Number(sens.value) / 100;
      document.getElementById('sens-val').textContent = sens.value;
    });
    sens?.addEventListener('change', () => g.saveSettings());
    const tracker = document.getElementById('set-tracker');
    tracker?.addEventListener('click', () => {
      g.settings.questTracker = !g.settings.questTracker;
      tracker.classList.toggle('on', g.settings.questTracker);
      this.el['quest-tracker'].classList.toggle('hidden', !g.settings.questTracker);
      g.saveSettings();
    });
    const auto = document.getElementById('set-autosave');
    auto?.addEventListener('click', () => {
      g.settings.autosave = !g.settings.autosave;
      auto.classList.toggle('on', g.settings.autosave);
      g.saveSettings();
    });
  }
}
