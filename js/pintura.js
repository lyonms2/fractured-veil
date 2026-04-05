// ═══════════════════════════════════════════════════════════════════
// PINTURA ELEMENTAL — Color by Number
// Grade 25×25 · recompensa única por desenho
// ═══════════════════════════════════════════════════════════════════

// ── Paleta (índice 0 = fundo/vazio, 1–9 = cores) ──────────────────
const PNT_CORES = [
  null,          // 0 — fundo (não pinta)
  '#f87171',     // 1 — Vermelho / Fogo
  '#60a5fa',     // 2 — Azul / Água
  '#86efac',     // 3 — Verde / Terra
  '#fbbf24',     // 4 — Amarelo / Vento / Ouro
  '#a78bfa',     // 5 — Roxo / Eletricidade
  '#67e8f9',     // 6 — Ciano / Luz
  '#c084fc',     // 7 — Lilás / Sombra
  '#e5e5e5',     // 8 — Branco / Osso
  '#1e1840',     // 9 — Escuro / Contorno
];

// ── Desenhos ───────────────────────────────────────────────────────
// Cada desenho: name, grid 25×25 (array de 25 strings de 25 chars)
// Char '0'=fundo, '1'–'9'=cor correspondente
// ─────────────────────────────────────────────────────────────────

const PNT_DESENHOS = [

  // ── 1. Dragão de Fogo ──────────────────────────────────────────
  {
    id: 'dragao_fogo',
    name: 'DRAGÃO DE FOGO',
    xp: 120, coins: 80,
    grid: [
      '0000000099900000000000000',
      '0000000919190000000000000',
      '0000009111190000000000000',
      '0000099111990000040000000',
      '0000911119900000440000000',
      '0009111199000004440000000',
      '0099111990000044440000000',
      '0991119900000444440000000',
      '9911199000004444400000000',
      '9911990000044449900000000',
      '9919900009944411190000000',
      '9919000099441111190000000',
      '9990009944111111990000000',
      '9900099411111119900000000',
      '9000994111111990000000000',
      '0009941111119900000000000',
      '0099411111990000000000000',
      '0994111199000000000000000',
      '9941111990000000000000000',
      '9941199000000000000000000',
      '9941990000000000000000000',
      '9941900000000000000000000',
      '9941000000000000000000000',
      '9990000000000000000000000',
      '9900000000000000000000000',
    ]
  },

  // ── 2. Lobo das Sombras ────────────────────────────────────────
  {
    id: 'lobo_sombras',
    name: 'LOBO DAS SOMBRAS',
    xp: 110, coins: 75,
    grid: [
      '0000000000000000000000000',
      '0000009900000000009900000',
      '0000097790000000097790000',
      '0000977779000000977790000',
      '0000977779000009777790000',
      '0000977779999997777790000',
      '0000097777777777777900000',
      '0000009777777777779000000',
      '0000099777777777779000000',
      '0009977777777777777990000',
      '0099777777777777777779000',
      '0997777777566577777779900',
      '9977777777565677777777990',
      '9977777775665677777777990',
      '9977777775656577777777790',
      '0997777777777777777777990',
      '0097777777777777777779900',
      '0009977777777777777990000',
      '0000997777777777779900000',
      '0000099777777777990000000',
      '0000009977777799000000000',
      '0009900099777990009900000',
      '0097900000999000009790000',
      '0097000000000000000790000',
      '0090000000000000000090000',
    ]
  },

  // ── 3. Fênix da Luz ───────────────────────────────────────────
  {
    id: 'fenix_luz',
    name: 'FÊNIX DA LUZ',
    xp: 130, coins: 90,
    grid: [
      '0000000001000000000000000',
      '0000000016100000000000000',
      '0000000166610000000000000',
      '0000001666661000000000000',
      '0000016666666100000000000',
      '0000166666666610000000000',
      '0001616166166161000000000',
      '0011116111111161100000000',
      '0111161111111116110000000',
      '1111661111111166111000000',
      '1116661111111166611000000',
      '1166661111111166661100000',
      '1666661111111166666100000',
      '0666661111111166666100000',
      '0066661111111166661000000',
      '0006661111111166610000000',
      '0000661111111166600000000',
      '0000061111111166000000000',
      '0000006111111660000000000',
      '0000000611116600000000000',
      '0000000061166000000000000',
      '0000000006660000000000000',
      '0000000000600000000000000',
      '0000000000000000000000000',
      '0000000000000000000000000',
    ]
  },

  // ── 4. Espírito da Água ────────────────────────────────────────
  {
    id: 'espirito_agua',
    name: 'ESPÍRITO DA ÁGUA',
    xp: 100, coins: 70,
    grid: [
      '0000000000020000000000000',
      '0000000000222000000000000',
      '0000000002222200000000000',
      '0000000022622220000000000',
      '0000000226622222000000000',
      '0000002266662222200000000',
      '0000022226622222200000000',
      '0000222226662222200000000',
      '0002222226666222200000000',
      '0022222266666622200000000',
      '0222222266666622220000000',
      '2222222666666662220000000',
      '2222226666666662220000000',
      '2222266666666662222000000',
      '2222666666666662222000000',
      '0222666666666662222200000',
      '0022666666666662222200000',
      '0002266666666622222200000',
      '0000226666666222222200000',
      '0000022666662222222000000',
      '0000002266622222220000000',
      '0000000226222222200000000',
      '0000000022222222000000000',
      '0000000002222200000000000',
      '0000000000220000000000000',
    ]
  },

  // ── 5. Cristal do Vento ────────────────────────────────────────
  {
    id: 'cristal_vento',
    name: 'CRISTAL DO VENTO',
    xp: 90, coins: 65,
    grid: [
      '0000000000040000000000000',
      '0000000000444000000000000',
      '0000000004444400000000000',
      '0000000044444440000000000',
      '0000000444444444000000000',
      '0000004448444844000000000',
      '0000044488448844400000000',
      '0000444884444488440000000',
      '0004448844444448840000000',
      '0044488444444448884000000',
      '0444884444444444888400000',
      '4448844444444444488840000',
      '4448444444444444448884000',
      '4484444444444444444884400',
      '4484444444444444444488440',
      '4484444444444444444488840',
      '4484444444444444444488880',
      '0448444444444444444488800',
      '0044884444444444444488000',
      '0004488444444444444880000',
      '0000448844444444448800000',
      '0000044884444444488000000',
      '0000004448444444880000000',
      '0000000444444448800000000',
      '0000000044444480000000000',
    ]
  },

  // ── 6. Tartaruga Elemental ─────────────────────────────────────
  {
    id: 'tartaruga',
    name: 'TARTARUGA ELEMENTAL',
    xp: 95, coins: 65,
    grid: [
      '0000000000000000000000000',
      '0000000009999000000000000',
      '0000000099333990000000000',
      '0000000993333399000000000',
      '0000009933334339900000000',
      '0000099334434339900000000',
      '0000993344443339990000000',
      '0009933444444433990000000',
      '0099334444444439900000000',
      '0993344444444443900000000',
      '9933444444444444390000000',
      '9934444444444444390000000',
      '9934444444444444390000000',
      '9934444444444444490000000',
      '9934444444444444490000000',
      '0993344444444443900000000',
      '0099334444444439900000000',
      '0009933444444433990000000',
      '0000993344443339990000000',
      '0000099334434339900000000',
      '0000009933334339900000000',
      '0000000993333399000000000',
      '0000000099333990009900000',
      '0000000009999000099990000',
      '0000000000000000099900000',
    ]
  },

  // ── 7. Runa do Vácuo ──────────────────────────────────────────
  {
    id: 'runa_vacuo',
    name: 'RUNA DO VÁCUO',
    xp: 115, coins: 80,
    grid: [
      '0000000000000000000000000',
      '0000099999999999900000000',
      '0000933333333333390000000',
      '0009333555555533339000000',
      '0093335555555553339000000',
      '0093335533335553339000000',
      '0093335339933553339000000',
      '0093335399993553339000000',
      '0093335399993553339000000',
      '0093335339933553339000000',
      '0093335533335553339000000',
      '0093335555555553339000000',
      '0009333555555533339000000',
      '0000933333333333390000000',
      '0000099999999999900000000',
      '0000000000000000000000000',
      '0000003300000033000000000',
      '0000033330000033300000000',
      '0000333300000003330000000',
      '0003333000000000333000000',
      '0033330000000000033300000',
      '0333300000000000003330000',
      '0033330000000000033300000',
      '0003333000000000333000000',
      '0000000000000000000000000',
    ]
  },

  // ── 8. Coruja da Eletricidade ──────────────────────────────────
  {
    id: 'coruja_elet',
    name: 'CORUJA ELÉTRICA',
    xp: 105, coins: 72,
    grid: [
      '0000000000000000000000000',
      '0000009500000059000000000',
      '0000095550000555900000000',
      '0000955559005559590000000',
      '0009555590059555950000000',
      '0009555595595555950000000',
      '0009555595959555950000000',
      '0009555559959555950000000',
      '0000955555555559500000000',
      '0000095555555595000000000',
      '0000009555555590000000000',
      '0000009955555990000000000',
      '0000099955555999000000000',
      '0000999455545499000000000',
      '0009994455545499900000000',
      '0099944455554499990000000',
      '0999444445554444999000000',
      '0099444445554444990000000',
      '0009944445554449900000000',
      '0000994445554499000000000',
      '0000099445554990000000000',
      '0000009944499000000000000',
      '0000000999990000000000000',
      '0000000099900000000000000',
      '0000000000000000000000000',
    ]
  },

  // ── 9. Serpente de Terra ───────────────────────────────────────
  {
    id: 'serpente_terra',
    name: 'SERPENTE DE TERRA',
    xp: 100, coins: 68,
    grid: [
      '0000000000000000000000000',
      '0000000000333000000000000',
      '0000000003343300000000000',
      '0000000033433330000000000',
      '0000000334343330000000000',
      '0000003343433300000000000',
      '0000033434333000000000000',
      '0000334343300000000000000',
      '0003343433000000000000000',
      '0033434330000000000000000',
      '0334343300000000000000000',
      '3343433000000000000000000',
      '3434330000000000000000000',
      '3433300000000000000000000',
      '0433300000000000000333000',
      '0333000000000000003343300',
      '0000000000000000033433330',
      '0000000000000000334343330',
      '0000000000000003343433300',
      '0000000000000033434333000',
      '0000000000000334343300000',
      '0000000000003343433000000',
      '0000000000033434330000000',
      '0000000000334333000000000',
      '0000000000333300000000000',
    ]
  },

  // ── 10. Cogumelo Mágico ────────────────────────────────────────
  {
    id: 'cogumelo',
    name: 'COGUMELO MÁGICO',
    xp: 85, coins: 60,
    grid: [
      '0000000000000000000000000',
      '0000000001111100000000000',
      '0000000011111110000000000',
      '0000000111111111000000000',
      '0000001181111811000000000',
      '0000011881111881100000000',
      '0000111811111181110000000',
      '0001118811111188111000000',
      '0011188111111118811000000',
      '0111811111111111811100000',
      '1118111111111111181100000',
      '1181111111111111118110000',
      '1811111111111111111810000',
      '1111111111111111111110000',
      '0111111111111111111100000',
      '0011111111111111111000000',
      '0001111111111111110000000',
      '0000008888888880000000000',
      '0000008888888880000000000',
      '0000008811111880000000000',
      '0000008811111880000000000',
      '0000008811111880000000000',
      '0000008888888880000000000',
      '0000000888888800000000000',
      '0000000000000000000000000',
    ]
  },
];

