// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DOS PAPÉIS
//
// Os outros ficheiros perguntam "esta magia funciona?". Este pergunta
// outra coisa: "a gaveta em que ela está diz a verdade sobre ela?".
//
//   FORTE         bate, e é barata — dá para lançar muitas vezes
//   MUITO FORTE   bate mais, e custa mais
//   DEFENSIVA     não faz dano nenhum
//   SUPORTE       cura, rouba, drena ou melhora quem a lança
//
// ── O QUE ESTE FICHEIRO ERA ──
//
// Guardava a identidade dos CINCO ELEMENTOS: o Fogo bate mais forte que
// todos e não tem defesa nenhuma, a Terra é a única que dobra a
// Armadura, a Água cura-se, o Vento esquiva, a Sombra drena. Os
// elementos saíram do jogo — cada avatar é único e as magias dele saem
// do DNA — e essas cinco perguntas deixaram de ter sujeito.
//
// A pergunta em si não deixou. Uma mudança de balanceamento continua a
// poder apagar a diferença entre as gavetas sem ninguém dar por ela, e é
// exactamente isso que estas verificações apanham. O que mudou foi o
// sujeito: eram cinco elementos, são quatro papéis.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;
const media = a => a.reduce((x, y) => x + y, 0) / a.length;

/* Quanto uma magia bate, para um avatar dado. Só serve para comparar
   gavetas entre si — o número absoluto não interessa a ninguém. */
function pancada(g, H, F) {
  if (!g || !g.fa) return 0;
  const fa = g.fa;
  const pm = g.pmMax || g.pm;
  const extra = Math.max(0, pm - g.pm);
  return (fa.F ? F : 0) + (fa.H ? H : 0) + (fa.fixo || 0)
       + (fa.dados || 0) * 3.5
       + (fa.fixoPorPM || 0) * extra
       + (fa.dadosPorPM || 0) * extra * 3.5;
}

const gaveta = p => M.MAGIAS[p] || [];

console.log('\n═══ OS QUATRO PAPÉIS ═══\n');

// ── Quem bate, bate mesmo ──
{
  const H = 4, F = 2;
  const f  = media(gaveta('forte').map(g => pancada(g, H, F)));
  const mf = media(gaveta('muito_forte').map(g => pancada(g, H, F)));
  A.ver('MUITO FORTE bate mais do que FORTE',
        mf > f, `com H${H}: forte ${f.toFixed(1)} · muito forte ${mf.toFixed(1)}`);

  const pmF  = media(gaveta('forte').map(g => g.pm));
  const pmMF = media(gaveta('muito_forte').map(g => g.pm));
  A.ver('e custa mais — é o que separa as duas gavetas',
        pmMF > pmF, `PM médio: forte ${pmF.toFixed(1)} · muito forte ${pmMF.toFixed(1)}`);

  /* O corte está nos 10 PM, e é ele que define a gaveta. Se um dia
     alguém puser uma magia de 3 PM nos muito fortes, a diferença de
     cima esbate-se e ninguém dá por isso — esta pergunta apanha. */
  A.ver('nenhuma FORTE custa 10 PM ou mais',
        gaveta('forte').every(g => g.pm < 10),
        gaveta('forte').filter(g => g.pm >= 10).map(g => g.id).join(', ') || 'nenhuma');
  A.ver('e nenhuma MUITO FORTE custa menos do que isso',
        gaveta('muito_forte').every(g => g.pm >= 10),
        gaveta('muito_forte').filter(g => g.pm < 10).map(g => g.id).join(', ') || 'nenhuma');
}

