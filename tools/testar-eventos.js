/* ═══════════════════════════════════════════════════════════════════
   OS EVENTOS

     node tools/testar-eventos.js

   Um evento é uma janela de tempo, e o que se testa num intervalo são
   sempre as bordas: o instante antes, o primeiro, o último, e o
   primeiro de fora. É onde um `<` escrito como `<=` dá um evento que
   não começa ou que nunca acaba.

   Depois disso, o que este arquivo mais protege é o caso do documento
   MAL ESCRITO. O evento vive em `config/evento`, escrito à mão pelo
   tools/evento.js, e chega ao jogo sem passar por validação nenhuma —
   é a mesma linha para todo mundo. Um `xp: 0` num dia de pressa pararia
   a progressão de todos os jogadores sem nada na tela a explicar
   porquê, e um `xp: 100` daria o progresso de um mês num minuto.

   As regras estão em js/eventos.js e rodam no Node, então isto mede o
   calendário inteiro de um evento em milissegundos.
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const E = require(path.join(__dirname, '..', 'js', 'eventos.js'));

let passaram = 0;
const falhas = [];
const conferir = (nome, obtido, esperado) => {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) { passaram++; return; }
  falhas.push(`${nome}\n      esperado ${b}\n      obtido   ${a}`);
};

const H = 3600000;
const ev = (extra) => Object.assign({
  id: 'teste', nome: { pt: 'Festa', en: 'Party' },
  comeca: 1000 * H, acaba: 1050 * H, bonus: { xp: 2 },
}, extra);

// ═══════════════════════════════════════════════════════════════════
console.log('── a janela ──');

const j = ev();
conferir('um instante antes: não',     !!E.eventoAtivo(j, 1000 * H - 1), false);
conferir('o primeiro instante: sim',   !!E.eventoAtivo(j, 1000 * H), true);
conferir('no meio: sim',               !!E.eventoAtivo(j, 1025 * H), true);
conferir('o último instante: sim',     !!E.eventoAtivo(j, 1050 * H - 1), true);
/* O fim NÃO inclui o próprio instante: com `<=` um evento que acaba às
   22h00 ainda pagaria em cima das 22h00, e dois eventos seguidos se
   sobreporiam por um milissegundo. */
conferir('o instante do fim: não',     !!E.eventoAtivo(j, 1050 * H), false);
conferir('depois: não',                !!E.eventoAtivo(j, 2000 * H), false);

conferir('sem documento',              E.eventoAtivo(null, 1025 * H), null);
conferir('documento vazio',            E.eventoAtivo({}, 1025 * H), null);
conferir('sem datas',                  E.eventoAtivo(ev({ comeca: undefined }), 1025 * H), null);
conferir('datas de texto não valem',   E.eventoAtivo(ev({ comeca: 'ontem' }), 1025 * H), null);
conferir('janela invertida',           E.eventoAtivo(ev({ acaba: 900 * H }), 1025 * H), null);
conferir('janela de duração zero',     E.eventoAtivo(ev({ acaba: 1000 * H }), 1000 * H), null);

// ═══════════════════════════════════════════════════════════════════
console.log('── os bônus ──');

const b = ev({ bonus: { xp: 2, moedas: 1.5 } });
conferir('xp dentro da janela',        E.eventoMultiplicador(b, 1025 * H, 'xp'), 2);
conferir('moedas dentro da janela',    E.eventoMultiplicador(b, 1025 * H, 'moedas'), 1.5);
conferir('xp fora da janela',          E.eventoMultiplicador(b, 2000 * H, 'xp'), 1);
conferir('uma coisa que ele não dá',   E.eventoMultiplicador(b, 1025 * H, 'cristais'), 1);
conferir('sem bônus nenhum',           E.eventoMultiplicador(ev({ bonus: {} }), 1025 * H, 'xp'), 1);

/* O DOCUMENTO MAL ESCRITO. Nenhum destes pode chegar a uma conta de XP:
   um evento serve para dar mais, nunca para tirar, e nunca sem teto. */
