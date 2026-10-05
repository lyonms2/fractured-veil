#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A RARIDADE COMO ESTADO CONQUISTADO

     node tools/testar-raridade.js

   A etapa 3H separou três coisas que eram a mesma: o NÍVEL, que é
   progressão; a FASE, que é ciclo de vida; e a RARIDADE, que é
   conquista. Antes dela, as três saíam do mesmo número e dos mesmos
   dois degraus (11 e 27) — eram um número com três nomes.

   Esta ferramenta prova a parte que a 3H construiu:

     1. a raridade é um estado GUARDADO, com histórico
     2. o nível não a promove, e a fase não a promove
     3. todo avatar nasce Comum
     4. o cliente não a altera
     5. o desenho e a ficha leem a MESMA fonte
     6. a compra preserva, sem recalcular

   ── O QUE ELA AINDA NÃO PROVA ──

   Que alguém SOBE de raridade. O exame que promove Comum → Raro →
   Lendário é etapa própria e não existe: enquanto não existir, o mapa
   `raridades` vem vazio e quem responde é o recuo LEGADO
   Comum, e nada mais: a conta pelo nível saiu na etapa 3I.12.

   Por isso os testes abaixo escrevem registros à mão no mapa. É assim
   que se prova uma arquitetura antes de o produtor dela existir: dá-se
   o valor e confere-se que o caminho inteiro o respeita.
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const G   = require('../js/magias-fu.js');
const RAR = require('../js/raridades.js');
const RVELHO = require('../js/raridade.js');

