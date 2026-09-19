#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   BALANÇO DAS DECISÕES — o que vale gastar um turno com cada ação

   Não é uma auditoria: não passa nem falha. É uma ferramenta de desenho,
   que lê os números ATUAIS do jogo (o motor, as magias e a IA de verdade,
   os mesmos arquivos do navegador) e mede as decisões de um turno.

   ── A PERGUNTA ──

   Não "qual magia é mais eficiente?" — as 18 casas não competem entre si,
   porque cada avatar tem só três lugares, definidos pelo feitio e pela
   raridade. A pergunta é: DADO ESTE AVATAR, NESTA SITUAÇÃO, quanto vale
   gastar o turno com cada uma das suas opções (o golpe comum, a magia
   forte, a do feitio e a guarda)?

   ── COMO SE MEDE O VALOR DE UM TURNO ──

   Por simulação curta: aplica-se a ação e deixa-se a batalha correr até o
   fim da rodada seguinte, com a IA jogando por todos. O valor é

       vida tirada dos inimigos − vida perdida pelos aliados
       + 20 por inimigo derrubado − 20 por aliado derrubado
       + 0,8 por PM que sobrou a mais do nosso lado que do deles

   medido contra o mesmo ponto de partida e com as mesmas sementes para
   todas as opções. Assim entram de uma vez o dano, a cura, a proteção
   (o dano que deixou de acontecer), o controle (o estado que atrapalhou o
   inimigo) e o custo de quem ficou sem PM. O que dura mais que duas
   rodadas (a Barreira, a Concha, o Despertar) sai subestimado — está
   escrito no relatório.

   O PM entra porque, em duas rodadas, economizar não valeria nada: o
   golpe comum (que é grátis) e a guarda (que devolve PM) sairiam sempre
   por baixo, e gastar tudo na primeira rodada pareceria sempre certo.

   ── O QUE O RELATÓRIO TRAZ, POR FEITIO × RARIDADE ──

     valor/turno       a média do valor acima
     marginal          quanto a melhor opção ganhou da segunda, em média
     dominância        em quantas situações cada opção foi a melhor
     imediato          dano, cura, estados e acerto do próprio turno
     ritmo             quantas guardas pagam o PM da magia
     uso real da IA    o que a IA do Médio e do Difícil escolhem em batalhas
                       inteiras — ao lado da dominância, para separar um
                       problema da MAGIA de um problema da IA

   Em sete situações: abertura, pressão (um aliado a 40%), execução (a
   frente inimiga em crise), equipe debilitada (dois aliados a 45%),
   controle (a frente inimiga já com o estado do elemento), guarda (os
   inimigos guardando) e PM baixo (o avatar a 40% do PM). E em três
   perfis por raridade: começo, meio e fim da faixa de nível.

   E duas camadas à parte, porque os elementos só diferem nelas:
     estados       quanto vale, em duas rodadas, a frente inimiga ter cada
                   um dos seis estados
     afinidades    para cada tipo de dano, quantos avatares nascem
                   vulneráveis, resistentes, imunes ou absorvendo

   ── USO ──

     node tools/balanco.js                 completo (alguns minutos)
     node tools/balanco.js --rapido        menos amostras, para iterar
     node tools/balanco.js --md arquivo.md grava o relatório em markdown
     node tools/balanco.js --so lamina     só um feitio
   ═══════════════════════════════════════════════════════════════════ */

const fs  = require('fs');
const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const M   = require('../js/combate-fu.js');
const G   = require('../js/magias-fu.js');
Object.assign(global, M, G);
const IA  = require('../js/ia-fu.js');

// ── Argumentos ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const RAPIDO = args.includes('--rapido');
const arqMd  = args.includes('--md') ? args[args.indexOf('--md') + 1] : null;
const SO     = args.includes('--so') ? args[args.indexOf('--so') + 1] : null;

const AVATARES_POR_PERFIL = RAPIDO ? 2 : 4;   // avatares diferentes de cada feitio
const ROLAGENS            = RAPIDO ? 8 : 16;  // simulações por opção e situação
const BATALHAS_IA         = RAPIDO ? 20 : 60; // batalhas inteiras para medir o uso
const POLITICA            = 1;                // a IA que joga o resto (o Médio)
const ABATE               = 20;               // o mesmo peso da IA (IA_ABATE)
const PESO_PM             = 0.8;              // quanto vale, em vida, um PM guardado

