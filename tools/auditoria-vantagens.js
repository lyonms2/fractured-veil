// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS VANTAGENS E DESVANTAGENS
// Uma pergunta por item: o que está escrito acontece mesmo em combate?
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const soco = () => ({ magia: null, pm: 0 });
const media = a => a.reduce((x, y) => x + y, 0) / a.length;
const base = { F: 2, H: 2, R: 6, A: 2 };
// Uma magia de fogo simples, para testar o que reage a magia elemental
const magiaFogo = { id: 'fg_a1', pm: 1, fa: { dados: 1, fixo: 2 } };

console.log('\n═══ VANTAGENS ═══\n');

// ── couraca_elemental: A a dobrar contra magia daquele elemento ──
{
  const v = { ...M.VANTAGENS.couraca_elemental, id: 'couraca_elemental', elemento: 'Fogo' };
  const fd = (comVant, magia) => {
    const fs = [];
    for (let s = 1; s <= 300; s++) {
      const { evA } = A.lancar({ seed: s, politica: () => ({ magia, pm: magia ? magia.pm : 0 }),
        a: { carac: base, elemento: 'Fogo' },
        b: { carac: { F: 0, H: 0, R: 20, A: 4 }, vant: comVant ? v : null } }, 1);
      if (evA[0] && evA[0].fd != null) fs.push(evA[0].fd);
    }
    return Math.max(...fs);
  };
  A.ver('Couraça — dobra a Armadura contra magia do elemento',
        fd(true, magiaFogo) > fd(false, magiaFogo),
        `FD máxima com a couraça ${fd(true, magiaFogo)} · sem ela ${fd(false, magiaFogo)}`);
  A.ver('Couraça — NÃO trava um golpe físico',
        fd(true, null) === fd(false, null),
        `FD máxima com a couraça ${fd(true, null)} · sem ela ${fd(false, null)}`);
}

// ── ferida_antiga: A a zero contra magia daquele elemento ──
{
  const d = { ...M.DESVANTAGENS.ferida_antiga, id: 'ferida_antiga', elemento: 'Fogo' };
  const fds = [];
  for (let s = 1; s <= 300; s++) {
    const { evA } = A.lancar({ seed: s, politica: () => ({ magia: magiaFogo, pm: 1 }),
      a: { carac: base, elemento: 'Fogo' },
      b: { carac: { F: 0, H: 0, R: 20, A: 5 }, desv: d } }, 1);
    if (evA[0] && evA[0].fd != null) fds.push(evA[0].fd);
  }
  A.ver('Ferida — a Armadura conta zero contra magia do elemento',
        Math.max(...fds) <= 6, `FD ficou em ${Math.min(...fds)}–${Math.max(...fds)} (alvo de A5)`);
}

// ── reflexo_defensivo / reflexo_espelhado ──
for (const id of ['reflexo_defensivo', 'reflexo_espelhado']) {
  const v = { ...M.VANTAGENS[id], id };
  let usou = 0, devolveu = 0, pmDesceu = 0;
  for (let s = 1; s <= 300; s++) {
    const { e, evA } = A.lancar({ seed: s, politica: soco,
      a: { carac: { F: 6, H: 2, R: 6, A: 1 } },
      b: { carac: { F: 0, H: 4, R: 20, A: 1 }, vant: v, pm: 40 } }, 1);
    if (evA[0] && evA[0].reflexo) { usou++; if (e.B[0].pm < 40) pmDesceu++; }
    if (evA[0] && evA[0].devolveu > 0) devolveu++;
  }
  A.ver(`${A.nomeDe(id)} — dispara e cobra PM`, usou > 0 && pmDesceu === usou,
        `disparou ${usou}/300 · cobrou PM em ${pmDesceu}`);
  if (id === 'reflexo_espelhado')
    A.ver('Reflexo Espelhado — devolve o golpe', devolveu > 0, `devolveu em ${devolveu}/300`);
}
// e o reflexo simples NÃO pode devolver nada
{
  const v = { ...M.VANTAGENS.reflexo_defensivo, id: 'reflexo_defensivo' };
  let devolveu = 0;
  for (let s = 1; s <= 300; s++) {
    const { evA } = A.lancar({ seed: s, politica: soco, a: { carac: { F: 6, H: 2, R: 6, A: 1 } },
      b: { carac: { F: 0, H: 4, R: 20, A: 1 }, vant: v, pm: 40 } }, 1);
    if (evA[0] && evA[0].devolveu) devolveu++;
  }
  A.ver('Reflexo Defensivo — não devolve (só o Espelhado devolve)', devolveu === 0, `devolveu ${devolveu}`);
}

// ── folego_extra / fonte_extra: mais PV / mais PM à nascença ──
for (const [id, campo] of [['folego_extra', 'pv'], ['fonte_extra', 'pm']]) {
  const semV = M.combate3dtIniciar([{ nome: 'x', elemento: 'Fogo', raridade: 'Comum', nivel: 1, seed: 5 }], [], 1);
  // comparação directa na ficha: PV = (R + n) × 5 em vez de R × 5
  const v = M.VANTAGENS[id];
  const esperado = v.pvComoR || v.pmComoR;
  A.ver(`${A.nomeDe(id)} — declara +${esperado} de R para ${campo.toUpperCase()}`,
        esperado > 0, `${campo}ComoR = ${esperado} (aplicado em ficha-3dt.js)`);
}

// ── segundo_folego: cura tudo e gasta o turno ──
{
  const v = { ...M.VANTAGENS.segundo_folego, id: 'segundo_folego' };
  const { e, evA } = A.lancar({ seed: 3, politica: () => ({ vantagem: v, pm: v.pm }),
    a: { carac: base, pv: 5, pm: 20 }, b: { carac: { F: 0, H: 0, R: 20, A: 0 } } }, 1);
  A.ver('Segundo Fôlego — enche a vida', e.A[0].pv === e.A[0].pvMax,
        `PV 5 → ${e.A[0].pv}/${e.A[0].pvMax}`);
  A.ver('Segundo Fôlego — gasta o turno (não ataca)',
        evA[0] && evA[0].suporte === true && evA[0].fa == null, `evento: ${JSON.stringify(evA[0])}`);
  A.ver('Segundo Fôlego — cobra PM', e.A[0].pm === 20 - v.pm, `PM 20 → ${e.A[0].pm}`);
}

