#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A PRESENÇA DA RARIDADE NA ARENA, E O QUE ELA NÃO PODE TOCAR

   A etapa 3J.6 tirou a raridade da anatomia: um Comum, um Raro e um
   Lendário com a mesma seed têm os mesmos braços, os mesmos espinhos e
   os mesmos tentáculos. A 3J.7 devolveu-lhe uma leitura visual em
   combate — mas FORA do desenho.

   ── PORQUE FORA ──

   O `_afAssentar` (js/arena-fu.js) mede o SVG com `getBBox()` para
   assentar os pés no chão e para calcular o `--cabeca` onde o nome se
   pendura. A 3J.5 mediu no browser o que uma aura dentro do SVG faz a
   essa medida:

     aura visível        y −41, altura 352
     display:none        y  55, altura 203
     opacity:0           y −41, altura 352
     visibility:hidden   y −41, altura 352

   Só o `display:none` sai da medida — e aí não se vê nada. Logo não há
   maneira de ter uma aura dentro do SVG sem lhe mexer nos pés. Este
   arquivo existe para isso não voltar.

   ── O QUE SE CONFERE ──

     A  Comum não acende presença
     B  Raro acende a dele
     C  Lendário acende a dele, e não a do Raro
     D  a fase não entra: as quatro dão a mesma classe
     E  o nível não entra: a fonte é a raridade reconhecida
     F  nada de raridade entrou no gerarSVG
     G  o `.cb-anel` continua a ser vez/ação/alvo e mais nada
     H  o Comum não fica com elementos acesos à espera

   ── COMO SE CARREGA UMA TELA EM NODE ──

   O js/arena-fu.js mexe na tela, mas o `_afAuraDoModelo` é quase puro:
   lê `c.efeitos`, `c.ficha`, `c.estados` e devolve uma lista de classes.
   Carrega-se o arquivo inteiro com `window` e `document` de faz-de-conta
   — o que ele faz no topo é pendurar dois ouvintes — e chama-se a função
   como o desenho a chama.

   Correr:  node tools/testar-aura-raridade.js
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');

/* ── A TELA DE FAZ-DE-CONTA ──
   O mínimo para o arquivo carregar. Nenhum teste daqui desenha nada: o
   que se mede é a lista de classes que o modelo devolve. */
const nada = () => {};
const elFalso = () => ({
  classList: { toggle: nada, contains: () => false, add: nada, remove: nada },
  style: { setProperty: nada }, querySelector: () => null, querySelectorAll: () => [],
  appendChild: nada, insertBefore: nada, remove: nada, insertAdjacentHTML: nada,
  getBoundingClientRect: () => ({}), innerHTML: '', firstChild: null,
  setAttribute: nada, dataset: {},
});
const win = { addEventListener: nada, removeEventListener: nada, requestAnimationFrame: nada,
              setTimeout: nada, clearTimeout: nada, innerWidth: 1200, innerHeight: 800,
              matchMedia: () => ({ matches: false, addEventListener: nada }) };
const doc = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
              createElement: elFalso, createElementNS: elFalso,
              addEventListener: nada, removeEventListener: nada,
              body: elFalso(), documentElement: elFalso() };

const M = new Function('window', 'document', 't', 'esc', 'navigator', 'localStorage',
  rd('ficha-fu.js') + rd('combate-fu.js') + rd('arena-fu.js') + NL +
  'return { _afAuraDoModelo, fuRaridadeDa, FU_RARIDADES, FU_ESTADOS_LISTA };'
)(win, doc, (k) => k, (s) => String(s), { userAgent: 'node' },
  { getItem: () => null, setItem: nada });

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK    ' + titulo.padEnd(54) + ' · ' + (detalhe || '')); }
  else      { falhou++; console.log('  FALHOU ' + titulo.padEnd(53) + ' · ' + (detalhe || '')); }
}
const tit = (x) => console.log(NL + '─── ' + x + ' ' + '─'.repeat(Math.max(0, 56 - x.length)));

/* Um lutador como o modelo o recebe. `pv` acima da crise para o
   `fuEmCrise` não acender nada, e nenhum estado. */
function lutador(raridade, nivel, extra) {
  return Object.assign({
    id: 'x', vivo: true, pv: 999, efeitos: {}, estados: {}, lado: 'A', posto: 0,
    ficha: { raridade, nivel, crise: 1 },
  }, extra || {});
}
/* A classe de raridade que o modelo devolveu, ou '' se nenhuma. */
const classeRar = (c) => {
  const cls = M._afAuraDoModelo(c).cls;
  const r = cls.filter(x => x === 'rar-raro' || x === 'rar-lendario');
  return r.length === 1 ? r[0] : r.join('+');
};

