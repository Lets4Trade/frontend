/**
 * As nove etapas da lateral "Estrutura da página" (Figma 3909:2804).
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
import { centralHref } from "@/features/admin/games/central";

export type BuilderStepId =
  | "titulos"
  | "banner"
  | "logo"
  | "nome"
  | "categorias-principais"
  | "servidores"
  | "categorias"
  | "produtos"
  | "descricao"
  | "ordem";

export type BuilderStep = {
  id: BuilderStepId;
  /** O número desenhado na pastilha. */
  number: number;
  title: string;
  hint: string;
  /**
   * Etapa que NÃO edita nada aqui — leva para outra tela do painel.
   *
   * "Lista de produtos" e "Abas da loja" (desde 2026-09-28): os produtos já têm tela própria
   * (`/admin/produtos`), com filtro, busca, paginação e cadastro. Refazer isso
   * dentro do builder seria manter duas telas de produto que precisam concordar.
   */
  href?: (gameId: string, gameSlug: string) => string;
  /**
   * Atalho para tela só-ADMIN (Central do jogo, Produtos). O EDITOR abre o
   * Builder, mas essas telas dariam 404 para ele — a lateral não as oferece.
   */
  adminOnly?: boolean;
};

export const BUILDER_STEPS: readonly BuilderStep[] = [
  { id: "titulos", number: 1, title: "Títulos", hint: "Altere os títulos" },
  { id: "banner", number: 2, title: "Banner Principal", hint: "Altere o banner" },
  { id: "logo", number: 3, title: "Logo do game", hint: "Altere a logo" },
  { id: "nome", number: 4, title: "Nome do game", hint: "Defina o nome do game" },
  // Era "Categorias Principais" (os tipos que viravam abas). Desde 2026-09-28
  // as abas são POR JOGO, com nome, ícone e layout próprios, e vivem em Jogos →
  // Abas; a etapa virou atalho para lá, como a 8. O número fica: é como a
  // pessoa fala da etapa.
  {
    id: "categorias-principais",
    number: 5,
    title: "Abas da loja",
    hint: "Configuradas na Central do jogo",
    href: (gameId) => centralHref(gameId, { section: "abas" }),
    adminOnly: true,
  },
  {
    // Desde 2026-09-30 (admin-games-ux.md, Etapa 2) os servidores são editados
    // na Visão geral da Central; aqui só aparecem (o salvamento do Builder
    // ainda os envia — ver `BuilderShell`).
    id: "servidores",
    number: 6,
    title: "Servidores",
    hint: "Editados na visão geral do jogo",
  },
  {
    id: "categorias",
    number: 7,
    // Só as GLOBAIS (valem em todo servidor e toda aba). As de um servidor +
    // aba ficam em Jogos → Categorias (2026-09-28).
    title: "Categorias globais",
    hint: "Valem para todas as abas",
  },
  {
    id: "produtos",
    number: 8,
    title: "Lista de produtos",
    hint: "Altere a lista de produtos",
    href: (gameId) => `/admin/produtos?jogo=${encodeURIComponent(gameId)}`,
    adminOnly: true,
  },
  { id: "descricao", number: 9, title: "Descrição", hint: "Altere a descrição da page" },
  // NÃO está no arquivo do Figma, que desenha nove. Entrou a pedido do usuário:
  // "tenho que poder arrastar a lista de produtos pra cima do banner principal".
  { id: "ordem", number: 10, title: "Ordem da página", hint: "Arraste e esconda blocos" },
];

/** As etapas que a lateral mostra para o cargo (ver `adminOnly`). */
export function visibleSteps(canManage: boolean): readonly BuilderStep[] {
  return canManage ? BUILDER_STEPS : BUILDER_STEPS.filter((step) => !step.adminOnly);
}

export function stepById(id: string): BuilderStep | undefined {
  return BUILDER_STEPS.find((step) => step.id === id);
}
