// Chocar não custa nada. Custava 50 💎 por um Raro e 100 por um
// Lendário, e já não há nem uns nem outros — todo o ovo é só um ovo.
const HATCH_FEE = 0;
// Quantos ovos saem de cada postura. Tem de bater com o numEggs do
// api/pool.js — é o servidor que bota, este número existe só para o
// cliente saber se há espaço antes de cobrar.
const OVOS_POR_POSTURA = 2;
let pendingHatchFee = 0;

async function goToMarketplace(e) {
  if(e) e.preventDefault();
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) {
    showBubble(t('egg.bub.hatch_first'));
    addLog(t('egg.log.hatch_first'), 'bad');
    return;
  }
  // Esta e a funcao do botao 💎 da fila de cima: abre o MARKETPLACE.
  // Abria-o na seccao "slots", porque era la que vivia o "Meus
  // Avatares"; agora que ele saiu, entra na primeira seccao de mercado.
  if(typeof openMarketplaceModal === 'function') openMarketplaceModal();
}

function findTargetSlot() {
  const unlocked = getUnlockedSlots();
  const activeS = avatarSlots[activeSlotIdx];
  if(!activeS || (!activeS.hatched && !activeS.pendingEgg)) {
    return activeSlotIdx;
  }
  for(let i = 0; i < unlocked; i++) {
    if(i === activeSlotIdx) continue;
    const s = avatarSlots[i];
    if(!s || (!s.nome && !s.pendingEgg)) return i;
  }
  return -1;
}

// SISTEMA DE OVOS
// ═══════════════════════════════════════════════════════════════════

// A raridade e a validade do ovo são decididas NO SERVIDOR
// (_calcEggRarity e handleBotarOvo, em api/pool.js). Havia aqui uma
// segunda cópia das duas — calcEggRarity() e calcEggExpiry() — que nunca
// era chamada por ninguém, e as duas versões já tinham divergido: a
// daqui aplicava um bônus por ter todos os vitais acima de 80 que o
// servidor nunca conheceu, e multiplicava a validade pelo eggDura do
// vínculo, que também só existia aqui. Quem lesse este arquivo
// acreditava em duas regras que não valiam nada.
//
// As duas passaram para o servidor de verdade. Esta cópia saiu.

async function layEgg() {
  if(getFase() < 3) { showBubble(t('egg.bub.not_grown')); return; }
  if(!avatar || !hatched || dead) return;
  if(eggLayCooldown > 0) {
    const horasRestantes = Math.ceil(eggLayCooldown * 60 / 3600);
    showBubble(t('egg.bub.cooldown', {h: horasRestantes}));
    return;
  }
  if(gs.moedas < 50) { showBubble(t('egg.bub.no_coins')); addLog(t('egg.log.no_coins'), 'bad'); return; }
  // O servidor bota DOIS ovos por postura e entrega só os que couberem,
  // cobrando os 50🪙 na mesma. Com 9 ovos guardados, pagava-se o preço
  // inteiro por um ovo só — e sem aviso nenhum.
  const CABEM = 10 - eggsInInventory.length;
  if(CABEM < OVOS_POR_POSTURA) {
    showBubble(t('egg.bub.inv_full'));
    addLog(t(CABEM <= 0 ? 'egg.log.inv_full' : 'egg.log.inv_quase_full',
             { cabem: CABEM, ovos: OVOS_POR_POSTURA }), 'bad');
    return;
  }
  if(!firebase?.auth?.()?.currentUser) { showBubble(t('egg.bub.connect')); return; }

  // Bloqueia clique duplo
  eggLayCooldown = 1;
  showBubble(t('egg.bub.laying'));

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'botar-ovo', idToken }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'Erro ao botar ovo');

    // Aplica estado retornado pelo servidor
    json.eggs.forEach((ovo, i) => {
      eggsInInventory.push(ovo);
      if(avatar) {
        avatar.totalOvos  = (avatar.totalOvos  || 0) + 1;
      }
    });
    gs.moedas            = json.novasMoedas;
    window._eggLayReadyAt = json.eggLayReadyAt;
    if(avatar) avatar.eggLayReadyAt = json.eggLayReadyAt;
    const msLeft = json.eggLayReadyAt - Date.now();
    eggLayCooldown = Math.ceil(msLeft / 60000);
    eggLayNotified = false;

    const numEggs  = json.eggs.length;

    // A postura ganhou cerimónia, no mesmo palco da evolução: o jogador
    // clicou e pagou, portanto merece ver o que saiu, um ovo de cada vez.
    abrirCerimoniaOvo(json.eggs, 50, json.eggLayReadyAt);

    const eggWord  = numEggs > 1 ? t('egg.inv.egg_word_multi', {n: numEggs}) : t('egg.inv.egg_word_one');
    showBubble(numEggs > 1 ? t('egg.bub.laid_multi', {n: numEggs}) : t('egg.bub.laid_common'));
    addLog(t('egg.log.laid', {word: eggWord}), 'good');
    showFloat(`🥚 ×${numEggs}`, '#7ab87a');
    renderEggInventory();
    updateResourceUI();
    scheduleSave();

  } catch(err) {
    eggLayCooldown = 0; // libera botão se falhou
    showBubble(`Erro: ${err.message}`);
    addLog(`⚠️ ${err.message}`, 'bad');
  }
}

