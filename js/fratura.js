// ═══════════════════════════════════════════════════════════════════
//  A FRATURA — o que se enfrenta, e por que isso importa
//
//  Depende de: t() (i18n.js), gerarSVG (data.js), faseFromNivel (state.js),
//              ModalManager (modal.js)
//
//  ── POR QUE ISTO EXISTE ──
//
//  A batalha abria com a palavra BATALHA e mais nada. Entrava-se, batia-se
//  em três criaturas com nomes estranhos, ganhava-se ou perdia-se, saía-se.
//  Nada dizia contra o que se estava lutando, nem por quê.
//
//  E a resposta já estava no código, sem nunca ter sido dita: os inimigos
//  do PvE não são monstros fabricados. Eles NASCEM — têm certidão, cor,
//  DNA e um feitio que inclina as magias deles, igual aos do jogador
//  (ver _pveGerarInimigo, em js/combate-pve.js). São avatares.
//
//  Avatares que atravessaram e não encontraram ninguém.
//
//  O prólogo já tinha dito o que acontece a esses: "Sozinhas, elas se
//  apagam em poucos dias. Foi assim com quase todas. A menos que
//  encontrem alguém." Os capítulos deram nome ao que fica no lugar
//  quando elas se apagam — o Vácuo.
//
//  Este arquivo é só a ponte entre as duas coisas. Não inventa lore
//  nenhuma: pega no que o prólogo prometeu, no que os capítulos
//  explicaram e nos nomes que o gerador de inimigos já usava, e diz em
//  voz alta o que eles queriam dizer desde sempre.
//
//  ── E POR QUE NÃO É UMA MECÂNICA ──
//
//  Não há contador de Fraturas seladas, nem progresso guardado. Uma
//  barra de progresso obrigaria a equilibrar quantas vitórias valem uma
//  Fratura, e isso é uma conversa de economia que ainda não aconteceu.
//  A tela dá SENTIDO, não recompensa — e sentido não precisa de saldo.
// ═══════════════════════════════════════════════════════════════════

/* Os lugares onde uma Fratura abre. São ruínas de cidade, porque é aí
   que o jogo se passa, e são doze porque doze chegam para nenhuma
   batalha parecer a anterior sem que a lista vire um catálogo.

   O artigo viaja DENTRO da tradução ("do Pátio Norte", "da Linha
   Morta"), e não colado aqui: em português o gênero é do substantivo e
   quem sabe o gênero é quem traduz. Em inglês nem artigo há. */
const FRAT_LUGARES = [
  'patio_norte', 'linha_morta', 'estacao', 'viaduto', 'poco_seco',
  'torre_agua', 'praca', 'quarteirao_doze', 'silo', 'escada_servico',
  'ponte_baixa', 'reservatorio',
];

/* O que a criatura virou. Cada um destes é um jeito diferente de a
   mesma coisa ter corrido mal — e é o sufixo que o gerador de inimigos
   já lhes dava. Estava cravado em português dentro do gerador, o que
   deixava um jogador inglês diante de "Blue Errante". Passa a ter
   chave, e o nome mostrado sai da tradução como tudo o resto. */
const FRAT_SUFIXOS = ['errante', 'esquecido', 'faminto', 'sem_nome', 'caido', 'antigo'];

// Um gerador próprio, para a Fratura não mudar de nome se o resto do
// jogo sortear mais alguma coisa entre o briefing e o combate.
function _fratRng(seed) {
  let x = ((seed | 0) ^ 0x2B7F) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2C1B3C6D) >>> 0;
  x = ((x ^ (x >>> 16)) >>> 0) || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}

// Que Fratura é esta. Sai do seed da batalha, portanto é a mesma do
// briefing ao fim do combate.
function fraturaDaBatalha(seed) {
  const rnd = _fratRng(seed);
  return FRAT_LUGARES[Math.floor(rnd() * FRAT_LUGARES.length) % FRAT_LUGARES.length];
}

