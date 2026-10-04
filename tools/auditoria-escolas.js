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
      const nome = (G.FU_MATRIZ[lugar] || {})[esc];
      verificar('matriz[' + lugar + '][' + esc + '] nomeia uma tabela',
        !!nome && !!G.FU_TABELAS[nome], String(nome));
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
    return { id: 'x', seed, nivel, nascimento: cert.nascimento };
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
          const lugares = G.fuLugaresDe(ficha);
          // os três lugares do feitio, e todos com magia
          if (lugares.length !== 3) { bom = false; porque = lugares.length + ' lugares'; }
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
  for (const id of LEGADAS) {
    verificar('a ' + id + ' está fora da matriz (é legada)',
      !alcancaveis.has(id));
  }
  /* As outras nove da segunda escola CONTINUAM na matriz, pelos lugares
     próprios de cada feitio. */
  const ATIVAS = ['corte_duplo', 'estocada', 'execucao',
                  'postura_ferro', 'escudo_focado', 'baluarte',
                  'balsamo', 'transfusao', 'canto_guerra'];
  for (const id of ATIVAS) {
    verificar('a ' + id + ' continua ativa na matriz', alcancaveis.has(id));
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
    return { id: 'y', seed, nivel: 30, nascimento: cert.nascimento };
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

/* ═══ RESUMO ═══════════════════════════════════════════════════ */
console.log('\n' + '─'.repeat(64));
if (mau) {
  console.log('FALHAS:');
  for (const f of falhas) console.log('  ✗ ' + f);
  console.log('');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