function burnEgg(id) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  const ovo = eggsInInventory[idx];

  // Ovo apodrecido — descarta sem confirmação
  if(Date.now() > ovo.expiraEm) {
    eggsInInventory.splice(idx, 1);
    addLog(t('egg.log.rotten_discarded'), 'bad');
    renderEggInventory(); updateResourceUI(); scheduleSave();
    return;
  }

  /* QUEIMAR É O NOME DO QUE ACONTECE, E AGORA É UM SÓ CAMINHO.

     Havia dois: o ovo Comum dava moedas internas e o Raro ou Lendário
     dava cristais da pool, a preço dinâmico e com limite semanal. Como
     já não há ovos Raros nem Lendários, esse segundo caminho não tem
     por onde ser chamado.

     É uma SAÍDA DA POOL que desaparece — era a única forma de um
     jogador tirar valor da pool a queimar alguma coisa. Fica dito aqui
     e no api/pool.js, onde o handler continua de pé mas fora de
     alcance: apagar código que mexe em dinheiro sem que ninguém o peça
     é pior do que deixá-lo marcado. Quem decide o que o substitui é a
     conversa da economia. */

  const bonus    = rarityBonus().burnBonus;
  const bonusPct = bonus > 0 ? ` (+${Math.round(bonus*100)}% bônus)` : '';

  // O Comum continua a queimar-se por moedas internas, que não saem da
  // pool nem valem MATIC — é só uma forma de não ficar com ele parado.
  const moedas = Math.round(20 * (1 + bonus));
  const overlay = document.getElementById('eggBurnOverlay');
  const preview = document.getElementById('eggBurnPreview');
  if(overlay && preview) {
    preview.innerHTML = `Ovo <b style="color:#7ab87a">${esc(ovo.elemento)}</b><br>
      Receberás <b style="color:var(--gold)">${moedas} 🪙</b>${bonusPct}<br>
      <span style="color:#f87171;font-size:0.5rem;">Esta ação é irreversível.</span>`;
    document.getElementById('eggBurnConfirmBtn').onclick = () => {
      overlay.style.display = 'none';
      _doBurnComum(id, moedas);
    };
    overlay.style.display = 'flex';
  } else {
    _doBurnComum(id, moedas);
  }
}

function _doBurnComum(id, moedas) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  eggsInInventory.splice(idx, 1);
  earnCoins(moedas);
  addLog(t('egg.log.burned_common', {moedas}), 'good');
  showFloat(`+${moedas}🪙`, '#c9a84c');
  renderEggInventory(); updateResourceUI(); scheduleSave();
}



function hatchEggFromInventory(id) {
  const ovo = eggsInInventory.find(e => e.id === id);
  if(!ovo) return;
  if(Date.now() > ovo.expiraEm) {
    addLog(t('egg.log.rotten_hatch'), 'bad');
    return;
  }

  pendingHatchId  = id;
  pendingHatchFee = HATCH_FEE;

  // O ovo era mostrado pela raridade — 🥚, 💙 ou 🌟. Já não há
  // raridade; o que há é o elemento, que é o que ele traz mesmo.
  document.getElementById('hatchConfirmEgg').textContent = '🥚';
  document.getElementById('hatchConfirmRarity').innerHTML =
    `<span style="color:#7ab87a;font-weight:700;font-family:'Cinzel',serif">${esc(ovo.elemento.toUpperCase())}</span>`;

  const targetPreview = findTargetSlot();
  const confirmBtn = document.getElementById('hatchConfirmYes');
  let msg = '';
  if(targetPreview === -1) {
    msg = t('egg.hatch.slots_full');
    if(confirmBtn) confirmBtn.style.display = 'none';
  } else if(hatched && !dead && targetPreview !== activeSlotIdx) {
    msg = t('egg.hatch.multi_slot', {slot: targetPreview+1, nome: avatar ? avatar.nome.split(',')[0] : '', activeSlot: activeSlotIdx+1});
    if(confirmBtn) confirmBtn.style.display = '';
  } else {
    msg = t('egg.hatch.same_slot', {slot: targetPreview+1});
    if(confirmBtn) confirmBtn.style.display = '';
  }

  // Mostrar taxa de chocagem (se aplicável)
  if(pendingHatchFee > 0 && confirmBtn && confirmBtn.style.display !== 'none') {
    const saldo = gs.cristais || 0;
    if(saldo < pendingHatchFee) {
      msg += t('egg.hatch.need_gems', {fee: pendingHatchFee, saldo});
      if(confirmBtn) confirmBtn.style.display = 'none';
    } else {
      msg += t('egg.hatch.fee', {fee: pendingHatchFee});
    }
  }

  document.getElementById('hatchConfirmMsg').innerHTML = msg;

  ModalManager.open('hatchConfirmModal');
}

