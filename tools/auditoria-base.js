// ═══════════════════════════════════════════════════════════════════
// AUDITORIA — cada magia, vantagem e desvantagem, uma a uma
//
// Não mede balanceamento. Pergunta uma coisa só a cada item do
// catálogo: o efeito que está escrito acontece mesmo em jogo?
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');

const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');
global.window = { registerStrings: x => { global.__PT = { ...(global.__PT || {}), ...x }; } };
require(path.join(RAIZ, 'js/i18n-magias.js'));
require(path.join(RAIZ, 'js/i18n-vantagens.js'));

const M = new Function('t',
  rd('cores.js') + rd('nascimento.js') + rd('raridade.js') +
  rd('vantagens.js') + rd('ficha-3dt.js') + rd('magias.js') + rd('combate-3dt.js') +
  `return { MAGIAS, MAGIAS_UNIVERSAIS, VANTAGENS, DESVANTAGENS, magiasDoAvatar,
            MAGIA_SLOTS, MAGIA_CATEGORIAS, MAGIA_ESCADA, repertorioCompleto, degrauDoSlot,
            nascer, gerarDna, tendenciaDoDna, vocacaoDoDna, sexoDoDna, sexoDe,
            tendenciaDe, registarNascimento, dnaLegivel, recessivosDoDna,
            misturarCores, CORES_RODA, NASC_ALELOS, NASC_CARACS,
            raridadeDaFase, raridadeDosPontos, grauDaRaridade, faseDoSlot, raridadeDoSlot,
            sincronizarRaridade, podeSerVendido, RARIDADE_POR_FASE, magiaAoAlcance, habilidadeParaMagia, trancaDaMagia,
            combate3dtIniciar, combate3dtTurno, combate3dtResultado,
            _c3, _c3rng, _c3criar, _c3fa, _c3fd, _c3custoMagia, _c3podeMagiar,
            _c3trocaLimpa, _c3resolver, _c3fimTurno, _c3teste, _c3bonusEsquiva, _c3podeEsquivar,
            _c3hAtk, _c3aDef, _c3rResistir, _c3pmDisponivel, _c3pagar, fichaDeAvatar, politica3dt, _c3pmIdeal, _d6,
            _c3largarSustentadas, _c3custoSustentadas, _c3recalcular, _c3efeitosSustentada };`
)(id => (global.__PT[id] || id));

// ── Um duelo controlado ────────────────────────────────────────────
// Dois combatentes com características que eu escolho, para o efeito
// medido não ficar escondido debaixo da variação das fichas.
function duelo(cfg) {
  cfg = cfg || {};
  const slot = { nome: 'X', elemento: 'Fogo', raridade: 'Comum', nivel: 1, seed: 1 };
  const e = M.combate3dtIniciar([slot, slot, slot], [slot, slot, slot], cfg.seed || 1,
                                { historico: true, politica: cfg.politica,
                                  escolhaTroca: cfg.escolhaTroca || (() => -1) });
  const arruma = (c, p) => {
    p = p || {};
    Object.assign(c.ficha, { F: 2, H: 2, R: 4, A: 2 }, p.carac || {});
    // pv/pm são o ESTADO actual; o máximo continua a vir da ficha, senão
    // um combatente ferido nascia com a vida cheia e nada podia curá-lo
    c.pvMax = c.ficha.R * 5; c.pv = p.pv != null ? p.pv : c.pvMax;
    c.pmMax = p.pmMax != null ? p.pmMax : 200; c.pm = p.pm != null ? p.pm : c.pmMax;
    c.elemento = p.elemento || 'Fogo';
    c.vant = p.vant || null; c.desv = p.desv || null;
    c.magias = p.magias || { ataque: null, forte: null, defesa: null };
    c.nome = p.nome || c.nome;
    c.iniciativa = p.iniciativa != null ? p.iniciativa : 10;
  };
  e.A.forEach((c, i) => arruma(c, i === 0 ? cfg.a : cfg.aBanco));
  e.B.forEach((c, i) => arruma(c, i === 0 ? cfg.b : cfg.bBanco));
  e.A[0].nome = 'A'; e.B[0].nome = 'B';
  return e;
}

// Corre N turnos e devolve todos os eventos do lado A
function lancar(cfg, n) {
  const e = duelo(cfg);
  for (let i = 0; i < (n || 1) && !e.acabou; i++) M.combate3dtTurno(e);
  return { e, evA: e.eventos.filter(v => v.lado === 'A'), evB: e.eventos.filter(v => v.lado === 'B') };
}

// Lança a mesma magia muitas vezes e junta o que aconteceu
function repetir(cfgFn, n) {
  const juntos = [];
  for (let s = 1; s <= n; s++) {
    const cfg = cfgFn(s); cfg.seed = s;
    const { e, evA } = lancar(cfg, cfg.turnos || 1);
    juntos.push({ e, evA });
  }
  return juntos;
}

// ── Relatório ──────────────────────────────────────────────────────
const linhas = [];
let ok = 0, mau = 0;
function ver(nome, condicao, detalhe) {
  if (condicao) { ok++; linhas.push(['  OK  ', nome, detalhe || '']); }
  else { mau++; linhas.push(['FALHA ', nome, detalhe || '']); }
}
function nomeDe(id) { return (global.__PT['mag.' + id + '.nome'] || global.__PT['vd.' + id + '.nome'] || id); }

module.exports = { M, duelo, lancar, repetir, ver, linhas, nomeDe,
                   relatorio: () => ({ ok, mau, linhas }) };
