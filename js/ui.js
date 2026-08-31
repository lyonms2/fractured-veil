// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════

// Mobile hero card: move #creatureCard para dentro de .device e usa
// display:contents + order para fundir animação e stats num único card.
(function() {
  let _heroReady = false;

  function setupMobileHero() {
    if (_heroReady) return;
    if (window.innerWidth > 768) return;
    const device = document.querySelector('.device');
    const cc     = document.getElementById('creatureCard');
    if (!device || !cc) return;

    // Move creatureCard para dentro de .device (após actionBtns)
    device.appendChild(cc);
    _heroReady = true;
  }

  function syncHeroClass() {
    const cc = document.getElementById('creatureCard');
    if (!cc) return;
    const visible = cc.style.display !== 'none';
    document.body.classList.toggle('fv-has-creature', visible);
    if (visible) setupMobileHero();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cc = document.getElementById('creatureCard');
    if (!cc) return;
    new MutationObserver(syncHeroClass).observe(cc, { attributes: true, attributeFilter: ['style'] });
    syncHeroClass();
  });
})();
function setBar(id, val, miniId) {
  // Suporte às novas barras do status-cards-grid (sci-fill) E às antigas (stat-fill)
  const b  = document.getElementById(id);
  const v  = document.getElementById('val' + id.replace('bar',''));
  if(b) {
    b.style.width = val + '%';
    val < 25 ? b.classList.add('critical') : b.classList.remove('critical');
  }
  if(v) v.textContent = Math.floor(val);
  if(miniId) { const m = document.getElementById(miniId); if(m) m.style.width = val + '%'; }
}

// ═══════════════════════════════════════════════════════════════════
// OS BOTÕES DIZEM-SE
//
// Antes ficavam todos iguais em qualquer estado — sem moedas, com a
// fome cheia, sem energia — e só o clique explicava porque não dava.
// Agora a linha de baixo diz o custo, ou a razão de estar apagado.
//
// Apagados mas CLICÁVEIS de propósito: o balão do bicho ("estou
// satisfeito!", "sem moedas...") é metade da graça do jogo, e cortar o
// clique cortava-o. O que muda é já não ser preciso clicar para saber.
//
// Serve as duas larguras: a barra inferior do celular já não existe
// (ver css/mobile-index.css:458) e o celular usa estes mesmos botões,
// inline no cartão do bicho.
// ═══════════════════════════════════════════════════════════════════
function estadoDasAccoes() {
  const vivo = (typeof hatched !== 'undefined' && hatched) &&
               (typeof dead !== 'undefined' && !dead) && !!avatar;
  if(!vivo) return null;
  const aDormir = (typeof sleeping !== 'undefined') && sleeping;
  const v = vitals, m = gs.moedas;

  return {
    feed:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : v.fome >= 100 ? { pode:false, sub:t('act.sub.cheio') }
         : m < CUSTO_NUTRIR ? { pode:false, sub:`${CUSTO_NUTRIR} 🪙`, semMoedas:true }
         : { pode:true, sub:`${CUSTO_NUTRIR} 🪙` },

    play:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : v.fome < 10 ? { pode:false, sub:t('act.sub.com_fome') }
         : v.energia < 10 ? { pode:false, sub:t('act.sub.sem_forcas') }
         : { pode:true, sub:'' },

    // Dormir nunca fica indisponível a dormir: é o botão de acordar.
    sleep: aDormir ? { pode:true, sub:'' }
         : v.energia >= 100 ? { pode:false, sub:t('act.sub.sem_sono') }
         : { pode:true, sub:'' },

    heal:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : (v.saude >= 100 && !sick) ? { pode:false, sub:t('act.sub.saudavel') }
         : m < CUSTO_MEDICAR ? { pode:false, sub:`${CUSTO_MEDICAR} 🪙`, semMoedas:true }
         : { pode:true, sub:`${CUSTO_MEDICAR} 🪙` },

    bath:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : v.energia < BANHO_ENERGIA ? { pode:false, sub:`${BANHO_ENERGIA} ⚡`, semForca:true }
         : v.higiene >= 100 ? { pode:false, sub:t('act.sub.limpo') }
         : { pode:true, sub:`−${BANHO_ENERGIA} ⚡` },
  };
}

function atualizarBotoesDeAccao() {
  const est = estadoDasAccoes();
  const pares = [['btnFeed','subFeed','feed'], ['btnPlay','subPlay','play'],
                 ['btnSleep','subSleep','sleep'], ['btnHeal','subHeal','heal'],
                 ['btnBath','subBath','bath']];
  for(const [btnId, subId, chave] of pares) {
    const btn = document.getElementById(btnId), sub = document.getElementById(subId);
    if(!btn) continue;
    const e = est && est[chave];
    btn.classList.toggle('indisponivel', !!(e && !e.pode));
    btn.classList.toggle('em-falta',     !!(e && (e.semMoedas || e.semForca)));
    if(sub) sub.textContent = e ? e.sub : '';
  }
}

