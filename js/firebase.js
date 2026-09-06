// ═══════════════════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════════════════
let walletAddress = null;

/* O nome de quem joga. Vive ao lado do walletAddress porque e da mesma
   familia: identifica a PESSOA, nao o avatar aberto. E gravado no topo
   do documento do jogador, como o nomeBusca, e e ele que fica carimbado
   em cada avatar que ela cria. Ver js/identidade.js. */
let nomeJogador = null;

// ═══════════════════════════════════════════════════════════════════
// FIREBASE HELPERS
// ═══════════════════════════════════════════════════════════════════
function fbDb() { return typeof _fbDb !== "undefined" ? _fbDb : null; }

/* ═══════════════════════════════════════════════════════════════════
   O QUE O CLIENTE NÃO GRAVA

   O documento players/{uid} guardava lado a lado duas coisas muito
   diferentes: o estado do bicho (fome, humor, sujeira — inofensivo) e o
   dinheiro. E o cliente gravava tudo.

   Isso era um caminho direto para MATIC real. O api/resgatar.js, que
   assina o saque, lê DESTE documento tudo o que decide o saque:

     linha 248  gs.cristais     o saldo que o autoriza
     linha 255  ultimoResgate   a espera de 30 segundos
     linha 263  resgateLog      o limite de 50 gemas por dia
     linha 271  carteira        para onde o MATIC vai

   Quem escrevesse gs.cristais e apagasse o resgateLog no próprio
   documento passava as quatro travas de uma vez, porque as quatro viviam
   no sítio que ele controlava. O mesmo valia para o cambioLog, de onde o
   api/cambiar.js tira o limite diário de câmbio: gravá-lo a null zerava
   o limite.

   Agora o cliente não envia nada disto. Com merge:true, um campo omitido
   fica como está no servidor — portanto o saldo continua a ler-se e a
   mostrar-se normalmente, só deixa de ser reescrito daqui.

   Do lado das regras há a outra metade: a firestore.rules recusa
   qualquer escrita que mexa nestes campos. As duas coisas juntas é que
   fecham a porta — só o cliente educado não chegava, porque o console
   está aberto a quem quiser.

   O Admin SDK do servidor não passa por regras nenhumas, portanto os
   endpoints continuam a escrever à vontade.
═══════════════════════════════════════════════════════════════════ */
/* As MOEDAS ficam de fora desta lista, e não por esquecimento.

   O earnCoins() credita moedas no cliente em doze sítios — minijogos,
   combate PvE, chocar ovos. A economia inteira das recompensas é
   client-side. Travá-las aqui parava o jogo, e movê-las para o servidor é
   outro trabalho, muito maior do que este.

   O que isto deixa em aberto, dito com todas as letras: quem forjar
   moedas ainda pode trocá-las por cristais no câmbio. Mas o câmbio tem
   travas que o saque não tinha — nível 20 no mínimo, e um tecto diário
   por raridade (1 comum, 2 raro, 4 lendário) que agora vive no cambioLog
   que o cliente deixou de escrever, mais o tecto global de 100 da pool.
   Passa-se de um dreno sem limite para um fio de 4 cristais por dia.

   Os CRISTAIS podem travar-se porque só vêm de respostas do servidor. As
   duas exceções — arena.js e batalha-naval.js, que os somam no cliente —
   são o PvP, que está desligado. Se voltar, tem de passar pelo servidor
   primeiro. */
const _GS_DO_SERVIDOR = ['cristais', 'extraSlots'];

function _gsSemDinheiro() {
  const limpo = {};
  for (const k of Object.keys(gs)) {
    if (_GS_DO_SERVIDOR.indexOf(k) === -1) limpo[k] = gs[k];
  }
  return limpo;
}

