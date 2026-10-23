/**
 * Estado dos avisos de VENDA no painel (2026-10-16) — o card na tela e o
 * contador em "Vendas e pedidos". Um store de módulo (por aba) lido com
 * `useSyncExternalStore`: o cabeçalho e o card leem o mesmo estado sem prop.
 *
 * O contador sobrevive à navegação e ao F5 da aba (`sessionStorage`), e zera
 * ao abrir "Vendas e pedidos". Cada aba conta as suas — é o aviso de quem está
 * com o painel aberto, não um registro (o registro é a lista de pedidos).
 */

export type SaleAlert = {
  paymentId: string;
  reference: string;
  references: string[];
  customer: string;
  /** Abre a ficha em Usuários (2026-10-23). */
  customerId: string | null;
  amountCents: number;
  method: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "FREE" | null;
  items: { name: string; quantity: string; game: string | null }[];
};

const UNSEEN_KEY = "l4t:vendas-novas";
const MAX_CARDS = 4;

let unseen = readUnseen();
let cards: SaleAlert[] = [];
const listeners = new Set<() => void>();
/** O mesmo pagamento nunca vira dois cards (reconexão do socket, duas abas do evento). */
const seen = new Set<string>();

function readUnseen(): number {
  try {
    if (typeof window === "undefined") return 0;
    const value = Number(window.sessionStorage.getItem(UNSEEN_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function emit() {
  try {
    window.sessionStorage.setItem(UNSEEN_KEY, String(unseen));
  } catch {
    // Armazenamento bloqueado: o contador vale só até recarregar.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSales(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getUnseen = () => unseen;
export const getCards = () => cards;
const EMPTY: SaleAlert[] = [];
export const getServerCards = () => EMPTY;

/** Venda nova. `false` = já mostrada (não repete som nem card). */
export function pushSale(sale: SaleAlert, countAsUnseen: boolean): boolean {
  if (seen.has(sale.paymentId)) return false;
  seen.add(sale.paymentId);
  cards = [sale, ...cards].slice(0, MAX_CARDS);
  if (countAsUnseen) unseen += 1;
  emit();
  return true;
}

export function dismissSale(paymentId: string) {
  cards = cards.filter((card) => card.paymentId !== paymentId);
  emit();
}

export function clearUnseen() {
  if (unseen === 0) return;
  unseen = 0;
  emit();
}

/** Lê o evento do socket com cuidado: formato estranho = ignora. */
export function parseSale(raw: unknown): SaleAlert | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.paymentId !== "string" || typeof s.reference !== "string") return null;
  const methods = ["PIX", "CREDIT_CARD", "DEBIT_CARD", "FREE"] as const;
  return {
    paymentId: s.paymentId,
    reference: s.reference,
    references: Array.isArray(s.references) ? s.references.filter((r): r is string => typeof r === "string") : [s.reference],
    customer: typeof s.customer === "string" ? s.customer : "Cliente",
    customerId: typeof s.customerId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(s.customerId) ? s.customerId : null,
    amountCents: typeof s.amountCents === "number" ? s.amountCents : 0,
    method: methods.find((m) => m === s.method) ?? null,
    items: Array.isArray(s.items)
      ? s.items.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const i = item as Record<string, unknown>;
          return typeof i.name === "string"
            ? [{ name: i.name, quantity: typeof i.quantity === "string" ? i.quantity : "", game: typeof i.game === "string" ? i.game : null }]
            : [];
        })
      : [],
  };
}

export const METHOD_LABEL: Record<NonNullable<SaleAlert["method"]>, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  FREE: "Cupom/coins",
};

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Link do pedido no painel — sempre relativo (o `adminUrl` do backend usa o host público). */
export function saleHref(sale: SaleAlert) {
  return `/admin/pedidos?busca=${encodeURIComponent(sale.reference)}`;
}
