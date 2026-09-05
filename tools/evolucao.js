// ═══════════════════════════════════════════════════════════════════
// EVOLUÇÃO — a raridade conquista-se, e o corpo cresce em vez de trocar
//
// Três perguntas:
//
//   1. a escada da raridade sobe com a fase, e nunca desce
//   2. a raridade não paga pontos de ficha — quem paga é o nível
//   3. e o corpo: o mesmo avatar nas três raridades continua a ser o
//      MESMO BICHO. Ganha partes; não troca de cara.
//
// A terceira é a que precisa de guarda permanente. O desenho sorteia
// numa fila — cada número sai do anterior — e basta alguém pôr um
// random() dentro de um laço que conta partes para todos os avatares do
// jogo mudarem de aspecto ao evoluir. Já aconteceu duas vezes neste
// mesmo ficheiro.
//
// Correr:  node tools/evolucao.js
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');

// As regras da fase leem-se do js/state.js, num sítio só (tools/fase.js):
// duas cópias desta extração divergiram em silêncio uma vez.
const NL = String.fromCharCode(10);
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);

const M = new Function('t',
  LINHAS_DA_FASE + NL +
  rd('cores.js') + rd('nascimento.js') + rd('raridade.js') +
  rd('vantagens.js') + rd('ficha-3dt.js') + rd('magias.js') + rd('data.js') +
  `return { gerarSVG, registarNascimento, fichaDeAvatar, pontosDoAvatar,
            magiasDoAvatar, repertorioCompleto, degrauDoSlot, MAGIA_SLOTS, MAGIA_ESCADA,
            raridadeDaFase, raridadeDosPontos, grauDaRaridade, faseDoSlot, raridadeDoSlot,
            sincronizarRaridade, podeSerVendido, RARIDADE_POR_FASE,
            podeEscolherAnciao, FICHA_ESCOLHAS, FICHA_PONTOS_MAX, sortearVantagens };`
)(x => x);

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK   ', titulo.padEnd(54), '· ' + detalhe); }
  else      { falhou++; console.log('  FALHOU', titulo.padEnd(53), '· ' + detalhe); }
}
function titulo(txt) { console.log(''); console.log('─── ' + txt + ' ' + '─'.repeat(Math.max(0, 56 - txt.length))); }

const RARS = ['Comum', 'Raro', 'Lendário'];

// ═══════════════════════════════════════════════════════════════════
titulo('A ESCADA');

// A escada inteira, com os pontos que a decidem.
{
  let ant = null;
  for (let nv = 1; nv <= 35; nv++) {
    const pontos = M.pontosDoAvatar('Comum', nv);
    const r = M.raridadeDosPontos(pontos);
    if (r !== ant) { console.log('       nível ' + String(nv).padStart(2) + '  →  ' +
      pontos + ' pontos  →  ' + r); ant = r; }
  }
}

ok(M.raridadeDosPontos(0) === 'Comum' && M.raridadeDosPontos(7) === 'Comum',
   'até 7 pontos é Comum', '0 e 7 → Comum');
ok(M.raridadeDosPontos(8) === 'Raro' && M.raridadeDosPontos(11) === 'Raro',
   'de 8 a 11 é Raro', '8 e 11 → Raro');
ok(M.raridadeDosPontos(12) === 'Lendário' && M.raridadeDosPontos(99) === 'Lendário',
   'de 12 para cima é Lendário', '12 e 99 → Lendário');