function getGameState() {
  // Flush current runtime state into active slot before saving
  saveRuntimeToSlot(activeSlotIdx);

  // Garantir que o array cobre todos os slots desbloqueados antes de serializar
  const _neededGet = Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
  while(avatarSlots.length < _neededGet) avatarSlots.push(null);

  // FIX: se há algum slot com pendingEgg, NÃO incluir avatarSlots no save.
  // O array de slots com um null no lugar do slot pendente apagaria o avatar
  // que estava nesse slot antes da chocagem começar.
  const hasPendingEgg = avatarSlots.some(s => s && s.pendingEgg);
  if(hasPendingEgg) {
    return {
      gs:        _gsSemDinheiro(),
      // cambioLog não vai: é do servidor (limite diário do câmbio)
      lastSeen:  Date.now()
      // avatarSlots deliberadamente omitido — merge:true preserva o valor atual no Firebase
    };
  }

  // Serialize slots — each slot is self-contained
  const slotsSafe = avatarSlots.map(s => {
    if(!s || s.pendingEgg) return null; // pendingEgg slots are never persisted
    return {
      /* ── A IDENTIDADE PERMANENTE ──
         Sete campos planos, e planos de proposito: o avatar e
         reconstruido campo a campo aqui e mais duas vezes no
         api/comprar-avatar.js, e um objecto encaixado sobrevive a
         esses tres ate ao dia em que houver um quarto sitio.

         O `id` nao leva valor por omissao. Um avatar sem id e um
         avatar que o garantirIdentidades() ainda nao viu, e inventar
         um aqui — no caminho da GRAVACAO — daria ids diferentes a
         cada gravacao ate a migracao correr. Fica nulo e visivel. */
      id:          s.id          || null,
      criadorUid:  s.criadorUid  || null,
      criadorNome: s.criadorNome || null,
      mae:         s.mae         || null,
      pai:         s.pai         || null,
      nascidoEm:   s.nascidoEm   || s.bornAt || 0,
      nomeTravado: s.nomeTravado ?? false,
      /* A ESCOLHA DO ANCIÃO, que também se faz uma vez só.

         Fica ao lado do nomeTravado por ser da mesma família: não é
         estado que anda com o relógio, é uma decisão tomada e selada.
         Sem esta linha a primeira gravação apagava-a e o avatar
         acordava sem a segunda virtude que escolheu. */
      escolhaAnciao: s.escolhaAnciao || null,
      /* Por quantas mãos já passou. Só o api/comprar-avatar.js lhe
         acrescenta entradas — aqui apenas se guarda o que lá vem, e
         guarda-se sempre, senão a próxima gravação do cliente apagava
         uma história que o servidor tinha escrito. */
      donos: Array.isArray(s.donos) ? s.donos : [],
      /* A CERTIDAO DE NASCIMENTO.

         Vai inteira e sem valor por omissao: um avatar sem certidao
         nasceu antes disto existir, e inventar-lhe uma aqui seria
         escrever uma data de nascimento que ninguem observou.

         E NAO se reescreve: quem grava so copia o que ja la esta. O
         unico caminho de escrita e o registarNascimento, que recusa
         se ja houver uma. */
      /* A CERTIDÃO NÃO VAI DAQUI. Vive no mapa `certidoes`, que só o
         servidor escreve — mandá-la no slot era reabrir a porta que a
         mudança fechou: o cliente escreveria a sua versão, e no
         carregamento seguinte seria ela a valer.

         O applyGameState reata-a ao slot em memória. Ver a nota lá. */
      // Avatar identity
      nome:      s.nome      || '',
      raridade:  s.raridade  || 'Comum',
      descricao:    s.descricao    || '',
      descricaoIdx: s.descricaoIdx ?? null,
      seed:         s.seed         || 0,
      listed:    s.listed    || false,
      // Runtime state
      hatched:        s.hatched        ?? false,
      dead:           s.dead           ?? false,
      sick:           s.sick           ?? false,
      sleeping:       s.sleeping       ?? false,
      nivel:          s.nivel          ?? 1,
      xp:             s.xp             ?? 0,
      vinculo:        s.vinculo        ?? 0,
      totalSecs:      s.totalSecs      ?? 0,
      bornAt:         s.bornAt         ?? 0,
      poopCount:      s.poopCount      ?? 0,
      dirtyLevel:     s.dirtyLevel     ?? 0,
      poopPressure:   s.poopPressure   ?? 0,
      // O `??` deixava passar o -1, e o -1 desliga a cerimónia da
      // evolução para sempre. Ver js/state.js.
      faseVista:      s.faseVista  >= 0 ? s.faseVista  : 0,
      nivelVisto:     s.nivelVisto >= 1 ? s.nivelVisto : 1,
      petCooldown:    s.petCooldown    ?? 0,
      activeDiseases: s.activeDiseases ? [...s.activeDiseases] : [],
      diseaseStress:  s.diseaseStress  ? {...s.diseaseStress}  : { exaustao:0, desnutricao:0, infeccao:0, melancolia:0 },
      vitals:         s.vitals ? {...s.vitals} : {fome:100,humor:100,energia:100,saude:100,higiene:100},
      /* O ovo leva consigo o filho.

         Guardava id, raridade, elemento e validade — e mais nada.
         Um ovo de cruzamento traz o DNA do filho já feito e o
         registo dos pais; sem isto, a primeira gravação apagava a
         herança e o filho nascia de estranhos.

         A raridade fica de fora: o ovo já não tem nenhuma. */
      /* O filtro era `Date.now() < e.expiraEm`: a validade contava da
         postura, e um ovo por chocar podia apodrecer à espera. Agora o
         relógio só anda quando o ovo está pronto e sem ninho, e é o
         ovoPodre que sabe disso. */
      /* ── DAQUI VAI SÓ ONDE O OVO ESTÁ ──

         Ia o ovo inteiro: o DNA do filho, os pais, os retratos, a hora
         de chocar. Tudo isso é o que o ovo VALE, e ia num array que o
         cliente escreve por inteiro — quem abrisse o console escrevia
         os genes do próprio filho, ou inventava um ovo do nada.

         Passou para o mapa `ovos`, que só o servidor escreve. O que
         fica aqui é a colocação — em que slot está e por que ordem — e
         o relógio do apodrecimento, que é do cliente. O applyGameState
         reata o resto pelo id; ver a nota lá em cima. */
      eggs:           (s.eggs  || []).filter(e => !(typeof ovoPodre === 'function' && ovoPodre(e))).map(e => ({
        id: e.id,
        // Desde quando está preso sem slot. Tem de sobreviver ao save:
        // sem isto, fechar o jogo devolvia ao ovo os sete dias todos.
        semNinhoDesde: e.semNinhoDesde || null,
      })),
      items:          (s.items || []).map(i => ({...i})),
      // Marketplace stats
      diasVida:   s.bornAt ? Math.floor((Date.now()-s.bornAt)/86400000) : 0,
      totalOvos:  s.totalOvos  || 0,
      totalRaros: s.totalRaros || 0,
    };
  });

  // nomeBusca — campo de topo para pesquisa de amigos (nome do avatar ativo, minúsculas)
  const _activeSlot = avatarSlots[activeSlotIdx];
  const nomeBusca = (_activeSlot?.hatched && !_activeSlot?.dead && _activeSlot?.nome)
    ? _activeSlot.nome.split(',')[0].toLowerCase().trim()
    : '';

  return {
    avatarSlots:   slotsSafe,
    activeSlotIdx: activeSlotIdx,
    gs:            _gsSemDinheiro(),
    // cambioLog não vai: é do servidor (limite diário do câmbio)
    lastSeen:      Date.now(),
    nomeBusca,
    // Quem joga. No topo e nao dentro do gs: o gs e o saldo e o
    // progresso, e este e a pessoa. Ver js/identidade.js.
    nomeJogador:   nomeJogador || null,
  };
}