// Os nomes das magias de nome fixo (os outros mudam com o elemento).
const NOMES_FIXOS = {
  golpe: 'Golpe Comum', sopro: 'Sopro', sopro_maldito: 'Sopro Maldito',
  devastacao: 'Devastação', concha: 'Concha', barreira: 'Barreira', proteger: 'Proteger',
  lamber: 'Lamber Feridas', curar: 'Curar', despertar: 'Despertar',
};

const FEITIOS   = ['guarda', 'lamina', 'sustentacao'].filter(f => !SO || f === SO);
const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const PERFIS    = { Comum: [5, 8, 10], Raro: [11, 18, 26], 'Lendário': [27, 40, 55] };
const PERFIL_NOME = ['começo', 'meio', 'fim'];
const POSTO_NATURAL = { guarda: 0, lamina: 1, sustentacao: 2 };
const NOME_FEITIO = { guarda: 'GUARDA', lamina: 'LÂMINA', sustentacao: 'SUSTENTAÇÃO' };

// ── Saída ──────────────────────────────────────────────────────────
const linhas = [];
const sai = (s = '') => { console.log(s); linhas.push(s); };
const pct = x => Math.round(x * 100) + '%';
const n1  = x => (Math.round(x * 10) / 10).toFixed(1);
const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);
const padE = (s, n) => (' '.repeat(n) + String(s)).slice(-n);

// ── Avatares ───────────────────────────────────────────────────────
function avatar(seed, nivel, id) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'bal', nome: 'T' });
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  return { id, nome: id, seed, nivel, nascimento: cert.nascimento };
}
const feitioDe = a => { const f = F.fuFicha(a); return f && f.feitio; };

// Os K primeiros avatares de um feitio num nível, sempre os mesmos.
const _cacheFeitio = {};
function avataresDoFeitio(feitio, nivel, k) {
  const chave = feitio + nivel + ':' + k;
  if (_cacheFeitio[chave]) return _cacheFeitio[chave];
  const out = [];
  for (let s = 1; out.length < k && s < 50000; s++) {
    const a = avatar(s * 7919 + nivel, nivel, 'eu0');
    if (feitioDe(a) === feitio) out.push(a);
  }
  return (_cacheFeitio[chave] = out);
}

/* Uma batalha montada com o avatar no posto natural do feitio (o Guarda
   na frente, a Lâmina no meio, a Sustentação atrás), dois aliados e três
   inimigos sorteados do mesmo nível. O lado A começa a rodada. */
function montar(ator, nivel, sem) {
  const outros = [1, 2].map(i => avatar(sem * 1000003 + i * 104729, nivel, 'eu' + i));
  const time = outros.slice();
  time.splice(POSTO_NATURAL[feitioDe(ator)], 0, Object.assign({}, ator, { id: 'ator', nome: 'ator' }));
  const ini = [1, 2, 3].map(i => avatar(sem * 7000003 + i * 15485863, nivel, 'ini' + i));
  const E = M.fuIniciar(time, ini, sem);
  E.comeca = 'A';
  E.jaAgiu = [];
  return E;
}

// ── As situações ───────────────────────────────────────────────────
const aPct = (c, p) => { c.pv = Math.max(1, Math.floor(c.ficha.pvMax * p)); };
const CENARIOS = {
  abertura:   () => {},
  pressao:    (E) => { const a = E.A.find(c => c.id !== 'ator'); aPct(a, 0.40); },
  execucao:   (E) => { const f = M.fuFrente(E.B); f.pv = Math.max(1, Math.floor(f.ficha.crise * 0.9)); },
  debilitada: (E) => { E.A.filter(c => c.id !== 'ator').forEach(c => aPct(c, 0.45)); },
  controle:   (E, ator) => {
    const e = (G.FU_ELEMENTAL[ator.ficha.tipo] || G.FU_ELEMENTAL.fogo).estado;
    M.fuDarEstado(M.fuFrente(E.B), e);
  },
  guarda:     (E) => { E.B.forEach(c => { c.guardando = true; }); },
  pm_baixo:   (E, ator) => { ator.pm = Math.floor(ator.ficha.pmMax * 0.4); },
};
const NOME_CENARIO = {
  abertura: 'abertura', pressao: 'pressão', execucao: 'execução',
  debilitada: 'equipe debilitada', controle: 'controle', guarda: 'inimigos em guarda',
  pm_baixo: 'PM baixo',
};

