/* ═══════════════════════════════════════════════════════════════════
   O SALÃO — a página das tabelas do PvP

   Pedido do dono do jogo em 23/09/2026: "os ranks para pvp merecem uma
   página só para eles, com destaques e tudo mais, porque é uma das
   coisas principais do jogo". A seção do lobby continua lá, mas é só um
   espreitar: cinco linhas e os meus pontos. Aqui está a coisa inteira.

   ── O QUE ESTA PÁGINA MOSTRA ──

   · a TEMPORADA que corre e quanto falta para ela virar;
   · as três DIVISÕES (Jovens, Adultos, Anciãos), em abas, com a minha
     já aberta quando a página abre — é a que me interessa;
   · o PÓDIO: os três primeiros desenhados, com o avatar que levam para
     a luta, o primeiro ao meio e maior;
   · A MINHA LINHA, sempre visível, mesmo que eu esteja em 40º: os
     pontos, a posição, o saldo de vitórias e quantos pontos faltam para
     passar quem está à minha frente;
   · a lista, até cinquenta, com a cara de cada um.

   ── DE ONDE VÊM OS DADOS ──

   De `pvp/rank/{temporada}/{divisão}` do Realtime Database, que só o
   servidor escreve (database.rules.json) no fim de cada luta da fila. A
   página só lê. Cada linha traz o retrato do primeiro avatar da equipa
   — é por isso que não é preciso ir buscar o documento de cinquenta
   jogadores para desenhar a lista.

   ── O PRÉMIO DA TEMPORADA ──

   O dono do jogo disse que é "onde vai pagar cristais". Isso ainda não
   existe, e esta página não promete o que não há: quando houver, o
   lugar é a faixa por baixo do título (_pvpTabPremioHTML), e o prémio
   tem de vir do servidor como tudo o que vale dinheiro.
   ═══════════════════════════════════════════════════════════════════ */

let _pvpTabDiv   = null;   // a divisão que está aberta
let _pvpTabDados = {};     // { divisão: [linhas] }, o que já veio
let _pvpTabErro  = {};     // { divisão: motivo }
let _pvpTabRelogio = null;

const PVP_TAB_QUANTOS = 50;

function abrirTabelaPvP(divisao) {
  if (typeof ModalManager === 'undefined') return;
  _pvpTabDiv = divisao || (typeof pvpMinhaDivisao === 'function' ? pvpMinhaDivisao() : 'adulto');
  ModalManager.open('pvpTabelaModal');
  _pvpTabCabecalho();
  _pvpTabDesenhar();
  _pvpTabCarregar(_pvpTabDiv);
  // O tempo que falta anda sozinho enquanto a página estiver aberta.
  clearInterval(_pvpTabRelogio);
  _pvpTabRelogio = setInterval(() => {
    const el = document.getElementById('pvpTabFalta');
    if (el) el.textContent = _pvpTabFalta();
  }, 30000);
}
window.abrirTabelaPvP = abrirTabelaPvP;

// A temporada e o que falta dela, no alto da página.
function _pvpTabCabecalho() {
  const temp = document.getElementById('pvpTabTemp');
  const falta = document.getElementById('pvpTabFalta');
  if (temp)  temp.textContent  = pvpTemporada(typeof pvpAgora === 'function' ? pvpAgora() : Date.now());
  if (falta) falta.textContent = _pvpTabFalta();
}

function fecharTabelaPvP() {
  clearInterval(_pvpTabRelogio); _pvpTabRelogio = null;
  if (typeof ModalManager !== 'undefined') ModalManager.close('pvpTabelaModal');
}
window.fecharTabelaPvP = fecharTabelaPvP;

function pvpTabelaTrocar(div) {
  if (!div || div === _pvpTabDiv) return;
  _pvpTabDiv = div;
  _pvpTabDesenhar();
  _pvpTabCarregar(div);
}
window.pvpTabelaTrocar = pvpTabelaTrocar;

