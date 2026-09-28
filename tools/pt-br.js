/* ═══════════════════════════════════════════════════════════════════
   O PORTUGUÊS DOS COMENTÁRIOS

     node tools/pt-br.js           lista o que trocaria
     node tools/pt-br.js --escrever  troca

   O projeto é escrito em português do Brasil — os textos do jogo, os
   comentários e as mensagens de commit. Os textos das telas já estavam
   (3.101 conferidos, nenhum de Portugal); os comentários não, e foram
   ficando com "teto", "ecrã", "lugar" e "equipe" ao longo do caminho.

   ── POR QUE NÃO É UM PROCURAR-E-SUBSTITUIR ──

   Porque metade destas palavras também é CÓDIGO. `equipe` é o campo
   `gs.equipa` que vive no Firestore, é a função `equipaIdx()`, é a
   chave `equipa.title` das traduções e é a classe `.equipa-slot` do
   CSS. Trocar isso não deixa o português melhor: deixa o jogo quebrado
   e os saves ilegíveis.

   Então isto não olha para linhas. Percorre o arquivo caractere a
   caractere, sabe quando está dentro de uma string, de um comentário de
   linha, de um bloco ou de um template, e só mexe no que é COMENTÁRIO.
   O código e os textos das telas passam intocados por construção, e não
   por um regex esperto que um dia falha.
   ═══════════════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

/* O `equipa` tem uma regra a mais, e ela nasceu de um erro desta
   ferramenta. A primeira versão trocava `\bequipa\b` em qualquer lugar
   do comentário — e comentários FALAM de código. Ficou `gs.equipe` onde
   o campo é `gs.equipa`, `js/equipe.js` onde o arquivo é `js/equipa.js`,
   `equipe.title` onde a chave é `equipa.title`. Onze lugares, um deles o
   comentário desta própria ferramenta explicando por que não se devia
   fazer isso.

   Um comentário que aponta para um nome que não existe é pior do que um
   comentário em português de Portugal: o segundo só soa estranho, o
   primeiro manda quem for procurar atrás de coisa nenhuma.

   Então não se troca quando a palavra está colada ao que a torna nome:
   ponto, barra, crase ou letra antes; parêntese, hífen, letra, ou ponto
   seguido de minúscula, depois. Um `equipa.` com ponto final de frase
   continua sendo palavra, e troca. */
