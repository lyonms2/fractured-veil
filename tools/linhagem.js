// ═══════════════════════════════════════════════════════════════════
// LINHAGEM — o filho puxa aos pais, mas não é a média deles
//
// A pergunta é a mesma que a genética faz sempre: isto é herança ou é
// um sorteio com nomes bonitos por cima?
//
//   1. o sexo sai da regra e não de uma excepção — nunca nasce um YY
//   2. cada alelo do filho veio mesmo de um dos pais, e de nenhum outro
//      sítio
//   3. dois pais fortes tendem a dar filhos fortes — mas nem sempre
//   4. o que está escondido viaja: um alelo que nenhum dos pais mostra
//      pode ser o que o filho mostra
//   5. e a cor não converge: ao fim de gerações continua a haver
//      colónia de todas as cores, que é o que a mistura estragaria
//
// Correr:  node tools/linhagem.js
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');

const NL = String.fromCharCode(10);
const RE_FASE = new RegExp('^const (FASE_MIN_SECS|faseFromNivel|faseFromAge)');
const LINHAS_DA_FASE = fs.readFileSync(path.join(RAIZ, 'js/state.js'), 'utf8')
  .split(NL).filter(l => RE_FASE.test(l)).join(NL);

const M = new Function('t',
  LINHAS_DA_FASE + NL +
  rd('cores.js') + rd('nascimento.js') + rd('raridade.js') + rd('reproducao.js') +
  rd('vantagens.js') + rd('ficha-3dt.js') + rd('magias.js') +
  `return { nascer, gerarDna, registarNascimento, sexoDe, sexoDoDna, indoleDominante,
            tendenciaDoDna, dnaLegivel, NASC_CARACS, CORES_RODA,
            podeCruzar, cruzar, cruzarDna, ovoPronto, faltaParaChocar, REPR_INCUBACAO_MS,
            fichaDeAvatar, magiasDoAvatar, faseDoSlot };`
)(x => x);

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK   ', titulo.padEnd(54), '· ' + detalhe); }
  else      { falhou++; console.log('  FALHOU', titulo.padEnd(53), '· ' + detalhe); }
}
function titulo(txt) { console.log(''); console.log('─── ' + txt + ' ' + '─'.repeat(Math.max(0, 56 - txt.length))); }

const ADULTO = 20 * 3600 + 1;   // horas de jogo que a fase 3 pede

// Um avatar adulto, pronto a cruzar.
function adulto(seed, nome) {
  const s = { nome: nome || ('av' + seed), seed, nivel: 30, totalSecs: ADULTO,
              raridade: 'Lendário', elemento: 'Terra', id: 'av_' + seed };
  M.registarNascimento(s, { origem: 'Comum', seed });
  return s;
}

// Um casal: macho e fêmea, procurados por seed até calharem.
function casal(base) {
  let m = null, f = null, i = base;
  while ((!m || !f) && i < base + 400) {
    const a = adulto(i++);
    if (M.sexoDe(a) === 'M' && !m) m = a;
    else if (M.sexoDe(a) === 'F' && !f) f = a;
  }
  return { mae: f, pai: m };
}

// ═══════════════════════════════════════════════════════════════════
titulo('QUEM PODE CRUZAR');

{
  const { mae, pai } = casal(1000);
  ok(M.podeCruzar(mae, pai).ok, 'dois adultos de sexos diferentes podem',
     M.sexoDe(mae) + ' + ' + M.sexoDe(pai));

  const outroM = adulto(1);
  const machos = M.sexoDe(outroM) === 'M' ? [pai, outroM] : null;
  const doisIguais = M.podeCruzar(mae, adulto(mae.seed + 100000));
  const mesmoSexo = (() => {
    for (let i = 5000; i < 5400; i++) {
      const a = adulto(i);
      if (M.sexoDe(a) === M.sexoDe(mae) && a.id !== mae.id) return M.podeCruzar(mae, a);
    }
    return null;
  })();
  ok(mesmoSexo && !mesmoSexo.ok && mesmoSexo.motivo === 'repr.erro.mesmo_sexo',
     'dois do mesmo sexo não podem', mesmoSexo ? mesmoSexo.motivo : '(não achei par)');

  const bebe = { ...adulto(77), nivel: 2, totalSecs: 60 };
  const r = M.podeCruzar(mae, bebe);
  ok(!r.ok && r.motivo === 'repr.erro.novo', 'um que ainda não é adulto não pode', r.motivo);

  const morto = { ...adulto(78), dead: true };
  ok(!M.podeCruzar(mae, morto).ok, 'um morto não pode', M.podeCruzar(mae, morto).motivo);

  const avenda = { ...adulto(79), listed: true };
  ok(!M.podeCruzar(mae, avenda).ok, 'um que está à venda não pode', M.podeCruzar(mae, avenda).motivo);

  ok(!M.podeCruzar(mae, mae).ok, 'consigo próprio não pode', M.podeCruzar(mae, mae).motivo);

  const cheio = M.podeCruzar(mae, pai, { ovosNoInventario: 10, maxOvos: 10 });
  ok(!cheio.ok && cheio.motivo === 'repr.erro.cheio',
     'com o inventário de ovos cheio não pode', cheio.motivo);
}