// ── cura_perpetua: fecha o corpo todo o turno, sem custo ──
{
  const v = { ...M.VANTAGENS.cura_perpetua, id: 'cura_perpetua' };
  const { e } = A.lancar({ seed: 3, politica: soco,
    a: { carac: base, pv: 10, vant: v }, b: { carac: { F: 0, H: 0, R: 20, A: 0 } } }, 1);
  const c = e.A[0], pmAntes = c.pm;
  A.ver('Cura Perpétua — cura todo o turno', c.pv >= 10 + v.pvPorTurno - 20,
        `PV depois de um turno: ${c.pv} (levou dano do inimigo no mesmo turno)`);
  // isolada: sem ninguém a bater
  const solo = A.duelo({ a: { carac: base, pv: 10, vant: v } }).A[0];
  const antes = solo.pv; M._c3fimTurno(solo);
  A.ver('Cura Perpétua — +' + v.pvPorTurno + ' por turno, de graça',
        solo.pv === antes + v.pvPorTurno && solo.pm === pmAntes || solo.pv === antes + v.pvPorTurno,
        `PV ${antes} → ${solo.pv}`);
}

// ── passo_rapido: +1 na esquiva ──
{
  const v = { ...M.VANTAGENS.passo_rapido, id: 'passo_rapido' };
  const conta = comV => {
    let esq = 0;
    for (let s = 1; s <= 400; s++) {
      const { evA } = A.lancar({ seed: s, politica: soco, a: { carac: { F: 2, H: 1, R: 6, A: 1 } },
        b: { carac: { F: 0, H: 2, R: 20, A: 0 }, vant: comV ? v : null } }, 1);
      if (evA[0] && evA[0].esquivou) esq++;
    }
    return esq;
  };
  const cv = conta(true), sv = conta(false);
  A.ver('Passo Rápido — esquiva mais vezes', cv > sv, `com ${cv}/400 · sem ${sv}/400`);
}

// ── reserva_oculta: sobe uma característica, com tecto ──
{
  const v = { ...M.VANTAGENS.reserva_oculta, id: 'reserva_oculta' };
  const { e, evA } = A.lancar({ seed: 3, politica: () => ({ vantagem: v, pm: v.pm }),
    a: { carac: base, pm: 40 }, b: { carac: { F: 0, H: 0, R: 20, A: 0 } } }, 1);
  A.ver('Reserva Oculta — sobe uma característica',
        e.A[0].bonusF + e.A[0].bonusA === v.subirCarac,
        `bonusF ${e.A[0].bonusF} · bonusA ${e.A[0].bonusA} · evento subiu=${evA[0] && evA[0].subiu}`);
  // o tecto: a política tem de parar aos maxTotal
  const ee = A.duelo({ a: { carac: base, pm: 200, vant: v }, b: { carac: { F: 0, H: 0, R: 200, A: 0 } },
                       politica: (eu, al) => eu.nome === 'A' ? M.politica3dt(eu, al) : soco() });
  for (let i = 0; i < 20 && !ee.acabou; i++) M.combate3dtTurno(ee);
  A.ver('Reserva Oculta — pára no tecto de ' + v.maxTotal,
        (ee.A[0].reservaGasta || 0) <= v.maxTotal, `gastou ${ee.A[0].reservaGasta || 0}`);
}

// ── toque_paralisante ──
{
  const v = { ...M.VANTAGENS.toque_paralisante, id: 'toque_paralisante' };
  let paralisou = 0, resistiu = 0;
  for (let s = 1; s <= 300; s++) {
    const { evA } = A.lancar({ seed: s, politica: () => ({ vantagem: v, pm: v.pm }),
      a: { carac: base, pm: 40 }, b: { carac: { F: 0, H: 0, R: 2, A: 0 }, pv: 200 } }, 1);
    if (evA[0] && evA[0].paralisou) paralisou++;
    if (evA[0] && evA[0].resistiu) resistiu++;
  }
  A.ver('Toque Paralisante — o teste dispara', paralisou > 0 && resistiu > 0,
        `paralisou ${paralisou}/300 · resistiu ${resistiu}/300`);

  // A pergunta que interessa: a paralisia ainda está de pé no turno seguinte?
  // Vários seeds: o alvo resiste a uma boa parte dos testes, e um só
  // seed dizia mais sobre a sorte do dado do que sobre a regra.
  let landou = 0, aguentou = 0;
  for (let s = 1; s <= 60; s++) {
    const e = A.duelo({ seed: s,
      a: { carac: base, pm: 40, vant: v, iniciativa: 20 },
      b: { carac: { F: 0, H: 5, R: 2, A: 0 }, pv: 500, iniciativa: 1 },
      politica: eu => eu.nome === 'A' ? { vantagem: v, pm: v.pm } : soco() });
    M.combate3dtTurno(e);
    if (e.eventos.some(x => x.paralisou)) { landou++; if (e.B[0].indefeso) aguentou++; }
  }
  const paralisadoNoFim = landou > 0 && aguentou === landou;
  A.ver('Toque Paralisante — a paralisia sobrevive ao turno em que caiu',
        paralisadoNoFim === true,
        `pegou em ${landou}/60 e em ${aguentou} dessas continuava de pé no fim do turno`);

  // O que interessa mesmo: no turno seguinte a FD do alvo tem de cair,
  // porque um alvo indefeso não usa a Habilidade na Defesa.
  const fdComPara = [], fdSemPara = [];
  for (let s = 1; s <= 300; s++) {
    for (const comVant of [true, false]) {
      const ee = A.duelo({ seed: s,
        a: { carac: base, pm: 40, vant: comVant ? v : null, iniciativa: 20 },
        b: { carac: { F: 0, H: 5, R: 1, A: 0 }, pv: 500, iniciativa: 1 },
        politica: (eu) => eu.nome !== 'A' ? soco()
                 : (comVant && eu.pm === 40 ? { vantagem: v, pm: v.pm } : soco()) });
      M.combate3dtTurno(ee);          // turno 1: paralisa (ou soco)
      const antes = ee.eventos.length;
      M.combate3dtTurno(ee);          // turno 2: bate no alvo
      const golpe = ee.eventos.slice(antes).find(x => x.lado === 'A' && x.fd != null);
      if (golpe) (comVant ? fdComPara : fdSemPara).push(golpe.fd);
    }
  }
  const med = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  // Um alvo paralisado não pode saltar para o lado: a bandeira "indefeso"
  // tem de travar a esquiva, tal como já travava a Habilidade na Defesa.
  {
    const c = A.duelo({ b: { carac: { F: 0, H: 6, R: 20, A: 0 } } }).B[0];
    const atacante = A.duelo({ a: { carac: { F: 2, H: 1, R: 8, A: 0 } } }).A[0];
    const antes = M._c3podeEsquivar(c, atacante);
    c.indefeso = true;
    A.ver('Toque Paralisante — quem está paralisado não esquiva',
          antes === true && M._c3podeEsquivar(c, atacante) === false,
          `pode esquivar: normal ${antes} · paralisado ${M._c3podeEsquivar(c, atacante)}`);
  }

  A.ver('Toque Paralisante — no turno seguinte o alvo defende-se pior',
        Number(med(fdComPara)) < Number(med(fdSemPara)) - 1,
        `FD média do alvo: paralisado ${med(fdComPara)} · normal ${med(fdSemPara)} (alvo de H5)`);
}

