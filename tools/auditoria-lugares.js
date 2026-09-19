#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DOS CINCO LUGARES — motor Fabula Ultima

   Chama-se LUGARES e não magias por duas razões: é o nome que o jogo
   lhes dá, e já existe um tools/auditoria-magias.js — o do 3D&T, que
   continua a guardar o motor antigo enquanto ele lá estiver.

   O que guarda:

     1. As dezoito casas existem e nenhuma está vazia.
     2. Os OITO tipos têm variante nas duas linhas que a pedem. Foi a do
        veneno que faltava no manual, e é a que mais depressa se esquece
        outra vez.
     3. Os números são os do manual, casa a casa.
     4. Cada forma de acção faz o que diz — e sobretudo o que NÃO faz:
        o concentrado ignora RESISTÊNCIAS e não a imunidade nem a
        absorção.
     5. O que não pode acontecer: pagar sem poder, curar acima do
        máximo, uma magia de cena a somar-se a si própria.
     6. O RITMO, medido contra o terço de PV que o manual pede.

   node tools/auditoria-lugares.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const M   = require('../js/combate-fu.js');
const G   = require('../js/magias-fu.js');
Object.assign(global, M, G);

let ok = 0, mau = 0;
const falhas = [];
function verificar(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe ? '\n      ' + detalhe : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

function avatar(seed, nivel, nome) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  return { id: nome, nome, seed, nivel: nivel || 5, nascimento: cert.nascimento };
}
/* A semente da BATALHA entra também na dos avatares. Sem isto, mudar a
   semente só mexia nos dados: as seis criaturas eram sempre as mesmas, e
   uma tabela de 400 amostras media um duelo em vez de medir o jogo. */
const equipa = (p, nv, sem) =>
  [1, 2, 3].map(i => avatar((sem || 1) * 1000003 + p * 7919 + i * 104729, nv, p + '' + i));
const luta = (nv, sem) => M.fuIniciar(equipa(1, nv, sem), equipa(2, nv, sem), sem || 1);
/* Uma ficha de mão cheia, para se perguntar ao catálogo sem passar por um
   avatar inteiro. O FEITIO faz parte dela desde que passou a decidir o
   repertório: sem ele, `fuMagiaDe` devolvia nulo para quatro dos cinco
   lugares e meia auditoria rebentava com "não consigo ler 'nome' de
   nulo" — que é o motor a dizer, correctamente, que aquele avatar não
   sabe aquilo. */
const fichaDe = (tipo, raridade, feitio) =>
  ({ tipo, raridade, feitio: feitio || 'guarda', DES: 8, PER: 8, VIG: 8, VON: 8 });

// De que feitio é preciso ser para ter cada lugar.
const FEITIO_DE = { comum: 'guarda', forte: 'guarda', defesa: 'guarda',
                    muito_forte: 'lamina', suporte: 'sustentacao' };
const fichaCom = (lugar, tipo, raridade) =>
  fichaDe(tipo || 'fogo', raridade || 'Comum', FEITIO_DE[lugar]);

/* ═══ 1 · AS DEZOITO CASAS ═══════════════════════════════════════ */
titulo('As dezoito casas');
{
  verificar('são cinco lugares', G.FU_LUGARES.length === 5, G.FU_LUGARES.join(','));
  for (const lugar of G.FU_LUGARES) {
    for (const grau of [1, 2, 3]) {
      const casa = G.FU_MAGIAS[lugar] && G.FU_MAGIAS[lugar][grau];
      verificar('existe ' + lugar + ' nv' + grau, !!casa);
      if (!casa) continue;
      verificar(lugar + ' nv' + grau + ' tem id', typeof casa.id === 'string' && !!casa.id);
      verificar(lugar + ' nv' + grau + ' diz de onde vem', typeof casa.manual === 'string');
      verificar(lugar + ' nv' + grau + ' faz alguma coisa',
        casa.fixo != null || casa.cura != null || casa.cena != null || casa.danoFixo != null
          || casa.proteger === true,
        'não tem dano, nem cura, nem efeito de cena');
    }
  }
  verificar('Comum é o degrau 1',    G.fuDegrau('Comum') === 1);
  verificar('Raro é o degrau 2',     G.fuDegrau('Raro') === 2);
  verificar('Lendário é o degrau 3', G.fuDegrau('Lendário') === 3);
  verificar('uma raridade desconhecida cai no degrau 1', G.fuDegrau('Xis') === 1);
}