// ── As opções do menu de um avatar ─────────────────────────────────
const vida = c => c.pv / c.ficha.pvMax;
function opcoes(E, ator) {
  const out = [{ chave: 'golpe', nome: 'Golpe Comum', acao: { tipo: 'atacar' }, custo: 0 }];
  const magias = G.fuMagiasDe(ator.ficha);
  const aliados = E[ator.lado].filter(c => c.vivo);
  const inimigos = E[ator.lado === 'A' ? 'B' : 'A'].filter(c => c.vivo);
  for (const lugar of Object.keys(magias)) {
    if (lugar === 'comum') continue;
    const m = magias[lugar];
    const nome = m.nome || NOMES_FIXOS[m.id] || m.id;
    let alvos = [];
    if (m.todos || m.proprio) {
      alvos = [];
    } else if (m.cura) {
      alvos = aliados.filter(c => c.pv < c.ficha.pvMax).sort((a, b) => vida(a) - vida(b));
      if (!alvos.length) alvos = [aliados.slice().sort((a, b) => vida(a) - vida(b))[0]];
      alvos = alvos.slice(0, m.alvos || 1);
    } else if (m.proteger) {
      alvos = aliados.filter(c => c !== ator).sort((a, b) => vida(a) - vida(b)).slice(0, 1);
    } else if (m.aliado) {
      alvos = m.cena && m.cena.subirDado
        ? [aliados.slice().sort((a, b) => IA._iaForca(E, b) - IA._iaForca(E, a))[0]]
        : aliados.slice(0, m.alvos || 1);
    } else if ((m.alvos || 1) > 1) {
      alvos = inimigos.slice(0, m.alvos);
    } else if (lugar === 'muito_forte') {
      // Alcança qualquer um: vai em quem rende mais dano esperado.
      const o = { magico: true, fixo: m.fixo, tipo: m.tipo || ator.ficha.tipo,
                  ignoraResistencias: m.ignoraResistencias };
      alvos = [inimigos.slice().sort((a, b) =>
        IA._iaGolpe(ator, b, o).dano - IA._iaGolpe(ator, a, o).dano)[0]];
    }
    alvos = alvos.filter(Boolean);
    while (m.porAlvo && alvos.length > 1 && G.fuCusto(m, alvos.length) > ator.pm) alvos.pop();
    const custo = G.fuCusto(m, Math.max(1, alvos.length));
    out.push({ chave: lugar, nome, custo, semPM: custo > ator.pm, magia: m,
               acao: { tipo: 'magia', magia: m, alvos: alvos.map(c => c.id) } });
  }
  out.push({ chave: 'guardar', nome: 'Guardar', acao: { tipo: 'guardar' }, custo: 0 });
  return out;
}

// ── A simulação curta ──────────────────────────────────────────────
const clonar = E => JSON.parse(JSON.stringify(E));
const somaPv = l => l.reduce((s, c) => s + Math.max(0, c.pv), 0);
const somaPm = l => l.filter(c => c.vivo).reduce((s, c) => s + Math.max(0, c.pm), 0);
const caidos = l => l.filter(c => !c.vivo).length;

function jogarAte(E, rondaFim) {
  let g = 0;
  while (!E.acabou && g++ < 400) {
    const v = M.fuVez(E);
    if (!v) { if (E.ronda >= rondaFim) break; M.fuNovaRonda(E); continue; }
    const d = IA.fuIaDecidir(E, v.lado, v.podem, POLITICA);
    let evs = M.fuAgir(E, Object.assign({ quem: d.quem }, d.acao));
    if (!evs.length) evs = M.fuAgir(E, { quem: d.quem, tipo: 'atacar' });
    if (!evs.length) evs = M.fuAgir(E, { quem: d.quem, tipo: 'guardar' });
    if (E.jaAgiu.indexOf(d.quem) === -1) E.jaAgiu.push(d.quem);
  }
}

/* Uma rolagem: o ator faz a ação, e a batalha segue até o fim da rodada
   seguinte. Devolve o valor e o que o próprio turno fez. */