conferir('um bônus de 0 não para o jogo',   E.eventoMultiplicador(ev({ bonus: { xp: 0 } }), 1025 * H, 'xp'), 1);
conferir('um bônus negativo não tira',      E.eventoMultiplicador(ev({ bonus: { xp: -5 } }), 1025 * H, 'xp'), 1);
conferir('meio (0,5) não é um bônus',       E.eventoMultiplicador(ev({ bonus: { xp: 0.5 } }), 1025 * H, 'xp'), 1);
conferir('texto no lugar do número',        E.eventoMultiplicador(ev({ bonus: { xp: 'muito' } }), 1025 * H, 'xp'), 1);
conferir('um zero a mais bate no teto',     E.eventoMultiplicador(ev({ bonus: { xp: 200 } }), 1025 * H, 'xp'), E.EVENTO_MULT_MAX);
conferir('e o teto é 10',                   E.EVENTO_MULT_MAX, 10);

/* A lista de bônus é fechada, e é isso que faz um `xpp: 2` com erro de
   digitação não passar despercebido para sempre. */
conferir('a lista de bônus é a esperada',   E.EVENTO_BONUS, ['xp', 'moedas']);
conferir('o vínculo não está lá',           E.EVENTO_BONUS.indexOf('vinculo'), -1);

// ═══════════════════════════════════════════════════════════════════
console.log('── o relógio e os nomes ──');

conferir('quanto falta, no meio',      E.eventoRestante(j, 1049 * H), H);
conferir('no último instante',         E.eventoRestante(j, 1050 * H - 1), 1);
conferir('fora da janela, zero',       E.eventoRestante(j, 2000 * H), 0);
conferir('sem evento, zero',           E.eventoRestante(null, 1), 0);

conferir('o nome em português',        E.eventoTexto(j, 'nome', 'pt'), 'Festa');
conferir('o nome em inglês',           E.eventoTexto(j, 'nome', 'en'), 'Party');
/* Um evento escrito à pressa pode não ter a versão inglesa, e um nome em
   português é melhor do que uma caixa vazia. */
conferir('sem inglês, cai no português',
  E.eventoTexto(ev({ nome: { pt: 'Só em português' } }), 'nome', 'en'), 'Só em português');
conferir('um texto simples também serve',
  E.eventoTexto({ nome: 'Direto' }, 'nome', 'pt'), 'Direto');
conferir('campo que não existe',       E.eventoTexto(j, 'nota', 'pt'), '');
conferir('sem documento',              E.eventoTexto(null, 'nome', 'pt'), '');

// ═══════════════════════════════════════════════════════════════════
console.log('── o que o jogo carrega ──');

E.eventoGuardar(null);
conferir('sem nada carregado, tudo vale 1', E.eventoMult('xp'), 1);
conferir('e não há evento a correr',        E.eventoAgora(), null);

E.eventoGuardar({ comeca: 0, acaba: 9e15, bonus: { xp: 3, moedas: 2 } });
conferir('carregado: xp',                   E.eventoMult('xp'), 3);
conferir('carregado: moedas',               E.eventoMult('moedas'), 2);
conferir('e há evento a correr',            !!E.eventoAgora(), true);

E.eventoGuardar({ comeca: 0, acaba: 1, bonus: { xp: 3 } });
conferir('um evento já acabado não paga',   E.eventoMult('xp'), 1);
E.eventoGuardar(null);

// ═══════════════════════════════════════════════════════════════════
console.log('── e o jogo aplica mesmo? ──');

/* Os três lugares por onde XP e moeda entram no jogo. Se um deles
   deixar de multiplicar, o evento passa a valer em dois terços do jogo
   e ninguém repara até alguém comparar. */
const fs = require('fs');
const ler = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

conferir('as moedas, no earnCoins',    /eventoMult\('moedas'\)/.test(ler('js/actions.js')), true);
conferir('o XP de cuidar',             /eventoMult\('xp'\)/.test(ler('js/state.js')), true);
conferir('o XP dos minijogos',         /eventoMult\('xp'\)/.test(ler('js/modal.js')), true);
conferir('o XP das batalhas',          /eventoMult\('xp'\)/.test(ler('js/pve-fu.js')), true);
conferir('o jogo lê o documento',      /config'\)\.doc\('evento'\)/.test(ler('js/auth.js')), true);
conferir('e relê de tempos a tempos',  /setInterval\(_carregarEvento/.test(ler('js/auth.js')), true);
conferir('o index.html carrega as regras', /js\/eventos\.js/.test(ler('index.html')), true);
conferir('e a faixa',                  /js\/ui-evento\.js/.test(ler('index.html')), true);

// ═══════════════════════════════════════════════════════════════════
console.log();
if (falhas.length) {
  console.log(`${passaram} passaram · ${falhas.length} falharam\n`);
  falhas.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exitCode = 1;
} else {
  console.log(`${passaram} passaram · 0 falharam`);
}
