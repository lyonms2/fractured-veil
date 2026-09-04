// ═══════════════════════════════════════════════════════════════════
// MAGIAS ELEMENTAIS
//
// As regras são as do Manual 3D&T Alpha; os NOMES e os textos são
// nossos. Mecânica não se protege, expressão sim — por isso nenhuma
// magia aqui usa o nome do livro, e as descrições são escritas de raiz.
//
// Cada avatar sai com TRÊS magias do seu elemento: uma de ataque, uma
// de ataque forte e uma de defesa, sorteadas pelo seed. A gaveta que um
// elemento não tiver é preenchida pela lista universal.
//
// ── O TECTO DE HABILIDADE ──
// O manual proíbe lançar magia cujo custo exceda H×5. Isso torna a
// Habilidade a característica que decide QUE magias o avatar consegue
// sequer usar, e é por isso que ela nunca é 0 (ver js/ficha-3dt.js).
// Um avatar com H1 fica-se pelas de 5 PMs; para o ataque forte mais
// caro é preciso H5.
//
// ── COMO LER A FÓRMULA ──
// fa: { F, H, dados, fixo, dadosPorPM, fixoPorPM }
//   ondasPor    — a magia dispara uma onda por cada N PMs (até ondasMax),
//                 cada uma com a sua própria rolagem de FA
//   alvoIndefeso— o alvo não usa a Habilidade na Defesa (FD = A + 1d)
//   F e H       — 1 se a característica entra na conta, 0 se não
//   dados       — quantos d6 se rolam
//   fixo        — valor somado
//   *PorPM      — quanto cresce por cada PM gasto acima do mínimo
// Exemplo: { H:1, dados:4 } é FA = H + 4d.
// ═══════════════════════════════════════════════════════════════════

// Nenhuma magia atinge área: o combate é entre dois avatares ativos, e
// efeitos de área não teriam onde pegar.
//
// Mas várias magias do manual eram de área por CENÁRIO, não por
// mecânica — a Bola de Fogo explode num raio de 5m, e a fórmula dela
// (FA = H + 1d + PMs) não depende disso em nada. Essas foram adaptadas
// para alvo único: fica a conta, cai o raio. As que só existem por
// causa da área (empurrar tudo em volta, cobrir um corredor) ficaram
// mesmo de fora.
const MAGIA_CATEGORIAS = ['ataque', 'forte', 'defesa'];

/* ── OS LUGARES QUE UM AVATAR PODE TER ──

   São quatro, e não três: o Lendário carrega DOIS golpes fortes. O
   segundo sai da mesma gaveta do primeiro, sem o repetir.

   Repare que isto não é o mesmo que MAGIA_CATEGORIAS — essa é a lista
   das GAVETAS de onde se sorteia, e continua a ser três. Um lugar e uma
   gaveta não são a mesma coisa desde que há dois lugares a beber da
   mesma gaveta. */
const MAGIA_SLOTS = ['ataque', 'forte', 'forte2', 'defesa'];

/* ── A ESCADA DO REPERTÓRIO ──

   O avatar não nasce com as magias todas à espera de serem
   destrancadas: nasce sem nenhuma e vai-as ganhando.

     BEBÊ      níveis  1–4    só o golpe comum
     CRIANÇA   níveis  5–9    + a magia de ataque
     JOVEM     níveis 10–12    + a magia defensiva
     RARO      8 pontos, nv13   + o golpe forte
     LENDÁRIO  12 pontos, nv29  + o segundo golpe forte

   As duas primeiras são crescer; as duas últimas são o que a raridade
   paga. É por isso que a raridade importa em combate mesmo sem dar um
   único ponto de ficha: dá opções, e não números.

   O QUE SE GANHA É O LUGAR, NÃO A MAGIA. A magia é sorteada uma vez, do
   seed, e é a mesma do nascimento à lenda — a escada só decide quando
   ela aparece. Foi assim que o corpo ficou (js/data.js) e é assim que
   isto tem de ficar: crescer nunca troca o que já lá estava. */
const MAGIA_ESCADA = [
  { slot: 'ataque', fase: 1 },
  { slot: 'defesa', fase: 2 },
  { slot: 'forte',  grau: 1 },   // Raro
  { slot: 'forte2', grau: 2 },   // Lendário
];

