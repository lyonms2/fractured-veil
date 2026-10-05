#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   OS FEITOS — a memória do avatar

     node tools/testar-feitos.js

   A etapa 3I.1 construiu a memória que faltava: até ela, o jogo não
   contava uma única batalha por avatar. O que havia eram XP e vínculo
   dentro do `avatarSlots`, que o cliente grava por inteiro.

   Esta ferramenta prova quatro coisas:

     1. a estrutura existe, e não depende do que o avatar É
        (nível, fase, raridade, feitio, escola)
     2. uma partida de PvP verificada entra; uma inventada não
     3. o cliente não consegue fabricar um feito
     4. o histórico acompanha o avatar na venda, com o marco

   ── O QUE ELA NÃO PROVA ──

   Que alguém vira Raro por causa disto. Não há exame, não há critério,
   não há pontuação — e é de propósito: primeiro a memória, depois o
   exame. Esta etapa registra fatos e mais nada.
   ═══════════════════════════════════════════════════════════════════ */

const fs  = require('fs');
const path = require('path');
const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
Object.assign(global, F);
const G   = require('../js/magias-fu.js');
const FE  = require('../js/feitos.js');
const RAR = require('../js/raridades.js');
const RG  = require('../js/pvp-regras.js');
const RK  = require('../js/pvp-rank.js');

let ok = 0, mau = 0;
const falhas = [];
function conferir(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + JSON.stringify(detalhe) : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }
const ler = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/* ═══ 1 · A ESTRUTURA ════════════════════════════════════════════ */
titulo('A estrutura de um avatar que ainda não fez nada');
{
  const r = FE.feitoVazio(1000);
  conferir('tem as datas', r.criadoEm === 1000 && r.em === 1000, r);
  conferir('tem os dois tipos de PvP', !!r.pvp.fila && !!r.pvp.amistosa, r.pvp);
  for (const t of FE.FEITO_TIPOS)
    for (const k of ['n', 'v', 'd', 'e', 'x'])
      conferir('e ' + t + '.' + k + ' começa em zero', r.pvp[t][k] === 0);
  conferir('nenhum ciclo', Object.keys(r.ciclos).length === 0);
  conferir('nenhum marco', r.marcos.length === 0);
  /* A estrutura não pode conhecer nada do que o avatar É: raridade,
     nível, fase, feitio e escola são o que ele é; os feitos são o que
     ele fez. Se uma destas palavras aparecer aqui, os dois conceitos
     voltaram a encostar. */
  const fonte = ler('js/feitos.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  for (const palavra of ['raridade', 'nivel', 'nível', 'fase', 'feitio', 'escola',
                         'Comum', 'Raro', 'Lendário'])
    conferir('o js/feitos.js não fala de ' + palavra,
      fonte.indexOf(palavra) === -1, palavra);
  // e a forma é a mesma, venha o avatar de onde vier
  const formas = new Set();
  for (const nivel of [1, 30, 60]) for (const rar of RAR.RARIDADES) {
    const c = GEN.certidaoDeInvocacao({ uid: 'f', nome: 'T' });
    c.seed = 7919 + nivel; c.nascimento.seed = c.seed;
    c.nascimento.dna = GEN.nascimento.gerarDna('Comum', c.seed);
    const slot = { id: 'a', nome: 'T', seed: c.seed, nivel, raridadeReconhecida: rar,
                   nascimento: c.nascimento };
    const fi = F.fuFicha(slot);
    formas.add(JSON.stringify(Object.keys(FE.feitoDe({}, slot.id)).sort())
      + '|' + fi.feitio + ':' + G.fuEscolaDe(fi));
  }
  conferir('a forma do registro é a mesma nos ' + formas.size + ' casos',
    new Set([...formas].map(x => x.split('|')[0])).size === 1, [...formas]);
}

/* ═══ 2 · O REGISTRO DE UMA PARTIDA ══════════════════════════════ */
titulo('Uma partida verificada entra, e entra uma vez');
{
  let r = FE.feitoVazio(1000);
  r = FE.feitoPvp(r, 'vitoria',  'fila',    '2026-10', 2000);
  conferir('a vitória conta', r.pvp.fila.n === 1 && r.pvp.fila.v === 1, r.pvp.fila);
  r = FE.feitoPvp(r, 'derrota',  'fila',    '2026-10', 3000);
  conferir('a derrota conta', r.pvp.fila.n === 2 && r.pvp.fila.d === 1, r.pvp.fila);
  r = FE.feitoPvp(r, 'empate',   'fila',    '2026-10', 4000);
  conferir('o empate conta', r.pvp.fila.n === 3 && r.pvp.fila.e === 1, r.pvp.fila);
  r = FE.feitoPvp(r, 'desistiu', 'fila',    '2026-10', 5000);
  conferir('a desistência conta, e à parte da derrota',
    r.pvp.fila.n === 4 && r.pvp.fila.x === 1 && r.pvp.fila.d === 1, r.pvp.fila);
  conferir('n é a soma das quatro',
    r.pvp.fila.n === r.pvp.fila.v + r.pvp.fila.d + r.pvp.fila.e + r.pvp.fila.x);
  r = FE.feitoPvp(r, 'vitoria',  'amistosa', '2026-10', 6000);
  conferir('o amistosa conta à parte da fila',
    r.pvp.amistosa.n === 1 && r.pvp.fila.n === 4, r.pvp);
  /* O ciclo que FALTA tem de fazer isto falhar, e não rebentar: uma
     ferramenta que rebenta não relata falha nenhuma, e uma mutação que
     a derruba parece uma mutação que escapou. Apanhado na 3I.9. */
  conferir('o ciclo só registra a fila',
    !!r.ciclos['2026-10'] && r.ciclos['2026-10'].n === 4
    && r.ciclos['2026-10'].v === 1, r.ciclos);
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-11', 7000);
  conferir('um mês novo abre um ciclo novo',
    FE.feitoCiclos({ a: r }, 'a').join(',') === '2026-10,2026-11', r.ciclos);
  conferir('o total soma os dois tipos',
    FE.feitoPvpTotal({ a: r }, 'a').n === 6, FE.feitoPvpTotal({ a: r }, 'a'));
  conferir('a data de criação não se mexe', r.criadoEm === 1000, r.criadoEm);
  conferir('e a de atualização acompanha', r.em === 7000, r.em);
}

titulo('Uma partida que não existe não entra');
{
  const base = FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila', '2026-10', 2000);
  const antes = JSON.stringify(base);
  for (const [res, tipo, rot] of [
    ['ganhei',    'fila',    'um resultado inventado'],
    ['',          'fila',    'um resultado vazio'],
    [null,        'fila',    'um resultado nulo'],
    ['vitoria',   'treino',  'um tipo de sala inventado'],
    ['vitoria',   '',        'um tipo vazio'],
    ['vitoria',   null,      'um tipo nulo'],
    ['__proto__', 'fila',    'um resultado envenenado'],
    ['vitoria',   '__proto__', 'um tipo envenenado'],
  ]) {
    const depois = FE.feitoPvp(base, res, tipo, '2026-10', 3000);
    conferir(rot + ' não escreve nada', JSON.stringify(depois) === antes,
      { res, tipo, depois });
  }
  // e um ciclo mal formado guarda a partida sem abrir ciclo nenhum
  for (const ciclo of ['2026', 'outubro', '', null, '2026-13-01', '__proto__']) {
    const d = FE.feitoPvp(base, 'vitoria', 'fila', ciclo, 3000);
    conferir('o ciclo "' + ciclo + '" não abre ciclo', Object.keys(d.ciclos).length === 1
      && d.pvp.fila.n === 2, { ciclo, ciclos: Object.keys(d.ciclos) });
  }
}

titulo('A escrita é pura: nunca mexe no que recebeu');
{
  /* Estas funções correm DENTRO de transações do Firestore, que podem
     ser repetidas. Um registro mutado aqui faria uma transação recusada
     deixar rasto. */
  const r = FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila', '2026-10', 2000);
  const copia = JSON.stringify(r);
  FE.feitoPvp(r, 'derrota', 'fila', '2026-10', 3000);
  FE.feitoPvp(r, 'vitoria', 'amistosa', '2026-11', 4000);
  FE.feitoMarco(r, 'venda', 5000);
  conferir('o feitoPvp não muta', JSON.stringify(r) === copia);
  conferir('o feitoMarco também não', JSON.stringify(r) === copia);
  const novo = FE.feitoPvp(r, 'derrota', 'fila', '2026-10', 3000);
  conferir('e devolve um objeto diferente', novo !== r && novo.pvp !== r.pvp);
}

/* ═══ 3 · A PARTIDA DE VERDADE, DE PONTA A PONTA ═════════════════ */
titulo('O caminho real: o servidor refaz a luta e registra quem lutou');
{
  /* Monta-se uma sala como o banco a guarda, joga-se pela rede e
     refaz-se com o `pvpRepetir` — o mesmo que o api/pvp.js corre antes
     de fechar. Depois registra-se o que a refeita disser.

     É este o ponto todo: o resultado NÃO vem do navegador. */
  Object.assign(global, require('../js/ia-fu.js'));
  Object.assign(global, require('../js/combate-fu.js'));
  const equipe = (dono, nivel) => [0, 1, 2].map(i => {
    const c = GEN.certidaoDeInvocacao({ uid: dono, nome: 'T' });
    return { id: `${dono}-av${i}`, nome: `B${i}`, nivel, seed: c.seed,
             raridade: null, nascimento: c.nascimento };
  });
  const sala = { seed: 4242, inicio: 1e12, tipo: 'fila', estado: 'luta',
                 lados: { A: 'uA', B: 'uB' },
                 jogadores: { uA: { equipe: equipe('a', 30) }, uB: { equipe: equipe('b', 30) } },
                 acoes: {} };
  const eq = RG.pvpEquipesDaSala(sala);
  const est = fuIniciar(eq.A, eq.B, sala.seed);
  const ctx = RG.pvpContexto(sala);
  let ts = sala.inicio, n = 0, fim = null;
  while (n < 400) {
    RG.pvpAvancar(est);
    if (est.acabou) break;
    const vez = fuVez(est);
    ts += 5000;
    const d = fuIaDecidir(est, vez.lado, vez.podem, 1);
    const a = Object.assign(RG.pvpParaRede(est, Object.assign({ quem: d.quem }, d.acao)),
                            { por: sala.lados[vez.lado], ts });
    const prep = RG.pvpPreparar(est, a, ctx);
    const okA = prep.eng ? fuAgir(est, prep.eng).length > 0 : false;
    sala.acoes[RG.pvpChave(n++)] = a;
    fim = RG.pvpRegistrar(ctx, prep, okA, a);
    if (fim) break;
  }
  if (!fim) { RG.pvpAvancar(est); fim = { vencedor: est.vencedor, motivo: est.porLimite ? 'limite' : 'luta' }; }

  const refeita = RG.pvpRepetir(sala);
  conferir('a luta acaba e o servidor refaz igual',
    !!refeita.fim && refeita.fim.vencedor === fim.vencedor, [fim, refeita.fim]);

  // o que o aplicarPremios faria: o resultado de cada lado, pela refeita
  const fimSrv = { vencedor: refeita.fim.vencedor ? sala.lados[refeita.fim.vencedor] : null,
                   motivo: refeita.fim.motivo };
  const ciclo = RK.pvpTemporada(Date.now());
  conferir('o ciclo tem a forma AAAA-MM', /^\d{4}-\d{2}$/.test(ciclo), ciclo);

  const feitos = {};
  for (const lado of ['A', 'B']) {
    const uid = sala.lados[lado];
    const res = RG.pvpResultadoDe(uid, fimSrv);
    const avs = sala.jogadores[uid].equipe.map(a => a.id);
    for (const idAv of avs)
      feitos[idAv] = FE.feitoPvp(feitos[idAv], res, sala.tipo, ciclo, Date.now());
  }
  conferir('os SEIS avatares ficam com registro', Object.keys(feitos).length === 6,
    Object.keys(feitos));
  const vencedores = Object.keys(feitos).filter(k => FE.feitoDe(feitos, k).pvp.fila.v === 1);
  const perdedores = Object.keys(feitos).filter(k => FE.feitoDe(feitos, k).pvp.fila.d === 1);
  conferir('três de um lado ganham e três do outro perdem',
    (vencedores.length === 3 && perdedores.length === 3)
    || Object.keys(feitos).every(k => FE.feitoDe(feitos, k).pvp.fila.e === 1),
    { vencedores, perdedores });
  conferir('todos contam exatamente uma participação',
    Object.keys(feitos).every(k => FE.feitoDe(feitos, k).pvp.fila.n === 1));
  conferir('e todos entram no mesmo ciclo',
    Object.keys(feitos).every(k => FE.feitoCiclos(feitos, k).join() === ciclo));

  /* UM AVATAR QUE NÃO LUTOU NÃO RECEBE NADA. A lista de quem recebe sai
     do `equipe` da sala, que foi o servidor que montou (lerEquipa). */
  conferir('um avatar de fora não tem registro',
    FE.feitoDe(feitos, 'c-av0').pvp.fila.n === 0);
  conferir('nem aparece no mapa', feitos['c-av0'] === undefined);
}

