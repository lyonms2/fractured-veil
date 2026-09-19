// ═══════════════════════════════════════════════════════════════════
// A IA DOS INIMIGOS
//
// Decide, na vez de um lado, QUEM age e O QUE faz. Não toca no estado
// da batalha e não sorteia nada: conta as chances face a face, com as
// mesmas regras do motor (js/combate-fu.js), e devolve a ação para a
// arena jogar. A batalha continua repetível com a IA no meio.
//
// ── QUATRO NÍVEIS, UM POR DIFICULDADE ──
//
//   Fácil     a de sempre: age o primeiro da fila, cura quem está em
//             crise, lança a magia mais cara que consegue pagar, e
//             senão bate
//   Médio     compara todas as ações de todos que podem agir e fica com
//             a que mais rende: olha vulnerável, resistente, imune e
//             absorve, a guarda e a Misericórdia de cada alvo, e cura
//             quem precisa. E guarda quando vale a pena — para cortar o
//             dano ou recuperar PM (desde 19/09/2026: sem isso gastava o
//             PM todo na primeira rodada e a luta virava troca de socos)
//   Difícil   mais as magias de cena (Concha, Barreira, Misericórdia,
//             Despertar), a guarda — que corta o dano e recupera PM pelo
//             dado de VON —, e passa a economizar PM
//   Mestre    mais a troca de posto, e caça com mais vontade quem está
//             para cair
//
// ── E QUANDO AS MAGIAS MUDAREM ──
//
// A IA não conhece magia nenhuma pelo nome. Lê as propriedades da casa
// (pm, alvos, porAlvo, fixo, danoFixo, todos, aliado, proprio, cura,
// cena, estado, estadoSempre, ignoraResistencias, corpoACorpo) e mede
// cada uma pelo que ela faz nos números:
//
//   ferir    quanto de vida se espera tirar, e a chance de derrubar
//   curar    quanto de vida volta, e o quanto cai o risco de derrubada
//   cena     aplica o efeito numa CÓPIA do alvo e mede o quanto cai o
//            perigo que ele corre, e o quanto sobe o dano que ele faz
//
// Mudar números, custos e alvos não pede nada aqui. Um efeito de cena
// NOVO também é medido sozinho, desde que o motor o leia pelos caminhos
// de sempre (dado, Defesa, afinidade, dano). O que precisa ser ensinado
// aqui é uma mecânica que o motor ainda não tem.
// ═══════════════════════════════════════════════════════════════════

const FU_IA_NIVEIS = [
  // 0 · Fácil
  { legado: true },
  // 1 · Médio
  { abate: 1.0, poupaPM: 0,   cena: false, guarda: true,  mover: false },
  // 2 · Difícil
  { abate: 1.0, poupaPM: 0.3, cena: true,  guarda: true,  mover: false },
  // 3 · Mestre
  { abate: 1.6, poupaPM: 0.3, cena: true,  guarda: true,  mover: true  },
];

const IA_ABATE     = 20;   // o que vale derrubar alguém, em pontos de vida
const IA_ESTADO    = 6;    // o que vale um estado novo no alvo
const IA_DURACAO   = 2;    // quantas rodadas se conta que um efeito de cena vale
const IA_GUARDA    = 0.6;  // a guarda só vence um ataque que renda bem pouco
const IA_MOVER_MIN = 5;    // trocar de posto só compensa acima disto
const IA_CURA      = 0.6;  // cada ponto de vida curado, antes do risco
const IA_PM        = 0.5;  // cada PM recuperado, quando falta PM para alguma magia
const IA_PM_SOBRA  = 0.1;  // cada PM recuperado, quando já dá para todas
const IA_REPRESALIA = 0.8; // cada ponto de dano que a Represália do Guarda deve devolver

