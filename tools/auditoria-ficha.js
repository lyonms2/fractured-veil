#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DA FICHA — motor Fabula Ultima

   Escrita ANTES do motor, e de propósito. É ela que nos diz se a ficha
   está certa enquanto a escrevemos, em vez de descobrirmos no fim que
   um avatar em cada trinta nasce com a Vontade no sítio do Vigor.

   O que ela guarda, por ordem de gravidade:

     1. As seis contas do manual, número a número.
     2. O DETERMINISMO — o mesmo DNA dá sempre a mesma ficha.
        É o mais importante de todos: a ficha decide quanto um avatar
        vale, e ele vende-se por cristais que saem em MATIC.
     3. As afinidades: ninguém resiste e é vulnerável à mesma coisa,
        ninguém é vulnerável ao que resiste, o físico nunca é costura.
     4. A distribuição: nenhum atributo é favorecido pela ordem da
        lista, e os quatro arranjos aparecem todos.

   Corre sem navegador e sem rede:  node tools/auditoria-ficha.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');

let ok = 0, mau = 0;
const falhas = [];

function verificar(nome, condicao, detalhe) {
  if (condicao) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe ? '\n      ' + detalhe : ''));
}

function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

/* Um avatar de mentira com a forma do verdadeiro. O seed manda em tudo
   o que é sorteado, portanto um seed fixo dá um avatar fixo. */
function avatar(seed, nivel, origem) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'auditoria', nome: 'Teste' });
  cert.seed = seed;
  cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna(origem || 'Comum', seed);
  return { id: cert.id, seed, nivel: nivel || 5, nascimento: cert.nascimento };
}

/* Um DNA forjado, com os quatro genes postos à mão. É a única forma de
   testar o mapa gene→atributo: com DNA sorteado, trocar o VIG pelo VON
   na tabela deixa tudo verde, porque nada sabe qual devia ser qual. */
function dnaForjado(F, H, R, A, cor) {
  return { genes: { F: [F, 0], H: [H, 0], R: [R, 0], A: [A, 0],
                    cor: [cor || 0, 0], sexo: ['X', 'Y'], indole: [0, 0], vigor: [0, 0] } };
}
function comDna(dna, seed, nivel) {
  return { id: 'forjado', seed: seed || 1, nivel: nivel || 5,
           nascimento: { dna, seed: seed || 1 } };
}

/* ═══ 1 · AS SEIS CONTAS ═══════════════════════════════════════════ */
titulo('As seis contas do manual');
{
  for (const nivel of [5, 11, 27, 50]) {
    for (let s = 1; s <= 40; s++) {
      const a = avatar(s * 7919, nivel);
      const f = F.fuFicha(a);
      /* A Carne Teimosa e a Fonte Funda entram na conta, e têm de entrar
         aqui também: a fórmula do manual mais o que a vantagem acrescenta.
         Somar `dons` à espera nao é fazer a conta bater à força — é dizer
         onde é que os dez pontos podem entrar, que é num sítio só. */
      verificar(`PV = nível×2 + VIG×5 + dom (nv ${nivel}, seed ${a.seed})`,
        f.pvMax === nivel * 2 + f.VIG * 5 + f.dons.pvMais,
        `deu ${f.pvMax}, esperava ${nivel * 2 + f.VIG * 5 + f.dons.pvMais}`);
      verificar(`PM = nível + VON×5 + dom (nv ${nivel})`,
        f.pmMax === nivel + f.VON * 5 + f.dons.pmMais);
      verificar('Crise = metade dos PV',
        f.crise === Math.floor(f.pvMax / 2));
      verificar('Defesa base = dado de DES',
        f.defesaBase === f.DES);
      verificar('Defesa Mágica base = dado de PER',
        f.defMagBase === f.PER);
      verificar('Iniciativa = (DES + PER) ÷ 2',
        f.iniciativa === Math.floor((f.DES + f.PER) / 2));
    }
  }
}

