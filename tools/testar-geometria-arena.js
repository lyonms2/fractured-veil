#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A GEOMETRIA DO CORPO NA ARENA, MEDIDA NUM NAVEGADOR DE VERDADE

   ── PORQUE ESTE TESTE EXISTE ──

   Toda a série 3J foi atrás de uma coisa só: separar o que o avatar É
   (anatomia — DNA, seed, fase) do que ele TEM (presença — a raridade).
   E o que provou que os dois estavam misturados não foi uma leitura do
   código: foi uma MEDIDA. A raridade mexia na contagem de partículas,
   as partículas estavam dentro do <svg>, o getBBox() conta tudo o que
   está dentro do <svg>, e o _afAssentar usa esse getBBox() para
   decidir onde ficam os pés e o nome. Um Lendário tinha os pés num
   lugar e um Comum em outro.

   Nada disso aparece numa asserção de texto. O SVG de um Comum e o de
   um Lendário são ambos SVGs válidos, com os mesmos elementos de
   corpo, e a diferença só existe depois de o navegador resolver o CSS,
   compor as camadas e calcular a caixa da tinta. Por isso este teste
   abre um Chrome.

   ── O QUE A AUDITORIA 3J.17C-R ENCONTROU, E O QUE MUDOU ──

   A primeira versão deste arquivo dava 23 asserções verdes e, ainda
   assim, SEIS de dez mutações escapavam. Três delas anulavam a
   invariante principal — comparar o Comum consigo mesmo, nunca
   registrar a diferença, deixar de comparar as derivadas — e a suíte
   continuava a dizer 23/0. O motivo era de arquitetura: a verificação
   negativa tinha o seu PRÓPRIO laço de comparação, paralelo ao da
   seção normal. Ela provava que a MEDIÇÃO era sensível, nunca que o
   COMPARADOR estava vivo.

   Esta versão tem um comparador só para cada invariante, e ele é
   chamado duas vezes: na matriz limpa, onde tem de aprovar, e na
   matriz contaminada, onde tem de reprovar. Um comparador cego falha
   a segunda metade. Além disso, cada comparador tem um autoteste com
   matrizes sintéticas que prova que ele sabe reprovar — por violação,
   por dado ausente, e por raridade em falta.

   As outras três correções:

     · as animações são congeladas antes de medir (o SMIL com
       pauseAnimations() e setCurrentTime(0), o CSS com uma regra do
       harness), porque a auditoria mediu a MESMA caixa a variar até
       4,16 unidades ao longo de 1,5 s — contra uma tolerância de zero;
     · a cascata é a do jogo: os 19 CSS lidos do próprio index.html, na
       ordem dele. Com um só CSS, 219 de 768 medidas saíam diferentes,
       e o @keyframes av-piscar que o combate-arena.css usa nem
       existia (vive no screen.css);
     · falha de infraestrutura sai com 3, não com 1, e todo processo e
       perfil criado é destruído em qualquer caminho.

   ── O QUE ELE NÃO É ──

   Não é um teste de texto SVG disfarçado de teste geométrico. Todas as
   medidas saem de getBBox(), getScreenCTM(), getBoundingClientRect() e
   getComputedStyle() chamados dentro de um Chrome a correr, sobre o
   CSS de produção e sobre as funções de produção _afLutador, _afCorpo
   e _afAssentar — não sobre cópias delas.

   ── SEM DEPENDÊNCIAS NOVAS ──

   O projeto tem ethers e firebase-admin, e mais nada que sirva: não há
   Playwright, Puppeteer, jsdom nem happy-dom. Nenhum foi instalado, e
   nenhum é preciso: o Chrome já está na máquina (o Edge como
   reserva), o Node 24 traz WebSocket nativo — logo fala-se o Chrome
   DevTools Protocol sem cliente nenhum — e o http do Node serve o
   projeto para o CSS e os js/ virem pelos caminhos verdadeiros.

   jsdom e happy-dom não serviriam mesmo que estivessem lá: nenhum
   implementa getBBox() com geometria a sério, que é a medida que falta.

   ── AS TOLERÂNCIAS ──

     invariância da raridade    0        é a MESMA aritmética sobre os
                                        MESMOS números; com as
                                        animações congeladas, ou dá
                                        igual ao bit ou alguém voltou a
                                        meter a raridade na anatomia
     assentar os pés            1,0 px   o _afAssentar arredonda o top
                                        ao pixel (Math.round), e a
                                        matriz da tela traz fração
     props derivadas do CSS     0        o teste repete o arredondamento
                                        do próprio _afAssentar
     crescimento por fase       1,0 un.  a comparação é "cresceu", não
                                        "cresceu exatamente tanto"

   ── OS ACHADOS DA 3J.17C, QUE CONTINUAM DE PÉ ──

   Nada de produção foi corrigido: estas etapas são o teste. Ficam
   medidos e prendidos por asserções que falham no dia em que alguém os
   arranjar — de propósito, para a correção não entrar sem que o teste
   venha com ela.

     1  Das partes do desenho, a maioria mede exatamente igual no
        adulto e no ancião. Asa, tentáculo, olho e boca não têm fator
        nenhum no js/data.js; a cauda tem um (tE) que vale 1 nas quatro
        linhas do FASE_GEO; o braço tem mE apenas no x, logo é mais
        comprido de lado e não para baixo.

     2  E o corpo cresce uns 3%, não os 10% que o `corpo: 1.10` do
        FASE_GEO dá a entender: o cP expande em volta de 100, portanto
        o quanto cresce depende de quão longe de 100 estão os extremos.
        O cH do chifre multiplica o valor todo e faz 1,10 redondo.

   Os números exatos saem no relatório de cada corrida, e dependem da
   cascata: não se devem citar de cabeça.

   Correr:  node tools/testar-geometria-arena.js
            node tools/testar-geometria-arena.js --ver          (com janela)
            node tools/testar-geometria-arena.js --so-autoteste (sem navegador)

   Saídas:  0  correu e passou
            1  correu e reprovou numa ou mais asserções
            3  não correu: falta infraestrutura (navegador, CDP, página)
   ═══════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);
const VER = process.argv.indexOf('--ver') !== -1;
const SO_AUTOTESTE = process.argv.indexOf('--so-autoteste') !== -1;

const SAIDA = { OK: 0, REPROVADO: 1, INFRA: 3 };

/* Quando a corrida é cortada de propósito — o autoteste reprovou, ou
   pediu-se só ele — as seções seguintes não correram por razão
   legítima, e exigir o manifesto completo só acrescentaria ruído a uma
   falha já reportada. */
let cortouCedo = null;

/* Falha de infraestrutura não é reprovação geométrica. Tem classe
   própria para o fim do arquivo poder sair com 3 e não com 1. */
class ErroDeInfra extends Error {
  constructor(m) { super(m); this.name = 'ErroDeInfra'; }
}
const infra = (m) => { throw new ErroDeInfra(m); };

/* ═════════════════════ O PLACAR ═════════════════════ */

let passou = 0, falhou = 0;
const COL = 56;

/* ── O MANIFESTO: QUANTAS ASSERÇÕES CADA SEÇÃO TEM ──

   A auditoria 3J.17C-R2 apagou a seção negativa inteira e o teste
   terminou com 49/0 e saída 0. A queda de 56 para 49 aparecia na tela,
   mas nada FALHAVA: a suíte não sabia quantas asserções devia ter
   corrido.

   Agora cada seção declara o seu número aqui, e no fim compara-se uma a
   uma. Não é um total global — um total global deixaria uma seção
   ausente ser compensada por asserções a mais em outra, que é
   exatamente o caso que se quer apanhar.

   COMO SE MEXE NESTES NÚMEROS: ao acrescentar ou tirar uma asserção, o
   teste falha e diz a seção, o esperado e o observado. Muda-se o número
   aqui à mão, de propósito — é o aviso de que a cobertura mudou.

   O `fora-de-secao` tem de ser 0: uma asserção que corra sem seção
   aberta não seria contada por ninguém. */
const MANIFESTO = {
  'autoteste':  37,   // 25 dos comparadores + 6 dos julgar* + 6 do efeito no placar
  'cascata':     7,   // CSS no disco, CSS no navegador, av-piscar, 404, SMIL, CSS, estabilidade
  'svg':         1,   // o primeiro <svg> do .cb-corpo é o do corpo
  'invariantes': 5,   // caixa, derivadas, pés, presença, partes
  'presenca':    2,   // as partículas crescem; estão no svg medido
  'fase':        4,   // bebê=jovem, jovem→adulto, não encolhe, adulto→ancião
  'fator':       3,   // chifre 1,100; corpo ~3%; partes sem fator
  'amostra':     2,   // os traços variam; cauda/asas/tentáculo nos dois estados
  'negativa':    7,   // 4 que acusam, 1 dos pés, 2 do estado restaurado
  'fora-de-secao': 0,
};
/* No modo --so-autoteste só a primeira corre, e é só ela que se exige. */
const MANIFESTO_SO_AUTOTESTE = { 'autoteste': MANIFESTO.autoteste, 'fora-de-secao': 0 };

const CONTAS = {};
let secaoAtual = 'fora-de-secao';
let MUDO = false;   // a sonda dos tradutores conta sem imprimir

function ok(cond, titulo, detalhe) {
  if (cond) passou++; else falhou++;
  CONTAS[secaoAtual] = (CONTAS[secaoAtual] || 0) + 1;
  if (MUDO) return;
  console.log((cond ? '  OK     ' : '  FALHOU ') + titulo.padEnd(COL) + ' · ' + (detalhe || ''));
}

/* Abre uma seção do manifesto. O `chave` é o nome no MANIFESTO; o
   `titulo` é o que se lê na tela. */
function secao(chave, titulo) {
  secaoAtual = chave;
  if (CONTAS[chave] === undefined) CONTAS[chave] = 0;
  console.log(NL + '─── ' + titulo + ' ' + '─'.repeat(Math.max(0, COL - titulo.length)));
}
/* Um cabeçalho sem asserções (o relatório final). Fecha a seção
   anterior, para nada ser contado no lugar errado. */
function tit(x) {
  secaoAtual = 'fora-de-secao';
  console.log(NL + '─── ' + x + ' ' + '─'.repeat(Math.max(0, COL - x.length)));
}

/* Confere o manifesto. Não usa ok(), para não se contar a si mesmo nem
   mexer nos números que está a conferir. Devolve quantas seções
   divergiram. */
function conferirManifesto(esperado) {
  const chaves = Object.keys(esperado);
  const maus = [];
  console.log(NL + '─── O MANIFESTO DE ASSERÇÕES '
    + '─'.repeat(Math.max(0, COL - 24)));
  for (const k of chaves) {
    const obs = CONTAS[k] === undefined ? 0 : CONTAS[k];
    const esp = esperado[k];
    const bate = obs === esp;
    if (!bate) maus.push(k + ': esperadas ' + esp + ', correram ' + obs
      + (CONTAS[k] === undefined ? ' (a seção NÃO CORREU)' : ''));
    /* "nao correu" so se diz de uma secao que devia ter assercoes; o
       balde fora-de-secao espera-se vazio e nao e uma secao. */
    const nota = (CONTAS[k] === undefined && esp > 0) ? '   ← A SEÇÃO NÃO CORREU'
               : bate ? '' : '   ← divergiu';
    console.log('  ' + (bate ? 'ok    ' : 'ERRADO') + '  ' + k.padEnd(16)
      + String(esp).padStart(4) + ' esperadas · ' + String(obs).padStart(4) + ' correram' + nota);
  }
  /* uma seção que correu e NÃO está no manifesto também é divergência */
  for (const k of Object.keys(CONTAS)) {
    if (chaves.indexOf(k) === -1) {
      maus.push(k + ': correu ' + CONTAS[k] + ' asserções e não está no manifesto');
      console.log('  ERRADO  ' + k.padEnd(16) + '   — fora do manifesto, com '
        + CONTAS[k] + ' asserções');
    }
  }
  if (maus.length) {
    console.log('');
    for (const m of maus) console.log('  ' + m);
    console.log('');
    console.log('  O manifesto existe para que apagar uma seção não dê verde.');
    console.log('  Se a mudança foi deliberada, acerte o MANIFESTO à mão.');
  }
  return maus.length;
}

/* ═══════════════════════════════════════════════════════════════════
   OS COMPARADORES

   São funções PURAS: recebem medidas já colhidas e devolvem um
   veredito. Não tocam no navegador, não imprimem nada, não guardam
   estado. É por isso que podem ser chamadas duas vezes — uma na matriz
   limpa, outra na contaminada — e é isso que faz a verificação negativa
   validar o comparador e não uma cópia dele.

   O contrato é um objeto:

     estado       'aprovado' | 'violado' | 'insuficiente'
     comparacoes  quantas comparações foram FEITAS mesmo
     violacoes    [] de frases, para diagnóstico
     faltam       [] de frases: o que a entrada não trazia
     pior         a maior diferença vista, quando faz sentido

   'insuficiente' NÃO é aprovação. Uma matriz a que falte uma raridade,
   uma fase ou um campo reprova com esse estado — porque um comparador
   que não teve o que comparar não pode dizer que está tudo bem.
   ═══════════════════════════════════════════════════════════════════ */

