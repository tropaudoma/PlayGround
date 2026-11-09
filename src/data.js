export const TAU = Math.PI * 2;

export const CHARACTERS = [
  {
    id: 'vesper',
    name: 'Vesper',
    epithet: 'Ember Mage',
    icon: '✦',
    color: '#63e7ff',
    accent: '#a78bfa',
    weapon: 'bolt',
    ability: 'blink',
    difficulty: 'BALANCED',
    blurb: 'A glass cannon who blinks through the dark and detonates it.',
    stats: { maxHp: 100, speed: 220, damage: 1, attackSpeed: 1, area: 1, crit: 0.05, critMult: 1.7, pickup: 115, xpGain: 1, luck: 0, armor: 0, regen: 0 },
    bars: { power: 3, speed: 3, guard: 1 }
  },
  {
    id: 'bramble',
    name: 'Bramble',
    epithet: 'Thorn Warden',
    icon: '❖',
    color: '#6ee7a0',
    accent: '#d9f99d',
    weapon: 'thorn',
    ability: 'guard',
    difficulty: 'STURDY',
    blurb: 'A living barricade. Blades orbit, thorns bite, nothing gets through.',
    stats: { maxHp: 145, speed: 190, damage: 1.05, attackSpeed: 0.92, area: 1.05, crit: 0.03, critMult: 1.6, pickup: 125, xpGain: 1, luck: 0, armor: 3, regen: 0.3 },
    bars: { power: 3, speed: 1, guard: 4 }
  },
  {
    id: 'kite',
    name: 'Kite',
    epithet: 'Glass Scout',
    icon: '➤',
    color: '#ffb45e',
    accent: '#ff5d8f',
    weapon: 'scatter',
    ability: 'overdrive',
    difficulty: 'FRAGILE',
    blurb: 'Fast, loud, and always one mistake from disaster. Overdrive rewards nerve.',
    stats: { maxHp: 82, speed: 252, damage: 0.94, attackSpeed: 1.08, area: 1, crit: 0.1, critMult: 1.75, pickup: 120, xpGain: 1.05, luck: 0.06, armor: 0, regen: 0 },
    bars: { power: 2, speed: 4, guard: 1 }
  },
  {
    id: 'sable',
    name: 'Sable',
    epithet: 'Void Oracle',
    icon: '◈',
    color: '#c77dff',
    accent: '#63e7ff',
    weapon: 'chain',
    ability: 'singularity',
    difficulty: 'TACTICAL',
    blurb: 'Storms follow her fingertips. Collapse the horde into a single point.',
    stats: { maxHp: 92, speed: 205, damage: 1, attackSpeed: 1, area: 1.1, crit: 0.06, critMult: 1.8, pickup: 140, xpGain: 1.1, luck: 0.03, armor: 0, regen: 0 },
    bars: { power: 4, speed: 2, guard: 2 }
  }
];

export const ABILITIES = {
  blink: {
    id: 'blink',
    name: 'Blink Nova',
    icon: '✦',
    cooldown: 8.5,
    desc: 'Blink in your move direction and detonate arcane force at both ends.'
  },
  guard: {
    id: 'guard',
    name: 'Bramble Guard',
    icon: '❖',
    cooldown: 13,
    desc: 'Gain a shield and a thorn pulse that shreds nearby enemies for 4 seconds.'
  },
  overdrive: {
    id: 'overdrive',
    name: 'Overdrive',
    icon: '➤',
    cooldown: 14,
    desc: 'For 5 seconds gain 80% attack speed and 35% move speed.'
  },
  singularity: {
    id: 'singularity',
    name: 'Singularity',
    icon: '◈',
    cooldown: 15,
    desc: 'Open a void well that drags enemies inward and tears them apart.'
  }
};