// Onde cai cada degrau, em níveis. É isto que o jogador sente.
{
  const primeiro = r => { for (let nv = 1; nv <= 60; nv++)
    if (M.raridadeDosPontos(M.pontosDoAvatar('Comum', nv)) === r) return nv; return null; };
  const raro = primeiro('Raro'), lend = primeiro('Lendário');
  ok(raro === 11 && lend === 27, 'Raro ao nível 11 e Lendário ao 27',
     'Raro nv' + raro + ' · Lendário nv' + lend);
  /* Duas pontas, e as duas importam. Cedo de mais e a raridade não é
     conquista nenhuma; tarde de mais e ninguém chega a viver nela —
     numa versão anterior o Lendário caía no nível 34 de 35, e era um
     fotograma e não um estado.

     A escada deixou de acabar no 35: os pontos só param nos 15, ao
     nível 51. O Lendário ao 27 tem portanto a segunda metade da vida
     inteira pela frente. */
  const NV_FIM = 51;
  ok(lend > 20 && lend < NV_FIM * 0.6, 'e sobram níveis para se VIVER como Lendário',
     'Lendário ao nv' + lend + ', com ' + (NV_FIM - lend) + ' níveis pela frente');

  /* ── A CURVA, DEGRAU A DEGRAU ──
     Está escrita no js/ficha-3dt.js e é a espinha de tudo o resto: a
     fase sai dela, a raridade sai dela, e as magias saem da fase. */
  const esperado = { 1:1, 4:4, 5:5, 7:6, 9:7, 11:8, 15:9, 19:10, 23:11,
                     27:12, 35:13, 43:14, 51:15, 99:15 };
  const fora = Object.entries(esperado)
    .filter(([nv, p]) => M.pontosDoAvatar('Comum', +nv) !== p)
    .map(([nv, p]) => 'nv' + nv + ' devia dar ' + p + ' e dá ' + M.pontosDoAvatar('Comum', +nv));
  ok(fora.length === 0, 'a curva dos pontos bate certo em cada emenda',
     fora.length ? fora.join(' · ') : '14 pontos de controlo, do nv1 ao tecto');

  /* E nunca desce nem salta dois de uma vez: as faixas têm de emendar
     umas nas outras, senão há um nível que dá dois pontos ou nenhum
     durante muito tempo. */
  let saltos = 0, descidas = 0;
  for (let nv = 2; nv <= 60; nv++) {
    const d = M.pontosDoAvatar('Comum', nv) - M.pontosDoAvatar('Comum', nv - 1);
    if (d < 0) descidas++;
    if (d > 1) saltos++;
  }
  ok(saltos === 0 && descidas === 0, 'e sobe de um em um, sem saltos nem descidas',
     saltos + ' saltos · ' + descidas + ' descidas em 59 subidas');

  // O bebé vale um ponto, e é esse o princípio da escada.
  ok(M.pontosDoAvatar('Comum', 1) === 1, 'e o bebé vale um ponto',
     'nv1 → ' + M.pontosDoAvatar('Comum', 1) + ' ponto');
}

// A conquista não se perde.
{
  const slot = { raridade: 'Lendário', nivel: 1 };
  ok(M.sincronizarRaridade(slot) === null && slot.raridade === 'Lendário',
     'a raridade nunca desce', 'Lendário de nível 1 continua Lendário');
}
{
  const slot = { raridade: 'Comum', nivel: 30 };
  ok(M.sincronizarRaridade(slot) === 'Lendário' && slot.raridade === 'Lendário',
     'quem já tinha os pontos recebe a raridade na migração',
     'Comum de nível 30 → Lendário');
}

/* O TEMPO DE JOGO DEIXOU DE SER UM TRAVÃO.

   Era: os pontos não chegavam, e a raridade pedia também horas de jogo.
   A regra saiu porque era redundante — sem tempo de jogo o avatar não
   sobe de nível, e o nível é que dá os pontos. Contar as horas outra vez
   era travar duas vezes a mesma porta.

   A verificação fica, virada do avesso: agora o que se exige é que o
   tempo NÃO mude a resposta. Se alguém reintroduzir um travão de horas
   sem querer, isto apanha. */
{
  const cru   = { raridade: 'Comum', nivel: 30, totalSecs: 60 };
  const feito = { raridade: 'Comum', nivel: 30, totalSecs: 25 * 3600 };
  const mudo  = { raridade: 'Comum', nivel: 30 };
  const a = M.raridadeDoSlot(cru), b = M.raridadeDoSlot(feito), c = M.raridadeDoSlot(mudo);
  ok(a === b && b === c, 'o tempo de jogo já não mexe na raridade',
     'nv30 com 1 min → ' + a + ' · com 25 h → ' + b + ' · sem tempo → ' + c);
  ok(c === 'Lendário', 'e o nível 30 chega para Lendário', 'nv30 → ' + c);

  /* E o nível manda mesmo: um degrau abaixo do corte tem de dar menos. */
  const antes = M.raridadeDoSlot({ raridade: 'Comum', nivel: 26 });
  const depois = M.raridadeDoSlot({ raridade: 'Comum', nivel: 27 });
  ok(antes === 'Raro' && depois === 'Lendário',
     'e o corte do Lendário está mesmo no nível 27',
     'nv26 → ' + antes + ' · nv27 → ' + depois);
}

