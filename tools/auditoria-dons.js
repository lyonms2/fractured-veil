#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DAS VANTAGENS — motor Fabula Ultima

   O que guarda, por ordem:

     1. As doze existem, e cada uma diz de que habilidade do manual veio.
     2. NENHUMA declara um campo que o motor não leia. É a verificação
        mais importante do arquivo: uma vantagem com um campo que
        ninguém lê é uma promessa por cumprir que não dá erro nenhum —
        o jogador vê o nome na ficha e não acontece nada.
     3. Decidem-se ao nascer e não mudam com o nível. Foi assim que o
        motor antigo trocou a virtude a 1,7% dos avatares ao subir.
     4. A regra do dono do jogo: uma vantagem e uma costura, e só o
        Lendário troca.
     5. Os dons dizem o mesmo que a lista.
     6. Cada uma FAZ o que diz, medida dentro do motor.
     7. O que não pode acontecer.

   Chama-se DONS e não vantagens porque tools/auditoria-vantagens.js já
   existe e guarda o motor 3D&T — e porque é o saco dos dons que o motor
   lê, que é o que aqui se mede.

   node tools/auditoria-dons.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const V   = require('../js/vantagens-fu.js');
const M   = require('../js/combate-fu.js');
Object.assign(global, V, M);

let ok = 0, mau = 0;
const falhas = [];
function verificar(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe ? '\n      ' + detalhe : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

function avatar(seed, nivel, escolha) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  const a = { id: 'a' + seed, nome: 'T', seed, nivel: nivel || 5, nascimento: cert.nascimento };
  if (escolha) a.escolhaAnciao = escolha;
  return a;
}
const equipa = (p, nv, sem) =>
  [1, 2, 3].map(i => avatar((sem || 1) * 1000003 + p * 7919 + i * 104729, nv));
const luta = (nv, sem) => M.fuIniciar(equipa(1, nv, sem), equipa(2, nv, sem), sem || 1);

/* Calçar uma vantagem num lutador à força. É a única forma honesta de
   medir o que o MOTOR faz com ela: o sorteio é outro assunto e tem a sua
   própria secção. */
function calcar(c, id, extra) {
  const v = Object.assign({ id }, V.FU_VANTAGENS[id], extra || {});
  c.ficha.vantagens = [v];
  c.ficha.dons = V.fuDons([v]);
  return v;
}

/* ═══ 1 · AS DOZE ════════════════════════════════════════════════ */
titulo('As doze, e de onde vieram');
{
  verificar('são doze', V.FU_VANTAGENS_IDS.length === 12, V.FU_VANTAGENS_IDS.length + '');
  const familias = {};
  for (const id of V.FU_VANTAGENS_IDS) {
    const v = V.FU_VANTAGENS[id];
    verificar(id + ' tem família', ['guarda', 'sustentacao', 'lamina'].indexOf(v.familia) !== -1,
      'família "' + v.familia + '"');
    verificar(id + ' diz de que habilidade veio', typeof v.manual === 'string' && v.manual.length > 3);
    familias[v.familia] = (familias[v.familia] || 0) + 1;
  }
  verificar('as três famílias estão representadas', Object.keys(familias).length === 3,
    JSON.stringify(familias));
  verificar('e em partes iguais — quatro cada',
    Object.values(familias).every(n => n === 4), JSON.stringify(familias));

  const nomes = V.FU_VANTAGENS_IDS.map(id => V.FU_VANTAGENS[id].manual);
  verificar('nenhuma habilidade do manual foi usada três vezes',
    nomes.every(n => nomes.filter(x => x === n).length <= 2),
    nomes.join(', '));
}

