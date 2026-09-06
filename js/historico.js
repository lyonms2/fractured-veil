// ═══════════════════════════════════════════════════════════════════
//  O HISTÓRICO DE VENDAS DE UM AVATAR
//
//  Depende de: t() (i18n.js), ModalManager (modal.js)
//
//  ── DE ONDE VÊM OS NÚMEROS ──
//
//  Da cadeia `donos`, que já viajava com o avatar em cada venda: quem o
//  teve e até quando. O api/comprar-avatar.js passou a acrescentar-lhe
//  também o PREÇO e o NÍVEL de cada passagem.
//
//  Fica lá e não numa coleção à parte de propósito: a cadeia segue o
//  avatar para o comprador, portanto o histórico segue-o também. Um
//  registo guardado noutro sítio seria uma segunda memória a divergir
//  desta — e o comprador receberia um bicho sem passado outra vez.
//
//  E é escrito só pelo servidor, dentro da transação que move os
//  cristais. O preço que aqui aparece é, por construção, o que foi pago.
//
//  ── O QUE SE DESENHA, E QUANDO NÃO SE DESENHA ──
//
//    0 vendas   não há gráfico nem lista: diz-se que ainda não mudou de mãos
//    1 venda    um número grande, e mais nada. Uma linha entre um ponto e
//               nada é um gráfico a fingir que tem uma tendência
//    2+         a linha, com o valor escrito em cada ponto
//
//  Os valores vão TODOS escritos, e não num balão de rato: são poucos, e
//  num celular não há rato nenhum — um gráfico que só se lê ao passar por
//  cima não se lê metade das vezes.
// ═══════════════════════════════════════════════════════════════════

/* O slot de que a certidão está a falar. A certidão desenha-se como
   texto e o botão dela não tem por onde levar o objecto; fica aqui,
   escrito por quem a desenha. */
let _histSlot = null;

function historicoGuardarSlot(slot) { _histSlot = slot || null; }

// As passagens que têm preço. As antigas — de antes de o servidor o
// registar — ficam na lista mas fora do gráfico: inventar-lhes um valor
// era mentir, e apagá-las era esconder que existiram.
function _histVendas(slot) {
  const donos = (slot && Array.isArray(slot.donos)) ? slot.donos : [];
  return donos.map((d, i) => ({
    ordem: i + 1,
    nome:  d.nome || null,
    ate:   d.ate  || null,
    preco: (typeof d.preco === 'number' && d.preco > 0) ? d.preco : null,
    nivel: d.nivel || null,
  }));
}

/* ── O GRÁFICO ──

   Série única, e por isso sem legenda: o título já diz o que é. Uma cor
   só — o ouro do jogo — que contra o fundo escuro passa os 3:1 de
   contraste.

   A escala não começa no zero, e é uma escolha: entre 300 e 320 cristais
   um eixo ancorado no zero desenha uma linha reta e esconde a única
   coisa que o gráfico tem para dizer. O que impede isso de enganar é o
   valor ir escrito em cada ponto — quem lê tem o número, não só a
   inclinação. */
function _histSVG(vendas) {
  const pts = vendas.filter(v => v.preco != null);
  if (pts.length < 2) return '';

  const W = 320, H = 132;
  const mE = 10, mD = 10, mT = 22, mB = 24;   // margens: o texto mora nelas
  const lx = W - mE - mD, ly = H - mT - mB;

  const vals = pts.map(p => p.preco);
  let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (min === max) { min = min * 0.9; max = max * 1.1; }   // linha plana centrada
  const x = i => mE + (pts.length === 1 ? lx / 2 : (i * lx) / (pts.length - 1));
  const y = v => mT + ly - ((v - min) / (max - min)) * ly;

  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.preco).toFixed(1)}`).join(' ');

  const marcas = pts.map((p, i) => {
    const px = x(i), py = y(p.preco);
    /* O rótulo foge para baixo quando o ponto está encostado ao topo,
       senão saía da moldura. É o único caso em que a posição muda. */
    const acima = py > mT + 14;
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5"
              fill="var(--surface,#0b0916)" stroke="var(--gold,#c9a84c)" stroke-width="2"/>
      <text x="${px.toFixed(1)}" y="${(acima ? py - 9 : py + 15).toFixed(1)}"
            class="hist-val" text-anchor="middle">${p.preco}</text>
      <text x="${px.toFixed(1)}" y="${H - 7}" class="hist-eixo"
            text-anchor="middle">${t('hist.ordem', { n: p.ordem })}</text>`;
  }).join('');

  return `<svg class="hist-svg" viewBox="0 0 ${W} ${H}" role="img"
               aria-label="${t('hist.grafico_alt')}">
    <line x1="${mE}" y1="${H - mB + 4}" x2="${W - mD}" y2="${H - mB + 4}" class="hist-base"/>
    <path d="${linha}" fill="none" stroke="var(--gold,#c9a84c)" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
    ${marcas}
  </svg>`;
}