/* ── O FEITIO INCLINA QUAL MAGIA SAI DA GAVETA ──

   Tentei primeiro por FAMÍLIA — dar a cada magia um rótulo (guarda,
   fonte, lâmina) tirado das propriedades dela e pesar por aí. Medi, e
   não servia: as gavetas são quase todas de uma família só (a Água tem
   três magias de ataque, as três de lâmina), portanto não havia nada
   para inclinar. O feitio mexia dois por cento, que é um gene a fingir
   que trabalha.

   O que varia SEMPRE dentro de uma gaveta é o PREÇO, e o preço quer
   dizer alguma coisa: a magia mais cara da gaveta bate mais e esvazia a
   bolsa; a mais barata lança-se mais vezes na mesma batalha.

     LÂMINA  puxa para o topo da gaveta   — quer bater
     FONTE   puxa para o fundo            — quer durar
     GUARDA  fica no sorteio limpo        — o feitio dele vê-se na
                                            virtude, não na magia

   Nenhum decide: a magia mais cara continua a poder sair a um avatar de
   feitio fonte, só é menos provável.

   (A família continua a pesar nas Vantagens e Desvantagens, em
   js/vantagens.js — lá os três grupos têm cinco a sete entradas cada e
   há mesmo por onde escolher.) */
function _escolherComPeso(pool, pesos, rnd) {
  if (!pool.length) return null;

  let min = Infinity, max = -Infinity;
  for (const m of pool) { if (m.pm < min) min = m.pm; if (m.pm > max) max = m.pm; }

  /* UM SÓ CAMINHO, mesmo quando não há nada a inclinar.

     Ao princípio o caso sem gene saía por um atalho — pool[rnd(0, n-1)]
     — e o caso com gene pelo sorteio pesado. São duas chamadas
     diferentes ao mesmo gerador, portanto davam magias diferentes: na
     medição, um avatar de feitio GUARDA (que não inclina nada) escolhia
     magias mais caras que um avatar sem gene nenhum. Não era o feitio a
     trabalhar; era o atalho a mexer na fila do acaso.

     Com pesos todos a um, o sorteio pesado É o sorteio limpo. */
  const semEixo = !pesos || max === min;
  const peso = semEixo ? () => 1 : m => {
    const t = (m.pm - min) / (max - min);                  // 0 = a mais barata
    return Math.max(1, Math.round(1 + (pesos.lamina - 1) * t + (pesos.fonte - 1) * (1 - t)));
  };

  const total = pool.reduce((t, m) => t + peso(m), 0);
  let alvo = rnd(1, total);
  for (const m of pool) { alvo -= peso(m); if (alvo <= 0) return m; }
  return pool[pool.length - 1];
}

// A fase pelo nível, para quando o js/state.js não está carregado
// (as ferramentas de auditoria correm sem ele).
function _magiaFase(nivel) {
  if (typeof faseFromNivel === 'function') return faseFromNivel(nivel || 1);
  const n = nivel || 1;
  return n < 5 ? 0 : n < 10 ? 1 : n < 17 ? 2 : 3;
}

// ═══════════════════════════════════════════════════════════════════
// OS CINCO PAPÉIS
//
// Cada elemento faz uma coisa melhor do que os outros. As magias são
// todas do manual e as regras são as dele, mas a REPARTIÇÃO por elemento
// é nossa — e tinha de ser: os nossos cinco elementos não são as cinco
// escolas do manual (não temos "espírito", temos Sombra), e lá a mesma
// magia aparece muitas vezes em duas escolas ao mesmo tempo
// ("Elemental (água ou terra)", "Branca ou Negra"). A escola nunca foi
// uma parede.
//
//   FOGO    bate mais forte que todos, e não tem defesa nenhuma
//   TERRA   a maior defesa: a Armadura chega a contar a dobrar
//   ÁGUA    aguenta-se: cura-se, e sustenta escudo e véu
//   VENTO   rápido e esquivo, bate mais fraco, mas às vezes bate várias
//   SOMBRA  drena e atrapalha — o que incomoda
// ═══════════════════════════════════════════════════════════════════