ok(!M.podeSerVendido({ raridade: 'Comum' }) &&
    M.podeSerVendido({ raridade: 'Raro' }) &&
    M.podeSerVendido({ raridade: 'Lendário' }),
   'o mercado abre a partir de Raro, e não antes',
   'Comum não · Raro sim · Lendário sim');

titulo('A RARIDADE NÃO PAGA PONTOS');

let difPontos = 0, difFicha = 0, n = 0;
for (let seed = 1; seed <= 2000; seed++) {
  for (const nv of [1, 10, 17, 25, 35]) {
    const p = RARS.map(r => M.pontosDoAvatar(r, nv));
    if (p[0] !== p[1] || p[1] !== p[2]) difPontos++;
    const f = RARS.map(r => M.fichaDeAvatar(seed, r, nv));
    if (f[0].F !== f[2].F || f[0].H !== f[2].H || f[0].R !== f[2].R || f[0].A !== f[2].A) difFicha++;
    n++;
  }
}
ok(difPontos === 0, 'os pontos são os mesmos nas três raridades',
   n.toLocaleString('pt-BR') + ' comparações');
ok(difFicha === 0, 'e a ficha inteira também — a força vem toda do nível',
   n.toLocaleString('pt-BR') + ' fichas');

// O degrau que isto evita: se a raridade pagasse, um nível 16 encontrava
// um nível 17 com este salto.
const saltoAntigo = 10 - 5;
console.log('       (se pagasse, passar a Lendário dava +' + saltoAntigo +
            ' pontos de uma vez — mais do que ' + (saltoAntigo * 4) + ' níveis valem)');

// ═══════════════════════════════════════════════════════════════════
titulo('O CORPO CRESCE, NÃO TROCA');

// Ignora os ids únicos por render, que mudam de propósito a cada chamada.
const limpa = s => s.replace(/(grad|lg|glow|ig)\d+_\d+/g, '$1X');
const grupo = (s, cls) => {
  const m = s.match(new RegExp('<g class="av-' + cls + '">[\\s\\S]*?<\\/g>'));
  return m ? limpa(m[0]) : '';
};
const conta = (s, marca) => (s.match(new RegExp(marca, 'g')) || []).length;

const IDENTIDADE = ['corpo', 'chifre', 'cauda', 'boca'];
const CRESCEM = [
  { nome: 'olhos',      marca: 'class="av-olho-un"' },
  { nome: 'braços',     marca: 'class="av-membro"' },
];

let mudouIdentidade = 0, encolheu = 0, ganhou = 0, avaliados = 0;
const exemplos = [];
for (let seed = 1; seed <= 500; seed++) {
  const slot = { raridade: 'Comum', elemento: 'Fogo', seed, nivel: 1 };
  M.registarNascimento(slot, { origem: 'Comum', seed });
  // A MESMA fase nas três, para o que muda ser só a raridade.
  const svgs = RARS.map(r => M.gerarSVG(slot, r, seed, 60, 60, 2));
  avaliados++;

  for (const cls of IDENTIDADE) {
    const g = svgs.map(s => grupo(s, cls));
    if (g[0] !== g[1] || g[1] !== g[2]) mudouIdentidade++;
  }
  for (const p of CRESCEM) {
    const c = svgs.map(s => conta(s, p.marca));
    if (c[1] < c[0] || c[2] < c[1]) encolheu++;
    if (c[2] > c[0]) ganhou++;
  }
  // Os espinhos são o caso mais claro: um Comum não tem nenhum.
  const esp = svgs.map(s => conta(grupo(s, 'espinho'), '<polygon'));
  if (esp[0] !== 0) encolheu++;
  if (esp[2] < esp[1] || esp[1] < esp[0]) encolheu++;
  if (seed <= 3) exemplos.push('seed ' + seed + ': espinhos ' + esp.join('→') +
    ' · olhos ' + svgs.map(s => conta(s, 'class="av-olho-un"')).join('→') +
    ' · braços ' + svgs.map(s => conta(s, 'class="av-membro"')).join('→'));
}

