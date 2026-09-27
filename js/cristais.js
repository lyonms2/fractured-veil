// ═══════════════════════════════════════════════════════════════════
// CRISTAIS — Compra, resgate e transparência
// garantirCarteira() e vincularCarteira() vivem no fim deste arquivo.
// Depende de: playerData (global), walletAddress (global),
//             updateCristaisDisplay() (marketplace.html inline),
//             showToast() (marketplace.html inline),
//             ethers (CDN carregado antes deste arquivo)
// ═══════════════════════════════════════════════════════════════════

/* O cofre. Trocado em 27/09/2026: o anterior
   (0xCcA07f21a40129955db81Dc0073693a26e777d8E) tinha o teto diário
   cravado em 5 POL por carteira, sem função para mudar, enquanto o jogo
   já permitia 1000 💎 por dia — vinte vezes mais. A tela prometia o
   número do jogo e a transação morria no número do contrato.

   O novo tem o teto ajustável pelo dono (nasce em 100 POL) e uma saída
   anunciada com 48 h de espera. Quem tiver uma autorização assinada
   pelo cofre antigo continua a poder gastá-la lá: ele ficou de pé, com
   saldo. Mesma interface, por isso a troca custa esta linha — e a
   variável CONTRACT_ADDRESS na Vercel, que as funções de api/ leem. */
const CONTRACT_ADDRESS = '0xc1946B537aC2e184ee6fAE51E7B1Ff8ca56CddEd';

// ═══════════════════════════════════════════════════════════════════
// O ETHERS CHEGA SÓ QUANDO É PRECISO
//
// O marketplace.html avulso carregava-o num <script> no topo. Quando o
// marketplace passou a viver dentro do index.html, o script ficou para
// trás — e o index.html nunca o carregou. Resultado: comprar cristais e
// resgatar rebentavam com "ethers is not defined", apanhado pelo
// try/catch de cada função e mostrado ao jogador como um erro genérico.
// O caminho do dinheiro real estava morto e a dizer só "erro".
//
// Carrega-se aqui, sob procura, para não pesar o arranque de quem nunca
// abre estas seções. A promessa é guardada: várias chamadas ao mesmo
// tempo esperam pelo mesmo carregamento.
const ETHERS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.9.0/ethers.umd.min.js';
let _ethersPromise = null;

function carregarEthers() {
  if(typeof ethers !== 'undefined') return Promise.resolve(true);
  if(_ethersPromise) return _ethersPromise;
  _ethersPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = ETHERS_CDN;
    el.async = true;
    el.onload  = () => resolve(true);
    el.onerror = () => { _ethersPromise = null; reject(new Error('ethers_indisponivel')); };
    document.head.appendChild(el);
  });
  return _ethersPromise;
}
const MATIC_TO_GEMS    = 10; // 1 POL = 10 💎

/* A COMPRA É POR QUANTIDADE
   ═══════════════════════════════════════════════════════════════════
   Eram três pacotes fixos (15, 50 e 100 💎), com 10% de bônus em cada.
   O bônus saiu (ver api/processar-compra.js), e sem ele os pacotes eram
   só três tamanhos da mesma compra. Agora o jogador digita quantos
   cristais quer: 10 💎 = 1 POL, sem arredondamento.

   Os limites de fora deste arquivo, que estes têm de respeitar:
     o contrato recusa qualquer valor que não seja múltiplo de 0,1 POL,
     ou seja, compra em cristais inteiros (erro ValorNaoMultiplo);
     máximo 5000 💎 é o MAX_GEMS_CREDITO do api/processar-compra.js,
     que recusa creditar mais do que isso numa transação. */
/* ── A ESCALA (23/09/2026, mínimo revisto em 27/09) ──

   1 💎 = 0,1 POL ≈ um centavo de dólar. A cotação (10 💎 por POL) NÃO
   se mexe: ela é o lastro, e mudá-la faria a pool dever de um dia para
   o outro dez vezes o POL que tem. O que se ajusta são os PREÇOS.

   O mínimo já foi 1 💎, e a transação custava mais do que o que se
   comprava. Subiu para 50, e aí passou a contradizer o texto ao lado do
   campo, que anunciava a cotação com "10 💎 = 1 POL" — um número que o
   campo recusava. Ficou em 10: é 1 POL redondo, dá para experimentar o
   caminho do dinheiro sem gastar cinco, e o gás na Polygon é barato o
   bastante para a compra continuar a valer a pena. */
const COMPRA_MIN_GEMS = 10;
const COMPRA_MAX_GEMS = 5000;

