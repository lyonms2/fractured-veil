// ═══════════════════════════════════════════════════════════════════
// O PVP — A LUTA (etapa 2)
//
// A arena é a mesma do PvE (js/arena-fu.js), com a mesma coreografia; o
// que muda é quem joga o outro lado. Este arquivo é a "rede" que a arena
// recebe (afAbrir, opção `rede`):
//
//   · a minha jogada NÃO se aplica aqui: vai para a sala (acoes/NNNN) e
//     volta pelo ouvinte, como a do outro. Os dois navegadores aplicam a
//     lista na mesma ordem, no mesmo motor, e chegam à mesma luta.
//   · o relógio: 60 s por jogada, contados na hora do servidor. Estourou,
//     qualquer um dos dois escreve "tempo" e quem devia jogar guarda.
//     Três estouros seguidos do mesmo lado: abandono.
//   · a presença: quem cai fica "fora" desde a hora em que caiu; passados
//     2 minutos, o outro reclama o W.O. e o servidor confere.
//   · o fim: o servidor refaz a luta inteira (api/pvp.js, 'encerrar') e
//     grava o vencedor. A tela mostra o resultado daqui na hora, e marca
//     quando o servidor confirma.
//
// As contas (o que vale, o prazo, os estouros, o fim) são as do
// js/pvp-regras.js — as mesmas que o servidor usa.
// ═══════════════════════════════════════════════════════════════════

let _pvpL = null;

function pvpLutaAtiva() { return !!_pvpL; }