function rolar(E0, acao, semente, quemId) {
  const E = clonar(E0);
  E.rng = { semente, passo: 0 };
  quemId = quemId || 'ator';
  // "Nós" é o lado de quem age; o valor é sempre do ponto de vista dele.
  const ladoNos = M.fuPorId(E, quemId).lado;
  const nos = () => E[ladoNos], eles = () => E[ladoNos === 'A' ? 'B' : 'A'];
  const pvA = somaPv(nos()), pvB = somaPv(eles()), cA = caidos(nos()), cB = caidos(eles());
  const pmA = somaPm(nos()), pmB = somaPm(eles());
  const evs = M.fuAgir(E, Object.assign({ quem: quemId }, acao));
  if (!evs.length) return null;
  const im = { dano: 0, cura: 0, estados: 0, tent: 0, acertos: 0 };
  for (const ev of evs) {
    const alvo = ev.alvo ? M.fuPorId(E, ev.alvo) : null;
    if ((ev.tipo === 'ataque' || ev.tipo === 'magia')) {
      im.tent++; if (ev.acertou) im.acertos++;
    }
    if (alvo && alvo.lado !== ladoNos && ev.perda) im.dano += ev.perda;
    if (alvo && alvo.lado === ladoNos && ev.curou) im.cura += ev.curou;
    if (ev.estadoDado || ev.envenenou) im.estados++;
  }
  jogarAte(E, E.ronda + 1);
  const valor = (pvB - somaPv(eles())) - (pvA - somaPv(nos()))
              + ABATE * ((caidos(eles()) - cB) - (caidos(nos()) - cA))
              + PESO_PM * ((somaPm(nos()) - pmA) - (somaPm(eles()) - pmB));
  return { valor, im };
}

// ── O uso real da IA, em batalhas inteiras ─────────────────────────
function usoDaIA(nivel, ia) {
  const uso = {};   // feitio → chave → n
  for (let b = 0; b < BATALHAS_IA; b++) {
    const A = [1, 2, 3].map(i => avatar(b * 31337 + i * 911 + nivel, nivel, 'a' + i));
    const B = [1, 2, 3].map(i => avatar(b * 71993 + i * 613 + nivel, nivel, 'b' + i));
    const E = M.fuIniciar(A, B, 500 + b);
    let g = 0;
    while (!E.acabou && g++ < 3000) {
      const v = M.fuVez(E);
      if (!v) { M.fuNovaRonda(E); continue; }
      const d = IA.fuIaDecidir(E, v.lado, v.podem, ia);
      const q = M.fuPorId(E, d.quem);
      const k = d.acao.tipo === 'atacar' ? 'golpe'
              : d.acao.tipo === 'magia' ? d.acao.magia.lugar : d.acao.tipo;
      const f = q.ficha.feitio;
      uso[f] = uso[f] || {};
      uso[f][k] = (uso[f][k] || 0) + 1;
      let evs = M.fuAgir(E, Object.assign({ quem: d.quem }, d.acao));
      if (!evs.length) evs = M.fuAgir(E, { quem: d.quem, tipo: 'guardar' });
      if (E.jaAgiu.indexOf(d.quem) === -1) E.jaAgiu.push(d.quem);
    }
  }
  return uso;
}
const fracUso = (uso, f, k) => {
  const u = (uso[f] || {}); const t = Object.values(u).reduce((s, x) => s + x, 0) || 1;
  return (u[k] || 0) / t;
};

// ═══ O RELATÓRIO ═══════════════════════════════════════════════════
const inicio = Date.now();
sai('FRACTURED VEIL — BALANÇO DAS DECISÕES');
sai(`${new Date().toISOString().slice(0, 10)} · ${RAPIDO ? 'rápido' : 'completo'} · `
  + `${AVATARES_POR_PERFIL} avatares por perfil · ${ROLAGENS} simulações por opção · `
  + `resto jogado pela IA do Médio`);
sai('Valor = vida tirada − vida perdida + 20 por queda + 0,8 por PM guardado, até o fim da rodada seguinte.');
sai('O que dura a luta inteira (Barreira, Concha, Despertar) sai subestimado.');

const alertas = [];

