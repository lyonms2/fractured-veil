/* ═══════════════════════════════════════════════════════════════════
   UM NOME SÓ TEM UM DONO

   Decidido pelo dono do jogo em 26/09/2026: dois jogadores não podem
   se chamar igual, e dois avatares também não — no jogo inteiro, e não
   só dentro da sua colônia.

   O motivo é o de sempre com nomes: eles são lidos por gente. Uma
   certidão que diz "criado por Leo" só vale alguma coisa se houver um
   Leo. Dois avatares chamados "Kael" no mercado são dois anúncios que
   ninguém consegue distinguir, e no ranking do PvP são duas linhas que
   parecem a mesma pessoa jogando duas vezes.

   ── ONDE A VERDADE MORA ──

   Num índice do Firestore, a coleção `nomes`, um documento por nome
   tomado. Está fechada ao cliente nas regras: quem reserva é o servidor
   (api/nomes.js), numa transação que falha se o documento já existir —
   exatamente o que o `codigosAmigo` já fazia para os códigos de amigo.

   Não se confia no cliente para isso, e não é por desconfiança dele: é
   que duas pessoas escrevendo "Kael" no mesmo segundo, em máquinas
   diferentes, não têm como saber uma da outra. Só quem está no meio
   sabe.

   ── A CHAVE, E POR QUE ELA NÃO É O NOME ──

   "Kael", "kael" e "KAEL" são o mesmo nome para quem lê, e seriam três
   documentos diferentes num índice que guardasse o texto cru. Pior:
   "Káel" com acento passaria a ser um quarto, e é assim que se faz um
   impostor — um nome que se lê igual ao de outra pessoa e que o
   servidor jura ser diferente.

   Então o índice é indexado pela CHAVE: minúsculas, sem acentos,
   espaços colapsados. O nome como foi escrito fica guardado dentro do
   documento, porque é ele que se mostra.

   O que a chave NÃO faz: juntar "Kael" e "Ka-el", ou "Kael" e "Ka el".
   Um hífen e um espaço são visíveis, e quem lê vê que são dois nomes.
   Apagá-los seria recusar nomes legítimos em nome de uma confusão que
   ninguém faz.

   ── O PREFIXO ──

   Um jogador chamado Kael e um avatar chamado Kael não competem pelo
   mesmo nome: são coisas de espécies diferentes, e ninguém confunde o
   dono com o bicho. Por isso a chave leva um prefixo, `j:` ou `a:`, e
   as duas famílias vivem na mesma coleção sem se esbarrarem.

   Este arquivo roda nos dois lados — no navegador, para avisar antes
   de mandar, e no Node, dentro do api/nomes.js, que é quem decide.
   ═══════════════════════════════════════════════════════════════════ */

/* Os tamanhos são os que as duas caixas já usavam (o maxlength do
   index.html), e ficam aqui para o servidor cobrar os mesmos. */
const NOME_JOGADOR_MIN = 2;
const NOME_JOGADOR_LIM = 18;
const NOME_AVATAR_MIN  = 2;
const NOME_AVATAR_LIM  = 16;

/* A limpeza, que é a mesma dos dois lados desde antes disto: letras,
   números, espaços e hífen. Sem ela entra HTML, e estes nomes vão
   parar em fichas, listas e anúncios. */
function nomeLimpo(bruto, limite) {
  return String(bruto == null ? '' : bruto)
    .replace(/[^\p{L}\p{N}\s\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limite || NOME_JOGADOR_LIM);
}

/* A chave do índice. Devolve '' para o que não serve como nome —
   quem chama trata o vazio como recusa, e não como "nome livre".

   O `normalize('NFD')` separa a letra do acento e o replace apaga o
   acento: é assim que "Káel" e "Kael" viram a mesma chave. */
function nomeChave(bruto, tipo) {
  const limite = tipo === 'avatar' ? NOME_AVATAR_LIM : NOME_JOGADOR_LIM;
  const minimo = tipo === 'avatar' ? NOME_AVATAR_MIN : NOME_JOGADOR_MIN;
  const limpo  = nomeLimpo(bruto, limite);
  if (limpo.length < minimo) return '';
  const chave = limpo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return (tipo === 'avatar' ? 'a:' : 'j:') + chave;
}

/* Por que um nome foi recusado, antes mesmo de perguntar ao servidor.
   Devolve null quando está tudo bem — o null aqui quer dizer "nenhum
   problema", e é o que quem chama espera.

   Só fala da FORMA. Se o nome já é de alguém, isso o servidor é que
   sabe; este arquivo nunca teria como. */
function nomeProblema(bruto, tipo) {
  const limite = tipo === 'avatar' ? NOME_AVATAR_LIM : NOME_JOGADOR_LIM;
  const minimo = tipo === 'avatar' ? NOME_AVATAR_MIN : NOME_JOGADOR_MIN;
  const limpo  = nomeLimpo(bruto, limite);
  if (!limpo)                 return 'vazio';
  if (limpo.length < minimo)  return 'curto';
  // Um nome só de espaços e hífens sobrevive à limpeza e não é nome:
  // "- -" tem três caracteres e nenhuma letra.
  if (!/[\p{L}\p{N}]/u.test(limpo)) return 'vazio';
  return null;
}

if (typeof window !== 'undefined') {
  window.nomeLimpo    = nomeLimpo;
  window.nomeChave    = nomeChave;
  window.nomeProblema = nomeProblema;
  window.NOME_JOGADOR_LIM = NOME_JOGADOR_LIM;
  window.NOME_AVATAR_LIM  = NOME_AVATAR_LIM;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOME_JOGADOR_MIN, NOME_JOGADOR_LIM, NOME_AVATAR_MIN, NOME_AVATAR_LIM,
    nomeLimpo, nomeChave, nomeProblema,
  };
}