/* ═══ 2 · NENHUM CAMPO POR LER ═══════════════════════════════════ */
titulo('Nenhum campo que o motor não leia');
{
  /* Os campos que alguma coisa lê: os que o saco dos dons soma, os que
     ele junta como verdade, os dois que o DNA acaba de escrever, e os
     três de identificação. Tudo o resto é um campo órfão. */
  const conhecidos = V.FU_DONS_SOMA.concat(V.FU_DONS_VERDADE)
    .concat(['imunes', 'espelha', 'familia', 'manual', 'id', 'lado']);

  for (const id of V.FU_VANTAGENS_IDS) {
    for (const k of Object.keys(V.FU_VANTAGENS[id])) {
      verificar(id + ' · o campo "' + k + '" é lido por alguém',
        conhecidos.indexOf(k) !== -1,
        'não está nos dons nem é dos que o DNA resolve');
    }
    // e nenhuma entrada é só um nome
    const v = V.FU_VANTAGENS[id];
    const efeitos = Object.keys(v).filter(k =>
      V.FU_DONS_SOMA.indexOf(k) !== -1 || V.FU_DONS_VERDADE.indexOf(k) !== -1
      || k === 'imunes' || k === 'espelha');
    verificar(id + ' faz alguma coisa', efeitos.length > 0, 'não tem efeito nenhum');
  }

  /* E o contrário: cada campo que os dons prometem somar aparece em pelo
     menos uma vantagem. Um campo no saco que ninguém preenche é código
     morto à espera de alguém que o leia e conclua que a vantagem existe. */
  const usados = {};
  for (const id of V.FU_VANTAGENS_IDS) {
    const v = V.FU_VANTAGENS[id];
    for (const k of Object.keys(v)) usados[k] = true;
    if (v.espelha === 'defesa')   { usados.defesaMais = true; usados.defMagMais = true; }
    if (v.espelha === 'precisao') { usados.precisaoMais = true; usados.magiaMais = true; }
  }
  for (const k of V.FU_DONS_SOMA.concat(V.FU_DONS_VERDADE))
    verificar('o dom "' + k + '" tem quem o dê', !!usados[k],
      'nenhuma das doze o declara');
}

/* ═══ 3 · DECIDEM-SE AO NASCER ═══════════════════════════════════ */
titulo('Decidem-se ao nascer e não mudam');
{
  for (let s = 1; s <= 200; s++) {
    const seed = s * 7919;
    const primeira = F.fuFicha(avatar(seed, 1)).vantagens[0].id;
    let mudou = null;
    for (const nv of [1, 5, 10, 11, 20, 26, 27, 40, 59, 60]) {
      const f = F.fuFicha(avatar(seed, nv));
      if (f.vantagens[0].id !== primeira) { mudou = nv; break; }
    }
    verificar('a vantagem do seed ' + seed + ' não muda com o nível', mudou === null,
      'trocou no nível ' + mudou);
  }

  // e a mesma ficha duas vezes dá a mesma coisa
  for (let s = 1; s <= 50; s++) {
    const a = avatar(s * 104729, 30);
    verificar('o seed ' + a.seed + ' dá sempre a mesma vantagem',
      JSON.stringify(F.fuFicha(a).vantagens) === JSON.stringify(F.fuFicha(a).vantagens));
  }

  /* E não depende da escolha do Lendário para a PRIMEIRA: fechar a
     costura não pode trocar-lhe a vantagem por outra. */
  for (let s = 1; s <= 100; s++) {
    const seed = s * 31337;
    const a = F.fuFicha(avatar(seed, 30)).vantagens[0].id;
    const b = F.fuFicha(avatar(seed, 30, 'semDefeito')).vantagens[0].id;
    const c = F.fuFicha(avatar(seed, 30, 'vantagem')).vantagens[0].id;
    verificar('a escolha do Lendário não troca a primeira (' + seed + ')',
      a === b && b === c, [a, b, c].join(' / '));
  }
}