for (const raridade of RARIDADES) {
  const niveis = PERFIS[raridade];
  // O uso da IA no meio da faixa, nos dois níveis de IA que pensam.
  const usoMedio = usoDaIA(niveis[1], 1);
  const usoDificil = usoDaIA(niveis[1], 2);

  for (const feitio of FEITIOS) {
    // agregados: chave → { soma, n, vitorias, imediato..., porCenario, porPerfil }
    const agg = {};
    let instancias = 0, somaMarginal = 0;
    const porCenarioVence = {};   // cenário → chave → vitórias
    const porPerfilVence = [{}, {}, {}];
    const nomes = {};

    niveis.forEach((nivel, pi) => {
      for (const av of avataresDoFeitio(feitio, nivel, AVATARES_POR_PERFIL)) {
        for (const cen of Object.keys(CENARIOS)) {
          const E = montar(av, nivel, av.seed + pi * 17 + cen.length);
          const ator = M.fuPorId(E, 'ator');
          CENARIOS[cen](E, ator);
          const ops = opcoes(E, ator).filter(o => !o.semPM);
          const medias = [];
          for (const op of ops) {
            nomes[op.chave] = nomes[op.chave] || op.nome;
            const a = agg[op.chave] = agg[op.chave] || {
              soma: 0, n: 0, vitorias: 0, dano: 0, cura: 0, estados: 0, tent: 0, acertos: 0,
              custo: 0, custoN: 0, porCenario: {}, ritmo: 0,
            };
            let soma = 0, k = 0;
            for (let r = 0; r < ROLAGENS; r++) {
              const res = rolar(E, op.acao, 9001 + r * 7);
              if (!res) continue;
              soma += res.valor; k++;
              a.dano += res.im.dano; a.cura += res.im.cura; a.estados += res.im.estados;
              a.tent += res.im.tent; a.acertos += res.im.acertos;
            }
            if (!k) continue;
            const media = soma / k;
            a.soma += media; a.n++;
            a.imN = (a.imN || 0) + k;
            a.custo += op.custo; a.custoN++;
            const vonDado = M.fuDado(ator, 'VON');
            a.ritmo += op.custo ? op.custo / vonDado : 0;
            const pc = a.porCenario[cen] = a.porCenario[cen] || { soma: 0, n: 0 };
            pc.soma += media; pc.n++;
            medias.push({ chave: op.chave, media });
          }
          if (!medias.length) continue;
          medias.sort((x, y) => y.media - x.media);
          const venc = medias[0].chave;
          agg[venc].vitorias++;
          porCenarioVence[cen] = porCenarioVence[cen] || {};
          porCenarioVence[cen][venc] = (porCenarioVence[cen][venc] || 0) + 1;
          porPerfilVence[pi][venc] = (porPerfilVence[pi][venc] || 0) + 1;
          instancias++;
          if (medias.length > 1) somaMarginal += medias[0].media - medias[1].media;
        }
      }
    });

    // ── A tabela do feitio × raridade ──
    sai('');
    sai('═'.repeat(78));
    sai(`${NOME_FEITIO[feitio]} ${raridade.toUpperCase()}  ·  níveis ${niveis.join(' / ')}  ·  ${instancias} situações`);
    sai('═'.repeat(78));
    sai(pad('Ação', 30) + padE('valor/turno', 12) + padE('melhor em', 10) + padE('IA Médio', 10)
      + padE('IA Difícil', 11) + padE('acerto', 8) + padE('PM', 5));
    const chaves = Object.keys(agg).sort((a, b) => agg[b].soma / agg[b].n - agg[a].soma / agg[a].n);
    for (const ch of chaves) {
      const a = agg[ch];
      const dom = a.vitorias / Math.max(1, instancias);
      const uM = fracUso(usoMedio, feitio, ch), uD = fracUso(usoDificil, feitio, ch);
      const LUGAR = { forte: 'forte', muito_forte: 'muito forte', defesa: 'defesa', suporte: 'suporte' };
      sai(pad(nomes[ch] + (LUGAR[ch] ? ` (${LUGAR[ch]})` : ''), 30)
        + padE(n1(a.soma / a.n), 12) + padE(pct(dom), 10) + padE(pct(uM), 10) + padE(pct(uD), 11)
        + padE(a.tent ? pct(a.acertos / a.tent) : '—', 8)
        + padE(a.custoN ? Math.round(a.custo / a.custoN) : 0, 5));
      a.dom = dom; a.uM = uM; a.uD = uD;
    }
    sai(`Margem média entre a melhor e a segunda: ${n1(somaMarginal / Math.max(1, instancias))} de valor`);

    // Imediato, por turno.
    sai('');
    sai('No próprio turno (média):');
    for (const ch of chaves) {
      const a = agg[ch]; const k = a.imN || 1;
      const ritmo = a.custoN ? a.ritmo / a.custoN : 0;
      const partes = [];
      if (a.dano) partes.push(`dano ${n1(a.dano / k)}`);
      if (a.cura) partes.push(`cura ${n1(a.cura / k)}`);
      if (a.estados) partes.push(`estados ${n1(a.estados / k)}`);
      if (ritmo) partes.push(`${n1(ritmo)} guarda(s) pagam o PM`);
      sai('  ' + pad(nomes[ch], 22) + (partes.join(' · ') || '—'));
    }

    // Por situação.
    sai('');
    sai('Valor por situação:');
    sai('  ' + pad('', 20) + chaves.map(ch => padE(pad(nomes[ch], 12).trim().slice(0, 12), 13)).join(''));
    for (const cen of Object.keys(CENARIOS)) {
      const vence = porCenarioVence[cen] || {};
      const melhor = Object.keys(vence).sort((a, b) => vence[b] - vence[a])[0];
      sai('  ' + pad(NOME_CENARIO[cen], 20) + chaves.map(ch => {
        const pc = agg[ch].porCenario[cen];
        const v = pc ? n1(pc.soma / pc.n) : '—';
        return padE((ch === melhor ? '▸' : '') + v, 13);
      }).join(''));
    }

    // Por perfil (começo, meio, fim da faixa).
    sai('');
    sai('Quem é a melhor, por perfil:');
    porPerfilVence.forEach((v, pi) => {
      const t = Object.values(v).reduce((s, x) => s + x, 0) || 1;
      sai(`  nível ${padE(niveis[pi], 2)} (${pad(PERFIL_NOME[pi], 6)}) `
        + chaves.map(ch => `${nomes[ch]} ${pct((v[ch] || 0) / t)}`).join(' · '));
    });

    // ── O diagnóstico ──
    const ditos = [];
    for (const ch of chaves) {
      const a = agg[ch], nome = nomes[ch];
      if (a.dom >= 0.65)
        ditos.push(`${nome} é a melhor em ${pct(a.dom)} das situações: pode estar forte demais (problema de MAGIA).`);
      if (ch !== 'guardar' && a.dom <= 0.05) {
        const situ = Object.keys(porCenarioVence).filter(c => {
          const v = porCenarioVence[c]; const t = Object.values(v).reduce((s, x) => s + x, 0) || 1;
          return (v[ch] || 0) / t >= 0.3;
        });
        ditos.push(situ.length
          ? `${nome} quase nunca é a melhor, mas vence em: ${situ.map(c => NOME_CENARIO[c]).join(', ')} (situacional).`
          : `${nome} quase nunca é a melhor escolha em nenhuma situação: sem espaço de decisão.`);
      }
      if (Math.abs(a.dom - a.uM) >= 0.25)
        ditos.push(`${nome}: a IA do Médio usa ${pct(a.uM)}, mas é a melhor em ${pct(a.dom)} (possível problema da IA).`);
    }
    if (ditos.length) {
      sai('');
      sai('ALERTAS');
      ditos.forEach(d => { sai('  → ' + d); alertas.push(`${NOME_FEITIO[feitio]} ${raridade}: ${d}`); });
    }
  }
}

