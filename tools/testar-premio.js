#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O RECIBO DA LUTA, DO LADO DO CLIENTE — sem navegador

     node tools/testar-premio.js

   O servidor decide o que a luta deixa (api/pvp.js) e o navegador tem
   de aplicar o MESMO na sua memória, senão o save seguinte passa por
   cima. Aqui carrega-se o js/pvp-luta.js num contexto com o mínimo que
   ele toca — os slots, os medidores, as moedas — e confere-se o que
   ficou: energia, humor, fratura, moedas, e o recibo que aparece no
   painel do fim.

   Não precisa de emuladores nem de rede. O outro lado da mesma conta
   está no tools/testar-pvp.js ("O que a luta deixa").
   ═══════════════════════════════════════════════════════════════════ */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');

let falhas = 0;
const ok = (c, t, d) => { console.log((c ? '  ok   ' : 'FALHA ') + t + (c ? '' : '  → ' + JSON.stringify(d))); if (!c) falhas++; };

const ctx = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat,
  t: (k, v) => k + (v ? ':' + JSON.stringify(v) : ''),
  esc: s => String(s),
  document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add(){}, remove(){} } }) },
  window: {},
  avatarSlots: [
    { id: 'av0', vitals: { energia: 100, humor: 50 }, activeDiseases: [] },
    { id: 'av1', vitals: { energia: 100, humor: 50 }, activeDiseases: [] },
    { id: 'av2', vitals: { energia: 15,  humor: 98 }, activeDiseases: [] },
    { id: 'fora', vitals: { energia: 100, humor: 50 }, activeDiseases: [] },
  ],
  activeSlotIdx: 0,
  vitals: { energia: 100, humor: 50 },
  activeDiseases: [],
  gs: { moedas: 999 },
  updateResourceUI: () => { ctx.pintou = true; },
  updateAllUI: () => {},
  scheduleSave: () => { ctx.salvou = true; },
  pvpLadoDe: () => 'A',
  showToast: () => {},
};
vm.createContext(ctx);
// as funções que o arquivo espera encontrar prontas
vm.runInContext('var _pvpChamar, _pvpDb, _afE, _afDesenhar, _afMenuMover, afAbrir, afFechar, ModalManager, pvpAvancar, pvpPreparar, pvpRegistrar, pvpContexto, pvpEquipesDaSala, pvpParaRede, pvpParaMotor, pvpChave, pvpPrazo, fuIniciar, fuAgir, fuVez, fuPorId, PVP_JOGADA_MS, PVP_FOLGA_MS, PVP_ESTOUROS_MAX, PVP_FORA_MS, uiConfirmar, uiDesarmar, _afPedeConfirmar, _pvpDepoisDaLuta, addLog;', ctx);
vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'pvp-luta.js'), 'utf8'), ctx, { filename: 'pvp-luta.js' });

// uma luta ganha na fila
vm.runInContext(`
  _pvpL = { uid: 'eu', id: 's1', sala: { tipo: 'fila' }, meu: 'A', dele: 'B', nomeDele: 'Ana' };
  _pvpLPremio({ eu: { resultado: 'vitoria', energia: 10, humor: 15, moedas: 180,
                      fraturas: ['av2'], avatares: ['av0', 'av1', 'av2'] } });
  var html1 = _pvpLPremioHTML();
`, ctx);

ok(ctx.avatarSlots[0].vitals.energia === 90, 'a energia do primeiro caiu 10', ctx.avatarSlots[0].vitals);
ok(ctx.avatarSlots[0].vitals.humor === 65, 'o humor subiu 15', ctx.avatarSlots[0].vitals);
ok(ctx.avatarSlots[2].vitals.energia === 5, 'quem tinha 15 de energia fica em 5', ctx.avatarSlots[2].vitals);
ok(ctx.avatarSlots[2].vitals.humor === 100, 'o humor não passa de 100', ctx.avatarSlots[2].vitals);
ok(ctx.avatarSlots[2].activeDiseases.indexOf('fratura') !== -1, 'quem caiu apanhou a fratura', ctx.avatarSlots[2].activeDiseases);
ok(ctx.avatarSlots[1].activeDiseases.length === 0, 'e os outros não', ctx.avatarSlots[1].activeDiseases);
ok(ctx.avatarSlots[3].vitals.energia === 100, 'quem não lutou fica como estava', ctx.avatarSlots[3].vitals);
ok(ctx.vitals.energia === 90 && ctx.vitals.humor === 65, 'o avatar aberto também anda nas variáveis soltas', ctx.vitals);
ok(ctx.gs.moedas === 999 + 180, 'as moedas somam ao que já havia', ctx.gs.moedas);
ok(ctx.pintou === true && ctx.salvou === true, 'a tela repinta e o save é agendado');

const html1 = vm.runInContext('html1', ctx);
ok(/−10/.test(html1) && /\+15/.test(html1) && /\+180/.test(html1), 'o recibo diz o que gastou e o que levou', html1);
ok(/pvp\.premio\.fratura/.test(html1), 'e avisa da fratura', html1);

// duas chegadas do mesmo fim não pagam duas vezes
vm.runInContext(`_pvpLPremio({ eu: { resultado: 'vitoria', energia: 10, humor: 15, moedas: 180, fraturas: [], avatares: ['av0','av1','av2'] } });`, ctx);
ok(ctx.gs.moedas === 999 + 180, 'o mesmo prémio não é aplicado duas vezes', ctx.gs.moedas);

// desafio de amigo: sem moedas, e diz porquê
vm.runInContext(`
  _pvpL = { uid: 'eu', id: 's2', sala: { tipo: 'amistosa' }, meu: 'A', dele: 'B' };
  _pvpLPremio({ eu: { resultado: 'vitoria', energia: 10, humor: 15, moedas: 0, fraturas: [], avatares: ['av0'] } });
  var html2 = _pvpLPremioHTML();
`, ctx);
const html2 = vm.runInContext('html2', ctx);
ok(!/🪙/.test(html2) && /pvp\.premio\.amigo/.test(html2), 'no desafio de amigo não há moedas e diz-se porquê', html2);

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo passou.');
process.exit(falhas ? 1 : 0);