// ═══════════════════════════════════════════
// TRANSPARÊNCIA
// ═══════════════════════════════════════════
async function renderTransparencia() {
  const linkEl = document.getElementById('transpContractLink');
  if(linkEl) {
    linkEl.href = `https://polygonscan.com/address/${CONTRACT_ADDRESS}`;
    linkEl.textContent = `${CONTRACT_ADDRESS.slice(0,6)}...${CONTRACT_ADDRESS.slice(-4)} ${t('mkt.transp.polygonscan')}`;
  }

  // O mesmo teto, na página que existe para os números serem conferíveis.
  const limEl = document.getElementById('transpRedeemLimit');
  if (limEl) limEl.textContent = t('mkt.transp.redeem_limit_val', {
    max: RESGATE_MAX_DIA, matic: Math.round(RESGATE_MAX_DIA / 10) });

  /* O SELO, com os números vindos do js/temporada.js — os mesmos que o
     servidor usa para cobrar e para pagar. Escritos aqui, e não no
     HTML, para não repetirem o destino do "2 💎" da listagem. */
  const seloCusto = document.getElementById('transpSeloCusto');
  const seloQuem  = document.getElementById('transpSeloPremiados');
  const seloBody  = document.getElementById('transpSeloBody');
  if (seloCusto && typeof SELO_CUSTO === 'number')
    seloCusto.textContent = SELO_CUSTO + ' 💎';
  if (seloQuem && typeof SELO_PREMIADOS === 'number')
    seloQuem.textContent = t('mkt.transp.selo_premiados_val', { pct: Math.round(SELO_PREMIADOS * 100) });
  if (seloBody)
    seloBody.innerHTML = t('mkt.transp.selo_body', {
      custo: (typeof SELO_CUSTO === 'number') ? SELO_CUSTO : 100,
      pct: (typeof SELO_PREMIADOS === 'number') ? Math.round(SELO_PREMIADOS * 100) : 35,
      min: (typeof SELO_MIN_LUTAS === 'number') ? SELO_MIN_LUTAS : 10,
    });

  const statusEl = document.getElementById('transpTimelockStatus');
  if(statusEl) {
    statusEl.className = 'transp-timelock-status transp-timelock-ok';
    statusEl.innerHTML = t('mkt.transp.vault_active');
  }

  const barEl = document.getElementById('transpLimitBar');
  const txtEl = document.getElementById('transpLimitTxt');
  if(!barEl || !txtEl) return;

  // Só mostra limite se tiver carteira Ethereum vinculada
  const carteira = playerData?.carteira;
  if(!carteira) {
    barEl.style.width = '0%';
    txtEl.textContent = t('mkt.metamask.limit_missing');
    return;
  }

  try {
    await carregarEthers();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const abi = ['function limiteHoje(address) view returns (uint256, uint256)'];
    const contrato = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const [sacadoWei, restanteWei] = await contrato.limiteHoje(carteira);
    const sacado  = parseFloat(ethers.formatEther(sacadoWei));
    const MAX_UINT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const semLimite = restanteWei === MAX_UINT;
    if(semLimite) {
      barEl.style.width = '0%';
      barEl.style.background = 'var(--accent)';
      txtEl.textContent = t('mkt.limit.no_limit', {used: sacado.toFixed(2)});
    } else {
      const restante  = parseFloat(ethers.formatEther(restanteWei));
      /* O teto do dia é o que já saiu mais o que ainda cabe — lido do
         próprio contrato. Esteve cravado em 5 POL, que era o que o
         cofre antigo dava; o de hoje dá 100 e o dono pode mudar sem
         trocar de contrato. Uma barra com o número à mão mentiria no
         dia seguinte à mudança. */
      const tetoDia   = Math.max(sacado + restante, 0.0001);
      const pct       = Math.min((sacado / tetoDia) * 100, 100);
      barEl.style.width = pct + '%';
      txtEl.textContent = t('mkt.limit.with_limit', {used: sacado.toFixed(2),
                                            remaining: restante.toFixed(2),
                                            teto: tetoDia.toFixed(0)});
    }
  } catch(e) {
    barEl.style.width = '0%';
    txtEl.textContent = t('mkt.metamask.limit_err');
  }
}

// ═══════════════════════════════════════════
// RENDER DOS PACOTES
// ═══════════════════════════════════════════
function renderCrystals() {
  const container = document.getElementById('crystalPackages');
  if(!container) return;
  container.innerHTML = `
    <div class="tx-input-row">
      <input class="tx-hash-input" id="compraGems" type="number" inputmode="numeric"
        min="${COMPRA_MIN_GEMS}" max="${COMPRA_MAX_GEMS}" step="1"
        placeholder="${t('mkt.crystals.buy_ph', {min: COMPRA_MIN_GEMS, max: COMPRA_MAX_GEMS})}"
        oninput="_atualizarTotalCompra()"/>
      <button class="btn-verify" id="btnComprarCristais" onclick="comprarCristais()">${t('mkt.crystals.buy_btn')}</button>
    </div>
    <div class="compra-total" id="compraTotal"></div>`;
  if (typeof equiparSetas === 'function') equiparSetas(document.getElementById('compraGems'));
  _atualizarTotalCompra();
}

/* ══════════════════════════════════════════════════════════════════
   QUANTO A REDE DE CONVITES TIRA DESTE SAQUE

   Quem foi convidado paga a rede de quem o convidou: 5% ao primeiro, 2%
   ao segundo e 1% ao terceiro, e isso sai do valor sacado — não é criado
   do nada (api/resgatar.js). Sacar 100 💎 com a cadeia cheia manda 92
   💎 para o contrato, e 101 💎 saem do saldo com a taxa do dev.

   A página de Convites explicava isto do lado de quem GANHA. Do lado de
   quem paga, esta tela só falava do 1% do dev — e o jogador descobria o
   resto olhando o POL que chegou. Agora está dito antes do clique.

   A conta é a mesma do servidor, incluindo o `floor` por nível: um saque
   pequeno pode dar zero a um dos níveis, e prometer um décimo que não vai
   ser cobrado era voltar ao mesmo problema pelo outro lado. */
let _refDoSaque = 0;

function _pctDaRede(chain) {
  if (!chain) return 0;
  let pct = 0;
  for (const nivel of ['l1', 'l2', 'l3']) if (chain[nivel]) pct += REFERRAL_PCT[nivel];
  return pct;
}

// O que a rede leva de um saque de `gems`, contado como o servidor conta.
function _gemsDaRede(gems, chain) {
  if (!gems || !_refDoSaque) return 0;
  let total = 0;
  for (const nivel of ['l1', 'l2', 'l3']) {
    if (!_refChainCache || !_refChainCache[nivel]) continue;
    const parte = Math.floor(gems * (REFERRAL_PCT[nivel] / 100));
    if (parte >= 1) total += parte;
  }
  return total;
}

let _refChainCache = null;

function _mostrarDescontoDaRede() {
  const el = document.getElementById('resgateRede');
  if (!el) return;
  if (!_refDoSaque) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = t('mkt.crystals.rede_nota', { pct: _refDoSaque });
}

/* O que se recebe de verdade, enquanto se escreve. A tela da compra já
   fazia isto ("50 💎 = 5 POL"); a do resgate, que tem duas deduções
   pelo caminho, não dizia nada. */
function _atualizarTotalResgate() {
  const alvo = document.getElementById('resgateTotal');
  const input = document.getElementById('resgateGems');
  if (!alvo || !input) return;
  const gems = Number(input.value);
  if (!Number.isFinite(gems) || gems <= 0) { alvo.textContent = ''; return; }
  const daRede = _gemsDaRede(gems, _refChainCache);
  const taxa   = taxaDoResgate(gems);
  const custo  = Math.round((gems + taxa) * 100) / 100;
  alvo.textContent = daRede > 0
    ? t('mkt.crystals.resgate_conta_rede', { matic: _maticDeGems(gems - daRede), rede: daRede, custo })
    : t('mkt.crystals.resgate_conta',      { matic: _maticDeGems(gems),          custo });
}

