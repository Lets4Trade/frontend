import type { SectionExtraField } from "./blogCardFields";

/**
 * Alinhamento dos textos NO CELULAR, escolhido no painel por bloco
 * (2026-10-15, pedido do usuário): "Clientes 100% satisfeitos", "Equipe",
 * rodapé e o botão do chat. O PADRÃO é centralizado — era tudo à esquerda e o
 * pedido foi centralizar; "esquerda" fica como opção para quem quiser voltar.
 *
 * Mora nos textos EXTRAS da sessão (o backend já guarda e valida o nome), sem
 * migration. Só vale abaixo de `lg` (1024px), onde a loja usa o layout de
 * celular; no desktop nada muda.
 */
export const MOBILE_ALIGN_EXTRA = "alinhamento-celular";

export type MobileAlign = "center" | "left";

export function mobileAlignField(
  label = "Alinhamento no celular",
  hint?: string,
  optionLabels: { center: string; left: string } = { center: "Centralizado", left: "À esquerda" },
): SectionExtraField {
  return {
    name: MOBILE_ALIGN_EXTRA,
    label,
    defaultValue: "centro",
    maxLength: 10,
    hint: hint ?? "Como os textos deste bloco ficam na tela do celular. No computador não muda.",
    options: [
      { value: "centro", label: optionLabels.center },
      { value: "esquerda", label: optionLabels.left },
    ],
  };
}

/** Valor desconhecido ou vazio cai no padrão (centralizado). */
export function mobileAlignOf(extra: (name: string, fallback: string) => string): MobileAlign {
  return extra(MOBILE_ALIGN_EXTRA, "centro") === "esquerda" ? "left" : "center";
}
