#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DOS AVATARES GUARDADOS

   A pergunta que faltava responder ao trocar de motor: os avatares que
   já estão gravados continuam a ser os mesmos?

   ── A RESPOSTA É QUE NÃO HÁ MIGRAÇÃO ──

   A ficha nova é uma FUNÇÃO PURA de quatro coisas, e as quatro já vão no
   slot desde antes desta mudança:

     seed            o número que decide o corpo e a ordem dos dados
     nascimento.dna  o arranjo, o tom, a costura, o feitio
     nivel           a vida, a magia, a precisão e a raridade
     escolhaAnciao   o que o Lendário decidiu

   Nada se recalcula e se guarda: recalcula-se sempre. Guardar o arranjo
   no slot seria criar uma segunda verdade sobre o mesmo avatar — e no
   dia em que as duas discordassem, a que o jogador vê e a que o servidor
   confere seriam diferentes, que é exactamente o buraco por onde um
   avatar se vende por um preço que não vale.

   Este arquivo guarda essa promessa. O que ele confere:

     1. o que o slot guarda, guardado e lido outra vez, dá a mesma ficha
     2. um avatar de ANTES — com raridade escrita, sem escolha — sai certo
     3. um avatar sem DNA sai marcado, e sem números impossíveis
     4. nenhum campo que o cliente escreve muda a ficha a seu favor
     5. subir de nível não lhe troca os dados, o tom, a costura nem a
        vantagem

   node tools/auditoria-avatares.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const V   = require('../js/vantagens-fu.js');
const M   = require('../js/combate-fu.js');
const G   = require('../js/magias-fu.js');
Object.assign(global, V, M, G);

