// ═══════════════════════════════════════════════════════════════════
// LORE — Engine narrativo de escolhas
// Os capítulos são registrados pelos arquivos em js/lore-caps/
// Depende de: avatar, gs, hatched, dead, xp, vitals, vinculo (globals)
//             scheduleSave(), showBubble(), addLog(), updateResourceUI()
// ═══════════════════════════════════════════════════════════════════

// ── Registro de capítulos (populado pelos cap*.js) ───────────────
const LORE_CAPITULOS = [];

// ── Custos por raridade ──────────────────────────────────────────
const LORE_CUSTOS = {
  Comum:    { moeda: 'moedas',   valor: 50 },
  Raro:     { moeda: 'cristais', valor: 5  },
  Lendário: { moeda: 'cristais', valor: 15 },
};

// ── Títulos dos modais por série ─────────────────────────────────
const LORE_TITULOS = {
  comum:    '📖 HISTÓRIAS DO VÉU',
  raro:     '🔵 CRÔNICAS DOS RAROS',
  lendario: '🌟 ÉPICOS DO VÁCUO',
};

const LORE_RAR_MAP = { comum: 'Comum', raro: 'Raro', lendario: 'Lendário' };

// ── Estado da sessão (em memória) ────────────────────────────────
let _loreSerieAtual    = 'comum';
let _loreCapituloAtual = null;

// ── Typewriter engine ─────────────────────────────────────────────
let _loreTwHandle = null;

function _loreCancelTypewriter() {
  if(_loreTwHandle) { _loreTwHandle.cancel(); _loreTwHandle = null; }
}

function _loreTypewriter(container, rawText, onDone) {
  _loreCancelTypewriter();

  const SPEED = 18; // ms por caractere
  const PAUSE = 380; // pausa entre parágrafos (ms)

  const paragraphs = rawText.split('\n\n').map(p => p.trim()).filter(Boolean);
  container.innerHTML = '';

  let dead    = false;
  let timerId = null;
  let pIdx    = 0;
  let curEl   = null;
  let charIdx = 0;

  function kill() {
    dead = true;
    if(timerId) { clearInterval(timerId); clearTimeout(timerId); timerId = null; }
  }
  _loreTwHandle = { cancel: kill };

  // Clique em qualquer lugar pula a animação
  // (setTimeout evita que o clique que abriu a cena dispare o skip imediatamente)
  const body = document.getElementById('loreBody');
  function skip() {
    if(dead) return;
    kill();
    container.innerHTML = '';
    paragraphs.forEach(txt => {
      const p = document.createElement('p');
      p.className = 'lore-p';
      p.textContent = txt;
      container.appendChild(p);
    });
    _loreTwHandle = null;
    onDone();
  }
  setTimeout(() => { if(!dead) body.addEventListener('click', skip, { once: true }); }, 50);

  function nextParagraph() {
    if(dead) return;
    if(pIdx >= paragraphs.length) {
      body.removeEventListener('click', skip);
      _loreTwHandle = null;
      onDone();
      return;
    }
    curEl = document.createElement('p');
    curEl.className = 'lore-p lore-p-typing';
    container.appendChild(curEl);
    charIdx = 0;
    timerId = setInterval(typeChar, SPEED);
  }

  function typeChar() {
    if(dead) return;
    const text = paragraphs[pIdx];
    if(charIdx <= text.length) {
      curEl.textContent = text.slice(0, charIdx);
      charIdx++;
    } else {
      clearInterval(timerId); timerId = null;
      curEl.classList.remove('lore-p-typing');
      pIdx++;
      timerId = setTimeout(nextParagraph, PAUSE);
    }
  }

  nextParagraph();
}

// ── Substitui [nome] e [elemento] pelo avatar atual ──────────────
function _loreFmt(texto) {
  const nome = avatar?.nome?.split(',')[0]?.trim() || 'seu Avatar';
  const elem = avatar?.elemento || 'Desconhecido';
  return texto.replace(/\[nome\]/g, nome).replace(/\[elemento\]/g, elem);
}