function updateAllUI() {
  setBar('barFome',    vitals.fome);
  setBar('barHumor',   vitals.humor);
  setBar('barEnergia', vitals.energia);
  setBar('barSaude',   vitals.saude);
  setBar('barHigiene', vitals.higiene);

  const xpNeeded  = xpParaNivel(nivel);
  const xpPctReal = Math.min(100, (xp / xpNeeded) * 100);
  document.getElementById('xpFill').style.width = xpPctReal + '%';
  document.getElementById('xpTxt').textContent  = `${Math.floor(xp)}/${xpNeeded}`;
  document.getElementById('nivelTxt').textContent = t('ui.nivel', {n: nivel});

  // Vínculo
  const vt    = getVinculoTier();
  const vNext = VINCULO_TIERS.find(t => t.min > vinculo);
  const vPrev = vt.min;
  const vPct  = vNext ? Math.min(100, ((vinculo - vPrev) / (vNext.min - vPrev)) * 100) : 100;
  const vFill = document.getElementById('vinculoFill');
  const vTxt  = document.getElementById('vinculoTxt');
  if(vFill) { vFill.style.width = vPct + '%'; vFill.style.background = `linear-gradient(90deg,${vt.cor},#c870e8)`; }
  if(vTxt)  vTxt.textContent = `${vt.label} · ${Math.floor(vinculo)}`;

  updateResourceUI();
  updateLifeEstimate();
  atualizarBotoesDeAccao();

  // Botões de inventário
  const _eggBtn  = document.getElementById('resOvosBtn');
  const _coinBtn = document.getElementById('resMoedasBtn');
  // A mesma pergunta do updateHeaderButtons, e pela mesma razao: estes
  // botoes sao do JOGADOR. Uma copia escondia-os e esta desligava-os —
  // corrigir so a outra deixava-os visiveis e mortos.
  const _tem = (typeof jogadorTemCriatura === 'function') ? jogadorTemCriatura() : (hatched && !dead);
  if(_eggBtn)  { (eggsInInventory.length > 0 || _tem) ? _eggBtn.classList.remove('disabled')  : _eggBtn.classList.add('disabled');  }
  if(_coinBtn) { _tem ? _coinBtn.classList.remove('disabled') : _coinBtn.classList.add('disabled'); }
}

function updateResourceUI() {
  document.getElementById('resMonedas').textContent = gs.moedas;
  const cristaisEl = document.getElementById('resCristais');
  if(cristaisEl) cristaisEl.textContent = fmtC(gs.cristais || 0);
  document.getElementById('resOvos').textContent = eggsInInventory.length;
  const resItems = document.getElementById('resItems');
  if(resItems) resItems.textContent = itemInventory.length;
  // Era a pastilha do 🧬 e contava slots ocupados de disponíveis. O 🧬
  // saiu da fila de cima — a colônia mostra os avatares todos — e o
  // lugar dele é agora o ⚔. Portanto o número muda de pergunta: deixa
  // de ser "quantos bichos tenho" e passa a ser "quantos estão na
  // equipa", que é o que decide se dá para lutar.
  const resAv = document.getElementById('resEquipa');
  if(resAv) {
    const naEquipa = (typeof equipaIdx === 'function') ? equipaIdx().length : 0;
    const cabem    = (typeof COMBATE_EQUIPA_MAX === 'number') ? COMBATE_EQUIPA_MAX : 3;
    resAv.textContent = naEquipa + '/' + cabem;
  }
  const btn = document.getElementById('btnSummon');
  if(btn) btn.disabled = false;
  // As primeiras INVOCACOES_GRATIS são grátis; a partir daí o botão mostra o preço
  const _custoInv = typeof custoDaInvocacao === 'function' ? custoDaInvocacao() : 0;
  document.getElementById('btnSummonLabel').textContent =
    _custoInv > 0 ? t('ui.summon_btn_paid', { cost: _custoInv }) : t('ui.summon_btn');
  // Se o preço estiver fora do alcance, explica porquê e dá a saída
  if(typeof updateSummonLockHint === 'function') updateSummonLockHint();
  // FIX: atualiza visibilidade dos botões do header após qualquer mudança de estado
  if(typeof updateHeaderButtons === 'function' && walletAddress) updateHeaderButtons();
}

function showBubble(txt) {
  const b = document.getElementById('bubble');
  if(!b) return;
  b.textContent = txt; b.classList.add('show');
  clearTimeout(window._bt);
  window._bt = setTimeout(() => b.classList.remove('show'), 2200);
}

