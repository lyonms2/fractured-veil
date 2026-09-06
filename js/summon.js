// ═══════════════════════════════════════════
// SUMMON SYSTEM
// ═══════════════════════════════════════════
// Quantos avatares vivos o jogador tem — usado pela interface de slots.
function avataresVivos() {
  if(typeof avatarSlots === 'undefined') return 0;
  return avatarSlots.filter(s => s && !s.dead).length;
}

/* ── QUANTAS AINDA PODE INVOCAR ──

   Eram cinco grátis e depois 500 moedas cada. Passam a ser TRÊS na vida,
   e depois nenhuma: quem quiser um quarto avatar compra-o na loja.

   O número que manda é o do SERVIDOR (`invocacoesUsadas`), guardado num
   campo que o cliente não escreve. O que está aqui é para a interface
   saber o que mostrar — quem recusa é o handleInvocar do api/pool.js.
   Perguntar ao gs.totalInvocacoes, que o cliente escreve, era pôr o
   limite à guarda de quem o quer ultrapassar.

   Conta INVOCAÇÕES, não avatares vivos: um avatar queimado ou morto
   continua a contar, portanto invocar-queimar-invocar à procura da cor
   ou da ficha ideal gasta as três na mesma.

   E não há rede de segurança. Havia — invocar era grátis com zero
   avatares vivos, para ninguém ficar preso sem poder jogar. Com um
   limite de três na vida, essa rede seria uma quarta invocação por outro
   nome. Quem perder os três compra na loja. */
function invocacoesRestantes() {
  const usadas = (typeof window !== 'undefined' && window._invocacoesUsadas) || 0;
  return Math.max(0, INVOCACOES_GRATIS - usadas);
}

// Índice do primeiro slot com um avatar vivo, ou -1 se não houver nenhum.
function primeiroSlotVivo() {
  if(typeof avatarSlots === 'undefined') return -1;
  return avatarSlots.findIndex(s => s && !s.dead);
}

/* O jogador tem alguma criatura? — em QUALQUER slot, não no que está
   aberto.

   Isto estava escrito duas vezes como `hatched && !dead`, no
   updateHeaderButtons e no updateAllUI, e as duas falavam do avatar do
   slot ATIVO. Fazia sentido quando havia um bicho de cada vez; desde
   que existe a colônia vivem todos, e o slot ativo só diz qual está
   espelhado nos globais.

   Uma cópia esconde os botões do topo e a outra desliga-os — portanto
   corrigir só uma deixava-os visíveis e mortos. Ficam as duas a
   perguntar aqui.

   O ovo por chocar não conta: ainda não é criatura. */
function jogadorTemCriatura() {
  if(typeof avatarSlots === 'undefined' || !Array.isArray(avatarSlots)) {
    return typeof hatched !== 'undefined' && hatched && !dead;
  }
  return avatarSlots.some(s => s && s.hatched && !s.dead);
}

/* A saída do beco sem saída: num slot vazio os botões de ação estão
   desligados e o ícone das moedas escondido, portanto sem isto não havia
   forma de chegar aos minigames para ganhar as moedas da invocação.

   Ia para o primeiro slot com um avatar vivo — uma escolha que o jogo
   fazia por quem tem três criaturas e não disse qual queria. Vai para a
   COLÔNIA, que é a casa: a lista de todos, com os vitais de cada um, e
   é lá que se escolhe em quem entrar. Era de lá que ele tinha vindo.

   Continua a precisar de haver alguém vivo — uma colônia vazia não é
   saída nenhuma, e quem está nesse caso tem a invocação de graça. */
