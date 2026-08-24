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

// Nenhuma magia atinge área: o combate é entre dois avatares activos, e
// efeitos de área não teriam onde pegar.
//
// Mas várias magias do manual eram de área por CENÁRIO, não por
// mecânica — a Bola de Fogo explode num raio de 5m, e a fórmula dela
// (FA = H + 1d + PMs) não depende disso em nada. Essas foram adaptadas
// para alvo único: fica a conta, cai o raio. As que só existem por
// causa da área (empurrar tudo em volta, cobrir um corredor) ficaram
// mesmo de fora.
const MAGIA_CATEGORIAS = ['ataque', 'forte', 'defesa'];

const MAGIAS = {
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
      { id:'fg_f2', pm:10, fa:{ dados:1, fixo:10 } },
      { id:'fg_f3', pm:4, pmMax:20, fa:{ dados:2, fixo:4, dadosPorPM:0.5, fixoPorPM:1 } },
    ],
    // Vazia de propósito: no manual NÃO EXISTE uma única magia de fogo
    // defensiva. Todas são ataque ou utilidade. Ver magiasDoAvatar().
    defesa: [],
  },

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
    ],
    defesa: [
      { id:'ag_d1', pm:1, pmMax:5, porTurno:true, armaduraPorPM:1, armaduraMax:5 },
      { id:'ag_d2', pm:1, porTurno:true, ocultacao:true },
    ],
  },

  'Terra': {
    ataque: [
      { id:'te_a1', pm:5,  buffForca:2, porTurno:true },
      { id:'te_a2', pm:5,  fa:{ fixo:16 } },
    ],
    forte: [
      { id:'te_f1', pm:10, fa:{ H:1, fixo:15 } },
      { id:'te_f2', pm:5,  petrifica:true },
      { id:'te_f3', pm:4, pmMax:20, fa:{ dados:2, fixo:4, dadosPorPM:0.5, fixoPorPM:1 } },
    ],
    defesa: [
      { id:'te_d1', pm:1, pmMax:5, porTurno:true, armaduraPorPM:1, armaduraMax:5 },
      { id:'te_d2', pm:2, porTurno:true, armadura:2 },
    ],
  },

  'Vento': {
    ataque: [
      { id:'vt_a1', pm:0,  fa:{ fixo:2 } },
      { id:'vt_a2', pm:4,  fa:{ H:1, dados:2 }, ignoraArmadura:true },
      { id:'vt_a3', pm:2, pmMax:10, fa:{ H:1, dados:1 }, ondasPor:2, ondasMax:5, alvoIndefeso:true },
    ],
    forte: [
      { id:'vt_f1', pm:8,  fa:{ H:1, dados:4 } },
      { id:'vt_f2', pm:10, fa:{ H:1, dados:5 } },
    ],
    defesa: [
      { id:'vt_d1', pm:5,  bonusFD:10 },
      { id:'vt_d2', pm:1, pmMax:5, esquivaBonus:true },
    ],
  },

  'Sombra': {
    ataque: [
      { id:'so_a1', pm:10, fa:{ H:1, dados:3 }, drenaPM:true },
      { id:'so_a2', pm:2,  buffFuria:true, duracao:'sustentavel' },
    ],
    forte: [
      { id:'so_f1', pm:10, fa:{ dados:6 } },
      { id:'so_f2', pm:40, destroiAlma:true },
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
    { id:'un_a2', pm:2, fa:{ F:1, H:1, dados:1, fixo:2 }, arremessa:true },
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
  const kit   = MAGIAS[ficha.elemento] || MAGIAS['Fogo'];
  const tecto = ficha.H * 5;                       // regra do manual
  const rnd   = _magiaRng((ficha.seed || 0) ^ 0x51);
  const fora  = {};

  for (const cat of MAGIA_CATEGORIAS) {
    // Só entram as que o avatar consegue pagar. Se o elemento não tiver
    // nenhuma na gaveta, ou nenhuma dentro do tecto, cai na universal.
    // A escola "todas" do manual é castável por qualquer conjurador
    // elemental, portanto entra no bolo de todos os elementos e não só
    // quando falta alguma coisa.
    let pool = [...(kit[cat] || []), ...(MAGIAS_UNIVERSAIS[cat] || [])]
                 .filter(m => m.pm <= tecto);
    // Última saída, SÓ para a defesa: um segundo ataque do elemento.
    // A gaveta do ataque forte fica mesmo vazia se nada couber no tecto
    // — é a regra H×5 a funcionar, e é uma razão concreta para subir de
    // nível. Preenchê-la com um ataque fraco seria mentir no rótulo.
    //
    // Isto acontece sempre ao Fogo, e não é acidente nem falta de
    // trabalho: o manual NÃO TEM uma única magia de fogo defensiva.
    // Todas são ataque ou utilidade. Em vez de inventar uma, o Fogo
    // fica com dois ataques — o elemento que responde a tudo batendo
    // mais forte. Continua a defender-se como toda a gente, pela Força
    // de Defesa (H + A + 1d); só não tem magia que a melhore.
    if (!pool.length && cat === 'defesa') {
      pool = (kit.ataque || []).filter(m => m.pm <= tecto && m !== fora.ataque);
    }
    fora[cat] = pool.length ? pool[rnd(0, pool.length - 1)] : null;
  }
  return fora;
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
  module.exports = { MAGIAS, MAGIAS_UNIVERSAIS, MAGIA_CATEGORIAS, magiasDoAvatar, valorDaMagia };
}
