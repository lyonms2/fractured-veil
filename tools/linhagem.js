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
/* Tinha aqui a sua própria extração, com a sua lista de nomes. Quando a
   escada da fase mudou, arranjei a do evolucao.js e esta ficou a rebentar
   — e só se soube ao correr esta ferramenta. Passa a ser a mesma. */
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);

const M = new Function('t',
  LINHAS_DA_FASE + NL +
  rd('cores.js') + rd('data.js') + rd('nascimento.js') + rd('raridade.js') + rd('reproducao.js') +
  rd('vantagens.js') + rd('ficha-3dt.js') + rd('magias.js') + rd('identidade.js') +
  `return { arvoreDe, vigorDe, vigorDoDna, NASC_VIGOR, NASC_VIGOR_FORTE, NASC_VIGOR_FRACO,
            nascer, gerarDna, registarNascimento, sexoDe, sexoDoDna, indoleDominante,
            tendenciaDoDna, dnaLegivel, NASC_CARACS, CORES_RODA,
            podeCruzar, cruzar, cruzarDna, ovoPronto, faltaParaChocar,
            tempoDeChoco, _reprCuidado, REPR_CHOCO_MIN_MS, REPR_CHOCO_MAX_MS,
            fichaDeAvatar, magiasDoAvatar, faseDoSlot,
            ehPrimordial, coresDe, _reprRetrato,
            corpoDoSeed, corpoDoDna, corpoDeSlot, corpoParesDeSlot, NASC_CORPO_TRACOS, gerarSVG };`
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
              raridade: 'Lendário', id: 'av_' + seed };
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
      /* Um de cada lado, SEM dizer qual fica em que posição.

         Esta verificação exigia o alelo da mãe em [0] e o do pai em [1],
         e estava a afirmar um defeito em vez de uma regra: era o
         cruzamento a pôr sempre a mãe primeiro, e três genes leem a
         posição como dominância (ver js/reproducao.js). Com a ordem
         corrigida, esta linha passou a falhar — o teste tinha ficado a
         guardar o erro.

         O que é mesmo verdade: o par tem um alelo de cada progenitor,
         numa ordem ou na outra. */
      for (const k of M.NASC_CARACS.concat(['cor', 'indole', 'vigor'])) {
        n++;
        const daMae = gM[k] || [], doPai = gP[k] || [];
        const [x, y] = d.genes[k];
        const direita = daMae.includes(x) && doPai.includes(y);
        const trocada = daMae.includes(y) && doPai.includes(x);
        if (!direita && !trocada) forasteiros++;
      }
    }
  }
  ok(forasteiros === 0, 'cada par tem um alelo de cada progenitor',
     n.toLocaleString('pt-BR') + ' pares conferidos contra os pais');
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
  ok(M.ovoPronto(o, Date.now() + M.REPR_CHOCO_MAX_MS + 1), 'e choca-se passado o tempo de choco',
     Math.round((o.chocaEm - Date.now()) / 3600000) + ' h para este par');
  ok(M.ovoPronto({ id: 1 }, Date.now()), 'um ovo dos antigos, sem tempo de choco, abre já',
     'sem chocaEm → pronto');

  /* E o filho que sai do ovo tem MESMO o DNA herdado, e não um novo. */
  const filho = { nome: 'filho', seed: 555, nivel: 1, raridade: 'Comum' };
  M.registarNascimento(filho, { origem: 'Comum', seed: 555,
                                dna: o.dna, mae: o.mae, pai: o.pai });
  ok(M.dnaLegivel(filho.nascimento.dna) === M.dnaLegivel(o.dna),
     'e ao chocar o filho fica com o DNA do ovo, e não com um sorteado',
     M.dnaLegivel(filho.nascimento.dna));
  ok(filho.nascimento.mae === mae.id && filho.nascimento.pai === pai.id,
     'com os pais gravados na certidão dele', 'mãe e pai presentes');
}

// ═════════════════════════════════════════════════════════════
titulo('O RETRATO DOS PAIS');