function applyGameState(data) {
  if(!data) return false;
  window.loadedLastSeen = data.lastSeen || Date.now();
  /* Quantas invocações este jogador já gastou. Vem do servidor e o
     cliente não lhe toca — aqui só se guarda para a interface saber
     quantas restam. Quem recusa a quarta é o handleInvocar. */
  window._invocacoesUsadas = data.invocacoesUsadas || 0;

  // Quem joga. Nulo na primeira entrada — e ai que lhe e pedido.
  nomeJogador = data.nomeJogador || null;

  // gs (moedas, cristais, extraSlots)
  if(data.gs) Object.assign(gs, data.gs);
  if(data.cambioLog !== undefined) window._cambioLog = data.cambioLog;
  if(data.gs?.cristais   !== undefined) gs.cristais   = data.gs.cristais;
  else if(data.cristais  !== undefined) gs.cristais   = data.cristais;
  if(data.gs?.extraSlots !== undefined) gs.extraSlots = data.gs.extraSlots;
  else if(data.extraSlots !== undefined) gs.extraSlots = data.extraSlots;

  // Se o activeSlotIdx vai mudar, flush o slot atual em memória primeiro
  const incomingSlotIdx = data.activeSlotIdx !== undefined ? data.activeSlotIdx : activeSlotIdx;
  if(incomingSlotIdx !== activeSlotIdx) {
    saveRuntimeToSlot(activeSlotIdx);
  }

  /* ── A CERTIDÃO VEM DO SERVIDOR, E SOBREPÕE-SE AO QUE ESTIVER NO SLOT ──

     Ela vive num mapa `certidoes` que o cliente não escreve
     (firestore.rules), e é lá que estão os genes — o corpo, a índole, a
     cor, a tendência, o vigor. Aqui reata-se cada uma ao seu slot, em
     memória, para os quarenta sítios que leem slot.nascimento
     continuarem a ler o mesmo.

     Sobrepõe-se SEMPRE, e apaga quando não há: um `nascimento` deixado
     dentro do slot por um cliente modificado deixa de valer o que quer
     que seja. É por isto que a mudança fecha a porta, e não só a
     estreita. */
  const _certs = (data.certidoes && typeof data.certidoes === 'object') ? data.certidoes : {};

  /* ── E OS OVOS TAMBÉM ──

     Mesma ideia, mesmo motivo. Um ovo É o DNA do filho que lá está
     dentro, e esse DNA vive no mapa `ovos`, que só o handleCruzar
     escreve (api/pool.js, firestore.rules).

     O `slot.eggs` fica a dizer apenas ONDE está cada ovo — em que slot,
     e por que ordem. Aqui reata-se o conteúdo a cada id, e um ovo cujo
     id não esteja no mapa DESAPARECE: um ovo escrito à mão no
     avatarSlots deixa de ser um ovo. */
  const _ovosSrv = (data.ovos && typeof data.ovos === 'object') ? data.ovos : {};
  const _reatarOvo = e => {
    if (!e || e.id == null) return null;
    const o = _ovosSrv[String(e.id)];
    if (!o) return null;
    /* O que o SERVIDOR sabe sobrepõe-se; o que ele não guarda — desde
       quando o ovo está sem ninho — fica do lado do cliente, porque é o
       relógio do jogo que o escreve (js/gametick.js) e não vale nada
       para ninguém a não ser para o próprio ovo apodrecer. */
    return Object.assign({}, o, { id: String(e.id), semNinhoDesde: e.semNinhoDesde || null });
  };

  // Restore slots
  if(data.avatarSlots) {
    avatarSlots = data.avatarSlots.map(s => {
      if(!s) return null;
      const restored = {...s};
      const _cert = s.id ? _certs[s.id] : null;
      if (_cert) restored.nascimento = _cert;
      else delete restored.nascimento;
      if (Array.isArray(s.eggs)) restored.eggs = s.eggs.map(_reatarOvo).filter(Boolean);
      /* Aqui havia duas linhas de manutenção do ELEMENTO: uma convertia
         os elementos que o jogo já não tinha, outra reanexava ao avatar
         a entrada da tabela de características.

         Não sobrou nem a tabela nem quem a lesse. Um avatar gravado com
         elemento continua a carregá-lo no Firestore e ninguém lhe pega:
         a cor dele sai do DNA quando o tem, e da SEED quando não tem
         (coresDe, em js/cores.js). O campo não se apaga — apagar dados
         de quem já jogou não traz nada; só se deixa de o ler. */
      return restored;
    });
  }
  if(data.activeSlotIdx !== undefined) activeSlotIdx = data.activeSlotIdx;


  // ── Consumir inboxVisitas ──
  // Quem passou pelo teu bicho enquanto estavas fora. O vínculo já foi
  // somado ao slot pelo servidor (dentro da mesma transação da visita);
  // aqui só se guarda o recado para o mostrar, e limpa-se lá.
  if(Array.isArray(data.inboxVisitas) && data.inboxVisitas.length > 0) {
    window._visitasRecebidas = data.inboxVisitas.slice();
  }

  /* ── O INBOX DE OVOS ACABOU ──

     Era a caixa de entrada da venda de ovos: um ovo comprado a outro
     jogador chegava lá, escrito pelo servidor, e este bloco passava-o
     para o inventário do slot activo.

     A venda de ovos acabou há muito, e com ela quem escrevia no inbox —
     não sobrou um único endpoint que lá ponha seja o que for. Ficou
     código a consumir uma caixa que ninguém enche.

     E a partir de hoje seria pior do que inútil: a prova de que um ovo
     existe é ele estar no mapa `ovos` (handleChocarOvo, em api/pool.js),
     e um ovo vindo do inbox não está lá. Apareceria no inventário e
     recusava-se a chocar — uma avaria à espera de acontecer.

     O campo não se apaga de quem já o tem no documento. Só se deixa de
     o ler, como se fez com o elemento. */

  // Garantir que o array cobre todos os slots desbloqueados restaurados
  const _neededApply = Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
  while(avatarSlots.length < _neededApply) avatarSlots.push(null);

  /* ── OS QUE NASCERAM ANTES DA IDENTIDADE EXISTIR ──

     Ganham id aqui, ao entrar, e nao ao gravar: o id tem de ser o
     MESMO em todas as gravacoes, e inventa-lo no caminho da escrita
     dava um novo de cada vez ate a migracao correr.

     Criador fica nulo. Ninguem sabe quem os fez, e escrever o dono
     actual seria transformar uma venda em autoria — a interface diz
     desconhecido, que e a verdade. O nome fica travado: um avatar
     que ja viveu semanas com o nome que tem nao devia poder mudar
     por causa de uma regra nova. */
  if(typeof garantirIdentidades === 'function') {
    const _carimbados = garantirIdentidades(avatarSlots);
    if(_carimbados) console.log('[identidade] ' + _carimbados + ' avatar(es) sem id — carimbados agora.');
  }

  /* A RARIDADE QUE JÁ FOI GANHA.

     A raridade deixou de sair do ovo e passa a sair da fase (ver
     js/raridade.js). Quem já estava jogando tem nível e horas de sobra
     e nunca subiu — porque a regra não existia quando ele subiu de
     fase. Corre-se aqui, na LEITURA, uma vez por sessão.

     Nunca desce: o sincronizarRaridade só sobe. Um Lendário comprado
     no tempo dos ovos raros continua Lendário. */
  if(typeof sincronizarRaridades === 'function') {
    const _subiram = sincronizarRaridades(avatarSlots);
    if(_subiram) console.log('[raridade] ' + _subiram + ' avatar(es) subiram para a raridade que a fase deles já dava.');
  }

  // Limpa itens e ovos expirados em todos os slots ao carregar
  const _now = Date.now();
  avatarSlots.forEach(slot => {
    if(!slot) return;
    if(slot.items) {
      const bi = slot.items.length;
      slot.items = slot.items.filter(i => !i.expiraEm || _now <= i.expiraEm);
      if(slot.items.length < bi) console.log(`[applyGameState] ${bi - slot.items.length} item(s) expirado(s) removido(s).`);
    }
    if(slot.eggs) {
      // Os ovos apodreciam em SILÊNCIO: iam para um console.log que só o
      // programador vê. Os itens sempre avisaram ("expirou após 30
      // dias") — quem perdia um ovo lendário nunca ficava sabendo.
      const podres = slot.eggs.filter(e => typeof ovoPodre === 'function' && ovoPodre(e, _now));
      slot.eggs = slot.eggs.filter(e => !(typeof ovoPodre === 'function' && ovoPodre(e, _now)));
      if(podres.length) {
        window._ovosPodres = (window._ovosPodres || []).concat(
          podres.map(e => ({ id: e.id, semNinhoDesde: e.semNinhoDesde })));
      }
    }
  });

  // Load active slot into runtime variables
  loadRuntimeFromSlot(activeSlotIdx);

  // Dead state vem do Firebase — fallback via RTDB presence (ver setupPresence/getPresenceData)

  /* Os ovos que ficaram sem slot em memória — o saveRuntimeToSlot
     guarda-os aqui quando o slot activo é nulo (js/state.js) — voltam
     ao inventário. Não são ovos novos: são os mesmos, e continuam no
     mapa `ovos` do servidor, que é quem sabe o que eles são. */
  if(window._orphanEggs && window._orphanEggs.length > 0) {
    const existingIds = new Set(eggsInInventory.map(e => e.id));
    window._orphanEggs.forEach(e => {
      if(!existingIds.has(e.id)) eggsInInventory.push({...e});
    });
    const slot = avatarSlots[activeSlotIdx];
    if(slot) {
      if(!slot.eggs) slot.eggs = [];
      const slotIds = new Set(slot.eggs.map(e => e.id));
      window._orphanEggs.forEach(e => {
        if(!slotIds.has(e.id)) slot.eggs.push({...e});
      });
      window._orphanEggs = null;
    }
  }

  return true;
}