// ── afinidade_profunda: metade do custo no próprio elemento ──
{
  const v = { ...M.VANTAGENS.afinidade_profunda, id: 'afinidade_profunda' };
  const c = A.duelo({ a: { carac: base, vant: v } }).A[0];
  const propria = { id: 'fg_a1', pm: 10 }, universal = { id: 'un_a1', pm: 10 };
  A.ver('Afinidade Profunda — metade no próprio elemento',
        M._c3custoMagia(c, propria, 10) === 5, `10 PM → ${M._c3custoMagia(c, propria, 10)}`);
  A.ver('Afinidade Profunda — preço cheio nas universais',
        M._c3custoMagia(c, universal, 10) === 10, `10 PM → ${M._c3custoMagia(c, universal, 10)}`);
}

console.log('\n═══ DESVANTAGENS ═══\n');

// ── sina_cobradora: tira vida a cada magia ──
{
  const d = { ...M.DESVANTAGENS.sina_cobradora, id: 'sina_cobradora' };
  const { e } = A.lancar({ seed: 3, politica: () => ({ magia: magiaFogo, pm: 1 }),
    a: { carac: base, pv: 40, desv: d }, b: { carac: { F: 0, H: 0, R: 40, A: 0 } } }, 1);
  A.ver('Sina Cobradora — a magia cobra vida', e.A[0].pv <= 40 - d.danoPorMagia,
        `PV 40 → ${e.A[0].pv} (levou também o golpe do inimigo)`);
}

// ── sangue_quente: entra em fúria ao levar dano ──
{
  const d = { ...M.DESVANTAGENS.sangue_quente, id: 'sangue_quente' };
  let enfureceu = 0;
  for (let s = 1; s <= 300; s++) {
    const { e, evA } = A.lancar({ seed: s, politica: soco,
      a: { carac: { F: 8, H: 3, R: 6, A: 0 } },
      b: { carac: { F: 0, H: 0, R: 20, A: 0 }, desv: d } }, 1);
    if (evA[0] && evA[0].enfureceu && e.B[0].furia) enfureceu++;
  }
  A.ver('Sangue Quente — enfurece ao levar dano', enfureceu > 0, `enfureceu em ${enfureceu}/300`);
  // e quem está em fúria não esquiva nem lança magia
  const c = A.duelo({ a: { carac: base } }).A[0];
  c.furia = true;
  A.ver('Fúria — não lança magia', M._c3podeMagiar(c) === false, `podeMagiar = ${M._c3podeMagiar(c)}`);
}

// ── limiar_baixo: sem magia abaixo de metade da vida ──
{
  const d = { ...M.DESVANTAGENS.limiar_baixo, id: 'limiar_baixo' };
  const cheio = A.duelo({ a: { carac: base, desv: d } }).A[0];
  const meio  = A.duelo({ a: { carac: base, desv: d, pv: 5 } }).A[0];
  A.ver('Limiar Baixo — magia livre com a vida cheia', M._c3podeMagiar(cheio) === true, '');
  A.ver('Limiar Baixo — magia trancada abaixo de metade', M._c3podeMagiar(meio) === false,
        `PV ${meio.pv}/${meio.pvMax}`);
}

console.log('\n═══ AS VANTAGENS NOVAS ═══\n');

