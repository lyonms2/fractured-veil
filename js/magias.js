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
    ? fichaDeAvatar(ficha.seed || 0, ficha.raridade, ficha.elemento, 35)
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
    fora[cat] = pool.length ? pool[rnd(0, pool.length - 1)] : null;
  }
  return fora;
}

// Esta magia já cabe no tecto H×5 deste avatar?
function magiaAoAlcance(ficha, magia) {
  return !!magia && magia.pm <= ficha.H * 5;
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
  module.exports = { MAGIAS, MAGIAS_UNIVERSAIS, MAGIA_CATEGORIAS, magiasDoAvatar,
                   magiaAoAlcance, habilidadeParaMagia, valorDaMagia, habilidadeNecessaria };
}
