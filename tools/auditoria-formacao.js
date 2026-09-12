#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DA FORMAÇÃO — motor Fabula Ultima

   As regras que aqui se guardam são as do dono do jogo, e não as do
   manual: o Fabula Ultima não tem posições nenhumas. Esta camada é
   nossa, e por isso precisa de ser vigiada com mais cuidado e não com
   menos — não há um livro onde ir confirmar.

     1. Três lugares, um em cada, e nunca dois no mesmo.
     2. A frente é quem está de pé mais à frente, e passa sozinha.
     3. O da frente cobre — de tudo o que aponte a UM alvo.
     4. E não cobre do que varre a linha, senão a formação era um muro.
     5. Reordenar custa o turno. Uma reordenação que não acontece não.
     6. E a formação decide mesmo: mede-se quanto é que a frente apanha.

   node tools/auditoria-formacao.js
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

function avatar(seed, nivel) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  return { id: 'a' + seed, nome: 'T', seed, nivel: nivel || 5, nascimento: cert.nascimento };
}
const equipa = (p, nv, sem) =>
  [1, 2, 3].map(i => avatar((sem || 1) * 1000003 + p * 7919 + i * 104729, nv));
const luta = (nv, sem) => M.fuIniciar(equipa(1, nv, sem), equipa(2, nv, sem), sem || 1);

/* Um alvo que não morre nem se defende, para se medir QUEM apanha sem o
   resultado depender de quanto aguentou. */
function boneco(c) {
  c.pv = 100000; c.ficha.pvMax = 100000; c.ficha.crise = 50000;
  c.ficha.afinidades = {};
  c.ficha.dons = V.fuDons([]);
  return c;
}

/* ═══ 1 · TRÊS LUGARES ═══════════════════════════════════════════ */
titulo('Três lugares, um em cada');
{
  for (let s = 1; s <= 100; s++) {
    const e = luta(20, s * 7);
    for (const lado of ['A', 'B']) {
      const postos = e[lado].map(c => c.posto).sort();
      verificar('o lado ' + lado + ' tem três lugares (' + s + ')',
        postos.length === 3, postos.join(','));
      verificar('e são 0, 1 e 2 (' + lado + ' ' + s + ')',
        postos.join(',') === '0,1,2', postos.join(','));
    }
  }

  const e = luta(20, 1);
  const f = M.fuFormacao(e, 'A');
  verificar('a formação sai por ordem de posto',
    f.map(c => c.posto).join(',') === '0,1,2', f.map(c => c.posto).join(','));
  e.A[0].vivo = false;
  verificar('e os caídos continuam nela — a arena desenha-os',
    M.fuFormacao(e, 'A').length === 3);
}

/* ═══ 2 · A FRENTE ═══════════════════════════════════════════════ */
titulo('A frente é quem está de pé mais à frente');
{
  const e = luta(20, 2);
  const [p0, p1, p2] = M.fuFormacao(e, 'A');
  verificar('ao começar, a frente é o posto 0', M.fuFrente(e.A) === p0);

  p0.vivo = false;
  verificar('o defensor cai e o do meio passa a frente — sem gastar turno',
    M.fuFrente(e.A) === p1);
  verificar('e ninguém gastou nada', e.jaAgiu.length === 0);

  p1.vivo = false;
  verificar('cai o do meio e sobra o suporte', M.fuFrente(e.A) === p2);

  p2.vivo = false;
  verificar('sem ninguém de pé não há frente', M.fuFrente(e.A) === null);

  /* E a frente segue o POSTO e não a ordem em que a equipa foi montada:
     depois de uma troca, quem está à frente é outro. */
  const e2 = luta(20, 3);
  const a = e2.A[0], b = e2.A[2];
  verificar('antes da troca, a frente é o posto 0', M.fuFrente(e2.A).posto === 0);
  M.fuAgir(e2, { quem: b.id, tipo: 'mover', com: a.id });
  verificar('depois da troca, a frente é quem lá ficou',
    M.fuFrente(e2.A) === b && b.posto === 0,
    M.fuFrente(e2.A).id + ' posto ' + b.posto);
}

