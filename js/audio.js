// ═══════════════════════════════════════════════════════════════════
// AUDIO — Web Audio API (sem arquivos externos)
// Todos os sons são sintetizados em tempo real.
// iOS/Android: o AudioContext só ativa após o primeiro toque do usuário.
// ═══════════════════════════════════════════════════════════════════

let _audioCtx = null;
let _audioEnabled = true;

function _getCtx() {
  if(!_audioEnabled) return null;
  try {
    if(!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  } catch(e) { return null; }
}

// Ativa o AudioContext no primeiro toque (necessário para iOS)
document.addEventListener('touchstart', _getCtx, { once: true, passive: true });
document.addEventListener('mousedown',  _getCtx, { once: true, passive: true });

// ── Helper: toca um oscilador simples ─────────────────────────────
function _osc(freq, type, start, dur, vol, ctx, dest) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest || ctx.destination);
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol || 0.3, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// ── Helper: sweep de frequência ───────────────────────────────────
function _sweep(freqFrom, freqTo, type, start, dur, vol, ctx, dest) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest || ctx.destination);
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freqFrom, start);
  osc.frequency.linearRampToValueAtTime(freqTo, start + dur);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol || 0.3, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// ── Helper: ruído branco (filtrado) ──────────────────────────────
function _noise(start, dur, vol, filterFreq, ctx) {
  const bufSize = ctx.sampleRate * dur;
  const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data    = buf.getChannelData(0);
  for(let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src    = ctx.createBufferSource();
  src.buffer   = buf;
  const filter = ctx.createBiquadFilter();
  filter.type  = 'bandpass';
  filter.frequency.value = filterFreq || 800;
  filter.Q.value = 1.5;
  const gain = ctx.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol || 0.2, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// ═══════════════════════════════════════════════════════════════════
// SONS DO JOGO
// ═══════════════════════════════════════════════════════════════════

function playSound(id) {
  const ctx = _getCtx();
  if(!ctx) return;
  const t = ctx.currentTime;

  switch(id) {

    // ── AÇÕES DO AVATAR ──────────────────────────────────────────

    case 'feed': {
      // Chime curto ascendente — satisfação
      _osc(440, 'sine', t,       0.12, 0.20, ctx);
      _osc(550, 'sine', t+0.10, 0.12, 0.18, ctx);
      _osc(660, 'sine', t+0.20, 0.18, 0.22, ctx);
      break;
    }

    case 'pet': {
      // Som suave e aconchegante — vibração gentil
      _sweep(320, 380, 'sine', t,      0.18, 0.15, ctx);
      _sweep(380, 340, 'sine', t+0.18, 0.18, 0.12, ctx);
      break;
    }

    case 'bath': {
      // Splash aquático — ruído filtrado com chime
      _noise(t, 0.18, 0.15, 1200, ctx);
      _noise(t+0.12, 0.18, 0.12, 900, ctx);
      _osc(880, 'sine', t+0.05, 0.10, 0.08, ctx);
      break;
    }

    case 'heal': {
      // Arpejo mágico ascendente
      _osc(392, 'sine', t,       0.14, 0.18, ctx);
      _osc(494, 'sine', t+0.10, 0.14, 0.18, ctx);
      _osc(587, 'sine', t+0.20, 0.14, 0.18, ctx);
      _osc(784, 'sine', t+0.30, 0.22, 0.22, ctx);
      break;
    }

    case 'sleep': {
      // Nota suave descendente — adormecer
      _sweep(280, 180, 'sine', t,      0.40, 0.12, ctx);
      _sweep(200, 140, 'sine', t+0.30, 0.50, 0.08, ctx);
      break;
    }

    case 'wakeup': {
      // Nota leve ascendente — acordar
      _sweep(200, 340, 'sine', t,      0.20, 0.12, ctx);
      _osc(440, 'sine', t+0.18, 0.18, 0.15, ctx);
      break;
    }

    case 'rename': {
      // Dois pings — confirmação
      _osc(660, 'sine', t,      0.10, 0.18, ctx);
      _osc(880, 'sine', t+0.12, 0.14, 0.20, ctx);
      break;
    }

    case 'repouso_on': {
      // Descida calma e longa
      _sweep(300, 160, 'sine', t, 0.60, 0.10, ctx);
      break;
    }

    case 'repouso_off': {
      // Subida animada
      _sweep(200, 400, 'sine', t, 0.30, 0.14, ctx);
      _osc(500, 'sine', t+0.28, 0.16, 0.12, ctx);
      break;
    }

    case 'coin': {
      // Tinido metálico
      _osc(1200, 'sine',   t,      0.06, 0.20, ctx);
      _osc(1600, 'triangle',t+0.04,0.10, 0.14, ctx);
      break;
    }

    case 'no_coins': {
      // Buzz negativo — sem saldo
      _sweep(220, 160, 'sawtooth', t, 0.20, 0.12, ctx);
      break;
    }

    // ── PROGRESSÃO ───────────────────────────────────────────────

    case 'levelup': {
      // Fanfarra de 4 notas — conquista
      _osc(523, 'square', t,       0.10, 0.15, ctx);
      _osc(659, 'square', t+0.10, 0.10, 0.15, ctx);
      _osc(784, 'square', t+0.20, 0.10, 0.15, ctx);
      _osc(1047,'square', t+0.30, 0.28, 0.18, ctx);
      // Harmônico suave por baixo
      _osc(262, 'sine',   t,       0.55, 0.08, ctx);
      break;
    }

    case 'evolve': {
      // Transformação — sweep dramático + acorde
      _sweep(150, 900, 'sawtooth', t,      0.45, 0.08, ctx);
      _osc(523, 'sine', t+0.40, 0.30, 0.15, ctx);
      _osc(659, 'sine', t+0.40, 0.30, 0.12, ctx);
      _osc(784, 'sine', t+0.40, 0.30, 0.10, ctx);
      break;
    }

    case 'death': {
      // Descida dissonante — grave e lenta
      _sweep(300, 80,  'sine',     t,      0.80, 0.14, ctx);
      _sweep(250, 60,  'triangle', t+0.10, 0.80, 0.10, ctx);
      _osc(100, 'sine', t+0.60, 0.50, 0.08, ctx);
      break;
    }

    case 'poop_alert': {
      // Dois bleeps cômicos
      _osc(300, 'square', t,      0.08, 0.12, ctx);
      _osc(250, 'square', t+0.12, 0.08, 0.10, ctx);
      break;
    }

    // ── OVO / INVOCAR ────────────────────────────────────────────

    case 'egg_laid': {
      // Ping leve + ruído suave
      _osc(880, 'sine', t,      0.12, 0.16, ctx);
      _noise(t+0.08, 0.20, 0.08, 600, ctx);
      break;
    }

    case 'egg_crack': {
      // Estalo seco
      _noise(t, 0.06, 0.25, 2000, ctx);
      _osc(200, 'sine', t+0.04, 0.10, 0.12, ctx);
      break;
    }

    case 'hatch': {
      // Nascimento — explosão de harmônicos + fanfarra
      _noise(t, 0.12, 0.20, 1500, ctx);
      _sweep(200, 600, 'sine', t+0.08, 0.30, 0.15, ctx);
      _osc(523, 'sine', t+0.35, 0.18, 0.18, ctx);
      _osc(659, 'sine', t+0.45, 0.18, 0.16, ctx);
      _osc(784, 'sine', t+0.55, 0.25, 0.20, ctx);
      break;
    }

    case 'summon_start': {
      // Portal abrindo — sweep de baixo para cima
      _sweep(60, 300, 'sine',     t,      0.70, 0.12, ctx);
      _sweep(80, 250, 'triangle', t+0.10, 0.60, 0.08, ctx);
      break;
    }

    case 'summon_pulse': {
      // Pulso de energia
      _sweep(200, 350, 'sine', t, 0.20, 0.10, ctx);
      break;
    }

    case 'summon_impact': {
      // Impacto — ruído + baixo
      _noise(t, 0.20, 0.25, 400, ctx);
      _sweep(150, 60, 'sine', t, 0.40, 0.15, ctx);
      break;
    }

    case 'rarity_comum': {
      _osc(523, 'sine', t,      0.15, 0.18, ctx);
      _osc(659, 'sine', t+0.14, 0.20, 0.20, ctx);
      break;
    }
    case 'rarity_raro': {
      _osc(523, 'sine',   t,      0.12, 0.16, ctx);
      _osc(659, 'sine',   t+0.10, 0.12, 0.16, ctx);
      _osc(784, 'sine',   t+0.20, 0.12, 0.16, ctx);
      _osc(1047,'triangle',t+0.30,0.25, 0.20, ctx);
      break;
    }
    case 'rarity_lendario': {
      // Épico — arpejo + acorde sustentado
      _osc(262, 'sine',   t,       0.12, 0.15, ctx);
      _osc(330, 'sine',   t+0.10,  0.12, 0.15, ctx);
      _osc(392, 'sine',   t+0.20,  0.12, 0.15, ctx);
      _osc(523, 'sine',   t+0.30,  0.12, 0.15, ctx);
      _osc(659, 'triangle',t+0.40, 0.12, 0.15, ctx);
      _osc(784, 'triangle',t+0.50, 0.40, 0.20, ctx);
      _osc(523, 'sine',   t+0.50,  0.40, 0.12, ctx);
      _osc(392, 'sine',   t+0.50,  0.40, 0.10, ctx);
      break;
    }

    // ── MINIGAMES — MEMÓRIA ───────────────────────────────────────

    case 'card_flip': {
      _sweep(400, 600, 'sine', t, 0.08, 0.12, ctx);
      break;
    }
    case 'card_match': {
      _osc(659, 'sine', t,      0.10, 0.18, ctx);
      _osc(784, 'sine', t+0.10, 0.14, 0.20, ctx);
      break;
    }
    case 'card_error': {
      _osc(220, 'sawtooth', t,      0.10, 0.15, ctx);
      _osc(196, 'sawtooth', t+0.12, 0.10, 0.12, ctx);
      break;
    }

    // ── MINIGAMES — SIMON SAYS ────────────────────────────────────
    // Notas distintas por elemento (usadas via playSimonTone(idx))
    case 'simon_0': _osc(261, 'sine', t, 0.30, 0.25, ctx); break; // Fogo — Dó
    case 'simon_1': _osc(329, 'sine', t, 0.30, 0.25, ctx); break; // Água — Mi
    case 'simon_2': _osc(392, 'sine', t, 0.30, 0.25, ctx); break; // Terra — Sol
    case 'simon_3': _osc(523, 'sine', t, 0.30, 0.25, ctx); break; // Ar — Dó5
    case 'simon_4': _osc(659, 'sine', t, 0.30, 0.25, ctx); break; // Éter — Mi5
    case 'simon_wrong': {
      _sweep(300, 160, 'sawtooth', t, 0.30, 0.18, ctx);
      break;
    }

    // ── MINIGAMES — CAMPO MINADO ──────────────────────────────────
    case 'mine_click': {
      _noise(t, 0.04, 0.10, 1800, ctx);
      break;
    }
    case 'mine_flag': {
      _osc(440, 'square', t, 0.06, 0.10, ctx);
      break;
    }
    case 'mine_explode': {
      _noise(t, 0.30, 0.30, 300, ctx);
      _sweep(400, 60, 'sawtooth', t, 0.40, 0.15, ctx);
      break;
    }

    // ── MINIGAMES — JOGO DA VELHA ─────────────────────────────────
    case 'velha_place': {
      _osc(500, 'sine', t, 0.08, 0.14, ctx);
      break;
    }
    case 'velha_win': {
      _osc(523, 'sine',   t,      0.12, 0.18, ctx);
      _osc(659, 'sine',   t+0.12, 0.12, 0.18, ctx);
      _osc(784, 'sine',   t+0.24, 0.22, 0.20, ctx);
      break;
    }
    case 'velha_lose': {
      _sweep(300, 180, 'triangle', t,      0.20, 0.14, ctx);
      _sweep(200, 120, 'triangle', t+0.22, 0.20, 0.10, ctx);
      break;
    }
    case 'velha_draw': {
      _osc(440, 'sine', t,      0.10, 0.14, ctx);
      _osc(440, 'sine', t+0.14, 0.10, 0.10, ctx);
      break;
    }

    // ── RESULTADO GENÉRICO ────────────────────────────────────────
    case 'win': {
      _osc(523, 'sine',    t,      0.10, 0.18, ctx);
      _osc(659, 'sine',    t+0.10, 0.10, 0.18, ctx);
      _osc(784, 'sine',    t+0.20, 0.10, 0.18, ctx);
      _osc(1047,'triangle',t+0.30, 0.30, 0.22, ctx);
      break;
    }
    case 'lose': {
      _sweep(330, 165, 'sine', t,      0.25, 0.15, ctx);
      _sweep(220, 110, 'sine', t+0.22, 0.30, 0.12, ctx);
      break;
    }

    // ── ARENA ─────────────────────────────────────────────────────
    case 'arena_challenge': {
      // Fanfarra de desafio — marcial
      _osc(392, 'square', t,      0.08, 0.15, ctx);
      _osc(523, 'square', t+0.10, 0.08, 0.15, ctx);
      _osc(392, 'square', t+0.20, 0.14, 0.15, ctx);
      break;
    }
    case 'arena_accept': {
      _osc(523, 'square', t,      0.08, 0.15, ctx);
      _osc(659, 'square', t+0.10, 0.14, 0.18, ctx);
      break;
    }
    case 'arena_choice': {
      // Clique de seleção JKP
      _osc(600, 'sine', t, 0.07, 0.18, ctx);
      break;
    }
    case 'arena_round_win': {
      _osc(659, 'sine', t,      0.10, 0.18, ctx);
      _osc(784, 'sine', t+0.12, 0.16, 0.20, ctx);
      break;
    }
    case 'arena_round_lose': {
      _sweep(300, 200, 'triangle', t, 0.22, 0.14, ctx);
      break;
    }
    case 'arena_round_draw': {
      _osc(440, 'sine', t, 0.14, 0.12, ctx);
      break;
    }

    // ── LORE ──────────────────────────────────────────────────────
    case 'lore_scene': {
      // Whoosh atmosférico sombrio
      _sweep(80, 200, 'sine',  t,      0.50, 0.08, ctx);
      _sweep(60, 140, 'triangle',t+0.10, 0.50, 0.06, ctx);
      break;
    }
    case 'lore_choice': {
      // Click seco e sombrio
      _noise(t, 0.05, 0.12, 2500, ctx);
      _osc(300, 'sine', t+0.03, 0.08, 0.08, ctx);
      break;
    }
    case 'lore_complete': {
      // Resolução — acorde menor com fade
      _osc(392, 'sine', t,      0.60, 0.14, ctx);
      _osc(466, 'sine', t+0.05, 0.60, 0.12, ctx);
      _osc(587, 'sine', t+0.10, 0.60, 0.10, ctx);
      break;
    }

    // ── ERROS / ALERTAS GERAIS ────────────────────────────────────
    case 'error': {
      _sweep(300, 200, 'sawtooth', t, 0.18, 0.14, ctx);
      break;
    }
    case 'success': {
      _osc(523, 'sine', t,      0.10, 0.15, ctx);
      _osc(659, 'sine', t+0.10, 0.16, 0.18, ctx);
      break;
    }
  }
}

// ── Simon Says: toca o tom pelo índice do elemento ───────────────
function playSimonTone(idx) {
  playSound('simon_' + idx);
}

// ── Toggle mudo ───────────────────────────────────────────────────
function toggleAudio() {
  _audioEnabled = !_audioEnabled;
  const btn = document.getElementById('btnAudio');
  if(btn) btn.textContent = _audioEnabled ? '🔊' : '🔇';
  localStorage.setItem('fv_audio', _audioEnabled ? '1' : '0');
}

// Restaura preferência salva
(function () {
  const saved = localStorage.getItem('fv_audio');
  if(saved === '0') _audioEnabled = false;
})();

window.playSound    = playSound;
window.playSimonTone = playSimonTone;
window.toggleAudio  = toggleAudio;
