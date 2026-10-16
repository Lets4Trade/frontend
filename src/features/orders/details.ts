import type { OrderItem } from "./types";

/**
 * `OrderItem.details` → o que a tela mostra: as linhas da conta e as horas.
 * Função PURA (sem `serverApi`): o detalhe do painel, client, também usa.
 * Tudo conferido campo a campo — é JSON do banco, e um formato inesperado vira
 * "sem detalhes" (a tela cai na quantidade), nunca um erro na página.
 */
export function toOrderDetails(raw: unknown, currency = "BRL"): OrderItem["details"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { lines?: unknown; hours?: unknown };

  const lines = Array.isArray(value.lines)
    ? value.lines
        .filter(
          (line): line is { label: string; cents: number } =>
            !!line &&
            typeof (line as { label?: unknown }).label === "string" &&
            Number.isFinite((line as { cents?: unknown }).cents),
        )
        .slice(0, 30)
        .map((line) => ({
          label: line.label.slice(0, 120),
          price: formatPrice((line.cents / 100).toFixed(2), currency),
        }))
    : [];
  const hours =
    typeof value.hours === "number" && Number.isFinite(value.hours) && value.hours > 0
      ? value.hours.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return lines.length > 0 || hours ? { lines, hours } : null;
}

function formatPrice(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: currency || "BRL" });
}