const ESPERADO = { 'Comum': '', 'Raro': 'rar-raro', 'Lendário': 'rar-lendario' };

/* ════════════ A, B, C — CADA RARIDADE ════════════ */
tit('CADA RARIDADE ACENDE A SUA');

ok(classeRar(lutador('Comum', 1)) === '', 'A · o Comum não acende presença nenhuma',
   'classes de raridade: nenhuma');
ok(classeRar(lutador('Raro', 1)) === 'rar-raro', 'B · o Raro acende a dele',
   'rar-raro');
ok(classeRar(lutador('Lendário', 1)) === 'rar-lendario', 'C · o Lendário acende a dele',
   'rar-lendario');
ok(classeRar(lutador('Lendário', 1)) !== classeRar(lutador('Raro', 1)),
   'C · e o Lendário não acende a do Raro', 'as duas classes são distintas');

/* Uma raridade que não existe cai em nada, e não rebenta: o
   `fuRaridadeDa` devolve Comum a quem não tem registro, mas a ficha
   pode chegar aqui com lixo se alguém a montar à mão. */
const LIXO = [undefined, null, '', 'Épico', 'raro', 'LENDÁRIO', 0, {}];
const acenderam = LIXO.filter(x => classeRar(lutador(x, 1)) !== '');
ok(acenderam.length === 0, 'e uma raridade que não existe não acende nada',
   acenderam.length ? 'acendeu com ' + JSON.stringify(acenderam)
                    : LIXO.length + ' valores de lixo');

/* ════════════ D — A FASE NÃO ENTRA ════════════ */
tit('A FASE NÃO ENTRA');

/* A fase vem do nível (fuFaseDoNivel): os degraus são 5, 11 e 27, logo
   estes quatro níveis são um por fase. Se a aura olhasse para a fase, a
   classe mudava entre eles. */
const NIVEIS_POR_FASE = [[1, 'bebê'], [7, 'jovem'], [15, 'adulto'], [40, 'ancião']];
let faseMexeu = [];
for (const rar of ['Comum', 'Raro', 'Lendário']) {
  const vistas = {};
  for (const [nv, rot] of NIVEIS_POR_FASE) vistas[rot] = classeRar(lutador(rar, nv));
  const distintas = Object.keys(vistas).filter((k, i, a) => vistas[k] !== vistas[a[0]]);
  if (distintas.length) faseMexeu.push(rar + ': ' + JSON.stringify(vistas));
  ok(distintas.length === 0 && vistas['bebê'] === ESPERADO[rar],
     'D · o ' + rar + ' dá a mesma classe nas 4 fases',
     'bebê/jovem/adulto/ancião → ' + (vistas['bebê'] || 'nenhuma'));
}

/* ════════════ E — O NÍVEL NÃO ENTRA ════════════ */
tit('O NÍVEL NÃO ENTRA');

/* Os dois degraus que um "nível = raridade" usaria são o 11 e o 27 (os
   FU_FASES). Um Comum de nível 60 continua sem presença, e um Raro de
   nível 1 continua com a dele. */
ok(classeRar(lutador('Comum', 60)) === '',
   'E · um Comum de nível 60 continua sem presença', 'nível 60, nenhuma classe');
ok(classeRar(lutador('Comum', 27)) === '',
   'E · e o nível 27 não o faz Lendário', 'era o degrau do ancião');
ok(classeRar(lutador('Comum', 11)) === '',
   'E · nem o nível 11 o faz Raro', 'era o degrau do adulto');
ok(classeRar(lutador('Raro', 1)) === 'rar-raro',
   'E · e um Raro de nível 1 já tem a dele', 'a raridade não espera pelo nível');
ok(classeRar(lutador('Lendário', 1)) === 'rar-lendario',
   'E · e um Lendário de nível 1 também', '');

/* E a fonte, na fonte: o fuRaridadeDa lê o `raridadeReconhecida`, que o
   cliente não grava, e nunca o nível. */
ok(M.fuRaridadeDa({ raridadeReconhecida: 'Lendário', nivel: 1 }) === 'Lendário'
   && M.fuRaridadeDa({ nivel: 60 }) === 'Comum',
   'E · o fuRaridadeDa lê o reconhecido e ignora o nível',
   'sem registro → Comum, tenha o nível que tiver');

/* ════════════ O ESTADO ABAFA A PRESENÇA ════════════ */
tit('O ESTADO ABAFA A PRESENÇA, E NÃO O CONTRÁRIO');