// ═══ A IA NA HORA H ════════════════════════════════════════════════
/* A comparação entre "melhor em" e "uso da IA", lá em cima, mistura duas
   coisas: as situações montadas começam quase todas com PM cheio, e as
   batalhas de verdade passam boa parte do tempo sem PM. Aqui a pergunta é
   direta: em decisões REAIS da IA do Médio, no meio de batalhas inteiras,
   ela escolheu a melhor jogada? Para cada decisão, simulam-se todas as
   opções do avatar naquele momento — e a jogada exata que a IA fez —, e
   mede-se a perda: quanto valor a melhor opção rendia a mais. */
sai('');
sai('═'.repeat(78));
sai('A IA NA HORA H  ·  decisões reais do Médio, contra a melhor opção simulada');
sai('═'.repeat(78));
sai(pad('Feitio × raridade', 26) + padE('decisões', 9) + padE('acertou', 9) + padE('perda média', 13));
const PONTOS = RAPIDO ? 12 : 30;
const chaveDa = a => a.tipo === 'atacar' ? 'golpe' : a.tipo === 'magia' ? a.magia.lugar : a.tipo;
const errosGerais = [];
let totN = 0, totAcertos = 0, totPerda = 0;
for (const raridade of RARIDADES) {
  const nivel = PERFIS[raridade][1];
  for (const feitio of FEITIOS) {
    let n = 0, acertos = 0, perda = 0, b = 0;
    const confusoes = {};
    while (n < PONTOS && b < 400) {
      b++;
      const E = M.fuIniciar([1, 2, 3].map(i => avatar(b * 6007 + i + nivel, nivel, 'a' + i)),
                            [1, 2, 3].map(i => avatar(b * 9001 + i + nivel, nivel, 'b' + i)), 300 + b);
      let g = 0, pulo = b % 3;
      while (!E.acabou && g++ < 3000 && n < PONTOS) {
        const v = M.fuVez(E);
        if (!v) { M.fuNovaRonda(E); continue; }
        const d = IA.fuIaDecidir(E, v.lado, v.podem, 1);
        const q = M.fuPorId(E, d.quem);
        // Um ponto de decisão a cada três deste feitio, para espalhar pela luta.
        if (q.ficha.feitio === feitio && d.acao.tipo !== 'mover' && d.acao.tipo !== 'examinar'
            && (pulo++ % 3 === 0)) {
          const ops = opcoes(E, q).filter(o => !o.semPM);
          const media = acao => {
            let s = 0, k = 0;
            for (let r = 0; r < ROLAGENS; r++) {
              const res = rolar(E, acao, 5003 + r * 11, q.id);
              if (res) { s += res.valor; k++; }
            }
            return k ? s / k : null;
          };
          const vIA = media(d.acao);
          if (vIA != null) {
            let melhor = { chave: chaveDa(d.acao), v: vIA };
            for (const op of ops) {
              const vo = media(op.acao);
              if (vo != null && vo > melhor.v) melhor = { chave: op.chave, nome: op.nome, v: vo };
            }
            const p = melhor.v - vIA;
            n++; perda += p;
            if (p <= 2) acertos++;
            else {
              const k = chaveDa(d.acao) + ' → ' + melhor.chave;
              const c = confusoes[k] = confusoes[k] || { n: 0, perda: 0 };
              c.n++; c.perda += p;
            }
          }
        }
        let evs = M.fuAgir(E, Object.assign({ quem: d.quem }, d.acao));
        if (!evs.length) evs = M.fuAgir(E, { quem: d.quem, tipo: 'guardar' });
        if (E.jaAgiu.indexOf(d.quem) === -1) E.jaAgiu.push(d.quem);
      }
    }
    totN += n; totAcertos += acertos; totPerda += perda;
    sai(pad(`${NOME_FEITIO[feitio]} ${raridade}`, 26) + padE(n, 9) + padE(pct(acertos / Math.max(1, n)), 9)
      + padE(n1(perda / Math.max(1, n)), 13));
    const top = Object.entries(confusoes).sort((x, y) => y[1].perda - x[1].perda).slice(0, 2);
    for (const [k, c] of top) {
      const [fez, devia] = k.split(' → ');
      const nomeDe = ch => ({ golpe: 'Golpe Comum', guardar: 'Guardar', forte: 'a Forte',
        muito_forte: 'a Muito Forte', defesa: 'a de Defesa', suporte: 'a de Suporte' })[ch] || ch;
      const txt = `usou ${nomeDe(fez)} quando ${nomeDe(devia)} rendia mais: ${c.n}× (perda ${n1(c.perda / c.n)})`;
      sai('    ' + txt);
      errosGerais.push(`${NOME_FEITIO[feitio]} ${raridade}: ${txt}`);
    }
  }
}
sai(pad('TOTAL', 26) + padE(totN, 9) + padE(pct(totAcertos / Math.max(1, totN)), 9)
  + padE(n1(totPerda / Math.max(1, totN)), 13));
