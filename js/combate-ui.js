// ═══════════════════════════════════════════════════════════════════
// COMBATE — INTERFACE
//
// Duas coisas, ambas em "Meus Avatares":
//   · a ficha de combate de cada avatar (fichaDeCombate em combate-ficha.js)
//   · a escolha dos 3 que entram na equipa de batalha
//
// Aqui não se calcula nada. Os números todos vêm de combate-ficha.js —
// se um dia a fórmula mudar, muda num sítio só.
// ═══════════════════════════════════════════════════════════════════

// Escala das barras: um Lendário nível 35 chega perto de 45 no atributo
// primário, portanto 45 é o topo visual. Acima disso a barra fica cheia.
const FICHA_ESCALA = 45;

const FICHA_COR = {
  FOR: '#e05555',   // vermelho — dano bruto
  RES: '#7ab87a',   // verde — sobrevivência
  HAB: '#5ab4e8',   // azul — velocidade e economia
  INT: '#a855f7',   // roxo — dano mágico e suporte
};

// ═══════════════════════════════════════════════════════════════════
// renderFichaHTML — o bloco visual da ficha
//
// Aceita um slot ({seed, raridade, elemento, nivel}) ou os 4 valores.
// Devolve HTML; quem chama decide onde o mete.
// ═══════════════════════════════════════════════════════════════════
function renderFichaHTML(seed, raridade, elemento, nivel) {
  if (typeof fichaDeCombate !== 'function') return '';
  const f = fichaDeCombate(seed, raridade, elemento, nivel);
  if (!f) return '';

  const linhas = ['FOR', 'RES', 'HAB', 'INT'].map(k => {
    const papel = k === f.primaria ? 'prim' : k === f.secundaria ? 'sec' : '';
    const tag   = k === f.primaria ? '◆' : k === f.secundaria ? '◈' : '';
    const pct   = Math.min(100, Math.round(f[k] / FICHA_ESCALA * 100));
    return `<div class="ficha-stat ${papel}">
      <div class="ficha-stat-lbl">${k}</div>
      <div class="ficha-stat-tag">${tag}</div>
      <div class="ficha-stat-bar"><div class="ficha-stat-fill" style="width:${pct}%;background:${FICHA_COR[k]};"></div></div>
      <div class="ficha-stat-val">${f[k]}</div>
    </div>`;
  }).join('');

  const poder = typeof poderDoAvatar === 'function'
    ? Math.round(poderDoAvatar(f.raridade, f.nivel)) : 0;

  return `<div class="ficha">
    <div class="ficha-title">${t('ficha.title')}</div>
    <div class="ficha-stats">${linhas}</div>
    <div class="ficha-bars">
      <div class="ficha-bar"><b style="color:#e05555;">${f.hpMax}</b><span>${t('ficha.hp')}</span></div>
      <div class="ficha-bar"><b style="color:#5ab4e8;">${f.enMax}</b><span>${t('ficha.energia')}</span></div>
      <div class="ficha-bar"><b style="color:var(--gold-light);">${poder}</b><span>${t('ficha.poder')}</span></div>
    </div>
    <div class="ficha-foot">
      ${t('ficha.afinidade', { elem: f.elemento, prim: f.primaria, sec: f.secundaria })}<br>
      ${t('ficha.ultimate', { stat: f.statDoUltimate })}
    </div>
    ${renderHabilidadesHTML(f)}
  </div>`;
}

// Cor da etiqueta de custo: o ataque comum não gasta energia, dá.
const HAB_COR_VALOR = { dano:'#e05555', cura:'#7ab87a', escudo:'#5ab4e8' };