const EQUIPA  = /(?<![.\w`\/])equipa(?![\w(\-]|\.[a-z])/g;
const EQUIPAS = /(?<![.\w`\/])equipas(?![\w(\-]|\.[a-z])/g;

/* A família do REGISTO tem a mesma armadilha do `equipa`: `registado` é
   um campo de verdade (api/pool.js devolve `{ registado: true }`), e um
   comentário que o cite não pode ser corrigido para um nome que não
   existe. A guarda de baixo trava só o que se PARECE com um campo de
   objeto — dois pontos seguidos de um valor — e por isso uma frase como
   "guardada com o registro: é ela" continua a ser corrigida, apesar dos
   dois pontos. Esta frase foi ela própria um dos casos: a ferramenta
   corrigiu este comentário ao passar por aqui.

   O resto é uma letra: todo o "regist-" de Portugal vira "registr-".
   Um $1 em vez de oito linhas. */
const REGIST = /(?<![.\w`\/])regist(os|o|ados|adas|ado|ada|ar|ou|am|a)\b(?!\s*:\s*(?:true|false|\d|['"]))/g;

/* A palavra de Portugal e como se diz aqui. Só vocabulário: a ordem das
   palavras e a ênclise ficam para mão humana, porque trocá-las sem ler
   a frase estraga mais do que conserta. */
const TROCAS = [
  [EQUIPAS, 'equipes'], [EQUIPA, 'equipe'],
  [/\bcolónia\b/g, 'colônia'], [/\bcolónias\b/g, 'colônias'],
  [/\bsítios\b/g, 'lugares'],  [/\bsítio\b/g, 'lugar'],
  [/\btectos\b/g, 'tetos'],    [/\btecto\b/g, 'teto'],
  [/\btelemóvel\b/g, 'celular'], [/\btelemóveis\b/g, 'celulares'],
  [/\becrãs\b/g, 'telas'],     [/\becrã\b/g, 'tela'],
  [/\bbónus\b/g, 'bônus'],     [/\bbebés\b/g, 'bebês'], [/\bbebé\b/g, 'bebê'],
  [/\bacções\b/g, 'ações'],    [/\bacção\b/g, 'ação'],
  [/\bactual\b/g, 'atual'],    [/\bactualiza\b/g, 'atualiza'],
  [/\bactuais\b/g, 'atuais'],  [/\bactualmente\b/g, 'atualmente'],
  [/\bpercentagem\b/g, 'porcentagem'],
  [/\bcorrecção\b/g, 'correção'], [/\bcorrecções\b/g, 'correções'],
  [/\bobjectos\b/g, 'objetos'], [/\bobjecto\b/g, 'objeto'],
  [/\bficheiros\b/g, 'arquivos'], [/\bficheiro\b/g, 'arquivo'],
  [/\bfactos\b/g, 'fatos'],    [/\bfacto\b/g, 'fato'],
  [/\bdirecções\b/g, 'direções'], [/\bdirecção\b/g, 'direção'],
  [/\bexacta\b/g, 'exata'],    [/\bexacto\b/g, 'exato'],
  [/\bexactamente\b/g, 'exatamente'],
  [/\bcêntimos\b/g, 'centavos'], [/\bcêntimo\b/g, 'centavo'],
  [/\baceder\b/g, 'acessar'],  [/\butilizador\b/g, 'usuário'],
  [/\bselecção\b/g, 'seleção'], [/\bcontacto\b/g, 'contato'],
  [REGIST, 'registr$1'],
  [/\bexcepções\b/g, 'exceções'], [/\bexcepção\b/g, 'exceção'],
  [/\bexcepto\b/g, 'exceto'],   [/\bóptimo\b/g, 'ótimo'], [/\bóptima\b/g, 'ótima'],
  [/\bbaptismo\b/g, 'batismo'], [/\btáctico\b/g, 'tático'], [/\btáctica\b/g, 'tática'],
  [/\bactivo\b/g, 'ativo'],     [/\bactiva\b/g, 'ativa'],
  [/\bdesactivado\b/g, 'desativado'], [/\bdesactivada\b/g, 'desativada'],
];

function trocar(txt) {
  let fora = txt;
  for (const [de, para] of TROCAS) fora = fora.replace(de, para);
  return fora;
}

/* Onde começam e acabam os comentários de um arquivo .js.

   Um varredor, não um regex: para saber que `// isto` dentro de uma
   string não é comentário, é preciso ter lido a string desde o começo.
   Devolve os pedaços [início, fim) que são comentário. */
function comentariosJs(s) {
  const fora = [];
  let i = 0, n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') {
      const j = s.indexOf('\n', i);
      fora.push([i, j === -1 ? n : j]);
      i = j === -1 ? n : j;
    } else if (c === '/' && d === '*') {
      const j = s.indexOf('*/', i + 2);
      fora.push([i, j === -1 ? n : j + 2]);
      i = j === -1 ? n : j + 2;
    } else if (c === '"' || c === "'" || c === '`') {
      // pula a string inteira, com as escapadas dentro
      i++;
      while (i < n && s[i] !== c) i += (s[i] === '\\' ? 2 : 1);
      i++;
    } else if (c === '\\') {
      i += 2;                       // escapada fora de string: salta
    } else {
      i++;
    }
  }
  return fora;
}

// No CSS só há /* */; no HTML só <!-- -->. Nenhum dos dois tem strings
// que possam conter o abre-comentário, portanto o indexOf basta.
function entreMarcas(s, abre, fecha) {
  const fora = [];
  let i = 0;
  while ((i = s.indexOf(abre, i)) !== -1) {
    const j = s.indexOf(fecha, i + abre.length);
    fora.push([i, j === -1 ? s.length : j + fecha.length]);
    i = j === -1 ? s.length : j + fecha.length;
  }
  return fora;
}

function pedacosDe(arquivo, s) {
  if (arquivo.endsWith('.js'))   return comentariosJs(s);
  if (arquivo.endsWith('.css'))  return entreMarcas(s, '/*', '*/');
  if (arquivo.endsWith('.html')) return entreMarcas(s, '<!--', '-->');
  return [];
}

function todosOsArquivos(raiz) {
  const fora = [];
  (function anda(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (['node_modules', '.git', '.vercel', 'scratchpad'].includes(e.name)) continue;
        anda(path.join(dir, e.name));
      } else if (/\.(js|css|html)$/.test(e.name)) {
        fora.push(path.join(dir, e.name));
      }
    }
  })(raiz);
  return fora;
}

const escrever = process.argv.includes('--escrever');
let arquivosMexidos = 0, trocasFeitas = 0;
const porPalavra = {};

for (const p of todosOsArquivos('.')) {
  const s = fs.readFileSync(p, 'utf8');
  const pedacos = pedacosDe(p, s);
  if (!pedacos.length) continue;

  let fora = '', fim = 0, mexeu = 0;
  for (const [a, b] of pedacos) {
    const antes  = s.slice(a, b);
    const depois = trocar(antes);
    if (depois !== antes) {
      mexeu++;
      for (const [de] of TROCAS) {
        const q = (antes.match(de) || []).length;
        if (q) porPalavra[de.source.replace(/\b/g, '')] = (porPalavra[de.source.replace(/\b/g, '')] || 0) + q;
      }
    }
    fora += s.slice(fim, a) + depois;
    fim = b;
  }
  fora += s.slice(fim);

  if (mexeu) {
    arquivosMexidos++; trocasFeitas += mexeu;
    if (escrever) fs.writeFileSync(p, fora);
    else console.log(`  ${p}  ${mexeu} comentário(s)`);
  }
}

console.log();
console.log(escrever ? '── TROCADO ──' : '── ENSAIO (nada foi escrito) ──');
console.log(`${trocasFeitas} comentários em ${arquivosMexidos} arquivos`);
console.log();
for (const [w, n] of Object.entries(porPalavra).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${w.padEnd(16)} ${n}`);
}