// A quantidade digitada, ou null se não for um inteiro dentro dos limites.
function _gemsDaCompra() {
  const v = Number(document.getElementById('compraGems')?.value);
  return (Number.isInteger(v) && v >= COMPRA_MIN_GEMS && v <= COMPRA_MAX_GEMS) ? v : null;
}

// 10 💎 = 1 POL. Um inteiro dividido por 10 tem no máximo uma casa.
function _maticDeGems(gems) {
  return String(+(gems / MATIC_TO_GEMS).toFixed(1));
}

function _atualizarTotalCompra() {
  const el = document.getElementById('compraTotal');
  if(!el) return;
  const gems = _gemsDaCompra();
  el.textContent = gems
    ? t('mkt.crystals.buy_total', {gems, matic: _maticDeGems(gems)})
    : t('mkt.crystals.buy_total_vazio', {min: COMPRA_MIN_GEMS, max: COMPRA_MAX_GEMS});
}

// ═══════════════════════════════════════════
// COMPRA DE CRISTAIS
/* QUANTO AINDA DÁ PARA RESGATAR HOJE
   ═══════════════════════════════════════════════════════════════════
   O teto diário é de 50 💎 e vive no api/resgatar.js. A tela não o
   dizia em lado nenhum: escrevia-se um número, clicava-se, e só então
   vinha "Limite diário atingido. Podes resgatar mais X hoje". O número
   que interessava só aparecia depois de falhar.

   Existe uma barra de limite, mas na página da Transparência — noutra
   secção, e em POL em vez de 💎. Aqui, onde se resgata, não havia nada.

   O resgateLog está no documento do jogador. O cliente não o escreve
   (as regras não deixam, é o que impede zerar o próprio limite) mas
   pode lê-lo, e é o que se faz aqui: uma leitura ao abrir a secção.
   Falhando, mostra-se o teto sem o gasto — melhor um número parcial do
   que nenhum. */
/* O TETO DIÁRIO. Quem manda é o MAX_GEMS_POR_DIA do api/resgatar.js;
   aqui fica para a tela dizer quanto resta e não deixar pedir o que vai
   ser recusado.

   Esteve em 50 enquanto o servidor já permitia 1000 — o reajuste da
   escala dos cristais (23/09/2026) subiu o teto no servidor e esqueceu
   esta linha. E o estrago não era só de texto: a barra dizia "0 de 50"
   depois de 50 💎, o campo travava e o botão desligava. O jogador ficava
   impedido de sacar 950 💎 a que tinha direito — e um prêmio de
   temporada passa dos 50 com facilidade. Se mudar lá, muda aqui. */
const RESGATE_MAX_DIA = 1000;

async function renderLimiteResgate() {
  const el = document.getElementById('resgateLimite');
  if (!el) return;

  const input = document.getElementById('resgateGems');
  if (typeof equiparSetas === 'function') equiparSetas(input);

  /* O texto por cima do campo leva o teto, e o teto tem uma fonte só.
     Estava escrito à mão nas duas línguas ("Limite: 5 POL/dia") e
     ficou mentindo quando o teto subiu. */
  const sub = document.getElementById('resgateSub');
  if (sub) sub.textContent = t('mkt.crystals.redeem_sub', {
    max: RESGATE_MAX_DIA, matic: Math.round(RESGATE_MAX_DIA / 10) });

  let usadoHoje = 0;
  try {
    const snap = await db.collection('players').doc(walletAddress).get();
    const log  = snap.data()?.resgateLog;
    const hoje = new Date().toISOString().slice(0, 10);
    if (log && log.data === hoje) usadoHoje = log.total || 0;
    /* A CADEIA DE QUEM ME CONVIDOU, que sai do MEU saque. Lida aqui
       porque este é o mesmo documento que já se foi buscar. */
    _refChainCache = snap.data()?.referralChain || null;
    _refDoSaque = _pctDaRede(_refChainCache);
  } catch (e) { /* fica em zero: mostra o teto cheio */ }
  _mostrarDescontoDaRede();
  _atualizarTotalResgate();

  const doJogo = Math.max(0, RESGATE_MAX_DIA - usadoHoje);

  /* ── O TETO DE VERDADE É O MENOR DOS DOIS ──

     Há dois freios no caminho do POL, e só um deles vivia nesta tela:
     o do JOGO (api/resgatar.js) e o do COFRE, que é o contrato na
     Polygon e tem o teto diário dele por carteira. Quem paga é o cofre,
     portanto quem manda é o menor dos dois.

     Em 26/09/2026 isto prometia vinte vezes o que o cofre liberava: o
     jogo dizia 1000 💎 e o contrato dava 5 POL — 50 💎. O cofre foi
     trocado no dia seguinte e os dois tetos passaram a coincidir em
     1000 💎, mas o número do cofre continua a NÃO se escrever aqui à
     mão: lê-se dele. É por isso que esta tela sobreviveu à troca sem
     uma linha mudada, e sobrevive à próxima — o dono pode mexer no teto
     do contrato quando quiser, sem publicar nada.

     Sem carteira vinculada, sem MetaMask ou sem resposta, vale o teto do
     jogo — é o que se sabe, e é o que se diz. */
  const doCofre = await _tetoDoCofre();
  const resta = (doCofre != null) ? Math.min(doJogo, doCofre) : doJogo;
  const mandaOCofre = (doCofre != null) && doCofre < doJogo;

  el.textContent = t('mkt.crystals.limit_left', { resta, max: mandaOCofre ? doCofre : RESGATE_MAX_DIA });
  el.classList.toggle('esgotado', resta === 0);

  // Dizer de onde vem o freio, quando não é o do jogo: senão o jogador
  // vê um teto menor do que o anúncio lá de cima e não entende porquê.
  const nota = document.getElementById('resgateCofre');
  if (nota) {
    nota.hidden = !mandaOCofre;
    nota.textContent = mandaOCofre ? t('mkt.crystals.teto_cofre', { n: doCofre }) : '';
  }

  // O campo deixa de aceitar o que vai ser recusado.
  if (input) {
    input.max = String(resta);
    if (resta === 0) input.disabled = true;
    else input.disabled = false;
  }
  const btn = document.getElementById('btnResgatar');
  if (btn) btn.disabled = resta === 0;
}

