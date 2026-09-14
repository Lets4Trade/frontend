/**
 * As medidas da moldura das telas do painel.
 *
 * ── Por que existe uma constante ───────────────────────────────────────────
 * Cada tela do painel nasceu de um nó diferente do Figma, e cada nó tem o
 * conteúdo numa altura própria: as listagens começam 34–37px abaixo do
 * cabeçalho, o builder 27, e os cards de cadastro 184. Copiadas uma a uma, essas
 * medidas viraram TRÊS vãos diferentes no mesmo painel — e quem navega entre as
 * abas vê o conteúdo pular a cada troca.
 *
 * O arquivo justifica cada número isoladamente: os 184 vêm de um card de 606px
 * centrado numa página curta, onde ele fica equilibrado. Na aplicação a página é
 * mais alta e o mesmo vão vira um bloco de preto que o usuário apontou como
 * grande demais — e estava certo.
 *
 * ── O valor ────────────────────────────────────────────────────────────────
 * 50px é o vão de seção do projeto inteiro: é o `DEFAULT_GAP` de
 * `features/game/sections.ts` e o `mt-[50px]` que separa blocos na vitrine e no
 * painel. Usá-lo aqui alinha o painel ao ritmo que o resto já tem, e fica entre
 * os 27 do builder e os 37 das listagens — perto do que o arquivo pede nas telas
 * onde ele é razoável, longe do exagero das outras.
 *
 * Fidelidade ao Figma é o padrão deste projeto; esta é uma exceção declarada, e
 * o motivo é que a fidelidade tela-a-tela produziu uma inconsistência que só se
 * enxerga navegando — coisa que o arquivo, olhado nó a nó, não mostra.
 */
export const ADMIN_SHELL =
  "mx-auto w-full max-w-[1920px] px-[50px] pt-[50px]" as const;
