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
   * Etapa que NÃO edita nada aqui — leva para outra tela do painel. Nenhuma
   * usa desde 2026-11-09 (os atalhos "Abas da loja" e "Lista de produtos"
   * saíram); a lateral continua sabendo desenhar uma, se voltar a existir.
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
  // NÃO está no arquivo do Figma. Entrou a pedido do usuário: "tenho que poder
  // arrastar a lista de produtos pra cima do banner principal".
  { id: "ordem", number: 7, title: "Ordem da página", hint: "Arraste e esconda blocos" },
];

/** As etapas que a lateral mostra para o cargo (ver `adminOnly`). */
export function visibleSteps(canManage: boolean): readonly BuilderStep[] {
  return canManage ? BUILDER_STEPS : BUILDER_STEPS.filter((step) => !step.adminOnly);
}

export function stepById(id: string): BuilderStep | undefined {
  return BUILDER_STEPS.find((step) => step.id === id);
}
