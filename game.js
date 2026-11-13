(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'graffiti-workshop-v2';
  const MAX_TOOLS = 12;
  const MAX_ARTISTS = 6;
  const REWARD = 15;
  const toolNames = { ru: ['Карандаш', 'Скетч-маркер', 'Краска-маркер', 'Баллончик', 'Профи-спрей', 'Арт-кейс'], en: ['Pencil', 'Sketch marker', 'Paint marker', 'Spray can', 'Pro spray', 'Art case'] };
  const toolColors = ['#d58c45', '#50879a', '#d06450', '#7b9b57', '#d0a741', '#a56b9a'];
  const pixelAssets = { alley: new Image(), sprites: new Image() };
  pixelAssets.alley.src = 'assets/pixel/alley.png';
  pixelAssets.sprites.src = 'assets/pixel/sprites.png';
  pixelAssets.alley.onload = () => renderCanvas();
  const muralColors = ['#f26e4f', '#e7c84e', '#53b9b3', '#d375b0', '#e8e4d4', '#78a9e3'];
  const names = { ru: ['Лиса', 'Шум', 'Клякс', 'Рэй', 'Искра', 'Мико'], en: ['Fox', 'Noise', 'Splat', 'Ray', 'Spark', 'Miko'] };
  const words = { ru: ['ЖАР', 'ШУМ', 'МИР', 'БИТ', 'СЛЕД', 'ИСКРА', 'ДВОР', 'РИТМ', 'ВОЛЯ', 'СВЕТ', 'КОТ', 'ДРАЙВ'], en: ['HEAT', 'NOISE', 'PEACE', 'BEAT', 'TRACE', 'SPARK', 'YARD', 'RHYTHM', 'SOUL', 'GLOW', 'CREW', 'VIBE'] };
  const tr = {
    ru: { district: 'РАБОЧАЯ ЗОНА ·', place: 'Старая промзона', wall: 'СТЕНА', coins: 'МОНЕТЫ', upgrades: 'УЛУЧШЕНИЯ', crewKick: 'ТВОЯ КОМАНДА', crew: 'Мастера', crewNote: 'Выбери инструмент, затем мастера, чтобы начать рисунок.', master: 'МАСТЕР', masters: 'МАСТЕРА', supplies: 'Краски и инструменты', inventory: 'ИНВЕНТАРЬ', merge: 'Выбери два одинаковых инструмента, чтобы объединить их.', tip: 'Выбери инструмент и назначь мастера на стену.', alive: 'СТЕНА ОЖИВАЕТ', painting: 'МАСТЕРА РИСУЮТ', idle: 'ЖДУТ МАТЕРИАЛЫ', waiting: 'СВОБОДЕН', busy: 'РИСУЕТ', finished: 'ГОТОВО', supply: 'НОВАЯ ПОСТАВКА', in: 'через', seconds: 'сек.', save: 'АВТОСОХРАНЕНИЕ ВКЛЮЧЕНО', saved: 'СОХРАНЕНО', hire: 'Расширить команду', hireDescription: 'Нанять ещё одного мастера', reward: 'НАГРАДА', each: 'ЗА РИСУНОК', upgradesTitle: 'Улучшения', kicker: 'РАЗВИВАЙ МАСТЕРСКУЮ', foot: 'Каждый готовый мурал приносит ровно 15 монет.', speed: 'Быстрая рука', speedDesc: 'Мастера рисуют быстрее.', delivery: 'Частые поставки', deliveryDesc: 'Инструменты появляются чаще.', hireUpgrade: 'Новый мастер', hireDesc: 'Добавить мастера в команду.', max: 'МАКС.', buy: 'УЛУЧШИТЬ', clear: 'Сбросить прогресс', confirmClear: 'Удалить весь прогресс мастерской? Это действие нельзя отменить.', cleared: 'Прогресс сброшен.', needCoins: 'Не хватает монет.', mergeOk: 'Инструменты объединены!', maxTool: 'Инструмент уже максимального уровня.', full: 'Инвентарь заполнен.', hired: 'Новый мастер в команде!', speedUp: 'Мастера стали быстрее!', supplyUp: 'Поставки ускорены!', toolAdded: 'Новый инструмент поступил!', assigned: 'Мастер приступил к работе!', completed: 'Рисунок готов · +15 ¢', choose: 'Сначала выбери инструмент.', unavailable: 'Этот мастер занят.', progress: 'ХОД РАБОТЫ', level: 'УРОВЕНЬ', modalClose: 'Закрыть', capacity: '/ 12', working: 'РАБОТАЕТ', selectTool: 'ИНСТРУМЕНТ ВЫБРАН', selected: 'ВЫБРАНО', toolLevel: 'УРОВЕНЬ' },
    en: { district: 'WORK ZONE ·', place: 'Old Industrial Yard', wall: 'WALL', coins: 'COINS', upgrades: 'UPGRADES', crewKick: 'YOUR CREW', crew: 'Artists', crewNote: 'Choose a tool, then an artist to start a piece.', master: 'ARTIST', masters: 'ARTISTS', supplies: 'Paint & tools', inventory: 'INVENTORY', merge: 'Select two matching tools to merge them.', tip: 'Choose a tool and assign an artist to the wall.', alive: 'WALL IN PROGRESS', painting: 'ARTISTS AT WORK', idle: 'WAITING FOR SUPPLIES', waiting: 'AVAILABLE', busy: 'PAINTING', finished: 'DONE', supply: 'NEXT SUPPLY', in: 'in', seconds: 'sec.', save: 'AUTOSAVE ENABLED', saved: 'SAVED', hire: 'Expand the crew', hireDescription: 'Hire another artist', reward: 'REWARD', each: 'PER ARTWORK', upgradesTitle: 'Upgrades', kicker: 'GROW YOUR WORKSHOP', foot: 'Every finished mural earns exactly 15 coins.', speed: 'Quick hands', speedDesc: 'Artists finish their paintings faster.', delivery: 'Frequent drops', deliveryDesc: 'Tools arrive more often.', hireUpgrade: 'New artist', hireDesc: 'Add an artist to your crew.', max: 'MAX', buy: 'UPGRADE', clear: 'Reset progress', confirmClear: 'Delete all workshop progress? This cannot be undone.', cleared: 'Progress reset.', needCoins: 'Not enough coins.', mergeOk: 'Tools merged!', maxTool: 'That tool is already at max level.', full: 'Inventory is full.', hired: 'A new artist joined the crew!', speedUp: 'Artists are working faster!', supplyUp: 'Supplies arrive faster!', toolAdded: 'Fresh tool delivered!', assigned: 'Artist started painting!', completed: 'Artwork finished · +15 ¢', choose: 'Choose a tool first.', unavailable: 'This artist is busy.', progress: 'ART PROGRESS', level: 'LEVEL', modalClose: 'Close', capacity: '/ 12', working: 'WORKING', selectTool: 'TOOL SELECTED', selected: 'SELECTED', toolLevel: 'LEVEL' }
  };
  const freshState = () => ({ version: 2, coins: 35, items: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], artists: 1, speed: 1, supply: 1, jobs: [], murals: [], drawings: 0, nextSupplyAt: Date.now() + 10000, language: 'ru' });
  let state;
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    state = saved && saved.version === 2 ? { ...freshState(), ...saved } : freshState();
  } catch { state = freshState(); }
  state.coins = Math.max(0, Math.floor(Number(state.coins) || 0));
  state.artists = Math.max(1, Math.min(MAX_ARTISTS, Math.floor(Number(state.artists) || 1)));
  state.speed = Math.max(1, Math.min(8, Math.floor(Number(state.speed) || 1)));
  state.supply = Math.max(1, Math.min(6, Math.floor(Number(state.supply) || 1)));
  state.items = Array.from({ length: MAX_TOOLS }, (_, i) => Math.max(0, Math.min(6, Math.floor(Number(state.items?.[i]) || 0))));
  state.jobs = Array.from({ length: state.artists }, (_, i) => {
    const j = state.jobs?.[i];
    return j && Number.isFinite(j.started) && Number.isFinite(j.duration) ? { started: j.started, duration: Math.max(5000, j.duration), level: Math.max(1, Math.min(6, j.level | 0)), color: muralColors.includes(j.color) ? j.color : muralColors[i % muralColors.length], word: typeof j.word === 'string' ? j.word : words.ru[i % words.ru.length], seed: Number(j.seed) || Math.random(), artist: i } : null;
  });
  state.murals = Array.isArray(state.murals) ? state.murals.slice(-12).map((m, i) => ({ word: typeof m.word === 'string' ? m.word : words.ru[i % 12], color: muralColors.includes(m.color) ? m.color : muralColors[i % muralColors.length], seed: Number(m.seed) || i + 1 })) : [];
  state.language = state.language === 'en' ? 'en' : 'ru';
  let selectedTool = -1;
  let toastTimer = 0;
  let lastFrame = performance.now();
  let ctx;
  const canvas = $('wall');
  const canvasCtx = canvas.getContext('2d');
  const overlay = $('upgrade-overlay');
  const t = () => tr[state.language];
  const price = type => type === 'hire' ? Math.round(75 * Math.pow(1.75, state.artists - 1)) : type === 'speed' ? Math.round(55 * Math.pow(1.7, state.speed - 1)) : Math.round(60 * Math.pow(1.75, state.supply - 1));
  const durationFor = level => Math.max(8500, 26000 / (1 + (state.speed - 1) * .28) / (1 + (level - 1) * .08));
  const inventoryCount = () => state.items.filter(Boolean).length;
  const fmt = n => Math.floor(n).toLocaleString(state.language === 'ru' ? 'ru-RU' : 'en-US');
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); $('save-indicator').textContent = t().saved; }
    catch { $('save-indicator').textContent = '—'; }
  }
  function notify(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function startJob(index, toolIndex) {
    if (!state.items[toolIndex]) return;
    if (state.jobs[index]) { notify(t().unavailable); return; }
    const level = state.items[toolIndex];
    state.items[toolIndex] = 0; selectedTool = -1;
    state.jobs[index] = { started: Date.now(), duration: durationFor(level), level, color: muralColors[Math.floor(Math.random() * muralColors.length)], word: words[state.language][Math.floor(Math.random() * words[state.language].length)], seed: Math.random(), artist: index };
    notify(t().assigned); save(); render();
  }
  function mergeTools(from, to) {
    if (from === to || !state.items[from] || !state.items[to]) return false;
    if (state.items[from] !== state.items[to]) { selectedTool = to; render(); return false; }
    if (state.items[to] >= 6) { notify(t().maxTool); return false; }
    state.items[to]++; state.items[from] = 0; selectedTool = -1;
    notify(t().mergeOk); save(); render(); return true;
  }
  function render() {
    const lang = state.language; const trn = t();
    document.documentElement.lang = lang;
    $('coins').textContent = fmt(state.coins); $('coins-label').textContent = trn.coins;
    $('district-label').textContent = `${trn.district} 01`; $('district-name').textContent = trn.place;
    $('wall-label').textContent = `${trn.wall} ${Math.min(6, 1 + Math.floor(state.drawings / 5))}`;
    $('upgrade-label').textContent = trn.upgrades; $('crew-kicker').textContent = trn.crewKick;
    $('crew-title').textContent = trn.crew; $('crew-note').textContent = trn.crewNote;
    $('crew-unit').textContent = state.artists === 1 ? trn.master : trn.masters;
    $('supplies-kicker').textContent = trn.inventory; $('supplies-title').textContent = trn.supplies;
    $('merge-note').textContent = selectedTool >= 0 ? `${trn.selected}: ${toolNames[lang][state.items[selectedTool] - 1]} · ${trn.toolLevel} ${state.items[selectedTool]}` : trn.merge;
    $('wall-tip').textContent = selectedTool >= 0 ? trn.selectTool : trn.tip;
    $('wall-status').textContent = state.jobs.some(Boolean) ? trn.painting : trn.alive;
    $('active-count').textContent = `${state.jobs.filter(Boolean).length} ${trn.working}`;
    $('artist-count').textContent = state.artists; $('inventory-count').textContent = inventoryCount(); $('inventory-cap').textContent = trn.capacity;
    $('crew-list').innerHTML = Array.from({ length: state.artists }, (_, i) => `<button type="button" class="crew-card${state.jobs[i] ? ' busy' : ''}${!state.jobs[i] && selectedTool >= 0 ? ' selected-target' : ''}" data-artist="${i}" aria-label="${names[lang][i]}: ${state.jobs[i] ? trn.busy : trn.waiting}"><span class="crew-avatar" aria-hidden="true"></span><span class="crew-name">${names[lang][i]}</span><span class="crew-state">${state.jobs[i] ? trn.busy : trn.waiting}</span></button>`).join('');
    $('crew-list').querySelectorAll('[data-artist]').forEach(button => button.addEventListener('click', () => { if (selectedTool < 0) { notify(trn.choose); return; } startJob(Number(button.dataset.artist), selectedTool); }));
    $('inventory-grid').innerHTML = state.items.map((level, i) => level ? `<button type="button" class="tool-cell${selectedTool === i ? ' selected' : ''}" data-tool="${i}" style="--tool-color:${toolColors[level - 1]}" aria-label="${toolNames[lang][level - 1]}, ${trn.toolLevel} ${level}"><span class="tool-art" aria-hidden="true"></span><span class="tool-level">${level}</span></button>` : `<div class="tool-cell empty" aria-hidden="true"></div>`).join('');
    $('inventory-grid').querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', event => { const index = Number(event.currentTarget.dataset.tool); if (selectedTool < 0) { selectedTool = index; render(); return; } if (selectedTool === index) { selectedTool = -1; render(); return; } if (!mergeTools(selectedTool, index)) { if (state.items[selectedTool] !== state.items[index]) notify(trn.merge); } }));
    $('hire-title').textContent = trn.hire; $('hire-description').textContent = trn.hireDescription;
    $('hire-cost').textContent = fmt(price('hire')); $('hire-quick').disabled = state.artists >= MAX_ARTISTS || state.coins < price('hire');
    $('hire-quick').onclick = () => purchase('hire');
    $('language').textContent = lang.toUpperCase(); $('language').setAttribute('aria-label', lang === 'ru' ? 'Switch language' : 'Сменить язык');
    $('upgrade-kicker').textContent = trn.kicker; $('upgrade-title').textContent = trn.upgradesTitle; $('upgrade-footnote').textContent = trn.foot;
    $('clear-progress').textContent = trn.clear;
    renderUpgrades(); renderProgress();
  }
  function renderUpgrades() {
    const options = [
      { id: 'hire', icon: '+', title: t().hireUpgrade, desc: t().hireDesc, level: state.artists, max: state.artists >= MAX_ARTISTS },
      { id: 'speed', icon: '↯', title: t().speed, desc: t().speedDesc, level: state.speed, max: state.speed >= 8 },
      { id: 'supply', icon: '↻', title: t().delivery, desc: t().deliveryDesc, level: state.supply, max: state.supply >= 6 }
    ];
    $('upgrade-list').innerHTML = options.map(item => `<div class="upgrade-row"><span class="upgrade-symbol">${item.icon}</span><span class="upgrade-copy"><b>${item.title} · ${item.level}</b><small>${item.desc}</small></span><button class="buy-button" data-buy="${item.id}" ${item.max || state.coins < price(item.id) ? 'disabled' : ''}>${item.max ? t().max : `${t().buy}<span>¢ ${fmt(price(item.id))}</span>`}</button></div>`).join('');
    $('upgrade-list').querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => purchase(button.dataset.buy)));
  }
  function renderProgress() {
    const jobs = state.jobs.map((job, i) => job ? { job, i } : null).filter(Boolean);
    $('artist-progress').innerHTML = jobs.length ? jobs.map(({ job, i }) => { const pct = Math.min(100, Math.floor((Date.now() - job.started) / job.duration * 100)); return `<div class="progress-card"><div class="progress-card-top"><span>${names[state.language][i]} · ${t().progress}</span><span>${pct}%</span></div><div class="progress-track"><i style="width:${pct}%"></i></div></div>`; }).join('') : `<div class="empty-progress">${t().tip}</div>`;
  }
  function purchase(type) {
    const cost = price(type);
    if (state.coins < cost) { notify(t().needCoins); return; }
    if ((type === 'hire' && state.artists >= MAX_ARTISTS) || (type === 'speed' && state.speed >= 8) || (type === 'supply' && state.supply >= 6)) return;
    state.coins -= cost;
    if (type === 'hire') { state.artists++; state.jobs.push(null); notify(t().hired); }
    if (type === 'speed') { state.speed++; notify(t().speedUp); }
    if (type === 'supply') { state.supply++; state.nextSupplyAt = Math.min(state.nextSupplyAt, Date.now() + 3000); notify(t().supplyUp); }
    save(); render();
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r); context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r); context.closePath();
  }
  function drawBackdrop(w, h) {
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#66736b'); gradient.addColorStop(.4, '#414a44'); gradient.addColorStop(1, '#222a27');
    canvasCtx.fillStyle = gradient; canvasCtx.fillRect(0, 0, w, h);
    if (pixelAssets.alley?.complete && pixelAssets.alley.naturalWidth) {
      canvasCtx.globalAlpha = .82; canvasCtx.imageSmoothingEnabled = false;
      canvasCtx.drawImage(pixelAssets.alley, 0, 0, w, h * .84); canvasCtx.globalAlpha = 1;
    }
    // Foreground pavement and subtle workshop lighting.
    canvasCtx.fillStyle = '#242b29'; canvasCtx.fillRect(0, h * .84, w, h * .16);
    canvasCtx.fillStyle = '#78877a18'; canvasCtx.fillRect(0, h * .82, w, 2);
    const glow = canvasCtx.createRadialGradient(w * .5, h * .35, 4, w * .5, h * .35, w * .65);
    glow.addColorStop(0, '#c6f36a10'); glow.addColorStop(1, '#10141335');
    canvasCtx.fillStyle = glow; canvasCtx.fillRect(0, 0, w, h);
  }
  function paintMural(mural, index, w, h, progress = 1) {
    const columns = Math.max(1, Math.min(4, Math.floor(w / 210)));
    const row = Math.floor(index / columns), col = index % columns;
    const cellW = w / columns, cellH = Math.min(h * .42, Math.max(85, h * .43));
    const x = col * cellW + cellW * .08, y = h * .12 + row * cellH * .45;
    const mw = cellW * .82, mh = Math.min(h * .35, 100);
    const p = Math.max(.02, Math.min(1, progress));
    canvasCtx.save(); canvasCtx.beginPath(); canvasCtx.rect(x, y, mw * p, mh); canvasCtx.clip();
    canvasCtx.globalAlpha = .18 + .82 * p;
    canvasCtx.translate(x + mw / 2, y + mh / 2); canvasCtx.rotate(((mural.seed * 100) % 7 - 3) * Math.PI / 180);
    canvasCtx.textAlign = 'center'; canvasCtx.textBaseline = 'middle';
    canvasCtx.font = `900 ${Math.max(28, Math.min(76, mh * .73))}px Impact, "Arial Black", sans-serif`;
    canvasCtx.lineWidth = Math.max(5, mh * .09); canvasCtx.strokeStyle = '#15201d'; canvasCtx.strokeText(mural.word, 0, 0, mw * .94);
    canvasCtx.fillStyle = mural.color; canvasCtx.fillText(mural.word, 0, 0, mw * .94);
    canvasCtx.globalAlpha = .8; canvasCtx.font = `900 ${Math.max(10, mh * .15)}px system-ui`; canvasCtx.fillStyle = '#f2eee0';
    canvasCtx.fillText('✦', -mw * .36, -mh * .2); canvasCtx.fillText('✦', mw * .36, mh * .2);
    canvasCtx.restore();
  }
  function drawArtist(x, y, scale, index, working) {
    canvasCtx.save(); canvasCtx.translate(x, y); canvasCtx.scale(scale, scale);
    canvasCtx.fillStyle = '#11171455'; canvasCtx.beginPath(); canvasCtx.ellipse(0, 2, 18, 5, 0, 0, Math.PI * 2); canvasCtx.fill();
    // Simple pixel-inspired crew sprite, drawn locally so the scene never depends on external fonts.
    canvasCtx.fillStyle = '#26302b'; roundedRect(canvasCtx, -10, -31, 20, 27, 4); canvasCtx.fill();
    canvasCtx.fillStyle = ['#d59673', '#bd805e', '#e0aa81', '#a96e51', '#dca27a', '#b97e60'][index % 6];
    canvasCtx.fillRect(-6, -45, 12, 14);
    canvasCtx.fillStyle = ['#d4b853', '#303c45', '#d75142', '#577f63', '#c5c7bf', '#514269'][index % 6];
    canvasCtx.fillRect(-9, -47, 18, 6); canvasCtx.fillRect(-7, -50, 14, 4);
    canvasCtx.fillStyle = '#171d1a'; canvasCtx.fillRect(-4, -39, 2, 2); canvasCtx.fillRect(3, -39, 2, 2);
    canvasCtx.fillStyle = '#d7dfca'; canvasCtx.fillRect(-8, -29, 16, 13);
    canvasCtx.fillStyle = working ? '#f27b50' : '#c6f36a'; canvasCtx.fillRect(9, -32, 5, 11);
    canvasCtx.fillStyle = '#202723'; canvasCtx.fillRect(-8, -4, 6, 5); canvasCtx.fillRect(3, -4, 6, 5);
    if (working) {
      canvasCtx.strokeStyle = '#d89b70'; canvasCtx.lineWidth = 3; canvasCtx.beginPath(); canvasCtx.moveTo(7, -27); canvasCtx.lineTo(15, -34); canvasCtx.stroke();
      canvasCtx.fillStyle = '#d06450'; canvasCtx.fillRect(14, -38, 4, 8);
    }
    canvasCtx.restore();
  }
  function renderCanvas() {
    if (!canvas || !canvasCtx) return;
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0); canvasCtx.imageSmoothingEnabled = false;
    const w = rect.width, h = rect.height; drawBackdrop(w, h);
    const completed = state.murals.slice(-12);
    completed.forEach((mural, i) => paintMural(mural, i, w, h));
    state.jobs.forEach((job, i) => {
      if (!job) return;
      const pct = Math.max(0, Math.min(1, (Date.now() - job.started) / job.duration));
      const muralIndex = completed.length + i;
      paintMural(job, muralIndex, w, h, pct);
    });
    const active = state.jobs.map((job, i) => job ? i : -1).filter(i => i >= 0);
    const artistCount = Math.max(1, state.artists);
    for (let i = 0; i < artistCount; i++) {
      const x = w * ((i + 1) / (artistCount + 1));
      const working = active.includes(i);
      drawArtist(x, h * .87, Math.max(.72, Math.min(1.05, w / 650)), i, working);
    }
    // Subtle brick seams keep the wall tactile without obscuring artwork.
    canvasCtx.globalAlpha = .12; canvasCtx.strokeStyle = '#101614'; canvasCtx.lineWidth = 1;
    for (let y = 0; y < h * .84; y += 17) { canvasCtx.beginPath(); canvasCtx.moveTo(0, y); canvasCtx.lineTo(w, y); canvasCtx.stroke(); }
    canvasCtx.globalAlpha = 1;
  }
  function deliverSupply() {
    if (inventoryCount() >= MAX_TOOLS) { state.nextSupplyAt = Date.now() + 4000; return; }
    const empty = state.items.indexOf(0);
    if (empty >= 0) {
      const maxLevel = Math.min(6, Math.floor((state.drawings + state.supply - 1) / 5) + 1);
      state.items[empty] = Math.max(1, Math.min(maxLevel, 1 + Math.floor(Math.random() * Math.min(3, maxLevel))));
      notify(t().toolAdded);
    }
    state.nextSupplyAt = Date.now() + Math.max(6000, 18000 - (state.supply - 1) * 2200);
    save(); render();
  }
  function updateTimers(now) {
    const time = Date.now(); let changed = false;
    state.jobs.forEach((job, i) => {
      if (!job || time - job.started < job.duration) return;
      // Remove the job before granting its reward: a saved completion can never pay twice.
      state.jobs[i] = null;
      state.murals.push({ word: job.word, color: job.color, seed: job.seed });
      state.murals = state.murals.slice(-12); state.drawings++;
      state.coins += REWARD; changed = true;
      notify(t().completed);
    });
    if (time >= state.nextSupplyAt) { deliverSupply(); changed = false; }
    if (changed) { save(); render(); }
    const left = Math.max(0, state.nextSupplyAt - time);
    $('supply-countdown').textContent = `${t().in} ${Math.ceil(left / 1000)} ${t().seconds}`;
    $('supply-title').textContent = t().supply;
    const period = Math.max(6000, 18000 - (state.supply - 1) * 2200);
    $('supply-fill').style.width = `${Math.max(0, Math.min(100, 100 * (1 - left / period)))}%`;
    renderProgress();
    if (now - lastFrame >= 80) { renderCanvas(); lastFrame = now; }
  }
  function animationFrame(now) { updateTimers(now); requestAnimationFrame(animationFrame); }
  function openUpgrades() { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); $('close-upgrades').focus(); }
  function closeUpgrades() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); $('open-upgrades').focus(); }
  function clearProgress() {
    if (!window.confirm(t().confirmClear)) return;
    const language = state.language;
    state = freshState(); state.language = language;
    selectedTool = -1;
    save(); render(); renderCanvas(); closeUpgrades(); notify(t().cleared);
  }
  function init() {
    $('open-upgrades').addEventListener('click', openUpgrades);
    $('close-upgrades').addEventListener('click', closeUpgrades);
    $('clear-progress').addEventListener('click', clearProgress);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeUpgrades(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('open')) closeUpgrades(); });
    $('language').addEventListener('click', () => { state.language = state.language === 'ru' ? 'en' : 'ru'; save(); render(); });
    window.addEventListener('resize', renderCanvas);
    window.addEventListener('beforeunload', save);
    $('save-status').textContent = t().save;
    render(); renderCanvas(); requestAnimationFrame(animationFrame);
    setInterval(save, 15000);
  }
  init();
})();
