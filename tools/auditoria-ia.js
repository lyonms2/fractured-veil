#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DA IA DOS INIMIGOS — js/ia-fu.js

   Não mede quem ganha: mede se a IA joga DIREITO.

     1. Não mexe no estado da batalha ao decidir, e a mesma situação dá
        sempre a mesma decisão.
     2. Só decide coisas que o motor aceita, e todas as batalhas
        terminam — pelo limite de rodadas (FU_RONDAS_MAX), se for
        preciso. As que acabam empatadas pelo limite aparecem contadas
        por nível, sem falhar.
     3. O Fácil é exatamente a IA de antes, decisão a decisão.
     4. Cada nível só usa o que é dele: magias de cena a partir do
        Difícil, troca de posto só no Mestre, e só o Fácil deixa de
        escolher quem age. No Médio a guarda só aparece quando todo o
        resto piora a situação.
     5. Do Médio para cima: não mira quem absorve a magia quando há outro
        alvo, e não cura quem está com a vida cheia.
     6. Um caso montado à mão: a frente absorve o tipo do atacante, e a
        IA não bate nela.

   node tools/auditoria-ia.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const M   = require('../js/combate-fu.js');
const G   = require('../js/magias-fu.js');
Object.assign(global, M, G);
const IA  = require('../js/ia-fu.js');

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
const equipa = (p, nv, sem) =>
  [1, 2, 3].map(i => avatar((sem || 1) * 1000003 + p * 7919 + i * 104729, nv, p + '' + i));
const luta = (nv, sem) => M.fuIniciar(equipa(1, nv, sem), equipa(2, nv, sem), sem || 1);

// Um nível de avatar por raridade, para as magias dos três degraus entrarem.
const NIVEIS_AV = [4, 14, 28];
const SEMENTES = 8;

/* A IA de antes, copiada do js/arena-fu.js como estava. O Fácil tem de
   bater com ela em todas as decisões. */
function antiga(e, lado, podem) {
  const quem = M.fuPorId(e, podem[0]);
  const meus = e[lado].filter(c => c.vivo);
  const deles = e[lado === 'A' ? 'B' : 'A'].filter(c => c.vivo);
  const magias = G.fuMagiasDe(quem.ficha);
  const paga = (m, n) => G.fuCusto(m, n) <= quem.pm;
  const ferido = meus.filter(M.fuEmCrise).sort((a, b) => a.pv - b.pv)[0];
  if (ferido) {
    const sup = magias.suporte;
    if (sup && paga(sup, 1)) {
      const acao = sup.proprio
        ? (ferido === quem ? { tipo: 'magia', magia: sup } : null)
        : { tipo: 'magia', magia: sup, alvos: [ferido.id] };
      if (acao) return { quem: quem.id, acao };
    }
  }
  for (const l of ['muito_forte', 'forte']) {
    const m = magias[l];
    if (!m) continue;
    const n = m.porAlvo ? Math.min(m.alvos || 1, deles.length) : 1;
    if (!paga(m, n)) continue;
    return { quem: quem.id, acao: { tipo: 'magia', magia: m, alvos: deles.slice(0, n).map(c => c.id) } };
  }
  return { quem: quem.id, acao: { tipo: 'atacar' } };
}

const sem = d => JSON.stringify({ quem: d.quem, acao: d.acao });