function showFloat(txt, color = '#c9a84c') {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'float-text'; el.textContent = txt; el.style.color = color;
  // Era top:0, o topo do wrap — o texto nascia acima da cabeça. A 22%
  // fica sobre a parte de cima do corpo, que é de onde faz sentido sair.
  el.style.left = '50%'; el.style.top = '22%';
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

let _currentAnim = null;
let _animTimeout = null;

/* Quanto tempo a classe fica posta.
   Era um valor fixo de 900ms para todas, e quatro animações duravam mais
   do que isso: curar 1s, antídoto e botar ovo 1,2s, banho 1,6s. A classe
   saía antes do fim e a animação voltava ao princípio de um salto — no
   banho perdiam-se 700ms, quase metade, e como ele tem `forwards` o
   estrago era o mais visível dos quatro.
   Agora pergunta-se ao próprio CSS. A animação pode estar no wrap (é o
   caso do banho) ou no svg lá dentro (todas as outras), por isso lê-se
   os dois e fica o maior. A margem de 60ms cobre o arredondamento e o
   atraso entre pôr a classe e o primeiro fotograma. */
function _paraMs(v) {
  const n = parseFloat(v);
  if (!isFinite(n)) return 0;
  return v.indexOf('ms') > -1 ? n : n * 1000;
}

function _duracaoDaAnim(w) {
  // Os ciclos infinitos (idle-float, av-respirar, av-bater…) não contam:
  // são o repouso, não a ação. Sem esta exclusão o banho media 3s — o
  // idle-float do svg, que continua a correr por baixo dele — em vez dos
  // 1,6s do bath-wobble, e a classe ficava posta quase o dobro do tempo.
  const naFila = [w, w.querySelector('svg'), ...w.querySelectorAll('[class*="av-"]')];
  let maior = 0;
  for (const el of naFila) {
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.animationName === 'none') continue;
    const durs   = cs.animationDuration.split(',');
    const delays = cs.animationDelay.split(',');
    const iters  = cs.animationIterationCount.split(',');
    durs.forEach((d, i) => {
      const rep = (iters[i] || iters[0] || '1').trim();
      if (rep === 'infinite') return;
      // O atraso conta: os membros escalonam pelo --i, e num Lendário de
      // oito braços o último começa quase meio segundo depois do primeiro.
      const total = _paraMs(d) * (parseFloat(rep) || 1)
                  + Math.max(0, _paraMs(delays[i] || delays[0] || '0'));
      if (isFinite(total)) maior = Math.max(maior, total);
    });
  }
  return maior > 0 ? maior + 60 : 900;
}

