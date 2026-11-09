import { hashString, todayKey } from './utils.js';

export const SAVE_KEY = 'boar-truffle-hunter-save-v1';

export const RARITY = {
  common: { label: 'Common', color: '#c9b28a', glow: '#e6d3a3', weight: 55 },
  uncommon: { label: 'Uncommon', color: '#86d3a0', glow: '#a9f4c2', weight: 28 },
  rare: { label: 'Rare', color: '#ffd15c', glow: '#ffe89b', weight: 12 },
  legendary: { label: 'Legendary', color: '#7dffdf', glow: '#b6fff0', weight: 5 },
};

export const TRUFFLES = [
  {
    id: 'black', name: 'Black Truffle', rarity: 'common', value: 9, xp: 16,
    color: '#5b412c', glow: '#d5b07a',
    lore: 'Wrinkled, dark and stubbornly hidden beneath oak roots. The forest\'s daily bread.',
  },
  {
    id: 'summer', name: 'Summer Truffle', rarity: 'common', value: 12, xp: 20,
    color: '#8d6a43', glow: '#e7c791',
    lore: 'Warm and nutty. Badgers will trade a whole afternoon of peace for one.',
  },
  {
    id: 'white', name: 'White Truffle', rarity: 'uncommon', value: 32, xp: 44,
    color: '#ded0ac', glow: '#fff2c8',
    lore: 'Pale as moonlight and twice as rare. Its perfume drifts farther than a boar can run.',
  },
  {
    id: 'golden', name: 'Golden Truffle', rarity: 'rare', value: 85, xp: 105,
    color: '#e9b83c', glow: '#ffdd72',
    lore: 'A lump of buried sunlight. The old boars say it grows where a shooting star fell.',
  },
  {
    id: 'heart', name: 'Heart of the Forest', rarity: 'legendary', value: 280, xp: 340,
    color: '#79e6c5', glow: '#a8ffe9',
    lore: 'The forest\'s own heartbeat, wrapped in root and soil. Only the truest nose finds it.',
  },
];

export const MUSHROOMS = [
  {
    id: 'mooncap', name: 'Mooncap', color: '#a8e5ff', glow: '#dff8ff',
    effect: 'heal', effectText: 'Restores 35 health', value: 18,
    lore: 'It only opens when the moon is watching.',
  },
  {
    id: 'embercap', name: 'Embercap', color: '#ff8a4a', glow: '#ffc078',
    effect: 'damage', effectText: '+25% damage for 45 seconds', value: 26,
    lore: 'Warm to the touch, even in the rain.',
  },
  {
    id: 'glowcap', name: 'Glowcap', color: '#c9a5ff', glow: '#e6d6ff',
    effect: 'smell', effectText: 'Scent range doubled for 45 seconds', value: 24,
    lore: 'Its spores remember every truffle they have ever touched.',
  },
  {
    id: 'bitterbolete', name: 'Bitter Bolete', color: '#c2a06c', glow: '#ead4a6',
    effect: 'stamina', effectText: 'Restores 60 stamina', value: 20,
    lore: 'Foul, chewy, and the reason boars can run all day.',
  },
  {
    id: 'ancientmorel', name: 'Ancient Morel', color: '#d8c17a', glow: '#fff0b0',
    effect: 'xp', effectText: 'Grants 120 experience', value: 55,
    lore: 'Older than the standing stones. It tastes of libraries and rain.',
  },
];

export const REGIONS = [
  {
    id: 'glade', name: 'Mosswood Glade', short: 'Mosswood', x: 0, z: 0, radius: 48,
    color: '#93b25e', desc: 'A soft green clearing where the first boars made their dens.',
    music: 'birds',
  },
  {
    id: 'fern', name: 'Fernhollow', short: 'Fernhollow', x: 56, z: 20, radius: 40,
    color: '#4f8f58', desc: 'A damp hollow choked with ferns, fox trails and chattering birds.',
    music: 'birds',
  },
  {
    id: 'elder', name: 'Elderwood', short: 'Elderwood', x: -55, z: -38, radius: 44,
    color: '#3f6e48', desc: 'Ancient trees stand shoulder to shoulder. Every root remembers something.',
    music: 'deep',
  },
  {
    id: 'ashen', name: 'Ashen Ridge', short: 'Ashen Ridge', x: -60, z: 65, radius: 42,
    color: '#a3764d', desc: 'Red-leafed slopes of stone and old bones. The bears claim this country.',
    music: 'wind',
  },
  {
    id: 'marsh', name: 'Moonlit Marsh', short: 'Moonlit Marsh', x: 65, z: -65, radius: 42,
    color: '#4f7b76', desc: 'Silver water, drowned ruins and fireflies that never quite sleep.',
    music: 'marsh',
  },
  {
    id: 'crystal', name: 'Crystal Hollow', short: 'Crystal Hollow', x: 2, z: -92, radius: 38,
    color: '#6d6b9c', desc: 'A cold hollow where crystals hum beneath the roots and the air tastes of stone.',
    music: 'deep',
  },
];

