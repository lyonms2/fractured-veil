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