async function confirmHatch() {
  if(pendingHatchId === null) return;
  const idx = eggsInInventory.findIndex(e => e.id === pendingHatchId);
  if(idx === -1) { pendingHatchId = null; return; }

  const targetSlot = findTargetSlot();
  if(targetSlot === -1) {
    addLog(t('egg.log.no_slots'), 'bad');
    showBubble(t('egg.bub.no_slots'));
    pendingHatchId = null;
    ModalManager.close('hatchConfirmModal');
    return;
  }

  const ovo = eggsInInventory[idx];

  // Verificação final da taxa de chocagem
  if(pendingHatchFee > 0 && (gs.cristais || 0) < pendingHatchFee) {
    addLog(t('egg.log.no_gems', {fee: pendingHatchFee}), 'bad');
    pendingHatchId = null; pendingHatchFee = 0;
    ModalManager.close('hatchConfirmModal');
    return;
  }

  pendingHatchId = null;
  ModalManager.close('hatchConfirmModal');

  /* ── O SERVIDOR AUTORIZA A CHOCAGEM ──
     Nasce aqui a identidade do avatar, e até agora nascia só aqui: o
     servidor nunca via avatar nenhum nascer. Como o avatarSlots é escrito
     pelo cliente por inteiro, bastava pôr raridade:'Lendário' num slot
     para o api/comprar-avatar.js o aceitar à venda — ele lia a raridade
     desse mesmo array.

     Agora o servidor consome o ovo (que ele conhece, pelo inboxEggs ou
     pelo ovosEmitidos), cobra a taxa e regista o avatar com a raridade do
     OVO. É essa entrada que a listagem passa a exigir.

     O seed é calculado antes e vai no pedido, porque é a chave do registo.
     Continua a sair daqui — decide aparência e ficha — mas a raridade,
     que é o que vale cristais, deixa de sair.

     A taxa passou para o servidor: era feita em duas escritas separadas
     (debitar aqui, avisar a pool depois) que podiam divergir. */
  const _nomeProv = nomeDeNascimento(ovo.elemento);
  let _hp = 0; const _sp = _nomeProv + ovo.elemento + '#' + ovo.id;
  for(let i=0;i<_sp.length;i++){const ch=_sp.charCodeAt(i);_hp=((_hp<<5)-_hp)+ch;_hp=_hp&_hp;}
  const seedAutorizado = Math.abs(_hp);

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'chocar-ovo', idToken, ovoId: ovo.id, seed: seedAutorizado }),
    });
    const json = await resp.json();
    if(!resp.ok || !json.ok) {
      addLog(`⚠️ ${json.erro || t('egg.log.no_gems', {fee: pendingHatchFee})}`, 'bad');
      showBubble(json.erro || '...');
      pendingHatchFee = 0;
      return;
    }
    // O saldo é o que o servidor diz, não a nossa conta.
    if(json.novosCristais != null) gs.cristais = json.novosCristais;
    updateAllUI();
  } catch(e) {
    addLog('⚠️ ' + e.message, 'bad');
    pendingHatchFee = 0;
    return;
  }
  pendingHatchFee = 0;

  // Havia aqui um "backup" do ovo no inboxEggs antes de o tirar da
  // memória. Saiu por duas razões.
  // A primeira é segurança: o inbox é a porta da venda de ovos — o
  // servidor só deixa listar ovos que lá estejam — portanto qualquer
  // escrita do cliente nele era uma forma de fabricar ovos. As regras já
  // não a permitem.
  // A segunda é que o backup duplicava: o ovo entrava no inbox, a
  // chocagem seguia, e no carregamento seguinte o applyGameState()
  // devolvia-o ao slot.eggs — o jogador chocava o ovo E ficava com ele.

  eggsInInventory.splice(idx, 1);
  window._cancelledEgg = {...ovo};

  if(targetSlot !== activeSlotIdx) {
    saveRuntimeToSlot(activeSlotIdx);
  }

  // Gerar dados do novo avatar
  const car      = CARACTERISTICAS_ELEMENTAIS[ovo.elemento] || null;
  // O nome e o seed são os que foram ao servidor — recalcular aqui daria
  // outro seed e o registo de emissão não bateria certo na listagem.
  const nome     = _nomeProv;
  const _descPool  = descricoesDoElemento(ovo.elemento);
  const descricaoIdx = Math.floor(Math.random() * _descPool.length);
  const descricao    = _descPool[descricaoIdx];
  // O seed saía só do nome + elemento, e há 6 prefixos × 8 sufixos = 48
  // nomes por elemento/raridade. Como a ficha de combate também deriva
  // do seed, dois avatares com o mesmo nome eram IDÊNTICOS — mesmo
  // desenho, mesmos F/H/R/A, mesmas magias. Ao chocar 20 ovos saíam ~3,5
  // repetidos, e o jogo inteiro só conseguia 720 avatares diferentes.
  //
  // O id do ovo é o carimbo de tempo da postura, e entra aqui para cada
  // chocagem dar um avatar seu. Os nomes continuam repetindo-se — isso é
  // sabor, não identidade.
  const seed = seedAutorizado;

  while(avatarSlots.length <= targetSlot) avatarSlots.push(null);
  avatarSlots[targetSlot] = {
    /* Chocado de um ovo, e mesmo assim sem mae nem pai: o ovo nao
       guarda de quem veio (sao quatro campos — id, raridade, elemento
       e validade), e um ovo comprado no mercado nem sequer nasceu
       aqui. Os campos ficam nulos e a reproducao preenche-os quando
       existir; o que nao pode faltar desde ja e o id. */
    ...identidadeNova(),
    nome, elemento: ovo.elemento, raridade: 'Comum', descricao, descricaoIdx, car, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    eggLayCooldown: 0, petCooldown: 0,
    vitals: {fome:100,humor:100,energia:100,saude:100,higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
    pendingEgg: true,   // protege o slot — firebase.js não salva avatarSlots enquanto pendingEgg existir
    pendingSlot: targetSlot,
  };
  /* ── AQUI E QUE A ESSENCIA MUDA ──

     O avatar deixa de nascer com a raridade do ovo. Nasce Comum,
     como todos, e a raridade do ovo fica na certidao como ORIGEM.

     E ja nao ha ovos Raros nem Lendarios: um ovo e um ovo. A origem
     que fica gravada e Comum para todos, e a raridade passou a ser
     coisa que o avatar CONQUISTA a viver (js/raridade.js).

     Com isso a proveniencia deixou de comprar seja o que for. Era o
     unico sitio onde o ovo caro valia alguma coisa, e ja nem la valia:
     medido em tools/genetica.js, 24 pontos de gene a mais valiam 0,00
     caracteristicas ao nivel 35. */
  if (typeof registarNascimento === 'function') {
    registarNascimento(avatarSlots[targetSlot], {
      elemento: ovo.elemento, origem: 'Comum', seed,
    });
    avatarSlots[targetSlot].raridade = 'Comum';
  }
  window._pendingEggSlot = targetSlot;

  hatchWithAnimation('Comum', ovo.elemento, targetSlot);
}

