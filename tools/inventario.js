// ═══════════════════════════════════════════════════════════════════
// INVENTÁRIO — tudo o que uma criatura pode saber fazer
//
//   node tools/inventario.js          lista tudo
//   node tools/inventario.js --json   o mesmo, para outro programa ler
//
// Não julga nem testa: LISTA. Junta num sítio só as três coisas que hoje
// vivem separadas — a mecânica (magias.js, vantagens.js), o nome e a
// descrição (i18n-*.js), e se o motor sequer LÊ cada propriedade.
//
// Essa última coluna é o ponto. Uma propriedade escrita no catálogo que
// o motor nunca lê é uma promessa que o jogo não cumpre, e é invisível
// tanto a ler o catálogo como a ler o motor — só se vê cruzando os dois.
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const A = require('./auditoria-base.js');
const { M } = A;
const RAIZ = path.resolve(__dirname, '..');

/* O MOTOR e o CATÁLOGO, separados de propósito.

   O catálogo DEFINE as propriedades; o motor LÊ-AS. Procurar em ambos
   dava sempre encontrado, e a pergunta que interessa é se alguém do
   lado de lá as consome. */
const ler = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8');
/* O magias.js e o vantagens.js entram, apesar de serem o catálogo: não
   são SÓ catálogo — o sorteio das magias e a escolha do elemento contra
   o qual uma vantagem vale vivem lá dentro. Deixá-los de fora acusava de
   órfãs três propriedades que são lidas a três linhas de onde nascem. */
const MOTOR = ['combate-3dt.js', 'ficha-3dt.js', 'combate-pve.js', 'combate-ui.js',
               'magias.js', 'vantagens.js'].map(ler).join(String.fromCharCode(10));

// As propriedades que são identificação, não efeito.
const NAO_E_EFEITO = new Set(['id', 'pm', 'pmMax', 'custo', 'elemento']);

/* Quantas vezes o código LÊ esta propriedade.

   Conta acessos — `.prop` e `['prop']` — e descarta as definições, que
   são `prop:` no catálogo. Zero é o que interessa: uma propriedade
   escrita no catálogo que ninguém consome é uma promessa que o jogo não
   cumpre, e não se vê a ler nenhum dos dois lados sozinho.

   Isto é uma busca de texto, não uma análise a sério: pode enganar-se
   nos dois sentidos. O que der zero verifica-se à mão antes de se
   acreditar — foi assim que se separou o excetoMagia, que é órfão mesmo,
   do contraElemento, que é lido a três linhas de onde nasce. */
function motorLe(prop) {
  const acesso = new RegExp('[.\\[][\'"]?' + prop + '[\'"]?\\b(?!\\s*:)', 'g');
  return (MOTOR.match(acesso) || []).length;
}

const t = id => {
  const v = global.__PT[id];
  return (v === undefined) ? null : v;
};

const linhas = [];
const dados = [];

function efeitos(o) {
  return Object.keys(o).filter(k => !NAO_E_EFEITO.has(k));
}

/* O QUE A AUDITORIA JÁ GARANTE.

   Duas coisas diferentes, e vale a pena não as confundir:

     · a FÓRMULA de ataque é verificada em TODAS as magias que atacam —
       a auditoria-magias.js percorre o catálogo inteiro e compara a FA
       que sai com a que o catálogo manda;
     · o EFEITO PRÓPRIO — envenenar, congelar, dobrar armadura — só é
       verificado nas que algum teste nomeia.

   Uma magia sem teste que a nomeie não está errada; está por olhar. É
   por aí que se começa. */
const TESTES = fs.readdirSync(path.join(RAIZ, 'tools'))
  .filter(f => f.startsWith('auditoria-'))
  .map(f => fs.readFileSync(path.join(RAIZ, 'tools', f), 'utf8')).join('\n');
const temTestePróprio = id => TESTES.includes("'" + id + "'") || TESTES.includes('"' + id + '"');

function despeja(o, tipoRot, extra) {
  const chave = extra.chaveTexto;
  const nome = t(chave + '.nome');
  const desc = t(chave + '.desc');
  const props = efeitos(o);
  const orfas = props.filter(p => motorLe(p) === 0);
  dados.push({ id: o.id, tipo: tipoRot, ...extra, nome, desc,
               mecanica: props.map(p => p + '=' + JSON.stringify(o[p])), orfas,
               formulaAuditada: !!o.fa,
               testePróprio: temTestePróprio(o.id),
               semTexto: !nome || !desc });
}