/* Quantos 💎 o cofre ainda deixa esta carteira sacar hoje.

   Devolve null quando não dá para saber (sem carteira vinculada, sem
   MetaMask, sem rede) ou quando o contrato não põe limite nenhum a ela
   — nos dois casos quem manda passa a ser o teto do jogo. */
async function _tetoDoCofre() {
  const carteira = playerData?.carteira;
  if (!carteira || typeof window === 'undefined' || !window.ethereum) return null;
  try {
    await carregarEthers();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contrato = new ethers.Contract(CONTRACT_ADDRESS,
      ['function limiteHoje(address) view returns (uint256, uint256)'], provider);
    const [, restanteWei] = await contrato.limiteHoje(carteira);
    const MAX_UINT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    if (restanteWei === MAX_UINT) return null;   // esta carteira não tem teto no cofre
    return Math.floor(parseFloat(ethers.formatEther(restanteWei)) * MATIC_TO_GEMS);
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════
/* ── O CRÉDITO DE UMA COMPRA ──

   O POL vai para o cofre numa transação, e os cristais chegam num segundo
   passo, pedido ao servidor. Se esse segundo passo falhar — a rede caiu,
   o RPC não respondeu, a transação ainda não estava confirmada — o POL
   já está no cofre e os cristais não.

   Por isso o hash é guardado ANTES de pedir o crédito, e só sai da lista
   quando o servidor responde de vez (creditou, já tinha creditado, ou a
   compra é inválida). O que ficar é tentado de novo ao abrir a seção dos
   cristais (tentarComprasPendentes, chamado pelo renderMetaMaskCta).

   E há o reprocessarCompra(hash), para chamar à mão uma compra que ficou
   para trás antes de esta lista existir. */
const COMPRAS_PENDENTES_KEY = 'fv_compras_pendentes';

function _comprasPendentes() {
  try { return JSON.parse(localStorage.getItem(COMPRAS_PENDENTES_KEY) || '[]'); }
  catch(e) { return []; }
}

function _marcarCompraPendente(hash, pendente) {
  try {
    const lista = _comprasPendentes().filter(h => h !== hash);
    if(pendente) lista.push(hash);
    localStorage.setItem(COMPRAS_PENDENTES_KEY, JSON.stringify(lista.slice(-20)));
  } catch(e) {}
}

async function _pedirCredito(txHash) {
  const idToken = await firebase.auth().currentUser.getIdToken();
  const apiRes  = await fetch('/api/processar-compra', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ idToken, txHash }),
  });
  const apiData = await apiRes.json();
  if(!apiData.tentarDeNovo) _marcarCompraPendente(txHash, false);
  return apiData;
}

function _creditarNaTela(apiData) {
  playerData.cristais = (playerData.cristais || 0) + apiData.gems;
  if(!playerData.gs) playerData.gs = {};
  playerData.gs.cristais = playerData.cristais;
  // Sincroniza com o estado vivo do jogo (index.html mesclado) — sem
  // isto o próximo scheduleSave() reverteria o crédito já persistido
  // no servidor com o saldo antigo em memória.
  if(typeof gs !== 'undefined') {
    gs.cristais = playerData.cristais;
    if(typeof updateResourceUI === 'function') updateResourceUI();
  }
  updateCristaisDisplay();
}

async function reprocessarCompra(txHash) {
  const apiData = await _pedirCredito(txHash);
  if(apiData.ok) {
    _creditarNaTela(apiData);
    showToast(t('mkt.tx.gems_added', {gems: fmtC(apiData.gems)}), 'ok');
  } else {
    showToast(t('mkt.tx.not_credited', {err: apiData.erro}), 'err');
  }
  return apiData;
}

let _pendentesTentadas = false;
async function tentarComprasPendentes() {
  if(_pendentesTentadas || !firebase.auth().currentUser) return;
  _pendentesTentadas = true;
  for(const hash of _comprasPendentes()) {
    try {
      const apiData = await _pedirCredito(hash);
      if(apiData.ok) {
        _creditarNaTela(apiData);
        showToast(t('mkt.tx.gems_added', {gems: fmtC(apiData.gems)}), 'ok');
      }
    } catch(e) { /* a rede: fica para a próxima */ }
  }
}

window.reprocessarCompra      = reprocessarCompra;
window.tentarComprasPendentes = tentarComprasPendentes;

/* O QUE FALTA NA CARTEIRA PARA ESTA TRANSAÇÃO SAIR

   Quem paga o gás é o jogador, sempre — mesmo no resgate, em que o POL
   vem do cofre. Uma carteira vazia não avisa: a MetaMask manda estimar
   o gás, a estimativa falha, e o ethers 6 embrulha isso num
   CALL_EXCEPTION com reason=null que não diz "insufficient funds" em
   lado nenhum. O erro chegava à tela como um "Erro ao enviar" genérico,
   depois de a carteira já ter aberto.

   Perguntar o saldo antes custa uma chamada e diz a verdade na hora.
   `valorWei` é o que a transação leva consigo (zero no resgate); o gás
   vem do preço do momento, com folga, e cai para 0,05 POL se a rede não
   responder — é melhor errar para o lado de deixar tentar.

   Devolve null quando dá, ou quanto seria preciso ter, em POL. */
async function _faltaParaPagar(provider, conta, valorWei) {
  let custoGas;
  try {
    const fee = await provider.getFeeData();
    const preco = fee.maxFeePerGas ?? fee.gasPrice;
    custoGas = preco ? preco * 60000n : ethers.parseEther('0.05');
  } catch (e) {
    custoGas = ethers.parseEther('0.05');
  }
  let saldo;
  try { saldo = await provider.getBalance(conta); }
  catch (e) { return null; }          // sem resposta, deixa tentar
  const precisa = valorWei + custoGas;
  if (saldo >= precisa) return null;
  return {
    tem:     (+ethers.formatEther(saldo)).toFixed(3),
    precisa: (+ethers.formatEther(precisa)).toFixed(3),
  };
}