// ═══════════════════════════════════════════════════════════════════
// A TELA
// ═══════════════════════════════════════════════════════════════════

let _fratEntrar = null;   // o que fazer quando ele decidir entrar

/* Mostra o briefing e SÓ chama o combate se o jogador entrar.

   O `aoEntrar` chega de fora em vez de esta tela conhecer o combate:
   quem sabe começar uma batalha é o combate-pve.js, e uma tela que
   soubesse abrir combates seria uma segunda porta a manter alinhada com
   a primeira. */
function abrirFratura(inimigo, seed, aoEntrar) {
  const ov = document.getElementById('fraturaOverlay');
  if (!ov || !Array.isArray(inimigo) || !inimigo.length) {
    // Sem tela não se tranca o jogo: entra-se direto, como antes.
    if (typeof aoEntrar === 'function') aoEntrar();
    return;
  }
  _fratEntrar = aoEntrar;

  const lugar = fraturaDaBatalha(seed);
  const titulo = ov.querySelector('#fratTitulo');
  if (titulo) titulo.textContent = t('frat.titulo', { lugar: t('frat.lugar.' + lugar) });

  const lista = ov.querySelector('#fratLista');
  if (lista) {
    lista.innerHTML = inimigo.map(c => {
      const fase = (typeof faseFromNivel === 'function') ? faseFromNivel(c.nivel || 1) : 1;
      const arte = (typeof gerarSVG === 'function')
        ? gerarSVG(c, c.raridade, c.seed, 62, 62, fase) : '';
      /* O sufixo pode não estar no slot — um inimigo de um save antigo,
         ou um caminho novo. Nesse caso mostra-se o retrato e o nome, e
         cala-se sobre o resto: uma linha de lore inventada para algo que
         não sabemos o que é seria pior que silêncio. */
      const linha = c.sufId ? t('frat.sai.' + c.sufId) : '';
      return `<li class="frat-item">
        <div class="frat-retrato">${arte}</div>
        <div class="frat-txt">
          <div class="frat-nome">${c.nome || ''}</div>
          ${linha ? `<div class="frat-lore">${linha}</div>` : ''}
        </div>
      </li>`;
    }).join('');
  }

  ov.classList.add('ativo');
  if (typeof lockBodyScroll === 'function') lockBodyScroll();
}

function fecharFratura() {
  const ov = document.getElementById('fraturaOverlay');
  if (!ov) return;
  if (ov.classList.contains('ativo') && typeof unlockBodyScroll === 'function') unlockBodyScroll();
  ov.classList.remove('ativo');
  _fratEntrar = null;
  const lista = ov.querySelector('#fratLista');
  setTimeout(() => { if (lista && !ov.classList.contains('ativo')) lista.innerHTML = ''; }, 400);
}

function entrarNaFratura() {
  const ir = _fratEntrar;
  // Limpa ANTES de chamar: se o combate falhar a meio, não fica um
  // ponteiro guardado a apontar para uma batalha que já não existe.
  _fratEntrar = null;
  const ov = document.getElementById('fraturaOverlay');
  if (ov) {
    ov.classList.remove('ativo');
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
  }
  if (typeof ir === 'function') ir();
}

