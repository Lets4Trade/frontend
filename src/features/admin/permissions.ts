/**
 * Níveis do painel (2026-10-16, pedido do usuário: "níveis de admin, admin,
 * editor e atendente"). Módulo PURO — servidor e cliente importam daqui.
 *
 *   ADMIN    tudo.
 *   EDITOR   conteúdo (páginas, blog, configurações da loja, builder) e o
 *            catálogo inteiro (jogos, abas, produtos e preços).
 *   SUPPORT  atendente: chat e pedidos (ver, mudar situação, assumir) e o
 *            aviso de venda.
 *   WRITER   redator (2026-10-28, pedido do usuário): só o BLOG. Na loja é um
 *            cliente normal (compra, chat, fidelidade — nada muda lá).
 *
 * Cupons, brindes, cashback (dinheiro que a loja deixa de receber ou devolve),
 * usuários e logs: só ADMIN.
 *
 * Isto é o que a INTERFACE usa para não desenhar o que a pessoa não pode usar
 * (menu, telas, botões) e a segunda porta das server actions. Quem autoriza de
 * verdade é o `@Roles(...)` de cada rota do backend — espelhado aqui.
 */

/** Espelha o enum `UserRole` do backend (prisma/schema.prisma). */
export type SessionRole = "ADMIN" | "EDITOR" | "SUPPORT" | "WRITER" | "USER";
export type PanelRole = Exclude<SessionRole, "USER">;

export type PanelArea = "content" | "blog" | "catalog" | "orders" | "support" | "promotions" | "users" | "logs";

export const AREA_ROLES: Record<PanelArea, readonly PanelRole[]> = {
  content: ["ADMIN", "EDITOR"],
  // Área própria desde 2026-10-28: o blog era parte de "content", e o REDATOR
  // não pode levar junto páginas, configurações da loja e builder.
  blog: ["ADMIN", "EDITOR", "WRITER"],
  catalog: ["ADMIN", "EDITOR"],
  orders: ["ADMIN", "SUPPORT"],
  support: ["ADMIN", "SUPPORT"],
  promotions: ["ADMIN"],
  users: ["ADMIN"],
  logs: ["ADMIN"],
};

export function isPanelRole(role: SessionRole | null | undefined): role is PanelRole {
  return role === "ADMIN" || role === "EDITOR" || role === "SUPPORT" || role === "WRITER";
}

/** Papel desconhecido ou ausente nunca passa (lista fechada por área). */
export function canAccess(role: SessionRole | null | undefined, area: PanelArea): boolean {
  return isPanelRole(role) && AREA_ROLES[area].includes(role);
}

export const ROLE_LABEL: Record<SessionRole, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  SUPPORT: "Atendente",
  WRITER: "Redator",
  USER: "Cliente",
};

/** Primeira tela de cada cargo ao abrir `/admin`. */
export function panelHome(role: PanelRole): string {
  if (role === "EDITOR") return "/admin/paginas";
  if (role === "SUPPORT") return "/admin/chats";
  if (role === "WRITER") return "/admin/blog";
  return "/admin/pedidos";
}