const MAGIAS = {
  // ── FOGO ── o dano, sem rede ──────────────────────────────────────
  'Fogo': {
    ataque: [
      { id:'fg_a1', pm:1,  fa:{ dados:1, fixo:2 } },
      { id:'fg_a2', pm:0,  fa:{ fixo:2 } },
      { id:'fg_a3', pm:1, pmMax:5, fa:{ H:1, fixoPorPM:1 } },
      { id:'fg_a4', pm:1, pmMax:10, fa:{ H:1, dados:1, fixoPorPM:1 } },
      { id:'fg_a5', pm:1, porTurno:true, fa:{ dados:1 }, ignoraArmadura:true },
    ],
    forte: [
      { id:'fg_f1', pm:25, fa:{ dados:10 }, ignoraArmadura:true },
      // "Essa lava mágica ignora a Armadura do alvo"
      { id:'fg_f2', pm:10, fa:{ dados:1, fixo:10 }, ignoraArmadura:true },
      // O Terremoto do manual: 2d+4 por cada 4 PMs. Escala como nenhuma
      // outra, e é POR ISSO que ficou só com o Fogo — era o que fazia o
      // Fogo e a Terra terem os dois o melhor ultimate do jogo.
      { id:'fg_f3', pm:4, pmMax:20, fa:{ dados:2, fixo:4, dadosPorPM:0.5, fixoPorPM:1 } },
    ],
    // Vazia de propósito, e agora por duas razões. O manual não tem uma
    // única magia de fogo defensiva — e o Fogo é o elemento que responde
    // a tudo batendo mais forte. Continua defendendo-se pela Força de
    // Defesa como toda a gente; só não tem magia que a melhore.
    defesa: [],
  },

  // ── TERRA ── a muralha ────────────────────────────────────────────
  'Terra': {
    ataque: [
      { id:'te_a1', pm:5,  buffForca:2, porTurno:true },
      { id:'te_a2', pm:5,  fa:{ fixo:16 } },
      { id:'te_a3', pm:1,  fa:{ H:1, dados:1 } },
    ],
    forte: [
      { id:'te_f1', pm:10, fa:{ H:1, fixo:15 } },
      { id:'te_f2', pm:5,  petrifica:true },
    ],
    defesa: [
      { id:'te_d1', pm:1, pmMax:5, porTurno:true, armaduraPorPM:1, armaduraMax:5 },
      { id:'te_d2', pm:2, porTurno:true, armadura:2 },
      // A Resistência de Helena: "concede Armadura Extra contra todos os
      // ataques, excepto magia". Armadura Extra é a Armadura a contar a
      // dobrar — é a defesa mais forte que existe, e é da Terra.
      { id:'te_d3', pm:2, porTurno:true, armaduraDobra:true, excetoMagia:true },
    ],
  },

  // ── ÁGUA ── quem aguenta ──────────────────────────────────────────
  'Água': {
    ataque: [
      { id:'ag_a1', pm:5,  fa:{ H:1, dados:1 }, debuffR:1 },
      { id:'ag_a2', pm:2, pmMax:10, fa:{ F:1, H:1, dadosPorPM:0.5 } },
      { id:'ag_a3', pm:3,  fa:{ H:1, dados:2 }, veneno:{ testeR:-1, penalidade:1, pvPorTurno:1 } },
    ],
    forte: [
      { id:'ag_f1', pm:30, fa:{ dados:10 } },
      { id:'ag_f2', pm:10, fa:{ H:1, dados:1, fixo:10 } },
      { id:'ag_f3', pm:10, congela:true },
      // Inferno de Gelo: FA = H+2d, ignora a Armadura por completo, e
      // quem levar dano testa Resistência ou fica congelado e indefeso
      // um turno. É o golpe forte barato que faltava à Água.
      { id:'ag_f4', pm:5, fa:{ H:1, dados:2 }, ignoraArmadura:true,
        congelaTurnos:2 },
    ],
    defesa: [
      { id:'ag_d1', pm:1, pmMax:5, porTurno:true, armaduraPorPM:1, armaduraMax:5 },
      { id:'ag_d2', pm:1, porTurno:true, ocultacao:true },
      // Cura Mágica do manual: "para cada 2 PMs gastos, você pode curar
      // 1d Pontos de Vida". É a única cura de verdade do jogo, e é da
      // Água — é isto que faz dela o elemento que se aguenta.
      { id:'ag_d3', pm:2, pmMax:20, cura:{ dadosPorPM:0.5 } },
      /* A mesma cura, mas para quem precisar.

         A Maré Restauradora fecha o próprio corpo e mais nada, o que
         a torna inútil no turno em que quem está mal é o companheiro
         do banco. No manual a Cura Mágica não tem essa limitação:
         cura quem se tocar.

         Custa um PM a mais na entrada porque alcançar o banco vale
         alguma coisa — dá para preparar quem vai entrar em vez de
         esperar que ele apanhe os golpes primeiro. A conta dos dados
         é a mesma: um por cada dois PM. */
      { id:'ag_d4', pm:3, pmMax:20, cura:{ dadosPorPM:0.5 }, curaAliado:true },
    ],
  },

  // ── VENTO ── depressa, e muitas vezes ─────────────────────────────
  'Vento': {
    ataque: [
      { id:'vt_a1', pm:0,  fa:{ fixo:2 } },
      { id:'vt_a2', pm:4,  fa:{ H:1, dados:2 }, ignoraArmadura:true },
      { id:'vt_a3', pm:2, pmMax:10, fa:{ H:1, dados:1 }, ondasPor:2, ondasMax:5, alvoIndefeso:true },
    ],
    forte: [
      { id:'vt_f1', pm:8,  fa:{ H:1, dados:4 } },
      { id:'vt_f2', pm:10, fa:{ H:1, dados:5 } },
      // Ataque Vorpal: não aumenta o dano. Num acerto crítico que vença a
      // Defesa, o alvo testa a Armadura — falhando, acabou. É o Vento a
      // não bater mais forte, mas a bater onde dói.
      { id:'vt_f3', pm:1, porTurno:true, vorpal:true },
    ],
    defesa: [
      { id:'vt_d1', pm:5,  bonusFD:10 },
      { id:'vt_d2', pm:1, pmMax:5, esquivaBonus:true },
      // Criar Vento: bónus na Defesa igual aos PMs gastos, enquanto durar
      { id:'vt_d3', pm:1, pmMax:5, porTurno:true, bonusFDPorPM:1 },
    ],
  },

  // ── SOMBRA ── o que incomoda ──────────────────────────────────────
  'Sombra': {
    ataque: [
      { id:'so_a1', pm:10, fa:{ H:1, dados:3 }, drenaPM:true },
      { id:'so_a2', pm:2,  buffFuria:true },
      // Roubo de Vida: 1 PM por turno rouba 1d PV, que passam para si
      { id:'so_a3', pm:1, porTurno:true, roubaVida:{ dados:1 } },
      // Cegueira: o alvo testa Resistência ou fica vendo mal — H−1 para
      // bater e H−3 para esquivar, até ao fim do combate
      { id:'so_a4', pm:3, cegueira:{ ataque:1, esquiva:3 } },
    ],
    forte: [
      { id:'so_f1', pm:10, fa:{ dados:6 } },
      /* Custava 40 e fazia o mesmo que o Petrificar da Terra por 5:
         mesmo bloco do motor, mesma prova de Resistência, mesma Égide
         a travá-la. Medido lado a lado contra o mesmo alvo, as três
         davam 50%, 50% e 50%.

         Quarenta PM pediam Resistência 8 E Habilidade 8 ao mesmo
         tempo, e o gerador de fichas dá uma ou outra: ao nível 35, só
         20% dos que a recebiam a conseguiam lançar. Os outros levavam
         para a vida inteira um golpe forte que nunca usariam.

         A dez fica ao lado da Lança do Vazio, que é o que ela sempre
         devia ter sido. Medido em 400 duelos, as duas ganham o mesmo
         — 69% com a Lança, 67% com esta: seis dados por 10 PM valem
         tanto como uma moeda ao ar que tira do combate. A gaveta da
         Sombra deixa de ser uma escolha só no papel. */
      { id:'so_f2', pm:10, destroiAlma:true },
      /* ── A PRIMEIRA MAGIA QUE ESCOLHE ALVO ──

         Este combate sempre foi activo-contra-activo: bate-se em quem
         está à frente e mais nada. Isso é uma simplificação NOSSA — no
         3D&T uma magia atinge quem o lançador escolher dentro do
         alcance, e quem está atrás não está a coberto por estar atrás.

         A Sombra é o elemento certo para levantar essa simplificação:
         é o que passa por baixo das portas. E resolve de caminho um
         defeito velho — a gaveta forte da Sombra começava nos 10 PM,
         a única acima dos 5, e por isso 158 avatares de Sombra em mil
         chegavam ao nível 35 SEM golpe forte nenhum, porque o tecto
         deles não chegava lá. A três, chegam todos.

         O dano é modesto de propósito: o que se paga aqui é a
         escolha, não a força. Escolher o alvo vale mais do que dois
         dados — dá para acabar com o ferido antes de ele se
         esconder, ou tirar o curandeiro antes de ele curar. */
      { id:'so_f3', pm:3, pmMax:12, fa:{ H:1, dados:1, dadosPorPM:0.5 },
        escolheAlvo:true },
    ],
    defesa: [
      { id:'so_d1', pm:4,  barreira:true },
      { id:'so_d2', pm:5,  imuneEspiritual:true },
    ],
  },
};

