// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DOS EFEITOS PERSISTENTES
//
// Um efeito que dura mais do que o turno em que nasce tem de passar em
// três coisas, e falhar qualquer uma delas torna-o inútil na prática:
//
//   1. LIGA        — alguma coisa no jogo consegue mesmo activá-lo
//   2. DURA        — o estado sobrevive ao fim do turno
//   3. VÊ-SE       — há uma marca no cartão ou uma linha no registo
//
// O veneno falhava a terceira: envenenava, tirava vida todo o turno, e
// não dizia nada — parecia avariado quando não estava. Este ficheiro
// existe para nenhum outro se esconder assim.
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const A = require('./auditoria-base.js');
const { M } = A;

const soco = () => ({ magia: null, pm: 0 });

// A interface, lida como texto: para saber se um estado tem marca no
// cartão sem precisar de um browser.
const UI  = fs.readFileSync(path.join(__dirname, '..', 'js', 'combate-pve.js'), 'utf8');
const _lut = UI.slice(UI.indexOf('function _pveLutador'), UI.indexOf('function _pveEquipa'));

// Todo o estado que um combatente carrega de um turno para o outro.
// Se acrescentar campo novo ao _c3criar, acrescente-o aqui também.
const PERSISTENTES = [
  { campo: 'veneno',          nome: 'Veneno',                  marca: 'c.veneno' },
  { campo: 'penalidade',      nome: '−1 em tudo (do veneno)',  marca: 'c.penalidade' },
  { campo: 'penalidadeR',     nome: '−R (dor persistente)',    marca: 'c.penalidadeR' },
  { campo: 'furia',           nome: 'Fúria',                   marca: 'c.furia' },
  { campo: 'indefeso',        nome: 'Indefeso',                marca: 'c.indefeso' },
  { campo: 'indefesoTurnos',  nome: 'Paralisia a contar',      marca: 'c.indefesoTurnos' },
  { campo: 'invulneravel',    nome: 'Corpo elemental',         marca: 'c.invulneravel' },
  { campo: 'barreira',        nome: 'Barreira',                marca: 'c.barreira' },
  { campo: 'imuneEspiritual', nome: 'Alma fechada',            marca: 'c.imuneEspiritual' },
  { campo: 'ocultado',        nome: 'Véu',                     marca: 'c.ocultado' },
  { campo: 'armaduraDobrada', nome: 'Armadura em dobro',       marca: 'c.armaduraDobrada' },
  { campo: 'vorpal',          nome: 'Lâmina que decapita',     marca: 'c.vorpal' },
  { campo: 'roubando',        nome: 'A drenar vida',           marca: 'c.roubando' },
  { campo: 'cegoAtaque',      nome: 'Cegueira (ataque)',       marca: 'c.cegoAtaque' },
  { campo: 'cegoEsquiva',     nome: 'Cegueira (esquiva)',      marca: 'c.cegoAtaque' },
  { campo: 'bonusA',          nome: 'Armadura extra',          marca: 'c.bonusA' },
  { campo: 'bonusF',          nome: 'Força extra',             marca: 'c.bonusF' },
  { campo: 'bonusFD',         nome: 'Defesa extra',            marca: 'c.bonusFD' },
  { campo: 'bonusEsquiva',    nome: 'Esquiva extra',           marca: 'c.bonusEsquiva' },
  { campo: 'assombrado',      nome: 'Assombrado',              marca: 'c.assombrado' },
  { campo: 'semFoco',         nome: 'Foco caído',              marca: 'c.semFoco' },
  { campo: 'sustentadas',     nome: 'Magias sustentadas',      marca: null,
    // Esta não tem marca própria de propósito: o que ela faz aparece nos
    // bónus que mantém de pé (A+2, FD+10...), e esses têm marca.
    semMarcaPorque: 'aparece nos bónus que mantém' },
];

console.log('\n═══ 1. TODO O ESTADO PERSISTENTE TEM MARCA NO CARTÃO ═══\n');
{
  const semMarca = PERSISTENTES.filter(p => p.marca && !_lut.includes(p.marca));
  A.ver('Nenhum estado persistente fica invisível no cartão',
        semMarca.length === 0,
        semMarca.length ? 'sem marca: ' + semMarca.map(p => p.nome).join(', ')
                        : `${PERSISTENTES.filter(p => p.marca).length} estados, todos com marca`);
}

