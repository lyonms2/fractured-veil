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
/* E NÃO NO FÁCIL (19/09/2026). O Fácil é onde se aprende a lutar; perder
   um avatar para uma doença que come a saúde, por ter caído enquanto
   aprendia, era castigar justamente quem está começando. Do Médio para
   cima o risco continua, e o painel da batalha avisa antes de entrar. */
function pveChanceFratura() {
  const d = (typeof miniDifficulty === 'function') ? miniDifficulty() : { tier: 1 };
  return d.tier === 0 ? 0 : PVE_FRATURA_CHANCE;
}

/* ── O PRÊMIO ──
   `moedas` conta em MINIJOGOS PERFEITOS da dificuldade escolhida (o
   `coins` do DIFF_TIERS, em js/modal.js). A batalha gasta 10 de energia
   de cada um dos três — 30, o mesmo que seis minijogos —, e por isso a
   vitória paga seis. A derrota paga um e meio: a energia foi gasta do
   mesmo jeito, e sair sem nada de uma luta perdida no Mestre empurrava
   todo mundo de volta para o Fácil. */
const PVE_PREMIO = {
  vitoria: { xp: 2.2, moedas: 6,   vinculo: 5 },
  derrota: { xp: 0.6, moedas: 1.5, vinculo: 1 },
  empate:  { xp: 1.0, moedas: 3,   vinculo: 2 },
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
/* ── A DIFICULDADE MUDA O INIMIGO ──

   O nível somado dos inimigos é o da equipe vezes o `inimigo` da
   dificuldade (DIFF_TIERS, em js/modal.js): 0,8 no Fácil, 1,0 no Médio,
   1,2 no Difícil e 1,4 no Mestre. Antes o inimigo era sempre do tamanho
   da equipe e só o prêmio subia, portanto a dificuldade maior era só um
   botão de ganhar mais.

   O modal da batalha mostra este mesmo número antes de entrar
   (btRenderDificuldade, em js/batalha.js).

   E a mesma dificuldade decide o quanto os inimigos pensam
   (FU_IA_NIVEIS, em js/ia-fu.js). */
function pveNivelInimigo(nivelEquipe) {
  const d = (typeof miniDifficulty === 'function') ? miniDifficulty() : { inimigo: 1 };
  return Math.max(3, Math.round((nivelEquipe | 0) * (d.inimigo || 1)));
}

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
       cor — que é o que o desenha — e ganha DNA, e com o DNA
       ganha o arranjo dos dados, o tipo de dano, a costura e a vantagem.
       Não há dois tipos de avatar no jogo: um que nasce e outro que se
       fabrica para servir de alvo. */
    const seed = Math.floor(Math.random() * 1e6);
    const cert = (typeof nascer === 'function')
      ? nascer({ origem: 'Comum', seed }) : null;
    /* O nome é só o sufixo: Errante, Faminto, Sem Nome. Levava a cor na
       frente ("Vermelho-arroxeado Esquecido"), e isso não cabia no cartão
       nem na linha do registro. Os sufixos saem sem repetição, portanto
       os três continuam com nomes diferentes, e a cor continua no
       desenho. */
    const sufId = sufs[i];
    equipa.push({
      id: 'ini' + i,
      nome: t('frat.suf.' + sufId),
      sufId, nivel, seed,
      /* A raridade do nível, como os nossos a trazem no slot: é o que o
         gerarSVG recebe, e sem ela a Fratura e a arena desenhavam o mesmo
         inimigo com raridades diferentes. */
      raridade: (typeof fuRaridadeDoNivel === 'function') ? fuRaridadeDoNivel(nivel) : undefined,
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
    const nivel0 = s.nivel || 1;
    while (s.xp >= xpParaNivel(s.nivel || 1) && guarda++ < 100) {
      s.xp -= xpParaNivel(s.nivel || 1);
      s.nivel = (s.nivel || 1) + 1;
    }
    // Subiu: o servidor tem de saber (js/niveis.js).
    if (s.nivel > nivel0 && s.id && typeof nivelAvisar === 'function') nivelAvisar(s.id, s.nivel);
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
      addLog(t('gt.disease.log', { emoji: d.emoji, nome: d.nome, preco: (typeof precoItem === 'function' && typeof ITEM_CATALOG !== 'undefined') ? precoItem(ITEM_CATALOG.antidoto_dimensional) : 250 }), 'bad');
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

  /* ── SEM NOME NÃO LUTA ──

     Regra do dono do jogo: o nome é o primeiro ato do jogador sobre a
     criatura, e antes dele ela não entra em campo. Vem antes de tudo o
     resto porque não é um estado que passa — é uma coisa por fazer, e
     quem a faz é o jogador, em dois toques.

     A pergunta é o `temNome` (js/identidade.js), a mesma que o resto do
     jogo usa: um avatar por batizar tem a primeira metade do nome
     vazia. */
  if (typeof temNome === 'function' && !temNome(s))
    return { i, nome, motivo: 'sem_nome', etiqueta: '✎' };

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
    const semNome = impedidos.filter(x => x.motivo === 'sem_nome');
    const doentes = impedidos.filter(x => x.motivo === 'doenca');
    // Sem nome primeiro: é o único que o jogador resolve em dois toques.
    const chave = semNome.length === impedidos.length
      ? (semNome.length === 1 ? 'pve.sem_nome' : 'pve.sem_nomes')
      : doentes.length
      ? (doentes.length === impedidos.length ? 'pve.doente' : 'pve.impedidos')
      : (impedidos.length === 1 ? 'pve.cansado' : 'pve.cansados');
    showToast(t(chave, {
      nomes: impedidos.map(c => c.nome).join(', '),
      min: PVE_ENERGIA_MINIMA,
    }), 'err');
    return;
  }

  // A MESMA conta que a barra da equipe mostra (fuPoderDaEquipa, em
  // js/ficha-fu.js), vezes a dificuldade: o número que o jogador vê no
  // modal da batalha é o que escolhe o inimigo.
  const nivelTotal = fuPoderDaEquipa(equipa);
  const inimigo = _pveGerarInimigo(pveNivelInimigo(nivelTotal));
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
  /* E o LAÇO de cada um com os outros dois (js/lacos.js), já com os ids
     da batalha: é o que o Lutar pelo Laço soma à precisão. */
  const niveis = (typeof lacoNiveisDaEquipa === 'function') ? lacoNiveisDaEquipa(equipa) : [];
  const meus = equipa.map((a, i) => {
    const lacoCom = {};
    Object.keys(niveis[i] || {}).forEach(j => { lacoCom['eu' + j] = niveis[i][j]; });
    return Object.assign({}, a, { id: 'eu' + i, lacoCom });
  });
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
  // Dois toques no próprio botão, e não uma caixa do navegador.
  if (typeof _afPedeConfirmar === 'function'
      && !_afPedeConfirmar('cbDesistir', t('pve.desistir.confirmar_curto', { n: PVE_ENERGIA_DESISTIR }))) return;
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
    const chance = pveChanceFratura() * ((typeof getItemEffectDoSlot === 'function')
      ? getItemEffectDoSlot(idx[n], 'fraturaMult') : 1);
    if (Math.random() >= chance) return;
    if (_pveAdoecer(idx[n], 'fratura')) fraturados.push(c.nome);
  });
  e._fraturados = fraturados;

  // ── O prémio ──
  // A base é a mesma dos minijogos (DIFF_TIERS), para a batalha não ser
  // um atalho para fora da progressão que já existe.
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
  _pveComunicarLaco(e, idx);
  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof updateAllUI === 'function') updateAllUI();
}

