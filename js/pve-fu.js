// ═══════════════════════════════════════════════════════════════════
// A MOLDURA DA BATALHA PvE
//
// Tudo o que está À VOLTA da luta e não muda com as regras dela: quem
// pode entrar, quanto custa, contra quem se joga, e o que se leva de lá.
//
// Veio inteira do js/combate-pve.js e quase não mudou — é o mesmo jogo.
// Mudou uma coisa só, e essa tinha de mudar: o adversário emparelhava-se
// por PONTOS, que era a medida do 3D&T, e passa a emparelhar-se por
// NÍVEL, que é a medida deste motor.
//
// ── PORQUE É QUE OS NOMES CONTINUAM `_pve` ──
//
// O js/batalha.js e o js/combate-ui.js chamam `abrirCombatePvE`,
// `_pveImpedidos` e `_pveImpedimentoDe`. São o contrato desta camada com
// o resto do jogo, e o contrato não mudou: a pergunta "este avatar pode
// lutar?" tem a mesma resposta em qualquer motor.
//
// Renomeá-los obrigava a mexer em dois arquivos que não têm nada a ver
// com esta mudança, e a mexer neles para dizer exactamente o mesmo.
// ═══════════════════════════════════════════════════════════════════

// ── O QUE A BATALHA CUSTA ──
// Custa energia a cada um dos três, não só ao que está à frente: os três
// lutaram. E um avatar cansado não entra — 20 é o mesmo número a partir
// do qual a exaustão começa a acumular (DISEASES.exaustao, js/state.js).
// Com 10, a batalha empurrava o avatar para dentro da doença sem lhe
// dizer nada. Assim, quando ela diz "cansado", ele ainda está a salvo.
const PVE_ENERGIA_MINIMA   = 20;
const PVE_ENERGIA_CUSTO    = 10;  // o mesmo que uma batalha PvP cobra
const PVE_ENERGIA_DESISTIR = 4;   // desistir a meio sai mais barato

// ── A FRATURA ──
// Cair em combate parte alguma coisa. Uma vez em cada dez — começou em
// 40% e era chato de mais. Uma vez apanhada, come saúde todo o ciclo até
// matar, se não for tratada com o antídoto.
const PVE_FRATURA_CHANCE = 0.10;

const PVE_PREMIO = {
  vitoria: { xp: 2.2, moedas: 2.0, vinculo: 5 },
  derrota: { xp: 0.6, moedas: 0.5, vinculo: 1 },
  empate:  { xp: 1.0, moedas: 0.9, vinculo: 2 },
};

// ═══════════════════════════════════════════════════════════════════
// O ADVERSÁRIO
//
// ── POR NÍVEL, E NÃO POR PONTOS ──
//
// O motor antigo media a força de um avatar em pontos de ficha, e o
// emparelhamento invertia essa conta: procurava a raridade e o nível
// cujos pontos mais se aproximavam do alvo.
//
// Neste motor não há pontos. Os quatro dados saem do arranjo que o DNA
// escolhe e não se compram; o que cresce com o nível são a vida, a
// magia, a precisão e — pela raridade, que sai do nível — o dano extra
// e as afinidades. O nível É a medida, e usá-lo directamente é exacto
// em vez de aproximado.
//
// O total da equipa divide-se por três, com o resto a cair no primeiro:
// três inimigos de nível 12 contra três de 12 é um par justo, e é o que
// se vê.
// ═══════════════════════════════════════════════════════════════════
function _pveGerarInimigo(nivelTotal) {
  /* Baralhados e consumidos sem repetição: dois nomes iguais na mesma
     equipa davam linhas absurdas no registo. Os sufixos saem da tradução
     (FRAT_SUFIXOS, js/fratura.js) e o slot guarda a CHAVE — é por ela
     que a tela da Fratura sabe o que dizer sobre cada um. */
  const sufs = ((typeof FRAT_SUFIXOS !== 'undefined')
      ? FRAT_SUFIXOS.slice()
      : ['errante', 'esquecido', 'faminto', 'sem_nome', 'caido', 'antigo'])
    .sort(() => Math.random() - 0.5);

  const tecto = (typeof FU_NIVEL_MAX !== 'undefined') ? FU_NIVEL_MAX : 60;
  const equipa = [];
  let restante = Math.max(3, nivelTotal | 0);

  for (let i = 0; i < 3; i++) {
    const nivel = Math.max(1, Math.min(tecto, Math.round(restante / (3 - i))));
    restante -= nivel;

    /* O inimigo NASCE, em vez de ser montado à mão. Com a certidão ganha
       cor — que é o que o desenha e o nomeia — e ganha DNA, e com o DNA
       ganha o arranjo dos dados, o tipo de dano, a costura e a vantagem.
       Não há dois tipos de avatar no jogo: um que nasce e outro que se
       fabrica para servir de alvo. */
    const seed = Math.floor(Math.random() * 1e6);
    const cert = (typeof nascer === 'function')
      ? nascer({ origem: 'Comum', seed }) : null;
    const nomeCor = (cert && typeof nomeDaCor === 'function')
      ? nomeDaCor(cert.corPrincipal) : '';
    const sufId = sufs[i];
    equipa.push({
      id: 'ini' + i,
      nome: `${nomeCor} ${t('frat.suf.' + sufId)}`.trim(),
      sufId, nivel, seed,
      nascimento: cert,
    });
  }
  return equipa;
}