async function comprarCristais() {
  const status = document.getElementById('buyStatus');
  const gems   = _gemsDaCompra();
  if(!gems) {
    status.innerHTML = `<span class="tx-err">${t('mkt.crystals.buy_invalid', {min: COMPRA_MIN_GEMS, max: COMPRA_MAX_GEMS})}</span>`;
    return;
  }
  const matic  = _maticDeGems(gems);

  // Garante que MetaMask está vinculada
  const carteiraEth = await garantirCarteira();
  if(!carteiraEth) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.link_mm')}</span>`;
    return;
  }

  const allBtns = document.querySelectorAll('#btnComprarCristais');
  allBtns.forEach(b => { b.disabled = true; b.style.opacity = '.5'; });

  try {
    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.open_mm')}</span>`;

    await carregarEthers();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();

    /* A compra é creditada à conta cuja carteira VINCULADA é quem pagou.
       Com outra conta aberta na MetaMask, o POL ia para o cofre e o
       crédito era recusado depois. Por isso a compra para aqui, antes de pagar. */
    const pagador    = (await signer.getAddress()).toLowerCase();
    const vinculada  = String(carteiraEth).toLowerCase();
    if(pagador !== vinculada) {
      const curto = a => a.slice(0, 6) + '…' + a.slice(-4);
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.carteira_diferente', {atual: curto(pagador), vinculada: curto(vinculada)})}</span>`;
      return;
    }

    /* Um vínculo feito antes da assinatura não recebe mais crédito (ver
       api/processar-compra.js). Conferir ANTES de pagar: depois, o POL já
       estaria no cofre e os cristais presos até vincular de novo. */
    const st = await _statusCarteira();
    if(st && st.ok && !st.assinada) {
      status.innerHTML = `<span class="tx-err">${t('mkt.metamask.revincular')}</span>`;
      if(typeof renderMetaMaskCta === 'function') renderMetaMaskCta();
      return;
    }

    // 1 💎 = 0,1 POL = 10^17 wei. Em unidades inteiras, sem ponto
    // flutuante no meio do caminho.
    const maticWei = ethers.parseUnits(String(gems), 17);

    const falta = await _faltaParaPagar(provider, pagador, maticWei);
    if (falta) {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.insufficient_matic', {matic: `<b>${falta.precisa} POL</b>`})}<br><small>${t('mkt.tx.tem_agora', {tem: falta.tem})} · ${t('mkt.tx.exchange_hint')}</small></span>`;
      showToast(t('mkt.tx.insufficient_toast', {matic: falta.precisa}), 'err');
      return;
    }

    const tx = await signer.sendTransaction({
      to:    CONTRACT_ADDRESS,
      value: maticWei,
    });

    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.sent')}</span>`;
    const receipt = await tx.wait();

    if(receipt.status === 1) {
      status.innerHTML = `<span class="tx-pending">${t('mkt.tx.crediting')}</span>`;
      // O hash fica guardado até o servidor responder de vez (ver acima).
      _marcarCompraPendente(tx.hash, true);
      try {
        const apiData = await _pedirCredito(tx.hash);

        if(apiData.ok) {
          _creditarNaTela(apiData);
          status.innerHTML = `<span class="tx-ok">${t('mkt.tx.credited', {gems: fmtC(apiData.gems), balance: fmtC(playerData.cristais)})}</span>`;
          showToast(t('mkt.tx.gems_added', {gems: fmtC(apiData.gems)}), 'ok');
        } else {
          status.innerHTML = `<span class="tx-err">${t('mkt.tx.not_credited', {err: apiData.erro})}</span>`;
        }
      } catch(apiErr) {
        status.innerHTML = `<span class="tx-err">${t('mkt.tx.credit_err')}<br><small>Hash: ${tx.hash.slice(0,10)}...${tx.hash.slice(-6)}</small></span>`;
      }
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.failed')}</span>`;
    }

  } catch(e) {
    console.error('[comprarCristais]', e);
    // Sem a biblioteca não há transação nenhuma — dizer isso em vez de
    // um "erro" que não ajuda ninguém a perceber o que fazer.
    if(e.message === 'ethers_indisponivel') {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.sem_ethers')}</span>`;
    } else if(e.code === 'ACTION_REJECTED' || e?.info?.error?.code === 4001) {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.cancelled')}</span>`;
    } else if(e.code === 'INSUFFICIENT_FUNDS' || e?.message?.includes('insufficient funds')) {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.insufficient_matic', {matic: `<b>${matic} POL</b>`})}<br><small>${t('mkt.tx.exchange_hint')}</small></span>`;
      showToast(t('mkt.tx.insufficient_toast', {matic}), 'err');
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.general_err')}</span>`;
    }
  } finally {
    allBtns.forEach(b => { b.disabled = false; b.style.opacity = ''; });
  }
}