const CAMPOS_CAIXA = ['x', 'y', 'w', 'h'];
const CAMPOS_DERIVADOS = ['empurrao', 'cabeca', 'efeLargura', 'efeAltura'];
const BASE_RARIDADE = 'Comum';

/* Junta os três estados num veredito, com a regra de que faltar dado
   nunca aprova. */
function veredito(comparacoes, violacoes, faltam, pior) {
  const estado = faltam.length ? 'insuficiente'
               : violacoes.length ? 'violado'
               : comparacoes > 0 ? 'aprovado' : 'insuficiente';
  return { estado, comparacoes, violacoes, faltam, pior: pior || 0 };
}

/* Olha a matriz antes de comparar: existem as três raridades em cada
   seed e fase? Trazem os campos pedidos? São objetos DISTINTOS?

   A última pergunta não é teórica. A mutação MUT1 da auditoria passava
   `base` como se fosse a medida da outra raridade, e a comparação dava
   zero porque era o mesmo objeto. Aqui isso é detectado e reprova. */
function conferirMatriz(M, seeds, niveis, raridades, campos) {
  const faltam = [];
  if (!raridades || raridades.length < 2) {
    faltam.push('a lista de raridades tem ' + ((raridades || []).length) + ', e precisa de pelo menos 2');
    return faltam;
  }
  if (raridades.indexOf(BASE_RARIDADE) === -1) faltam.push('falta a raridade base ' + BASE_RARIDADE);
  for (const s of seeds) {
    if (!M[s]) { faltam.push('seed ' + s + ' não está na matriz'); continue; }
    for (const [nv] of niveis) {
      if (!M[s][nv]) { faltam.push('seed ' + s + ' não tem o nível ' + nv); continue; }
      const vistos = [];
      for (const r of raridades) {
        const m = M[s][nv][r];
        if (!m) { faltam.push('seed ' + s + ' nível ' + nv + ' não tem ' + r); continue; }
        for (const k of campos) {
          if (m[k] === undefined || m[k] === null)
            faltam.push('seed ' + s + ' nível ' + nv + ' ' + r + ' não tem o campo ' + k);
          if (typeof m[k] === 'number' && !Number.isFinite(m[k]))
            faltam.push('seed ' + s + ' nível ' + nv + ' ' + r + ' tem ' + k + ' = ' + m[k]);
        }
        /* o mesmo objeto duas vezes é erro de programação, não medida */
        if (vistos.indexOf(m) !== -1)
          faltam.push('seed ' + s + ' nível ' + nv + ': ' + r + ' é o MESMO objeto que outra raridade');
        vistos.push(m);
      }
    }
  }
  return faltam;
}

/* ── 1 · A RARIDADE NÃO MEXE NA CAIXA DO CORPO ──

   O comparador vai ele mesmo buscar a base e as outras raridades: não
   recebe de fora qual compara com qual, e portanto não há como lhe
   passar o Comum no lugar do Lendário. */
function invarianciaDaRaridade(M, seeds, niveis, raridades) {
  const faltam = conferirMatriz(M, seeds, niveis, raridades, CAMPOS_CAIXA);
  const outras = (raridades || []).filter((r) => r !== BASE_RARIDADE);
  if (!faltam.length && outras.length < 2)
    faltam.push('há só ' + outras.length + ' raridade além do ' + BASE_RARIDADE + '; esperam-se 2');
  if (faltam.length) return veredito(0, [], faltam);

  const violacoes = [];
  let n = 0, pior = 0;
  for (const s of seeds) for (const [nv, fase] of niveis) {
    const base = M[s][nv][BASE_RARIDADE];
    for (const r of outras) {
      const m = M[s][nv][r];
      for (const k of CAMPOS_CAIXA) {
        n++;
        const d = Math.abs(m[k] - base[k]);
        if (d > pior) pior = d;
        if (d > 0) violacoes.push('seed ' + s + ' fase ' + fase + ' ' + r
          + ' ' + k + ': ' + m[k] + ' ≠ ' + base[k] + ' (Δ ' + d.toFixed(3) + ')');
      }
    }
  }
  return veredito(n, violacoes, [], pior);
}

/* ── 2 · NEM NO QUE O _afAssentar DERIVA DELA ──

   O empurrão que põe os pés no chão, o --cabeca de onde pende o nome e
   as duas caixas de efeitos. O fundo da tinta NÃO entra: ele acaba na
   linha do chão por construção, em qualquer raridade, e compará-lo não
   prova nada — foi o erro da primeira verificação negativa. */
function derivadasInvariantes(M, seeds, niveis, raridades) {
  const faltam = conferirMatriz(M, seeds, niveis, raridades, CAMPOS_DERIVADOS);
  const outras = (raridades || []).filter((r) => r !== BASE_RARIDADE);
  if (!faltam.length && outras.length < 2)
    faltam.push('há só ' + outras.length + ' raridade além do ' + BASE_RARIDADE);
  if (faltam.length) return veredito(0, [], faltam);

  const violacoes = [];
  let n = 0;
  for (const s of seeds) for (const [nv, fase] of niveis) {
    const base = M[s][nv][BASE_RARIDADE];
    for (const r of outras) {
      const m = M[s][nv][r];
      for (const k of CAMPOS_DERIVADOS) {
        n++;
        if (String(m[k]) !== String(base[k]))
          violacoes.push('seed ' + s + ' fase ' + fase + ' ' + r + ' ' + k
            + ': ' + m[k] + ' ≠ ' + base[k]);
      }
    }
  }
  return veredito(n, violacoes, []);
}

/* ── 3 · OS PÉS ASSENTAM NA LINHA DO CHÃO ──

   Esta é a razão de todo o resto: o getBBox() existe aqui para pregar o
   bicho ao chão, e é por isso que mexer-lhe mexia nos pés. Varre a
   matriz inteira, nas três raridades. */
function pesAssentados(M, seeds, niveis, raridades, tol) {
  const faltam = conferirMatriz(M, seeds, niveis, raridades, ['fundoDaTinta', 'chao']);
  if (faltam.length) return veredito(0, [], faltam);

  const violacoes = [];
  let n = 0, pior = 0;
  for (const s of seeds) for (const [nv, fase] of niveis) for (const r of raridades) {
    const m = M[s][nv][r];
    n++;
    const d = Math.abs(m.fundoDaTinta - m.chao);
    if (d > pior) pior = d;
    if (d > tol) violacoes.push('seed ' + s + ' fase ' + fase + ' ' + r
      + ': a tinta acaba a ' + d.toFixed(2) + 'px do chão (tolerância ' + tol + ')');
  }
  return veredito(n, violacoes, [], pior);
}

/* ── 4 · AS PARTÍCULAS E A AURA FICAM FORA DA MEDIDA ──

   O mecanismo que faz a invariante 1 passar. É display:none e não
   opacity nem visibility, e a razão é medida: o getBBox() ignora
   display:none e NÃO ignora os outros dois.

   Varre a matriz inteira — a primeira versão media um caso único, e um
   display que se perdesse só numa fase passava. */
function presencaForaDaMedida(M, seeds, niveis, raridades) {
  const faltam = conferirMatriz(M, seeds, niveis, raridades,
    ['partDisplay', 'auraDisplay', 'partNoMedido', 'temCamadaPart']);
  if (faltam.length) return veredito(0, [], faltam);

  const violacoes = [];
  let n = 0;
  for (const s of seeds) for (const [nv, fase] of niveis) for (const r of raridades) {
    const m = M[s][nv][r];
    n += 3;
    const q = 'seed ' + s + ' fase ' + fase + ' ' + r + ': ';
    if (m.partDisplay !== 'none' && m.partDisplay !== 'não há')
      violacoes.push(q + 'as partículas do svg medido estão em display ' + m.partDisplay);
    if (m.auraDisplay !== 'none' && m.auraDisplay !== 'não há')
      violacoes.push(q + 'a aura do svg medido está em display ' + m.auraDisplay);
    if (!m.temCamadaPart)
      violacoes.push(q + 'não há camada svg.cb-part que pinte as partículas');
  }
  return veredito(n, violacoes, []);
}

/* ── 5 · NENHUMA PARTE DO CORPO MUDA COM A RARIDADE ──

   A invariante 1 olha a caixa inteira, que é a união das partes. Esta
   olha cada parte: se a raridade voltar a mexer numa delas, mesmo numa
   que não esteja no extremo da união, grita aqui.

   Recebe APR[seed][nivel][raridade] = { 'av-corpo': {w,h}, … }. */
function partesIndependentesDaRaridade(APR, seeds, niveis, raridades) {
  const faltam = [];
  const outras = (raridades || []).filter((r) => r !== BASE_RARIDADE);
  if (outras.length < 2) faltam.push('há só ' + outras.length + ' raridade além do ' + BASE_RARIDADE);
  for (const s of seeds) {
    if (!APR[s]) { faltam.push('seed ' + s + ' não está no mapa de partes'); continue; }
    for (const [nv] of niveis) {
      if (!APR[s][nv]) { faltam.push('seed ' + s + ' nível ' + nv + ' sem partes'); continue; }
      for (const r of raridades) {
        const p = APR[s][nv][r];
        if (!p) { faltam.push('seed ' + s + ' nível ' + nv + ' ' + r + ' sem partes'); continue; }
        if (!Object.keys(p).length) faltam.push('seed ' + s + ' nível ' + nv + ' ' + r + ' com zero partes');
      }
    }
  }
  if (faltam.length) return veredito(0, [], faltam);

  const violacoes = [];
  let n = 0, pior = 0;
  for (const s of seeds) for (const [nv, fase] of niveis) {
    const base = APR[s][nv][BASE_RARIDADE];
    for (const r of outras) {
      const p = APR[s][nv][r];
      /* as partes que existem num e não no outro já são divergência */
      for (const k of new Set([...Object.keys(base), ...Object.keys(p)])) {
        n++;
        if (!base[k]) { violacoes.push('seed ' + s + ' fase ' + fase + ': ' + k + ' só existe no ' + r); continue; }
        if (!p[k])    { violacoes.push('seed ' + s + ' fase ' + fase + ': ' + k + ' só existe no ' + BASE_RARIDADE); continue; }
        for (const d of ['w', 'h']) {
          const dif = Math.abs(p[k][d] - base[k][d]);
          if (dif > pior) pior = dif;
          if (dif > 0) violacoes.push('seed ' + s + ' fase ' + fase + ' ' + r + ' ' + k
            + '.' + d + ': ' + p[k][d] + ' ≠ ' + base[k][d]);
        }
      }
    }
  }
  return veredito(n, violacoes, [], pior);
}

/* ── 6 · A MEDIDA NÃO MUDA COM O TEMPO ──

   A auditoria mediu a mesma caixa a variar até 4,16 unidades em 1,5 s,
   por causa das animações. Com elas congeladas isto tem de dar zero —
   e é esta a asserção que PROVA que o congelamento pegou. Recebe pares
   { antes, depois } da mesma caixa, medida duas vezes com uma espera
   pelo meio. */
function medidaEstavelNoTempo(pares, tol) {
  const faltam = [];
  if (!pares || !pares.length) faltam.push('não houve pares para comparar');
  for (const p of (pares || [])) {
    if (!p || !p.antes || !p.depois) { faltam.push('par sem antes ou sem depois: ' + (p && p.rotulo)); continue; }
    for (const k of CAMPOS_CAIXA) {
      if (!Number.isFinite(p.antes[k]) || !Number.isFinite(p.depois[k]))
        faltam.push((p.rotulo || '?') + ' tem ' + k + ' não finito');
    }
  }
  if (faltam.length) return veredito(0, [], faltam);

  const violacoes = [];
  let n = 0, pior = 0;
  for (const p of pares) {
    for (const k of CAMPOS_CAIXA) {
      n++;
      const d = Math.abs(p.depois[k] - p.antes[k]);
      if (d > pior) pior = d;
      if (d > tol) violacoes.push(p.rotulo + ' ' + k + ' mexeu ' + d.toFixed(4)
        + ' entre as duas medidas');
    }
  }
  return veredito(n, violacoes, [], pior);
}

/* O tradutor entre um veredito e o placar. É aqui, e só aqui, que um
   comparador vira OK ou FALHOU — tanto na seção normal como na
   negativa, que é o ponto todo da reescrita. */