// ── LISTA UNIVERSAL ──
// A escola "todas" do manual: qualquer conjurador elemental as lança,
// seja qual for o seu elemento. Entram no bolo de todos.
const MAGIAS_UNIVERSAIS = {
  ataque: [
    { id:'un_a1', pm:2, pmMax:10, fa:{ H:1, dadosPorPM:0.5 } },
    // "atira o alvo para trás" é imagem, não mecânica: este combate não
    // tem distâncias, e no manual o arremesso só muda a posição do alvo.
    // Fica a descrição; sai a propriedade, que não codificava efeito
    // nenhum e fazia a magia prometer o que não cumpria.
    { id:'un_a2', pm:2, fa:{ F:1, H:1, dados:1, fixo:2 } },
  ],
  forte: [],
  defesa: [
    { id:'un_d1', pm:20, porTurno:true, invulneravel:true },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// magiasDoAvatar — as três magias que este avatar conhece
//
// Sorteadas pelo seed, dentro do que a Habilidade permite lançar.
// Determinístico: o mesmo avatar tem sempre as mesmas magias.
// ═══════════════════════════════════════════════════════════════════
function _magiaRng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x7B19) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function (min, max) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return min + (((s >>> 16) * (max - min + 1)) >>> 16);
  };
}

function magiasDoAvatar(ficha) {
  if (!ficha) return {};

  const kit = MAGIAS[ficha.elemento] || MAGIAS['Fogo'];
  const rnd = _magiaRng((ficha.seed || 0) ^ 0x51);
  const fora = {};

  /* O feitio do avatar, se ele tiver certidão. Inclina qual magia sai de
     cada gaveta — nunca QUANTAS nem QUAIS gavetas. */
  const indole = (typeof indoleDoDna === 'function' && ficha.nascimento && ficha.nascimento.dna)
    ? indoleDoDna(ficha.nascimento.dna) : null;

  // ── O TECTO QUE ESTE AVATAR VAI TER ──
  // O bolo é filtrado por aquilo que ele ALCANÇARÁ no nível 35, e não
  // pelo que alcança hoje. São duas coisas diferentes e as duas importam:
  //   · filtrar pelo tecto de hoje era o defeito antigo — o bolo crescia
  //     com o nível e a magia trocava sozinha
  //   · não filtrar de todo dava magias que certos avatares nunca
  //     poderiam lançar (24% dos Lendários de nível 35 ficavam com um
  //     golpe forte eternamente trancado)
  // O tecto do nível 35 é constante para um dado avatar, portanto não
  // muda nada ao subir de nível — e garante que tudo o que ele sabe é
  // alcançável se chegar lá.
  const _f35 = (typeof fichaDeAvatar === 'function' && ficha.nivel < 35)
    ? fichaDeAvatar(ficha.seed || 0, ficha.raridade, ficha.elemento, 35, ficha.nascimento)
    : ficha;
  const tectoFinal = _f35.H * 5;

  /* ── E A RESERVA, QUE FALTAVA ──

     O tecto diz o que o avatar CONSEGUE lançar; a reserva diz o que
     ele PODE PAGAR. São duas condições e o filtro só tinha a
     primeira, o que reabria em miniatura o mesmo buraco que o tecto
     foi posto aqui para tapar: 1,42% dos avatares chegavam ao nível
     35 com um golpe forte que nunca poderiam lançar, porque tinham
     Habilidade 8 e Resistência 4.

     Medido sobre 5000 fichas: 102 gavetas mudam, nenhuma fica vazia,
     nenhuma troca por pior, e as 71 impagáveis passam a zero. */
  const reservaFinal = _f35.pm;

  for (const cat of MAGIA_CATEGORIAS) {
    // O bolo, limitado ao que este avatar chegará a alcançar.
    //
    // Filtrar aqui era um defeito sério: quando a Habilidade subia,
    // entravam mais magias no bolo, o índice sorteado caía noutro sítio,
    // e o avatar TROCAVA de magia ao subir de nível — em 1,52% das
    // subidas, e 36% dessas trocas eram para pior. O pior caso trocava a
    // Fenda Vulcânica (55 de dano médio) pela Erupção (14).
    //
    // Agora as três magias saem do seed e mais nada: são as mesmas do
    // nascimento à lenda. O tecto H×5 do manual continua a valer, mas
    // decide outra coisa — se o avatar JÁ CONSEGUE LANÇAR o que sabe.
    // A ficha mostra "precisa de Habilidade 4" em vez de esconder a
    // magia, e subir de nível só pode destrancar, nunca tirar.
    const noTecto  = m => m.pm <= tectoFinal;
    const pagavel  = m => m.pm <= tectoFinal && m.pm <= reservaFinal;
    const doBolo   = [...(kit[cat] || []), ...(MAGIAS_UNIVERSAIS[cat] || [])];

    /* Prefere o que ele pode pagar; se NADA no bolo couber na reserva,
       volta ao filtro antigo em vez de o deixar sem magia nenhuma.

       Hoje esta rede nunca dispara — a reserva mais baixa ao nível 35
       é 15 PM e a gaveta mais cara começa nos 10. Fica na mesma: é
       precisamente o tipo de garantia que depende dos números de hoje,
       e um dia alguém acrescenta uma magia ou sobe um preço. Ficar sem
       golpe forte é pior do que ter um caro. */
    let pool = doBolo.filter(pagavel);
    if (!pool.length) pool = doBolo.filter(noTecto);

    // Última saída, só para a defesa: um segundo ataque do elemento.
    // Acontece sempre ao Fogo, e não é acidente — o manual não tem uma
    // única magia de fogo defensiva, e o Fogo é o elemento que responde
    // a tudo batendo mais forte.
    if (!pool.length && cat === 'defesa') {
      const sobra = (kit.ataque || []).filter(m => m !== fora.ataque);
      pool = sobra.filter(pagavel);
      if (!pool.length) pool = sobra.filter(noTecto);
    }
    fora[cat] = _escolherComPeso(pool, indole, rnd);
  }

  /* O SEGUNDO GOLPE FORTE, do Lendário.

     Sai da mesma gaveta do primeiro e nunca o repete — dois lugares com
     a mesma magia não eram duas opções, eram uma escrita duas vezes. Se
     a gaveta do elemento só tiver uma magia que ele alcance, fica sem
     segundo: é preferível a repetir. */
  {
    const bolo = [...(kit.forte || []), ...(MAGIAS_UNIVERSAIS.forte || [])]
      .filter(m => m !== fora.forte && m.pm <= tectoFinal);
    const pagaveis = bolo.filter(m => m.pm <= reservaFinal);
    const pool = pagaveis.length ? pagaveis : bolo;
    fora.forte2 = _escolherComPeso(pool, indole, rnd);
  }

  /* ── E AGORA, O QUE DELE JÁ SE VÊ ──

     Tudo o que está acima decidiu o repertório COMPLETO deste avatar —
     o que ele terá se chegar ao fim. Sai do seed e nunca muda.

     Esta parte decide quanto dele já está desperto. O bebé sai daqui com
     as mãos vazias, e é assim que deve ser: ele tem o golpe comum, que
     nunca dependeu disto. */
  const fase = _magiaFase(ficha.nivel);
  const grau = (typeof grauDaRaridade === 'function')
    ? grauDaRaridade(ficha.raridade)
    : (ficha.raridade === 'Lendário' ? 2 : ficha.raridade === 'Raro' ? 1 : 0);

  const vistas = {};
  for (const degrau of MAGIA_ESCADA) {
    const chegou = degrau.fase != null ? fase >= degrau.fase : grau >= degrau.grau;
    if (chegou && fora[degrau.slot]) vistas[degrau.slot] = fora[degrau.slot];
  }
  return vistas;
}

