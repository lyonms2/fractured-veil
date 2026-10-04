#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A ESCOLHA DO ANCIÃO — autoridade, irreversibilidade e tampering

     node tools/testar-escolhas.js

   As regras correm sem nada no ar. A metade de ponta a ponta precisa do
   jogo local, e diz quando não corre:

     firebase emulators:exec --only firestore,database,auth \
       --project demo-teste "node tools/pvp-local.js"

   ── O QUE SE MEDE ──

   Ao chegar a Lendário, o avatar fecha a COSTURA — deixa de ter
   fraqueza elemental — ou ganha uma SEGUNDA VANTAGEM. É a única decisão
   que o jogador toma sobre a ficha de combate.

   Ela vivia no `avatarSlots`, e foi medido: escrever `'semDefeito'` lá
   tirava a fraqueza em 500 de 500 Lendários. A trava do "uma vez só"
   era `if (s.escolhaAnciao) return false` — a ler o campo que o cliente
   escreve, e portanto nenhuma trava.

   O pior não era escolher mal: era escolher DUAS VEZES, uma por
   adversário. `'semDefeito'` contra quem exploraria a costura,
   `'vantagem'` contra os outros.

   Este arquivo prova que isso acabou, e mede as duas metades da regra:
   que a escolha legítima continua a FAZER o que fazia, e que a escolha
   adulterada não faz nada.
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const E   = require(path.join(__dirname, '..', 'js', 'escolhas.js'));
const N   = require(path.join(__dirname, '..', 'js', 'nascimento.js'));
const F   = require(path.join(__dirname, '..', 'js', 'ficha-fu.js'));
const M   = require(path.join(__dirname, '..', 'js', 'magias-fu.js'));
const V   = require(path.join(__dirname, '..', 'js', 'vantagens-fu.js'));
const C   = require(path.join(__dirname, '..', 'js', 'combate-fu.js'));
const CO  = require(path.join(__dirname, '..', 'js', 'cores.js'));
const PVP = require(path.join(__dirname, '..', 'js', 'pvp-regras.js'));
Object.assign(global, N, F, M, V, C, CO);
const GEN = require(path.join(__dirname, '..', 'api', '_genetica.js'));

let passaram = 0;
const falhas = [];
const ok = (nome, cond, det) => {
  if (cond) { passaram++; return; }
  falhas.push('  ✗ ' + nome + (det !== undefined ? '\n      ' + det : ''));
};
const igual = (nome, obtido, esperado) =>
  ok(nome, obtido === esperado, `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`);
const titulo = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 52 - t.length)));

const AMOSTRA = 500;
const vant = f => (f.vantagens || []).map(v => v.id || v.nome || String(v)).sort();
const magias = f => Object.entries(M.fuMagiasDe(f)).map(([l, m]) => l + ':' + m.id).sort().join(',');

const novo = (nivel) => {
  const c = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  const nv = nivel || 30;
  return { id: c.id, seed: c.seed, nivel: nv, nome: 'T',
           raridade: nv >= 27 ? 'Lendário' : (nv >= 11 ? 'Raro' : 'Comum'),
           nascimento: c.nascimento };
};

/* O carregamento, como o js/firebase.js o faz: o mapa do servidor
   sobrepõe-se ao slot, e sem registro o campo SAI. */
const hidratar = (slot, escolhas) => {
  const r = Object.assign({}, slot);
  const e = escolhas && escolhas[slot.id];
  if (e && typeof e.anciao === 'string') r.escolhaAnciao = e.anciao;
  else delete r.escolhaAnciao;
  return r;
};