// ═══════════════════════════════════════════════════════════════════
// FÁCIL — A IA DE SEMPRE
//
// Veio do js/arena-fu.js sem mudar uma vírgula de comportamento: a
// dificuldade mais baixa continua a ser o combate que já se jogava.
// ═══════════════════════════════════════════════════════════════════
function _iaLegado(estado, lado, podem) {
  const quem = fuPorId(estado, podem[0]);
  if (!quem) return null;
  const meus  = estado[lado].filter(c => c.vivo);
  const deles = estado[lado === 'A' ? 'B' : 'A'].filter(c => c.vivo);
  const magias = fuMagiasDe(quem.ficha);
  const paga = (m, n) => fuCusto(m, n) <= quem.pm;

  // 1 · curar quem está em crise
  const ferido = meus.filter(fuEmCrise).sort((a, b) => a.pv - b.pv)[0];
  if (ferido) {
    const sup = magias.suporte;
    if (sup && paga(sup, 1)) {
      const acao = sup.proprio
        ? (ferido === quem ? { tipo: 'magia', magia: sup } : null)
        : { tipo: 'magia', magia: sup, alvos: [ferido.id] };
      if (acao) return { quem: quem.id, acao };
    }
  }

  // 2 · a mais cara que consiga pagar
  for (const l of ['muito_forte', 'forte']) {
    const m = magias[l];
    if (!m) continue;
    const n = m.porAlvo ? Math.min(m.alvos || 1, deles.length) : 1;
    if (!paga(m, n)) continue;
    return { quem: quem.id,
             acao: { tipo: 'magia', magia: m, alvos: deles.slice(0, n).map(c => c.id) } };
  }

  // 3 · o murro
  return { quem: quem.id, acao: { tipo: 'atacar' } };
}

// ═══════════════════════════════════════════════════════════════════
// AS CONTAS
// ═══════════════════════════════════════════════════════════════════
function _iaOutroLado(estado, c) {
  return estado[c.lado === 'A' ? 'B' : 'A'].filter(x => x.vivo);
}

// Cai se a perda leva a vida a zero e não há Misericórdia para segurar.
function _iaCai(alvo, perda) {
  return perda >= alvo.pv && !(alvo.efeitos && alvo.efeitos.misericordia);
}

/* O que um dano bruto vira no alvo, pela mesma ordem do fuAplicarDano.
   Nunca passa da vida que ele tem: tirar 40 de quem tem 10 vale 10. A
   absorção devolve um número NEGATIVO — é vida que se dá ao inimigo. */
function _iaPerda(alvo, bruto, af, semRS) {
  const b = Math.max(0, bruto | 0);
  if (af === 'IM') return 0;
  if (af === 'AB') return -Math.min(b, alvo.ficha.pvMax - alvo.pv);
  let p = af === 'RS' ? (semRS ? b : Math.floor(b / 2))
        : af === 'VU' ? b * 2 : b;
  // A Resiliência da Sustentação, como no fuAplicarDano.
  if (alvo.ficha.feitio === 'sustentacao')
    p = Math.min(p, Math.floor(alvo.ficha.pvMax * FU_RESILIENCIA[fuGrauDe(alvo)]));
  return Math.min(p, alvo.pv);
}

/* ── UM GOLPE, CONTADO FACE A FACE ──

   São no máximo 144 combinações (d12 com d12), e todas entram: nada é
   sorteado. As regras são as do fuAtacar e do fuRolagem — crítico é
   IGUAL e de 6 para cima e acerta sempre, pifão é duplo 1 e falha
   sempre, o dano é o maior dado mais o fixo e o dano extra, e a guarda
   corta pela metade o que não é absorvido.

   `o` tem a forma que o fuAgir passa ao fuAtacar. */
