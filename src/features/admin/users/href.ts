/**
 * Nome do cliente no painel → a ficha dele em Usuários (2026-10-23, pedido do
 * usuário). Abre `/admin/usuarios` mostrando SÓ essa conta e com o modal dela
 * já aberto. A tela de Usuários é só do ADMIN: para o atendente o nome
 * continua texto (quem desenha o link confere `canAccess(role, "users")`).
 *
 * Módulo PURO, para server e client components.
 */
export const USER_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

export function adminUserHref(id: string): string {
  return `/admin/usuarios?usuario=${encodeURIComponent(id)}`;
}

/** Classe do nome que vira link — sublinhado discreto, laranja no hover. */
export const USER_LINK_CLASS =
  "underline decoration-white/30 underline-offset-[3px] transition-colors hover:text-brand-orange hover:decoration-brand-orange";
