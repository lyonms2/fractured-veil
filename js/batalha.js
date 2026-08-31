// ═══════════════════════════════════════════════════════════════════
//  batalha.js — A PORTA DO COMBATE
//
//  Depende de: ModalManager (modal.js), renderEquipaBar (combate-ui.js),
//              abrirCombatePvE (combate-pve.js), equipaIdx (equipa.js)
//
//  ── PORQUE É QUE ISTO EXISTE ──
//
//  Lutar estava enterrado dois níveis abaixo: abria-se o 🧬 MEUS
//  AVATARES, rolava-se por cima da lista de bichos à venda, e lá em
//  baixo estava a barra da equipa com o botão de batalhar. Um ícone com
//  três trabalhos — quem tenho, quem luta, e lutar.
//
//  Agora a colónia mostra quem se tem, na tela principal, e este modal
//  fica com os outros dois: montar a equipa, escolher a ordem, e entrar
//  no combate. É o mesmo #equipaBar de sempre; só mudou de casa.
// ═══════════════════════════════════════════════════════════════════

function abrirBatalha() {
  ModalManager.open('batalhaModal');
  // A barra desenha-se sempre ao abrir: a equipa muda por fora daqui
  // (um avatar pode ter morrido, ou sido vendido) e uma barra guardada
  // do último acesso mostrava gente que já lá não está.
  if (typeof renderEquipaBar === 'function') renderEquipaBar();
  _btSincronizarModos();
}

function fecharBatalha() { ModalManager.close('batalhaModal'); }

/* O modo PvE só acende com a equipa completa.

   O botão de batalhar dentro da barra da equipa já diz porque é que não
   dá — falta gente, ou há gente cansada de mais. Este cartão não repete
   a explicação: apaga-se, e quem quiser saber porquê lê a barra que
   está mesmo por cima. Dois avisos para a mesma coisa é ruído. */
function _btSincronizarModos() {
  const pve = document.getElementById('btModoPvE');
  if (!pve) return;
  const n = (typeof equipaIdx === 'function') ? equipaIdx().length : 0;
  const max = (typeof COMBATE_EQUIPA_MAX === 'number') ? COMBATE_EQUIPA_MAX : 3;
  // Impedidos contam como não-pronta: sem isto o cartão convidava a lutar
  // ao lado de um aviso a dizer que não dava, e o clique morria lá
  // dentro sem explicação. Doente conta tanto como cansado.
  const impedidos = (typeof _pveImpedidos === 'function') ? _pveImpedidos() : [];
  const pronta = n >= max && impedidos.length === 0;
  pve.classList.toggle('bt-modo-off', !pronta);
  pve.disabled = !pronta;
}

function escolherPvE() {
  if (typeof abrirCombatePvE !== 'function') return;
  fecharBatalha();
  abrirCombatePvE();
}

/* A colecção passa a abrir-se de dentro da colónia.

   O 🧬 saiu da fila de cima para dar lugar ao ⚔, mas não desapareceu: o
   que lá se faz — vender, queimar, abrir slots — continua a ser preciso,
   e o sítio natural para chegar lá é a lista das criaturas, não o topo
   do ecrã ao lado das moedas. */
function abrirColeccao() {
  if (typeof abrirMeusAvatares === 'function') abrirMeusAvatares();
}