/* ═══ 2 · OS OITO TIPOS ══════════════════════════════════════════ */
titulo('Os oito tipos têm magia');
{
  for (const tipo of F.FU_TIPOS) {
    verificar('a barragem tem nome para ' + tipo,
      G.FU_ELEMENTAL[tipo] && typeof G.FU_ELEMENTAL[tipo].nome === 'string');
    verificar('e um estado que o motor conhece (' + tipo + ')',
      G.FU_ELEMENTAL[tipo] && !!M.FU_ESTADOS[G.FU_ELEMENTAL[tipo].estado],
      'estado "' + (G.FU_ELEMENTAL[tipo] || {}).estado + '" não existe no motor');
    verificar('o concentrado tem nome para ' + tipo,
      G.FU_CONCENTRADO[tipo] && G.FU_CONCENTRADO[tipo].nome && G.FU_CONCENTRADO[tipo].en);
  }
  verificar('nenhum tipo ficou de fora da barragem',
    Object.keys(G.FU_ELEMENTAL).length === F.FU_TIPOS.length);
  verificar('nenhum tipo ficou de fora do concentrado',
    Object.keys(G.FU_CONCENTRADO).length === F.FU_TIPOS.length);

  const nomes = Object.values(G.FU_ELEMENTAL).map(x => x.nome)
    .concat(Object.values(G.FU_CONCENTRADO).map(x => x.nome));
  verificar('nenhum nome de magia se repete',
    new Set(nomes).size === nomes.length,
    nomes.filter((n, i) => nomes.indexOf(n) !== i).join(', '));

  for (const tipo of F.FU_TIPOS) {
    const m = G.fuMagiaDe(fichaCom('forte', tipo, 'Raro'), 'forte');
    // O nome é o do elemento seguido da palavra do feitio (FU_NOME_FORTE).
    verificar('um avatar de ' + tipo + ' leva a barragem dele',
      m.tipo === tipo && m.nome.indexOf(G.FU_ELEMENTAL[tipo].nome + ' ') === 0, m.nome);
    verificar('e o estado dela (' + tipo + ')', m.estado === G.FU_ELEMENTAL[tipo].estado);
    verificar('e o concentrado dele (' + tipo + ')',
      G.fuMagiaDe(fichaCom('muito_forte', tipo, 'Raro'), 'muito_forte').nome
        === G.FU_CONCENTRADO[tipo].nome);
  }
  /* ── TRÊS LUGARES, E SÃO OS DO FEITIO ──

     Eram cinco em toda a gente, e o feitio não decidia nada. Agora cada
     um tem o golpe comum, a magia forte e o seu — e é isso que dá chão
     aos papéis da formação. */
  for (const feitio of ['guarda', 'lamina', 'sustentacao']) {
    const meus = G.fuMagiasDe(fichaDe('fogo', 'Comum', feitio));
    const esperados = G.FU_LUGARES_DO_FEITIO[feitio];
    verificar('o ' + feitio + ' tem três lugares', Object.keys(meus).length === 3,
      Object.keys(meus).join(','));
    verificar('e são os dele', esperados.every(l => !!meus[l]),
      Object.keys(meus).join(',') + ' contra ' + esperados.join(','));
    verificar('o golpe comum está em todos (' + feitio + ')', !!meus.comum);
    verificar('e a magia forte também (' + feitio + ')', !!meus.forte);
    verificar('o ' + feitio + ' tem o lugar que o distingue',
      meus[G.FU_LUGAR_DO_FEITIO[feitio]] != null, G.FU_LUGAR_DO_FEITIO[feitio]);
    // e os dos outros dois não existem para ele
    for (const outro of ['guarda', 'lamina', 'sustentacao']) {
      if (outro === feitio) continue;
      verificar('e não tem o lugar do ' + outro,
        meus[G.FU_LUGAR_DO_FEITIO[outro]] == null);
      verificar('nem pela porta directa (' + feitio + '/' + outro + ')',
        G.fuMagiaDe(fichaDe('fogo', 'Lendário', feitio),
                    G.FU_LUGAR_DO_FEITIO[outro]) === null);
    }
  }

  /* E os Lendários deixam de ser todos iguais: cada feitio traz UMA das
     magias de topo, em vez de as quatro. */
  const topo = {};
  for (const feitio of ['guarda', 'lamina', 'sustentacao']) {
    const m = G.fuMagiasDe(fichaDe('fogo', 'Lendário', feitio));
    topo[feitio] = m[G.FU_LUGAR_DO_FEITIO[feitio]].id;
  }
  verificar('cada feitio Lendário traz uma magia de topo diferente',
    new Set(Object.values(topo)).size === 3, JSON.stringify(topo));
}

/* ═══ 3 · OS NÚMEROS DO MANUAL ═══════════════════════════════════ */
titulo('Os números, casa a casa');
{
  const esperado = [
    ['forte', 1, { pm: 5,  alvos: 1, fixo: 10 }],
    // A Barragem do Raro com dano 10 por alvo desde 19/09/2026 (era 15).
    ['forte', 2, { pm: 10, alvos: 3, fixo: 10, porAlvo: true }],
    ['forte', 3, { pm: 15, alvos: 3, fixo: 15, porAlvo: true, estadoSempre: true }],
    ['muito_forte', 1, { pm: 10, alvos: 1, fixo: 15, estadoSempre: true }],
    ['muito_forte', 2, { pm: 15, alvos: 1, fixo: 25, ignoraResistencias: true }],
    ['muito_forte', 3, { pm: 30, danoFixo: 30, todos: true }],
    ['defesa', 1, { pm: 10, proprio: true }],
    ['defesa', 2, { pm: 5,  alvos: 3, porAlvo: true, aliado: true }],
    // O Proteger, no lugar da Misericórdia (14/09/2026).
    ['defesa', 3, { pm: 10, alvos: 1, aliado: true, proteger: true }],
    /* O Lamber Feridas é o desvio de regra do catálogo: o manual escreve-o
       em si próprio e aqui escolhe um companheiro — a escolha inclui-o a
       ele, portanto não perde o que o manual dava. A razão está escrita
       por cima da casa, em js/magias-fu.js. */
    // As curas e a Barragem Certa são as da calibragem de 14/09/2026.
    ['suporte', 1, { pm: 5,  alvos: 1, aliado: true, cura: 15, limpa: 1 }],
    ['suporte', 2, { pm: 10, alvos: 3, porAlvo: true, aliado: true, cura: 30, limpa: 1 }],
    ['suporte', 3, { pm: 20, alvos: 1, aliado: true }],
  ];
  for (const [lugar, grau, campos] of esperado)
    for (const [k, v] of Object.entries(campos))
      verificar(lugar + ' nv' + grau + ' · ' + k + ' = ' + v,
        G.FU_MAGIAS[lugar][grau][k] === v, 'está ' + G.FU_MAGIAS[lugar][grau][k]);

  verificar('o golpe comum não custa PM', G.FU_MAGIAS.comum[1].pm === 0);
  verificar('e é corpo-a-corpo', G.FU_MAGIAS.comum[1].corpoACorpo === true);
  verificar('e não troca de magia ao subir',
    G.FU_MAGIAS.comum[1].fixo === G.FU_MAGIAS.comum[3].fixo);

  verificar('uma magia por alvo cobra por cada um', G.fuCusto(G.FU_MAGIAS.forte[2], 3) === 30);
  verificar('uma de custo fixo cobra uma vez', G.fuCusto(G.FU_MAGIAS.muito_forte[2], 3) === 15);
  verificar('zero alvos continua a custar um', G.fuCusto(G.FU_MAGIAS.forte[2], 0) === 10);
  verificar('sem magia o custo é zero', G.fuCusto(null, 3) === 0);
}

