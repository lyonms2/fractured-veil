// ═══════════════════════════════════════════════════════════════════
// PRÓLOGO — a porta de entrada do jogo
//
// A lore vivia numa aba do seletor de jogos, ao lado do Snake e do
// Campo Minado, e recusava-se a abrir sem avatar vivo. Só que o
// Capítulo I É a história de conhecer o avatar pela primeira vez: o
// jogo exigia o vínculo para deixar ler como o vínculo nasceu.
//
// O prólogo desfaz esse nó. É a primeira coisa que um jogador novo vê,
// antes de existir avatar, e termina no instante exato em que as três
// criaturas saem da Fratura e olham para ele.
//
// E é a única porta por onde elas entram. Havia uma tela de invocar,
// com um botão que o jogador carregava quando quisesse; fazia sentido
// enquanto invocar era uma decisão repetida. São três na vida, e a
// partir daí os avatares compram-se ou nascem de uma cruza — portanto
// a chegada acontece onde a história a anuncia, e mais lado nenhum.
//
// Regras que ele segue, e que valem para toda a lore daqui para a
// frente: não custa nada e não dá nada. Sem preço, sem XP, sem moedas.
// É história e mais nada.
//
// A criatura não tem nome nem elemento aqui, e isso não é um buraco a
// preencher — é a escrita certa. O nome é o primeiro acto do jogador
// neste mundo, e ainda não aconteceu.
//
// Depende de: gs, saveToFirebase(), invocarOsTres(), _loreTypewriter()
// ═══════════════════════════════════════════════════════════════════

// As cenas em si vivem no i18n, porque o prólogo é a primeira tela que
// TODO o jogador vê — e um jogador inglês não pode receber português.
const PROLOGO_PARAGRAFOS = 7;

let _prologoModoLeitura = false;
let _prologoEtapa       = 0;
let _prologoEscrevendo  = false;
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

  _prologoEtapa = 0;
  _prologoMostrarEtapa();
}

// ═══════════════════════════════════════════════════════════════════
// UMA ETAPA DE CADA VEZ
//
// O texto corria todo numa coluna só, e em tela curta isso obrigava a
// rolar. Pior do que a barra era o descompasso: a escrita acontece no
// fim do texto enquanto o olho do leitor está no princípio, e o que
// nasce abaixo da dobra passa despercebido — o leitor não sabe que há
// mais.
//
// Cada bloco é uma batida do texto e cabe inteiro na tela. Medido a
// 360x560, que é das telas mais curtas que existem: a maior das seis
// ocupa 253px de 490 disponíveis.
//
// A aceleração mudou-se do fundo da tela para o botão. Antes um clique
// em qualquer sítio saltava a escrita, e clicar no fundo para nada é
// fácil demais — saltava-se o texto de abertura sem querer. Agora é um
// controle só, com dois estados: enquanto escreve, completa; quando
// termina, avança.
// ═══════════════════════════════════════════════════════════════════
function _prologoMostrarEtapa() {
  const corpo  = document.getElementById('prologoTexto');
  const rodape = document.getElementById('prologoRodape');
  const marcas = document.getElementById('prologoMarcas');
  if (!corpo || !rodape) return;

  corpo.innerHTML = '';
  if (marcas) {
    marcas.innerHTML = Array.from({ length: PROLOGO_PARAGRAFOS }, (_, i) =>
      `<span class="prologo-marca${i === _prologoEtapa ? ' aqui' : ''}${i < _prologoEtapa ? ' lida' : ''}"></span>`
    ).join('');
  }

  _prologoEscrevendo = true;
  _prologoDesenharBotao();

  const modal = document.getElementById('prologoModal');
  _loreTypewriter(
    corpo,
    t('prologo.p' + (_prologoEtapa + 1)),
    () => { _prologoEscrevendo = false; _prologoDesenharBotao(); },
    modal,
    true   // sem clique global: quem acelera é o botão
  );
}

function _prologoDesenharBotao() {
  const rodape = document.getElementById('prologoRodape');
  if (!rodape) return;

  const ultima = _prologoEtapa >= PROLOGO_PARAGRAFOS - 1;
  const rotulo = _prologoEscrevendo ? t('prologo.btn.saltar')
               : ultima             ? (_prologoModoLeitura ? t('prologo.btn.fechar') : t('prologo.btn.mao'))
               : t('prologo.btn.continuar');

  rodape.innerHTML = `<button class="prologo-btn" onclick="prologoAvancar()">${rotulo}</button>`;
  rodape.classList.remove('lore-tw-hidden');
  rodape.classList.add('lore-tw-reveal');
}

// O botão faz as três coisas, conforme o momento: completa a escrita,
// passa à etapa seguinte, ou fecha o prólogo.
function prologoAvancar() {
  if (_prologoEscrevendo) {
    if (_loreTwHandle && _loreTwHandle.concluir) _loreTwHandle.concluir();
    return;
  }
  if (_prologoEtapa < PROLOGO_PARAGRAFOS - 1) {
    _prologoEtapa++;
    _prologoMostrarEtapa();
    return;
  }
  if (_prologoModoLeitura) fecharPrologo();
  else                     prologoEstenderMao();
}