/* ═══ 3 · O QUE A FRENTE COBRE ═══════════════════════════════════ */
titulo('O da frente cobre de tudo o que aponte a um alvo');
{
  const casos = [
    ['o golpe comum',  null],
    ['o Sopro',        ['forte', 'Comum']],
    ['o Sopro Maldito', ['muito_forte', 'Comum']],
    ['o Concentrado',  ['muito_forte', 'Raro']],
  ];
  for (const [nome, qual] of casos) {
    const e = luta(30, 4);
    e.B.forEach(boneco);
    const quem = e.A[0];
    quem.pm = 99999;
    const frente = M.fuFrente(e.B), tras = M.fuFormacao(e, 'B')[2];
    const magia = qual ? G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: qual[1] }), qual[0]) : null;
    verificar(nome + ' aponta a um alvo só', !magia || (magia.alvos || 1) === 1,
      magia ? (magia.alvos + '') : '—');

    // pedir o de trás: bate na frente na mesma, e não é recusado
    const ev = M.fuAgir(e, { quem: quem.id, tipo: magia ? 'magia' : 'atacar',
                             magia, alvos: [tras.id] });
    const golpes = ev.filter(x => x.tipo === 'ataque' || x.tipo === 'magia');
    verificar(nome + ' sai mesmo pedindo o de trás', golpes.length === 1,
      JSON.stringify(ev.map(x => x.tipo)));
    verificar(nome + ' vai ao da frente e não a quem foi pedido',
      golpes.length === 1 && golpes[0].alvo === frente.id,
      golpes.length ? golpes[0].alvo + ' em vez de ' + frente.id : 'nenhum');
  }
}

/* ═══ 4 · O QUE PASSA POR CIMA ═══════════════════════════════════ */
titulo('E não cobre do que varre a linha');
{
  // ── a Barragem, três alvos ──
  {
    const e = luta(30, 5);
    e.B.forEach(boneco);
    const quem = e.A[0]; quem.pm = 99999;
    const magia = G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: 'Raro' }), 'forte');
    verificar('a Barragem aponta a três', magia.alvos === 3);
    const ev = M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia,
                             alvos: e.B.map(c => c.id) });
    const alvos = ev.filter(x => x.tipo === 'magia').map(x => x.alvo).sort();
    verificar('e chega aos três, frente incluída',
      alvos.join(',') === e.B.map(c => c.id).sort().join(','),
      alvos.join(','));
  }

  // ── só o de trás ──
  {
    const e = luta(30, 6);
    e.B.forEach(boneco);
    const quem = e.A[0]; quem.pm = 99999;
    const tras = M.fuFormacao(e, 'B')[2];
    const magia = G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: 'Raro' }), 'forte');
    const ev = M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia, alvos: [tras.id] });
    const alvos = ev.filter(x => x.tipo === 'magia').map(x => x.alvo);
    verificar('e pode ir SÓ ao suporte, se for isso que se pedir',
      alvos.length === 1 && alvos[0] === tras.id, alvos.join(','));
  }

  // ── a Devastação ──
  {
    const e = luta(30, 7);
    e.B.forEach(boneco);
    const quem = e.A[0]; quem.pm = 99999;
    const magia = G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: 'Lendário' }), 'muito_forte');
    const ev = M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia });
    verificar('a Devastação não pergunta pela formação',
      ev.filter(x => x.tipo === 'devastacao').length === 3);
  }

  // ── e as de dentro não olham à formação nenhuma ──
  {
    const e = luta(30, 8);
    const quem = e.A[0]; quem.pm = 99999;
    const tras = M.fuFormacao(e, 'A')[2];
    tras.pv = 1;
    const cura = G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: 'Raro' }), 'suporte');
    M.fuAgir(e, { quem: quem.id, tipo: 'magia', magia: cura, alvos: [tras.id] });
    verificar('curar o suporte não esbarra na própria frente', tras.pv > 1,
      tras.pv + '');
  }
}

