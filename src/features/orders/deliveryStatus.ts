/**
 * Status de ENTREGA personalizado (2026-10-16) — a paleta e a leitura, iguais
 * na loja e no painel. Espelha `backend/src/app/delivery-statuses/delivery-status.rules.ts`.
 *
 * O banco guarda o NOME da cor (paleta fechada); cada nome vira as classes da
 * pílula aqui. Mesma fórmula das pílulas de situação (`ORDER_STATUS_STYLES`):
 * texto saturado sobre a mesma matiz bem escurecida.
 */
export const DELIVERY_STATUS_COLORS = ["orange", "yellow", "green", "cyan", "blue", "purple", "red", "gray"] as const;
export type DeliveryStatusColor = (typeof DELIVERY_STATUS_COLORS)[number];

export const DELIVERY_COLOR_STYLES: Record<DeliveryStatusColor, { label: string; className: string; text: string }> = {
  orange: { label: "Laranja", className: "bg-[#3d1f00] text-[#ff8a1f]", text: "#ff8a1f" },
  yellow: { label: "Amarelo", className: "bg-[#424111] text-[#ffd400]", text: "#ffd400" },
  green: { label: "Verde", className: "bg-[#0f361e] text-[#00f55f]", text: "#00f55f" },
  cyan: { label: "Ciano", className: "bg-[#0f2f3d] text-[#3db9cf]", text: "#3db9cf" },
  blue: { label: "Azul", className: "bg-[#00214d] text-[#06b4ff]", text: "#06b4ff" },
  purple: { label: "Roxo", className: "bg-[#2a0f4d] text-[#b57bff]", text: "#b57bff" },
  red: { label: "Vermelho", className: "bg-[#350507] text-[#ff2828]", text: "#ff2828" },
  gray: { label: "Cinza", className: "bg-[#262626] text-[#c8c8c8]", text: "#c8c8c8" },
};

export function isDeliveryColor(value: unknown): value is DeliveryStatusColor {
  return typeof value === "string" && (DELIVERY_STATUS_COLORS as readonly string[]).includes(value);
}

/** O status personalizado como a tela usa: nome e cor já resolvidos. */
export type DeliveryStatusView = { id: string; label: string; color: DeliveryStatusColor };

/**
 * Lê o status que veio da API. Formato inesperado = sem status (a tela mostra
 * a situação padrão); cor fora da paleta cai no cinza — nunca vira estilo livre.
 */
export function toDeliveryStatus(raw: unknown): DeliveryStatusView | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { id?: unknown; label?: unknown; color?: unknown };
  if (typeof value.id !== "string" || typeof value.label !== "string" || !value.label.trim()) return null;
  return { id: value.id, label: value.label.trim().slice(0, 40), color: isDeliveryColor(value.color) ? value.color : "gray" };
}