/* ═══ 1 · OS DOIS VALORES, E MAIS NENHUM ═════════════════════════ */
titulo('Os valores válidos');
{
  igual('são exatamente dois', E.ESCOLHA_ANCIAO_VALIDAS.length, 2);
  ok('e são vantagem e semDefeito',
     E.ESCOLHA_ANCIAO_VALIDAS.indexOf('vantagem') >= 0
     && E.ESCOLHA_ANCIAO_VALIDAS.indexOf('semDefeito') >= 0);
  /* A lista existe duas vezes: aqui e no FICHA_ESCOLHAS do
     js/vantagens-fu.js, porque este arquivo corre no servidor e aquele
     mexe no catálogo de vantagens. Duas cópias do mesmo nome acabam por
     discordar — esta linha é o que as obriga. */
  igual('e batem com o FICHA_ESCOLHAS da ficha',
        JSON.stringify([...E.ESCOLHA_ANCIAO_VALIDAS].sort()),
        JSON.stringify([...V.FICHA_ESCOLHAS].sort()));
  igual('o degrau é o 27 (FU_NIVEL_LENDARIO)', E.ESCOLHA_ANCIAO_NIVEL, 27);

  for (const v of ['lixo', '', null, undefined, 0, 1, true, 'SEMDEFEITO',
                   'semdefeito', 'Vantagem', {}, [], ['vantagem']]) {
    ok('recusa o valor ' + JSON.stringify(v), !E.escolhaAnciaoValida(v));
  }
}

/* ═══ 2 · A ESCOLHA SÓ SE FAZ UMA VEZ ════════════════════════════ */
titulo('Irreversibilidade');
{
  const r1 = E.escolhaAnciaoAceitar(null, 'vantagem', 30, 1000);
  ok('a primeira é aceita', r1.ok);
  igual('e grava o valor pedido', r1.reg.anciao, 'vantagem');
  igual('com a data de quando foi', r1.reg.em, 1000);

  const r2 = E.escolhaAnciaoAceitar(r1.reg, 'semDefeito', 30, 2000);
  ok('a segunda é recusada', !r2.ok);
  igual('e diz porquê', r2.motivo, 'JA_ESCOLHEU');
  igual('e devolve a que vale', r2.reg.anciao, 'vantagem');

  /* REPETIR O MESMO VALOR TAMBÉM É RECUSADO, e não é preciosismo: um
     pedido aceito carimbaria uma data nova, e a data é o que diz quando
     a decisão foi tomada. */
  const r3 = E.escolhaAnciaoAceitar(r1.reg, 'vantagem', 30, 3000);
  ok('e repetir o MESMO valor também é recusado', !r3.ok);
  igual('a data da escolha não se move', r3.reg.em, 1000);

  // o nível
  for (const [nv, esperado] of [[1, false], [10, false], [26, false], [27, true], [60, true]]) {
    igual('nível ' + nv + ': aceita? ', E.escolhaAnciaoAceitar(null, 'vantagem', nv, 1).ok, esperado);
  }
  ok('sem nível nenhum, recusa', !E.escolhaAnciaoAceitar(null, 'vantagem', undefined, 1).ok);

  // um registro corrompido não trava nem passa por bom
  ok('um registro com valor inválido não conta como escolha',
     E.escolhaAnciaoAceitar({ anciao: 'lixo', em: 1 }, 'vantagem', 30, 2).ok);
  igual('e o escolhaAnciaoDe não o devolve',
        E.escolhaAnciaoDe({ x: { anciao: 'lixo' } }, 'x'), null);
}

