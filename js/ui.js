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
  const xpPct = Math.min(100,(xp/(100*nivel))*100);
  document.getElementById('xpFill').style.width = xpPct+'%';
  document.getElementById('xpTxt').textContent  = `${Math.floor(xp)}/${100*nivel}`;
  document.getElementById('nivelTxt').textContent = `NÍVEL ${nivel}`;
}

function updateTimer() {
  const h=Math.floor(totalSecs/3600), m=Math.floor((totalSecs%3600)/60), s=totalSecs%60;
  const t=document.getElementById('timerTxt');
  if(t) t.textContent=`⏱ ${p(h)}:${p(m)}:${p(s)}`;
}
function p(n){ return String(n).padStart(2,'0'); }

function updateResourceUI() {
  document.getElementById('resMonedas').textContent   = gs.moedas;
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