for (const rar of ['Raro', 'Lendário']) {
  ok(classeRar(lutador(rar, 20, { vivo: false })) === '',
     'quem caiu perde a presença (' + rar + ')', 'vivo: false → nenhuma classe');
}
/* Mas um estado temporário NÃO a apaga: atordoado continua a ser um
   Lendário atordoado. */
const comEstado = M._afAuraDoModelo(lutador('Lendário', 20, { estados: { atordoado: true } }));
ok(comEstado.cls.indexOf('rar-lendario') !== -1 && comEstado.cls.indexOf('est-atordoado') !== -1,
   'e um estado soma-se a ela em vez de a substituir',
   comEstado.cls.join(' '));
/* E a guarda, que é a outra classe que mais aparece. */
const comGuarda = M._afAuraDoModelo(lutador('Raro', 20, { guardando: true }));
ok(comGuarda.cls.indexOf('rar-raro') !== -1 && comGuarda.cls.indexOf('escudo') !== -1,
   'e a guarda também', comGuarda.cls.join(' '));

/* ════════════ F — NADA DISTO ENTROU NO DESENHO ════════════ */
tit('O DESENHO FICOU DE FORA');

const fonteData = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const dataLimpo = semComentarios(fonteData);

ok(!/rar-raro|rar-lendario|cb-rar/.test(dataLimpo),
   'F · nenhuma classe de presença entrou no js/data.js',
   'a aura da arena vive no DOM da arena');
ok(!/av-aura-raridade|av-raridade|av-rar/.test(dataLimpo),
   'F · e não se criou nenhum grupo de raridade no SVG',
   'entraria no getBBox e mexia nos pés');
/* O que o SVG JÁ tinha de raridade continua lá, e é de propósito: as
   partículas e o glow saem numa etapa própria. */
ok(/av-particula/.test(dataLimpo) && /stdDeviation/.test(fonteData),
   'F · e as partículas e o glow do SVG ficaram como estavam',
   'a 3J.7 acrescenta presença, não substitui o que havia');

/* E a anatomia continua liberta — a 3J.6 não foi desfeita. */
ok(!/grauDaRaridade|RARIDADE_GRAU/.test(dataLimpo)
   && !/\[\s*4\s*,\s*6\s*,\s*8\s*\]|\[\s*0\s*,\s*2\s*,\s*4\s*\]/.test(dataLimpo),
   'F · e a raridade continua fora da anatomia (3J.6)',
   'nem o grau nem os dois tetos voltaram');

/* ════════════ G — O ANEL É DE QUEM ERA ════════════ */
tit('O ANEL CONTINUA A SER A VEZ, A AÇÃO E O ALVO');

const fonteCss = fs.readFileSync(path.join(RAIZ, 'css', 'combate-arena.css'), 'utf8');
const cssLimpo = semComentarios(fonteCss);

/* Nenhuma regra pode acender o anel por raridade. */
const regrasDoAnel = (cssLimpo.match(/[^{}]*\.cb-anel[^{}]*\{[^}]*\}/g) || []);
const anelPorRaridade = regrasDoAnel.filter(r => /rar-raro|rar-lendario/.test(r));
ok(anelPorRaridade.length === 0, 'G · nenhuma regra acende o anel por raridade',
   regrasDoAnel.length + ' regras do anel, 0 com raridade');