function _iaGolpe(quem, alvo, o) {
  const dq  = fuDonsDe(quem);
  const mag = !!o.magico;
  const f1  = fuDado(quem, mag ? 'PER' : 'DES');
  const f2  = fuDado(quem, mag ? 'VON' : 'VIG');
  const mod = (quem.ficha.bonusPrecisao | 0) + ((mag ? dq.magiaMais : dq.precisaoMais) | 0);
  const dl  = (mag || dq.golpeNaDefMag) ? fuDefesaMag(alvo) : fuDefesa(alvo);
  // O golpe comum é físico, como no fuAtacar; só a magia leva o elemento.
  const tipo = o.tipo || (mag ? quem.ficha.tipo : 'fisico');
  const semRS = !!o.ignoraResistencias || (!!o.semRSnaGuarda && alvo.guardando);
  const af = fuAfinidadeDe(alvo, tipo);
  // A Lâmina fura a guarda, e a guarda não se soma à resistência (fuDanoComGuarda).
  const guarda = alvo.guardando && af !== 'AB' && !o.furaGuarda && !(af === 'RS' && !semRS);
  // A Execução do Lâmina e o Golpe Pesado de cada lado, como no fuAtacar.
  const exec = (quem.ficha.feitio === 'lamina' && fuEmCrise(alvo)) ? FU_EXECUCAO[fuGrauDe(quem)] : 0;
  const extra = (o.fixo | 0) + (quem.ficha.danoExtra | 0)
              + (mag ? (dq.danoMaisMagia | 0) : (dq.danoMaisGolpe | 0)) + exec;

  let acertos = 0, criticos = 0, dano = 0, abates = 0;
  for (let a = 1; a <= f1; a++) {
    for (let b = 1; b <= f2; b++) {
      const critico = a === b && a >= 6;
      const pifao = a === 1 && b === 1;
      if (!(critico || (!pifao && a + b + mod >= dl))) continue;
      acertos++;
      if (critico) criticos++;
      let bruto = Math.max(a, b) + extra;
      if (guarda) bruto = Math.floor(bruto / 2);
      const perda = _iaPerda(alvo, bruto, af, semRS);
      dano += perda;
      if (_iaCai(alvo, perda)) abates++;
    }
  }
  const casos = f1 * f2;
  return { pAcerto: acertos / casos, pCritico: criticos / casos,
           dano: dano / casos, pAbate: abates / casos };
}

/* As formas de ferir de um lutador: o golpe comum e as magias que
   apontam para o outro lado, cada uma já com a mira que o fuAgir usa
   ('mao' para o corpo a corpo, verdadeiro para alvo único, falso para a
   que varre a linha). */
function _iaAtaquesDe(q) {
  const lista = [{ magia: null, mira: 'mao', o: { fixo: 5 }, custo: 0 }];
  const mg = fuMagiasDe(q.ficha);
  for (const l of Object.keys(mg)) {
    const m = mg[l];
    if (l === 'comum' || m.proprio || m.aliado || m.cura) continue;
    if (m.todos) { lista.push({ magia: m, todos: true, custo: m.pm | 0 }); continue; }
    lista.push({
      magia: m,
      // O muito forte alcança qualquer inimigo, como no fuAgir.
      mira: m.corpoACorpo ? 'mao' : (l === 'muito_forte' ? false : ((m.alvos || 1) === 1)),
      o: { magico: true, fixo: m.fixo, tipo: m.tipo || q.ficha.tipo,
           estado: m.estado, estadoSempre: m.estadoSempre,
           ignoraResistencias: m.ignoraResistencias,
           furaGuarda: (m.estilo || {}).furaGuarda,
           semRSnaGuarda: (m.estilo || {}).semRSnaGuarda },
      custo: m.pm | 0,
    });
  }
  return lista;
}

// O que uma forma de ferir faz num alvo: dano esperado, chance de
// derrubar e chance de deixar um estado novo.
function _iaEfeito(q, alvo, at) {
  if (at.todos) {
    const m = at.magia;
    const af = fuAfinidadeDe(alvo, m.tipo || q.ficha.tipo);
    let bruto = (m.danoFixo | 0)
              + ((q.ficha.feitio === 'lamina' && fuEmCrise(alvo)) ? FU_EXECUCAO[fuGrauDe(q)] : 0);
    // A guarda não se soma à resistência.
    if (alvo.guardando && af !== 'AB' && af !== 'RS') bruto = Math.floor(bruto / 2);
    const dano = _iaPerda(alvo, bruto, af, false);
    return { dano, pAbate: _iaCai(alvo, dano) ? 1 : 0, pEstado: 0 };
  }
  const g = _iaGolpe(q, alvo, at.o);
  const e = at.o.estado;
  const pega = e && !alvo.estados[e] && fuDonsDe(alvo).imunes.indexOf(e) === -1;
  // O Toque Pútrido envenena no crítico.
  const podre = (fuDonsDe(q).putrido && !alvo.estados.envenenado
                 && fuDonsDe(alvo).imunes.indexOf('envenenado') === -1) ? g.pCritico : 0;
  return { dano: g.dano, pAbate: g.pAbate,
           pEstado: (pega ? (at.o.estadoSempre ? g.pAcerto : g.pCritico) : 0) + podre };
}