// ═══════════════════════════════════════════════════════════════════
// A ENERGIA DE CADA AVATAR
//
// O avatar activo tem-na nas variáveis vivas (vitals); os outros
// têm-na no seu slot. É a mesma energia — só muda onde está escrita — e
// por isso passa tudo por estas duas funções, para não haver dois sítios
// a discordar sobre quanto um avatar aguenta.
// ═══════════════════════════════════════════════════════════════════
function _pveEnergiaDe(idx) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx)
    return (typeof vitals !== 'undefined') ? vitals.energia : 100;
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  return (s && s.vitals && s.vitals.energia != null) ? s.vitals.energia : 100;
}

function _pveGastarEnergia(idx, quanto) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx) {
    if (typeof vitals !== 'undefined')
      vitals.energia = Math.max(0, vitals.energia - quanto);
    return;
  }
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s) return;
  if (!s.vitals) s.vitals = { fome: 100, humor: 100, energia: 100, saude: 100, higiene: 100 };
  s.vitals.energia = Math.max(0, s.vitals.energia - quanto);
}

// ═══════════════════════════════════════════════════════════════════
// O XP E O VÍNCULO SÃO DE CADA AVATAR
//
// Lutaram os três, ganham os três — e cada um sobe de nível com o seu
// próprio XP. As moedas ficam de fora de propósito: são do jogador e não
// do avatar, e por isso são pagas uma vez só.
// ═══════════════════════════════════════════════════════════════════
function _pvePremiarAvatar(idx, xpGanho, vinculoGanho) {
  // O activo passa pelos caminhos normais do jogo — o checkXP trata da
  // fase, do som e do rótulo, e o checkVinculoTier faz o bicho falar.
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx) {
    if (typeof xp !== 'undefined') xp += xpGanho;
    if (typeof vinculo !== 'undefined') {
      const antes = vinculo;
      vinculo += vinculoGanho;
      if (typeof checkVinculoTier === 'function') checkVinculoTier(antes);
    }
    if (typeof checkXP === 'function') checkXP();
    return;
  }

  // Os do banco sobem em silêncio: não há avatar na tela para festejar,
  // e o jogador vê o nível novo quando trocar para ele.
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s || !s.hatched || s.dead) return;
  s.xp = (s.xp || 0) + xpGanho;
  s.vinculo = (s.vinculo || 0) + vinculoGanho;
  if (typeof xpParaNivel === 'function') {
    let guarda = 0;                       // rede contra XP absurdo
    while (s.xp >= xpParaNivel(s.nivel || 1) && guarda++ < 100) {
      s.xp -= xpParaNivel(s.nivel || 1);
      s.nivel = (s.nivel || 1) + 1;
    }
  }
}