/* ═══ 4 · AS CINCO FORMAS DE ACÇÃO ═══════════════════════════════ */
titulo('Cada forma faz o que diz');
{
  // ── a própria: Concha ──
  {
    const e = luta(10, 3), q = e.A[0];
    const m = G.fuMagiaDe(Object.assign({}, q.ficha, { feitio: 'guarda' }), 'defesa');
    const antesPM = q.pm;
    M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m });
    // A Concha resiste aos elementos dos inimigos de pé, e não ao físico.
    const deles = [...new Set(e.B.filter(c => c.vivo).map(c => c.ficha.tipo))];
    verificar('a Concha põe-se em si mesmo, com os elementos dos inimigos',
      !!q.efeitos.resisteTipos && deles.every(t => q.efeitos.resisteTipos[t] === true),
      JSON.stringify(q.efeitos.resisteTipos));
    verificar('e cobra os PM', q.pm === antesPM - m.pm);
    verificar('e gasta o turno', e.jaAgiu.indexOf(q.id) !== -1);
    q.ficha.pvMax = 100; q.ficha.afinidades = {};
    q.pv = 100;
    verificar('com Concha, o elemento do inimigo dói metade',
      M.fuAplicarDano(q, 40, deles[0]).perda === 20);
    q.pv = 100;
    verificar('e o físico entra inteiro', M.fuAplicarDano(q, 40, 'fisico').perda === 40);
  }

  // ── a aliada: Curar ──
  {
    const e = luta(10, 4), q = e.A[0], amigo = e.A[1];
    const m = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Raro', feitio: 'sustentacao' }), 'suporte');
    amigo.pv = 5;
    M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m, alvos: [amigo.id] });
    verificar('Curar aponta para dentro',
      amigo.pv === Math.min(amigo.ficha.pvMax, 35), 'ficou com ' + amigo.pv);
    amigo.pv = amigo.ficha.pvMax - 2;
    M.fuNovaRonda(e);
    M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m, alvos: [amigo.id] });
    verificar('e não passa do máximo', amigo.pv === amigo.ficha.pvMax);
  }

  // ── a Barreira: piso e não bónus ──
  {
    const e = luta(10, 5), q = e.A[0], amigo = e.A[1];
    amigo.ficha.DES = 6; amigo.ficha.PER = 6;
    const m = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Raro', feitio: 'guarda' }), 'defesa');
    M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m, alvos: [amigo.id] });
    verificar('a Barreira põe a Defesa em 12', M.fuDefesa(amigo) === 12);
    // e a Defesa Mágica também: é ela que as magias miram
    verificar('e a Defesa Mágica também',
      M.fuDefesaMag(amigo) === 12 + (amigo.ficha.dons.defMagMais | 0), M.fuDefesaMag(amigo) + '');
    const forte = e.A[2];
    forte.ficha.DES = 12; forte.efeitos.defesaMinima = 12;
    /* O piso não lhe tira nada — mas a Guarda Cerrada soma-se por cima,
       e este avatar pode tê-la. A conta é "o piso não mordeu", e não
       "a Defesa é doze". */
    verificar('e quem já tem d12 não perde nada',
      M.fuDefesa(forte) === 12 + (forte.ficha.dons.defesaMais | 0));
  }

  // ── a Misericórdia: salva uma vez ──
  {
    const e = luta(10, 6), q = e.A[0];
    q.efeitos.misericordia = true; q.pv = 10;
    const d1 = M.fuAplicarDano(q, 999, 'fisico');
    verificar('a Misericórdia deixa a um ponto de vida', q.pv === 1 && d1.salvou === true);
    verificar('e quem foi salvo continua de pé', q.vivo === true);
    const d2 = M.fuAplicarDano(q, 999, 'fisico');
    verificar('e desfaz-se: o golpe seguinte leva-o', q.pv === 0 && d2.caiu === true);
  }

  // ── o Despertar: sobe um dado, e sobe o melhor ──
  {
    const e = luta(30, 7), q = e.A[0], amigo = e.A[1];
    amigo.ficha.DES = 10; amigo.ficha.PER = 6; amigo.ficha.VIG = 6; amigo.ficha.VON = 6;
    const m = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Lendário', feitio: 'sustentacao' }), 'suporte');
    M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m, alvos: [amigo.id] });
    verificar('o Despertar sobe o atributo mais alto', amigo.efeitos.subirDado === 'DES');
    verificar('e o dado sobe mesmo', M.fuDado(amigo, 'DES') === 12);
    // mais o bônus do degrau (Lendário +2) e o da Guarda Cerrada, se tiver
    verificar('e a Defesa sobe com ele', M.fuDefesa(amigo)
      === 12 + (amigo.ficha.dons.defesaMais | 0) + (amigo.ficha.defesaDegrau | 0), M.fuDefesa(amigo) + '');

    // e nunca passa do d12
    amigo.ficha.DES = 12;
    verificar('sem passar do d12', M.fuDado(amigo, 'DES') === 12);

    /* Despertado E envenenado fica onde começou, e não abaixo: o
       manual conta os dois a partir do dado base. */
    const outro = e.A[2];
    outro.ficha.VIG = 8; outro.efeitos.subirDado = 'VIG';
    M.fuDarEstado(outro, 'envenenado');
    verificar('despertado e envenenado fica onde começou', M.fuDado(outro, 'VIG') === 8);
  }

  // ── a Devastação: sem rolagem, em todos ──
  {
    const e = luta(30, 8), q = e.A[0];
    const m = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Lendário' }), 'muito_forte');
    const passoAntes = e.rng.passo;
    e.B.forEach(c => { c.pv = 200; c.ficha.pvMax = 200; c.ficha.afinidades = {}; });
    const ev = M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m });
    verificar('a Devastação cai nos três', ev.filter(x => x.tipo === 'devastacao').length === 3);
    verificar('e NÃO rola dados nenhuns', e.rng.passo === passoAntes,
      'gastou ' + (e.rng.passo - passoAntes) + ' números');
    verificar('e tira os 30 a cada um', e.B.every(c => c.pv === 170),
      e.B.map(c => c.pv).join(','));

    const e2 = luta(30, 9), q2 = e2.A[0];
    const m2 = G.fuMagiaDe(Object.assign({}, q2.ficha, { raridade: 'Lendário' }), 'muito_forte');
    /* A crise abaixo da vida que eles têm: senão, um Lâmina lançando a
       Devastação somava a Execução (quem está em crise leva mais), e a
       absorção devolvia mais do que os 30 da magia. Aqui mede-se só a
       absorção. */
    e2.B.forEach(c => { c.pv = 50; c.ficha.pvMax = 200; c.ficha.crise = 40;
                        c.ficha.afinidades = { [m2.tipo]: 'AB' }; });
    M.fuAgir(e2, { quem: q2.id, tipo: 'magia', magia: m2 });
    verificar('quem ABSORVE o tipo dela cura-se com ela',
      e2.B.every(c => c.pv === 80), e2.B.map(c => c.pv).join(','));
  }

  // ── o concentrado: ignora resistências, e SÓ isso ──
  {
    const alvo = () => ({ vivo: true, pv: 200, guardando: false, estados: {}, efeitos: {},
                          ficha: { pvMax: 200, crise: 100, afinidades: { fogo: null } } });
    let a = alvo(); a.ficha.afinidades.fogo = 'RS';
    verificar('resistência normal corta a metade',
      M.fuAplicarDano(a, 40, 'fogo').perda === 20);
    a = alvo(); a.ficha.afinidades.fogo = 'RS';
    verificar('ignorando resistências, leva tudo',
      M.fuAplicarDano(a, 40, 'fogo', { ignoraResistencias: true }).perda === 40);
    a = alvo(); a.ficha.afinidades.fogo = 'IM';
    verificar('mas NÃO ignora a imunidade',
      M.fuAplicarDano(a, 40, 'fogo', { ignoraResistencias: true }).perda === 0);
    a = alvo(); a.ficha.afinidades.fogo = 'AB'; a.pv = 100;
    verificar('nem a absorção — continua a curar o inimigo',
      M.fuAplicarDano(a, 40, 'fogo', { ignoraResistencias: true }).curou === 40);
    a = alvo(); a.ficha.afinidades.fogo = 'VU';
    verificar('e a vulnerabilidade continua a dobrar',
      M.fuAplicarDano(a, 40, 'fogo', { ignoraResistencias: true }).perda === 80);
  }

  // ── o estado: na oportunidade ou sempre ──
  {
    const e = luta(15, 10), q = e.A[0], alvo = e.B[0];
    const nv3 = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Lendário' }), 'forte');
    verificar('o degrau 3 da barragem impõe o estado sempre', nv3.estadoSempre === true);
    const nv2 = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Raro' }), 'forte');
    verificar('e o degrau 2 não', !nv2.estadoSempre);

    // com estadoSempre, todo o acerto dá o estado
    let deu = 0, acertos = 0;
    for (let s = 1; s <= 300; s++) {
      const b = luta(15, s * 7);
      const at = b.A[0], al = b.B[0];
      const m = G.fuMagiaDe(Object.assign({}, at.ficha, { raridade: 'Lendário' }), 'forte');
      /* A Pele Calada recusa dois estados, e recusa em silêncio — de
         propósito, para quem contava com o estado perder o turno na
         mesma. Portanto a promessa do degrau 3 é "todo o acerto dá o
         estado A QUEM O POSSA APANHAR", e é essa que se confere. */
      if (M.fuDonsDe(al).imunes.indexOf(m.estado) !== -1) continue;
      const ev = M.fuAtacar(b, at, al, { magico: true, fixo: m.fixo, tipo: m.tipo,
        estado: m.estado, estadoSempre: true, atrib1: 'PER', atrib2: 'VON' });
      /* E a quem continua de pé: um golpe que derruba o alvo (possível
         desde que o Raro tem dano extra 7, contra quem é fraco ao tipo)
         não tem em quem pôr o estado. */
      if (ev.acertou && !ev.caiu) { acertos++; if (ev.estadoDado) deu++; }
    }
    verificar('com estadoSempre, todo o acerto dá o estado', deu === acertos,
      deu + ' de ' + acertos);
  }
}