// ── Estado ─────────────────────────────────────────────────────────
let _pntDrawingId  = null;  // id do desenho atual
let _pntGrid       = [];    // grade atual (números pintados pelo jogador)
let _pntTarget     = [];    // grade alvo (resposta correta)
let _pntCorAtual   = 1;     // cor selecionada na paleta
let _pntCols       = 25;
let _pntRows       = 25;
let _pntRunning    = false;
let _pntTotalCells = 0;     // células a preencher (não-zero)
let _pntFilled     = 0;     // células já corretas

// Progresso salvo: { [id]: true } — completados
function _pntGetCompleted() {
  try { return JSON.parse(localStorage.getItem('pnt_completed') || '{}'); } catch { return {}; }
}
function _pntSetCompleted(id) {
  const c = _pntGetCompleted(); c[id] = true;
  localStorage.setItem('pnt_completed', JSON.stringify(c));
}

// ── Abrir minigame ─────────────────────────────────────────────────
function startPintura() {
  if(vitals.energia < 5) {
    showBubble('Cansado demais... 😴');
    ModalManager.close('pinturaModal');
    return;
  }

  // Escolhe próximo desenho não completado (ou aleatório se todos prontos)
  const completed = _pntGetCompleted();
  const pending   = PNT_DESENHOS.filter(d => !completed[d.id]);
  const draw      = pending.length > 0
    ? pending[Math.floor(Math.random() * pending.length)]
    : PNT_DESENHOS[Math.floor(Math.random() * PNT_DESENHOS.length)];

  _pntDrawingId = draw.id;
  _pntTarget    = draw.grid;
  _pntCols      = draw.grid[0].length;
  _pntRows      = draw.grid.length;

  // Inicia grade do jogador zerada (0 em tudo)
  _pntGrid = Array.from({length: _pntRows}, (_, r) =>
    Array.from({length: _pntCols}, () => 0)
  );

  // Conta células a preencher
  _pntTotalCells = 0;
  for(let r = 0; r < _pntRows; r++)
    for(let c = 0; c < _pntCols; c++)
      if(parseInt(_pntTarget[r][c]) !== 0) _pntTotalCells++;
  _pntFilled = 0;

  _pntCorAtual  = 1;
  _pntRunning   = true;

  // UI
  const nameEl = document.getElementById('pinturaDrawingName');
  if(nameEl) nameEl.textContent = draw.name;

  const result = document.getElementById('pinturaResult');
  if(result) { result.textContent = ''; result.className = 'mini-result-box'; }
  const reward = document.getElementById('pinturaReward');
  if(reward) reward.textContent = '';
  const again = document.getElementById('pinturaAgainBtn');
  if(again) again.style.display = 'none';

  _pntBuildPaleta(draw.grid);
  _pntUpdateProgress();

  const canvas = document.getElementById('pinturaCanvas');
  if(canvas) {
    const sz = canvas.offsetWidth || 300;
    canvas.width  = sz;
    canvas.height = sz;
    _pntRender();
    _pntAttachEvents(canvas);
  }
}

