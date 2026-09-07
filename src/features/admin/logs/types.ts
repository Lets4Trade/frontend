/**
 * Tipos puros da trilha de auditoria. Separado de `list.ts` (que fala com a
 * rede) para que qualquer client component possa importá-los sem arrastar o
 * `next/headers` para o navegador.
 */

/** Espelha o enum `AuditActorType` do backend. */
export type AuditActorType = "ADMIN" | "USER" | "ANONYMOUS" | "SYSTEM";

/** Espelha o enum `AuditCategory`. É o que decide retenção e cor da pílula. */
export type AuditCategory = "MUTATION" | "ADMIN_VIEW" | "NAVIGATION" | "AUTH";

export type AuditEntry = {
  id: string;
  actorType: AuditActorType;
  /** Nome e e-mail CONGELADOS no momento do evento. Ausente = anônimo. */
  actorLabel?: string | null;
  category: AuditCategory;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  path?: string | null;
  metadata?: unknown;
  ip?: string | null;
  createdAt: string;
};

export type AuditPage = {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

/**
 * Rótulo e cor por categoria.
 *
 * As cores seguem a fórmula das outras pílulas do painel: texto saturado sobre
 * a mesma matiz bem escurecida. Alteração é laranja (é o que mais importa),
 * acesso a tela do painel é azul, navegação é neutra e autenticação é verde.
 */
export const CATEGORY_STYLES: Record<
  AuditCategory,
  { label: string; className: string }
> = {
  MUTATION: { label: "Alteração", className: "bg-[#3a1c00] text-[#ff9a3c]" },
  ADMIN_VIEW: { label: "Tela do painel", className: "bg-[#0b2740] text-[#4db2ff]" },
  NAVIGATION: { label: "Navegação", className: "bg-[#222] text-white/70" },
  AUTH: { label: "Autenticação", className: "bg-[#0f361e] text-[#00f55f]" },
};

/** Opções do select "Categoria". A ordem é a de importância, não a do enum. */
export const CATEGORY_OPTIONS = [
  { value: "MUTATION", label: "Alteração" },
  { value: "ADMIN_VIEW", label: "Tela do painel" },
  { value: "AUTH", label: "Autenticação" },
  { value: "NAVIGATION", label: "Navegação" },
] as const;

const ACTOR_LABELS: Record<AuditActorType, string> = {
  ADMIN: "Admin",
  USER: "Cliente",
  ANONYMOUS: "Visitante",
  SYSTEM: "Sistema",
};

export function actorTypeLabel(type: AuditActorType): string {
  return ACTOR_LABELS[type] ?? type;
}

/**
 * ISO → "17/04/26 05:34:21".
 *
 * Aqui vai o SEGUNDO, ao contrário das outras telas: numa trilha de auditoria a
 * ordem de dois eventos no mesmo minuto é justamente o que se quer saber.
 *
 * Fuso de São Paulo fixo — em produção o Node roda em UTC.
 */
export function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(date)
    .replace(",", "");
}

/**
 * "product.update" → "Produto · editado".
 *
 * Traduz as chaves conhecidas e devolve a crua no que não conhece — uma ação
 * nova aparece feia, mas aparece. Rótulo vazio esconderia o evento.
 */
const ACTION_LABELS: Record<string, string> = {
  "product.create": "Produto · criado",
  "product.update": "Produto · editado",
  "product.delete": "Produto · excluído",
  "game.create": "Jogo · criado",
  "game.update": "Jogo · editado",
  "game.delete": "Jogo · excluído",
  "user.update": "Usuário · editado",
  "user.delete": "Usuário · excluído",
  "page.view": "Tela aberta",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