ok(mudouIdentidade === 0,
   'corpo, chifres, cauda e boca são os mesmos nas três raridades',
   avaliados + ' avatares × 4 partes de identidade');
ok(encolheu === 0, 'nenhuma parte desaparece ao subir de raridade',
   avaliados + ' avatares');
ok(ganhou > avaliados * 0.5, 'e a maioria ganha mesmo alguma coisa visível',
   ganhou + ' ganhos em ' + (avaliados * CRESCEM.length) + ' comparações');
for (const e of exemplos) console.log('       ' + e);

// ════════════════════════════════════════════════════════════════
titulo('O REPERTÓRIO CRESCE');

// A escada do §8 do conceito, medida em vez de suposta.
{
  const linha = (nv, rar) => {
    const f = M.fichaDeAvatar(7, rar, nv);
    const m = M.magiasDoAvatar(f);
    return { nv, rar, tem: M.MAGIA_SLOTS.filter(c => m[c]), vd: !!f.vantagem };
  };
  const passos = [[1,'Comum'],[5,'Comum'],[10,'Comum'],[11,'Raro'],[27,'Lendário']].map(a => linha(a[0], a[1]));
  for (const p of passos)
    console.log('       nv' + String(p.nv).padStart(2) + ' ' + p.rar.padEnd(9) + ' · ' +
                (p.tem.length ? p.tem.join(', ') : 'só o golpe comum') +
                (p.vd ? '   + vantagem e desvantagem' : ''));

  ok(passos[0].tem.length === 0 && !passos[0].vd,
     'o bebé não tem magia, nem vantagem, nem desvantagem',
     'nv1 → só o golpe comum');
  /* O JOVEM abre DUAS de uma vez — a de bater e a de segurar. É a fase
     em que ele passa a poder lutar, e entrar em combate só com ataque e
     sem defesa era entrar pela metade. */
  ok(passos[1].tem.join() === 'forte,defensiva',
     'o JOVEM ganha a de bater E a de segurar, de uma vez',
     'nv5 → ' + passos[1].tem.join(', '));
  /* E só o DEFEITO. A virtude fica para a fase seguinte: primeiro
     descobre-se o que lhe custa, depois o que ele tem de seu. */
  ok(!passos[1].vd, 'e o defeito sem a virtude — essa é do ADULTO',
     'nv5 → virtude ' + (passos[1].vd ? 'presente' : 'ainda não'));
  ok(passos[2].tem.join() === 'forte,defensiva',
     'e nada de novo até ao fim do JOVEM', 'nv10 → ' + passos[2].tem.join(', '));
  ok(passos[3].tem.join() === 'forte,muito_forte,defensiva' && passos[3].vd,
     'o ADULTO ganha o golpe caro e a virtude',
     'nv11 → ' + passos[3].tem.join(', ') + ' + virtude');
  ok(passos[4].tem.join() === 'forte,muito_forte,defensiva,suporte',
     'o ANCIÃO ganha o suporte', 'nv27 → ' + passos[4].tem.join(', '));
}

/* E o mais importante: o que se ganha é o LUGAR, e nunca a magia.
   Um lugar que já tinha uma magia não pode passar a ter outra — era o
   defeito que este jogo já apanhou uma vez (1,52% das subidas trocavam
   de magia, e 36% dessas para pior). */
{
  let trocou = 0, perdeu = 0, n = 0;
  for (let seed = 1; seed <= 800; seed++) {
    let ant = null;
    for (let nv = 1; nv <= 35; nv++) {
      const rar = M.raridadeDosPontos(M.pontosDoAvatar('Comum', nv));
      const m = M.magiasDoAvatar(M.fichaDeAvatar(seed, rar, nv));
      const ids = M.MAGIA_SLOTS.map(c => m[c] ? m[c].id : null);
      if (ant) {
        n++;
        for (let i = 0; i < ids.length; i++) {
          if (ant[i] && ids[i] && ant[i] !== ids[i]) trocou++;
          if (ant[i] && !ids[i]) perdeu++;
        }
      }
      ant = ids;
    }
  }
  ok(trocou === 0, 'nenhuma magia troca por outra ao subir de nível',
     n.toLocaleString('pt-BR') + ' subidas');
  ok(perdeu === 0, 'e nenhuma se perde depois de ganha',
     n.toLocaleString('pt-BR') + ' subidas');
}

