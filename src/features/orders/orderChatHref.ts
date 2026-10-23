/**
 * Número do pedido → o chat dele (2026-10-23, pedido do usuário: "clicar em
 * cima do id do pedido tem que ir pra tela do chat").
 *
 * Dois destinos, conforme ONDE a pessoa está:
 *   - no PAINEL, vai como atendente: `/admin/chats/pedido/<ref>`, que acha a
 *     conversa do pedido e abre em `/admin/chats` (ou oferece abrir uma);
 *   - na LOJA, vai como cliente: a tela do pedido, que é onde o chat dele mora,
 *     já rolada até a conversa (`#chat`).
 *
 * Módulo PURO, para servir a server e client components.
 */

export function adminOrderChatHref(reference: string): string {
  return `/admin/chats/pedido/${encodeURIComponent(reference)}`;
}

export function customerOrderChatHref(reference: string): string {
  return `/conta/pedidos/${encodeURIComponent(reference)}#chat`;
}