// ═══════════════════════════════════════════════════════════════════
titulo('O SEXO SAI DA REGRA');

{
  const { mae, pai } = casal(2000);
  let machos = 0, yy = 0, n = 0;
  for (let i = 0; i < 20000; i++) {
    const d = M.cruzarDna(mae.nascimento.dna, pai.nascimento.dna, i * 7 + 1);
    const par = d.genes.sexo;
    n++;
    if (par[0] === 'Y' && par[1] === 'Y') yy++;
    if (M.sexoDoDna(d) === 'M') machos++;
  }
  ok(yy === 0, 'nunca nasce um YY — a mãe só tem X para dar',
     n.toLocaleString('pt-BR') + ' filhos');
  const pct = machos / n * 100;
  ok(Math.abs(pct - 50) < 2, 'e macho e fêmea saem meio a meio, sem regra própria',
     pct.toFixed(1) + '% machos');
}

// ═══════════════════════════════════════════════════════════════════
titulo('CADA ALELO VEIO DE UM DOS PAIS');

{
  let forasteiros = 0, n = 0;
  for (let c = 0; c < 300; c++) {
    const { mae, pai } = casal(3000 + c * 500);
    if (!mae || !pai) continue;
    const gM = mae.nascimento.dna.genes, gP = pai.nascimento.dna.genes;
    for (let i = 0; i < 20; i++) {
      const d = M.cruzarDna(mae.nascimento.dna, pai.nascimento.dna, c * 1000 + i);
      for (const k of M.NASC_CARACS.concat(['cor', 'indole'])) {
        n += 2;
        if (!(gM[k] || []).includes(d.genes[k][0])) forasteiros++;
        if (!(gP[k] || []).includes(d.genes[k][1])) forasteiros++;
      }
    }
  }
  ok(forasteiros === 0, 'nenhum alelo do filho apareceu do nada',
     n.toLocaleString('pt-BR') + ' alelos conferidos contra os pais');
}

// ═══════════════════════════════════════════════════════════════════
titulo('PUXA AOS PAIS, MAS NÃO É A MÉDIA DELES');