/* ═══ 2 · O DETERMINISMO ══════════════════════════════════════════ */
titulo('O mesmo DNA dá sempre a mesma ficha');
{
  for (let s = 1; s <= 60; s++) {
    const a = avatar(s * 104729, 5);
    const primeira = JSON.stringify(F.fuFicha(a));
    // dez vezes seguidas, e uma delas depois de mexer noutro avatar
    let igual = true;
    for (let i = 0; i < 10; i++) {
      F.fuFicha(avatar(s * 31, 20));            // ruído entre as leituras
      if (JSON.stringify(F.fuFicha(a)) !== primeira) igual = false;
    }
    verificar('ficha estável ao longo de dez leituras (seed ' + a.seed + ')', igual);
  }

  /* ── O QUE MUDA AO SUBIR, E O QUE NÃO ──

     O tipo, a costura, o arranjo e a ordem são de nascença e não podem
     mudar porque o avatar cresceu. Foi este o defeito que as magias e as
     vantagens já tiveram no motor antigo.

     Os DADOS mudam, e só em três sítios: nos níveis 20, 40 e 60, que é a
     regra do manual (p. 302). Esta verificação dizia que os dados eram
     imutáveis, e passou a falhar em 40 avatares no dia em que a regra
     entrou — que é exactamente o que ela devia fazer.

     Continua a ser apertada: os dados não só mudam nos três degraus como
     NÃO mudam em mais lado nenhum, e nunca descem. */
  for (let s = 1; s <= 40; s++) {
    const base = avatar(s * 65537, 1);
    let quebras = 0, degrausVistos = [];
    let ant = F.fuFicha(base);
    for (let nv = 2; nv <= 60; nv++) {
      const f = F.fuFicha(Object.assign({}, base, { nivel: nv }));
      const mudou = F.FU_ATRIBS.some(a => f[a] !== ant[a]);
      const desceu = F.FU_ATRIBS.some(a => f[a] < ant[a]);
      const degrau = F.FU_SUBIDAS_NIVEL.indexOf(nv) !== -1;

      if (desceu) quebras++;                      // nunca desce
      if (mudou && !degrau) quebras++;            // e só mexe nos degraus
      if (mudou) degrausVistos.push(nv);
      // o que é de nascença não se mexe nunca
      if (f.tipo !== ant.tipo || f.costura !== ant.costura
       || f.arranjo !== ant.arranjo || f.ordem.join() !== ant.ordem.join()) quebras++;
      ant = f;
    }
    verificar('o tipo, a costura e o arranjo não mudam, e os dados só sobem '
      + 'nos degraus (seed ' + base.seed + ')', quebras === 0,
      'mudou em ' + (degrausVistos.join(',') || 'nenhum'));
  }

  /* E os degraus são mesmo três, e estão mesmo onde o manual os põe. */
  verificar('os degraus do manual são o 20, o 40 e o 60',
    F.FU_SUBIDAS_NIVEL.join(',') === '20,40,60', F.FU_SUBIDAS_NIVEL.join(','));

  /* ── A ORIGEM DO OVO ──

     Um ovo Lendário dá duas subidas de dado à nascença, um Raro dá uma, um
     Comum não dá nenhuma. Durante um tempo a origem não mudava NADA na
     ficha — medido em 0 de 2000 sementes — e um ovo caro dava um avatar
     indistinguível de um barato. */
  for (let s = 1; s <= 60; s++) {
    const seed = s * 7919;
    const fichas = {};
    for (const origem of ['Comum', 'Raro', 'Lendário']) {
      const a = avatar(seed, 5);
      a.nascimento.origem = origem;
      fichas[origem] = F.fuFicha(a);
    }
    const soma = f => F.FU_ATRIBS.reduce((t, x) => t + f[x], 0);
    verificar('o ovo Raro dá um dado a mais do que o Comum (' + seed + ')',
      soma(fichas.Raro) > soma(fichas.Comum),
      soma(fichas.Comum) + ' → ' + soma(fichas.Raro));
    verificar('e o Lendário dá dois (' + seed + ')',
      soma(fichas['Lendário']) > soma(fichas.Raro),
      soma(fichas.Raro) + ' → ' + soma(fichas['Lendário']));
    verificar('mas nenhum lhe troca o arranjo (' + seed + ')',
      fichas.Comum.arranjo === fichas['Lendário'].arranjo
      && fichas.Comum.ordem.join() === fichas['Lendário'].ordem.join());
    verificar('nem o tipo nem a costura (' + seed + ')',
      fichas.Comum.tipo === fichas['Lendário'].tipo
      && fichas.Comum.costura === fichas['Lendário'].costura);
  }

  /* E a origem lê-se da CERTIDÃO, nunca do campo `raridade` do slot —
     que o cliente escreve. Dois tamanhos de dado por uma linha no console
     é o mesmo buraco que a raridade da ficha já teve uma vez. */
  {
    const forjado = avatar(31337, 5);
    const limpo = F.fuFicha(forjado);
    for (const mentira of ['Lendário', 'Raro', 'Divino']) {
      const f = F.fuFicha(Object.assign({}, forjado, { raridade: mentira }));
      verificar('escrever raridade "' + mentira + '" no slot não dá dados',
        F.FU_ATRIBS.every(a => f[a] === limpo[a]));
    }
    const semCert = Object.assign({}, forjado, { raridade: 'Lendário' });
    delete semCert.nascimento;
    verificar('e sem certidão a origem é Comum, mesmo com raridade escrita',
      F.fuFicha(semCert).subidas === 0);
  }

  /* Um tecto que se atinge: cinco subidas (Lendário + os três níveis) num
     arranjo extremo. As que não couberem perdem-se, e a ficha diz quantas
     couberam — senão um jogador com tudo em d12 não percebia porque é que
     o nível 60 não lhe deu nada. */
  {
    const tectoMax = F.FU_DADOS[F.FU_DADOS.length - 1];
    let apanhou = 0;
    for (let s = 1; s <= 400; s++) {
      const a = avatar(s * 104729, 60);
      a.nascimento.origem = 'Lendário';
      const f = F.fuFicha(a);
      verificar('nenhum dado passa do d12 (' + a.seed + ')',
        F.FU_ATRIBS.every(x => f[x] <= tectoMax), F.FU_ATRIBS.map(x => f[x]).join(','));
      verificar('e as subidas usadas nunca passam as ganhas (' + a.seed + ')',
        f.subidasUsadas <= f.subidas, f.subidasUsadas + ' de ' + f.subidas);
      if (f.subidasUsadas < f.subidas) apanhou++;
    }
    console.log('   subidas desperdiçadas pelo tecto: ' + apanhou + ' de 400 Lendários nv60');
  }
}