/* Um pai vendido sai dos slots e o filho fica sem com que o desenhar —
   a não ser que o ovo tenha guardado o retrato dele. Guarda; e estas
   perguntas existem para o dia em que alguém mexer no cruzar e o deixar
   cair sem dar por isso, que é exactamente como o gene do vigor quase se
   perdeu. */
{
  const { mae, pai } = casal(31000);
  const o = M.cruzar(mae, pai, { seed: 777 }).ovo;

  ok(!!(o.maeRetrato && o.paiRetrato), 'o ovo leva o retrato dos dois pais',
     o.maeRetrato ? 'seed ' + o.maeRetrato.seed + ' e ' + o.paiRetrato.seed : 'faltam');

  const campos = ['seed', 'nivel', 'raridade', 'corPrincipal', 'corSecundaria', 'sexo'];
  const faltam = campos.filter(k => o.paiRetrato[k] == null);
  ok(faltam.length === 0, 'e o retrato traz com que desenhar o bicho',
     faltam.length ? 'faltam ' + faltam.join(', ') : campos.join(' · '));

  /* O RETRATO É UMA FOTOGRAFIA, NÃO UM PONTEIRO. Se copiasse a
     referência do pai, o pai a subir de nível mudava a história do
     filho — e uma certidão que muda não é uma certidão. */
  const nivelAntes = o.paiRetrato.nivel;
  pai.nivel = 35;
  ok(o.paiRetrato.nivel === nivelAntes,
     'e não muda quando o pai muda — é fotografia, não ponteiro',
     'ficou no nível ' + nivelAntes + ', o pai vai em ' + pai.nivel);
  pai.nivel = nivelAntes;

  // A cor do retrato é a MESMA que o pai tem: senão a árvore desenhava
  // um bicho de outra cor com o nome dele.
  const c = M.coresDe(pai, pai.seed);
  ok(o.paiRetrato.corPrincipal === c.principal && o.paiRetrato.corSecundaria === c.secundaria,
     'e a cor guardada é a cor que ele tem',
     c.principal + '/' + c.secundaria);

  // E chega à certidão do filho, que é onde a árvore o vai buscar.
  const f = { nome: 'f', seed: 91, nivel: 1, raridade: 'Comum' };
  M.registarNascimento(f, { origem: 'Comum', seed: 91, dna: o.dna,
    mae: o.mae, pai: o.pai, maeNome: o.maeNome, paiNome: o.paiNome,
    maeRetrato: o.maeRetrato, paiRetrato: o.paiRetrato });
  ok(!!(f.nascimento.maeRetrato && f.nascimento.paiRetrato),
     'e viaja do ovo para a certidão do filho',
     'os dois presentes');

  // Um invocado não tem pais nem retratos, e não inventa nenhum.
  const inv = { nome: 'i', seed: 92, nivel: 1, raridade: 'Comum' };
  M.registarNascimento(inv, { origem: 'Comum', seed: 92 });
  ok(!inv.nascimento.maeRetrato && !inv.nascimento.paiRetrato && M.ehPrimordial(inv),
     'um primordial não inventa retratos que não tem', 'os dois a null');
}

// ════════════════════════════════════════════════════════════════
titulo('A ÁRVORE');