export const LANDMARKS = [
  {
    id: 'den', name: "The Old Den", x: 0, z: 13, radius: 9, region: 'glade',
    desc: 'Your family den. The embers never quite go out.', icon: 'den',
  },
  {
    id: 'fairy', name: 'Fairy Ring', x: -23, z: -17, radius: 8, region: 'glade',
    desc: 'A perfect circle of pale mushrooms. The air inside is oddly warm.', icon: 'mushroom', secret: true,
  },
  {
    id: 'stones', name: 'The Boar Stones', x: 25, z: 43, radius: 10, region: 'glade',
    desc: 'Weathered standing stones carved with the shapes of old boars.', icon: 'stone',
  },
  {
    id: 'elder', name: 'The Elder Tree', x: -57, z: -39, radius: 13, region: 'elder',
    desc: 'The oldest living thing in the valley. Its bark is warm.', icon: 'tree', secret: true,
  },
  {
    id: 'grotto', name: 'Crystal Grotto', x: 2, z: -94, radius: 11, region: 'crystal',
    desc: 'A hidden cave full of humming crystals and forgotten treasure.', icon: 'cave', secret: true,
  },
  {
    id: 'shrine', name: 'Sunken Shrine', x: 67, z: -73, radius: 11, region: 'marsh',
    desc: 'Broken columns rise from the marsh like the ribs of a drowned giant.', icon: 'ruin', secret: true,
  },
  {
    id: 'abandoned', name: 'Abandoned Den', x: 73, z: 35, radius: 9, region: 'fern',
    desc: 'An old badger sett, long empty. Something glints in the dark.', icon: 'den', secret: true,
  },
  {
    id: 'lair', name: "Old Gnarl's Lair", x: -62, z: 80, radius: 14, region: 'ashen',
    desc: 'Claw-marked stones and a carpet of bones. This is bear country.', icon: 'cave',
  },
  {
    id: 'lookout', name: 'The Windward Bluff', x: -4, z: -62, radius: 9, region: 'glade',
    desc: 'From here you can see the whole valley breathing.', icon: 'stone', secret: true,
  },
];

export const PATHS = [
  [[0, 5], [12, 2], [30, 8], [46, 17], [56, 20]],
  [[0, 5], [-14, -4], [-30, -14], [-44, -27], [-55, -38]],
  [[0, 5], [-16, 22], [-34, 38], [-50, 55], [-60, 65], [-62, 78]],
  [[0, 5], [17, -18], [36, -38], [53, -55], [65, -65]],
  [[0, 5], [2, -28], [2, -55], [2, -78], [2, -92]],
  [[0, 5], [18, 24], [25, 43]],
  [[0, 5], [32, 18], [52, 29], [73, 35]],
];

export const COSMETICS = [
  { id: 'moss_crown', name: 'Mossy Crown', icon: '❀', desc: 'A circlet of tiny forest flowers.' },
  { id: 'golden_tusks', name: 'Gilded Tusks', icon: '✦', desc: 'Tusks polished with real golden truffle oil.' },
  { id: 'moon_aura', name: 'Moonlit Aura', icon: '☾', desc: 'A soft aura of legendary spores.' },
  { id: 'forest_crown', name: 'Crown of the Forest', icon: '♛', desc: 'Won from Old Gnarl himself. Worn by the strongest boar.' },
  { id: 'spirit_paint', name: 'Spirit Paint', icon: '⟡', desc: 'Old boar war paint made from crushed berries.' },
];

