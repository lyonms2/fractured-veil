// ═══════════════════════════════════════════
// SUMMON SYSTEM
// ═══════════════════════════════════════════
// Quantos avatares vivos o jogador tem — usado pela interface de slots.
function avataresVivos() {
  if(typeof avatarSlots === 'undefined') return 0;
  return avatarSlots.filter(s => s && !s.dead).length;
}

// Grátis nas primeiras INVOCACOES_GRATIS, e sempre grátis se o jogador
// ficou sem nenhum avatar vivo — essa é a rede de segurança para nunca
// ficar preso sem forma de jogar.
//
// Repare que conta INVOCAÇÕES TOTAIS, não avatares vivos. Um avatar
// queimado ou morto continua contando, portanto invocar-queimar-invocar
// à procura do elemento ou da ficha ideal gasta as tentativas grátis
// como qualquer outra. Só se pode queimar um slot que não seja o ativo
// (ver avatars-market.js), logo também não dá para chegar a zero vivos
// de propósito para reativar a rede de segurança.
function custoDaInvocacao() {
  if(avataresVivos() === 0) return 0;
  return (gs.totalInvocacoes || 0) < INVOCACOES_GRATIS ? 0 : SUMMON_CUSTO;
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

     Volta para o avatar que ele estava a cuidar quando entrou no slot
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

// Mostra/esconde o aviso de bloqueio no painel de invocação.
// Chamado por updateResourceUI(), ou seja, depois de qualquer mudança de
// estado (trocar de slot, ganhar moedas num minigame, invocar).
function updateSummonLockHint() {
  const box = document.getElementById('summonLockHint');
  if(!box) return;
  const btn = document.getElementById('btnSummon');

  const custo    = custoDaInvocacao();
  // Só interessa num slot vazio — é aí que o painel de invocação aparece
  const semSaldo = !avatar && custo > 0 && gs.moedas < custo;

  /* ── A CONTA ANTES DA DECISÃO ──
     O preço vivia dentro do rótulo do botão e o saldo não aparecia em
     lado nenhum: para saber se dava, era preciso carregar e ver. */
  const elCusto = document.getElementById('summonCusto');
  const elSaldo = document.getElementById('summonSaldo');
  if(elCusto) elCusto.textContent = custo > 0 ? custo + ' 🪙' : t('mag.custo.livre');
  if(elSaldo) {
    elSaldo.textContent = (gs.moedas || 0) + ' 🪙';
    elSaldo.classList.toggle('falta', custo > 0 && (gs.moedas || 0) < custo);
  }

  /* ── E A SAÍDA, QUE SÓ EXISTIA PARA QUEM ESTAVA TESO ──
     Voltar a um avatar que já se tem estava escondido dentro do aviso de
     saldo insuficiente. Quem tinha as moedas e não as queria gastar
     ficava num ecrã com um botão só, e esse botão gastava 500 — não
     havia forma de dizer "afinal não". Agora o caminho de volta está lá
     sempre que houver para onde voltar. */
  const alvoVivo = primeiroSlotVivo();
  const voltar = document.getElementById('btnSummonVoltar');
  if(voltar) {
    voltar.style.display = alvoVivo >= 0 ? '' : 'none';
    voltar.textContent   = t('summon.voltar');
  }

  if(!semSaldo) {
    box.style.display = 'none';
    if(btn) btn.disabled = false;
    return;
  }

  box.style.display = 'block';
  if(btn) btn.disabled = true;

  const falta = custo - gs.moedas;
  document.getElementById('summonLockTitle').textContent =
    t('summon.lock.title', { cost: custo });
  // O botão de voltar saiu daqui para cima, onde está sempre. Este bloco
  // ficou só com a explicação, que é o que ele sabe dizer.
  document.getElementById('summonLockDesc').textContent =
    alvoVivo >= 0 ? t('summon.lock.desc', { have: gs.moedas, cost: custo, missing: falta })
                  : t('summon.lock.desc_nofree', { cost: custo });
}

function triggerSummon() {
  if(!walletAddress) { addLog(t('summon.log.no_login'), 'bad'); showBubble(t('summon.bub.no_login')); return; }
  const btn = document.getElementById('btnSummon');
  if(!btn || btn.disabled) return;

  const custo = custoDaInvocacao();
  if(custo > 0) {
    if(gs.moedas < custo) {
      addLog(t('summon.log.no_coins', { cost: custo }), 'bad');
      showBubble(t('summon.bub.no_coins'));
      playSound('no_coins');
      return;
    }
    if(!spendCoins(custo)) return;
  }

  btn.disabled = true;

  const raridade = 'Comum';
  const elemento = escolherElemento();
  const car      = CARACTERISTICAS_ELEMENTAIS[elemento];
  const nome     = nomeDeNascimento(elemento);
  const _descPool    = descricoesDoElemento(elemento);
  const descricaoIdx = Math.floor(Math.random() * _descPool.length);
  const descricao    = _descPool[descricaoIdx];
  let _h = 0;
  const _str = nome + elemento;
  for(let i=0;i<_str.length;i++){ const c=_str.charCodeAt(i); _h=((_h<<5)-_h)+c; _h=_h&_h; }
  const seed = Math.abs(_h);

  dead = false; hatched = false; sick = false; sleeping = false;
  clearPresenceDead(walletAddress);
  nivel = 1; xp = 0; vinculo = 0; totalSecs = 0; tickCount = 0;
  poopCount = 0; dirtyLevel = 0; poopPressure = 0;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  document.getElementById('poopContainer').innerHTML = '';

  while(avatarSlots.length <= activeSlotIdx) avatarSlots.push(null);
  avatarSlots[activeSlotIdx] = {
    // A identidade primeiro: e ela que faz deste avatar UM avatar, e
    // nao mais um com o mesmo seed. Invocado nao tem mae nem pai —
    // e raiz de arvore por definicao.
    ...identidadeNova(),
    nome, elemento, raridade, descricao, descricaoIdx, car, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    petCooldown: 0,
    vitals: {fome:100, humor:100, energia:100, saude:100, higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
    pendingEgg: true,       // protege o slot durante a chocagem automática
    pendingSlot: activeSlotIdx,
  };
  /* A certidao. Invocado nao consome ovo nenhum, portanto a origem e
     Comum — que era ja a raridade com que a invocacao nascia. O que
     e novo aqui e o DNA: a tendencia de crescimento e o sexo. */
  if (typeof registarNascimento === 'function') {
    registarNascimento(avatarSlots[activeSlotIdx], {
      elemento, origem: 'Comum', seed,
    });
  }
  window._pendingEggSlot = activeSlotIdx;
  gs.totalInvocacoes = (gs.totalInvocacoes || 0) + 1;

  // ── CINEMATIC SUMMON OVERLAY ──
  const ov         = document.getElementById('summonOverlay');
  const ovBg       = document.getElementById('ovBg');
  const r1         = document.getElementById('ovRing1');
  const r2         = document.getElementById('ovRing2');
  const r3         = document.getElementById('ovRing3');
  const ovAv       = document.getElementById('ovAvatar');
  const ovParts    = document.getElementById('ovParticles');
  /* ── SEM RÓTULOS ──

     A cerimónia escrevia duas coisas por cima do ovo: "◆ COMUM ◆" e
     "🔥 FOGO". A primeira anunciava uma raridade que hoje é sempre
     Comum — e portanto não anunciava nada. A segunda anunciava um
     elemento que já não existe.

     Não as substituí por outras. O ovo já diz o que tem a dizer pela
     cor, e o bicho sai a seguir. */
  const _novo = avatarSlots[activeSlotIdx];
  const gradOvo = (typeof gradienteDoOvo === 'function' && _novo && _novo.nascimento)
    ? gradienteDoOvo(_novo)
    : { topo: '#5a3a9a', meio: '#2d1a5e', fundo: '#04030a',
        brilho: '#8060c0', aura: (car ? car.cor : '#8b5cf6') };
  const cor = gradOvo.aura;
  const rarColor = cor;   // a onda de choque acompanha o ovo

  ovAv.style.cssText = 'width:12.5rem;height:12.5rem;opacity:0;transform:scale(.05) rotate(-15deg);transition:none;display:flex;align-items:center;justify-content:center;';
  r1.style.cssText = r2.style.cssText = r3.style.cssText = 'position:absolute;border-radius:50%;opacity:0;border:1px solid transparent;';
  ovParts.innerHTML  = '';
  ovBg.style.opacity = '0';


  /* O OVO DA CERIMÓNIA.

     Tinha o emoji do elemento desenhado no meio — 🔥, 💧, 🍃 — e eu
     levei a variável dele quando tirei os rótulos, sem reparar que era
     usada aqui. O botão "estender a mão" rebentava com
     "elemEmoji is not defined" e o avatar não chegava a nascer.

     O emoji não volta: era o elemento outra vez. Fica o ovo, e o ovo
     tem os três degraus de cor do bicho que está lá dentro — os mesmos
     que a animação do choco usa, para as duas cerimónias mostrarem o
     mesmo ovo. */
  const eggSVG = `<svg viewBox="0 0 120 140" width="120" height="140">
    <defs>
      <radialGradient id="ovEggG" cx="38%" cy="30%" r="72%">
        <stop offset="0%" stop-color="${gradOvo.topo}"/>
        <stop offset="55%" stop-color="${gradOvo.meio}"/>
        <stop offset="100%" stop-color="${gradOvo.fundo}"/>
      </radialGradient>
      <filter id="ovEggGlow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="60" cy="74" rx="42" ry="52" fill="url(#ovEggG)" filter="url(#ovEggGlow)"/>
    <ellipse cx="60" cy="74" rx="42" ry="52" fill="none" stroke="${gradOvo.aura}" stroke-width="1.5" opacity=".6"/>
    <ellipse cx="48" cy="52" rx="10" ry="16" fill="${gradOvo.brilho}" opacity=".45" transform="rotate(-18 48 52)"/>
  </svg>`;
  ovAv.innerHTML = eggSVG;

  const numParts = raridade === 'Lendário' ? 30 : raridade === 'Raro' ? 18 : 10;
  for(let i = 0; i < numParts; i++) {
    const p  = document.createElement('div');
    const sz = 2 + Math.random() * 5;
    p.className = 'ov-particle';
    p.style.cssText = `width:${(sz)/16}rem;height:${(sz)/16}rem;left:${10+Math.random()*80}%;bottom:-0.625rem;background:${cor};box-shadow:0 0 ${(sz*2)/16}rem ${cor};animation-duration:${2.5+Math.random()*3}s;animation-delay:${Math.random()*2}s;`;
    ovParts.appendChild(p);
  }

  ov.classList.add('active');
  // O overlay cobre tudo mas o jogo continua montado por baixo, e sem
  // isto aparecia barra de rolagem a meio da invocação — e ainda um
  // salto quando o prólogo destravasse a dele. A contagem de
  // referências do lockBodyScroll trata da sobreposição dos dois.
  if (typeof lockBodyScroll === 'function' && !window._summonTravou) {
    window._summonTravou = true;
    lockBodyScroll();
  }
  setTimeout(() => { ovBg.style.opacity = '1'; }, 50);

  setTimeout(() => {
    r1.style.cssText = `position:absolute;inset:0.625rem;border-radius:50%;border:2px solid ${cor};opacity:0;animation:pspin 3s linear infinite;box-shadow:0 0 1.25rem ${cor}50,inset 0 0 20px ${cor}20;transition:opacity .5s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r1.style.opacity = '.7'; }));
  }, 400);

  setTimeout(() => {
    r2.style.cssText = `position:absolute;inset:2.5rem;border-radius:50%;border:1px solid ${cor};opacity:0;animation:pspin 2s linear infinite reverse;box-shadow:0 0 0.9375rem ${cor}40;transition:opacity .4s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r2.style.opacity = '.5'; }));
  }, 700);

  setTimeout(() => {
    const sw = document.createElement('div');
    sw.className = 'ov-shockwave';
    sw.style.cssText = `border-color:${cor};position:absolute;top:50%;left:50%;`;
    document.getElementById('ovCircle').appendChild(sw);
    setTimeout(() => sw.remove(), 700);
  }, 900);

  setTimeout(() => {
    ovAv.style.transition = 'all .75s cubic-bezier(.34,1.5,.64,1)';
    ovAv.style.opacity    = '1';
    ovAv.style.transform  = 'scale(1) rotate(0deg)';
    if(raridade !== 'Comum') {
      r3.style.cssText = `position:absolute;inset:4.375rem;border-radius:50%;border:1px dashed ${cor};opacity:0;animation:pspin 1.5s linear infinite;transition:opacity .4s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { r3.style.opacity = '.4'; }));
    }
  }, 1100);

  setTimeout(() => {
    const sw2 = document.createElement('div');
    sw2.className = 'ov-shockwave';
    sw2.style.cssText = `border-color:${rarColor};position:absolute;top:50%;left:50%;`;
    document.getElementById('ovCircle').appendChild(sw2);
    setTimeout(() => sw2.remove(), 700);
  }, 1900);

  setTimeout(() => {
    ovAv.style.transition = 'all .6s ease-in';
    ovAv.style.opacity    = '0';
    ovAv.style.transform  = 'scale(1.15)';
    r1.style.opacity = r2.style.opacity = r3.style.opacity = '0';
    ovBg.style.opacity = '0';
  }, 3600);

  // Quando o overlay fecha, dispara a animação de chocagem automaticamente
  // O jogador não precisa de clicar nada — tudo acontece em sequência
  setTimeout(() => {
    ov.classList.remove('active');
    ovParts.innerHTML = '';
    btn.disabled = false;
    if (window._summonTravou && typeof unlockBodyScroll === 'function') {
      window._summonTravou = false;
      unlockBodyScroll();
    }

    // Mostra o eggScreen brevemente e inicia a animação de chocagem
    // hatchWithAnimation() vai chamar hatch() no final (~1.2s depois)
    document.getElementById('summonCard').style.display  = 'none';
    document.getElementById('creatureCard').style.display = 'block';
    document.getElementById('idleScreen').style.display   = 'none';
    document.getElementById('deadScreen').style.display   = 'none';
    document.getElementById('aliveScreen').style.display  = 'none';
    fillCreatureCard();
    updateAllUI();
    scheduleSave();

    hatchWithAnimation(avatarSlots[activeSlotIdx], activeSlotIdx);
  }, 4300);

  const msg = raridade==='Lendário' ? t('summon.log.legendary') : raridade==='Raro' ? t('summon.log.rare') : t('summon.log.common');
  addLog(msg, raridade==='Lendário'?'leg':raridade==='Raro'?'info':'good');
  updateResourceUI();
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
  document.getElementById('summonCard').style.display  = 'none';
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
    }
    window._pendingEggSlot = null;

    if(walletAddress && fbDb() && window._cancelledEgg) {
      fbDb().collection('players').doc(walletAddress).update({
        inboxEggs: firebase.firestore.FieldValue.arrayRemove(window._cancelledEgg)
      }).catch(e => console.warn('inboxEggs cleanup failed:', e));
      window._cancelledEgg = null;
    }

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
    addLog(t('summon.log.born_slot', {nome: pendingAv ? pendingAv.nome.split(',')[0] : 'Avatar', n: pendingSlot+1}), 'good');
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

  if(walletAddress && fbDb() && window._cancelledEgg) {
    fbDb().collection('players').doc(walletAddress).update({
      inboxEggs: firebase.firestore.FieldValue.arrayRemove(window._cancelledEgg)
    }).catch(e => console.warn('inboxEggs cleanup failed:', e));
    window._cancelledEgg = null;
  }

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
  addLog(t('summon.log.born', {nome: avatar.nome.split(',')[0]}), 'good');

  if(!localStorage.getItem('fv_first_hatch')) {
    localStorage.setItem('fv_first_hatch', '1');
    setTimeout(() => addLog(t('onboard.tip.feed'), 'info'), 2000);
    setTimeout(() => addLog(t('onboard.tip.play'), 'info'), 4500);
    setTimeout(() => addLog(t('onboard.tip.rest'), 'info'), 7500);
  }
}
