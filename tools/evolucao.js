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

   ── E O QUE SE GANHA PELO CAMINHO ──

   A última secção guarda as regras da progressão que não são a escada:
   a tabela de XP por fase, o XP de cuidar (e o do bebê), o fim do bônus
   de XP por raridade, o espaço de item do nível 40 e o título do 50.

   node tools/evolucao.js
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);

/* As regras da fase leem-se do js/state.js, linha a linha, num sítio só
   (tools/fase.js). O arquivo inteiro não corre fora do browser — mexe na
   tela e em vinte globais — mas as regras da fase são quatro linhas, e
   uma segunda cópia delas aqui divergiria da do jogo em silêncio. */
/* O resto vem do carregador do SERVIDOR, que é o mesmo que o navegador
   usa. Auditar pelo carregador de produção em vez de por um montado à
   mão tem uma vantagem que não é pequena: se um dia um arquivo deixar de
   ser carregado lá, esta ferramenta dá por isso. */
const GEN = require('../api/_genetica.js');
const M = global;

/* As linhas da fase do js/state.js, corridas com o fuFaseDoNivel
   verdadeiro na mão. É assim que se confere que a porta do state.js
   chama mesmo a escada da ficha, em vez de ter uma cópia dos números. */
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);
const FASE = new Function('fuFaseDoNivel', LINHAS_DA_FASE + NL
  + 'return { faseFromNivel, FASE_MIN_SECS, faseFromAge };')(M.fuFaseDoNivel);

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

// ═══════════════════════════════════════════════════════════════════
titulo('O QUE SE GANHA PELO CAMINHO');