/* ── O JULGAMENTO, SEPARADO DA CONTAGEM ──

   Estes dois `julgar*` decidem e não contam: devolvem { passa, detalhe }
   e não tocam no placar. É o que torna os tradutores testáveis — a
   auditoria 3J.17C-R2 mostrou que cegar `afirmar` ou `afirmarQueReprova`
   dava 56/0 com saída 0, porque não havia como olhar para a decisão
   deles sem passar por eles.

   Agora o autoteste verifica duas coisas por caminhos diferentes: a
   DECISÃO, chamando os julgar* diretamente, e o EFEITO NO PLACAR,
   chamando os tradutores e medindo quanto `passou` e `falhou` se
   mexeram. A segunda é a que apanha um tradutor trocado para aprovar
   sempre, porque não acredita no que ele diz — mede o que ele faz. */
function julgarNormal(v, detalheOk) {
  if (v.estado === 'aprovado')
    return { passa: true, detalhe: detalheOk || (v.comparacoes + ' comparações') };
  if (v.estado === 'insuficiente')
    return { passa: false, detalhe: 'ENTRADA INSUFICIENTE (' + v.faltam.length + '): '
      + v.faltam.slice(0, 2).join(' · ') };
  return { passa: false, detalhe: v.violacoes.length + ' violações, pior ' + v.pior.toFixed(3)
    + ' · ' + v.violacoes.slice(0, 2).join(' · ') };
}

function julgarNegativa(v, oQue) {
  if (v.estado === 'violado') {
    /* o `pior` só existe nos comparadores numéricos; nos de texto é 0 e
       imprimi-lo seria dizer que a diferença foi nula */
    const quanto = v.pior ? ', pior ' + v.pior.toFixed(2) + (oQue ? ' ' + oQue : '') : '';
    return { passa: true, detalhe: v.violacoes.length + ' de ' + v.comparacoes
      + ' comparações acusam' + quanto + ' · ex.: ' + v.violacoes[0] };
  }
  return { passa: false, detalhe: 'o comparador NÃO acusou a contaminação: estado ' + v.estado
    + (v.estado === 'insuficiente' ? ' (' + v.faltam.slice(0, 1).join('') + ')' : '')
    + ' — ele está cego' };
}

function afirmar(v, titulo, detalheOk) {
  const j = julgarNormal(v, detalheOk);
  ok(j.passa, titulo, j.detalhe);
}

/* E o inverso, para a verificação negativa: aqui o esperado é 'violado'.
   Um comparador cego devolve 'aprovado' e reprova nesta linha. */
function afirmarQueReprova(v, titulo, oQue) {
  const j = julgarNegativa(v, oQue);
  ok(j.passa, titulo, j.detalhe);
}

/* ═══════════════════════════════════════════════════════════════════
   O AUTOTESTE DOS COMPARADORES

   Matrizes sintéticas, sem navegador. Prova que cada comparador sabe
   dizer 'violado' e 'insuficiente' — porque um comparador que só sabe
   dizer 'aprovado' é um comparador cego, e a suíte inteira passa a
   valer nada. Corre sempre, e sozinho com --so-autoteste.
   ═══════════════════════════════════════════════════════════════════ */

function autoteste() {
  secao('autoteste', 'AUTOTESTE: OS COMPARADORES E OS TRADUTORES (sem navegador)');

  const SS = [1, 2];
  const NN = [[1, 0], [15, 2]];
  const RR = ['Comum', 'Raro', 'Lendário'];
  /* uma medida completa e plausível */
  const med = (extra) => Object.assign({
    x: 20, y: 30, w: 160, h: 200,
    fundoDaTinta: 500.2, chao: 500.0,
    empurrao: '-12px', cabeca: '125px', efeLargura: '88px', efeAltura: '112px',
    partDisplay: 'none', auraDisplay: 'none', partNoMedido: 9, temCamadaPart: true,
  }, extra || {});
  const limpa = () => { const M = {};
    for (const s of SS) { M[s] = {}; for (const [nv] of NN) { M[s][nv] = {};
      for (const r of RR) M[s][nv][r] = med(); } } return M; };
  const partes = (extra) => { const A = {};
    for (const s of SS) { A[s] = {}; for (const [nv] of NN) { A[s][nv] = {};
      for (const r of RR) A[s][nv][r] = Object.assign(
        { 'av-corpo': { w: 100, h: 140 }, 'av-chifre': { w: 30, h: 33 } },
        (extra && extra[r]) || {}); } } return A; };

  const casos = [
    { nome: 'invarianciaDaRaridade aprova a matriz limpa',
      esperado: 'aprovado', f: () => invarianciaDaRaridade(limpa(), SS, NN, RR) },
    { nome: '… e reprova quando o Lendário tem outra caixa',
      esperado: 'violado', f: () => { const M = limpa(); M[1][15]['Lendário'].h = 241.5;
        return invarianciaDaRaridade(M, SS, NN, RR); } },
    { nome: '… e reprova quando falta uma raridade',
      esperado: 'insuficiente', f: () => { const M = limpa(); delete M[2][1]['Raro'];
        return invarianciaDaRaridade(M, SS, NN, RR); } },
    { nome: '… e reprova quando falta uma seed inteira',
      esperado: 'insuficiente', f: () => { const M = limpa(); delete M[2];
        return invarianciaDaRaridade(M, SS, NN, RR); } },
    { nome: '… e reprova quando um campo não veio',
      esperado: 'insuficiente', f: () => { const M = limpa(); delete M[1][15]['Raro'].h;
        return invarianciaDaRaridade(M, SS, NN, RR); } },
    { nome: '… e reprova quando um campo veio NaN',
      esperado: 'insuficiente', f: () => { const M = limpa(); M[1][15]['Raro'].h = NaN;
        return invarianciaDaRaridade(M, SS, NN, RR); } },
    { nome: '… e reprova quando duas raridades são o MESMO objeto',
      esperado: 'insuficiente', f: () => { const M = limpa();
        M[1][15]['Lendário'] = M[1][15]['Comum'];
        return invarianciaDaRaridade(M, SS, NN, RR); } },
    { nome: '… e reprova quando só lhe dão o Comum',
      esperado: 'insuficiente', f: () => invarianciaDaRaridade(limpa(), SS, NN, ['Comum']) },

    { nome: 'derivadasInvariantes aprova a matriz limpa',
      esperado: 'aprovado', f: () => derivadasInvariantes(limpa(), SS, NN, RR) },
    { nome: '… e reprova quando o --cabeca do Raro difere',
      esperado: 'violado', f: () => { const M = limpa(); M[1][1]['Raro'].cabeca = '126px';
        return derivadasInvariantes(M, SS, NN, RR); } },
    { nome: '… e reprova quando o empurrão difere',
      esperado: 'violado', f: () => { const M = limpa(); M[2][15]['Lendário'].empurrao = '-38px';
        return derivadasInvariantes(M, SS, NN, RR); } },

    { nome: 'pesAssentados aprova dentro da tolerância',
      esperado: 'aprovado', f: () => pesAssentados(limpa(), SS, NN, RR, 1.0) },
    { nome: '… e reprova quando a tinta sai do chão',
      esperado: 'violado', f: () => { const M = limpa(); M[1][15]['Comum'].fundoDaTinta = 540;
        return pesAssentados(M, SS, NN, RR, 1.0); } },
    { nome: '… e reprova sem o campo do chão',
      esperado: 'insuficiente', f: () => { const M = limpa(); delete M[1][1]['Comum'].chao;
        return pesAssentados(M, SS, NN, RR, 1.0); } },

    { nome: 'presencaForaDaMedida aprova com tudo em display:none',
      esperado: 'aprovado', f: () => presencaForaDaMedida(limpa(), SS, NN, RR) },
    { nome: '… e reprova quando as partículas ficam visíveis',
      esperado: 'violado', f: () => { const M = limpa(); M[1][15]['Lendário'].partDisplay = 'inline';
        return presencaForaDaMedida(M, SS, NN, RR); } },
    { nome: '… e reprova quando a aura fica visível',
      esperado: 'violado', f: () => { const M = limpa(); M[2][1]['Raro'].auraDisplay = 'block';
        return presencaForaDaMedida(M, SS, NN, RR); } },
    { nome: '… e reprova quando a camada que pinta desaparece',
      esperado: 'violado', f: () => { const M = limpa(); M[1][1]['Comum'].temCamadaPart = false;
        return presencaForaDaMedida(M, SS, NN, RR); } },

    { nome: 'partesIndependentesDaRaridade aprova partes iguais',
      esperado: 'aprovado', f: () => partesIndependentesDaRaridade(partes(), SS, NN, RR) },
    { nome: '… e reprova quando uma parte cresce no Lendário',
      esperado: 'violado', f: () => partesIndependentesDaRaridade(
        partes({ 'Lendário': { 'av-corpo': { w: 100, h: 154 } } }), SS, NN, RR) },
    { nome: '… e reprova quando uma parte só existe numa raridade',
      esperado: 'violado', f: () => partesIndependentesDaRaridade(
        partes({ 'Lendário': { 'av-particula': { w: 180, h: 180 } } }), SS, NN, RR) },
    { nome: '… e reprova com o mapa de partes vazio',
      esperado: 'insuficiente', f: () => { const A = partes(); A[1][15]['Raro'] = {};
        return partesIndependentesDaRaridade(A, SS, NN, RR); } },

    { nome: 'medidaEstavelNoTempo aprova duas medidas iguais',
      esperado: 'aprovado', f: () => medidaEstavelNoTempo(
        [{ rotulo: 'a', antes: med(), depois: med() }], 0) },
    { nome: '… e reprova quando a caixa mexe entre as duas',
      esperado: 'violado', f: () => medidaEstavelNoTempo(
        [{ rotulo: 'a', antes: med(), depois: med({ h: 204.16 }) }], 0) },
    { nome: '… e reprova sem pares nenhuns',
      esperado: 'insuficiente', f: () => medidaEstavelNoTempo([], 0) },
  ];

  let maus = 0;
  for (const c of casos) {
    let v;
    try { v = c.f(); } catch (e) { v = { estado: 'rebentou: ' + e.message, faltam: [], violacoes: [], comparacoes: 0, pior: 0 }; }
    const acertou = v.estado === c.esperado;
    if (!acertou) maus++;
    ok(acertou, c.nome, 'esperado ' + c.esperado + ', veio ' + v.estado
      + (v.estado === 'violado' ? ' (' + v.violacoes.length + ')' : '')
      + (v.estado === 'insuficiente' ? ' (' + v.faltam.length + ')' : ''));
  }

  /* ═══════════ OS TRADUTORES DE VEREDITO ═══════════

     A auditoria 3J.17C-R2 cegou o `afirmar` e o `afirmarQueReprova` e a
     suíte deu 56/0 com saída 0, porque ninguém olhava para eles. Agora
     olham-se por dois caminhos independentes.

     PRIMEIRO A DECISÃO: chamam-se os `julgar*`, que decidem sem contar,
     e verifica-se o `passa`. Um veredito que devia passar tem de ser
     aceito, e um que devia falhar tem de ser recusado — nos dois
     sentidos, e nos três estados. */
  const vAp = { estado: 'aprovado',     comparacoes: 8, violacoes: [],          faltam: [],    pior: 0 };
  const vVi = { estado: 'violado',      comparacoes: 8, violacoes: ['exemplo'], faltam: [],    pior: 3.5 };
  const vIn = { estado: 'insuficiente', comparacoes: 0, violacoes: [],          faltam: ['x'], pior: 0 };

  const DECISOES = [
    ['julgarNormal aceita o que está aprovado',          () => julgarNormal(vAp).passa,   true],
    ['julgarNormal recusa o que está violado',           () => julgarNormal(vVi).passa,   false],
    ['julgarNormal recusa a entrada insuficiente',       () => julgarNormal(vIn).passa,   false],
    ['julgarNegativa aceita o que está violado',         () => julgarNegativa(vVi).passa, true],
    ['julgarNegativa recusa o que está aprovado',        () => julgarNegativa(vAp).passa, false],
    ['julgarNegativa recusa a entrada insuficiente',     () => julgarNegativa(vIn).passa, false],
  ];
  for (const [nome, f, esp] of DECISOES) {
    let veio; try { veio = f(); } catch (e) { veio = 'rebentou: ' + e.message; }
    if (veio !== esp) maus++;
    ok(veio === esp, nome, 'esperado ' + esp + ', veio ' + veio);
  }

  /* ── E DEPOIS O EFEITO NO PLACAR ──

     Esta metade é a que apanha um tradutor trocado para aprovar sempre.
     Não se pergunta ao tradutor o que ele decidiu: dá-se-lhe um veredito
     e MEDE-SE quanto o `passou` e o `falhou` se mexeram. Um `afirmar`
     que chame sempre ok(true) soma no `passou` onde devia somar no
     `falhou`, e isso vê-se daqui.

     A sonda corre em silêncio (MUDO) e repõe os três contadores, para
     não sujar nem o placar nem a contagem da seção. */
  function medirEfeito(tradutor, v) {
    const p0 = passou, f0 = falhou, c0 = CONTAS[secaoAtual] || 0;
    MUDO = true;
    try { tradutor(v, '(sonda interna)'); } catch (e) { /* conta como nada */ }
    MUDO = false;
    const d = { somouPassou: passou - p0, somouFalhou: falhou - f0 };
    passou = p0; falhou = f0; CONTAS[secaoAtual] = c0;
    return d;
  }
  const bate = (d, p, f) => d.somouPassou === p && d.somouFalhou === f;

  const EFEITOS = [
    ['afirmar soma em passou quando está aprovado',  () => medirEfeito(afirmar, vAp),           1, 0],
    ['afirmar soma em falhou quando está violado',   () => medirEfeito(afirmar, vVi),           0, 1],
    ['afirmar soma em falhou se a entrada falta',    () => medirEfeito(afirmar, vIn),           0, 1],
    ['afirmarQueReprova soma em passou se violado',  () => medirEfeito(afirmarQueReprova, vVi), 1, 0],
    ['afirmarQueReprova soma em falhou se aprovado', () => medirEfeito(afirmarQueReprova, vAp), 0, 1],
    ['afirmarQueReprova soma em falhou se falta',    () => medirEfeito(afirmarQueReprova, vIn), 0, 1],
  ];
  for (const [nome, f, p, fa] of EFEITOS) {
    let d; try { d = f(); } catch (e) { d = { somouPassou: -1, somouFalhou: -1 }; }
    const certo = bate(d, p, fa);
    if (!certo) maus++;
    ok(certo, nome, 'esperado +' + p + '/+' + fa + ', veio +'
      + d.somouPassou + '/+' + d.somouFalhou);
  }

  return maus === 0;
}