/* ═══ 5 · REORDENAR ══════════════════════════════════════════════ */
titulo('Reordenar custa o turno — e só quando acontece');
{
  // ── a troca ──
  {
    const e = luta(20, 9);
    const a = e.A[0], c = e.A[2];
    const pa = a.posto, pc = c.posto;
    const ev = M.fuAgir(e, { quem: a.id, tipo: 'mover', com: c.id });
    verificar('os dois trocam de lugar', a.posto === pc && c.posto === pa,
      a.posto + '/' + c.posto);
    verificar('e há um evento a dizê-lo', ev.length === 1 && ev[0].tipo === 'mover');
    verificar('que diz quem ficou à frente', ev[0].frente === M.fuFrente(e.A).id);
    verificar('custa o turno de quem se mexeu', e.jaAgiu.indexOf(a.id) !== -1);
    verificar('e NÃO o do companheiro', e.jaAgiu.indexOf(c.id) === -1,
      JSON.stringify(e.jaAgiu));
  }

  // ── a guarda cai com o movimento ──
  {
    const e = luta(20, 10);
    const a = e.A[0], c = e.A[2];
    M.fuAgir(e, { quem: a.id, tipo: 'guardar' });
    verificar('guardar levanta a guarda', a.guardando === true);
    M.fuNovaRonda(e);
    M.fuAgir(e, { quem: a.id, tipo: 'guardar' });
    M.fuNovaRonda(e);
    M.fuAgir(e, { quem: a.id, tipo: 'mover', com: c.id });
    verificar('e mexer-se deixa-a cair', a.guardando === false);
  }

  // ── as que não acontecem ──
  {
    const recusas = [
      ['consigo mesmo',        (e) => ({ com: e.A[0].id })],
      ['com um inimigo',       (e) => ({ com: e.B[1].id })],
      ['com um id que não existe', () => ({ com: 'ninguem' })],
      ['sem dizer com quem',   () => ({})],
      ['com um companheiro caído', (e) => { e.A[2].vivo = false; return { com: e.A[2].id }; }],
    ];
    for (const [nome, montar] of recusas) {
      const e = luta(20, 11);
      const a = e.A[0];
      const postosAntes = M.fuFormacao(e, 'A').map(c => c.id + ':' + c.posto).join(' ');
      const ev = M.fuAgir(e, Object.assign({ quem: a.id, tipo: 'mover' }, montar(e)));
      verificar('trocar ' + nome + ' não acontece', ev.length === 0,
        JSON.stringify(ev));
      verificar('e não custa o turno (' + nome + ')', e.jaAgiu.length === 0,
        JSON.stringify(e.jaAgiu));
      verificar('e não mexe nos postos (' + nome + ')',
        M.fuFormacao(e, 'A').map(c => c.id + ':' + c.posto).join(' ') === postosAntes);
    }
  }

  // ── o que a troca muda mesmo ──
  {
    const e = luta(30, 12);
    e.B.forEach(boneco);
    const quem = e.A[0];
    const antes = M.fuFrente(e.B);
    const ev1 = M.fuAtacar(e, quem, M.fuAlvosPossiveis(e.B, 'mao')[0], { fixo: 5 });
    verificar('antes da troca, o murro vai ao defensor deles', ev1.alvo === antes.id);

    const b0 = M.fuFormacao(e, 'B')[0], b2 = M.fuFormacao(e, 'B')[2];
    M.fuAgir(e, { quem: b2.id, tipo: 'mover', com: b0.id });
    const ev2 = M.fuAtacar(e, quem, M.fuAlvosPossiveis(e.B, 'mao')[0], { fixo: 5 });
    verificar('depois da troca, vai a quem se pôs à frente',
      ev2.alvo === b2.id, ev2.alvo + ' em vez de ' + b2.id);
  }

  // ── mil trocas ao acaso e ninguém partilha lugar ──
  {
    for (let s = 1; s <= 80; s++) {
      const e = luta(20, s * 23);
      for (let i = 0; i < 40; i++) {
        const lado = i % 2 ? 'A' : 'B';
        const t = e[lado];
        const x = t[(i * 7) % 3], y = t[(i * 11 + 1) % 3];
        e.jaAgiu = [];
        M.fuAgir(e, { quem: x.id, tipo: 'mover', com: y.id });
      }
      for (const lado of ['A', 'B']) {
        const postos = e[lado].map(c => c.posto).sort().join(',');
        verificar('depois de quarenta trocas, o lado ' + lado + ' ainda tem 0,1,2 (' + s + ')',
          postos === '0,1,2', postos);
      }
    }
  }
}