/* ═══ 5 · O QUE NÃO PODE ACONTECER ═══════════════════════════════ */
titulo('O que não pode acontecer');
{
  const e = luta(10, 11), q = e.A[0];
  const m = G.fuMagiaDe(Object.assign({}, q.ficha, { raridade: 'Raro' }), 'forte');
  q.pm = 5;
  const ev = M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m, alvos: e.B.map(c => c.id) });
  verificar('sem PM para os três alvos, a magia não sai', ev.length === 0);
  verificar('e o turno NÃO se gasta', e.jaAgiu.length === 0);
  verificar('e os PM ficam onde estavam', q.pm === 5);

  const e2 = luta(10, 12), q2 = e2.A[0];
  const concha = G.fuMagiaDe(Object.assign({}, q2.ficha, { feitio: 'guarda' }), 'defesa');
  M.fuAgir(e2, { quem: q2.id, tipo: 'magia', magia: concha });
  const depois1 = JSON.stringify(q2.efeitos);
  M.fuNovaRonda(e2);
  M.fuAgir(e2, { quem: q2.id, tipo: 'magia', magia: concha });
  verificar('lançar a Concha outra vez não acumula',
    JSON.stringify(q2.efeitos) === depois1, JSON.stringify(q2.efeitos));

  const e3 = luta(10, 13);
  e3.B.forEach(c => { c.vivo = false; });
  const pm3 = e3.A[0].pm;
  verificar('sem inimigos, a magia de ataque não sai',
    M.fuAgir(e3, { quem: e3.A[0].id, tipo: 'magia',
                   magia: G.fuMagiaDe(e3.A[0].ficha, 'forte') }).length === 0);
  verificar('e não cobra PM', e3.A[0].pm === pm3);

  const e4 = luta(10, 14), q4 = e4.A[0];
  q4.pv = 10;
  M.fuAgir(e4, { quem: q4.id, tipo: 'magia',
                 magia: G.fuMagiaDe(Object.assign({}, q4.ficha, { raridade: 'Raro', feitio: 'sustentacao' }), 'suporte') });
  verificar('curar sem alvo escolhido cura quem lançou', q4.pv > 10, 'ficou com ' + q4.pv);

  /* E a prova de fogo: sessenta batalhas a usar os cinco lugares à vez,
     a conferir que nada sai dos limites e que todas acabam. */
  for (let s = 1; s <= 60; s++) {
    const b = luta(20, s * 13);
    let guarda = 0;
    while (!b.acabou && guarda++ < 400) {
      const vez = M.fuVez(b);
      if (!vez) { M.fuNovaRonda(b); continue; }
      const quem = M.fuPorId(b, vez.podem[0]);
      /* Os lugares DELE, e não os cinco: pedir-lhe um que o feitio não tem
         devolvia nulo, e a prova de fogo passava a bater sem magia nenhuma
         sem se dar por isso. */
      const meus = G.fuLugaresDe(quem.ficha);
      const lugar = meus[guarda % meus.length];
      const mg = G.fuMagiaDe(quem.ficha, lugar);
      const paraDentro = lugar === 'defesa' || lugar === 'suporte';
      M.fuAgir(b, {
        quem: quem.id,
        tipo: lugar === 'comum' ? 'atacar' : 'magia',
        magia: lugar === 'comum' ? null : mg,
        alvos: (paraDentro ? b[quem.lado] : b[quem.lado === 'A' ? 'B' : 'A']).map(c => c.id),
      });
    }
    verificar('batalha ' + s + ': vida dentro dos limites',
      b.A.concat(b.B).every(c => c.pv >= 0 && c.pv <= c.ficha.pvMax));
    verificar('batalha ' + s + ': PM dentro dos limites',
      b.A.concat(b.B).every(c => c.pm >= 0 && c.pm <= c.ficha.pmMax));
    verificar('batalha ' + s + ' acaba', b.acabou, 'parou na ronda ' + b.ronda);
  }
}

