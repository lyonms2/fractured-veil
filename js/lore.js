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

// ── Estado da sessão ─────────────────────────────────────────────
let _loreCapituloAtual  = null;
let _loreCenaAtual      = null;
let _loreEscolhasFeitas = [];
let _loreTabAtual = 'comum'; // 'comum' | 'raro' | 'lendario'

// ── Substitui [nome] e [elemento] pelo avatar atual ──────────────
function _loreFmt(texto) {
  const nome = avatar?.nome?.split(',')[0]?.trim() || 'seu Avatar';
  const elem = avatar?.elemento || 'Desconhecido';
  return texto.replace(/\[nome\]/g, nome).replace(/\[elemento\]/g, elem);
}

// ═══════════════════════════════════════════════════════════════════
// DESBLOQUEIO SEQUENCIAL
// Um capítulo fica disponível se:
//   1. Não tem campo `anterior` (é o primeiro da série)
//   2. O capítulo anterior foi concluído (existe em gs.loreProgresso)
// ═══════════════════════════════════════════════════════════════════
function loreCapDesbloqueado(cap) {
  if(!cap.anterior) return true;
  return !!(gs.loreProgresso?.[cap.anterior]);
}

// ═══════════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

function abrirLore() {
  const modal = document.getElementById('loreModal');
  if(!modal) return;
  modal.style.display = 'flex';
  _loreRenderLista();
}

function fecharLore() {
  const modal = document.getElementById('loreModal');
  if(modal) modal.style.display = 'none';
  _loreCapituloAtual  = null;
  _loreCenaAtual      = null;
  _loreEscolhasFeitas = [];
}

function loreSetTab(tab) {
  _loreTabAtual = tab;
  document.getElementById('loreTabComum').classList.toggle('active',    tab === 'comum');
  document.getElementById('loreTabRaro').classList.toggle('active',     tab === 'raro');
  document.getElementById('loreTabLendario').classList.toggle('active', tab === 'lendario');
  _loreRenderLista();
}

