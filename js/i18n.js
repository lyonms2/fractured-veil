// ═══════════════════════════════════════════════════════════════════
// I18N — Sistema de internacionalização
// Carregado antes de state.js para que t() esteja disponível
// ═══════════════════════════════════════════════════════════════════

(function () {
  const STRINGS = {

    // ── PORTUGUÊS ─────────────────────────────────────────────────
    pt: {
      // Auth — login
      'auth.fill_fields':        'Preenche e-mail e senha.',
      'auth.error.not_found':    'E-mail não encontrado.',
      'auth.error.wrong_pass':   'Senha incorreta.',
      'auth.error.invalid_email':'E-mail inválido.',
      'auth.error.too_many':     'Muitas tentativas. Tenta mais tarde.',
      'auth.error.invalid_cred': 'E-mail ou senha incorretos.',
      'auth.error.login':        'Erro ao entrar. Tenta novamente.',
      // Auth — registo
      'auth.reg.fill_all':       'Preenche todos os campos.',
      'auth.reg.pass_mismatch':  'As senhas não coincidem.',
      'auth.reg.pass_short':     'Senha deve ter pelo menos 6 caracteres.',
      'auth.reg.email_in_use':   'Este e-mail já está em uso.',
      'auth.reg.weak_pass':      'Senha muito fraca.',
      'auth.reg.error':          'Erro ao criar conta. Tenta novamente.',
      // Auth — reset
      'auth.reset.fill':         'Insere o teu e-mail.',
      'auth.reset.sent':         '✓ E-mail de recuperação enviado!',
      'auth.reset.not_found':    'E-mail não encontrado.',
      'auth.reset.error':        'Erro ao enviar. Tenta novamente.',
      // Auth — botões
      'auth.btn.logging_in':     'ENTRANDO...',
      'auth.btn.login':          'ENTRAR',
      'auth.btn.creating':       'CRIANDO...',
      'auth.btn.create':         'CRIAR CONTA',
      'auth.btn.sending':        'ENVIANDO...',
      'auth.btn.send_email':     'ENVIAR E-MAIL',
      'auth.btn.sent':           'ENVIADO ✓',

      // Logs
      'log.session_ended':       'Sessão encerrada.',
      'log.session_other':       '⚠️ Sessão iniciada noutro dispositivo. A encerrar...',
      'log.welcome_back':        'Bem-vindo de volta! ✨',
      'log.state_restored':      'Estado restaurado da nuvem! ☁️',
      'log.woke_offline':        'Acordou com energia plena enquanto estava offline! ☀️',
      'log.repouso_active':      'Modo repouso activo. 💤',
      'log.died_offline':        '{name} não sobreviveu à sua ausência...',
      'log.died':                '{name} partiu para outra dimensão... 💀',
      'log.welcome_new':         'Bem-vindo! Comece uma nova aventura! ✨',
      'log.fed':                 'Alimentado! +{gain} fome  (-{cost} 🪙)',
      'log.feed_no_coins':       'Precisa de {cost} 🪙 para alimentar!',
      'log.renamed':             'Avatar renomeado para "{name}" 💕',
      'log.repouso_on':          'Modo repouso ativado. Stats desaceleram. ⏸',
      'log.repouso_off':         'Modo repouso desativado. Bem-vindo de volta! ✨',
      'log.offline_away':        'Ausente por {h}h {m}min — {status}.',
      'log.offline_slept':       '☀️ acordou enquanto ausente',
      'log.offline_repouso':     '💤 modo repouso activo',
      'log.offline_updated':     'stats atualizados',

      // Bolhas de fala (showBubble)
      'bubble.sleeping':         'Shh... está dormindo 💤',
      'bubble.repouso':          'Em repouso... segure 💤 para retomar',
      'bubble.satisfied':        'Estou satisfeito!',
      'bubble.no_coins':         'Sem moedas... 😢',
      'bubble.dead':             '...💀',
      'bubble.no_avatar':        'Nenhum avatar activo!',
      'bubble.hungry':           'Estou faminto! 🍖',
      'bubble.tired':            'Cansado demais... 😴',
      'bubble.invalid_name':     'Nome inválido! ✕',
      'bubble.back':             'De volta! ✨',
      'bubble.renamed':          '{name}... Adoro esse nome! 💕',
      'bubble.session_ended':    'Sessão encerrada ⚠️',

      // FALAS do avatar (arrays)
      'falas.happy':  ['Estou feliz! ✨','Te amo! 💕','Que dia incrível!','Brinca comigo!'],
      'falas.hungry': ['Estou com fome...','Me alimente!','Faminto aqui! 🍖','Preciso comer!'],
      'falas.tired':  ['Tão cansado...','Vou dormir zzz','Preciso descansar','Exausto...'],
      'falas.sick':   ['Me sinto mal...','Preciso de remédio','Não estou bem :('],
      'falas.pet':    ['Heee~ 💕','Mais! Mais!','*ronrona*','♪ ♪ ♪','Adoro você!'],
      'falas.bored':  ['Entediado...','Me divirta!','Tão entediado...'],
      'falas.dirty':  ['Estou sujo... 😔','Preciso de banho!','Limpeza por favor! 🧹','Que cheiro ruim...'],

      // Fases
      'fases': ['BEBÊ','CRIANÇA','JOVEM','ADULTO'],

      // Vínculo
      'vinculo.distant':    'Distante',
      'vinculo.friend':     'Amigo',
      'vinculo.companion':  'Companheiro',
      'vinculo.soulmate':   'Alma Gémea',

      // Doenças
      'disease.exhaustion':   'Exaustão Crónica',
      'disease.malnutrition': 'Desnutrição',
      'disease.infection':    'Infecção',
      'disease.melancholy':   'Melancolia Dimensional',

      // Itens — nomes
      'item.satiety_amulet.name':  'Amuleto da Saciedade',
      'item.satiety_amulet.desc':  'Uma erva dimensional que suprime a fome e melhora a digestão.',
      'item.satiety_amulet.eff':   'Reduz consumo de Fome em 25% e frequência de cocô',
      'item.easter_deco.name':     'Decoração de Páscoa',
      'item.easter_deco.desc':     'Ovos coloridos enfeitam o cenário. Edição limitada de Páscoa!',
      'item.easter_deco.eff':      'Decora o cenário com ovos animados',
      'item.joy_mask.name':        'Máscara da Alegria',
      'item.joy_mask.desc':        'Uma máscara etérea que irradia serenidade e mantém o humor elevado.',
      'item.joy_mask.eff':         'Reduz decay de Humor em 40% por ciclo',
      'item.sleep_amulet.name':    'Amuleto do Sono Profundo',
      'item.sleep_amulet.desc':    'Um cristal que pulsa durante o sono, amplificando a recuperação de energia.',
      'item.sleep_amulet.eff':     'Energia recupera 2× mais rápido dormindo',
      'item.antidote.name':        'Antídoto Dimensional',
      'item.antidote.desc':        'Uma poção de cristal purificado que dissolve qualquer mal que aflige o avatar.',
      'item.antidote.eff':         'Cura todas as doenças activas + recupera +20 saúde',

      // UI estático
      'ui.loading':              'CARREGANDO...',
      'ui.logout':               '✕ SAIR',
      'ui.repouso_mode':         'MODO REPOUSO',
      'ui.repouso_resume':       '▶ RETOMAR',
      'ui.sleeping':             '💤 dormindo',
      'ui.no_items':             'Nenhum item no inventário',
      'ui.no_eggs':              'Nenhum ovo ainda',
      'ui.sick':                 '🤒 Doente',
      'ui.life_remaining':       '⏳ VIDA RESTANTE',
      'ui.summon_btn':           '▶ Invocar Avatar (Gratuito)',
      'ui.login_required':       'LOGIN NECESSÁRIO',
      'ui.login_required_desc':  'Entra na tua conta para invocar o teu avatar e guardar o progresso.',
      'ui.do_login':             '🔑 FAZER LOGIN',
    },

    // ── ENGLISH ───────────────────────────────────────────────────
    en: {
      // Auth — login
      'auth.fill_fields':        'Please fill in your email and password.',
      'auth.error.not_found':    'Email not found.',
      'auth.error.wrong_pass':   'Incorrect password.',
      'auth.error.invalid_email':'Invalid email address.',
      'auth.error.too_many':     'Too many attempts. Please try again later.',
      'auth.error.invalid_cred': 'Incorrect email or password.',
      'auth.error.login':        'Login error. Please try again.',
      // Auth — register
      'auth.reg.fill_all':       'Please fill in all fields.',
      'auth.reg.pass_mismatch':  'Passwords do not match.',
      'auth.reg.pass_short':     'Password must be at least 6 characters.',
      'auth.reg.email_in_use':   'This email is already in use.',
      'auth.reg.weak_pass':      'Password is too weak.',
      'auth.reg.error':          'Account creation error. Please try again.',
      // Auth — reset
      'auth.reset.fill':         'Please enter your email.',
      'auth.reset.sent':         '✓ Recovery email sent!',
      'auth.reset.not_found':    'Email not found.',
      'auth.reset.error':        'Send error. Please try again.',
      // Auth — buttons
      'auth.btn.logging_in':     'SIGNING IN...',
      'auth.btn.login':          'SIGN IN',
      'auth.btn.creating':       'CREATING...',
      'auth.btn.create':         'CREATE ACCOUNT',
      'auth.btn.sending':        'SENDING...',
      'auth.btn.send_email':     'SEND EMAIL',
      'auth.btn.sent':           'SENT ✓',

      // Logs
      'log.session_ended':       'Session ended.',
      'log.session_other':       '⚠️ Session started on another device. Disconnecting...',
      'log.welcome_back':        'Welcome back! ✨',
      'log.state_restored':      'State restored from cloud! ☁️',
      'log.woke_offline':        'Woke up fully rested while offline! ☀️',
      'log.repouso_active':      'Rest mode active. 💤',
      'log.died_offline':        '{name} did not survive your absence...',
      'log.died':                '{name} departed to another dimension... 💀',
      'log.welcome_new':         'Welcome! Begin a new adventure! ✨',
      'log.fed':                 'Fed! +{gain} hunger  (-{cost} 🪙)',
      'log.feed_no_coins':       'You need {cost} 🪙 to feed!',
      'log.renamed':             'Avatar renamed to "{name}" 💕',
      'log.repouso_on':          'Rest mode activated. Stats slow down. ⏸',
      'log.repouso_off':         'Rest mode deactivated. Welcome back! ✨',
      'log.offline_away':        'Away for {h}h {m}min — {status}.',
      'log.offline_slept':       '☀️ woke up while away',
      'log.offline_repouso':     '💤 rest mode was active',
      'log.offline_updated':     'stats updated',

      // Bubbles
      'bubble.sleeping':         'Shh... sleeping 💤',
      'bubble.repouso':          'Resting... hold 💤 to resume',
      'bubble.satisfied':        "I'm full!",
      'bubble.no_coins':         'Not enough coins... 😢',
      'bubble.dead':             '...💀',
      'bubble.no_avatar':        'No active avatar!',
      'bubble.hungry':           "I'm starving! 🍖",
      'bubble.tired':            'Too tired... 😴',
      'bubble.invalid_name':     'Invalid name! ✕',
      'bubble.back':             'Back! ✨',
      'bubble.renamed':          '{name}... I love that name! 💕',
      'bubble.session_ended':    'Session ended ⚠️',

      // Avatar speech
      'falas.happy':  ["I'm happy! ✨","I love you! 💕","What an amazing day!","Play with me!"],
      'falas.hungry': ["I'm hungry...","Feed me!","Starving here! 🍖","Need to eat!"],
      'falas.tired':  ["So tired...","Going to sleep zzz","Need to rest","Exhausted..."],
      'falas.sick':   ["I feel sick...","I need medicine","I don't feel well :("],
      'falas.pet':    ["Heee~ 💕","More! More!","*purrs*","♪ ♪ ♪","I love you!"],
      'falas.bored':  ["Bored...","Entertain me!","So bored..."],
      'falas.dirty':  ["I'm dirty... 😔","I need a bath!","Clean me please! 🧹","What a bad smell..."],

      // Phases
      'fases': ['BABY','CHILD','YOUNG','ADULT'],

      // Bond
      'vinculo.distant':    'Distant',
      'vinculo.friend':     'Friend',
      'vinculo.companion':  'Companion',
      'vinculo.soulmate':   'Soulmate',

      // Diseases
      'disease.exhaustion':   'Chronic Exhaustion',
      'disease.malnutrition': 'Malnutrition',
      'disease.infection':    'Infection',
      'disease.melancholy':   'Dimensional Melancholy',

      // Items — names
      'item.satiety_amulet.name':  'Satiety Amulet',
      'item.satiety_amulet.desc':  'A dimensional herb that suppresses hunger and improves digestion.',
      'item.satiety_amulet.eff':   'Reduces Hunger decay by 25% and poop frequency',
      'item.easter_deco.name':     'Easter Decoration',
      'item.easter_deco.desc':     'Colorful eggs decorate the scene. Limited Easter edition!',
      'item.easter_deco.eff':      'Decorates scene with animated eggs',
      'item.joy_mask.name':        'Joy Mask',
      'item.joy_mask.desc':        'An ethereal mask that radiates serenity and keeps mood high.',
      'item.joy_mask.eff':         'Reduces Mood decay by 40% per cycle',
      'item.sleep_amulet.name':    'Deep Sleep Amulet',
      'item.sleep_amulet.desc':    'A crystal that pulses during sleep, amplifying energy recovery.',
      'item.sleep_amulet.eff':     'Energy recovers 2× faster while sleeping',
      'item.antidote.name':        'Dimensional Antidote',
      'item.antidote.desc':        'A purified crystal potion that dissolves any ailment affecting the avatar.',
      'item.antidote.eff':         'Cures all active diseases + restores +20 health',

      // Static UI
      'ui.loading':              'LOADING...',
      'ui.logout':               '✕ LOGOUT',
      'ui.repouso_mode':         'REST MODE',
      'ui.repouso_resume':       '▶ RESUME',
      'ui.sleeping':             '💤 sleeping',
      'ui.no_items':             'No items in inventory',
      'ui.no_eggs':              'No eggs yet',
      'ui.sick':                 '🤒 Sick',
      'ui.life_remaining':       '⏳ LIFE REMAINING',
      'ui.summon_btn':           '▶ Summon Avatar (Free)',
      'ui.login_required':       'LOGIN REQUIRED',
      'ui.login_required_desc':  'Sign in to summon your avatar and save your progress.',
      'ui.do_login':             '🔑 SIGN IN',
    },
  };

  const _lang = localStorage.getItem('fv_lang') || 'pt';
  window.LANG_STRINGS = STRINGS[_lang] || STRINGS.pt;
  window._currentLang = _lang;
})();

// ── t(key, vars) — retorna string traduzida ──────────────────────
function t(key, vars) {
  const s = window.LANG_STRINGS || {};
  let val = s[key];
  if(val === undefined) {
    if(typeof console !== 'undefined') console.warn('[i18n] chave ausente:', key);
    return key;
  }
  if(Array.isArray(val)) return val;
  if(vars) {
    Object.entries(vars).forEach(([k, v]) => {
      val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
    });
  }
  return val;
}

// ── Troca idioma e recarrega ─────────────────────────────────────
function setLang(lang) {
  localStorage.setItem('fv_lang', lang);
  location.reload();
}

// ── Aplica data-i18n no DOM ──────────────────────────────────────
function applyI18nDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if(val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if(val !== key) el.placeholder = val;
  });
}