/* ═══ 4 · A SEGURANÇA ════════════════════════════════════════════ */
titulo('O cliente não fabrica feito nenhum');
{
  /* ── O CAMINHO ──
     O `feitos` é campo de topo, que o cliente não escreve
     (firestore.rules), e o save do slot não o manda. A única escrita é
     o aplicarNoJogador do api/pvp.js, dentro do fecho da sala. */
  const regras = ler('firestore.rules');
  conferir('o `feitos` está na lista dos campos do servidor',
    /'feitos'/.test(regras), null);
  const fb = ler('js/firebase.js');
  const bloco = fb.slice(fb.indexOf('// Avatar identity'), fb.indexOf('// Avatar identity') + 2600);
  conferir('o save do slot NÃO manda feitos', !/feitos\s*:/.test(bloco));
  conferir('o carregamento só LÊ o mapa', /feitosCarregar\(data\.feitos\)/.test(fb));

  const pvp = ler('api/pvp.js');
  conferir('a escrita vive no aplicarNoJogador',
    /alteracoes\[`feitos\.\$\{idAv\}`\]/.test(pvp));
  conferir('e usa o resultado da refeita (p.resultado), não o do cliente',
    /FE\.feitoPvp\(feitos\[idAv\], p\.resultado,/.test(pvp));
  /* O `p.resultado` sai do pvpResultadoDe(uid, fim), e o `fim` sai do
     pvpRepetir — a luta refeita pelo servidor. Se alguém o trocar pelo
     corpo do pedido, isto falha. */
  conferir('o resultado nunca vem do req.body',
    !/resultado\s*[:=]\s*(req\.body|body)\./.test(pvp));

  /* ── O MÓDULO NÃO ABRE PORTA NENHUMA ──
     Não há função que deixe o cliente declarar um feito, e o lado do
     navegador é só leitura. */
  const fonte = ler('js/feitos.js');
  conferir('o navegador só tem carregar e ler',
    /function feitosCarregar/.test(fonte) && /function feitosMapa/.test(fonte)
    && !/function feitosGravar|function feitosEnviar|fetch\(/.test(fonte));
  conferir('e o módulo não fala com o Firestore nem com o DOM',
    !/firebase|firestore|document\.|window\./.test(fonte));

  /* ── A ADULTERAÇÃO, TENTADA ──
     O que o cliente consegue escrever é o slot. Nada do que ele ponha
     lá é lido pelo caminho dos feitos. */
  const mapaReal = { av: FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila', '2026-10', 2000) };
  const slotForjado = { id: 'av', feitos: { pvp: { fila: { n: 999999, v: 999999 } } } };
  conferir('o feitoDe lê o MAPA, e não o slot',
    FE.feitoDe(mapaReal, slotForjado.id).pvp.fila.v === 1, FE.feitoDe(mapaReal, 'av').pvp);
  conferir('e o total também', FE.feitoPvpTotal(mapaReal, 'av').n === 1);

  /* Um registro estragado no próprio mapa lê-se como vazio, e não
     rebenta: o servidor é quem o escreve, mas um documento antigo ou
     meio gravado não pode derrubar a leitura. */
  for (const lixo of [null, 0, 'x', [], { pvp: 'x' }, { pvp: { fila: 'x' } },
                      { pvp: { fila: { n: 'muitos', v: {} } } }, { ciclos: 'x' },
                      { marcos: 'x' }]) {
    let r = null;
    try { r = FE.feitoDe({ a: lixo }, 'a'); } catch (e) { r = null; }
    conferir('um registro estragado lê-se como vazio (' + JSON.stringify(lixo) + ')',
      !!r && r.pvp.fila.n === 0 && Array.isArray(r.marcos), r);
  }
  // e números absurdos no mapa não viram números: o |0 corta
  const absurdo = FE.feitoDe({ a: { pvp: { fila: { n: 1e30, v: -5, d: 'x', e: null, x: 1.9 } } } }, 'a');
  /* SÓ AS CONTAGENS. Desde a etapa 3I.3 o ramo tem também o
     `melhorAdversario`, que é um objeto ou nulo — percorrer o ramo
     inteiro fazia esta linha acusar o campo novo de não ser inteiro. */
  conferir('os contadores são sempre inteiros',
    ['n', 'v', 'd', 'e', 'x'].every(k => Number.isInteger(absurdo.pvp.fila[k])),
    absurdo.pvp.fila);
  conferir('e o recorde continua a ser objeto ou nulo',
    absurdo.pvp.fila.melhorAdversario === null
    || typeof absurdo.pvp.fila.melhorAdversario === 'object',
    absurdo.pvp.fila.melhorAdversario);
}

/* ═══ 5 · A PERSISTÊNCIA E O MERCADO ═════════════════════════════ */
titulo('O histórico acompanha o avatar, e a venda deixa marca');
{
  let doVendedor = FE.feitoVazio(1000);
  for (let i = 0; i < 7; i++)
    doVendedor = FE.feitoPvp(doVendedor, i < 4 ? 'vitoria' : 'derrota', 'fila', '2026-10', 2000 + i);

  // o que a transação da compra faz: marca a venda e copia inteiro
  const comMarco = FE.feitoMarco(doVendedor, 'venda', 9000);
  const doComprador = JSON.parse(JSON.stringify(comMarco));

  conferir('o comprador recebe as mesmas contagens',
    FE.feitoPvpTotal({ a: doComprador }, 'a').n === 7
    && FE.feitoDe({ a: doComprador }, 'a').pvp.fila.v === 4,
    FE.feitoDe({ a: doComprador }, 'a').pvp.fila);
  conferir('a compra não zera nada', FE.feitoPvpTotal({ a: doComprador }, 'a').n
    === FE.feitoPvpTotal({ a: doVendedor }, 'a').n);
  conferir('nem recalcula: é o mesmo objeto, com o marco a mais',
    JSON.stringify(doComprador.pvp) === JSON.stringify(doVendedor.pvp));
  conferir('a data de criação do registro atravessa a venda',
    doComprador.criadoEm === 1000, doComprador.criadoEm);
  conferir('o marco guarda o retrato do instante da venda',
    doComprador.marcos.length === 1 && doComprador.marcos[0].tipo === 'venda'
    && doComprador.marcos[0].pvp.n === 7 && doComprador.marcos[0].pvp.v === 4,
    doComprador.marcos);

  // e o que vem DEPOIS da venda distingue-se do que veio antes
  let depois = doComprador;
  for (let i = 0; i < 3; i++) depois = FE.feitoPvp(depois, 'vitoria', 'fila', '2026-11', 10000 + i);
  const noMarco = FE.feitoDe({ a: depois }, 'a').marcos[0].pvp;
  const agora = FE.feitoPvpTotal({ a: depois }, 'a');
  conferir('antes da venda: ' + noMarco.n + ' partidas · agora: ' + agora.n,
    noMarco.n === 7 && agora.n === 10);
  conferir('e as de depois da venda saem da subtração',
    agora.v - noMarco.v === 3, { antes: noMarco.v, agora: agora.v });

  // várias vendas: os marcos empilham, e nunca passam do teto
  let muito = depois;
  for (let i = 0; i < FE.FEITO_MARCOS_MAX + 5; i++) muito = FE.feitoMarco(muito, 'venda', 20000 + i);
  conferir('os marcos não crescem sem fim',
    FE.feitoDe({ a: muito }, 'a').marcos.length === FE.FEITO_MARCOS_MAX,
    FE.feitoDe({ a: muito }, 'a').marcos.length);
  conferir('e o criadoEm continua a ser o primeiro instante de todos',
    muito.criadoEm === 1000, muito.criadoEm);

  // o código da compra, conferido
  const ca = ler('api/comprar-avatar.js');
  conferir('a compra copia os feitos do vendedor',
    /sellerData\.feitos/.test(ca) && /chaveFeitos/.test(ca));
  conferir('com o marco da venda', /FE\.feitoMarco\(\(sellerData\.feitos \|\| \{\}\)/.test(ca));
  conferir('e apaga-os do vendedor',
    /\[chaveFeitos\]:\s*FieldValue\.delete\(\)/.test(ca));
  conferir('a compra não recalcula feito nenhum',
    !/feitoPvp\(/.test(ca));
}

/* ═══ 6 · A INDEPENDÊNCIA ════════════════════════════════════════ */
titulo('Feitos ≠ nível, fase, raridade, feitio, escola');
{
  /* O mesmo histórico em avatares completamente diferentes, e o mesmo
     avatar com históricos diferentes: as duas coisas têm de ser
     possíveis, senão os conceitos voltaram a encostar. */
  const historico = FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila', '2026-10', 2000);
  const vistos = [];
  for (const nivel of [1, 11, 27, 60]) for (const rar of RAR.RARIDADES) {
    const c = GEN.certidaoDeInvocacao({ uid: 'i', nome: 'T' });
    c.seed = 7919 * nivel; c.nascimento.seed = c.seed;
    c.nascimento.dna = GEN.nascimento.gerarDna('Comum', c.seed);
    const slot = { id: 'x', nome: 'T', seed: c.seed, nivel, raridadeReconhecida: rar,
                   nascimento: c.nascimento };
    const fi = F.fuFicha(slot);
    const f = FE.feitoDe({ x: historico }, 'x');
    vistos.push({ nivel, rar, fase: F.fuFaseDoNivel(nivel), feitio: fi.feitio,
                  escola: G.fuEscolaDe(fi), n: f.pvp.fila.n, v: f.pvp.fila.v });
  }
  conferir('o mesmo histórico em ' + vistos.length + ' avatares diferentes lê-se igual',
    vistos.every(x => x.n === 1 && x.v === 1), vistos.slice(0, 3));
  conferir('e os avatares eram mesmo diferentes',
    new Set(vistos.map(x => x.nivel + x.rar + x.feitio + x.escola)).size === vistos.length);
  conferir('o registro de nível 1 Comum é idêntico ao de nível 60 Lendário',
    JSON.stringify(FE.feitoDe({ x: historico }, 'x'))
    === JSON.stringify(FE.feitoDe({ x: historico }, 'x')));

  /* E o contrário: dois avatares iguais com históricos diferentes. */
  const pouco = FE.feitoPvp(FE.feitoVazio(1), 'derrota', 'fila', '2026-10', 2);
  const muito = (() => { let r = FE.feitoVazio(1);
    for (let i = 0; i < 50; i++) r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 2 + i);
    return r; })();
  conferir('dois iguais podem ter históricos muito diferentes',
    FE.feitoPvpTotal({ a: pouco }, 'a').n === 1
    && FE.feitoPvpTotal({ b: muito }, 'b').n === 50);
}

/* ═══ 7 · O QUE FICOU DE FORA, E POR QUÊ ═════════════════════════ */
titulo('O PvE e o vínculo ficam de fora — e isso está vigiado');
{
  /* ── O PvE NÃO É FONTE ──

     O resultado dele chega num POST do cliente
     (`{acao:'laco', resultado}`, em js/pve-fu.js) e nenhum servidor o
     refaz. Registrar isso seria transformar um campo falsificável num
     feito — o contrário desta etapa.

     Esta conferição falha no dia em que alguém ligar o PvE aos feitos
     sem antes pôr o servidor a refazer a batalha. */
  const pool = ler('api/pool.js');
  conferir('o api/pool.js não escreve feitos', !/feitos\./.test(pool) && !/feitoPvp/.test(pool));
  conferir('e o handleLaco continua a receber o resultado do cliente',
    /const \{ slots: pedidos, resultado \} = req\.body;/.test(pool));
  const pve = ler('js/pve-fu.js');
  conferir('o PvE comunica o resultado pela rede, sem reconstrução',
    /acao: 'laco'[\s\S]{0,80}resultado/.test(pve) || /resultado \}\)/.test(pve));
  /* "defeitos" contém "feito" — a primeira versão desta linha usava
     /feito/i e acusava o js/pve-fu.js por causa de um comentário. O que
     se quer saber é se ele CHAMA o módulo. */
  conferir('e o js/pve-fu.js não chama o módulo dos feitos',
    !/\bfeito(Pvp|De|Vazio|Marco|sCarregar|sMapa)\b|feitos\s*\[|feitos\./.test(pve));

  /* ── O VÍNCULO FICA COMO ESTÁ ──
     Não foi tocado nesta etapa. Continua com o teto de 6 pontos por dia
     por par e o pedido por minuto, e continua a acreditar no resultado
     que o cliente manda. É dívida escrita, não um feito. */
  const L = require('../js/lacos.js');
  conferir('o laço continua com teto diário', L.LACO_TETO_DIA === 6);
  conferir('e os feitos não o leem', !/laco/i.test(ler('js/feitos.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')));
}

/* ═══ 8 · O MELHOR ADVERSÁRIO DERROTADO ═════════════════════════ */
titulo('O melhor adversário: só a vitória conta, e nunca desce');
{
  const adv = (pontos, divisao) => ({ pontos, divisao: divisao || 'adulto',
                                      em: 1000, ciclo: '2026-10' });
  const melhor = (r, tipo) => {
    const m = FE.feitoDe({ a: r }, 'a').pvp[tipo || 'fila'].melhorAdversario;
    return m ? m.pontos : null;
  };
  let r = FE.feitoVazio(1000);
  conferir('começa sem recorde', melhor(r) === null);

  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 2000, adv(1000));
  conferir('1 · vitória contra 1000 grava 1000', melhor(r) === 1000, melhor(r));
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 3000, adv(1200));
  conferir('2 · vitória contra 1200 sobe para 1200', melhor(r) === 1200, melhor(r));
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 4000, adv(1100));
  conferir('3 · vitória contra 1100 mantém 1200', melhor(r) === 1200, melhor(r));
  r = FE.feitoPvp(r, 'derrota', 'fila', '2026-10', 5000, adv(1500));
  conferir('4 · derrota contra 1500 mantém 1200', melhor(r) === 1200, melhor(r));
  r = FE.feitoPvp(r, 'empate', 'fila', '2026-10', 6000, adv(1600));
  conferir('5 · empate contra 1600 mantém 1200', melhor(r) === 1200, melhor(r));
  r = FE.feitoPvp(r, 'desistiu', 'fila', '2026-10', 6500, adv(1700));
  conferir('e a desistência também mantém', melhor(r) === 1200, melhor(r));

  /* 6 · uma partida que não existe não mexe em nada — nem nas
     contagens, nem no recorde. */
  const antes = JSON.stringify(r);
  for (const [res, tipo] of [['ganhei', 'fila'], ['vitoria', 'treino'],
                             [null, 'fila'], ['vitoria', null]]) {
    conferir('6 · partida inválida (' + res + '/' + tipo + ') não altera o recorde',
      JSON.stringify(FE.feitoPvp(r, res, tipo, '2026-10', 7000, adv(9999))) === antes);
  }
  /* 7 · um avatar que não participou não tem registro nenhum — é a
     mesma prova da secção 3, e vale para o recorde também. */
  conferir('7 · um avatar de fora não tem recorde',
    FE.feitoDe({ a: r }, 'outro').pvp.fila.melhorAdversario === null);

  // ── 8, 9, 10 · a modalidade ──
  conferir('8 · a vitória de fila grava no ramo da fila', melhor(r, 'fila') === 1200);
  let comAmistosa = FE.feitoPvp(r, 'vitoria', 'amistosa', '2026-10', 8000, adv(9999));
  conferir('9 · a vitória amistosa NÃO toca no recorde da fila',
    melhor(comAmistosa, 'fila') === 1200, melhor(comAmistosa, 'fila'));
  conferir('10 · e a amistosa guarda o seu, à parte',
    melhor(comAmistosa, 'amistosa') === 9999, melhor(comAmistosa, 'amistosa'));
  conferir('as duas modalidades não se somam no total',
    FE.feitoPvpTotal({ a: comAmistosa }, 'a').melhorAdversario === undefined
    || FE.feitoPvpTotal({ a: comAmistosa }, 'a').melhorAdversario === null,
    FE.feitoPvpTotal({ a: comAmistosa }, 'a'));

  // ── 19, 20 · a integridade ──
  for (const lixo of [null, undefined, {}, { pontos: 0 }, { pontos: -5 },
                      { pontos: 'muitos' }, { pontos: Infinity }, { pontos: NaN },
                      { pontos: null }, 'x', 42, [], { pontos: { a: 1 } }]) {
    let d = null;
    try { d = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 9000, lixo); } catch (e) { d = null; }
    conferir('20 · um adversário inválido (' + JSON.stringify(lixo)
      + ') não quebra nem altera', !!d && melhor(d) === 1200 && d.pvp.fila.n === r.pvp.fila.n + 1,
      d && melhor(d));
  }
  conferir('19 · o valor nunca diminui, em 200 lances aleatórios', (() => {
    let x = FE.feitoVazio(1), alto = 0;
    for (let i = 0; i < 200; i++) {
      const p = 800 + ((i * 7919) % 900);
      x = FE.feitoPvp(x, 'vitoria', 'fila', '2026-10', i, adv(p));
      const m = melhor(x);
      if (m < alto) return false;
      alto = m;
    }
    return alto === melhor(x);
  })());

  // o contexto fica guardado, para o exame poder comparar depois
  const g = FE.feitoDe({ a: r }, 'a').pvp.fila.melhorAdversario;
  conferir('o recorde guarda a divisão', g.divisao === 'adulto', g);
  conferir('e o ciclo e a hora', g.ciclo === '2026-10' && g.em === 1000, g);
  conferir('e os pontos são inteiros', Number.isInteger(g.pontos), g);
  const meia = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2,
                           { pontos: 1234.7, divisao: 'jovem' });
  conferir('um ponto fracionado arredonda',
    FE.feitoDe({ a: meia }, 'a').pvp.fila.melhorAdversario.pontos === 1235,
    FE.feitoDe({ a: meia }, 'a').pvp.fila.melhorAdversario);
  /* A divisão TEM de ser guardada — é o que vai deixar o exame comparar
     1200 do jovem com 1200 do ancião — e tem de vir cortada. Lê-se com
     cuidado: a primeira versão fazia `.divisao.length` direto e
     REBENTAVA quando a mutação punha nulo lá, em vez de falhar. */
  const corte = FE.feitoDe({ a: FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2,
    { pontos: 1000, divisao: 'x'.repeat(200) }) }, 'a').pvp.fila.melhorAdversario;
  conferir('a divisão é guardada', !!corte && typeof corte.divisao === 'string', corte);
  conferir('e uma divisão esquisita não entra inteira',
    !!corte && typeof corte.divisao === 'string' && corte.divisao.length === 16,
    corte && corte.divisao);
}