/* ═══ 6 · O RITMO ════════════════════════════════════════════════ */
titulo('O ritmo, contra o terço que o manual pede');
{
  /* O manual (p. 296): "um ataque bem-sucedido deve tirar cerca de um
     terço dos PV de um personagem médio". É por aqui que se vê se as
     magias estão no sítio — e é a medição que ficou marcada quando o
     motor entrou só com o golpe comum. */
  const linhas = [];
  for (const [lugar, raridade, nivel] of
       [['comum', 'Comum', 10], ['forte', 'Comum', 10], ['muito_forte', 'Comum', 10],
        ['forte', 'Raro', 15], ['muito_forte', 'Raro', 15],
        ['forte', 'Lendário', 30], ['muito_forte', 'Lendário', 30]]) {
    let soma = 0, acertos = 0, tentativas = 0, pvAlvo = 0, n = 0;
    for (let s = 1; s <= 400; s++) {
      const e = luta(nivel, s * 31);
      const q = e.A[0], alvo = e.B[0];
      alvo.ficha.afinidades = {};          // sem afinidade, para medir o cru
      alvo.pv = alvo.ficha.pvMax;
      pvAlvo += alvo.ficha.pvMax; n++;
      /* Com o FEITIO do lugar que se está a medir: o avatar sorteado pode
         ser Guarda, e pedir-lhe o muito_forte devolvia nulo. Aqui não se
         está a medir quem tem o quê — isso é a secção 2 — está-se a medir
         quanto dói cada magia a quem a tem. */
      const m = G.fuMagiaDe(
        Object.assign({}, q.ficha, { raridade, feitio: FEITIO_DE[lugar] }), lugar);
      q.pm = 999; tentativas++;
      if (lugar === 'comum') {
        const ev = M.fuAtacar(e, q, alvo, { fixo: 5 });
        if (ev.acertou) { acertos++; soma += ev.perda; }
      } else if (m.todos) {
        const antes = alvo.pv;
        M.fuAgir(e, { quem: q.id, tipo: 'magia', magia: m });
        acertos++; soma += antes - alvo.pv;
      } else {
        const ev = M.fuAtacar(e, q, alvo, {
          magico: true, fixo: m.fixo, tipo: m.tipo,
          ignoraResistencias: m.ignoraResistencias, atrib1: 'PER', atrib2: 'VON' });
        if (ev.acertou) { acertos++; soma += ev.perda; }
      }
    }
    const pvM = pvAlvo / n, dM = soma / Math.max(1, acertos);
    linhas.push({ lugar, raridade, nivel, pv: pvM, dano: dM,
                  pct: dM / pvM * 100, acerto: acertos / tentativas * 100 });
  }
  for (const l of linhas)
    console.log('   ' + (l.lugar + '            ').slice(0, 13) +
      (l.raridade + '          ').slice(0, 10) +
      ('nv' + l.nivel + '   ').slice(0, 5) +
      'PV ' + l.pv.toFixed(0).padStart(3) +
      ' · golpe ' + l.dano.toFixed(1).padStart(5) +
      ' = ' + l.pct.toFixed(0).padStart(3) + '% dos PV' +
      ' · acerta ' + l.acerto.toFixed(0).padStart(3) + '%');

  /* Não se trava aqui um intervalo apertado, de propósito: o equilíbrio
     é decisão do dono do jogo e não de uma auditoria. O que se trava é o
     ABSURDO — uma magia que não tira nada, ou que mata de um golpe um
     alvo com a vida cheia. */
  for (const l of linhas) {
    verificar(l.lugar + ' (' + l.raridade + ') tira alguma coisa', l.pct > 5,
      l.pct.toFixed(1) + '% dos PV');
    verificar(l.lugar + ' (' + l.raridade + ') não mata de um golpe', l.pct < 100,
      l.pct.toFixed(1) + '% dos PV');
  }
  const comum = linhas.find(l => l.lugar === 'comum');
  const forte = linhas.find(l => l.lugar === 'forte' && l.raridade === 'Comum');
  const conc  = linhas.find(l => l.lugar === 'muito_forte' && l.raridade === 'Comum');
  verificar('a barragem tira mais do que o murro', forte.dano > comum.dano,
    forte.dano.toFixed(1) + ' contra ' + comum.dano.toFixed(1));
  verificar('e o concentrado tira mais do que a barragem', conc.dano > forte.dano,
    conc.dano.toFixed(1) + ' contra ' + forte.dano.toFixed(1));
}

/* ═══ 7 · O ATAQUE FORTE MUDA COM O FEITIO ═══════════════════════
   A mesma magia para os três, com o que acontece depois do golpe mudando
   (FU_ESTILO_FORTE, em js/magias-fu.js). */