export const SKILL_BRANCHES = [
  {
    id: 'strength', name: 'Strength', icon: 'tusk', color: '#d97b56',
    nodes: [
      { id: 'sharp_tusks', name: 'Honed Tusks', max: 3, cost: 1, desc: '+12% tusk damage per rank.', req: [] },
      { id: 'crushing_charge', name: 'Crushing Charge', max: 2, cost: 1, desc: '+18% charge damage and knockback per rank.', req: ['sharp_tusks'] },
      { id: 'bloodlust', name: 'Bloodlust', max: 2, cost: 1, desc: 'Heal 4 health for every enemy struck.', req: ['crushing_charge'] },
      { id: 'titan_charge', name: "Titan's Charge", max: 1, cost: 2, desc: 'Charges are wider and travel farther.', req: ['crushing_charge'], level: 8 },
    ],
  },
  {
    id: 'endurance', name: 'Endurance', icon: 'shield', color: '#8eac63',
    nodes: [
      { id: 'thick_hide', name: 'Thick Hide', max: 4, cost: 1, desc: '+14 maximum health per rank.', req: [] },
      { id: 'iron_lungs', name: 'Iron Lungs', max: 3, cost: 1, desc: '+16 maximum stamina per rank.', req: [] },
      { id: 'pain_resist', name: 'Pain Resistance', max: 3, cost: 1, desc: '-6% damage taken per rank.', req: ['thick_hide'] },
      { id: 'second_wind', name: 'Second Wind', max: 1, cost: 2, desc: 'Heal 30% when health falls below 20%. Once a minute.', req: ['pain_resist'], level: 7 },
    ],
  },
  {
    id: 'speed', name: 'Speed', icon: 'wind', color: '#7fc0b4',
    nodes: [
      { id: 'fleet_hooves', name: 'Fleet Hooves', max: 3, cost: 1, desc: '+5% movement speed per rank.', req: [] },
      { id: 'quick_breath', name: 'Quick Breath', max: 3, cost: 1, desc: '+20% stamina regeneration per rank.', req: [] },
      { id: 'nimble', name: 'Nimble Leap', max: 1, cost: 1, desc: 'Jumping briefly dodges all damage.', req: ['fleet_hooves'] },
      { id: 'momentum', name: 'Momentum', max: 1, cost: 2, desc: 'Gain a burst of speed after a charge.', req: ['nimble'], level: 6 },
    ],
  },
  {
    id: 'smell', name: 'Smell & Hunting', icon: 'nose', color: '#c8a85e',
    nodes: [
      { id: 'keen_nose', name: 'Keen Nose', max: 3, cost: 1, desc: '+20% scent radius per rank.', req: [] },
      { id: 'swift_paws', name: 'Swift Paws', max: 3, cost: 1, desc: '+20% digging speed per rank.', req: [] },
      { id: 'rare_sense', name: 'Rare Sense', max: 2, cost: 1, desc: '+12% chance to find rare truffles.', req: ['keen_nose'] },
      { id: 'treasure_sense', name: 'Treasure Sense', max: 1, cost: 2, desc: 'Chests and secrets appear on your map.', req: ['rare_sense'], level: 5 },
    ],
  },
  {
    id: 'abilities', name: 'Primal Arts', icon: 'flame', color: '#b48ad6',
    nodes: [
      { id: 'stomp', name: 'Ground Stomp', max: 1, cost: 1, desc: 'Unlock Q: a shockwave that knocks enemies back.', req: [], level: 2 },
      { id: 'guard', name: 'Tusk Guard', max: 1, cost: 1, desc: 'Unlock E: brace behind your tusks to reduce damage.', req: ['stomp'] },
      { id: 'rush', name: 'Battle Rush', max: 1, cost: 1, desc: 'Unlock R: a short burst of incredible speed.', req: ['stomp'], level: 4 },
      { id: 'rage', name: 'Primal Rage', max: 1, cost: 2, desc: 'Unlock F: unleash the fury of the forest.', req: ['rush'], level: 6 },
      { id: 'stomp_master', name: 'Earthshaker', max: 2, cost: 1, desc: '+35% stomp damage and radius per rank.', req: ['stomp'] },
      { id: 'guard_master', name: 'Iron Bristles', max: 1, cost: 1, desc: 'Guarding reflects damage back at attackers.', req: ['guard'] },
      { id: 'rage_master', name: 'Endless Fury', max: 1, cost: 2, desc: '+3 seconds of rage duration.', req: ['rage'] },
    ],
  },
];