/* ═══ 4 · UMA VANTAGEM E UMA COSTURA ═════════════════════════════ */
titulo('Uma vantagem e uma costura — a regra do dono do jogo');
{
  for (const nv of [5, 10, 11, 20, 26]) {
    for (let s = 1; s <= 40; s++) {
      const f = F.fuFicha(avatar(s * 7919, nv));
      verificar('nv' + nv + ' tem UMA vantagem', f.vantagens.length === 1,
        f.vantagens.length + '');
      verificar('nv' + nv + ' tem costura', !!f.costura);
    }
  }

  for (let s = 1; s <= 60; s++) {
    const seed = s * 7919;
    const nada = F.fuFicha(avatar(seed, 30));
    const sem  = F.fuFicha(avatar(seed, 30, 'semDefeito'));
    const mais = F.fuFicha(avatar(seed, 30, 'vantagem'));

    verificar('o Lendário que ainda não escolheu fica com uma e com a costura',
      nada.vantagens.length === 1 && !!nada.costura);
    verificar('quem fechou a costura fica com uma e sem costura',
      sem.vantagens.length === 1 && sem.costura === null,
      sem.vantagens.length + ' / ' + sem.costura);
    verificar('quem escolheu a segunda fica com duas e COM a costura',
      mais.vantagens.length === 2 && !!mais.costura,
      mais.vantagens.length + ' / ' + mais.costura);
    verificar('e as duas são diferentes',
      mais.vantagens[0].id !== mais.vantagens[1].id,
      mais.vantagens.map(v => v.id).join(' = '));

    /* A segunda que se mostra na tela da escolha é a MESMA que se ganha.
       Sem isto, o cartão prometia uma e o avatar recebia outra. */
    verificar('a segunda prometida é a que sai',
      nada.segundaPossivel.id === mais.vantagens[1].id,
      nada.segundaPossivel.id + ' prometida, ' + mais.vantagens[1].id + ' dada');
  }

  // um Comum não ganha a segunda por pedir
  for (let s = 1; s <= 40; s++) {
    const f = F.fuFicha(avatar(s * 1299721, 5, 'vantagem'));
    verificar('um Comum não ganha a segunda por escrever a escolha no slot',
      f.vantagens.length === 1, f.vantagens.length + '');
    verificar('nem fecha a costura', !!F.fuFicha(avatar(s * 1299721, 5, 'semDefeito')).costura);
  }
}

/* ═══ 5 · O SORTEIO ══════════════════════════════════════════════ */
titulo('O sorteio: a índole inclina, não decide');
{
  const conta = {};
  for (const id of V.FU_VANTAGENS_IDS) conta[id] = 0;
  const porIndole = { guarda: {}, sustentacao: {}, lamina: {} };
  let n = 0;
  for (let s = 1; s <= 4000; s++) {
    const a = avatar(s * 7919, 5);
    const f = F.fuFicha(a);
    conta[f.vantagens[0].id]++;
    const ind = indoleDominante(a.nascimento.dna);
    const fam = V.FU_VANTAGENS[f.vantagens[0].id].familia;
    porIndole[ind][fam] = (porIndole[ind][fam] || 0) + 1;
    n++;
  }
  for (const id of V.FU_VANTAGENS_IDS)
    verificar(id + ' sai alguma vez', conta[id] > 0, 'zero em ' + n);

  for (const ind of Object.keys(porIndole)) {
    const linha = porIndole[ind];
    const total = Object.values(linha).reduce((a, b) => a + b, 0);
    if (!total) continue;
    verificar('a índole ' + ind + ' puxa para a própria família',
      (linha[ind] || 0) / total > 0.34,
      Math.round((linha[ind] || 0) / total * 100) + '% de ' + total);
    for (const fam of ['guarda', 'sustentacao', 'lamina'])
      verificar('mas a índole ' + ind + ' ainda sai com ' + fam,
        (linha[fam] || 0) > 0, 'zero em ' + total);
  }
  console.log('   ' + Object.keys(porIndole).map(i =>
    i + ' → ' + ['guarda', 'sustentacao', 'lamina']
      .map(f => f[0] + (Math.round((porIndole[i][f] || 0) /
        Math.max(1, Object.values(porIndole[i]).reduce((a, b) => a + b, 0)) * 100)) + '%')
      .join(' ')).join('   ·   '));
}

/* ═══ 6 · O SACO DIZ O MESMO QUE A LISTA ═════════════════════════ */
titulo('Os dons dizem o mesmo que a lista');
{
  for (let s = 1; s <= 300; s++) {
    const f = F.fuFicha(avatar(s * 7919, 30, 'vantagem'));
    const d = V.fuDons(f.vantagens);
    verificar('o saco do seed ' + f.seed + ' é o que a lista dá',
      JSON.stringify(d) === JSON.stringify(f.dons));
    for (const k of V.FU_DONS_SOMA) {
      const soma = f.vantagens.reduce((t, v) => t + (v[k] | 0), 0);
      verificar('o dom ' + k + ' é a soma das vantagens', f.dons[k] === soma,
        f.dons[k] + ' contra ' + soma);
    }
  }

  // um saco vazio é um saco de zeros, e não um saco de undefined
  const vazio = V.fuDons([]);
  for (const k of V.FU_DONS_SOMA)    verificar('sem vantagens, ' + k + ' é zero', vazio[k] === 0);
  for (const k of V.FU_DONS_VERDADE) verificar('sem vantagens, ' + k + ' é falso', vazio[k] === false);
  verificar('sem vantagens, imunes é uma lista vazia',
    Array.isArray(vazio.imunes) && vazio.imunes.length === 0);

  // e o motor sabe ler um lutador sem dons nenhuns
  verificar('fuDonsDe aguenta uma ficha sem dons',
    M.fuDonsDe({ ficha: {} }).voo === false && M.fuDonsDe(null).imunes.length === 0);
}