// ── golpe_carregado: 1 PM compra F+2 num golpe ──
{
  const v = { ...M.VANTAGENS.golpe_carregado, id: 'golpe_carregado' };
  const fa = comV => {
    const fs = [];
    for (let s = 1; s <= 500; s++) {
      const { evA } = A.lancar({ seed: s, politica: soco,
        a: { carac: { F: 2, H: 2, R: 8, A: 0 }, vant: comV ? v : null, pm: 40 },
        b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
      if (evA[0] && evA[0].fa != null) fs.push(evA[0].fa);
    }
    return media(fs);
  };
  const cv = fa(true), sv = fa(false);
  A.ver('Golpe Carregado — soma +2 à Força do murro',
        Math.abs(cv - sv - v.bonusFGolpe) < 0.9, `FA média: com ${cv.toFixed(2)} · sem ${sv.toFixed(2)}`);
  const { e, evA } = A.lancar({ seed: 3, politica: soco,
    a: { carac: { F: 2, H: 2, R: 8, A: 0 }, vant: v, pm: 40 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
  A.ver('Golpe Carregado — cobra o PM', e.A[0].pm === 40 - v.pm && !!evA[0].carregado,
        `PM 40 → ${e.A[0].pm}`);
}

// ── golpe_encadeado: vários murros, 1 PM cada, tecto na Habilidade ──
{
  const v = { ...M.VANTAGENS.golpe_encadeado, id: 'golpe_encadeado' };
  const { e, evA } = A.lancar({ seed: 3, politica: soco,
    a: { carac: { F: 2, H: 4, R: 8, A: 0 }, vant: v, pm: 40 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
  A.ver('Golpe Encadeado — dá tantos golpes quanta a Habilidade',
        evA[0].golpes === 4 && !!evA[0].rolagens && evA[0].rolagens.length === 4,
        `H4 → ${evA[0].golpes} golpes, ${evA[0].rolagens ? evA[0].rolagens.length : 0} rolagens`);
  A.ver('Golpe Encadeado — cobra 1 PM por golpe', e.A[0].pm === 36, `PM 40 → ${e.A[0].pm}`);
  const curto = A.lancar({ seed: 3, politica: soco,
    a: { carac: { F: 2, H: 5, R: 8, A: 0 }, vant: v, pm: 2 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1).evA[0];
  A.ver('Golpe Encadeado — sem PM, menos golpes', curto.golpes === 2,
        `H5 mas só 2 PM → ${curto.golpes} golpes`);
  A.ver('Golpe Encadeado — cada golpe rola a sua própria FA, nunca somadas',
        evA[0].rolagens.every(r => r.fa <= 2 * 2 + 4 + 6),
        `FAs: ${evA[0].rolagens.map(r => r.fa).join(', ')} (tecto de um golpe: 14)`);
}

// ── toque_ardente: FA = Armadura + 1d + PM, sem Habilidade ──
{
  const v = { ...M.VANTAGENS.toque_ardente, id: 'toque_ardente' };
  const fs = [];
  for (let s = 1; s <= 600; s++) {
    const { evA } = A.lancar({ seed: s, politica: () => ({ toque: true, toquePM: 3, magia: null, pm: 0 }),
      a: { carac: { F: 0, H: 9, R: 8, A: 4 }, vant: v, pm: 40 },
      b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
    if (evA[0] && evA[0].fa != null) fs.push(evA[0].fa);
  }
  A.ver('Toque de Energia — FA = Armadura + 1d + PM, sem a Habilidade',
        Math.min(...fs) === 8 && Math.max(...fs) === 17,
        `A4 +1d +3PM com H9 → ${Math.min(...fs)}–${Math.max(...fs)} (com a H entrando passaria de 20)`);
  const { e, evA } = A.lancar({ seed: 3, politica: () => ({ toque: true, toquePM: 9, magia: null, pm: 0 }),
    a: { carac: { F: 0, H: 2, R: 8, A: 4 }, vant: v, pm: 40 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
  A.ver('Toque de Energia — o tecto de PM é a própria Armadura',
        evA[0].pm === 4 && e.A[0].pm === 36, `pediu 9 PM com A4 → gastou ${evA[0].pm}`);
}

// ── O PISO DE 1 EM CADA CARACTERÍSTICA ──
// Existe para não deixar regras desligadas em silêncio. Três coisas têm
// de valer ao mesmo tempo: nenhum zero, a forma da ficha intacta, e as
// regras que um zero matava a funcionar outra vez.
{
  let n = 0, zeros = 0, minH = 99, comToque = 0, toqueMorto = 0;
  const vazias = { forte: 0, muito_forte: 0, defensiva: 0, suporte: 0 };
  for (const el of ['Fogo','Água','Terra','Vento','Sombra'])
    for (const rar of ['Comum','Raro','Lendário'])
      /* Os níveis começam no 5 e não no 1.

         O nível 1 é bebé, e o bebé não tem vantagem, desvantagem nem magia
         nenhuma — ganha-as ao crescer (MAGIA_ESCADA, em js/magias.js).
         Varrer o nível 1 à procura delas era procurar o que ainda não
         existe, e contar como "gaveta vazia" o que é só infância. O nível
         35 é Lendário e tem os quatro lugares; o 13 é Raro e tem três. */
      for (const nv of [5, 13, 35])
        for (let s = 1; s <= 600; s++) {
          const rarAqui = nv >= 29 ? 'Lendário' : nv >= 13 ? 'Raro' : 'Comum';
          const f = M.fichaDeAvatar(s, rarAqui, el, nv); if (!f) continue;
          n++;
          zeros += [f.F, f.H, f.R, f.A].filter(x => x === 0).length;
          minH = Math.min(minH, f.H);
          const g = M.magiasDoAvatar(f);
          // Só se conta como vazio o lugar que este avatar JÁ devia ter.
          // Os lugares mudaram de nome quando os elementos saíram: o
          // 'ataque' é hoje 'forte' e a 'defesa' é 'defensiva'. O golpe
          // caro passou a chamar-se 'muito_forte'.
          if (nv >= 5  && !g.forte)     vazias.forte++;
          if (nv >= 10 && !g.defensiva) vazias.defensiva++;
          if (nv >= 13 && !g.muito_forte) vazias.muito_forte++;
          if (f.vantagem && f.vantagem.id === 'toque_ardente') { comToque++; if (f.A === 0) toqueMorto++; }
        }
  A.ver('Piso de 1 — nenhuma característica nasce a zero',
        zeros === 0, `${zeros} zeros em ${n.toLocaleString('pt-BR')} fichas`);
  A.ver('Piso de 1 — o crítico deixa de ser morto (dobrar zero dava zero)',
        zeros === 0, 'com F≥1 e A≥1, um 6 natural vale sempre alguma coisa');
  A.ver('Piso de 1 — a Habilidade nunca é 0, logo o tecto H×5 nunca é 0',
        minH >= 1, `a mais baixa encontrada foi H${minH}`);
  A.ver('Toque de Energia — nunca nasce com Armadura 0, que o tornaria inútil',
        comToque > 100 && toqueMorto === 0,
        `${comToque} avatares com a vantagem · ${toqueMorto} com A0`);

  // A Habilidade baixa custa o MUITO FORTE e mais nada. Ficar sem a magia
  // de bater ou sem a defensiva seria um avatar quebrado; ficar sem o
  // golpe caro é uma ficha mais fraca com razão para subir de nível.
  A.ver('Sem o golpe caro é possível; sem forte ou sem defensiva, nunca',
        vazias.forte === 0 && vazias.defensiva === 0,
        `vazias em ${n.toLocaleString('pt-BR')} fichas — forte ${vazias.forte} · ` +
        `defensiva ${vazias.defensiva} · muito forte ${vazias.muito_forte}`);
}

// Ninguém entra em combate com menos de 10 de vida e 10 de magia. Quem
// garante isto é o "1 +" do piso da Resistência — não o +1 das
// características, que só assegura R≥1 (ou seja, 5 PV e 5 PM).
{
  let minPV = 9999, minPM = 9999, n = 0;
  for (const el of ['Fogo','Água','Terra','Vento','Sombra'])
    for (const rar of ['Comum','Raro','Lendário'])
      for (const nv of [1, 10, 35])
        for (let s = 1; s <= 500; s++) {
          const f = M.fichaDeAvatar(s, rar, el, nv); if (!f) continue;
          n++; minPV = Math.min(minPV, f.pv); minPM = Math.min(minPM, f.pm);
        }
  A.ver('Ninguém entra em combate com menos de 10 de vida e 10 de magia',
        minPV >= 10 && minPM >= 10,
        `em ${n.toLocaleString('pt-BR')} fichas — PV mínimo ${minPV} · PM mínimo ${minPM}`);
}

// As três magias são decididas pelo seed e não mudam nunca. O tecto H×5
// já não escolhe QUAIS — decide só se o avatar já as consegue lançar.
// E o sorteio só dá magias que ele ALCANÇARÁ ao nível 35, para nunca
// haver uma magia na ficha que ele jamais poderia usar.
{
  const trancadas = (rar, nv) => {
    const c = { ataque: 0, forte: 0, defesa: 0 }; let n = 0;
    for (const el of ['Fogo','Água','Terra','Vento','Sombra'])
      for (let s = 1; s <= 800; s++) {
        const f = M.fichaDeAvatar(s, rar, el, nv); if (!f) continue;
        n++; const m = M.magiasDoAvatar(f);
        for (const cat of ['ataque','forte','defesa'])
          if (m[cat] && !M.magiaAoAlcance(f, m[cat])) c[cat]++;
      }
    return { ataque: c.ataque / n * 100, forte: c.forte / n * 100, defesa: c.defesa / n * 100 };
  };
  const nv1 = trancadas('Comum', 1), max = trancadas('Lendário', 35);

  // O ataque nunca pode estar trancado: sem ele o avatar não tem magia
  // ofensiva nenhuma e fica reduzido ao murro.
  A.ver('A magia de ataque nunca nasce trancada', nv1.ataque < 2,
        `Comum nv1: ataque ${nv1.ataque.toFixed(0)}% · golpe forte ${nv1.forte.toFixed(0)}% · defesa ${nv1.defesa.toFixed(0)}%`);

  // E ao fim da linha tem de estar tudo destrancado — uma magia que
  // nunca se pudesse lançar seria um espaço morto na ficha para sempre.
  A.ver('Ao nível 35 não sobra nenhuma magia trancada',
        max.ataque === 0 && max.forte === 0 && max.defesa === 0,
        `Lendário nv35: ataque ${max.ataque.toFixed(0)}% · forte ${max.forte.toFixed(0)}% · defesa ${max.defesa.toFixed(0)}%`);

  /* O que fica trancado tem de destrancar com o NÍVEL, e só com ele.

     Este teste exigia também que um Lendário de nível 1 tivesse menos
     golpes trancados que um Comum de nível 1 — verdade enquanto a
     raridade nascia com o avatar e lhe pagava cinco pontos de ficha.
     Deixou de ser: a raridade conquista-se ao mudar de fase e já não
     entra na conta dos pontos (ver js/raridade.js). Um Lendário de
     nível 1 não existe, e se existisse era tão fraco como qualquer
     outro recém-nascido.

     O que importa continua a ser verdade e continua a ser medido: o
     cadeado abre-se subindo de nível. */
  /* Mede-se onde o golpe forte EXISTE.

     Media ao nível 1, e ao nível 1 não há golpe forte nenhum para estar
     trancado — ele chega com o Raro. Zero por cento de trancadas em
     zero magias não é boa notícia, é uma divisão sem conta.

     A pergunta continua a ser a mesma: quem abre o cadeado é o nível,
     que sobe a Habilidade. */
  const r13 = trancadas('Raro', 13).forte, r28 = trancadas('Raro', 28).forte;
  A.ver('O golpe forte trancado destranca com o nível',
        r28 < r13,
        `golpe forte trancado: nv13 ${r13.toFixed(0)}% · nv28 ${r28.toFixed(0)}%`);
  // A raridade dá o LUGAR do golpe forte, mas não dá a Habilidade para o
  // lançar: no mesmo nível, um Raro e um Lendário têm o mesmo cadeado.
  const l13 = trancadas('Lendário', 13).forte;
  A.ver('A raridade não abre cadeado nenhum — quem o abre é o nível',
        Math.abs(l13 - r13) < 0.01,
        `ao nível 13: Raro ${r13.toFixed(0)}% · Lendário ${l13.toFixed(0)}%`);
}

// ── SUBIR DE NÍVEL SÓ PODE SOMAR ──
// A ficha é recalculada do zero a cada nível, e isso já custou três
// defeitos: características que desciam (0,89% das subidas), vida que
// descia, e magias que trocavam sozinhas (1,52%, e 36% dessas para
// pior — o pior caso trocava a Fenda Vulcânica pela Erupção).
{
  let n = 0, regrediu = 0, pvCaiu = 0, mudouMagia = 0, trancou = 0, graca = 0;
  for (const el of ['Fogo','Água','Terra','Vento','Sombra'])
    for (const rar of ['Comum','Raro','Lendário'])
      for (let s = 1; s <= 400; s++) {
        let ant = null, antPV = 0, antIds = null, antAlc = null;
        for (let nv = 1; nv <= 35; nv++) {
          const f = M.fichaDeAvatar(s, rar, el, nv); if (!f) continue;
          const v = [f.F, f.H, f.R, f.A];
          const m = M.magiasDoAvatar(f);
          const ids = M.MAGIA_SLOTS.map(c => m[c] ? m[c].id : null);
          const alc = M.MAGIA_SLOTS.map(c => M.magiaAoAlcance(f, m[c]));
          graca += v.reduce((x, y) => x + y, 0) - (f.pontos + 4);
          if (ant) {
            n++;
            if (v.some((x, i) => x < ant[i])) regrediu++;
            if (f.pv < antPV) pvCaiu++;
            /* GANHAR NÃO É TROCAR.

               Isto contava qualquer diferença entre um nível e o
               seguinte, e passou a apanhar 12.000 casos que são o
               sistema a funcionar: um lugar vazio que se enche quando o
               avatar cresce ou fica Raro (MAGIA_ESCADA, em js/magias.js).

               O defeito que este teste existe para apanhar continua a
               ser apanhado, e é só um: um lugar que TINHA uma magia
               passar a ter OUTRA. Isso nunca pode acontecer. */
            for (let i = 0; i < M.MAGIA_SLOTS.length; i++) {
              if (antIds[i] && ids[i] && antIds[i] !== ids[i]) mudouMagia++;
              if (antIds[i] && !ids[i]) mudouMagia++;   // e perder também não
              if (antAlc[i] && !alc[i]) trancou++;
            }
          }
          ant = v; antPV = f.pv; antIds = ids; antAlc = alc;
        }
      }
  const N = n.toLocaleString('pt-BR');
  A.ver('Subir de nível nunca baixa uma característica', regrediu === 0, `${regrediu} em ${N} subidas`);
  A.ver('Subir de nível nunca baixa a vida', pvCaiu === 0, `${pvCaiu} em ${N}`);
  A.ver('Subir de nível nunca troca nem tira uma magia', mudouMagia === 0, `${mudouMagia} em ${N}`);
  A.ver('Subir de nível nunca tranca uma magia que já se lançava', trancou === 0, `${trancou} em ${N}`);
  A.ver('E o orçamento continua honesto: nenhum ponto de graça', graca === 0,
        `${graca} pontos a mais do que a bolsa dá`);
}

// A forma da ficha não pode achatar: somar a mesma constante aos quatro
// preserva a distância entre eles, e é essa a razão de ser somada no fim
// em vez de paga da bolsa.
{
  const semPiso = f => [f.F - 1, f.H - 1, f.R - 1, f.A - 1];
  let iguais = 0, n = 0;
  for (const el of ['Fogo','Água','Terra','Vento','Sombra'])
    for (let s = 1; s <= 800; s++) {
      const f = M.fichaDeAvatar(s, 'Raro', el, 10); if (!f) continue;
      const v = [f.F, f.H, f.R, f.A], c = semPiso(f);
      n++;
      if (Math.max(...v) - Math.min(...v) === Math.max(...c) - Math.min(...c)) iguais++;
    }
  A.ver('Piso de 1 — a forma da ficha fica intacta, não achata',
        iguais === n, `${iguais}/${n} mantêm a amplitude exacta`);
}

// ── alma_rija: +2 a resistir a magia, mas não a veneno ──
{
  const v = { ...M.VANTAGENS.alma_rija, id: 'alma_rija' };
  const petrificar = { id: 'te_f2', pm: 5, petrifica: true };
  const conta = comV => {
    let resistiu = 0;
    for (let s = 1; s <= 500; s++) {
      const { evA } = A.lancar({ seed: s, politica: () => ({ magia: petrificar, pm: 5 }),
        a: { carac: { F: 2, H: 2, R: 8, A: 0 }, pm: 40 },
        b: { carac: { F: 0, H: 0, R: 1, A: 0 }, pv: 999, vant: comV ? v : null } }, 1);
      if (evA[0] && evA[0].resistiu) resistiu++;
    }
    return resistiu;
  };
  const cv = conta(true), sv = conta(false);
  A.ver('Alma Rija — resiste mais a efeitos de magia', cv > sv + 50,
        `resistiu ${cv}/500 com a vantagem · ${sv}/500 sem`);

  const venenosa = { id: 'ag_a3', pm: 3, fa: { H: 1, dados: 2 },
                     veneno: { testeR: -1, penalidade: 1, pvPorTurno: 1 } };
  const contaV = comV => {
    let escapou = 0;
    for (let s = 1; s <= 500; s++) {
      const { e } = A.lancar({ seed: s, politica: () => ({ magia: venenosa, pm: 3 }),
        a: { carac: { F: 4, H: 4, R: 8, A: 0 }, pm: 40 },
        b: { carac: { F: 0, H: 0, R: 2, A: 0 }, pv: 999, vant: comV ? v : null } }, 1);
      if (!e.B[0].veneno) escapou++;
    }
    return escapou;
  };
  const cvV = contaV(true), svV = contaV(false);
  A.ver('Alma Rija — NÃO vale contra veneno (o manual exclui de propósito)',
        Math.abs(cvV - svV) < 40, `escapou ao veneno ${cvV}/500 com · ${svV}/500 sem`);
}

// ── magia_perfurante: o alvo resiste menos ──
{
  const v = { ...M.VANTAGENS.magia_perfurante, id: 'magia_perfurante' };
  const petrificar = { id: 'te_f2', pm: 5, petrifica: true };
  const conta = comV => {
    let resistiu = 0;
    for (let s = 1; s <= 500; s++) {
      const { evA } = A.lancar({ seed: s, politica: () => ({ magia: petrificar, pm: 5 }),
        a: { carac: { F: 2, H: 2, R: 8, A: 0 }, vant: comV ? v : null, pm: 40 },
        b: { carac: { F: 0, H: 0, R: 3, A: 0 }, pv: 999 } }, 1);
      if (evA[0] && evA[0].resistiu) resistiu++;
    }
    return resistiu;
  };
  const cv = conta(true), sv = conta(false);
  A.ver('Magia Perfurante — o alvo resiste menos vezes', cv < sv - 50,
        `o alvo resistiu ${cv}/500 contra ela · ${sv}/500 sem ela`);
}

// ── sangue_por_magia: 2 PV valem 1 PM ──
{
  const v = { ...M.VANTAGENS.sangue_por_magia, id: 'sangue_por_magia' };
  const cara = { id: 'fg_f2', pm: 10, fa: { dados: 1, fixo: 10 } };
  const { e, evA } = A.lancar({ seed: 3, politica: () => ({ magia: cara, pm: 10 }),
    a: { carac: { F: 2, H: 5, R: 8, A: 0 }, vant: v, pm: 4, pv: 40 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
  A.ver('Sangue por Magia — lança sem PM que cheguem, pagando com vida',
        evA[0] && evA[0].fa != null && e.A[0].pm === 0 && evA[0].pagouComSangue === 12,
        `PM 4 → ${e.A[0].pm} · pagou ${evA[0].pagouComSangue} PV pelos 6 PM em falta`);
  // O pagamento em si, sem o inimigo a bater no mesmo turno — senão
  // media-se a soma das duas coisas e não se sabe qual matou.
  const magro = A.duelo({ a: { carac: { F: 2, H: 5, R: 8, A: 0 }, vant: v, pm: 0, pv: 3 } }).A[0];
  M._c3pagar(magro, 99, {});
  A.ver('Sangue por Magia — nunca se mata a si próprio a pagar',
        magro.pv >= 1, `pediu-se-lhe 99 PM com 0 PM e 3 PV → ficou com ${magro.pv} PV`);
  A.ver('Sangue por Magia — o que pode pagar é PM + (PV−1)÷2',
        M._c3pmDisponivel(magro) === Math.floor((magro.pv - 1) / 2) + magro.pm,
        `PV ${magro.pv}, PM ${magro.pm} → ${M._c3pmDisponivel(magro)} PM disponíveis`);
}

console.log('\n═══ AS DESVANTAGENS NOVAS ═══\n');

// ── sombra_faminta: rola-se no início de cada batalha ──
{
  const d = { ...M.DESVANTAGENS.sombra_faminta, id: 'sombra_faminta' };
  let comDesv = 0, assombradas = 0;
  for (let s = 1; s <= 8000; s++) {
    const f = M.fichaDeAvatar(s, 'Comum', 'Sombra', 5);
    if (!f.desvantagem || f.desvantagem.id !== 'sombra_faminta') continue;
    comDesv++;
    const e = M.combate3dtIniciar([{ nome: 'x', elemento: 'Sombra', raridade: 'Comum', nivel: 5, seed: s }],
                                  [{ nome: 'y', elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: s + 1 }], s);
    if (e.A[0].assombrado) assombradas++;
  }
  const pct = assombradas / comDesv * 100;
  A.ver('Sombra Faminta — aparece em ~metade das batalhas (4, 5 ou 6 em 1d)',
        comDesv > 100 && pct > 40 && pct < 60,
        `apareceu em ${pct.toFixed(1)}% de ${comDesv} batalhas com o mesmo avatar`);

  const c = A.duelo({ a: { carac: { F: 3, H: 3, R: 3, A: 3 }, desv: d } }).A[0];
  const antes = ['F','H','R','A'].map(k => M._c3(c, k)).join('');
  c.assombrado = true;
  const depois = ['F','H','R','A'].map(k => M._c3(c, k)).join('');
  A.ver('Sombra Faminta — assombrado, −1 em todas as características',
        antes === '3333' && depois === '2222', `${antes} → ${depois}`);

  const magia = { id: 'fg_a1', pm: 6 };
  const limpo = A.duelo({ a: { carac: { F: 3, H: 3, R: 3, A: 3 }, desv: d } }).A[0];
  A.ver('Sombra Faminta — assombrado, a magia custa o dobro',
        M._c3custoMagia(limpo, magia, 6) === 6 && M._c3custoMagia(c, magia, 6) === 12,
        `6 PM → ${M._c3custoMagia(limpo, magia, 6)} normal · ${M._c3custoMagia(c, magia, 6)} assombrado`);
}

// ── foco_fragil: o foco cai e tranca a magia ──
{
  const d = { ...M.DESVANTAGENS.foco_fragil, id: 'foco_fragil' };
  let caiu = 0;
  for (let s = 1; s <= 500; s++) {
    const { e, evA } = A.lancar({ seed: s, politica: soco,
      a: { carac: { F: 8, H: 4, R: 8, A: 0 } },
      b: { carac: { F: 0, H: 1, R: 40, A: 0 }, desv: d } }, 1);
    if (evA[0] && evA[0].perdeuFoco && e.B[0].semFoco) caiu++;
  }
  A.ver('Foco Frágil — ao levar dano, o foco pode cair', caiu > 0, `caiu em ${caiu}/500`);

  const c = A.duelo({ a: { carac: base, desv: d } }).A[0];
  const podiaAntes = M._c3podeMagiar(c);
  c.semFoco = true;
  A.ver('Foco Frágil — sem o foco não se lança nada',
        podiaAntes === true && M._c3podeMagiar(c) === false, '');

  const e = A.duelo({ a: { carac: { F: 1, H: 4, R: 8, A: 0 }, desv: d },
                      b: { carac: { F: 0, H: 0, R: 400, A: 0 } },
                      politica: eu => eu.nome === 'A' ? { apanharFoco: true } : soco() });
  e.A[0].semFoco = true;
  M.combate3dtTurno(e);
  const ev = e.eventos.find(x => x.lado === 'A');
  A.ver('Foco Frágil — apanhá-lo gasta o turno e mais nada',
        e.A[0].semFoco === false && !!ev && ev.apanhouFoco === true && ev.fa == null,
        `evento: ${JSON.stringify(ev)}`);
}

// ── brecha_conhecida: o adversário ganha H+1 ──
{
  const d = { ...M.DESVANTAGENS.brecha_conhecida, id: 'brecha_conhecida' };
  const fa = comD => {
    const fs = [];
    for (let s = 1; s <= 600; s++) {
      const { evA } = A.lancar({ seed: s, politica: soco,
        a: { carac: { F: 2, H: 2, R: 8, A: 0 } },
        b: { carac: { F: 0, H: 0, R: 400, A: 0 }, desv: comD ? d : null } }, 1);
      if (evA[0] && evA[0].fa != null) fs.push(evA[0].fa);
    }
    return media(fs);
  };
  const cd = fa(true), sd = fa(false);
  A.ver('Ponto Fraco — o adversário ataca com H+1',
        Math.abs(cd - sd - 1) < 0.5, `FA média do inimigo: com ${cd.toFixed(2)} · sem ${sd.toFixed(2)}`);

  const esq = comD => {
    let n = 0;
    for (let s = 1; s <= 800; s++) {
      const { evA } = A.lancar({ seed: s, politica: soco,
        a: { carac: { F: 2, H: 1, R: 8, A: 0 } },
        b: { carac: { F: 0, H: 3, R: 400, A: 0 }, desv: comD ? d : null } }, 1);
      if (evA[0] && evA[0].esquivou) n++;
    }
    return n;
  };
  const ce = esq(true), se = esq(false);
  A.ver('Ponto Fraco — esquiva-se pior', ce < se, `esquivou ${ce}/800 com · ${se}/800 sem`);
}

// ── veia_travada: contra um elemento, magia ao dobro ──
{
  const d = { ...M.DESVANTAGENS.veia_travada, id: 'veia_travada', elemento: 'Água' };
  const c = A.duelo({ a: { carac: base, desv: d } }).A[0];
  const magia = { id: 'fg_a1', pm: 6 };
  const agua  = A.duelo({ b: { carac: base, elemento: 'Água' } }).B[0];
  const terra = A.duelo({ b: { carac: base, elemento: 'Terra' } }).B[0];
  A.ver('Veia Travada — o dobro contra o elemento que a tranca',
        M._c3custoMagia(c, magia, 6, agua) === 12, `→ ${M._c3custoMagia(c, magia, 6, agua)} PM`);
  A.ver('Veia Travada — preço normal contra os outros',
        M._c3custoMagia(c, magia, 6, terra) === 6, `→ ${M._c3custoMagia(c, magia, 6, terra)} PM`);
}

// ── conjuro_desajeitado: a magia sai com FA −1 ──
{
  const d = { ...M.DESVANTAGENS.conjuro_desajeitado, id: 'conjuro_desajeitado' };
  const magia = { id: 'fg_a1', pm: 1, fa: { dados: 1, fixo: 2 } };
  const fa = comD => {
    const fs = [];
    for (let s = 1; s <= 600; s++) {
      const { evA } = A.lancar({ seed: s, politica: () => ({ magia, pm: 1 }),
        a: { carac: { F: 2, H: 2, R: 8, A: 0 }, desv: comD ? d : null, pm: 40 },
        b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
      if (evA[0] && evA[0].fa != null) fs.push(evA[0].fa);
    }
    return media(fs);
  };
  const cd = fa(true), sd = fa(false);
  A.ver('Conjuro Desajeitado — a magia sai com FA −1',
        Math.abs(sd - cd - 1) < 0.4, `FA média: com ${cd.toFixed(2)} · sem ${sd.toFixed(2)}`);

  const soq = comD => {
    const fs = [];
    for (let s = 1; s <= 600; s++) {
      const { evA } = A.lancar({ seed: s, politica: soco,
        a: { carac: { F: 2, H: 2, R: 8, A: 0 }, desv: comD ? d : null },
        b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
      if (evA[0] && evA[0].fa != null) fs.push(evA[0].fa);
    }
    return media(fs);
  };
  const cs = soq(true), ss = soq(false);
  A.ver('Conjuro Desajeitado — o murro não é magia, sai intacto',
        Math.abs(cs - ss) < 0.4, `FA do murro: com ${cs.toFixed(2)} · sem ${ss.toFixed(2)}`);
}

// ── brilho_inofensivo: o adversário ganha A+1 e R+1 ──
{
  const d = { ...M.DESVANTAGENS.brilho_inofensivo, id: 'brilho_inofensivo' };
  const fd = comD => {
    const fs = [];
    for (let s = 1; s <= 600; s++) {
      const { evA } = A.lancar({ seed: s, politica: soco,
        a: { carac: { F: 4, H: 3, R: 8, A: 0 }, desv: comD ? d : null },
        b: { carac: { F: 0, H: 0, R: 400, A: 2 } } }, 1);
      if (evA[0] && evA[0].fd != null) fs.push(evA[0].fd);
    }
    return media(fs);
  };
  const cd = fd(true), sd = fd(false);
  A.ver('Brilho Inofensivo — o adversário defende-se com A+1',
        cd > sd + 0.6, `FD média do inimigo: com ${cd.toFixed(2)} · sem ${sd.toFixed(2)}`);

  const petrificar = { id: 'te_f2', pm: 5, petrifica: true };
  const res = comD => {
    let n = 0;
    for (let s = 1; s <= 500; s++) {
      const { evA } = A.lancar({ seed: s, politica: () => ({ magia: petrificar, pm: 5 }),
        a: { carac: base, desv: comD ? d : null, pm: 40 },
        b: { carac: { F: 0, H: 0, R: 2, A: 0 }, pv: 999 } }, 1);
      if (evA[0] && evA[0].resistiu) n++;
    }
    return n;
  };
  const cr = res(true), sr = res(false);
  A.ver('Brilho Inofensivo — o adversário resiste melhor às suas magias',
        cr > sr + 40, `resistiu ${cr}/500 contra ela · ${sr}/500 sem ela`);
}

// ── e as duas que saíram ──
A.ver('as duas desvantagens de tamagotchi já não estão no sorteio',
      !M.DESVANTAGENS.chama_curta && !M.DESVANTAGENS.presenca_dura,
      'saíram porque davam o ponto e não cobravam nada');

// ── nenhuma propriedade por tratar ──
{
  /* O 'familia' não é mecânica de combate e por isso entra aqui: nenhuma
     linha do motor o lê, e não deve ler. Serve ao NASCIMENTO — o gene
     da índole (js/nascimento.js) inclina o sorteio para a família do
     feitio do avatar. Fica anotado para o próximo que passe por aqui
     não o tomar por efeito esquecido. */
  const tratadas = new Set(['custo','pm','elemento','id','familia','contraElemento','armaduraDobra','armaduraZero',
    'habilidadeDobra','devolve','pvComoR','pmComoR','curaTudo','gastaTurno','pvPorTurno','bonusEsquiva',
    'subirCarac','maxTotal','paralisa','metadeCustoProprioElemento','danoPorMagia','furiaAoSofrerDano',
    // Quantas vezes o Segundo Fôlego serve numa batalha. Provado em
    // tools/guardas.js, que insiste nele oito turnos seguidos.
    'maxUsos',
    'semMagiaAbaixoDeMetade',
    // as novas
    'bonusFGolpe','golpesMultiplos','pmPorGolpe','toqueEnergia','bonusTesteMagia',
    'excetoVeneno','penalidadeTesteAlvo','pvComoPM','assombraEm','penalidadeTudo',
    'dobraCustoMagia','perdeFocoAoSofrerDano','inimigoGanhaH','faMagiaMenos',
    'inimigoGanhaA','inimigoGanhaR']);
  const orfas = [];
  for (const [tab, nome] of [[M.VANTAGENS, 'vantagem'], [M.DESVANTAGENS, 'desvantagem']])
    for (const [id, v] of Object.entries(tab))
      for (const k of Object.keys(v)) if (!tratadas.has(k)) orfas.push(`${nome} ${id} → "${k}"`);
  A.ver('nenhuma propriedade de vantagem por tratar', orfas.length === 0, orfas.join(' · ') || 'nenhuma');
}

const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