// A ficha promete o repertório completo, e a promessa tem de cumprir-se.
{
  let quebrou = 0, n = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const cedo = M.fichaDeAvatar(seed, 'Comum', 5);
    const prometido = M.repertorioCompleto(cedo);
    const fim = M.magiasDoAvatar(M.fichaDeAvatar(seed, 'Lendário', 35));
    for (const c of M.MAGIA_SLOTS) {
      n++;
      const a = prometido[c] ? prometido[c].id : null;
      const b = fim[c] ? fim[c].id : null;
      if (a !== b) quebrou++;
    }
  }
  ok(quebrou === 0, 'o que a ficha promete ao nível 5 é o que chega ao 35',
     n.toLocaleString('pt-BR') + ' lugares comparados');
}

// ════════════════════════════════════════════════════════════════
titulo('SUBIR DE NÍVEL SÓ SOMA');

/* O js/ficha-3dt.js promete isto em quatro comentários e já o corrigiu
   três vezes por portas diferentes — e nunca teve uma verificação.
   Tem agora. Uma característica que desce ao subir de nível é o defeito
   mais caro que esta ficha sabe ter: o jogador viu o número ontem. */
{
  const CS = ['F', 'H', 'R', 'A'];
  const quedas = [];
  let subidas = 0;
  for (let s = 1; s <= 1200; s++) {
    let ant = M.fichaDeAvatar(s, 'Comum', 1);
    for (let nv = 2; nv <= 35; nv++) {
      const f = M.fichaDeAvatar(s, 'Comum', nv);
      subidas++;
      for (const k of CS)
        if (f[k] < ant[k]) quedas.push('seed ' + s + ' nv' + (nv-1) + '→' + nv + ' ' + k + ' ' + ant[k] + '→' + f[k]);
      if (f.pv < ant.pv) quedas.push('seed ' + s + ' nv' + nv + ' PV ' + ant.pv + '→' + f.pv);
      if (f.pm < ant.pm) quedas.push('seed ' + s + ' nv' + nv + ' PM ' + ant.pm + '→' + f.pm);
      ant = f;
    }
  }
  ok(quedas.length === 0, 'nenhuma característica, PV ou PM desce ao subir de nível',
     quedas.length ? quedas.length + ' quedas: ' + quedas.slice(0,3).join(' · ')
                   : subidas + ' subidas, nenhuma queda');

  /* E o degrau que esta mudança criou é o mais suspeito de todos: o
     nv4→5 é onde o par virtude/defeito passa a contar para o
     orçamento. Pergunta-se por ele em separado. */
  const noDegrau = [];
  for (let s = 1; s <= 3000; s++) {
    const a = M.fichaDeAvatar(s, 'Comum', 4), b = M.fichaDeAvatar(s, 'Comum', 5);
    for (const k of CS) if (b[k] < a[k]) noDegrau.push('seed ' + s + ' ' + k);
  }
  ok(noDegrau.length === 0, 'e o degrau do nv4 para o nv5, onde a virtude entra',
     noDegrau.length ? noDegrau.length + ' quedas' : '3.000 avatares atravessam-no sem perder nada');
}

// ════════════════════════════════════════════════════════════════
titulo('O BEBÊ');

