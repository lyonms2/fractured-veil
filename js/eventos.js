/* ═══════════════════════════════════════════════════════════════════
   OS EVENTOS

   Uma janela de tempo com regra própria: um fim de semana de XP em
   dobro, uma semana de moedas a mais. O jogo continua o mesmo; o que
   muda é quanto certas coisas rendem, e por quanto tempo.

   ── ONDE ELE VIVE ──

   Num documento só, `config/evento`, que o cliente LÊ e não escreve
   (firestore.rules: `allow write: if false`). Quem o cria é o dono,
   pelo tools/evento.js, que fala com o Firestore como admin.

   É isso que torna um evento seguro sem nenhuma conferência extra: não
   há pedido do cliente para validar, porque o cliente não pede nada. Ele
   lê a mesma linha que todo mundo lê.

   ── O FORMATO ──

     {
       id:     'xp-dobro-outubro',
       nome:   { pt: 'Chuva de Estrelas', en: 'Starfall' },
       nota:   { pt: 'XP em dobro...',    en: 'Double XP...' },
       comeca: 1735689600000,     // ms
       acaba:  1735948800000,
       bonus:  { xp: 2, moedas: 1.5 }
     }

   O `bonus` é um multiplicador por coisa. O que não estiver lá vale 1 —
   um evento que só mexe no XP não precisa dizer nada sobre moedas.

   ── O QUE ESTE ARQUIVO NÃO FAZ ──

   Não lê o Firestore, não sabe que horas são e não toca na tela. Recebe
   o documento e o instante, e responde. É o que permite ao
   tools/testar-eventos.js correr o calendário inteiro de um evento em
   milissegundos, sem emulador nenhum.
   ═══════════════════════════════════════════════════════════════════ */

/* O teto de um multiplicador.

   Não é desconfiança do dono: é que este número entra em contas de XP e
   de moedas, e um zero a mais num documento escrito à mão daria a um
   jogador o progresso de um mês num minuto. Dez vezes já é uma festa. */
const EVENTO_MULT_MAX = 10;

/* As coisas que um evento sabe multiplicar. Uma lista fechada de
   propósito: um `bonus: { xpp: 2 }` com erro de digitação passaria
   despercebido para sempre, porque nada iria reclamar de uma chave que
   ninguém lê. O tools/evento.js recusa o que não estiver aqui. */
/* O vínculo esteve nesta lista e saiu: ele é somado em sete lugares
   diferentes do jogo, sem passagem comum, e um evento que o
   multiplicasse em três deles e não nos outros seria pior do que
   não existir. O XP e as moedas têm passagem única; por isso são
   estes dois. */
const EVENTO_BONUS = ['xp', 'moedas'];

/* O evento que está a correr AGORA, ou null.

   `agora` entra de fora para isto ser testável: quem sabe as horas é
   quem chama. Um documento sem `comeca`/`acaba` não é um evento eterno,
   é um documento incompleto — e devolve null. */
function eventoAtivo(doc, agora) {
  if (!doc || typeof doc !== 'object') return null;
  const t = Number(agora);
  const ini = Number(doc.comeca), fim = Number(doc.acaba);
  if (!Number.isFinite(t) || !Number.isFinite(ini) || !Number.isFinite(fim)) return null;
  if (fim <= ini) return null;              // janela invertida ou vazia
  if (t < ini || t >= fim) return null;     // o fim não inclui o próprio instante
  return doc;
}

/* Quanto um evento multiplica uma coisa. Sempre um número ≥ 1:

   · sem evento, 1;
   · um bônus que não é número, ou menor que 1, vale 1 — um evento não
     serve para PIORAR o jogo, e um `xp: 0` num documento mal escrito
     pararia a progressão de toda a gente sem nada na tela a explicar;
   · acima do teto, o teto. */
function eventoMultiplicador(doc, agora, oQue) {
  const e = eventoAtivo(doc, agora);
  if (!e || !e.bonus || EVENTO_BONUS.indexOf(oQue) === -1) return 1;
  const m = Number(e.bonus[oQue]);
  if (!Number.isFinite(m) || m <= 1) return 1;
  return Math.min(m, EVENTO_MULT_MAX);
}

/* Quanto falta, em milissegundos, para o evento acabar. Zero quando não
   há evento — é o que a tela usa para decidir se mostra um relógio. */
function eventoRestante(doc, agora) {
  const e = eventoAtivo(doc, agora);
  return e ? Math.max(0, Number(e.acaba) - Number(agora)) : 0;
}

/* O nome e a nota na língua de quem está lendo, com o português como
   recurso: um evento escrito à pressa pode não ter a versão inglesa, e
   é melhor mostrar o nome em português do que uma caixa vazia. */
function eventoTexto(doc, campo, lang) {
  const v = doc && doc[campo];
  if (!v) return '';
  if (typeof v === 'string') return v;
  return (lang === 'en' && v.en) ? v.en : (v.pt || v.en || '');
}

/* ══ O EVENTO CARREGADO, NO NAVEGADOR ══

   As funções acima são puras e não sabem de Firestore nenhum. Estas
   três guardam o documento que o js/auth.js leu e respondem a quem
   precisa de multiplicar alguma coisa — e são o único lugar do cliente
   que sabe as horas.

   Se a leitura falhar, `_eventoDoc` fica nulo e tudo multiplica por 1:
   um evento que não carrega é um evento que não acontece, e não um jogo
   que para. */
let _eventoDoc = null;

function eventoGuardar(doc) { _eventoDoc = doc || null; }
function eventoAgora()      { return eventoAtivo(_eventoDoc, Date.now()); }
function eventoMult(oQue)   { return eventoMultiplicador(_eventoDoc, Date.now(), oQue); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EVENTO_MULT_MAX, EVENTO_BONUS,
    eventoAtivo, eventoMultiplicador, eventoRestante, eventoTexto,
    eventoGuardar, eventoAgora, eventoMult,
  };
}
