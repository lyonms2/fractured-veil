/* ═══════════════════════════════════════════════════════════════════
   O MANUAL CONTRA O CÓDIGO

     node tools/conferir-manual.js

   O manual.html promete NÚMEROS EXATOS — foi a escolha do dono do jogo
   quando ele foi reescrito. A partir do momento em que promete, cada
   ajuste de balanço que ninguém copie para lá transforma uma página de
   ajuda em desinformação, e o jogador só descobre quando o jogo lhe
   recusa o que o manual disse que ele podia fazer.

   Esta ferramenta lê o número no CÓDIGO e confere que o manual o diz,
   nas duas línguas onde as duas línguas o escrevem igual.

   ── O QUE ELA NÃO FAZ ──

   Não lê prosa. Se o manual disser que a fome decai 0,8 mas explicar o
   decaimento ao contrário, isto passa. Ela pega o erro mais comum e
   mais caro — o número velho — e não substitui alguém ler.

   ── PORQUE LÊ O FONTE E NÃO IMPORTA ──

   Metade destes valores vive em arquivos de navegador que mexem na tela
   e em vinte globais; não se carregam no Node. Lê-se o texto e tira-se
   o número de lá. É feio, e é melhor do que não conferir.
   ═══════════════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler  = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

const manual = ler('manual.html');

/* O manual sem os comentários HTML: eles contam a história do arquivo e
   citam números antigos de propósito. */
const texto = manual.replace(/<!--[\s\S]*?-->/g, '');

let ok = 0;
const falhas = [];

/* Uma constante escrita no fonte, pelo nome. Aceita as três formas em
   que elas aparecem: `const X = 10`, `X: 10` e `X = 10,`. */
function num(arquivo, nome) {
  const m = new RegExp(`${nome}\\s*[:=]\\s*(-?[0-9.]+)`).exec(ler(arquivo));
  if (!m) { falhas.push(`não achei ${nome} em ${arquivo}`); return null; }
  return Number(m[1]);
}

/* O manual diz isto? `formas` são escritas alternativas do MESMO fato
   (vírgula ou ponto decimal, português ou inglês): basta uma. */
function diz(oQue, ...formas) {
  if (formas.some(f => f && texto.includes(f))) { ok++; return; }
  falhas.push(`${oQue}\n      procurei por: ${formas.filter(Boolean).map(f => JSON.stringify(f)).join(' ou ')}`);
}

/* Um valor lido do código tem de aparecer no manual. `molde` transforma
   o número no texto que o manual usaria. */
function dizNumero(oQue, valor, ...moldes) {
  if (valor === null) return;
  diz(`${oQue} (o código diz ${valor})`, ...moldes.map(m => m(valor)));
}

const n  = v => String(v);
const pt = v => String(v).replace('.', ',');
const mil = v => v.toLocaleString('pt-BR');

// ═══════════════════════════════════════════════════════════════════
console.log('── o que custa ──');

dizNumero('alimentar', num('js/state.js', 'CUSTO_NUTRIR'),   v => `<td>${v}</td>`);
dizNumero('medicar',   num('js/state.js', 'CUSTO_MEDICAR'),  v => `<td>${v}</td>`);
dizNumero('banho',     num('js/state.js', 'BANHO_ENERGIA'),  v => `${v} ⚡`);
dizNumero('chocar um ovo', num('api/pool.js', 'HATCH_FEE'),  v => `${v} 💎`);
dizNumero('listar no mercado', num('api/comprar-avatar.js', 'LIST_COST'), v => `${v} 💎`, v => `<td>${v}</td>`);
dizNumero('o selo da temporada', num('js/temporada.js', 'SELO_CUSTO'), v => `${v} 💎`);
dizNumero('o antídoto', num('js/state.js', "'antidoto_dimensional'[\\s\\S]*?preco"), v => `${v} 🪙`);
diz('a escada dos espaços de avatar', '150, 200, 250, 320 e 400', '150, 200, 250, 320 and 400');
diz('visitar rende, não custa', 'Rende a você', 'Pays you');

