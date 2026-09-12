#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A ESCADA DA VIDA

   Um avatar atravessa quatro fases e três raridades, e as duas escadas
   são a MESMA escada com um degrau a mais no fundo:

       nv  1– 4   BEBÊ      Comum
       nv  5–10   JOVEM     Comum
       nv 11–26   ADULTO    Raro
       nv 27+     ANCIÃO    Lendário

   Este arquivo pergunta se ela é uma só, em todo o lado.

   ── O QUE SAIU DAQUI COM O 3D&T ──

   Eram nove secções e cinco perderam o assunto. Tinham todas a mesma
   raiz: o orçamento de PONTOS de ficha, que subia de dois em dois níveis
   e comprava as quatro características.

   Não há pontos. Os quatro dados saem do arranjo que o DNA escolhe e não
   se compram, e o que cresce com o nível cresce sozinho.

   Onde foram parar as perguntas que valiam:

     o repertório cresce          → tools/auditoria-lugares.js
     subir de nível só soma       → tools/auditoria-avatares.js, §5
     a virtude não troca          → tools/auditoria-avatares.js, §5
     nenhum ponto oferecido       → sem assunto: não há pontos
     a raridade não paga pontos   → sem assunto, pela mesma razão
     o corpo cresce, não troca    → tools/linhagem.js, que já o desenha

   node tools/evolucao.js
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);

/* As regras da fase leem-se do js/state.js, linha a linha, num sítio só
   (tools/fase.js). O arquivo inteiro não corre fora do browser — mexe na
   tela e em vinte globais — mas as regras da fase são quatro linhas, e
   uma segunda cópia delas aqui divergiria da do jogo em silêncio. */
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);
const FASE = new Function(LINHAS_DA_FASE + NL
  + 'return { FASE_DEGRAUS, faseFromNivel, FASE_MIN_SECS, faseFromAge };')();

/* E o resto vem do carregador do SERVIDOR, que é o mesmo que o
   navegador usa. Auditar pelo carregador de produção em vez de por um
   montado à mão tem uma vantagem que não é pequena: se um dia um arquivo
   deixar de ser carregado lá, esta ferramenta dá por isso. */
const GEN = require('../api/_genetica.js');
const M = global;

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK   ', titulo.padEnd(54), '· ' + (detalhe || '')); }
  else      { falhou++; console.log('  FALHOU', titulo.padEnd(53), '· ' + (detalhe || '')); }
}
function titulo(txt) { console.log('\n─── ' + txt + ' ' + '─'.repeat(Math.max(0, 54 - txt.length))); }

const FASES = ['BEBÊ', 'JOVEM', 'ADULTO', 'ANCIÃO'];

function slot(nivel, escolha) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  const seed = 7 + nivel * 104729;
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = M.gerarDna('Comum', seed);
  const s = { id: 'a', nome: 'T', seed, nivel, nascimento: cert.nascimento };
  if (escolha) s.escolhaAnciao = escolha;
  return s;
}

// ═══════════════════════════════════════════════════════════════════
titulo('A ESCADA');

{
  const esperado = nv => nv < 5 ? 0 : nv < 11 ? 1 : nv < 27 ? 2 : 3;
  let fora = 0, primeiro = {};
  for (let nv = 1; nv <= 60; nv++) {
    const f = FASE.faseFromNivel(nv);
    if (f !== esperado(nv)) fora++;
    if (primeiro[f] == null) primeiro[f] = nv;
  }
  ok(fora === 0, 'a fase sai do nível, nos sessenta', fora + ' fora');
  ok(JSON.stringify(primeiro) === '{"0":1,"1":5,"2":11,"3":27}',
     'e os degraus são 5, 11 e 27',
     FASES.map((n, i) => n + ' nv' + primeiro[i]).join(' · '));

  // nunca desce
  let desceu = 0;
  for (let nv = 2; nv <= 60; nv++)
    if (FASE.faseFromNivel(nv) < FASE.faseFromNivel(nv - 1)) desceu++;
  ok(desceu === 0, 'e nunca desce', desceu + ' regressões');

  /* ── A ESCADA NÃO PODE TER DOIS DONOS ──

     A fase vive no js/state.js e a raridade no js/ficha-fu.js, e as duas
     têm de dizer a mesma coisa nos mesmos níveis. Já disseram coisas
     diferentes neste jogo: um avatar de nível 12 era ADULTO num sítio e
     ANCIÃO noutro, com outras magias e outro par de virtude e defeito. */
  let discorda = 0;
  const RAR_DA_FASE = ['Comum', 'Comum', 'Raro', 'Lendário'];
  for (let nv = 1; nv <= 60; nv++)
    if (M.fuRaridadeDoNivel(nv) !== RAR_DA_FASE[FASE.faseFromNivel(nv)]) discorda++;
  ok(discorda === 0, 'a fase e a raridade dizem o mesmo, nível a nível',
     discorda + ' discordâncias em 60');

  // e o servidor tem a mesma escada que o navegador
  let servidor = 0;
  for (let nv = 1; nv <= 60; nv++)
    if (M.faseFromNivel(nv) !== FASE.faseFromNivel(nv)) servidor++;
  ok(servidor === 0, 'e o servidor tem a mesma que o js/state.js',
     servidor + ' discordâncias em 60');

  console.log('       ' + FASES.map((n, i) =>
    n + ' ' + primeiro[i] + '–' + (i < 3 ? primeiro[i + 1] - 1 : 60)).join('  ·  '));
}