// Se esta forma de ferir chega a este alvo, com a regra da frente.
function _iaAlcanca(equipa, alvo, at) {
  if (at.todos) return true;
  // A Muralha: a Barragem contra um Guarda guardando na frente acerta só ele.
  if (at.magia && (at.magia.alvos || 1) > 1) {
    const frente = fuFrente(equipa);
    if (frente && frente.guardando && fuDonsDe(frente).muralha) return alvo === frente;
  }
  // O Proteger: um aliado protegido não se alcança — o golpe cai no Guarda.
  if (equipa.some(c => c.vivo && c !== alvo && c.protegendo === alvo.id)) return false;
  return fuAlvosPossiveis(equipa, at.mira).indexOf(alvo) !== -1;
}

/* ── O PERIGO QUE UM LUTADOR CORRE ──

   Para cada inimigo vivo, o pior que ele pode fazer a este lutador na
   próxima vez — só com o que alcança e com o PM que tem. Somado.

   `naEquipa` é o objeto que está dentro de `equipa` (é por ele que se
   pergunta quem está na frente); `sob` é a versão dele que se quer
   medir — uma cópia com a Barreira de pé, com a guarda, com mais vida.
   Separados porque a cópia não está na equipa. */
function _iaRisco(estado, naEquipa, sob, equipa) {
  sob = sob || naEquipa;
  equipa = equipa || estado[naEquipa.lado];
  let total = 0;
  for (const e of _iaOutroLado(estado, naEquipa)) {
    let pior = 0;
    for (const at of _iaAtaquesDe(e)) {
      if (at.custo > e.pm || !_iaAlcanca(equipa, naEquipa, at)) continue;
      const ef = _iaEfeito(e, sob, at);
      pior = Math.max(pior, ef.dano + ef.pAbate * IA_ABATE);
    }
    total += pior;
  }
  return total;
}

// O maior dano que um lutador consegue fazer agora, em quem alcança.
function _iaForca(estado, sob) {
  const alvos = _iaOutroLado(estado, sob);
  if (!alvos.length) return 0;
  const equipa = estado[alvos[0].lado];
  let melhor = 0;
  for (const at of _iaAtaquesDe(sob)) {
    if (at.custo > sob.pm) continue;
    for (const t of alvos) {
      if (_iaAlcanca(equipa, t, at)) melhor = Math.max(melhor, _iaEfeito(sob, t, at).dano);
    }
  }
  return melhor;
}

/* Uma cópia do alvo com a cena de pé. A escolha do atributo que o
   Despertar sobe é a mesma do fuPorDePe: o maior da ficha. */
function _iaComCena(alvo, cena, estado) {
  const c = Object.assign({}, alvo, { efeitos: Object.assign({}, alvo.efeitos) });
  for (const k of Object.keys(cena)) {
    if (k === 'subirDado') {
      c.efeitos.subirDado = ['DES', 'PER', 'VIG', 'VON']
        .reduce((m, a) => (alvo.ficha[a] > alvo.ficha[m] ? a : m), 'DES');
    } else if (k === 'resisteInimigos') {
      // A Concha, como no fuPorDePe: os elementos dos inimigos de pé.
      const tipos = {};
      for (const x of (estado ? _iaOutroLado(estado, alvo) : [])) tipos[x.ficha.tipo] = true;
      c.efeitos.resisteTipos = tipos;
    } else {
      c.efeitos[k] = cena[k];
    }
  }
  return c;
}

/* O PM que a guarda devolve (o dado de VON de agora, até o máximo), e o
   que ele vale. Vale muito quando falta PM para alguma magia que o
   lutador tem, e quase nada quando já dá para todas — senão a IA ficaria
   guardando só para encher uma barra que não vai usar. */