// Os temporizadores da chocagem, para se poderem cancelar. São dez em
// 1,2s e mexem todos no DOM do ovo — se a tela mudar no meio (uma
// segunda chocagem, um logout), os que ficaram pendentes escreviam por
// cima do que veio a seguir.
let _hatchTimers = [];
function _pararAnimacaoDeChocar() {
  _hatchTimers.forEach(clearTimeout);
  _hatchTimers = [];
}

function hatchWithAnimation(raridade, elemento, targetSlot) {
  _pararAnimacaoDeChocar();
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const crackColor = rarColors[raridade] || '#c4b5fd';

  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('idleScreen').style.display  = 'none';
  document.getElementById('eggScreen').style.display   = 'flex';
  document.getElementById('actionBtns').style.opacity      = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';

  applyEggVisual(raridade, crackColor);

  document.getElementById('eggHint').textContent = t('egg.hint.hatching');
  document.getElementById('eggProgress').textContent = '';

  const svg    = document.getElementById('eggSvg');
  const cracks = document.getElementById('eggCracks');
  const pulse  = document.getElementById('eggPulse');
  const flash  = document.getElementById('eggFlash');
  pulse.setAttribute('stroke', crackColor);
  svg.style.transform = ''; svg.style.transition = '';

  const lines = document.querySelectorAll('#eggCracks line');

  _hatchTimers.push(setTimeout(() => {
    svg.style.transition = 'transform .08s ease';
    svg.style.transform  = 'rotate(-10deg) scale(1.05)';
    cracks.style.opacity = '1';
    if(lines[0]) lines[0].style.opacity = '1';
    if(lines[1]) lines[1].style.opacity = '1';
    playSound('egg_crack');
  }, 0));
  _hatchTimers.push(setTimeout(() => { svg.style.transform = 'rotate(8deg) scale(1.08)'; }, 120));
  _hatchTimers.push(setTimeout(() => {
    svg.style.transform = 'rotate(-6deg) scale(1.06)';
    if(lines[2]) lines[2].style.opacity = '1';
    if(lines[3]) lines[3].style.opacity = '1';
  }, 250));
  _hatchTimers.push(setTimeout(() => { svg.style.transform = 'rotate(4deg) scale(1.1)'; }, 380));
  _hatchTimers.push(setTimeout(() => {
    svg.style.transform = 'rotate(0deg) scale(1.12)';
    if(lines[4]) lines[4].style.opacity = '1';
    pulse.style.transition = 'opacity .15s';
    pulse.style.opacity = '0.8';
    playSound('summon_pulse');
  }, 500));
  _hatchTimers.push(setTimeout(() => { pulse.style.opacity = '0'; }, 680));
  _hatchTimers.push(setTimeout(() => {
    flash.style.opacity = '1';
    svg.style.transition = 'transform .2s ease, opacity .2s ease';
    svg.style.transform  = 'scale(1.4)';
    svg.style.opacity    = '0';
    playSound('summon_impact');
  }, 900));
  _hatchTimers.push(setTimeout(() => {
    flash.style.opacity = '0';
    hatch();
  }, 1200));
}