/* ═══ 3 · A AUTORIDADE: O MAPA MANDA, O SLOT É ESPELHO ═══════════ */
titulo('A autoridade: os casos A, B, C e D');
{
  let a = 0, b = 0, c = 0, d = 0, e = 0;
  for (let i = 0; i < AMOSTRA; i++) {
    const s = novo(30);

    // A: certidão 'vantagem', slot 'semDefeito' → vale 'vantagem'
    let h = hidratar(Object.assign({}, s, { escolhaAnciao: 'semDefeito' }),
                     { [s.id]: { anciao: 'vantagem', em: 1 } });
    const fa = F.fuFicha(h);
    if (h.escolhaAnciao === 'vantagem' && fa.costura !== null) a++;

    // B: certidão 'semDefeito', slot 'vantagem' → vale 'semDefeito'
    h = hidratar(Object.assign({}, s, { escolhaAnciao: 'vantagem' }),
                 { [s.id]: { anciao: 'semDefeito', em: 1 } });
    const fb = F.fuFicha(h);
    if (h.escolhaAnciao === 'semDefeito' && fb.costura === null) b++;

    // C: o slot não tem nada, o mapa tem
    h = hidratar(s, { [s.id]: { anciao: 'semDefeito', em: 1 } });
    if (F.fuFicha(h).costura === null) c++;

    // D: o slot tem lixo, o mapa não tem nada
    h = hidratar(Object.assign({}, s, { escolhaAnciao: 'lixo' }), {});
    if (h.escolhaAnciao === undefined && F.fuFicha(h).costura !== null) d++;

    // e o slot com um valor VÁLIDO, sem registro: também não vale
    h = hidratar(Object.assign({}, s, { escolhaAnciao: 'semDefeito' }), {});
    if (h.escolhaAnciao === undefined && F.fuFicha(h).costura !== null) e++;
  }
  igual('A: a certidão manda sobre o slot', a, AMOSTRA);
  igual('B: e manda nos dois sentidos', b, AMOSTRA);
  igual('C: slot vazio, o mapa decide', c, AMOSTRA);
  igual('D: slot com lixo, sem registro: sem escolha', d, AMOSTRA);
  igual('e um valor VÁLIDO no slot sem registro também não vale', e, AMOSTRA);
}

/* ═══ 4 · OS DOIS EFEITOS, NA MECÂNICA ══════════════════════════ */
titulo('Os dois efeitos: o que cada escolha faz');
{
  let semD = 0, comV = 0, magiasIguais = 0, escolaIgual = 0, dadosIguais = 0;
  let pvPorVantagem = 0, pvSemRazao = 0;
  for (let i = 0; i < AMOSTRA; i++) {
    const s = novo(30);
    const base = F.fuFicha(hidratar(s, {}));
    const fSD  = F.fuFicha(hidratar(s, { [s.id]: { anciao: 'semDefeito', em: 1 } }));
    const fV   = F.fuFicha(hidratar(s, { [s.id]: { anciao: 'vantagem',   em: 1 } }));

    // 'semDefeito': a costura vai-se, e as afinidades mudam com ela
    if (base.costura !== null && fSD.costura === null
        && JSON.stringify(base.afinidades) !== JSON.stringify(fSD.afinidades)) semD++;
    // 'vantagem': a costura FICA, e ganha-se uma vantagem
    if (fV.costura === base.costura && vant(fV).length === vant(base).length + 1) comV++;
    // e nada mais se mexe
    if (magias(base) === magias(fSD) && magias(base) === magias(fV)) magiasIguais++;
    if (base.escola === fSD.escola && base.escola === fV.escola) escolaIgual++;
    /* OS DADOS: 'semDefeito' nunca os toca. O 'vantagem' PODE mexer no
       PV ou no PM — e não é defeito, é a vantagem a fazer o que faz: a
       `carne_teimosa` dá vida e a `fonte_funda` dá magia. Medido: 77 de
       500. O que nenhuma das duas faz é mexer nos quatro DADOS. */
    if ([base.DES, base.PER, base.VIG, base.VON].join() === [fSD.DES, fSD.PER, fSD.VIG, fSD.VON].join()
        && [base.DES, base.PER, base.VIG, base.VON].join() === [fV.DES, fV.PER, fV.VIG, fV.VON].join()
        && base.pvMax === fSD.pvMax && base.pmMax === fSD.pmMax) dadosIguais++;
    if (base.pvMax !== fV.pvMax || base.pmMax !== fV.pmMax) {
      const nova = vant(fV).filter(x => vant(base).indexOf(x) < 0);
      if (nova.length && /carne_teimosa|fonte_funda/.test(nova.join())) pvPorVantagem++;
      else pvSemRazao++;
    }
  }
  igual('"semDefeito" tira a costura e muda as afinidades', semD, AMOSTRA);
  igual('"vantagem" mantém a costura e dá uma vantagem', comV, AMOSTRA);
  igual('e as MAGIAS não mudam com nenhuma das duas', magiasIguais, AMOSTRA);
  igual('nem a ESCOLA', escolaIgual, AMOSTRA);
  igual('os quatro dados nunca mudam, e o "semDefeito" não toca em PV/PM',
        dadosIguais, AMOSTRA);
  /* E quando o PV ou o PM mudam com o 'vantagem', é SEMPRE por causa da
     vantagem ganha. Zero casos sem explicação — é o que distingue "a
     vantagem funciona" de "a escolha mexe onde não devia". */
  igual('e o PV/PM só muda quando a vantagem o dá', pvSemRazao, 0);
  ok('(e isso acontece: ' + pvPorVantagem + ' de ' + AMOSTRA + ' ganharam carne_teimosa ou fonte_funda)',
     pvPorVantagem > 0);

  // a vantagem que se ganha é a que a ficha anunciava
  const s = novo(30);
  const base = F.fuFicha(hidratar(s, {}));
  const fV = F.fuFicha(hidratar(s, { [s.id]: { anciao: 'vantagem', em: 1 } }));
  const prometida = base.segundaPossivel && (base.segundaPossivel.id || base.segundaPossivel.nome);
  ok('e é a vantagem que a ficha prometia (segundaPossivel)',
     !prometida || vant(fV).indexOf(prometida) >= 0,
     'prometia ' + prometida + ', ganhou ' + JSON.stringify(vant(fV)));

  // abaixo do 27 nenhuma das duas vale
  for (const nv of [1, 10, 26]) {
    const s2 = novo(nv);
    const a = F.fuFicha(hidratar(s2, {}));
    const b = F.fuFicha(hidratar(s2, { [s2.id]: { anciao: 'semDefeito', em: 1 } }));
    igual('no nível ' + nv + ' a escolha não muda a ficha',
          JSON.stringify(a), JSON.stringify(b));
  }
}