{
  // Três gerações, feitas como o jogo as faz.
  const nascidoDe = (mae, pai, nome, seed) => {
    const r = M.cruzar(mae, pai, { seed });
    const f = { nome, seed, nivel: 30, totalSecs: ADULTO, raridade: 'Lendário',
                id: 'av_' + nome };
    M.registarNascimento(f, { origem: 'Comum', seed,
      dna: r.ovo.dna, mae: r.ovo.mae, pai: r.ovo.pai,
      maeNome: r.ovo.maeNome, paiNome: r.ovo.paiNome });
    f.mae = r.ovo.mae; f.pai = r.ovo.pai;
    return f;
  };

  const g1 = casal(40000);
  g1.mae.nome = 'Lyra'; g1.pai.nome = 'Auron';
  const kael = nascidoDe(g1.mae, g1.pai, 'Kael', 900);

  // uma parceira para o Kael, do sexo que faltar
  let par = null;
  for (let i = 41000; i < 41400 && !par; i++) {
    const a = adulto(i); if (M.sexoDe(a) !== M.sexoDe(kael)) { a.nome = 'Serena'; par = a; }
  }
  const nox = M.sexoDe(kael) === 'F' ? nascidoDe(kael, par, 'Nox', 1200)
                                     : nascidoDe(par, kael, 'Nox', 1200);
  const colonia = [g1.mae, g1.pai, kael, par, nox];

  const aK = M.arvoreDe(kael, colonia);
  ok(aK.mae && aK.pai && aK.mae.presente && aK.pai.presente,
     'um filho vê os pais, e sabe que eles ainda cá estão',
     aK.mae.nome + ' + ' + aK.pai.nome);
  ok(aK.filhos.length === 1 && aK.filhos[0].nome === 'Nox',
     'e vê os próprios filhos, procurados e não guardados',
     aK.filhos.map(f => f.nome).join(', '));

  const aN = M.arvoreDe(nox, colonia);
  ok(aN.avos.length === 2, 'um neto vê os avós pelo lado que ainda cá está',
     aN.avos.map(v => v.nome).join(' · '));

  const aA = M.arvoreDe(g1.pai, colonia);
  ok(!aA.mae && !aA.pai && aA.filhos.length === 1,
     'o fundador não tem pais, e tem filho', 'filho: ' + aA.filhos[0].nome);

  /* E o mais importante: um pai VENDIDO não apaga a história. O nome
     dele ficou gravado na certidão do filho no dia em que o ovo foi
     posto, e continua lá depois de ele sair da colónia. */
  const semPais = colonia.filter(a => a !== g1.mae && a !== g1.pai);
  const aK2 = M.arvoreDe(kael, semPais);
  ok(aK2.mae && aK2.mae.nome === 'Lyra' && !aK2.mae.presente,
     'e com os pais vendidos o nome deles fica — só deixa de estar em destaque',
     aK2.mae.nome + ', presente: ' + aK2.mae.presente);
  ok(M.arvoreDe(kael, semPais).avos.length === 0,
     'aí já não dá para subir aos avós, e não se inventam',
     '0 avós');
}

// ════════════════════════════════════════════════════════════════
titulo('O TEMPO DE CHOCO');

/* O sinal que o servidor media quando o avatar punha ovos sozinho — os
   cinco medidores, o vínculo e o nível — mudou de casa para aqui. Se
   deixasse de valer alguma coisa, o jogador perdia o motivo mais direto
   que tem para cuidar do bicho, e ninguém dava por isso. */
{
  const par = (vitais, vinculo, nivel) => {
    const s = adulto(50000 + vitais + vinculo);
    s.vitals = { fome: vitais, humor: vitais, energia: vitais, saude: vitais, higiene: vitais };
    s.vinculo = vinculo; s.nivel = nivel;
    return s;
  };
  const horas = (v, b, n) => M.tempoDeChoco(par(v, b, n), par(v, b, n)) / 3600000;

  const largado = horas(0, 0, 17);
  const meio    = horas(60, 200, 26);
  const mimado  = horas(100, 400, 35);
  console.log('       pais largados      → ' + largado.toFixed(1) + ' h');
  console.log('       pais a meio gás    → ' + meio.toFixed(1) + ' h');
  console.log('       pais impecáveis    → ' + mimado.toFixed(1) + ' h');

  ok(largado > meio && meio > mimado,
     'cuidar dos pais encurta o choco, e cuidar mais encurta mais',
     largado.toFixed(0) + ' h > ' + meio.toFixed(0) + ' h > ' + mimado.toFixed(0) + ' h');
  ok(Math.abs(largado - 48) < 0.6 && Math.abs(mimado - 24) < 0.6,
     'e o intervalo é mesmo de 24 a 48 horas',
     'pior caso ' + largado.toFixed(0) + ' h · melhor caso ' + mimado.toFixed(0) + ' h');

  // Nunca fora do intervalo, por muito estranhos que sejam os números.
  let fora = 0;
  for (const v of [-50, 0, 33, 77, 100, 500])
    for (const b of [-10, 0, 150, 400, 9999])
      for (const n of [1, 17, 35, 99]) {
        const h = M.tempoDeChoco(par(v, b, n), par(v, b, n));
        if (h < M.REPR_CHOCO_MIN_MS || h > M.REPR_CHOCO_MAX_MS) fora++;
      }
  ok(fora === 0, 'e não sai do intervalo nem com números absurdos',
     '120 combinações, incluindo negativos e valores fora da escala');

  // Um pai bem tratado e outro largado ficam pelo meio: contam os dois.
  const misto = M.tempoDeChoco(par(100, 400, 35), par(0, 0, 17)) / 3600000;
  ok(misto > mimado && misto < largado,
     'e os dois pais contam — um só bem tratado não chega',
     'um mimado com um largado dá ' + misto.toFixed(0) + ' h');
}

