// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════
function setBar(id, val, miniId) {
  const b = document.getElementById(id);
  const v = document.getElementById('val'+id.replace('bar',''));
  if(b){ b.style.width=val+'%'; val<25?b.classList.add('critical'):b.classList.remove('critical'); }
  if(v) v.textContent = Math.floor(val);
  if(miniId){ const m=document.getElementById(miniId); if(m) m.style.width=val+'%'; }
  // higiene também afeta barFome cor (fica mais escura com sujeira)
}

function updateAllUI() {
  setBar('barFome',    vitals.fome);
  setBar('barHumor',   vitals.humor);
  setBar('barEnergia', vitals.energia);
  setBar('barSaude',   vitals.saude);
  setBar('barHigiene', vitals.higiene, null);
  const xpNeeded = xpParaNivel(nivel);
  const xpPctReal = Math.min(100,(xp/xpNeeded)*100);
  document.getElementById('xpFill').style.width = xpPctReal+'%';
  document.getElementById('xpTxt').textContent  = `${Math.floor(xp)}/${xpNeeded}`;
  document.getElementById('nivelTxt').textContent = `NÍVEL ${nivel}`;
  // Vínculo
  const vt = getVinculoTier();
  const vNext = VINCULO_TIERS.find(t => t.min > vinculo);
  const vPrev = vt.min;
  const vPct  = vNext ? Math.min(100, ((vinculo - vPrev) / (vNext.min - vPrev)) * 100) : 100;
  const vFill = document.getElementById('vinculoFill');
  const vTxt  = document.getElementById('vinculoTxt');
  if(vFill) { vFill.style.width = vPct+'%'; vFill.style.background = `linear-gradient(90deg,${vt.cor},#c870e8)`; }
  if(vTxt)  vTxt.textContent = `${vt.label} · ${Math.floor(vinculo)}`;
  updateResourceUI();
  updateLifeEstimate();

  // Sincronizar estado dos botões de inventário
  // Ovos: habilitado se tem ovos no inventário (mesmo sem avatar chocado) OU se avatar vivo
  // Moedas: habilitado só com avatar vivo
  const _eggBtn  = document.getElementById('resOvosBtn');
  const _coinBtn = document.getElementById('resMoedasBtn');
  if(_eggBtn)  { (eggsInInventory.length > 0 || (hatched && !dead)) ? _eggBtn.classList.remove('disabled')  : _eggBtn.classList.add('disabled');  }
  if(_coinBtn) { hatched && !dead ? _coinBtn.classList.remove('disabled') : _coinBtn.classList.add('disabled'); }
}

function updateTimer() {
  const el = document.getElementById('timerTxt');
  if(!el) return;
  if(!hatched || !bornAt) { el.textContent = '📅 Dia 1'; return; }
  const dias = Math.floor((Date.now() - bornAt) / (1000 * 60 * 60 * 24));
  el.textContent = `📅 Dia ${dias + 1}`;
}

function updateResourceUI() {
  document.getElementById('resMonedas').textContent   = gs.moedas;
  const cristaisEl = document.getElementById('resCristais');
  if(cristaisEl) cristaisEl.textContent = gs.cristais || 0;
  document.getElementById('resOvos').textContent = eggsInInventory.length;
  const resItems = document.getElementById('resItems');
  if(resItems) resItems.textContent = itemInventory.length;
  const btn = document.getElementById('btnSummon');
  if(btn) btn.disabled = false; // summon always free
  document.getElementById('btnSummonLabel').textContent = '▶ Invocar Avatar (Gratuito)';
}

function showBubble(txt) {
  const b=document.getElementById('bubble');
  if(!b) return;
  b.textContent=txt; b.classList.add('show');
  clearTimeout(window._bt);
  window._bt=setTimeout(()=>b.classList.remove('show'),2200);
}

function showFloat(txt, color='#c9a84c') {
  const wrap=document.getElementById('creatureWrap');
  if(!wrap) return;
  const el=document.createElement('div');
  el.className='float-text'; el.textContent=txt; el.style.color=color;
  el.style.left='50%'; el.style.top='0';
  wrap.appendChild(el);
  setTimeout(()=>el.remove(),1500);
}

function playAnim(cls, persist=false) {
  const w=document.getElementById('creatureWrap');
  if(!w) return;
  w.className='creature-wrap '+cls;
  if(!persist) setTimeout(()=>resetAnim(),900);
}
function resetAnim() {
  const w=document.getElementById('creatureWrap');
  if(w) w.className='creature-wrap';
}

function addLog(msg, type='') {
  const list=document.getElementById('logList');
  const li=document.createElement('li');
  li.className='log-item '+type;
  const t=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  li.textContent=`[${t}] ${msg}`;
  list.insertBefore(li,list.firstChild);
  while(list.children.length>25) list.removeChild(list.lastChild);
}