// ═══════════════════════════════════════════════════════════════════
// A CHOCAGEM POR CLIQUES SAIU
//
// O ovo já foi chocado clicando cinco vezes nele. Isso deu lugar à
// animação automática (hatchWithAnimation), e o que ficou para trás foi
// tudo isto:
//
//   summonFromEgg()  montava a tela dos cliques — ninguém a chamava
//   cancelHatch()    era como se desistia a meio — ninguém a chamava
//   eggClicks        contador que só era posto a zero, nunca somado
//   #eggWrap         ficou com cursor:pointer e nenhum handler
//   btnCancelHatch   três referências no JS a um botão que não existe
//   "0 / 5"          escrito no HTML por baixo do ovo
//
// E a janela de confirmação continuava a dizer "Clique 5× para fazer
// nascer seu novo avatar", que era a única dessas peças que o jogador
// chegava a ver — e mentia.
// ═══════════════════════════════════════════════════════════════════

function applyEggVisual(raridade, crackColor) {
  const stop1 = document.querySelector('#eggGrad stop:first-child');
  const stop2 = document.querySelector('#eggGrad stop:nth-child(2)');
  const stop3 = document.querySelector('#eggGrad stop:last-child');
  const aura1 = document.getElementById('eggAura1');
  const aura2 = document.getElementById('eggAura2');
  const glowEl = document.getElementById('eggGlowEl');
  const shine  = document.getElementById('eggShine');
  const sparks = document.getElementById('eggSparkles');

  if(raridade === 'Lendário') {
    if(stop1) stop1.setAttribute('stop-color', '#c8860a');
    if(stop2) stop2.setAttribute('stop-color', '#7a4400');
    if(stop3) stop3.setAttribute('stop-color', '#1a0e00');
    if(glowEl) { glowEl.setAttribute('fill','#8a5a00'); glowEl.setAttribute('opacity','.6'); }
    if(shine)  shine.setAttribute('fill','#ffd700');
    if(aura1)  { aura1.setAttribute('stroke','#e8a030'); aura1.style.opacity='0.7'; }
    if(aura2)  { aura2.setAttribute('stroke','#ffd700'); aura2.style.opacity='0.4'; }
    if(sparks) sparks.style.opacity='1';
    if(aura1) aura1.style.animation='eggAuraPulse 1.8s ease-in-out infinite';
    if(aura2) aura2.style.animation='eggAuraPulse 1.8s ease-in-out infinite 0.4s';
  } else if(raridade === 'Raro') {
    if(stop1) stop1.setAttribute('stop-color', '#1a6aaa');
    if(stop2) stop2.setAttribute('stop-color', '#0d3560');
    if(stop3) stop3.setAttribute('stop-color', '#0a0f1e');
    if(glowEl) { glowEl.setAttribute('fill','#1a4a8a'); glowEl.setAttribute('opacity','.5'); }
    if(shine)  shine.setAttribute('fill','#7dc8f0');
    if(aura1)  { aura1.setAttribute('stroke','#5ab4e8'); aura1.style.opacity='0.6'; }
    if(aura2)  { aura2.setAttribute('stroke','#a0d8f0'); aura2.style.opacity='0.3'; }
    if(sparks) sparks.style.opacity='0';
    if(aura1) aura1.style.animation='eggAuraPulse 2.2s ease-in-out infinite';
    if(aura2) aura2.style.animation='eggAuraPulse 2.2s ease-in-out infinite 0.6s';
  } else {
    if(stop1) stop1.setAttribute('stop-color', '#5a3a9a');
    if(stop2) stop2.setAttribute('stop-color', '#2d1a5e');
    if(stop3) stop3.setAttribute('stop-color', '#0b0916');
    if(glowEl) { glowEl.setAttribute('fill','#3d2a6e'); glowEl.setAttribute('opacity','.4'); }
    if(shine)  shine.setAttribute('fill','#8060c0');
    if(aura1)  aura1.style.opacity='0';
    if(aura2)  aura2.style.opacity='0';
    if(sparks) sparks.style.opacity='0';
    if(aura1) aura1.style.animation='none';
    if(aura2) aura2.style.animation='none';
  }

  if(crackColor) {
    document.querySelectorAll('#eggCracks line').forEach(l => {
      l.setAttribute('stroke', crackColor);
      l.style.opacity = '0';
    });
  }
}