function _iaValorPmDaGuarda(quem) {
  const volta = Math.max(0, Math.min(quem.ficha.pmMax - quem.pm, fuDado(quem, 'VON')));
  if (!volta) return 0;
  const mg = fuMagiasDe(quem.ficha);
  const falta = Object.keys(mg).some(l => fuCusto(mg[l], 1) > quem.pm);
  return volta * (falta ? IA_PM : IA_PM_SOBRA);
}

/* ── O QUE A REPRESÁLIA RENDE ──
   Sem isto a IA não via razão para um Guarda guardar além do dano evitado
   e do PM, e guardava 4% das vezes: a Represália quase nunca disparava.

   Conta, para cada inimigo que alcança o Guarda, a chance de acertar do
   golpe que ele tem de melhor contra ele — é o número de golpes que devem
   cair nele até o próximo turno — e multiplica pelo dano que cada um
   devolve (FU_REPRESALIA, pelo degrau). A Devastação fica de fora, porque
   não dispara a Represália. Só vale para quem é Guarda. */
function _iaValorRepresalia(estado, c) {
  if (!c || !c.ficha || c.ficha.feitio !== 'guarda') return 0;
  const equipa = estado[c.lado];
  let golpes = 0;
  for (const e of _iaOutroLado(estado, c)) {
    let p = 0;
    for (const at of _iaAtaquesDe(e)) {
      if (at.todos || at.custo > e.pm || !_iaAlcanca(equipa, c, at)) continue;
      p = Math.max(p, _iaGolpe(e, c, at.o).pAcerto);
    }
    golpes += p;
  }
  return golpes * FU_REPRESALIA[fuGrauDe(c)] * IA_REPRESALIA;
}

/* O que o jeito do feitio acrescenta ao ataque forte (FU_ESTILO_FORTE):
   a guarda que o Guarda ganha, a cura e a limpeza da Sustentação. O furar
   da Lâmina já entra no dano esperado, pelo _iaGolpe. */
function _iaValorEstilo(estado, quem, at, alvosIds) {
  const es = at.magia && at.magia.estilo;
  if (!es) return 0;
  let v = 0;
  const aliados = estado[quem.lado].filter(c => c.vivo);
  if (es.guardaAoAtacar) {
    // Os mesmos protegidos do fuEstiloDoForte, e o perigo que cai em cada um.
    let protegidos = [quem];
    if (es.guardaAoAtacar === 'equipa') {
      protegidos = aliados;
    } else if (es.guardaAoAtacar === 'proprio_e_ferido') {
      const outro = aliados.filter(c => c !== quem && c.pv < c.ficha.pvMax)
        .sort((a, b) => a.pv / a.ficha.pvMax - b.pv / b.ficha.pvMax)[0];
      if (outro) protegidos.push(outro);
    }
    for (const c of protegidos) {
      if (c.guardando) continue;
      const g = Object.assign({}, c, { guardando: true });
      // o dano evitado, e a Represália de quem é Guarda
      v += (_iaRisco(estado, c) - _iaRisco(estado, c, g)) * IA_GUARDA
         + _iaValorRepresalia(estado, c);
    }
  }
  if (es.curaPorDano) {
    const dano = (alvosIds || []).reduce((s, id) => {
      const t = fuPorId(estado, id);
      return s + (t ? Math.max(0, _iaEfeito(quem, t, at).dano) : 0);
    }, 0);
    const faltas = aliados.map(c => c.ficha.pvMax - c.pv);
    const cabe = es.curaDividida ? faltas.reduce((s, x) => s + x, 0) : Math.max(0, ...faltas);
    v += Math.min(dano * es.curaPorDano, cabe) * IA_CURA;
    if (es.limpaEstado && aliados.some(c => Object.keys(c.estados || {}).length)) v += IA_ESTADO;
    // O PM roubado de cada alvo, como no fuEstiloDoForte.
    if (es.roubaPM) {
      for (const id of (alvosIds || [])) {
        const t = fuPorId(estado, id);
        if (t) v += Math.min(t.pm, es.roubaPM) * IA_PM;
      }
    }
  }
  return v;
}

