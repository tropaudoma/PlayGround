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
  const artStyles = ['wildstyle', 'throwup', 'chrome', 'bubble', 'hardcore'];
  const styleLabels = { ru: { wildstyle: 'Wildstyle', throwup: 'Throw-up', chrome: 'Хром', bubble: 'Bubble', hardcore: 'Hardcore', random: 'Случайный' }, en: { wildstyle: 'Wildstyle', throwup: 'Throw-up', chrome: 'Chrome', bubble: 'Bubble', hardcore: 'Hardcore', random: 'Random' } };
  const names = { ru: ['Лиса', 'Шум', 'Клякс', 'Рэй', 'Искра', 'Мико'], en: ['Fox', 'Noise', 'Splat', 'Ray', 'Spark', 'Miko'] };
  const words = { ru: ['ЖАР', 'ШУМ', 'МИР', 'БИТ', 'СЛЕД', 'ИСКРА', 'ДВОР', 'РИТМ', 'ВОЛЯ', 'СВЕТ', 'КОТ', 'ДРАЙВ'], en: ['HEAT', 'NOISE', 'PEACE', 'BEAT', 'TRACE', 'SPARK', 'YARD', 'RHYTHM', 'SOUL', 'GLOW', 'CREW', 'VIBE'] };
  const tr = {
    ru: { district: 'РАБОЧАЯ ЗОНА ·', place: 'Старая промзона', wall: 'СТЕНА', coins: 'МОНЕТЫ', upgrades: 'УЛУЧШЕНИЯ', crewKick: 'ТВОЯ КОМАНДА', crew: 'Мастера', crewNote: 'Выбери инструмент, затем мастера, чтобы начать рисунок.', master: 'МАСТЕР', masters: 'МАСТЕРА', supplies: 'Краски и инструменты', inventory: 'ИНВЕНТАРЬ', merge: 'Выбери два одинаковых инструмента, чтобы объединить их.', tip: 'Выбери инструмент и назначь мастера на стену.', alive: 'СТЕНА ОЖИВАЕТ', painting: 'МАСТЕРА РИСУЮТ', idle: 'ЖДУТ МАТЕРИАЛЫ', waiting: 'СВОБОДЕН', busy: 'РИСУЕТ', finished: 'ГОТОВО', supply: 'НОВАЯ ПОСТАВКА', in: 'через', seconds: 'сек.', save: 'АВТОСОХРАНЕНИЕ ВКЛЮЧЕНО', saved: 'СОХРАНЕНО', hire: 'Расширить команду', hireDescription: 'Нанять ещё одного мастера', reward: 'НАГРАДА', each: 'ЗА РИСУНОК', upgradesTitle: 'Улучшения', kicker: 'РАЗВИВАЙ МАСТЕРСКУЮ', foot: 'Каждый готовый мурал приносит ровно 15 монет.', speed: 'Быстрая рука', speedDesc: 'Мастера рисуют быстрее.', delivery: 'Частые поставки', deliveryDesc: 'Инструменты появляются чаще.', hireUpgrade: 'Новый мастер', hireDesc: 'Добавить мастера в команду.', max: 'МАКС.', buy: 'УЛУЧШИТЬ', clear: 'Сбросить прогресс', confirmClear: 'Удалить весь прогресс мастерской? Это действие нельзя отменить.', cleared: 'Прогресс сброшен.', needCoins: 'Не хватает монет.', mergeOk: 'Инструменты объединены!', maxTool: 'Инструмент уже максимального уровня.', full: 'Инвентарь заполнен.', hired: 'Новый мастер в команде!', speedUp: 'Мастера стали быстрее!', supplyUp: 'Поставки ускорены!', toolAdded: 'Новый инструмент поступил!', assigned: 'Мастер приступил к работе!', completed: 'Рисунок готов · +15 ¢', choose: 'Сначала выбери инструмент.', unavailable: 'Этот мастер занят.', progress: 'ХОД РАБОТЫ', level: 'УРОВЕНЬ', modalClose: 'Закрыть', capacity: '/ 12', working: 'РАБОТАЕТ', selectTool: 'ИНСТРУМЕНТ ВЫБРАН', selected: 'ВЫБРАНО', toolLevel: 'УРОВЕНЬ' },
    en: { district: 'WORK ZONE ·', place: 'Old Industrial Yard', wall: 'WALL', coins: 'COINS', upgrades: 'UPGRADES', crewKick: 'YOUR CREW', crew: 'Artists', crewNote: 'Choose a tool, then an artist to start a piece.', master: 'ARTIST', masters: 'ARTISTS', supplies: 'Paint & tools', inventory: 'INVENTORY', merge: 'Select two matching tools to merge them.', tip: 'Choose a tool and assign an artist to the wall.', alive: 'WALL IN PROGRESS', painting: 'ARTISTS AT WORK', idle: 'WAITING FOR SUPPLIES', waiting: 'AVAILABLE', busy: 'PAINTING', finished: 'DONE', supply: 'NEXT SUPPLY', in: 'in', seconds: 'sec.', save: 'AUTOSAVE ENABLED', saved: 'SAVED', hire: 'Expand the crew', hireDescription: 'Hire another artist', reward: 'REWARD', each: 'PER ARTWORK', upgradesTitle: 'Upgrades', kicker: 'GROW YOUR WORKSHOP', foot: 'Every finished mural earns exactly 15 coins.', speed: 'Quick hands', speedDesc: 'Artists finish their paintings faster.', delivery: 'Frequent drops', deliveryDesc: 'Tools arrive more often.', hireUpgrade: 'New artist', hireDesc: 'Add an artist to your crew.', max: 'MAX', buy: 'UPGRADE', clear: 'Reset progress', confirmClear: 'Delete all workshop progress? This cannot be undone.', cleared: 'Progress reset.', needCoins: 'Not enough coins.', mergeOk: 'Tools merged!', maxTool: 'That tool is already at max level.', full: 'Inventory is full.', hired: 'A new artist joined the crew!', speedUp: 'Artists are working faster!', supplyUp: 'Supplies arrive faster!', toolAdded: 'Fresh tool delivered!', assigned: 'Artist started painting!', completed: 'Artwork finished · +15 ¢', choose: 'Choose a tool first.', unavailable: 'This artist is busy.', progress: 'ART PROGRESS', level: 'LEVEL', modalClose: 'Close', capacity: '/ 12', working: 'WORKING', selectTool: 'TOOL SELECTED', selected: 'SELECTED', toolLevel: 'LEVEL' }
  };
  const freshState = () => ({ version: 2, coins: 35, items: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], artists: 1, speed: 1, supply: 1, jobs: [], murals: [], drawings: 0, nextSupplyAt: Date.now() + 10000, language: 'ru', artStyle: 'wildstyle' });
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
    return j && Number.isFinite(j.started) && Number.isFinite(j.duration) ? { started: j.started, duration: Math.max(5000, j.duration), level: Math.max(1, Math.min(6, j.level | 0)), color: muralColors.includes(j.color) ? j.color : muralColors[i % muralColors.length], word: typeof j.word === 'string' ? j.word : words.ru[i % words.ru.length], seed: Number(j.seed) || Math.random(), style: artStyles.includes(j.style) ? j.style : 'wildstyle', artist: i } : null;
  });
  state.murals = Array.isArray(state.murals) ? state.murals.slice(-12).map((m, i) => ({ word: typeof m.word === 'string' ? m.word : words.ru[i % 12], color: muralColors.includes(m.color) ? m.color : muralColors[i % muralColors.length], seed: Number(m.seed) || i + 1, style: artStyles.includes(m.style) ? m.style : 'wildstyle' })) : [];
  state.language = state.language === 'en' ? 'en' : 'ru';
  state.artStyle = state.artStyle === 'random' || artStyles.includes(state.artStyle) ? state.artStyle : 'wildstyle';
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
    const style = state.artStyle === 'random' ? artStyles[Math.floor(Math.random() * artStyles.length)] : state.artStyle;
    state.jobs[index] = { started: Date.now(), duration: durationFor(level), level, color: muralColors[Math.floor(Math.random() * muralColors.length)], word: words[state.language][Math.floor(Math.random() * words[state.language].length)], seed: Math.random(), style, artist: index };
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
    $('style-label').textContent = lang === 'ru' ? 'СТИЛЬ' : 'STYLE';
    const styleSelect = $('art-style');
    styleSelect.innerHTML = `<option value="random">${styleLabels[lang].random}</option>` + artStyles.map(style => `<option value="${style}">${styleLabels[lang][style]}</option>`).join('');
    styleSelect.value = state.artStyle;
    styleSelect.setAttribute('aria-label', lang === 'ru' ? 'Стиль граффити' : 'Graffiti style');
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
  const glyphs = {
    A: [[[8,116],[15,35],[39,7],[73,14],[96,112]],[[23,74],[77,68]]], B: [[[12,116],[15,11],[57,8],[81,24],[72,48],[20,61],[68,57],[91,77],[83,104],[58,117],[12,116]]], C: [[[91,19],[63,7],[30,15],[12,42],[10,87],[31,113],[69,116],[94,98]]], D: [[[12,116],[15,12],[51,8],[81,30],[91,72],[74,105],[48,117],[12,116]]], E: [[[89,12],[18,10],[13,116],[91,110]],[[17,61],[71,57]]], F: [[[17,117],[17,11],[91,9]],[[18,61],[72,57]]], G: [[[91,20],[66,8],[32,14],[12,43],[13,86],[37,112],[73,114],[94,89],[92,66],[60,68]]], H: [[[13,11],[15,116]],[[87,8],[83,116]],[[16,63],[84,57]]], I: [[[20,12],[81,10]],[[50,13],[43,111]],[[15,115],[80,111]]], J: [[[86,12],[81,88],[66,111],[36,116],[15,99]]], K: [[[14,10],[12,116]],[[88,12],[23,66],[89,113]]], L: [[[18,10],[14,116],[91,111]]], M: [[[9,116],[18,10],[51,57],[83,9],[94,115]]], N: [[[13,116],[17,11],[85,114],[89,10]]], O: [[[51,7],[79,14],[93,41],[89,87],[68,113],[37,117],[13,94],[9,48],[24,18],[51,7]]], P: [[[14,116],[17,11],[61,8],[86,27],[80,50],[60,64],[18,66]]], Q: [[[51,7],[79,14],[93,41],[89,87],[68,113],[37,117],[13,94],[9,48],[24,18],[51,7]],[[58,83],[96,119]]], R: [[[14,116],[17,11],[61,8],[86,27],[80,50],[60,64],[18,66]],[[56,63],[91,114]]], S: [[[88,18],[62,8],[32,14],[13,34],[23,52],[68,65],[87,83],[77,105],[48,116],[17,105]]], T: [[[8,13],[94,10]],[[53,12],[47,116]]], U: [[[15,10],[12,78],[24,105],[53,116],[79,105],[89,78],[87,10]]], V: [[[10,10],[42,116],[59,116],[94,9]]], W: [[[8,10],[20,114],[43,66],[59,112],[77,10],[94,114]]], X: [[[12,10],[89,115]],[[91,10],[12,116]]], Y: [[[9,10],[49,59],[90,9]],[[49,59],[44,116]]], Z: [[[13,15],[91,11],[15,109],[89,108]]], '0': [[[50,8],[80,17],[91,48],[79,102],[53,116],[25,104],[12,69],[17,31],[50,8]]], '1': [[[25,31],[53,9],[55,114]],[[26,115],[84,112]]], '2': [[[14,30],[36,9],[70,10],[89,29],[81,51],[18,105],[88,108]]], '3': [[[18,17],[72,9],[88,31],[56,57],[82,61],[91,84],[75,108],[23,113]]], '4': [[[68,116],[69,9],[12,77],[92,73]]], '5': [[[86,12],[25,12],[21,52],[68,49],[89,68],[80,99],[55,115],[18,106]]], '6': [[[81,12],[44,11],[19,41],[13,83],[31,111],[66,114],[86,93],[80,68],[56,58],[17,70]]], '7': [[[12,13],[91,10],[48,116]]], '8': [[[50,8],[79,17],[83,39],[65,56],[34,58],[15,42],[21,19],[50,8]],[[34,58],[70,60],[88,78],[80,104],[51,116],[22,104],[13,81],[34,58]]], '9': [[[82,58],[45,65],[18,48],[20,23],[42,9],[72,13],[88,41],[81,91],[54,114],[22,109]]]
  };
  const glyphMap = { 'А':'A','Б':'B','В':'B','Г':'T','Д':'A','Е':'E','Ё':'E','Ж':'X','З':'3','И':'N','Й':'N','К':'K','Л':'A','М':'M','Н':'H','О':'O','П':'H','Р':'P','С':'C','Т':'T','У':'Y','Ф':'O','Х':'X','Ц':'U','Ч':'H','Ш':'W','Щ':'W','Ъ':'P','Ы':'B','Ь':'P','Э':'3','Ю':'O','Я':'R' };
  const styleLooks = {
    wildstyle: { outline:'#12141c', rim:'#f0e2b9', weight:21, edge:'bevel', accent:'#d9ff4f' },
    throwup: { outline:'#201b28', rim:'#f4d8c6', weight:30, edge:'round', accent:'#fff0a8' },
    chrome: { outline:'#13232e', rim:'#8ce8eb', weight:24, edge:'bevel', accent:'#ffffff' },
    bubble: { outline:'#20172d', rim:'#f8c9ed', weight:31, edge:'round', accent:'#fff7ed' },
    hardcore: { outline:'#160f16', rim:'#ffce62', weight:20, edge:'bevel', accent:'#f7f4df' }
  };
  function seeded(seed) { let a = (Math.floor((seed || .5) * 0xffffffff) ^ 0x9e3779b9) >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mappedGlyph(char) { const upper = char.toUpperCase(); return glyphs[upper] ? upper : glyphMap[upper] || 'O'; }
  function traceGlyph(ctx, paths, round) {
    paths.forEach(points => {
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
      if (round && points.length > 3) {
        for (let i=1;i<points.length-1;i++) { const mx=(points[i][0]+points[i+1][0])/2, my=(points[i][1]+points[i+1][1])/2; ctx.quadraticCurveTo(points[i][0],points[i][1],mx,my); }
        const last=points[points.length-1]; ctx.lineTo(last[0],last[1]);
      } else for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
    });
  }
  function sprayCloud(ctx, x, y, width, height, color, rng, count, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    for (let i=0;i<count;i++) { const px=x+(rng()-.5)*width, py=y+(rng()-.5)*height, r=1+rng()*3.4; ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  }
  function paintMural(mural, index, w, h, progress = 1, box = null, opacity = 1) {
    const seed = Number(mural.seed) || index + 1, rng = seeded(seed), style = artStyles.includes(mural.style) ? mural.style : 'wildstyle';
    const look = styleLooks[style], word = (mural.word || 'ART').toUpperCase().slice(0, 10), chars = [...word];
    const advances = chars.map(ch => (['I','Л','Т','1'].includes(ch) ? 58 : ['М','Ш','Щ','W'].includes(ch) ? 83 : 73) * (.88 + rng()*.22));
    const total = advances.reduce((a,b)=>a+b,0) + 32, bw = box?.w || w*.86, bh = box?.h || h*.61;
    const scale = Math.min(bw/total, bh/154), actualW = total*scale, actualH=145*scale;
    const x0 = (box?.x ?? (w-actualW)/2) + (bw-actualW)/2, y0 = (box?.y ?? (h-actualH)/2) + (bh-actualH)/2;
    const p=Math.max(.02,Math.min(1,progress));
    canvasCtx.save(); canvasCtx.globalAlpha *= opacity;
    canvasCtx.beginPath(); canvasCtx.rect(box?.x ?? 0, box?.y ?? 0, bw*p, box?.h ?? h); canvasCtx.clip();
    // Overspray halo and loose flecks frame the custom hand-built letter structure.
    sprayCloud(canvasCtx,x0+actualW/2,y0+actualH/2,actualW*1.12,actualH*1.32,look.accent,rng,85,style==='chrome'?.16:.11);
    const palette = style==='chrome' ? ['#dffcff','#83d7e8','#52799d','#e9ffff'] : style==='bubble' ? ['#ff6fc9','#a25cff','#54e7d2','#ffd76e'] : style==='throwup' ? ['#ff965b','#ffe15f','#65ddc4','#f4f0e7'] : style==='hardcore' ? ['#ff3e53','#ff9d27','#d6e34d','#f2e7d0'] : ['#fa5148','#ffcb3d','#40e2dc','#a878ff'];
    const fill = mural.color || palette[Math.floor(rng()*palette.length)], fill2 = palette[Math.floor(rng()*palette.length)];
    // Loose connective ribbons sit behind the letters, linking the tag into one piece.
    canvasCtx.save(); canvasCtx.translate(x0,y0); canvasCtx.scale(scale,scale); canvasCtx.lineCap=look.edge; canvasCtx.lineJoin=look.edge;
    canvasCtx.strokeStyle=look.outline; canvasCtx.lineWidth=9; canvasCtx.beginPath(); canvasCtx.moveTo(8,101); canvasCtx.lineTo(30+rng()*30,89); canvasCtx.lineTo(65+rng()*38,97); canvasCtx.lineTo(total-9,68); canvasCtx.stroke();
    for(let i=0;i<chars.length;i++) {
      const glyph=mappedGlyph(chars[i]), paths=glyphs[glyph], advance=advances[i], gx=chars.slice(0,i).reduce((a,_,j)=>a+advances[j],0);
      const lean=(rng()-.5)*.24, tilt=(rng()-.5)*(style==='wildstyle'?.20:.09), stretch=.84+rng()*.30, rise=(rng()-.5)*13;
      canvasCtx.save(); canvasCtx.translate(gx+advance*.48, 73+rise); canvasCtx.rotate(tilt); canvasCtx.transform(stretch,lean,-lean*.26,1,0,0); canvasCtx.translate(-50,-65);
      traceGlyph(canvasCtx,paths,look.edge==='round');
      canvasCtx.lineCap=look.edge; canvasCtx.lineJoin=look.edge; canvasCtx.miterLimit=2.2;
      // Offset extrusion, three ink contours, colored face and hand-cut inner glint.
      canvasCtx.save(); canvasCtx.translate(9,12); canvasCtx.lineWidth=look.weight+14; canvasCtx.strokeStyle='#090d12'; canvasCtx.stroke();
      canvasCtx.translate(-4,-5); canvasCtx.lineWidth=look.weight+8; canvasCtx.strokeStyle=style==='chrome'?'#34556c':'#302044'; canvasCtx.stroke(); canvasCtx.restore();
      canvasCtx.lineWidth=look.weight+8; canvasCtx.strokeStyle=look.outline; canvasCtx.stroke();
      canvasCtx.lineWidth=look.weight+2; canvasCtx.strokeStyle=look.rim; canvasCtx.stroke();
      canvasCtx.lineWidth=look.weight-7; canvasCtx.strokeStyle=fill; canvasCtx.stroke();
      if(style==='chrome') {
        const metal=canvasCtx.createLinearGradient(0,10,75,118); metal.addColorStop(0,'#ffffff');metal.addColorStop(.18,'#66c9e6');metal.addColorStop(.37,'#efffff');metal.addColorStop(.52,'#507a9e');metal.addColorStop(.72,'#eaffff');metal.addColorStop(1,'#5589a8');
        canvasCtx.lineWidth=look.weight-13; canvasCtx.strokeStyle=metal; canvasCtx.stroke();
      } else {
        canvasCtx.lineWidth=3.3; canvasCtx.strokeStyle=look.accent; canvasCtx.globalAlpha*=.85; canvasCtx.translate(-2,-3); canvasCtx.stroke(); canvasCtx.globalAlpha/= .85; canvasCtx.translate(2,3);
      }
      // Angular cuts, hatch marks and tiny face facets distinguish the individual glyphs.
      canvasCtx.globalAlpha*=.8; canvasCtx.lineWidth=2.2; canvasCtx.strokeStyle=style==='chrome'?'#ffffff':fill2;
      canvasCtx.beginPath(); canvasCtx.moveTo(24,28); canvasCtx.lineTo(39,23); canvasCtx.lineTo(34,37); canvasCtx.moveTo(57,89); canvasCtx.lineTo(72,83); canvasCtx.stroke();
      if(style==='wildstyle'||style==='hardcore') { canvasCtx.fillStyle=look.accent; canvasCtx.beginPath(); canvasCtx.moveTo(35,47);canvasCtx.lineTo(53,42);canvasCtx.lineTo(45,53);canvasCtx.closePath();canvasCtx.fill(); }
      if(style==='bubble'||style==='throwup') { canvasCtx.fillStyle='#fff9e8'; canvasCtx.globalAlpha*=.72; canvasCtx.beginPath();canvasCtx.ellipse(37,34,5,2.4,-.6,0,Math.PI*2);canvasCtx.fill(); }
      canvasCtx.restore();
      // Individually placed arrow-like extensions give each letter its own silhouette.
      if((style==='wildstyle'||style==='hardcore') && rng()>.16) {
        const ex=gx+30+rng()*32, ey=15+rng()*18;
        canvasCtx.fillStyle=look.accent; canvasCtx.beginPath();canvasCtx.moveTo(ex,ey+8);canvasCtx.lineTo(ex+24+rng()*18,ey-6);canvasCtx.lineTo(ex+12,ey+12);canvasCtx.lineTo(ex+32,ey+10);canvasCtx.lineTo(ex+4,ey+24);canvasCtx.closePath();canvasCtx.fill();
        canvasCtx.strokeStyle=look.outline;canvasCtx.lineWidth=3;canvasCtx.stroke();
      }
    }
    // Top flicks, side arrows, tag underline and gravity drips.
    canvasCtx.strokeStyle=look.rim; canvasCtx.lineWidth=5; canvasCtx.beginPath();canvasCtx.moveTo(12,123);canvasCtx.lineTo(38,132);canvasCtx.lineTo(total-15,119);canvasCtx.lineTo(total+4,105);canvasCtx.stroke();
    canvasCtx.fillStyle=look.accent; canvasCtx.beginPath();canvasCtx.moveTo(total-10,104);canvasCtx.lineTo(total+13,100);canvasCtx.lineTo(total+3,117);canvasCtx.closePath();canvasCtx.fill();
    const dripCount=Math.max(2,Math.min(6,Math.ceil(chars.length/2)));
    for(let d=0;d<dripCount;d++) { const dx=16+rng()*(total-28), dy=116+rng()*10, len=8+rng()*22; canvasCtx.strokeStyle=d%2?fill:look.rim;canvasCtx.lineWidth=2+rng()*3;canvasCtx.beginPath();canvasCtx.moveTo(dx,dy);canvasCtx.lineTo(dx+(rng()-.5)*3,dy+len);canvasCtx.stroke();canvasCtx.fillStyle=fill;canvasCtx.beginPath();canvasCtx.arc(dx,dy+len,canvasCtx.lineWidth*.55,0,Math.PI*2);canvasCtx.fill(); }
    if(style==='wildstyle'||style==='hardcore') {
      for(let k=0;k<3;k++){const ax=rng()*total, ay=18+rng()*105;canvasCtx.strokeStyle=look.accent;canvasCtx.lineWidth=2;canvasCtx.beginPath();canvasCtx.moveTo(ax,ay);canvasCtx.lineTo(ax+20+rng()*20,ay-10-rng()*12);canvasCtx.lineTo(ax+8,ay+3);canvasCtx.stroke();}
    }
    canvasCtx.restore();
    sprayCloud(canvasCtx,x0+actualW/2,y0+actualH*.86,actualW*1.03,actualH*.34,fill,rng,42,.13);
    // Small artist signature and style badge are drawn as wall marks, never as the main lettering.
    canvasCtx.save(); canvasCtx.globalAlpha*=.76; canvasCtx.fillStyle='#f0ead4'; canvasCtx.font=`800 ${Math.max(8,Math.min(12,scale*7))}px monospace`; canvasCtx.textAlign='right'; canvasCtx.fillText(style.toUpperCase(),Math.min(w-8,x0+actualW+8),Math.min(h-8,y0+actualH+16)); canvasCtx.restore();
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
  function muralBox(index, count, w, h) {
    if (count <= 1) return { x: w*.055, y: h*.08, w: w*.89, h: h*.69 };
    const columns = count === 2 ? 2 : (w < 520 ? 2 : 3);
    const rows = Math.ceil(count / columns), cellW = w / columns, regionY = h*.075, regionH = h*.70, cellH = regionH / rows;
    return { x: index%columns*cellW + cellW*.035, y: regionY + Math.floor(index/columns)*cellH + cellH*.06, w: cellW*.93, h: cellH*.84 };
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
    const pieces = completed.map(mural => ({ mural, progress: 1 }));
    state.jobs.forEach(job => {
      if (job) pieces.push({ mural: job, progress: Math.max(0, Math.min(1, (Date.now() - job.started) / job.duration)) });
    });
    pieces.forEach(({ mural, progress }, i) => paintMural(mural, i, w, h, progress, muralBox(i, pieces.length, w, h), progress < 1 ? .94 : 1));
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
      state.murals.push({ word: job.word, color: job.color, seed: job.seed, style: job.style || 'wildstyle' });
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
    $('art-style').addEventListener('change', event => { state.artStyle = artStyles.includes(event.target.value) || event.target.value === 'random' ? event.target.value : 'wildstyle'; save(); render(); });
    window.addEventListener('resize', renderCanvas);
    window.addEventListener('beforeunload', save);
    $('save-status').textContent = t().save;
    render(); renderCanvas(); requestAnimationFrame(animationFrame);
    setInterval(save, 15000);
  }
  init();
})();