// ═══════════════════════════════════════════
// RESGATE DE CRISTAIS — 💎 → POL
// ═══════════════════════════════════════════
async function resgatar() {
  const gemsInput = document.getElementById('resgateGems');
  const status    = document.getElementById('resgateStatus');
  const btn       = document.getElementById('btnResgatar');
  const gems      = parseInt(gemsInput.value, 10);

  // Garante que MetaMask está vinculada
  const carteiraEth = await garantirCarteira();
  if(!carteiraEth) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.link_mm')}</span>`;
    return;
  }

  if(!gems || gems < 10 || gems % 10 !== 0) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.min_gems')}</span>`;
    return;
  }
  // O resgate mede-se pelo balde COM lastro, e não pelo saldo que a
  // loja mostra: os cristais de bônus gastam-se dentro do jogo e não
  // saem para POL. Com o mktCristais() aqui, quem tivesse bônus
  // escrevia um número que passava nesta verificação e só rebentava
  // do outro lado, no servidor.
  /* A taxa do dev é cobrada por cima do valor sacado (js/taxas.js, e o
     api/resgatar.js usa o MESMO arquivo): sacar 100 💎 pede 103 de saldo.

     O número esteve escrito à mão aqui e mais duas vezes — nesta tela e
     no servidor. Três cópias que tinham de concordar, e nada que as
     obrigasse: o dia em que a taxa mudasse, duas delas mentiriam. */
  const taxaDev = taxaDoResgate(gems);
  if(gems + taxaDev > mktCristaisResgataveis()) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.insufficient_taxa', {balance: fmtC(mktCristaisResgataveis()), total: fmtC(gems + taxaDev), taxa: fmtC(taxaDev)})}</span>`;
    return;
  }

  btn.disabled = true;
  status.innerHTML = `<span class="tx-pending">${t('mkt.tx.requesting')}</span>`;

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const apiRes = await fetch('/api/resgatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken, carteira: carteiraEth, gems }),
    });
    const apiData = await apiRes.json();

    if(!apiData.ok) {
      status.innerHTML = `<span class="tx-err">❌ ${apiData.erro}</span>`;
      btn.disabled = false;
      return;
    }

    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.open_mm_redeem')}</span>`;

    await carregarEthers();
    const provider  = new ethers.BrowserProvider(window.ethereum);
    const signer    = await provider.getSigner();
    const abi = ['function withdraw(uint256 gems, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external'];
    const contrato  = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    /* O POL do saque sai do cofre, mas a transação é enviada pelo
       jogador — e uma carteira sem nada não a envia. A autorização já
       foi assinada pelo servidor a esta altura; parar aqui não a gasta,
       porque o nonce só se queima on-chain. */
    const semGas = await _faltaParaPagar(provider, await signer.getAddress(), 0n);
    if (semGas) {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.sem_gas', {matic: semGas.precisa})}<br><small>${t('mkt.tx.tem_agora', {tem: semGas.tem})}</small></span>`;
      btn.disabled = false;
      return;
    }

    const tx = await contrato.withdraw(
      BigInt(apiData.gems),
      BigInt(apiData.nonce),
      apiData.v,
      apiData.r,
      apiData.s,
    );

    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.sent')}</span>`;
    const receipt = await tx.wait();

    if(receipt.status === 1) {
      // Fecha a autorização. Enquanto ela ficar aberta, um novo pedido de
      // saque devolve esta mesma em vez de criar outra — é isso que
      // impede os cristais de se perderem quando a chamada on-chain
      // falha, e é isto que a fecha quando ela passa.
      try {
        const tk = await firebase.auth().currentUser.getIdToken();
        await fetch('/api/resgatar', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ idToken: tk, action: 'confirmar-resgate', nonce: apiData.nonce }),
        });
      } catch(e) { console.warn('[resgatar] confirmação falhou:', e); }

      // Num saque retomado o débito já aconteceu na primeira tentativa —
      // descontar outra vez aqui tirava cristais que já não existiam.
      if(!apiData.retomado) playerData.cristais = +((playerData.cristais || 0) - (apiData.debitado ?? gems)).toFixed(2);
      if(typeof gs !== 'undefined') {
        gs.cristais = playerData.cristais;
        if(typeof updateResourceUI === 'function') updateResourceUI();
      }
      updateCristaisDisplay();
      // O teto do dia acabou de encolher — o número em cima do campo tem
      // de acompanhar, senão fica a prometer o que já não há até alguém
      // reabrir a secção.
      renderLimiteResgate();
      gemsInput.value = '';
      const refBonus = apiData.referralBonus || 0;
      const refNote  = refBonus > 0
        ? `<span style="font-size:0.5rem;color:var(--muted);display:block;margin-top:0.25rem;">💸 ${fmtC(refBonus)} 💎 distribuídos para sua rede de convidadores</span>`
        : '';
      status.innerHTML = `<span class="tx-ok">${t('mkt.tx.redeemed', {matic: apiData.matic})}</span>${refNote}`;
      showToast(t('mkt.tx.matic_sent', {matic: apiData.matic}), 'ok');
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.chain_fail')}</span>`;
    }

  } catch(e) {
    console.error('[resgatar]', e);
    if(e.message === 'ethers_indisponivel') {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.sem_ethers')}</span>`;
    } else if(e.code === 'ACTION_REJECTED') {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.redeem_cancelled')}</span>`;
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.redeem_err')}</span>`;
    }
  }
  btn.disabled = false;
}

// ═══════════════════════════════════════════
// REFERRAL — Aba completa de convites
// ═══════════════════════════════════════════

// Renderiza o cabeçalho (link + stats) de imediato, depois carrega a
// lista de convidados por nível via 3 queries paralelas ao Firestore.
// ═══════════════════════════════════════════════════════════════════
// PROGRAMA DE CONVITES
//
// As percentagens vivem AQUI, num lugar só. Estavam escritas à mão no
// rodapé e outra vez em cada cabeçalho de nível — e o servidor tem as
// suas em api/resgatar.js (REFERRAL_RATES, em fração). Não dá para
// partilhar a constante através da rede, mas do lado do cliente passa a
// haver uma única cópia; se mexer numa, mexa na outra.
// ═══════════════════════════════════════════════════════════════════
const REFERRAL_PCT = { l1: 5, l2: 2, l3: 1 };

/* Quantos dias sem aparecer até um convidado deixar de contar como
   ativo. Uma semana: quem joga isto abre o jogo quase todo dia — os
   bichos têm fome —, portanto sete dias de silêncio já dizem alguma
   coisa, e não castigam quem passou um fim de semana fora. */
const REF_ATIVO_DIAS = 7;

