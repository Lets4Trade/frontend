/**
 * Login com volta para o checkout — um lugar só para o carrinho, a página do
 * checkout e o 401 no meio do pagamento (2026-11-02).
 */
export const CHECKOUT_PATH = "/checkout";
export const CHECKOUT_LOGIN_HREF = `/login?redirect=${encodeURIComponent(CHECKOUT_PATH)}`;

/** O destino depois do login é o checkout? (decide o aviso "seu carrinho continua salvo"). */
export function isCheckoutRedirect(path: string | null | undefined): boolean {
  return path === CHECKOUT_PATH || Boolean(path?.startsWith(`${CHECKOUT_PATH}?`));
}