/* ═══ 5 · O PvP ═════════════════════════════════════════════════ */
titulo('O PvP: o retrato leva o que o servidor reconhece');
{
  let doSlot = 0, doMapa = 0, fichaSuja = 0;
  for (let i = 0; i < 200; i++) {
    const s = novo(30);
    // o cliente escreveu no slot; o mapa não tem nada
    const r1 = PVP.pvpRetrato(Object.assign({}, s, { escolhaAnciao: 'semDefeito' }),
                              s.nascimento, 30, E.escolhaAnciaoDe({}, s.id));
    if (r1.escolhaAnciao !== undefined) doSlot++;
    if (F.fuFicha(r1).costura === null) fichaSuja++;
    // e o contrário: o mapa tem, o slot não
    const r2 = PVP.pvpRetrato(s, s.nascimento, 30,
                              E.escolhaAnciaoDe({ [s.id]: { anciao: 'semDefeito', em: 1 } }, s.id));
    if (r2.escolhaAnciao === 'semDefeito' && F.fuFicha(r2).costura === null) doMapa++;
  }
  igual('o retrato NÃO leva a escolha do slot', doSlot, 0);
  igual('e a ficha do adversário não vem sem fraqueza', fichaSuja, 0);
  igual('mas leva a do mapa, quando há', doMapa, 200);

  /* E O SERVIDOR LÊ DO MAPA. A assinatura do pvpRetrato ganhou um quarto
     argumento de propósito: sem ele não vai escolha nenhuma, que é o
     conservador — a costura fica. */
  const fs = require('fs');
  const pvpApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'pvp.js'), 'utf8');
  ok('o api/pvp.js lê o mapa `escolhas`', /const escolhas = d\.escolhas/.test(pvpApi));
  ok('e passa-o ao retrato', /escolhaAnciaoDe\(escolhas, s\.id\)/.test(pvpApi));
  const regras = fs.readFileSync(path.join(__dirname, '..', 'js', 'pvp-regras.js'), 'utf8');
  ok('e o retrato já não lê o slot',
     !/r\.escolhaAnciao = slot\.escolhaAnciao/.test(regras));
}