/* ═════════════════════ ONDE ESTÁ O NAVEGADOR ═════════════════════ */

const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
function acharNavegador() {
  for (const c of CANDIDATOS) if (c && fs.existsSync(c)) return c;
  return null;
}

/* ═════════════════════ A CASCATA, LIDA DO index.html ═════════════════════ */

/* Não há lista manual aqui: os CSS saem do próprio index.html, na ordem
   dele. Uma lista copiada envelheceria em silêncio, e foi assim que a
   primeira versão deste teste acabou a medir com um CSS de dezenove.

   Os links remotos (as fontes do Google) ficam de fora de propósito: o
   teste não deve depender da rede, e um tipo de letra não mexe na
   geometria de um <svg> que não tem texto. */
function cascataDoIndex() {
  const idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const links = [...idx.matchAll(/<link\b[^>]*>/g)].map((m) => m[0])
    .filter((t) => /rel\s*=\s*["']stylesheet["']/i.test(t));
  const fora = [], remotos = [], ausentes = [];
  for (const t of links) {
    const h = (t.match(/href\s*=\s*["']([^"']+)["']/) || [])[1];
    if (!h) continue;
    if (/^(https?:)?\/\//.test(h)) { remotos.push(h.slice(0, 48)); continue; }
    const semVersao = h.split('?')[0];
    if (!fs.existsSync(path.join(RAIZ, semVersao))) { ausentes.push(semVersao); continue; }
    fora.push(semVersao);
  }
  return { css: fora, remotos, ausentes };
}

/* ═════════════════════ O SERVIDOR ═════════════════════ */

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
                '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function servir(harness) {
  return new Promise((resolve, reject) => {
    const naoAchados = [];
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (u === '/__geometria.html') {
        res.writeHead(200, { 'Content-Type': TIPOS['.html'] });
        return res.end(harness);
      }
      /* O navegador pede o favicon por conta própria, sem a página lhe
         ter dito nada. Não conta como referência em falta: responde-se
         204 e não vai para a lista. */
      if (u === '/favicon.ico') { res.writeHead(204); return res.end(); }
      const alvo = path.resolve(RAIZ, '.' + u);
      if (!alvo.startsWith(RAIZ) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) {
        naoAchados.push(u);
        res.writeHead(404); return res.end('não há');
      }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream' });
      res.end(fs.readFileSync(alvo));
    });
    srv.on('error', (e) => reject(new ErroDeInfra('o servidor local não subiu: ' + e.message)));
    srv.listen(0, '127.0.0.1', () => resolve({ srv, porta: srv.address().port, naoAchados }));
  });
}

/* ═════════════════════ A PÁGINA DE ENSAIO ═════════════════════ */

/* ── PORQUE O arena-fu.js É AVALIADO E NÃO INCLUÍDO ──

   O _afLutador lê _afE, _afMeu, _afQuem e _afPasso, que são `let` de
   topo de um script clássico: não existem no window e não há como
   pôr-lhes valor de fora. Avaliado dentro de uma função, o mesmo código
   devolve fechos que lhes mexem — e assim é o _afLutador DE PRODUÇÃO
   que monta o posto, com o esqueleto, as classes e o --escala
   verdadeiros. Copiar esse HTML para aqui seria criar uma segunda arena
   que divergiria da primeira na primeira correção.

   _afE = null é o estado "sem batalha": o _afPodeAgir sai logo em false
   e nenhum caminho que peça o motor é tocado. O fuResumoAgora fica de
   fora (o _afLutador guarda-o com typeof): as marcas do céu são
   <span>, não entram no getBBox() de um <svg> e trariam o
   js/ficha-fu-ui.js inteiro atrás. O t() é um eco, porque o que ele
   devolve vai para um title. */