/* E a cor dele continua a sair do lado e do alvo. */
ok(/\.cb-posto\.eu\s*\{\s*--anel:/.test(cssLimpo) && /\.cb-posto\.ini\s*\{\s*--anel:/.test(cssLimpo),
   'G · e a cor dele continua a sair do lado', '--anel: eu / ini');
/* A presença não mora na camada do anel. */
ok(/\.cb-efeitos-tras\.rar-raro/.test(cssLimpo) && /\.cb-efeitos-tras\.rar-lendario/.test(cssLimpo),
   'G · a presença mora na camada de trás do corpo', '.cb-efeitos-tras');

/* ════════════ H — O COMUM NÃO FICA COM LASTRO ════════════ */
tit('O COMUM NÃO FICA COM ELEMENTOS À ESPERA');

const fonteArena = fs.readFileSync(path.join(RAIZ, 'js', 'arena-fu.js'), 'utf8');
const arenaLimpo = semComentarios(fonteArena);

/* Os dois `<i>` só se criam quando a raridade pede — a condição tem de
   estar lá. Se alguém os puser no innerHTML de arranque, o Comum passa
   a carregar dois elementos inertes por avatar. */
ok(/if\s*\(\s*rar\s*&&\s*!tras\.querySelector/.test(arenaLimpo),
   'H · os elementos criam-se só quando a raridade pede',
   'o Comum fica com zero');
ok(!/innerHTML[^;]*cb-rar/.test(arenaLimpo),
   'H · e não entraram no innerHTML de arranque',
   'lá estão os dez efeitos de estado, que são outra coisa');
/* E o segundo halo é só do Lendário. */
const regraRar2 = (cssLimpo.match(/[^{}]*\.cb-rar-2[^{}]*\{[^}]*\}/g) || []);
const rar2NoRaro = regraRar2.filter(r => /rar-raro/.test(r));
ok(rar2NoRaro.length === 0, 'H · e o segundo halo não acende no Raro',
   regraRar2.length + ' regras do segundo halo, 0 com rar-raro');

/* ════════════ A COR E A ESCALA ════════════ */
tit('A COR DA FRATURA E A ESCALA');

/* Uma fonte só para a cor. As regras da presença têm de ler a variável
   e não repetir o valor. */
const regrasDaPresenca = (cssLimpo.match(/\.cb-rar[^{}]*\{[^}]*\}/g) || []).join(NL);
ok(/var\(--fenda\)/.test(regrasDaPresenca),
   'a presença lê a cor da Fratura da variável', 'var(--fenda)');
ok(!/#b98cff|185\s*,\s*140\s*,\s*255/i.test(regrasDaPresenca),
   'e não repete o valor dela em lado nenhum',
   'uma segunda fonte de verdade divergia no dia em que se trocasse a cor');
ok(/--fenda:\s*#[0-9a-f]{6}/i.test(cssLimpo),
   'e a variável continua declarada uma vez só',
   (cssLimpo.match(/--fenda:\s*#/g) || []).length + ' declaração(ões)');

/* As medidas são percentagens da camada, que já escala com --escala.
   Um número em rem ou em px aqui não encolhia com a profundidade. */
ok(!/\.cb-rar[^{}]*\{[^}]*\b\d+(\.\d+)?(px|rem)\b/.test(cssLimpo.replace(/transition[^;]*;/g, '')
     .replace(/border-radius[^;]*;/g, '')),
   'e as medidas da presença são percentagens',
   'a .cb-efeitos-tras já escala com --escala');

/* ════════════ REDUCED MOTION ════════════ */
tit('A POLÍTICA DE REDUÇÃO DE MOVIMENTO');

/* Não se criou política nova: a que já existia passou a cobrir a camada
   de trás. Sem isto, a presença do Lendário continuava a respirar para
   quem pediu que nada se mexesse. */
ok(/\.cb-efeitos-tras\s*>\s*i/.test(cssLimpo) &&
   /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,900}?\.cb-efeitos-tras\s*>\s*i/.test(cssLimpo),
   'a camada de trás entrou na regra que já existia',
   '.cb-auras > i, .cb-efeitos-tras > i, .cb-elo');
/* E nenhum temporizador novo em JS. */
ok(!/setInterval|requestAnimationFrame/.test(
     arenaLimpo.slice(arenaLimpo.indexOf('function _afAuraDoModelo'),
                      arenaLimpo.indexOf('function _afElos'))),
   'e a presença não trouxe temporizador nenhum em JS',
   'quem anima é o CSS');

/* ════════════ O ISOLAMENTO, DAS DUAS PONTAS ════════════ */
tit('O ISOLAMENTO');

/* mesma raridade + fases diferentes = mesma classe. Já medido no D;
   aqui conta-se o conjunto, para o caso de uma fase do meio divergir. */
let combinacoes = 0, divergencias = 0;
for (const rar of ['Comum', 'Raro', 'Lendário']) {
  for (let nv = 1; nv <= 60; nv++) {
    combinacoes++;
    if (classeRar(lutador(rar, nv)) !== ESPERADO[rar]) divergencias++;
  }
}
ok(divergencias === 0, 'a classe depende só da raridade, em 60 níveis',
   combinacoes + ' combinações · ' + divergencias + ' divergências');

/* mesma fase + raridades diferentes = diferença só na presença. Prova-se
   pelo que o modelo devolve: tirando a classe de raridade, as listas
   dos três são iguais. */
let listasIguais = true, exemplo = '';
for (const nv of [1, 7, 15, 40]) {
  const semRar = ['Comum', 'Raro', 'Lendário'].map(r =>
    M._afAuraDoModelo(lutador(r, nv)).cls
      .filter(x => x !== 'rar-raro' && x !== 'rar-lendario').join(' '));
  if (semRar[0] !== semRar[1] || semRar[0] !== semRar[2]) {
    listasIguais = false; exemplo = 'nível ' + nv + ': ' + JSON.stringify(semRar);
  }
}
ok(listasIguais, 'e fora dela as três raridades pedem o mesmo',
   listasIguais ? '4 fases × 3 raridades' : exemplo);

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