/* ═══ 3 · AS AFINIDADES ═══════════════════════════════════════════ */
titulo('As afinidades');
{
  for (const raridade of ['Comum', 'Raro', 'Lendário']) {
    for (let s = 1; s <= 60; s++) {
      /* As três origens, e não só a Comum. Correr tudo com uma origem
         só foi o que escondeu, na primeira versão, que a raridade do
         ovo não estava a chegar à ficha. */
      const origem = ['Comum', 'Raro', 'Lendário'][s % 3];
      const dna = GEN.nascimento.gerarDna(origem, s * 2654435761);
      const tipo    = F.fuTipoDoDna(dna);
      const costura = F.fuCosturaDoDna(dna, s * 2654435761);
      const af      = F.fuAfinidades(tipo, costura, raridade);

      verificar('a costura nunca é o próprio tipo',
        costura !== tipo, `tipo ${tipo}, costura ${costura}`);
      verificar('o físico nunca é costura',
        costura !== 'fisico');
      verificar('as nove entradas estão todas presentes',
        F.FU_DANOS.every(d => d in af),
        'faltam: ' + F.FU_DANOS.filter(d => !(d in af)).join(', '));
      /* ── A REGRA DE ANULAÇÃO ──
         O que aqui estava não podia falhar: pedia `af[d] === 'RS'` num
         `d` que era a costura, e a costura escreve sempre por cima. A
         condição era insatisfazível para qualquer entrada, e era
         precisamente este o defeito que ela devia guardar.
         Agora testa-se a regra do manual pelo que ela diz: quando as
         duas fontes caem no mesmo tipo, o resultado é NENHUMA. */
      verificar('resistência e vulnerabilidade no mesmo tipo anulam-se',
        af[costura] !== 'RS',
        `costura ${costura} ficou ${af[costura]}`);

      if (raridade === 'Lendário') {
        verificar('o Lendário absorve o próprio tipo', af[tipo] === 'AB');
      } else {
        verificar('o Comum e o Raro resistem ao próprio tipo', af[tipo] === 'RS');
      }
      if (raridade === 'Comum') {
        const quantas = F.FU_DANOS.filter(d => af[d] === 'RS').length;
        verificar('o Comum resiste a UM tipo só', quantas === 1, 'resiste a ' + quantas);
      }
      if (raridade !== 'Comum') {
        /* Também este não podia falhar: enumerava todos os valores que
           o campo pode ter. O que interessa saber é se o vizinho fica
           RESISTIDO — ou anulado, quando a costura calha nele. */
        const viz = F.fuVizinhoDoTipo(tipo);
        const esperado = (costura === viz) ? null : 'RS';
        verificar('o vizinho fica resistido, ou anulado se a costura lá cair',
          af[viz] === esperado,
          `vizinho de ${tipo} é ${viz}, costura ${costura}, ficou ${af[viz]} e esperava ${esperado}`);
      }
      verificar('o físico nunca tem afinidade',
        af.fisico === null);
    }
  }

  // A roda fecha sobre si mesma: oito passos voltam ao princípio.
  for (const t of F.FU_TIPOS) {
    let x = t;
    for (let i = 0; i < F.FU_TIPOS.length; i++) x = F.fuVizinhoDoTipo(x);
    verificar('a roda fecha em ' + F.FU_TIPOS.length + ' passos (' + t + ')', x === t);
  }
}