/* O repertório COMPLETO, incluindo o que ainda não despertou.

   A ficha usa isto para mostrar ao jogador o que o avatar vai ter —
   uma magia que se sabe que vem é um objectivo; uma que ninguém menciona
   é uma surpresa que ele nunca vai procurar. */
function repertorioCompleto(ficha) {
  if (!ficha) return {};
  /* Pergunta-se à ficha do nível 35, e não a uma cópia desta com o nível
     trocado à mão: o sorteio das magias filtra pelo tecto H×5 do nível
     35, e uma cópia com nivel:35 mas com a Habilidade de hoje dava outro
     tecto — e portanto outras magias. Seria uma promessa errada. */
  if (typeof fichaDeAvatar !== 'function') return magiasDoAvatar(ficha);
  /* A certidão viaja também nesta. Sem ela, a ficha do nível 35
     construída aqui não teria índole — e a promessa que a ficha faz ao
     jogador saía diferente das magias que ele vai mesmo ter. */
  return magiasDoAvatar(fichaDeAvatar(ficha.seed || 0, 'Lendário', ficha.elemento, 35, ficha.nascimento));
}

/* Quando é que este lugar desperta? Devolve o degrau, para a ficha
   poder dizer "chega ao ser Raro" em vez de deixar um espaço vazio. */