/* ═══ 1 a 5 · BATALHAS INTEIRAS, IA CONTRA IA ════════════════════ */
titulo('Batalhas inteiras, nos quatro níveis');
{
  const raridades = new Set();
  const c = {
    decisoes: 0, mexeu: 0, variou: 0, ilegal: 0, semFim: 0, foraDaVez: 0,
    legadoDiferente: 0, guardaCedo: 0, cenaCedo: 0, moverCedo: 0,
    absorvido: 0, casosDeAbsorcao: 0, curaInutil: 0,
  };
  const usos = [0, 1, 2, 3].map(() => ({}));
  const porLimite = [0, 0, 0, 0];
  let exemplo = '';

  for (const nv of NIVEIS_AV) {
    for (let nivel = 0; nivel < 4; nivel++) {
      for (let s = 1; s <= SEMENTES; s++) {
        const e = luta(nv, s * 31 + nv);
        e.A.concat(e.B).forEach(x => raridades.add(x.ficha.raridade));
        let passos = 0;
        while (!e.acabou && passos++ < 600) {
          const vez = M.fuVez(e);
          if (!vez) { M.fuNovaRonda(e); continue; }
          c.decisoes++;

          const antes = JSON.stringify(e);
          const d = IA.fuIaDecidir(e, vez.lado, vez.podem, nivel);
          if (JSON.stringify(e) !== antes) c.mexeu++;
          if (sem(IA.fuIaDecidir(e, vez.lado, vez.podem, nivel)) !== sem(d)) c.variou++;
          if (vez.podem.indexOf(d.quem) === -1) c.foraDaVez++;

          const a = d.acao;
          const tipoAcao = a.tipo === 'magia' ? 'magia:' + a.magia.id : a.tipo;
          usos[nivel][tipoAcao] = (usos[nivel][tipoAcao] || 0) + 1;

          if (nivel === 0 && sem(antiga(e, vez.lado, vez.podem)) !== sem(d)) c.legadoDiferente++;
          if (a.tipo === 'guardar' && nivel === 1) {
            const outras = IA._iaOpcoes(e, M.fuPorId(e, d.quem), IA.FU_IA_NIVEIS[1])
                             .filter(o => o.acao.tipo !== 'guardar');
            if (outras.some(o => o.v > 0)) c.guardaCedo++;
          }
          if (a.tipo === 'mover' && nivel < 3) c.moverCedo++;
          // O Fácil é a IA de antes, que já lançava o Despertar em quem está
          // em crise; a regra nova vale para o Médio.
          if (a.tipo === 'magia' && a.magia.cena && nivel === 1) c.cenaCedo++;

          const quem = M.fuPorId(e, d.quem);
          if (nivel >= 1 && a.tipo === 'magia' && !(a.magia.aliado || a.magia.cura || a.magia.proprio || a.magia.todos)) {
            const tipo = a.magia.tipo || quem.ficha.tipo;
            const inimiga = e[quem.lado === 'A' ? 'B' : 'A'];
            const mira = a.magia.corpoACorpo ? 'mao' : ((a.magia.alvos || 1) === 1);
            const possiveis = M.fuAlvosPossiveis(inimiga, mira);
            // Só conta quem tem vida para recuperar: absorver com a vida
            // cheia não cura nada, e o estado da magia pega na mesma.
            const absorvem = possiveis.filter(t => M.fuAfinidadeDe(t, tipo) === 'AB'
                                                && t.pv < t.ficha.pvMax);
            if (absorvem.length && absorvem.length < possiveis.length) {
              c.casosDeAbsorcao++;
              if ((a.alvos || []).some(id => absorvem.some(t => t.id === id))) {
                c.absorvido++;
                exemplo = exemplo || `${a.magia.id} de ${quem.id} em ${a.alvos.join(',')}`;
              }
            }
          }
          if (nivel >= 1 && a.tipo === 'magia' && a.magia.cura && !a.magia.cena) {
            const alvos = (a.alvos || [d.quem]).map(id => M.fuPorId(e, id));
            if (alvos.some(t => t.pv >= t.ficha.pvMax)) c.curaInutil++;
          }

          const ev = M.fuAgir(e, Object.assign({ quem: d.quem }, a));
          if (!ev.length) {
            c.ilegal++;
            if (!M.fuAgir(e, { quem: d.quem, tipo: 'atacar' }).length)
              M.fuAgir(e, { quem: d.quem, tipo: 'guardar' });
          }
        }
        if (!e.acabou) c.semFim++;
        else if (e.porLimite) porLimite[nivel]++;
      }
    }
  }

  console.log(`  ${c.decisoes} decisões em ${NIVEIS_AV.length * 4 * SEMENTES} batalhas`);
  console.log('  empates pelo limite de rodadas: ' + ['Fácil', 'Médio', 'Difícil', 'Mestre']
    .map((n, i) => n + ' ' + porLimite[i]).join(' · '));
  ['Fácil', 'Médio', 'Difícil', 'Mestre'].forEach((n, i) => {
    const u = usos[i];
    const total = Object.values(u).reduce((s, x) => s + x, 0) || 1;
    console.log('  ' + n.padEnd(8) + Object.keys(u).sort((x, y) => u[y] - u[x])
      .map(k => `${k} ${Math.round(u[k] / total * 100)}%`).join(' · '));
  });

  verificar('as três raridades entraram', raridades.size === 3, [...raridades].join(','));
  verificar('decidir não mexe no estado', c.mexeu === 0, c.mexeu + ' vezes');
  verificar('a mesma situação dá a mesma decisão', c.variou === 0, c.variou + ' vezes');
  verificar('quem age é sempre alguém que pode agir', c.foraDaVez === 0, c.foraDaVez + ' vezes');
  verificar('o motor aceita todas as decisões', c.ilegal === 0, c.ilegal + ' recusadas');
  verificar('todas as batalhas terminam', c.semFim === 0, c.semFim + ' sem fim');
  verificar('o Fácil é a IA de antes', c.legadoDiferente === 0, c.legadoDiferente + ' diferentes');
  verificar('no Médio, guarda só quando o resto piora', c.guardaCedo === 0, c.guardaCedo + ' vezes');
  verificar('magia de cena só a partir do Difícil', c.cenaCedo === 0, c.cenaCedo + ' vezes');
  verificar('troca de posto só no Mestre', c.moverCedo === 0, c.moverCedo + ' vezes');
  verificar('não mira quem absorve quando há outro alvo', c.absorvido === 0,
            `${c.absorvido} de ${c.casosDeAbsorcao} · ${exemplo}`);
  verificar('não cura quem está com a vida cheia', c.curaInutil === 0, c.curaInutil + ' vezes');
}