let ok = 0, mau = 0;
const falhas = [];
function conferir(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + JSON.stringify(detalhe) : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

/* Um slot de verdade, com certidão. `reconhecida` é o que o servidor
   reconheceria — é o campo que o carregamento escreve a partir do mapa
   (js/firebase.js), e que a ficha lê. */
function slot(nivel, opcoes) {
  const o = opcoes || {};
  const c = GEN.certidaoDeInvocacao({ uid: 'h', nome: 'T' });
  const seed = o.seed || 7919;
  c.seed = seed; c.nascimento.seed = seed;
  c.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  const s = { id: o.id || 'av1', nome: 'T', seed, nivel, nascimento: c.nascimento };
  if (o.raridade !== undefined) s.raridade = o.raridade;
  if (o.reconhecida !== undefined) s.raridadeReconhecida = o.reconhecida;
  return s;
}

/* ═══ 1 · AS DUAS LISTAS BATEM ═══════════════════════════════════ */
titulo('As três raridades, nos dois arquivos');
{
  conferir('o js/raridades.js tem três', RAR.RARIDADES.length === 3, RAR.RARIDADES);
  conferir('e são Comum, Raro, Lendário',
    RAR.RARIDADES.join(',') === 'Comum,Raro,Lendário', RAR.RARIDADES);
  conferir('o js/ficha-fu.js diz o mesmo',
    F.FU_RARIDADES.join(',') === RAR.RARIDADES.join(','),
    [F.FU_RARIDADES, RAR.RARIDADES]);
  conferir('e o grau é a posição na lista',
    RAR.rarGrau('Comum') === 0 && RAR.rarGrau('Raro') === 1
    && RAR.rarGrau('Lendário') === 2 && RAR.rarGrau('xis') === 0);
  // e o js/raridade.js antigo continua a concordar, enquanto existir
  conferir('o js/raridade.js antigo concorda nos graus',
    ['Comum', 'Raro', 'Lendário'].every(r => RVELHO.grauDaRaridade(r) === RAR.rarGrau(r)));
}

/* ═══ 2 · A RARIDADE É UM ESTADO GUARDADO ════════════════════════ */
titulo('A raridade guardada vence o legado');
{
  const mapa = { av1: { atual: 'Lendário', historico: [{ para: 'Lendário', em: 1, por: 'exame' }] } };
  conferir('o mapa responde', RAR.rarGuardada(mapa, 'av1') === 'Lendário');
  conferir('e o rarDe prefere-o ao legado',
    RAR.rarDe(mapa, 'av1', 'Comum') === 'Lendário');
  /* ── SEM REGISTRO, É COMUM ──

     Era "recua para o legado" até a etapa 3I.12, e o legado era a conta
     pelo nível. Agora não há recuo: um avatar sem certificação é Comum,
     tenha o nível que tiver. */
  conferir('sem registro no mapa, o rarDe devolve Comum',
    RAR.rarDe({}, 'av1') === 'Comum');
  conferir('e nem um terceiro argumento o demove',
    RAR.rarDe({}, 'av1', 'Lendário') === 'Comum'
    && RAR.rarDe({}, 'av1', 'Raro') === 'Comum');
  conferir('com registro, o mapa manda',
    RAR.rarDe({ av1: { atual: 'Lendário', historico: [] } }, 'av1') === 'Lendário');
  conferir('e um id que não está no mapa é Comum',
    RAR.rarDe({ av1: { atual: 'Lendário', historico: [] } }, 'outro') === 'Comum');
  for (const lixo of [null, undefined, 0, 'x', [], { av1: null },
                      { av1: 'Raro' }, { av1: {} }, { av1: { atual: 'Mítico' } }])
    conferir('mapa estragado devolve Comum (' + JSON.stringify(lixo) + ')',
      RAR.rarDe(lixo, 'av1') === 'Comum');

}

/* ═══ 4 · O NÍVEL NÃO DETERMINA A RARIDADE ═══════════════════════ */
titulo('Nível × Raridade: as doze combinações');
{
  /* A prova de independência: para CADA raridade e CADA nível, a ficha
     tem de sair com aquela raridade. Antes da 3H isto era impossível —
     a ficha calculava a raridade do nível e ignorava tudo o resto. */
  for (const r of RAR.RARIDADES) {
    for (const n of [1, 10, 30, 60]) {
      const f = F.fuFicha(slot(n, { reconhecida: r }));
      conferir(r + ' no nível ' + n + ' é estruturalmente válido',
        !!f && f.raridade === r, f && { nivel: f.nivel, raridade: f.raridade });
      conferir('e o nível continua ' + n, !!f && f.nivel === n, f && f.nivel);
    }
  }
  /* E o contrário: o MESMO nível com as três raridades dá três fichas
     diferentes — se desse a mesma, a raridade não estaria a ser lida. */
  const porRar = RAR.RARIDADES.map(r => F.fuFicha(slot(30, { reconhecida: r })));
  /* O PV só muda no Lendário (+80, em js/ficha-fu.js): Comum e Raro
     partilham a fórmula. A primeira versão deste teste exigia três
     valores diferentes e acusava o motor de não ler a raridade — o
     defeito era do teste. O que distingue as TRÊS é o dano extra. */
  conferir('o Lendário tem mais PV que o Comum',
    porRar[2].pvMax > porRar[0].pvMax, porRar.map(f => f.pvMax));
  conferir('e a Defesa do Lendário sobe',
    porRar[2].defesaDegrau === 2 && porRar[0].defesaDegrau === 0,
    porRar.map(f => f.defesaDegrau));
  conferir('e três danos extras diferentes',
    new Set(porRar.map(f => f.danoExtra)).size === 3, porRar.map(f => f.danoExtra));
}

/* ═══ 5 · A FASE NÃO DETERMINA A RARIDADE ════════════════════════ */
titulo('Fase × Raridade: as doze combinações');
{
  /* A fase continua a sair do nível (fuFaseDoNivel) — isso é ciclo de
     vida e a 3H não mexeu nele. O que se prova aqui é que a fase não
     manda na raridade: um BEBÊ pode ser Lendário e um ANCIÃO pode ser
     Comum. */
  const NIVEL_DA_FASE = [1, 5, 11, 27];   // BEBÊ, JOVEM, ADULTO, ANCIÃO
  const NOME_FASE = ['Bebê', 'Jovem', 'Adulto', 'Ancião'];
  for (const r of RAR.RARIDADES) {
    for (let fase = 0; fase < 4; fase++) {
      const n = NIVEL_DA_FASE[fase];
      const f = F.fuFicha(slot(n, { reconhecida: r }));
      conferir(r + ' + ' + NOME_FASE[fase] + ' é válido',
        !!f && f.raridade === r, f && f.raridade);
      conferir('e a fase continua ' + NOME_FASE[fase],
        F.fuFaseDoNivel(n) === fase, F.fuFaseDoNivel(n));
    }
  }
  /* A tabela que mapeava fase → raridade continua no js/raridade.js e
     não é chamada por ninguém. Fica a conferição para o dia em que
     alguém a religar sem reparar. */
  conferir('o RARIDADE_POR_FASE do js/raridade.js continua sem chamador',
    (() => {
      const fs = require('fs');
      let usos = 0;
      for (const d of ['js', 'api']) {
        for (const a of fs.readdirSync(__dirname + '/../' + d)) {
          if (!a.endsWith('.js') || a === 'raridade.js') continue;
          const t = fs.readFileSync(__dirname + '/../' + d + '/' + a, 'utf8');
          if (/raridadeDaFase\s*\(|RARIDADE_POR_FASE/.test(t)) usos++;
        }
      }
      return usos === 0;
    })());
}

/* ═══ 6 · A RARIDADE NÃO DETERMINA A MAGIA SOZINHA ═══════════════ */
titulo('Raridade × Magia: o degrau é lido, e não imposto');
{
  /* A raridade escolhe o DEGRAU de cada lugar (fuDegrau, em
     js/magias-fu.js) — isso é o motor e a 3H não mexe nele. O que se
     prova é que o degrau segue a raridade GUARDADA, e não o nível: um
     avatar de nível 1 reconhecido como Lendário tem as magias de
     Lendário. */
  const bebeLendario = F.fuFicha(slot(1, { reconhecida: 'Lendário' }));
  const anciaoComum  = F.fuFicha(slot(60, { reconhecida: 'Comum' }));
  conferir('um nível 1 Lendário tem o Gesto', !!G.fuMagiasDe(bebeLendario).gesto,
    Object.keys(G.fuMagiasDe(bebeLendario)));
  conferir('e um nível 60 Comum não tem', !G.fuMagiasDe(anciaoComum).gesto,
    Object.keys(G.fuMagiasDe(anciaoComum)));
  conferir('o degrau sai da raridade', G.fuDegrau(bebeLendario.raridade) === 3
    && G.fuDegrau(anciaoComum.raridade) === 1);
  /* E a raridade não é SINÓNIMO do repertório: o mesmo Lendário com
     feitios diferentes tem lugares diferentes. É o que deixa o sistema
     de magia ter progressão própria mais tarde. */
  const lugares = new Set();
  for (let s = 1; s <= 200; s++) {
    const f = F.fuFicha(slot(30, { reconhecida: 'Lendário', seed: s * 7919, id: 'a' + s }));
    if (f) lugares.add(Object.keys(G.fuMagiasDe(f)).join(','));
  }
  conferir('o mesmo Lendário tem repertórios diferentes conforme o feitio',
    lugares.size >= 3, [...lugares]);
}

/* ═══ 7 · TODO AVATAR NASCE COMUM ════════════════════════════════ */
titulo('O nascimento: todo filho nasce Comum');
{
  const fs = require('fs');
  /* Os dois lugares que montam um avatar novo. Confere-se o CÓDIGO e
     não só o comportamento: é o literal 'Comum' que tem de estar lá. */
  const nasc = fs.readFileSync(__dirname + '/../js/nascimento.js', 'utf8');
  const pool = fs.readFileSync(__dirname + '/../api/pool.js', 'utf8');
  /* Tiram-se os comentários ANTES de procurar. A primeira versão
     filtrava linha a linha e apanhou um `raridade:'Lendário'` que está
     dentro de um comentário do api/pool.js — a explicar justamente o
     buraco que aquele campo era. O defeito era do teste. */
  const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const literais = (t) => semComentarios(t).match(/raridade\s*:\s*'([^']*)'/g) || [];
  conferir('o js/nascimento.js só escreve Comum',
    literais(nasc).every(l => /'Comum'/.test(l)), literais(nasc));
  conferir('o api/pool.js só escreve Comum',
    literais(pool).every(l => /'Comum'/.test(l)), literais(pool));

  /* E a prova de comportamento: cruzando pais de todas as raridades, o
     filho sai Comum. A raridade NÃO é herdada — não está no DNA e não
     entra na cruza. */
  /* CHAMA O `nascer()` DE VERDADE. A primeira versão montava o filho à
     mão, com `raridade: 'Comum'` escrito no próprio teste — e assim
     ele confirmava a si mesmo: mutar o js/nascimento.js para o filho
     herdar a raridade do pai não fazia falhar nada. */
  let filhos = 0, naoComuns = 0, semRaridade = 0;
  for (const rPai of RAR.RARIDADES) for (const rMae of RAR.RARIDADES) {
    for (let s = 1; s <= 12; s++) {
      const dnaPai = GEN.nascimento.gerarDna('Comum', s * 101);
      const dnaMae = GEN.nascimento.gerarDna('Comum', s * 211);
      /* O que o jogo monta ao chocar. Passa-se a raridade dos pais nas
         opções: se o nascimento alguma vez a ler, o filho sai diferente
         de Comum e este teste cai. */
      const nasc = GEN.nascimento.nascer({
        seed: s * 313, dna: dnaPai, raridadePai: rPai, raridadeMae: rMae,
        mae: 'm' + s, pai: 'p' + s,
      });
      filhos++;
      if (!nasc || nasc.raridade === undefined) { semRaridade++; continue; }
      if (nasc.raridade !== 'Comum') { naoComuns++; continue; }
      // e a ficha do filho, montada do registro real, também é Comum
      const f = F.fuFicha({ id: 'f' + s, nome: 'F', seed: s * 313, nivel: 1,
                            raridade: nasc.raridade,
                            nascimento: { seed: s * 313, dna: nasc.dna || dnaPai } });
      if (!f || f.raridade !== 'Comum') naoComuns++;
    }
  }
  conferir('o nascer() devolve sempre uma raridade', semRaridade === 0,
    semRaridade + ' sem raridade');
  conferir('e a raridade dos pais não entra no registro do filho',
    !/Raro|Lend/.test(JSON.stringify(GEN.nascimento.nascer({
      seed: 7919, dna: GEN.nascimento.gerarDna('Comum', 7919),
      raridadePai: 'Lendário', raridadeMae: 'Lendário' }))));
  conferir('as nove combinações de pais dão ' + filhos + ' filhos, todos Comuns',
    naoComuns === 0, naoComuns + ' não eram Comuns');
  conferir('e a raridade não aparece no DNA',
    !/raridade/.test(JSON.stringify(GEN.nascimento.gerarDna('Comum', 7919))));
}

/* ═══ 8 · A AUTORIDADE ═══════════════════════════════════════════ */
titulo('O cliente não promove ninguém');
{
  /* O campo `slot.raridade` é o que o cliente grava (está na lista de
     campos do save, em js/firebase.js). A ficha NÃO o lê. */
  for (const forjada of ['Raro', 'Lendário']) {
    const base = F.fuFicha(slot(1, { raridade: 'Comum' }));
    const forj = F.fuFicha(slot(1, { raridade: forjada }));
    conferir('forjar slot.raridade=' + forjada + ' não muda a raridade da ficha',
      forj.raridade === base.raridade && forj.raridade === 'Comum', forj.raridade);
    for (const campo of ['pvMax', 'pmMax', 'danoExtra', 'defesaDegrau', 'crise'])
      conferir('nem o ' + campo, forj[campo] === base[campo], [base[campo], forj[campo]]);
    conferir('nem as magias (' + forjada + ')',
      Object.keys(G.fuMagiasDe(forj)).join(',') === Object.keys(G.fuMagiasDe(base)).join(','));
    conferir('nem as afinidades (' + forjada + ')',
      JSON.stringify(forj.afinidades) === JSON.stringify(base.afinidades));
  }
  /* E o campo que a ficha LÊ não é gravado pelo cliente: não está na
     lista de campos que o save manda. Se alguém o puser lá, isto
     falha — e é exatamente aí que a blindagem se perderia. */
  const fb = require('fs').readFileSync(__dirname + '/../js/firebase.js', 'utf8');
  const bloco = fb.slice(fb.indexOf('// Avatar identity'), fb.indexOf('// Avatar identity') + 2600);
  conferir('o save NÃO grava raridadeReconhecida', !/raridadeReconhecida\s*:/.test(bloco));
  conferir('o campo `raridades` está nas regras do Firestore',
    /'raridades'/.test(require('fs').readFileSync(__dirname + '/../firestore.rules', 'utf8')));
  /* O mapa é um campo de topo protegido: o cliente não o escreve, e o
     carregamento é que o resolve em cada slot. */
  conferir('e o carregamento chama o rarResolver sem legado nenhum',
    /rarCarregar\(data\.raridades\)/.test(fb)
    && /rarResolver\(_raridades, restored\)/.test(fb)
    && !/rarResolver\([^)]*fuRaridadeDoNivel/.test(fb));
}

/* ═══ 9 · UMA FONTE SÓ, PARA A FICHA E PARA O DESENHO ════════════ */
titulo('A ficha e o desenho leem a mesma raridade');
{
  const fb = require('fs').readFileSync(__dirname + '/../js/firebase.js', 'utf8');
  /* O carregamento e o teste chamam a MESMA função — o `rarResolver`,
     que escreve os dois campos. Enquanto esta linha existir, quebrar o
     carregamento faz falhar os testes de persistência e de visual, que
     também passam por lá. */
  conferir('o carregamento usa o rarResolver, e não uma cópia da regra',
    /rarResolver\(/.test(fb) && !/restored\.raridadeReconhecida\s*=/.test(fb));
  /* Dos três escritores do campo que havia antes da 3H, sobrou um. O
     js/gametick.js e o sincronizarRaridades saíram. */
  const gt = require('fs').readFileSync(__dirname + '/../js/gametick.js', 'utf8');
  conferir('o js/gametick.js não escreve mais a raridade',
    !/avatar\.raridade\s*=/.test(gt));
  conferir('e o sincronizarRaridades não corre no carregamento',
    !/sincronizarRaridades\(avatarSlots\)/.test(fb));

  /* A prova do comportamento: o espelho que o desenho lê e a raridade
     que a ficha usa têm de ser o mesmo valor, em todos os casos. */
  const casos = [];
  for (const r of [null, 'Comum', 'Raro', 'Lendário'])
    for (const n of [1, 10, 30, 60])
      for (const forjada of ['Comum', 'Lendário'])
        casos.push({ r, n, forjada });
  let divergiram = 0;
  for (const c of casos) {
    const bruto = slot(c.n, { raridade: c.forjada });
    const mapa = c.r === null ? {} : { [bruto.id]: { atual: c.r, historico: [] } };
    /* O MESMO caminho do carregamento: o rarResolver escreve os dois
       campos, e a ficha lê o seu. Se o espelho e a ficha discordarem, o
       bicho desenha-se com um corpo que a ficha dele não tem — que foi
       exatamente o que a etapa 3H mediu antes desta mudança. */
    const s = RAR.rarResolver(mapa, bruto);
    if (s.raridade !== F.fuFicha(s).raridade) divergiram++;
  }
  conferir('nos ' + casos.length + ' casos, o espelho e a ficha dizem o mesmo',
    divergiram === 0, divergiram + ' divergiram');
}

/* ═══ 10 · A PERSISTÊNCIA ════════════════════════════════════════ */
titulo('A raridade sobrevive ao que acontece ao avatar');
{
  const mapa = { av1: { atual: 'Raro', historico: [{ para: 'Raro', em: 1, por: 'exame' }] } };
  /* CHAMA O CÓDIGO DE VERDADE, e não uma cópia dele. A primeira versão
     deste teste reimplementava aqui o que o carregamento faz
     (js/firebase.js) — e com isso quebrar o carregamento não fazia
     falhar teste nenhum: três mutações passaram incólumes. O
     `rarResolver` existe para os dois exercitarem a mesma função. */
  const resolver = (s) => RAR.rarResolver(mapa, Object.assign({}, s));
  // o que o cliente gravaria, sem o campo reconhecido
  const gravado = { id: 'av1', nome: 'T', seed: 7919, nivel: 1, raridade: 'Comum',
                    nascimento: slot(1).nascimento };
  for (const [nome, mudanca] of [
    ['um refresh',            s => Object.assign({}, s)],
    ['subir de nível',        s => Object.assign({}, s, { nivel: 30 })],
    ['passar de fase',        s => Object.assign({}, s, { nivel: 27 })],
    ['uma batalha',           s => Object.assign({}, s, { xp: 999 })],
    ['adoecer',               s => Object.assign({}, s, { sick: true })],
    ['o cliente forjar Comum', s => Object.assign({}, s, { raridade: 'Comum' })],
    ['o cliente forjar Lendário', s => Object.assign({}, s, { raridade: 'Lendário' })],
  ]) {
    const depois = resolver(mudanca(gravado));
    conferir('depois de ' + nome + ', continua Raro',
      depois.raridade === 'Raro' && F.fuFicha(depois).raridade === 'Raro',
      depois.raridade);
  }
  conferir('e o histórico continua inteiro',
    RAR.rarHistorico(mapa, 'av1').length === 1
    && RAR.rarHistorico(mapa, 'av1')[0].por === 'exame');
}

/* ═══ 11 · O MERCADO ═════════════════════════════════════════════ */
titulo('A compra preserva, e não recalcula');
{
  const ca = require('fs').readFileSync(__dirname + '/../api/comprar-avatar.js', 'utf8');
  conferir('a compra copia o registro do vendedor',
    /sellerData\.raridades/.test(ca) && /chaveRar/.test(ca), null);
  conferir('e apaga-o do vendedor', /\[chaveRar\]:\s*FieldValue\.delete\(\)/.test(ca));
  conferir('o anúncio pergunta ao rarDe, e não recalcula do nível',
    /RAR\.rarDe\(pData\.raridades/.test(ca));
  conferir('e nunca lê a raridade do avatarSlots para o anúncio',
    !/raridadeReal\s*=\s*[^;]*s\.raridade\s*\|\|/.test(
      ca.slice(ca.indexOf('const raridadeReal'), ca.indexOf('const raridadeReal') + 400)
       .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
      ) || true);

  /* O comportamento: o registro do vendedor chega inteiro ao comprador,
     com o histórico, e o avatar não muda de raridade por ter mudado de
     dono. */
  const doVendedor = { atual: 'Lendário',
                       historico: [{ para: 'Raro', em: 1, por: 'exame-maio' },
                                   { para: 'Lendário', em: 2, por: 'exame-agosto' }] };
  const doComprador = JSON.parse(JSON.stringify(doVendedor));   // o que a tx copia
  conferir('o comprador recebe a mesma raridade',
    RAR.rarGuardada({ a: doComprador }, 'a') === 'Lendário');
  conferir('e o histórico inteiro, com as duas conquistas',
    RAR.rarHistorico({ a: doComprador }, 'a').length === 2
    && RAR.rarHistorico({ a: doComprador }, 'a')[0].por === 'exame-maio');
  conferir('a compra não gera raridade nova',
    JSON.stringify(doComprador) === JSON.stringify(doVendedor));
}

/* ═══ 12 · O LEGADO JÁ NÃO EXISTE ═══════════════════════════════ */
titulo('O fuRaridadeDoNivel saiu, e não pode voltar');
{
  /* ── ESTA SEÇÃO ERA O CONTRATO DA DÍVIDA, E PASSA A SER A CERTIDÃO ──

     Durante as etapas 3H a 3I.11 havia aqui uma LISTA de nove lugares
     que chamavam o `fuRaridadeDoNivel`, e o teste falhava se alguém o
     chamasse de um décimo. A lista era a dívida escrita.

     A etapa 3I.12 pagou-a: a função saiu, e com ela a última regra do
     jogo que calculava raridade a partir de outra coisa. O que ficou
     aqui é o contrário do que estava — a prova de que NINGUÉM a chama,
     e de que ela não existe para ser chamada.

     Se alguém a reintroduzir, estas conferições falham. */
  const fs = require('fs');
  const achados = [];
  const declarada = [];
  for (const d of ['js', 'api', 'tools']) {
    for (const a of fs.readdirSync(__dirname + '/../' + d)) {
      if (!a.endsWith('.js')) continue;
      const rel = d + '/' + a;
      const t = fs.readFileSync(__dirname + '/../' + rel, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      if (/fuRaridadeDoNivel\s*\(/.test(t)) achados.push(rel);
      if (/function\s+fuRaridadeDoNivel/.test(t)) declarada.push(rel);
    }
  }
  conferir('a função não é declarada em lugar nenhum', declarada.length === 0, declarada);
  conferir('e não é chamada em lugar nenhum', achados.length === 0, achados);
  conferir('e não é exportada pelo js/ficha-fu.js',
    typeof F.fuRaridadeDoNivel === 'undefined', typeof F.fuRaridadeDoNivel);

  /* ── NEM NENHUMA OUTRA CONTA DE NÍVEL PARA RARIDADE ──

     A conta podia renascer com outro nome. O que se procura é o
     PADRÃO: um nível comparado com um número e a devolver uma das três
     raridades. */
  const suspeitas = [];
  for (const d of ['js', 'api']) {
    for (const a of fs.readdirSync(__dirname + '/../' + d)) {
      if (!a.endsWith('.js')) continue;
      const rel = d + '/' + a;
      const t = fs.readFileSync(__dirname + '/../' + rel, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      /* nivel >= algo ... 'Raro' | 'Lendário' na mesma expressão */
      if (/niv(el|eis)?[^;\n]{0,40}>=?[^;\n]{0,40}(['"])(Raro|Lend[áa]rio)\2/i.test(t))
        suspeitas.push(rel + ' (nível → raridade)');
      /* ── FASE INDEXANDO UMA TABELA DE RARIDADES ──

         O padrão é preciso de propósito. A primeira versão procurava
         "um array com Comum e Lendário num arquivo que menciona fase",
         e apanhava dois FALSOS POSITIVOS: o FU_RARIDADES do
         js/ficha-fu.js (a lista ordenada, legítima) e as gavetas de
         nomes do js/data.js. Uma heurística que grita onde não há nada
         treina quem a lê a ignorá-la.

         O que se procura é a tabela a ser INDEXADA por uma fase:
         `ALGO[fase]`, `ALGO[faseDe(...)]`, onde ALGO é um array de
         raridades declarado no mesmo arquivo. */
      const tabelas = [];
      const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[[^\]]*(['"])Lend[áa]rio\2[^\]]*\]/g;
      let m;
      while ((m = re.exec(t))) tabelas.push(m[1]);
      for (const nome of tabelas)
        if (new RegExp(nome + '\\s*\\[\\s*(?:fase|_?fase|f)\\b', 'i').test(t)
            || new RegExp(nome + '\\s*\\[\\s*\\w*fase\\w*\\s*\\(', 'i').test(t))
          suspeitas.push(rel + ' (' + nome + '[fase])');
    }
  }
  conferir('nenhuma conta nova de nível ou fase para raridade',
    suspeitas.length === 0, suspeitas);

  /* ── E O js/raridade.js PERDEU O QUE CALCULAVA RARIDADE ── */
  const rv = fs.readFileSync(__dirname + '/../js/raridade.js', 'utf8');
  for (const morto of ['raridadeDoNivel', 'raridadeDaFase', 'RARIDADE_POR_FASE',
                       'raridadeDoSlot', 'sincronizarRaridade', 'podeSerVendido']) {
    conferir('o ' + morto + ' saiu do js/raridade.js',
      !new RegExp('function\\s+' + morto + '\\b|const\\s+' + morto + '\\b').test(rv), morto);
  }
  conferir('e o que ficou lá não fala de raridade conquistada',
    ['grauDaRaridade', 'faseDoSlot', 'motivoSemVenda']
      .every(f => new RegExp('function\\s+' + f + '\\b').test(rv)), null);

  conferir('a fonte única da ficha é o fuRaridadeDa',
    /const raridade = fuRaridadeDa\(slot\)/.test(
      fs.readFileSync(__dirname + '/../js/ficha-fu.js', 'utf8')));
}

/* ═══ 13 · NÍVEL NÃO É RARIDADE ══════════════════════════════════ */
titulo('Nível é progressão; raridade é conquista');
{
  const fs = require('fs');
  const ler = (rel) => fs.readFileSync(__dirname + '/../' + rel, 'utf8');

  /* ── 1 · O AVATAR NOVO NASCE COMUM ──
     Pelo caminho de verdade: a certidão de invocação e o carregamento. */
  {
    const novo = slot(1);
    const s = RAR.rarResolver({}, Object.assign({}, novo));
    conferir('um avatar novo nasce Comum',
      s.raridade === 'Comum' && s.raridadeReconhecida === undefined, s.raridade);
    conferir('e a ficha dele diz Comum',
      F.fuFicha(s).raridade === 'Comum', F.fuFicha(s).raridade);
  }

  /* ── 2 a 5 · NENHUM NÍVEL PROMOVE ──
     Os degraus antigos eram 11 (Raro) e 27 (Lendário). Varre-se a
     escada inteira, e não só esses dois: um degrau novo em qualquer
     nível apanha-se aqui. */
  {
    let promoveu = [];
    for (let nv = 1; nv <= 60; nv++) {
      const s = RAR.rarResolver({}, slot(nv));
      if (s.raridade !== 'Comum') promoveu.push(nv + '→' + s.raridade);
      if (F.fuFicha(s).raridade !== 'Comum') promoveu.push(nv + '→ficha ' + F.fuFicha(s).raridade);
    }
    conferir('nenhum dos 60 níveis promove por si', promoveu.length === 0, promoveu);
  }
  for (const [nv, oQueEra] of [[11, 'Raro'], [26, 'Raro'], [27, 'Lendário'],
                               [40, 'Lendário'], [60, 'Lendário']]) {
    const s = RAR.rarResolver({}, slot(nv));
    conferir('o nível ' + nv + ' NÃO dá ' + oQueEra + ' (dava até a 3I.12)',
      s.raridade === 'Comum' && F.fuRaridadeDa(s) === 'Comum', s.raridade);
  }

  /* ── 6 e 7 · MEXER NO NÍVEL NÃO MEXE NO MAPA ──
     O mapa é do servidor; o nível é do avatar. Subir, descer e saltar. */
  {
    const mapa = { av1: { atual: 'Raro', historico: [{ para: 'Raro', em: 1, por: 'exame' }] } };
    const antes = JSON.stringify(mapa);
    let mudou = [];
    for (const nv of [1, 11, 26, 27, 40, 60, 1, 5]) {
      const s = RAR.rarResolver(mapa, { id: 'av1', nome: 'T', seed: 7919, nivel: nv,
                                        nascimento: slot(nv).nascimento });
      if (JSON.stringify(mapa) !== antes) mudou.push('nivel ' + nv + ' escreveu no mapa');
      if (s.raridade !== 'Raro') mudou.push('nivel ' + nv + ' deu ' + s.raridade);
    }
    conferir('subir, descer e saltar de nível não altera raridades[id]',
      mudou.length === 0, mudou);
    conferir('e o registro continua intacto, com o histórico',
      JSON.stringify(mapa) === antes
      && mapa.av1.historico.length === 1, mapa);
  }

  /* ── 9 · O MERCADO NÃO CALCULA RARIDADE PELO NÍVEL ── */
  {
    const mkt = ler('js/avatars-market.js');
    conferir('o _mktRaridade pergunta ao fuRaridadeDa, e não ao nível',
      /function _mktRaridade[\s\S]{0,320}fuRaridadeDa\(s\)/.test(mkt)
      && !/_mktRaridade[\s\S]{0,320}\bs\.nivel\b/.test(
           mkt.slice(mkt.indexOf('function _mktRaridade'),
                     mkt.indexOf('function _mktRaridade') + 320)), null);
    const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '')
                                   .replace(/<!--[\s\S]*?-->/g, '')
                                   .replace(/\/\/[^\n]*/g, '');
    for (const rel of ['js/avatars-market.js', 'js/cristais.js',
                       'api/comprar-avatar.js', 'api/amigos.js']) {
      conferir('o ' + rel + ' não chama conta de raridade por nível',
        !/fuRaridadeDoNivel\s*\(|raridadeDoNivel\s*\(|raridadeDoSlot\s*\(/
          .test(semComentarios(ler(rel))), rel);
    }
    /* E o servidor do anúncio lê o mapa, com um argumento só. */
    conferir('o anúncio chama rarDe(mapa, id) e mais nada',
      /RAR\.rarDe\(pData\.raridades \|\| \{\}, s\.id\);/
        .test(ler('api/comprar-avatar.js')), null);
  }

  /* ── 10 · O PREÇO NÃO OLHA A RARIDADE, LOGO O NÍVEL NÃO O MOVE ──

     É a prova mais forte do item: não é que o preço use a fonte certa —
     é que ele NÃO USA raridade nenhuma. Quem põe o preço é o dono, em
     cristais, e o servidor só cobra a taxa de listagem. */
  {
    const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '')
                                   .replace(/\/\/[^\n]*/g, '');
    const ca = semComentarios(ler('api/comprar-avatar.js'));
    const janela = (t, marca, n) => {
      const i = t.indexOf(marca);
      return i === -1 ? '' : t.slice(i, i + n);
    };
    conferir('a taxa de listagem é constante, sem raridade',
      /LIST_COST/.test(ca) && !/LIST_COST[^;\n]{0,80}(Raro|Lend)/.test(ca), null);
    conferir('e o preço do anúncio vem do pedido, não de uma tabela de raridade',
      !/pre[cç]o[^;\n]{0,60}(raridade|Raro|Lend[áa]rio)/i.test(ca), null);

    /* E o comportamento: a mesma raridade com níveis diferentes dá a
       mesma coisa, e níveis diferentes com a mesma raridade também. */
    const mapa = { av1: { atual: 'Raro', historico: [] } };
    const r = (nv) => RAR.rarResolver(mapa, { id: 'av1', nome: 'T', seed: 7919,
                                              nivel: nv, nascimento: slot(nv).nascimento }).raridade;
    conferir('mudar o nível não muda a raridade que o mercado vai mostrar',
      [1, 11, 27, 40, 60].every(nv => r(nv) === 'Raro'), [1, 60].map(r));
  }

  /* ── 11 e 12 · A PROMOÇÃO EXPLÍCITA CONTINUA, E O DOWNGRADE NÃO ── */
  {
    const p1 = RAR.rarPromover(null, 'Raro', 'exame', 1000);
    conferir('Comum → Raro continua a passar',
      p1.ok && p1.reg.atual === 'Raro', p1);
    const p2 = RAR.rarPromover(p1.reg, 'Lendário', 'exame', 2000);
    conferir('Raro → Lendário continua a passar',
      p2.ok && p2.reg.atual === 'Lendário' && p2.reg.historico.length === 2, p2);
    const p3 = RAR.rarPromover(null, 'Lendário', 'exame', 1500);
    conferir('Comum → Lendário num salto continua a passar',
      p3.ok && p3.reg.atual === 'Lendário', p3);
    for (const [de, para, motivo] of [
      ['Raro', 'Comum', 'NAO_DESCE'], ['Lendário', 'Raro', 'NAO_DESCE'],
      ['Lendário', 'Comum', 'NAO_DESCE'], ['Raro', 'Raro', 'JA_TEM'],
      ['Lendário', 'Lendário', 'JA_TEM']]) {
      const r = RAR.rarPromover({ atual: de, historico: [] }, para, 'x', 1);
      conferir(de + ' → ' + para + ' é recusado (' + motivo + ')',
        !r.ok && r.motivo === motivo, r);
    }
    conferir('e nenhuma promoção é automática: ninguém chama o rarPromover',
      (() => {
        for (const d of ['js', 'api']) {
          for (const a of fs.readdirSync(__dirname + '/../' + d)) {
            if (!a.endsWith('.js') || a === 'raridades.js') continue;
            const t = ler(d + '/' + a).replace(/\/\*[\s\S]*?\*\//g, '')
                                      .replace(/\/\/[^\n]*/g, '');
            if (/rarPromover\s*\(/.test(t)) return false;
          }
        }
        return true;
      })(), 'alguém promove em produção');
  }

  /* ── 14 · O COMBATE NÃO MUDOU ──

     Duas conferições, e a segunda é a que importa. A primeira: os
     arquivos do motor não falam de raridade por nível. A segunda: DADA
     uma raridade, os números da ficha continuam os mesmos — o que a
     3I.12 mudou foi QUEM responde pela raridade, nunca o que cada
     raridade vale. */
  {
    const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '')
                                   .replace(/\/\/[^\n]*/g, '');
    for (const rel of ['js/combate-fu.js', 'js/ia-fu.js', 'js/magias-fu.js']) {
      conferir('o ' + rel + ' não calcula raridade de nível',
        !/fuRaridadeDoNivel|raridadeDoNivel|raridadeDoSlot/.test(semComentarios(ler(rel))), rel);
    }
    /* Os números de cada raridade, no nível 40, com a semente fixa.
       Estes valores foram medidos ANTES da 3I.12 e não mudaram. */
    const comRar = (rar) => F.fuFicha(RAR.rarResolver(
      { x: { atual: rar, historico: [] } },
      Object.assign(slot(40), { id: 'x' })));
    const esperado = {
      'Comum':    { pvMax: 110, danoExtra: 3,  magias: 3 },
      'Raro':     { pvMax: 110, danoExtra: 7,  magias: 3 },
      'Lendário': { pvMax: 190, danoExtra: 10, magias: 4 },
    };
    for (const rar of Object.keys(esperado)) {
      const f = comRar(rar);
      const n = Object.keys(G.fuMagiasDe(f) || {}).length;
      conferir('o que ' + rar + ' vale no combate não mudou',
        f.pvMax === esperado[rar].pvMax
        && f.danoExtra === esperado[rar].danoExtra
        && n === esperado[rar].magias,
        { pvMax: f.pvMax, danoExtra: f.danoExtra, magias: n });
    }
    /* E a consequência da etapa, medida e escrita: sem certificação, o
       avatar luta como Comum. Não é efeito colateral — é o que a 3I.12
       foi fazer. */
    const semRegistro = F.fuFicha(RAR.rarResolver({}, slot(40)));
    conferir('e um avatar de nível 40 SEM certificação luta como Comum',
      semRegistro.pvMax === 110 && semRegistro.danoExtra === 3,
      { pvMax: semRegistro.pvMax, danoExtra: semRegistro.danoExtra });
  }
}

console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '') + ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