function degrauDoSlot(slot) {
  return MAGIA_ESCADA.find(d => d.slot === slot) || null;
}

// Esta magia já cabe no tecto H×5 deste avatar?
function magiaAoAlcance(ficha, magia) {
  return !!magia && magia.pm <= ficha.H * 5;
}

/* ── O QUE TRANCA UMA MAGIA, E PORQUÊ ──

   Lançar uma magia pede duas coisas ao mesmo tempo: a Habilidade
   chega ao TECTO (H×5) e a Resistência enche a BOLSA (R×5). A ficha
   só olhava para a primeira, e por isso mostrava sem cadeado nenhum
   magias que o avatar nunca poderia pagar — medido, 1,3% dos casos:
   um Fogo Comum com 15 de PM via o Corpo Elemental de 20 como
   disponível.

   As duas contas dão o mesmo número, porque as duas são vezes cinco.
   O que muda é a palavra, e é a palavra que diz ao jogador em que
   característica pôr o próximo ponto. */
function trancaDaMagia(ficha, magia) {
  if (!magia || !ficha) return null;
  const precisa = Math.max(1, Math.ceil(magia.pm / 5));
  if (magia.pm > ficha.H * 5) return { motivo: 'H', precisa };
  if (magia.pm > (ficha.pm || 0)) return { motivo: 'R', precisa };
  return null;
}