async function voltarAColonia() {
  if(primeiroSlotVivo() < 0) return;
  if(typeof closeMarketplaceModal === 'function') closeMarketplaceModal();
  if(typeof ModalManager !== 'undefined' && ModalManager.closeAll) ModalManager.closeAll();

  /* ── E LARGA O SLOT ──

     Carregar aqui é desistir de invocar naquele slot, e desistir tem de
     o devolver. Sem isto o slot vazio continuava a ser o ATIVO, e na
     lista de avatares ele aparecia sem o "✦ Usar este slot" — porque
     esse botão só se desenha em slots que não são o ativo. O jogador
     desistia e ficava sem forma de voltar a tentar.

     Volta para o avatar que ele estava cuidando quando entrou no slot
     vazio, que o activateSlot guardou. Se isso já não servir — foi
     queimado, morreu, ou entrou-se aqui por outro caminho — vale o
     primeiro vivo, que é melhor do que ficar onde não há nada. */
  const guardado = window._slotAntesDeInvocar;
  const bom = (i) => typeof i === 'number' && avatarSlots[i]
                  && avatarSlots[i].hatched && !avatarSlots[i].dead;
  const destino = bom(guardado) ? guardado : primeiroSlotVivo();
  window._slotAntesDeInvocar = null;

  if(destino !== activeSlotIdx && typeof switchSlot === 'function') {
    await switchSlot(destino);
  }
  // Depois da troca, e não antes: o switchSlot chama o
  // rebuildScreensParaSlot, que sai da colônia — abrir primeiro era
  // abri-la para ela se fechar sozinha a seguir.
  if(typeof abrirFazenda === 'function') abrirFazenda();
}

/* ═══════════════════════════════════════════════════════════════════
   A CHEGADA — três saem da Fratura, um de cada vez

   ── O QUE MUDOU, E PORQUÊ ──

   Havia uma TELA DE INVOCAR: um painel com um botão, que o jogador
   carregava quando quisesse. Fazia sentido enquanto invocar era uma
   decisão repetida — cinco grátis e depois 500 moedas cada.

   Já não é. São três na vida, e a partir daí os avatares compram-se na
   loja ou nascem de uma cruza. Um painel para uma decisão que se toma
   uma vez, e cuja única resposta possível é sim, não é uma decisão: é
   um passo a mais entre o jogador e o jogo. A tela saiu, e os três
   chegam onde a história os anuncia — no fim do prólogo.

   ── E A CERIMÓNIA MOSTRAVA UM OVO ──

   O prólogo conta que a Fratura se abre e que dela SAI a criatura. A
   cerimónia a seguir mostrava um ovo a formar-se, e só depois, noutra
   tela, o ovo abria. O texto dizia uma coisa e a imagem dizia outra.

   Agora é o que estava escrito: a Fratura abre-se e o bicho atravessa.

   O ovo não desapareceu do jogo — mudou para onde lhe pertence. Um
   avatar que nasce de dois pais VEM mesmo de um ovo, e essa cerimónia
   é a do js/eggs.js. Invocado sai da Fratura; filho sai do ovo.
   ═══════════════════════════════════════════════════════════════════ */

// Quanto dura uma chegada, do preto ao preto. Três seguidas são ~10s —
// medido, e é o orçamento inteiro da abertura do jogo.
const CHEGADA_MS = 3400;

/* Pede um avatar ao servidor e escreve-o no slot. Sem interface
   nenhuma: quem mostra é a cerimónia, a seguir.

   Devolve o avatar, ou null se o servidor recusar. Falhar fechado — um
   erro de rede não pode ser um caminho para um avatar com genes
   escolhidos a dedo (ver handleInvocar, em api/pool.js). */