// O que uma magia de apoio (cura, cena) rende num aliado.
function _iaValorApoio(estado, m, alvo, quem) {
  let v = 0;
  // O Proteger vale o perigo que sai do aliado, menos metade do que cai no Guarda.
  if (m.proteger) {
    if (!quem || alvo === quem) return 0;
    return Math.max(0, _iaRisco(estado, alvo) - _iaRisco(estado, quem) * 0.5) * IA_GUARDA;
  }
  // A limpeza vale um estado a menos no aliado (fuLimpar).
  if (m.limpa && Object.keys(alvo.estados || {}).length) v += IA_ESTADO;
  if (m.cura) {
    // Cuidar da frente, como no fuCurar.
    const mult = (quem && quem.ficha.feitio === 'sustentacao'
                  && fuFrente(estado[alvo.lado]) === alvo) ? FU_CUIDAR_FRENTE : 1;
    const volta = Math.min(Math.floor((m.cura | 0) * mult), alvo.ficha.pvMax - alvo.pv);
    if (volta > 0) {
      const curado = Object.assign({}, alvo, { pv: alvo.pv + volta });
      v += volta * IA_CURA + (_iaRisco(estado, alvo) - _iaRisco(estado, alvo, curado));
    }
  }
  if (m.cena) {
    const sob = _iaComCena(alvo, m.cena, estado);
    // A mesma magia de novo no mesmo alvo não soma nada (manual, p. 115).
    if (JSON.stringify(sob.efeitos) !== JSON.stringify(alvo.efeitos)) {
      v += (_iaRisco(estado, alvo) - _iaRisco(estado, alvo, sob)) * IA_DURACAO;
      v += (_iaForca(estado, sob) - _iaForca(estado, alvo)) * IA_DURACAO;
    }
  }
  return v;
}

/* Os alvos de uma magia, dos que rendem mais para os que rendem menos.
   O primeiro entra sempre; os seguintes só se renderem mais do que o PM
   que custam. E se o PM não der para todos, saem os últimos. */
function _iaComAlvos(m, vals, quem, p) {
  const limiar = m.porAlvo ? (m.pm | 0) * p.poupaPM : 0;
  const escolha = vals.filter((x, i) => i === 0 || x.v > Math.max(0, limiar))
                      .slice(0, m.alvos || 1);
  while (escolha.length > 1 && fuCusto(m, escolha.length) > quem.pm) escolha.pop();
  if (!escolha.length || fuCusto(m, escolha.length) > quem.pm) return null;
  const v = escolha.reduce((s, x) => s + x.v, 0) - fuCusto(m, escolha.length) * p.poupaPM;
  return { v, acao: { tipo: 'magia', magia: m, alvos: escolha.map(x => x.t.id) } };
}