/* ═══ 7 · AS QUE O DNA ACABA DE ESCREVER ═════════════════════════ */
titulo('As que o DNA acaba de escrever');
{
  let cerrada = 0, mira = 0, pele = 0;
  for (let s = 1; s <= 4000; s++) {
    const f = F.fuFicha(avatar(s * 7919, 30, 'vantagem'));
    for (const v of f.vantagens) {
      if (v.id === 'guarda_cerrada') {
        cerrada++;
        verificar('a Guarda Cerrada dá sempre três no total',
          v.defesaMais + v.defMagMais === 3, v.defesaMais + '/' + v.defMagMais);
        verificar('e reforça o lado maior',
          (f.DES >= f.PER) === (v.defesaMais === 2),
          'DES ' + f.DES + ' PER ' + f.PER + ' → ' + v.defesaMais + '/' + v.defMagMais);
      }
      if (v.id === 'mira_treinada') {
        mira++;
        const p = v.precisaoMais | 0, m = v.magiaMais | 0;
        verificar('a Mira Treinada dá +3 de um lado só', (p === 3) !== (m === 3),
          p + ' e ' + m);
      }
      if (v.id === 'pele_calada') {
        pele++;
        verificar('a Pele Calada cala DOIS estados', v.imunes.length === 2,
          v.imunes.join(','));
        verificar('e os dois são diferentes', v.imunes[0] !== v.imunes[1], v.imunes.join(','));
        verificar('e os dois existem no motor',
          v.imunes.every(e => !!M.FU_ESTADOS[e]), v.imunes.join(','));
      }
    }
  }
  verificar('as três apareceram para se poderem medir',
    cerrada > 50 && mira > 50 && pele > 50,
    cerrada + ' / ' + mira + ' / ' + pele);
}