/* ═══════════════════════════════════════════════════════════════════
   GESTOS POR PARTE NAS AÇÕES

   Até aqui cada ação era um único transform no svg inteiro: o bicho
   escalava, rodava e saltava como um bloco rígido. As partes existiam
   (av-corpo, av-boca, av-asa, av-cauda, av-membro, av-olho-un, av-chifre)
   e só o repouso as usava.

   Cada entrada é [seletor, quadros, duração, atraso por índice, atraso
   base]. Corre por WAAPI com composite:'add', que SOMA ao que o CSS já
   está fazendo — sem isso a reação matava a animação de repouso da parte,
   porque o `animation` do CSS só guarda um valor. Foi a parede em que
   bati no mini-avatar e a saída é a mesma.

   Nenhum gesto assume que a parte existe. Chifres vão de 0 a 4, asas só
   da fase 3 para cima e com 70% de chance, cauda e tentáculos podem
   faltar, olhos são 1 a 3 — o querySelectorAll devolve lista vazia e o
   gesto simplesmente não acontece naquela parte.

   A AMPLITUDE MEDE-SE CONTRA O TAMANHO DO BICHO, não se escolhe por
   parecer um número razoável — e o tamanho do bicho MUDA com a fase.

   FASE_SIZES = [75, 100, 120, 140] (js/state.js): o svg é desenhado
   entre 75px em bebê e 140px em adulto. A primeira versão destes gestos
   foi medida a 240px, quase o dobro do adulto e mais do triplo do bebê,
   e por isso os números pareciam bons e no jogo não se via nada. Ao
   tamanho real, o que eu julgava serem 14px eram 6.

   Ao tamanho verdadeiro, num Lendário:

     peça          fase 0 (75px)   fase 3 (140px)
     av-boca         19x3            27x4
     av-membro       13x11           24x20
     av-olho-un       8x8            15x15
     av-asa          45x12           81x22

   A boca tem TRÊS pixels de altura em bebê. É a razão de os gestos se
   pensarem em unidades do viewBox e não em pixels: uma rotação é um
   ângulo e já sai proporcional sozinha, e a boca calcula a abertura como
   fração da altura do viewBox. Assim o gesto ocupa a mesma percentagem
   do bicho em todas as fases — que é o que faz um bebê parecer um bebê
   e não um adulto encolhido.

   Alvo: o gesto move ~10% da altura do bicho. Abaixo de 6% não se vê.
═══════════════════════════════════════════════════════════════════ */
const _AV_ACAO_GESTOS = {
  // Comer: duas mordidas, e a boca ABRE. A primeira versão fechava-a, que
  // é o contrário do gesto, e com uma amplitude que numa boca de 7px dava
  // 2,5px — invisível.
  //
  // A boca é a peça mais chata de animar, por duas razões que só se veem
  // ao olhar para o gerador:
  //
  //  1. O tamanho varia muito com o tipo sorteado. Medido em cinco seeds:
  //     46x7, 46x5, 46x6, 28x9 e 33x22. Um scaleY fixo que abre bem um
  //     traço de 5px transforma a elipse de 22 num disparate. Por isso os
  //     quadros são calculados na hora a partir do bbox da própria peça,
  //     com alvo de ~14px de abertura em qualquer caso.
  //
  //  2. A origem tem de ir para o topo. O .av-boca herda
  //     transform-origin:center, e escalar a partir do centro faz a boca
  //     crescer para cima E para baixo ao mesmo tempo — lê-se como um
  //     traço a engordar, não como uma boca a abrir. Com a origem no topo
  //     cai só o lábio de baixo, que é o que uma boca faz. A regra está
  //     em css/screen.css, presa ao .anim-eat.
  comer: [
    ['.av-boca', (el) => {
      let alt = 8, vbH = 220;
      try {
        alt = el.getBBox().height || 8;
        const vb = el.ownerSVGElement && el.ownerSVGElement.viewBox.baseVal;
        if (vb && vb.height) vbH = vb.height;   // 200 até à fase 1, 260 depois
      } catch (_) {}
      // Abre 11% da altura do viewBox. Em unidades, não em pixels: assim a
      // boca do bebê abre a mesma fração da cara que a do adulto.
      // O teto existe porque a boca é quase sempre um traço com contorno,
      // e o contorno escala junto — passando de ~3.5x deixa de ser uma
      // boca a abrir e passa a ser uma mancha.
      const k = Math.min(3.5, Math.max(1.6, 1 + (vbH * 0.11) / alt));
      return [{transform:'scaleY(1)'}, {transform:`scaleY(${k.toFixed(2)})`},
              {transform:'scaleY(0.8)'}, {transform:`scaleY(${(1 + (k-1)*0.75).toFixed(2)})`},
              {transform:'scaleY(1)'}];
    }, 640, 0, 0],
    ['.av-olho-un', [{transform:'scaleY(1)'},{transform:'scaleY(0.5)'},{transform:'scaleY(1)'}], 640, 0, 180],
    ['.av-membro',  [{transform:'rotate(0)'},{transform:'rotate(-26deg)'},{transform:'rotate(0)'}], 640, 45, 0],
  ],

  // Carinho: olhos em fenda de contentamento e rabo depressa.
  carinho: [
    ['.av-olho-un', [{transform:'scaleY(1)'},{transform:'scaleY(0.3)'},{transform:'scaleY(0.4)'},
                     {transform:'scaleY(1)'}], 620, 0, 0],
    ['.av-cauda',   [{transform:'rotate(0)'},{transform:'rotate(-14deg)'},{transform:'rotate(12deg)'},
                     {transform:'rotate(-9deg)'},{transform:'rotate(0)'}], 620, 0, 0],
    ['.av-asa',     [{transform:'scaleY(1)'},{transform:'scaleY(1.16)'},{transform:'scaleY(1)'}], 620, 0, 0],
  ],

  // Curar: alívio. Os olhos arregalam-se, os braços largam a tensão.
  curar: [
    ['.av-olho-un', [{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}], 900, 0, 0],
    ['.av-membro',  [{transform:'rotate(20deg)'},{transform:'rotate(-13deg)'},{transform:'rotate(0)'}], 900, 50, 0],
    ['.av-corpo',   [{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}], 900, 0, 0],
  ],

  // Antídoto: o efeito PERCORRE o corpo em vez de acender tudo junto.
  // Peito aos 0ms, membros aos 140, asas aos 220, cauda aos 300,
  // chifres aos 360 — de dentro para fora, que é como se lê uma cura
  // a espalhar-se.
  antidoto: [
    ['.av-corpo',   [{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}], 520, 0,   0],
    ['.av-membro',  [{transform:'rotate(0)'},{transform:'rotate(-30deg)'},{transform:'rotate(0)'}], 520, 40, 140],
    ['.av-asa',     [{transform:'scaleY(1)'},{transform:'scaleY(1.24)'},{transform:'scaleY(1)'}], 520, 0, 220],
    ['.av-cauda',   [{transform:'rotate(0)'},{transform:'rotate(13deg)'},{transform:'rotate(0)'}], 520, 0, 300],
    ['.av-chifre',  [{transform:'scale(1)'},{transform:'scale(1.28)'},{transform:'scale(1)'}], 520, 0, 360],
  ],

  // Banho: sacudir a água. Rápido, curto e alternado — asas e cauda dão
  // o estalo, os olhos fecham-se contra os salpicos.
  banho: [
    ['.av-asa',     [{transform:'scaleY(1)'},{transform:'scaleY(1.3) rotate(-6deg)'},
                     {transform:'scaleY(0.9) rotate(4deg)'},{transform:'scaleY(1)'}], 900, 0, 120],
    ['.av-cauda',   [{transform:'rotate(0)'},{transform:'rotate(-18deg)'},{transform:'rotate(15deg)'},
                     {transform:'rotate(-8deg)'},{transform:'rotate(0)'}], 900, 0, 0],
    ['.av-olho-un', [{transform:'scaleY(1)'},{transform:'scaleY(0.2)'},{transform:'scaleY(0.2)'},
                     {transform:'scaleY(1)'}], 900, 0, 0],
    ['.av-membro',  [{transform:'rotate(0)'},{transform:'rotate(29deg)'},{transform:'rotate(-20deg)'},
                     {transform:'rotate(0)'}], 900, 55, 60],
  ],

  // Brincar: energia. Tudo para cima ao mesmo tempo.
  brincar: [
    ['.av-olho-un', [{transform:'scale(1)'},{transform:'scale(1.4)'},{transform:'scale(1)'}], 760, 0, 0],
    ['.av-membro',  [{transform:'rotate(0)'},{transform:'rotate(-36deg)'},{transform:'rotate(25deg)'},
                     {transform:'rotate(0)'}], 760, 60, 0],
    ['.av-cauda',   [{transform:'rotate(0)'},{transform:'rotate(-16deg)'},{transform:'rotate(12deg)'},
                     {transform:'rotate(0)'}], 760, 0, 0],
    ['.av-asa',     [{transform:'scaleY(1)'},{transform:'scaleY(1.3)'},{transform:'scaleY(1)'}], 760, 0, 0],
  ],
};

/* Qual gesto acompanha qual classe. Fica aqui e não espalhado pelos
   sítios que chamam o playAnim: uma ação nova ganha o gesto pondo uma
   linha nesta tabela. As que não estão (poop, layegg, sad, dead) não
   têm gesto de propósito. */