export const WEAPONS = {
  bolt: {
    id: 'bolt',
    name: 'Arcane Bolt',
    icon: '✦',
    color: '#63e7ff',
    tier: 2,
    kind: 'projectile',
    desc: 'Seeking bolts that strike the nearest enemy.',
    levelDesc: 'Damage up. An extra bolt every 2 levels.',
    base: { cooldown: 0.82, damage: 14, speed: 640, range: 680, radius: 6, pierce: 0, homing: 4.2 }
  },
  thorn: {
    id: 'thorn',
    name: 'Thorn Orbit',
    icon: '❖',
    color: '#6ee7a0',
    tier: 2,
    kind: 'orbit',
    desc: 'Living blades orbit you and shred anything they touch.',
    levelDesc: 'More blades, wider orbit, more damage.',
    base: { cooldown: 0.1, damage: 10, radius: 74, speed: 2.3 }
  },
  scatter: {
    id: 'scatter',
    name: 'Scatter Shot',
    icon: '➤',
    color: '#ffb45e',
    tier: 2,
    kind: 'projectile',
    desc: 'A cone of hot shards that shreds packs at close range.',
    levelDesc: 'More shards and damage, faster spread.',
    base: { cooldown: 1.06, damage: 8, speed: 570, range: 560, radius: 4, spread: 0.5, pierce: 0 }
  },
  chain: {
    id: 'chain',
    name: 'Chain Lightning',
    icon: '⌁',
    color: '#c77dff',
    tier: 3,
    kind: 'chain',
    desc: 'Arcs of void lightning leap between nearby enemies.',
    levelDesc: 'More chains, damage, and faster casts.',
    base: { cooldown: 1.6, damage: 12, range: 640, chains: 3 }
  },
  boomerang: {
    id: 'boomerang',
    name: 'Moon Chakram',
    icon: '☾',
    color: '#7dd3fc',
    tier: 3,
    kind: 'boomerang',
    desc: 'A spinning crescent that tears out and returns.',
    levelDesc: 'Extra chakrams, more damage, faster return.',
    base: { cooldown: 1.45, damage: 15, speed: 530, range: 500, radius: 12 }
  },
  flame: {
    id: 'flame',
    name: 'Ember Aura',
    icon: '✹',
    color: '#ff8a5b',
    tier: 3,
    kind: 'aura',
    desc: 'A ring of cinders burns everything close to you.',
    levelDesc: 'Larger radius, hotter ticks.',
    base: { cooldown: 0.42, damage: 4, radius: 92 }
  }
};

export const WEAPON_MAX_LEVEL = 10;

export function getWeaponStats(type, level, player) {
  const w = WEAPONS[type];
  const l = Math.max(0, level - 1);
  const s = { ...w.base, kind: w.kind, color: w.color, name: w.name, icon: w.icon };

  if (type === 'bolt') {
    s.damage = 17 + 4.2 * l;
    s.count = 1 + Math.floor(l / 2) + player.bonusProjectiles;
    s.cooldown = 0.82 * Math.pow(0.955, l);
    s.pierce = Math.floor(l / 4);
    s.radius = 6 + l * 0.35;
    s.homing = 4.2 + l * 0.1;
  } else if (type === 'thorn') {
    s.damage = 10 + 3.2 * l;
    s.count = 2 + Math.floor(l / 2) + Math.floor(player.bonusProjectiles / 2);
    s.radius = (74 + 7 * l) * player.areaMul;
    s.speed = 2.3 + l * 0.05;
  } else if (type === 'scatter') {
    s.damage = 8 + 2.3 * l;
    s.count = 3 + Math.floor(l / 1.7) + player.bonusProjectiles;
    s.cooldown = 1.06 * Math.pow(0.958, l);
    s.spread = 0.5 + Math.min(0.4, l * 0.025);
    s.pierce = Math.floor(l / 5);
  } else if (type === 'chain') {
    s.damage = 12 + 4 * l;
    s.chains = 3 + Math.floor(l / 2) + player.chainHits;
    s.cooldown = 1.6 * Math.pow(0.952, l);
    s.range = 640 + l * 12;
  } else if (type === 'boomerang') {
    s.damage = 15 + 4.2 * l;
    s.count = 1 + Math.floor(l / 3) + Math.floor(player.bonusProjectiles / 2);
    s.cooldown = 1.45 * Math.pow(0.953, l);
    s.radius = 12 + l * 0.7;
  } else if (type === 'flame') {
    s.damage = 4 + 1.7 * l;
    s.radius = (92 + 8 * l) * player.areaMul;
    s.cooldown = Math.max(0.2, 0.42 * Math.pow(0.955, l));
  }

  s.damage *= player.damageMul;
  if (s.cooldown) s.cooldown = Math.max(0.1, s.cooldown / player.attackSpeed);
  return s;
}