async function _emitirAvatar(slotIdx) {
  let emitido;
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'invocar', idToken, slotIdx }),
    });
    const json = await resp.json();
    if (!resp.ok || !json.ok) throw new Error(json.erro || 'sem resposta');
    emitido = json;
  } catch (e) {
    addLog('⚠️ ' + (e.message || t('summon.log.no_login')), 'bad');
    return null;
  }

  // O servidor devolve a conta feita: sem isto o cliente ficava a
  // pensar que ainda tinha as três, e a segunda chegada não sabia que
  // era a segunda.
  if (emitido.invocacoesUsadas != null) window._invocacoesUsadas = emitido.invocacoesUsadas;

  const dna = emitido.nascimento && emitido.nascimento.dna;
  const tom = (typeof tomDaCor === 'function' && dna && dna.genes && dna.genes.cor)
    ? tomDaCor(dna.genes.cor[0]) : 'brasa';
  /* ── CHEGA SEM NOME ──

     Saía daqui um nome sorteado, e o jogador ficava com o direito de o
     trocar uma vez. Duas coisas erradas nisso.

     A primeira é o prólogo: "Sem nome — nome é coisa que alguém dá, e
     ninguém deu". O texto dizia uma coisa e o jogo fazia outra, e essa
     era a última linha antes de eles chegarem.

     A segunda é o que o batismo passa a valer. Trocar um nome que já lá
     estava é uma opção; dar o primeiro é um acto — e é o primeiro que o
     jogador tem neste mundo.

     A ALCUNHA CHEGA COM ELE. Ela não é nome: é o que se vê nele, e
     ninguém lha deu. Guarda-se o ÍNDICE dela e não a palavra, para ela
     sair na língua de quem lê e no género dele — ver a nota grande no
     js/data.js. O campo do nome fica VAZIO até alguém o baptizar. */
  const nome         = '';
  const alcunhaIdx   = alcunhaIdxDeNascimento();
  const _descPool    = descricoesDoTom(tom);
  const descricaoIdx = Math.floor(Math.random() * _descPool.length);

  while (avatarSlots.length <= slotIdx) avatarSlots.push(null);

  /* NASCE JÁ VIVO, e não como ovo por chocar.

     O invocado passava por `pendingEgg: true` e só ficava `hatched` no
     fim da animação do ovo. Sem ovo, esse meio-termo não tem sentido —
     e tinha um custo: quem fechasse a aba a meio da cerimónia ficava
     com um slot num estado que só a animação sabia resolver. */
  avatarSlots[slotIdx] = {
    ...identidadeNova(),
    /* O id vem do SERVIDOR e sobrepõe-se ao que o identidadeNova()
       sorteou: é por ele que a certidão se reata ao slot no
       carregamento seguinte (applyGameState, em js/firebase.js). */
    id: emitido.id,
    nome, alcunhaIdx,
    raridade: 'Comum', descricao: _descPool[descricaoIdx], descricaoIdx,
    seed: emitido.seed,
    hatched: true, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: Date.now(), poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    petCooldown: 0,
    /* Já celebrou ser BEBÊ: a cerimónia disso foi esta. Sem isto nasce
       com faseVista -1, e o -1 quer dizer "ainda não sei" — que desliga
       o convite da evolução para sempre. Ver a nota em js/state.js. */
    faseVista: 0, nivelVisto: 1,
    vitals: {fome:100, humor:100, energia:100, saude:100, higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
  };
  /* A certidão veio pronta do servidor. Escrevê-la no slot é só para
     esta sessão ter o que mostrar — no carregamento seguinte é o mapa
     `certidoes` que manda, e o que estiver no slot é deitado fora. */
  avatarSlots[slotIdx].nascimento = emitido.nascimento;
  {
    const _c = emitido.nascimento || {};
    if (_c.criadorUid  != null) avatarSlots[slotIdx].criadorUid  = _c.criadorUid;
    if (_c.criadorNome != null) avatarSlots[slotIdx].criadorNome = _c.criadorNome;
    if (_c.nascidoEm)           avatarSlots[slotIdx].nascidoEm   = _c.nascidoEm;
  }

  return avatarSlots[slotIdx];
}


/* A cerimónia de UM. Devolve uma promessa que se cumpre quando a tela
   volta ao preto — é assim que as três se encadeiam sem se pisarem. */
