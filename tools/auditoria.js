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
/* O auditoria-persistentes.js saiu com o js/combate-pve.js.

   Ele lia o CARTAO daquela arena como texto, para conferir que todo o
   estado que dura mais do que um turno tem marca visivel. Com a arena
   apagada ficou sem assunto: os estados que enumerava — veneno, furia,
   armaduraDobrada, ocultado — sao do motor 3D&T e nenhum existe no novo.

   A pergunta dele continua a valer e volta, feita aos seis estados do
   Fabula Ultima, quando o resto do 3D&T sair. */
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
