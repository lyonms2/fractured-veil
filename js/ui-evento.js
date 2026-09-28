/* ═══════════════════════════════════════════════════════════════════
   A FAIXA DO EVENTO

   Uma linha no alto da tela, quando há um evento a correr: o nome, o
   que ele dá, e quanto falta para acabar.

   ── POR QUE O RELÓGIO IMPORTA ──

   Um evento sem prazo à vista é um cartaz; com o prazo, é um motivo
   para jogar agora. É a única informação da faixa que muda sozinha, e
   por isso a única que precisa de um temporizador.

   Ele anda de minuto a minuto, e não de segundo: um relógio a contar
   segundos ao lado de um bicho a dormir é ansiedade, não urgência. Na
   última hora passa a mostrar os minutos, que é quando eles contam.

   ── QUANDO ELA DESAPARECE ──

   Sozinha, no instante em que o evento acaba — o js/eventos.js decide
   isso pela hora, e não por alguém se lembrar de apagar o documento. É
   também o que faz um evento com data marcada para daqui a uma semana
   não aparecer já.
   ═══════════════════════════════════════════════════════════════════ */

let _eventoTimer = null;

/* Quanto falta, em palavras. Dias e horas enquanto é longe, minutos na
   última hora — e "acaba já" no último minuto, porque "0 min" parece um
   defeito. */
function _eventoFalta(ms) {
  // Uma frase própria para o singular: "falta 1 dia", e não "1 dias".
  const diz = (chave, n) => t(n === 1 ? chave + '_1' : chave, { n });
  /* Arredonda ao mais PRÓXIMO, e não para baixo: um evento de dois dias
     recém-aberto tem 47 h e 59 min pela frente, e o floor anunciava
     "falta 1 dia" logo no primeiro minuto. Um relógio que subestima o
     que falta é pior do que nenhum — tira a pressa a quem devia tê-la e
     dá a impressão de que a festa já vai a meio. */
  const min = Math.floor(ms / 60000);
  if (min <= 0) return t('evento.acaba_ja');
  if (min < 60) return diz('evento.faltam_min', min);
  const h = min / 60;
  if (h < 23.5) return diz('evento.faltam_h', Math.round(h));
  return diz('evento.faltam_d', Math.round(h / 24));
}

// O que o evento dá, em palavras curtas: "XP ×2 · moedas ×1,5".
function _eventoBonus(ev) {
  const nomes = { xp: t('evento.bonus.xp'), moedas: t('evento.bonus.moedas') };
  return Object.entries(ev.bonus || {})
    .filter(([k]) => nomes[k])
    .map(([k, v]) => `${nomes[k]} ×${String(v).replace('.', ',')}`)
    .join(' · ');
}

function renderEventoFaixa() {
  const el = document.getElementById('eventoFaixa');
  if (!el) return;

  const ev = (typeof eventoAgora === 'function') ? eventoAgora() : null;
  if (!ev) {
    el.style.display = 'none';
    el.innerHTML = '';
    if (_eventoTimer) { clearInterval(_eventoTimer); _eventoTimer = null; }
    return;
  }

  const lang = (typeof window !== 'undefined' && window._currentLang === 'en') ? 'en' : 'pt';
  const nome = eventoTexto(ev, 'nome', lang);
  const nota = eventoTexto(ev, 'nota', lang);
  const falta = _eventoFalta(eventoRestante(ev, Date.now()));

  el.innerHTML =
    `<span class="evento-brasao">✦</span>` +
    `<span class="evento-nome">${esc(nome)}</span>` +
    `<span class="evento-bonus">${esc(_eventoBonus(ev))}</span>` +
    `<span class="evento-relogio">${esc(falta)}</span>` +
    (nota ? `<span class="evento-nota">${esc(nota)}</span>` : '');
  el.style.display = '';

  /* Um só temporizador, sempre. Sem esta guarda, cada troca de tela
     criava outro e ao fim de uma tarde o relógio piscava. */
  if (!_eventoTimer) _eventoTimer = setInterval(renderEventoFaixa, 60000);
}

// O esc do jogo, se existir; senão o mínimo para não injetar HTML de um
// documento que, embora só o dono escreva, chega de fora deste arquivo.
if (typeof esc !== 'function') {
  var esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (typeof window !== 'undefined') window.renderEventoFaixa = renderEventoFaixa;