function cerimoniaDeChegada(av) {
  return new Promise((resolve) => {
    const ov      = document.getElementById('summonOverlay');
    const ovBg    = document.getElementById('ovBg');
    const r1      = document.getElementById('ovRing1');
    const r2      = document.getElementById('ovRing2');
    const ovAv    = document.getElementById('ovAvatar');
    const ovParts = document.getElementById('ovParticles');
    if (!ov || !ovAv) { resolve(); return; }

    /* A cor da Fratura é a do bicho que a atravessa. Sai do mesmo sítio
       de onde saía a do ovo — os degraus de cor da criatura — porque é
       a mesma pergunta: de que cor é este? */
    const grad = (typeof gradienteDoOvo === 'function' && av && av.nascimento)
      ? gradienteDoOvo(av)
      : { aura: '#8b5cf6' };
    const cor = grad.aura;

    ovAv.style.cssText = 'width:12.5rem;height:12.5rem;opacity:0;transform:scale(.05);transition:none;display:flex;align-items:center;justify-content:center;';
    r1.style.cssText = r2.style.cssText = 'position:absolute;border-radius:50%;opacity:0;border:1px solid transparent;';
    ovParts.innerHTML  = '';
    ovBg.style.opacity = '0';

    /* ── E AQUI ESTÁ O BICHO ──

       Estava aqui um ovo desenhado à mão em SVG. É o mesmo desenho que
       a colónia mostra, com a fase 0 — um bebé, que é o que ele é. */
    ovAv.innerHTML = (typeof gerarSVG === 'function')
      ? gerarSVG(av, 'Comum', av.seed, 200, 200, 0) : '';

    for (let i = 0; i < 14; i++) {
      const p  = document.createElement('div');
      const sz = 2 + Math.random() * 5;
      p.className = 'ov-particle';
      p.style.cssText = `width:${sz/16}rem;height:${sz/16}rem;left:${10+Math.random()*80}%;bottom:-0.625rem;background:${cor};box-shadow:0 0 ${(sz*2)/16}rem ${cor};animation-duration:${2.5+Math.random()*3}s;animation-delay:${Math.random()*2}s;`;
      ovParts.appendChild(p);
    }

    const onda = () => {
      const sw = document.createElement('div');
      sw.className = 'ov-shockwave';
      sw.style.cssText = `border-color:${cor};position:absolute;top:50%;left:50%;`;
      document.getElementById('ovCircle').appendChild(sw);
      setTimeout(() => sw.remove(), 700);
    };

    ov.classList.add('active');
    setTimeout(() => { ovBg.style.opacity = '1'; }, 30);

    // A Fratura abre: dois anéis a girar em sentidos contrários.
    setTimeout(() => {
      r1.style.cssText = `position:absolute;inset:0.625rem;border-radius:50%;border:2px solid ${cor};opacity:0;animation:pspin 3s linear infinite;box-shadow:0 0 1.25rem ${cor}50,inset 0 0 20px ${cor}20;transition:opacity .5s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { r1.style.opacity = '.7'; }));
    }, 250);
    setTimeout(() => {
      r2.style.cssText = `position:absolute;inset:2.5rem;border-radius:50%;border:1px solid ${cor};opacity:0;animation:pspin 2s linear infinite reverse;box-shadow:0 0 0.9375rem ${cor}40;transition:opacity .4s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { r2.style.opacity = '.5'; }));
    }, 500);
    setTimeout(onda, 700);

    // E ele atravessa.
    setTimeout(() => {
      ovAv.style.transition = 'all .8s cubic-bezier(.34,1.5,.64,1)';
      ovAv.style.opacity    = '1';
      ovAv.style.transform  = 'scale(1)';
    }, 850);
    setTimeout(onda, 1650);

    // A Fratura fecha-se atrás dele.
    setTimeout(() => {
      ovAv.style.transition = 'all .55s ease-in';
      ovAv.style.opacity    = '0';
      ovAv.style.transform  = 'scale(1.12)';
      r1.style.opacity = r2.style.opacity = '0';
      ovBg.style.opacity = '0';
    }, CHEGADA_MS - 600);

    setTimeout(() => {
      ov.classList.remove('active');
      ovParts.innerHTML = '';
      resolve();
    }, CHEGADA_MS);
  });
}


/* ═══════════════════════════════════════════════════════════════════
   OS TRÊS

   Chamado pelo fim do prólogo, e mais nada — não há botão para isto.

   Faz as que FALTAM, e não três às cegas. É a mesma função que
   recupera de um erro: se a rede cair na segunda, o jogador entra no
   dia seguinte e as duas em falta acontecem então. Sem isto, um soluço
   de rede no pior momento custava um avatar para sempre — e ninguém
   tinha como o recuperar, porque não há mais botão de invocar.

   Quem conta é o servidor (`invocacoesUsadas`); aqui só se lê.
   ═══════════════════════════════════════════════════════════════════ */