export const PASSIVES = [
  { id: 'might', name: 'Might', icon: '⚔', tier: 1, max: 25, weight: 1.25, desc: '+15% damage', apply: p => { p.damageMul *= 1.15; } },
  { id: 'haste', name: 'Haste', icon: '⚡', tier: 1, max: 20, weight: 1.2, desc: '+10% attack speed', apply: p => { p.attackSpeed *= 1.1; } },
  { id: 'fleet', name: 'Fleet', icon: '➤', tier: 1, max: 14, weight: 1.1, desc: '+8% move speed', apply: p => { p.speedMul *= 1.08; } },
  { id: 'vitality', name: 'Vitality', icon: '✚', tier: 1, max: 20, weight: 1.05, desc: '+18 max HP and heal 18', apply: p => { p.maxHp += 18; p.hp = Math.min(p.maxHp, p.hp + 18); } },
  { id: 'magnet', name: 'Magnet', icon: '◎', tier: 1, max: 12, weight: 0.9, desc: '+20% pickup radius', apply: p => { p.pickupMul *= 1.2; } },
  { id: 'wisdom', name: 'Wisdom', icon: '◇', tier: 1, max: 12, weight: 0.95, desc: '+12% XP gain', apply: p => { p.xpMul *= 1.12; } },
  { id: 'precision', name: 'Precision', icon: '✧', tier: 2, max: 10, weight: 0.8, desc: '+6% crit chance', apply: p => { p.critChance += 0.06; } },
  { id: 'brutality', name: 'Brutality', icon: '✖', tier: 2, max: 8, weight: 0.7, desc: '+30% crit damage', apply: p => { p.critMult += 0.3; } },
  { id: 'area', name: 'Expansion', icon: '◉', tier: 2, max: 10, weight: 0.8, desc: '+12% area of effect', apply: p => { p.areaMul *= 1.12; } },
  { id: 'armor', name: 'Bulwark', icon: '▣', tier: 2, max: 10, weight: 0.75, desc: '+2 armor', apply: p => { p.armor += 2; } },
  { id: 'regen', name: 'Renewal', icon: '♻', tier: 2, max: 10, weight: 0.7, desc: '+0.6 HP per second', apply: p => { p.regen += 0.6; } },
  { id: 'luck', name: 'Fortune', icon: '♣', tier: 2, max: 10, weight: 0.7, desc: '+12% luck (better loot)', apply: p => { p.luck += 0.12; } },
  { id: 'projectile', name: 'Split Shot', icon: '⋔', tier: 3, max: 5, weight: 0.45, desc: '+1 projectile', apply: p => { p.bonusProjectiles += 1; } },
  { id: 'lifesteal', name: 'Sanguine', icon: '♥', tier: 3, max: 8, weight: 0.45, desc: '+0.6% lifesteal', apply: p => { p.lifesteal += 0.006; } },
  { id: 'ignite', name: 'Cinder', icon: '✹', tier: 3, max: 6, weight: 0.42, desc: '+12% chance to ignite', apply: p => { p.igniteChance += 0.12; } },
  { id: 'frost', name: 'Frostbite', icon: '❄', tier: 3, max: 6, weight: 0.4, desc: 'Attacks slow enemies', apply: p => { p.frost = Math.min(0.62, p.frost + 0.16); } },
  { id: 'nova', name: 'Nova Core', icon: '✺', tier: 3, max: 6, weight: 0.42, desc: '+12% chance for kills to explode', apply: p => { p.novaChance += 0.12; } },
  { id: 'static', name: 'Static', icon: '⌁', tier: 3, max: 6, weight: 0.4, desc: 'Hits can chain to +1 enemy', apply: p => { p.chainHits += 1; } },
  { id: 'windstep', name: 'Windstep', icon: '≫', tier: 4, max: 3, weight: 0.18, desc: 'Ability cooldown -15%', apply: p => { p.cooldownMul *= 0.85; } },
  { id: 'executioner', name: 'Executioner', icon: '☠', tier: 4, max: 4, weight: 0.18, desc: '+35% damage to wounded enemies', apply: p => { p.execute += 0.35; } }
];