let _saveTimeout = null;
function scheduleSave() {
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveToFirebase, 5000);
}

async function saveToFirebase() {
  if(!walletAddress || !fbDb()) return;
  try {
    const state = getGameState();
    await fbDb().collection('players').doc(walletAddress).set(state, { merge: true });

    /* Os órfãos largam-se depois de o estado ir gravado — eles já lá
       estão dentro. Havia aqui um ciclo que os devolvia ao inboxEggs, e
       a seguir uma limpeza que esvaziava essa caixa; as duas coisas
       saíram com a própria caixa (ver applyGameState). */
    if(window._orphanEggs || window._orphanItems) {
      window._orphanEggs  = null;
      window._orphanItems = null;
    }
    // Os recados de visita seguem o mesmo caminho dos ovos: lidos ao
    // entrar, limpos no primeiro save. Se falhar, ficam lá e aparecem da
    // próxima — melhor repetidos do que perdidos.
    if(window._visitasPorLimpar) {
      window._visitasPorLimpar = false;
      await fbDb().collection('players').doc(walletAddress).update({ inboxVisitas: [] });
    }
  } catch(e) { console.warn('Save error:', e); }
}

async function loadFromFirebase() {
  if(!walletAddress || !fbDb()) return false;
  try {
    const snap = await fbDb().collection('players').doc(walletAddress).get();
    if(!snap.exists) return false;
    applyGameState(snap.data());
    return true;
  } catch(e) { console.warn('Load error:', e); return false; }
}