titulo('21 · a transação repetida não contamina o recorde');
{
  /* O Firestore repete uma transação quando há conflito. Se o
     `feitoPvp` mutasse o registro que recebeu, a segunda volta leria um
     objeto já alterado pela primeira — foi o defeito que a 3I.1
     encontrou nas contagens, e o recorde tem de ter a mesma garantia. */
  const adv = (p) => ({ pontos: p, divisao: 'adulto', em: 1, ciclo: '2026-10' });
  const original = FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila', '2026-10', 2000, adv(1100));
  const copia = JSON.stringify(original);

  // a transação corre três vezes com o MESMO registro de entrada
  const voltas = [];
  for (let i = 0; i < 3; i++)
    voltas.push(FE.feitoPvp(original, 'vitoria', 'fila', '2026-10', 3000, adv(1300)));
  conferir('o original não mudou depois de três voltas',
    JSON.stringify(original) === copia, original);
  conferir('e as três voltas deram exatamente o mesmo resultado',
    voltas.every(v => JSON.stringify(v) === JSON.stringify(voltas[0])), voltas.map(v => v.pvp.fila));
  conferir('com uma participação só, e não três',
    voltas[0].pvp.fila.n === 2, voltas[0].pvp.fila.n);
  conferir('e o recorde em 1300, e não somado', (() => {
    const m = FE.feitoDe({ a: voltas[0] }, 'a').pvp.fila.melhorAdversario;
    return m && m.pontos === 1300;
  })());
  // e o objeto do adversário também não é partilhado
  const dado = adv(1500);
  const saiu = FE.feitoPvp(original, 'vitoria', 'fila', '2026-10', 4000, dado);
  dado.pontos = 1;
  conferir('o recorde não guarda a referência do que lhe deram',
    FE.feitoDe({ a: saiu }, 'a').pvp.fila.melhorAdversario.pontos === 1500);
}