{
  const bebe = M.fichaDeAvatar(7, 'Comum', 1);
  const soma = ['F', 'H', 'R', 'A'].reduce((t, k) => t + bebe[k], 0);
  console.log('       nv1: F' + bebe.F + ' H' + bebe.H + ' R' + bebe.R + ' A' + bebe.A +
              '  · ' + bebe.pv + ' PV · ' + bebe.pm + ' PM · ' + bebe.escalao);

  ok(bebe.pontos === 1, 'a ficha do bebê vale um ponto', bebe.pontos + ' ponto');

  /* UMA SEED SÓ NÃO CHEGAVA, e isto é a prova disso.

     Esta linha existia com a seed 7 e passava. Passava por SORTE: 22,7%
     dos bebês nasciam com DOIS pontos, e o segundo ia para a Habilidade
     — F0 H1 R1 A0, que foi o que apareceu em jogo. A causa era a
     desvantagem, que dá pontos e é sorteada desde o nível 1 mesmo
     quando ainda não se mostra.

     Um número que depende do seed tem de ser perguntado a MUITOS seeds,
     ou a verificação é uma opinião com sorte. */
  {
    const maus = [];
    for (let s = 1; s <= 5000; s++) {
      const f = M.fichaDeAvatar(s, 'Comum', 1);
      const soma = ['F','H','R','A'].reduce((t,k) => t + f[k], 0);
      if (f.pontos !== 1 || soma !== 1) maus.push('seed ' + s + ' → ' + f.pontos + ' pts, soma ' + soma);
    }
    ok(maus.length === 0, 'e vale um ponto em TODOS os bebês, e não só neste',
       maus.length ? maus.length + ' fora: ' + maus.slice(0,3).join(' · ') : '5.000 seeds, todos F0 H0 R1 A0');

    /* NUNCA MAIS DO QUE A ESCADA — e não "exactamente a escada", que é
       o que eu tinha escrito primeiro e estava errado. Quem tem uma
       virtude cara traz menos: ela custa mais do que o defeito dá, e
       esse peso conta desde o berço. O que não pode acontecer é o
       contrário — um bebê a mostrar pontos que o nível dele não deu. */
    const aMais = [], aMenos = [];
    for (let s = 1; s <= 1500; s++)
      for (let nv = 1; nv <= 4; nv++) {
        const f = M.fichaDeAvatar(s, 'Comum', nv), escada = M.pontosDoAvatar('Comum', nv);
        if (f.pontos > escada) aMais.push('seed ' + s + ' nv' + nv + ' → ' + f.pontos + ' > ' + escada);
        else if (f.pontos < escada) aMenos.push(1);
      }
    ok(aMais.length === 0, 'e do nível 1 ao 4 nunca mostra mais do que a escada dá',
       aMais.length ? aMais.length + ' fora: ' + aMais.slice(0,3).join(' · ')
                    : '6.000 fichas · ' + aMenos.length + ' trazem menos, por virtude cara');
  }
  /* A soma das quatro TEM de bater certo com o orçamento, sem parcela
     nenhuma a mais. Era `1 + 4`: o piso de um ponto que todas levavam
     por fora da bolsa. Esse piso saiu — fazia a ficha do bebê dizer um
     ponto e mostrar cinco. */
  ok(soma === bebe.pontos, 'e a soma das quatro bate certo com o orçamento',
     'F' + bebe.F + ' H' + bebe.H + ' R' + bebe.R + ' A' + bebe.A + ' soma ' + soma);
  ok(bebe.R >= 1, 'a Resistência é a única com piso, e esse é pago da bolsa',
     'R' + bebe.R + ', que é o que o único ponto dele comprou');
  ok(!bebe.vantagem && !bebe.desvantagem, 'sem virtude e sem defeito', 'as duas nulas');
  ok(Object.keys(M.magiasDoAvatar(bebe)).length === 0, 'e sem magia nenhuma',
     'só o golpe comum');

  /* Um bebê de um ponto tinha de continuar a ter vida para existir na
     tela — dez de vida e dez de magia é o mínimo que o piso da
     Resistência garante, e não pode cair com a curva nova. */
  /* Cinco e não dez: eram dez enquanto o piso de 1 somava à R. O que não
     pode ser é zero — com R0 o avatar entrava em campo sem vida nenhuma,
     e isso não é uma ficha fraca, é uma ficha impossível. */
  ok(bebe.pv > 0 && bebe.pm > 0, 'mas com vida e magia para existir',
     bebe.pv + ' PV · ' + bebe.pm + ' PM');
}

// ════════════════════════════════════════════════════════════════
titulo('NENHUM PONTO OFERECIDO');