// ── Constrói paleta (só cores presentes no desenho) ────────────────
function _pntBuildPaleta(grid) {
  const used = new Set();
  for(const row of grid) for(const ch of row) { const n = parseInt(ch); if(n > 0) used.add(n); }

  const el = document.getElementById('pinturaPaleta');
  if(!el) return;
  el.innerHTML = '';
  for(const idx of [...used].sort((a,b) => a-b)) {
    const btn = document.createElement('button');
    btn.className = 'pnt-cor' + (idx === _pntCorAtual ? ' active' : '');
    btn.style.background = PNT_CORES[idx];
    btn.innerHTML = `<span class="pnt-num">${idx}</span>`;
    btn.onclick = () => _pntSelectCor(idx);
    el.appendChild(btn);
  }
}

function _pntSelectCor(idx) {
  _pntCorAtual = idx;
  document.querySelectorAll('.pnt-cor').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.pnt-cor')[
    [...document.querySelectorAll('.pnt-cor')].findIndex(b => b.querySelector('.pnt-num')?.textContent == idx)
  ]?.classList.add('active');
}

// ── Pintar célula ──────────────────────────────────────────────────
function _pntPaint(col, row) {
  if(!_pntRunning) return;
  if(row < 0 || row >= _pntRows || col < 0 || col >= _pntCols) return;
  const correct = parseInt(_pntTarget[row][col]);
  if(correct === 0) return; // fundo, não pinta

  const was = _pntGrid[row][col];
  _pntGrid[row][col] = _pntCorAtual;

  // Atualiza contagem
  if(_pntCorAtual === correct && was !== correct) _pntFilled++;
  if(_pntCorAtual !== correct && was === correct) _pntFilled--;

  _pntRender();
  _pntUpdateProgress();

  if(_pntFilled >= _pntTotalCells) {
    setTimeout(_pntComplete, 300);
  }
}