/* ═══ 4 · A DISTRIBUIÇÃO ══════════════════════════════════════════ */
titulo('A distribuição, em 4000 avatares');
{
  const N = 4000;
  const arranjos = {}, atribTop = {}, tipos = {}, costuras = {};
  for (const a of F.FU_ARRANJOS) arranjos[a.id] = 0;
  for (const a of F.FU_ATRIBS) atribTop[a] = 0;
  for (const t of F.FU_TIPOS) { tipos[t] = 0; costuras[t] = 0; }

  for (let s = 1; s <= N; s++) {
    const a = avatar(s * 1103515245, 5);
    const f = F.fuFicha(a);
    arranjos[f.arranjo]++;
    atribTop[f.ordem[0]]++;
    tipos[f.tipo]++;
    costuras[f.costura]++;
  }

  console.log('   arranjos:', Object.entries(arranjos).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('   atributo mais alto:', Object.entries(atribTop).map(([k, v]) => `${k} ${v}`).join(' · '));

  verificar('os quatro arranjos aparecem todos',
    Object.values(arranjos).every(v => v > 0),
    JSON.stringify(arranjos));

  /* O que este teste existe para apanhar: o empate desempatado pela
     ORDEM DA LISTA. Sem o desempate pelo seed, a DES ficava com o dado
     maior em todos os avatares de genes iguais — meio dado de vantagem
     a uma boa fatia da população, e ninguém daria por isso. */
  const esperado = N / 4;
  for (const a of F.FU_ATRIBS) {
    /* A tolerância era de 35% e o desvio real é de 6% — um viés de 20%
       passava sem ninguém dar por ele. A 12% ainda cabe o ruído do
       sorteio e já não cabe um dedo na balança. */
    verificar('nenhum atributo é favorecido pela ordem da lista (' + a + ')',
      Math.abs(atribTop[a] - esperado) < esperado * 0.12,
      `${a} ficou em primeiro ${atribTop[a]} vezes de ${N}; esperava perto de ${esperado}`);
  }

  verificar('os oito tipos de dano aparecem todos',
    Object.values(tipos).every(v => v > 0), JSON.stringify(tipos));
  verificar('as oito costuras aparecem todas',
    Object.values(costuras).every(v => v > 0), JSON.stringify(costuras));
}

/* ═══ 5 · A ESCOLHA DO LENDÁRIO ══════════════════════════════════ */
titulo('A escolha do Lendário');
{
  for (let s = 1; s <= 30; s++) {
    const a = avatar(s * 40503, 30);
    const com = F.fuFicha(a);
    const sem = F.fuFicha(Object.assign({}, a, { escolhaAnciao: 'semDefeito' }));
    verificar('fechar a costura tira a vulnerabilidade',
      sem.costura === null && !Object.values(sem.afinidades).includes('VU'));
    verificar('e não mexe em mais nada',
      sem.DES === com.DES && sem.VIG === com.VIG && sem.pvMax === com.pvMax
      && sem.tipo === com.tipo);
    verificar('o Lendário continua a absorver o próprio tipo',
      sem.afinidades[sem.tipo] === 'AB');
  }
}

/* ═══ 6 · OS TAMANHOS DE DADO ════════════════════════════════════ */
titulo('Os dados');
{
  verificar('subir do d12 não passa do d12', F.fuSubirDado(12) === 12);
  verificar('descer do d6 não passa do d6',  F.fuDescerDado(6) === 6);
  verificar('d8 sobe para d10', F.fuSubirDado(8) === 10);
  verificar('d8 desce para d6', F.fuDescerDado(8) === 6);
  verificar('um dado fora da escala não rebenta', F.fuSubirDado(7) === 7);

  for (let s = 1; s <= 200; s++) {
    const f = F.fuFicha(avatar(s * 7717, 5));
    verificar('os quatro dados estão na escala (seed ' + f.seed + ')',
      F.FU_ATRIBS.every(a => F.FU_DADOS.includes(f[a])),
      JSON.stringify([f.DES, f.PER, f.VIG, f.VON]));
    verificar('os quatro dados são os do arranjo escolhido',
      JSON.stringify(F.FU_ATRIBS.map(x => f[x]).sort((p, q) => q - p))
      === JSON.stringify(F.FU_ARRANJOS.find(x => x.id === f.arranjo).dados.slice().sort((p, q) => q - p)));
  }
}

/* ═══ 7 · O MAPA GENE → ATRIBUTO ═════════════════════════════════
   O teste que faltava e sem o qual trocar o VIG pelo VON na tabela
   deixava tudo verde: com DNA sorteado nada sabe qual gene devia ser
   qual. Aqui o DNA é forjado, um gene alto de cada vez, e confere-se
   que o dado maior cai no atributo certo. */
titulo('O mapa gene → atributo');
{
  const esperado = { F: 'VIG', H: 'DES', R: 'VON', A: 'PER' };
  for (const gene of ['F', 'H', 'R', 'A']) {
    const alto = { F: 0, H: 0, R: 0, A: 0 };
    alto[gene] = 5;
    const f = F.fuFicha(comDna(dnaForjado(alto.F, alto.H, alto.R, alto.A)));
    verificar('o gene ' + gene + ' manda no ' + esperado[gene],
      f.ordem[0] === esperado[gene],
      'o dado maior caiu em ' + f.ordem[0]);
  }
  // e a soma dos dois alelos é o que conta, não o primeiro
  const a = F.fuFicha(comDna(dnaForjado(5, 0, 0, 0)));
  const b = F.fuFicha(comDna({ genes: Object.assign(dnaForjado(0,0,0,0).genes, { F: [0, 5] }) }));
  verificar('os dois alelos somam-se, a ordem entre eles não conta',
    a.ordem[0] === b.ordem[0] && a.VIG === b.VIG);
}

/* ═══ 8 · A RARIDADE SAI DO NÍVEL ════════════════════════════════
   Não estava coberta de ponta a ponta: a auditoria passava a raridade
   à mão para o fuAfinidades e nunca conferia que um slot de nível 11
   se torna Raro de facto. */
titulo('A raridade');
{
  const degraus = [[1,'Comum'],[5,'Comum'],[10,'Comum'],[11,'Raro'],[26,'Raro'],
                   [27,'Lendário'],[50,'Lendário'],[60,'Lendário']];
  for (const [nv, esperada] of degraus) {
    const f = F.fuFicha(avatar(12345, nv));
    verificar('nível ' + nv + ' é ' + esperada, f.raridade === esperada, 'deu ' + f.raridade);
  }
  /* E não se deixa enganar pelo campo do slot, que o cliente escreve.
     Foi este o defeito que a revisão mediu: a mesma ficha dava Lendário
     ou Raro conforme quem a carregava. */
  const forjado = Object.assign(avatar(999, 5), { raridade: 'Lendário' });
  verificar('um slot que se diz Lendário ao nível 5 continua Comum',
    F.fuFicha(forjado).raridade === 'Comum');
  verificar('e não ganha a absorção por o dizer',
    F.fuFicha(forjado).afinidades[F.fuFicha(forjado).tipo] === 'RS');
}

/* ═══ 9 · O QUE CHEGA PARTIDO ════════════════════════════════════
   Um DNA em falta dava uma ficha plausível e calada. Agora dá uma ficha
   MARCADA, e é a marca que se testa: o jogo não pode parar, mas ninguém
   deve poder vender um avatar assim. */
titulo('Dados partidos');
{
  const partidos = [
    ['sem nascimento',  { seed: 7, nivel: 5 }],
    ['nascimento vazio',{ seed: 7, nivel: 5, nascimento: {} }],
    ['dna nulo',        { seed: 7, nivel: 5, nascimento: { dna: null } }],
    ['genes vazios',    { seed: 7, nivel: 5, nascimento: { dna: { genes: {} } } }],
    ['genes lixo',      { seed: 7, nivel: 5, nascimento: { dna: { genes:
                          { F: 'x', H: null, R: [NaN, 1], A: [1], cor: 'azul' } } } }],
  ];
  for (const [nome, slot] of partidos) {
    const f = F.fuFicha(slot);
    verificar(nome + ' devolve ficha', !!f);
    verificar(nome + ' vem MARCADO', f && f.semDna === true);
    verificar(nome + ' não rebenta as contas',
      f && Number.isFinite(f.pvMax) && Number.isFinite(f.pmMax) && f.pvMax > 0);
  }
  const bom = F.fuFicha(avatar(7919, 5));
  verificar('um avatar inteiro NÃO vem marcado', bom.semDna === false);

  // níveis fora da escala
  for (const [nv, esperado] of [[0,1],[-5,1],[NaN,1],[1e9,60],[61,60],[60,60]]) {
    const f = F.fuFicha(Object.assign(avatar(7919, 5), { nivel: nv }));
    verificar('nível ' + nv + ' fica ' + esperado, f.nivel === esperado, 'deu ' + f.nivel);
  }
  // seed 0 e seeds simétricos
  verificar('o seed 0 não rebenta', !!F.fuFicha(Object.assign(avatar(7919, 5), { seed: 0 })));
  {
    const pos = F.fuFicha(Object.assign(avatar(7919, 5), { seed: 12345 }));
    const neg = F.fuFicha(Object.assign(avatar(7919, 5), { seed: -12345 }));
    verificar('o seed +n e o −n dão avatares diferentes',
      pos.costura !== neg.costura || JSON.stringify(pos.ordem) !== JSON.stringify(neg.ordem));
  }
}

/* ═══ O VEREDICTO ════════════════════════════════════════════════ */
console.log('\n' + '─'.repeat(62));
if (falhas.length) {
  console.log(falhas.slice(0, 25).join('\n'));
  if (falhas.length > 25) console.log('  … e mais ' + (falhas.length - 25) + '.');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