/* ═══ 8 · CADA UMA FAZ O QUE DIZ ═════════════════════════════════ */
titulo('Cada uma faz o que diz, medida no motor');
{
  // ── Guarda Cerrada ──
  {
    const e = luta(20, 3), c = e.A[0];
    c.ficha.DES = 8; c.ficha.PER = 8;
    const antes = M.fuDefesa(c), antesM = M.fuDefesaMag(c);
    calcar(c, 'guarda_cerrada', { defesaMais: 2, defMagMais: 1 });
    verificar('a Guarda Cerrada soma à Defesa', M.fuDefesa(c) === antes + 2,
      antes + ' → ' + M.fuDefesa(c));
    verificar('e à Defesa Mágica', M.fuDefesaMag(c) === antesM + 1);
    // e soma-se POR CIMA do piso da Barreira
    c.efeitos.defesaMinima = 12;
    verificar('e soma-se por cima do piso da Barreira', M.fuDefesa(c) === 14,
      M.fuDefesa(c) + '');
  }

  // ── Carne Teimosa e Fonte Funda ──
  {
    const seed = 987654321;
    const base = F.fuFicha(avatar(seed, 20));
    const forcado = Object.assign({}, base);
    verificar('a Carne Teimosa dá exactamente dez PV',
      V.fuDons([V.FU_VANTAGENS.carne_teimosa]).pvMais === 10);
    verificar('a Fonte Funda dá exactamente dez PM',
      V.fuDons([V.FU_VANTAGENS.fonte_funda]).pmMais === 10);
    // e a crise acompanha a vida, senão a vantagem empurrava a crise para longe de graça
    let achou = 0;
    for (let s = 1; s <= 2000 && achou < 20; s++) {
      const f = F.fuFicha(avatar(s * 7919, 20));
      if (f.dons.pvMais !== 10) continue;
      achou++;
      verificar('com a Carne Teimosa a crise ainda é metade da vida',
        f.crise === Math.floor(f.pvMax / 2));
    }
    verificar('houve Carnes Teimosas para medir', achou > 0, achou + '');
    void forcado;
  }

  // ── Pele Calada ──
  {
    const e = luta(20, 4), c = e.A[0];
    calcar(c, 'pele_calada', { imunes: ['lento', 'fraco'] });
    verificar('a Pele Calada recusa o estado que cala', M.fuDarEstado(c, 'lento') === false);
    verificar('e o segundo também', M.fuDarEstado(c, 'fraco') === false);
    verificar('e não fica com ele escondido', !c.estados.lento && !c.estados.fraco);
    verificar('mas apanha os outros', M.fuDarEstado(c, 'abalado') === true);
    verificar('e o dado desce com o que apanhou', M.fuDado(c, 'VON') < c.ficha.VON);
  }

  // ── Voo Baixo ──
  {
    const e = luta(20, 5);
    const [f1, f2, f3] = e.B;
    calcar(f1, 'voo_baixo');
    verificar('quem voa está no ar', M.fuNoAr(f1) === true);
    verificar('e o corpo-a-corpo passa-lhe ao lado',
      M.fuAlvosPossiveis(e.B, true)[0] === f2,
      'apanhou ' + M.fuAlvosPossiveis(e.B, true)[0].id);
    verificar('mas a magia alcança-o', M.fuAlvosPossiveis(e.B, false).indexOf(f1) !== -1);

    f2.vivo = false; f3.vivo = false;
    verificar('sozinho no ar, tem de descer para atacar — e apanha',
      M.fuAlvosPossiveis(e.B, true)[0] === f1);

    f2.vivo = true; f3.vivo = true;
    f1.pv = f1.ficha.crise;
    verificar('em crise, cai', M.fuNoAr(f1) === false);
    verificar('e o corpo-a-corpo chega-lhe', M.fuAlvosPossiveis(e.B, true)[0] === f1);

    f1.pv = f1.ficha.pvMax;
    f1.derrubado = true;
    verificar('derrubado, fica no chão', M.fuNoAr(f1) === false);
    M.fuNovaRonda(e);
    verificar('e a ronda seguinte levanta-o', M.fuNoAr(f1) === true && !f1.derrubado);
  }

  // ── o voo cai com a costura ──
  {
    const e = luta(20, 6), quem = e.A[0], alvo = e.B[0];
    calcar(alvo, 'voo_baixo');
    alvo.ficha.costura = 'fogo';
    alvo.ficha.afinidades = { fogo: null };
    alvo.pv = alvo.ficha.pvMax;
    let derrubou = false;
    for (let i = 0; i < 40 && !derrubou; i++) {
      alvo.pv = alvo.ficha.pvMax; alvo.derrubado = false;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5, tipo: 'fogo' });
      if (ev.acertou && ev.perda > 0) derrubou = !!ev.derrubou;
    }
    verificar('o dano da costura derruba quem voa', derrubou === true);

    // e um tipo que não é a costura não o derruba
    alvo.derrubado = false; alvo.pv = alvo.ficha.pvMax;
    let caiuAtoa = false;
    for (let i = 0; i < 40; i++) {
      alvo.pv = alvo.ficha.pvMax;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5, tipo: 'gelo' });
      if (ev.derrubou) caiuAtoa = true;
    }
    verificar('e um tipo qualquer não o derruba', caiuAtoa === false);
  }

  // ── Veia Ávida ──
  {
    const e = luta(20, 7), c = e.A[0];
    calcar(c, 'veia_avida');
    c.pm = 0; c.pv = c.ficha.pvMax;
    c.ficha.afinidades = {};
    const d = M.fuAplicarDano(c, 20, 'fogo');
    verificar('a Veia Ávida bebe do golpe que apanha', c.pm === 5 && d.pmGanho === 5,
      'pm ' + c.pm + ' ganho ' + d.pmGanho);

    c.ficha.afinidades = { gelo: 'IM' };
    c.pm = 0;
    M.fuAplicarDano(c, 20, 'gelo');
    verificar('mas não de um golpe que não doeu', c.pm === 0, c.pm + '');

    c.ficha.afinidades = {};
    c.pm = c.ficha.pmMax;
    M.fuAplicarDano(c, 20, 'fogo');
    verificar('e nunca passa do máximo', c.pm === c.ficha.pmMax);
  }

  // ── Fúria da Crise ──
  {
    const e = luta(20, 8), quem = e.A[0], alvo = e.B[0];
    calcar(quem, 'furia_da_crise');
    alvo.ficha.afinidades = { fogo: 'RS' };
    alvo.ficha.pvMax = 500; alvo.ficha.crise = 250;

    quem.pv = quem.ficha.pvMax;
    let fora = 0, dentro = 0;
    for (let i = 0; i < 60; i++) {
      alvo.pv = 500;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 20, tipo: 'fogo' });
      if (ev.acertou) { fora++; if (ev.ignorouResistencias) dentro++; }
    }
    verificar('fora de crise, a resistência vale', fora > 0 && dentro === 0,
      dentro + ' de ' + fora);

    quem.pv = quem.ficha.crise;
    verificar('e ele está mesmo em crise', M.fuEmCrise(quem) === true);
    let fora2 = 0, dentro2 = 0;
    for (let i = 0; i < 60; i++) {
      alvo.pv = 500;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 20, tipo: 'fogo' });
      if (ev.acertou) { fora2++; if (ev.ignorouResistencias) dentro2++; }
    }
    verificar('em crise, o golpe dele ignora resistências', fora2 > 0 && dentro2 === fora2,
      dentro2 + ' de ' + fora2);

    // mas não a imunidade nem a absorção
    alvo.ficha.afinidades = { fogo: 'IM' };
    alvo.pv = 500;
    for (let i = 0; i < 30; i++) { alvo.pv = 500; M.fuAtacar(e, quem, alvo, { fixo: 20, tipo: 'fogo' }); }
    verificar('e continua a não passar a imunidade', alvo.pv === 500, alvo.pv + '');
  }

  // ── Último Suspiro ──
  {
    const e = luta(20, 9), quem = e.A[0];
    calcar(quem, 'ultimo_suspiro');
    e.B.forEach(c => { c.pv = 200; c.ficha.pvMax = 200; c.ficha.crise = 100;
                       c.ficha.afinidades = {}; });
    quem.pv = 0; quem.vivo = false;
    const eventos = [];
    M.fuColherQuedas(e, eventos);
    verificar('o Último Suspiro apanha os três', eventos.length === 3, eventos.length + '');
    verificar('e tira dez a cada um', e.B.every(c => c.pv === 190),
      e.B.map(c => c.pv).join(','));

    const outra = [];
    M.fuColherQuedas(e, outra);
    verificar('e dá-se uma vez só', outra.length === 0, outra.length + '');

    // não dispara enquanto ele estiver de pé
    const e2 = luta(20, 10), q2 = e2.A[0];
    calcar(q2, 'ultimo_suspiro');
    const ev2 = [];
    M.fuColherQuedas(e2, ev2);
    verificar('e não dispara com o dono de pé', ev2.length === 0);

    /* A CADEIA. Um suspiro que derruba quem também o tem faz esse suspirar
       também — e o que aqui se guarda é que a cadeia NÃO depende da ordem
       dos postos: o mesmo cenário espelhado tem de dar a mesma conta. Uma
       passagem única sobre a lista dava contas diferentes por lado. */
    function cadeia(quemCai) {
      const b = luta(20, 11);
      b.A.concat(b.B).forEach(c => {
        calcar(c, 'ultimo_suspiro');
        c.pv = 5; c.ficha.afinidades = {};
      });
      const vitima = b[quemCai][0];
      vitima.pv = 0; vitima.vivo = false;
      const ev = [];
      M.fuColherQuedas(b, ev);
      return { estado: b, eventos: ev };
    }
    const ca = cadeia('A'), cb = cadeia('B');
    verificar('a cadeia acontece', ca.eventos.length > 3, ca.eventos.length + '');
    verificar('e não depende do lado por onde começa',
      ca.eventos.length === cb.eventos.length,
      ca.eventos.length + ' contra ' + cb.eventos.length);
    verificar('e todos os que caíram suspiraram',
      ca.estado.A.concat(ca.estado.B).every(c => c.vivo || c.suspirou));
    verificar('e ninguém suspirou duas vezes',
      ca.estado.A.concat(ca.estado.B).every(c =>
        ca.eventos.filter(x => x.quem === c.id).length <= 3),
      JSON.stringify(ca.eventos.map(x => x.quem)));
  }

  // ── Golpe Pesado ──
  {
    const e = luta(20, 12), quem = e.A[0], alvo = e.B[0];
    alvo.ficha.afinidades = {}; alvo.ficha.pvMax = 900; alvo.ficha.crise = 450;
    let semDom = 0, nSem = 0;
    for (let i = 0; i < 80; i++) {
      alvo.pv = 900;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (ev.acertou) { semDom += ev.bruto; nSem++; }
    }
    /* A magia mede-se contra a MAGIA, e não contra o murro: uma rola
       PER+VON e a outra DES+VIG, portanto os dois brutos já são diferentes
       antes de qualquer vantagem entrar. Compará-los era medir a
       distância entre dois atributos e chamar-lhe dom. */
    let magSem = 0, nMagSem = 0;
    for (let i = 0; i < 80; i++) {
      alvo.pv = 900;
      const em = M.fuAtacar(e, quem, alvo, { magico: true, fixo: 5,
                                             atrib1: 'PER', atrib2: 'VON' });
      if (em.acertou) { magSem += em.bruto; nMagSem++; }
    }

    calcar(quem, 'golpe_pesado');
    let comDom = 0, nCom = 0, magico = 0, nMag = 0;
    for (let i = 0; i < 80; i++) {
      alvo.pv = 900;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (ev.acertou) { comDom += ev.bruto; nCom++; }
      alvo.pv = 900;
      const em = M.fuAtacar(e, quem, alvo, { magico: true, fixo: 5,
                                             atrib1: 'PER', atrib2: 'VON' });
      if (em.acertou) { magico += em.bruto; nMag++; }
    }
    const medSem = semDom / Math.max(1, nSem), medCom = comDom / Math.max(1, nCom);
    const magA = magSem / Math.max(1, nMagSem), magB = magico / Math.max(1, nMag);
    verificar('o Golpe Pesado engorda o murro em cinco',
      Math.abs((medCom - medSem) - 5) < 1.6,
      medSem.toFixed(1) + ' → ' + medCom.toFixed(1));
    verificar('e não toca nas magias', Math.abs(magB - magA) < 1.6,
      magA.toFixed(1) + ' → ' + magB.toFixed(1));
  }

  // ── Mira Treinada ──
  {
    const e = luta(20, 13), quem = e.A[0], alvo = e.B[0];
    alvo.ficha.pvMax = 900; alvo.ficha.afinidades = {};
    calcar(quem, 'mira_treinada', { precisaoMais: 3, magiaMais: 0 });
    let somaF = 0, somaM = 0;
    for (let i = 0; i < 200; i++) {
      alvo.pv = 900;
      somaF += M.fuAtacar(e, quem, alvo, { fixo: 0 }).modificador;
      alvo.pv = 900;
      somaM += M.fuAtacar(e, quem, alvo, { magico: true, fixo: 0,
                                           atrib1: 'PER', atrib2: 'VON' }).modificador;
    }
    verificar('a Mira Treinada do corpo soma na precisão do murro',
      somaF / 200 === (quem.ficha.bonusPrecisao | 0) + 3, (somaF / 200) + '');
    verificar('e não na da magia',
      somaM / 200 === (quem.ficha.bonusPrecisao | 0), (somaM / 200) + '');
  }

  // ── Sede Funda ──
  {
    const e = luta(20, 14), quem = e.A[0], alvo = e.B[0];
    calcar(quem, 'sede_funda');
    alvo.ficha.afinidades = {}; alvo.ficha.pvMax = 900; alvo.ficha.crise = 450;
    quem.pv = 1;
    let bebeu = false, errado = false;
    for (let i = 0; i < 60; i++) {
      alvo.pv = 900;
      const antes = quem.pv;
      const ev = M.fuAtacar(e, quem, alvo, { fixo: 5 });
      if (ev.acertou && ev.perda > 0) {
        const esperado = Math.min(quem.ficha.pvMax, antes + Math.floor(ev.perda / 2));
        if (quem.pv !== esperado) errado = true;
        if (quem.pv > antes) bebeu = true;
      } else if (quem.pv !== antes) errado = true;
    }
    verificar('a Sede Funda bebe metade do que tirou', bebeu === true);
    verificar('e bebe exactamente metade, sem passar do máximo', errado === false);

    // nada quando o inimigo absorve
    quem.pv = 10;
    alvo.ficha.afinidades = { [quem.ficha.tipo]: 'AB' };
    const antes2 = quem.pv;
    for (let i = 0; i < 30; i++) { alvo.pv = 900; M.fuAtacar(e, quem, alvo, { fixo: 5 }); }
    verificar('e não bebe de um golpe que curou o inimigo', quem.pv === antes2,
      antes2 + ' → ' + quem.pv);
  }

  // ── Golpe Certeiro ──
  {
    const e = luta(20, 15), quem = e.A[0], alvo = e.B[0];
    alvo.ficha.DES = 6; alvo.ficha.PER = 12;
    alvo.ficha.pvMax = 900; alvo.ficha.afinidades = {};
    const normal = M.fuAtacar(e, quem, alvo, { fixo: 0 });
    verificar('sem o dom, o murro mira a Defesa',
      normal.dl === M.fuDefesa(alvo) && normal.naMente === false,
      normal.dl + ' contra ' + M.fuDefesa(alvo));
    calcar(quem, 'golpe_certeiro');
    const certeiro = M.fuAtacar(e, quem, alvo, { fixo: 0 });
    verificar('com o dom, mira a Defesa Mágica',
      certeiro.dl === M.fuDefesaMag(alvo) && certeiro.naMente === true,
      certeiro.dl + ' contra ' + M.fuDefesaMag(alvo));
    verificar('e continua a ser um ataque e não uma magia', certeiro.tipo === 'ataque');
  }
}