function openEggInventory() {
  if(dead) return;
  renderEggInventory();
  ModalManager.open('eggInvModal');
}

function closeEggInventory() {
  ModalManager.close('eggInvModal');
}

function eggMiniSVG(raridade, size = 36) {
  const cfg = {
    'Comum':   { g1:'#7a4fbb', g2:'#3d2a6e', g3:'#0b0916', shine:'#9070d0', aura:'#a78bfa', glow:'#3d2a6e' },
    'Raro':    { g1:'#3a8fd4', g2:'#1a4a7e', g3:'#060d1a', shine:'#60c0f0', aura:'#5ab4e8', glow:'#1a3a6e' },
    'Lendário':{ g1:'#d4943a', g2:'#7a4a10', g3:'#120800', shine:'#f0c860', aura:'#e8a030', glow:'#6a3a00' },
  };
  const e = cfg[raridade] || cfg['Comum'];
  const uid = raridade.replace('á','a').replace('ê','e') + '_' + Math.random().toString(36).slice(2,6);
  return `<svg width="${size}" height="${Math.round(size*1.1)}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="emg_${uid}" cx="38%" cy="28%" r="72%">
        <stop offset="0%"   stop-color="${e.g1}"/>
        <stop offset="60%"  stop-color="${e.g2}"/>
        <stop offset="100%" stop-color="${e.g3}"/>
      </radialGradient>
      <filter id="egl_${uid}"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="50" cy="58" rx="34" ry="42" fill="${e.glow}" opacity=".45" filter="url(#egl_${uid})"/>
    <ellipse cx="50" cy="56" rx="38" ry="48" fill="none" stroke="${e.aura}" stroke-width="1.2" opacity=".5"/>
    <ellipse cx="50" cy="56" rx="30" ry="38" fill="url(#emg_${uid})"/>
    <ellipse cx="42" cy="40" rx="8"  ry="13" fill="${e.shine}" opacity=".22"/>
    ${raridade === 'Lendário' ? `
    <circle cx="22" cy="22" r="2"   fill="${e.aura}" opacity=".8"/>
    <circle cx="78" cy="18" r="1.5" fill="${e.aura}" opacity=".7"/>
    <circle cx="18" cy="76" r="1.5" fill="${e.aura}" opacity=".6"/>
    <circle cx="82" cy="80" r="2"   fill="${e.aura}" opacity=".8"/>` : ''}
  </svg>`;
}

function renderEggInventory() {
  const list = document.getElementById('eggInvList');
  if(!list) return;

  document.getElementById('resOvos').textContent = eggsInInventory.length;

  const countEl = document.getElementById('eggInvCount');
  const _maxEggs = 10;
  if(countEl) countEl.textContent = t('egg.inv.count', {n: eggsInInventory.length, max: _maxEggs, s: eggsInInventory.length !== 1 ? 's' : ''});

  if(eggsInInventory.length === 0) {
    list.innerHTML = `<div class="egg-empty">${t('egg.inv.empty')}</div>`;
    return;
  }

  const rarColor = { 'Comum':'#a78bfa', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };

  const sorted = [...eggsInInventory].sort((a, b) => {
    const rOrd = { 'Lendário':0, 'Raro':1, 'Comum':2 };
    if(rOrd[a.raridade] !== rOrd[b.raridade]) return rOrd[a.raridade] - rOrd[b.raridade];
    return a.expiraEm - b.expiraEm;
  });

  list.innerHTML = sorted.map(ovo => {
    const now      = Date.now();
    const expired  = now > ovo.expiraEm;
    const msLeft   = ovo.expiraEm - now;
    const daysLeft = Math.max(0, Math.floor(msLeft / 86400000));
    const hoursLeft= Math.max(0, Math.floor((msLeft % 86400000) / 3600000));
    const urgent   = !expired && msLeft < 86400000;
    const timeStr  = expired
      ? t('egg.inv.rotten')
      : daysLeft > 0 ? t('egg.inv.time_dh', {d: daysLeft, h: hoursLeft})
      : t('egg.inv.time_h', {h: hoursLeft});
    const cls = 'egg-item' + (expired ? ' rotten' : '') + (urgent ? ' urgent' : '');

    return `<div class="${cls}">
      <div class="egg-mini-svg">${eggMiniSVG('Comum', 38)}</div>
      <div class="egg-info">
        <div class="egg-name" style="color:#7ab87a">${esc(ovo.elemento)}</div>
        <div class="egg-time ${urgent && !expired ? 'egg-time-urgent' : ''}">${timeStr}</div>
      </div>
      <div class="egg-actions">
        ${expired
          ? `<button class="egg-btn burn" onclick="burnEgg(${ovo.id})">${t('egg.btn.discard')}</button>`
          : `<button class="egg-btn hatch" onclick="hatchEggFromInventory(${ovo.id})">🐣 ${t('egg.btn.hatch')}</button>
             <button class="egg-btn burn" onclick="burnEgg(${ovo.id})">🔥</button>`
        }
      </div>
    </div>`;
  }).join('');
}

