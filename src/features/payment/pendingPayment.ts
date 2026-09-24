/**
 * O pagamento em aberto DESTE carrinho, na aba (2026-09-24).
 *
 * ── Por que existe ────────────────────────────────────────────────────────
 * Fechar o carrinho cria os pedidos e debita as coins (`POST /orders`). Se o
 * cartão é recusado e a pessoa tenta de novo, a segunda tentativa tem que
 * cobrar o MESMO pagamento — criar outro faria pedidos em dobro e tentaria
 * debitar as coins duas vezes. Os pedidos da primeira expirariam em 30 minutos
 * e as coins voltariam, mas até lá o saldo da pessoa estaria errado.
 *
 * A chave é a ASSINATURA do carrinho (itens + coins): mudou o carrinho, mudou o
 * valor, e o pagamento antigo não serve mais. `sessionStorage` e não
 * `localStorage`: é da aba e do momento, e não deve sobreviver a amanhã.
 *
 * Tudo em try/catch: armazenamento bloqueado (aba anônima em alguns
 * navegadores) só faz a tela criar um pagamento novo, que é o comportamento
 * seguro.
 */

const KEY = "l4t:pending-payment";

export type PendingPayment = {
  id: string;
  amountCents: number;
  expiresAt: string;
  signature: string;
};

export function cartSignature(lines: { productId: string; units: number }[], coins: number) {
  const sorted = [...lines]
    .map((line) => `${line.productId}:${line.units}`)
    .sort()
    .join("|");
  return `${sorted}#${coins}`;
}

export function readPendingPayment(signature: string): PendingPayment | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingPayment;
    // Margem de 1 minuto: pagamento a ponto de expirar não vale a tentativa.
    const alive = new Date(pending.expiresAt).getTime() - Date.now() > 60_000;
    return alive && pending.signature === signature ? pending : null;
  } catch {
    return null;
  }
}

export function savePendingPayment(pending: PendingPayment) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // sem armazenamento: a próxima tentativa cria outro pagamento
  }
}

export function clearPendingPayment() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}