// A Habilidade que falta para alcançar esta magia.
function habilidadeParaMagia(magia) {
  return magia ? Math.max(1, Math.ceil(magia.pm / 5)) : null;
}

// A Habilidade mínima para alcançar alguma magia desta gaveta.
// Serve para a ficha dizer quanto falta, em vez de só dizer que falta.
function habilidadeNecessaria(elemento, cat) {
  const kit = MAGIAS[elemento] || MAGIAS['Fogo'];
  const pool = [...(kit[cat] || []), ...(MAGIAS_UNIVERSAIS[cat] || [])];
  if (!pool.length) return null;
  const maisBarata = pool.reduce((a, b) => b.pm < a.pm ? b : a);
  return Math.max(1, Math.ceil(maisBarata.pm / 5));
}

// Quanto custa e quanto faz, para um número concreto de PMs investidos.
function valorDaMagia(magia, ficha, pmGastos) {
  if (!magia || !magia.fa) return null;
  const pm = Math.max(magia.pm, Math.min(pmGastos != null ? pmGastos : magia.pm,
                                         magia.pmMax || magia.pm, ficha.H * 5));
  const extra = pm - magia.pm;
  const f = magia.fa;
  return {
    pm,
    caracs: (f.F ? ficha.F : 0) + (f.H ? ficha.H : 0) + (f.fixo || 0) + Math.floor(extra * (f.fixoPorPM || 0)),
    dados:  (f.dados || 0) + Math.floor(extra * (f.dadosPorPM || 0)),
    ignoraArmadura: !!magia.ignoraArmadura,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MAGIAS, MAGIAS_UNIVERSAIS, MAGIA_CATEGORIAS, MAGIA_SLOTS,
                     MAGIA_ESCADA, repertorioCompleto, degrauDoSlot, magiasDoAvatar,
                     _escolherComPeso,
                   magiaAoAlcance, habilidadeParaMagia, valorDaMagia, habilidadeNecessaria,
                   trancaDaMagia };
}