console.log('\n═══ 2. O QUE ACONTECE NO FIM DO TURNO É DITO ═══\n');
{
  // O fim do turno cobra o veneno, a cura perpétua e as sustentadas.
  // Fazia tudo em silêncio; agora tem de devolver o que fez.
  const c = A.duelo({ a: { carac: { F: 2, H: 2, R: 6, A: 2 }, pv: 20 } }).A[0];
  c.veneno = true;
  const r1 = M._c3fimTurno(c);
  A.ver('O veneno tira vida E diz que tirou',
        !!r1 && r1.sangrou === 1, JSON.stringify(r1));

  const cura = { ...M.VANTAGENS.cura_perpetua, id: 'cura_perpetua' };
  const c2 = A.duelo({ a: { carac: { F: 2, H: 2, R: 6, A: 2 }, pv: 10, vant: cura } }).A[0];
  const r2 = M._c3fimTurno(c2);
  A.ver('A cura perpétua fecha o corpo E diz que fechou',
        !!r2 && r2.regenerou === 1, JSON.stringify(r2));

  const sust = { id: 'te_d2', pm: 3, porTurno: true, armadura: 2 };
  const c3 = A.duelo({ a: { carac: { F: 2, H: 5, R: 6, A: 2 }, pm: 10 } }).A[0];
  c3.sustentadas.push({ magia: sust, pm: 3 });
  const r3 = M._c3fimTurno(c3);
  A.ver('A magia sustentada cobra PM E diz quanto',
        !!r3 && r3.sustentouPor === 3, JSON.stringify(r3));

  c3.pm = 1;                                  // já não chega
  const r4 = M._c3fimTurno(c3);
  A.ver('Sem PM a sustentada cai E diz que caiu',
        !!r4 && r4.sustentadasCairam === 1, JSON.stringify(r4));

  const c5 = A.duelo({ a: { carac: { F: 2, H: 2, R: 6, A: 2 } } }).A[0];
  c5.indefeso = true; c5.indefesoTurnos = 2;
  M._c3fimTurno(c5);                          // ainda preso
  const r6 = M._c3fimTurno(c5);               // solta-se
  A.ver('A paralisia solta-se E diz que se soltou',
        !!r6 && r6.destravou === true && c5.indefeso === false, JSON.stringify(r6));
}

console.log('\n═══ 3. CADA UM DURA MESMO ALÉM DO TURNO ═══\n');
{
  // Passar por _c3fimTurno não pode apagar um efeito que devia durar.
  const duram = [
    ['veneno', c => { c.veneno = true; }, c => c.veneno],
    ['penalidade do veneno', c => { c.penalidade = 1; }, c => c.penalidade === 1],
    ['−R persistente', c => { c.penalidadeR = 1; }, c => c.penalidadeR === 1],
    ['cegueira', c => { c.cegoAtaque = 1; c.cegoEsquiva = 3; },
      c => c.cegoAtaque === 1 && c.cegoEsquiva === 3],
    ['barreira', c => { c.barreira = 8; }, c => c.barreira === 8],
    ['alma fechada', c => { c.imuneEspiritual = true; }, c => c.imuneEspiritual],
    ['assombrado', c => { c.assombrado = true; }, c => c.assombrado],
    ['foco caído', c => { c.semFoco = true; }, c => c.semFoco],
  ];
  const falharam = [];
  for (const [nome, ligar, continua] of duram) {
    const c = A.duelo({ a: { carac: { F: 2, H: 2, R: 8, A: 2 }, pv: 40, pm: 40 } }).A[0];
    ligar(c);
    M._c3fimTurno(c); M._c3fimTurno(c);       // dois turnos
    if (!continua(c)) falharam.push(nome);
  }
  A.ver('Nenhum efeito que devia durar é apagado pelo fim do turno',
        falharam.length === 0,
        falharam.length ? 'apagados: ' + falharam.join(', ') : `${duram.length} testados`);

  // E os que NÃO devem durar têm de cair
  const c = A.duelo({ a: { carac: { F: 2, H: 4, R: 8, A: 2 }, pm: 0 } }).A[0];
  c.esquivas = 3; c.indefeso = true; c.indefesoTurnos = 0;
  c.sustentadas.push({ magia: { id: 'x', pm: 5, porTurno: true }, pm: 5 });
  c.bonusA = 2; c.invulneravel = true; c.vorpal = true;
  M._c3fimTurno(c);
  A.ver('As esquivas do turno e o indefeso solto caem',
        c.esquivas === 0 && c.indefeso === false, `esquivas ${c.esquivas} · indefeso ${c.indefeso}`);
  A.ver('Sem PM, as sustentadas e tudo o que elas seguravam caem',
        c.sustentadas.length === 0 && c.bonusA === 0 && !c.invulneravel && !c.vorpal,
        `sustentadas ${c.sustentadas.length} · A+${c.bonusA} · corpo ${c.invulneravel} · vorpal ${c.vorpal}`);
}

console.log('\n═══ 4. E LIGAM-SE MESMO, EM BATALHA A SÉRIO ═══\n');
{
  const ELS = ['Fogo','Água','Terra','Vento','Sombra'], RARS = ['Comum','Raro','Lendário'];
  let s = 4242;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const esc = a => a[Math.floor(rnd() * a.length)];
  const eq = () => [0,1,2].map((_, i) => ({ nome: 'av' + i, elemento: esc(ELS),
    raridade: esc(RARS), nivel: 1 + Math.floor(rnd() * 25), seed: Math.floor(rnd() * 1e6) }));

  const vistos = {};
  for (let i = 0; i < 800; i++) {
    const e = M.combate3dtIniciar(eq(), eq(), i, { historico: true });
    while (!e.acabou) {
      M.combate3dtTurno(e);
      for (const c of [...e.A, ...e.B])
        for (const p of PERSISTENTES)
          if (c[p.campo] && (p.campo !== 'sustentadas' || c[p.campo].length))
            vistos[p.campo] = (vistos[p.campo] || 0) + 1;
    }
  }
  const nunca = PERSISTENTES.filter(p => !vistos[p.campo]);
  A.ver('Todo estado persistente chega mesmo a acontecer em jogo',
        nunca.length === 0,
        nunca.length ? 'nunca vistos: ' + nunca.map(p => p.nome).join(', ')
                     : PERSISTENTES.map(p => p.campo + ' ' + vistos[p.campo]).join(' · '));
}

const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