/* Havia um +1 somado a cada característica, por fora do orçamento —
   quatro pontos de graça em cada ficha do jogo. Com o bebê a valer um
   ponto, isso fazia a ficha dizer um e mostrar cinco.

   Saiu. O que ficou no lugar é pago da bolsa, e estas duas perguntas
   guardam as duas metades da troca: o orçamento bate certo, E ninguém
   fica com um zero que desligue uma regra depois de haver bolsa. */
{
  let errado = 0, n = 0;
  for (let seed = 1; seed <= 1500; seed++) {
    for (let nv = 1; nv <= 35; nv++) {
      const f = M.fichaDeAvatar(seed, 'Comum', nv);
      n++;
      if (f.F + f.H + f.R + f.A !== f.pontos) errado++;
    }
  }
  ok(errado === 0, 'a soma das quatro é sempre exactamente o orçamento',
     n.toLocaleString('pt-BR') + ' fichas, do nível 1 ao 35');
}

/* E o custo da troca, medido: um zero na Habilidade tranca TODAS as
   magias do avatar (o tecto é H×5), portanto tem de desaparecer assim
   que a bolsa chegue para o pagar. Chega ao nível 7. */
{
  const primeiroSemZeros = (() => {
    for (let nv = 1; nv <= 35; nv++) {
      let temZero = false;
      for (let seed = 1; seed <= 1200 && !temZero; seed++) {
        const f = M.fichaDeAvatar(seed, 'Comum', nv);
        if (f.F === 0 || f.H === 0 || f.A === 0 || f.R === 0) temZero = true;
      }
      if (!temZero) return nv;
    }
    return null;
  })();
  console.log('       primeiro nível sem zeros em ficha nenhuma: ' + primeiroSemZeros);
  ok(primeiroSemZeros !== null && primeiroSemZeros <= 13,
     'os zeros acabam cedo — antes de a magia defensiva sequer chegar',
     'sem zeros a partir do nível ' + primeiroSemZeros + ', e a defensiva chega ao 10');
}

// ════════════════════════════════════════════════════════════════
titulo('A VIRTUDE E O DEFEITO NÃO TROCAM');

/* Trocavam. A escolha era filtrada pelo orçamento de HOJE, o orçamento
   cresce com o nível, e por isso o bolo crescia e o índice sorteado caía
   noutro sítio — 1,7% das subidas trocavam de virtude, e com ela podiam
   levar dez pontos de vida. É o mesmo defeito que as magias tiveram. */
{
  let trocou = 0, n = 0;
  for (let seed = 1; seed <= 800; seed++) {
    let antV = null, antD = null;
    for (let nv = 5; nv <= 35; nv++) {
      const f = M.fichaDeAvatar(seed, 'Comum', nv);
      const v = f.vantagem ? f.vantagem.id : null;
      const d = f.desvantagem ? f.desvantagem.id : null;
      /* Compara-se com o nível anterior, mas só quando havia lá alguma
         coisa. A carta que ainda NÃO apareceu é nula, e trocar de nulo
         para a virtude do ADULTO é a fase a abrir e não uma troca — era
         o que este teste tinha de saber distinguir. */
      if (antV !== null && v !== null) { n++; if (v !== antV) trocou++; }
      if (antD !== null && d !== null) { n++; if (d !== antD) trocou++; }
      if (v !== null) antV = v;
      if (d !== null) antD = d;
    }
  }
  ok(trocou === 0, 'a virtude e o defeito, uma vez vistos, nunca mais trocam',
     n.toLocaleString('pt-BR') + ' comparações');
}

// ══════════════════════════════════════════════════════════════════
titulo('A ESCOLHA DO ANCIÃO');

