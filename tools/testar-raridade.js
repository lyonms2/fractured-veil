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

/* ═══ 14 · O EXAME ═══════════════════════════════════════════════ */
titulo('O exame: que certificação a evidência merece');
{
  const FE = require('../js/feitos.js');
  const fs = require('fs');
  const ler = (rel) => fs.readFileSync(__dirname + '/../' + rel, 'utf8');
  const mes = (i) => '2026-' + String(i).padStart(2, '0');

  /* ── A FÁBRICA DE EVIDÊNCIA ──
     Monta pelo `feitoPvp` de verdade, partida a partida: nada é escrito
     à mão no documento, e por isso o que se testa é o que o servidor
     gravaria. */
  const evid = (partidas) => {
    let r = FE.feitoVazio(1);
    let t = 1000;
    for (const p of partidas) {
      for (let i = 0; i < (p.n || 1); i++) {
        t += 100;
        r = FE.feitoPvp(r, p.res || 'vitoria', p.tipo || 'fila', p.ciclo, t,
          p.adv ? Object.assign({ divisao: 'adulto', em: t, ciclo: p.ciclo }, p.adv) : null);
      }
    }
    return FE.feitoDe({ a: r }, 'a');
  };
  /* N ciclos com vitória, e M adversários distintos a `pontos`. */
  const caso = (ciclos, fortes, pontos) => {
    const p = [];
    for (let i = 0; i < ciclos; i++) p.push({ ciclo: mes(i + 1) });
    for (let i = 0; i < fortes; i++)
      p.push({ ciclo: mes(1), adv: { uid: 'forte' + i, pontos: pontos || 1200 } });
    return evid(p);
  };
  const ex = (f) => RAR.rarExaminar(f);
  const rar = (f) => ex(f).raridade;

  /* ── 1 a 7 · RARO ── */
  conferir('1 · sem ciclos → Comum', rar(evid([])) === 'Comum', rar(evid([])));
  conferir('2 · 1 ciclo com vitória → Comum', rar(caso(1, 0)) === 'Comum', rar(caso(1, 0)));
  conferir('3 · 2 ciclos → Comum', rar(caso(2, 0)) === 'Comum', rar(caso(2, 0)));
  conferir('4 · 3 ciclos → Raro', rar(caso(3, 0)) === 'Raro', rar(caso(3, 0)));
  conferir('5 · 4 ciclos → Raro', rar(caso(4, 0)) === 'Raro', rar(caso(4, 0)));
  conferir('6 · 5 ciclos → ao menos Raro',
    RAR.rarGrau(rar(caso(5, 0))) >= 1, rar(caso(5, 0)));
  {
    /* 7 · muitas vitórias no MESMO ciclo continuam a ser um ciclo */
    const umMes = evid([{ ciclo: mes(1), n: 50 }]);
    const tres  = evid([{ ciclo: mes(1), n: 50 }, { ciclo: mes(2) }, { ciclo: mes(3) }]);
    conferir('7 · 50 vitórias num mês contam 1 ciclo',
      ex(umMes).ciclosComVitoria === 1 && rar(umMes) === 'Comum',
      ex(umMes).ciclosComVitoria);
    conferir('7b · e com mais dois meses chega a Raro',
      ex(tres).ciclosComVitoria === 3 && rar(tres) === 'Raro', ex(tres).ciclosComVitoria);
  }

  /* ── 8 a 14 · LENDÁRIO ── */
  conferir('8 · 5 ciclos + 0 fortes → não Lendário', rar(caso(5, 0)) !== 'Lendário');
  conferir('9 · 5 ciclos + 2 fortes → não Lendário', rar(caso(5, 2)) !== 'Lendário');
  conferir('10 · 5 ciclos + 3 fortes → Lendário', rar(caso(5, 3)) === 'Lendário', rar(caso(5, 3)));
  conferir('11 · 6 ciclos + 3 fortes → Lendário', rar(caso(6, 3)) === 'Lendário');
  conferir('11b · 12 ciclos + 3 fortes → Lendário', rar(caso(12, 3)) === 'Lendário');
  conferir('12 · 10 ciclos + 2 fortes → não Lendário (e é Raro)',
    rar(caso(10, 2)) === 'Raro', rar(caso(10, 2)));
  conferir('13 · 3 adversários a 1149 → não Lendário',
    rar(caso(5, 3, 1149)) !== 'Lendário' && ex(caso(5, 3, 1149)).adversariosFortes === 0,
    ex(caso(5, 3, 1149)).adversariosFortes);
  conferir('14 · 3 adversários a EXATAMENTE 1150 → Lendário',
    rar(caso(5, 3, 1150)) === 'Lendário', rar(caso(5, 3, 1150)));
  conferir('14b · o limiar é o do arquivo, e é 1150',
    RAR.RAR_FORTE_PONTOS === 1150 && RAR.RAR_CICLOS_RARO === 3
    && RAR.RAR_CICLOS_LENDARIO === 5 && RAR.RAR_FORTES_MIN === 3,
    [RAR.RAR_CICLOS_RARO, RAR.RAR_CICLOS_LENDARIO, RAR.RAR_FORTES_MIN, RAR.RAR_FORTE_PONTOS]);

  /* ── 15 a 18 · OS UIDs ── */
  {
    const tresVezes = evid([
      { ciclo: mes(1) }, { ciclo: mes(2) }, { ciclo: mes(3) },
      { ciclo: mes(4) }, { ciclo: mes(5) },
      { ciclo: mes(1), adv: { uid: 'mesmo', pontos: 1200 } },
      { ciclo: mes(2), adv: { uid: 'mesmo', pontos: 1200 } },
      { ciclo: mes(3), adv: { uid: 'mesmo', pontos: 1200 } }]);
    conferir('15 · o mesmo uid três vezes conta 1',
      ex(tresVezes).adversariosFortes === 1 && rar(tresVezes) === 'Raro',
      ex(tresVezes).adversariosFortes);

    const ranksVarios = evid([
      { ciclo: mes(1) }, { ciclo: mes(2) }, { ciclo: mes(3) },
      { ciclo: mes(4) }, { ciclo: mes(5) },
      { ciclo: mes(1), adv: { uid: 'm', pontos: 1160 } },
      { ciclo: mes(2), adv: { uid: 'm', pontos: 1400 } },
      { ciclo: mes(3), adv: { uid: 'm', pontos: 1250 } }]);
    conferir('16 · o mesmo uid com ranks diferentes conta 1',
      ex(ranksVarios).adversariosFortes === 1, ex(ranksVarios).adversariosFortes);

    const subiuDepois = evid([
      { ciclo: mes(1) }, { ciclo: mes(2) }, { ciclo: mes(3) },
      { ciclo: mes(4) }, { ciclo: mes(5) },
      { ciclo: mes(1), adv: { uid: 'm', pontos: 1160 } },
      { ciclo: mes(6), adv: { uid: 'm', pontos: 1900 } }]);
    conferir('17 · o mesmo uid com rank maior depois continua 1',
      ex(subiuDepois).adversariosFortes === 1, ex(subiuDepois).adversariosFortes);

    conferir('18 · três uids distintos contam 3',
      ex(caso(5, 3)).adversariosFortes === 3, ex(caso(5, 3)).adversariosFortes);

    /* ── A DEDUPLICAÇÃO DO EXAME, SOBRE A LISTA CRUA ──

       As conferições acima passam pelo `feitoPvp`, e ele JÁ deduplica no
       armazenamento: um uid ocupa uma posição só. Logo elas nunca veem
       uma duplicata, e não provam que o exame deduplica — provam que o
       escritor deduplica.

       São duas defesas, e cada uma precisa do seu teste: um documento
       corrompido, ou uma versão futura do escritor, podem trazer o
       mesmo uid duas vezes, e o exame tem de aguentar sozinho.
       Apanhado a mutar o exame, no scratchpad. */
    const cru = (lista) => ({
      ciclos: { '2026-01': { v: 1 }, '2026-02': { v: 1 }, '2026-03': { v: 1 },
                '2026-04': { v: 1 }, '2026-05': { v: 1 } },
      pvp: { fila: { vencidos: lista } },
    });
    conferir('o exame deduplica a lista CRUA: o mesmo uid três vezes conta 1',
      ex(cru([{ uid: 'm', pontos: 1200 }, { uid: 'm', pontos: 1300 },
              { uid: 'm', pontos: 1400 }])).adversariosFortes === 1,
      ex(cru([{ uid: 'm', pontos: 1200 }, { uid: 'm', pontos: 1300 },
              { uid: 'm', pontos: 1400 }])).adversariosFortes);
    conferir('e um uid repetido no meio de outros não infla a conta',
      ex(cru([{ uid: 'a', pontos: 1200 }, { uid: 'a', pontos: 1300 },
              { uid: 'b', pontos: 1200 }])).adversariosFortes === 2,
      ex(cru([{ uid: 'a', pontos: 1200 }, { uid: 'a', pontos: 1300 },
              { uid: 'b', pontos: 1200 }])).adversariosFortes);
    conferir('e dez repetições do mesmo uid não dão Lendário',
      ex(cru(Array.from({ length: 10 }, () => ({ uid: 'so-um', pontos: 1900 }))))
        .raridade === 'Raro',
      ex(cru(Array.from({ length: 10 }, () => ({ uid: 'so-um', pontos: 1900 })))).raridade);

    /* E dez avatares do MESMO jogador continuam a ser um: a unidade é
       o uid, medida na 3I.7. */
    const dezAvatares = evid([
      { ciclo: mes(1) }, { ciclo: mes(2) }, { ciclo: mes(3) },
      { ciclo: mes(4) }, { ciclo: mes(5) }].concat(
      Array.from({ length: 10 }, (_, i) =>
        ({ ciclo: mes((i % 5) + 1), adv: { uid: 'cumplice', pontos: 1200 + i } }))));
    conferir('18b · dez avatares de um cúmplice contam 1',
      ex(dezAvatares).adversariosFortes === 1 && rar(dezAvatares) !== 'Lendário',
      ex(dezAvatares).adversariosFortes);
  }

  /* ── 19 e 20 · A ORIGEM ── */
  {
    const soAmistosas = evid(Array.from({ length: 8 }, (_, i) =>
      ({ ciclo: mes(i + 1), tipo: 'amistosa', adv: { uid: 'a' + i, pontos: 1500 } })));
    conferir('19 · amistosas não abrem ciclo',
      ex(soAmistosas).ciclosComVitoria === 0 && rar(soAmistosas) === 'Comum',
      ex(soAmistosas).ciclosComVitoria);
    conferir('20 · os vencidos da amistosa não valem para a Via A',
      ex(soAmistosas).adversariosFortes === 0, ex(soAmistosas).adversariosFortes);
    /* Misturado: cinco ciclos de fila e os fortes só na amistosa. */
    const misto = evid([
      { ciclo: mes(1) }, { ciclo: mes(2) }, { ciclo: mes(3) },
      { ciclo: mes(4) }, { ciclo: mes(5) }].concat(
      [0, 1, 2].map(i => ({ ciclo: mes(1), tipo: 'amistosa',
                            adv: { uid: 'f' + i, pontos: 1500 } }))));
    conferir('20b · fortes só na amistosa não dão Lendário',
      rar(misto) === 'Raro' && ex(misto).adversariosFortes === 0, rar(misto));
  }

  /* ── 21 a 26 · NEUTRALIDADE ──
     O exame recebe SÓ os feitos. Nível, fase, Feitio, Escola, XP e vida
     ativa nem sequer lhe chegam — mas prova-se de duas maneiras: pelo
     comportamento (juntar os campos não muda nada) e pela fonte (as
     palavras não aparecem na função). */
  {
    const base = caso(5, 3);
    const sujo = JSON.parse(JSON.stringify(base));
    Object.assign(sujo, { nivel: 60, fase: 3, feitio: 'lamina', escola: 2,
                          xp: 999999, totalSecs: 1e9, vidaAtiva: { s: 1e9 },
                          raridade: 'Comum', rank: { pontos: 2000 } });
    conferir('21 a 26 · juntar nível, fase, feitio, escola, XP e vida não muda nada',
      JSON.stringify(ex(sujo)) === JSON.stringify(ex(base)), [ex(sujo), ex(base)]);

    const fonte = ler('js/raridades.js');
    const corpo = fonte.slice(fonte.indexOf('function _rarCiclosComVitoria'),
                              fonte.indexOf('function rarCertificar'))
                       .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const proibido of ['nivel', 'nível', 'fase', 'feitio', 'escola', 'idade',
                            'totalSecs', 'vidaAtiva', 'xp', 'vinculo', 'winRate',
                            'melhorAdversario', 'amistosa', 'cura', 'curaPv',
                            'limpeza', 'protegeu', 'suporte']) {
      /* COM FRONTEIRA DE PALAVRA, e isto não é zelo: "idade" vive
         dentro de "raridade", e sem a fronteira a conferição falhava
         por causa do próprio nome do arquivo. */
      conferir('a função do exame não menciona `' + proibido + '`',
        !new RegExp('\b' + proibido + '\b', 'i').test(corpo), proibido);
    }
  }

  /* ── 27 a 32 · DADOS INVÁLIDOS: FALHAR FECHADO ── */
  {
    const maus = [
      ['feitos ausente', undefined], ['feitos null', null], ['feitos texto', 'xxx'],
      ['feitos número', 42], ['feitos array', []],
      ['27 · ciclos ausente', { pvp: { fila: { vencidos: [] } } }],
      ['ciclos null', { ciclos: null }], ['ciclos texto', { ciclos: 'muitos' }],
      ['ciclos array', { ciclos: [1, 2, 3, 4, 5] }],
      ['28 · vencidos ausente', { ciclos: {} }],
      ['vencidos null', { ciclos: {}, pvp: { fila: { vencidos: null } } }],
      ['vencidos objeto', { ciclos: {}, pvp: { fila: { vencidos: { a: 1 } } } }],
      ['pvp ausente', { ciclos: {} }], ['pvp null', { ciclos: {}, pvp: null }],
      ['29 · v inválido (NaN)', { ciclos: { '2026-01': { v: NaN }, '2026-02': { v: NaN },
                                            '2026-03': { v: NaN } } }],
      ['v inválido (texto)', { ciclos: { '2026-01': { v: 'x' }, '2026-02': { v: 'x' },
                                          '2026-03': { v: 'x' } } }],
      ['v negativo', { ciclos: { '2026-01': { v: -9 }, '2026-02': { v: -9 },
                                 '2026-03': { v: -9 } } }],
      ['v Infinity', { ciclos: { '2026-01': { v: Infinity }, '2026-02': { v: Infinity },
                                 '2026-03': { v: Infinity } } }],
      ['v objeto', { ciclos: { '2026-01': { v: {} }, '2026-02': { v: {} },
                               '2026-03': { v: {} } } }],
      ['ciclo com valor null', { ciclos: { '2026-01': null, '2026-02': null,
                                           '2026-03': null } }],
    ];
    for (const [nome, f] of maus) {
      let r, erro = null;
      try { r = ex(f); } catch (e) { erro = e.message; }
      conferir(nome + ' → Comum, sem rebentar',
        !erro && r && r.raridade === 'Comum' && r.elegivel === false, erro || r);
    }
    /* 30 e 31 · pontos e uid inválidos não contam como adversário */
    const cincoCiclos = { ciclos: { '2026-01': { v: 1 }, '2026-02': { v: 1 },
                                    '2026-03': { v: 1 }, '2026-04': { v: 1 },
                                    '2026-05': { v: 1 } } };
    const comVencidos = (lista) =>
      Object.assign({}, cincoCiclos, { pvp: { fila: { vencidos: lista } } });
    const maus2 = [
      ['30 · pontos ausente', [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]],
      ['pontos NaN', [{ uid: 'a', pontos: NaN }, { uid: 'b', pontos: NaN },
                      { uid: 'c', pontos: NaN }]],
      ['pontos Infinity', [{ uid: 'a', pontos: Infinity }, { uid: 'b', pontos: Infinity },
                           { uid: 'c', pontos: Infinity }]],
      ['pontos negativo', [{ uid: 'a', pontos: -9999 }, { uid: 'b', pontos: -9999 },
                           { uid: 'c', pontos: -9999 }]],
      ['pontos objeto', [{ uid: 'a', pontos: {} }, { uid: 'b', pontos: {} },
                         { uid: 'c', pontos: {} }]],
      ['31 · uid ausente', [{ pontos: 9999 }, { pontos: 9999 }, { pontos: 9999 }]],
      ['uid vazio', [{ uid: '', pontos: 9999 }, { uid: '', pontos: 9999 },
                     { uid: '', pontos: 9999 }]],
      ['uid número', [{ uid: 1, pontos: 9999 }, { uid: 2, pontos: 9999 },
                      { uid: 3, pontos: 9999 }]],
      ['uid objeto', [{ uid: {}, pontos: 9999 }, { uid: {}, pontos: 9999 },
                      { uid: {}, pontos: 9999 }]],
      ['32 · entradas null', [null, null, null]],
      ['entradas texto', ['a', 'b', 'c']],
      ['entradas número', [1, 2, 3]],
    ];
    for (const [nome, lista] of maus2) {
      let r, erro = null;
      try { r = ex(comVencidos(lista)); } catch (e) { erro = e.message; }
      conferir(nome + ' → não conta como adversário',
        !erro && r && r.adversariosFortes === 0 && r.raridade === 'Raro',
        erro || (r && { fortes: r.adversariosFortes, rar: r.raridade }));
    }
    /* O Infinity merece nota: é > 1150, e mesmo assim não entra. Um
       número que não é finito não é um rank. */
    conferir('32b · Infinity é maior que 1150 e mesmo assim não conta',
      ex(comVencidos([{ uid: 'a', pontos: Infinity }, { uid: 'b', pontos: Infinity },
                      { uid: 'c', pontos: Infinity }])).adversariosFortes === 0);
  }

  /* ── A PUREZA, QUE É O QUE TORNA TUDO ISTO TESTÁVEL ── */
  {
    const f = caso(5, 3);
    const antes = JSON.stringify(f);
    const a = ex(f), b = ex(f);
    conferir('o exame não toca na evidência', JSON.stringify(f) === antes);
    conferir('e dá o mesmo resultado sempre', JSON.stringify(a) === JSON.stringify(b));
    const fonte = ler('js/raridades.js');
    const corpo = fonte.slice(fonte.indexOf('function rarExaminar'),
                              fonte.indexOf('function rarCertificar'));
    conferir('e não escreve, não lê banco, não vê o relógio',
      !/Date\.now|new Date|firestore|collection|\.set\(|\.update\(/.test(corpo), null);
  }
}

/* ═══ 15 · A CERTIFICAÇÃO ════════════════════════════════════════ */
titulo('A certificação: examinar e promover são coisas diferentes');
{
  const FE = require('../js/feitos.js');
  const fs = require('fs');
  const ler = (rel) => fs.readFileSync(__dirname + '/../' + rel, 'utf8');
  const mes = (i) => '2026-' + String(i).padStart(2, '0');
  const caso = (ciclos, fortes) => {
    let r = FE.feitoVazio(1);
    let t = 1000;
    for (let i = 0; i < ciclos; i++) r = FE.feitoPvp(r, 'vitoria', 'fila', mes(i + 1), t += 100, null);
    for (let i = 0; i < fortes; i++)
      r = FE.feitoPvp(r, 'vitoria', 'fila', mes(1), t += 100,
        { uid: 'f' + i, pontos: 1200, divisao: 'adulto', em: t, ciclo: mes(1) });
    return FE.feitoDe({ a: r }, 'a');
  };

  /* ── Comum → Raro ── */
  {
    const c = RAR.rarCertificar(null, caso(3, 0), 5000);
    conferir('Comum com 3 ciclos → promove a Raro',
      c.ok && c.de === 'Comum' && c.para === 'Raro' && c.reg.atual === 'Raro', c);
    conferir('e o histórico registra um evento, com quem concedeu',
      c.reg.historico.length === 1 && c.reg.historico[0].para === 'Raro'
      && c.reg.historico[0].por === 'exame-raridade' && c.reg.historico[0].em === 5000,
      c.reg.historico);
  }

  /* ── Comum → Lendário, num salto ── */
  {
    const c = RAR.rarCertificar(null, caso(5, 3), 6000);
    conferir('Comum com 5 ciclos e 3 fortes → promove direto a Lendário',
      c.ok && c.de === 'Comum' && c.para === 'Lendário', c);
    conferir('e NÃO inventa um degrau por Raro que não aconteceu',
      c.reg.historico.length === 1 && c.reg.historico[0].para === 'Lendário',
      c.reg.historico);
  }

  /* ── Raro → Lendário ── */
  {
    const jaRaro = { atual: 'Raro', historico: [{ para: 'Raro', em: 1, por: 'exame-raridade' }] };
    const c = RAR.rarCertificar(jaRaro, caso(5, 3), 7000);
    conferir('Raro com evidência de Lendário → promove',
      c.ok && c.de === 'Raro' && c.para === 'Lendário', c);
    conferir('e o histórico fica com os dois eventos, na ordem',
      c.reg.historico.length === 2
      && c.reg.historico[0].para === 'Raro' && c.reg.historico[1].para === 'Lendário',
      c.reg.historico);
  }

  /* ── JÁ CERTIFICADO: nada acontece, e é esse o ponto ── */
  {
    const jaLend = { atual: 'Lendário', historico: [{ para: 'Lendário', em: 1, por: 'exame-raridade' }] };
    const c = RAR.rarCertificar(jaLend, caso(9, 5), 8000);
    conferir('Lendário examinado outra vez → não promove',
      !c.ok && c.motivo === 'JA_TEM' && c.reg === null, c);
    const jaRaro = { atual: 'Raro', historico: [{ para: 'Raro', em: 1, por: 'exame-raridade' }] };
    const c2 = RAR.rarCertificar(jaRaro, caso(4, 0), 8000);
    conferir('Raro com evidência de Raro → não promove outra vez',
      !c2.ok && c2.motivo === 'JA_TEM', c2);
    /* Dez exames seguidos não duplicam nada. */
    let reg = null, escritas = 0;
    for (let i = 0; i < 10; i++) {
      const r = RAR.rarCertificar(reg, caso(5, 3), 9000 + i);
      if (r.ok) { reg = r.reg; escritas++; }
    }
    conferir('dez exames seguidos escrevem UMA vez',
      escritas === 1 && reg.historico.length === 1, { escritas, hist: reg.historico });
  }

  /* ── NÃO ELEGÍVEL ── */
  {
    const c = RAR.rarCertificar(null, caso(2, 0), 5000);
    conferir('Comum com 2 ciclos → continua Comum, sem escrever',
      !c.ok && c.motivo === 'SEM_EVIDENCIA' && c.reg === null, c);
  }

  /* ── NUNCA DESCE ──
     Um Lendário cuja evidência hoje só daria Raro não é rebaixado. A
     certificação é histórica: o que se conquistou fica. */
  {
    const jaLend = { atual: 'Lendário', historico: [{ para: 'Lendário', em: 1, por: 'exame-raridade' }] };
    const c = RAR.rarCertificar(jaLend, caso(3, 0), 9000);
    conferir('Lendário com evidência de Raro NÃO é rebaixado',
      !c.ok && c.motivo === 'NAO_DESCE' && c.reg === null, c);
  }

  /* ── A SEPARAÇÃO DE RESPONSABILIDADES, NA FONTE ── */
  {
    const fonte = ler('js/raridades.js');
    /* SÓ O CORPO, sem os comentários: o recorte até ao
       `function rarCertificar` apanhava o comentário DELE, que fala do
       `rarPromover` — e a conferição falhava por causa de uma nota. */
    const corpoExame = fonte.slice(fonte.indexOf('function rarExaminar'),
                                   fonte.indexOf('function rarCertificar'))
                            .replace(/\/\*[\s\S]*?\*\//g, '')
                            .replace(/\/\/[^\n]*/g, '');
    conferir('o rarExaminar não promove ninguém',
      !/rarPromover/.test(corpoExame), null);
    conferir('e o rarCertificar promove pelo rarPromover, sem recriar a regra',
      /rarPromover\(reg, exame\.raridade/.test(fonte), null);
    const cert = fonte.slice(fonte.indexOf('function rarCertificar'),
                             fonte.indexOf('function rarDeRegistro'));
    conferir('o rarCertificar também não escreve nada',
      !/\.set\(|\.update\(|collection\(/.test(cert), null);
  }
}

/* ═══ 16 · A AUTORIDADE DO EXAME ═════════════════════════════════ */
titulo('O cliente não se certifica a si próprio');
{
  const fs = require('fs');
  const ler = (rel) => fs.readFileSync(__dirname + '/../' + rel, 'utf8');
  const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const FE = require('../js/feitos.js');

  /* ── A EVIDÊNCIA VEM DO DOCUMENTO, NÃO DO PEDIDO ── */
  {
    const c = semComentarios(ler('api/_certificar.js'));
    /* ── RECORTADO À FUNÇÃO QUE ESCREVE ──

       A asserção olhava o arquivo inteiro, e o arquivo tem DUAS funções
       que leem os feitos: a que certifica e a que só examina. Mutar a
       primeira passava despercebido porque a segunda ainda casava com a
       expressão. Apanhado a mutar, no scratchpad.

       O que importa é a função que ESCREVE: é ela que tem de tirar a
       evidência do documento e de mais lado nenhum. */
    const certificar = c.slice(c.indexOf('async function certificarAvatar'),
                               c.indexOf('async function certificarJogador'));
    conferir('a função que certifica lê os feitos do documento, e só dele',
      /const feitos = FE\.feitoDe\(d\.feitos \|\| \{\}, idAvatar\);/.test(certificar),
      certificar.match(/const feitos = [^;]*/));
    conferir('e a raridade atual do mapa do servidor',
      /RAR\.rarRegistro\(d\.raridades \|\| \{\}, idAvatar\)/.test(certificar), null);
    conferir('e a assinatura dela não aceita evidência de fora',
      /async function certificarAvatar\(db, uid, idAvatar, agora\)/.test(certificar),
      certificar.slice(0, 80));
    for (const campo of ['req', 'body', 'request', 'query', 'params']) {
      conferir('o certificador nunca lê `' + campo + '`',
        !new RegExp('\\b' + campo + '\\b').test(c), campo);
    }
    conferir('e escreve numa transação, para ler e gravar no mesmo instante',
      /runTransaction/.test(c), null);
    conferir('e confere que o avatar é DESTE jogador',
      /slots\.some\(s => s && s\.id === idAvatar\)/.test(c), null);
  }

  /* ── NÃO HÁ ROTA: O EXAME NÃO SE PEDE ── */
  {
    const arquivos = fs.readdirSync(__dirname + '/../api');
    conferir('o certificador é módulo interno (começa por _)',
      arquivos.indexOf('_certificar.js') !== -1
      && arquivos.indexOf('certificar.js') === -1, arquivos.filter(a => /certific/.test(a)));
    /* ── QUEM O CHAMA, E SÓ ELE ──

       A 3I.13 afirmava aqui que NENHUM endpoint o chamava. A 3I.14 pôs
       um: o gatilho mensal. A conferição não se apagou — apertou-se, e
       passou a dizer mais do que dizia: existe exatamente um chamador,
       e é o do agendador.

       Se amanhã um segundo aparecer, isto falha. É esse o ponto: a
       certificação tem uma porta só. */
    const chamam = arquivos.filter(a => a.endsWith('.js') && a !== '_certificar.js'
      && /_certificar/.test(semComentarios(ler('api/' + a))));
    conferir('o certificador tem exatamente um chamador',
      chamam.length === 1 && chamam[0] === 'certificar-ciclo.js', chamam);
    conferir('e esse chamador é do agendador, não do jogador',
      /CRON_SECRET/.test(semComentarios(ler('api/certificar-ciclo.js')))
      && !/verifyIdToken/.test(semComentarios(ler('api/certificar-ciclo.js'))), null);
  }

  /* ── OS PAYLOADS DE ADULTERAÇÃO ──
     O exame é uma função pura sobre a evidência. A defesa não está nele
     — está em `feitos` e `raridades` serem campos de topo que o
     firestore.rules recusa ao cliente. Aqui prova-se as duas coisas: a
     regra recusa, e o exame não tem por onde receber um atalho. */
  {
    const regras = ler('firestore.rules');
    conferir('`feitos` é campo do servidor nas regras', /'feitos'/.test(regras));
    conferir('`raridades` é campo do servidor nas regras', /'raridades'/.test(regras));
    conferir('e os dois estão no camposDoServidor()',
      /camposDoServidor\(\)/.test(regras), null);

    /* Um avatar que pede a raridade: o campo nem é lido. */
    const pedindo = { ciclos: { '2026-01': { v: 1 } },
                      raridade: 'Lendário', raridadePretendida: 'Lendário',
                      exame: { raridade: 'Lendário' }, elegivel: true,
                      resultado: 'Lendário' };
    conferir('um payload que pede Lendário continua Comum',
      RAR.rarExaminar(pedindo).raridade === 'Comum', RAR.rarExaminar(pedindo).raridade);

    /* E um que já traz o veredito pronto. */
    const comVeredito = Object.assign({}, pedindo,
      { ciclosComVitoria: 99, adversariosFortes: 99 });
    conferir('e um que traz o veredito pronto também',
      RAR.rarExaminar(comVeredito).raridade === 'Comum'
      && RAR.rarExaminar(comVeredito).ciclosComVitoria === 1,
      RAR.rarExaminar(comVeredito));

    /* Chamar a promoção direto com dados do cliente: a regra do
       rarPromover continua a valer, e só sobe. */
    const forjado = RAR.rarPromover({ atual: 'Lendário', historico: [] }, 'Lendário', 'cliente', 1);
    conferir('promover à força o que já se tem é recusado',
      !forjado.ok && forjado.motivo === 'JA_TEM', forjado);
    const inventado = RAR.rarPromover(null, 'Divino', 'cliente', 1);
    conferir('e uma raridade inventada é recusada',
      !inventado.ok && inventado.motivo === 'VALOR_INVALIDO', inventado);
  }

  /* ── A VENDA LEVA A CERTIFICAÇÃO E A EVIDÊNCIA ── */
  {
    const ca = ler('api/comprar-avatar.js');
    conferir('a venda leva `raridades` ao comprador',
      /chaveRar\s*&&\s*rarVendida\s*\?\s*\{\s*\[chaveRar\]:\s*rarVendida/.test(ca), null);
    conferir('e leva `feitos` também',
      /chaveFeitos && feitosVendidos \? \{ \[chaveFeitos\]: feitosVendidos \}/.test(ca), null);
    /* E o comportamento: o comprador recebe a certificação e continua a
       acumular — um exame depois dela usa os feitos preservados. */
    let r = FE.feitoVazio(1);
    for (let i = 0; i < 4; i++)
      r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-0' + (i + 1), 100 + i,
        { uid: 'f' + i, pontos: 1200, divisao: 'adulto', em: 1, ciclo: '2026-01' });
    const vendido = FE.feitoMarco(r, 'venda', 9000);
    const antes = RAR.rarExaminar(FE.feitoDe({ a: r }, 'a'));
    const depois = RAR.rarExaminar(FE.feitoDe({ a: vendido }, 'a'));
    conferir('o exame dá o mesmo antes e depois da venda',
      JSON.stringify(antes) === JSON.stringify(depois), [antes, depois]);
    /* E o comprador acrescenta o quinto ciclo e chega a Lendário. */
    const maisUm = FE.feitoPvp(vendido, 'vitoria', 'fila', '2026-05', 9999, null);
    conferir('e o comprador continua a construir sobre o que recebeu',
      RAR.rarExaminar(FE.feitoDe({ a: maisUm }, 'a')).raridade === 'Lendário',
      RAR.rarExaminar(FE.feitoDe({ a: maisUm }, 'a')));
  }
}

console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '') + ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