// ── Render ─────────────────────────────────────────────────────────
function _pntRender() {
  const canvas = document.getElementById('pinturaCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cw = W / _pntCols, ch = H / _pntRows;

  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 0, W, H);

  for(let r = 0; r < _pntRows; r++) {
    for(let c = 0; c < _pntCols; c++) {
      const target  = parseInt(_pntTarget[r][c]);
      const painted = _pntGrid[r][c];
      const px = Math.floor(c * cw), py = Math.floor(r * ch);
      const pw = Math.ceil(cw),      ph = Math.ceil(ch);

      if(target === 0) continue; // fundo transparente

      if(painted > 0) {
        // Célula pintada
        ctx.fillStyle = PNT_CORES[painted] || '#888';
        ctx.fillRect(px, py, pw, ph);
        // Borda sutil
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      } else {
        // Célula vazia: fundo cinza escuro com número
        ctx.fillStyle = '#1a1535';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

        // Número (só se célula grande o suficiente)
        if(cw >= 8) {
          ctx.fillStyle = PNT_CORES[target] + 'bb';
          ctx.font = `bold ${Math.max(6, Math.floor(cw * 0.52))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(target, px + cw * 0.5, py + ch * 0.5);
        }
      }
    }
  }
}

// ── Eventos de toque/mouse ──────────────────────────────────────────
function _pntAttachEvents(canvas) {
  // Remove listeners antigos clonando o nó
  const clone = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(clone, canvas);
  const cv = document.getElementById('pinturaCanvas');

  function coordToCell(clientX, clientY) {
    const rect = cv.getBoundingClientRect();
    const scaleX = _pntCols / rect.width;
    const scaleY = _pntRows / rect.height;
    return {
      col: Math.floor((clientX - rect.left) * scaleX),
      row: Math.floor((clientY - rect.top)  * scaleY),
    };
  }

  let painting = false;
  cv.addEventListener('mousedown', e => {
    painting = true;
    const {col, row} = coordToCell(e.clientX, e.clientY);
    _pntPaint(col, row);
  });
  cv.addEventListener('mousemove', e => {
    if(!painting) return;
    const {col, row} = coordToCell(e.clientX, e.clientY);
    _pntPaint(col, row);
  });
  cv.addEventListener('mouseup',   () => { painting = false; });
  cv.addEventListener('mouseleave',() => { painting = false; });

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    const {col, row} = coordToCell(t.clientX, t.clientY);
    _pntPaint(col, row);
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const {col, row} = coordToCell(t.clientX, t.clientY);
    _pntPaint(col, row);
  }, { passive: false });
}

// ── Progresso ──────────────────────────────────────────────────────
function _pntUpdateProgress() {
  const el = document.getElementById('pinturaProgress');
  if(el) el.textContent = `🎨 ${_pntFilled} / ${_pntTotalCells}`;
}

// ── Conclusão ──────────────────────────────────────────────────────
function _pntComplete() {
  _pntRunning = false;
  const draw     = PNT_DESENHOS.find(d => d.id === _pntDrawingId);
  const completed = _pntGetCompleted();
  const isNew    = !completed[_pntDrawingId];

  applyGameCost();

  if(typeof playSound === 'function') playSound('win');

  const result = document.getElementById('pinturaResult');
  const reward = document.getElementById('pinturaReward');
  const again  = document.getElementById('pinturaAgainBtn');

  if(result) { result.textContent = '🖼 OBRA CONCLUÍDA!'; result.className = 'mini-result-box win'; }

  if(isNew && draw) {
    _pntSetCompleted(_pntDrawingId);
    xp      += draw.xp;
    earnCoins(draw.coins);
    vinculo += 5;
    checkXP(); updateAllUI(); scheduleSave();
    if(reward) reward.textContent = `+${draw.xp} XP · +${draw.coins} 🪙 · adicionado à Galeria!`;
  } else {
    if(reward) reward.textContent = `Já na galeria — sem recompensa dupla 🎨`;
  }

  if(again) again.style.display = 'inline-block';

  // Força render final com tudo colorido correto
  for(let r = 0; r < _pntRows; r++)
    for(let c = 0; c < _pntCols; c++)
      _pntGrid[r][c] = parseInt(_pntTarget[r][c]);
  _pntRender();

  // Atualiza galeria se aberta
  _galeriaRefreshIfOpen();
}

// ═══════════════════════════════════════════════════════════════════
// GALERIA
// ═══════════════════════════════════════════════════════════════════

function openGaleria() {
  ModalManager.close('gameSelector');
  ModalManager.open('galeriaModal');
  _galeriaBuild();
}

function _galeriaBuild() {
  const grid = document.getElementById('galeriaGrid');
  if(!grid) return;
  const completed = _pntGetCompleted();
  grid.innerHTML = '';

  for(const draw of PNT_DESENHOS) {
    const done = !!completed[draw.id];
    const card = document.createElement('div');
    card.className = 'gal-card' + (done ? ' done' : ' gal-locked');

    const cv = document.createElement('canvas');
    cv.className = 'gal-canvas';
    cv.width  = 75;
    cv.height = 75;
    _galeriaRenderMini(cv, draw, done);
    card.appendChild(cv);

    const name = document.createElement('div');
    name.className = 'gal-name';
    name.textContent = done ? draw.name : '???';
    card.appendChild(name);

    if(done) {
      const badge = document.createElement('div');
      badge.className = 'gal-badge';
      badge.textContent = '✓';
      card.appendChild(badge);
    }

    grid.appendChild(card);
  }
}

function _galeriaRenderMini(canvas, draw, done) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cols = draw.grid[0].length, rows = draw.grid.length;
  const cw = W / cols, ch = H / rows;

  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 0, W, H);

  for(let r = 0; r < rows; r++) {
    for(let c = 0; c < cols; c++) {
      const n = parseInt(draw.grid[r][c]);
      if(n === 0) continue;
      ctx.fillStyle = done ? PNT_CORES[n] : 'rgba(255,255,255,0.08)';
      ctx.fillRect(Math.floor(c * cw), Math.floor(r * ch), Math.ceil(cw), Math.ceil(ch));
    }
  }
}

function _galeriaRefreshIfOpen() {
  if(ModalManager.isOpen('galeriaModal')) _galeriaBuild();
}
