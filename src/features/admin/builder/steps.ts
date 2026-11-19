import { pageBlocksHref } from "@/features/admin/games/central";

/**
 * As etapas da lateral "Estrutura da página" (Figma 3909:2804; desde 2026-11-09 são 7).
 *
 * A ordem, os números e os dois textos de cada linha são os do arquivo. O
 * número NÃO é o índice do array: ele está escrito no desenho e é o que a
 * pessoa usa para falar da etapa ("trava na 6"), então fica explícito aqui — se
 * amanhã a ordem visual mudar, o número não muda junto por acidente.
 *
 * `id` é o que viaja no estado da tela e na URL (`?etapa=titulos`), em
 * português como todo endereço voltado ao usuário — a mesma regra do `?pagina=`
 * da vitrine.
 */

export type BuilderStepId = "titulos" | "banner" | "nome" | "servidores" | "categorias" | "descricao" | "ordem";

export type BuilderStep = {
  id: BuilderStepId;
  /** O número desenhado na pastilha. */
  number: number;
  title: string;
  hint: string;
  /**
   * Etapa que NÃO edita nada aqui — leva para outra tela do painel. Desde
   * 2026-11-18 só "Blocos e ordem" (vai ao construtor da página).
   */
  href?: (gameId: string, gameSlug: string) => string;
  /** Atalho para tela só-ADMIN: a lateral não o oferece a quem não tem acesso. */
  adminOnly?: boolean;
};

/**
 * As 7 etapas (2026-11-09, lista do usuário). Saíram:
 *  - "Abas da loja" e "Lista de produtos": eram só atalhos — abas e produtos
 *    vivem na Central do jogo (Abas e produtos), que a barra do topo já mostra;
 *  - "Logo do game": a logo se troca na Central → Visão geral.
 * `?etapa=` antigo (logo, produtos…) abre a pré-visualização, sem erro.
 */
export const BUILDER_STEPS: readonly BuilderStep[] = [
  { id: "titulos", number: 1, title: "Títulos", hint: "Altere os títulos" },
  { id: "banner", number: 2, title: "Banner Principal", hint: "Altere o banner" },
  { id: "nome", number: 3, title: "Nome do game", hint: "Defina o nome do game" },
  {
    // Desde 2026-09-30 (admin-games-ux.md, Etapa 2) os servidores são editados
    // na Visão geral da Central; aqui só aparecem (o salvamento do Builder
    // ainda os envia — ver `BuilderShell`).
    id: "servidores",
    number: 4,
    title: "Servidores",
    hint: "Editados na visão geral do jogo",
  },
  {
    id: "categorias",
    number: 5,
    // Só as GLOBAIS (valem em todo servidor e toda aba). As de um servidor +
    // aba ficam em Jogos → Categorias (2026-09-28).
    title: "Categorias globais",
    hint: "Valem para todas as abas",
  },
  // Dúvidas DESTE jogo, acima das Dúvidas globais da loja (2026-11-09).
  { id: "descricao", number: 6, title: "Descrição", hint: "Dúvidas do jogo, acima das globais" },
  // NÃO está no arquivo do Figma. Era uma tela SÓ de ordem dos blocos (arrastar
  // e esconder). Desde 2026-11-18 é atalho para o construtor da página do jogo
  // (pedido do usuário: "tirar a página de somente ajustar a ordem, tem que ter
  // só a tela de builder"). Motivo: publicada a página no construtor, a loja
  // segue a ordem DE LÁ e esta etapa não mudava nada — duas telas para a mesma
  // coisa, uma delas sem efeito. O construtor abre com a ordem que esta etapa
  // gravou (`getAdminPage`), então nada se perde.
  {
    id: "ordem",
    number: 7,
    title: "Blocos e ordem",
    hint: "Abre o construtor da página",
    href: (gameId) => pageBlocksHref(gameId),
  },
];

/** As etapas que a lateral mostra para o cargo (ver `adminOnly`). */
export function visibleSteps(canManage: boolean): readonly BuilderStep[] {
  return canManage ? BUILDER_STEPS : BUILDER_STEPS.filter((step) => !step.adminOnly);
}

export function stepById(id: string): BuilderStep | undefined {
  return BUILDER_STEPS.find((step) => step.id === id);
}
