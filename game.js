(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
  const screens = {home:$('homeScreen'), armory:$('armoryScreen'), game:$('gameScreen')};
  const upgrades = [
    {id:'damage',name:'Pulse Damage',icon:'✦',desc:'Make every pulse hit harder. A clean shot can change everything.',base:25,max:30,stat:'damage'},
    {id:'vitality',name:'Vitality',icon:'♥',desc:'Reinforced suit plating. Start each run with more health.',base:30,max:25,stat:'health'},
    {id:'magnet',name:'Shard Magnet',icon:'◉',desc:'Pull loose XP from further away. Leave nothing behind.',base:20,max:30,stat:'magnet'},
    {id:'agility',name:'Quickstep',icon:'»',desc:'Move faster and stay one step ahead of the swarm.',base:25,max:20,stat:'speed'}
  ];
  const defaults = {coins:0,bestTime:0,bestLevel:1,damage:0,health:0,magnet:0,speed:0};
  let save = {...defaults};
  try { save = {...defaults,...JSON.parse(localStorage.getItem('voidrunner-save')||'{}')}; } catch {}
  let W=800,H=600,DPR=1,raf=0,last=0,mode='home',soundOn=true;
  let game=null,keys={},joy={x:0,y:0,active:false,pointer:null},toastTimer;
  const saveData=()=>{try{localStorage.setItem('voidrunner-save',JSON.stringify(save))}catch{}};
  function showScreen(name){Object.values(screens).forEach(s=>s.classList.add('hidden'));screens[name].classList.remove('hidden');$('footer').classList.toggle('hidden',name==='game');}
  function setHome(){mode='home';showScreen('home');updateHome();}
  function updateHome(){ $('coinCount').textContent=save.coins.toLocaleString(); $('bestRun').textContent=formatTime(save.bestTime); $('bestLevel').textContent=String(save.bestLevel).padStart(2,'0'); }
  function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
  function cost(up){return Math.floor(up.base*Math.pow(1.48,save[up.stat]));}
  function drawArmory(){
    $('coinCount').textContent=save.coins.toLocaleString();
    $('upgradeGrid').innerHTML=upgrades.map(u=>{const n=save[u.stat],price=cost(u),max=n>=u.max;const stat=u.id==='damage'?`+${n*5}% damage`:u.id==='vitality'?`+${n*8} starting health`:u.id==='magnet'?`${n*12}% pickup range`:`+${n*3}% movement speed`;return `<article class="upgrade-card"><span class="upgrade-level">LVL ${String(n).padStart(2,'0')} / ${u.max}</span><div class="upgrade-icon">${u.icon}</div><h3>${u.name}</h3><p>${u.desc}<br><b style="color:#c6c8d4">${stat}</b></p><button class="upgrade-buy" data-up="${u.id}" ${max||save.coins<price?'disabled':''}>${max?'MAX LEVEL':`◆ &nbsp; ${price.toLocaleString()} SHARDS`}</button></article>`}).join('');
    $('upgradeGrid').querySelectorAll('[data-up]').forEach(btn=>btn.onclick=()=>{const u=upgrades.find(x=>x.id===btn.dataset.up);const price=cost(u);if(save.coins>=price&&save[u.stat]<u.max){save.coins-=price;save[u.stat]++;saveData();drawArmory();}});
  }
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;DPR=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
  function startRun(){
    cancelAnimationFrame(raf);showScreen('game');mode='playing';resize();
    const maxHp=100+save.health*8;
    game={t:0,kills:0,level:1,xp:0,nextXp:10,player:{x:0,y:0,hp:maxHp,maxHp,speed:195*(1+save.speed*.03),damage:18*(1+save.damage*.05),fire:0,invuln:0,magnet:185+save.magnet*12,rad:13},enemies:[],bullets:[],gems:[],particles:[],spawn:0,bossTimer:58,bossWarn:0,paused:false,choice:false,coinsEarned:0,shake:0,lastHit:0,levelQueue:0};
    $('pauseOverlay').classList.add('hidden');$('levelOverlay').classList.add('hidden');$('endOverlay').classList.add('hidden');$('bossAlert').classList.add('hidden');joy.x=joy.y=0;updateHud();last=performance.now();raf=requestAnimationFrame(loop);
  }
  function updateHud(){if(!game)return;$('timer').textContent=formatTime(game.t);$('level').textContent=String(game.level).padStart(2,'0');$('kills').textContent=String(game.kills).padStart(3,'0');$('xpText').textContent=`${Math.floor(game.xp)} / ${game.nextXp}`;$('xpFill').style.width=`${Math.min(100,game.xp/game.nextXp*100)}%`;$('healthText').textContent=Math.ceil(game.player.hp);$('healthFill').style.width=`${Math.max(0,game.player.hp/game.player.maxHp*100)}%`;}
  function rand(a,b){return a+Math.random()*(b-a)}
  function spawnEnemy(boss=false){const a=rand(0,Math.PI*2),dist=Math.max(W,H)*.65+60;let kind=Math.random();let e={x:game.player.x+Math.cos(a)*dist,y:game.player.y+Math.sin(a)*dist,hp:boss?540:kind<.18?45:kind<.38?26:20,maxHp:boss?540:kind<.18?45:kind<.38?26:20,speed:boss?37:kind<.18?48:kind<.38?94:67,rad:boss?29:kind<.18?18:kind<.38?10:13,damage:boss?24:kind<.18?18:11,color:boss?'#ff477c':kind<.18?'#ffad5c':kind<.38?'#a887ff':'#ff648b',boss};game.enemies.push(e);if(boss){game.bossTimer=62;game.bossWarn=4;$('bossAlert').classList.remove('hidden');setTimeout(()=>$('bossAlert').classList.add('hidden'),3800);toast('ELITE INBOUND — KEEP MOVING');}}
  function toast(txt){const el=$('gameToast');el.textContent=txt;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1700);}
  function nearest(){let p=game.player,best=null,bd=Infinity;for(const e of game.enemies){let d=(e.x-p.x)**2+(e.y-p.y)**2;if(d<bd){bd=d;best=e;}}return best;}
  function addBurst(x,y,color,n=7){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),v=rand(25,130);game.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.55),max:.55,color,size:rand(1.5,3.8)});}}
  function hurtEnemy(e,dmg){e.hp-=dmg;addBurst(e.x,e.y,e.color,3);if(e.hp<=0){let idx=game.enemies.indexOf(e);if(idx<0)return;game.enemies.splice(idx,1);game.kills++;let val=e.boss?18:1+(Math.random()<.25?1:0);for(let n=0;n<val;n++)game.gems.push({x:e.x+rand(-9,9),y:e.y+rand(-9,9),value:e.boss?5:1,r:4});addBurst(e.x,e.y,e.color,e.boss?24:9);if(e.boss)toast('ELITE DOWN // +5 XP');}}
  function moveInput(){let x=0,y=0;if(keys.ArrowLeft||keys.a)x--;if(keys.ArrowRight||keys.d)x++;if(keys.ArrowUp||keys.w)y--;if(keys.ArrowDown||keys.s)y++;x+=joy.x;y+=joy.y;let m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}return{x,y};}
  function update(dt){let g=game,p=g.player;g.t+=dt;g.spawn-=dt;g.bossTimer-=dt;p.invuln=Math.max(0,p.invuln-dt);g.shake=Math.max(0,g.shake-dt*18);
    if(g.spawn<=0){spawnEnemy();g.spawn=Math.max(.24,1.05-g.t*.002)+Math.random()*.38;if(g.enemies.length<6+Math.floor(g.t/12))g.spawn=Math.min(g.spawn,.12);}
    if(g.bossTimer<=0&&!g.enemies.some(e=>e.boss))spawnEnemy(true);
    const input=moveInput();p.x+=input.x*p.speed*dt;p.y+=input.y*p.speed*dt;
    p.fire-=dt;if(p.fire<=0&&g.enemies.length){const target=nearest();if(target){const angle=Math.atan2(target.y-p.y,target.x-p.x),shots=1+(p.echo||0);for(let i=0;i<shots;i++){const spread=(i-(shots-1)/2)*.12,a=angle+spread;g.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*490,vy:Math.sin(a)*490,life:1.6,damage:p.damage,r:4});}p.fire=.39*(p.cooldownMod||1);}}
    for(let i=g.bullets.length-1;i>=0;i--){let b=g.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;for(const e of g.enemies){if((e.x-b.x)**2+(e.y-b.y)**2<(e.rad+b.r)**2){hurtEnemy(e,b.damage);hit=true;break;}}if(hit||b.life<=0)g.bullets.splice(i,1);}
    for(const e of g.enemies){let dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;if(d<e.rad+p.rad&&p.invuln<=0){p.hp-=e.damage;p.invuln=.55;g.shake=5;addBurst(p.x,p.y,'#ff598f',9);if(p.hp<=0){p.hp=0;endRun(false);return;}}}
    for(let i=g.gems.length-1;i>=0;i--){let m=g.gems[i],dx=p.x-m.x,dy=p.y-m.y,d=Math.hypot(dx,dy);if(d<p.magnet){let speed=d<28?430:170;if(d>0){m.x+=dx/d*speed*dt;m.y+=dy/d*speed*dt;}}if(d<p.rad+8){g.xp+=m.value;g.gems.splice(i,1);while(g.xp>=g.nextXp){g.xp-=g.nextXp;g.level++;g.nextXp=Math.floor(g.nextXp*1.27+4);g.levelQueue++;}}}if(g.levelQueue>0){g.levelQueue--;showChoices();return;}
    for(let i=g.particles.length-1;i>=0;i--){let q=g.particles[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.96;q.vy*=.96;q.life-=dt;if(q.life<=0)g.particles.splice(i,1);}
    if(Math.floor(g.t)!==Math.floor(g.t-dt))updateHud();
  }
  const powerChoices=[
    {id:'damage',name:'OVERCHARGE',icon:'✦',desc:'Pulse damage +35%. The best defense is a clean hit.'},
    {id:'speed',name:'AFTERBURN',icon:'»',desc:'Movement speed +18%. Get out of the way.'},
    {id:'health',name:'REPAIR KIT',icon:'♥',desc:'Restore 45 health and increase max health by 12.'},
    {id:'fire',name:'RAPID FIRE',icon:'⌁',desc:'Fire pulses 22% faster. More shots, more problems.'},
    {id:'magnet',name:'GRAVITY WELL',icon:'◉',desc:'Pickup range +55%. Vacuum up every shard.'},
    {id:'orbit',name:'ECHO SHOT',icon:'⟡',desc:'Add a bonus pulse to your next attack.'}
  ];
  function showChoices(){game.choice=true;const options=[...powerChoices].sort(()=>Math.random()-.5).slice(0,3);$('levelUpNumber').textContent=String(game.level).padStart(2,'0');$('choiceCards').innerHTML=options.map(o=>`<button class="choice-card" data-choice="${o.id}"><div class="choice-icon">${o.icon}</div><h3>${o.name}</h3><p>${o.desc}</p></button>`).join('');$('choiceCards').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>applyChoice(b.dataset.choice));$('levelOverlay').classList.remove('hidden');updateHud();}
  function applyChoice(id){const p=game.player;switch(id){case'damage':p.damage*=1.35;break;case'speed':p.speed*=1.18;break;case'health':p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+45);break;case'fire':p.fireRate=(p.fireRate||1)*1.28;break;case'magnet':p.magnet*=1.55;break;case'orbit':p.echo=(p.echo||0)+1;p.damage*=1.12;p.fireRate=(p.fireRate||1)*1.1;break;}if(id==='fire')p.cooldownMod=(p.cooldownMod||1)*.78;game.choice=false;$('levelOverlay').classList.add('hidden');toast('UPGRADE ONLINE // KEEP MOVING');if(game.levelQueue>0){game.levelQueue--;showChoices();return;}last=performance.now();raf=requestAnimationFrame(loop);}
  function draw(){if(!game)return;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);const p=game.player,cx=W/2,cy=H/2,ox=cx-p.x,oy=cy-p.y;ctx.save();if(game.shake)ctx.translate(rand(-game.shake,game.shake),rand(-game.shake,game.shake));
    ctx.fillStyle='#0c0f17';ctx.fillRect(0,0,W,H);
    const grid=54,gx=((ox%grid)+grid)%grid,gy=((oy%grid)+grid)%grid;ctx.strokeStyle='#b8a2ff0d';ctx.lineWidth=1;ctx.beginPath();for(let x=gx;x<W;x+=grid){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=gy;y<H;y+=grid){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke();
    // Ambient floor markers
    for(let i=0;i<18;i++){let wx=Math.floor((p.x+i*131)/270)*270,wy=Math.floor((p.y+i*73)/240)*240,x=wx+ox,y=wy+oy;if(x>-20&&x<W+20&&y>-20&&y<H+20){ctx.fillStyle='#9e83ff20';ctx.fillRect(x,y,2,2)}}
    for(const m of game.gems){let x=m.x+ox,y=m.y+oy;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#d5ff3f';ctx.shadowColor='#d5ff3f';ctx.shadowBlur=10;ctx.fillRect(-3,-3,6,6);ctx.restore();}
    for(const b of game.bullets){let x=b.x+ox,y=b.y+oy;ctx.fillStyle='#e6ff99';ctx.shadowColor='#d5ff3f';ctx.shadowBlur=13;ctx.beginPath();ctx.arc(x,y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    for(const e of game.enemies){let x=e.x+ox,y=e.y+oy;ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.y-e.y,p.x-e.x));ctx.shadowColor=e.color;ctx.shadowBlur=e.boss?24:12;ctx.fillStyle=e.color;ctx.beginPath();if(e.boss){ctx.moveTo(e.rad,0);ctx.lineTo(e.rad*.45,e.rad*.48);ctx.lineTo(0,e.rad);ctx.lineTo(-e.rad*.45,e.rad*.48);ctx.lineTo(-e.rad,0);ctx.lineTo(-e.rad*.45,-e.rad*.48);ctx.lineTo(0,-e.rad);ctx.lineTo(e.rad*.45,-e.rad*.48);}else{ctx.moveTo(e.rad,0);ctx.lineTo(0,e.rad*.75);ctx.lineTo(-e.rad,0);ctx.lineTo(0,-e.rad*.75);}ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff9';ctx.beginPath();ctx.arc(2,0,e.boss?3:2,0,Math.PI*2);ctx.fill();ctx.restore();if(e.boss){ctx.fillStyle='#ffffff40';ctx.fillRect(x-25,y-e.rad-9,50,3);ctx.fillStyle='#ff477c';ctx.fillRect(x-25,y-e.rad-9,50*Math.max(0,e.hp/e.maxHp),3);}}
    for(const q of game.particles){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x+ox,q.y+oy,q.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    // Player aura and directional glint
    const pulse=.5+.5*Math.sin(game.t*5);ctx.strokeStyle=`rgba(213,255,63,${.17+pulse*.11})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,22+pulse*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d5ff3f';ctx.shadowColor='#d5ff3f';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(cx,cy,p.rad,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#f8ffe1';ctx.beginPath();ctx.arc(cx-3,cy-3,4,0,Math.PI*2);ctx.fill();if(p.invuln>0){ctx.strokeStyle='#ffb3c5aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,19,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
    const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.22,W/2,H/2,Math.max(W,H)*.75);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#05060b99');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  }
  function loop(now){if(mode!=='playing'||!game)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;if(!game.choice&&!game.paused)update(dt);draw();if(mode==='playing'&&!game.choice&&!game.paused)raf=requestAnimationFrame(loop);}
  function endRun(survived){if(mode!=='playing')return;mode='ended';cancelAnimationFrame(raf);const g=game;let reward=Math.floor(g.t*.65+g.kills*.45+g.level*2)+(survived?100:0);reward=Math.max(5,reward);g.coinsEarned=reward;save.coins+=reward;save.bestTime=Math.max(save.bestTime,Math.floor(g.t));save.bestLevel=Math.max(save.bestLevel,g.level);saveData();updateHome();$('endTitle').innerHTML=survived?'YOU HELD<br><span>THE LINE.</span>':'THE SWARM<br><span>GOT YOU.</span>';$('endSubtitle').textContent=survived?'Sector cleared. But the void is endless.':'Every second counts. Gear up and go again.';$('endTime').textContent=formatTime(g.t);$('endKills').textContent=g.kills;$('endLevel').textContent=g.level;$('endCoins').textContent=`+${reward}`;$('endOverlay').classList.remove('hidden');}
  $('playButton').onclick=startRun;$('retryButton').onclick=startRun;$('armoryButton').onclick=()=>{mode='armory';showScreen('armory');drawArmory()};$('backButton').onclick=setHome;$('homeButton').onclick=()=>{if(mode==='playing'){if(confirm('End this run and return home?'))endRun(false);}else setHome()};$('pauseButton').onclick=()=>{if(mode!=='playing')return;game.paused=true;cancelAnimationFrame(raf);$('pauseOverlay').classList.remove('hidden')};$('resumeButton').onclick=()=>{if(!game)return;game.paused=false;$('pauseOverlay').classList.add('hidden');last=performance.now();raf=requestAnimationFrame(loop)};$('quitButton').onclick=()=>endRun(false);$('endHomeButton').onclick=setHome;
  $('soundButton').onclick=()=>{soundOn=!soundOn;$('soundButton').style.color=soundOn?'#9295a4':'#ff598f';$('soundButton').textContent=soundOn?'♫':'×'};
  window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='Escape'&&mode==='playing')$('pauseButton').click()});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>{keys={};if(mode==='playing'&&game&&!game.choice){game.paused=true;$('pauseOverlay').classList.remove('hidden');cancelAnimationFrame(raf)}});
  const stick=$('joystick'),knob=$('joyKnob');function joyMove(e){if(!joy.active)return;let r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),lim=r.width*.34,d=Math.hypot(dx,dy);if(d>lim){dx=dx/d*lim;dy=dy/d*lim;}joy.x=dx/lim;joy.y=dy/lim;knob.style.left=`${50+joy.x*34}%`;knob.style.top=`${50+joy.y*34}%`;}
  stick.addEventListener('pointerdown',e=>{e.preventDefault();joy.active=true;joy.pointer=e.pointerId;stick.setPointerCapture(e.pointerId);joyMove(e)});stick.addEventListener('pointermove',joyMove);function joyEnd(){joy.active=false;joy.x=joy.y=0;knob.style.left='50%';knob.style.top='50%'}stick.addEventListener('pointerup',joyEnd);stick.addEventListener('pointercancel',joyEnd);
  window.addEventListener('resize',()=>{if(mode==='playing')resize()});
  updateHome();showScreen('home');
})();