/* ═══ 6 · A FRONTEIRA, DECLARADA ════════════════════════════════ */
titulo('A fronteira: quem escreve o quê');
{
  const fs = require('fs');
  const ler = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  ok("'escolhas' está na lista das regras do Firestore",
     /'escolhas'/.test(ler('firestore.rules')));

  const pool = ler('api/pool.js');
  ok('o servidor atende a ação', /acao === 'escolha-anciao'/.test(pool));
  ok('numa transação', /async function handleEscolhaAnciao[\s\S]{0,2500}runTransaction/.test(pool));
  ok('e o nível que ele usa é o RECONHECIDO, não o do slot',
     /async function handleEscolhaAnciao[\s\S]{0,2500}NIV\.nivelDe\(niveis, id, slot\)/.test(pool));
  ok('escreve no mapa `escolhas`',
     /async function handleEscolhaAnciao[\s\S]{0,2500}escolhas\.\$\{id\}/.test(pool));

  const esc = ler('js/escolha.js');
  ok('a tela PEDE ao servidor em vez de gravar', /escolhaAnciaoPedir\(/.test(esc));
  ok('e já não escreve o slot por si', !/^\s*avatar\.escolhaAnciao = qual;/m.test(esc));

  const fb = ler('js/firebase.js');
  ok('o carregamento sobrepõe o slot com o mapa',
     /restored\.escolhaAnciao = _esc\.anciao/.test(fb));
  ok('e APAGA o campo quando não há registro',
     /else delete restored\.escolhaAnciao/.test(fb));

  const compra = ler('api/comprar-avatar.js');
  ok('a venda transfere a escolha', /escolhas\.\$\{listing\.id\}/.test(compra));
  ok('e apaga-a no vendedor', /chaveEsc\s*\?\s*\{\s*\[chaveEsc\]:\s*FieldValue\.delete/.test(compra));

  const html = ler('index.html');
  const tag = n => html.indexOf('src="js/' + n + '.js');
  ok('o index.html carrega o js/escolhas.js', tag('escolhas') > 0);
  ok('antes do js/escolha.js (a tela)', tag('escolhas') > 0 && tag('escolhas') < tag('escolha'));
  ok('e antes do js/firebase.js', tag('escolhas') > 0 && tag('escolhas') < tag('firebase'));
}

/* ═══ 7 · A REPRODUÇÃO NÃO HERDA ════════════════════════════════ */
titulo('Reprodução: o filho não herda a escolha');
{
  const fs = require('fs');
  const ler = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  igual('js/reproducao.js não conhece a escolha',
        (ler('js/reproducao.js').match(/escolhaAnciao/g) || []).length, 0);
  igual('js/nascimento.js também não',
        (ler('js/nascimento.js').match(/escolhaAnciao/g) || []).length, 0);

  const c = GEN.certidaoDeChoco({ dna: novo(30).nascimento.dna }, { uid: 'a', nome: 'F' });
  ok('a certidão do filho não traz o campo', !('escolhaAnciao' in c.nascimento));
  const filho = { id: c.id, seed: c.seed, nivel: 1, nascimento: c.nascimento };
  ok('e a ficha do filho tem a costura dele', F.fuFicha(filho).costura !== null);

  /* E o choco NÃO registra escolha no mapa — ao contrário do nível e da
     vida ativa, que nascem registrados. Aqui não há o que registrar: a
     decisão ainda não foi tomada. */
  const pool = ler('api/pool.js');
  ok('o handleChocarOvo não grava escolha nenhuma',
     !/handleChocarOvo[\s\S]{0,4000}escolhas\.\$\{id\}/.test(pool));
}

// ═══════════════════════════════════════════════════════════════════
console.log();
if (falhas.length) {
  console.log(`${passaram} passaram · ${falhas.length} falharam\n`);
  falhas.forEach(f => console.log(f));
  process.exitCode = 1;
} else {
  console.log(`${passaram} passaram · 0 falharam`);
}
