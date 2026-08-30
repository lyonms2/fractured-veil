// Corre as três auditorias do combate de uma vez:
//   node tools/auditoria.js
//
// Não mede balanceamento. Pergunta a cada magia, vantagem, desvantagem
// e regra do manual uma coisa só: o efeito que está escrito acontece
// mesmo em jogo? Volte a correr sempre que o motor mudar.
require('./auditoria-magias.js');
require('./auditoria-vantagens.js');
require('./auditoria-regras.js');
require('./auditoria-papeis.js');
require('./auditoria-persistentes.js');
require('./auditoria-duracoes.js');
require('./auditoria-equipa.js');
// As magias que defendem. Nasceram por olhar: as provas antigas
// cresceram todas a partir do que ataca.
require('./auditoria-defesas.js');
// As duas magias que escolhem alvo — a primeira vez que este combate
// olha para lá de quem está em campo.
require('./auditoria-alvos.js');
// As duas que ninguém tinha olhado — o Toque Ardente e a Brecha
// Conhecida. Só apareceram quando a ferramenta da cobertura deixou
// de mentir sobre si própria.
require('./auditoria-duas.js');


/* E a varredura ao padrão que rendeu quatro defeitos: um limite
   guardado por quem PEDE a acção em vez de por quem a FAZ. Corre com o
   resto porque é assim que se apanha o quinto. */
require('./guardas.js');