function pvpLutaAbrir(id, sala, uid) {
  if (_pvpL && _pvpL.id === id) return;
  if (_pvpL) _pvpLLimpar();
  const meu = pvpLadoDe(sala, uid);
  if (!meu || typeof afAbrir !== 'function') return;
  const dele = pvpOutroLado(meu);
  const uidDele = sala.lados[dele];
  const L = _pvpL = {
    id, sala, uid, meu, dele, uidDele,
    nomeDele: ((sala.jogadores || {})[uidDele] || {}).nome || '—',
    ctx: pvpContexto(sala), aplicadas: 0, recebidas: {}, pronto: false,
    fim: null, servidor: null, escrevendo: false, presDele: null,
    timers: [], refs: [],
  };
  const eq = pvpEquipesDaSala(sala);
  const ja = pvpListaAcoes(sala.acoes);

  const rede = {
    nomeDele: L.nomeDele,
    enviar: _pvpLEnviar, vezMinha: _pvpLVezMinha, vezDele: _pvpLVezDele,
    desistir: _pvpLDesistir, fim: _pvpLFim, fimHTML: _pvpLFimHTML, fechou: _pvpLFechou,
  };
  /* Uma luta retomada (F5, conexão que voltou): as jogadas que já houve
     aplicam-se em silêncio antes do primeiro desenho, pelas mesmas contas
     do servidor, e a arena abre no ponto certo. */
  const antes = estado => {
    for (const a of ja) {
      pvpAvancar(estado);
      if (estado.acabou) break;
      const prep = pvpPreparar(estado, a, L.ctx);
      const ok = prep.eng ? fuAgir(estado, prep.eng).length > 0 : false;
      const f = pvpRegistrar(L.ctx, prep, prep.tipo === 'desistir' || ok, a);
      L.aplicadas++;
      if (f) { L.fim = Object.assign({ local: true }, f); break; }
    }
  };
  ModalManager.open('combateModal');
  afAbrir(eq.A, eq.B, sala.seed, _pvpLSaiu, { meu, rede, antes });
  _pvpLMontarRelogio();
  _pvpLFaixaNomes();

  const db = _pvpDb();
  const ouvir = (ref, ev, fn) => { ref.on(ev, fn, () => {}); L.refs.push([ref, ev, fn]); };
  // As jogadas, na ordem das chaves (NNNN).
  ouvir(db.ref(`pvp/salas/${id}/acoes`), 'child_added', s => {
    const n = parseInt(s.key, 10);
    if (!(n >= 0) || !_pvpL || _pvpL.id !== id) return;
    L.recebidas[n] = s.val();
    _pvpLProcessar();
  });
  // O fim gravado pelo servidor (a desistência, o W.O., a conferência).
  ouvir(db.ref(`pvp/salas/${id}/estado`), 'value', s => {
    if (s.val() === 'fim' || s.val() === 'encerrada') _pvpLFimDoServidor();
  });
  // O outro: está aqui, ou caiu (e desde quando).
  ouvir(db.ref(`pvp/salas/${id}/presenca/${uidDele}`), 'value', s => { L.presDele = s.val(); });
  // Eu: estou aqui; se cair, fica a hora.
  L.presRef = db.ref(`pvp/salas/${id}/presenca/${uid}`);
  const marcar = () => L.presRef && L.presRef.set({ on: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  L.presRef.onDisconnect().set({ fora: firebase.database.ServerValue.TIMESTAMP });
  marcar();
  L.timers.push(setInterval(marcar, 20000));
  L.timers.push(setInterval(_pvpLRelogio, 250));
}

// ── AS JOGADAS QUE CHEGAM ────────────────────────────────────────
/* Só se aplica uma jogada com a arena parada num ponto de decisão (o
   `pronto`, que a arena dá ao chamar vezMinha/vezDele): assim uma jogada
   que chega no meio da animação da anterior espera a vez dela. */
function _pvpLProcessar() {
  const L = _pvpL;
  if (!L || !L.pronto || (L.fim && L.fim.local) || typeof _afE === 'undefined' || !_afE || _afE.acabou) return;
  const a = L.recebidas[L.aplicadas];
  if (!a) return;
  L.pronto = false;
  L.aplicadas++;
  const prep = pvpPreparar(_afE, a, L.ctx);
  if (prep.tipo === 'ignorar') {
    // Não vale (fora da vez, uma corrida perdida): nada muda, e a arena
    // volta a perguntar de quem é a vez.
    pvpRegistrar(L.ctx, prep, false, a);
    setTimeout(_afAndar, 0);
    return;
  }
  if (prep.tipo === 'desistir') {
    L.fim = Object.assign({ local: true }, pvpRegistrar(L.ctx, prep, true, a));
    _pvpLAcabar();
    return;
  }
  // O tempo de alguém acabou: diz-se, porque a guarda sozinha não explica.
  if (prep.tipo === 'tempo') {
    const quemTempo = prep.lado === L.meu ? t('pvp.luta.voce') : L.nomeDele;
    const av = _afPorId(prep.eng.quem);
    showToast(t('pvp.luta.estourou', { nome: quemTempo, av: av ? _afNome(av) : '' }), prep.lado === L.meu ? 'err' : 'info');
  }
  const minha = a.por === L.uid && prep.tipo === 'jogada';
  const ok = afAplicar(prep.eng, minha);
  const f = pvpRegistrar(L.ctx, prep, ok, a);
  if (f) L.fim = Object.assign({ local: true }, f);   // acaba depois da animação (vezMinha/vezDele)
  if (!ok) setTimeout(_afAndar, 0);
}

function _pvpLPonto(vez) {
  const L = _pvpL;
  if (!L) return false;
  L.pronto = true;
  L.vez = vez;
  /* As jogadas que já chegaram vêm ANTES do fim que o servidor gravou: o
     vencedor pede o fim no instante do último golpe, e o outro, que ainda
     anima o penúltimo, encerrava sem ver o golpe final (visto pelo
     subagente de verificação: DERROTA com o avatar dele ainda de pé). */
  if (L.recebidas[L.aplicadas] && !(L.fim && L.fim.local)) { _pvpLProcessar(); return true; }
  if (L.fim || L.fimServidor) {
    if (!L.fim) L.fim = L.fimServidor;
    _pvpLAcabar();
    return true;
  }
  return false;
}
function _pvpLVezMinha(vez) {
  // false: a arena não abre a minha vez — há jogada na fila, ou acabou.
  return _pvpLPonto(vez) ? false : true;
}
function _pvpLVezDele(vez) { _pvpLPonto(vez); }

/* O fim que o motor não sabe (desistência, ausência): marca-se no estado
   da arena e deixa-se ela seguir o caminho de sempre até o painel. */
function _pvpLAcabar() {
  const L = _pvpL;
  if (!L || typeof _afE === 'undefined' || !_afE) return;
  if (!_afE.acabou) {
    _afE.acabou = true;
    if (L.fim) _afE.vencedor = L.fim.vencedor;
  }
  setTimeout(_afAndar, 0);
}

// ── A MINHA JOGADA ───────────────────────────────────────────────
/* Numa transação, e com applyLocally = false: a jogada só aparece aqui
   quando o servidor a aceitou naquela casa. Com um set comum o Firebase
   mostra-a na hora, e se o outro tivesse escrito primeiro (um "tempo")
   este navegador aplicaria uma jogada que não existe. */
function _pvpLEscrever(a) {
  const L = _pvpL;
  if (!L) return Promise.resolve(false);
  const n = L.aplicadas;
  const ref = _pvpDb().ref(`pvp/salas/${L.id}/acoes/${pvpChave(n)}`);
  const dado = Object.assign({}, a, { por: L.uid, ts: firebase.database.ServerValue.TIMESTAMP });
  return ref.transaction(cur => (cur === null ? dado : undefined), null, false)
    .then(r => r.committed).catch(() => false);
}

function _pvpLEnviar(acaoArena) {
  const L = _pvpL;
  if (!L || typeof _afE === 'undefined') return;
  const a = pvpParaRede(_afE, acaoArena);
  L.escrevendo = true;
  _pvpLEscrever(a).then(ok => {
    L.escrevendo = false;
    /* Não entrou: a casa foi de outra jogada (o "tempo" do outro), e essa
       chega pelo ouvinte e decide. Se a vez ainda for minha, a arena
       volta a abri-la quando a outra se aplicar. */
    if (!ok && _pvpL === L && L.pronto && !L.recebidas[L.aplicadas]) setTimeout(_afAndar, 0);
  });
}

// ── O RELÓGIO ────────────────────────────────────────────────────
function _pvpLMontarRelogio() {
  const palco = document.getElementById('cbPalco');
  if (!palco || document.getElementById('pvpRelogio')) return;
  const el = document.createElement('div');
  el.id = 'pvpRelogio';
  el.className = 'pvp-relogio';
  el.innerHTML = '<div class="pvp-relogio-barra"><i></i></div><span class="pvp-relogio-txt"></span>';
  palco.appendChild(el);
}

function _pvpLRelogio() {
  const L = _pvpL;
  const el = document.getElementById('pvpRelogio');
  if (!L || !el) return;
  const agora = pvpAgora();

  // O outro caiu: conta-se o W.O.
  const p = L.presDele || {};
  const foraDesde = p.fora ? p.fora : null;
  const minhaVez = !!(L.vez && L.vez.lado === L.meu && L.pronto);
  if (foraDesde && !L.fim && !(_afE && _afE.acabou) && !minhaVez) {
    const falta = Math.max(0, PVP_FORA_MS - (agora - foraDesde));
    el.className = 'pvp-relogio ativo fora';
    el.querySelector('.pvp-relogio-txt').textContent =
      t('pvp.luta.caiu', { nome: L.nomeDele, tempo: _pvpRelogio(falta) });
    el.querySelector('.pvp-relogio-barra i').style.transform = `scaleX(${falta / PVP_FORA_MS})`;
    if (falta <= 0 && !L.reclamando && Date.now() - (L.ultimaReclamacao || 0) > 8000) {
      L.reclamando = true; L.ultimaReclamacao = Date.now();
      _pvpChamar('encerrar', { sala: L.id }).catch(() => {}).then(() => { L.reclamando = false; });
    }
    return;
  }

  if (!L.pronto || L.fim || !_afE || _afE.acabou || !L.vez) { el.className = 'pvp-relogio'; return; }
  /* O tempo de verdade, folga incluída: cortado em 1:00 ele ficava
     parado uns 20 s no começo de cada vez e parecia travado. Assim o
     número anda desde o primeiro segundo, e o que se vê é o que vale. */
  const prazo = pvpPrazo(L.ctx);
  const resta = prazo - agora;
  const mostra = Math.max(0, resta);
  const total = PVP_JOGADA_MS + PVP_FOLGA_MS;
  const minha = L.vez.lado === L.meu;
  el.className = 'pvp-relogio ativo ' + (minha ? 'minha' : 'dele') + (mostra <= 10000 ? ' urgente' : '');
  // Na minha vez com o outro caído, o relógio continua e o W.O. vem ao lado.
  const woTxt = (minha && foraDesde)
    ? ' · ' + t('pvp.luta.caiu_curto', { nome: L.nomeDele, tempo: _pvpRelogio(Math.max(0, PVP_FORA_MS - (agora - foraDesde))) }) : '';
  el.querySelector('.pvp-relogio-txt').textContent = (minha
    ? t('pvp.luta.sua_vez', { tempo: _pvpRelogio(mostra + 999) })
    : t('pvp.luta.escolhendo', { nome: L.nomeDele, tempo: _pvpRelogio(mostra + 999) })) + woTxt;
  // A minha vez começou: um aviso grande no meio, uma vez por vez.
  if (minha && L.avisouVez !== L.aplicadas) { L.avisouVez = L.aplicadas; _pvpLAvisoVez(); }
  if (minha && foraDesde && PVP_FORA_MS - (agora - foraDesde) <= 0 && !L.reclamando
      && Date.now() - (L.ultimaReclamacao || 0) > 8000) {
    L.reclamando = true; L.ultimaReclamacao = Date.now();
    _pvpChamar('encerrar', { sala: L.id }).catch(() => {}).then(() => { L.reclamando = false; });
  }
  el.querySelector('.pvp-relogio-barra i').style.transform = `scaleX(${Math.min(1, mostra / total)})`;

  /* Estourou e ninguém jogou: quem estiver aqui escreve o "tempo" (os
     dois podem; a casa vazia aceita um só). Meio segundo de folga para o
     relógio daqui não se adiantar ao do servidor. */
  if (resta < -500 && !L.escrevendo && !L.recebidas[L.aplicadas]) {
    L.escrevendo = true;
    _pvpLEscrever({ tipo: 'tempo' }).then(() => { L.escrevendo = false; });
  }
}

/* ── "SUA VEZ" ──
   Uma faixa no meio do palco, que entra e sai em pouco mais de um
   segundo: o relógio pequeno do topo sozinho passava despercebido. */
function _pvpLAvisoVez() {
  const palco = document.getElementById('cbPalco');
  if (!palco || (typeof _afMovimentoReduzido === 'function' && _afMovimentoReduzido())) return;
  const el = document.createElement('div');
  el.className = 'pvp-aviso-vez';
  el.innerHTML = `<i class="bt-fenda ouro esq"></i><span>${esc(t('pvp.luta.sua_vez_grande'))}</span><i class="bt-fenda ouro dir"></i>`;
  palco.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

/* O topo diz quem luta com quem: "Leo Um × Ana Dois", no lugar de
   "BATALHA". */
function _pvpLFaixaNomes() {
  const L = _pvpL;
  const topo = document.querySelector('#cbPalco .cb-topo-nome');
  if (!L || !topo) return;
  const eu = ((L.sala.jogadores || {})[L.uid] || {}).nome || '—';
  topo.innerHTML = `<span class="pvp-topo-eu">${esc(eu)}</span><span class="pvp-topo-x">×</span><span class="pvp-topo-ele">${esc(L.nomeDele)}</span>`;
}

// ── DESISTIR ─────────────────────────────────────────────────────
/* Dois toques, pelo mesmo gesto do PvE (_afPedeConfirmar, na arena): o
   primeiro arma o botão, o segundo desiste. */
function _pvpLDesistir() {
  const L = _pvpL;
  if (!L || L.fim || (_afE && _afE.acabou)) return;
  if (typeof _afPedeConfirmar === 'function'
      && !_afPedeConfirmar('cbDesistir', t('pvp.luta.desistir_confirma'))) return;
  _pvpChamar('sairSala', { sala: L.id }).catch(e => showToast(_pvpErroTexto(e), 'err'));
}

// ── O FIM ────────────────────────────────────────────────────────
/* A arena chegou ao fim (o motor, a desistência ou a ausência): pede-se
   ao servidor que confira e grave. Os dois navegadores pedem; o servidor
   grava uma vez e devolve o mesmo aos dois. */
function _pvpLFim() {
  const L = _pvpL;
  if (!L || L.pedindoFim) return;
  L.pedindoFim = true;
  const tentar = (n) => _pvpChamar('encerrar', { sala: L.id }).then(r => {
    L.servidor = { vencedor: r.vencedor || null, motivo: r.motivo || null };
    _pvpLPremio(r.premios);
    if (_pvpL === L && typeof _afDesenhar === 'function') _afDesenhar();
  }).catch(e => {
    // Ainda em curso do lado do servidor (uma jogada a caminho): tenta de novo.
    if (n < 8 && _pvpL === L) { setTimeout(() => tentar(n + 1), 1500 + n * 500); return; }
    /* Não veio. Diz-se, em vez de "conferindo…" para sempre; o botão de
       sair continua lá, e a busca seguinte reabre a sala se ela ainda
       estiver em curso no servidor (pvpProcurar, em_sala). */
    if (_pvpL === L) { L.semConferencia = true; if (typeof _afDesenhar === 'function') _afDesenhar(); }
  });
  tentar(0);
  // O painel entra animado; centra-se de novo quando assenta.
  setTimeout(() => { if (_pvpL === L && typeof _afMenuMover === 'function') _afMenuMover(); }, 900);
}

/* O servidor fechou a sala por conta própria (o outro desistiu, o W.O.):
   a arena termina aqui também, com o que o servidor gravou. */
function _pvpLFimDoServidor() {
  const L = _pvpL;
  if (!L) return;
  _pvpDb().ref(`pvp/salas/${L.id}`).once('value').then(s => {
    const sala = s.val() || {};
    if (_pvpL !== L) return;
    L.servidor = { vencedor: sala.vencedor || null, motivo: sala.motivo || null };
    _pvpLPremio(sala.premios);
    if (_afE && !_afE.acabou) {
      /* Guarda-se à parte: as jogadas que ainda chegam aplicam-se primeiro
         (_pvpLPonto), e só então este fim vale. */
      L.fimServidor = { vencedor: sala.vencedor ? pvpLadoDe(sala, sala.vencedor) : null, motivo: sala.motivo };
      if (L.pronto && !L.recebidas[L.aplicadas]) _pvpLPonto(L.vez);
    } else if (typeof _afDesenhar === 'function') _afDesenhar();
  }).catch(() => {});
}

/* ════════════════════════════════════════════════════════════════════
   O QUE A LUTA DEIXOU

   Quem decide é o servidor (api/pvp.js): energia gasta, humor, moedas e
   a fratura de quem caiu chegam prontos no `premios` da sala. Aqui
   aplica-se o mesmo na memória deste navegador — senão o próximo save
   passava por cima do que o servidor escreveu — e mostra-se o recibo no
   painel do fim.

   Uma vez só: o fim pode chegar por dois caminhos (a conferência que
   este lado pediu e o fim que o servidor gravou), e os dois passam por
   aqui. */
function _pvpLPremio(premios) {
  const L = _pvpL;
  if (!L || !premios || L.premio) return;
  const p = premios[L.uid];
  if (!p) return;
  L.premio = p;

  const ids = p.avatares || [];
  if (typeof avatarSlots !== 'undefined') {
    avatarSlots.forEach((s, i) => {
      if (!s || !s.id || ids.indexOf(s.id) === -1) return;
      const aberto = (typeof activeSlotIdx !== 'undefined' && i === activeSlotIdx);
      const v = s.vitals || (s.vitals = {});
      v.energia = Math.max(0, Math.round((v.energia == null ? 100 : v.energia) - (p.energia || 0)));
      if (p.humor) v.humor = Math.min(100, Math.round((v.humor == null ? 100 : v.humor) + p.humor));
      const temFratura = (p.fraturas || []).indexOf(s.id) !== -1;
      if (temFratura) {
        s.activeDiseases = Array.isArray(s.activeDiseases) ? s.activeDiseases : [];
        if (s.activeDiseases.indexOf('fratura') === -1) s.activeDiseases.push('fratura');
      }
      /* O avatar ABERTO na tela de cuidar não vive no slot: vive nas
         variáveis soltas, e é delas que o save sai. */
      if (aberto) {
        if (typeof vitals !== 'undefined' && vitals) {
          vitals.energia = v.energia;
          if (p.humor) vitals.humor = v.humor;
        }
        if (temFratura && typeof activeDiseases !== 'undefined'
            && Array.isArray(activeDiseases) && activeDiseases.indexOf('fratura') === -1) {
          activeDiseases.push('fratura');
        }
      }
    });
  }
  // As moedas vão de `increment` no servidor: aqui soma-se o mesmo.
  if (p.moedas && typeof gs !== 'undefined') gs.moedas = (gs.moedas || 0) + p.moedas;
  if (typeof updateResourceUI === 'function') updateResourceUI();
  if (typeof updateAllUI === 'function') updateAllUI();
  if (typeof scheduleSave === 'function') scheduleSave();
}

// O recibo, no painel do fim.
function _pvpLPremioHTML() {
  const L = _pvpL;
  const p = L && L.premio;
  if (!p) return '';
  const linhas = [];
  if (p.energia) linhas.push('−' + p.energia + ' ⚡');
  if (p.humor)   linhas.push('+' + p.humor + ' ☺');
  if (p.moedas)  linhas.push('+' + p.moedas + ' 🪙');
  const fr = (p.fraturas || []).length;
  /* Os pontos da temporada vêm à parte e em destaque: são a única
     coisa que só esta luta podia dar (js/pvp-rank.js). */
  const rk = p.rank;
  return `<div class="pvp-fim-premio">
      ${rk ? `<span class="pvp-premio-rank ${rk.delta >= 0 ? 'sobe' : 'desce'}">${
        esc(t('pvp.rank.delta', { d: (rk.delta > 0 ? '+' : '') + rk.delta, p: rk.pontos }))}</span>` : ''}
      <span class="pvp-premio-itens">${esc(linhas.join('  ·  '))}</span>
      ${fr ? `<span class="pvp-premio-mal">${esc(t('pvp.premio.fratura', { n: fr }))}</span>` : ''}
      ${!p.moedas && p.resultado !== 'desistiu' && L.sala.tipo === 'amistosa'
        ? `<span class="pvp-premio-nota">${esc(t('pvp.premio.amigo'))}</span>` : ''}
    </div>`;
}

function _pvpLFimHTML(estado) {
  const L = _pvpL;
  if (!L) return '';
  // O que o servidor gravou manda; até ele responder, o que se viu aqui.
  let ladoV, motivo;
  if (L.servidor) {
    ladoV = L.servidor.vencedor ? (L.servidor.vencedor === L.uid ? L.meu : L.dele) : null;
    motivo = L.servidor.motivo;
  } else {
    ladoV = L.fim ? L.fim.vencedor : estado.vencedor;
    motivo = L.fim ? L.fim.motivo : (estado.porLimite ? 'limite' : 'luta');
  }
  /* Sem a conferência do servidor não há resultado para anunciar: um
     "VITÓRIA" que o servidor não gravou era uma promessa falsa. */
  const res = (L.semConferencia && !L.servidor) ? 'pendente'
            : ladoV === L.meu ? 'vitoria' : ladoV === L.dele ? 'derrota' : 'empate';
  const quemPerdeu = res === 'vitoria' ? L.nomeDele : '';
  const sub = motivo === 'desistiu' ? t(res === 'vitoria' ? 'pvp.fim.m.desistiu_ele' : 'pvp.fim.m.desistiu_eu', { nome: quemPerdeu })
            : motivo === 'ausente' ? t(res === 'vitoria' ? 'pvp.fim.m.ausente_ele' : 'pvp.fim.m.ausente_eu', { nome: quemPerdeu })
            : motivo === 'desconectou' ? t(res === 'vitoria' ? 'pvp.fim.m.caiu_ele' : 'pvp.fim.m.caiu_eu', { nome: quemPerdeu })
            : motivo === 'limite' ? t('pvp.fim.m.limite')
            : t('pvp.fim.m.luta', { nome: L.nomeDele });
  const amistosa = L.sala.tipo === 'amistosa';
  return `<div class="pvp-fim ${res}">
      <div class="pvp-fim-marca"><i class="bt-fenda ouro esq"></i><i class="bt-fenda ouro dir"></i></div>
      <div class="pvp-fim-titulo">${esc(t('pvp.fim.' + res))}</div>
      <div class="pvp-fim-sub">${esc(sub)}</div>
      <div class="pvp-fim-selo ${L.servidor ? 'ok' : L.semConferencia ? 'falhou' : ''}">${esc(t(L.servidor ? 'pvp.fim.conferido' : L.semConferencia ? 'pvp.fim.sem_conferencia' : 'pvp.fim.conferindo'))}${
        amistosa ? ' · ' + esc(t('pvp.sala.amistosa')) : ''}</div>
      ${_pvpLPremioHTML()}
    </div>
    <div class="pvp-fim-acoes">
      <button class="pvp-btn pri" onclick="pvpLutaSair(true)">${esc(t('pvp.fim.de_novo'))}</button>
      <button class="pvp-btn sec" onclick="pvpLutaSair(false)">${esc(t('pvp.sala.voltar'))}</button>
    </div>`;
}

// ── SAIR ─────────────────────────────────────────────────────────
let _pvpLDepois = null;
function pvpLutaSair(procurar) {
  _pvpLDepois = procurar ? 'procurar' : 'lobby';
  if (typeof afFechar === 'function') afFechar();
}
window.pvpLutaSair = pvpLutaSair;

// A arena fechou (afFechar chama a rede antes do aoSair).
function _pvpLFechou() {
  const L = _pvpL;
  const emCurso = L && !L.servidor && !(L.fim) && !(typeof _afE !== 'undefined' && _afE && _afE.acabou);
  if (emCurso && !_pvpLDepois) _pvpLInterrompida = 'interrompida:' + L.id;
  _pvpLLimpar();
}

function _pvpLSaiu() {
  ModalManager.close('combateModal');
  if (typeof _pvpDepoisDaLuta === 'function') _pvpDepoisDaLuta(_pvpLDepois || _pvpLInterrompida);
  _pvpLDepois = null; _pvpLInterrompida = null;
}

/* A arena fechou com a luta ainda em curso (o botão voltar do celular,
   um modal que a tirou da frente): a partida continua no servidor e o
   relógio corre. O lobby avisa e oferece voltar. */
let _pvpLInterrompida = null;

function _pvpLLimpar() {
  const L = _pvpL;
  if (!L) return;
  for (const [ref, ev, fn] of L.refs.splice(0)) ref.off(ev, fn);
  for (const tm of L.timers.splice(0)) clearInterval(tm);
  if (L.presRef) {
    try { L.presRef.onDisconnect().cancel(); } catch (e) {}
    L.presRef = null;
  }
  const el = document.getElementById('pvpRelogio');
  if (el) el.remove();
  _pvpL = null;
}

window.pvpLutaAbrir = pvpLutaAbrir;
window.pvpLutaAtiva = pvpLutaAtiva;
