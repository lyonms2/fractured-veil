// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DA ORDEM DA EQUIPA
//
// O motor abre a luta com o PRIMEIRO da lista (ativoA: 0) e, quando
// esse cai, faz entrar o seguinte que ainda esteja de pé — por ordem.
// Portanto gs.equipa não é um conjunto: é uma fila, e a posição decide
// quem apanha o primeiro golpe.
//
// Isso estava invisível e incontrolável: a ordem era a de clique, não
// se via em lado nenhum, e para a mudar era preciso tirar os três e
// voltar a pô-los na ordem certa. Estas provas seguram as duas pontas —
// que a fila se mexe como o jogador manda, e que o motor a respeita.
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');

const A = require('./auditoria-base.js');
const { M } = A;

// equipa.js fala com gs e avatarSlots como globais; monta-se um mundo
// pequeno à volta dele.
function mundo(slots, equipa) {
  const ctx = { gs: { equipa }, avatarSlots: slots };
  const api = new Function('gs', 'avatarSlots',
    rd('js/equipa.js') +
    'return { equipaIdx, equipaDoJogador, alternarNaEquipa, moverNaEquipa,' +
    '         porPrimeiroNaEquipa, posicaoNaEquipa, estaNaEquipa, gs };'
  )(ctx.gs, ctx.avatarSlots);
  return api;
}
const vivo = (nome, extra) => Object.assign({ nome, hatched: true, elemento: 'Fogo',
  raridade: 'Comum', nivel: 5, seed: 1 }, extra || {});
const TRES = [vivo('Ana'), vivo('Beto'), vivo('Caio'), vivo('Dita')];

console.log('\n═══ A FILA DA EQUIPA ═══\n');

// ── A ordem escolhida é a ordem guardada ──
{
  const e = mundo(TRES, [2, 0, 1]);
  A.ver('a fila sai na ordem em que foi guardada',
        e.equipaDoJogador().map(s => s.nome).join(' → ') === 'Caio → Ana → Beto',
        e.equipaDoJogador().map(s => s.nome).join(' → '));
}

// ── Mover para trás e para a frente ──
{
  const e = mundo(TRES, [0, 1, 2]);
  A.ver('adiantar o 3.º põe-no em 2.º',
        e.moverNaEquipa(2, -1) && e.gs.equipa.join(',') === '0,2,1', e.gs.equipa.join(','));
  A.ver('adiantá-lo outra vez põe-no a abrir a luta',
        e.moverNaEquipa(2, -1) && e.gs.equipa.join(',') === '2,0,1', e.gs.equipa.join(','));
  A.ver('e depois disso já não há para onde subir',
        e.moverNaEquipa(2, -1) === false, e.gs.equipa.join(','));
}
{
  const e = mundo(TRES, [0, 1, 2]);
  A.ver('atrasar o 1.º manda-o para 2.º',
        e.moverNaEquipa(0, 1) && e.gs.equipa.join(',') === '1,0,2', e.gs.equipa.join(','));
  A.ver('o último não pode ser atrasado',
        e.moverNaEquipa(2, 1) === false, e.gs.equipa.join(','));
}
{
  const e = mundo(TRES, [0, 1, 2]);
  A.ver('pôr à frente salta a fila de uma vez',
        e.porPrimeiroNaEquipa(2) && e.gs.equipa.join(',') === '2,0,1', e.gs.equipa.join(','));
  A.ver('quem já abre a luta não se move',
        e.porPrimeiroNaEquipa(2) === false, e.gs.equipa.join(','));
}
{
  const e = mundo(TRES, [0, 1]);
  A.ver('mexer em quem não está na equipa não faz nada',
        e.moverNaEquipa(3, -1) === false && e.gs.equipa.join(',') === '0,1', e.gs.equipa.join(','));
}

// ── A posição que a interface mostra é a real ──
{
  const e = mundo(TRES, [2, 0, 1]);
  A.ver('a posição mostrada bate certo com a fila',
        e.posicaoNaEquipa(2) === 1 && e.posicaoNaEquipa(0) === 2 && e.posicaoNaEquipa(1) === 3
        && e.posicaoNaEquipa(3) === 0,
        `Caio ${e.posicaoNaEquipa(2)} · Ana ${e.posicaoNaEquipa(0)} · Beto ${e.posicaoNaEquipa(1)} · fora ${e.posicaoNaEquipa(3)}`);
}

// ── Um morto sai da fila e quem vem atrás sobe ──
{
  const slots = [vivo('Ana'), vivo('Beto', { dead: true }), vivo('Caio')];
  const e = mundo(slots, [0, 1, 2]);
  A.ver('um avatar morto sai da fila sozinho',
        e.equipaDoJogador().map(s => s.nome).join(' → ') === 'Ana → Caio',
        e.equipaDoJogador().map(s => s.nome).join(' → '));
}
{
  const slots = [vivo('Ana', { listed: true }), vivo('Beto'), vivo('Caio')];
  const e = mundo(slots, [0, 1, 2]);
  A.ver('quem está à venda perde o lugar, e o seguinte passa a abrir',
        e.equipaDoJogador()[0].nome === 'Beto', e.equipaDoJogador().map(s => s.nome).join(' → '));
}

// ── E o motor obedece: quem está em 1.º é quem entra ──
{
  const e = mundo(TRES, [2, 0, 1]);
  const equipa = e.equipaDoJogador().map((s, k) => ({
    nome: s.nome, elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: 10 + k }));
  const luta = M.combate3dtIniciar(equipa, equipa, 7, { historico: true });
  A.ver('o motor põe em campo o 1.º da fila, e mais ninguém',
        luta.ativoA === 0 && luta.A[luta.ativoA].nome === 'Caio',
        `ativoA=${luta.ativoA} → ${luta.A[luta.ativoA].nome} (a fila era ${equipa.map(x => x.nome).join(' → ')})`);
}

const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