const _GESTO_POR_ANIM = {
  'anim-eat':      'comer',
  'anim-pet':      'carinho',
  'anim-play':     'brincar',
  'anim-heal':     'curar',
  'anim-antidote': 'antidoto',
  'anim-clean':    'banho',
};

function playAnim(cls, persist = false) {
  const w = document.getElementById('creatureWrap');
  if(!w) return;
  // Remove animação anterior sem tocar nas classes persistentes (diseased, dirty-creature, sleeping…)
  if(_currentAnim) { w.classList.remove(_currentAnim); }
  clearTimeout(_animTimeout);
  _currentAnim = cls;
  _animTimeout = null;
  w.classList.add(cls);

  // As partes reagem por cima do que o corpo inteiro está fazendo. Corre
  // depois de pôr a classe para que o composite:'add' some sobre o estado
  // certo, e num try porque um browser sem WAAPI deve perder o gesto, não
  // a ação.
  const gesto = _GESTO_POR_ANIM[cls];
  if (gesto && typeof avatarPartesReagem === 'function') {
    const svg = w.querySelector('svg');
    if (svg) avatarPartesReagem(svg, _AV_ACAO_GESTOS[gesto]);
  }

  if(!persist) {
    _animTimeout = setTimeout(() => {
      w.classList.remove(cls);
      if(_currentAnim === cls) _currentAnim = null;
      _animTimeout = null;
    }, _duracaoDaAnim(w));
  }
}
function resetAnim() {
  const w = document.getElementById('creatureWrap');
  clearTimeout(_animTimeout);
  if(w && _currentAnim) w.classList.remove(_currentAnim);
  _currentAnim = null;
  _animTimeout = null;
}

function addLog(msg, type = '') {
  const list = document.getElementById('logList');
  const li   = document.createElement('li');
  li.className = 'log-item ' + type;
  const t = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  li.textContent = `[${t}] ${msg}`;
  list.insertBefore(li, list.firstChild);
  while(list.children.length > 25) list.removeChild(list.lastChild);
}