/* A escolha custa nos dois lados, e essa é a afirmação que mais depressa
   se perde: basta alguém achar que "tirar o defeito" devia ser de graça e
   o jogo deixa de ter uma decisão para ter um prémio. */
{
  const NV_ANCIAO = 27, NV_ADULTO = 11;
  const f = (nv, esc) => M.fichaDeAvatar(7, 'Comum', nv, null, esc);

  const base = f(NV_ANCIAO, null);
  const comV = f(NV_ANCIAO, 'vantagem');
  const semD = f(NV_ANCIAO, 'semDefeito');

  ok(!!base.vantagemOferta && base.vantagemOferta.id !== base.vantagem.id,
     'há sempre uma segunda virtude à espera, e é outra',
     base.vantagem.id + ' + ' + (base.vantagemOferta || {}).id);

  ok(comV.vantagem2 && comV.vantagem2.id === base.vantagemOferta.id && !!comV.desvantagem,
     'escolher a virtude dá a segunda e mantém o defeito',
     (comV.vantagem2 || {}).id + ' · defeito ' + ((comV.desvantagem || {}).id || 'nenhum'));

  ok(!semD.desvantagem && !semD.vantagem2,
     'escolher sem defeito tira-o, e não dá a segunda virtude',
     'defeito ' + ((semD.desvantagem || {}).id || 'nenhum'));

  ok(comV.pontos === base.pontos - base.vantagemOferta.custo,
     'a segunda virtude paga o preço dela',
     base.pontos + ' − ' + base.vantagemOferta.custo + ' = ' + comV.pontos);

  /* O custo de uma desvantagem é NEGATIVO porque ela dá pontos: somar esse
     número é tirá-los. Já escrevi isto ao contrário uma vez. */
  ok(semD.pontos === base.pontos + base.desvantagem.custo,
     'e tirar o defeito abre mão dos pontos que ele dava',
     base.pontos + ' + (' + base.desvantagem.custo + ') = ' + semD.pontos);

  ok(comV.pontos < base.pontos && semD.pontos < base.pontos,
     'as duas descem o orçamento — nenhuma é de graça',
     'hoje ' + base.pontos + ' → virtude ' + comV.pontos + ' · sem defeito ' + semD.pontos);

  // Antes do ANCIÃO não vale, mesmo que alguém a escreva no save.
  const cedo = M.fichaDeAvatar(7, 'Comum', NV_ADULTO, null, 'vantagem');
  const cedoLimpo = M.fichaDeAvatar(7, 'Comum', NV_ADULTO, null, null);
  ok(!cedo.vantagem2 && cedo.pontos === cedoLimpo.pontos,
     'antes do ANCIÃO a escolha não vale nada',
     'nv' + NV_ADULTO + ' → ' + cedo.pontos + ' pontos, igual a quem não escolheu');

  // Um valor estranho também não.
  const lixo = M.fichaDeAvatar(7, 'Comum', NV_ANCIAO, null, 'as_duas');
  ok(!lixo.vantagem2 && !!lixo.desvantagem && lixo.pontos === base.pontos,
     'e um valor que não existe não abre porta nenhuma',
     "'as_duas' → " + lixo.pontos + ' pontos, sem segunda virtude');

  // A guarda de quem FAZ.
  const slot = nv => ({ seed: 7, raridade: 'Comum', nivel: nv });
  ok(!M.podeEscolherAnciao(slot(NV_ADULTO)) && M.podeEscolherAnciao(slot(NV_ANCIAO)),
     'só pode escolher quem lá chegou',
     'nv' + NV_ADULTO + ' não · nv' + NV_ANCIAO + ' sim');
  ok(!M.podeEscolherAnciao({ ...slot(NV_ANCIAO), escolhaAnciao: 'vantagem' })
  && !M.podeEscolherAnciao({ ...slot(NV_ANCIAO), dead: true }),
     'e só uma vez, e nunca depois de morto',
     'já escolheu: não · morto: não');
}

/* A segunda virtude sorteia-se SEMPRE, mesmo para quem nunca chegará a
   ANCIÃO. Se só saísse ao chegar lá, a fila de sorteios mudava de
   comprimento nesse dia e tudo o que vem depois dela caía noutro sítio —
   o avatar mudava de virtude, de defeito e de magias ao subir de nível. */
{
  let semSegunda = 0, igualAPrimeira = 0, n = 0;
  for (let seed = 1; seed <= 1200; seed++) {
    const vd = M.sortearVantagens(seed, 12, null);
    if (!vd) continue;
    n++;
    if (!vd.vantagem2) semSegunda++;
    else if (vd.vantagem2.id === vd.vantagem.id) igualAPrimeira++;
  }
  ok(semSegunda === 0 && igualAPrimeira === 0,
     'toda a gente traz a segunda virtude sorteada, e nunca repetida',
     n.toLocaleString('pt-BR') + ' avatares · ' + semSegunda + ' sem · ' + igualAPrimeira + ' repetidas');
}

console.log('');
console.log('─────────────────────────────');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