async function invocarOsTres() {
  if (!walletAddress) { addLog(t('summon.log.no_login'), 'bad'); return 0; }

  if (typeof lockBodyScroll === 'function' && !window._summonTravou) {
    window._summonTravou = true;
    lockBodyScroll();
  }

  let nascidos = 0;
  const livres = getUnlockedSlots();

  while (invocacoesRestantes() > 0) {
    // O primeiro slot vago, que na primeira vez são o 1, o 2 e o 3.
    let idx = -1;
    for (let i = 0; i < livres; i++) {
      if (!avatarSlots[i]) { idx = i; break; }
    }
    if (idx === -1) break;                     // colónia cheia: pára aqui

    const av = await _emitirAvatar(idx);
    if (!av) break;                            // o servidor recusou: pára aqui
    nascidos++;
    await cerimoniaDeChegada(av);
    addLog(t('summon.log.chegou', { nome: alcunhaDe(av) || nomeCurto(av), n: idx + 1 }), 'good');
  }

  if (window._summonTravou && typeof unlockBodyScroll === 'function') {
    window._summonTravou = false;
    unlockBodyScroll();
  }

  if (nascidos > 0) {
    /* ── E VAI PARA A COLÓNIA, NÃO PARA O CUIDAR ──

       O jogo abria direto na tela de cuidar do primeiro. Com um avatar
       fazia sentido; com três, entrar num deles é escolher por quem
       ainda não escolheu, e esconder os outros dois no mesmo gesto.

       A colónia é a casa: os três lado a lado, com os medidores de cada
       um, e é lá que se decide em quem entrar. */
    /* E o recado, uma vez. Eles chegam sem nome e a colónia mostra-os
       como "Sem nome" — o que se vê, mas não o que há para fazer. Esta
       linha diz onde se baptiza, e diz que é uma vez só. */
    addLog(t('summon.log.batizar'), 'leg');

    activeSlotIdx = 0;
    loadRuntimeFromSlot(0);
    if (typeof updateAllUI === 'function') updateAllUI();
    saveToFirebase();
    if (typeof updateHeaderButtons === 'function') updateHeaderButtons();
    if (typeof abrirFazenda === 'function') abrirFazenda();
  }

  return nascidos;
}


// Chamado quando se volta ao jogo com um avatar que existe mas ainda não
// nasceu (avatar && !hatched) — alguém que fechou a aba nos 1,2s da
// animação, ou a quem a chocagem falhou a meio.
//
// Antes isto punha o ovo na tela e parava ali. Com a chocagem por
// cliques ainda viva, o jogador clicava cinco vezes e saía dali; depois
// de ela sair, ficava um ovo que não respondia a nada e sem botão
// nenhum — um beco sem saída. Agora termina o que ficou por terminar.
function setupAvatar() {
  document.getElementById('creatureCard').style.display = 'block';
  document.getElementById('idleScreen').style.display   = 'none';
  document.getElementById('eggScreen').style.display    = hatched ? 'none' : 'flex';
  document.getElementById('aliveScreen').style.display  = 'none';
  document.getElementById('deadScreen').style.display   = 'none';
  fillCreatureCard();
  if(!avatar.bornAt) addLog(t('summon.log.invoked', {nome: avatar.nome}), 'good');
  updateAllUI();
  scheduleSave();

  /* SÓ CHOCA QUEM AINDA NÃO NASCEU.

     Isto corria sempre. O setupAvatar() é chamado em todo o arranque
     com avatar vivo (auth.js) e em cada rebuildScreensParaSlot, e
     disparava a animação do ovo mesmo para um bicho nascido há dias:
     via-se o ovo, e 1,2 segundos depois o hatch() punha a criatura na
     tela — o que passava por normal, porque acabava onde devia.

     Com a colônia deixou de passar. O hatch() sai do modo colônia de
     propósito (acabou de nascer um bicho e é para o ver), portanto a
     consola abria certo, na lista, e um segundo depois saltava para
     uma criatura e ficava lá. Era este o "abre certo e na sequência
     vem essa tela".

     A guarda é a que o comentário desta função sempre descreveu: isto
     existe para quem fechou o jogo a meio da chocagem, não para quem
     já a fez. */
  if(!hatched && typeof hatchWithAnimation === 'function') {
    hatchWithAnimation(avatar, (typeof activeSlotIdx === 'number') ? activeSlotIdx : 0);
  }
}