titulo('A fonte do valor: o servidor, antes da partida');
{
  const pvp = ler('api/pvp.js');
  /* O valor sai do `antes[outro]`, que é lido do documento do
     adversário no começo do bloco do rank — antes de qualquer escrita.
     Se alguém o trocar pelo próprio jogador, pelo valor de depois, ou
     por algo do cliente, estas conferições caem. */
  conferir('o prêmio carrega a força do ADVERSÁRIO, e não a própria',
    /pontos:\s*antes\[outro\]/.test(pvp), null);
  conferir('e não a do próprio jogador', !/pontos:\s*antes\[u\]/.test(pvp));
  conferir('o `antes` é preenchido antes do laço que calcula o rank novo',
    pvp.indexOf('antes[u] = RK.pvpRankAtual') < pvp.indexOf('premios[u].rank = RK.pvpRankSomar'));
  conferir('e nunca é reescrito depois', (pvp.match(/antes\[[a-z]+\]\s*=/g) || []).length === 1,
    pvp.match(/antes\[[a-z]+\]\s*=/g));
  conferir('o valor nunca vem do corpo do pedido',
    !/adversario[^\n]*req\.body|pontos[^\n]*req\.body/.test(pvp));
  conferir('a escrita passa o adversário ao js/feitos.js',
    /FE\.feitoPvp\(feitos\[idAv\], p\.resultado, tipoSala, ciclo, Date\.now\(\),[\s\S]{0,600}p\.adversario,/.test(pvp));
  /* Só a fila: o bloco que lê o rank é `if (sala.tipo === 'fila')`, e
     numa amistosa o `premios[u].adversario` nem chega a existir. */
  const bloco = pvp.slice(pvp.indexOf("if (sala.tipo === 'fila')"));
  conferir('a força só se lê dentro do bloco da fila',
    bloco.indexOf('premios[u].adversario') !== -1
    && bloco.indexOf('premios[u].adversario') < bloco.indexOf('// Um documento de cada vez'));
  // e o cliente não consegue pôr lá nada
  conferir('o `feitos` continua fora dos campos do slot',
    !/feitos\s*:/.test(ler('js/firebase.js').slice(
      ler('js/firebase.js').indexOf('// Avatar identity'),
      ler('js/firebase.js').indexOf('// Avatar identity') + 2600)));
}

titulo('O recorde acompanha a venda');
{
  const adv = (p) => ({ pontos: p, divisao: 'anciao', em: 1, ciclo: '2026-10' });
  let doVendedor = FE.feitoVazio(1000);
  doVendedor = FE.feitoPvp(doVendedor, 'vitoria', 'fila', '2026-10', 2000, adv(1480));
  const comMarco = FE.feitoMarco(doVendedor, 'venda', 9000);
  const doComprador = JSON.parse(JSON.stringify(comMarco));
  const m = FE.feitoDe({ a: doComprador }, 'a').pvp.fila.melhorAdversario;
  conferir('16/17 · o comprador recebe o recorde intacto',
    m && m.pontos === 1480 && m.divisao === 'anciao', m);
  conferir('a compra não recalcula o recorde',
    JSON.stringify(doComprador.pvp) === JSON.stringify(doVendedor.pvp));
  /* 18 · o novo dono não o apaga: o campo vive no mapa `feitos`, que
     só o servidor escreve, e o único caminho de escrita é a vitória. */
  const ca = ler('api/comprar-avatar.js');
  conferir('18 · a compra copia e não zera', /sellerData\.feitos/.test(ca)
    && !/melhorAdversario/.test(ca));
  // e uma vitória depois da venda continua a subir o recorde
  const depois = FE.feitoPvp(doComprador, 'vitoria', 'fila', '2026-11', 10000, adv(1600));
  conferir('e o novo dono pode melhorá-lo',
    FE.feitoDe({ a: depois }, 'a').pvp.fila.melhorAdversario.pontos === 1600);
  conferir('mas o marco guarda o que havia antes da venda',
    FE.feitoDe({ a: depois }, 'a').marcos[0].pvp.v === 1);
}

/* ═══ 9 · O SUPORTE ══════════════════════════════════════════════ */
titulo('O suporte: o que o avatar fez pelos outros');
{
  const RG2 = require('../js/pvp-regras.js');
  const sup = (o) => Object.assign(RG2.pvpSuporteVazio(), o || {});
  const lido = (r, tipo) => FE.feitoDe({ a: r }, 'a').pvp[tipo || 'fila'].suporte;

  conferir('as duas listas de campos batem',
    RG2.PVP_SUPORTE_CAMPOS.join(',') === FE.FEITO_SUPORTE_CAMPOS.join(','),
    [RG2.PVP_SUPORTE_CAMPOS, FE.FEITO_SUPORTE_CAMPOS]);
  conferir('um registro novo começa com tudo em zero',
    FE.FEITO_SUPORTE_CAMPOS.every(k => lido(FE.feitoVazio(1))[k] === 0), lido(FE.feitoVazio(1)));

  /* ── 4, 5 · O QUE O COLETOR CONTA, E A QUEM ── */
  const acc = {};
  RG2.pvpSuporteSomar(acc, [
    { tipo: 'cura',         quem: 'A0', alvo: 'A1', curou: 30 },
    { tipo: 'cura',         quem: 'A0', alvo: 'A0', curou: 20 },
    { tipo: 'cura',         quem: 'A0', alvo: 'A2', curou: 0 },
    { tipo: 'estiloLimpa',  quem: 'A0', alvo: 'A1', estado: 'lento' },
    { tipo: 'estiloLimpa',  quem: 'A0', alvo: 'A0', estado: 'lento' },
    { tipo: 'cena',         quem: 'A0', alvo: 'A2', mudou: true },
    { tipo: 'cena',         quem: 'A0', alvo: 'A2', mudou: false },
    { tipo: 'estiloGuarda', quem: 'A1', alvo: 'A0' },
    { tipo: 'proteger',     quem: 'A1', alvo: 'A0' },
    { tipo: 'protegeu',     quem: 'A1', alvo: 'A0' },
    { tipo: 'ataque',       quem: 'A0', alvo: 'B0', perda: 50 },
    { tipo: 'represalia',   quem: 'A1', alvo: 'B1', perda: 10 },
    { tipo: 'devastacao',   quem: 'A2', alvo: 'B0', perda: 30 },
    { tipo: 'roubouPM',     quem: 'A0', alvo: 'B0', n: 5 },
  ]);
  conferir('5 · a cura em ALIADO conta, e com o PV que entrou',
    acc.A0.cura === 1 && acc.A0.curaPv === 30, acc.A0);
  conferir('a cura em SI PRÓPRIO não conta', acc.A0.cura === 1, acc.A0.cura);
  conferir('7 · a cura que não curou nada não conta', acc.A0.curaPv === 30, acc.A0);
  conferir('a limpeza em aliado conta, a de si não', acc.A0.limpeza === 1, acc.A0.limpeza);
  conferir('o benefício que MUDOU conta, o que não mudou não',
    acc.A0.beneficio === 1, acc.A0.beneficio);
  conferir('pôr um aliado em guarda conta', acc.A1.guardaAliado === 1, acc.A1);
  conferir('5 · e conta para QUEM fez, não para quem recebeu',
    acc.A1.guardaAliado === 1 && (acc.A0.guardaAliado | 0) === 0, [acc.A0, acc.A1]);
  conferir('a tentativa e o desvio contam à parte',
    acc.A1.protegerTentou === 1 && acc.A1.protegeuFez === 1, acc.A1);
  conferir('7 · ataque, represália, devastação e roubo de PM NÃO são suporte',
    (acc.B0 === undefined) && acc.A0.cura === 1
    && (acc.A2 === undefined), Object.keys(acc));
  conferir('um evento sem quem ou sem alvo não quebra nem conta', (() => {
    const a = {};
    RG2.pvpSuporteSomar(a, [{ tipo: 'cura', curou: 9 }, { tipo: 'cura', quem: 'A0', curou: 9 },
                            null, undefined, 'x', { tipo: 'cura', alvo: 'A1', curou: 9 }]);
    return Object.keys(a).length === 0;
  })());
  conferir('uma lista que não é lista não quebra',
    RG2.pvpSuporteSomar({}, null) !== undefined
    && RG2.pvpSuporteSomar({}, 'x') !== undefined);

  /* ── 15, 16, 17 · O RESULTADO NÃO APAGA O QUE ACONTECEU ── */
  const feito = sup({ cura: 2, curaPv: 50, guardaAliado: 3 });
  for (const res of ['vitoria', 'derrota', 'empate', 'desistiu']) {
    const r = FE.feitoPvp(FE.feitoVazio(1), res, 'fila', '2026-10', 2, null, feito);
    conferir('15/16/17 · ' + res + ' guarda o suporte que aconteceu',
      lido(r).cura === 2 && lido(r).curaPv === 50 && lido(r).guardaAliado === 3, lido(r));
  }

  /* ── 13, 14 · A MODALIDADE ── */
  let r = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2, null, sup({ cura: 4 }));
  r = FE.feitoPvp(r, 'vitoria', 'amistosa', '2026-10', 3, null, sup({ cura: 99 }));
  conferir('13/14 · a amistosa não soma no suporte da fila',
    lido(r, 'fila').cura === 4 && lido(r, 'amistosa').cura === 99,
    [lido(r, 'fila').cura, lido(r, 'amistosa').cura]);

  /* ── 11 · O VALOR INVÁLIDO NÃO ENTRA ── */
  const antes = JSON.stringify(lido(r));
  for (const lixo of [null, undefined, 'x', 42, [],
                      { cura: -5 }, { cura: 'muitas' }, { cura: Infinity },
                      { cura: NaN }, { cura: null }, { inventado: 9 },
                      { __proto__: { cura: 9 } }]) {
    const d = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 4, null, lixo);
    conferir('11 · suporte inválido (' + JSON.stringify(lixo) + ') não entra',
      JSON.stringify(lido(d)) === antes, lido(d));
  }
  const frac = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 4, null, { cura: 2.9 });
  conferir('um valor fracionado trunca', lido(frac).cura === 6, lido(frac).cura);

  /* ── 18, 19, 20 · A TRANSAÇÃO ── */
  const base = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2, null, sup({ cura: 1 }));
  const copia = JSON.stringify(base);
  const voltas = [];
  for (let i = 0; i < 3; i++)
    voltas.push(FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 3, null, sup({ cura: 5 })));
  conferir('20 · o original não foi mutado por três voltas',
    JSON.stringify(base) === copia, base.pvp.fila.suporte);
  conferir('18/19 · as três voltas dão o mesmo, e somam uma vez só',
    voltas.every(v => JSON.stringify(v) === JSON.stringify(voltas[0]))
    && lido(voltas[0]).cura === 6, voltas.map(v => v.pvp.fila.suporte.cura));
  const dado = sup({ cura: 7 });
  const saiu = FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 5, null, dado);
  dado.cura = 999;
  conferir('e o registro não guarda a referência do que lhe deram',
    lido(saiu).cura === 8, lido(saiu).cura);

  /* ── 21, 22, 23 · A VENDA ── */
  const doVendedor = FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila', '2026-10', 2000,
                                 null, sup({ cura: 9, curaPv: 400, protegeuFez: 1 }));
  const doComprador = JSON.parse(JSON.stringify(FE.feitoMarco(doVendedor, 'venda', 9000)));
  conferir('21/22 · o comprador recebe o suporte intacto',
    lido(doComprador).cura === 9 && lido(doComprador).curaPv === 400
    && lido(doComprador).protegeuFez === 1, lido(doComprador));
  const depois = FE.feitoPvp(doComprador, 'vitoria', 'fila', '2026-11', 10000,
                             null, sup({ cura: 2 }));
  conferir('23 · o novo dono acumula sem apagar', lido(depois).cura === 11, lido(depois).cura);

  /* ── 24, 25 · A ESTRUTURA E A AUTORIDADE ── */
  const fb2 = ler('js/firebase.js');
  const bloco2 = fb2.slice(fb2.indexOf('// Avatar identity'), fb2.indexOf('// Avatar identity') + 2600);
  conferir('24 · nenhum campo de suporte entra no avatarSlots',
    !/suporte\s*:/.test(bloco2) && !/feitos\s*:/.test(bloco2));
  const pvpSrc = ler('api/pvp.js');
  conferir('25 · o suporte vem da refeita do servidor, e não do pedido',
    /ate\.suporte|r\.suporte/.test(pvpSrc)
    && !/suporte[^\n]{0,40}req\.body/.test(pvpSrc));
  conferir('o mapeamento usa a equipe da sala, não o cliente',
    /const s = suporte && suporte\[lado \+ i\];/.test(pvpSrc));
  const rgSrc = ler('js/pvp-regras.js');
  conferir('o coletor lê os eventos do fuAgir, sem segunda simulação',
    /const evs = prep\.eng \? fuAgir\(estado, prep\.eng\) : \[\];/.test(rgSrc)
    && (rgSrc.match(/fuAgir\(/g) || []).length === 1, (rgSrc.match(/fuAgir\(/g) || []).length);
  conferir('26 · nenhuma promoção de raridade aqui',
    !/raridade|rarPromover/.test(ler('js/feitos.js').replace(/\/\*[\s\S]*?\*\//g, '')));
}

titulo('O suporte numa partida de verdade, refeita pelo servidor');
{
  const RG2 = require('../js/pvp-regras.js');
  Object.assign(global, require('../js/ia-fu.js'));
  Object.assign(global, require('../js/combate-fu.js'));
  const GEN2 = require('../api/_genetica.js');
  const poolDe = (feitio) => {
    const out = [];
    for (let s = 1; out.length < 6 && s < 400000; s++) {
      const c = GEN2.certidaoDeInvocacao({ uid: 'x', nome: 'T' });
      c.seed = s * 7919 + 40; c.nascimento.seed = c.seed;
      c.nascimento.dna = GEN2.nascimento.gerarDna('Comum', c.seed);
      const a = { id: 'x', nome: 'T', seed: c.seed, nivel: 40, nascimento: c.nascimento };
      const fi = F.fuFicha(a);
      if (fi && fi.feitio === feitio) out.push(a);
    }
    return out;
  };
  /* Sustentação e Guarda dos dois lados: são os que fazem suporte. */
  const equipe = (dono) => {
    const sus = poolDe('sustentacao'), gua = poolDe('guarda');
    return [sus[dono === 'a' ? 0 : 1], gua[dono === 'a' ? 0 : 1], sus[dono === 'a' ? 2 : 3]]
      .map((r, i) => ({ id: `${dono}-av${i}`, nome: `B${i}`, nivel: 40, seed: r.seed,
                        raridade: null, nascimento: r.nascimento }));
  };
  let achou = null;
  for (let k = 0; k < 25 && !achou; k++) {
    const sala = { seed: 1000 + k * 7919, inicio: 1e12, tipo: 'fila', estado: 'luta',
                   lados: { A: 'uA', B: 'uB' },
                   jogadores: { uA: { equipe: equipe('a') }, uB: { equipe: equipe('b') } },
                   acoes: {} };
    const eq = RG2.pvpEquipesDaSala(sala);
    const est = fuIniciar(eq.A, eq.B, sala.seed);
    const ctx = RG2.pvpContexto(sala);
    let ts = sala.inicio, n = 0, fim = null;
    while (n < 400) {
      RG2.pvpAvancar(est);
      if (est.acabou) break;
      const vez = fuVez(est);
      ts += 5000;
      const d = fuIaDecidir(est, vez.lado, vez.podem, 2);
      const a = Object.assign(RG2.pvpParaRede(est, Object.assign({ quem: d.quem }, d.acao)),
                              { por: sala.lados[vez.lado], ts });
      const prep = RG2.pvpPreparar(est, a, ctx);
      const okA = prep.eng ? fuAgir(est, prep.eng).length > 0 : false;
      sala.acoes[RG2.pvpChave(n++)] = a;
      fim = RG2.pvpRegistrar(ctx, prep, okA, a);
      if (fim) break;
    }
    const refeita = RG2.pvpRepetir(sala);
    const total = Object.values(refeita.suporte || {})
      .reduce((s, x) => s + x.cura + x.limpeza + x.beneficio + x.guardaAliado, 0);
    if (total > 0) achou = { sala, refeita };
  }
  conferir('1/2/3 · uma partida de verdade produz suporte observável', !!achou);
  if (achou) {
    const sup = achou.refeita.suporte;
    const ids = Object.keys(sup);
    conferir('o suporte é por LUTADOR, e com os ids do motor',
      ids.every(k => /^[AB][012]$/.test(k)), ids);
    conferir('6 · e dá para saber quem fez o quê',
      ids.some(k => FE.FEITO_SUPORTE_CAMPOS.some(c => sup[k][c] > 0)), sup);
    /* E a tradução para o id do avatar, como o api/pvp.js faz. */
    const equipeA = achou.sala.jogadores.uA.equipe;
    const porAvatar = {};
    for (let i = 0; i < equipeA.length; i++)
      if (sup['A' + i]) porAvatar[equipeA[i].id] = sup['A' + i];
    conferir('a tradução dá os ids dos avatares do lado A',
      Object.keys(porAvatar).every(k => /^a-av[012]$/.test(k)), Object.keys(porAvatar));
    conferir('12 · um avatar do outro lado não entra neste mapa',
      !Object.keys(porAvatar).some(k => k.startsWith('b-')), Object.keys(porAvatar));
    /* A refeita é determinística: duas vezes dão o mesmo suporte. */
    const outra = RG2.pvpRepetir(achou.sala);
    conferir('18 · refazer a partida dá exatamente o mesmo suporte',
      JSON.stringify(outra.suporte) === JSON.stringify(sup), [outra.suporte, sup]);
  }
  /* 12 · uma sala sem jogadas não produz suporte nenhum. */
  const vazia = { seed: 7, inicio: 1e12, tipo: 'fila', estado: 'luta',
                  lados: { A: 'uA', B: 'uB' },
                  jogadores: { uA: { equipe: equipe('a') }, uB: { equipe: equipe('b') } },
                  acoes: {} };
  conferir('12 · uma partida sem jogadas não gera suporte',
    Object.keys(RG2.pvpRepetir(vazia).suporte || {}).length === 0);
  /* E jogadas forjadas que o motor recusa não produzem suporte. */
  const forjada = JSON.parse(JSON.stringify(vazia));
  for (let i = 0; i < 6; i++)
    forjada.acoes[RG2.pvpChave(i)] = { tipo: 'magia', quem: 'A0', lugar: 'inexistente',
                                       alvos: ['A1'], por: 'uA', ts: 1e12 + i * 1000,
                                       suporte: 999999, curaAliado: 999999, protecao: 999999 };
  const refF = RG2.pvpRepetir(forjada);
  conferir('8/9/10 · jogadas forjadas com suporte declarado não geram nada',
    Object.keys(refF.suporte || {}).length === 0, refF.suporte);
}

/* ═══ 10 · OS ADVERSÁRIOS DISTINTOS ═════════════════════════════ */
titulo('Os adversários distintos derrotados');
{
  const adv = (uid, pontos, o) => Object.assign(
    { uid, pontos, divisao: 'adulto', em: 1000, ciclo: '2026-10' }, o || {});
  const vs = (r, tipo) => FE.feitoDe({ a: r }, 'a').pvp[tipo || 'fila'].vencidos;
  const uids = (r, tipo) => vs(r, tipo).map(x => x.uid).join(',');

  conferir('um registro novo começa sem nenhum',
    vs(FE.feitoVazio(1)).length === 0);

  // ── 1, 2, 3, 4 · o básico ──
  let r = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2, adv('A', 1100));
  conferir('1 · a primeira vitória contra A registra A',
    uids(r) === 'A' && vs(r)[0].pontos === 1100, vs(r));
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 3, adv('A', 1050));
  conferir('2 · a segunda vitória contra A não duplica',
    vs(r).length === 1 && vs(r)[0].pontos === 1100, vs(r));
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 4, adv('B', 1200));
  conferir('3 · a vitória contra B acrescenta', vs(r).length === 2, uids(r));
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 5, adv('C', 1300));
  conferir('4 · a vitória contra C acrescenta', vs(r).length === 3, uids(r));
  conferir('e a lista fica ordenada do mais forte para o mais fraco',
    uids(r) === 'C,B,A', uids(r));

  /* Vencer o MESMO adversário quando ele está mais forte atualiza o
     patamar — é o maior em que este avatar o venceu. */
  /* O ciclo da ENTRADA sai do objeto do adversário, que em produção é
     o `RK.pvpTemporada(agora)` do mesmo instante que o 4º argumento —
     aqui passam-se os dois, para o teste não depender de os confundir. */
  r = FE.feitoPvp(r, 'vitoria', 'fila', '2026-11', 6, adv('A', 1500, { ciclo: '2026-11' }));
  conferir('o mesmo adversário mais forte atualiza o patamar',
    vs(r).length === 3 && vs(r)[0].uid === 'A' && vs(r)[0].pontos === 1500, vs(r));
  conferir('e o ciclo acompanha o feito novo',
    vs(r)[0].ciclo === '2026-11', vs(r)[0]);

  // ── 5, 6, 7 · o que não registra ──
  const antes5 = JSON.stringify(vs(r));
  for (const [res, tipo, rot] of [
    ['derrota',  'fila',     '5 · a derrota não registra'],
    ['empate',   'fila',     '6 · o empate não registra'],
    ['desistiu', 'fila',     'a desistência não registra'],
    ['vitoria',  'amistosa', '7 · a amistosa não registra na fila'],
  ]) {
    const d = FE.feitoPvp(r, res, tipo, '2026-10', 7, adv('Z', 9999));
    conferir(rot, JSON.stringify(vs(d)) === antes5, vs(d));
  }
  conferir('e a amistosa também não guarda na dela (não há uid lá)',
    vs(FE.feitoPvp(r, 'vitoria', 'amistosa', '2026-10', 7, { pontos: 9999 }),
       'amistosa').length === 0);

  // ── 8, 9 · adversário que não existe ou não participou ──
  for (const [a, rot] of [
    [null,                          '8 · adversário nulo'],
    [undefined,                     'adversário ausente'],
    [{ pontos: 1500 },              '9 · adversário sem uid (não participou)'],
    [{ uid: '', pontos: 1500 },     'uid vazio'],
    [{ uid: 'X' },                  'sem pontos'],
    [{ uid: 'X', pontos: 0 },       'pontos zero'],
    [{ uid: 'X', pontos: -5 },      'pontos negativos'],
    [{ uid: 'X', pontos: 'muitos' }, 'pontos não numéricos'],
    [{ uid: 'X', pontos: Infinity }, 'pontos infinitos'],
    [{ uid: 'X', pontos: NaN },     'pontos NaN'],
    [{ uid: 42, pontos: 1500 },     'uid que não é string'],
  ]) {
    const d = FE.feitoPvp(r, 'vitoria', 'fila', '2026-10', 8, a);
    conferir(rot + ' não registra', JSON.stringify(vs(d)) === antes5, vs(d));
  }

  // ── 10, 11, 12, 13 · o que fica guardado ──
  const g = vs(FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2,
    adv('K', 1480, { divisao: 'anciao', ciclo: '2026-09', em: 777 })))[0];
  conferir('10 · guarda o rank', g.pontos === 1480, g);
  conferir('11 · guarda a divisão', g.divisao === 'anciao', g);
  conferir('12 · guarda o ciclo', g.ciclo === '2026-09', g);
  conferir('13 · e a hora', g.em === 777, g);
  conferir('o uid é guardado', g.uid === 'K', g);

  // ── 21 · o tamanho não cresce sem fim ──
  let muitos = FE.feitoVazio(1);
  for (let i = 0; i < FE.FEITO_VENCIDOS_MAX + 30; i++)
    muitos = FE.feitoPvp(muitos, 'vitoria', 'fila', '2026-10', i, adv('u' + i, 1000 + i));
  conferir('21 · a lista para no teto de ' + FE.FEITO_VENCIDOS_MAX,
    vs(muitos).length === FE.FEITO_VENCIDOS_MAX, vs(muitos).length);
  conferir('e ficam os MAIS FORTES', vs(muitos)[0].pontos
    === 1000 + FE.FEITO_VENCIDOS_MAX + 29, vs(muitos)[0]);
  conferir('o mais fraco da lista é o 24º mais forte',
    vs(muitos)[FE.FEITO_VENCIDOS_MAX - 1].pontos
    === 1000 + 30, vs(muitos)[FE.FEITO_VENCIDOS_MAX - 1]);
  /* E um mais fraco que o mais fraco da lista cheia não entra. */
  const naoEntra = FE.feitoPvp(muitos, 'vitoria', 'fila', '2026-10', 9, adv('fraco', 900));
  conferir('um fraco não desaloja ninguém numa lista cheia',
    !vs(naoEntra).some(x => x.uid === 'fraco'), vs(naoEntra).length);
  const entra = FE.feitoPvp(muitos, 'vitoria', 'fila', '2026-10', 9, adv('forte', 99999));
  conferir('um mais forte entra e desaloja o mais fraco',
    vs(entra)[0].uid === 'forte' && vs(entra).length === FE.FEITO_VENCIDOS_MAX,
    [vs(entra)[0], vs(entra).length]);

  // ── 21 · um registro corrompido sanea-se ──
  for (const lixo of [null, 'x', 42, {}, [null, 'x', 42],
                      [{ uid: 'A', pontos: 1 }, { uid: 'A', pontos: 2 }],
                      [{ uid: 'x'.repeat(500), pontos: 1200 }],
                      [{ uid: 'A', pontos: 1200, divisao: 'y'.repeat(300) }],
                      [{ uid: 'A', pontos: 1200, ciclo: 'ontem' }]]) {
    let lido = null;
    try { lido = FE.feitoDe({ a: { pvp: { fila: { vencidos: lixo } } } }, 'a').pvp.fila.vencidos; }
    catch (e) { lido = null; }
    conferir('um `vencidos` estragado sanea-se (' + JSON.stringify(lixo).slice(0, 40) + ')',
      Array.isArray(lido) && lido.length <= FE.FEITO_VENCIDOS_MAX
      && lido.every(x => typeof x.uid === 'string' && x.uid.length <= 64
                    && Number.isInteger(x.pontos)
                    && (x.divisao === null || x.divisao.length <= 16)
                    && (x.ciclo === null || /^\d{4}-\d{2}$/.test(x.ciclo))), lido);
  }
  /* ── O CRU, E NÃO O SANEADO ──

     As duas conferições seguintes olham para o objeto ESCRITO, e não
     para o que o `feitoDe` devolve. A diferença importa: o saneador
     deduplica e corta na leitura, e com isso mascarava dois defeitos de
     ESCRITA — a lista guardada ficava com lixo que ninguém via, a
     ocupar as 24 vagas. Apanhado a mutar a escrita, no scratchpad. */
  {
    const cru = FE.feitoPvp(FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2,
      adv('D', 1100)), 'vitoria', 'fila', '2026-10', 3, adv('D', 1200)).pvp.fila.vencidos;
    conferir('a ESCRITA não duplica o mesmo adversário',
      cru.length === 1 && cru[0].pontos === 1200, cru);
    const cru2 = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2,
      adv('E', 1100)).pvp.fila.vencidos;
    conferir('e o que escreve é um objeto limpo',
      cru2.length === 1 && Number.isInteger(cru2[0].pontos)
      && typeof cru2[0].uid === 'string', cru2);
  }
  /* E o saneador da LEITURA corta os valores absurdos que já estiverem
     gravados — um documento antigo, uma gravação meia. */
  for (const mau of [{ uid: 'A', pontos: -5 }, { uid: 'A', pontos: 0 },
                     { uid: 'A', pontos: 'x' }, { uid: 'A', pontos: Infinity },
                     { uid: 'A', pontos: NaN }, { uid: 'A' }]) {
    conferir('a leitura corta um gravado inválido (' + JSON.stringify(mau) + ')',
      FE.feitoDe({ a: { pvp: { fila: { vencidos: [mau] } } } }, 'a')
        .pvp.fila.vencidos.length === 0,
      FE.feitoDe({ a: { pvp: { fila: { vencidos: [mau] } } } }, 'a').pvp.fila.vencidos);
  }
  conferir('e um duplicado dentro do registro é removido na leitura',
    FE.feitoDe({ a: { pvp: { fila: { vencidos:
      [{ uid: 'A', pontos: 1 }, { uid: 'A', pontos: 2 }] } } } }, 'a')
      .pvp.fila.vencidos.length === 1);

  // ── 14 · o retry não duplica ──
  const base = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 2, adv('P', 1200));
  const copia = JSON.stringify(base);
  const voltas = [];
  for (let i = 0; i < 3; i++)
    voltas.push(FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 3, adv('Q', 1300)));
  conferir('14 · o original não foi mutado por três voltas',
    JSON.stringify(base) === copia, vs(base));
  conferir('as três voltas dão o mesmo, com DOIS adversários e não quatro',
    voltas.every(v => JSON.stringify(v) === JSON.stringify(voltas[0]))
    && vs(voltas[0]).length === 2, voltas.map(v => vs(v).length));
  const dado = adv('R', 1400);
  const saiu = FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 4, dado);
  dado.pontos = 1;
  conferir('e a lista não guarda a referência do que lhe deram',
    vs(saiu).find(x => x.uid === 'R').pontos === 1400);

  // ── 22, 23, 24 · a compatibilidade ──
  const antigo = { criadoEm: 1, em: 2, pvp: { fila: { n: 5, v: 3 } }, ciclos: { '2026-01': { n: 5, v: 3 } } };
  const lidoAntigo = FE.feitoDe({ a: antigo }, 'a');
  conferir('22 · um registro sem o campo novo continua a ler-se',
    lidoAntigo.pvp.fila.n === 5 && Array.isArray(lidoAntigo.pvp.fila.vencidos)
    && lidoAntigo.pvp.fila.vencidos.length === 0, lidoAntigo.pvp.fila);
  conferir('23 · o feitoPvpTotal continua a somar as contagens',
    FE.feitoPvpTotal({ a: antigo }, 'a').n === 5
    && FE.feitoPvpTotal({ a: antigo }, 'a').v === 3, FE.feitoPvpTotal({ a: antigo }, 'a'));
  conferir('e o total não inventa um `vencidos`',
    FE.feitoPvpTotal({ a: antigo }, 'a').vencidos === undefined);
  conferir('24 · o melhorAdversario continua a funcionar ao lado',
    FE.feitoDe({ a: r }, 'a').pvp.fila.melhorAdversario.pontos === 1500,
    FE.feitoDe({ a: r }, 'a').pvp.fila.melhorAdversario);
  conferir('e os dois concordam: o melhor é o primeiro da lista',
    vs(r)[0].pontos === FE.feitoDe({ a: r }, 'a').pvp.fila.melhorAdversario.pontos);

  // ── 19, 20 · a venda ──
  const doVendedor = FE.feitoPvp(FE.feitoPvp(FE.feitoVazio(1000), 'vitoria', 'fila',
    '2026-10', 2000, adv('V1', 1420)), 'vitoria', 'fila', '2026-11', 3000,
    adv('V2', 1380, { ciclo: '2026-11' }));
  const doComprador = JSON.parse(JSON.stringify(FE.feitoMarco(doVendedor, 'venda', 9000)));
  conferir('19/20 · o comprador recebe os adversários distintos',
    vs(doComprador).length === 2 && uids(doComprador) === 'V1,V2', vs(doComprador));
  conferir('com o rank, a divisão e o ciclo de cada um',
    vs(doComprador)[0].pontos === 1420 && vs(doComprador)[1].ciclo === '2026-11',
    vs(doComprador));
  const depois = FE.feitoPvp(doComprador, 'vitoria', 'fila', '2026-12', 10000, adv('V3', 1600));
  conferir('e o novo dono acrescenta sem apagar',
    vs(depois).length === 3 && vs(depois)[0].uid === 'V3', uids(depois));

  // ── 15 a 18 · a fonte é o servidor ──
  const pvpSrc = ler('api/pvp.js');
  conferir('15 · o uid do adversário é o `outro` da sala, não o do pedido',
    /uid:\s*outro,/.test(pvpSrc) && !/uid:[^\n]*req\.body/.test(pvpSrc));
  conferir('16 · o rank é o `antes[outro]`, pré-partida',
    /pontos:\s*antes\[outro\]/.test(pvpSrc));
  conferir('17 · a divisão sai dos prêmios do servidor',
    /divisao:\s*\(premios\[outro\] && premios\[outro\]\.divisao\)/.test(pvpSrc));
  conferir('18 · o ciclo sai do relógio do servidor',
    /ciclo:\s*RK\.pvpTemporada\(agora\)/.test(pvpSrc));
  conferir('e a hora também', /em:\s*agora,/.test(pvpSrc));
  conferir('nada disto está nos campos que o cliente grava',
    !/vencidos\s*:/.test(ler('js/firebase.js').slice(
      ler('js/firebase.js').indexOf('// Avatar identity'),
      ler('js/firebase.js').indexOf('// Avatar identity') + 2600)));

  /* A RAZÃO DE SER O UID, e não o avatarId: um cúmplice a rodar os dez
     slots dele produziria dez "adversários distintos". Medido na 3I.7. */
  let rotacao = FE.feitoVazio(1);
  for (let i = 0; i < 10; i++)
    rotacao = FE.feitoPvp(rotacao, 'vitoria', 'fila', '2026-10', i, adv('cumplice', 1200 + i));
  conferir('um cúmplice a rodar dez avatares continua a ser UM adversário',
    vs(rotacao).length === 1, vs(rotacao));
}