/* ═══ 9 · O QUE NÃO PODE ACONTECER ═══════════════════════════════ */
titulo('O que não pode acontecer');
{
  /* Sessenta batalhas inteiras com as vantagens que o sorteio deu, a
     conferir que nada sai dos limites e que todas acabam. É aqui que o
     Voo Baixo se prova: três inimigos a voar contra um atacante sem PM
     era a forma óbvia de fazer uma batalha que não acabava nunca. */
  for (let s = 1; s <= 60; s++) {
    const b = luta(20, s * 17);
    let guarda = 0;
    while (!b.acabou && guarda++ < 500) {
      const vez = M.fuVez(b);
      if (!vez) { M.fuNovaRonda(b); continue; }
      const quem = M.fuPorId(b, vez.podem[0]);
      M.fuAgir(b, { quem: quem.id, tipo: 'atacar' });
    }
    verificar('batalha ' + s + ' acaba só a bater', b.acabou,
      'parou na ronda ' + b.ronda);
    verificar('batalha ' + s + ': vida dentro dos limites',
      b.A.concat(b.B).every(c => c.pv >= 0 && c.pv <= c.ficha.pvMax),
      b.A.concat(b.B).map(c => c.pv + '/' + c.ficha.pvMax).join(' '));
    verificar('batalha ' + s + ': magia dentro dos limites',
      b.A.concat(b.B).every(c => c.pm >= 0 && c.pm <= c.ficha.pmMax));
    verificar('batalha ' + s + ': ninguém suspirou duas vezes',
      b.A.concat(b.B).every(c => !c.suspirou || !c.vivo));
  }

  // três a voar, e o atacante só com as mãos
  {
    const b = luta(20, 999);
    b.B.forEach(c => calcar(c, 'voo_baixo'));
    b.A.forEach(c => { c.pm = 0; });
    let guarda = 0;
    while (!b.acabou && guarda++ < 500) {
      const vez = M.fuVez(b);
      if (!vez) { M.fuNovaRonda(b); continue; }
      M.fuAgir(b, { quem: vez.podem[0], tipo: 'atacar' });
    }
    verificar('três a voar contra mãos nuas — e a batalha acaba', b.acabou,
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