// Enter e espaço fazem o mesmo que o botão: ninguém devia precisar do
// rato para passar uma página de texto.
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('prologoModal');
  if (!modal || getComputedStyle(modal).display === 'none') return;
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    prologoAvancar();
  }
});

// ── Estender a mão = os três atravessam ──────────────────────────
//
// A ordem aqui é tudo. Antes o prólogo fechava primeiro e a chegada
// vinha 420ms depois: nesse intervalo aparecia a tela de "invocar
// avatar grátis", e o jogador via o jogo por um instante antes da
// cerimónia. A piscada que tirava a imersão.
//
// Agora a chegada arranca com o prólogo ainda por cima. O overlay dela
// tem z-index 100 e o prólogo 600, portanto monta-se por baixo sem se
// ver. Quando o fundo dele já está opaco — leva 30ms a arrancar e
// 600ms a fechar — é que o prólogo se desvanece. Como os dois fundos
// são pretos, a passagem não tem costura: o texto some, fica preto, e
// a Fratura já lá está a abrir.
function prologoEstenderMao() {
  _prologoMarcarVisto();

  const modal = document.getElementById('prologoModal');
  // O conteúdo sai já, para o clique ter resposta imediata.
  if (modal) modal.classList.add('prologo-saindo');

  // Não se espera por ela: são ~10s de cerimónia, e o prólogo tem de
  // sair de cena nos primeiros 1,3s. Ela termina sozinha na colónia.
  if (typeof invocarOsTres === 'function') invocarOsTres();

  setTimeout(() => { if (modal) modal.classList.add('prologo-saindo-fundo'); }, 750);
  setTimeout(() => {
    if (modal) modal.classList.remove('prologo-saindo', 'prologo-saindo-fundo');
    fecharPrologo();
  }, 1300);
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
// aparecer por baixo de uma cortina que ainda estava subindo.
// ═══════════════════════════════════════════════════════════════════
/* ── ESTÁ PARA VIR? ──

   Quem pergunta é a tela: com um slot vazio ela abre a colónia, e num
   jogador NOVO a colónia está vazia — portanto o que aparecia logo a
   seguir ao login era "Nenhuma criatura por aqui", meio segundo antes
   de o prólogo subir por cima. A primeira coisa que o jogo mostrava era
   uma casa vazia com um recado a mandar ao mercado.

   Com isto, quem sabe que o prólogo vem a caminho não desenha nada, e o
   jogador vê a história e mais nada. */
function prologoPendente() {
  if (typeof gs === 'undefined' || gs.prologoVisto) return false;
  if (typeof avatarSlots !== 'undefined' && avatarSlots.some(s => s)) return false;
  return ((typeof window !== 'undefined' && window._invocacoesUsadas) || 0) === 0;
}

function talvezAbrirPrologo() {
  if (prologoJaVisto()) {
    /* ── E SE A CHEGADA FICOU A MEIO ──

       As três acontecem uma a seguir à outra, cada uma com um pedido ao
       servidor. Se a rede cair na segunda, o jogador fica com uma — e
       com duas invocações por gastar que nenhum botão sabe gastar,
       porque a tela de invocar deixou de existir.

       Era um avatar perdido para sempre por causa de um soluço. Aqui a
       entrada seguinte completa o que faltou: quem conta é o servidor
       (`invocacoesUsadas`), portanto isto não pode dar avatares a mais
       — só recuperar os que ele já sabe que ficaram por entregar. */
    if (typeof invocacoesRestantes === 'function' && invocacoesRestantes() > 0
        && typeof invocarOsTres === 'function') {
      setTimeout(() => invocarOsTres(), 0);
    }
    return;
  }

  /* Só a quem ainda não começou. A cena é a Fratura a abrir-se pela
     primeira vez — não se mostra isso a quem já tem os três em casa.
     Esses encontram-na no arquivo.

     Quem responde é o SERVIDOR (`invocacoesUsadas`). Perguntava-se ao
     gs.totalInvocacoes, que o cliente escreve por inteiro: pô-lo a zero
     era ver o prólogo outra vez — e, agora que é ele quem entrega os
     avatares, seria também uma forma de os pedir de novo. Quem recusa
     de verdade é o handleInvocar, mas não há razão para o pôr à prova. */
  const jaInvocou = (window._invocacoesUsadas || 0) > 0
                 || (typeof avatar !== 'undefined' && !!avatar)
                 || (typeof avatarSlots !== 'undefined' && avatarSlots.some(s => s));
  if (jaInvocou) return;

  // Sem espera nenhuma: o modal sobe já, por cima do splash, e o painel
  // de invocar nunca chega a ser visto. O setTimeout(0) é só para deixar
  // o resto do login terminar antes de mexer no DOM.
  setTimeout(() => abrirPrologo(false), 0);
}