/* Havia aqui a funcao que pagava a taxa de chocagem a pool: debitava-se
   no cliente e avisava-se a pool a seguir, em duas escritas separadas que
   podiam divergir — a primeira sem servidor nenhum a validar. A taxa
   passou para dentro do handleChocarOvo (api/pool.js), na mesma transacao
   que consome o ovo e emite o avatar. */


/* O OVO DEIXOU DE SE VENDER.

   Havia aqui um botão de carrinho no inventário e um mercado de ovos
   inteiro por trás dele. Saiu: sem raridade, um ovo é igual a outro e
   não há nada para negociar. O que se negoceia é o avatar, depois de
   ele ter crescido e de ter chegado a alguma coisa.

   O ovo continua a existir — é filho, e não mercadoria. Choca-se ou
   queima-se. */

function petCreature() {
  if(!canAct()) return;
  if(petCooldown > 0) return;
  vitals.humor = Math.min(100, vitals.humor + 8);
  vinculo = Math.min(400, vinculo + 1);
  petCooldown = 10;
  playSound('pet');
  playAnim('anim-pet');
  showBubble(rnd(FALAS.pet));
  showFloat('💕','#e830c0');
  updateAllUI();
  scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// A CERIMÓNIA DA POSTURA
//
// Mesmo palco da evolução (css/evolucao.css) e de propósito: é o mesmo
// gesto do jogo — clicar e receber algo — e dar-lhe vocabulário visual
// diferente faria parecer outro jogo.
//
// A diferença está no que acontece ao corpo. Na evolução ele TROCA, e o
// clarão esconde a troca. Aqui ele não troca: faz força, e o clarão
// revela o que saiu dele. Por isso o avatar é desenhado uma vez só.
//
//   0ms     a tela escurece
//   700ms   o avatar faz força
//   1600ms  CLARÃO, e os ovos aparecem por baixo
//   1900ms  as cartas entram uma de cada vez, 220ms entre elas
//   2600ms  a conta: o que se pagou e quando se pode outra vez
//
// As cartas entram escalonadas porque este é o momento de sorte do jogo:
// sabe-se o preço antes, não se sabe o que sai. Mostrar os dois ao mesmo
// tempo desperdiça a única surpresa que a postura tem.
// ═══════════════════════════════════════════════════════════════════
const _OVO_CORES = { 'Lendário': '#e8a030', 'Raro': '#5ab4e8', 'Comum': '#7ab87a' };
const _OVO_EMOJI = { 'Lendário': '🌟', 'Raro': '🔵', 'Comum': '🥚' };

function abrirCerimoniaOvo(ovos, custo, proximaEm) {
  const ov = document.getElementById('ovoOverlay');
  // Sem palco, cai-se na animação antiga em vez de não acontecer nada:
  // o avatar do jogo faz o gesto de pôr e ouve-se o som. É o que corre
  // se a marcação faltar por alguma razão.
  if (!ov || !ovos || !ovos.length) {
    if (typeof playAnim === 'function') playAnim('anim-layegg');
    if (typeof playSound === 'function') playSound('egg_laid');
    return;
  }

  if (typeof ModalManager !== 'undefined' && ModalManager.closeAll) ModalManager.closeAll();

  const palco  = ov.querySelector('.evo-palco');
  const svgBox = ov.querySelector('#ovoAvatar');
  const brilho = ov.querySelector('.ovo-brilho');
  const painel = ov.querySelector('.evo-painel');
  const ninho  = ov.querySelector('#ovoNinho');

  painel.classList.remove('mostra');
  brilho.classList.remove('dispara');
  palco.classList.remove('ovo-esforco');
  ninho.innerHTML = '';
  ov.classList.add('ativo');

  if (avatar && typeof gerarSVG === 'function') {
    const tam = Math.round((typeof getFaseSize === 'function' ? getFaseSize() : 140) * 1.5);
    const fase = typeof getFaseVisual === 'function' ? getFaseVisual() : 3;
    svgBox.innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, tam, tam, fase);
  }

  const t1 = setTimeout(() => {
    palco.classList.add('ovo-esforco');
    _ovoParticulas(palco);
  }, 700);

  const t2 = setTimeout(() => {
    brilho.classList.add('dispara');
    if (typeof playSound === 'function') playSound('egg_laid');
    setTimeout(() => {
      ninho.innerHTML = ovos.map((o, i) => {
        const cor = _OVO_CORES[o.raridade] || _OVO_CORES['Comum'];
        return `<div class="ovo-carta" style="--i:${i};--cor-ovo:${cor}">
                  <span class="ovo-emoji">${_OVO_EMOJI[o.raridade] || '🥚'}</span>
                  <span class="ovo-rar">${o.raridade}</span>
                </div>`;
      }).join('');
    }, 300);
  }, 1600);

  const t3 = setTimeout(() => {
    const tit = ov.querySelector('#ovoTitulo');
    const sub = ov.querySelector('#ovoSub');
    const conta = ov.querySelector('#ovoConta');
    if (tit) tit.textContent = ovos.length > 1 ? t('ovo.titulo_multi', { n: ovos.length })
                                               : t('ovo.titulo_um');
    // Só se anuncia raro ou lendário quando algum saiu — anunciar sempre
    // gastaria a palavra e a próxima já não valeria nada.
    const melhor = ovos.some(o => o.raridade === 'Lendário') ? 'Lendário'
                 : ovos.some(o => o.raridade === 'Raro')     ? 'Raro' : null;
    if (sub) sub.textContent = melhor ? t('ovo.sub_' + (melhor === 'Lendário' ? 'lendario' : 'raro'))
                                      : t('ovo.sub_comum');
    if (conta) {
      const horas = proximaEm ? Math.max(1, Math.ceil((proximaEm - Date.now()) / 3600000)) : 0;
      conta.innerHTML =
        `<div class="ovo-conta gasto"><span>${t('ovo.custo')}</span><span class="val">−${custo} 🪙</span></div>` +
        `<div class="ovo-conta"><span>${t('ovo.guardados')}</span><span class="val">${eggsInInventory.length} / 10</span></div>` +
        (horas ? `<div class="ovo-conta"><span>${t('ovo.proxima')}</span><span class="val">${t('ovo.horas', { h: horas })}</span></div>` : '');
    }
    painel.classList.add('mostra');
  }, 2600);

  ov._temporizadores = [t1, t2, t3];
}