export const RELIC_RARITIES = {
  common: { name: 'COMMON', color: '#b9c4d8', glow: 'rgba(185,196,216,.65)', weight: 60, tier: 1 },
  rare: { name: 'RARE', color: '#55b9ff', glow: 'rgba(85,185,255,.8)', weight: 26, tier: 2 },
  epic: { name: 'EPIC', color: '#c77dff', glow: 'rgba(199,125,255,.9)', weight: 10, tier: 3 },
  legendary: { name: 'LEGENDARY', color: '#ffc857', glow: 'rgba(255,200,87,.95)', weight: 3.2, tier: 4 }
};

export const RELICS = {
  common: [
    { id: 'c_fang', name: 'Cinder Fang', icon: '⚔', text: '+7% damage', apply: p => { p.damageMul *= 1.07; } },
    { id: 'c_step', name: 'Quickstep Charm', icon: '➤', text: '+5% move speed', apply: p => { p.speedMul *= 1.05; } },
    { id: 'c_iron', name: 'Iron Bead', icon: '▣', text: '+9 max HP', apply: p => { p.maxHp += 9; p.hp = Math.min(p.maxHp, p.hp + 9); } },
    { id: 'c_coin', name: 'Lucky Coin', icon: '♣', text: '+8% luck', apply: p => { p.luck += 0.08; } },
    { id: 'c_nail', name: "Scholar's Nail", icon: '◇', text: '+8% XP gain', apply: p => { p.xpMul *= 1.08; } },
    { id: 'c_eye', name: "Hunter's Eye", icon: '✧', text: '+3% crit chance', apply: p => { p.critChance += 0.03; } },
    { id: 'c_magnet', name: 'Tiny Magnet', icon: '◎', text: '+12% pickup radius', apply: p => { p.pickupMul *= 1.12; } },
    { id: 'c_spark', name: 'Static Bead', icon: '⌁', text: '+5% attack speed', apply: p => { p.attackSpeed *= 1.05; } }
  ],
  rare: [
    { id: 'r_amber', name: 'Blood Amber', icon: '⚔', text: '+13% damage', apply: p => { p.damageMul *= 1.13; } },
    { id: 'r_storm', name: 'Stormglass', icon: '⚡', text: '+10% attack speed', apply: p => { p.attackSpeed *= 1.1; } },
    { id: 'r_boots', name: 'Verdant Boots', icon: '➤', text: '+9% move speed', apply: p => { p.speedMul *= 1.09; } },
    { id: 'r_heart', name: 'Granite Heart', icon: '✚', text: '+22 max HP', apply: p => { p.maxHp += 22; p.hp = Math.min(p.maxHp, p.hp + 22); } },
    { id: 'r_sage', name: 'Sage Sigil', icon: '◇', text: '+15% XP gain', apply: p => { p.xpMul *= 1.15; } },
    { id: 'r_lens', name: 'Wide Lens', icon: '◉', text: '+15% area of effect', apply: p => { p.areaMul *= 1.15; } },
    { id: 'r_mail', name: 'Thorn Mail', icon: '▣', text: '+3 armor', apply: p => { p.armor += 3; } },
    { id: 'r_thorn', name: 'Vampire Thorn', icon: '♥', text: '+0.5% lifesteal', apply: p => { p.lifesteal += 0.005; } }
  ],
  epic: [
    { id: 'e_crown', name: 'Ruin Crown', icon: '⚔', text: '+22% damage', apply: p => { p.damageMul *= 1.22; } },
    { id: 'e_gear', name: 'Chrono Gear', icon: '⚡', text: '+18% attack speed', apply: p => { p.attackSpeed *= 1.18; } },
    { id: 'e_comet', name: 'Comet Boots', icon: '➤', text: '+15% move speed', apply: p => { p.speedMul *= 1.15; } },
    { id: 'e_titan', name: 'Titan Heart', icon: '✚', text: '+38 max HP', apply: p => { p.maxHp += 38; p.hp = Math.min(p.maxHp, p.hp + 38); } },
    { id: 'e_horizon', name: 'Event Horizon', icon: '◉', text: '+24% area of effect', apply: p => { p.areaMul *= 1.24; } },
    { id: 'e_dice', name: "Gambler's Dice", icon: '♣', text: '+18% luck', apply: p => { p.luck += 0.18; } },
    { id: 'e_serpent', name: 'Serpent Ring', icon: '✧', text: '+8% crit chance', apply: p => { p.critChance += 0.08; } },
    { id: 'e_growth', name: 'Regrowth', icon: '♻', text: '+1.2 HP per second', apply: p => { p.regen += 1.2; } }
  ],
  legendary: [
    { id: 'l_sunfire', name: 'Sunfire Core', icon: '✹', text: 'Attacks can ignite. Ignitions burn harder.', apply: p => { p.igniteChance += 0.28; p.igniteDamage += 5; } },
    { id: 'l_stormheart', name: 'Stormheart', icon: '⌁', text: 'Every 3.5s, call chain lightning.', apply: p => { p.stormLevel += 1; } },
    { id: 'l_void', name: 'Void Prism', icon: '✺', text: 'Kills can collapse into void explosions.', apply: p => { p.novaChance += 0.3; p.novaDamage += 12; } },
    { id: 'l_bloom', name: 'Eternal Bloom', icon: '♻', text: '+2.5 HP/s and +45 max HP.', apply: p => { p.regen += 2.5; p.maxHp += 45; p.hp = Math.min(p.maxHp, p.hp + 45); } },
    { id: 'l_twin', name: 'Twin Fang', icon: '⋔', text: '+1 projectile, forever.', apply: p => { p.bonusProjectiles += 1; } },
    { id: 'l_aegis', name: 'Aegis of Dawn', icon: '▣', text: '+55 max HP and +5 armor.', apply: p => { p.maxHp += 55; p.hp = Math.min(p.maxHp, p.hp + 55); p.armor += 5; } },
    { id: 'l_gold', name: 'Golden Hour', icon: '♣', text: '+35% luck and +25% XP gain.', apply: p => { p.luck += 0.35; p.xpMul *= 1.25; } },
    { id: 'l_gravity', name: 'Gravity Well', icon: '◎', text: 'Pickup radius doubled. Relics fly to you.', apply: p => { p.pickupMul *= 2; p.lootMagnet = true; } }
  ]
};