// Pegar uma doença. Mesmo encaminhamento da energia e do XP. Devolve
// true se pegou.
function _pveAdoecer(idx, doenca) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx) {
    if (typeof activeDiseases === 'undefined') return false;
    if (activeDiseases.includes(doenca)) return false;
    activeDiseases.push(doenca);
    const d = (typeof DISEASES !== 'undefined') ? DISEASES[doenca] : null;
    if (d && typeof addLog === 'function')
      addLog(t('gt.disease.log', { emoji: d.emoji, nome: d.nome }), 'bad');
    return true;
  }
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s || !s.hatched || s.dead) return false;
  if (!s.activeDiseases) s.activeDiseases = [];
  if (s.activeDiseases.includes(doenca)) return false;
  s.activeDiseases.push(doenca);
  return true;
}

function _pveDoencasDe(idx) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx
      && typeof activeDiseases !== 'undefined') return activeDiseases;
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  return (s && s.activeDiseases) ? s.activeDiseases : [];
}

/* ═══ PORQUE É QUE ESTE AVATAR NÃO PODE LUTAR ═══

   Uma função só, e é ela que manda. O motivo é pedido em quatro sítios —
   o cartão do modo na página da batalha, os cartões da equipa, o aviso
   por baixo deles, e a porta do próprio combate — e quatro cópias da
   mesma regra divergem sempre: basta uma ficar para trás e o jogador vê
   um botão aceso que não faz nada, ou um bloqueio sem razão.

   A ordem importa. A doença vem primeiro porque é o bloqueio mais duro:
   a energia volta sozinha com o tempo, a doença precisa de antídoto. */
function _pveImpedimentoDe(i) {
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[i] : null;
  const nome = nomeCurto(s);

  /* UM BEBÉ NÃO LUTA. É a primeira pergunta, antes das doenças e da
     energia: um recém-nascido não está doente nem cansado, está por
     fazer. A guarda está aqui, com as outras, e não no botão — um limite
     guardado por quem PEDE em vez de por quem FAZ já rendeu quatro
     defeitos a este jogo. */
  if (typeof ehBebe === 'function' && ehBebe(s))
    return { i, nome, motivo: 'bebe', etiqueta: '🐣' };

  const doencas = _pveDoencasDe(i);
  if (doencas.length) {
    const nomes = doencas.map(id => {
      const d = (typeof DISEASES !== 'undefined') ? DISEASES[id] : null;
      return d ? (d.emoji + ' ' + d.nome) : id;
    });
    return { i, nome, motivo: 'doenca', doencas: nomes, etiqueta: nomes[0] };
  }

  /* Menor que 20, e não menor ou igual: a exaustão acumula com
     `v.energia < 20` (js/gametick.js), portanto aos 20 certos o avatar
     ainda está a salvo. A batalha exigia 21 — um ponto mais apertada do
     que a regra que diz copiar. */
  const energia = Math.floor(_pveEnergiaDe(i));
  if (energia < PVE_ENERGIA_MINIMA)
    return { i, nome, motivo: 'energia', energia,
             etiqueta: '⚡ ' + energia + '/' + PVE_ENERGIA_MINIMA };

  return null;
}