async function renderReferral() {
  const sec = document.getElementById('sec-referral');
  if(!sec || !walletAddress) return;

  const refLink = `${location.origin}/?ref=${walletAddress}`;

  sec.innerHTML = `
    <div class="section-title">${t('ref.title')}</div>
    <div class="section-sub">${t('ref.sub')}</div>

    <div class="referral-box">
      <div class="referral-title">${t('ref.link_title')}</div>
      <div class="referral-sub">${t('ref.link_sub')}</div>
      <div class="referral-link-row">
        <input class="referral-link-input" id="referralLinkInput" type="text"
          value="${refLink}" readonly onclick="this.select();"/>
        <button class="btn-referral-copy" onclick="_referralCopiarLink()">${t('ref.copy')}</button>
      </div>
      <div class="referral-stats">
        <div class="referral-stat">
          <div class="referral-stat-val" id="refStatCount">—</div>
          <div class="referral-stat-lbl">${t('ref.stat_invited')}</div>
        </div>
        <div class="referral-stat">
          <div class="referral-stat-val" id="refStatEarned">—</div>
          <div class="referral-stat-lbl">${t('ref.stat_earned')}</div>
        </div>
      </div>
    </div>

    <div id="referralLevelsList">
      <div class="loading" style="margin-top:1.25rem;">
        <div class="spinner"></div>
        <div style="font-size:0.625rem;color:var(--muted);">${t('ref.loading')}</div>
      </div>
    </div>`;

  try {
    // Os dois números do topo saíam do playerData, que o loadPlayerData()
    // monta a partir do gs — e o gs nunca teve referralCount nem
    // referralEarned. Mostravam sempre zero, enquanto a lista logo
    // abaixo listava a rede a sério: a mesma tela dizia "0 convidados" e
    // "3 jogadores" com três centímetros de distância.
    //
    // O total ganho vem do documento; o número de convidados passa a ser
    // o tamanho da própria lista L1, que é a verdade em vez de um
    // contador à parte que pode ficar para trás.
    const [l1Snap, l2Snap, l3Snap, meuDoc] = await Promise.all([
      db.collection('players').where('referralChain.l1', '==', walletAddress).get(),
      db.collection('players').where('referralChain.l2', '==', walletAddress).get(),
      db.collection('players').where('referralChain.l3', '==', walletAddress).get(),
      db.collection('players').doc(walletAddress).get(),
    ]);

    const ganho = meuDoc.exists ? (meuDoc.data().referralEarned || 0) : 0;
    const elCount  = document.getElementById('refStatCount');
    const elEarned = document.getElementById('refStatEarned');
    if(elCount)  elCount.textContent  = l1Snap.size;
    if(elEarned) elEarned.textContent = '💎 ' + fmtC(ganho);

    const el = document.getElementById('referralLevelsList');
    if(!el) return;

    el.innerHTML =
      _referralLevelHtml(l1Snap, 1, REFERRAL_PCT.l1, t('ref.l1_label')) +
      _referralLevelHtml(l2Snap, 2, REFERRAL_PCT.l2, t('ref.l2_label')) +
      _referralLevelHtml(l3Snap, 3, REFERRAL_PCT.l3, t('ref.l3_label')) +
      `<div class="referral-footer-note">
        <b>${t('ref.how_title')}</b><br>
        ${t('ref.how_l1', {pct: REFERRAL_PCT.l1})}<br>
        ${t('ref.how_l2', {pct: REFERRAL_PCT.l2})}<br>
        ${t('ref.how_l3', {pct: REFERRAL_PCT.l3})}<br>
        <span style="font-size:0.46875rem;display:block;margin-top:0.25rem;">${t('ref.how_note')}</span>
      </div>`;
  } catch(e) {
    console.warn('[renderReferral]', e);
    const el = document.getElementById('referralLevelsList');
    if(el) el.innerHTML = `<div style="color:var(--red2);font-size:0.625rem;margin-top:1rem;text-align:center;">${t('ref.error')}</div>`;
    const elCount  = document.getElementById('refStatCount');
    const elEarned = document.getElementById('refStatEarned');
    if(elCount)  elCount.textContent  = '—';
    if(elEarned) elEarned.textContent = '—';
  }
}

// Gera o HTML de uma seção de nível (L1/L2/L3) com os jogadores encontrados
function _referralLevelHtml(snap, lvl, pct, label) {
  const badgeColor = lvl === 1 ? 'var(--purple)' : lvl === 2 ? '#1e6b9e' : '#2d6b3a';
  const quantos = snap.size === 1 ? t('ref.players_one', {n: snap.size})
                                  : t('ref.players_many', {n: snap.size});
  const header = `
    <div class="referral-level-section">
      <div class="referral-level-hdr">
        <span class="referral-level-badge" style="background:${badgeColor};">L${lvl}</span>
        <span>${label}</span>
        <span class="referral-level-pct">${pct}%</span>
        ${!snap.empty ? `<span class="referral-level-count">${quantos}</span>` : ''}
      </div>`;

  if(snap.empty) {
    return header + `<div class="referral-empty">${t('ref.empty')}</div></div>`;
  }

  const cards = snap.docs.map(doc => {
    const d       = doc.data();
    const slotIdx = d.gs?.activeSlotIdx ?? d.activeSlotIdx ?? 0;
    const slot    = (d.avatarSlots || [])[slotIdx];

    /* ── QUEM ESTÁ NESTE CARTÃO É UMA PESSOA ──

       Mostrava o nome do AVATAR ativo dela, que muda quando ela troca de
       bicho — e a lista é de gente convidada, não de bichos. Desde
       26/09/2026 quem joga tem nome, e ele não se repete no jogo
       (js/nomes.js): é ele que identifica. O avatar desce para a linha
       de baixo, e o uid só aparece para quem ainda não tem nome. */
    const nomeDaPessoa = d.nomeJogador || '';
    const nomeDoBicho  = slot ? nomeCurto(slot) : t('ref.no_avatar');
    const shortUid     = doc.id.slice(0, 5) + '...' + doc.id.slice(-4);

    /* A raridade sai do NÍVEL, como em todo o resto do jogo
       (fuRaridadeDoNivel). A do slot é escrita pelo cliente e envelhece:
       um convidado que chegou a Lendário continuava "Comum" aqui. */
    const rarity  = slot
      ? ((typeof fuRaridadeDoNivel === 'function')
          ? fuRaridadeDoNivel(slot.nivel || 1) : (slot.raridade || 'Comum'))
      : '';
    const rColor  = rarity === 'Lendário' ? 'var(--gold)'
                  : rarity === 'Raro'     ? 'var(--gem2)'
                  : 'var(--muted)';

    /* ── ATIVO É QUEM JOGOU, NÃO QUEM TEM SALDO ──

       A conta era `cristais > 0`, que não é atividade nenhuma: quem joga
       todo dia e nunca comprou cristais aparecia inativo, e quem comprou
       uma vez e sumiu há meses aparecia ativo. O `lastSeen` é gravado a
       cada save, e é a medida honesta. */
    const visto  = d.lastSeen || 0;
    const active = visto > 0 && (Date.now() - visto) < REF_ATIVO_DIAS * 86400000;
    const dica   = esc(t('ref.ativo_dica', { n: REF_ATIVO_DIAS }));

    return `
      <div class="referral-player-card">
        <div class="referral-player-info">
          <div class="referral-player-name">${esc(nomeDaPessoa || t('ref.sem_nome'))}</div>
          <div class="referral-player-uid">${nomeDaPessoa ? esc(nomeDoBicho) : shortUid}</div>
        </div>
        <div style="font-size:0.53125rem;color:${rColor};text-align:right;white-space:nowrap;">
          ${esc(rarity || 'Comum')}<br>
          ${active
            ? `<span class="referral-player-active" title="${dica}">${t('ref.active')}</span>`
            : `<span class="referral-player-inactive" title="${dica}">${t('ref.inactive')}</span>`}
        </div>
      </div>`;
  }).join('');

  return header + `<div class="referral-players-list">${cards}</div></div>`;
}