// ═══════════════════════════════════════════════════════════════════
// AS OPÇÕES DE UM LUTADOR, CADA UMA COM O SEU VALOR
// ═══════════════════════════════════════════════════════════════════
function _iaOpcoes(estado, quem, p) {
  const ops = [];
  const inimigos = _iaOutroLado(estado, quem);
  const equipaIni = inimigos.length ? estado[inimigos[0].lado] : [];
  const aliados = estado[quem.lado].filter(c => c.vivo);

  // ── ferir ──
  for (const at of _iaAtaquesDe(quem)) {
    if (at.custo > quem.pm) continue;
    const vals = inimigos.filter(t => _iaAlcanca(equipaIni, t, at)).map(t => {
      const ef = _iaEfeito(quem, t, at);
      return { t, v: ef.dano + ef.pAbate * IA_ABATE * p.abate + ef.pEstado * IA_ESTADO };
    }).sort((a, b) => b.v - a.v);
    if (!vals.length) continue;

    if (!at.magia) {
      ops.push({ v: vals[0].v, acao: { tipo: 'atacar', alvos: [vals[0].t.id] } });
    } else if (at.todos) {
      ops.push({ v: vals.reduce((s, x) => s + x.v, 0) - fuCusto(at.magia, 1) * p.poupaPM,
                 acao: { tipo: 'magia', magia: at.magia } });
    } else {
      const op = _iaComAlvos(at.magia, vals, quem, p);
      if (op && at.magia.estilo) op.v += _iaValorEstilo(estado, quem, at, op.acao.alvos);
      if (op) ops.push(op);
    }
  }

  // ── curar e pôr de pé ──
  const mg = fuMagiasDe(quem.ficha);
  for (const l of Object.keys(mg)) {
    const m = mg[l];
    if (!(m.proprio || m.aliado || m.cura)) continue;
    if ((m.cena || m.proteger) && !p.cena) continue;
    if (fuCusto(m, 1) > quem.pm) continue;
    const quais = m.proprio ? [quem] : aliados;
    const vals = quais.map(t => ({ t, v: _iaValorApoio(estado, m, t, quem) }))
                      .filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    if (!vals.length) continue;
    const op = m.proprio
      ? { v: vals[0].v - fuCusto(m, 1) * p.poupaPM, acao: { tipo: 'magia', magia: m } }
      : _iaComAlvos(m, vals, quem, p);
    if (op) ops.push(op);
  }

  // ── guardar ──
  // Do Médio para cima a guarda é uma jogada: vale o dano que ela evita
  // e o PM que devolve. No Fácil (a IA de sempre, _iaLegado) não passa
  // por aqui.
  if (p.guarda) {
    const guardado = Object.assign({}, quem, { guardando: true });
    // Guardar para cortar dano pesa mais em quem já está ferido: com a
    // vida cheia, bater quase sempre rende mais do que se encolher. O peso
    // vai de 0,25 (vida cheia) a 1,25 (quase caindo).
    const ferido = 1.25 - quem.pv / quem.ficha.pvMax;
    ops.push({ v: (_iaRisco(estado, quem) - _iaRisco(estado, quem, guardado)) * IA_GUARDA * ferido
                  + _iaValorPmDaGuarda(quem)
                  // e a Represália, que só dispara com o Guarda guardando
                  + _iaValorRepresalia(estado, quem),
               acao: { tipo: 'guardar' } });
  } else {
    ops.push({ v: 0, acao: { tipo: 'guardar' } });
  }

  // ── trocar de posto ──
  // Mede o perigo da equipe inteira antes e depois da troca: tirar da
  // frente quem está para cair e pôr lá quem aguenta.
  if (p.mover) {
    const antes = aliados.reduce((s, c) => s + _iaRisco(estado, c), 0);
    for (const outro of aliados) {
      if (outro === quem) continue;
      const a = Object.assign({}, quem,  { posto: outro.posto });
      const b = Object.assign({}, outro, { posto: quem.posto });
      const equipa = estado[quem.lado].map(c => (c === quem ? a : c === outro ? b : c));
      const depois = equipa.filter(c => c.vivo)
                           .reduce((s, c) => s + _iaRisco(estado, c, c, equipa), 0);
      const v = (antes - depois) * IA_DURACAO - IA_MOVER_MIN;
      if (v > 0) ops.push({ v, acao: { tipo: 'mover', com: outro.id } });
    }
  }
  return ops;
}

// ═══════════════════════════════════════════════════════════════════
// A DECISÃO
//
// Devolve { quem, acao } — `acao` na forma do fuAgir, sem o `quem`. O
// valor sai junto (`v`) para quem quiser conferir. Em empate fica a
// primeira opção encontrada, portanto a mesma situação dá sempre a
// mesma escolha.
// ═══════════════════════════════════════════════════════════════════
function fuIaDecidir(estado, lado, podem, nivel) {
  if (!estado || !podem || !podem.length) return null;
  const p = FU_IA_NIVEIS[Math.max(0, Math.min(FU_IA_NIVEIS.length - 1, nivel | 0))];
  if (p.legado) return _iaLegado(estado, lado, podem);

  let melhor = null;
  for (const id of podem) {
    const quem = fuPorId(estado, id);
    if (!quem || !quem.vivo) continue;
    for (const op of _iaOpcoes(estado, quem, p)) {
      if (!melhor || op.v > melhor.v) melhor = { quem: id, acao: op.acao, v: op.v };
    }
  }
  return melhor || { quem: podem[0], acao: { tipo: 'atacar' }, v: 0 };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FU_IA_NIVEIS, fuIaDecidir, _iaGolpe, _iaRisco, _iaForca, _iaOpcoes, _iaLegado };
}