function _pveImpedidos() {
  const idx = (typeof equipaIdx === 'function') ? equipaIdx() : [];
  return idx.map(_pveImpedimentoDe).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════
// ABRIR
// ═══════════════════════════════════════════════════════════════════
function abrirCombatePvE() {
  const equipa = (typeof equipaDoJogador === 'function') ? equipaDoJogador() : [];
  if (!equipa.length) { showBubble(t('pve.sem_equipa')); return; }

  /* A porta. Doente ou sem energia não entra em campo — e diz-se QUEM,
     PORQUÊ e o que fazer, senão o jogador fica com um botão que não faz
     nada e nenhuma pista.

     Isto é a última palavra e não a primeira: a página da batalha já
     apaga o cartão e os cartões da equipa já marcam quem está de fora.
     Mas quem manda é esta linha, porque é aqui que a batalha começa. */
  const impedidos = _pveImpedidos();
  if (impedidos.length) {
    const doentes = impedidos.filter(x => x.motivo === 'doenca');
    const chave = doentes.length
      ? (doentes.length === impedidos.length ? 'pve.doente' : 'pve.impedidos')
      : (impedidos.length === 1 ? 'pve.cansado' : 'pve.cansados');
    showToast(t(chave, {
      nomes: impedidos.map(c => c.nome).join(', '),
      min: PVE_ENERGIA_MINIMA,
    }), 'err');
    return;
  }

  // A MESMA conta que a barra da equipa mostra (fuPoderDaEquipa, em
  // js/ficha-fu.js): o número que o jogador vê é o que escolhe o inimigo.
  const nivelTotal = fuPoderDaEquipa(equipa);
  const inimigo = _pveGerarInimigo(nivelTotal);
  const semente = Math.floor(Math.random() * 1e6);

  /* A FRATURA VEM ANTES DA BATALHA. Entrava-se direto e a tela dizia
     BATALHA e mais nada — três criaturas de nome estranho e nenhuma
     pista do que eram. A tela da Fratura diz contra o que se vai lutar e
     porquê (js/fratura.js), e só depois chama isto.

     Se ela não existir — arquivo não carregado, caminho novo — entra-se
     direto. Uma tela de lore nunca pode ser a razão de ninguém ficar sem
     poder lutar. */
  const comecar = () => _pveComecar(equipa, inimigo, semente);
  if (typeof abrirFratura === 'function') abrirFratura(inimigo, semente, comecar);
  else comecar();
}

function _pveComecar(equipa, inimigo, semente) {
  /* Os meus levam um id estável, porque a arena identifica cada lutador
     por ele e o slot não tem nenhum. `eu0..eu2` casa com a ordem da
     equipa, que é a mesma que o equipaIdx() devolve — e é por essa
     ordem que as contas se fecham no fim. */
  const meus = equipa.map((a, i) => Object.assign({}, a, { id: 'eu' + i }));
  ModalManager.open('combateModal');
  afAbrir(meus, inimigo, semente, fecharCombatePvE);
}

// ═══════════════════════════════════════════════════════════════════
// DESISTIR, SAIR, FECHAR
// ═══════════════════════════════════════════════════════════════════

/* ── O ✕ NÃO PODE SER UMA SAÍDA DE GRAÇA ──

   Fechava a batalha a meio sem cobrar nada: nem a energia, nem a fratura
   de quem tinha caído, nem prémio nenhum. Ao lado dele estava o
   DESISTIR, que cobra 4 de energia para fazer exactamente a mesma coisa
   — portanto quem desse pelo ✕ nunca mais carregava no outro, e a
   batalha perdida passava a custar zero.

   Não é um exploit de dinheiro; é pior do que isso para o jogo. Uma luta
   que se pode desfazer sem custo deixa de ser uma decisão: entra-se em
   qualquer batalha, e se correr mal fecha-se a janela.

   O ✕ a meio da batalha É o desistir — com a mesma pergunta antes,
   portanto ninguém sai por engano. Acabada a batalha, fecha e pronto. */
function _pveDesistir() {
  if (!_afE || _afE.acabou) return;
  if (!confirm(t('pve.desistir.confirmar', { n: PVE_ENERGIA_DESISTIR }))) return;
  _afE.acabou = true;
  _afE.vencedor = 'B';
  _afE._desistiu = true;
  _pveFecharContas(_afE);
  _afFim();
}

function _pveSairOuDesistir() {
  if (_afE && !_afE.acabou) return _pveDesistir();
  afFechar();
}

function fecharCombatePvE() {
  ModalManager.close('combateModal');

  /* ── A COLÓNIA TEM DE SABER O QUE ACONTECEU ──

     Isto fechava o modal e mais nada, e o jogador caía numa colónia
     desactualizada: os três tinham gasto 10 de energia cada, ganho XP,
     subido de nível e talvez apanhado uma fratura — e os cartões
     continuavam a mostrar as barras de antes da batalha.

     Não era um erro de contas: o prémio estava entregue e gravado. Era a
     tela a mostrar o mundo de há dois minutos, que é a pior espécie de
     erro visual — não há nada para corrigir, e o jogador não tem como
     saber se a batalha contou. */
  if (typeof updateAllUI === 'function') updateAllUI();
  if (typeof renderFazenda === 'function') renderFazenda();
  if (typeof renderEquipaBar === 'function') renderEquipaBar();
  if (typeof scheduleSave === 'function') scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
// FECHAR AS CONTAS
//
// Corre UMA VEZ por batalha, chamada pela arena quando o motor diz que
// acabou. A arena não sabe nada disto e não tem de saber: ela desenha
// uma luta, e quem sabe o que uma luta custa e rende é este arquivo.
// ═══════════════════════════════════════════════════════════════════
function _pveFecharContas(e) {
  if (!e || e._contasFechadas) return;      // uma vez só por batalha
  e._contasFechadas = true;

  const idx = (typeof equipaIdx === 'function') ? equipaIdx() : [];

  // ── A energia dos três ──
  // Por avatar, e não pela equipa: o Fôlego de Combate é de quem o traz
  // vestido, e o getItemEffect() só sabe ler o inventário de quem está
  // em campo. Nunca menos de 1: uma batalha de graça seria energia
  // infinita.
  const custo = e._desistiu ? PVE_ENERGIA_DESISTIR : PVE_ENERGIA_CUSTO;
  idx.forEach(i => {
    const m = (typeof getItemEffectDoSlot === 'function')
      ? getItemEffectDoSlot(i, 'battleEnergyMult') : 1;
    _pveGastarEnergia(i, Math.max(1, Math.round(custo * m)));
  });

  // ── A fratura ──
  // Vale para quem caiu, tenha a batalha acabado como acabou. Quem
  // desiste protege os que ainda estão de pé, não os que já caíram.
  const fraturados = [];
  fuFormacao(e, 'A').forEach(c => {
    /* Pelo POSTO não: pela ordem de entrada. O posto troca-se durante a
       batalha e o slot do jogador não se mexe com ele — cobrar a fratura
       pelo posto dava-a ao avatar errado a partir da primeira
       reordenação. O id `eu0..eu2` é o que não muda. */
    const n = parseInt(String(c.id).replace('eu', ''), 10);
    if (c.vivo || !(n >= 0) || idx[n] == null) return;
    // A Tala de Osso é de quem caiu, não de quem está em campo.
    const chance = PVE_FRATURA_CHANCE * ((typeof getItemEffectDoSlot === 'function')
      ? getItemEffectDoSlot(idx[n], 'fraturaMult') : 1);
    if (Math.random() >= chance) return;
    if (_pveAdoecer(idx[n], 'fratura')) fraturados.push(c.nome);
  });
  e._fraturados = fraturados;

  // ── O prémio ──
  // Os multiplicadores são os mesmos dos minijogos, para a batalha não
  // ser um atalho para fora do sistema de progressão que já existe.
  const p = PVE_PREMIO[e.vencedor === 'A' ? 'vitoria'
                     : e.vencedor === 'B' ? 'derrota' : 'empate'];

  const d  = (typeof miniDifficulty === 'function') ? miniDifficulty() : { xp: 10, coins: 10 };
  const rb = (typeof rarityBonus === 'function') ? rarityBonus() : { xp: 1, moedas: 1 };
  const vb = (typeof getVinculoBonus === 'function') ? getVinculoBonus() : { xpMult: 1 };
  const xpGain   = Math.round(d.xp    * p.xp     * rb.xp     * vb.xpMult);
  const coinGain = Math.round(d.coins * p.moedas * rb.moedas);

  // Quem desiste não leva prémio nenhum: guardou energia, e é esse o
  // ganho. Pagar na mesma faria da desistência a jogada óptima sempre.
  const ganho = e._desistiu ? { xpGain: 0, coinGain: 0 } : { xpGain, coinGain };
  if (!e._desistiu) {
    // Moedas: uma vez, para o jogador. XP e vínculo: a cada um dos três.
    if (typeof earnCoins === 'function') earnCoins(coinGain);
    idx.forEach(i => _pvePremiarAvatar(i, xpGain, p.vinculo));
  }
  e._premio = { ...ganho, vinculo: e._desistiu ? 0 : p.vinculo,
                energia: custo, quantos: idx.length, desistiu: !!e._desistiu };
  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof updateAllUI === 'function') updateAllUI();
}