// ── A defensiva não bate ──
{
  const batem = gaveta('defensiva').filter(g => g.fa);
  /* Isto era impossível de garantir com os elementos: o Fogo não tinha
     magia defensiva nenhuma, e o slot de defesa dele era tapado com um
     segundo ataque. A ficha tinha de lhe chamar "Segundo ataque" para
     não pôr um rótulo azul por cima de uma bola de fogo. Com uma gaveta
     só para toda a gente, a promessa passa a poder ser cumprida. */
  A.ver('DEFENSIVA — nenhuma faz dano',
        batem.length === 0,
        batem.length ? batem.map(g => g.id).join(', ') : `${gaveta('defensiva').length} magias, nenhuma com FA`);

  /* Defender é mais do que levantar armadura: congelar, petrificar e
     cegar são maneiras de NÃO LEVAR, e é por isso que o controlo mora
     nesta gaveta. Foi decisão e não descuido — numa divisão de quatro
     não há gaveta própria para ele, e entre defender e curar, quem
     impede o golpe está do lado de quem o segura. */
  const defende = g => g.armadura || g.armaduraDobra || g.armaduraPorPM || g.barreira
                    || g.bonusFD || g.bonusFDPorPM || g.esquivaBonus || g.invulneravel
                    || g.ocultacao || g.imuneEspiritual || g.petrifica || g.congela
                    || g.cegueira || g.alvoIndefeso || g.destroiAlma || g.debuffR;
  const inuteis = gaveta('defensiva').filter(g => !defende(g));
  A.ver('e todas fazem alguma coisa por quem as lança',
        inuteis.length === 0,
        inuteis.length ? inuteis.map(g => g.id).join(', ') : 'as ' + gaveta('defensiva').length + ' defendem ou atrapalham');
}

// ── O suporte dá ──
{
  const da = g => g.cura || g.curaAliado || g.roubaVida || g.drenaPM
                || g.buffForca || g.buffFuria || g.subirCarac || g.vorpal;
  const vazias = gaveta('suporte').filter(g => !da(g));
  A.ver('SUPORTE — todas curam, roubam, drenam ou melhoram',
        vazias.length === 0,
        vazias.length ? vazias.map(g => g.id).join(', ') : gaveta('suporte').length + ' magias');

  // E nenhuma das outras gavetas faz isso, senão a divisão não divide.
  const forasteiras = ['forte', 'muito_forte', 'defensiva']
    .flatMap(p => gaveta(p).filter(da).map(g => p + ':' + g.id));
  A.ver('e só ela o faz — as outras gavetas não curam nem drenam',
        forasteiras.length === 0, forasteiras.join(', ') || 'nenhuma');
}

// ── As quatro têm mesmo com que encher ──
{
  const contas = M.MAGIA_PAPEIS.map(p => [p, gaveta(p).length]);
  console.log('       ' + contas.map(([p, n]) => p + ' ' + n).join('  ·  '));

  /* Uma gaveta com uma magia só não é uma escolha: todos os avatares que
     lá chegam recebem a mesma, e a índole do DNA não tem por onde
     inclinar nada. Três é o mínimo para haver sorteio a sério. */
  const magras = contas.filter(([, n]) => n < 3);
  A.ver('nenhuma gaveta tem menos de três magias',
        magras.length === 0,
        magras.length ? magras.map(([p, n]) => p + ' tem ' + n).join(', ')
                      : 'a mais magra tem ' + Math.min(...contas.map(([, n]) => n)));

  const total = contas.reduce((t, [, n]) => t + n, 0);
  A.ver('e as quatro juntas dão o catálogo inteiro',
        total === M.todasAsMagias().length,
        total + ' de ' + M.todasAsMagias().length);
}

// ── E o preço deixa a índole trabalhar ──
{
  /* A índole do DNA inclina a escolha pelo PREÇO dentro da gaveta (ver
     js/magias.js): a lâmina puxa para as caras, a fonte para as
     baratas. Se uma gaveta tivesse tudo ao mesmo preço, o feitio do
     avatar não teria por onde se exprimir ali. */
  const semEscolha = M.MAGIA_PAPEIS.filter(p => {
    const pms = gaveta(p).map(g => g.pm);
    return Math.min(...pms) === Math.max(...pms);
  });
  A.ver('em todas as gavetas há preços diferentes — é por aí que a índole escolhe',
        semEscolha.length === 0,
        semEscolha.join(', ') || M.MAGIA_PAPEIS.map(p => {
          const pms = gaveta(p).map(g => g.pm);
          return p + ' ' + Math.min(...pms) + '–' + Math.max(...pms);
        }).join(' · '));
}