/* Partículas que caem em vez de convergirem. A evolução puxa tudo para o
   centro porque é energia a acumular; aqui a luz desce e assenta, que é o
   gesto de deixar alguma coisa no chão. Só variam em X — descer é o
   assunto, e espalhá-las nas duas direções tirava-lhe a leitura. */
function _ovoParticulas(palco) {
  const cores = ['#ffeec8', '#e8a030', '#fff3d6', '#c9781e'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'ovo-part';
    p.style.cssText =
      `--dx:${((Math.random() * 8 - 4)).toFixed(2)}rem;` +
      `background:${cores[i % cores.length]};` +
      `animation-delay:${(Math.random() * 0.55).toFixed(2)}s;`;
    palco.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}

function fecharCerimoniaOvo() {
  const ov = document.getElementById('ovoOverlay');
  if (!ov) return;
  (ov._temporizadores || []).forEach(clearTimeout);
  ov.classList.remove('ativo');
  setTimeout(() => {
    const b = ov.querySelector('#ovoAvatar'); if (b) b.innerHTML = '';
    const n = ov.querySelector('#ovoNinho');  if (n) n.innerHTML = '';
  }, 600);
}

window.registerStrings(
  {
    'ovo.titulo_um':    'PUS UM OVO',
    'ovo.titulo_multi': 'PUS {n} OVOS',
    'ovo.sub_comum':    'A ninhada está segura',
    'ovo.sub_raro':     '✦ UM DELES É RARO',
    'ovo.sub_lendario': '✦ UM DELES É LENDÁRIO',
    'ovo.custo':        'Custou',
    'ovo.guardados':    'Guardados',
    'ovo.proxima':      'Próxima postura',
    'ovo.horas':        'em {h}h',
  },
  {
    'ovo.titulo_um':    'I LAID AN EGG',
    'ovo.titulo_multi': 'I LAID {n} EGGS',
    'ovo.sub_comum':    'The clutch is safe',
    'ovo.sub_raro':     '✦ ONE OF THEM IS RARE',
    'ovo.sub_lendario': '✦ ONE OF THEM IS LEGENDARY',
    'ovo.custo':        'Cost',
    'ovo.guardados':    'Stored',
    'ovo.proxima':      'Next clutch',
    'ovo.horas':        'in {h}h',
  }
);
