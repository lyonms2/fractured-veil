// ══════════════════════════════════════════════════════════════════
// TEXTOS DA LINHAGEM, DA CERTIDÃO E DOS OVOS
// Português do Brasil e inglês.
//
// ── PORQUE É QUE ISTO É UM ARQUIVO NOVO ──
//
// Viviam no js/i18n-magias.js, que era o arquivo de textos do motor
// 3D&T — e foram-se com ele quando o motor saiu. A árvore genealógica, a
// certidão de nascimento, o registo da linhagem, os ovos e o cruzamento
// ficaram sem uma palavra, e o jogo passou a mostrar `cert.titulo` e
// `lin.primordial` a quem abrisse a árvore.
//
// Não tinham nada a ver com magia: estavam ali por vizinhança, e só se
// deu por isso ao correr a conta das chaves pedidas contra as
// registadas. É essa conta que devia ter corrido antes de apagar.
//
// Voltam palavra por palavra — são as mesmas de sempre — e agora num
// arquivo cujo nome diz de que falam.
// ══════════════════════════════════════════════════════════════════

window.registerStrings({
  'arv.avos':             'Avós',
  'arv.este':             'Este',
  'arv.filhos':           'Filhos',
  'arv.nota':             'Em destaque, os que ainda estão na sua colônia.',
  'arv.pais':             'Pais',
  'cert.anonimo':     'alguém sem nome',
  'cert.criador':     'Primeiro dono',
  'cert.donos':       'Donos anteriores',
  'cert.id':          'Registro',
  'cert.mae':         'Mãe',
  'cert.nada':        'desconhecido',
  'cert.nascimento':  'Nascimento',
  'cert.nome':        'Nome',
  'cert.pai':         'Pai',
  'cert.titulo':      '◈ CERTIDÃO',
  'egg.choca_em':         'Choca em {t}',
  'egg.filho_de':         'filho de {mae} e {pai}',
  'lin.abrir':            'Ver a certidão',
  'lin.abrir_registo':    'Ver o que ficou registado',
  'lin.cor':              'Cor',
  'lin.femea':            'Fêmea',
  'lin.historia':         'ausente',
  'lin.macho':            'Macho',
  'lin.morto':            '† morreu',
  'lin.na_altura':        'Na altura',
  'lin.primordial':       '✦ Primordial',
  'lin.primordial_curto': 'primordial',
  'lin.primordial_desc':  'Veio de dentro de uma ruptura, e não de dois pais. Não tem linhagem acima de si — é a raiz da que vier a haver.',
  'lin.registo_aviso':    'Este avatar não está mais na sua colônia. O que se vê é o retrato guardado no dia em que o ovo foi posto — a certidão dele viajou com ele.',
  'lin.registo_titulo':   '◈ REGISTRO',
  'lin.saiu':             'não é mais seu',
  'lin.sexo':             'Sexo',
  'repr.escolher':        'Escolha dois',
  'repr.feito':           '🥚 Ovo posto! Choca em {h} h.',
  // Cruzar pede a fase ADULTA (nível 11), e não a última — a última é a
  // do Ancião (27). Ver podeCruzar, em js/reproducao.js.
  'repr.sem_adultos':     'Nenhum avatar seu é adulto ainda. Cruzar pede a fase Adulta, no nível 11.',
  /* Os títulos da janela da linhagem e da de cruzar, e o botão da árvore.
     Saíram no commit "O 3D&T sai inteiro" junto com o js/i18n-magias.js e
     não voltaram com o resto — o index.html continuou a pedi-los, e o
     console enchia-se de "chave ausente". Voltam com as mesmas palavras. */
  'lin.titulo':           '🌳 LINHAGEM',
  'lin.btn':              'Ver a linhagem',
  'repr.titulo':          '❦ CRUZAR',
  'repr.sub':             'Dois adultos, um macho e uma fêmea. O filho herda um alelo de cada.',
  'repr.botao':           '❦ Cruzar',
}, {
  'arv.avos':             'Grandparents',
  'arv.este':             'This one',
  'arv.filhos':           'Children',
  'arv.nota':             'Highlighted: the ones still in your colony.',
  'arv.pais':             'Parents',
  'cert.anonimo':     'someone unnamed',
  'cert.criador':     'First owner',
  'cert.donos':       'Previous owners',
  'cert.id':          'Record',
  'cert.mae':         'Mother',
  'cert.nada':        'unknown',
  'cert.nascimento':  'Born',
  'cert.nome':        'Name',
  'cert.pai':         'Father',
  'cert.titulo':      '◈ CERTIFICATE',
  'egg.choca_em':         'Hatches in {t}',
  'egg.filho_de':         'child of {mae} and {pai}',
  'lin.abrir':            'See the certificate',
  'lin.abrir_registo':    'See what was recorded',
  'lin.cor':              'Color',
  'lin.femea':            'Female',
  'lin.historia':         'gone',
  'lin.macho':            'Male',
  'lin.morto':            '† died',
  'lin.na_altura':        'At the time',
  'lin.primordial':       '✦ Primordial',
  'lin.primordial_curto': 'primordial',
  'lin.primordial_desc':  'It came out of a rift, not from two parents. There is no lineage above it — it is the root of whatever comes after.',
  'lin.registo_aviso':    'This avatar is no longer in your colony. What you see is the portrait kept on the day the egg was laid — its certificate traveled with it.',
  'lin.registo_titulo':   '◈ RECORD',
  'lin.saiu':             'no longer yours',
  'lin.sexo':             'Sex',
  'repr.escolher':        'Pick two',
  'repr.feito':           '🥚 Egg laid! Hatches in {h} h.',
  'repr.sem_adultos':     'None of your avatars is an adult yet. Breeding needs the Adult phase, at level 11.',
  'lin.titulo':           '🌳 LINEAGE',
  'lin.btn':              'See the lineage',
  'repr.titulo':          '❦ BREED',
  'repr.sub':             'Two adults, one male and one female. The child inherits one allele from each.',
  'repr.botao':           '❦ Breed',
});