// ═══════════════════════════════════════════
// EGG HATCH
// ═══════════════════════════════════════════

/* ── E O PRIMEIRO ACTO, LOGO A SEGUIR ──

   Quem sai do ovo sai sem nome, como quem atravessa a Fratura. A
   diferença é o momento: os três da abertura chegam três de uma vez e
   vão para a colónia, e prender o jogador a três cerimónias seguidas na
   primeira meia hora era começar o jogo com trabalho. Um ovo abre-se um
   de cada vez, e o jogador esperou um dia por ele — é o instante em que
   dar-lhe um nome quer mesmo dizer alguma coisa.

   Espera pela animação do nascimento (~1,2s) e mais um respiro: abrir a
   cerimónia por cima do bicho a aparecer roubava as duas coisas.

   E não obriga. A cerimónia tem "Agora não", e o batismo não expira —
   quem fechar continua com a pena a acenar no cartão. */
function _batizarORecemNascido(slot) {
  if (!slot || typeof startRename !== 'function') return;
  if (typeof temNome === 'function' && temNome(slot)) return;
  if (typeof podeRenomear === 'function' && !podeRenomear(slot)) return;
  setTimeout(() => {
    // Entretanto pode ter sido batizado à mão, ou ter mudado de estado.
    if (typeof temNome === 'function' && temNome(slot)) return;
    startRename(slot);
  }, 1400);
}