/* ── QUANTO FALTA PARA A TEMPORADA VIRAR ──
   A temporada é o mês em UTC (js/pvp-rank.js), portanto o fim é o
   primeiro instante do mês seguinte. */
function _pvpTabFimDaTemporada() {
  const agora = new Date(typeof pvpAgora === 'function' ? pvpAgora() : Date.now());
  return Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1);
}

function _pvpTabFalta() {
  const ms = _pvpTabFimDaTemporada() - (typeof pvpAgora === 'function' ? pvpAgora() : Date.now());
  if (ms <= 0) return t('pvp.tab.acabou');
  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  return dias > 0 ? t('pvp.tab.falta_d', { d: dias, h: horas }) : t('pvp.tab.falta_h', { h: horas });
}

// ── Os dados ────────────────────────────────────────────────────
function _pvpTabCarregar(div) {
  const db = (typeof _pvpDb === 'function') ? _pvpDb() : null;
  if (!db) { _pvpTabErro[div] = t('rank.motivo.rede'); _pvpTabDesenhar(); return; }
  const temp = pvpTemporada(typeof pvpAgora === 'function' ? pvpAgora() : Date.now());
  db.ref(`pvp/rank/${temp}/${div}`).orderByChild('p').limitToLast(PVP_TAB_QUANTOS).once('value')
    .then(s => {
      const out = [];
      s.forEach(c => { out.push(Object.assign({ uid: c.key }, c.val() || {})); });
      out.reverse();
      _pvpTabDados[div] = out;
      delete _pvpTabErro[div];
      if (_pvpTabDiv === div) _pvpTabDesenhar();
    })
    .catch(e => {
      _pvpTabErro[div] = (typeof rankFalhou === 'function') ? rankFalhou('pvp/tabela', e) : '';
      if (_pvpTabDiv === div) _pvpTabDesenhar();
    });
}

// ── O desenho ───────────────────────────────────────────────────
function _pvpTabDesenhar() {
  const corpo = document.getElementById('pvpTabelaCorpo');
  if (!corpo) return;
  corpo.innerHTML = _pvpTabHTML();
}

function _pvpTabAvatarSVG(linha, tam) {
  const av = linha && linha.av;
  if (!av || typeof gerarSVG !== 'function') return '<span class="pvp-tab-sem-cara"></span>';
  try {
    const fase = (typeof faseFromNivel === 'function') ? faseFromNivel(av.nivel || 1) : 3;
    return gerarSVG(av.nascimento ? Object.assign({}, av, av.nascimento) : av,
                    av.raridade || 'Comum', av.seed || 0, tam, tam, fase);
  } catch (e) { return '<span class="pvp-tab-sem-cara"></span>'; }
}