// ════════════════════════════════════════════════════════════════
titulo('O VIGOR');

/* Era o passivo elemental: cinco tabelas escritas à mão. Passou a ser um
   gene, e um gene tem de se herdar como os outros — e não mexer no ritmo
   do jogo, que é o que ele ganhou e não o que ele mudou. */
{
  const conta = {};
  let sem = 0;
  for (let i = 0; i < 8000; i++) {
    const a = adulto(60000 + i);
    const v = M.vigorDe(a);
    if (!v) { sem++; continue; }
    conta[v.forte + '→' + v.fraco] = (conta[v.forte + '→' + v.fraco] || 0) + 1;
  }
  const pctSem = sem / 8000 * 100;
  console.log('       ' + Object.keys(conta).length + ' combinações de forte→fraco, e ' +
              pctSem.toFixed(0) + '% sem vigor nenhum');

  const n = M.NASC_VIGOR.length;
  ok(Object.keys(conta).length === n * (n - 1),
     'todas as combinações de forte e fraco chegam a nascer',
     Object.keys(conta).length + ' de ' + (n * (n - 1)));
  /* Um quarto sai com os dois alelos iguais, e esses cancelam-se. Não é
     desperdício: um avatar sem jeito nem defeito também tem de existir,
     senão toda a colónia tem uma marca. */
  ok(Math.abs(pctSem - 25) < 3, 'e um quarto nasce sem marca nenhuma',
     pctSem.toFixed(1) + '% (esperado 25%, que é a hipótese dos dois alelos calharem iguais)');
}

// Os números são os das tabelas antigas: o ritmo do jogo não se mexeu.
{
  let fora = 0, n = 0;
  for (let i = 0; i < 4000; i++) {
    const a = adulto(70000 + i);
    const p = M.vigorDoDna(a.nascimento.dna);
    const v = M.vigorDe(a);
    n++;
    for (const k of ['fome', 'humor', 'energia', 'higiene']) {
      const esperado = !v ? 1 : (k === v.forte ? M.NASC_VIGOR_FORTE
                              : k === v.fraco ? M.NASC_VIGOR_FRACO : 1);
      if (p[k + 'Decay'] !== esperado) fora++;
    }
  }
  ok(fora === 0, 'o forte melhora 15% e o fraco piora 10%, e mais nada se mexe',
     n.toLocaleString('pt-BR') + ' avatares × 4 medidores');

  // E o que o gene não toca fica mesmo em um.
  const p = M.vigorDoDna(adulto(70001).nascimento.dna);
  ok(p.sleepEnergy === 1 && p.vinculoDecay === 1,
     'o sono e o vínculo ficam de fora — não há gene que lhes pegue',
     'sleepEnergy ' + p.sleepEnergy + ' · vinculoDecay ' + p.vinculoDecay);

  // Sem certidão, nada: quem nasceu antes disto não tinha este gene.
  const nu = M.vigorDoDna(null);
  ok(Object.values(nu).every(x => x === 1),
     'e um avatar sem DNA não recebe passivo nenhum', 'os seis a 1');
}