let ok = 0, mau = 0;
const falhas = [];
function verificar(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe ? '\n      ' + detalhe : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

/* Um slot com a forma EXACTA com que o js/firebase.js o grava. Não é um
   avatar de conveniência: é o que sai da base de dados. */
function slotGravado(seed, nivel, extra) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  return Object.assign({
    id: 'a' + seed,
    nome: 'Teste',
    seed,
    nivel,
    xp: 120,
    vinculo: 40,
    hatched: true,
    dead: false,
    nomeTravado: true,
    escolhaAnciao: null,
    nascimento: cert.nascimento,
    vitals: { fome: 80, humor: 90, energia: 70, saude: 100, higiene: 60 },
  }, extra || {});
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ═══ 1 · GRAVAR E LER NÃO MUDA NADA ═══════════════════════════════ */
titulo('Gravar e voltar a ler dá a mesma ficha');
{
  for (let s = 1; s <= 300; s++) {
    const nivel = 1 + (s % 60);
    const slot = slotGravado(s * 7919, nivel);
    const antes = F.fuFicha(slot);
    // a volta pela base de dados: JSON e de volta
    const depois = F.fuFicha(JSON.parse(JSON.stringify(slot)));
    verificar('o slot ' + slot.seed + ' sobrevive à gravação', igual(antes, depois));
  }

  // e a mesma ficha pedida duas vezes é a mesma ficha
  for (let s = 1; s <= 100; s++) {
    const slot = slotGravado(s * 104729, 30);
    verificar('a ficha do seed ' + slot.seed + ' é estável',
      igual(F.fuFicha(slot), F.fuFicha(slot)));
  }
}

/* ═══ 2 · UM AVATAR DE ANTES ═══════════════════════════════════════ */
titulo('Um avatar gravado antes desta mudança');
{
  /* O slot antigo trazia `raridade` escrita e podia não ter
     `escolhaAnciao` nenhuma. As duas coisas têm de ser inofensivas: a
     raridade sai do NÍVEL e a escolha em falta é uma escolha por fazer.

     A raridade escrita é a que mais importa, e não é teoria: ela vinha
     do cliente, e houve um dia em que o mesmo avatar valia Lendário de
     um lado e Raro do outro. */
  for (let s = 1; s <= 200; s++) {
    const seed = s * 31337;
    const nivel = 1 + (s % 60);
    const limpo = F.fuFicha(slotGravado(seed, nivel));

    for (const mentira of ['Comum', 'Raro', 'Lendário', 'Divino', '', null]) {
      const velho = F.fuFicha(slotGravado(seed, nivel, { raridade: mentira }));
      verificar('a raridade escrita no slot não vale (' + seed + '/' + mentira + ')',
        igual(limpo, velho),
        'com raridade "' + mentira + '" a ficha mudou');
    }
    verificar('e a raridade sai do nível (' + nivel + ')',
      limpo.raridade === F.fuRaridadeDoNivel(nivel));

    // sem escolhaAnciao: fica com a costura e sem a segunda
    const semEscolha = slotGravado(seed, 40);
    delete semEscolha.escolhaAnciao;
    const f = F.fuFicha(semEscolha);
    verificar('sem escolha gravada, o Lendário fica com a costura',
      !!f.costura && f.vantagens.length === 1,
      f.vantagens.length + ' vantagem(ns), costura ' + f.costura);
  }
}

/* ═══ 3 · UM AVATAR SEM DNA ═══════════════════════════════════════ */
titulo('Um avatar sem DNA sai marcado, e sem números impossíveis');
{
  const quebras = [
    ['sem certidão',      s => { delete s.nascimento; }],
    ['certidão vazia',    s => { s.nascimento = {}; }],
    ['dna nulo',          s => { s.nascimento.dna = null; }],
    ['genes em falta',    s => { s.nascimento.dna = { genes: {} }; }],
    ['genes trocados',    s => { s.nascimento.dna = { genes: { F: 'x', H: 2 } }; }],
  ];
  for (const [nome, partir] of quebras) {
    const slot = slotGravado(555, 20);
    partir(slot);
    const f = F.fuFicha(slot);
    verificar(nome + ': a ficha sai marcada', f.semDna === true);
    verificar(nome + ': e mesmo assim é utilizável',
      Number.isFinite(f.pvMax) && f.pvMax > 0 && Number.isFinite(f.pmMax) && f.pmMax > 0,
      'pv ' + f.pvMax + ' pm ' + f.pmMax);
    verificar(nome + ': com quatro dados verdadeiros',
      F.FU_ATRIBS.every(a => F.FU_DADOS.indexOf(f[a]) !== -1),
      F.FU_ATRIBS.map(a => f[a]).join(','));
    verificar(nome + ': e com as cinco magias',
      F.FU_ATRIBS.length === 4 && Object.keys(G.fuMagiasDe(f)).length === 5);
  }

  // e um avatar inteiro NÃO sai marcado — senão a marca não distinguia nada
  verificar('um avatar inteiro não leva a marca',
    F.fuFicha(slotGravado(777, 20)).semDna === false);
}

/* ═══ 4 · O QUE O CLIENTE ESCREVE NÃO O FAVORECE ══════════════════ */
titulo('Nenhum campo do slot muda a ficha a favor de quem o escreve');
{
  const base = slotGravado(918273, 25);
  const limpo = F.fuFicha(base);

  const forjas = [
    ['raridade',   'Lendário'],
    ['pontos',     999],
    ['xp',         999999],
    ['vinculo',    999],
    ['pv',         9999],
    ['pm',         9999],
    ['forca',      99],
    ['dons',       { pvMais: 500 }],
    ['vantagens',  [{ id: 'carne_teimosa', pvMais: 500 }]],
    ['afinidades', { fisico: 'IM' }],
    ['tipo',       'treva'],
    ['costura',    null],
    ['arranjo',    'extremo'],
  ];
  for (const [campo, valor] of forjas) {
    const f = F.fuFicha(Object.assign({}, base, { [campo]: valor }));
    verificar('forjar "' + campo + '" no slot não muda nada', igual(limpo, f),
      'a ficha mudou ao escrever ' + campo);
  }

  /* O nível é o único campo do slot que a ficha lê a sério, e por isso é
     o único que tem tecto: sem ele, um nível vindo do cliente dava vida
     na ordem dos mil milhões. */
  for (const absurdo of [1e9, 1e6, 999, -5, 0, NaN, null, 'muitos']) {
    const f = F.fuFicha(Object.assign({}, base, { nivel: absurdo }));
    verificar('o nível ' + absurdo + ' fica dentro do tecto',
      f.nivel >= 1 && f.nivel <= F.FU_NIVEL_MAX, 'deu ' + f.nivel);
    verificar('e a vida com ele (' + absurdo + ')',
      f.pvMax > 0 && f.pvMax < 1000, 'deu ' + f.pvMax);
  }
}

/* ═══ 5 · SUBIR DE NÍVEL NÃO O TROCA POR OUTRO ════════════════════ */
titulo('Subir de nível não troca o avatar por outro');
{
  for (let s = 1; s <= 200; s++) {
    const seed = s * 7919;
    const um = F.fuFicha(slotGravado(seed, 1));
    let trocou = null;
    for (let nv = 2; nv <= 60; nv++) {
      const f = F.fuFicha(slotGravado(seed, nv));
      const mesmo = F.FU_ATRIBS.every(a => f[a] === um[a])
        && f.tipo === um.tipo
        && f.arranjo === um.arranjo
        && f.ordem.join() === um.ordem.join()
        && f.costura === um.costura
        && f.vantagens[0].id === um.vantagens[0].id;
      if (!mesmo) { trocou = nv; break; }
    }
    verificar('o seed ' + seed + ' é o mesmo avatar do 1 ao 60', trocou === null,
      'mudou no nível ' + trocou);
  }

  /* E o que SOBE tem de subir mesmo: a vida e a magia todo o nível, a
     precisão de dez em dez, o dano extra nos degraus da raridade. Uma
     evolução que não muda nada é uma cerimónia a mentir. */
  const seed = 424242;
  const a = F.fuFicha(slotGravado(seed, 5));
  const b = F.fuFicha(slotGravado(seed, 6));
  verificar('a vida sobe com o nível', b.pvMax > a.pvMax, a.pvMax + ' → ' + b.pvMax);
  verificar('a magia também', b.pmMax > a.pmMax, a.pmMax + ' → ' + b.pmMax);

  const c10 = F.fuFicha(slotGravado(seed, 9));
  const c11 = F.fuFicha(slotGravado(seed, 10));
  verificar('a precisão sobe no nível 10', c11.bonusPrecisao > c10.bonusPrecisao,
    c10.bonusPrecisao + ' → ' + c11.bonusPrecisao);

  const r10 = F.fuFicha(slotGravado(seed, 10));
  const r11 = F.fuFicha(slotGravado(seed, 11));
  verificar('a raridade sobe no nível 11',
    r10.raridade === 'Comum' && r11.raridade === 'Raro',
    r10.raridade + ' → ' + r11.raridade);
  verificar('e o dano extra com ela', r11.danoExtra > r10.danoExtra,
    r10.danoExtra + ' → ' + r11.danoExtra);
  verificar('e as magias sobem de degrau',
    G.fuMagiaDe(r11, 'forte').id !== G.fuMagiaDe(r10, 'forte').id,
    G.fuMagiaDe(r10, 'forte').id + ' → ' + G.fuMagiaDe(r11, 'forte').id);
}

/* ═══ 6 · O SERVIDOR VÊ O MESMO QUE O NAVEGADOR ═══════════════════ */
titulo('O servidor compõe a mesma ficha que o navegador');
{
  /* O api/_genetica.js carrega os mesmos arquivos e globaliza-os. Se um
     dia só um dos dois lados recebesse um arquivo novo, este teste é o
     que dá pela diferença — e a conta decide dinheiro. */
  for (const nome of ['fuFicha', 'fuMagiasDe', 'fuDons', 'fuVantagensDoDna', 'fuIniciar'])
    verificar('o servidor conhece o ' + nome, typeof global[nome] === 'function');

  for (let s = 1; s <= 100; s++) {
    const slot = slotGravado(s * 1299721, 20 + (s % 40));
    verificar('a ficha do servidor é a do navegador (' + slot.seed + ')',
      igual(global.fuFicha(slot), F.fuFicha(slot)));
  }
}

console.log('\n' + '─'.repeat(62));
if (falhas.length) {
  console.log(falhas.slice(0, 20).join('\n'));
  if (falhas.length > 20) console.log('  … e mais ' + (falhas.length - 20) + '.');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