// ═══════════════════════════════════════════
// STARS BACKGROUND
// ═══════════════════════════════════════════
(function(){
  const cv = document.getElementById('starCanvas');
  if(!cv) return;

  const isMobile   = window.innerWidth <= 680;
  const STAR_COUNT = isMobile ? 60 : 140;

  const ctx = cv.getContext('2d');
  let W, H, stars = [], rafId = null, paused = false;

  function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  /* AS ESTRELAS PISCAM.

     Antes todas seguiam a mesma conta: alpha = .2 + .5·|sin(t·sp)|,
     com sp entre .002 e .007. Em segundos, isso é um ciclo de 15 a 52
     MINUTOS — na prática um céu parado, com brilhos fixos e diferentes.
     Bonito, e imóvel.

     Agora cada estrela tem o seu ciclo, a sua fase e a sua janela de
     brilho. A janela é a fatia do ciclo em que ela acende: fora dela
     está no brilho de repouso, dentro dela sobe e desce por um seno
     meio, que dá um acender suave em vez de um interruptor.

     Só uma em cada quatro é PISCADORA — repouso zero, portanto some
     mesmo e volta. As outras ficam de fundo, com um brilho baixo e
     constante. Um céu inteiro a piscar não é um céu, é ruído: são as
     paradas que fazem as outras notar-se. */
  function novaEstrela() {
    const piscadora = Math.random() < 0.28;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.1,
      // Repouso: as piscadoras desaparecem, as de fundo ficam ténues.
      base:   piscadora ? 0 : 0.16 + Math.random() * 0.26,
      pico:   piscadora ? 0.60 + Math.random() * 0.40 : 0.38 + Math.random() * 0.22,
      // Segundos por ciclo. Nada de números redondos e nada igual ao
      // lado, senão o olho apanha o padrão e o céu vira relógio.
      ciclo:  piscadora ? 2.5 + Math.random() * 8.5 : 5 + Math.random() * 11,
      // Que fatia do ciclo passa acesa.
      janela: piscadora ? 0.10 + Math.random() * 0.20 : 0.45 + Math.random() * 0.2,
      fase:   Math.random(),
    };
  }
  function init() { stars = Array.from({length: STAR_COUNT}, novaEstrela); }
  function draw() {
    if(paused) return;
    ctx.clearRect(0, 0, W, H);
    const now = Date.now() / 1000;
    stars.forEach(s => {
      const t = ((now / s.ciclo) + s.fase) % 1;
      const k = t < s.janela ? Math.sin((t / s.janela) * Math.PI) : 0;
      const al = s.base + (s.pico - s.base) * k;
      // Apagada é apagada: poupa um arco e um fill por estrela e por
      // quadro, que com 140 delas a 60fps não é nada de desprezar.
      if(al <= 0.012) return;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,190,240,${al})`; ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) {
      paused = true;
      if(rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      paused = false;
      draw();
    }
  });

  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
})();

async function tryAutoReconnect() { /* desativado */ }

// ═══════════════════════════════════════════
// VIDA ESTIMADA
// ═══════════════════════════════════════════
function updateLifeEstimate() {
  const el = document.getElementById('lifeEstimateTxt');
  if(!el) return;
  if(!hatched || dead || sleeping) { el.textContent = sleeping ? t('ui.sleeping') : '—'; el.style.color = 'var(--muted)'; return; }

  // A saúde só cai por doença ativa (ver js/gametick.js), então o tempo de
  // vida estimado é: ciclos até um vital ficar crítico + ciclos de descuido
  // sustido até a doença ativar (DISEASE_STRESS_THRESHOLD) + ciclos até a
  // saúde esgotar sob o dreno da doença (DISEASE_DECAY_PER_CYCLE).
  if(activeDiseases.length > 0) {
    const secsLeft = Math.round((vitals.saude / (DISEASE_DECAY_PER_CYCLE * activeDiseases.length)) * 60);
    el.style.color  = secsLeft < 1800 ? '#e74c3c' : '#c9a84c';
    el.textContent  = _fmtTime(secsLeft);
    return;
  }

  const _d = rarityBonus().decay * GAME_SPEED;
  const vitalDecay = {
    energia: 0.6  * _d,
    fome:    0.8  * _d * getItemEffect('fomeDecayMult'),
    higiene: 0.12 * GAME_SPEED,
    humor:   0.5  * _d,
  };

  let minCyclesUntilDisease = Infinity;
  for(const id in DISEASES) {
    const { vital, limiar } = DISEASES[id];
    const current = vitals[vital];
    const cyclesUntilCrit = current > limiar ? (current - limiar) / vitalDecay[vital] : 0;
    const stressCyclesLeft = cyclesUntilCrit > 0
      ? DISEASE_STRESS_THRESHOLD
      : Math.max(0, DISEASE_STRESS_THRESHOLD - diseaseStress[id]);
    minCyclesUntilDisease = Math.min(minCyclesUntilDisease, cyclesUntilCrit + stressCyclesLeft);
  }

  if(minCyclesUntilDisease === Infinity) { el.textContent = t('ui.stable'); el.style.color = '#7ab87a'; return; }

  const cyclesAfterDisease = vitals.saude / DISEASE_DECAY_PER_CYCLE;
  const totalSecs = Math.round((minCyclesUntilDisease + cyclesAfterDisease) * 60);
  el.style.color  = totalSecs < 3600 ? '#e74c3c' : totalSecs < 7200 ? '#c9a84c' : '#7ab87a';
  el.textContent  = _fmtTime(totalSecs);
}

function _fmtTime(secs) {
  if(secs >= 86400) return Math.floor(secs/86400) + 'd ' + Math.floor((secs%86400)/3600) + 'h';
  if(secs >= 3600)  return Math.floor(secs/3600)  + 'h ' + Math.floor((secs%3600)/60)    + 'min';
  return Math.floor(secs/60) + 'min';
}

// ═══════════════════════════════════════════
// CREATURE CARD
// ═══════════════════════════════════════════
function fillCreatureCard() {
  if(!avatar) return;
  const car   = avatar.car || CARACTERISTICAS_ELEMENTAIS[avatar.elemento] || null;
  const parts = avatar.nome.split(',');
  const nome  = parts[0].trim();
  const sufixo = parts.slice(1).join(',').trim();

  document.getElementById('idNome').textContent = nome;
  const sfx = document.getElementById('idSufixo');
  if(sfx) sfx.textContent = sufixo || '';

  const meta = document.getElementById('idMeta');
  if(meta) meta.textContent = car ? `${car.emoji} ${avatar.elemento}` : avatar.elemento;

  const badge = document.getElementById('idBadge');
  if(badge) {
    badge.textContent = avatar.raridade.toUpperCase();
    badge.className   = `badge badge-${avatar.raridade}`;
  }

  const descEl = document.getElementById('idDesc');
  if(descEl) {
    descEl.textContent           = (avatar.descricaoIdx != null ? getAvatarDesc(avatar.raridade, avatar.elemento, avatar.descricaoIdx) : avatar.descricao) || '';
    descEl.style.borderLeftColor = car ? car.cor : 'var(--border)';
    descEl.style.color           = car ? car.cor + 'bb' : '#887799';
  }

  const bonusBlock = document.getElementById('elemBonusBlock');
  const bonusTxt   = document.getElementById('elemBonusTxt');
  const bonusLabel = document.getElementById('elemBonusLabel');
  // `car` sozinho basta como porteiro: um avatar antigo com um elemento
  // que já não existe não tem entrada aqui, e o bloco não aparece — que
  // era exatamente o que o antigo `car?.bonus` fazia.
  if(bonusBlock && bonusTxt && car) {
    bonusTxt.textContent              = t('elem.bonus.' + avatar.elemento);
    bonusTxt.style.color              = car.cor + 'cc';
    bonusLabel.style.color            = car.cor;
    bonusBlock.style.borderColor      = car.cor + '33';
    bonusBlock.style.backgroundColor  = car.cor + '0d';
    bonusBlock.style.display          = '';
  } else if(bonusBlock) {
    bonusBlock.style.display = 'none';
  }

  const rb   = rarityBonus();
  const rbEl = document.getElementById('rarityBonusTxt');
  if(rbEl) {
    if(avatar.raridade !== 'Comum') {
      rbEl.textContent   = t('ui.rarity_bonus', {eggs: rb.eggs, xp: rb.xp, decay: Math.round((1-rb.decay)*100)});
      rbEl.style.display = '';
    } else {
      rbEl.style.display = 'none';
    }
  }

  // Stripe de raridade no topo do card
  const stripe = document.getElementById('creatureCardStripe');
  if(stripe) {
    stripe.className = `creature-card-stripe stripe-${avatar.raridade}`;
  }

  // Badge "ATIVO · SLOT X"
  const badge2 = document.getElementById('idBadge2');
  if(badge2) {
    badge2.textContent = t('ui.active_slot', {n: activeSlotIdx + 1});
  }

  // Badge ⚖️ JURADO
  let _jb = document.getElementById('idBadgeJurado');
  if(gs?.jurado) {
    if(!_jb) {
      _jb = document.createElement('span');
      _jb.id = 'idBadgeJurado';
      _jb.style.cssText = "font-size:0.4375rem;font-family:'Cinzel',serif;color:#a78bfa;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.08);padding:0.125rem 0.375rem;border-radius:0.375rem;letter-spacing:0.03125rem;flex-shrink:0;";
      _jb.textContent = '⚖️ JURADO';
      const _row = document.getElementById('idBadgesRow');
      if(_row) _row.insertBefore(_jb, document.getElementById('nivelTxt'));
    }
  } else if(_jb) { _jb.remove(); }
}

function updatePhaseLabel() {
  const _pl = document.getElementById('phaseLabel');
  if(!_pl) return;
  const fase = FASES[getFase()];
  _pl.textContent = t('gt.phase.label', {fase});
  const cls = { 'BEBÊ':'bebe', 'CRIANÇA':'crianca', 'JOVEM':'jovem', 'ADULTO':'adulto' };
  _pl.className = 'phase-label fase-' + (cls[fase] || 'bebe');
}

// ═══════════════════════════════════════════
// SICK VISUALS
// ═══════════════════════════════════════════
/* AS DOENÇAS, À VISTA.

   Isto era chamado de um sítio só que interessasse: o gameTick — e
   DEPOIS do `tickCount % 60`, portanto uma vez por minuto. Trocar de
   avatar não o chamava, e o `tickCount` nunca reinicia: entrava-se
   num avatar doente e as etiquetas eram as do avatar ANTERIOR até
   calhar a próxima fronteira dos 60 — até 59 segundos depois.

   O rebuildScreensParaSlot já refrescava a sujidade, os itens
   equipados e o sono na troca. As doenças eram a única coisa por
   avatar que ficava de fora da lista.

   Agora corre a cada segundo, e a assinatura trata de que isso não
   custe nada: só toca no DOM quando o que há para mostrar mudou. Sem
   ela, reescrever as etiquetas 60 vezes por minuto reiniciava-lhes a
   animação de entrada e elas piscavam para sempre. */
function updateSickVisuals() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  const isSick = (activeDiseases.length > 0 || sick) && hatched && !dead;
  wrap.classList.toggle('diseased', isSick);

  // Badges de doenças — injectadas por baixo do statusCard
  let badgesEl = document.getElementById('diseaseBadges');
  if(!badgesEl) {
    badgesEl = document.createElement('div');
    badgesEl.id = 'diseaseBadges';
    badgesEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.25rem;padding:0.125rem 0.5rem 0.375rem;justify-content:center;';
    const statusCard = document.getElementById('statusCard');
    if(statusCard) statusCard.insertAdjacentElement('afterend', badgesEl);
  }

  if(!hatched || dead || (activeDiseases.length === 0 && !sick)) {
    if(badgesEl.innerHTML !== '') badgesEl.innerHTML = '';
    badgesEl.dataset.assinatura = 'nenhuma';
    return;
  }

  // O que está para mostrar, resumido: se não mudou, não se mexe.
  const assinatura = activeDiseases.join(',') + '|' + (sick ? 1 : 0);
  if(badgesEl.dataset.assinatura === assinatura) return;
  badgesEl.dataset.assinatura = assinatura;

  const badges = [];
  if(sick && activeDiseases.length === 0) {
    badges.push(`<span class="disease-badge" style="--d-cor:#e05050;">🤒 Doente</span>`);
  }
  activeDiseases.forEach(id => {
    const d = DISEASES[id];
    if(d) badges.push(`<span class="disease-badge" style="--d-cor:${d.cor};">${d.emoji} ${d.nome}</span>`);
  });
  badgesEl.innerHTML = badges.join('');
}

// ═══════════════════════════════════════════
// EQUIPPED ITEMS DISPLAY
// ═══════════════════════════════════════════
function updateEquippedDisplay() {
  const wrap = document.getElementById('equippedItemsDisplay');
  if(!wrap) return;
  const equipped = getEquippedItems();
  wrap.innerHTML = equipped.map(item =>
    `<span style="position:absolute;font-size:0.6875rem;opacity:.7;pointer-events:none;" title="${item.nome}">${item.emoji}</span>`
  ).join('');
}

// ═══════════════════════════════════════════════════════════════════
// RECONSTRUIR ECRÃS AO TROCAR DE SLOT
//
// A lógica que decide qual tela mostrar (inicial / ovo / vivo / morto)
// só existia dentro do _onLoginSuccess, portanto trocar de slot mudava
// o estado mas deixava a interface a mostrar o avatar anterior — só um
// refresh à página é que corrigia.
//
// Chamada pelo switchSlot() em state.js.
// ═══════════════════════════════════════════════════════════════════
function rebuildScreensParaSlot() {
  const $ = id => document.getElementById(id);
  const set = (id, v) => { const el = $(id); if(el) el.style.display = v; };
  const btns = $('actionBtns');

  /* ── SAIR DA COLÔNIA A SÉRIO, E NÃO PELA METADE ──

     Cada ramo aqui em baixo punha o #fazendaScreen a none e dava-se por
     satisfeito. Mas a colônia não é só esse elemento: o abrirFazenda
     também põe a classe `fz-modo` no #mainScreen e `fz-colonia` no body,
     e esconde a fila dos botões de cuidar.

     O `fz-modo` faz do ecrã um flex de altura automática com um mínimo
     de 9rem, para a lista da colônia poder encolher. Os outros ecrãs são
     absolutos com inset:0 e não alimentam essa altura — portanto, com a
     classe de pé e a colônia escondida, o que fica é uma caixa vazia.

     Medido: queimar um avatar na colônia e carregar em "usar este slot"
     dava um #summonCard de 0×0 dentro de um #mainScreen de 2×144. Um
     ecrã sem nada, sem saída, e um refresh à página corrigia — porque aí
     o modo colônia não é reposto.

     O fzSairDaColonia já fazia esta limpeza toda, e o comentário dele
     avisa: "duas cópias de uma saída, e a segunda esquecia-se de
     metade". Esta era a terceira. Fica no topo e não em cada ramo, para
     não haver uma quarta — e por isso os ramos que querem o cartão da
     criatura escondido continuam a poder escondê-lo, que correm depois. */
  if (typeof fzSairDaColonia === 'function') fzSairDaColonia();

  if(!avatar) {
    // Slot vazio — volta à tela inicial com o painel de invocar
    set('idleScreen','flex'); set('eggScreen','none');
    set('aliveScreen','none'); set('deadScreen','none'); set('fazendaScreen','none');
    set('creatureCard','none'); set('statusCard','none');
    set('summonCard','block');
    if(walletAddress) set('summonSection','block');
    const b = $('btnSummon'); if(b) b.disabled = false;
    if(btns) { btns.style.opacity = '0'; btns.style.pointerEvents = 'none'; }
    const pc = $('poopContainer'); if(pc) pc.innerHTML = '';
    if(typeof updateResourceUI === 'function') updateResourceUI();
    return;
  }

  if(dead) {
    set('idleScreen','none'); set('eggScreen','none');
    set('aliveScreen','none'); set('deadScreen','flex'); set('fazendaScreen','none');
    set('summonCard','none'); set('creatureCard','none'); set('statusCard','none');
    if(btns) { btns.style.opacity = '0'; btns.style.pointerEvents = 'none'; }
    if(typeof updateResourceUI === 'function') updateResourceUI();
    return;
  }

  if(!hatched) {
    // Ovo por chocar — setupAvatar já põe as telas certas
    if(typeof setupAvatar === 'function') setupAvatar();
    if(typeof updateResourceUI === 'function') updateResourceUI();
    return;
  }

  // Avatar vivo
  if(typeof setupAvatar === 'function') setupAvatar();
  set('idleScreen','none'); set('eggScreen','none');
  set('aliveScreen','block'); set('deadScreen','none'); set('fazendaScreen','none');
  set('summonCard','none'); set('creatureCard','block'); set('statusCard','block');
  // O display entra aqui porque a colonia o poe a none: sem o repor,
  // quem entrasse numa criatura ficava sem os botoes de cuidar.
  if(btns) { btns.style.display = ''; btns.style.opacity = '1'; btns.style.pointerEvents = 'all'; }
  const svg = $('creatureSVG');
  if(svg) svg.innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed,
                                   getFaseSize(), getFaseSize(), getFaseVisual());
  if(typeof updateAvatarSize === 'function') updateAvatarSize();
  const pl = $('phaseLabel');
  if(pl) pl.textContent = t('gt.phase.label', {fase: FASES[getFaseVisual()]});
  /* O cocó do avatar em que se entra tem de voltar ao chão.

     O restaurarCocos() só era chamado no login. Enquanto apenas o
     avatar aberto sujava a casa isso passava despercebido — quem
     entrava noutro nunca tinha nada para lhe mostrar. Agora que a
     colônia inteira suja, entrar num avatar sujo e ver o chão limpo
     seria a interface a contradizer a própria lista. */
  const pc = $('poopContainer'); if(pc) pc.innerHTML = '';
  if(typeof restaurarCocos === 'function' && poopCount > 0) restaurarCocos();
  if(typeof updateDirtyVisuals === 'function') updateDirtyVisuals();
  if(typeof updateEquippedDisplay === 'function') updateEquippedDisplay();
  // O sono é por avatar e a tela é uma só: sem isto, quem trocasse de
  // criatura levava as classes de sono da anterior atrás.
  if(typeof aplicarVisualDoSono === 'function') aplicarVisualDoSono(!!sleeping);
  // A doença é por avatar como o sono é: sem isto, quem entrasse num
  // avatar doente via as etiquetas do anterior até ao próximo ciclo.
  if(typeof updateSickVisuals === 'function') updateSickVisuals();
  if(typeof updateAllUI === 'function') updateAllUI();
  if(typeof updateResourceUI === 'function') updateResourceUI();
  // Se o jogador estava na colônia, é para lá que se volta: este rebuild
  // acaba de pôr o aliveScreen por baixo dela.
  if(typeof fzReafirmar === 'function') fzReafirmar();
  if(sleeping && typeof startSleep === 'function') startSleep();
}