function montarHarness(css) {
  const links = css.map((c) => '<link rel="stylesheet" href="/' + c + '">').join(NL);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>geometria</title>
${links}
<style id="molde-do-ensaio">
  /* ── O QUE ESTE BLOCO FAZ, E PORQUE É SÓ DO ENSAIO ──

     1. Prende o rem em 16px e o palco num tamanho fixo. No jogo o rem
        muda com a tela (16px no celular, 24px no PC); as asserções são
        todas relativas, portanto a escolha não muda o veredito, mas
        prendê-la torna os números comparáveis entre máquinas.

     2. MATA AS ANIMAÇÕES DE CSS. A auditoria 3J.17C-R mediu a mesma
        caixa a variar até 4,16 unidades ao longo de 1,5 s, e a
        invariância da raridade tem tolerância ZERO. Usa-se
        'animation: none' e não 'animation-play-state: paused' porque
        o segundo congela onde estiver — e onde estiver depende de
        quando a medida caiu. Com 'none' o elemento fica no seu estado
        base, que é o mesmo em qualquer máquina e em qualquer corrida.

        Isto é uma regra DO HARNESS: não toca no css/ de produção, e
        vale só dentro deste teste. Ela não congela o SMIL — isso é
        trabalho do pauseAnimations(), no __congelar abaixo. */
  html { font-size: 16px; }
  body { margin: 0; background: #0b0b12; }
  .cb-palco { width: 900px; height: 520px; position: relative; }
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
</style></head>
<body>
<div class="cb-palco"><div class="cb-campo" id="cbCampo"></div></div>
<script src="/js/cores.js"></script>
<script src="/js/ficha-fu.js"></script>
<script src="/js/data.js"></script>
<script>
window.t = (k) => String(k);
window.__erros = [];
window.addEventListener('error', (e) => window.__erros.push(String(e.message)));

window.__pronto = fetch('/js/arena-fu.js').then(r => r.text()).then((src) => {
  if (!/function _afLutador/.test(src)) throw new Error('o js/arena-fu.js nao veio inteiro');
  window.AF = new Function(src + String.fromCharCode(10)
    + 'return { _afLutador, _afCorpo, _afAssentar, _afFase,'
    + '         porE: (v) => { _afE = v; }, porMeu: (v) => { _afMeu = v; } };')();
  window.AF.porE(null);
  window.AF.porMeu('A');
  return true;
});

/* O avatar de ensaio: a seed decide o corpo todo (ver _preludio, em
   js/data.js), o nivel decide a fase (fuFaseDoNivel) e a raridade e o
   terceiro eixo. Mais nada entra. */
window.__ficha = (seed, nivel, raridade) => ({
  id: 'ens', lado: 'A', posto: 0, vivo: true, nome: 'ensaio',
  ficha: { seed: seed, nivel: nivel, raridade: raridade, cor: '#8b5cf6' },
});

/* ── O CONGELAMENTO, E A ORDEM EM QUE TEM DE ACONTECER ──

   1. desenhar;  2. deixar o navegador fazer o layout;  3. congelar;
   4. confirmar que congelou;  5. medir.

   O passo 2 nao e decorativo: o pauseAnimations() para o relogio do
   SVG onde ele estiver, e um SVG recem-inserido ainda nao tem relogio
   nenhum. Forca-se o layout lendo offsetWidth, para o navegador criar
   a arvore de render, e so depois se para e se poe o relogio a zero.

   O setCurrentTime(0) e o que torna a medida reproduzivel: parar e
   parar NUM INSTANTE CONHECIDO sao coisas diferentes. */
window.__congelar = () => {
  const campo = document.getElementById('cbCampo');
  void campo.offsetWidth;                       /* 2 · layout feito */
  const svgs = [...campo.querySelectorAll('svg')];
  for (const s of svgs) {
    if (s.pauseAnimations) s.pauseAnimations();  /* 3 · SMIL parado */
    if (s.setCurrentTime) s.setCurrentTime(0);   /*     e no zero    */
  }
  void campo.offsetWidth;
  /* 4 · confirmar, sem acreditar */
  const mal = [];
  for (const s of svgs) {
    if (s.animationsPaused && !s.animationsPaused()) mal.push('um svg nao parou o SMIL');
    if (s.getCurrentTime && Math.abs(s.getCurrentTime()) > 1e-9)
      mal.push('um svg ficou no instante ' + s.getCurrentTime());
  }
  const vivas = [];
  for (const el of campo.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.animationName && cs.animationName !== 'none')
      vivas.push(el.tagName + '.' + (el.getAttribute('class') || ''));
  }
  return { svgs: svgs.length, mal: mal, animacoesCssVivas: vivas.slice(0, 4),
           quantasVivas: vivas.length };
};

/* Le a caixa do svg que o _afAssentar mede, sem redesenhar. Serve para
   medir duas vezes o MESMO desenho e provar que ele nao se mexe. */
window.__reler = () => {
  const s = document.querySelector('.cb-corpo svg');
  if (!s) return null;
  const b = s.getBBox();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
};

/* ── A MEDIDA ──
   Desenha, congela, confirma, assenta e mede — nesta ordem. */
window.__medir = (seed, nivel, raridade) => {
  const campo = document.getElementById('cbCampo');
  campo.innerHTML = window.AF._afLutador(window.__ficha(seed, nivel, raridade));  /* 1 */
  const gelo = window.__congelar();                                               /* 2-4 */
  window.AF._afAssentar();                                                        /* 5 */

  const posto = campo.querySelector('.cb-posto');
  const corpo = posto.querySelector('.cb-corpo');
  /* O MESMO svg que o _afAssentar mede: o primeiro do .cb-corpo. O
     seletor e confirmado em runtime na secao de arranque. */
  const svg = corpo.querySelector('svg');
  const b = svg.getBBox();
  const m = svg.getScreenCTM();
  const chao = posto.getBoundingClientRect().top;
  const part = corpo.querySelector('svg.cb-part');
  const umaPart = svg.querySelector('.av-particula');
  const umaAura = svg.querySelector('.av-aura');
  const efe = posto.querySelector('.cb-efeitos');

  return {
    fase: window.AF._afFase(window.__ficha(seed, nivel, raridade)),
    x: b.x, y: b.y, w: b.width, h: b.height,
    escalaX: Math.abs(m.a), escalaY: Math.abs(m.d),
    fundoDaTinta: m.f + (b.y + b.height) * m.d,
    chao: chao,
    cabeca: posto.style.getPropertyValue('--cabeca'),
    /* O EMPURRAO que o _afAssentar deu ao corpo. O fundoDaTinta acaba
       sempre na linha do chao, porque e isso que a funcao faz —
       comparar fundos entre raridades nunca acusa nada. O que acusa e
       o quanto ela teve de empurrar. */
    empurrao: corpo.style.top,
    efeLargura: efe ? efe.style.width : '',
    efeAltura: efe ? efe.style.height : '',
    temCamadaPart: !!part,
    partPintadas: part ? part.querySelectorAll('.av-particula > *').length : 0,
    partNoMedido: svg.querySelectorAll('.av-particula > *').length,
    partDisplay: umaPart ? getComputedStyle(umaPart).display : 'nao ha',
    auraDisplay: umaAura ? getComputedStyle(umaAura).display : 'nao ha',
    aneisAura: svg.querySelectorAll('.av-aura > *').length,
    vb: svg.getAttribute('viewBox'),
    /* o estado do congelamento viaja com a medida */
    gelo: gelo,
    /* qual elemento o seletor do _afAssentar devolve, para se confirmar
       que nao e a camada das particulas nem o container */
    svgEscolhido: { tag: svg.tagName, cls: svg.getAttribute('class') || '',
                    eADePart: svg.classList.contains('cb-part'),
                    quantosSvgs: corpo.querySelectorAll('svg').length },
  };
};

/* A caixa de CADA PARTE do desenho, medida a parte. A caixa inteira e a
   uniao de todas, e uma uniao so cresce se a parte que esta no extremo
   dela crescer. Medir parte por parte diz onde o fator da fase chega de
   fato, e deixa ver se a raridade mexe numa parte que nao esta no
   extremo. */
window.__partes = (seed, nivel, raridade) => {
  const campo = document.getElementById('cbCampo');
  campo.innerHTML = window.AF._afLutador(window.__ficha(seed, nivel, raridade));
  window.__congelar();
  const svg = campo.querySelector('.cb-corpo svg');
  const fora = {};
  for (const g of svg.querySelectorAll('g[class^="av-"]')) {
    const nome = g.getAttribute('class');
    if (getComputedStyle(g).display === 'none') continue;
    let b; try { b = g.getBBox(); } catch (e) { continue; }
    if (!b.width && !b.height) continue;
    const a = fora[nome];
    fora[nome] = a
      ? { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
          dir: Math.max(a.dir, b.x + b.width), fundo: Math.max(a.fundo, b.y + b.height) }
      : { x: b.x, y: b.y, dir: b.x + b.width, fundo: b.y + b.height };
  }
  const r = {};
  for (const k of Object.keys(fora)) {
    const a = fora[k];
    r[k] = { w: +(a.dir - a.x).toFixed(3), h: +(a.fundo - a.y).toFixed(3) };
  }
  return r;
};

/* QUEM faz cada extremo da caixa. Sem isto, uma caixa que nao cresce e
   um numero sem explicacao; com isto diz-se qual tinta a esta a
   prender. */
window.__extremos = (seed, nivel, raridade) => {
  const campo = document.getElementById('cbCampo');
  campo.innerHTML = window.AF._afLutador(window.__ficha(seed, nivel, raridade));
  window.__congelar();
  const svg = campo.querySelector('.cb-corpo svg');
  const B = svg.getBBox();
  const eps = 0.6;
  const pecas = [];
  for (const el of svg.querySelectorAll('*')) {
    if (!el.getBBox) continue;
    let b; try { b = el.getBBox(); } catch (e) { continue; }
    if (!b.width && !b.height) continue;
    if (getComputedStyle(el).display === 'none') continue;
    const g = el.closest('g[class^="av-"]');
    pecas.push({ parte: g ? g.getAttribute('class') : el.tagName,
                 y: b.y, fundo: b.y + b.height, x: b.x, dir: b.x + b.width });
  }
  const nomes = (f) => [...new Set(pecas.filter(f).map(p => p.parte))].join(' ');
  return { h: B.height, w: B.width, y: B.y,
           topo:  nomes(p => Math.abs(p.y - B.y) < eps),
           fundo: nomes(p => Math.abs(p.fundo - (B.y + B.height)) < eps),
           esq:   nomes(p => Math.abs(p.x - B.x) < eps),
           dir:   nomes(p => Math.abs(p.dir - (B.x + B.width)) < eps) };
};

/* Os genes que uma seed da. Os nomes sao os do corpoDaFila (js/data.js)
   — sem o sufixo 'Ad', que e renomeacao de dentro do gerarSVG. O
   corpoDoSeed leva DOIS argumentos e devolve NaN em silencio se levar
   um. */
window.__genes = (seed) => {
  const g = corpoDoSeed({ cor: '#8b5cf6' }, seed);
  return { corpo: g.tipoCorpo, olhos: g.numOlhos, olho: g.tipoOlho,
           bracos: g.numBracos, chifres: g.numChifres, cauda: g.temCauda,
           asas: g.temAsas, tent: g.temTent, esp: g.numEsp, boca: g.bocaTipo };
};

/* Quantos CSS entraram mesmo, e se o @keyframes que o
   combate-arena.css usa esta resolvido. Com um CSS so, nao estava. */
window.__cascata = () => {
  const folhas = [...document.styleSheets];
  const falharam = [], nomes = [];
  let regras = 0, keyframes = 0;
  for (const f of folhas) {
    let rs;
    try { rs = f.cssRules; } catch (e) { falharam.push((f.href || 'inline') + ': ' + e.message); continue; }
    if (f.href && !rs.length) falharam.push(f.href + ': entrou vazia');
    regras += rs.length;
    for (const r of rs) if (r.type === 7) keyframes++;
    if (f.href) nomes.push(f.href.split('/').pop());
  }
  const achaKf = (n) => {
    for (const f of folhas) { let rs; try { rs = f.cssRules; } catch (e) { continue; }
      for (const r of rs) if (r.type === 7 && r.name === n) return true; }
    return false;
  };
  return { folhas: folhas.length, comHref: nomes.length, nomes: nomes,
           regras: regras, keyframes: keyframes, falharam: falharam,
           temAvPiscar: achaKf('av-piscar') };
};
</script></body></html>`;
}

/* ═════════════════════ O CHROME, POR CDP ═════════════════════ */

const PRAZO_CDP = 20000;     // um comando que não responde é infra, não demora
const PRAZO_PORTA = 20000;   // o DevToolsActivePort a aparecer
const PRAZO_ABA = 15000;     // a aba da página a existir
const PRAZO_PAGINA = 20000;  // os scripts da página a correr

/* ── PORQUE A LIMPEZA VEM ANTES DO RESTO ──

   Na primeira versão, tudo o que falhasse DEPOIS do spawn deixava um
   Chrome vivo e um perfil no disco: o único kill estava no ramo do
   DevToolsActivePort, e o finally de fora não podia ajudar porque o
   objeto do navegador ainda era null. A auditoria encontrou 39 Chrome
   órfãos e dez perfis.

   Agora o spawn e o perfil são anotados num objeto que o chamador já
   tem na mão ANTES de qualquer passo que possa falhar, e o finally de
   fora limpa sempre — sucesso, reprovação, prazo esgotado ou falha de
   arranque. */
/* ── MATAR SÓ O QUE ESTE TESTE ABRIU ──

   O perfil tem um nome único (fv-geo-XXXXXX, do mkdtemp), e aparece na
   linha de comando de todos os processos que o navegador abriu para
   esta corrida. Filtrar por esse caminho mata a árvore inteira e NÃO
   toca em nenhum navegador que já estivesse aberto — é por isso que se
   filtra pelo perfil e não pelo nome do executável. */
function matarPeloPerfil(perfil) {
  if (process.platform !== 'win32') return 0;
  /* ── O FILTRO, E PORQUE É ESTE E NÃO OUTRO ──

     Três exigências, e todas foram medidas antes de escolher.

     1 · O NOME DO EXECUTÁVEL, por duas razões. Só se mata navegador; e
         porque o próprio powershell.exe tem o padrão na sua linha de
         comando, logo um filtro só por CommandLine casa-o a ele e o
         comando manda-se matar a si mesmo a meio (medido).

     2 · O CAMINHO ABSOLUTO do perfil desta execução, e não só o nome
         curto. A 3J.17C-R2 notou que casar `fv-geo-XXXXXX` em qualquer
         ponto da linha é menos preciso do que podia ser.

         A R3 pediu o ideal: exigir `--user-data-dir=<caminho>`. Medi, e
         não dá — o navegador PAI escreve o valor entre aspas
         (`--user-data-dir="C:\…\fv-geo-X"`) e os filhos escrevem-no
         sem elas, e a maioria dos filhos não repete o argumento de
         todo: traz o caminho em outros pontos da linha. Com esse filtro
         apanhavam-se 1 de 20 processos no Chrome e 1 de 16 no Edge, e
         os outros dezanove ficavam vivos a segurar o perfil.

         O caminho absoluto, sem o `--user-data-dir=`, apanha 20 de 20 e
         16 de 16 — completo E mais preciso que o nome curto. É este.

     3 · COMPARAÇÃO LITERAL, com .Contains() e não com -like. O -like
         trata `*`, `?` e `[` como curingas, e o caminho vem de
         os.tmpdir(), que é do sistema e não meu. O .Contains() não tem
         semântica de padrão nenhuma. O apóstrofo vai dobrado, que é
         como se escapa numa string do PowerShell.

     O que NÃO se faz aqui: matar por nome genérico de processo, ou por
     PID — ver o comentário do limpar(). */
  const alvo = perfil.replace(/'/g, "''");
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      "$p = '" + alvo + "';"
      + " $a = Get-CimInstance Win32_Process -Filter \"Name='chrome.exe' or Name='msedge.exe'\""
      + " | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($p) };"
      + " $a | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue };"
      + " ($a | Measure-Object).Count"],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 });
    return parseInt(String(out).trim(), 10) || 0;
  } catch (e) { return 0; }
}

function criarRecursos() {
  const r = { ch: null, ws: null, perfil: null, srv: null, limpo: false,
              fecharNavegador: null, matados: 0 };
  r.limpar = async () => {
    if (r.limpo) return;
    r.limpo = true;
    /* ── PRIMEIRO O FECHO GRACIOSO ──
       O Browser.close faz o navegador largar os arquivos do perfil em
       ordem. Sem ele, mesmo matando os processos, o Windows ainda tem
       handles abertos e o rmSync falha. */
    if (r.fecharNavegador) { try { await r.fecharNavegador(); } catch (e) {} }
    if (r.ws) { try { r.ws.close(); } catch (e) {} }
    /* ── PORQUE AQUI NÃO SE MATA POR PID ──

       Havia um `taskkill /PID <pid> /T /F` neste lugar, e a auditoria
       3J.17C-R2 mostrou que era perigoso e inútil ao mesmo tempo.

       Perigoso: no Windows o processo que se lança é só o pai, e ele
       delega e sai — medido, com 0, depois de 166 ms. O limpar() corre
       dezenas de segundos mais tarde, portanto esse PID já está livre
       para o sistema reatribuir. O taskkill recebia-o cru e matava a
       ÁRVORE INTEIRA (/T): se o número tivesse sido reaproveitado,
       levava um processo alheio e os filhos dele — podendo ser um
       Chrome ou Edge que o dono da máquina tinha aberto.

       Inútil: justamente porque o pai já saiu, o /T não alcançava os
       filhos do navegador. Antes de existir o matarPeloPerfil, a
       limpeza falhava com ele presente — ficavam 25 processos órfãos e
       o perfil no disco.

       O kill() do Node fica, porque é seguro por construção: trabalha
       sobre o handle do filho, não sobre o número. Medido: depois de o
       pai sair, devolve `false` e não sinaliza nada. Mesmo assim só se
       chama enquanto ele estiver vivo — é o que `exitCode === null`
       diz — para não depender desse detalhe de implementação.

       Quem mata de verdade é o matarPeloPerfil, pelo caminho absoluto
       do perfil desta execução. */
    if (r.ch && r.ch.exitCode === null && r.ch.signalCode === null) {
      try { r.ch.kill(); } catch (e) {}
    }
    if (r.perfil) r.matados = matarPeloPerfil(r.perfil);
    if (r.srv) { try { r.srv.close(); } catch (e) {} }
    if (r.perfil) {
      /* o Chrome larga os arquivos com atraso; tenta-se umas vezes */
      for (let i = 0; i < 12; i++) {
        try { fs.rmSync(r.perfil, { recursive: true, force: true }); } catch (e) {}
        if (!fs.existsSync(r.perfil)) break;
        if (i === 5) r.matados += matarPeloPerfil(r.perfil);   // segunda tentativa
        await new Promise((x) => setTimeout(x, 300));
      }
      r.sobrouPerfil = fs.existsSync(r.perfil);
    }
  };
  return r;
}

async function abrirChrome(nav, porta, rec) {
  rec.perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-geo-'));
  const args = ['--remote-debugging-port=0', '--user-data-dir=' + rec.perfil,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--disable-extensions', '--disable-background-networking',
    '--window-size=1280,900', '--hide-scrollbars',
    'http://127.0.0.1:' + porta + '/__geometria.html'];
  if (!VER) args.unshift('--headless=new');

  try { rec.ch = spawn(nav, args, { stdio: 'ignore' }); }
  catch (e) { infra('o navegador não arrancou: ' + e.message); }
  rec.ch.on('error', () => {});

  /* No Windows o processo que se lança delega e sai logo com 0, portanto
     não se pode esperar por ele nem ler-lhe o stderr. A porta fica
     escrita no DevToolsActivePort, dentro do perfil. */
  const arq = path.join(rec.perfil, 'DevToolsActivePort');
  const limite = Date.now() + PRAZO_PORTA;
  let cdp = null;
  while (Date.now() < limite) {
    /* ── O ARQUIVO EXISTE ANTES DE ESTAR ESCRITO ──

       No Windows o Chrome cria o DevToolsActivePort e escreve-o a
       seguir, e uma leitura que caia no meio disso devolve EBUSY. A
       primeira versão lia sem rede: uma corrida em três saía com falha
       de infraestrutura por causa de uma janela de milissegundos.
       Falhar a leitura é normal aqui — tenta-se outra vez. */
    try {
      if (fs.existsSync(arq)) {
        const linhas = fs.readFileSync(arq, 'utf8').split(NL);
        if (linhas[0] && linhas[1] && +linhas[0] > 0) { cdp = +linhas[0]; break; }
      }
    } catch (e) { /* EBUSY, ENOENT: ainda não está pronto */ }
    await new Promise((r) => setTimeout(r, 120));
  }
  if (!cdp) infra('o navegador não anunciou a porta de depuração em '
    + (PRAZO_PORTA / 1000) + ' s (arrancou? ' + (rec.ch.exitCode === null ? 'ainda vivo' : 'saiu com ' + rec.ch.exitCode) + ')');

  let ver;
  try {
    const resp = await fetch('http://127.0.0.1:' + cdp + '/json/version',
      { signal: AbortSignal.timeout(8000) });
    ver = await resp.json();
  } catch (e) { infra('o /json/version do CDP não respondeu: ' + e.message); }
  if (!ver || !ver.webSocketDebuggerUrl) infra('o CDP não deu webSocketDebuggerUrl');

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  rec.ws = ws;
  const pend = new Map();
  let morto = null;
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new ErroDeInfra('o WebSocket do CDP não abriu em 10 s')), 10000);
    ws.addEventListener('open', () => { clearTimeout(t); res(); });
    ws.addEventListener('error', () => { clearTimeout(t); rej(new ErroDeInfra('o WebSocket do CDP deu erro ao abrir')); });
  });
  /* Se o navegador morrer a meio, todos os comandos pendentes têm de
     falhar como INFRA, e não pendurar o processo para sempre. */
  const matar = (porque) => {
    morto = porque;
    for (const [, rej] of pend) rej(new ErroDeInfra(porque));
    pend.clear();
  };
  ws.addEventListener('close', () => matar('o navegador fechou a ligação do CDP a meio'));
  ws.addEventListener('error', () => matar('a ligação do CDP deu erro a meio'));
  ws.addEventListener('message', (e) => {
    let m; try { m = JSON.parse(e.data); } catch (x) { return; }
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  });

  const cmd = (method, params, sessionId) => new Promise((res, rej) => {
    if (morto) return rej(new ErroDeInfra(morto));
    const n = ++cmd._id;
    const t = setTimeout(() => {
      pend.delete(n);
      rej(new ErroDeInfra('o comando ' + method + ' do CDP não respondeu em '
        + (PRAZO_CDP / 1000) + ' s'));
    }, PRAZO_CDP);
    pend.set(n, (m) => { clearTimeout(t); res(m); });
    pend.get(n).reject = rej;
    try { ws.send(JSON.stringify({ id: n, method, params: params || {}, sessionId })); }
    catch (e) { clearTimeout(t); pend.delete(n); rej(new ErroDeInfra('não consegui enviar ' + method + ': ' + e.message)); }
  });
  cmd._id = 0;

  /* a aba existe antes de os seus scripts correrem, e pode ainda não
     existir no instante em que o WebSocket do navegador abre */
  const limiteAba = Date.now() + PRAZO_ABA;
  let pg = null;
  while (Date.now() < limiteAba) {
    const resp = await cmd('Target.getTargets');
    const alvos = (resp.result && resp.result.targetInfos) || [];
    pg = alvos.find((t) => t.type === 'page' && /__geometria/.test(t.url));
    if (pg) break;
    await new Promise((r) => setTimeout(r, 120));
  }
  if (!pg) infra('a aba da página de ensaio nunca apareceu em ' + (PRAZO_ABA / 1000) + ' s');

  const att = await cmd('Target.attachToTarget', { targetId: pg.targetId, flatten: true });
  if (!att.result || !att.result.sessionId) infra('o CDP não deu sessão para a aba');
  const sid = att.result.sessionId;

  /* ── A RESPOSTA DO CDP, CONFERIDA ──
     A primeira versão fazia r.result.result.value sem olhar: uma
     resposta de erro dava TypeError com uma mensagem que não ajudava
     ninguém. */
  const correr = async (expr) => {
    const r = await cmd('Runtime.evaluate',
      { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    if (!r || typeof r !== 'object') infra('resposta do CDP malformada para Runtime.evaluate');
    if (r.error) infra('o CDP recusou o Runtime.evaluate: '
      + (r.error.message || JSON.stringify(r.error)));
    if (!r.result) infra('o CDP respondeu sem result ao Runtime.evaluate');
    if (r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      throw new Error('erro no navegador: '
        + ((d.exception && d.exception.description) || d.text));
    }
    if (!r.result.result) infra('o CDP respondeu sem result.result');
    return r.result.result.value;
  };
  const correrJson = async (expr) => {
    const t = await correr('JSON.stringify(' + expr + ')');
    if (typeof t !== 'string') throw new Error('o navegador não devolveu JSON para: ' + expr.slice(0, 60));
    try { return JSON.parse(t); } catch (e) { throw new Error('JSON inválido de: ' + expr.slice(0, 60)); }
  };

  /* O fecho gracioso fica anotado nos recursos ANTES de qualquer
     coisa poder falhar a seguir, para o finally de fora poder usá-lo. */
  rec.fecharNavegador = async () => {
    try { await Promise.race([cmd('Browser.close'),
      new Promise((r) => setTimeout(r, 4000))]); } catch (e) {}
  };

  return { correr, correrJson, versao: ver.Browser || '?' };
}

/* ═════════════════════ A MATRIZ ═════════════════════ */

/* Escolhidas por varredura: são as oito que cobrem as oito combinações
   de cauda × asas × tentáculo, e de caminho trazem 6 tipos de corpo, 7
   contagens de braços, 6 tipos de olho e 6 bocas diferentes. A seção F
   exige essa cobertura a cada corrida.

   O primeiro conjunto que escrevi (100, 777, 1234, …) não tinha UMA
   cauda em oito seeds, e a cauda sai em 66,7% dos avatares. Foi a
   asserção da cobertura que o disse — e é por isso que ela está lá: uma
   matriz pode parecer variada e não ser. O gerador do js/data.js é um
   LCG de módulo 233280, e tem estrutura bastante para que oito seeds
   escolhidas a olho caiam todas do mesmo lado de um sorteio. */
const SEEDS = [112, 102, 103, 108, 105, 111, 166, 101];

/* Um nível por fase. A fase sai do nível pelo fuFaseDoNivel, com os
   marcos 5, 11 e 27 (js/ficha-fu.js). */
const NIVEIS = [[1, 0], [7, 1], [15, 2], [40, 3]];
const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const NOMES_FASE = ['bebê', 'jovem', 'adulto', 'ancião'];

const TOL_PES = 1.0;      // o _afAssentar arredonda ao pixel
const TOL_CRESC = 1.0;    // "cresceu", não "cresceu exatamente tanto"
const TOL_TEMPO = 0;      // com as animações congeladas, zero

/* ═════════════════════ A CORRIDA ═════════════════════ */

const rec = criarRecursos();

(async () => {
  /* ── O AUTOTESTE PRIMEIRO, QUE NÃO PRECISA DE NAVEGADOR ── */
  const autoOk = autoteste();
  if (!autoOk) {
    console.log(NL + '  Os comparadores não passaram o próprio autoteste. Nada do que');
    console.log('  vem a seguir significaria coisa alguma, portanto para-se aqui.');
    cortouCedo = 'autoteste reprovou';
    return SAIDA.REPROVADO;
  }
  if (SO_AUTOTESTE) {
    console.log(NL + '  (--so-autoteste: não se abriu navegador nenhum)');
    /* Mesmo aqui o manifesto vale — se uma asserção do autoteste
       desaparecer, a contagem denuncia-a — mas quem o confere é o
       `.then` no fim do arquivo, e só contra a primeira seção. */
    cortouCedo = 'so-autoteste';
    return falhou ? SAIDA.REPROVADO : SAIDA.OK;
  }

  const nav = acharNavegador();
  if (!nav) {
    console.log(NL + '  NÃO HÁ NAVEGADOR AUTOMATIZÁVEL NESTA MÁQUINA.' + NL);
    console.log('  Este teste mede getBBox(), e getBBox() só existe com geometria');
    console.log('  a sério num navegador. Não se simula.' + NL);
    console.log('  Procurou-se em:');
    for (const c of CANDIDATOS) if (c) console.log('    ' + c);
    console.log(NL + '  A alternativa mínima: aponte CHROME_PATH para um Chrome,');
    console.log('  Chromium ou Edge já instalado. Nenhuma dependência de npm');
    console.log('  resolve isto — jsdom e happy-dom não implementam getBBox().');
    console.log(NL + '  Os comparadores foram verificados pelo autoteste acima, mas');
    console.log('  nenhuma medida geométrica foi feita.');
    return SAIDA.INFRA;
  }

  /* ── A CASCATA ── */
  const casc = cascataDoIndex();
  const { srv, porta, naoAchados } = await servir(montarHarness(casc.css));
  rec.srv = srv;

  console.log(NL + '  navegador: ' + nav);
  console.log('  projeto servido em http://127.0.0.1:' + porta + '/');
  console.log('  cascata do index.html: ' + casc.css.length + ' CSS locais'
    + (casc.remotos.length ? ', ' + casc.remotos.length + ' remoto(s) deixado(s) de fora' : '')
    + (casc.ausentes.length ? ', ' + casc.ausentes.length + ' AUSENTE(S)' : ''));

  const B = await abrirChrome(nav, porta, rec);
  console.log('  ' + B.versao + (VER ? '  (com janela)' : '  (headless)'));

  /* ── A PÁGINA ── */
  const limite = Date.now() + PRAZO_PAGINA;
  let temSinal = false;
  while (Date.now() < limite) {
    if (await B.correr("document.readyState !== 'loading' && !!window.__pronto")) { temSinal = true; break; }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!temSinal) infra('a página de ensaio não chegou a correr os seus scripts em '
    + (PRAZO_PAGINA / 1000) + ' s');
  try { await B.correr('window.__pronto'); }
  catch (e) { infra('a página de ensaio não conseguiu carregar o js/arena-fu.js: ' + e.message); }

  const erros = await B.correrJson('window.__erros');
  if (erros.length) infra('a página de ensaio deu erro: ' + erros.slice(0, 2).join(' · '));

  const temTudo = await B.correr(
    "[typeof gerarSVG, typeof fuFaseDoNivel, typeof corpoDoSeed,"
    + " typeof (window.AF&&window.AF._afLutador), typeof (window.AF&&window.AF._afAssentar)].join(',')");
  if (temTudo !== 'function,function,function,function,function')
    infra('faltam funções de produção na página: ' + temTudo);
  console.log('  gerarSVG · fuFaseDoNivel · _afLutador · _afCorpo · _afAssentar  ✓');

  /* ═══════════ 0 · A CASCATA E O CONGELAMENTO ═══════════ */
  secao('cascata', '0 · A CASCATA DE PRODUÇÃO E O CONGELAMENTO DAS ANIMAÇÕES');

  ok(casc.ausentes.length === 0, 'todos os CSS do index.html existem no disco',
     casc.ausentes.length ? 'faltam: ' + casc.ausentes.join(' ') : casc.css.length + ' arquivos');

  const cs = await B.correrJson('window.__cascata()');
  ok(cs.falharam.length === 0 && cs.comHref === casc.css.length,
     'e os ' + casc.css.length + ' entraram todos no navegador',
     cs.falharam.length ? cs.falharam.slice(0, 2).join(' · ')
       : cs.comHref + ' folhas · ' + cs.regras + ' regras · ' + cs.keyframes + ' @keyframes');

  /* O combate-arena.css usa `animation: av-piscar`, e o @keyframes
     av-piscar vive no css/screen.css. Com um CSS só, a animação que o
     jogo tem não existia no teste. Esta asserção é a prova de que a
     cascata está completa onde importa. */
  ok(cs.temAvPiscar === true, 'o @keyframes av-piscar (do screen.css) está resolvido',
     cs.temAvPiscar ? 'a cascata liga combate-arena.css e screen.css' : 'NÃO está — a cascata está truncada');

  ok(naoAchados.length === 0, 'e a página não pediu nada que o servidor não tivesse',
     naoAchados.length ? naoAchados.slice(0, 3).join(' ') : 'zero 404');

  /* ── MEDE-SE TUDO UMA VEZ ── */
  const M = {}, APR = {};
  let contas = 0;
  for (const s of SEEDS) {
    M[s] = {}; APR[s] = {};
    for (const [nv] of NIVEIS) {
      M[s][nv] = {}; APR[s][nv] = {};
      for (const r of RARIDADES) {
        M[s][nv][r] = await B.correrJson('window.__medir(' + s + ',' + nv + ',' + JSON.stringify(r) + ')');
        APR[s][nv][r] = await B.correrJson('window.__partes(' + s + ',' + nv + ',' + JSON.stringify(r) + ')');
        contas++;
      }
    }
  }

  /* O congelamento, confirmado em cada uma das 96 medidas. */
  const geloMau = [], cssVivo = [];
  for (const s of SEEDS) for (const [nv] of NIVEIS) for (const r of RARIDADES) {
    const g = M[s][nv][r].gelo;
    if (!g) { geloMau.push(s + '/' + nv + '/' + r + ': sem relatório de congelamento'); continue; }
    if (g.mal && g.mal.length) geloMau.push(s + '/' + nv + '/' + r + ': ' + g.mal[0]);
    if (!g.svgs) geloMau.push(s + '/' + nv + '/' + r + ': nenhum svg para congelar');
    if (g.quantasVivas) cssVivo.push(s + '/' + nv + '/' + r + ': ' + g.quantasVivas
      + ' (' + (g.animacoesCssVivas || []).join(' ') + ')');
  }
  ok(geloMau.length === 0, 'o SMIL está parado e no instante zero nas ' + contas + ' medidas',
     geloMau.length ? geloMau.slice(0, 2).join(' · ')
       : 'pauseAnimations() + setCurrentTime(0), confirmado por animationsPaused()');
  ok(cssVivo.length === 0, 'e nenhuma animação de CSS ficou viva dentro do campo',
     cssVivo.length ? cssVivo.slice(0, 2).join(' · ') : 'animation: none aplicado, verificado por getComputedStyle');

  /* E a prova que a auditoria exigiu: a MESMA caixa, medida duas vezes
     com 1,5 s pelo meio. Sem congelamento isto dava até 4,16 unidades. */
  const pares = [];
  for (const s of SEEDS) {
    const nv = NIVEIS[3][0];
    const antes = await B.correrJson('window.__medir(' + s + ',' + nv + ',"Comum")');
    await new Promise((r) => setTimeout(r, 1500));
    const depois = await B.correrJson('window.__reler()');
    pares.push({ rotulo: 'seed ' + s + ' ancião', antes, depois });
  }
  afirmar(medidaEstavelNoTempo(pares, TOL_TEMPO),
    'e a mesma caixa, relida 1,5 s depois, não mexeu',
    pares.length + ' seeds × 4 campos · desvio 0 (antes do congelamento: até 4,16)');

  /* ═══════════ 1 · O SVG MEDIDO É O CERTO ═══════════ */
  secao('svg', '1 · O _afAssentar MEDE O SVG DO CORPO, NÃO OUTRO');

  /* O .cb-corpo tem DOIS <svg> desde a 3J.12A: o do corpo e a camada
     que pinta as partículas. O _afAssentar faz querySelector('svg'),
     que devolve o primeiro. Confirma-se em runtime que o primeiro é o
     do corpo e não a camada — se alguém inserir um terceiro svg antes
     dele, isto grita. */
  const svgMau = [];
  for (const s of SEEDS) for (const [nv] of NIVEIS) for (const r of RARIDADES) {
    const e = M[s][nv][r].svgEscolhido;
    if (!e) { svgMau.push(s + '/' + nv + '/' + r + ': sem diagnóstico'); continue; }
    if (e.tag.toLowerCase() !== 'svg') svgMau.push(s + '/' + nv + '/' + r + ': veio um ' + e.tag);
    if (e.eADePart) svgMau.push(s + '/' + nv + '/' + r + ': o primeiro svg é a camada .cb-part');
    if (e.quantosSvgs !== 2) svgMau.push(s + '/' + nv + '/' + r + ': há ' + e.quantosSvgs + ' svg no .cb-corpo, esperam-se 2');
  }
  ok(svgMau.length === 0, 'o primeiro svg do .cb-corpo é o do corpo, e há 2',
     svgMau.length ? svgMau.slice(0, 2).join(' · ') : 'confirmado em runtime nas ' + contas + ' medidas');

  /* ═══════════ 2 · AS INVARIANTES, PELOS COMPARADORES ═══════════ */
  secao('invariantes', '2 · AS INVARIANTES (os mesmos comparadores da negativa)');

  const vLimpo = {
    caixa:     invarianciaDaRaridade(M, SEEDS, NIVEIS, RARIDADES),
    derivadas: derivadasInvariantes(M, SEEDS, NIVEIS, RARIDADES),
    pes:       pesAssentados(M, SEEDS, NIVEIS, RARIDADES, TOL_PES),
    presenca:  presencaForaDaMedida(M, SEEDS, NIVEIS, RARIDADES),
    partes:    partesIndependentesDaRaridade(APR, SEEDS, NIVEIS, RARIDADES),
  };
  afirmar(vLimpo.caixa, 'a caixa do corpo é igual nas três raridades',
    vLimpo.caixa.comparacoes + ' comparações · diferença máxima 0');
  afirmar(vLimpo.derivadas, 'e o empurrão, o --cabeca e as caixas de efeitos também',
    vLimpo.derivadas.comparacoes + ' comparações');
  afirmar(vLimpo.pes, 'os pés assentam na linha do chão',
    vLimpo.pes.comparacoes + ' casos · desvio máximo ' + vLimpo.pes.pior.toFixed(2)
    + 'px (tolerância ' + TOL_PES + ')');
  afirmar(vLimpo.presenca, 'as partículas e a aura ficam fora da medida (display:none)',
    vLimpo.presenca.comparacoes + ' verificações em ' + contas + ' medidas');
  afirmar(vLimpo.partes, 'e nenhuma parte do corpo muda com a raridade',
    vLimpo.partes.comparacoes + ' comparações de parte');

  /* ═══════════ 3 · E AINDA ASSIM A RARIDADE VÊ-SE ═══════════ */
  secao('presenca', '3 · E AINDA ASSIM A RARIDADE CONTINUA A VER-SE');

  /* Se as invariantes passassem porque a raridade deixou de existir,
     não havia nada a celebrar: o ponto da 3J.12A foi tirá-la da MEDIDA,
     não da tela. */
  const crescem = [], naoCrescem = [];
  for (const s of SEEDS) for (const [nv] of NIVEIS) {
    const a = M[s][nv]['Comum'].partPintadas;
    const b = M[s][nv]['Raro'].partPintadas;
    const c = M[s][nv]['Lendário'].partPintadas;
    if (a > 0 && b > a && c > b) crescem.push(s); else naoCrescem.push(s + '/' + nv + ': ' + a + '/' + b + '/' + c);
  }
  ok(naoCrescem.length === 0, 'as partículas pintadas crescem com a raridade, nas ' + (SEEDS.length * NIVEIS.length) + ' células',
     naoCrescem.length ? naoCrescem.slice(0, 2).join(' · ')
       : 'Comum ' + M[SEEDS[0]][15]['Comum'].partPintadas
         + ' · Raro ' + M[SEEDS[0]][15]['Raro'].partPintadas
         + ' · Lendário ' + M[SEEDS[0]][15]['Lendário'].partPintadas);

  const semTinta = [];
  for (const s of SEEDS) for (const [nv] of NIVEIS) for (const r of RARIDADES)
    if (!M[s][nv][r].partNoMedido) semTinta.push(s + '/' + nv + '/' + r);
  ok(semTinta.length === 0, 'e estão lá no svg medido, só não contam',
     semTinta.length ? semTinta.slice(0, 3).join(' ') : 'as partículas existem nas ' + contas + ' medidas');

  /* ═══════════ 4 · A FASE FAZ CRESCER ═══════════ */
  secao('fase', '4 · A FASE FAZ O CORPO CRESCER');

  const genes = {};
  for (const s of SEEDS) genes[s] = await B.correrJson('window.__genes(' + s + ')');

  let iguais01 = [], naoCresceu = [], encolheu = [];
  for (const s of SEEDS) {
    const h = NIVEIS.map(([nv]) => M[s][nv]['Comum'].h);
    if (Math.abs(h[0] - h[1]) > 0.01) iguais01.push('seed ' + s + ': ' + h[0].toFixed(1) + ' vs ' + h[1].toFixed(1));
    if (!(h[2] > h[1] + TOL_CRESC)) naoCresceu.push('seed ' + s + ' ' + h[1].toFixed(1) + '→' + h[2].toFixed(1));
    for (let i = 1; i < h.length; i++)
      if (h[i] < h[i - 1] - 0.01) encolheu.push('seed ' + s + ' fase ' + i + ' ' + h[i - 1].toFixed(1) + '→' + h[i].toFixed(1));
  }
  ok(iguais01.length === 0, 'bebê e jovem medem igual (a mesma linha do FASE_GEO)',
     iguais01.length ? iguais01.slice(0, 2).join(' · ') : SEEDS.length + ' seeds');
  ok(naoCresceu.length === 0, 'de jovem para adulto, a caixa cresce em todas as seeds',
     naoCresceu.length ? naoCresceu.slice(0, 2).join(' · ')
       : SEEDS.map(s => (M[s][15]['Comum'].h - M[s][7]['Comum'].h).toFixed(0)).join(' · ') + ' unidades');
  ok(encolheu.length === 0, 'e a caixa nunca encolhe de uma fase para a seguinte',
     encolheu.length ? encolheu.slice(0, 2).join(' · ') : SEEDS.length * 3 + ' passos de fase');

  /* ── DE ADULTO PARA ANCIÃO, SÓ EM ALGUNS ──

     A caixa inteira é a UNIÃO das partes, e portanto mistura duas
     coisas: se o fator chegou, e qual tinta ficou mais longe do centro
     NESTE bicho. A primeira explicação que escrevi foi "é o tentáculo,
     que não tem fator" — e a medida desmentiu-a: há seeds com
     tentáculos que crescem. Aqui exige-se só o que a união pode
     garantir; a conta de onde o fator chega está na seção 5. */
  const cresceram = SEEDS.filter((s) => M[s][40]['Comum'].h > M[s][15]['Comum'].h + TOL_CRESC);
  ok(cresceram.length > 0, 'de adulto para ancião, a caixa cresce em alguns corpos',
     cresceram.length + ' de ' + SEEDS.length + ' seeds · +'
       + cresceram.map(s => (M[s][40]['Comum'].h - M[s][15]['Comum'].h).toFixed(1)).join(' +')
       + ' — o porquê dos outros está na seção 5');

  /* ═══════════ 5 · ONDE O FATOR DA FASE CHEGA ═══════════ */
  secao('fator', '5 · ONDE O 1,10 DO ANCIÃO CHEGA, PARTE POR PARTE');

  const nv2 = NIVEIS[2][0], nv3 = NIVEIS[3][0];
  const razao = {};
  for (const s of SEEDS) for (const k of Object.keys(APR[s][nv2]['Comum'])) {
    const a = APR[s][nv2]['Comum'][k], b = APR[s][nv3]['Comum'][k];
    if (!b || !a.h) continue;
    (razao[k] = razao[k] || []).push(b.h / a.h);
  }
  const faixa = (k) => { const v = razao[k] || [];
    return v.length ? { n: v.length, min: Math.min(...v), max: Math.max(...v) } : null; };

  const fCh = faixa('av-chifre');
  ok(fCh && fCh.min > 1.0999 && fCh.max < 1.1001, 'o chifre do ancião é 1,100 do adulto',
     fCh ? fCh.n + ' seeds · ' + fCh.min.toFixed(3) + '–' + fCh.max.toFixed(3) : 'não apareceu');

  /* ── O CORPO CRESCE, MAS NÃO 1,10 ──

     Escrevi primeiro `min > 1.05` para o corpo, a contar com o mesmo
     1,10 do chifre, e a medida devolveu uns 1,03. A asserção estava a
     afirmar uma expectativa minha e não um comportamento do código.

     A razão é a forma do cP: cP(v) = 100 + (v−100) × 1,10, uma
     expansão em volta de 100. Um ponto a 105 vai a 105,5; um a 38 vai
     a 31,8. Quanto o corpo cresce depende de quão longe de 100 estão os
     seus extremos — e os do corpo estão perto. O chifre usa cH, que
     multiplica o valor todo, e por isso faz 1,10 redondo.

     Não se corrige nada: isto é a 3J.4 e esta etapa é o teste. */
  const fCo = faixa('av-corpo');
  ok(fCo && fCo.min > 1.0 && fCo.max < 1.08,
     'ACHADO: o corpo cresce uns 3% e não os 10% do FASE_GEO',
     fCo ? fCo.n + ' seeds · ' + fCo.min.toFixed(3) + '–' + fCo.max.toFixed(3)
           + ' — cP expande em volta de 100, cH multiplica' : 'não apareceu');

  /* ── ACHADO, PRENDIDO ──

     Estas partes não têm fator nenhum no js/data.js (asa, tentáculo,
     olho, boca), ou têm um que vale 1 em todas as linhas do FASE_GEO
     (a cauda, via tE), ou têm um que só entra no x (o braço, via mE).
     Medem igual no adulto e no ancião, e quando alguma delas está no
     extremo da caixa é ela que decide o tamanho do bicho.

     Passa HOJE. No dia em que uma delas ganhar fator, FALHA — e falha
     de propósito: a correção é bem-vinda, mas não deve entrar sem que
     este teste venha com ela. */
  const SEM_FATOR = ['av-asa', 'av-tentaculo', 'av-olho', 'av-boca',
                     'av-cauda', 'av-mancha', 'av-braco', 'av-membro'];
  const mexeram = [], vistas = [];
  for (const k of SEM_FATOR) {
    const f = faixa(k);
    if (!f) continue;
    vistas.push(k);
    if (f.min < 0.999 || f.max > 1.001) mexeram.push(k + ' ' + f.min.toFixed(3) + '–' + f.max.toFixed(3));
  }
  ok(mexeram.length === 0 && vistas.length >= 6,
     'ACHADO: as partes sem fator não crescem de adulto para ancião',
     mexeram.length ? 'MUDOU: ' + mexeram.join(' · ') + ' — atualize este teste e o relatório'
       : vistas.join(' ').replace(/av-/g, '') + ' · razão 1,000 exata');

  const FATOR = { 'av-corpo': 'cP, cR', 'av-chifre': 'cH', 'av-espinho': 'cH (não chega)',
                  'av-braco': 'mE (só no x)', 'av-membro': 'mE (só no x)',
                  'av-cauda': 'tE (=1 em toda fase)', 'av-asa': '— nenhum',
                  'av-tentaculo': '— nenhum', 'av-olho': '— nenhum',
                  'av-olho-un': '— nenhum', 'av-boca': '— nenhum', 'av-mancha': '— nenhum' };
  console.log('');
  console.log('     parte          seeds  adulto  ancião   razão          fator no js/data.js');
  for (const k of Object.keys(razao).sort()) {
    const f = faixa(k);
    const s0 = SEEDS.find((q) => APR[q][nv2]['Comum'][k] && APR[q][nv2]['Comum'][k].h);
    const a = s0 ? APR[s0][nv2]['Comum'][k] : null, b = s0 ? APR[s0][nv3]['Comum'][k] : null;
    console.log('     ' + k.padEnd(15) + String(f.n).padStart(4)
      + (a ? a.h.toFixed(1) : '—').padStart(8) + (b ? b.h.toFixed(1) : '—').padStart(8)
      + '   ' + f.min.toFixed(3) + '–' + f.max.toFixed(3)
      + '   ' + (FATOR[k] || '?'));
  }

  /* ═══════════ 6 · A AMOSTRA ═══════════ */
  secao('amostra', '6 · A AMOSTRA NÃO É OITO VEZES O MESMO BICHO');

  const chaves = Object.keys(genes[SEEDS[0]]);
  const variam = chaves.filter(k => new Set(SEEDS.map(s => String(genes[s][k]))).size > 1);
  ok(variam.length >= 8, 'os traços do corpo variam entre as seeds',
     variam.length + ' de ' + chaves.length + ' variam: ' + variam.join(' '));

  const doisEstados = ['cauda', 'asas', 'tent'].filter(
    k => new Set(SEEDS.map(s => !!genes[s][k])).size === 2);
  ok(doisEstados.length === 3, 'e a cauda, as asas e os tentáculos aparecem com e sem',
     doisEstados.length === 3
       ? 'tent: ' + SEEDS.filter(s => genes[s].tent).length + ' com, '
         + SEEDS.filter(s => !genes[s].tent).length + ' sem'
       : 'só variam: ' + doisEstados.join(' '));

  console.log('');
  console.log('    seed   corpo olhos olho braços chifres cauda  asas  tent esp boca');
  for (const s of SEEDS) {
    const g = genes[s];
    const sn = (b) => b ? ' sim' : '  —';
    console.log('   ' + String(s).padStart(6) + String(g.corpo).padStart(6)
      + String(g.olhos).padStart(6) + String(g.olho).padStart(5) + String(g.bracos).padStart(7)
      + String(g.chifres).padStart(8) + sn(g.cauda).padStart(6) + sn(g.asas).padStart(6)
      + sn(g.tent).padStart(6) + String(g.esp).padStart(4) + String(g.boca).padStart(5));
  }

  /* ═══════════ 7 · A VERIFICAÇÃO NEGATIVA ═══════════ */
  secao('negativa', '7 · A VERIFICAÇÃO NEGATIVA (os comparadores da seção 2)');

  /* ── O QUE ESTA SEÇÃO FAZ, E O QUE A ANTERIOR NÃO FAZIA ──

     Recria-se o estado anterior à 3J.12A com uma regra de CSS: as
     partículas voltam ao <svg> que é medido. Depois chamam-se OS MESMOS
     comparadores da seção 2 — não um laço paralelo — e exige-se que
     eles passem de 'aprovado' a 'violado'.

     A primeira versão tinha aqui o seu próprio laço de comparação, e
     por isso provava que a MEDIÇÃO era sensível, nunca que o
     COMPARADOR estava vivo: a mutação que fazia a seção 2 comparar o
     Comum consigo mesmo passava com 23/0. Agora um comparador cego
     aprova a matriz contaminada e reprova nesta linha. */
  await B.correr(`(() => {
    const e = document.createElement('style');
    e.id = 'quebra';
    e.textContent = '.cb-corpo svg:not(.cb-part) .av-particula { display: initial !important; }';
    document.head.appendChild(e);
    return true;
  })()`);

  const MQ = {}, APRQ = {};
  for (const s of SEEDS) {
    MQ[s] = {}; APRQ[s] = {};
    for (const [nv] of NIVEIS) {
      MQ[s][nv] = {}; APRQ[s][nv] = {};
      for (const r of RARIDADES) {
        MQ[s][nv][r] = await B.correrJson('window.__medir(' + s + ',' + nv + ',' + JSON.stringify(r) + ')');
        APRQ[s][nv][r] = await B.correrJson('window.__partes(' + s + ',' + nv + ',' + JSON.stringify(r) + ')');
      }
    }
  }

  afirmarQueReprova(invarianciaDaRaridade(MQ, SEEDS, NIVEIS, RARIDADES),
    'com as partículas na medida, a caixa acusa', 'unidades');
  afirmarQueReprova(derivadasInvariantes(MQ, SEEDS, NIVEIS, RARIDADES),
    'e o empurrão e o --cabeca também');
  afirmarQueReprova(presencaForaDaMedida(MQ, SEEDS, NIVEIS, RARIDADES),
    'e o display das partículas deixa de ser none');
  afirmarQueReprova(partesIndependentesDaRaridade(APRQ, SEEDS, NIVEIS, RARIDADES),
    'e uma parte do corpo passa a variar com a raridade');

  /* O assentamento NÃO é acusado por esta contaminação, e é importante
     dizê-lo em vez de o esconder: o _afAssentar põe a tinta no chão
     seja qual for a caixa, portanto os pés continuam assentes. Quem
     prova que o pesAssentados sabe reprovar é o autoteste, com uma
     matriz sintética em que a tinta sai do chão. */
  const vPesQ = pesAssentados(MQ, SEEDS, NIVEIS, RARIDADES, TOL_PES);
  ok(vPesQ.estado === 'aprovado',
     'os pés continuam assentes mesmo contaminados (como se espera)',
     'o _afAssentar corrige a caixa que lhe derem · desvio ' + vPesQ.pior.toFixed(2) + 'px');

  /* ── E DE VOLTA AO NORMAL ──
     Uma quebra que não se desfaz deixa de ser verificação e passa a ser
     dúvida sobre tudo o que vinha antes. */
  await B.correr(`(() => { const e = document.getElementById('quebra');
    if (!e) throw new Error('o <style id=quebra> desapareceu antes de eu o tirar');
    e.remove(); return !document.getElementById('quebra'); })()`);

  const MV = {};
  for (const s of SEEDS) { MV[s] = {};
    for (const [nv] of NIVEIS) { MV[s][nv] = {};
      for (const r of RARIDADES)
        MV[s][nv][r] = await B.correrJson('window.__medir(' + s + ',' + nv + ',' + JSON.stringify(r) + ')'); } }

  afirmar(invarianciaDaRaridade(MV, SEEDS, NIVEIS, RARIDADES),
    'tirada a regra, a invariância volta',
    'os comparadores sabem reprovar e sabem aprovar');
  afirmar(presencaForaDaMedida(MV, SEEDS, NIVEIS, RARIDADES),
    'e o display volta a none', 'estado restaurado');

  /* ═══════════ O RELATÓRIO ═══════════ */
  tit('A CAIXA DA TINTA, FASE A FASE');
  const parado = SEEDS.find((q) => cresceram.indexOf(q) === -1);
  for (const s of [cresceram[0], parado]) {
    if (s === undefined) continue;
    console.log('');
    console.log('   seed ' + s + (cresceram.indexOf(s) !== -1
      ? '  (a caixa CRESCE no ancião)' : '  (a caixa fica PARADA no ancião)'));
    console.log('     fase        viewBox      y     altura  largura    pés    quem faz o topo');
    for (const [nv, fase] of NIVEIS) {
      const m = M[s][nv]['Comum'];
      const x = await B.correrJson('window.__extremos(' + s + ',' + nv + ',"Comum")');
      console.log('     ' + NOMES_FASE[fase].padEnd(8) + String(m.vb).padStart(12)
        + m.y.toFixed(1).padStart(7) + m.h.toFixed(1).padStart(9)
        + m.w.toFixed(1).padStart(8) + (m.fundoDaTinta - m.chao).toFixed(2).padStart(8) + 'px'
        + '   ' + x.topo);
    }
  }

  return falhou ? SAIDA.REPROVADO : SAIDA.OK;
})().then(async (codigo) => {
  await rec.limpar();

  /* ── O MANIFESTO CONFERE-SE AQUI, E NÃO LÁ DENTRO ──

     Estava dentro do corpo da corrida, e a 3J.17C-R3 mostrou o furo: um
     `return` cedo — o mesmo que apaga a seção negativa — saltava por
     cima da conferência, e o teste dava 61/0 com saída 0. Posta aqui,
     no caminho de SAÍDA, ela corre aconteça o que acontecer dentro: um
     `return` no corpo não a evita, porque ela está depois dele.

     NÃO se exige o manifesto quando as seções não correram por razão
     legítima: falha de infraestrutura (saída 3) ou corte deliberado. Nos
     dois casos o código de saída já está certo e acrescentar erros de
     contagem só esconderia a causa. */
  if (codigo !== SAIDA.INFRA) {
    const qual = cortouCedo === 'so-autoteste' ? MANIFESTO_SO_AUTOTESTE
               : cortouCedo ? null : MANIFESTO;
    if (qual && conferirManifesto(qual)) codigo = SAIDA.REPROVADO;
  }

  console.log(NL + '─'.repeat(COL + 12));
  console.log(passou + ' passaram · ' + falhou + ' falharam');
  if (rec.sobrouPerfil) console.log('AVISO: o perfil temporário não saiu: ' + rec.perfil);
  console.log('saída ' + codigo + ' · ' + (codigo === SAIDA.OK ? 'aprovado'
    : codigo === SAIDA.REPROVADO ? 'reprovado por asserção' : 'falha de infraestrutura'));
  process.exit(codigo);
}).catch(async (e) => {
  await rec.limpar();
  const ehInfra = e instanceof ErroDeInfra;
  console.log(NL + (ehInfra ? '  FALHA DE INFRAESTRUTURA: ' : '  O TESTE REBENTOU: ') + e.message);
  if (!ehInfra && e.stack) console.log(e.stack.split(NL).slice(1, 4).join(NL));
  console.log('');
  if (passou || falhou) console.log(passou + ' passaram · ' + falhou + ' falharam (incompleto)');
  if (rec.sobrouPerfil) console.log('AVISO: o perfil temporário não saiu: ' + rec.perfil);
  /* Uma falha de infraestrutura NÃO é reprovação geométrica, e um
     rebentamento do próprio teste também não é aprovação. */
  const codigo = ehInfra ? SAIDA.INFRA : SAIDA.INFRA;
  console.log('saída ' + codigo + ' · ' + (ehInfra ? 'falha de infraestrutura'
    : 'o teste não chegou ao fim — trata-se como infraestrutura, não como aprovação'));
  process.exit(codigo);
});