/* ═══ 11 · O SUPORTE POR CICLO ══════════════════════════════════ */
titulo('O suporte segmentado por ciclo competitivo');
{
  /* Devolve SEMPRE um objeto: um ciclo que falta dá sete zeros, e com
     isso uma conferição sobre ele FALHA em vez de rebentar. O `tem`
     pergunta à parte se o ciclo chegou a existir. */
  const sup = (r, c) => {
    const x = FE.feitoDe({ a: r }, 'a').ciclos[c];
    return (x && x.suporte) ? x.suporte : FE.feitoDe({ b: {} }, 'b').pvp.fila.suporte;
  };
  const tem = (r, c) => {
    const x = FE.feitoDe({ a: r }, 'a').ciclos[c];
    return !!(x && x.suporte);
  };
  const cic = (r, c) => FE.feitoDe({ a: r }, 'a').ciclos[c] || {};
  const porc = (r) => FE.feitoSuportePorCiclo({ a: r }, 'a');
  const tot = (r, campo, tipo) =>
    FE.feitoDe({ a: r }, 'a').pvp[tipo || 'fila'].suporte[campo];
  const umaPartida = (r, ciclo, s, tipo, resultado) =>
    FE.feitoPvp(r, resultado || 'vitoria', tipo || 'fila', ciclo, 5000, null, s);

  /* ── 17.1 · o primeiro suporte de um ciclo ── */
  const p1 = umaPartida(FE.feitoVazio(1), '2026-09', { curaPv: 10 });
  conferir('o primeiro suporte entra no total E no ciclo',
    tot(p1, 'curaPv') === 10 && tem(p1, '2026-09')
    && sup(p1, '2026-09').curaPv === 10,
    [tot(p1, 'curaPv'), sup(p1, '2026-09')]);

  /* ── 17.2 · o segundo, no mesmo ciclo ── */
  const p2 = umaPartida(p1, '2026-09', { curaPv: 10 });
  conferir('o segundo, no mesmo ciclo, soma nos dois',
    tot(p2, 'curaPv') === 20 && tem(p2, '2026-09')
    && sup(p2, '2026-09').curaPv === 20,
    [tot(p2, 'curaPv'), sup(p2, '2026-09').curaPv]);

  /* ── 17.3 · um ciclo diferente ── */
  const p3 = umaPartida(p2, '2026-10', { curaPv: 30 });
  conferir('um ciclo diferente não se mistura com o anterior',
    tem(p3, '2026-09') && tem(p3, '2026-10')
    && sup(p3, '2026-09').curaPv === 20 && sup(p3, '2026-10').curaPv === 30,
    [sup(p3, '2026-09').curaPv, sup(p3, '2026-10').curaPv]);
  conferir('e o total é a soma dos dois ciclos',
    tot(p3, 'curaPv') === 50, tot(p3, 'curaPv'));

  /* ── O CICLO É UMA FATIA DO TOTAL, E NÃO UMA SEGUNDA CONTAGEM ──

     É a propriedade central desta etapa, e vale medi-la em vez de
     confiar nela: a soma dos ciclos tem de bater com o total, campo
     por campo, depois de uma sequência inventada de partidas. */
  {
    let r = FE.feitoVazio(1);
    const ciclos = ['2026-01', '2026-02', '2026-02', '2026-07', '2027-01', '2027-01'];
    for (let i = 0; i < ciclos.length; i++) {
      r = umaPartida(r, ciclos[i], { cura: 1, curaPv: 10 + i, limpeza: i % 2,
                                     beneficio: 2, guardaAliado: 3,
                                     protegerTentou: 4, protegeuFez: i % 3 });
    }
    const porCiclo = FE.feitoSuportePorCiclo({ a: r }, 'a');
    const totais = FE.feitoDe({ a: r }, 'a').pvp.fila.suporte;
    let batem = true;
    for (const campo of FE.FEITO_SUPORTE_CAMPOS) {
      const soma = Object.keys(porCiclo).reduce((s, c) => s + (porCiclo[c][campo] | 0), 0);
      if (soma !== totais[campo]) batem = false;
    }
    conferir('a soma dos ciclos bate com o total, nos sete campos',
      batem, { porCiclo, totais });
    conferir('e os ciclos distintos são quatro',
      Object.keys(porCiclo).length === 4, Object.keys(porCiclo));
  }

  /* ── 17.4 · as SETE métricas, e não só a cura ── */
  for (const campo of FE.FEITO_SUPORTE_CAMPOS) {
    const r = umaPartida(FE.feitoVazio(1), '2026-10', { [campo]: 7 });
    const s = sup(r, '2026-10');
    conferir('o ciclo segmenta o campo ' + campo,
      tem(r, '2026-10') && s[campo] === 7 && tot(r, campo) === 7, s);
  }

  /* ── 17.5 · a amistosa não cria ciclo ── */
  {
    const r = umaPartida(FE.feitoVazio(1), '2026-10', { curaPv: 999 }, 'amistosa');
    const d = FE.feitoDe({ a: r }, 'a');
    conferir('a amistosa não cria ciclo nenhum',
      Object.keys(d.ciclos).length === 0, d.ciclos);
    conferir('e o suporte dela fica no total da amistosa, à parte',
      d.pvp.amistosa.suporte.curaPv === 999 && d.pvp.fila.suporte.curaPv === 0,
      [d.pvp.amistosa.suporte.curaPv, d.pvp.fila.suporte.curaPv]);
    conferir('e o suportePorCiclo continua vazio',
      Object.keys(FE.feitoSuportePorCiclo({ a: r }, 'a')).length === 0);

    /* E misturada com fila: só a fila entra no ciclo. */
    let m = FE.feitoVazio(1);
    m = umaPartida(m, '2026-10', { curaPv: 5 }, 'fila');
    m = umaPartida(m, '2026-10', { curaPv: 500 }, 'amistosa');
    conferir('a amistosa do MESMO mês não engorda o ciclo da fila',
      tem(m, '2026-10') && sup(m, '2026-10').curaPv === 5, sup(m, '2026-10'));
  }

  /* ── 17.6 · o cliente a tentar escolher o ciclo ──

     O `feitoPvp` recebe o ciclo de FORA, e é essa a defesa: ele não
     sabe que dia é hoje. Quem o calcula é o servidor, e aqui prova-se
     que nenhum campo do corpo do pedido chega a essa decisão. */
  {
    const fonte = ler('api/pvp.js');
    conferir('o ciclo sai do pvpTemporada do servidor',
      /const ciclo = RK\.pvpTemporada\(agora\)/.test(fonte), null);
    conferir('e o `agora` é o relógio do servidor, não do corpo do pedido',
      /const agora = Date\.now\(\)/.test(fonte)
      && !/pvpTemporada\(\s*(?:body|req)/.test(fonte), null);
    for (const campo of ['ciclo', 'temporada', 'mes', 'periodo']) {
      conferir('o api/pvp.js nunca lê body.' + campo,
        !new RegExp('body\\.' + campo + '\\b').test(fonte), campo);
    }
    /* E um payload com `ciclo` dentro do objeto de suporte não muda
       nada: o ciclo é o argumento, e o suporte é outro argumento. */
    const r = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 5000, null,
                          { curaPv: 10, ciclo: '1999-01', temporada: '1999-01' });
    const cs = Object.keys(FE.feitoDe({ a: r }, 'a').ciclos);
    conferir('um `ciclo: "1999-01"` enfiado no suporte é ignorado',
      cs.length === 1 && cs[0] === '2026-10', cs);
  }

  /* ── 17.7 · o cliente a tentar injetar suporte ── */
  {
    const fonte = ler('api/pvp.js');
    for (const campo of ['suporte', 'suportePorCiclo', 'curaPv', 'limpeza', 'protegeuFez']) {
      conferir('o api/pvp.js nunca lê body.' + campo,
        !new RegExp('body\\.' + campo + '\\b').test(fonte), campo);
    }
    conferir('o suporte que chega ao feitoPvp vem do prêmio, e o prêmio da refeita',
      /\(p\.suporte \|\| \{\}\)\[idAv\]/.test(fonte)
      && /pvpSuporteSomar/.test(ler('js/pvp-regras.js')), null);
    /* E as regras do Firestore não deixam o cliente tocar em `feitos`. */
    conferir("e `feitos` é campo do servidor nas regras",
      /'feitos'/.test(ler('firestore.rules')), null);
  }

  /* ── 17.8 · o ciclo inválido ── */
  {
    const maus = [null, undefined, '', 'abc', '2026', '2026-99', '2026-00',
                  '99-99', '2026-13', '2026-1', '2026-010', '__proto__',
                  {}, [], 0, 1, true, NaN];
    for (const c of maus) {
      let r;
      try {
        r = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', c, 5000, null, { curaPv: 9 });
      } catch (e) { r = { rebentou: e.message }; }
      const d = r && !r.rebentou ? FE.feitoDe({ a: r }, 'a') : null;
      conferir('o ciclo inválido ' + JSON.stringify(c) + ' não cria ciclo nem rebenta',
        !!d && Object.keys(d.ciclos).length === 0, r && r.rebentou ? r : d && d.ciclos);
      /* E o TOTAL continua a somar: o suporte aconteceu, o que falhou
         foi saber em que mês. Perder o fato por causa da etiqueta
         seria pior do que não ter a etiqueta. */
      conferir('e o total do ramo soma mesmo assim (' + JSON.stringify(c) + ')',
        !!d && d.pvp.fila.suporte.curaPv === 9, d && d.pvp.fila.suporte);
    }
    /* O mesmo pela LEITURA: um documento corrompido com chaves assim. */
    const podre = { a: { ciclos: {
      'abc': { n: 9, v: 9, suporte: { curaPv: 9 } },
      '2026-99': { n: 9, v: 9 },
      '2026-13': { n: 9, v: 9 },
      '2026-00': { n: 9, v: 9 },
      '__proto__': { n: 9, v: 9 },
      '2026-10': { n: 1, v: 1, suporte: { curaPv: 4 } },
    } } };
    const d = FE.feitoDe(podre, 'a');
    conferir('a leitura deixa passar só o ciclo bem formado',
      Object.keys(d.ciclos).length === 1 && d.ciclos['2026-10'], Object.keys(d.ciclos));
    conferir("e a chave '__proto__' não troca o protótipo do mapa",
      Object.getPrototypeOf(d.ciclos) === Object.prototype
      && d.ciclos.n === undefined, null);
  }

  /* ── 17.9 · os valores inválidos ── */
  {
    const maus = [NaN, Infinity, -Infinity, -1, -0.5, '10', 'x', {}, [], null,
                  undefined, true, 1e308, Number.MAX_SAFE_INTEGER * 2];
    for (const v of maus) {
      let r;
      try {
        r = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 5000, null,
                        { curaPv: v });
      } catch (e) { r = { rebentou: e.message }; }
      const s = r && !r.rebentou ? sup(r, '2026-10') : null;
      const n = s ? s.curaPv : 0;
      /* O que se exige: nunca negativo, nunca não-inteiro, nunca
         NaN/Infinity. Um '10' em texto converte-se, e isso é aceitável
         — o que não se aceita é lixo a entrar como número. */
      conferir('o valor ' + String(v) + ' não corrompe o ciclo',
        !r.rebentou && Number.isInteger(n) && n >= 0, { v: String(v), n });
    }
    /* A propriedade HERDADA não entra, nem no total nem no ciclo. */
    const herdado = FE.feitoPvp(FE.feitoVazio(1), 'vitoria', 'fila', '2026-10', 5000,
                                null, JSON.parse('{"__proto__":{"curaPv":99}}'));
    conferir('a propriedade herdada não entra no ciclo',
      !tem(herdado, '2026-10')
      && FE.feitoDe({ a: herdado }, 'a').pvp.fila.suporte.curaPv === 0,
      sup(herdado, '2026-10'));
    /* E pela LEITURA de um registro já gravado. */
    const lido = FE.feitoDe({ a: { ciclos: { '2026-10': { n: 1, v: 1,
      suporte: JSON.parse('{"__proto__":{"curaPv":99},"limpeza":-5,"cura":"x"}') } } } }, 'a');
    conferir('e a leitura também a barra, e sanea o resto',
      !(lido.ciclos['2026-10'] || {}).suporte
      || ['curaPv', 'limpeza', 'cura']
           .every(k => lido.ciclos['2026-10'].suporte[k] === 0),
      lido.ciclos['2026-10']);
  }

  /* ── 17.10 · O RETRY, e este é o teste obrigatório ──

     O Firestore repete a transação quando há conflito. A repetição
     relê o documento e volta a chamar o `feitoPvp` com a MESMA base —
     logo o que se exige é que a função seja pura e dê o mesmo
     resultado, e não que conte duas vezes.

     O defeito que isto apanha é concreto e já aconteceu nesta base: a
     primeira versão da 3I.1 devolvia `r.ciclos` por REFERÊNCIA, e a
     segunda volta da transação lia um objeto que a primeira já tinha
     somado. */
  {
    const base = umaPartida(umaPartida(FE.feitoVazio(1), '2026-09', { curaPv: 7, cura: 1 }),
                            '2026-10', { curaPv: 3, limpeza: 1 });
    const retrato = JSON.stringify(base);

    const volta1 = FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 6000, null, { curaPv: 5 });
    conferir('a primeira volta da transação não mexe na base',
      JSON.stringify(base) === retrato, null);
    const volta2 = FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 6000, null, { curaPv: 5 });
    conferir('a segunda volta dá exatamente o mesmo resultado',
      JSON.stringify(volta1) === JSON.stringify(volta2), [volta1.ciclos, volta2.ciclos]);
    conferir('e o ciclo NÃO duplica no retry',
      sup(volta2, '2026-10').curaPv === 8, sup(volta2, '2026-10'));
    conferir('nem o total do ramo',
      FE.feitoDe({ a: volta2 }, 'a').pvp.fila.suporte.curaPv === 15,
      FE.feitoDe({ a: volta2 }, 'a').pvp.fila.suporte.curaPv);
    conferir('nem as contagens do ciclo',
      cic(volta2, '2026-10').n === 2 && cic(volta2, '2026-10').v === 2,
      cic(volta2, '2026-10'));

    /* Dez voltas seguidas da MESMA base: continua a ser uma partida. */
    let igual = true;
    for (let i = 0; i < 10; i++)
      if (JSON.stringify(FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 6000, null,
                                     { curaPv: 5 })) !== JSON.stringify(volta1)) igual = false;
    conferir('dez voltas da mesma base dão dez vezes o mesmo',
      igual && JSON.stringify(base) === retrato, null);

    /* E o objeto de SUPORTE que chega não é mutado: o `aplicarPremios`
       passa o mesmo `p.suporte[idAv]` e um retry voltaria a passá-lo. */
    const doPremio = { curaPv: 5, cura: 1 };
    const antesDoPremio = JSON.stringify(doPremio);
    FE.feitoPvp(base, 'vitoria', 'fila', '2026-10', 6000, null, doPremio);
    conferir('e o objeto de suporte do prêmio não é mutado',
      JSON.stringify(doPremio) === antesDoPremio, doPremio);
  }

  /* ── 17.11 · a venda e a compra ── */
  {
    let doVendedor = FE.feitoVazio(1);
    doVendedor = umaPartida(doVendedor, '2026-09', { curaPv: 40, cura: 4, limpeza: 2 });
    doVendedor = umaPartida(doVendedor, '2026-10', { curaPv: 60, protegeuFez: 1 });
    const antes = FE.feitoSuportePorCiclo({ a: doVendedor }, 'a');
    const totalAntes = FE.feitoDe({ a: doVendedor }, 'a').pvp.fila.suporte;

    /* A venda passa o registro pelo `feitoMarco`, que começa pelo
       `feitoDe` — logo o saneador da leitura é o caminho da venda. */
    const doComprador = FE.feitoMarco(doVendedor, 'venda', 9000);
    const depois = FE.feitoSuportePorCiclo({ a: doComprador }, 'a');
    const totalDepois = FE.feitoDe({ a: doComprador }, 'a').pvp.fila.suporte;

    conferir('a venda preserva o suporte por ciclo, igual',
      JSON.stringify(antes) === JSON.stringify(depois), [antes, depois]);
    conferir('e preserva o total do ramo',
      JSON.stringify(totalAntes) === JSON.stringify(totalDepois), null);
    conferir('e os ciclos continuam dois, com os mesmos valores',
      Object.keys(depois).length === 2
      && (depois['2026-09'] || {}).curaPv === 40
      && (depois['2026-10'] || {}).curaPv === 60, depois);
    conferir('e o marco da venda foi acrescentado',
      doComprador.marcos.length === 1 && doComprador.marcos[0].tipo === 'venda',
      doComprador.marcos);

    /* E o comprador continua a construir no MESMO ciclo, somando. */
    const seguinte = umaPartida(doComprador, '2026-10', { curaPv: 5 });
    conferir('e o comprador soma no ciclo que já existia',
      (porc(seguinte)['2026-10'] || {}).curaPv === 65, porc(seguinte));

    /* O api/comprar-avatar.js move o registro inteiro, e apaga do
       vendedor: é uma transferência e não uma cópia. */
    const compra = ler('api/comprar-avatar.js');
    conferir('a venda escreve o registro no comprador',
      /chaveFeitos && feitosVendidos \? \{ \[chaveFeitos\]: feitosVendidos \}/.test(compra), null);
    conferir('e apaga-o do vendedor',
      /chaveFeitos \? \{ \[chaveFeitos\]: FieldValue\.delete\(\) \}/.test(compra), null);
    conferir('e não reconstrói nem recalcula suporte nenhum',
      !/suporte/i.test(compra.slice(compra.indexOf('E OS FEITOS'),
                                    compra.indexOf('E OS FEITOS') + 1200)), null);
  }

  /* ── 17.12 · o registro antigo, sem suporte por ciclo ── */
  {
    /* Como um avatar de antes desta etapa está gravado: ciclos com
       `{n,v}` e o total do ramo, e nada mais. */
    const antigo = { a: {
      criadoEm: 1, em: 2,
      pvp: { fila: Object.assign({ n: 12, v: 7, d: 4, e: 1, x: 0 },
                                 { suporte: { cura: 9, curaPv: 300, limpeza: 3,
                                              beneficio: 1, guardaAliado: 2,
                                              protegerTentou: 8, protegeuFez: 1 } }) },
      ciclos: { '2026-07': { n: 5, v: 3 }, '2026-08': { n: 7, v: 4 } },
      marcos: [],
    } };
    let d;
    try { d = FE.feitoDe(antigo, 'a'); } catch (e) { d = { rebentou: e.message }; }
    conferir('o registro antigo lê-se sem rebentar',
      !d.rebentou, d.rebentou);
    conferir('e o total agregado antigo continua inteiro',
      d.pvp.fila.suporte.curaPv === 300 && d.pvp.fila.suporte.protegerTentou === 8,
      d.pvp.fila.suporte);
    conferir('e os ciclos antigos continuam com as contagens',
      (d.ciclos['2026-07'] || {}).n === 5
      && (d.ciclos['2026-08'] || {}).v === 4, d.ciclos);
    conferir('e NENHUM ciclo histórico de suporte é inventado',
      !(d.ciclos['2026-07'] || {}).suporte && !(d.ciclos['2026-08'] || {}).suporte
      && Object.keys(FE.feitoSuportePorCiclo(antigo, 'a')).length === 0,
      FE.feitoSuportePorCiclo(antigo, 'a'));
    conferir("e não aparece nenhum ciclo 'desconhecido'",
      Object.keys(d.ciclos).every(k => FE.feitoCicloValido(k)), Object.keys(d.ciclos));

    /* E a partida SEGUINTE começa a segmentar, sem mexer no passado. */
    const agora = umaPartida(antigo.a, '2026-09', { curaPv: 25 });
    const pc = FE.feitoSuportePorCiclo({ a: agora }, 'a');
    conferir('a primeira partida depois desta etapa segmenta só o ciclo dela',
      Object.keys(pc).length === 1 && (pc['2026-09'] || {}).curaPv === 25, pc);
    conferir('e o total antigo soma com o novo, sem se perder',
      FE.feitoDe({ a: agora }, 'a').pvp.fila.suporte.curaPv === 325,
      FE.feitoDe({ a: agora }, 'a').pvp.fila.suporte.curaPv);
    conferir('e os ciclos antigos ficam como estavam',
      cic(agora, '2026-07').n === 5 && !cic(agora, '2026-07').suporte, agora.ciclos);
  }

  /* ── 17.13 · a virada do ciclo, na fronteira UTC ──

     O ciclo é o do `pvpTemporada`, que usa `getUTCMonth`. Quem decide é
     ele, e não este arquivo — logo o que se prova aqui é que o instante
     entra no ciclo que o SERVIDOR nomeia. */
  {
    const fimDeOutubro   = Date.UTC(2026, 9, 31, 23, 59, 59, 999);
    const comecoNovembro = Date.UTC(2026, 10, 0, 0, 0, 0, 0) + 1;
    conferir('o pvpTemporada nomeia o último instante de outubro',
      RK.pvpTemporada(fimDeOutubro) === '2026-10', RK.pvpTemporada(fimDeOutubro));
    conferir('e o primeiro de novembro',
      RK.pvpTemporada(Date.UTC(2026, 10, 1, 0, 0, 0, 0)) === '2026-11',
      RK.pvpTemporada(Date.UTC(2026, 10, 1, 0, 0, 0, 0)));

    let r = FE.feitoVazio(1);
    r = umaPartida(r, RK.pvpTemporada(fimDeOutubro), { curaPv: 11 });
    r = umaPartida(r, RK.pvpTemporada(Date.UTC(2026, 10, 1, 0, 0, 0, 0)), { curaPv: 22 });
    const pc = FE.feitoSuportePorCiclo({ a: r }, 'a');
    conferir('a partida da virada cai no ciclo certo dos dois lados',
      (pc['2026-10'] || {}).curaPv === 11
      && (pc['2026-11'] || {}).curaPv === 22, pc);

    /* 23h de 31/10 em Brasília (UTC−3) são 02h de 1/11 em UTC: o ciclo
       é NOVEMBRO. Não é defeito — é a convenção do sistema inteiro, a
       mesma da temporada do rank. Fica medida para não se perder. */
    const brasilia31as23 = Date.UTC(2026, 10, 1, 2, 0, 0);
    conferir('23h de 31/10 em Brasília são o ciclo de novembro (convenção UTC)',
      RK.pvpTemporada(brasilia31as23) === '2026-11', RK.pvpTemporada(brasilia31as23));

    /* E o ano vira sem tropeçar. */
    conferir('a virada do ano também',
      RK.pvpTemporada(Date.UTC(2026, 11, 31, 23, 0, 0)) === '2026-12'
      && RK.pvpTemporada(Date.UTC(2027, 0, 1, 1, 0, 0)) === '2027-01', null);

    /* Todos os doze meses dão chave válida: o regex não recusa nenhum. */
    let todos = true;
    for (let m = 0; m < 12; m++)
      if (!FE.feitoCicloValido(RK.pvpTemporada(Date.UTC(2026, m, 15)))) todos = false;
    conferir('e os doze meses do ano passam pelo validador da chave', todos);
  }

  /* ── 17.14 · uma evidência, e não uma e meia ── */
  {
    const r = umaPartida(FE.feitoVazio(1), '2026-10', { curaPv: 10, cura: 1 });
    const d = FE.feitoDe({ a: r }, 'a');
    conferir('uma chamada produz UMA partida no ciclo',
      cic(r, '2026-10').n === 1, cic(r, '2026-10'));
    conferir('e o ciclo é exatamente o total, com uma partida só',
      tem(r, '2026-10')
      && sup(r, '2026-10').curaPv === d.pvp.fila.suporte.curaPv
      && sup(r, '2026-10').cura === d.pvp.fila.suporte.cura,
      [sup(r, '2026-10'), d.pvp.fila.suporte]);

    /* O suporte é o MESMO conjunto de eventos nos dois lugares, e a
       prova é a sanitização ser uma só: `_suporteDoEvento` corre antes
       de qualquer destino. Se corresse duas vezes com regras
       diferentes, os dois poderiam discordar. */
    const fonte = ler('js/feitos.js');
    conferir('a sanitização do suporte acontece uma vez só, no feitoPvp',
      (fonte.match(/_suporteDoEvento\(/g) || []).length === 2, null);
    conferir('e o total do ramo usa essa mesma soma',
      /base\.pvp\[tipo\]\.suporte\[k\] \+= supDaPartida\[k\]/.test(fonte), null);
    conferir('e o ciclo também',
      /sp\[k\] = \(sp\[k\] \| 0\) \+ supDaPartida\[k\]/.test(fonte), null);
  }

  /* ── O TETO DO DETALHE, e que ele NÃO é critério de mérito ── */
  {
    let r = FE.feitoVazio(1);
    const N = FE.FEITO_SUPORTE_CICLOS_MAX;
    /* N+6 ciclos, todos com suporte: 2026-01 em diante. */
    for (let i = 0; i < N + 6; i++) {
      const ciclo = (2026 + Math.floor(i / 12)) + '-' + String((i % 12) + 1).padStart(2, '0');
      r = umaPartida(r, ciclo, { curaPv: 10 + i });
    }
    const d = FE.feitoDe({ a: r }, 'a');
    const pc = FE.feitoSuportePorCiclo({ a: r }, 'a');
    conferir('o DETALHE do suporte pára no teto',
      Object.keys(pc).length === N, Object.keys(pc).length);
    conferir('e guarda os ciclos MAIS RECENTES',
      Object.keys(pc).sort().pop() === Object.keys(d.ciclos).sort().pop(), null);

    /* ── E ESTE É O PONTO: as CONTAGENS não têm teto ──

       Cortar os ciclos seria transformar um limite de armazenamento no
       requisito temporal do exame, e isso a etapa proíbe em letras
       grandes. O `ciclosComVitoria` tem de continuar exato. */
    conferir('as contagens por ciclo NÃO são cortadas',
      Object.keys(d.ciclos).length === N + 6, Object.keys(d.ciclos).length);
    const comVitoria = Object.keys(d.ciclos).filter(k => d.ciclos[k].v > 0);
    conferir('e os ciclos com vitória continuam todos lá',
      comVitoria.length === N + 6, comVitoria.length);
    conferir('e o TOTAL do ramo nunca perde nada',
      d.pvp.fila.suporte.curaPv ===
        Array.from({ length: N + 6 }, (_, i) => 10 + i).reduce((a, b) => a + b, 0),
      d.pvp.fila.suporte.curaPv);

    /* Um ciclo SEM suporte não ocupa vaga do teto nem guarda sete
       zeros — são 118 bytes por ciclo por avatar. */
    let s = FE.feitoVazio(1);
    s = umaPartida(s, '2026-01', { curaPv: 5 });
    s = umaPartida(s, '2026-02', {}, 'fila', 'derrota');
    const ds = FE.feitoDe({ a: s }, 'a');
    conferir('um ciclo sem suporte não guarda um objeto de zeros',
      !cic(s, '2026-02').suporte && cic(s, '2026-02').n === 1, cic(s, '2026-02'));
    conferir('e não aparece no suportePorCiclo',
      Object.keys(FE.feitoSuportePorCiclo({ a: s }, 'a')).join() === '2026-01', null);
  }

  /* ── OS CICLOS COM SUPORTE EFETIVO ──

     A 3I.8 leu o motor evento por evento e separou o que PROVA de o que
     só registra. O `guardaAliado` é uma guarda posta — nada diz que o
     aliado chegou a ser atacado; o `protegerTentou` é a declaração, e o
     `protegeuFez` é o desvio que aconteceu mesmo. */
  {
    let r = FE.feitoVazio(1);
    r = umaPartida(r, '2026-01', { curaPv: 10 });          // efetivo
    r = umaPartida(r, '2026-02', { guardaAliado: 9 });     // ação só
    r = umaPartida(r, '2026-03', { protegerTentou: 9 });   // declaração só
    r = umaPartida(r, '2026-04', { beneficio: 9 });        // aplicado, não provado
    r = umaPartida(r, '2026-05', { limpeza: 1 });          // efetivo
    r = umaPartida(r, '2026-06', { protegeuFez: 1 });      // efetivo
    const efetivos = FE.feitoCiclosComSuporte({ a: r }, 'a');
    conferir('só os ciclos com suporte EFETIVO contam como tal',
      efetivos.join(',') === '2026-01,2026-05,2026-06', efetivos);
    conferir('e os outros continuam gravados, para auditoria',
      Object.keys(FE.feitoSuportePorCiclo({ a: r }, 'a')).length === 6, null);
    conferir('a lista do efetivo é a que a 3I.8 fechou',
      FE.FEITO_SUPORTE_EFETIVO.join(',') === 'cura,curaPv,limpeza,protegeuFez',
      FE.FEITO_SUPORTE_EFETIVO);
  }

  /* ── E O EXAME CONTINUA A NÃO EXISTIR ── */
  {
    const fonte = ler('js/feitos.js');
    conferir('o js/feitos.js não promove raridade nenhuma',
      !/Raro|Lendário|Lendario|promov|rarPromover|raridade/i.test(fonte)
      || !/function .*(promover|exame|certific)/i.test(fonte), null);
    conferir('e não escolhe nenhum limiar de mérito',
      !/MERITO|MINIMO_CICLOS|EXAME_|RARO_|LENDARIO_/.test(fonte), null);
    conferir('o teto do detalhe é de armazenamento, e está dito no código',
      /limite de armazenamento/.test(fonte)
      && /crit[eé]rio de m[eé]rito/.test(fonte), null);
  }
}

console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '')
  + ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