sai('Acertou = a jogada da IA ficou a até 2 de valor da melhor opção simulada.');

// ═══ CAMADA 2 · OS ESTADOS ═════════════════════════════════════════
sai('');
sai('═'.repeat(78));
sai('OS ESTADOS  ·  quanto vale a frente inimiga ter o estado, em duas rodadas');
sai('═'.repeat(78));
sai(pad('Estado', 14) + RARIDADES.map(r => padE(r, 12)).join(''));
const AMOSTRAS_ESTADO = RAPIDO ? 12 : 80;
const valorEstado = {};
for (const est of M.FU_ESTADOS_LISTA) {
  const cols = RARIDADES.map(r => {
    const nivel = PERFIS[r][1];
    let soma = 0, n = 0;
    for (let i = 0; i < AMOSTRAS_ESTADO; i++) {
      const E0 = M.fuIniciar([1, 2, 3].map(k => avatar(i * 4099 + k, nivel, 'a' + k)),
                             [1, 2, 3].map(k => avatar(i * 8191 + k, nivel, 'b' + k)), 77 + i);
      const sem = clonar(E0), com = clonar(E0);
      if (!M.fuDarEstado(M.fuFrente(com.B), est)) continue;   // imune: não conta
      for (const [E, sinal] of [[sem, -1], [com, 1]]) {
        const pvA = somaPv(E.A), pvB = somaPv(E.B);
        jogarAte(E, E.ronda + 1);
        soma += sinal * ((pvB - somaPv(E.B)) - (pvA - somaPv(E.A))
               + ABATE * (caidos(E.B) - caidos(E.A)));
      }
      n++;
    }
    return n ? soma / n : 0;
  });
  valorEstado[est] = cols;
  sai(pad(est, 14) + cols.map(v => padE(n1(v), 12)).join(''));
}
sai('Elementos que compartilham estado: ' + Object.entries(
  Object.entries(G.FU_ELEMENTAL).reduce((m, [el, x]) => ((m[x.estado] = (m[x.estado] || []).concat(el)), m), {})
).filter(([, els]) => els.length > 1).map(([e, els]) => `${els.join(' e ')} → ${e}`).join(' · '));