console.log('── a escada ──');
dizNumero('o teto de nível', num('js/niveis.js', 'NIVEL_MAXIMO'), v => `<td>27 a ${v}</td>`, v => `Nível ${v}`);
dizNumero('o degrau do Raro', num('js/ficha-fu.js', 'FU_NIVEL_RARO'), v => `<td>${v} a 26</td>`);
dizNumero('o degrau do Lendário', num('js/ficha-fu.js', 'FU_NIVEL_LENDARIO'), v => `<td>${v} a 60</td>`);
dizNumero('o 4º espaço de item', num('js/state.js', 'NIVEL_ITEM_EXTRA'), v => `Nível ${v}`);
dizNumero('o título', num('js/identidade.js', 'NIVEL_TITULO'), v => `Nível ${v}`);
diz('o XP do bebê', '250');
diz('o XP do jovem', '700');
diz('o XP do adulto', '1.200', '1,200');
diz('o XP do ancião', '3.000', '3,000');

console.log('── cuidar ──');
diz('a fome decai 0,8',    '&minus;0,8');
diz('o humor decai 1,5',   '&minus;1,5');
diz('a energia decai 0,6', '&minus;0,6');
diz('a higiene decai 0,12','&minus;0,12');
dizNumero('as doenças pegam depois de', num('js/state.js', 'DISEASE_STRESS_THRESHOLD'), v => `<strong>${v} ciclos seguidos</strong>`);
dizNumero('cada doença come', num('js/state.js', 'DISEASE_DECAY_PER_CYCLE'), v => `<strong>${pt(v)} de saúde por ciclo</strong>`);
diz('o descanso parado, dormindo', '+2 por ciclo', '+2 per cycle');
diz('o descanso parado, acordado', '+1 por ciclo', '+1 per cycle');

