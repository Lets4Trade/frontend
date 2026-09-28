/**
 * Os MODELOS de aba de jogo (Figma 1524:401) — só para CADASTRO.
 *
 * Desde a limpeza da FASE 5 (contrato `.claude/context/game-tabs.md`,
 * 2026-09-28) as abas da vitrine vêm SÓ do banco (`GameTab`, por jogo). "Tipo
 * de produto" deixou de existir: esta lista é o espelho da constante
 * `default-tabs.ts` do backend, usada em dois lugares:
 *   - o formulário de jogo novo manda `productTypes: [KEY]` — a CHAVE de um
 *     modelo, que o backend usa para criar as abas iniciais e NÃO grava;
 *   - o ícone de reserva de uma aba sem `iconUrl` cujo slug é o de um modelo.
 *
 * `key` (maiúscula) é o que viaja para a API; `slug` é o da aba criada (vai em
 * `?aba=`). Mantidos separados para não amarrar o endereço público ao nome da
 * chave.
 */
export type TabTemplate = {
  /** Chave aceita por `POST /admin/games` em `productTypes`. */
  key: string;
  /** Slug da aba que o backend cria a partir do modelo. */
  slug: string;
  label: string;
  icon: string;
  layout: "CATALOG" | "SERVICE";
};

/** Modelos de aba de PRODUTO. A ordem é a do arquivo do Figma. */
export const TAB_TEMPLATES: readonly TabTemplate[] = [
  { key: "MOEDAS", slug: "moedas", label: "MOEDAS", icon: "/icons/game/tab-moedas.svg", layout: "CATALOG" },
  // UM arquivo só (2026-09-24): círculo + duas espadas cruzadas — em duas
  // camadas a espada saía minúscula e deslocada.
  { key: "ITENS", slug: "itens", label: "ITENS", icon: "/icons/game/tab-itens.svg", layout: "CATALOG" },
  { key: "GOLD", slug: "gold", label: "GOLD", icon: "/icons/game/tab-gold.svg", layout: "CATALOG" },
  { key: "BUILDS", slug: "builds", label: "BUILDS", icon: "/icons/game/tab-builds.svg", layout: "CATALOG" },
  { key: "BOOSTING", slug: "boosting", label: "BOOSTING", icon: "/icons/game/tab-boosting.svg", layout: "SERVICE" },
  { key: "CARRY", slug: "carry", label: "CARRY", icon: "/icons/game/tab-carry.svg", layout: "SERVICE" },
  { key: "MENTORIA", slug: "mentoria", label: "MENTORIA", icon: "/icons/game/tab-mentoria.svg", layout: "SERVICE" },
];

/**
 * Os modelos de LINK que o backend acrescenta a todo jogo novo. Aqui só servem
 * de ícone de reserva por slug — quem decide se a aba existe é o banco.
 */
export const LINK_TAB_TEMPLATES = [
  { slug: "venda", label: "VENDA PRA NÓS", icon: "/icons/game/tab-venda.svg" },
  { slug: "fidelidade", label: "FIDELIDADE", icon: "/icons/game/tab-fidelidade.svg" },
] as const;

const ICON_BY_SLUG = new Map<string, string>([
  ...TAB_TEMPLATES.map((tab) => [tab.slug, tab.icon] as const),
  ...LINK_TAB_TEMPLATES.map((tab) => [tab.slug, tab.icon] as const),
]);

/** Ícone do modelo com esse slug; `undefined` para aba criada pelo admin. */
export function templateIcon(slug: string): string | undefined {
  return ICON_BY_SLUG.get(slug);
}
