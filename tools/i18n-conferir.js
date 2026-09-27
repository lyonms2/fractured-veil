/* ═══════════════════════════════════════════════════════════════════
   CONFERIR AS TRADUÇÕES

     node tools/i18n-conferir.js

   Cada arquivo js/i18n*.js tem dois dicionários, o português primeiro e
   o inglês depois. Esta ferramenta lê os dois e reclama de quatro
   coisas que ninguém vê a olho num arquivo de setecentas linhas:

     · uma chave que só existe numa das línguas — a tela fica com a
       chave crua na cara do jogador quando ele troca de idioma;
     · uma chave definida três vezes ou mais, em que a última cala as
       outras sem dizer nada;
     · marcadores diferentes entre as duas ({n} num lado e {count} no
       outro), que fazem o texto sair com um {buraco} literal;
     · português do lado inglês, e vice-versa.

   ── POR QUE NÃO É UM REGEX DE UMA LINHA ──

   Porque os valores levam aspas dos dois tipos: o inglês tem apóstrofo
   ("I'm full!", "Friend's code") e por isso vai entre aspas duplas. Um
   padrão que só aceite aspas simples dá quinze falsos positivos e faz
   quem o leu correr atrás de problema que não existe — foi o que
   aconteceu na primeira versão disto.
   ═══════════════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const PASTA = path.join(__dirname, '..', 'js');

// 'chave': 'valor'  ou  'chave': "valor"  — com o resto da linha ignorado
const LINHA = /^\s*'([a-z0-9_.]+)'\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/;

const MARCADOR = /\{[a-z_]+\}/g;

/* Marcas de uma língua que não aparecem na outra. Usadas juntas: só
   acusa quando há marca de uma e nenhuma da outra, porque um texto
   curto ("OK", "PvP") não é de língua nenhuma.

   Os limites são escritos à mão e não com \b, porque o \b do JavaScript
   só conhece [A-Za-z0-9_]: ele vê um limite de palavra entre o "r" e o
   "ç" de "força", e ali passava a encontrar um "for" inglês dentro de
   uma palavra portuguesa. Eram quatro dos cinco falsos positivos da
   primeira versão. */
const LIM = '(?<![\\wÀ-ÿ])%s(?![\\wÀ-ÿ])';
const palavras = (lista) => new RegExp(lista.map(w => LIM.replace('%s', w)).join('|'), 'i');

const MARCA_PT = palavras(['ção', 'ções', 'não', 'você', 'seu', 'sua', 'para',
                           'com', 'mais', 'cada', 'que', 'dos', 'das']);
const MARCA_EN = palavras(['the', 'your', 'you', 'to', 'of', 'and', 'is',
                           'with', 'from', 'will', 'each']);

function lerDicionarios(texto) {
  const vistos = new Map();
  for (const linha of texto.split('\n')) {
    const m = LINHA.exec(linha);
    if (!m) continue;
    const chave = m[1];
    const valor = m[2] !== undefined ? m[2] : m[3];
    if (!vistos.has(chave)) vistos.set(chave, []);
    vistos.get(chave).push(valor);
  }
  return vistos;
}

const marcadoresDe = (s) => (s.match(MARCADOR) || []).sort().join(',');

let problemas = 0;
let chavesConferidas = 0;
const arquivos = fs.readdirSync(PASTA).filter(a => /^i18n.*\.js$/.test(a)).sort();

for (const arquivo of arquivos) {
  const vistos = lerDicionarios(fs.readFileSync(path.join(PASTA, arquivo), 'utf8'));
  const reclamar = (tipo, chave, extra) => {
    console.log(`  ${tipo.padEnd(10)} ${arquivo.padEnd(22)} ${chave}${extra ? '  ' + extra : ''}`);
    problemas++;
  };

  for (const [chave, valores] of vistos) {
    if (valores.length === 1) { reclamar('SEM PAR', chave, `"${valores[0].slice(0, 45)}"`); continue; }
    if (valores.length > 2)   { reclamar('REPETIDA', chave, `${valores.length}x`); continue; }

    chavesConferidas++;
    const [pt, en] = valores;

    if (marcadoresDe(pt) !== marcadoresDe(en)) {
      reclamar('MARCADOR', chave, `pt[${marcadoresDe(pt)}] en[${marcadoresDe(en)}]`);
    }
    /* Sem os marcadores: o {para} de "d{de} → d{para}" é o nome de um
       buraco no texto, não a preposição portuguesa. */
    const soTexto = (s) => s.replace(MARCADOR, ' ');
    const ptLimpo = soTexto(pt), enLimpo = soTexto(en);

    if (MARCA_PT.test(enLimpo) && !MARCA_EN.test(enLimpo)) {
      reclamar('PT NO EN', chave, `"${en.slice(0, 45)}"`);
    }
    if (MARCA_EN.test(ptLimpo) && !MARCA_PT.test(ptLimpo)) {
      reclamar('EN NO PT', chave, `"${pt.slice(0, 45)}"`);
    }
  }
}

console.log();
console.log(`${chavesConferidas} chaves conferidas em ${arquivos.length} arquivos`);
console.log(problemas ? `${problemas} problema(s)` : 'nenhum problema');
process.exitCode = problemas ? 1 : 0;