function _referralCopiarLink() {
  const input = document.getElementById('referralLinkInput');
  if(!input) return;
  navigator.clipboard.writeText(input.value)
    .then(() => showToast(t('ref.copied'), 'ok'))
    .catch(() => {
      input.select();
      document.execCommand('copy');
      showToast(t('ref.copied'), 'ok');
    });
}

// ════════════════════════════════════════════════════════════════════
// A CARTEIRA
//
// Estas duas viviam no js/marketplace-auth.js, que NAO era carregado
// pelo index.html desde que o marketplace passou a ser um modal de
// dentro do jogo. Ou seja: o cristais.js chamava garantirCarteira() e
// o marketplace-core.js chamava vincularCarteira(), e as duas estavam
// por definir — comprar ou resgatar cristais rebentava com
// "garantirCarteira is not defined", no caminho onde ha dinheiro a
// serio. Confirmado no browser antes de mexer: ambas undefined.
//
// Vieram para aqui, que e o arquivo carregado e o que mais as usa. O
// resto daquele arquivo era um segundo login por e-mail e senha,
// morto desde a mesma mudanca, e foi apagado com ele: uma porta de
// entrada esquecida na arvore volta sempre a ser aberta por engano.
// ════════════════════════════════════════════════════════════════════

// ── Vincular MetaMask ao uid (para comprar/resgatar cristais) ─────
/* ── VINCULAR COM PROVA DE POSSE ──

   A `carteira` era gravada direto no documento, sem prova de que era
   desta pessoa — e é por ela que o servidor decide de quem é uma compra.
   Agora a carteira assina uma mensagem com a conta dentro, e é o servidor
   que confere e grava (vincular-carteira, em api/resgatar.js).

   A mensagem tem de ser IGUAL à do servidor (mensagemDeVinculo). */
function _mensagemDeVinculo(uid, endereco) {
  return 'Fractured Veil\n\nVincular a carteira ' + String(endereco).toLowerCase() + ' à conta ' + uid + '.';
}

async function vincularCarteira() {
  if(typeof window.ethereum === 'undefined') {
    showToast(t('mkt.metamask.not_found'), 'err'); return;
  }
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const endereco = accounts[0].toLowerCase();
    const usuario  = firebase.auth().currentUser;
    if(!usuario) { showToast(t('mkt.metamask.err'), 'err'); return null; }

    await carregarEthers();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner(endereco);
    showToast(t('mkt.metamask.assinar'), 'ok');
    const assinatura = await signer.signMessage(_mensagemDeVinculo(usuario.uid, endereco));

    const idToken = await usuario.getIdToken();
    const resp = await fetch('/api/resgatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'vincular-carteira', idToken, endereco, assinatura }),
    });
    const data = await resp.json();
    if(!data.ok) { showToast(data.erro || t('mkt.metamask.err'), 'err'); return null; }

    if(!playerData) playerData = {};
    playerData.carteira = data.carteira;
    // Com o vínculo assinado, as compras que ficaram presas podem ser
    // creditadas agora, e não só na próxima sessão.
    _pendentesTentadas = false;

    // Atualiza header de cristais (MetaMask conectada para transações)
    const dotEl = document.getElementById('walletDot');
    if(dotEl) dotEl.style.background = 'var(--green)';

    showToast(`✅ MetaMask vinculada: ${data.carteira.slice(0,6)}...${data.carteira.slice(-4)}`, 'ok');
    return data.carteira;
  } catch(e) {
    if(e.code !== 4001 && e.code !== 'ACTION_REJECTED') showToast(t('mkt.metamask.err'), 'err');
    return null;
  }
}

// ── Garante que MetaMask está vinculada antes de transações ───────
async function garantirCarteira() {
  // Se já temos o endereço em memória ou no playerData, usa-o
  if(playerData?.carteira) return playerData.carteira;

  // Tenta carregar do Firestore
  try {
    const snap = await db.collection('players').doc(walletAddress).get();
    const carteira = snap.data()?.carteira;
    if(carteira) {
      playerData.carteira = carteira;
      return carteira;
    }
  } catch(e) {}

  // Não tem carteira vinculada — pede ao usuário
  showToast(t('mkt.metamask.link_first'), 'err');
  return null;
}

// ── Desvincular a MetaMask ────────────────────────────────────────
// Só o servidor mexe na `carteira` (firestore.rules), então soltar
// também passa por ele (desvincular-carteira, em api/resgatar.js).
async function desvincularCarteira(botao) {
  if(!playerData?.carteira) return;
  // Dois toques no próprio botão, no estilo do jogo (uiConfirmar, js/ui.js).
  if (typeof uiConfirmar === 'function' && !uiConfirmar(botao, t('mkt.metamask.desvincular_curto'))) return;
  try {
    const usuario = firebase.auth().currentUser;
    if(!usuario) { showToast(t('mkt.metamask.desvincular_err'), 'err'); return; }
    const idToken = await usuario.getIdToken();
    const resp = await fetch('/api/resgatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'desvincular-carteira', idToken }),
    });
    const data = await resp.json();
    if(!data.ok) { showToast(data.erro || t('mkt.metamask.desvincular_err'), 'err'); return; }

    playerData.carteira    = null;
    window._playerCarteira = null;
    showToast(t('mkt.metamask.desvinculada'), 'ok');
  } catch(e) {
    showToast(t('mkt.metamask.desvincular_err'), 'err');
  }
  if(typeof renderMetaMaskCta   === 'function') renderMetaMaskCta();
  if(typeof renderLimiteResgate === 'function') renderLimiteResgate();
}

/* O vínculo desta conta foi assinado? O cliente não lê a coleção
   `carteiras` (firestore.rules), então quem responde é o servidor.
   Devolve null se não der para perguntar (sem login, sem rede, ou o
   servidor local, que não tem as /api). */
async function _statusCarteira() {
  try {
    const usuario = firebase.auth().currentUser;
    if(!usuario) return null;
    const idToken = await usuario.getIdToken();
    const resp = await fetch('/api/resgatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'status-carteira', idToken }),
    });
    if(!resp.ok) return null;
    return await resp.json();
  } catch(e) { return null; }
}

window.vincularCarteira = vincularCarteira;
window.desvincularCarteira = desvincularCarteira;
window.garantirCarteira = garantirCarteira;