function _histData(ms) {
  if (!ms) return '—';
  try { return new Date(ms).toLocaleDateString(); } catch (_) { return '—'; }
}

function abrirHistorico() {
  const ov = document.getElementById('historicoOverlay');
  if (!ov) return;
  const slot = _histSlot;
  const vendas = _histVendas(slot);
  const comPreco = vendas.filter(v => v.preco != null);

  const nome = ov.querySelector('#histNome');
  if (nome) nome.textContent = (slot && slot.nome) ? String(slot.nome).split(',')[0].trim() : '';

  const corpo = ov.querySelector('#histCorpo');
  if (corpo) {
    if (!vendas.length) {
      corpo.innerHTML = `<div class="hist-vazio">${t('hist.nunca')}</div>`;
    } else {
      // Uma venda só: o número, e mais nada. Ver a nota no cabeçalho.
      const destaque = comPreco.length === 1
        ? `<div class="hist-unico">
             <div class="hist-unico-val">💎 ${comPreco[0].preco}</div>
             <div class="hist-unico-rot">${t('hist.uma_venda')}</div>
           </div>`
        : _histSVG(vendas);

      const lista = vendas.map(v => `<li class="hist-item">
          <span class="hist-ord">${t('hist.ordem', { n: v.ordem })}</span>
          <span class="hist-quem">${v.nome ? _histEsc(v.nome) : t('cert.anonimo')}</span>
          <span class="hist-nv">${v.nivel ? t('mkt.stat.nivel') + ' ' + v.nivel : ''}</span>
          <span class="hist-preco">${v.preco != null ? '💎 ' + v.preco : '—'}</span>
        </li>`).join('');

      const semPreco = vendas.length - comPreco.length;
      corpo.innerHTML = destaque
        + `<ol class="hist-lista">${lista}</ol>`
        + (semPreco ? `<div class="hist-nota">${t('hist.sem_preco', { n: semPreco })}</div>` : '');
    }
  }

  ov.classList.add('ativo');
  if (typeof lockBodyScroll === 'function') lockBodyScroll();
}

function fecharHistorico() {
  const ov = document.getElementById('historicoOverlay');
  if (!ov) return;
  if (ov.classList.contains('ativo') && typeof unlockBodyScroll === 'function') unlockBodyScroll();
  ov.classList.remove('ativo');
}

// O nome de um jogador é texto de outra pessoa: entra escapado.
function _histEsc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.registerStrings(
  {
    'hist.titulo':      '◈ POR QUANTAS MÃOS PASSOU',
    'hist.abrir':       'ver o histórico de vendas',
    'hist.fechar':      'FECHAR',
    'hist.ordem':       '{n}ª',
    'hist.uma_venda':   'vendido uma vez',
    'hist.nunca':       'Ainda não mudou de mãos. O primeiro dono continua a ser o único.',
    'hist.sem_preco':   '{n} passagem antes de o preço passar a ficar registado.',
    'hist.grafico_alt': 'Preço de cada venda, em cristais, pela ordem em que aconteceram.',
  },
  {
    'hist.titulo':      '◈ HOW MANY HANDS IT PASSED THROUGH',
    'hist.abrir':       'see the sale history',
    'hist.fechar':      'CLOSE',
    'hist.ordem':       '#{n}',
    'hist.uma_venda':   'sold once',
    'hist.nunca':       'It has never changed hands. The first owner is still the only one.',
    'hist.sem_preco':   '{n} transfer from before prices were recorded.',
    'hist.grafico_alt': 'Price of each sale, in crystals, in the order they happened.',
  }
);