export const ALL_SKILLS = SKILL_BRANCHES.flatMap((b) => b.nodes.map((n) => ({ ...n, branch: b.id })));
export const SKILL_MAP = Object.fromEntries(ALL_SKILLS.map((n) => [n.id, n]));

export const QUESTS = [
  {
    id: 'first_feast', name: 'A Taste of the Forest', giver: 'Old Root, the den elder',
    desc: 'The den stores are empty. Dig up three truffles so the family can eat tonight.',
    objectives: [{ type: 'truffles', count: 3, label: 'Truffles dug' }],
    reward: { xp: 90, coins: 60, berries: 3 }, auto: true,
  },
  {
    id: 'wolf_trouble', name: 'Teeth in the Ferns', giver: 'Old Root, the den elder',
    desc: 'Wolves have been circling the glade. Drive three of them away.',
    objectives: [{ type: 'enemies', count: 3, label: 'Wolves defeated', filter: 'wolf' }],
    reward: { xp: 180, coins: 100, berries: 2 }, requires: ['first_feast'],
  },
  {
    id: 'golden_gleam', name: 'The Golden Gleam', giver: 'A gossipy jay',
    desc: 'A jay swears it saw buried sunlight near the Elder Tree. Find a Golden Truffle.',
    objectives: [{ type: 'rarity', count: 1, label: 'Golden Truffle found', filter: 'golden' }],
    reward: { xp: 300, coins: 200, cosmetic: 'golden_tusks' }, requires: ['wolf_trouble'],
  },
  {
    id: 'elder_secrets', name: 'Whispers of Elderwood', giver: 'The wind through old branches',
    desc: 'Two old places call to you: the Elder Tree and the Crystal Grotto.',
    objectives: [{ type: 'landmarks', count: 2, label: 'Secrets discovered', ids: ['elder', 'grotto'] }],
    reward: { xp: 380, coins: 180, berries: 4 }, requires: ['first_feast'],
  },
  {
    id: 'bear_king', name: 'The Old Gnarl', giver: 'Every frightened creature in the valley',
    desc: 'A scarred bear rules Ashen Ridge. End his reign and become the forest\'s strongest boar.',
    objectives: [{ type: 'boss', count: 1, label: 'Old Gnarl defeated' }],
    reward: { xp: 900, coins: 700, cosmetic: 'forest_crown' }, requires: ['golden_gleam', 'elder_secrets'], level: 7,
  },
  {
    id: 'mushroom_scholar', name: 'Fungi Scholar', giver: 'A very small owl',
    desc: 'Collect all five kinds of special mushrooms for the owl\'s field journal.',
    objectives: [{ type: 'mushroomsAll', count: 5, label: 'Mushroom species collected' }],
    reward: { xp: 260, coins: 140, cosmetic: 'moss_crown' }, auto: true,
  },
  {
    id: 'sunken_shrine', name: 'The Sunken Shrine', giver: 'A drowned bell',
    desc: 'Find the Sunken Shrine in Moonlit Marsh and open the chest at its heart.',
    objectives: [{ type: 'landmarks', count: 1, label: 'Shrine discovered', ids: ['shrine'] }, { type: 'chests', count: 1, label: 'Shrine chest opened', ids: ['shrine'] }],
    reward: { xp: 320, coins: 220 }, requires: ['first_feast'],
  },
  {
    id: 'wanderer', name: 'The Wanderer', giver: 'Your own restless hooves',
    desc: 'Set hoof in all six regions of the forest.',
    objectives: [{ type: 'regions', count: 6, label: 'Regions discovered' }],
    reward: { xp: 600, coins: 350, cosmetic: 'spirit_paint' }, auto: true,
  },
  {
    id: 'treasure_hunter', name: 'Roots and Riches', giver: 'A tarnished old key',
    desc: 'Open five hidden chests scattered across the valley.',
    objectives: [{ type: 'chests', count: 5, label: 'Chests opened' }],
    reward: { xp: 340, coins: 260, berries: 3 }, auto: true,
  },
];