window.registerStrings(
  {
    'frat.titulo':   'FRATURA {lugar}',
    'frat.entrar':   'ENTRAR',
    'frat.voltar':   'AGORA NÃO',

    /* O texto que amarra tudo. Diz três coisas, por esta ordem: o que
       são estas criaturas, por que estão assim, e por que lutar contra
       elas fecha a fenda. Nada disto é novo — está no prólogo e nos
       capítulos. Só nunca tinha sido dito no lugar onde importa. */
    'frat.corpo':    'O que sai de uma Fratura atravessou sozinho. Sem bando, sem território, sem ninguém do outro lado.\n\nSozinho, apaga-se. E o que fica no lugar já não é a criatura — é a fome dela, e é por aí que o Vácuo entra.',
    'frat.fecho':    'Enquanto houver o que sair, a fenda fica aberta. Cada um que cai, ela estreita.',

    'frat.lugar.patio_norte':     'do Pátio Norte',
    'frat.lugar.linha_morta':     'da Linha Morta',
    'frat.lugar.estacao':         'da Estação Velha',
    'frat.lugar.viaduto':         'do Vão do Viaduto',
    'frat.lugar.poco_seco':       'do Poço Seco',
    'frat.lugar.torre_agua':      'da Torre de Água',
    'frat.lugar.praca':           'da Praça sem Nome',
    'frat.lugar.quarteirao_doze': 'do Quarteirão Doze',
    'frat.lugar.silo':            'do Silo',
    'frat.lugar.escada_servico':  'da Escada de Serviço',
    'frat.lugar.ponte_baixa':     'da Ponte Baixa',
    'frat.lugar.reservatorio':    'do Reservatório',

    'frat.suf.errante':   'Errante',
    'frat.suf.esquecido': 'Esquecido',
    'frat.suf.faminto':   'Faminto',
    'frat.suf.sem_nome':  'Sem Nome',
    'frat.suf.caido':     'Caído',
    'frat.suf.antigo':    'Antigo',

    'frat.sai.errante':   'anda desde que atravessou, e já não procura ninguém.',
    'frat.sai.esquecido': 'teve um nome. Não foi dito alto vezes suficientes.',
    'frat.sai.faminto':   'atravessou com fome. Deste lado não há nada que a mate.',
    'frat.sai.sem_nome':  'ninguém chegou a batizá-lo. Atravessou e ficou por dizer.',
    'frat.sai.caido':     'chegou a encontrar alguém. Depois deixou de encontrar.',
    'frat.sai.antigo':    'atravessou antes de você nascer, e ainda está aqui.',
  },
  {
    'frat.titulo':   'THE {lugar} FRACTURE',
    'frat.entrar':   'GO IN',
    'frat.voltar':   'NOT NOW',

    'frat.corpo':    'Whatever comes out of a Fracture crossed alone. No pack, no territory, nobody left on the other side.\n\nAlone, it fades. And what stays behind is no longer the creature — it is its hunger, and that is the way the Void gets in.',
    'frat.fecho':    'As long as something can come out, the tear stays open. Every one that falls narrows it.',

    'frat.lugar.patio_norte':     'NORTH YARD',
    'frat.lugar.linha_morta':     'DEAD LINE',
    'frat.lugar.estacao':         'OLD STATION',
    'frat.lugar.viaduto':         'UNDERPASS',
    'frat.lugar.poco_seco':       'DRY WELL',
    'frat.lugar.torre_agua':      'WATER TOWER',
    'frat.lugar.praca':           'NAMELESS SQUARE',
    'frat.lugar.quarteirao_doze': 'BLOCK TWELVE',
    'frat.lugar.silo':            'SILO',
    'frat.lugar.escada_servico':  'SERVICE STAIR',
    'frat.lugar.ponte_baixa':     'LOW BRIDGE',
    'frat.lugar.reservatorio':    'RESERVOIR',

    'frat.suf.errante':   'Wanderer',
    'frat.suf.esquecido': 'Forgotten',
    'frat.suf.faminto':   'Starving',
    'frat.suf.sem_nome':  'Nameless',
    'frat.suf.caido':     'Fallen',
    'frat.suf.antigo':    'Old One',

    'frat.sai.errante':   'has been walking since it crossed, and no longer looks for anyone.',
    'frat.sai.esquecido': 'had a name. It was not said out loud often enough.',
    'frat.sai.faminto':   'crossed hungry. There is nothing on this side that feeds it.',
    'frat.sai.sem_nome':  'nobody ever named it. It crossed and went unspoken.',
    'frat.sai.caido':     'did find someone, once. Then it stopped finding them.',
    'frat.sai.antigo':    'crossed before you were born, and is still here.',
  }
);