{
  // Pais no topo e pais no fundo, feitos à mão para a diferença ser clara.
  const comAlelos = (v, seed) => {
    const s = adulto(seed);
    const g = s.nascimento.dna.genes;
    for (const k of M.NASC_CARACS) g[k] = [v, v];
    return s;
  };
  const medirNinhada = (a, b) => {
    let soma = 0, n = 0, min = 99, max = -1;
    for (let i = 0; i < 3000; i++) {
      const d = M.cruzarDna(a.nascimento.dna, b.nascimento.dna, i * 13 + 7);
      const t = M.NASC_CARACS.reduce((x, k) => x + Math.max(d.genes[k][0], d.genes[k][1]), 0);
      soma += t; n++; if (t < min) min = t; if (t > max) max = t;
    }
    return { media: soma / n, min, max };
  };

  const fortes = medirNinhada(comAlelos(5, 8001), comAlelos(5, 8002));
  const fracos = medirNinhada(comAlelos(0, 8003), comAlelos(0, 8004));
  const misto  = medirNinhada(comAlelos(5, 8005), comAlelos(0, 8006));

  console.log('       pais com alelos 5 e 5 → filhos ' + fortes.media.toFixed(1) +
              ' (de ' + fortes.min + ' a ' + fortes.max + ')');
  console.log('       pais com alelos 0 e 0 → filhos ' + fracos.media.toFixed(1) +
              ' (de ' + fracos.min + ' a ' + fracos.max + ')');
  console.log('       um de 5 com um de 0   → filhos ' + misto.media.toFixed(1) +
              ' (de ' + misto.min + ' a ' + misto.max + ')');

  /* O CRUZAMENTO DE PONTAS DÁ FILHOS TODOS IGUAIS — e isso está certo.

     Escrevi primeiro que o cruzado (5 com 0) tinha de ficar entre os
     dois, e falhou: dá 20, tal e qual os pais fortes. Não é defeito, é
     Mendel. Cada filho recebe forçosamente um 5 de um lado e um 0 do
     outro, e como quem manda é o alelo dominante, TODOS mostram 5 —
     enquanto carregam o 0 escondido. É a primeira geração uniforme,
     que é o resultado mais conhecido que a genética tem.

     O 0 reaparece na geração seguinte, e é isso que se mede a seguir. */
  ok(fortes.media > fracos.media && misto.media > fracos.media,
     'pais melhores dão filhos melhores',
     'fracos ' + fracos.media.toFixed(1) + ' < fortes ' + fortes.media.toFixed(1));
  ok(misto.min === misto.max && misto.media === fortes.media,
     'e cruzar as duas pontas dá uma ninhada toda igual — primeira geração uniforme',
     'todos os filhos de 5×0 mostram ' + misto.media.toFixed(0));

  // A NETADA: dois filhos desse cruzamento, cruzados entre si. O zero
  // que ninguém via volta a aparecer.
  {
    const f1 = (seed) => { const s = adulto(seed);
      for (const k of M.NASC_CARACS) s.nascimento.dna.genes[k] = [5, 0]; return s; };
    let comZero = 0, n = 0;
    for (let i = 0; i < 4000; i++) {
      const d = M.cruzarDna(f1(8201).nascimento.dna, f1(8202).nascimento.dna, i * 7 + 5);
      n++;
      if (M.NASC_CARACS.some(k => Math.max(d.genes[k][0], d.genes[k][1]) === 0)) comZero++;
    }
    const pct = comZero / n * 100;
    ok(pct > 10, 'e na netada o zero escondido volta à superfície',
       pct.toFixed(0) + '% dos netos mostram 0 nalguma característica');
  }

  // Agora o que interessa: dois pais fortes de PAR MISTO dão irmãos
  // diferentes uns dos outros. Se dessem sempre o mesmo, isto era uma
  // fórmula e não genética.
  const mistoA = (() => { const s = adulto(8101);
    for (const k of M.NASC_CARACS) s.nascimento.dna.genes[k] = [5, 0]; return s; })();
  const mistoB = (() => { const s = adulto(8102);
    for (const k of M.NASC_CARACS) s.nascimento.dna.genes[k] = [5, 0]; return s; })();
  const irmaos = new Set();
  let melhorQuePais = 0, piorQuePais = 0, nI = 0;
  for (let i = 0; i < 4000; i++) {
    const d = M.cruzarDna(mistoA.nascimento.dna, mistoB.nascimento.dna, i * 3 + 11);
    const t = M.NASC_CARACS.reduce((x, k) => x + Math.max(d.genes[k][0], d.genes[k][1]), 0);
    irmaos.add(M.NASC_CARACS.map(k => d.genes[k].join('')).join('|'));
    nI++;
    if (t > 20) melhorQuePais++;      // os pais mostram 5 em tudo = 20
    if (t < 20) piorQuePais++;
  }
  ok(irmaos.size > 50, 'irmãos do mesmo par saem diferentes uns dos outros',
     irmaos.size + ' combinações distintas em ' + nI.toLocaleString('pt-BR') + ' filhos');
  ok(piorQuePais > 0, 'e dois pais que MOSTRAM o melhor podem dar um filho pior',
     (piorQuePais / nI * 100).toFixed(0) + '% dos filhos ficaram abaixo dos pais');
}

// ═══════════════════════════════════════════════════════════════════
titulo('O QUE ESTÁ ESCONDIDO VIAJA');

{
  /* Os dois pais mostram 1 e escondem 5. Nenhum deles PARECE forte —
     e o neto pode ser. É a única coisa que justifica guardar o par em
     vez de guardar o valor. */
  const esconde = seed => { const s = adulto(seed);
    for (const k of M.NASC_CARACS) s.nascimento.dna.genes[k] = [1, 5]; return s; };
  const a = esconde(9001), b = esconde(9002);
  let mostrouOEscondido = 0, n = 0;
  for (let i = 0; i < 4000; i++) {
    const d = M.cruzarDna(a.nascimento.dna, b.nascimento.dna, i * 5 + 3);
    n++;
    if (M.NASC_CARACS.every(k => Math.max(d.genes[k][0], d.genes[k][1]) === 5)) mostrouOEscondido++;
  }
  const pct = mostrouOEscondido / n * 100;
  ok(pct > 1 && pct < 50, 'de dois pais que escondem o melhor, alguns filhos mostram-no',
     pct.toFixed(1) + '% saíram com 5 nas quatro características');
}

