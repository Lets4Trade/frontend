/**
 * Os BLOCOS da página de jogo — quais existem, em que ordem nascem e como se
 * espaçam.
 *
 * ── Por que este arquivo existe ────────────────────────────────────────────
 * Até 2026-09-10 só quatro blocos eram reordenáveis (banner, referências,
 * notícias, FAQ) e os outros cinco estavam escritos direto no JSX da página, em
 * ordem fixa. O comentário do `types.ts` até justificava: "a identidade e o
 * catálogo não entram, sem eles não existe página de jogo".
 *
 * Isso confundia "não pode SUMIR" com "não pode MUDAR DE LUGAR". Quem monta a
 * página pode muito bem querer a grade de produtos acima do banner — e nada
 * nessa vontade ameaça a existência da página. Agora TODOS os nove blocos
 * reordenam, e a visibilidade é decisão separada.
 *
 * ── Os espaçamentos ────────────────────────────────────────────────────────
 * O arquivo do Figma tem vãos diferentes entre blocos vizinhos: 42px depois do
 * banner, 44 até os servidores, 25 até as categorias, 47 até a barra do
 * catálogo. Esses números descrevem RELAÇÕES entre blocos específicos — o vão
 * apertado entre "Selecionar servidor" e "Selecionar categoria" existe porque os
 * dois formam um grupo de controles.
 *
 * Quando a ordem muda, a relação deixa de existir, e insistir no número vira
 * ruído. Então: cada bloco declara o vão que usa QUANDO segue o vizinho padrão
 * dele; em qualquer outra ordem vale o vão de seção do arquivo (50px). Assim a
 * página padrão continua idêntica ao desenho, e uma página reordenada fica
 * regular em vez de torta.
 */
export type GameSectionKey =
  | "banner"
  | "identity"
  | "servers"
  | "categories"
  | "catalog"
  | "description"
  | "references"
  | "news"
  | "faq";

export type GameSectionDef = {
  key: GameSectionKey;
  /** Como o bloco se chama no builder. */
  label: string;
  /** Uma linha dizendo o que ele é, para quem monta a página. */
  hint: string;
  /**
   * Vão acima do bloco quando ele segue o vizinho PADRÃO dele. Fora dessa
   * vizinhança vale `DEFAULT_GAP`.
   */
  gapAfterDefaultPredecessor: number;
};

/** O vão entre seções do arquivo, e o que vale em qualquer ordem inesperada. */
export const DEFAULT_GAP = 50;

/**
 * A ordem em que a página nasce — a do arquivo do Figma, de cima para baixo.
 *
 * É também o que a vitrine usa quando o jogo não foi personalizado
 * (`sectionOrder` vazio no banco significa "não personalizado", como os demais
 * campos do builder).
 */
export const GAME_SECTIONS: readonly GameSectionDef[] = [
  {
    key: "banner",
    label: "Banner principal",
    hint: "A faixa de arte do topo (1715×490).",
    gapAfterDefaultPredecessor: 0,
  },
  {
    key: "identity",
    label: "Logo, título e abas",
    hint: "A arte do game, o título e as abas de categoria.",
    gapAfterDefaultPredecessor: 42,
  },
  {
    key: "servers",
    label: "Selecionar servidor",
    hint: "Os botões de servidor/liga.",
    gapAfterDefaultPredecessor: 44,
  },
  {
    key: "categories",
    label: "Selecionar categoria",
    hint: "O painel de categorias marcáveis.",
    gapAfterDefaultPredecessor: 25,
  },
  {
    key: "catalog",
    label: "Lista de produtos",
    hint: "A barra de ordenação, a grade de produtos e a paginação.",
    gapAfterDefaultPredecessor: 47,
  },
  {
    key: "description",
    label: "Descrição",
    hint: "O texto corrido escrito na etapa 9.",
    gapAfterDefaultPredecessor: DEFAULT_GAP,
  },
  {
    key: "references",
    label: "Referências",
    hint: "Os depoimentos de clientes.",
    gapAfterDefaultPredecessor: DEFAULT_GAP,
  },
  {
    key: "news",
    label: "Notícias",
    hint: "Os cards de novidades.",
    gapAfterDefaultPredecessor: DEFAULT_GAP,
  },
  {
    key: "faq",
    label: "Dúvidas",
    hint: "Os grupos de perguntas e respostas.",
    gapAfterDefaultPredecessor: DEFAULT_GAP,
  },
];

export const DEFAULT_SECTION_ORDER: readonly GameSectionKey[] =
  GAME_SECTIONS.map((section) => section.key);

const BY_KEY = new Map(GAME_SECTIONS.map((section) => [section.key, section]));

export function sectionDef(key: string): GameSectionDef | undefined {
  return BY_KEY.get(key as GameSectionKey);
}

/**
 * Limpa a lista que veio do banco.
 *
 * Três coisas, e cada uma protege de um jeito diferente de a lista chegar
 * estragada:
 *   - chave desconhecida é DESCARTADA (um bloco removido do código, ou uma
 *     versão futura, não pode derrubar a página);
 *   - repetição é descartada (o mesmo bloco duas vezes renderizaria duas vezes);
 *   - lista vazia devolve a ordem PADRÃO — vazio significa "não personalizado",
 *     e nunca "página em branco".
 */
export function resolveSectionOrder(
  stored: readonly string[] | null | undefined,
): GameSectionKey[] {
  if (!stored || stored.length === 0) return [...DEFAULT_SECTION_ORDER];

  const seen = new Set<string>();
  const order: GameSectionKey[] = [];

  for (const key of stored) {
    if (seen.has(key) || !BY_KEY.has(key as GameSectionKey)) continue;
    seen.add(key);
    order.push(key as GameSectionKey);
  }

  return order.length > 0 ? order : [...DEFAULT_SECTION_ORDER];
}

/**
 * O vão acima de um bloco, dada a ordem em uso.
 *
 * O primeiro bloco nunca tem vão — quem espaça o topo é o contêiner da página.
 */
export function gapBefore(order: readonly GameSectionKey[], index: number): number {
  if (index === 0) return 0;

  const current = BY_KEY.get(order[index]);
  if (!current) return DEFAULT_GAP;

  const defaultIndex = DEFAULT_SECTION_ORDER.indexOf(order[index]);
  const defaultPredecessor =
    defaultIndex > 0 ? DEFAULT_SECTION_ORDER[defaultIndex - 1] : null;

  return order[index - 1] === defaultPredecessor
    ? current.gapAfterDefaultPredecessor
    : DEFAULT_GAP;
}