/* ═══ 6 · A FRENTE QUE ABSORVE ════════════════════════════════════ */
titulo('A frente absorve o tipo do atacante');
{
  let casos = 0, bateu = 0, detalhe = '';
  for (let s = 1; s <= 20; s++) {
    const e = luta(14, 900 + s);
    const quem = e.B[0];
    const frente = M.fuFrente(e.A);
    // Só o da frente absorve; os de trás ficam como nasceram.
    frente.ficha = Object.assign({}, frente.ficha, {
      afinidades: Object.assign({}, frente.ficha.afinidades, { [quem.ficha.tipo]: 'AB' }),
    });
    frente.pv = Math.max(1, frente.ficha.pvMax - 30);  // há vida para absorver
    const tipo = quem.ficha.tipo;
    // Alguém de trás tem de poder levar o golpe, senão não há alternativa.
    const atras = e.A.filter(t => t !== frente && t.vivo && M.fuAfinidadeDe(t, tipo) !== 'AB');
    if (!atras.length) continue;
    const barragem = G.fuMagiasDe(quem.ficha).forte;
    if (!barragem || !barragem.porAlvo) continue;
    casos++;
    for (let nivel = 1; nivel < 4; nivel++) {
      const d = IA.fuIaDecidir(e, 'B', [quem.id], nivel);
      const a = d.acao;
      const temTipo = !a.magia || (a.magia.tipo || tipo) === tipo;
      // O golpe comum é físico e a frente não o absorve: atacar não conta.
      const naFrente =
        (a.tipo === 'magia' && !(a.magia.aliado || a.magia.cura || a.magia.proprio) &&
         temTipo && (a.magia.todos || (a.alvos || []).indexOf(frente.id) !== -1));
      if (naFrente) { bateu++; detalhe = detalhe || `nível ${nivel}: ${JSON.stringify({ t: a.tipo, m: a.magia && a.magia.id, alvos: a.alvos })}`; }
    }
  }
  verificar('houve casos para testar', casos > 0, casos + ' casos');
  verificar('não bate na frente que absorve', bateu === 0, `${bateu} vezes · ${detalhe}`);
}

console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : ''));
console.log(`${ok} passaram · ${mau} falharam`);
process.exit(mau ? 1 : 0);