export const ACHIEVEMENTS = [
  { id: 'first_truffle', name: 'First Find', desc: 'Dig up your very first truffle.', metric: 'truffles', target: 1, icon: 'truffle', reward: { xp: 50, coins: 25 } },
  { id: 'collector_10', name: 'Truffle Gatherer', desc: 'Dig up 10 truffles.', metric: 'truffles', target: 10, icon: 'truffle', reward: { xp: 120, coins: 60, cosmetic: 'moss_crown' } },
  { id: 'collector_100', name: 'The Hundredth Root', desc: 'Dig up 100 truffles.', metric: 'truffles', target: 100, icon: 'truffle', reward: { xp: 800, coins: 500, cosmetic: 'spirit_paint' } },
  { id: 'golden_first', name: 'A Gleam of Gold', desc: 'Find your first Golden Truffle.', metric: 'golden', target: 1, icon: 'star', reward: { xp: 160, coins: 120 } },
  { id: 'legendary_first', name: 'Heartfinder', desc: 'Find the legendary Heart of the Forest.', metric: 'legendary', target: 1, icon: 'heart', reward: { xp: 500, coins: 400, cosmetic: 'moon_aura' } },
  { id: 'slayer_10', name: 'Thick Skinned', desc: 'Defeat 10 forest enemies.', metric: 'enemies', target: 10, icon: 'tusk', reward: { xp: 180, coins: 100 } },
  { id: 'slayer_50', name: 'The Forest Remembers', desc: 'Defeat 50 forest enemies.', metric: 'enemies', target: 50, icon: 'tusk', reward: { xp: 700, coins: 450 } },
  { id: 'boss_bear', name: 'The Old Gnarl Falls', desc: 'Defeat the legendary bear of Ashen Ridge.', metric: 'bosses', target: 1, icon: 'crown', reward: { xp: 900, coins: 600, cosmetic: 'forest_crown' } },
  { id: 'explorer_regions', name: 'Every Corner', desc: 'Discover all six forest regions.', metric: 'regions', target: 6, icon: 'map', reward: { xp: 450, coins: 300 } },
  { id: 'explorer_landmarks', name: 'Secret Keeper', desc: 'Discover every hidden landmark.', metric: 'landmarks', target: 9, icon: 'map', reward: { xp: 500, coins: 350, cosmetic: 'moon_aura' } },
  { id: 'level_10', name: 'Rising Tusks', desc: 'Reach level 10.', metric: 'level', target: 10, icon: 'level', reward: { xp: 0, coins: 250 } },
  { id: 'level_20', name: 'Strongest Boar', desc: 'Reach level 20.', metric: 'level', target: 20, icon: 'crown', reward: { xp: 0, coins: 1000, cosmetic: 'forest_crown' } },
  { id: 'mushroom_all', name: 'Fungi Friends', desc: 'Collect every type of mushroom.', metric: 'mushroomsAll', target: 5, icon: 'mushroom', reward: { xp: 300, coins: 150 } },
  { id: 'chest_5', name: 'Chestnut Collector', desc: 'Open 5 hidden chests.', metric: 'chests', target: 5, icon: 'chest', reward: { xp: 240, coins: 180 } },
  { id: 'acorn_10', name: 'Acorn Hoarder', desc: 'Collect 10 ancient acorns.', metric: 'collectibles', target: 10, icon: 'acorn', reward: { xp: 220, coins: 160 } },
  { id: 'daily_3', name: 'A Good Day', desc: 'Complete 3 daily challenges.', metric: 'dailies', target: 3, icon: 'sun', reward: { xp: 300, coins: 200 } },
];

export const DAILY_TEMPLATES = [
  { id: 'dig5', name: 'Root Around', desc: 'Dig up 5 truffles.', metric: 'truffles', target: 5, reward: { xp: 120, coins: 70 } },
  { id: 'hunt3', name: 'Keep the Trails Safe', desc: 'Defeat 3 forest enemies.', metric: 'enemies', target: 3, reward: { xp: 130, coins: 80 } },
  { id: 'rare1', name: 'A Fine Nose', desc: 'Dig up an uncommon or better truffle.', metric: 'rareTruffle', target: 1, reward: { xp: 100, coins: 60 } },
  { id: 'mush2', name: 'Fungi Foray', desc: 'Collect 2 special mushrooms.', metric: 'mushrooms', target: 2, reward: { xp: 110, coins: 65 } },
  { id: 'chest1', name: 'A Lid Worth Lifting', desc: 'Open a hidden chest.', metric: 'chests', target: 1, reward: { xp: 140, coins: 90 } },
  { id: 'landmark1', name: 'Off the Beaten Path', desc: 'Discover a landmark.', metric: 'landmarks', target: 1, reward: { xp: 120, coins: 70 } },
  { id: 'charge5', name: 'Full Tilt', desc: 'Land 5 charge attacks.', metric: 'charges', target: 5, reward: { xp: 110, coins: 75 } },
];