// ── Lista de capítulos ────────────────────────────────────────────
function _loreRenderLista() {
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

  // Filtra pela aba ativa
  const mapRar = { comum: 'Comum', raro: 'Raro', lendario: 'Lendário' };
  const lista  = LORE_CAPITULOS.filter(c => c.raridade === mapRar[_loreTabAtual]);

  if(!lista.length) {
    const label = mapRar[_loreTabAtual];
    body.innerHTML = `
      <div style="text-align:center;padding:20px 10px;color:var(--muted);font-size:9px;line-height:1.8;">
        <div style="font-size:28px;margin-bottom:8px;">${_loreTabAtual === 'raro' ? '🔵' : '🌟'}</div>
        Histórias ${label}s em desenvolvimento.<br>Em breve novas aventuras aqui.
      </div>`;
    return;
  }

  body.innerHTML = lista.map(cap => {
    const custo      = LORE_CUSTOS[cap.raridade];
    const emBreve    = !!cap.emBreve;
    const desbloq    = loreCapDesbloqueado(cap);
    const temSaldo   = custo.moeda === 'moedas' ? gs.moedas >= custo.valor : gs.cristais >= custo.valor;
    const concluido  = !!(gs.loreProgresso?.[cap.id]);
    const iconeRar   = cap.raridade === 'Lendário' ? '🌟' : cap.raridade === 'Raro' ? '🔵' : '⚪';
    const corRar     = cap.raridade === 'Lendário' ? 'var(--lendario)' : cap.raridade === 'Raro' ? 'var(--raro)' : 'var(--muted)';
    const moedaIcon  = custo.moeda === 'moedas' ? '🪙' : '💎';

    // Calcular tag e ação
    let tagHtml, acao = '';
    if(emBreve) {
      tagHtml = `<div class="lore-bloqueado-tag">🔜 Em breve</div>`;
    } else if(!desbloq) {
      tagHtml = `<div class="lore-bloqueado-tag">🔒 Termine o capítulo anterior</div>`;
    } else if(concluido) {
      tagHtml = `<div class="lore-jogar-tag" style="background:rgba(100,200,120,.12);color:#6ee7a0;border-color:rgba(100,200,120,.25);">📖 LER</div>`;
      acao = `lerCapituloSalvo('${cap.id}')`;
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
            <span style="color:${corRar};font-size:7px;">${iconeRar} ${cap.raridade}</span>
            <span class="lore-cap-custo">${moedaIcon} ${custo.valor}</span>
          </div>
        </div>
        ${tagHtml}
      </div>`;
  }).join('');
}

// ── Iniciar capítulo (cobra custo e abre a primeira cena) ─────────
function iniciarCapitulo(capId) {
  const cap = LORE_CAPITULOS.find(c => c.id === capId);
  if(!cap || !hatched || dead || !avatar) return;
  if(cap.emBreve)          { showBubble('Este capítulo ainda não está disponível.'); return; }
  if(!loreCapDesbloqueado(cap)) { showBubble('Termine o capítulo anterior primeiro.'); return; }

  const custo = LORE_CUSTOS[cap.raridade];
  if(custo.moeda === 'moedas') {
    if(gs.moedas < custo.valor)   { showBubble(`Você precisa de ${custo.valor} 🪙!`); return; }
    gs.moedas -= custo.valor;
  } else {
    if(gs.cristais < custo.valor) { showBubble(`Você precisa de ${custo.valor} 💎!`); return; }
    gs.cristais -= custo.valor;
  }
  updateResourceUI();
  scheduleSave();

  _loreCapituloAtual  = cap;
  _loreCenaAtual      = 'inicio';
  _loreEscolhasFeitas = [];
  _loreRenderCena();
}

// ── Renderiza a cena atual ────────────────────────────────────────
function _loreRenderCena() {
  const body = document.getElementById('loreBody');
  if(!body || !_loreCapituloAtual || !_loreCenaAtual) return;

  const cap  = _loreCapituloAtual;
  const cena = cap.cenas[_loreCenaAtual];
  if(!cena) return;

  if(cena.fim) {
    _loreAplicarRecompensa(cena.recompensa);

    // Salva o caminho percorrido
    if(!gs.loreProgresso) gs.loreProgresso = {};
    gs.loreProgresso[cap.id] = {
      caminho: [..._loreEscolhasFeitas],
      fimId:   _loreCenaAtual,
    };
    scheduleSave();

    body.innerHTML = `
      <div class="lore-cena-wrap">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:28px;">${cap.icone}</div>
          <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:1px;margin-top:4px;">${cap.titulo}</div>
        </div>
        <div class="lore-texto">${_loreFmt(cena.texto)}</div>
        <div class="lore-fim-tag">${_loreFmt(cena.texto_fim)}</div>
        <div class="lore-recomp-box">
          <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-bottom:6px;">RECOMPENSAS</div>
          ${_loreRecompensaTxt(cena.recompensa)}
        </div>
        <div style="margin-top:14px;">
          <button class="lore-btn-secondary" style="width:100%;" onclick="_loreRenderLista()">← Capítulos</button>
        </div>
      </div>`;
    return;
  }

  // Cena com escolhas
  body.innerHTML = `
    <div class="lore-cena-wrap">
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:22px;">${cap.icone}</div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;">${cap.titulo}</div>
      </div>
      <div class="lore-texto">${_loreFmt(cena.texto)}</div>
      <div class="lore-escolhas">
        ${cena.escolhas.map((e, i) => `
          <button class="lore-escolha-btn" onclick="loreEscolher(${i})">${_loreFmt(e.texto)}</button>
        `).join('')}
      </div>
      <button class="lore-btn-secondary" style="margin-top:10px;width:100%;" onclick="_loreRenderLista()">✕ Abandonar capítulo</button>
    </div>`;
}

// ── Processa a escolha ────────────────────────────────────────────
function loreEscolher(idx) {
  if(!_loreCapituloAtual || !_loreCenaAtual) return;
  const cena = _loreCapituloAtual.cenas[_loreCenaAtual];
  if(!cena || !cena.escolhas[idx]) return;

  _loreEscolhasFeitas.push({
    cenaId: _loreCenaAtual,
    texto:  _loreFmt(cena.escolhas[idx].texto),
  });
  _loreCenaAtual = cena.escolhas[idx].proxima;
  _loreRenderCena();
}

// ── Modo leitura — exibe o caminho salvo sem interação ────────────
function lerCapituloSalvo(capId) {
  const cap  = LORE_CAPITULOS.find(c => c.id === capId);
  const prog = gs.loreProgresso?.[capId];
  if(!cap || !prog) { iniciarCapitulo(capId); return; }

  const body = document.getElementById('loreBody');
  if(!body) return;

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

  const cenaFim = cap.cenas[prog.fimId];
  if(cenaFim) {
    html += `<div class="lore-texto">${_loreFmt(cenaFim.texto)}</div>`;
    html += `<div class="lore-fim-tag">${_loreFmt(cenaFim.texto_fim)}</div>`;
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
  scheduleSave();

  const moedaTxt = r.moedas ? ` +${r.moedas}🪙` : '';
  const xpTxt    = r.xp    ? ` +${r.xp}XP`     : '';
  addLog(`Lore: ${_loreCapituloAtual?.titulo}${xpTxt}${moedaTxt}`, 'good');
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
window.abrirLore        = abrirLore;
window.fecharLore       = fecharLore;
window.loreSetTab       = loreSetTab;
window.iniciarCapitulo  = iniciarCapitulo;
window.loreEscolher     = loreEscolher;
window._loreRenderLista = _loreRenderLista;
window.lerCapituloSalvo = lerCapituloSalvo;
