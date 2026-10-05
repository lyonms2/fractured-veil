#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DAS ESCOLAS — a matriz Feitio × Escola × Degrau

   São três escolas desde a etapa 3F, e eram duas. A terceira não
   existia em lugar nenhum: nem no gerador, nem num enum, nem nas
   tabelas das magias. O motor decidia a escola com uma linha,
   `ficha.escola === 1`, e por isso só havia duas possíveis.

   O que esta auditoria vigia:

     1. As três escolas existem, e o sorteio dá as três.
     2. O sorteio é determinístico e reparte-se pelas três.
     3. A escola não depende do feitio, da raridade nem do nível.
     4. Os 27 caminhos montam-se sem buraco: magia, estilo, nome.
     5. O lugar `forte` tem a MESMA magia base nas três escolas —
        é a decisão de arquitetura da etapa 3E (Alternativa 1).
     6. A identidade de uma escola não inverte entre degraus por
        troca de magia: o que a escola muda no `forte` é o estilo.
     7. As magias que saíram da matriz continuam definidas.
     8. Uma ficha sem escola, ou com escola inválida, cai na 0.

   node tools/auditoria-escolas.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const N   = require('../js/nascimento.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, N, F);
const V   = require('../js/vantagens-fu.js');
const M   = require('../js/combate-fu.js');
const G   = require('../js/magias-fu.js');
const CO  = require('../js/cores.js');
Object.assign(global, V, M, G, CO);

let ok = 0, mau = 0;
const falhas = [];
function verificar(nome, cond, detalhe) {
  if (cond) { ok++; return true; }
  mau++;
  falhas.push(nome + (detalhe ? '  [' + detalhe + ']' : ''));
  return false;
}
function titulo(t) {
  console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
}

const FEITIOS = ['guarda', 'sustentacao', 'lamina'];
const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const DEGRAU_DA = { 'Comum': 1, 'Raro': 2, 'Lendário': 3 };

/* Uma ficha à mão, com o feitio, a escola e a raridade que se pedem. É
   o mesmo molde do tools/auditoria-lugares.js. */
const fichaDe = (feitio, raridade, escola, tipo) => ({
  tipo: tipo || 'fogo', raridade, feitio, escola,
  DES: 8, PER: 8, VIG: 8, VON: 8,
});

/* ═══ 1 · AS TRÊS ESCOLAS EXISTEM ══════════════════════════════ */
titulo('As três escolas existem');
{
  /* ── O GESTO É UNIVERSAL, E ISSO SE LÊ NA MATRIZ ──

     A escola diz COMO o avatar exerce o feitio, e o `gesto` é o lugar
     em que ela não diz nada: as três células apontam para a mesma
     tabela. Confere-se a célula, e não a magia que sai dela, porque o
     recuo do `fuMagiaDe` (para a 'primeira') faria uma célula quebrada
     materializar a magia certa — e a quebra passaria sem se ver. */
  verificar('o gesto está na matriz', !!G.FU_MATRIZ.gesto);
  for (const esc of [0, 1, 2]) {
    verificar('a matriz do gesto na escola ' + esc + ' aponta para a primeira tabela',
      G.FU_MATRIZ.gesto[esc] === 'primeira', JSON.stringify(G.FU_MATRIZ.gesto[esc]));
  }
  verificar('e é a MESMA célula nas três',
    new Set([0, 1, 2].map(e => JSON.stringify(G.FU_MATRIZ.gesto[e]))).size === 1,
    JSON.stringify(G.FU_MATRIZ.gesto));
  verificar('o gesto está nos três feitios', ['guarda', 'lamina', 'sustentacao']
    .every(f => G.FU_LUGARES_DO_FEITIO[f].indexOf('gesto') !== -1),
    JSON.stringify(G.FU_LUGARES_DO_FEITIO));

  verificar('o FU_ESCOLAS existe e é uma lista', Array.isArray(G.FU_ESCOLAS));
  verificar('e tem três escolas', G.FU_ESCOLAS.length === 3,
    JSON.stringify(G.FU_ESCOLAS));
  verificar('que são 0, 1 e 2', G.FU_ESCOLAS.join(',') === '0,1,2',
    G.FU_ESCOLAS.join(','));

  /* A MATRIZ cobre todos os lugares e todas as escolas. Um buraco aqui
     é um avatar que não sabe que magia tem. */
  for (const lugar of Object.keys(G.FU_MAGIAS)) {
    verificar('a matriz conhece o lugar ' + lugar, !!G.FU_MATRIZ[lugar]);
    for (const esc of G.FU_ESCOLAS) {
      /* A célula é o nome de uma tabela, ou um mapa por degrau quando a
         identidade da escola o pede (ver FU_MATRIZ). As duas formas
         valem, e as duas têm de acabar numa tabela que existe. */
      /* A célula tem três formas (ver FU_MATRIZ): o nome de uma tabela,
         um mapa por degrau, ou `{tabela, lugar, degrau}` quando a magia
         vive noutro lugar. Todas têm de acabar numa casa que existe. */
      const celula = (G.FU_MATRIZ[lugar] || {})[esc];
      const origens = [];
      const juntar = (c, d) => {
        if (!c) return;
        if (typeof c === 'string') origens.push({ tabela: c, lugar, degrau: d });
        else if (c.tabela) origens.push({ tabela: c.tabela, lugar: c.lugar || lugar,
                                          degrau: c.degrau || d });
        else for (const dd of [1, 2, 3]) juntar(c[dd], dd);
      };
      juntar(celula, null);
      verificar('matriz[' + lugar + '][' + esc + '] aponta para magias que existem',
        origens.length > 0 && origens.every(o => {
          const t = G.FU_TABELAS[o.tabela];
          /* Os degraus que ESTE lugar tem, e nao sempre os tres: o
             `gesto` so existe no Lendario (3F.17). Quando a celula
             nomeia o degrau confere-se esse; quando nao, conferem-se os
             que a tabela de origem definiu. */
          const graus = o.degrau ? [o.degrau]
            : [1, 2, 3].filter(d => !!((G.FU_TABELAS[o.tabela] || {})[o.lugar]
                                       && G.FU_TABELAS[o.tabela][o.lugar][d]));
          return !!t && !!t[o.lugar] && graus.every(d => !!(t[o.lugar][d]
            && t[o.lugar][d].id));
        }), JSON.stringify(celula));
    }
  }
}

/* ═══ 2 · O SORTEIO ════════════════════════════════════════════ */
titulo('O sorteio: determinístico, e dá as três');
{
  const AMOSTRA = 90000;
  const conta = { 0: 0, 1: 0, 2: 0 };
  let fora = 0;
  for (let s = 1; s <= AMOSTRA; s++) {
    const e = F.fuEscolaDoSeed(s);
    if (conta[e] === undefined) fora++; else conta[e]++;
  }
  verificar('nenhum seed cai fora de 0..2', fora === 0, fora + ' fora');
  for (const e of G.FU_ESCOLAS) {
    verificar('a escola ' + e + ' aparece', conta[e] > 0);
  }
  /* Reparte-se pelas três. Não se exige igualdade: exige-se que
     nenhuma fique abaixo de um quarto nem acima de dois quintos — com
     90 mil seeds, um RNG são fica muito dentro disto. */
  for (const e of G.FU_ESCOLAS) {
    const p = conta[e] / AMOSTRA;
    verificar('a escola ' + e + ' fica perto de um terço ('
      + (100 * p).toFixed(2) + '%)', p > 0.25 && p < 0.40,
      (100 * p).toFixed(2) + '%');
  }

  // DETERMINISMO: o mesmo seed, a mesma escola, sempre.
  let instavel = 0;
  for (let i = 0; i < 2000; i++) {
    const s = 1 + i * 7919;
    const a = F.fuEscolaDoSeed(s);
    for (let k = 0; k < 3; k++) if (F.fuEscolaDoSeed(s) !== a) instavel++;
  }
  verificar('o mesmo seed dá sempre a mesma escola', instavel === 0,
    instavel + ' instáveis');

  // E seeds negativos e zero não rebentam nem saem do domínio.
  let maus = 0;
  for (const s of [0, -1, -12345, 2147483647, -2147483648]) {
    const e = F.fuEscolaDoSeed(s);
    if (G.FU_ESCOLAS.indexOf(e) === -1) maus++;
  }
  verificar('seeds nos extremos continuam em 0..2', maus === 0);
}

/* ═══ 3 · A ESCOLA É INDEPENDENTE ══════════════════════════════ */
titulo('A escola não depende do feitio, da raridade nem do nível');
{
  /* A escola sai do seed com uma semente própria (0x35C) e o feitio sai
     do DNA. Se andassem colados, metade das combinações não apareceria.
     Mede-se nos cruzamentos: com 3 feitios × 3 escolas, cada um devia
     ficar perto de 1/9 = 11,1%. */
  const cruz = {};
  let n = 0;
  for (let s = 1; s <= 27000; s++) {
    const dna = GEN.nascimento.gerarDna('Comum', s);
    const feitio = N.indoleDominante(dna);
    const esc = F.fuEscolaDoSeed(s);
    const ch = feitio + '/' + esc;
    cruz[ch] = (cruz[ch] || 0) + 1;
    n++;
  }
  verificar('os 9 cruzamentos feitio × escola aparecem todos',
    Object.keys(cruz).length === 9, Object.keys(cruz).length + ' de 9');
  let piorCruz = 1;
  for (const ch of Object.keys(cruz)) piorCruz = Math.min(piorCruz, cruz[ch] / n);
  verificar('e nenhum cruzamento fica rarefeito ('
    + (100 * piorCruz).toFixed(2) + '% no pior)', piorCruz > 0.04,
    (100 * piorCruz).toFixed(2) + '%');

  /* A MESMA ficha, com raridades e níveis diferentes, tem a MESMA
     escola: a escola sai do seed e mais nada. */
  const slot = (seed, nivel) => {
    const cert = GEN.certidaoDeInvocacao({ uid: 'a', nome: 'A' });
    cert.seed = seed;
    cert.nascimento.seed = seed;
    cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
    /* A raridade é declarada: o jogo já não a tira do nível (3I.12).
       Os degraus 11 e 27 são o cenário deste teste, e não a regra. */
    return { id: 'x', seed, nivel, nascimento: cert.nascimento,
             raridadeReconhecida: nivel >= 27 ? 'Lendário'
                                : nivel >= 11 ? 'Raro' : 'Comum' };
  };
  let mudou = 0;
  for (let i = 0; i < 300; i++) {
    const seed = 101 + i * 1009;
    const escolas = [1, 5, 10, 11, 20, 26, 27, 40, 60]
      .map(nv => F.fuFicha(slot(seed, nv)).escola);
    if (new Set(escolas).size !== 1) mudou++;
  }
  verificar('a escola não muda com o nível nem com a raridade', mudou === 0,
    mudou + ' mudaram');
}

/* ═══ 4 · OS 27 CAMINHOS ═══════════════════════════════════════ */
titulo('Os 27 caminhos montam-se sem buraco');
{
  const grade = [];
  for (const feitio of FEITIOS) {
    for (const esc of G.FU_ESCOLAS) {
      const celulas = [];
      for (const raridade of RARIDADES) {
        const ficha = fichaDe(feitio, raridade, esc);
        let bom = true, porque = '';
        let mg = null;
        try {
          mg = G.fuMagiasDe(ficha);
        } catch (e) {
          bom = false; porque = 'exceção: ' + e.message;
        }
        if (bom) {
          /* ── OS QUE ELE TEM NESTE GRAU ──

             Era `fuLugaresDe`, que diz os que o feitio PODE ter, e
             exigia magia em cada um: desde o `gesto` (3F.17) um Comum e
             um Raro ficavam a faltar um. Passa a percorrer os
             materializados, e a relação entre os dois conjuntos fica em
             confericoes próprias — mais a conta certa por raridade. */
          const podem = G.fuLugaresDe(ficha);
          const lugares = Object.keys(mg);
          const esperado = raridade === 'Lendário' ? 4 : 3;
          if (!lugares.every(l => podem.indexOf(l) !== -1)) {
            bom = false; porque = 'materializou fora do feitio: ' + lugares.join(',');
          } else if (lugares.length !== esperado) {
            bom = false; porque = lugares.length + ' lugares, esperados ' + esperado;
          } else if (!mg.comum || !mg.forte) {
            bom = false; porque = 'sem o golpe comum ou a magia forte';
          } else if (!!mg.gesto !== (raridade === 'Lendário')) {
            bom = false; porque = 'o gesto ' + (mg.gesto ? 'apareceu' : 'faltou')
                                + ' no ' + raridade;
          }
          for (const l of lugares) {
            const m = mg[l];
            if (!m) { bom = false; porque = 'sem magia em ' + l; break; }
            if (!m.id) { bom = false; porque = l + ' sem id'; break; }
            if (m.pm === undefined) { bom = false; porque = l + ' sem pm'; break; }
          }
          // o lugar `forte` tem de ter estilo, nome e o degrau certo
          if (bom) {
            const forte = mg.forte;
            if (!forte.estilo) { bom = false; porque = 'forte sem estilo'; }
            else if (forte.estilo.feitio !== feitio) {
              bom = false; porque = 'estilo de ' + forte.estilo.feitio;
            } else if (forte.estilo.escola !== esc) {
              bom = false; porque = 'estilo diz escola ' + forte.estilo.escola;
            } else if (!forte.nome) { bom = false; porque = 'forte sem nome'; }
          }
        }
        verificar(feitio + ' × escola ' + esc + ' × ' + raridade
          + ': monta-se', bom, porque);
        celulas.push(bom ? '✓' : '✗');
      }
      grade.push([feitio, esc, celulas]);
    }
  }

  console.log();
  console.log('  feitio'.padEnd(16) + 'escola'.padStart(7)
    + '   Comum   Raro   Lendário');
  for (const [feitio, esc, cel] of grade) {
    console.log('  ' + feitio.padEnd(16) + String(esc).padStart(7)
      + cel[0].padStart(8) + cel[1].padStart(7) + cel[2].padStart(11));
  }
}

/* ═══ 5 · O LUGAR `forte`: A MESMA BASE NAS TRÊS ═══════════════ */
titulo('O lugar `forte` tem a mesma magia base nas três escolas');
{
  /* É a decisão da etapa 3E (Alternativa 1). Antes a escola trocava a
     magia do `forte` E recebia o estilo do feitio por cima — agia duas
     vezes no mesmo lugar, e foi o que deu ao Guarda da segunda escola
     um `furaGuarda` que não é do feitio dele. */
  for (const feitio of FEITIOS) {
    for (const raridade of RARIDADES) {
      const ids = G.FU_ESCOLAS.map(e =>
        G.fuMagiaDe(fichaDe(feitio, raridade, e), 'forte').id);
      verificar(feitio + ' ' + raridade + ': a base do `forte` é a mesma nas três',
        new Set(ids).size === 1, ids.join(' / '));
    }
  }

  /* E o que a escola muda no `forte` é o ESTILO. Hoje as três células
     de um feitio são a mesma — a etapa das nove identidades fá-las
     divergir — mas a ESTRUTURA tem de as distinguir já. */
  for (const feitio of FEITIOS) {
    const porEscola = G.FU_ESTILO_FORTE[feitio];
    verificar(feitio + ': o estilo tem as três escolas',
      porEscola && G.FU_ESCOLAS.every(e => !!porEscola[e]),
      JSON.stringify(Object.keys(porEscola || {})));
    for (const e of G.FU_ESCOLAS) {
      verificar(feitio + ' escola ' + e + ': tem os três degraus',
        porEscola[e] && [1, 2, 3].every(d => !!porEscola[e][d]));
    }
  }
}

/* ═══ 6 · A IDENTIDADE NÃO INVERTE ENTRE DEGRAUS ═══════════════ */
titulo('No `forte`, a escola não inverte de alcance entre degraus');
{
  /* O defeito que a etapa 3B mediu: a primeira escola era alvo único no
     Comum e área no Raro, a segunda o contrário — a mesma escola
     trocava de papel quando o avatar subia.

     Com a base fixa, as três escolas têm SEMPRE o mesmo alcance no
     `forte` em cada degrau. A linha base ainda cresce de um alvo para
     três (sopro → barragem), e isso é a escada do jogo, não a
     identidade da escola: o que se confere aqui é que as três escolas
     andam JUNTAS. */
  const classe = (m) => m.todos ? 'todos' : (m.proprio ? 'self'
    : ((m.alvos || 1) > 1 ? 'area' : 'unico'));
  for (const feitio of FEITIOS) {
    for (const raridade of RARIDADES) {
      const cs = G.FU_ESCOLAS.map(e =>
        classe(G.fuMagiaDe(fichaDe(feitio, raridade, e), 'forte')));
      verificar(feitio + ' ' + raridade
        + ': as três escolas têm o mesmo alcance no `forte`',
        new Set(cs).size === 1, cs.join('/'));
    }
  }
}

/* ═══ 7 · AS MAGIAS LEGADAS CONTINUAM DEFINIDAS ════════════════ */
titulo('As magias que saíram da matriz não foram apagadas');
{
  /* Nenhuma célula da FU_MATRIZ aponta para `FU_SEGUNDA_ESCOLA.forte`,
     portanto estas três saíram da matriz principal. Ficam definidas e
     traduzidas, por decisão do dono do jogo (etapa 3E): servem o
     loadout, a Maestria ou uma das nove identidades. */
  const LEGADAS = ['estilhaco', 'perfurante', 'lanca_certeira'];
  const noForte = G.FU_SEGUNDA_ESCOLA.forte;
  verificar('o FU_SEGUNDA_ESCOLA.forte continua definido', !!noForte);
  for (const d of [1, 2, 3]) {
    verificar('o degrau ' + d + ' do forte legado continua lá',
      !!(noForte && noForte[d] && noForte[d].id),
      noForte && noForte[d] ? noForte[d].id : 'ausente');
  }
  const ids = [1, 2, 3].map(d => noForte[d].id);
  verificar('e são as três que se esperava: ' + LEGADAS.join(', '),
    LEGADAS.every(x => ids.indexOf(x) !== -1), ids.join(','));

  /* E nenhuma delas é alcançável pela matriz — se fosse, a decisão da
     Alternativa 1 não estaria cumprida. */
  const alcancaveis = new Set();
  for (const feitio of FEITIOS) {
    for (const esc of G.FU_ESCOLAS) {
      for (const raridade of RARIDADES) {
        const mg = G.fuMagiasDe(fichaDe(feitio, raridade, esc));
        for (const l of Object.keys(mg)) alcancaveis.add(mg[l].id);
      }
    }
  }
  /* ── QUEM ESTÁ FORA DA MATRIZ, HOJE ──

     Mudou na etapa 3F.3, e a mudança não foi pedida — foi consequência.
     A L1 Estocada chamou a Perfurante e a Lança Certeira de volta, e ao
     pôr as três magias de um alvo nos três degraus da escola 1, o
     CORTE DUPLO (que era o Comum) e a EXECUÇÃO (que era o Lendário)
     ficaram sem célula.

     Fora da matriz, e definidas:

       estilhaco      2 alvos, do `forte` — nunca voltou
       corte_duplo    2 alvos, do `muito_forte` — saiu na 3F.3
       execucao       1 alvo, ignora resistências — saiu na 3F.3

     O Corte Duplo e o Estilhaço são as duas únicas magias de dois alvos
     do jogo, e a L0 Foice — que precisa de magias de área no
     `muito_forte` e está bloqueada por isso — é a candidata óbvia a
     recebê-los. Fica registrado, não decidido. */
  const FORA = ['estilhaco', 'corte_duplo', 'execucao'];
  for (const id of FORA) {
    verificar('a ' + id + ' está fora da matriz', !alcancaveis.has(id));
  }
  /* E as que CONTINUAM na matriz, pelos lugares próprios de cada
     feitio ou pela L1. */
  const ATIVAS = ['estocada', 'perfurante', 'lanca_certeira',
                  'postura_ferro', 'escudo_focado', 'baluarte',
                  'balsamo', 'transfusao', 'canto_guerra'];
  for (const id of ATIVAS) {
    verificar('a ' + id + ' está na matriz', alcancaveis.has(id));
  }
  /* NADA SE PERDEU: as doze da segunda escola continuam todas
     definidas, dentro ou fora da matriz. É esta conferição que impede
     uma magia de desaparecer sem ninguém dar por isso. */
  {
    const definidas = new Set();
    for (const l of Object.keys(G.FU_SEGUNDA_ESCOLA)) {
      const t = G.FU_SEGUNDA_ESCOLA[l];
      if (!t) continue;
      for (const d of [1, 2, 3]) if (t[d] && t[d].id) definidas.add(t[d].id);
    }
    verificar('as doze magias da segunda escola continuam definidas',
      definidas.size === 12, definidas.size + ': ' + [...definidas].sort().join(','));
    for (const id of FORA.concat(ATIVAS)) {
      verificar('a ' + id + ' continua definida', definidas.has(id));
    }
  }
}

/* ═══ 8 · A FICHA SEM ESCOLA, E A ESCOLA INVÁLIDA ══════════════ */
titulo('Sem escola, ou com escola inválida, vale a 0');
{
  const base = G.fuMagiaDe(fichaDe('guarda', 'Lendário', 0), 'defesa');
  verificar('a escola 0 do Guarda Lendário é o Proteger',
    base.id === 'proteger', base.id);

  const sem = fichaDe('guarda', 'Lendário', 0);
  delete sem.escola;
  verificar('ficha sem escola cai na 0',
    G.fuMagiaDe(sem, 'defesa').id === 'proteger');

  /* Um valor que não é escola cai na 0. Os quebrados são à parte: o
     `| 0` trunca, como em todo número que entra neste projeto de fora
     (o nível, o seed), e 1,5 vira a escola 1 — que existe. O que se
     exige deles é que nada rebente e que o resultado seja SEMPRE uma
     das três, nunca `undefined` nem a magia de outro feitio. */
  const DEFESAS = G.FU_ESCOLAS.map(e =>
    G.fuMagiaDe(fichaDe('guarda', 'Lendário', e), 'defesa').id);
  for (const mala of [3, 7, -1, 99, null, undefined, 'dois', NaN]) {
    const f = fichaDe('guarda', 'Lendário', mala);
    let id = null;
    try { id = G.fuMagiaDe(f, 'defesa').id; } catch (e) { id = 'EXCEÇÃO'; }
    verificar('escola ' + JSON.stringify(mala) + ' cai na 0',
      id === 'proteger', String(id));
  }
  for (const quebrado of [1.5, 2.9, 0.4, -0.5]) {
    const f = fichaDe('guarda', 'Lendário', quebrado);
    let id = null;
    try { id = G.fuMagiaDe(f, 'defesa').id; } catch (e) { id = 'EXCEÇÃO'; }
    verificar('escola ' + quebrado + ' trunca para uma escola que existe',
      DEFESAS.indexOf(id) !== -1, String(id));
  }

  // E o fuEscolaDe diz a mesma coisa, que é quem o motor pergunta.
  verificar('o fuEscolaDe devolve 0 para o que não é escola',
    G.fuEscolaDe({ escola: 42 }) === 0 && G.fuEscolaDe({}) === 0
    && G.fuEscolaDe(null) === 0);
  for (const e of G.FU_ESCOLAS) {
    verificar('e devolve a ' + e + ' quando é a ' + e,
      G.fuEscolaDe({ escola: e }) === e);
  }
}

/* ═══ 9 · A SEGURANÇA: MANDA A CERTIDÃO ════════════════════════ */
titulo('A autoridade: a escola sai do seed da certidão, não do slot');
{
  /* A etapa 3A.1 pôs a certidão a mandar no seed. A escola é derivada
     dele, portanto tem de seguir a certidão — e um slot adulterado não
     lhe pode tocar. Com três escolas isto vale mais, não menos: há mais
     o que escolher. */
  const base = (seed) => {
    const cert = GEN.certidaoDeInvocacao({ uid: 'b', nome: 'B' });
    cert.seed = seed;
    cert.nascimento.seed = seed;
    cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
    return { id: 'y', seed, nivel: 30, nascimento: cert.nascimento,
             raridadeReconhecida: 'Lendário' };   // declarada (3I.12)
  };
  let mudaram = 0, forcadas = 0, achouVizinho = 0;
  for (let i = 0; i < 200; i++) {
    const slot = base(5003 + i * 7907);
    const real = F.fuFicha(slot).escola;

    /* Um seed vizinho que, se fosse legítimo, daria OUTRA escola. Sem
       esta busca o teste passava por sorte nos seeds que não mudam. */
    let alvo = null;
    for (let t = 1; t < 60; t++) {
      const tent = (slot.seed + t) >>> 0;
      if (F.fuEscolaDoSeed(tent) !== real) { alvo = tent; break; }
    }
    if (alvo === null) continue;
    achouVizinho++;

    // adultera-se SÓ o slot, e a certidão fica em paz
    const sujo = F.fuFicha(Object.assign({}, slot, { seed: alvo }));
    if (sujo.escola !== real) mudaram++;

    // e escrever a escola no slot à mão também não vale de nada
    const comEscola = F.fuFicha(Object.assign({}, slot, { escola: (real + 1) % 3 }));
    if (comEscola.escola !== real) forcadas++;
  }
  verificar('achou vizinho para quase todos os casos', achouVizinho > 180,
    achouVizinho + ' de 200');
  verificar('o slot.seed adulterado NÃO muda a escola', mudaram === 0,
    mudaram + ' mudaram');
  verificar('e escrever slot.escola à mão também não', forcadas === 0,
    forcadas + ' forçadas');
}

/* ═══ 10 · NADA TRATA A ESCOLA COMO BOOLEANO ═══════════════════ */
titulo('Nenhuma escola é tratada como dois valores');
{
  /* Uma leitura do próprio código: a comparação `escola === 1` era a
     única porta binária do motor, e saiu na etapa 3F. Se voltar, este
     teste apanha-a — e é por isso que ele lê o arquivo em vez de
     chamar uma função. */
  const fs = require('fs');
  const path = require('path');
  const raiz = path.join(__dirname, '..');
  const ARQUIVOS = ['js/magias-fu.js', 'js/ficha-fu.js', 'js/combate-fu.js',
                    'js/ia-fu.js', 'js/pvp-regras.js'];
  // os padrões que fazem da escola um par: comparar com um número, negar,
  // usar num ternário, ou tirar o resto por dois.
  const PROIBIDOS = [
    [/escola\s*===?\s*[0-9]/, 'compara a escola com um número'],
    [/escola\s*!==?\s*[0-9]/, 'compara a escola com um número'],
    [/!\s*ficha\.escola|!\s*slot\.escola/, 'nega a escola'],
    [/escola\s*\?\s*[^:]*:/, 'usa a escola num ternário'],
    [/escola\s*%\s*2/, 'tira o resto da escola por dois'],
  ];
  for (const rel of ARQUIVOS) {
    const texto = fs.readFileSync(path.join(raiz, rel), 'utf8');
    /* SÓ O CÓDIGO, e os comentários fora.

       Os comentários destes arquivos EXPLICAM o defeito que saiu —
       citam o `ficha.escola === 1` para dizer que já não é assim — e um
       filtro que olhasse só ao princípio da linha apanhava a própria
       explicação. Apanhou: duas linhas, na primeira vez que isto
       correu. Por isso segue-se o estado do bloco de comentário de
       linha em linha, e tira-se o que está dentro dele. */
    const linhas = [];
    let dentro = false;
    for (const l of texto.split('\n')) {
      let fora = '', i = 0;
      while (i < l.length) {
        if (dentro) {
          const fim = l.indexOf('*/', i);
          if (fim === -1) { i = l.length; } else { dentro = false; i = fim + 2; }
        } else {
          const bloco = l.indexOf('/*', i);
          const resto = l.indexOf('//', i);
          if (resto !== -1 && (bloco === -1 || resto < bloco)) { fora += l.slice(i, resto); break; }
          if (bloco === -1) { fora += l.slice(i); break; }
          fora += l.slice(i, bloco); dentro = true; i = bloco + 2;
        }
      }
      linhas.push(fora);
    }
    for (const [re, porque] of PROIBIDOS) {
      const achadas = [];
      linhas.forEach((limpa, i) => {
        if (re.test(limpa)) achadas.push(i + 1);
      });
      verificar(rel + ': não ' + porque, achadas.length === 0,
        achadas.length ? 'linha ' + achadas.join(', ') : '');
    }
  }
}

/* ═══ 11 · AS IDENTIDADES DA SUSTENTAÇÃO (etapa 3F.2) ══════════ */
titulo('S0 Foco e S1 Coro: cada escola no seu eixo');
{
  /* A identidade da Sustentação é COMO a vida circula: concentrada num
     aliado (S0 Foco) ou espalhada pelos três (S1 Coro). As seis magias
     do lugar `suporte` já davam os dois eixos, mas estavam trocadas no
     Raro — a escola 0 espalhava por três e a escola 1 concentrava num.

     Nada foi criado nem alterado: só a célula do Raro trocou de nome na
     FU_MATRIZ. Estas conferições são o que impede a troca de voltar. */
  const sup = (raridade, escola) =>
    G.fuMagiaDe(fichaDe('sustentacao', raridade, escola), 'suporte');

  const ESPERADO = {
    0: { Comum: 'lamber',  Raro: 'transfusao', 'Lendário': 'despertar' },
    1: { Comum: 'balsamo', Raro: 'curar',      'Lendário': 'canto_guerra' },
  };
  for (const esc of [0, 1]) {
    for (const r of RARIDADES) {
      const m = sup(r, esc);
      verificar('S' + esc + ' ' + r + ': é a ' + ESPERADO[esc][r],
        m && m.id === ESPERADO[esc][r], m ? m.id : 'nenhuma');
    }
  }

  /* O EIXO, que é a identidade e não a magia: o Foco toca UM, o Coro
     toca TRÊS, nos três degraus. É isto que a inversão quebrava. */
  for (const r of RARIDADES) {
    const foco = sup(r, 0), coro = sup(r, 1);
    verificar('S0 Foco ' + r + ': um alvo', (foco.alvos || 1) === 1,
      String(foco.alvos));
    verificar('S1 Coro ' + r + ': três alvos', (coro.alvos || 1) === 3,
      String(coro.alvos));
  }

  /* E os dois são de fato diferentes em cada degrau — se um dia as duas
     escolas derem a mesma magia, a identidade deixou de existir. */
  for (const r of RARIDADES) {
    verificar('S0 ≠ S1 no ' + r, sup(r, 0).id !== sup(r, 1).id);
  }

  /* A cura concentrada tem de curar MAIS por alvo do que a distribuída:
     é o que torna o Foco uma escolha e não uma versão pior do Coro.
     Compara-se a cura por alvo, nos degraus em que as duas curam. */
  for (const r of ['Comum', 'Raro']) {
    const foco = sup(r, 0), coro = sup(r, 1);
    verificar('S0 ' + r + ' cura mais num alvo do que a S1 em cada',
      (foco.cura | 0) > (coro.cura | 0),
      (foco.cura | 0) + ' vs ' + (coro.cura | 0));
  }

  /* O Lendário das duas não gasta o turno (`livre`), e é o que faz a
     Sustentação Lendária valer um turno: ver a nota no FU_SEGUNDA_ESCOLA. */
  for (const esc of [0, 1]) {
    verificar('S' + esc + ' Lendário não gasta o turno',
      !!sup('Lendário', esc).livre);
  }

  /* ── A LIMITAÇÃO QUE FICA REGISTRADA ──
     O S0 Lendário pedia "cura + limpa + reforço no MESMO alvo", e
     nenhuma magia do jogo faz as três. O `despertar` dá o reforço
     concentrado, que mantém o eixo do Foco, mas não cura nem limpa.
     Fica assim de propósito: criar a magia que falta era inventar dano,
     PM e cura, que é balanceamento e não implementação. */
  const sl = sup('Lendário', 0);
  verificar('S0 Lendário reforça um alvo (e não cura — limitação conhecida)',
    !!(sl.cena && sl.cena.danoMais) && !sl.cura && (sl.alvos || 1) === 1,
    sl.id + ' cura=' + (sl.cura | 0));
}

/* ═══ 12 · AS CINCO IDENTIDADES QUE AINDA NÃO ENTRARAM ═════════ */
titulo('G0, G1, G2, S2 e L2 continuam sem identidade própria');
{
  /* A etapa 3F.2 implementa só a Sustentação. Estas conferições existem
     para apanhar uma implementação acidental — ou uma cópia feita só
     para "completar" a matriz, que era o pior resultado possível. */

  // O GUARDA não foi tocado: as três escolas dão o que davam.
  const DEFESA_HOJE = { 0: ['concha', 'barreira', 'proteger'],
                        1: ['postura_ferro', 'escudo_focado', 'baluarte'],
                        2: ['concha', 'barreira', 'proteger'] };
  for (const esc of G.FU_ESCOLAS) {
    RARIDADES.forEach((r, i) => {
      const m = G.fuMagiaDe(fichaDe('guarda', r, esc), 'defesa');
      verificar('o Guarda escola ' + esc + ' ' + r + ' continua a '
        + DEFESA_HOJE[esc][i], m.id === DEFESA_HOJE[esc][i], m.id);
    });
  }

  /* A L0 FOICE continua bloqueada, e a escola 2 reservada: as duas dão o
     que davam. O lugar `muito_forte` não tem nenhuma magia de três
     alvos, e é isso que impede a Foice — está relatado na etapa 3F.2. A
     L1 Estocada entrou na 3F.3 e tem a sua própria secção, abaixo. */
  /* A escola 2 da Lâmina DEIXOU de ser reservada na etapa 3F.6: é a L2
     Sentença, e tem a sua própria secção. Aqui fica só a L0, que
     continua bloqueada por falta de magia de três alvos no lugar. */
  const MF_HOJE = { 0: ['sopro_maldito', 'concentrado', 'devastacao'] };
  for (const esc of [0]) {
    RARIDADES.forEach((r, i) => {
      const m = G.fuMagiaDe(fichaDe('lamina', r, esc), 'muito_forte');
      verificar('a Lâmina escola ' + esc + ' ' + r + ' continua a '
        + MF_HOJE[esc][i], m.id === MF_HOJE[esc][i], m.id);
    });
  }
  /* E a L0 não se apropriou da Devastação, que é o conceito reservado
     para a L2 Sentença (decisão da etapa 3F.3). Ela está no Lendário da
     escola 0 desde sempre, e é lá que fica — o que se vigia é que ela
     não apareça em nenhum outro degrau nem noutra escola. */
  {
    let fora = 0;
    for (const esc of G.FU_ESCOLAS) {
      for (const r of RARIDADES) {
        const m = G.fuMagiaDe(fichaDe('lamina', r, esc), 'muito_forte');
        if (m.id === 'devastacao' && !(r === 'Lendário' && esc !== 1)) fora++;
      }
    }
    verificar('a Devastação não se espalhou para outras células', fora === 0,
      fora + ' células');
  }

  // A escola 2 da Sustentação continua RESERVADA, igual à 0.
  for (const r of RARIDADES) {
    verificar('a S2 ' + r + ' continua reservada (igual à S0)',
      G.fuMagiaDe(fichaDe('sustentacao', r, 2), 'suporte').id
        === G.fuMagiaDe(fichaDe('sustentacao', r, 0), 'suporte').id);
  }
}

/* ═══ 13 · L1 ESTOCADA (etapa 3F.3) ════════════════════════════ */
titulo('L1 Estocada: um alvo, e nada entre a lâmina e ele');
{
  const mf = (raridade, escola) =>
    G.fuMagiaDe(fichaDe('lamina', raridade, escola), 'muito_forte');

  /* AS TRÊS CÉLULAS, com as magias que a etapa 3F.3 mandou pôr. Duas
     delas são as legadas que a 3F tirou do lugar `forte`. */
  const L1 = { Comum: 'estocada', Raro: 'perfurante', 'Lendário': 'lanca_certeira' };
  for (const r of RARIDADES) {
    const m = mf(r, 1);
    verificar('L1 ' + r + ': é a ' + L1[r], m && m.id === L1[r], m ? m.id : 'nenhuma');
    verificar('L1 ' + r + ': um alvo', (m.alvos || 1) === 1 && !m.todos, String(m.alvos));
    verificar('L1 ' + r + ': tem id, PM e dano',
      !!m.id && m.pm !== undefined && (m.fixo | 0) > 0,
      m.id + ' pm' + m.pm + ' fixo' + m.fixo);
    verificar('L1 ' + r + ': nada vem undefined',
      Object.keys(m).every(k => m[k] !== undefined), JSON.stringify(m));
  }

  /* AS PROPRIEDADES DE CADA DEGRAU, como elas de fato são. A etapa
     3F.3 pediu `furaGuarda` nos três e `semRSnaGuarda` do Raro para
     cima; as magias não dão isso, e não podiam ser alteradas. O que
     está aqui é o estado medido — e é ele que falha se alguém trocar
     uma magia de célula. */
  verificar('L1 Comum fura a guarda', mf('Comum', 1).furaGuarda === true);
  verificar('L1 Comum deixa estado garantido', mf('Comum', 1).estadoSempre === true);
  verificar('L1 Raro ignora a resistência de quem guarda',
    mf('Raro', 1).semRSnaGuarda === true);
  verificar('L1 Lendário fura a guarda', mf('Lendário', 1).furaGuarda === true);
  verificar('L1 Lendário deixa estado garantido',
    mf('Lendário', 1).estadoSempre === true);
  verificar('L1 Lendário leva o estado do elemento do avatar',
    !!mf('Lendário', 1).estado, String(mf('Lendário', 1).estado));

  /* ── A INCOERÊNCIA, MEDIDA E REGISTRADA ──

     Não é um teste de que está bem: é um teste de que está ASSIM, para
     que a etapa de balanceamento não tenha de a descobrir outra vez.

     Do Comum para o Raro perde-se o furar da guarda e o estado
     garantido, e o dano DESCE. A identidade da escola inverte entre
     degraus, que é o defeito que a etapa 3E mediu em 8 das 9 linhas.
     Se alguém arrumar isto, estas três conferições falham — e é esse o
     sinal de que a pendência foi resolvida. */
  verificar('REGISTRO: o Raro não fura a guarda (e o Comum e o Lendário furam)',
    !mf('Raro', 1).furaGuarda && mf('Comum', 1).furaGuarda
    && mf('Lendário', 1).furaGuarda);
  verificar('REGISTRO: o Raro não deixa estado garantido',
    !mf('Raro', 1).estadoSempre);
  verificar('REGISTRO: o Raro bate MENOS que o Comum ('
    + mf('Raro', 1).fixo + ' contra ' + mf('Comum', 1).fixo + ')',
    (mf('Raro', 1).fixo | 0) < (mf('Comum', 1).fixo | 0));
  verificar('REGISTRO: nenhum dos três tem furaGuarda E semRSnaGuarda juntos',
    RARIDADES.every(r => !(mf(r, 1).furaGuarda && mf(r, 1).semRSnaGuarda)));

  /* O FEITIO E A ESCOLA da ficha chegam certos aos três degraus. O
     `muito_forte` não recebe `estilo` — o FU_ESTILO_FORTE só se aplica
     ao lugar `forte` (ver o fuMagiaDe) — e por isso confere-se a ficha,
     que é de onde a magia saiu. */
  for (const r of RARIDADES) {
    const f = fichaDe('lamina', r, 1);
    verificar('L1 ' + r + ': o lugar é da Lâmina',
      G.fuLugaresDe(f).indexOf('muito_forte') !== -1);
    verificar('L1 ' + r + ': a ficha diz Lâmina e escola 1',
      f.feitio === 'lamina' && G.fuEscolaDe(f) === 1);
    verificar('L1 ' + r + ': o `forte` continua a ter o estilo da Lâmina',
      (G.fuMagiaDe(f, 'forte').estilo || {}).feitio === 'lamina'
      && (G.fuMagiaDe(f, 'forte').estilo || {}).escola === 1);
  }
}

/* ═══ 14 · AS LEGADAS: UMA ENTROU, UMA FICOU FORA ══════════════ */
titulo('As legadas: a Perfurante e a Lança Certeira entraram; o Estilhaço não');
{
  /* A etapa 3F tirou três magias do lugar `forte` e guardou-as. A 3F.3
     chamou duas delas para a L1. A terceira continua fora, e continua
     definida — é o que esta secção vigia. */
  const alcancaveis = new Set();
  for (const feitio of FEITIOS) {
    for (const esc of G.FU_ESCOLAS) {
      for (const raridade of RARIDADES) {
        const mg = G.fuMagiasDe(fichaDe(feitio, raridade, esc));
        for (const l of Object.keys(mg)) alcancaveis.add(mg[l].id);
      }
    }
  }
  verificar('a perfurante está na matriz (L1 Raro)', alcancaveis.has('perfurante'));
  verificar('a lanca_certeira está na matriz (L1 Lendário)',
    alcancaveis.has('lanca_certeira'));
  verificar('o estilhaco continua FORA da matriz', !alcancaveis.has('estilhaco'));
  verificar('e continua definido no FU_SEGUNDA_ESCOLA.forte',
    !!(G.FU_SEGUNDA_ESCOLA.forte && G.FU_SEGUNDA_ESCOLA.forte[1]
       && G.FU_SEGUNDA_ESCOLA.forte[1].id === 'estilhaco'));

  /* NENHUMA FOI DUPLICADA: a célula da matriz aponta para a definição
     que existe, e não para uma cópia. Confere-se por identidade de
     objeto — se alguém copiar a definição, isto falha. */
  const doForte = G.FU_SEGUNDA_ESCOLA.forte;
  const naMatriz = (r) => G.fuMagiaDe(fichaDe('lamina', r, 1), 'muito_forte');
  for (const [r, deg] of [['Raro', 2], ['Lendário', 3]]) {
    const vinda = naMatriz(r), origem = doForte[deg];
    verificar('a ' + origem.id + ' da matriz vem da definição original',
      vinda.id === origem.id && vinda.pm === origem.pm
      && (vinda.fixo | 0) === (origem.fixo | 0),
      vinda.id + ' pm' + vinda.pm + ' vs ' + origem.id + ' pm' + origem.pm);
  }
  /* E as definições não foram tocadas: os números são os que a 3F
     deixou. Escritos aqui à mão de propósito — ler da tabela faria o
     teste medir o código contra ele próprio. */
  verificar('a perfurante continua pm 14, fixo 22, semRSnaGuarda',
    doForte[2].pm === 14 && doForte[2].fixo === 22
    && doForte[2].semRSnaGuarda === true && !doForte[2].furaGuarda,
    JSON.stringify(doForte[2]));
  verificar('a lanca_certeira continua pm 20, fixo 34, furaGuarda, estadoSempre',
    doForte[3].pm === 20 && doForte[3].fixo === 34
    && doForte[3].furaGuarda === true && doForte[3].estadoSempre === true
    && !doForte[3].semRSnaGuarda, JSON.stringify(doForte[3]));
  verificar('o estilhaco continua pm 4, 2 alvos, fixo 6',
    doForte[1].pm === 4 && doForte[1].alvos === 2 && doForte[1].fixo === 6,
    JSON.stringify(doForte[1]));
}

/* ═══ 15 · L2 SENTENÇA: O CONHECIMENTO (etapa 3F.8) ════════════ */
titulo('L2 Sentença: o dano cresce com o que se sabe do alvo');
{
  const mf = (raridade, escola) =>
    G.fuMagiaDe(fichaDe('lamina', raridade, escola), 'muito_forte');

  const L2 = { Comum: 'brecha', Raro: 'sentenca', 'Lendário': 'veredito' };
  for (const r of RARIDADES) {
    const m = mf(r, 2);
    verificar('L2 ' + r + ': é a ' + L2[r], m && m.id === L2[r], m ? m.id : 'nenhuma');
    verificar('L2 ' + r + ': um alvo', (m.alvos || 1) === 1 && !m.todos);
    verificar('L2 ' + r + ': tem PM e dano', (m.pm | 0) > 0 && (m.fixo | 0) > 0,
      'pm' + m.pm + ' fixo' + m.fixo);
    verificar('L2 ' + r + ': nada vem undefined',
      Object.keys(m).every(k => m[k] !== undefined));
  }

  /* ── O EIXO: `porConhecimento` NOS TRÊS, E NADA DE `livre` ──

     A etapa 3F.6 construiu esta escola sobre o `livre` e mediu que o
     conceito não emergia: uma ação que não gasta o turno não tem razão
     para ser guardada. A 3F.7 trocou o eixo, e estas conferições são o
     que impede o `livre` de voltar. */
  for (const r of RARIDADES) {
    const m = mf(r, 2);
    verificar('L2 ' + r + ': NÃO é livre', !m.livre);
    verificar('L2 ' + r + ': tem porConhecimento', (m.porConhecimento | 0) > 0,
      String(m.porConhecimento));
  }

  /* A ESCALA SOBE A CADA GRAU, e é linear dentro de cada um — uma curva
     convexa punia quem não chegasse ao topo. */
  const inc = RARIDADES.map(r => mf(r, 2).porConhecimento | 0);
  verificar('o ganho por nível sobe a cada grau (' + inc.join(' → ') + ')',
    inc[0] < inc[1] && inc[1] < inc[2]);
  const base = RARIDADES.map(r => mf(r, 2).fixo | 0);
  verificar('e o dano base também (' + base.join(' → ') + ')',
    base[0] < base[1] && base[1] < base[2]);

  /* ── O NÍVEL 0 É JOGÁVEL, E PIOR QUE A NORMAL; O NÍVEL 3 É MELHOR ──

     É aqui que está a decisão: sem conhecer, a Sentença rende menos que
     a magia normal do mesmo lugar; conhecendo por inteiro, rende mais.
     Se isto deixar de ser verdade, a escolha de examinar desaparece. */
  for (const r of RARIDADES) {
    const m = mf(r, 2);
    const d0 = m.fixo | 0;
    const d3 = (m.fixo | 0) + (m.porConhecimento | 0) * 3;
    /* O QUE SE EXIGE É DA L2, e não do alinhamento das outras escolas.

       Tentei comparar com o melhor golpe de um alvo do mesmo lugar, e o
       teste apanhou outra coisa: a L1 do Comum é a Estocada, que é uma
       magia de RARO posta ali pela etapa 3F.3 — e nenhum Comum a bate.
       Comparar com ela media o desalinhamento da L1, que já está
       relatado, e não a Sentença.

       Fica a progressão interna, que é o que define a identidade: o
       conhecimento pleno tem de valer bem mais que a ignorância, senão
       a escolha de examinar não existe. Metade a mais é o piso. */
    verificar('L2 ' + r + ': o nível 3 rende ao menos metade a mais que o 0 ('
      + d0 + ' → ' + d3 + ')', d3 >= d0 * 1.5, d0 + ' → ' + d3);
    /* E a comparação com a escola 0 fica como REGISTRO: informa a etapa
       de balanço sem fazer o teste depender dela. */
    const normal = mf(r, 0);
    const dn = (normal.fixo || normal.danoFixo || 0);
    const alvos = normal.todos ? 3 : (normal.alvos || 1);
    console.log('       registro: ' + r + ' — ' + m.id + ' ' + d0 + '→' + d3
      + ' contra ' + normal.id + ' ' + dn + ' por alvo × ' + alvos);
  }

  /* NÃO DUPLICA O FEITIO nem as outras escolas. */
  for (const r of RARIDADES) {
    const m = mf(r, 2);
    verificar('L2 ' + r + ': não fura a guarda (é do feitio)', !m.furaGuarda);
    verificar('L2 ' + r + ': não ignora resistências', !m.ignoraResistencias);
    verificar('L2 ' + r + ': não é `todos`', !m.todos);
    verificar('L2 ' + r + ': não tem estadoSempre incondicional', !m.estadoSempre);
  }
  /* O estado garantido é SÓ do Lendário, e SÓ com conhecimento pleno —
     é o que faz o degrau máximo dominar a identidade em vez de a
     escalar. */
  verificar('só o Lendário ganha o estado com conhecimento pleno',
    !mf('Comum', 2).estadoComConhecimento && !mf('Raro', 2).estadoComConhecimento
    && mf('Lendário', 2).estadoComConhecimento === true);
  verificar('e os três sabem qual estado dar (estadoDoTipo)',
    RARIDADES.every(r => mf(r, 2).estadoDoTipo === true));

  const DAS_OUTRAS = ['execucao', 'estocada', 'perfurante', 'lanca_certeira',
                      'estilhaco', 'corte_duplo', 'devastacao'];
  verificar('L2: nenhuma é magia deslocada de outra escola',
    RARIDADES.every(r => DAS_OUTRAS.indexOf(mf(r, 2).id) === -1));
  verificar('a L0 continua sopro_maldito / concentrado / devastacao',
    RARIDADES.map(r => mf(r, 0).id).join(',')
      === 'sopro_maldito,concentrado,devastacao');
  verificar('a L1 continua estocada / perfurante / lanca_certeira',
    RARIDADES.map(r => mf(r, 1).id).join(',')
      === 'estocada,perfurante,lanca_certeira');
}

/* ═══ 16 · O CONHECIMENTO NO MOTOR ═════════════════════════════ */
titulo('O conhecimento: por lado, por alvo, e só do combate');
{
  /* O nível vem do `estado.conhece`, que o Examinar enche, um golpe
     certeiro revela e o laço abre. A L2 só o consome — nada de novo se
     guarda para ela, e é isso que estas conferições vigiam. */
  const umAvatar = (seed, nivel, feitio) => {
    const cert = GEN.certidaoDeInvocacao({ uid: 'l', nome: 'L' });
    cert.seed = seed;
    cert.nascimento.seed = seed;
    cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
    if (feitio) GEN.nascimento.porFeitio(cert.nascimento.dna, feitio);
    /* Declara a raridade: o jogo já não a tira do nível (3I.12), e esta
       cena mede o 'muito_forte', que é uma casa do Lendário. */
    return { id: 'av' + seed, seed, nivel, nascimento: cert.nascimento,
             raridadeReconhecida: nivel >= 27 ? 'Lendário'
                                : nivel >= 11 ? 'Raro' : 'Comum' };
  };
  /* Dois Lâminas e um Guarda contra três, todos com vida de sobra para o
     golpe não derrubar ninguém a meio da medição. */
  const cena = (sem) => {
    const A = ['lamina', 'lamina', 'guarda'].map((f, j) => umAvatar(63000 + j * 7, 30, f));
    const B = ['guarda', 'sustentacao', 'lamina'].map((f, j) => umAvatar(64000 + j * 9, 30, f));
    const E = M.fuIniciar(A, B, sem || 11);
    for (const c of E.A) c.ficha = Object.assign({}, c.ficha, { escola: 2 });
    for (const c of E.B) c.ficha = Object.assign({}, c.ficha, { escola: 0 });
    for (const c of E.A.concat(E.B)) {
      c.pv = 9999; c.ficha = Object.assign({}, c.ficha, { pvMax: 9999 });
    }
    return E;
  };
  /* O evento do golpe, com o `conhecimento` que o motor leu. Devolve um
     objeto VAZIO em vez de null quando a magia não traz o campo: um
     teste que rebenta não diz o que está errado, e foi o que aconteceu
     ao tirar o `porConhecimento` de propósito. */
  const bate = (E, quem, alvo) => {
    const m = G.fuMagiaDe(quem.ficha, 'muito_forte');
    const evs = M.fuAgir(E, { quem: quem.id, tipo: 'magia', magia: m, alvos: [alvo.id] });
    return evs.find(x => x.conhecimento !== undefined)
        || { conhecimento: null, bruto: null, semCampo: true };
  };

  // ── a escala, medida no dano bruto do evento ──
  {
    const brutos = [];
    for (const nv of [0, 1, 2, 3]) {
      const E = cena();
      M.fuConhece(E, 'A', E.B[0].id).nivel = nv;
      const ev = bate(E, E.A[0], E.B[0]);
      verificar('nível ' + nv + ': o evento diz o conhecimento lido',
        ev && ev.conhecimento === nv, ev ? String(ev.conhecimento) : 'sem evento');
      brutos.push(ev ? ev.bruto : 0);
    }
    verificar('o evento do golpe traz o campo `conhecimento`',
      brutos.every(b => typeof b === 'number' && b > 0),
      'brutos: ' + brutos.join(','));
    const passo = G.fuMagiaDe(fichaDe('lamina', 'Lendário', 2), 'muito_forte').porConhecimento | 0;
    verificar('o `porConhecimento` do Veredito é maior que zero', passo > 0,
      String(passo));
    verificar('o dano sobe exatamente o `porConhecimento` por nível ('
      + brutos.join(' → ') + ')',
      brutos[1] - brutos[0] === passo && brutos[2] - brutos[1] === passo
      && brutos[3] - brutos[2] === passo,
      'passos: ' + (brutos[1] - brutos[0]) + '/' + (brutos[2] - brutos[1])
      + '/' + (brutos[3] - brutos[2]) + ', esperado ' + passo);
    verificar('e o nível 0 continua a acertar e a ferir — não é bloqueio',
      brutos[0] > 0);
  }

  // ── o estado, só no nível pleno ──
  {
    for (const nv of [0, 1, 2, 3]) {
      const E = cena();
      M.fuConhece(E, 'A', E.B[0].id).nivel = nv;
      const ev = bate(E, E.A[0], E.B[0]);
      const deu = !!(ev && ev.estadoDado);
      verificar('o Veredito no nível ' + nv + (nv >= 3 ? ' DEIXA' : ' não deixa')
        + ' estado garantido',
        nv >= 3 ? deu : (deu === !!(ev && ev.critico)),
        String(ev && ev.estadoDado));
    }
  }

  // ── POR LADO: um aliado examina, todos condenam ──
  {
    const E = cena();
    const lam1 = E.A[0], lam2 = E.A[1], alvo = E.B[0];
    verificar('antes de examinar, o lado A não sabe nada',
      M.fuConhece(E, 'A', alvo.id).nivel === 0);
    M.fuAgir(E, { quem: lam1.id, tipo: 'examinar', alvo: alvo.id });
    const nA = M.fuConhece(E, 'A', alvo.id).nivel;
    verificar('o Examinar sobe o nível do lado A', nA > 0, String(nA));
    verificar('e o lado B continua a não saber',
      M.fuConhece(E, 'B', alvo.id).nivel === 0);
    M.fuNovaRonda(E);
    const ev = bate(E, lam2, alvo);
    verificar('o OUTRO aliado usa a L2 e lê o conhecimento do lado',
      ev && ev.conhecimento === nA, ev ? String(ev.conhecimento) : 'sem evento');
  }

  // ── e o inimigo não herda ──
  {
    const E = cena();
    M.fuConhece(E, 'A', E.B[0].id).nivel = 3;
    const inimigo = E.B[2];
    inimigo.ficha = Object.assign({}, inimigo.ficha, { escola: 2 });
    const ev = bate(E, inimigo, E.A[0]);
    verificar('o lado B não herda o conhecimento do lado A',
      ev && ev.conhecimento === 0, ev ? String(ev.conhecimento) : 'sem evento');
  }

  // ── POR ALVO: conhecer um não ajuda contra o outro ──
  {
    const E = cena();
    M.fuConhece(E, 'A', E.B[0].id).nivel = 3;
    M.fuConhece(E, 'A', E.B[1].id).nivel = 0;
    const conhecido = bate(E, E.A[0], E.B[0]);
    M.fuNovaRonda(E);
    const estranho = bate(E, E.A[0], E.B[1]);
    verificar('contra o alvo conhecido lê 3',
      conhecido && conhecido.conhecimento === 3);
    verificar('contra o alvo desconhecido lê 0',
      estranho && estranho.conhecimento === 0);
    verificar('e o dano difere entre os dois alvos',
      typeof conhecido.bruto === 'number' && typeof estranho.bruto === 'number'
      && conhecido.bruto > estranho.bruto,
      conhecido.bruto + ' vs ' + estranho.bruto);
  }

  // ── NÃO ATRAVESSA COMBATES ──
  {
    const E1 = cena();
    M.fuConhece(E1, 'A', E1.B[0].id).nivel = 3;
    const E2 = cena();
    verificar('um combate novo começa sem conhecimento',
      M.fuConhece(E2, 'A', E2.B[0].id).nivel === 0);
    const ev = bate(E2, E2.A[0], E2.B[0]);
    verificar('e a L2 no combate novo lê 0',
      ev && ev.conhecimento === 0, ev ? String(ev.conhecimento) : 'sem evento');
    verificar('os dois combates não partilham o conhecimento',
      M.fuConhece(E1, 'A', E1.B[0].id).nivel === 3
      && M.fuConhece(E2, 'A', E2.B[0].id).nivel === 0);
  }

  // ── NÃO É PERSISTIDO: o cliente não o pode escrever ──
  {
    /* O conhecimento vive no estado do combate, que o servidor monta a
       cada batalha. Não há campo na ficha, no slot, na certidão nem no
       DNA — e esta conferição é o que impede alguém de o acrescentar. */
    const slot = umAvatar(65001, 30, 'lamina');
    const ficha = F.fuFicha(slot);
    for (const campo of ['conhece', 'conhecimento', 'nivelConhecimento']) {
      verificar('a ficha não tem o campo `' + campo + '`',
        ficha[campo] === undefined);
      verificar('o slot não tem o campo `' + campo + '`',
        slot[campo] === undefined);
      verificar('a certidão não tem o campo `' + campo + '`',
        slot.nascimento[campo] === undefined);
    }
    /* E escrever no slot não chega ao combate: o fuIniciar monta o
       `conhece` do zero. */
    const sujo = Object.assign({}, slot, { conhece: { A: { x: { nivel: 3 } } },
                                           conhecimento: 3 });
    const E = M.fuIniciar([sujo], [umAvatar(65002, 30, 'guarda')], 11);
    verificar('um slot com `conhece` escrito à mão não contamina o combate',
      M.fuConhece(E, 'A', E.B[0].id).nivel === 0);
  }

  // ── O LAÇO: medido e registrado, não alterado ──
  {
    /* O laço abre a ficha inteira (nível 3) contra quem se reencontra,
       nos dois lados, no fuIniciar. A L2 recebe isso de graça. NÃO se
       mexe nele nesta etapa: fica medido para a etapa de balanço. */
    const a = umAvatar(66001, 30, 'lamina');
    const b = umAvatar(66002, 30, 'guarda');
    a.lacoRival = {};
    a.lacoRival[b.id] = 2;
    const E = M.fuIniciar([a], [b], 11);
    for (const c of E.A) c.ficha = Object.assign({}, c.ficha, { escola: 2 });
    verificar('REGISTRO: com laço rival, o conhecimento começa em 3',
      M.fuConhece(E, 'A', E.B[0].id).nivel === 3,
      String(M.fuConhece(E, 'A', E.B[0].id).nivel));
    /* A MUTUALIDADE NÃO VEM DO MOTOR. O comentário do fuIniciar diz que
       o reconhecimento é mútuo, mas o laço só abre a ficha para o lado
       de QUEM TEM o `lacoRival`: com ele num slot só, um lado sabe e o
       outro não. Quem o põe nos dois é o js/lacos.js, fora do combate.
       Medido aqui para ficar dito, e não alterado. */
    verificar('REGISTRO: com o laço num slot só, o outro lado NÃO sabe',
      M.fuConhece(E, 'B', E.A[0].id).nivel === 0,
      String(M.fuConhece(E, 'B', E.A[0].id).nivel));
    const a2 = umAvatar(66001, 30, 'lamina');
    const b2 = umAvatar(66002, 30, 'guarda');
    a2.lacoRival = {}; a2.lacoRival[b2.id] = 2;
    b2.lacoRival = {}; b2.lacoRival[a2.id] = 2;
    const Em = M.fuIniciar([a2], [b2], 11);
    verificar('REGISTRO: com o laço nos dois, os dois lados sabem',
      M.fuConhece(Em, 'A', Em.B[0].id).nivel === 3
      && M.fuConhece(Em, 'B', Em.A[0].id).nivel === 3);
    /* Sem laço, começa em 0 — o que confirma que o 3 vem do laço e não
       de um descuido na inicialização. */
    const E2 = M.fuIniciar([umAvatar(66003, 30, 'lamina')], [b], 11);
    verificar('e sem laço continua a começar em 0',
      M.fuConhece(E2, 'A', E2.B[0].id).nivel === 0);
  }

  // ── DETERMINISMO: o mesmo estado dá o mesmo dano ──
  {
    let instavel = 0, conferidos = 0;
    for (let i = 0; i < 100; i++) {
      for (const nv of [0, 1, 2, 3]) {
        const brutos = [];
        for (let k = 0; k < 5; k++) {
          const E = cena(100 + i);
          M.fuConhece(E, 'A', E.B[0].id).nivel = nv;
          const ev = bate(E, E.A[0], E.B[0]);
          brutos.push(ev ? ev.bruto : -1);
        }
        conferidos++;
        if (new Set(brutos).size !== 1) instavel++;
      }
    }
    verificar('o mesmo estado dá sempre o mesmo dano ('
      + conferidos + ' casos × 5 leituras)', instavel === 0,
      instavel + ' instáveis');
  }

  // ── A IA VÊ O CONHECIMENTO (etapa 3F.10) ──
  {
    /* O motor aplicava o `porConhecimento` e a IA não o via: o
       `_iaAtaquesDe` montava o golpe sem o campo, e o `_iaGolpe` não
       recebia o estado. Medido na etapa 3F.9: o Veredito valia-lhe 38,1
       contra um alvo estudado E contra um desconhecido.

       Agora o campo viaja no `o` e o `_iaEfeito` soma o bônus. Estas
       conferições são o que impede a cegueira de voltar. */
    const IA = require('../js/ia-fu.js');
    const valorDoVeredito = (nv, nAlvos) => {
      const A = [umAvatar(97001, 30, 'lamina')];
      const B = [];
      for (let i = 0; i < (nAlvos || 3); i++) B.push(umAvatar(97100 + i * 11, 30, 'guarda'));
      const E = M.fuIniciar(A, B, 19);
      for (const c of E.A) c.ficha = Object.assign({}, c.ficha, { escola: 2 });
      /* alvos NEUTROS e iguais: sem afinidade, muita vida. Sem isto a
         medida apanhava a afinidade em vez do conhecimento — foi o que
         me enganou na primeira leitura da etapa 3F.9. */
      for (const c of E.B) {
        c.ficha = Object.assign({}, c.ficha, { afinidades: {}, pvMax: 9999, crise: 4999 });
        c.pv = 9999;
        M.fuConhece(E, 'A', c.id).nivel = nv;
      }
      const o = IA._iaOpcoes(E, E.A[0], IA.FU_IA_NIVEIS[1])
        .find(x => x.acao.tipo === 'magia' && x.acao.magia
                   && x.acao.magia.id === 'veredito');
      return o ? o.v : null;
    };
    const vs = [0, 1, 2, 3].map(nv => valorDoVeredito(nv, 3));
    verificar('a IA avalia o Veredito em todos os níveis',
      vs.every(v => typeof v === 'number'), JSON.stringify(vs));
    verificar('e o valor SOBE com o conhecimento ('
      + vs.map(v => v === null ? '—' : v.toFixed(1)).join(' → ') + ')',
      vs[0] < vs[1] && vs[1] < vs[2] && vs[2] < vs[3],
      JSON.stringify(vs));
    /* E O SALTO PARA O NÍVEL 3 É MAIOR que os outros, porque lá entra o
       estado garantido além do dano. Sem esta conferição, tirar o
       estado da conta da IA passava sem ninguém dar por isso — o valor
       continuava a subir, só pelo dano. Apanhado por mutação. */
    /* COM MARGEM, e não com `>`. Os saltos saem em ponto flutuante, e
       quando o estado não entrava na conta eles davam
       5,399999999999999 / 5,399999999999999 / 5,400000000000006 — o
       terceiro maior que os outros por erro de arredondamento, e o
       teste passava por acaso aritmético. Apanhado por mutação.

       Medido: com o estado, o último salto é ~2x o maior dos outros;
       sem ele, é igual. Uma vez e meia separa os dois casos com folga. */
    const saltos = [vs[1] - vs[0], vs[2] - vs[1], vs[3] - vs[2]];
    const maiorDosOutros = Math.max(saltos[0], saltos[1]);
    verificar('e o salto para o nível 3 vale ao menos 1,5x os outros ('
      + saltos.map(x => x.toFixed(1)).join(' / ') + ')',
      saltos[2] >= maiorDosOutros * 1.5,
      saltos[2].toFixed(2) + ' contra ' + maiorDosOutros.toFixed(2));

    /* POR ALVO: a IA mira a Sentença em quem ela conhece. */
    {
      const A = [umAvatar(97001, 30, 'lamina')];
      const B = [0, 1, 2].map(i => umAvatar(97100 + i * 11, 30, 'guarda'));
      const E = M.fuIniciar(A, B, 19);
      for (const c of E.A) c.ficha = Object.assign({}, c.ficha, { escola: 2 });
      for (const c of E.B) {
        c.ficha = Object.assign({}, c.ficha, { afinidades: {}, pvMax: 9999, crise: 4999 });
        c.pv = 9999;
      }
      M.fuConhece(E, 'A', E.B[1].id).nivel = 3;   // o do meio é o conhecido
      const o = IA._iaOpcoes(E, E.A[0], IA.FU_IA_NIVEIS[1])
        .find(x => x.acao.tipo === 'magia' && x.acao.magia
                   && x.acao.magia.id === 'veredito');
      verificar('a IA mira a Sentença no alvo que conhece',
        o && (o.acao.alvos || [])[0] === E.B[1].id,
        o ? String(o.acao.alvos) : 'não propôs');
    }

    /* POR LADO: o aliado que não examinou aproveita o exame. */
    {
      const A = ['lamina', 'lamina'].map((f, j) => umAvatar(97200 + j * 7, 30, f));
      const B = [umAvatar(97300, 30, 'guarda')];
      const E = M.fuIniciar(A, B, 19);
      for (const c of E.A) c.ficha = Object.assign({}, c.ficha, { escola: 2 });
      for (const c of E.B) {
        c.ficha = Object.assign({}, c.ficha, { afinidades: {}, pvMax: 9999, crise: 4999 });
        c.pv = 9999;
      }
      const vdo = (lutador) => {
        const o = IA._iaOpcoes(E, lutador, IA.FU_IA_NIVEIS[1])
          .find(x => x.acao.tipo === 'magia' && x.acao.magia
                     && x.acao.magia.id === 'veredito');
        return o ? o.v : null;
      };
      const antes = vdo(E.A[1]);
      M.fuConhece(E, 'A', E.B[0].id).nivel = 3;
      const depois = vdo(E.A[1]);
      verificar('o aliado que não examinou aproveita o conhecimento do lado',
        antes !== null && depois !== null && depois > antes,
        antes + ' → ' + depois);
    }
  }

  // ── e o apoio livre continua intocado ──
  {
    const A = [umAvatar(67001, 30, 'sustentacao')];
    const B = [umAvatar(67002, 30, 'guarda')];
    const E = M.fuIniciar(A, B, 11);
    for (const c of E.A) c.ficha = Object.assign({}, c.ficha, { escola: 0 });
    const q = E.A[0];
    const sup = G.fuMagiaDe(q.ficha, 'suporte');
    verificar('o suporte Lendário da escola 0 continua livre', sup.livre === true);
    verificar('o primeiro uso é aceito',
      M.fuAgir(E, { quem: q.id, tipo: 'magia', magia: sup, alvos: [q.id] }).length > 0);
    verificar('e não gasta o turno', E.jaAgiu.indexOf(q.id) === -1);
    verificar('o segundo é recusado',
      M.fuAgir(E, { quem: q.id, tipo: 'magia', magia: sup, alvos: [q.id] }).length === 0);
  }
}
/* ═══ RESUMO ═══════════════════════════════════════════════════ */
console.log('\n' + '─'.repeat(64));
if (mau) {
  console.log('FALHAS:');
  for (const f of falhas) console.log('  ✗ ' + f);
  console.log('');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