// ═══════════════════════════════════════════════════════════════════
titulo('A COR NÃO CONVERGE');

{
  /* Foi por isto que a cor NÃO se mistura: com mistura, cada geração
     puxava para o meio da roda e ao fim de algumas a colónia inteira
     saía da mesma cor. Aqui simula-se uma população fechada durante
     dez gerações e conta-se quantas cores diferentes sobram. */
  const nCores = M.CORES_RODA.length;
  let pop = [];
  for (let i = 0; i < 40; i++) pop.push(adulto(20000 + i));

  const coresDe = p => {
    const vistas = new Set();
    for (const a of p) { const c = a.nascimento.dna.genes.cor; vistas.add(c[0]); vistas.add(c[1]); }
    return vistas.size;
  };
  const antes = coresDe(pop);

  for (let g = 0; g < 10; g++) {
    const machos = pop.filter(a => M.sexoDe(a) === 'M');
    const femeas = pop.filter(a => M.sexoDe(a) === 'F');
    if (!machos.length || !femeas.length) break;
    const nova = [];
    for (let i = 0; i < 40; i++) {
      const m = machos[i % machos.length], f = femeas[i % femeas.length];
      const dna = M.cruzarDna(f.nascimento.dna, m.nascimento.dna, g * 1000 + i);
      nova.push({ id: 'g' + g + '_' + i, seed: g * 100 + i, nivel: 30, totalSecs: ADULTO,
                  nascimento: { dna } });
    }
    pop = nova;
  }
  const depois = coresDe(pop);
  console.log('       cores em circulação: ' + antes + ' de ' + nCores +
              ' no início · ' + depois + ' depois de dez gerações');
  ok(depois >= nCores * 0.5, 'ao fim de dez gerações ainda há cores por toda a roda',
     depois + ' das ' + nCores + ' cores');
}

// ═══════════════════════════════════════════════════════════════════
titulo('O OVO');

{
  const { mae, pai } = casal(30000);
  const r = M.cruzar(mae, pai, { seed: 4242 });
  ok(r.ok && r.ovo, 'o cruzamento devolve um ovo', r.ok ? 'sim' : r.motivo);

  const o = r.ovo;
  ok(o.dna && o.dna.genes, 'com o DNA do filho já lá dentro', M.dnaLegivel(o.dna));
  ok(o.mae === mae.id && o.pai === pai.id, 'e com os pais registados',
     'mãe ' + o.mae + ' · pai ' + o.pai);

  ok(!M.ovoPronto(o, Date.now()), 'não se choca no instante em que é posto',
     'faltam ' + Math.round(M.faltaParaChocar(o, Date.now()) / 3600000) + ' h');
  ok(M.ovoPronto(o, Date.now() + M.REPR_INCUBACAO_MS + 1), 'e choca-se passado o tempo de choco',
     (M.REPR_INCUBACAO_MS / 3600000) + ' h de incubação');
  ok(M.ovoPronto({ id: 1 }, Date.now()), 'um ovo dos antigos, sem tempo de choco, abre já',
     'sem chocaEm → pronto');

  /* E o filho que sai do ovo tem MESMO o DNA herdado, e não um novo. */
  const filho = { nome: 'filho', seed: 555, nivel: 1, raridade: 'Comum', elemento: o.elemento };
  M.registarNascimento(filho, { elemento: o.elemento, origem: 'Comum', seed: 555,
                                dna: o.dna, mae: o.mae, pai: o.pai });
  ok(M.dnaLegivel(filho.nascimento.dna) === M.dnaLegivel(o.dna),
     'e ao chocar o filho fica com o DNA do ovo, e não com um sorteado',
     M.dnaLegivel(filho.nascimento.dna));
  ok(filho.nascimento.mae === mae.id && filho.nascimento.pai === pai.id,
     'com os pais gravados na certidão dele', 'mãe e pai presentes');
}

console.log('');
console.log('─────────────────────────────');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