// ═══ CAMADA 3 · AS AFINIDADES ══════════════════════════════════════
sai('');
sai('═'.repeat(78));
sai('AS AFINIDADES  ·  contra cada tipo de dano, como nascem os avatares');
sai('═'.repeat(78));
sai(pad('Tipo', 10) + padE('VU', 7) + padE('RS', 7) + padE('IM', 7) + padE('AB', 7) + padE('×dano médio', 13));
const AMOSTRAS_AF = RAPIDO ? 300 : 1200;
const fichas = [];
for (let i = 0; i < AMOSTRAS_AF; i++) {
  const nivel = [8, 18, 40][i % 3];
  const f = F.fuFicha(avatar(i * 104729 + 3, nivel, 'x'));
  if (f) fichas.push(f);
}
const tipos = Object.keys(G.FU_ELEMENTAL).concat(['fisico']);
for (const tipo of tipos) {
  const c = { VU: 0, RS: 0, IM: 0, AB: 0 };
  for (const f of fichas) { const a = f.afinidades && f.afinidades[tipo]; if (a) c[a]++; }
  const n = fichas.length;
  const mult = (c.VU * 2 + (n - c.VU - c.RS - c.IM - c.AB) + c.RS * 0.5 + c.AB * -1) / n;
  sai(pad(tipo, 10) + ['VU', 'RS', 'IM', 'AB'].map(k => padE(pct(c[k] / n), 7)).join('') + padE(mult.toFixed(2), 13));
}
sai('×dano médio: quanto o tipo rende contra a população, com VU ×2, RS ×½, IM ×0 e AB ×−1.');

// ═══ RESUMO ════════════════════════════════════════════════════════
sai('');
sai('═'.repeat(78));
sai(`RESUMO  ·  ${alertas.length} alerta(s)  ·  ${Math.round((Date.now() - inicio) / 1000)}s`);
sai('═'.repeat(78));
alertas.forEach(a => sai('  • ' + a));
if (!alertas.length) sai('  Nenhuma opção domina nem sobra em nenhum feitio.');
sai('');
sai('Nenhuma regra foi alterada. Leia com: magia (a matemática), IA (a escolha) ou');
sai('interação (as peças juntas) — a ferramenta aponta, quem decide é o desenho.');

if (arqMd) {
  fs.writeFileSync(arqMd, '```\n' + linhas.join('\n') + '\n```\n', 'utf8');
  console.log('\nGravado em ' + arqMd);
}