console.log('');
console.log('─────────────────────────────');
// ══════════════════════════════════════════════════════════════════
titulo('O CORPO HERDA-SE, TRAÇO A TRAÇO');

/* Os doze traços — corpo, boca, chifres, olhos, braços, cauda, asas,
   tentáculos, espinhos — saíam da SEED, e a seed não se herda. Um filho
   não se parecia com ninguém. */
{
  const T = M.NASC_CORPO_TRACOS;
  const { mae, pai } = casal(7000);
  const cm = M.corpoDeSlot(mae), cp = M.corpoDeSlot(pai);
  const pF = M.corpoParesDeSlot(mae), pM = M.corpoParesDeSlot(pai);

  ok(!!cm && !!cp && T.every(k => cm[k] !== undefined),
     'todo o avatar tem corpo, tenha genes ou não',
     T.length + ' traços lidos dos dois progenitores');

  // Só os traços em que os pais DIFEREM dizem alguma coisa: nos outros,
  // vir da mãe e vir do pai é a mesma coisa e nada se prova.
  const dif = T.filter(k => cm[k] !== cp[k]);
  const NC = 3000, SEM = i => (1700000000 + i) >>> 0;
  let deMae = 0, dePai = 0, forasteiro = 0, n = 0, semGenes = 0;
  const combos = {};
  for (let i = 1; i <= NC; i++) {
    const d = M.cruzarDna(mae.nascimento.dna, pai.nascimento.dna, SEM(i), pF, pM);
    const c = M.corpoDoDna(d);
    if (!c) { semGenes++; continue; }
    for (const k of dif) {
      n++;
      if (c[k] === cm[k]) deMae++; else if (c[k] === cp[k]) dePai++; else forasteiro++;
    }
    combos[dif.map(k => c[k] === cm[k] ? 'M' : 'P').join('')] = 1;
  }
  ok(semGenes === 0, 'e um filho de dois avatares nasce com os genes do corpo',
     NC.toLocaleString('pt-BR') + ' filhos · ' + semGenes + ' sem genes');

  ok(forasteiro === 0, 'nenhum traço do filho apareceu do nada',
     n.toLocaleString('pt-BR') + ' traços conferidos contra os pais');

  const pctM = deMae / n * 100;
  ok(Math.abs(pctM - 50) < 5, 'e a mãe e o pai contribuem por igual',
     'da mãe ' + pctM.toFixed(1) + '% · do pai ' + (100 - pctM).toFixed(1) + '%');

  /* Cada traço herda-se por si. Se o corpo viajasse inteiro, o filho
     seria a cópia de um dos pais e só haveria duas combinações. */
  const possiveis = Math.pow(2, dif.length);
  ok(dif.length >= 3 && Object.keys(combos).length > Math.min(possiveis, 8) / 2,
     'e cada traço vem por si — o filho não é a cópia de um dos pais',
     Object.keys(combos).length + ' combinações vistas em ' + dif.length + ' traços diferentes');
}

/* A garantia que segura tudo o resto: quem nasceu antes disto existir não
   tem genes do corpo, e tem de continuar a desenhar-se exactamente como
   sempre se desenhou. */
{
  let mudou = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const semGenes = { seed };
    const doDna = M.corpoDoDna({ genes: { F: [1, 1] } });   // DNA sem corpo
    if (doDna !== null) { mudou++; continue; }
    const a = M.gerarSVG(semGenes, 'Comum', seed, 100, 100, 0).replace(/\d+_\d+/g, 'ID');
    const b = M.gerarSVG({ seed, nascimento: { dna: { genes: { F: [1, 1] } } } },
                         'Comum', seed, 100, 100, 0).replace(/\d+_\d+/g, 'ID');
    if (a !== b) mudou++;
  }
  ok(mudou === 0, 'e um DNA sem genes do corpo desenha-se pela seed, como sempre',
     '300 avatares antigos · ' + mudou + ' mudaram de cara');
}

console.log('');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