// ═══════════════════════════════════════════
// STARS BACKGROUND
// ═══════════════════════════════════════════
(function(){
  const cv=document.getElementById('starCanvas');
  const ctx=cv.getContext('2d');
  let W,H,stars=[];
  function resize(){ W=cv.width=window.innerWidth; H=cv.height=window.innerHeight; }
  function init(){ stars=Array.from({length:160},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.1,a:Math.random(),sp:.002+Math.random()*.005})); }
  function draw(){
    ctx.clearRect(0,0,W,H);
    const now=Date.now()/1000;
    stars.forEach(s=>{ const al=.2+.5*Math.abs(Math.sin(now*s.sp+s.a*100)); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(200,190,240,${al})`; ctx.fill(); });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',()=>{ resize(); init(); });
  resize(); init(); draw();
})();


async function tryAutoReconnect() { /* desativado */ }

// Init

function updateLifeEstimate() {
  const el = document.getElementById('lifeEstimateTxt');
  if(!el) return;
  if(!hatched || dead || sleeping) { el.textContent = sleeping ? '💤 dormindo' : '—'; el.style.color = 'var(--muted)'; return; }

  const _d = rarityBonus().decay * GAME_SPEED;

  // Decay de saúde por ciclo quando vital está crítico — espelho exato do gametick.js
  let decayPerCycle = 0;
  if(vitals.fome    < 15) decayPerCycle += 0.3;
  if(vitals.humor   < 10) decayPerCycle += 0.1;
  if(vitals.energia < 5)  decayPerCycle += 0.1;
  if(vitals.higiene < 15) decayPerCycle += 0.04;
  if(dirtyLevel     >= 2) decayPerCycle += 0.04;

  if(decayPerCycle <= 0) {
    // Avatar saudável — estimar ciclos até cada vital atingir o limite crítico
    // Taxas reais do gametick.js (pós-rebalanceamento)
    const fomeDecay    = 0.8  * _d * getItemEffect('fomeDecayMult');
    const humorDecay   = 0.5  * _d;
    const energiaDecay = 0.6  * _d;
    const higieneDecay = 0.12 * GAME_SPEED;

    const cyclesUntilFomeCrit    = vitals.fome    > 15 ? (vitals.fome    - 15) / fomeDecay    : 0;
    const cyclesUntilHumorCrit   = vitals.humor   > 10 ? (vitals.humor   - 10) / humorDecay   : 0;
    const cyclesUntilEnergiaCrit = vitals.energia > 5  ? (vitals.energia - 5)  / energiaDecay : 0;
    const cyclesUntilHigieneCrit = vitals.higiene > 15 ? (vitals.higiene - 15) / higieneDecay : 0;

    const minCycles = Math.min(
      cyclesUntilFomeCrit    || Infinity,
      cyclesUntilHumorCrit   || Infinity,
      cyclesUntilEnergiaCrit || Infinity,
      cyclesUntilHigieneCrit || Infinity
    );

    if(minCycles === Infinity) { el.textContent = '✅ estável'; el.style.color = '#7ab87a'; return; }

    // Após o primeiro vital crítico, quantos ciclos até saúde = 0 com decay mínimo (fome → 0.3)
    const cyclesAfter = vitals.saude / 0.3;
    const totalSecs   = Math.round((minCycles + cyclesAfter) * 60);
    el.style.color    = totalSecs < 3600 ? '#e74c3c' : totalSecs < 7200 ? '#c9a84c' : '#7ab87a';
    el.textContent    = _fmtTime(totalSecs);
  } else {
    // Já em perigo — tempo direto até saúde = 0
    const cyclesLeft = vitals.saude / decayPerCycle;
    const secsLeft   = Math.round(cyclesLeft * 60);
    el.style.color   = secsLeft < 1800 ? '#e74c3c' : '#c9a84c';
    el.textContent   = _fmtTime(secsLeft);
  }
}

function _fmtTime(secs) {
  if(secs >= 86400) return Math.floor(secs/86400) + 'd ' + Math.floor((secs%86400)/3600) + 'h';
  if(secs >= 3600)  return Math.floor(secs/3600) + 'h ' + Math.floor((secs%3600)/60) + 'min';
  return Math.floor(secs/60) + 'min';
}

// ═══════════════════════════════════════════
// CREATURE CARD — preenche todos os campos
// ═══════════════════════════════════════════
function fillCreatureCard() {
  if(!avatar) return;
  const car   = avatar.car || CARACTERISTICAS_ELEMENTAIS[avatar.elemento] || null;
  const parts = avatar.nome.split(',');
  const nome  = parts[0].trim();
  const sufixo = parts.slice(1).join(',').trim();

  // Nome e sufixo separados
  document.getElementById('idNome').textContent   = nome;
  const sfx = document.getElementById('idSufixo');
  if(sfx) sfx.textContent = sufixo || '';

  // Elemento
  const meta = document.getElementById('idMeta');
  if(meta) meta.textContent = car ? `${car.emoji} ${avatar.elemento}` : avatar.elemento;

  // Badge de raridade
  const badge = document.getElementById('idBadge');
  if(badge) {
    badge.textContent  = avatar.raridade.toUpperCase();
    badge.className    = `badge badge-${avatar.raridade}`;
  }

  // Descrição com cor do elemento
  const descEl = document.getElementById('idDesc');
  if(descEl) {
    descEl.textContent            = avatar.descricao || '';
    descEl.style.borderLeftColor  = car ? car.cor : 'var(--border)';
    descEl.style.color            = car ? car.cor + 'bb' : '#887799';
  }

  // Bônus de raridade — compacto no rodapé
  const rb    = rarityBonus();
  const rbEl  = document.getElementById('rarityBonusTxt');
  if(rbEl) {
    if(avatar.raridade !== 'Comum') {
      rbEl.textContent  = `🥚×${rb.eggs} · ⚡×${rb.xp} XP · 💚-${Math.round((1-rb.decay)*100)}% decay`;
      rbEl.style.display = '';
    } else {
      rbEl.style.display = 'none';
    }
  }
}
