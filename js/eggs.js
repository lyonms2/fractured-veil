// Chocar não custa nada. Custava 50 💎 por um Raro e 100 por um
// Lendário, e já não há nem uns nem outros — todo o ovo é só um ovo.
const HATCH_FEE = 0;
// Quantos ovos saem de cada postura. Tem de bater com o numEggs do
// api/pool.js — é o servidor que bota, este número existe só para o
// cliente saber se há espaço antes de cobrar.
let pendingHatchFee = 0;

/* ── O QUE UM OVO MOSTRA ──

   Mostrava o ELEMENTO: "Ovo Fogo". Nao ha elementos, e o que um ovo tem
   para dizer e de que cor e quem esta la dentro — que ele sabe, porque
   o DNA do filho viaja dentro dele desde que foi posto
   (js/reproducao.js).

   Um ovo que NAO saiba nao inventa: um ovo comprado no mercado nao traz
   DNA nenhum, e a cor dele so se decide ao chocar. Esse diz "Ovo", em
   cinzento, e diz a verdade. Era o que faltava a versao antiga, que
   dizia "Fogo" com a mesma certeza nos dois casos.

   Ficam os dois numa funcao so porque tres sitios os mostram — o
   inventario, o aviso de queimar e a confirmacao de chocar — e um
   rotulo escrito em tres sitios diverge ao primeiro retoque. */
function _ovoTemDna(ovo) {
  return !!(ovo && ovo.dna && ovo.dna.genes && ovo.dna.genes.cor);
}

function _corDoOvo(ovo) {
  if (!_ovoTemDna(ovo) || typeof corDoAvatar !== 'function') return '#7a7a8a';
  return corDoAvatar(ovo);
}

/* O ROTULO DEIXOU DE DIZER A COR.

   Dizia "Vermelho-arroxeado com Amarelo", e dizia-o ao lado de um ovo
   cinzento — a cor era escrita porque nao se via. O ovo passou a ser
   pintado com ela (eggMiniSVG), e a partir daí a frase estava a
   legendar o que esta desenhado dois centimetros a esquerda.

   O que fica no lugar e a unica coisa que o desenho NAO diz: de quem
   ele e filho. Um ovo sem pais — comprado, ou dos antigos — nao tem
   nada a dizer, e diz "Ovo". */
function _rotuloDoOvo(ovo) {
  if (ovo && (ovo.maeNome || ovo.paiNome))
    return t('egg.filho_de', { mae: ovo.maeNome || '?', pai: ovo.paiNome || '?' });
  return t('egg.inv.sem_cor');
}

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
/* O AVATAR DEIXOU DE PÔR OVOS SOZINHO.

   Vivia aqui o layEgg: um adulto pagava 50 moedas, esperava 24 horas e
   punha dois ovos por conta própria. Fazia sentido enquanto o ovo era
   só um ovo — uma criatura nova, sem passado.

   Deixou de fazer no dia em que o ovo passou a ser um FILHO. Um filho
   tem mãe e pai, e o DNA dele sai do cruzamento dos dois
   (js/reproducao.js). Um avatar a pôr ovos sozinho dava um filho sem
   segundo progenitor, com metade da árvore em branco desde o primeiro
   dia — e a genealogia inteira a fingir.

   Com ele foram-se o cooldown de postura, o botão do canto e o aviso de
   "pronto para botar". A cerimónia do ovo ficou: quem a usa agora é o
   cruzamento. */