{
  const fs = require('fs');
  const { trechosDe } = require('./fase.js');

  /* O código do jogo, tal como está, corrido com o que ele precisa à
     volta: a fase (para dizer se é bebê), o sexo (para o título), o t()
     (devolve a chave, para se ver qual escolheu) e o avatar em campo
     (que o rarityBonus lê quando não lhe dão ninguém). */
  const codigo = trechosDe(RAIZ, 'js/state.js', [
    'xpParaNivel', 'MAX_EQUIPPED', 'NIVEL_ITEM_EXTRA', 'maxEquipadosDe',
    'rarityBonus', 'XP_CUIDADO', 'XP_CUIDADO_BEBE', 'XP_CUIDADO_PRECISA', 'xpDeCuidado',
  ]) + NL + trechosDe(RAIZ, 'js/identidade.js', ['NIVEL_TITULO', 'tituloDe']);
  const montar = (faseAgora, raridadeEmCampo) => new Function(
    'getFase', 'sexoDe', 't', 'avatar',
    codigo + NL + 'return { xpParaNivel, maxEquipadosDe, rarityBonus, xpDeCuidado, tituloDe, '
         + 'XP_CUIDADO, XP_CUIDADO_BEBE, XP_CUIDADO_PRECISA, NIVEL_ITEM_EXTRA, NIVEL_TITULO };'
  )(() => faseAgora, M.sexoDe, chave => chave, { raridade: raridadeEmCampo || 'Comum' });
  const P = montar(2);

  /* ── A TABELA DE XP ──
     Pelas fases: 250 no bebê, 700 no jovem, de 1.200 a 3.000 no adulto,
     3.000 fixo no ancião. E sem degrau entre o adulto e o ancião. */
  const esperado = n => n < 5 ? 250 : n < 11 ? 700 : n < 27 ? 1200 + (n - 11) * 120 : 3000;
  let foraTabela = 0;
  for (let n = 1; n < 60; n++) if (P.xpParaNivel(n) !== esperado(n)) foraTabela++;
  ok(foraTabela === 0, 'a tabela de XP segue as fases, nível a nível', foraTabela + ' fora');

  const total = ate => { let t = 0; for (let n = 1; n < ate; n++) t += P.xpParaNivel(n); return t; };
  ok(total(5) === 1000 && total(11) === 5200 && total(27) === 38800 && total(60) === 137800,
     'e os totais são 1.000, 5.200, 38.800 e 137.800',
     [5, 11, 27, 60].map(n => 'até ' + n + ' ' + total(n)).join(' · '));

  let desceu = 0;
  for (let n = 2; n < 60; n++) if (P.xpParaNivel(n) < P.xpParaNivel(n - 1)) desceu++;
  ok(desceu === 0 && P.xpParaNivel(26) === P.xpParaNivel(27),
     'nunca fica mais barato, e o 26 já custa o que o ancião custa',
     'nv26 ' + P.xpParaNivel(26) + ' · nv27 ' + P.xpParaNivel(27));

  /* ── O BÔNUS DE XP POR RARIDADE SAIU ── */
  const xps = ['Comum', 'Raro', 'Lendário'].map(r => P.rarityBonus({ raridade: r }).xp);
  ok(xps.every(x => x === 1), 'o XP é igual nas três raridades', xps.join(' · '));

  /* ── O XP DE CUIDAR ──
     6, 8, 10 e 12 fora da fase bebê; cinco vezes isso nela. E a raridade
     não mexe, tal como no resto do XP. */
  const ACOES = ['nutrir', 'banho', 'medicar', 'acordar'];
  const adulto = montar(2), bebe = montar(0), lendario = montar(2, 'Lendário');
  const valores = ACOES.map(a => adulto.xpDeCuidado(a));
  ok(valores.join(',') === '6,8,10,12', 'cuidar dá 6, 8, 10 e 12 de XP', valores.join(' · '));
  ok(ACOES.every(a => bebe.xpDeCuidado(a) === 5 * adulto.xpDeCuidado(a)),
     'e o bebê ganha cinco vezes isso',
     ACOES.map(a => a + ' ' + bebe.xpDeCuidado(a)).join(' · '));
  ok(ACOES.every(a => lendario.xpDeCuidado(a) === adulto.xpDeCuidado(a)),
     'e ser Lendário não muda nada');
  ok(P.XP_CUIDADO_PRECISA === 70, 'só conta o cuidado de que ele precisava (70 ou menos)',
     'limiar ' + P.XP_CUIDADO_PRECISA);

  /* ── O ESPAÇO DE ITEM DO 40 ── */
  let foraItem = 0;
  for (let n = 1; n <= 60; n++) if (P.maxEquipadosDe(n) !== (n >= 40 ? 4 : 3)) foraItem++;
  ok(foraItem === 0 && P.NIVEL_ITEM_EXTRA === 40,
     'três itens equipados até o 39, quatro do 40 em diante', foraItem + ' fora');

  /* ── O TÍTULO DO 50 ── */
  const av = (nivel, sexo) => {
    const a = slot(nivel);
    a.nascimento = Object.assign({}, a.nascimento, { sexo });
    return a;
  };
  ok(P.tituloDe(av(49, 'F')) === '' && P.tituloDe(av(49, 'M')) === '',
     'antes do 50 não há título');
  ok(P.tituloDe(av(50, 'F')) === 'id.titulo.f' && P.tituloDe(av(50, 'M')) === 'id.titulo.m',
     'no 50 vem o título, com o gênero do avatar',
     P.tituloDe(av(50, 'F')) + ' · ' + P.tituloDe(av(50, 'M')));
  ok(P.tituloDe(av(3, 'F'), 50) === 'id.titulo.f' && P.tituloDe(av(60, 'F'), 10) === '',
     'e o nível de agora manda sobre o do slot (o avatar aberto)');

  /* ── E OS TEXTOS EXISTEM NAS DUAS LÍNGUAS ──
     Uma chave que falta mostra-se crua na tela: "id.titulo.f" no lugar do
     título, e ninguém dá por isso até abrir o jogo no nível 50. */
  const conta = (arquivo, chave) =>
    (fs.readFileSync(require('path').join(RAIZ, arquivo), 'utf8')
      .match(new RegExp("'" + chave.replace(/\./g, '\\.') + "'\\s*:", 'g')) || []).length;
  const chaves = [['js/i18n.js', 'id.titulo.m'], ['js/i18n.js', 'id.titulo.f'],
                  ['js/i18n-gametick.js', 'gt.marco.item'], ['js/i18n-gametick.js', 'gt.marco.titulo']];
  const faltam = chaves.filter(([a, c]) => conta(a, c) !== 2).map(([, c]) => c);
  ok(faltam.length === 0, 'os textos dos marcos estão em português e em inglês',
     faltam.length ? 'faltam: ' + faltam.join(', ') : chaves.length + ' chaves × 2 línguas');
}

console.log('\n' + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