// ── As magias, por elemento ──
for (const el of Object.keys(M.MAGIAS)) {
  for (const cat of ['ataque', 'forte', 'defesa']) {
    for (const g of (M.MAGIAS[el][cat] || [])) {
      despeja(g, 'magia', { elemento: el, categoria: cat, pm: g.pm,
                            pmMax: g.pmMax || null, chaveTexto: 'mag.' + g.id });
    }
  }
}
for (const cat of ['ataque', 'forte', 'defesa']) {
  for (const g of (M.MAGIAS_UNIVERSAIS[cat] || [])) {
    despeja(g, 'magia', { elemento: 'Universal', categoria: cat, pm: g.pm,
                          pmMax: g.pmMax || null, chaveTexto: 'mag.' + g.id });
  }
}
// ── Vantagens e desvantagens ──
for (const [id, v] of Object.entries(M.VANTAGENS)) {
  despeja({ id, ...v }, 'vantagem', { custo: v.custo, chaveTexto: 'vd.' + id });
}
for (const [id, d] of Object.entries(M.DESVANTAGENS)) {
  despeja({ id, ...d }, 'desvantagem', { custo: d.custo, chaveTexto: 'vd.' + id });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(dados, null, 2));
  process.exit(0);
}

// ── À vista ──
let n = 0;
const grupo = g => dados.filter(g);
const bloco = (titulo, itens) => {
  if (!itens.length) return;
  console.log('\n' + '═'.repeat(70) + '\n' + titulo + '\n' + '═'.repeat(70));
  for (const d of itens) {
    n++;
    const custo = d.tipo === 'magia'
      ? (d.pmMax ? d.pm + '–' + d.pmMax + ' PM' : d.pm === 0 ? 'sem custo' : d.pm + ' PM')
      : (d.custo > 0 ? 'custa ' + d.custo : 'rende ' + Math.abs(d.custo));
    console.log('\n' + String(n).padStart(2) + '. ' + (d.nome || '‹SEM NOME›') +
                '   [' + d.id + ']   ' + custo);
    if (d.categoria) console.log('    gaveta:   ' + d.elemento + ' · ' + d.categoria);
    console.log('    mecânica: ' + (d.mecanica.join('  ') || '‹nenhuma›'));
    console.log('    texto:    ' + (d.desc || '‹SEM DESCRIÇÃO›'));
    const cob = [];
    if (d.formulaAuditada) cob.push('fórmula de ataque auditada');
    if (d.testePróprio)    cob.push('efeito próprio auditado');
    console.log('    provas:   ' + (cob.join(' · ') || '⚠ NENHUMA — por olhar'));
    if (d.orfas.length)  console.log('    ⚠ o motor nunca lê: ' + d.orfas.join(', '));
    if (d.semTexto)      console.log('    ⚠ falta nome ou descrição');
  }
};

for (const el of ['Fogo', 'Terra', 'Água', 'Vento', 'Sombra', 'Universal']) {
  bloco('MAGIAS · ' + el.toUpperCase(), grupo(d => d.elemento === el));
}
bloco('VANTAGENS', grupo(d => d.tipo === 'vantagem'));
bloco('DESVANTAGENS', grupo(d => d.tipo === 'desvantagem'));

const orfas = dados.filter(d => d.orfas.length);
const semTexto = dados.filter(d => d.semTexto);
console.log('\n' + '─'.repeat(70));
console.log(n + ' no total.');
console.log(orfas.length + ' com propriedade que o motor nunca lê' +
            (orfas.length ? ': ' + orfas.map(d => d.id + '(' + d.orfas.join(',') + ')').join(', ') : ''));
const nus = dados.filter(d => !d.formulaAuditada && !d.testePróprio);
console.log(nus.length + ' sem prova nenhuma — é por aqui que se começa:');
nus.forEach(d => console.log('   · ' + d.id + '  ' + d.nome));
console.log(semTexto.length + ' sem nome ou descrição' +
            (semTexto.length ? ': ' + semTexto.map(d => d.id).join(', ') : ''));