// ═══════════════════════════════════════════════════════════════════
// PRESENCE — lastSeen e deadSlot server-side via RTDB onDisconnect
// Impede que o usuário manipule localStorage para contornar decay/morte
// ═══════════════════════════════════════════════════════════════════

function _presRef(uid) {
  const db = typeof _rtdb !== 'undefined' ? _rtdb : null;
  return (db && uid) ? db.ref('presence/' + uid) : null;
}

// Chamar após login: regista onDisconnect no RTDB — Firebase escreve server-side ao desligar
function setupPresence(uid) {
  const db = typeof _rtdb !== 'undefined' ? _rtdb : null;
  if(!db || !uid) return;
  db.ref('.info/connected').on('value', snap => {
    if(!snap.val()) return;
    const ref = _presRef(uid);
    if(!ref) return;
    ref.onDisconnect().update({
      lastSeen: firebase.database.ServerValue.TIMESTAMP,
      online:   false,
    });
    ref.update({ online: true });
  });
}

// Ler lastSeen e deadSlot do RTDB (server-side, não manipulável)
async function getPresenceData(uid) {
  const ref = _presRef(uid);
  if(!ref) return null;
  try {
    const snap = await ref.once('value');
    return snap.val() || null;
  } catch(e) { return null; }
}

// Chamar quando o avatar morre: garante dead:true mesmo se browser fechar antes do Firestore salvar
function setPresenceDead(uid, slotIdx) {
  const ref = _presRef(uid);
  if(!ref) return;
  ref.update({ deadSlot: slotIdx });
  ref.onDisconnect().update({ deadSlot: slotIdx });
}

// Limpar deadSlot após aplicado (ou após novo avatar ser invocado)
function clearPresenceDead(uid) {
  const ref = _presRef(uid);
  if(ref) ref.child('deadSlot').remove().catch(() => {});
}

// Auto-save on every gameTick cycle (every 60s)
// ═══════════════════════════════════════════════════════════════════