titulo('O ataque forte muda com o feitio');
{
  const forte = (feitio, raridade) => G.fuMagiaDe(fichaDe('fogo', raridade, feitio), 'forte');
  verificar('Guarda Comum guarda ao atacar', forte('guarda', 'Comum').estilo.guardaAoAtacar === 'proprio');
  verificar('Guarda Raro guarda também o mais ferido',
    forte('guarda', 'Raro').estilo.guardaAoAtacar === 'proprio_e_ferido');
  verificar('Guarda Lendário guarda a equipe inteira',
    forte('guarda', 'Lendário').estilo.guardaAoAtacar === 'equipa');
  verificar('Lâmina Comum fura a guarda', forte('lamina', 'Comum').estilo.furaGuarda === true);
  verificar('Lâmina Rara ignora a resistência só de quem guarda',
    forte('lamina', 'Raro').estilo.semRSnaGuarda === true && !forte('lamina', 'Raro').ignoraResistencias);
  verificar('Lâmina Lendária ignora a resistência de todos', forte('lamina', 'Lendário').ignoraResistencias === true);
  verificar('Sustentação Comum cura com metade do dano, sem dividir',
    forte('sustentacao', 'Comum').estilo.curaPorDano === 0.5 && !forte('sustentacao', 'Comum').estilo.curaDividida);
  verificar('Sustentação Lendária limpa um estado', forte('sustentacao', 'Lendário').estilo.limpaEstado === true);
  verificar('o custo e os alvos não mudam com o feitio',
    ['guarda', 'lamina', 'sustentacao'].every(f => {
      const m = forte(f, 'Raro');
      return m.pm === 10 && m.alvos === 3;
    }));
  // O dano sim: a Lâmina bate mais, o Guarda troca dano por proteção, e a
  // Sustentação fica com o do manual, porque a cura dela sai do dano.
  const danos = r => ['lamina', 'guarda', 'sustentacao'].map(f => forte(f, r).fixo).join('/');
  verificar('o Sopro: Lâmina 13, Guarda 8, Sustentação 10', danos('Comum') === '13/8/10', danos('Comum'));
  verificar('a Barragem: Lâmina 15, Guarda 5, Sustentação 10', danos('Raro') === '15/5/10', danos('Raro'));
  verificar('a Barragem Certa: Lâmina 20, Guarda 10, Sustentação 15', danos('Lendário') === '20/10/15', danos('Lendário'));
  verificar('a tabela não muda sem querer', G.FU_MAGIAS.forte[2].fixo === 10 && G.FU_MAGIAS.forte[1].fixo === 10);
  verificar('o ataque muito forte não ganha jeito de feitio',
    !G.fuMagiaDe(fichaDe('fogo', 'Raro', 'lamina'), 'muito_forte').estilo);

  // ── os nomes: o feitio aparece no nome ──
  const nome = (feitio, raridade, tipo) => G.fuMagiaDe(fichaDe(tipo || 'fogo', raridade, feitio), 'forte');
  verificar('Sopro Protetor, Sopro Cortante, Sopro Vital',
    ['guarda', 'lamina', 'sustentacao'].map(f => nome(f, 'Comum').nome).join('/')
      === 'Sopro Protetor/Sopro Cortante/Sopro Vital');
  verificar('e em inglês',
    ['guarda', 'lamina', 'sustentacao'].map(f => nome(f, 'Comum').nomeEn).join('/')
      === 'Guarding Breath/Cutting Breath/Vital Breath');
  verificar('Ignis Scutum, Ignis Acies, Ignis Salus',
    ['guarda', 'lamina', 'sustentacao'].map(f => nome(f, 'Raro').nome).join('/')
      === 'Ignis Scutum/Ignis Acies/Ignis Salus');
  verificar('o Lendário concorda o "grande" com a palavra do feitio',
    ['guarda', 'lamina', 'sustentacao'].map(f => nome(f, 'Lendário', 'gelo').nome).join('/')
      === 'Glacies Scutum Magnum/Glacies Acies Magna/Glacies Salus Magna');
  verificar('o nome latino é o mesmo nas duas línguas',
    nome('lamina', 'Raro', 'treva').nomeEn === nome('lamina', 'Raro', 'treva').nome);

  /* Um ataque forte de verdade: o atacante ganha o feitio e a raridade
     pedidos, os inimigos ficam sem afinidades e com vida de sobra, e
     repete-se com outra semente até algum golpe ferir. */
  const lance = (feitio, raridade, prepara) => {
    for (let s = 1; s <= 80; s++) {
      const e = luta(15, 500 + s);
      const quem = e.A[0];
      quem.ficha = Object.assign({}, quem.ficha, { feitio, raridade });
      quem.pm = 99;
      for (const c of e.B) {
        c.ficha = Object.assign({}, c.ficha, { afinidades: {}, pvMax: 900, crise: 450 });
        c.pv = 900;
      }
      const ctx = (prepara && prepara(e, quem)) || {};
      const magia = G.fuMagiaDe(quem.ficha, 'forte');
      const evs = M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia, alvos: e.B.map(c => c.id) });
      const golpes = evs.filter(x => x.tipo === 'magia');
      if (golpes.some(x => x.acertou && x.perda > 0)) return { e, quem, evs, golpes, ctx };
    }
    return null;
  };
  const causado = r => r.golpes.reduce((s, x) => s + (x.perda | 0), 0);

  // ── Guarda ──
  {
    const r = lance('guarda', 'Raro');
    verificar('o Guarda fica em guarda depois do ataque forte', !!r && r.quem.guardando === true);
    verificar('e sem recuperar PM', !!r && !r.evs.some(x => x.tipo === 'guardar'));
  }
  {
    const r = lance('guarda', 'Raro', e => {
      const o = e.A[1]; o.pv = Math.max(1, Math.floor(o.ficha.pvMax / 3)); return { o };
    });
    verificar('o Guarda Raro põe em guarda o aliado mais ferido', !!r && r.ctx.o.guardando === true);
    verificar('e só ele', !!r && r.e.A[2].guardando !== true);
  }
  {
    const r = lance('guarda', 'Lendário');
    verificar('o Guarda Lendário põe a equipe inteira em guarda',
      !!r && r.e.A.filter(c => c.vivo).every(c => c.guardando === true));
  }

  // ── Lâmina ──
  {
    const r = lance('lamina', 'Comum', e => { for (const c of e.B) c.guardando = true; });
    const g = r && r.golpes.find(x => x.acertou && x.perda > 0);
    verificar('a Lâmina fura a guarda: o dano entra inteiro',
      !!g && g.furouGuarda === true && g.perda === g.bruto, g && (g.bruto + ' → ' + g.perda));
  }
  {
    const r = lance('guarda', 'Comum', e => { for (const c of e.B) c.guardando = true; });
    const g = r && r.golpes.find(x => x.acertou && x.perda > 0);
    verificar('sem ser Lâmina, a guarda corta pela metade',
      !!g && !g.furouGuarda && g.perda === Math.floor(g.bruto / 2), g && (g.bruto + ' → ' + g.perda));
  }
  {
    const r = lance('lamina', 'Raro', (e, quem) => {
      for (const c of e.B) { c.guardando = true; c.ficha.afinidades = { [quem.ficha.tipo]: 'RS' }; }
    });
    const g = r && r.golpes.find(x => x.acertou && x.perda > 0);
    verificar('a Lâmina Rara ignora a resistência de quem guarda',
      !!g && g.perda === g.bruto, g && (g.bruto + ' → ' + g.perda));
  }
  {
    const r = lance('lamina', 'Raro', (e, quem) => {
      for (const c of e.B) c.ficha.afinidades = { [quem.ficha.tipo]: 'RS' };
    });
    const g = r && r.golpes.find(x => x.acertou && x.perda > 0);
    verificar('mas não de quem não guarda',
      !!g && g.perda === Math.floor(g.bruto / 2), g && (g.bruto + ' → ' + g.perda));
  }

  // ── Sustentação ──
  {
    const r = lance('sustentacao', 'Comum', e => { e.A[1].pv = 1; return { o: e.A[1] }; });
    const esperado = r && Math.min(r.ctx.o.ficha.pvMax, 1 + Math.floor(causado(r) / 2));
    verificar('a Sustentação cura o mais ferido com metade do dano',
      !!r && r.ctx.o.pv === esperado, r && (r.ctx.o.pv + ' em vez de ' + esperado));
    verificar('e, na Comum, cura um só',
      !!r && r.evs.filter(x => x.tipo === 'cura' && x.estilo).length <= 1);
  }
  {
    const r = lance('sustentacao', 'Raro', e => {
      e.A[1].pv = e.A[1].ficha.pvMax - 3; e.A[2].pv = e.A[2].ficha.pvMax - 3;
    });
    const curas = r ? r.evs.filter(x => x.tipo === 'cura' && x.estilo) : [];
    const metade = r ? Math.floor(causado(r) / 2) : 0;
    const total = curas.reduce((s, x) => s + x.curou, 0);
    verificar('a Sustentação Rara divide a cura entre os feridos',
      !!r && total === Math.min(metade, 6) && (metade < 4 || curas.length === 2),
      `metade ${metade} · curou ${total} em ${curas.length}`);
    verificar('e ninguém passa do máximo', !!r && r.e.A.every(c => c.pv <= c.ficha.pvMax));
  }
  {
    const e = luta(15, 77);
    const quem = e.A[0];
    quem.ficha = Object.assign({}, quem.ficha, { feitio: 'sustentacao', raridade: 'Raro' });
    quem.pm = 99; e.A[1].pv = 1;
    for (const c of e.B) c.ficha = Object.assign({}, c.ficha, { afinidades: { [quem.ficha.tipo]: 'IM' } });
    const evs = M.fuAgir(e, { quem: quem.id, tipo: 'magia',
                              magia: G.fuMagiaDe(quem.ficha, 'forte'), alvos: e.B.map(c => c.id) });
    verificar('sem ferir, a Sustentação não cura ninguém',
      !evs.some(x => x.tipo === 'cura') && e.A[1].pv === 1);
  }
  {
    const r = lance('sustentacao', 'Lendário', e => {
      e.A[1].estados.lento = true; e.A[1].pv = 5; return { o: e.A[1] };
    });
    verificar('a Sustentação Lendária tira um estado do mais ferido',
      !!r && !r.ctx.o.estados.lento && r.evs.some(x => x.tipo === 'estiloLimpa'));
  }
}