function hatch() {
  const pendingSlot = window._pendingEggSlot;
  const hatchingOtherSlot = typeof pendingSlot === 'number' && pendingSlot !== activeSlotIdx;

  if(hatchingOtherSlot) {
    const pendingAv = avatarSlots[pendingSlot];
    if(pendingAv) {
      delete pendingAv.pendingEgg;
      pendingAv.hatched    = true;
      pendingAv.bornAt     = Date.now();
      pendingAv.nivel      = pendingAv.nivel    || 1;
      pendingAv.xp         = pendingAv.xp       || 0;
      pendingAv.vinculo    = pendingAv.vinculo   || 0;
      pendingAv.totalOvos  = pendingAv.totalOvos || 0;
      pendingAv.totalRaros = pendingAv.totalRaros|| 0;
      pendingAv.listed     = false;
      pendingAv.vitals     = {fome:100,humor:100,energia:100,saude:100,higiene:100};
      pendingAv.eggs       = pendingAv.eggs  || [];
      pendingAv.items      = pendingAv.items || [];
      /* Já celebrou ser BEBÊ: a cerimónia disso foi o próprio ovo a
         abrir. Sem esta linha nasce com faseVista -1, e o -1 quer dizer
         "ainda não sei" — que desliga o convite da evolução para sempre.
         Ver a nota em js/state.js. */
      pendingAv.faseVista  = 0;
      pendingAv.nivelVisto = pendingAv.nivel;
    }
    window._pendingEggSlot = null;

    // Aqui limpava-se do inboxEggs o ovo que acabou de chocar. A caixa
    // acabou (ver applyGameState, em js/firebase.js) e quem consome o
    // ovo hoje é o servidor, no mapa `ovos`, na mesma transação em que
    // emite a certidão. Não sobra nada para limpar.

    document.getElementById('eggScreen').style.display  = 'none';
    document.getElementById('actionBtns').style.opacity = '1';
    document.getElementById('actionBtns').style.pointerEvents = 'all';
    loadRuntimeFromSlot(activeSlotIdx);
    // Sai da colônia: acabou de nascer um bicho e é para o ver.
    if (typeof fzSairDaColonia === 'function') fzSairDaColonia();
    document.getElementById('aliveScreen').style.display = 'block';
    document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize(), getFase());
    document.getElementById('phaseLabel').textContent = t('gt.phase.label', {fase: FASES[getFase()]});
    updateEquippedDisplay();
    renderEggInventory();
    updateAllUI();
    saveToFirebase();
    if(typeof updateHeaderButtons === 'function') updateHeaderButtons();
    showBubble(t('summon.bub.new_slot', {n: pendingSlot+1}));
    addLog(t('summon.log.born_slot', {nome: nomeCurto(pendingAv), n: pendingSlot+1}), 'good');
    _batizarORecemNascido(pendingAv);
    return;
  }

  // ── Chocagem normal (slot ativo) ──
  if(avatarSlots[activeSlotIdx]) delete avatarSlots[activeSlotIdx].pendingEgg;
  window._pendingEggSlot = null;

  hatched = true;
  bornAt  = bornAt || Date.now();
  if(avatar) {
    avatar.hatched   = true;
    avatar.bornAt    = bornAt;
    avatar.nivel     = avatar.nivel   || 1;
    avatar.xp        = avatar.xp      || 0;
    avatar.vinculo   = avatar.vinculo  || 0;
    avatar.totalOvos = avatar.totalOvos|| 0;
    avatar.totalRaros= avatar.totalRaros||0;
    avatar.listed    = false;
    avatar.vitals    = {...vitals};
  }
  /* O bicho acaba de nascer, logo já celebrou ser BEBÊ — a cerimónia
     disso foi o ovo a abrir, dois segundos atrás.

     Isto faltava, e custava a cerimónia inteira: o faseVista ficava em
     -1, o evolucaoPendente() pergunta por `faseVista >= 0` e respondia
     sempre que não, e o convite "estou pronto para evoluir" nunca
     chegava a aparecer. Como o getFaseVisual() também devolve a fase
     real quando o faseVista é negativo, o corpo crescia sozinho na tela
     — que é precisamente o que a cerimónia existe para impedir. */
  faseVista  = getFase();
  nivelVisto = nivel;

  // O mesmo do outro caminho de chocagem: o ovo sai do mapa `ovos` no
  // servidor, e o inbox já não existe.

  scheduleSave();
  document.getElementById('statusCard').style.display = 'block';
  poopCount = 0;
  dirtyLevel = 0;
  vitals.higiene = 100;
  poopPressure = 0;

  document.getElementById('eggScreen').style.display = 'none';

  if (typeof fzSairDaColonia === 'function') fzSairDaColonia();
  const alive = document.getElementById('aliveScreen');
  alive.style.display = 'block';
  alive.style.opacity = '0';
  alive.style.transition = 'opacity .6s ease';

  document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize(), getFase());
  document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
  updateEquippedDisplay();

  // O botão de botar ovo vivia aqui. Foi-se com a postura sozinha:
  // ovo é filho, e põe-se cruzando dois, na colónia.

  renderEggInventory();
  saveToFirebase();
  if(typeof updateHeaderButtons === 'function') updateHeaderButtons();

  const btns = document.getElementById('actionBtns');
  btns.style.opacity = '1';
  btns.style.pointerEvents = 'all';

  requestAnimationFrame(() => { alive.style.opacity = '1'; });
  setTimeout(() => { alive.style.transition = ''; }, 700);

  const wrap = document.getElementById('creatureWrap');
  wrap.style.transform = 'scale(0) translateY(30px)';
  wrap.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
  setTimeout(() => { wrap.style.transform = 'scale(1) translateY(0)'; }, 100);
  setTimeout(() => { wrap.style.transition = ''; }, 700);

  playSound('hatch');
  const _rar = avatar?.raridade;
  if(_rar === 'Lendário') playSound('rarity_lendario');
  else if(_rar === 'Raro') playSound('rarity_raro');
  else                     playSound('rarity_comum');
  showBubble(t('summon.bub.hello'));
  addLog(t('summon.log.born', {nome: nomeCurto(avatar)}), 'good');
  _batizarORecemNascido(avatar);

  if(!localStorage.getItem('fv_first_hatch')) {
    localStorage.setItem('fv_first_hatch', '1');
    setTimeout(() => addLog(t('onboard.tip.feed'), 'info'), 2000);
    setTimeout(() => addLog(t('onboard.tip.play'), 'info'), 4500);
    setTimeout(() => addLog(t('onboard.tip.rest'), 'info'), 7500);
  }
}
