import { formatCents, formatHours, type CartItem } from "@/features/cart/store";
import { lineTotalCents } from "@/features/pricing/quote";

/**
 * O pedido em TEXTO, para colar no WhatsApp (2026-11-22, pedido do usuário):
 * quem fecha pelo atendimento cola uma mensagem só e o vendedor já tem tudo —
 * jogo, item, servidor, a escolha do serviço, quantidade, valores e a forma de
 * pagamento que a pessoa tinha marcado.
 *
 * Formatação do próprio WhatsApp (`*negrito*`). Os valores são a PRÉVIA da
 * tela — o preço que vale é o que o vendedor confirma; por isso a última linha
 * avisa. Nada de cartão entra aqui: só a forma de pagamento.
 */
export type OrderTextInput = {
  items: CartItem[];
  /** slug → nome do jogo ("path-of-exile-2" → "Path of Exile 2"). */
  gameNames: Record<string, string>;
  customerName?: string;
  coupon?: { code: string; cents: number } | null;
  coinsCents: number;
  feeCents: number;
  totalCents: number;
  method: "pix" | "credit";
  installments: number;
  notes?: string;
};

export function orderText(input: OrderTextInput): string {
  const lines: string[] = ["*Pedido pelo site — Lets4Trade*"];
  if (input.customerName?.trim()) lines.push(`Cliente: ${clean(input.customerName)}`);

  input.items.forEach((item, index) => {
    const game = input.gameNames[item.gameSlug];
    lines.push("", `${index + 1}. *${clean(item.name)}*${game ? ` — ${clean(game)}` : ""}`);
    if (item.platform && item.platform !== game) lines.push(`   Servidor: ${clean(item.platform)}`);
    if (item.summary) lines.push(`   Escolha: ${clean(item.summary)}`);
    lines.push(`   Quantidade: ${item.quantity.toLocaleString("pt-BR")}`);
    if (item.hours) lines.push(`   Prazo estimado: ~${formatHours(item.hours * item.quantity)} h`);
    lines.push(`   Valor: ${formatCents(lineTotalCents(item.unitPriceCents, item.quantity))}`);
  });

  lines.push("");
  if (input.coupon && input.coupon.cents > 0) {
    lines.push(`Cupom: ${clean(input.coupon.code)} (− ${formatCents(input.coupon.cents)})`);
  }
  if (input.coinsCents > 0) lines.push(`Lets Coins: − ${formatCents(input.coinsCents)}`);
  if (input.feeCents > 0) lines.push(`Taxa do cartão: ${formatCents(input.feeCents)}`);
  lines.push(`*Total: ${formatCents(input.totalCents)}*`);
  lines.push(
    input.method === "pix"
      ? "Pagamento: PIX"
      : `Pagamento: Cartão de crédito${input.installments > 1 ? ` em ${input.installments}x` : " à vista"}`,
  );
  if (input.notes?.trim()) lines.push(`Observações: ${clean(input.notes)}`);

  lines.push("", "_Valores da prévia do site; o atendente confirma o preço final._");
  return lines.join("\n");
}

/**
 * Uma linha só e sem os marcadores do WhatsApp: um nome de produto com `*` ou
 * quebra de linha bagunçaria a mensagem (o texto vem do cadastro e da pessoa).
 */
function clean(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/[*_~`]/g, "").trim();
}