/* ═══ 8 · OS PACOTES DOS FEITIOS ═════════════════════════════════
   Aprovados pelo dono do jogo em 14/09/2026: as regras de cada feitio
   (Represália, Execução, Resiliência), o cuidar da frente, o Proteger, o
   alcance do muito forte e o que a guarda NÃO soma. */
titulo('Os pacotes dos feitios');
{
  // Um lutador da luta, com a ficha trocada pelo que o teste pede.
  const com = (c, extra) => {
    c.ficha = Object.assign({}, c.ficha, extra);
    if (extra.pvMax) c.pv = extra.pvMax;
    return c;
  };

  // ── a guarda não se soma à resistência ──
  {
    const e = luta(15, 900);
    const c = com(e.A[0], { feitio: 'guarda', afinidades: { fogo: 'RS' }, pvMax: 500, crise: 250 });
    c.guardando = true;
    verificar('guarda e resistência não se somam: metade, e não um quarto',
      M.fuDanoComGuarda(c, 40, 'fogo').perda === 20);
    c.pv = 500;
    verificar('se o golpe ignora a resistência, a guarda volta a cortar',
      M.fuDanoComGuarda(c, 40, 'fogo', { ignoraResistencias: true }).perda === 20);
    c.pv = 500;
    verificar('e sem resistência, a guarda corta sozinha',
      M.fuDanoComGuarda(c, 40, 'gelo').perda === 20);
  }

  // ── Represália ──
  {
    const e = luta(15, 901);
    const quem = com(e.A[0], { pvMax: 500, crise: 250, afinidades: {} });
    const alvo = com(e.B[0], { feitio: 'guarda', raridade: 'Raro', pvMax: 900, crise: 450, afinidades: {} });
    let rp = null;
    for (let i = 0; i < 60 && !rp; i++) {
      alvo.pv = 900; alvo.guardando = true; quem.pv = 500;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (ev.acertou) rp = ev.represalia || 'nada';
    }
    verificar('a Represália do Guarda Raro devolve 8 de dano físico',
      rp && rp !== 'nada' && rp.bruto === 8 && rp.tipo_dano === 'fisico' && quem.pv === 500 - rp.perda,
      JSON.stringify(rp));
    let semGuarda = null;
    for (let i = 0; i < 60 && !semGuarda; i++) {
      alvo.pv = 900; alvo.guardando = false;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (ev.acertou) semGuarda = ev;
    }
    verificar('e sem guardar não devolve nada', !!semGuarda && !semGuarda.represalia);
  }

  // ── Execução ──
  {
    const e = luta(15, 902);
    const quem = com(e.A[0], { feitio: 'lamina', raridade: 'Lendário' });
    const alvo = com(e.B[0], { feitio: 'guarda', pvMax: 900, crise: 450, afinidades: {} });
    let emCrise = null, fora = null;
    for (let i = 0; i < 60 && !(emCrise && fora); i++) {
      alvo.pv = 400;
      const a = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (a.acertou && !emCrise) emCrise = a;
      alvo.pv = 900;
      const b = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (b.acertou && !fora) fora = b;
    }
    verificar('a Execução do Lâmina Lendário soma 8 contra quem está em crise',
      !!emCrise && emCrise.execucao === 8);
    verificar('e nada contra quem não está', !!fora && fora.execucao === 0);
  }

  // ── Resiliência ──
  {
    const e = luta(15, 903);
    const c = com(e.A[0], { feitio: 'sustentacao', raridade: 'Comum', pvMax: 100, crise: 50, afinidades: {} });
    const d = M.fuAplicarDano(c, 80, 'fisico');
    verificar('a Resiliência da Sustentação Comum segura em 60% da vida',
      d.perda === 60 && d.resiliu === true, d.perda + '');
    com(c, { raridade: 'Lendário', pvMax: 100 });
    verificar('e em 50% no Lendário', M.fuAplicarDano(c, 80, 'fisico').perda === 50);
    c.pv = 100;
    verificar('e um golpe pequeno entra inteiro', M.fuAplicarDano(c, 30, 'fisico').perda === 30);
  }

  // ── cuidar da frente ──
  {
    const e = luta(15, 904);
    const frente = M.fuFrente(e.A);
    const quem = com(e.A.find(c => c !== frente), { feitio: 'sustentacao', raridade: 'Raro' });
    const outro = e.A.find(c => c !== frente && c !== quem);
    quem.pm = 99;
    const curar = G.fuMagiaDe(quem.ficha, 'suporte');
    frente.pv = 1;
    M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia: curar, alvos: [frente.id] });
    verificar('a cura da Sustentação vale 50% a mais em quem está na frente',
      frente.pv === Math.min(frente.ficha.pvMax, 1 + 45), frente.pv + '');
    M.fuNovaRonda(e);
    outro.pv = 1; quem.pm = 99;
    M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia: curar, alvos: [outro.id] });
    verificar('e o normal em quem está atrás',
      outro.pv === Math.min(outro.ficha.pvMax, 1 + 30), outro.pv + '');
  }

  // ── Proteger ──
  {
    const e = luta(15, 905);
    const g = com(e.A[0], { feitio: 'guarda', raridade: 'Lendário' });
    const aliado = e.A[1];
    const proteger = G.fuMagiaDe(g.ficha, 'defesa');
    verificar('a defesa do Guarda Lendário é o Proteger', proteger && proteger.proteger === true);
    g.pm = 99;
    M.fuAgir(e, { quem: g.id, tipo: 'magia', magia: proteger, alvos: [aliado.id] });
    verificar('o Proteger marca o aliado', g.protegendo === aliado.id);

    const atq = com(e.B[0], { feitio: 'lamina', raridade: 'Raro' });
    atq.pm = 99;
    const mf = G.fuMagiaDe(atq.ficha, 'muito_forte');
    const evs = M.fuAgir(e, { quem: atq.id, tipo: 'magia', magia: mf, alvos: [aliado.id] });
    const golpe = evs.find(x => x.tipo === 'magia');
    verificar('o golpe contra o protegido cai no Guarda',
      !!golpe && golpe.alvo === g.id && evs.some(x => x.tipo === 'protegeu'),
      golpe && golpe.alvo);

    M.fuNovaRonda(e);
    M.fuAgir(e, { quem: g.id, tipo: 'guardar' });
    verificar('e o Proteger acaba quando o Guarda age de novo', g.protegendo === null);
    M.fuNovaRonda(e);
    g.pm = 99;
    verificar('o Guarda não se protege a si mesmo',
      M.fuAgir(e, { quem: g.id, tipo: 'magia', magia: proteger, alvos: [g.id] }).length === 0);
  }

  // ── o muito forte do Lâmina alcança o de trás ──
  {
    const e = luta(15, 906);
    const atq = com(e.A[0], { feitio: 'lamina', raridade: 'Raro' });
    const tras = M.fuFormacao(e, 'B')[2];
    atq.pm = 99;
    const mf = G.fuMagiaDe(atq.ficha, 'muito_forte');
    const evs = M.fuAgir(e, { quem: atq.id, tipo: 'magia', magia: mf, alvos: [tras.id] });
    const golpe = evs.find(x => x.tipo === 'magia');
    verificar('o golpe concentrado alcança o inimigo da posição 3', !!golpe && golpe.alvo === tras.id,
      golpe && golpe.alvo);

    const e2 = luta(15, 906);
    const a2 = com(e2.A[0], { feitio: 'lamina', raridade: 'Comum' });
    const t2 = M.fuFormacao(e2, 'B')[2];
    a2.pm = 99;
    const sopro = G.fuMagiaDe(a2.ficha, 'forte');
    const evs2 = M.fuAgir(e2, { quem: a2.id, tipo: 'magia', magia: sopro, alvos: [t2.id] });
    const g2 = evs2.find(x => x.tipo === 'magia');
    verificar('mas o Sopro do ataque forte continua indo na frente',
      !!g2 && g2.alvo === M.fuFrente(e2.B).id);
    verificar('o golpe concentrado aplica o estado do elemento no crítico',
      mf.estado === (G.FU_ELEMENTAL[atq.ficha.tipo] || G.FU_ELEMENTAL.fogo).estado && !mf.estadoSempre);
  }

  // ── o Salus rouba PM ──
  {
    let achou = null;
    for (let s = 1; s <= 80 && !achou; s++) {
      const e = luta(15, 950 + s);
      const quem = com(e.A[0], { feitio: 'sustentacao', raridade: 'Raro' });
      quem.pm = 99;
      for (const c of e.B) { com(c, { afinidades: {}, pvMax: 900, crise: 450 }); c.pm = 20; }
      const m = G.fuMagiaDe(quem.ficha, 'forte');
      const evs = M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia: m, alvos: e.B.map(c => c.id) });
      const feridos = evs.filter(x => x.tipo === 'magia' && x.perda > 0).map(x => x.alvo);
      if (feridos.length) achou = { e, evs, feridos };
    }
    const roubos = achou ? achou.evs.filter(x => x.tipo === 'roubouPM') : [];
    verificar('o Salus Raro rouba 3 PM de cada alvo ferido',
      !!achou && roubos.length === achou.feridos.length && roubos.every(r => r.n === 3)
        && achou.feridos.every(id => M.fuPorId(achou.e, id).pm === 17),
      achou && (roubos.length + ' roubos, ' + achou.feridos.length + ' feridos'));
  }

  // ── limpar estados, e os estados por elemento ──
  {
    const e = luta(15, 907);
    const quem = com(e.A[0], { feitio: 'sustentacao', raridade: 'Comum' });
    const amigo = e.A[1];
    quem.pm = 99;
    amigo.estados.lento = true; amigo.estados.abalado = true;
    const lamber = G.fuMagiaDe(quem.ficha, 'suporte');
    const evs = M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia: lamber, alvos: [amigo.id] });
    verificar('o Lamber Feridas tira um estado do alvo',
      Object.keys(amigo.estados).length === 1 && evs.some(x => x.tipo === 'estiloLimpa'),
      Object.keys(amigo.estados).join(','));
    verificar('fogo deixa enfurecido e terra deixa fraco',
      G.FU_ELEMENTAL.fogo.estado === 'enfurecido' && G.FU_ELEMENTAL.terra.estado === 'fraco');
    const estados = Object.values(G.FU_ELEMENTAL).map(x => x.estado);
    verificar('os oito elementos usam os seis estados do motor',
      new Set(estados).size === 6, estados.join(','));
  }
}

console.log('\n' + '─'.repeat(62));
if (falhas.length) {
  console.log(falhas.slice(0, 20).join('\n'));
  if (falhas.length > 20) console.log('  … e mais ' + (falhas.length - 20) + '.');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
