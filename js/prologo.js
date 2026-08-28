// ═══════════════════════════════════════════════════════════════════
// PRÓLOGO — a porta de entrada do jogo
//
// A lore vivia numa aba do seletor de jogos, ao lado do Snake e do
// Campo Minado, e recusava-se a abrir sem avatar vivo. Só que o
// Capítulo I É a história de conhecer o avatar pela primeira vez: o
// jogo exigia o vínculo para deixar ler como o vínculo nasceu.
//
// O prólogo desfaz esse nó. É a primeira coisa que um jogador novo vê,
// antes de existir avatar, e termina no instante exacto em que a
// criatura sai da Fratura e olha para ele — que é o botão INVOCAR.
// A história entrega a mecânica na mão; não é preciso dica nenhuma.
//
// Regras que ele segue, e que valem para toda a lore daqui para a
// frente: não custa nada e não dá nada. Sem preço, sem XP, sem moedas.
// É história e mais nada.
//
// A criatura não tem nome nem elemento aqui, e isso não é um buraco a
// preencher — é a escrita certa. O nome é o primeiro acto do jogador
// neste mundo, e ainda não aconteceu.
//
// Depende de: gs, saveToFirebase(), triggerSummon(), _loreTypewriter()
// ═══════════════════════════════════════════════════════════════════

// As cenas em si vivem no i18n, porque o prólogo é a primeira tela que
// TODO o jogador vê — e um jogador inglês não pode receber português.
const PROLOGO_PARAGRAFOS = 6;

let _prologoModoLeitura = false;
let _prologoTravou      = false;

// ── Já viu? ──────────────────────────────────────────────────────
function prologoJaVisto() {
  return !!gs.prologoVisto;
}

function _prologoMarcarVisto() {
  if (gs.prologoVisto) return;
  gs.prologoVisto = true;
  // Grava já, sem o atraso de 5s do scheduleSave. Quem pula e fecha a
  // aba a seguir não tem save nenhum — e sem save o prólogo voltava a
  // abrir na próxima entrada, que é justamente o que ele não deve fazer.
  if (typeof saveToFirebase === 'function') saveToFirebase();
  else scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
// ABRIR
//
// `releitura` distingue a entrada de verdade (uma vez na vida, termina
// no INVOCAR) da consulta ao arquivo (quantas vezes quiser, termina num
// simples fechar).
// ═══════════════════════════════════════════════════════════════════
function abrirPrologo(releitura) {
  const modal = document.getElementById('prologoModal');
  if (!modal) return;

  _prologoModoLeitura = !!releitura;
  modal.style.display = 'flex';

  // O ? do manual é fixed com z-index 999 — passava por cima do prólogo
  // e ficava a pairar no canto durante a história. Sai de cena enquanto
  // ela dura, e volta ao fechar.
  const ajuda = document.getElementById('gameHelpBtn');
  if (ajuda) ajuda.style.display = 'none';

  // O prólogo cobre tudo, mas o jogo continua montado por baixo e o
  // body continua rolável — dava barra de rolagem durante a história,
  // para conteúdo que ninguém consegue ver. Mesmo problema da tela de
  // login. O lockBodyScroll conta referências, portanto não estraga
  // nada se outro overlay já tiver travado.
  if (typeof lockBodyScroll === 'function' && !_prologoTravou) {
    _prologoTravou = true;
    lockBodyScroll();
  }

  const corpo = document.getElementById('prologoTexto');
  const rodape = document.getElementById('prologoRodape');
  if (!corpo || !rodape) return;

  corpo.innerHTML = '';
  rodape.innerHTML = '';
  rodape.classList.add('lore-tw-hidden');
  rodape.classList.remove('lore-tw-reveal');

  const texto = [];
  for (let i = 1; i <= PROLOGO_PARAGRAFOS; i++) texto.push(t('prologo.p' + i));

  _loreTypewriter(corpo, texto.join('\n\n'), () => _prologoMostrarFim(), modal);
}

// ── O fim: o botão que continua a história noutro lugar ──────────
function _prologoMostrarFim() {
  const rodape = document.getElementById('prologoRodape');
  if (!rodape) return;

  rodape.innerHTML = _prologoModoLeitura
    ? `<button class="prologo-btn" onclick="fecharPrologo()">${t('prologo.btn.fechar')}</button>`
    : `<button class="prologo-btn" onclick="prologoEstenderMao()">${t('prologo.btn.mao')}</button>`;

  rodape.classList.remove('lore-tw-hidden');
  rodape.classList.add('lore-tw-reveal');
}

// ── Estender a mão = invocar ─────────────────────────────────────
function prologoEstenderMao() {
  _prologoMarcarVisto();
  fecharPrologo();
  // Um respiro entre fechar o prólogo e a invocação, para o gesto ser
  // lido como consequência da história e não como outra tela a saltar.
  setTimeout(() => { if (typeof triggerSummon === 'function') triggerSummon(); }, 420);
}

function fecharPrologo() {
  if (typeof _loreCancelTypewriter === 'function') _loreCancelTypewriter();
  const ajuda = document.getElementById('gameHelpBtn');
  if (ajuda) ajuda.style.display = '';
  if (_prologoTravou && typeof unlockBodyScroll === 'function') {
    _prologoTravou = false;
    unlockBodyScroll();
  }
  const modal = document.getElementById('prologoModal');
  if (modal) modal.style.display = 'none';
  if (!_prologoModoLeitura) _prologoMarcarVisto();
  _prologoModoLeitura = false;
}

// ═══════════════════════════════════════════════════════════════════
// O GANCHO
//
// Chamado pelo _onLoginSuccess quando não há save nenhum. O atraso
// espera o splash sair — abrir por cima dele mostrava o prólogo a
// aparecer por baixo de uma cortina que ainda estava a subir.
// ═══════════════════════════════════════════════════════════════════
function talvezAbrirPrologo() {
  if (prologoJaVisto()) return;

  // Só a quem ainda não começou. A cena é a criatura a sair da Fratura
  // pela primeira vez — não se mostra isso a quem já tem três avatares
  // em casa. Esses encontram-na no arquivo.
  const jaInvocou = (gs.totalInvocacoes || 0) > 0
                 || (typeof avatar !== 'undefined' && !!avatar)
                 || (typeof avatarSlots !== 'undefined' && avatarSlots.some(s => s));
  if (jaInvocou) return;

  // Sem espera nenhuma: o modal sobe já, por cima do splash, e o painel
  // de invocar nunca chega a ser visto. O setTimeout(0) é só para deixar
  // o resto do login terminar antes de mexer no DOM.
  setTimeout(() => abrirPrologo(false), 0);
}