// ── Helpers de progresso ─────────────────────────────────────────
function _loreGetProg(capId) {
  return gs.loreProgresso?.[capId] || null;
}

function _loreSetProg(capId, dados) {
  if(!gs.loreProgresso) gs.loreProgresso = {};
  gs.loreProgresso[capId] = dados;
  scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
// DESBLOQUEIO SEQUENCIAL
// ═══════════════════════════════════════════════════════════════════
function loreCapDesbloqueado(cap) {
  if(!cap.anterior) return true;
  return !!(_loreGetProg(cap.anterior)?.concluido);
}

// ═══════════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

function abrirLore(serie) {
  _loreSerieAtual = serie || 'comum';
  const modal = document.getElementById('loreModal');
  if(!modal) return;
  const tituloEl = document.getElementById('loreTitulo');
  if(tituloEl) tituloEl.textContent = LORE_TITULOS[_loreSerieAtual] || '📖 LORE';
  modal.style.display = 'flex';
  _loreRenderLista();
}

function fecharLore() {
  _loreCancelTypewriter();
  const modal = document.getElementById('loreModal');
  if(modal) modal.style.display = 'none';
  _loreCapituloAtual = null;
}

// ── Lista de capítulos da série atual ────────────────────────────
function _loreRenderLista() {
  _loreCancelTypewriter();
  const body = document.getElementById('loreBody');
  if(!body) return;

  if(!hatched || dead) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 10px;color:var(--muted);font-size:9px;line-height:1.8;">
        <div style="font-size:28px;margin-bottom:8px;">📖</div>
        Você precisa de um avatar vivo para explorar o Lore.
      </div>`;
    return;
  }

  const rarFiltro = LORE_RAR_MAP[_loreSerieAtual];
  const lista = LORE_CAPITULOS.filter(c => c.raridade === rarFiltro);

  if(!lista.length) {
    const icone = _loreSerieAtual === 'raro' ? '🔵' : _loreSerieAtual === 'lendario' ? '🌟' : '📖';
    body.innerHTML = `
      <div style="text-align:center;padding:20px 10px;color:var(--muted);font-size:9px;line-height:1.8;">
        <div style="font-size:28px;margin-bottom:8px;">${icone}</div>
        Histórias ${rarFiltro}s em desenvolvimento.<br>Em breve novas aventuras aqui.
      </div>`;
    return;
  }

  const corRarMap   = { Comum: 'var(--muted)', Raro: 'var(--raro)', Lendário: 'var(--lendario)' };
  const iconeRarMap = { Comum: '⚪', Raro: '🔵', Lendário: '🌟' };

  body.innerHTML = lista.map(cap => {
    const custo    = LORE_CUSTOS[cap.raridade];
    const emBreve  = !!cap.emBreve;
    const desbloq  = loreCapDesbloqueado(cap);
    const prog     = _loreGetProg(cap.id);
    const concluido   = !!prog?.concluido;
    const emAndamento = !!prog && !concluido;
    const temSaldo = custo.moeda === 'moedas' ? gs.moedas >= custo.valor : gs.cristais >= custo.valor;
    const moedaIcon = custo.moeda === 'moedas' ? '🪙' : '💎';

    let tagHtml, acao = '';
    if(emBreve) {
      tagHtml = `<div class="lore-bloqueado-tag">🔜 Em breve</div>`;
    } else if(!desbloq) {
      tagHtml = `<div class="lore-bloqueado-tag">🔒 Termine o capítulo anterior</div>`;
    } else if(concluido) {
      tagHtml = `<div class="lore-jogar-tag" style="background:rgba(100,200,120,.12);color:#6ee7a0;border-color:rgba(100,200,120,.25);">📖 LER</div>`;
      acao = `lerCapituloSalvo('${cap.id}')`;
    } else if(emAndamento) {
      tagHtml = `<div class="lore-jogar-tag" style="background:rgba(212,175,55,.12);color:var(--gold);border-color:rgba(212,175,55,.3);">▶ CONTINUAR</div>`;
      acao = `continuarCapitulo('${cap.id}')`;
    } else if(!temSaldo) {
      tagHtml = `<div class="lore-bloqueado-tag" style="background:rgba(231,76,60,.12);color:#e74c3c;border-color:rgba(231,76,60,.2);">Sem saldo</div>`;
    } else {
      tagHtml = `<div class="lore-jogar-tag">▶ JOGAR</div>`;
      acao = `iniciarCapitulo('${cap.id}')`;
    }

    return `
      <div class="lore-cap-card ${!desbloq || emBreve ? 'lore-bloqueado' : ''}" ${acao ? `onclick="${acao}"` : ''}>
        <div class="lore-cap-icone">${cap.icone}</div>
        <div class="lore-cap-info">
          <div class="lore-cap-titulo">${cap.titulo}</div>
          <div class="lore-cap-desc">${_loreFmt(cap.descricao)}</div>
          <div class="lore-cap-meta">
            <span style="color:${corRarMap[cap.raridade]};font-size:7px;">${iconeRarMap[cap.raridade]} ${cap.raridade}</span>
            <span class="lore-cap-custo">${moedaIcon} ${custo.valor}</span>
          </div>
        </div>
        ${tagHtml}
      </div>`;
  }).join('');
}

// ── Iniciar capítulo (cobra custo, cria progresso vazio) ──────────
function iniciarCapitulo(capId) {
  const cap = LORE_CAPITULOS.find(c => c.id === capId);
  if(!cap || !hatched || dead || !avatar) return;
  if(cap.emBreve)               { showBubble(t('lore.bub.soon')); return; }
  if(!loreCapDesbloqueado(cap)) { showBubble(t('lore.bub.locked')); return; }

  const custo = LORE_CUSTOS[cap.raridade];
  if(custo.moeda === 'moedas') {
    if(gs.moedas < custo.valor)   { showBubble(t('lore.bub.need_coins', {n: custo.valor})); return; }
    gs.moedas -= custo.valor;
  } else {
    if(gs.cristais < custo.valor) { showBubble(t('lore.bub.need_gems', {n: custo.valor})); return; }
    gs.cristais -= custo.valor;
  }
  updateResourceUI();

  // Cria o progresso inicial — salvo imediatamente
  _loreSetProg(capId, { caminho: [], cenaAtual: 'inicio', concluido: false, fimId: null });

  _loreCapituloAtual = cap;
  _loreRenderCena('inicio');
}

// ── Continuar capítulo em andamento ──────────────────────────────
function continuarCapitulo(capId) {
  const cap  = LORE_CAPITULOS.find(c => c.id === capId);
  const prog = _loreGetProg(capId);
  if(!cap || !prog || prog.concluido) return;

  // Se a cena salva não existir mais (ex.: capítulo foi reescrito),
  // reinicia do início sem cobrar novamente
  const cenaId = cap.cenas[prog.cenaAtual] ? prog.cenaAtual : 'inicio';
  if(cenaId === 'inicio' && prog.cenaAtual !== 'inicio') {
    _loreSetProg(capId, { caminho: [], cenaAtual: 'inicio', concluido: false, fimId: null });
    showBubble(t('lore.bub.reset'));
  }

  _loreCapituloAtual = cap;
  _loreRenderCena(cenaId);
}

// ── Renderiza uma cena ────────────────────────────────────────────
function _loreRenderCena(cenaId) {
  _loreCancelTypewriter();
  const body = document.getElementById('loreBody');
  if(!body || !_loreCapituloAtual) return;

  const cap  = _loreCapituloAtual;
  const cena = cap.cenas[cenaId];
  if(!cena) {
    // Cena inválida — reseta progresso para o início
    _loreSetProg(cap.id, { caminho: [], cenaAtual: 'inicio', concluido: false, fimId: null });
    _loreRenderCena('inicio');
    return;
  }

  // Cena final — conclui e vai para modo leitura
  if(cena.fim) {
    _loreAplicarRecompensa(cena.recompensa);
    const prog = _loreGetProg(cap.id) || { caminho: [] };
    _loreSetProg(cap.id, {
      caminho:   prog.caminho,
      cenaAtual: cenaId,
      fimId:     cenaId,
      concluido: true,
    });
    playSound('lore_complete');
    lerCapituloSalvo(cap.id);
    return;
  }

  // Cena normal — atualiza cenaAtual no progresso
  const prog = _loreGetProg(cap.id) || { caminho: [] };
  _loreSetProg(cap.id, { ...prog, cenaAtual: cenaId });

  const escolhasHtml = cena.escolhas.map((e, i) =>
    `<button class="lore-escolha-btn" onclick="loreEscolher(${i})">${_loreFmt(e.texto)}</button>`
  ).join('');

  body.innerHTML = `
    <div class="lore-cena-wrap">
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:22px;">${cap.icone}</div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;">${cap.titulo}</div>
      </div>
      <div class="lore-texto" id="loreTwText"></div>
      <div class="lore-escolhas lore-tw-hidden" id="loreTwChoices">${escolhasHtml}</div>
      <button class="lore-btn-secondary lore-tw-hidden" id="loreTwClose" style="margin-top:10px;width:100%;" onclick="fecharLore()">✕ Fechar</button>
    </div>`;

  const textEl    = document.getElementById('loreTwText');
  const choicesEl = document.getElementById('loreTwChoices');
  const closeEl   = document.getElementById('loreTwClose');

  playSound('lore_scene');
  _loreTypewriter(textEl, _loreFmt(cena.texto), () => {
    choicesEl.classList.remove('lore-tw-hidden');
    choicesEl.classList.add('lore-tw-reveal');
    closeEl.classList.remove('lore-tw-hidden');
    closeEl.classList.add('lore-tw-reveal');
  });
}

// ── Processa a escolha — salva imediatamente antes de avançar ────
function loreEscolher(idx) {
  if(!_loreCapituloAtual) return;
  const prog = _loreGetProg(_loreCapituloAtual.id);
  if(!prog) return;

  const cena = _loreCapituloAtual.cenas[prog.cenaAtual];
  if(!cena || !cena.escolhas[idx]) return;

  const escolha = {
    cenaId: prog.cenaAtual,
    texto:  _loreFmt(cena.escolhas[idx].texto),
  };
  const proxima = cena.escolhas[idx].proxima;
  playSound('lore_choice');

  // Salva a escolha + avança a cena ANTES de renderizar
  _loreSetProg(_loreCapituloAtual.id, {
    ...prog,
    caminho:   [...prog.caminho, escolha],
    cenaAtual: proxima,
  });

  _loreRenderCena(proxima);
}

// ── Modo leitura — história completa, sem interação ──────────────
function lerCapituloSalvo(capId) {
  _loreCancelTypewriter();
  const cap  = LORE_CAPITULOS.find(c => c.id === capId);
  const prog = _loreGetProg(capId);
  if(!cap || !prog) return;

  const body = document.getElementById('loreBody');
  if(!body) return;

  _loreCapituloAtual = cap;

  let html = `<div class="lore-cena-wrap">
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:28px;">${cap.icone}</div>
      <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:1px;margin-top:4px;">${cap.titulo}</div>
    </div>`;

  for(const passo of prog.caminho) {
    const cena = cap.cenas[passo.cenaId];
    if(!cena) continue;
    html += `<div class="lore-texto">${_loreFmt(cena.texto)}</div>`;
    html += `<div class="lore-escolha-lida">▶ ${passo.texto}</div>`;
  }

  if(prog.fimId) {
    const cenaFim = cap.cenas[prog.fimId];
    if(cenaFim) {
      html += `<div class="lore-texto">${_loreFmt(cenaFim.texto)}</div>`;
      html += `<div class="lore-fim-tag">${_loreFmt(cenaFim.texto_fim)}</div>`;
      if(cenaFim.recompensa) {
        html += `<div class="lore-recomp-box">
          <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-bottom:6px;">RECOMPENSAS</div>
          ${_loreRecompensaTxt(cenaFim.recompensa)}
        </div>`;
      }
    }
  }

  html += `
    <div style="margin-top:14px;">
      <button class="lore-btn-secondary" style="width:100%;" onclick="_loreRenderLista()">← Capítulos</button>
    </div>
  </div>`;

  body.innerHTML = html;
}

// ── Aplica recompensas ────────────────────────────────────────────
function _loreAplicarRecompensa(r) {
  if(!r || !hatched || !avatar) return;

  if(r.xp)      { xp             = (xp             || 0) + r.xp; }
  if(r.moedas)  { gs.moedas      = Math.max(0,   (gs.moedas      || 0) + r.moedas);  }
  if(r.humor)   { vitals.humor   = Math.min(100, Math.max(0, (vitals.humor   || 0) + r.humor));  }
  if(r.saude)   { vitals.saude   = Math.min(100, Math.max(0, (vitals.saude   || 0) + r.saude));  }
  if(r.energia) { vitals.energia = Math.min(100, Math.max(0, (vitals.energia || 0) + r.energia)); }
  if(r.vinculo) { vinculo        = Math.min(100, Math.max(0, (vinculo        || 0) + r.vinculo)); }

  updateResourceUI();
  if(typeof updateAllUI === 'function') updateAllUI();

  const moedaTxt = r.moedas ? ` +${r.moedas}🪙` : '';
  const xpTxt    = r.xp    ? ` +${r.xp}XP`     : '';
  addLog(t('lore.log.completed', {titulo: _loreCapituloAtual?.titulo, xp: xpTxt, coins: moedaTxt}), 'good');
}

// ── Formata recompensas ───────────────────────────────────────────
function _loreRecompensaTxt(r) {
  if(!r) return '';
  const items = [];
  if(r.xp)                       items.push(`<span class="lore-recomp-item">⚡ +${r.xp} XP</span>`);
  if(r.moedas  && r.moedas  > 0) items.push(`<span class="lore-recomp-item">🪙 +${r.moedas}</span>`);
  if(r.moedas  && r.moedas  < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">🪙 ${r.moedas}</span>`);
  if(r.humor   && r.humor   > 0) items.push(`<span class="lore-recomp-item">😊 +${r.humor} humor</span>`);
  if(r.humor   && r.humor   < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😔 ${r.humor} humor</span>`);
  if(r.saude   && r.saude   > 0) items.push(`<span class="lore-recomp-item">💚 +${r.saude} saúde</span>`);
  if(r.saude   && r.saude   < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.saude} saúde</span>`);
  if(r.energia && r.energia > 0) items.push(`<span class="lore-recomp-item">⚡ +${r.energia} energia</span>`);
  if(r.energia && r.energia < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😴 ${r.energia} energia</span>`);
  if(r.vinculo && r.vinculo > 0) items.push(`<span class="lore-recomp-item">💜 +${r.vinculo} vínculo</span>`);
  if(r.vinculo && r.vinculo < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.vinculo} vínculo</span>`);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;">${items.join('')}</div>`;
}

// ── Exports ───────────────────────────────────────────────────────
window.abrirLore          = abrirLore;
window.fecharLore         = fecharLore;
window.iniciarCapitulo    = iniciarCapitulo;
window.continuarCapitulo  = continuarCapitulo;
window.loreEscolher       = loreEscolher;
window._loreRenderLista   = _loreRenderLista;
window.lerCapituloSalvo   = lerCapituloSalvo;