// ═══════════════════════════════════════════════════════════════════
// As 4 habilidades do kit, com o número que cada uma faz para ESTE
// avatar. O número é o que torna a ficha útil: duas Explosões Solares
// não valem o mesmo se a FOR for diferente.
// ═══════════════════════════════════════════════════════════════════
function renderHabilidadesHTML(f) {
  if (typeof habilidadesDoAvatar !== 'function') return '';
  const habs = habilidadesDoAvatar(f);
  if (!habs.length) return '';

  const linhas = habs.map(h => {
    const custo = h.custo === 0
      ? `<span class="hab-custo livre">${t('hab.custo.livre', { gera: h.gera })}</span>`
      : `<span class="hab-custo">${t('hab.custo.en', { custo: h.custo })}</span>`;
    const valor = h.valor === null ? ''
      : `<span class="hab-valor" style="color:${HAB_COR_VALOR[h.tipo] || 'var(--text)'};">${t('hab.val.' + h.tipo, { v: h.valor })}</span>`;
    return `<div class="hab">
      <div class="hab-top">
        <span class="hab-papel">${t('hab.slot.' + h.papel)}</span>
        ${custo}
      </div>
      <div class="hab-nome">${t(h.chave + '.nome')}</div>
      ${valor}
      <div class="hab-efeito">${t(h.chave + '.efeito')}</div>
    </div>`;
  }).join('');

  return `<div class="hab-bloco">
    <div class="hab-titulo">${t('hab.titulo')}</div>
    ${linhas}
  </div>`;
}

// Preenche a ficha dentro do overlay de zoom do avatar.
// Chamada por openAvatarZoom() e openAvatarZoomData() em js/main.js.
function preencherFichaZoom(seed, raridade, elemento, nivel) {
  const el = document.getElementById('avatarZoomFicha');
  if (!el) return;
  el.innerHTML = renderFichaHTML(seed, raridade, elemento, nivel);
}

// ═══════════════════════════════════════════════════════════════════
// BARRA DA EQUIPA — o resumo por cima da grelha de slots
// ═══════════════════════════════════════════════════════════════════
function renderEquipaBar() {
  const box = document.getElementById('equipaBar');
  if (!box || typeof equipaIdx !== 'function') return;

  const idx   = equipaIdx();
  const cheia = idx.length >= COMBATE_EQUIPA_MAX;

  let cartoes = '';
  for (let n = 0; n < COMBATE_EQUIPA_MAX; n++) {
    const i = idx[n];
    const s = (typeof i === 'number') ? avatarSlots[i] : null;
    if (!s) { cartoes += `<div class="equipa-slot vazio">+</div>`; continue; }
    const nome = (s.nome || 'Avatar').split(',')[0].trim();
    const ec   = (typeof CARACTERISTICAS_ELEMENTAIS !== 'undefined') ? CARACTERISTICAS_ELEMENTAIS[s.elemento] : null;
    cartoes += `<div class="equipa-slot" title="${t('mkt.slot.label', {n: i+1})}">
      ${gerarSVG(s.elemento, s.raridade, s.seed || 0, 42, 42, _faseNum(s.nivel))}
      <div class="equipa-slot-nome">${nome}</div>
      <div class="equipa-slot-sub">${ec ? ec.emoji : '✦'} ${t('mkt.stat.nivel')} ${s.nivel || 1}</div>
    </div>`;
  }

  const faltam = COMBATE_EQUIPA_MAX - idx.length;
  const poder = (typeof poderDaEquipa === 'function')
    ? Math.round(poderDaEquipa(equipaDoJogador())) : 0;

  box.innerHTML = `<div class="equipa-bar">
    <div class="equipa-head">
      <div class="equipa-title">${t('equipa.title')}</div>
      <div class="equipa-count ${cheia ? 'full' : ''}">${idx.length}/${COMBATE_EQUIPA_MAX}</div>
    </div>
    <div class="equipa-slots">${cartoes}</div>
    <div class="equipa-foot">
      ${cheia ? t('equipa.pronta') : t(faltam === 1 ? 'equipa.incompleta_1' : 'equipa.incompleta', { faltam })}<br>
      ${t('equipa.poder', { poder })}
    </div>
  </div>`;
}

// Botão ⚔ de cada card. Só re-renderiza a barra e a grelha — a escolha
// vai para gs.equipa, que o save normal do jogo já leva.
function toggleEquipa(i) {
  if (typeof alternarNaEquipa !== 'function') return;
  const r = alternarNaEquipa(i);
  if (r === 'cheia') {
    showToast(t('equipa.toast.cheia', { max: COMBATE_EQUIPA_MAX }), 'err');
    return;
  }
  if (r === 'inelegivel') { showToast(t('equipa.toast.inelegivel'), 'err'); return; }

  const nome = (avatarSlots[i]?.nome || 'Avatar').split(',')[0].trim();
  showToast(r === 'add' ? t('equipa.toast.add', { nome }) : t('equipa.toast.remove', { nome }), 'ok');

  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof renderSlots === 'function') renderSlots();
}
