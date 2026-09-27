/* ═══════════════════════════════════════════════════════════════════
   A ENERGIA ENQUANTO O MUNDO ESTÁ PARADO

   O mundo para de duas formas, e para o avatar elas são a mesma: a aba
   escondida e o botão de pausa. Enquanto está parado nada decai, a
   idade não avança, e a evolução não anda — isso já era assim.

   O que muda aqui é a energia. Ela passa a subir com o mundo parado:

     dormindo   +2 por ciclo   (o dobro com o Amuleto do Sono)
     acordado   +1 por ciclo

   ── POR QUE O ACORDADO TAMBÉM DESCANSA ──

   Antes, só quem tivesse ido dormir antes de fechar a aba recuperava
   alguma coisa; quem fechasse acordado voltava no dia seguinte com a
   mesma energia com que saiu. E como a energia só se recupera dormindo,
   a única forma de voltar com o avatar pronto para jogar era lembrar de
   pô-lo na cama antes de sair — um ritual que o jogo nunca ensinou e
   que castiga justamente quem fecha a aba às pressas.

   Um por ciclo é lento de propósito: são 100 minutos parado para encher
   do zero, contra 25 de quem foi dormir. Continua valendo a pena mandar
   dormir; deixa de ser obrigatório.

   Regra do dono do jogo, 27/09/2026.

   ── O QUE ESTE ARQUIVO NÃO FAZ ──

   Não sabe que horas são, não toca na tela e não escreve no Firestore.
   Recebe números e devolve números, e é por isso que o
   tools/testar-energia.js consegue rodá-lo no Node e conferir as contas
   sem abrir um navegador. Quem sabe o tempo decorrido são os três
   lugares que o chamam: a volta da aba escondida e a despausa (ambos em
   js/main.js) e a entrada no jogo (js/auth.js).
   ═══════════════════════════════════════════════════════════════════ */

const PARADO_ENERGIA_DORMINDO = 2;   // por ciclo de 60 s
const PARADO_ENERGIA_ACORDADO = 1;

/* Quanto um avatar recupera por ciclo com o mundo parado.

   `multSono` é o efeito do Amuleto do Sono (sleepEnergyMult), que só
   vale a dormir: o amuleto promete "recupera o dobro dormindo" e não
   "recupera o dobro parado". Quem está acordado leva o ritmo raso,
   tenha o que tiver vestido. */
function energiaPorCicloParado(dormindo, multSono) {
  return dormindo
    ? PARADO_ENERGIA_DORMINDO * (multSono > 0 ? multSono : 1)
    : PARADO_ENERGIA_ACORDADO;
}

/* O descanso de UM avatar, em `ciclos` de mundo parado.

   Devolve sempre um objeto novo — nada é alterado por baixo de quem
   chama, para o chamador decidir o que grava. `acordou` é verdadeiro só
   quando o avatar estava dormindo e encheu agora: é o que dispara a
   mensagem de "acordou descansado", e não pode disparar para quem já
   estava acordado.

   Ciclos negativos ou absurdos não acontecem num jogo, mas acontecem num
   relógio de sistema que andou para trás: o Math.max protege disso sem
   precisar que o chamador se lembre. */
function descansoParado(energia, dormindo, ciclos, multSono) {
  const antes = Math.max(0, Math.min(100, Number(energia) || 0));
  const n = Math.max(0, Math.floor(Number(ciclos) || 0));

  if (n === 0 || antes >= 100) {
    return { energia: antes, dormindo: !!dormindo && antes < 100, ganho: 0, acordou: false };
  }

  const depois = Math.min(100, antes + n * energiaPorCicloParado(!!dormindo, multSono));
  const cheio  = depois >= 100;

  return {
    energia:  depois,
    dormindo: !!dormindo && !cheio,   // encheu dormindo, acorda
    ganho:    depois - antes,
    acordou:  !!dormindo && cheio,
  };
}

/* Quantos ciclos inteiros cabem num intervalo em milissegundos.

   Inteiros, e não fracionados, de propósito: é a mesma conta do ciclo
   ao vivo (js/gametick.js corre a cada 60 s), e assim trinta segundos
   parado não rendem meia energia. */
function ciclosDe(ms) {
  return Math.max(0, Math.floor((Number(ms) || 0) / 60000));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PARADO_ENERGIA_DORMINDO, PARADO_ENERGIA_ACORDADO,
    energiaPorCicloParado, descansoParado, ciclosDe,
  };
}