// ═══════════════════════════════════════════════════════════════════
titulo('O BEBÊ');

{
  ok(FASE.faseFromNivel(1) === 0 && FASE.faseFromNivel(4) === 0
     && FASE.faseFromNivel(5) === 1,
     'é bebé até ao quatro, e jovem no cinco');

  for (const nv of [1, 2, 3, 4])
    ok(M.ehBebe({ nivel: nv }) === true, 'o nível ' + nv + ' é bebé');
  for (const nv of [5, 11, 27, 60])
    ok(M.ehBebe({ nivel: nv }) === false, 'o nível ' + nv + ' já não é');

  /* Um bebé TEM ficha, e tem-na inteira: no motor novo os quatro dados
     saem do DNA e não se compram, portanto não há "ficha por fazer".
     O que ele não tem é nível para aguentar uma luta — e essa guarda
     vive no js/pve-fu.js, não aqui. */
  const bebe = M.fuFicha(slot(1));
  ok(M.FU_ATRIBS.every(a => M.FU_DADOS.indexOf(bebe[a]) !== -1),
     'e mesmo assim tem os quatro dados',
     M.FU_ATRIBS.map(a => a + ' d' + bebe[a]).join(' '));
  ok(bebe.pvMax > 0 && bebe.pmMax > 0 && bebe.crise > 0,
     'e vida, magia e crise a sério',
     bebe.pvMax + ' PV · ' + bebe.pmMax + ' PM · crise ' + bebe.crise);
  /* Três lugares e não cinco: o feitio decide quais. Um bebê já tem os
     três dele, todos no primeiro degrau — o que cresce com a raridade é a
     força de cada um, não quantos são. */
  const magiasDoBebe = M.fuMagiasDe(bebe);
  ok(Object.keys(magiasDoBebe).length === 3,
     'e três lugares de magia, todos no primeiro degrau',
     Object.values(magiasDoBebe).map(m => m.id).join(' '));
  ok(Object.keys(magiasDoBebe).join(',') === M.FU_LUGARES_DO_FEITIO[bebe.feitio].join(','),
     'e são os do feitio dele (' + bebe.feitio + ')',
     Object.keys(magiasDoBebe).join(','));
}

// ═══════════════════════════════════════════════════════════════════
titulo('A ESCOLHA DO ANCIÃO');

{
  /* A escolha custa nos dois lados, e essa é a afirmação que mais
     depressa se perde: basta alguém achar que "fechar a costura" devia
     ser de graça e o jogo deixa de ter uma decisão para ter um prémio. */
  ok(M.podeEscolherAnciao({ nivel: 26 }) === false, 'aos 26 ainda não se escolhe');
  ok(M.podeEscolherAnciao({ nivel: 27 }) === true,  'aos 27 escolhe-se');
  ok(M.podeEscolherAnciao({ nivel: 40, escolhaAnciao: 'vantagem' }) === false,
     'e escolhe-se uma vez só');
  ok(M.podeEscolherAnciao({ nivel: 40, dead: true }) === false,
     'um avatar morto não escolhe');
  ok(M.FICHA_ESCOLHAS.length === 2
     && M.FICHA_ESCOLHAS.indexOf('vantagem') !== -1
     && M.FICHA_ESCOLHAS.indexOf('semDefeito') !== -1,
     'e as opções são duas', M.FICHA_ESCOLHAS.join(' / '));

  let semSegunda = 0, semCostura = 0, trocouPrimeira = 0, naoCumpriu = 0;
  for (let s = 1; s <= 200; s++) {
    const base = M.fuFicha(slot(30));
    const comV = M.fuFicha(Object.assign(slot(30), { escolhaAnciao: 'vantagem' }));
    const semD = M.fuFicha(Object.assign(slot(30), { escolhaAnciao: 'semDefeito' }));

    if (!base.segundaPossivel) semSegunda++;
    if (!base.costura) semCostura++;
    if (comV.vantagens[0].id !== base.vantagens[0].id
        || semD.vantagens[0].id !== base.vantagens[0].id) trocouPrimeira++;
    // a promessa de cada opção
    if (!(comV.vantagens.length === 2 && !!comV.costura
          && comV.vantagens[1].id === base.segundaPossivel.id)) naoCumpriu++;
    if (!(semD.vantagens.length === 1 && semD.costura === null)) naoCumpriu++;
  }
  ok(semSegunda === 0, 'há sempre uma segunda virtude à espera');
  ok(semCostura === 0, 'e uma costura para pagar por ela');
  ok(trocouPrimeira === 0, 'a escolha não troca a primeira virtude');
  ok(naoCumpriu === 0, 'e cada opção faz exactamente o que promete',
     '200 avatares · ' + naoCumpriu + ' quebras');

  /* Um avatar que ainda não é Lendário não ganha nada por escrever a
     escolha no slot — é a mesma guarda que o js/vantagens-fu.js tem, e
     conferida do lado de fora. */
  const cedo = M.fuFicha(Object.assign(slot(20), { escolhaAnciao: 'vantagem' }));
  ok(cedo.vantagens.length === 1 && !!cedo.costura,
     'e antes dos 27 escrever a escolha não vale nada',
     cedo.vantagens.length + ' vantagem(ns), costura ' + cedo.costura);
}

console.log('\n' + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