/* ═══ 6 · A FORMAÇÃO DECIDE MESMO ════════════════════════ */
titulo('A formação decide — duas medidas, e a primeira é a que conta');
{
  /* ── DUAS MEDIDAS, E PORQUÊ ──

     Comecei com uma só: o dano acumulado por lugar INICIAL ao fim da
     batalha. Deu 34/33/33 e a afirmação "a frente apanha mais" passou por
     um ponto — uma verificação que a semente seguinte podia levar, ou
     seja, uma verificação que não guarda nada.

     O número não estava errado; a pergunta é que estava. A frente MORRE
     primeiro, e aí o do meio passa a ser a frente e começa a apanhar. Ao
     fim de uma batalha inteira toda a gente esteve à frente, e o
     acumulado espalha-se por construção. Medir assim é medir a ordem por
     que se morre, e não a cobertura.

     A medida certa é por GOLPE: no momento em que cada golpe sai, caiu em
     quem estava à frente naquele instante? Essa é estrutural e tem de dar
     cem por cento.

     A segunda fica, mas como QUADRO e não como guarda — e diz uma coisa
     que vale a pena ver: com a Barragem paga, o desnível entre os três
     lugares desaparece. Não é um defeito, é a Barragem a fazer o que
     existe para fazer. */
  function medir(politica) {
    const sofrido = [0, 0, 0];
    let total = 0, unicos = 0, naFrente = 0, peloVoo = 0;
    for (let s = 1; s <= 60; s++) {
      const b = luta(20, s * 29);
      const postoDe = {}, pvAntes = {};
      for (const c of b.A.concat(b.B)) { postoDe[c.id] = c.posto; pvAntes[c.id] = c.pv; }

      let guarda = 0;
      while (!b.acabou && guarda++ < 400) {
        const vez = M.fuVez(b);
        if (!vez) { M.fuNovaRonda(b); continue; }
        const quem = M.fuPorId(b, vez.podem[0]);
        const inimiga = (quem.lado === 'A' ? b.B : b.A).filter(c => c.vivo);
        const acao = politica(quem, inimiga);

        // quem estava à frente ANTES do golpe sair
        const frente = M.fuFrente(quem.lado === 'A' ? b.B : b.A);
        const umAlvoSo = !acao.magia || (acao.magia.alvos || 1) === 1;
        const comAsMaos = !acao.magia;
        /* O Voo Baixo desvia o MURRO de quem está à frente, e só o murro.
           Contado à parte: é a única excepção à cobertura que existe no
           motor, e misturá-la com o resto transformava um "cem por cento
           menos uma vantagem" num "noventa por cento" que não explicava
           nada. */
        const voou = comAsMaos && frente && M.fuNoAr(frente);

        for (const ev of M.fuAgir(b, acao)) {
          if (ev.tipo !== 'ataque' && ev.tipo !== 'magia') continue;
          if (!umAlvoSo) continue;
          unicos++;
          if (voou && frente && ev.alvo !== frente.id) peloVoo++;
          else if (frente && ev.alvo === frente.id) naFrente++;
        }
      }
      for (const c of b.A.concat(b.B)) {
        const perdeu = Math.max(0, pvAntes[c.id] - c.pv);
        sofrido[postoDe[c.id]] += perdeu;
        total += perdeu;
      }
    }
    return {
      pct: sofrido.map(x => x / Math.max(1, total) * 100),
      unicos, naFrente, peloVoo,
      cobertura: unicos ? naFrente / unicos * 100 : 0,
    };
  }

  const soMurro = medir((quem) => ({ quem: quem.id, tipo: 'atacar' }));

  const soAlvoUnico = medir((quem, inimiga) => {
    /* O SOPRO, e não "a magia forte dele": ao nível 20 a ficha já é Rara e
       a magia forte de um Raro é a Barragem, que varre a linha. A primeira
       versão desta linha pedia `quem.ficha` e media três golpes de alvo
       único numa corrida inteira — uma amostra que não provava nada e que
       só se deu por ela porque a auditoria exige um mínimo. */
    const m = G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: 'Comum' }), 'forte');
    return (G.fuCusto(m, 1) <= quem.pm)
      ? { quem: quem.id, tipo: 'magia', magia: m, alvos: inimiga.map(c => c.id) }
      : { quem: quem.id, tipo: 'atacar' };
  });

  const misto = medir((quem, inimiga) => {
    /* Um jogador razoável: varre a linha quando pode pagá-la, bate quando
       não pode. É a decisão que a formação existe para provocar. */
    const m = G.fuMagiaDe(Object.assign({}, quem.ficha, { raridade: 'Raro' }), 'forte');
    return (G.fuCusto(m, 3) <= quem.pm)
      ? { quem: quem.id, tipo: 'magia', magia: m, alvos: inimiga.map(c => c.id) }
      : { quem: quem.id, tipo: 'atacar' };
  });

  const tabela = [['só o murro', soMurro], ['só alvo único', soAlvoUnico],
                  ['misto', misto]];
  for (const [nome, r] of tabela)
    console.log('   ' + (nome + '              ').slice(0, 15) +
      'na frente ' + r.cobertura.toFixed(0).padStart(3) + '% de ' +
      (r.unicos + '').padStart(4) + ' de alvo único' +
      ' (+' + (r.peloVoo + '').padStart(3) + ' desviados pelo voo)' +
      '  ·  lugar inicial ' +
      r.pct.map(x => x.toFixed(0).padStart(2) + '%').join('/'));

  // ── a guarda a sério ──
  for (const [nome, r] of tabela) {
    verificar('houve golpes de alvo único para medir (' + nome + ')', r.unicos > 100,
      r.unicos + '');
    verificar('TODO o golpe de alvo único caiu na frente, tirando o que o voo desviou ('
      + nome + ')',
      r.naFrente + r.peloVoo === r.unicos,
      r.naFrente + ' + ' + r.peloVoo + ' de ' + r.unicos);
  }

  /* E o desnível do acumulado, só onde ele tem de existir: a murro, a
     frente apanha mais do que o suporte com uma margem que uma semente
     não leva. Com a Barragem paga, não se afirma nada — é suposto
     achatar. */
  verificar('a murro, a frente apanha bem mais do que o suporte',
    soMurro.pct[0] > soMurro.pct[2] * 1.25,
    soMurro.pct.map(x => x.toFixed(0)).join('/'));
  verificar('e a Barragem achata esse desnível',
    (misto.pct[0] / misto.pct[2]) < (soMurro.pct[0] / soMurro.pct[2]),
    soMurro.pct.map(x => x.toFixed(0)).join('/') + '  →  ' +
    misto.pct.map(x => x.toFixed(0)).join('/'));
  verificar('e nenhum lugar apanha tudo, em política nenhuma',
    tabela.every(([, r]) => r.pct.every(x => x < 75)));
}