function _pvpTabHTML() {
  const div = _pvpTabDiv;
  const lista = _pvpTabDados[div];
  const erro = _pvpTabErro[div];
  const meuUid = (typeof _pvpUid !== 'undefined') ? _pvpUid : null;

  const abas = `<div class="pvp-tab-abas" role="tablist">
      ${PVP_DIVISOES.map(d => {
        const minha = (typeof pvpMinhaDivisao === 'function') && pvpMinhaDivisao() === d.id;
        return `<button role="tab" class="pvp-tab-aba${d.id === div ? ' on' : ''}${minha ? ' minha' : ''}"
          aria-selected="${d.id === div}" onclick="pvpTabelaTrocar('${d.id}')">
          ${esc(t('pvp.div.' + d.id))}${minha ? `<i>${esc(t('pvp.tab.a_sua'))}</i>` : ''}
        </button>`;
      }).join('')}
    </div>`;

  if (erro) {
    return abas + `<div class="pvp-tab-vazio">${esc(t('pvp.tab.erro'))}
      <small class="rank-motivo">${esc(erro)}</small></div>`;
  }
  if (!lista) return abas + `<div class="pvp-tab-vazio">${esc(t('ui.loading'))}</div>`;
  if (!lista.length) {
    return abas + `<div class="pvp-tab-vazio pvp-tab-primeiro">
        <span class="pvp-tab-coroa">♛</span>
        <b>${esc(t('pvp.tab.vazio_tit'))}</b>
        <span>${esc(t('pvp.tab.vazio_sub'))}</span>
      </div>`;
  }

  // ── o pódio ──
  const podio = lista.slice(0, 3);
  const ordemPodio = [podio[1], podio[0], podio[2]];   // 2º, 1º, 3º
  const lugares = [2, 1, 3];
  const podioHTML = `<div class="pvp-tab-podio">
      ${ordemPodio.map((r, i) => {
        if (!r) return '<div class="pvp-tab-lugar vazio"></div>';
        const pos = lugares[i];
        return `<figure class="pvp-tab-lugar l${pos}${r.uid === meuUid ? ' eu' : ''}" style="--i:${i}">
          ${pos === 1 ? '<span class="pvp-tab-coroa">♛</span>' : ''}
          <div class="pvp-tab-arte">${_pvpTabAvatarSVG(r, pos === 1 ? 108 : 84)}</div>
          <figcaption>
            <span class="pvp-tab-medalha">${['🥇', '🥈', '🥉'][pos - 1]}</span>
            <b>${esc(r.nome || t('id.sem_nome'))}</b>
            <span class="pvp-tab-pts">${r.p | 0}</span>
            <small>${(r.v | 0)}V – ${(r.d | 0)}D</small>
          </figcaption>
        </figure>`;
      }).join('')}
    </div>`;

  // ── a minha linha ──
  const meuIdx = lista.findIndex(r => r.uid === meuUid);
  const eu = meuIdx >= 0 ? lista[meuIdx] : null;
  const acima = meuIdx > 0 ? lista[meuIdx - 1] : null;
  const meuHTML = eu
    ? `<div class="pvp-tab-eu">
        <span class="pvp-tab-eu-pos">${meuIdx + 1}º</span>
        <span class="pvp-tab-eu-nome">${esc(t('pvp.tab.voce'))}</span>
        <span class="pvp-tab-eu-pts">${eu.p | 0}</span>
        <span class="pvp-tab-eu-vd">${(eu.v | 0)}V – ${(eu.d | 0)}D</span>
        ${acima ? `<span class="pvp-tab-eu-falta">${esc(t('pvp.tab.faltam',
            { n: Math.max(1, (acima.p | 0) - (eu.p | 0)), pos: meuIdx }))}</span>` : ''}
      </div>`
    : `<div class="pvp-tab-eu fora">${esc(t('pvp.tab.sem_lugar', { div: t('pvp.div.' + div) }))}</div>`;

  // ── a lista, do quarto em diante ──
  const resto = lista.slice(3);
  const listaHTML = resto.length ? `<ol class="pvp-tab-lista" start="4">
      ${resto.map((r, i) => `<li class="${r.uid === meuUid ? 'eu' : ''}" style="--i:${Math.min(i, 12)}">
        <span class="pvp-tab-pos">${i + 4}</span>
        <span class="pvp-tab-cara">${_pvpTabAvatarSVG(r, 40)}</span>
        <span class="pvp-tab-nome">${esc(r.nome || t('id.sem_nome'))}</span>
        <span class="pvp-tab-vd">${(r.v | 0)}V – ${(r.d | 0)}D</span>
        <span class="pvp-tab-pontos">${r.p | 0}</span>
      </li>`).join('')}
    </ol>` : '';

  return abas + podioHTML + meuHTML + listaHTML +
    `<div class="pvp-tab-rodape">${esc(t('pvp.tab.rodape', { n: lista.length }))}</div>`;
}

/* O lugar do prémio da temporada. Fica vazio até haver prémio de
   verdade, vindo do servidor: uma página de rankings que promete
   cristais que ninguém paga vale menos do que não prometer nada. */
function _pvpTabPremioHTML(premio) {
  if (!premio) return '';
  return `<div class="pvp-tab-premio">${esc(premio)}</div>`;
}
