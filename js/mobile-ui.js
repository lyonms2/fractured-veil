// ═══════════════════════════════════════════════════════════════════
// MOBILE UI — Bottom Nav + Status Inline
// Incluir no index.html ANTES do </body>, DEPOIS de todos os outros scripts
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Só roda em mobile ──
  function isMobile() { return window.innerWidth <= 768; }

  // ════════════════════════════════════════════════════════════════
  // 1. INJEÇÃO DA BOTTOM NAV
  // ════════════════════════════════════════════════════════════════
  function injectBottomNav() {
    if (document.getElementById('fvBottomNav')) return;

    const nav = document.createElement('nav');
    nav.className = 'fv-bottom-nav';
    nav.id = 'fvBottomNav';
    nav.innerHTML = `
      <div class="fv-bottom-nav-inner">

        <!-- NUTRIR -->
        <button class="fv-bn-btn btn-disabled" id="bnFeed"
          onclick="feedCreature()"
          title="Nutrir (10 🪙)">
          <span class="fv-bn-icon">🍖</span>
          <span>NUTRIR</span>
        </button>

        <!-- BRINCAR / MINIGAMES -->
        <button class="fv-bn-btn btn-disabled" id="bnPlay"
          onclick="openGameSelector()"
          title="Brincar">
          <span class="fv-bn-icon">🎮</span>
          <span>BRINCAR</span>
        </button>

        <!-- DORMIR (hold para modo repouso) -->
        <button class="fv-bn-btn btn-disabled" id="bnSleep"
          onpointerdown="onSleepPointerDown()"
          onpointerup="onSleepPointerUp()"
          onpointerleave="onSleepPointerUp()"
          title="Dormir (segurar para repouso)">
          <span class="fv-bn-icon">💤</span>
          <span id="bnSleepLabel">DORMIR</span>
        </button>

        <!-- MEDICAR -->
        <button class="fv-bn-btn btn-disabled" id="bnHeal"
          onclick="healCreature()"
          title="Medicar (40 🪙)">
          <span class="fv-bn-icon">💊</span>
          <span>MEDICAR</span>
        </button>

        <!-- BANHO -->
        <button class="fv-bn-btn btn-disabled" id="bnBath"
          onclick="cleanCreature()"
          title="Banho (-15 ⚡)">
          <span class="fv-bn-icon">🛁</span>
          <span>BANHO</span>
        </button>

      </div>
    `;

    document.body.appendChild(nav);
  }

  // ════════════════════════════════════════════════════════════════
  // 2. INJEÇÃO DO STATUS INLINE (barras abaixo da screen)
  // ════════════════════════════════════════════════════════════════
  function injectStatusInline() {
    if (document.getElementById('mobileStatusInline')) return;

    // Injeta depois do screen order:1, antes dos botões
    const device = document.querySelector('.device');
    if (!device) return;

    const statusEl = document.createElement('div');
    statusEl.id = 'mobileStatusInline';
    statusEl.innerHTML = `
      <div class="msi-row">
        <span class="msi-icon">🍖</span>
        <div class="msi-track"><div class="msi-fill msi-fome"  id="msiFome"    style="width:100%"></div></div>
        <span class="msi-val" id="msiValFome">100</span>
      </div>
      <div class="msi-row">
        <span class="msi-icon">😊</span>
        <div class="msi-track"><div class="msi-fill msi-humor"   id="msiHumor"   style="width:100%"></div></div>
        <span class="msi-val" id="msiValHumor">100</span>
      </div>
      <div class="msi-row">
        <span class="msi-icon">⚡</span>
        <div class="msi-track"><div class="msi-fill msi-energia" id="msiEnergia" style="width:100%"></div></div>
        <span class="msi-val" id="msiValEnergia">100</span>
      </div>
      <div class="msi-row">
        <span class="msi-icon">❤️</span>
        <div class="msi-track"><div class="msi-fill msi-saude"   id="msiSaude"   style="width:100%"></div></div>
        <span class="msi-val" id="msiValSaude">100</span>
      </div>
      <div class="msi-row">
        <span class="msi-icon">🧹</span>
        <div class="msi-track"><div class="msi-fill msi-higiene" id="msiHigiene" style="width:100%"></div></div>
        <span class="msi-val" id="msiValHigiene">100</span>
      </div>
    `;

    // Insere depois do #actionBtns (que está hidden no mobile)
    const actionBtns = device.querySelector('#actionBtns');
    if (actionBtns) {
      actionBtns.insertAdjacentElement('afterend', statusEl);
    } else {
      device.appendChild(statusEl);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 3. SINCRONIZAÇÃO DAS BARRAS MOBILE COM O ESTADO DO JOGO
  // ════════════════════════════════════════════════════════════════
  function syncMobileStatus() {
    if (!isMobile()) return;

    // Lê os vitals do jogo (definidos em state.js)
    const stats = [
      { id: 'msiFome',    valId: 'msiValFome',    key: 'fome' },
      { id: 'msiHumor',   valId: 'msiValHumor',   key: 'humor' },
      { id: 'msiEnergia', valId: 'msiValEnergia',  key: 'energia' },
      { id: 'msiSaude',   valId: 'msiValSaude',    key: 'saude' },
      { id: 'msiHigiene', valId: 'msiValHigiene',  key: 'higiene' },
    ];

    stats.forEach(({ id, valId, key }) => {
      const bar = document.getElementById(id);
      const val = document.getElementById(valId);
      if (!bar || !val) return;

      // vitals está definido em state.js como objeto global
      const v = typeof vitals !== 'undefined' ? (vitals[key] ?? 100) : 100;
      const pct = Math.max(0, Math.min(100, Math.round(v)));

      bar.style.width = pct + '%';
      val.textContent = pct;

      // Pulsa vermelho quando crítico (< 25)
      bar.classList.toggle('critical', pct < 25);
    });

    // Sincroniza estado do botão dormir
    syncSleepButton();
  }

  // ════════════════════════════════════════════════════════════════
  // 4. ATUALIZA A BOTTOM NAV CONFORME ESTADO DO JOGO
  // ════════════════════════════════════════════════════════════════
  function updateBottomNav() {
    if (!isMobile()) return;

    // Botões que precisam de avatar vivo e acordado
    const needsAlive = ['bnFeed', 'bnPlay', 'bnHeal', 'bnBath'];
    const alive = typeof hatched !== 'undefined' && hatched &&
                  typeof dead   !== 'undefined' && !dead;

    needsAlive.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.toggle('btn-disabled', !alive);
    });

    // Botão dormir: sempre ativo se avatar vivo
    const bnSleep = document.getElementById('bnSleep');
    if (bnSleep) {
      bnSleep.classList.toggle('btn-disabled', !alive);
    }

    // Estado "ativo" do dormir quando está a dormir
    syncSleepButton();

    // Badge no botão brincar quando avatar está com humor baixo
    const bnPlay = document.getElementById('bnPlay');
    if (bnPlay && alive && typeof vitals !== 'undefined') {
      let badge = bnPlay.querySelector('.fv-bn-badge');
      if (vitals.humor < 30) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'fv-bn-badge';
          badge.textContent = '!';
          bnPlay.appendChild(badge);
        }
      } else {
        badge?.remove();
      }
    }

    // Badge no botão nutrir quando avatar está com fome baixa
    const bnFeed = document.getElementById('bnFeed');
    if (bnFeed && alive && typeof vitals !== 'undefined') {
      let badge = bnFeed.querySelector('.fv-bn-badge');
      if (vitals.fome < 25) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'fv-bn-badge';
          badge.textContent = '!';
          bnFeed.appendChild(badge);
        }
      } else {
        badge?.remove();
      }
    }
  }

  function syncSleepButton() {
    const bnSleep = document.getElementById('bnSleep');
    const label   = document.getElementById('bnSleepLabel');
    if (!bnSleep) return;

    const isSleeping = typeof sleeping !== 'undefined' && sleeping;
    bnSleep.classList.toggle('active', isSleeping);
    if (label) label.textContent = isSleeping ? 'ACORDAR' : 'DORMIR';
  }

  // ════════════════════════════════════════════════════════════════
  // 5. HOOK NO gameTick / updateAllUI DO JOGO
  //    Interceptamos updateAllUI() para atualizar o mobile também
  // ════════════════════════════════════════════════════════════════
  function hookGameLoop() {
    // Guarda referência da função original
    const _origUpdateAllUI = typeof updateAllUI === 'function' ? updateAllUI : null;

    if (_origUpdateAllUI) {
      window.updateAllUI = function () {
        _origUpdateAllUI.apply(this, arguments);
        if (isMobile()) {
          syncMobileStatus();
          updateBottomNav();
        }
      };
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 6. RESIZE: adapta se utilizador girar o ecrã
  // ════════════════════════════════════════════════════════════════
  let _resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      if (isMobile()) {
        injectBottomNav();
        injectStatusInline();
        syncMobileStatus();
        updateBottomNav();
      }
    }, 150);
  });

  // ════════════════════════════════════════════════════════════════
  // 7. INICIALIZAÇÃO
  //    Espera o DOM carregar e o jogo inicializar
  // ════════════════════════════════════════════════════════════════
  function init() {
    if (!isMobile()) return;

    injectBottomNav();
    injectStatusInline();

    // Hook na função de update do jogo
    // Tenta imediatamente e também com delay (caso scripts ainda carreguem)
    hookGameLoop();
    setTimeout(hookGameLoop, 500);
    setTimeout(hookGameLoop, 1500);

    // Sync inicial após um curto delay para o jogo carregar
    setTimeout(() => {
      syncMobileStatus();
      updateBottomNav();
    }, 800);

    // Sync periódico de segurança (caso o hook falhe)
    setInterval(() => {
      if (isMobile()) {
        syncMobileStatus();
        updateBottomNav();
      }
    }, 2000);
  }

  // Aguarda DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