/* ═══ 7 · O QUE NÃO PODE ACONTECER ═══════════════════════════════ */
titulo('O que não pode acontecer');
{
  // a formação de um lado não se muda do outro
  const e = luta(20, 13);
  const meu = e.A[0], dele = e.B[0];
  const antes = M.fuFormacao(e, 'B').map(c => c.posto).join(',');
  M.fuAgir(e, { quem: meu.id, tipo: 'mover', com: dele.id });
  verificar('ninguém reordena a equipa do inimigo',
    M.fuFormacao(e, 'B').map(c => c.posto).join(',') === antes);

  // e um morto não se mexe
  const e2 = luta(20, 14);
  e2.A[0].vivo = false;
  verificar('um caído não se reordena a si próprio',
    M.fuAgir(e2, { quem: e2.A[0].id, tipo: 'mover', com: e2.A[1].id }).length === 0);

  // as batalhas continuam a acabar com toda a gente a mexer-se
  for (let s = 1; s <= 40; s++) {
    const b = luta(20, s * 37);
    let guarda = 0;
    while (!b.acabou && guarda++ < 500) {
      const vez = M.fuVez(b);
      if (!vez) { M.fuNovaRonda(b); continue; }
      const quem = M.fuPorId(b, vez.podem[0]);
      const meus = (quem.lado === 'A' ? b.A : b.B).filter(c => c.vivo && c !== quem);
      // de três em três turnos, reordena em vez de bater
      if (guarda % 3 === 0 && meus.length)
        M.fuAgir(b, { quem: quem.id, tipo: 'mover', com: meus[0].id });
      else
        M.fuAgir(b, { quem: quem.id, tipo: 'atacar' });
    }
    verificar('batalha ' + s + ' acaba mesmo com toda a gente a mexer-se', b.acabou,
      'parou na ronda ' + b.ronda);
  }
}

console.log('\n' + '─'.repeat(62));
if (falhas.length) {
  console.log(falhas.slice(0, 20).join('\n'));
  if (falhas.length > 20) console.log('  … e mais ' + (falhas.length - 20) + '.');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
