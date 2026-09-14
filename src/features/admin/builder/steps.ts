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
   * "Lista de produtos" é a única: os produtos já têm tela própria
   * (`/admin/produtos`), com filtro, busca, paginação e cadastro. Refazer isso
   * dentro do builder seria manter duas telas de produto que precisam concordar.
   */
  href?: (gameId: string, gameSlug: string) => string;
};

export const BUILDER_STEPS: readonly BuilderStep[] = [
  { id: "titulos", number: 1, title: "Títulos", hint: "Altere os títulos" },
  { id: "banner", number: 2, title: "Banner Principal", hint: "Altere o banner" },
  { id: "logo", number: 3, title: "Logo do game", hint: "Altere a logo" },
  { id: "nome", number: 4, title: "Nome do game", hint: "Defina o nome do game" },
  {
    id: "categorias-principais",
    number: 5,
    title: "Categorias Principais",
    hint: "As principais categorias",
  },
  {
    id: "servidores",
    number: 6,
    title: "Servidores",
    hint: "Crie os tipos de servidores",
  },
  {
    id: "categorias",
    number: 7,
    title: "Categorias dos servers",
    hint: "Categorias dos servidores",
  },
  {
    id: "produtos",
    number: 8,
    title: "Lista de produtos",
    hint: "Altere a lista de produtos",
    href: (gameId) => `/admin/produtos?jogo=${encodeURIComponent(gameId)}`,
  },
  { id: "descricao", number: 9, title: "Descrição", hint: "Altere a descrição da page" },
  // NÃO está no arquivo do Figma, que desenha nove. Entrou a pedido do usuário:
  // "tenho que poder arrastar a lista de produtos pra cima do banner principal".
  { id: "ordem", number: 10, title: "Ordem da página", hint: "Arraste e esconda blocos" },
];

export function stepById(id: string): BuilderStep | undefined {
  return BUILDER_STEPS.find((step) => step.id === id);
}