export function getDailyChallenges() {
  const key = todayKey();
  const seed = hashString('boar-' + key);
  let s = seed;
  const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pool = [...DAILY_TEMPLATES];
  const picks = [];
  while (picks.length < 3 && pool.length) {
    picks.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  }
  return { date: key, challenges: picks.map((c) => ({ ...c, progress: 0, complete: false, claimed: false })) };
}

export function xpForLevel(level) {
  return Math.floor(70 + level * 38 + level * level * 2.8);
}

export function levelFromXp(totalXp) {
  let level = 1;
  let remaining = totalXp;
  while (level < 40 && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, remaining, needed: xpForLevel(level) };
}

export function enemyStats(type) {
  switch (type) {
    case 'wolf': return { name: 'Grey Wolf', hp: 52, damage: 9, speed: 4.9, radius: 0.65, aggro: 23, attackRange: 2.6, windup: 0.5, xp: 38, coins: 12, scale: 1 };
    case 'fox': return { name: 'Red Fox', hp: 36, damage: 7, speed: 5.7, radius: 0.5, aggro: 19, attackRange: 2.2, windup: 0.36, xp: 28, coins: 9, scale: 0.82 };
    case 'dog': return { name: 'Wild Dog', hp: 64, damage: 11, speed: 5.0, radius: 0.62, aggro: 22, attackRange: 2.5, windup: 0.46, xp: 46, coins: 15, scale: 1 };
    case 'boar': return { name: 'Rival Boar', hp: 105, damage: 15, speed: 4.3, radius: 0.95, aggro: 18, attackRange: 2.9, windup: 0.62, xp: 75, coins: 28, scale: 1.2 };
    case 'bear': return { name: 'Old Gnarl', hp: 620, damage: 24, speed: 4.0, radius: 1.65, aggro: 30, attackRange: 3.8, windup: 0.75, xp: 650, coins: 450, scale: 2.1, boss: true };
    default: return { name: 'Creature', hp: 40, damage: 8, speed: 4, radius: 0.6, aggro: 20, attackRange: 2.4, windup: 0.5, xp: 25, coins: 8, scale: 1 };
  }
}

export const ENEMY_SPAWNS = [
  { type: 'wolf', x: -48, z: 22, pack: 3 },
  { type: 'wolf', x: 44, z: -42, pack: 3 },
  { type: 'wolf', x: 20, z: -66, pack: 3 },
  { type: 'fox', x: 38, z: 16, pack: 2 },
  { type: 'fox', x: -18, z: -40, pack: 2 },
  { type: 'dog', x: -27, z: 30, pack: 2 },
  { type: 'dog', x: 60, z: -22, pack: 2 },
  { type: 'boar', x: 30, z: -8, pack: 1 },
  { type: 'boar', x: -35, z: -28, pack: 1 },
  { type: 'boar', x: 52, z: 42, pack: 1 },
  { type: 'wolf', x: 82, z: -55, pack: 2 },
  { type: 'fox', x: -52, z: 54, pack: 2 },
  { type: 'bear', x: -62, z: 80, pack: 1 },
];

export const CHEST_SPOTS = [
  { id: 'den', x: 4.5, z: 16.5, hidden: false },
  { id: 'fairy', x: -23, z: -17, hidden: true },
  { id: 'stones', x: 27, z: 45, hidden: false },
  { id: 'elder', x: -54, z: -42, hidden: false },
  { id: 'grotto', x: 2, z: -97, hidden: true },
  { id: 'shrine', x: 67, z: -73, hidden: true },
  { id: 'abandoned', x: 73, z: 35, hidden: true },
  { id: 'bluff', x: -4, z: -62, hidden: true },
  { id: 'marsh', x: 55, z: -78, hidden: true },
];

export const COLLECTIBLE_SPOTS = [
  [-9, 12], [12, 18], [-31, -6], [18, 32], [40, 8], [52, 34], [70, 18], [62, -12],
  [-20, 52], [-40, 58], [-67, 45], [-76, 72], [-46, -18], [-66, -52], [-32, -58],
  [14, -32], [26, -56], [44, -66], [78, -62], [58, -86], [-8, -82], [18, -88], [34, -95], [-22, -72],
];