function burnEgg(id) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  const ovo = eggsInInventory[idx];

  // Ovo apodrecido — descarta sem confirmação
  if(typeof ovoPodre === 'function' && ovoPodre(ovo)) {
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
    preview.innerHTML = `Ovo <b style="color:${_corDoOvo(ovo)}">${esc(_rotuloDoOvo(ovo))}</b><br>
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

/* O tempo curto, em duas escalas.

   Servia só o choco, que é de 24 a 48 horas — e aí "30h00" é melhor do
   que "1d 6h", porque quem espera por um ovo conta horas. Passou a
   servir também o apodrecer, que é de sete dias, e "168h00" não é um
   número que alguém leia.

   O corte está nas 48 horas: até lá horas, acima disso dias. É o mesmo
   limite do choco, portanto nenhum ovo por chocar cai do outro lado. */
function _tempoCurto(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  if (h >= 48) {
    const d = Math.floor(h / 24), resto = h % 24;
    return d + 'd' + (resto ? ' ' + resto + 'h' : '');
  }
  return h > 0 ? (h + 'h' + String(totalMin % 60).padStart(2, '0')) : (totalMin + 'min');
}


function hatchEggFromInventory(id) {
  const ovo = eggsInInventory.find(e => e.id === id);
  if(!ovo) return;
  if(typeof ovoPodre === 'function' && ovoPodre(ovo)) {
    addLog(t('egg.log.rotten_hatch'), 'bad');
    return;
  }
  /* O TEMPO DE CHOCO.

     Um ovo de filho fica um dia a fazer-se antes de abrir. A guarda
     está aqui e não só no botão — um limite guardado por quem PEDE em
     vez de por quem FAZ já rendeu quatro defeitos a este jogo.

     Os ovos sem chocaEm abrem já: são os de postura, e esses nunca
     tiveram espera. */
  if(typeof ovoPronto === 'function' && !ovoPronto(ovo)) {
    addLog(t('egg.choca_em', { t: _tempoCurto(faltaParaChocar(ovo)) }), 'bad');
    return;
  }

  /* E O NINHO, pela mesma razão. A lista já não mostra o botão quando
     não há slot, mas a lista é quem PEDE — e este jogo já pagou quatro
     vezes por pôr o limite só desse lado. */
  if(findTargetSlot() === -1) {
    addLog(t('egg.hatch.slots_full'), 'bad');
    if(typeof showToast === 'function') showToast(t('egg.hatch.slots_full'), 'bad');
    return;
  }

  pendingHatchId  = id;
  pendingHatchFee = HATCH_FEE;

  // O ovo era mostrado pela raridade — 🥚, 💙 ou 🌟 — e depois pelo
  // elemento. Já não há nem uma nem outro: o que ele traz mesmo é a
  // COR de quem está lá dentro, quando já se sabe quem é.
  document.getElementById('hatchConfirmEgg').textContent = '🥚';
  document.getElementById('hatchConfirmRarity').innerHTML =
    `<span style="color:${_corDoOvo(ovo)};font-weight:700;font-family:'Cinzel',serif">${esc(_rotuloDoOvo(ovo).toUpperCase())}</span>`;

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
  /* ── O SEED PRIMEIRO, DEPOIS O DNA, DEPOIS O NOME ──

     O seed saía do nome, e o nome saía do elemento do ovo. Sem
     elemento, o nome passa a sair da COR — e a cor está no DNA. A
     ordem inverteu-se: sorteia-se o seed, dele (ou do ovo) sai o DNA, e
     dele sai a cor e o nome.

     Um ovo de dois pais já traz o DNA feito (js/reproducao.js), e é
     esse que vale: a herança não se sorteia outra vez. O que o seed
     decide é o corpo e a ficha — que é o que faz dois irmãos do mesmo
     par serem dois bichos e não um repetido. */
  const seedAutorizado = Math.floor(Math.random() * 2147483647);
  const dnaDoOvo = ovo.dna
    || ((typeof gerarDna === 'function') ? gerarDna('Comum', seedAutorizado) : null);
  const _tomOvo = (typeof tomDaCor === 'function' && dnaDoOvo && dnaDoOvo.genes && dnaDoOvo.genes.cor)
    ? tomDaCor(dnaDoOvo.genes.cor[0]) : 'brasa';
  const _nomeProv = nomeDeNascimento(_tomOvo);

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
  // O nome e o seed são os que foram ao servidor — recalcular aqui daria
  // outro seed e o registo de emissão não bateria certo na listagem.
  const nome     = _nomeProv;
  const _descPool  = descricoesDoTom(_tomOvo);
  const descricaoIdx = Math.floor(Math.random() * _descPool.length);
  const descricao    = _descPool[descricaoIdx];
  // O seed saía do NOME, e há um número contado de nomes. Como a ficha
  // de combate também deriva do seed, dois avatares com o mesmo nome
  // eram IDÊNTICOS — mesmo desenho, mesmos F/H/R/A, mesmas magias. Ao
  // chocar 20 ovos saíam ~3,5 repetidos, e o jogo inteiro só conseguia
  // 720 avatares diferentes. Hoje é ao contrário: o seed é a raiz e o
  // nome é uma folha. Os nomes continuam a repetir-se — isso é sabor,
  // não identidade.
  const seed = seedAutorizado;

  while(avatarSlots.length <= targetSlot) avatarSlots.push(null);
  avatarSlots[targetSlot] = {
    /* Um ovo comprado no mercado nao nasceu aqui e nao tem pais; um
       ovo de dois avatares tem-nos, e eles vem no proprio ovo. Os
       campos ficam nulos quando nao ha; o que nao pode faltar desde
       ja e o id. */
    ...identidadeNova(),
    nome, raridade: 'Comum', descricao, descricaoIdx, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    petCooldown: 0,
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
    /* O DNA e os pais viajam do ovo para a certidão.

       Quando o ovo é filho de dois avatares, o DNA dele foi cruzado no
       momento em que foi posto (js/reproducao.js). Sortear um novo aqui
       era deitar fora a herança e dar ao filho genes de estranho. */
    registarNascimento(avatarSlots[targetSlot], {
      origem: 'Comum', seed,
      dna: dnaDoOvo,
      mae: ovo.mae || null, pai: ovo.pai || null,
      maeNome: ovo.maeNome || null, paiNome: ovo.paiNome || null,
    });
    // A identidade também guarda os pais — é dela que a árvore vai ler.
    if (ovo.mae) avatarSlots[targetSlot].mae = ovo.mae;
    if (ovo.pai) avatarSlots[targetSlot].pai = ovo.pai;
    avatarSlots[targetSlot].raridade = 'Comum';
  }
  window._pendingEggSlot = targetSlot;

  hatchWithAnimation(avatarSlots[targetSlot], targetSlot);
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

/* A animação do choco.

   Recebia a raridade e o elemento. A raridade escolhia a cor do ovo —
   verde para o Comum, azul para o Raro, dourado para o Lendário — e o
   elemento não era usado para nada, apesar de estar na assinatura.

   Como todo o avatar nasce Comum, o ovo era SEMPRE o mesmo ovo verde.
   Agora recebe o próprio avatar e pinta-se com as cores dele.

   ── AS RACHAS, QUE EU TINHA APAGADO SEM DAR CONTA ──

   Pintei-as com o BRILHO da cor do ovo — e brilho da mesma cor sobre a
   mesma cor não se vê. As cinco linhas continuavam a ser desenhadas e
   nenhuma aparecia. Uma racha é luz a passar pela casca: é branca, seja
   de que cor for o ovo, e por isso deixou de sair da paleta.

   ── E DEVAGAR ──

   Era 1,2 segundos para nascer um bicho, com as cinco rachas em três
   momentos — duas, duas e uma, tudo em meio segundo. São 2,8 segundos:
   cada racha tem o seu instante, há tempo de ver a casca ceder, e o
   clarão só vem quando já se percebeu o que estava a acontecer. */
const HATCH_RITMO = 340;     // o compasso; o resto são múltiplos dele

function hatchWithAnimation(slot, targetSlot) {
  _pararAnimacaoDeChocar();
  const g = (typeof gradienteDoOvo === 'function' && slot && slot.nascimento)
    ? gradienteDoOvo(slot)
    : { topo: '#5a3a9a', meio: '#2d1a5e', fundo: '#0b0916', brilho: '#8060c0', aura: '#7a4fbb' };

  // A racha é a luz de dentro. Branca, e não da cor da casca.
  const crackColor = '#fff6e0';

  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('idleScreen').style.display  = 'none';
  document.getElementById('eggScreen').style.display   = 'flex';
  document.getElementById('actionBtns').style.opacity      = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';

  applyEggVisual(g, crackColor);

  document.getElementById('eggHint').textContent = t('egg.hint.hatching');
  document.getElementById('eggProgress').textContent = '';

  const svg    = document.getElementById('eggSvg');
  const cracks = document.getElementById('eggCracks');
  const pulse  = document.getElementById('eggPulse');
  const flash  = document.getElementById('eggFlash');
  pulse.setAttribute('stroke', g.brilho);
  svg.style.transform = ''; svg.style.transition = '';
  svg.style.opacity = '1';

  const lines = document.querySelectorAll('#eggCracks line');
  lines.forEach(l => { l.style.opacity = '0'; l.style.transition = 'opacity .18s ease'; });
  cracks.style.opacity = '1';

  const em = (ms, fn) => _hatchTimers.push(setTimeout(fn, ms));
  const R = HATCH_RITMO;

  /* Cada compasso é um esforço: o ovo estremece para um lado e abre mais
     uma racha. Cinco esforços, cinco rachas, uma de cada vez. */
  const balanco = ['rotate(-9deg) scale(1.04)', 'rotate(7deg) scale(1.07)',
                   'rotate(-6deg) scale(1.05)', 'rotate(5deg) scale(1.08)',
                   'rotate(-3deg) scale(1.1)'];
  for (let i = 0; i < 5; i++) {
    em(R * i, () => {
      svg.style.transition = 'transform .16s ease';
      svg.style.transform  = balanco[i];
      if (lines[i]) lines[i].style.opacity = '1';
      playSound('egg_crack');
    });
    /* Volta ao lugar a meio do compasso. É o descanso entre duas
       investidas, e é o que faz isto ler-se como esforço e não como
       tremor. */
    em(R * i + R * 0.55, () => { svg.style.transform = 'rotate(0deg) scale(1.02)'; });
  }

  // Um compasso de silêncio antes do fim: a casca aguenta, e depois não.
  em(R * 5.4, () => {
    svg.style.transition = 'transform .3s ease';
    svg.style.transform  = 'rotate(0deg) scale(1.14)';
    pulse.style.transition = 'opacity .25s';
    pulse.style.opacity = '0.85';
    playSound('summon_pulse');
  });
  em(R * 6.4, () => { pulse.style.opacity = '0'; });

  em(R * 7, () => {
    flash.style.opacity = '1';
    svg.style.transition = 'transform .35s ease, opacity .35s ease';
    svg.style.transform  = 'scale(1.5)';
    svg.style.opacity    = '0';
    playSound('summon_impact');
  });
  em(R * 8.2, () => {
    flash.style.opacity = '0';
    hatch();
  });
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

/* Pinta o ovo do ecrã.

   Tinha três ramos escritos à mão — Lendário dourado, Raro azul, o
   resto roxo — e com toda a gente a nascer Comum só o terceiro corria.
   Passa a receber as cores já escolhidas: as do avatar que está lá
   dentro, tiradas do DNA dele.

   O brilho e a aura acendem-se sempre. Eram o prémio de ser Lendário,
   e a raridade deixou de vir do ovo — conquista-se depois. Um ovo é um
   ovo, e todos merecem a mesma cerimónia. */
function applyEggVisual(cores, crackColor) {
  const c = cores || {};
  const topo   = c.topo   || '#5a3a9a';
  const meio   = c.meio   || '#2d1a5e';
  const fundo  = c.fundo  || '#0b0916';
  const brilho = c.brilho || '#8060c0';
  const aura   = c.aura   || topo;

  const stop1 = document.querySelector('#eggGrad stop:first-child');
  const stop2 = document.querySelector('#eggGrad stop:nth-child(2)');
  const stop3 = document.querySelector('#eggGrad stop:last-child');
  const aura1 = document.getElementById('eggAura1');
  const aura2 = document.getElementById('eggAura2');
  const glowEl = document.getElementById('eggGlowEl');
  const shine  = document.getElementById('eggShine');
  const sparks = document.getElementById('eggSparkles');

  if(stop1) stop1.setAttribute('stop-color', topo);
  if(stop2) stop2.setAttribute('stop-color', meio);
  if(stop3) stop3.setAttribute('stop-color', fundo);
  if(glowEl) { glowEl.setAttribute('fill', meio); glowEl.setAttribute('opacity','.5'); }
  if(shine)  shine.setAttribute('fill', brilho);
  if(aura1)  { aura1.setAttribute('stroke', aura);   aura1.style.opacity = '0.55';
               aura1.style.animation = 'eggAuraPulse 1.8s ease-in-out infinite'; }
  if(aura2)  { aura2.setAttribute('stroke', brilho); aura2.style.opacity = '0.3';
               aura2.style.animation = 'eggAuraPulse 1.8s ease-in-out infinite 0.4s'; }
  if(sparks) sparks.style.opacity = '0.7';

  /* O BRILHO FINAL TAMBÉM É DA COR DELE.

     Era `#c4b5fd` escrito à mão — o roxo do tempo em que os ovos eram
     roxos. Ficou para trás quando a casca passou a ser pintada pelo
     DNA: o ovo era vermelho e rebentava numa luz lilás.

     O branco do meio fica: é o clarão. O que muda é o halo. */
  const flash = document.getElementById('eggFlash');
  if(flash) flash.style.background =
    `radial-gradient(circle, #fff 0%, ${brilho} 40%, transparent 70%)`;

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

/* ════════════════════════════════════════════════════════════════════
   O OVO DA CHOCADEIRA

   Eram tres ovos pintados a mao, um por raridade: roxo, azul e dourado.
   Nao ha raridades ha muito, e por isso saiam todos roxos — a mesma cor
   para o filho de dois vermelhos e para o filho de dois azuis.

   Passa a ser pintado com a COR DE QUEM ESTA LA DENTRO, pela mesma
   conta que pinta o ovo da cerimonia e o bicho que sai dele
   (gradienteDoOvo, em js/cores.js). Sao os tres degraus todos do mesmo
   sitio, portanto o ovo da lista, o ovo da cerimonia e o avatar
   nascido nunca podem discordar.

   ── AS TRES FASES ──

   Um ovo parado durante trinta horas nao diz que esta a acontecer
   alguma coisa la dentro. Divide-se o choco em tres:

     1  INTEIRO    liso, aura fraca. Ainda e so um ovo.
     2  A MEXER    a primeira racha fina, e a aura acende
     3  QUASE      tres rachas, brilho por dentro, e o ovo balanca

   Depois delas vem o PRONTO, que ja nao e uma fase do choco: e o fim
   dele, e pulsa.

   As rachas sao fixas e escritas a mao, e nao sorteadas: um ovo que
   mudasse de rachas a cada vez que a lista se redesenha lia-se como
   ruido, e a lista redesenha-se a cada segundo.
   ════════════════════════════════════════════════════════════════════ */

// As tres rachas, por ordem de aparecimento. Coordenadas do viewBox
// 0 0 100 110, sobre a casca que vai de x 20 a 80 e y 18 a 94.
const OVO_RACHAS = [
  'M 50 26 L 46 38 L 53 46 L 48 58',
  'M 36 44 L 44 50 L 38 60 L 45 68',
  'M 64 40 L 57 52 L 63 62 L 56 72',
];

/* Em que fase do choco este ovo esta, de 0 a 3. O 3 e o pronto.
   Sem chocaEm nem postoEm nao ha progresso que medir — sao os ovos dos
   antigos, e esses estao prontos desde sempre. */
function faseDoOvo(ovo, agora) {
  agora = agora || Date.now();
  if (typeof ovoPronto === 'function' && ovoPronto(ovo, agora)) return 3;
  const fim = ovo.chocaEm, ini = ovo.postoEm || (fim - 36 * 3600000);
  const total = Math.max(1, fim - ini);
  const feito = Math.min(1, Math.max(0, (agora - ini) / total));
  return feito < 1 / 3 ? 0 : feito < 2 / 3 ? 1 : 2;
}

function eggMiniSVG(ovo, size = 36) {
  const fase = (ovo && typeof ovo === 'object') ? faseDoOvo(ovo) : 3;

  /* A cor sai de quem esta la dentro. Um ovo sem DNA nao tem ninguem
     conhecido dentro, e nesse a casca fica cinzenta — o que e a
     verdade, e nao uma cor inventada. */
  const temDna = _ovoTemDna(ovo);
  const g = (temDna && typeof gradienteDoOvo === 'function') ? gradienteDoOvo(ovo)
    : { topo:'#4a4658', meio:'#2a2836', fundo:'#0b0a12', brilho:'#8a8698', aura:'#5a5668' };

  const uid = 'ov' + Math.random().toString(36).slice(2, 7);

  /* Cada racha vai em DUAS passagens: uma escura e grossa por baixo, e a
     clara por cima. Sem a de baixo, uma racha branca sobre uma casca
     clara desaparece — e a lista desenha o ovo a 44px, onde meio pixel
     de contraste é a diferença entre ver e não ver.

     A espessura está medida aí e não em grande: em grande qualquer
     valor serve, e o tamanho que interessa é o que o jogador tem
     mesmo à frente. */
  const rachas = OVO_RACHAS.slice(0, fase).map((d, k) => {
    const w = 2.6 - k * 0.3;
    return `<path d="${d}" stroke="#0a0812" stroke-width="${w + 1.6}" fill="none"
              stroke-linecap="round" opacity=".55"/>
            <path d="${d}" stroke="#fff6e0" stroke-width="${w}" fill="none"
              stroke-linecap="round" opacity="${0.95 - k * 0.08}"/>`;
  }).join('');

  // A aura acende com a fase: e o sinal que se ve de mais longe na lista.
  const auraOp = [0.28, 0.42, 0.6, 0.85][fase];
  const brilhoOp = [0, 0.12, 0.28, 0.45][fase];

  return `<svg class="ovo-mini ovo-f${fase}" width="${size}" height="${Math.round(size * 1.1)}"
       viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="emg_${uid}" cx="38%" cy="28%" r="72%">
        <stop offset="0%"   stop-color="${g.topo}"/>
        <stop offset="60%"  stop-color="${g.meio}"/>
        <stop offset="100%" stop-color="${g.fundo}"/>
      </radialGradient>
      <filter id="egl_${uid}"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="50" cy="58" rx="34" ry="42" fill="${g.meio}" opacity=".45" filter="url(#egl_${uid})"/>
    <ellipse class="ovo-aura" cx="50" cy="56" rx="38" ry="48" fill="none"
             stroke="${g.aura}" stroke-width="1.2" opacity="${auraOp}"/>
    <g class="ovo-casca">
      <ellipse cx="50" cy="56" rx="30" ry="38" fill="url(#emg_${uid})"/>
      <ellipse cx="42" cy="40" rx="8" ry="13" fill="${g.brilho}" opacity=".22"/>
      ${brilhoOp ? `<ellipse cx="50" cy="60" rx="14" ry="18" fill="${g.brilho}" opacity="${brilhoOp}" filter="url(#egl_${uid})"/>` : ''}
      ${rachas}
    </g>
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

  /* ── OS QUATRO ESTADOS DE UM OVO ──

     A lista mostrava um só: um relógio a contar para a validade, igual
     para todos, e um botão de chocar sempre aceso. Um ovo por fazer e
     um ovo preso sem slot liam-se da mesma maneira.

     São quatro, e cada um tem uma coisa diferente a dizer ao jogador:

       A CHOCAR    falta tempo. Nada a fazer senão esperar.
       PRONTO      há ninho: o botão abre, e é a única coisa que
                   interessa naquele cartão.
       SEM NINHO   está pronto e não tem para onde ir. Não choca, e o
                   contador dos sete dias anda. O que se pede aqui não
                   é um clique — é abrir espaço.
       PODRE       acabou. Fica um botão só, e é o de deitar fora.

     A ordem da lista segue a urgência e não a raridade — que já não
     existe: primeiro os que estão a morrer, depois os prontos, e por
     fim os que ainda se estão a fazer. */
  const _agora = Date.now();
  const _haNinho = findTargetSlot() !== -1;
  const _estado = (ovo) => {
    if (typeof ovoPodre === 'function' && ovoPodre(ovo, _agora)) return 'podre';
    if (typeof ovoPronto === 'function' && !ovoPronto(ovo, _agora)) return 'chocando';
    return _haNinho ? 'pronto' : 'sem-ninho';
  };
  const _ORDEM = { podre: 0, 'sem-ninho': 1, pronto: 2, chocando: 3 };

  const sorted = [...eggsInInventory].sort((a, b) => {
    const ea = _estado(a), eb = _estado(b);
    if (_ORDEM[ea] !== _ORDEM[eb]) return _ORDEM[ea] - _ORDEM[eb];
    // Dentro do mesmo estado, o mais aflito primeiro.
    if (ea === 'sem-ninho') return faltaParaApodrecer(a, _agora) - faltaParaApodrecer(b, _agora);
    if (ea === 'chocando')  return faltaParaChocar(a, _agora)    - faltaParaChocar(b, _agora);
    return (a.postoEm || a.id || 0) - (b.postoEm || b.id || 0);
  });

  list.innerHTML = sorted.map(ovo => {
    const est = _estado(ovo);
    // Menos de um dia para apodrecer é o único caso que grita.
    const aflito = est === 'sem-ninho' && faltaParaApodrecer(ovo, _agora) < 86400000;
    const cls = 'egg-item'
      + (est === 'podre'      ? ' rotten'     : '')
      + (est === 'sem-ninho'  ? ' sem-ninho'  : '')
      + (aflito               ? ' urgent'     : '')
      + (est === 'chocando'   ? ' por-chocar' : '');

    let linhaEstado = '';
    if (est === 'chocando')
      linhaEstado = `<div class="egg-choco">⏳ ${t('egg.choca_em', { t: _tempoCurto(faltaParaChocar(ovo, _agora)) })}</div>`;
    else if (est === 'pronto')
      linhaEstado = `<div class="egg-pronto">🐣 ${t('egg.inv.pronto')}</div>`;
    else if (est === 'sem-ninho')
      linhaEstado = `<div class="egg-sem-ninho">${t('egg.inv.sem_ninho')}</div>
        <div class="egg-time ${aflito ? 'egg-time-urgent' : ''}">${
          t('egg.inv.apodrece_em', { t: _tempoCurto(faltaParaApodrecer(ovo, _agora)) })}</div>`;
    else
      linhaEstado = `<div class="egg-time egg-time-urgent">${t('egg.inv.rotten')}</div>`;

    /* Um ovo que ainda não é seu não se queima por engano: o botão de
       deitar fora só aparece quando ele está preso ou perdido. Nos
       outros dois estados a única acção possível é esperar ou chocar. */
    const acoes = est === 'pronto'
      ? `<button class="egg-btn hatch" onclick="hatchEggFromInventory(${ovo.id})">🐣 ${t('egg.btn.hatch')}</button>`
      : est === 'chocando'
      ? ''
      : `<button class="egg-btn burn" onclick="burnEgg(${ovo.id})">${t('egg.btn.discard')}</button>`;

    return `<div class="${cls}">
      <div class="egg-mini-svg">${eggMiniSVG(ovo, 44)}</div>
      <div class="egg-info">
        <div class="egg-name" style="color:${_corDoOvo(ovo)}">${esc(_rotuloDoOvo(ovo))}</div>
        ${linhaEstado}
      </div>
      <div class="egg-actions">${acoes}</div>
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
/* As cartas do ninho eram pintadas pela raridade do ovo — dourado,
   azul ou verde — e mostravam a palavra por baixo. Já não há raridade
   no ovo: cada carta passa a ter a COR do filho que está lá dentro, e
   nenhuma palavra. Um ovo verde é um ovo verde; escrever "Comum" por
   baixo não dizia mais nada a ninguém. */
const _OVO_COR_OMISSA = '#7a4fbb';

function abrirCerimoniaOvo(ovos, _custoAntigo, chocaEm) {
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
        // A cor do ovo é a do filho: o DNA dele viaja dentro do ovo.
        const cor = (typeof gradienteDoOvo === 'function' && o.dna)
          ? gradienteDoOvo({ nascimento: { dna: o.dna } }).aura : _OVO_COR_OMISSA;
        return `<div class="ovo-carta" style="--i:${i};--cor-ovo:${cor}">
                  <span class="ovo-emoji">🥚</span>
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
    /* O subtítulo anunciava raro ou lendário quando algum saísse. Já não
       há o que anunciar: diz de quem é filho, que é o que este ovo tem
       de especial e o outro não tinha. */
    const pais = ovos.find(o => o.maeNome || o.paiNome);
    if (sub) sub.textContent = pais
      ? t('egg.filho_de', { mae: pais.maeNome || '?', pai: pais.paiNome || '?' })
      : t('ovo.sub_comum');
    if (conta) {
      // A conta era do custo em moedas e da próxima postura. Cruzar não
      // custa moedas e não há próxima postura — o que interessa agora é
      // quando é que este ovo abre.
      const horas = chocaEm ? Math.max(1, Math.ceil((chocaEm - Date.now()) / 3600000)) : 0;
      conta.innerHTML =
        `<div class="ovo-conta"><span>${t('ovo.guardados')}</span><span class="val">${eggsInInventory.length} / 10</span></div>` +
        (horas ? `<div class="ovo-conta"><span>${t('egg.choca_em', { t: '' }).trim()}</span><span class="val">${t('ovo.horas', { h: horas })}</span></div>` : '');
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

/* Os títulos eram do avatar que punha o ovo sozinho — "PUS UM OVO" — e
   anunciavam raro ou lendário. Quem põe agora são dois, e não há
   raridade nenhuma para anunciar. */
window.registerStrings(
  {
    'ovo.titulo_um':    'NASCEU UM OVO',
    'ovo.titulo_multi': 'NASCERAM {n} OVOS',
    'ovo.sub_comum':    'O ovo está seguro',
    'ovo.guardados':    'Guardados',
    'ovo.horas':        '{h}h',
  },
  {
    'ovo.titulo_um':    'AN EGG WAS LAID',
    'ovo.titulo_multi': '{n} EGGS WERE LAID',
    'ovo.sub_comum':    'The egg is safe',
    'ovo.guardados':    'Stored',
    'ovo.horas':        '{h}h',
  }
);