export const ENEMIES = {
  grunt: { id: 'grunt', name: 'Husk', hp: 15, speed: 74, radius: 14, damage: 9, xp: 1, color: '#ff5d73', accent: '#ffb3c0', tier: 1 },
  runner: { id: 'runner', name: 'Skitter', hp: 10, speed: 132, radius: 10, damage: 6, xp: 1, color: '#ff9f43', accent: '#ffe0a3', tier: 1 },
  tank: { id: 'tank', name: 'Golem', hp: 72, speed: 46, radius: 22, damage: 16, xp: 3, color: '#7f8ca8', accent: '#d4def0', tier: 2 },
  shooter: { id: 'shooter', name: 'Wisp', hp: 26, speed: 62, radius: 14, damage: 8, xp: 2, color: '#c77dff', accent: '#edd6ff', tier: 2, ranged: true },
  splitter: { id: 'splitter', name: 'Maw', hp: 38, speed: 68, radius: 17, damage: 10, xp: 2, color: '#6ee7a8', accent: '#c9ffe4', tier: 2, split: true },
  boss: { id: 'boss', name: 'Hollow King', hp: 1450, speed: 44, radius: 46, damage: 26, xp: 70, color: '#ffc857', accent: '#fff1b8', tier: 4, boss: true }
};

export const BOSS_NAMES = ['THE HOLLOW KING', 'MOTHER OF MOTHS', 'THE GILDED WORM', 'SAINT OF ASH', 'THE LAST CHOIR'];

export const WAVE_TITLES = [
  'THE HORDE STIRS',
  'TEETH IN THE DARK',
  'THEY SMELL BLOOD',
  'NOCTURNE',
  'THE GLOAM DEEPENS',
  'EVERYTHING HUNGERS',
  'A THOUSAND EYES',
  'THE NIGHT UNMAKES'
];