/* ── O LAÇO DE QUEM LUTOU JUNTO ──

   Quem conta os pontos é o servidor (acao 'laco' do api/pool.js): aqui só
   se diz quem lutou e como acabou. A resposta traz as entradas novas, que
   se reatam aos slots, e o painel do fim ganha o 💞 se ainda estiver
   aberto. Quem desiste não ganha laço, como não ganha prêmio.

   Não se espera pela resposta para fechar a batalha: um erro de rede
   perde os pontos desta luta e mais nada. */
function _pveComunicarLaco(e, idx) {
  if (!e || e._desistiu || !idx || idx.length < 2) return;
  if (typeof firebase === 'undefined' || !firebase.auth) return;
  const u = firebase.auth().currentUser;
  if (!u) return;
  const resultado = e.vencedor === 'A' ? 'vitoria' : e.vencedor === 'B' ? 'derrota' : 'empate';
  u.getIdToken()
   .then(idToken => fetch('/api/pool', {
     method:  'POST',
     headers: { 'Content-Type': 'application/json' },
     body:    JSON.stringify({ acao: 'laco', idToken, slots: idx, resultado }),
   }))
   .then(r => r.json())
   .then(d => {
     if (!d || !d.ok || !d.lacos || typeof avatarSlots === 'undefined') return;
     const slotDe = id => avatarSlots.find(s => s && s.id === id) || null;
     Object.keys(d.lacos).forEach(id => {
       const s = slotDe(id);
       if (s) s.lacos = Object.assign({}, s.lacos || {}, d.lacos[id]);
     });
     const ganhos = d.ganhos || [];
     const maior = ganhos.reduce((m, g) => Math.max(m, g.ganho | 0), 0);
     if (e._premio) e._premio.laco = maior;
     ganhos.filter(g => g.subiu).forEach(g => {
       if (typeof showToast !== 'function' || typeof lacoNivel !== 'function') return;
       showToast(t('af.laco.subiu', {
         estrelas: '★'.repeat(lacoNivel(g.p)),
         a: (slotDe(g.a) || {}).nome || '?', b: (slotDe(g.b) || {}).nome || '?',
       }));
     });
     if (typeof _afE !== 'undefined' && _afE === e && typeof _afDesenhar === 'function') {
       _afChave = null; _afDesenhar();
     }
   })
   .catch(err => console.warn('[laço] não foi possível comunicar:', err.message));
}