/* OS TEMPOS SÃO CONTA, e é isso que os torna perigosos: ninguém
   escreve "2 h 47" duas vezes, então se o decaimento mudar eles ficam
   errados em silêncio, e a tabela continua bonita. */
{
  const tick = ler('js/gametick.js');
  const porCiclo = (nome, padrao) => {
    const m = padrao.exec(tick);
    return m ? Number(m[1]) : null;
  };
  /* O ramo de quem está ACORDADO, que é o da tabela do manual. O
     GAME_SPEED só aparece nele — sem essa marca o padrão encontrava
     primeiro o ramo do sono, onde a fome decai 0,30 e a higiene 0,05, e
     acusava o manual de errar tempos que ele acerta. */
  const acordado = (vital) =>
    porCiclo(vital, new RegExp(
      'vitals\\.' + vital + '\\s*=\\s*Math\\.max\\(0,\\s*vitals\\.' + vital +
      '\\s*-\\s*\\(([0-9.]+)[^)]*GAME_SPEED'));
  const decai = {
    fome:    acordado('fome'),
    humor:   acordado('humor'),
    energia: acordado('energia'),
    higiene: acordado('higiene'),
  };
  /* Como o manual escreve um tempo, e o que aceitar.

     O "contém" não serve aqui: "~1 h" cabe dentro de "~1 h 07", e um
     decaimento mudado de 1,5 para 2,5 passava no teste porque o texto
     velho ainda continha o novo. Compara-se com limite à direita.

     A higiene leva 13 h 53 e o manual arredonda para ~14 h — aceita-se o
     arredondamento quando ele está a menos de cinco minutos. */
  const dizTempo = (oQue, min) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    const formas = [h ? `~${h} h ${String(m).padStart(2, '0')}` : `~${m} min`];
    // O til quer dizer aproximado: a hora mais próxima também serve.
    // (a higiene leva 13 h 53 e o manual diz ~14 h, que é o que se lê bem)
    if (h) formas.push(`~${m >= 30 ? h + 1 : h} h`);
    const bate = formas.some(f => new RegExp(f.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&') + '(?![0-9])').test(texto));
    if (bate) { ok++; return; }
    falhas.push(`${oQue}
      o manual devia dizer: ${formas.join(' ou ')}`);
  };

  for (const [vital, valor] of Object.entries(decai)) {
    if (valor === null) { falhas.push(`não achei o decaimento de ${vital} no js/gametick.js`); continue; }
    dizTempo(`o tempo de esvaziar ${vital} (${valor} por ciclo)`, 100 / valor);
  }
}

console.log('── batalhar ──');
dizNumero('a batalha custa', num('js/pve-fu.js', 'PVE_ENERGIA_CUSTO'), v => `${v} ⚡ de cada um dos três`);
dizNumero('desistir custa',  num('js/pve-fu.js', 'PVE_ENERGIA_DESISTIR'), v => `${v} ⚡`);
dizNumero('o PvP pede',      num('js/pvp-regras.js', 'PVP_ENERGIA_MINIMA'), v => `${v} ⚡`);
dizNumero('a morte súbita',  num('js/combate-fu.js', 'FU_MORTE_SUBITA'), v => `rodada ${v}`, v => `round ${v}`);
dizNumero('a fratura',       num('js/pvp-regras.js', 'PVP_FRATURA_CHANCE'), v => `${v * 100}%`);
diz('o Concentrado ignora resistências', 'ignora resistências', 'ignores resistances');

console.log('── a arena ──');
dizNumero('o tempo por jogada', num('js/pvp-regras.js', 'PVP_JOGADA_MS'), v => `${v / 1000} segundos por jogada`, v => `${v / 1000} seconds per move`);
dizNumero('o rank de partida',  num('js/pvp-rank.js', 'PVP_RANK_INICIO'), v => `<span class="value">${v}</span>`);
dizNumero('o piso do rank',     num('js/pvp-rank.js', 'PVP_RANK_PISO'), v => `${v} — não se cai abaixo`, v => `${v} — you cannot fall below`);
dizNumero('quanto vale uma luta', num('js/pvp-rank.js', 'PVP_RANK_K'), v => `${v} pontos`);
dizNumero('as lutas de colocação', num('js/pvp-rank.js', 'PVP_RANK_COLOCACAO'), v => `As ${v} primeiras`, v => `The first ${v}`);
dizNumero('a vitória paga',     num('js/pvp-regras.js', 'vitoria: \\{ moedas'), v => `<td>${v} 🪙</td>`);
dizNumero('quantos recebem',    num('js/temporada.js', 'SELO_PREMIADOS'), v => `os ${v * 100}% do topo`, v => `the top ${v * 100}%`);
dizNumero('o mínimo de lutas',  num('js/temporada.js', 'SELO_MIN_LUTAS'), v => `${v} lutas ranqueadas`, v => `${v} ranked matches`);
dizNumero('o reforço da pool',  num('js/temporada.js', 'SELO_POOL_FRACAO'), v => `<strong>${v * 100}% do saldo dela</strong>`, v => `<strong>${v * 100}% of its balance</strong>`);

console.log('── o dinheiro ──');
dizNumero('a taxa do resgate', num('js/taxas.js', 'TAXA_RESGATE'), v => `${v * 100}%, cobrada à parte`, v => `${v * 100}%, charged on top`);
dizNumero('a fatia da pool na venda', num('js/taxas.js', 'TAXA_VENDA_POOL'), v => `${v * 100}% do preço`);
diz('a venda deixa 15% ao todo', '15% · 10 pool + 5 dev');
dizNumero('o resgate por dia', num('api/resgatar.js', 'MAX_GEMS_POR_DIA'), v => `${mil(v)} 💎`);
dizNumero('a compra máxima',  num('js/cristais.js', 'COMPRA_MAX_GEMS'), v => `${mil(v)} 💎`);
dizNumero('a compra mínima',  num('js/cristais.js', 'COMPRA_MIN_GEMS'), v => `${v} 💎 (1 POL)`);
diz('a cotação', '10 💎 = 1 POL');

console.log('── a vida ──');
/* O VINCULO_TIERS é uma lista de objetos, não uma constante: lê-se o
   primeiro degrau pelo formato em que ele está escrito. */
{
  const m = /min:\s*(\d+),\s*get label\(\)\s*\{\s*return t\('vinculo\.friend'/.exec(ler('js/state.js'));
  dizNumero('o vínculo de Amigo', m ? Number(m[1]) : null, v => `<td>${v} a 150</td>`);
}
dizNumero('o teto de laço por dia',  num('js/lacos.js', 'LACO_TETO_DIA'), v => `<td>${v}</td>`);
dizNumero('o laço de pai e filho',   num('js/lacos.js', 'LACO_PARENTE'), v => `${v} (★)`);
dizNumero('as visitas por dia',      num('js/amigos.js', 'MAX_VISITAS_GLOBAL'), v => `<span class="value">${v}</span>`);
dizNumero('o que uma ajuda dá',      num('api/amigos.js', 'VITAL_BOOST'), v => `<strong>+${v}</strong>`);
dizNumero('os ovos guardados',       num('api/pool.js', 'OVOS_MAX'), v => `até ${v}`, v => `up to ${v}`);
dizNumero('as invocações da vida',   num('js/state.js', 'INVOCACOES_GRATIS'), v => `<span class="value">${v}</span>`);
diz('o choco demora 24 a 48 h', '24 a 48 horas', '24 to 48 hours');
diz('o ovo espera 7 dias por lugar', '<strong>7 dias</strong>', '<strong>7 days</strong>');

console.log('── os minijogos ──');

/* TODOS os que existem têm de estar lá. O manual descrevia três de
   cinco — faltavam a Memória e o Simon — e um jogo que não está no
   manual é um jogo que metade das pessoas nunca abre.

   A lista sai do próprio i18n: quem acrescentar um jogo ganha um teste
   a falhar em vez de uma omissão silenciosa. */
{
  const i18n = ler('js/i18n.js');
  const re = new RegExp("'mini\\.([a-z]+)\\.title':", 'g');
  // Sem repetidos: o i18n tem os dois idiomas, e sem isto cada jogo
  // era conferido duas vezes e aparecia duas vezes na lista de falhas.
  const jogos = [...new Set([...i18n.matchAll(re)].map(m => m[1]))];
  /* O `diz` procura no MANUAL, e não serve para comparar um número:
     a primeira versão disto passava sempre porque o manual contém
     "sim" dentro de "assim". Aqui a conta é feita à mão. */
  if (jogos.length >= 5) ok++;
  else falhas.push('o i18n devia ter cinco minijogos, achei ' + jogos.length + ': ' + jogos.join(','));
  const nomeNoManual = {
    memoria: ['Memória Elemental', 'Elemental Memory'],
    simon:   ['Simon Says'],
    snake:   ['Snake Elemental', 'Elemental Snake'],
    fusao:   ['Fusão de Esferas', 'Orb Fusion'],
    tetra:   ['Tetra Elemental', 'Elemental Tetra'],
  };
  for (const j of jogos) {
    const nomes = nomeNoManual[j] || [];
    diz('o manual descreve o minijogo ' + j, ...nomes);
  }
  diz('e diz que são cinco', 'Cinco jogos');
  diz('e em inglês também', 'Five games');
}

diz('o Fácil paga',   '<td>14</td>');
diz('o Médio paga',   '<td>28</td>');
diz('o Difícil paga', '<td>55</td>');
diz('o Mestre paga',  '<td>90</td>');

// ═══════════════════════════════════════════════════════════════════
console.log();
if (falhas.length) {
  console.log(`${ok} conferem · ${falhas.length} não\n`);
  falhas.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exitCode = 1;
} else {
  console.log(`${ok} números do manual conferem com o código`);
}
