/**
 * Selo "-5%" do canto superior direito do card de pacote (2026-10-27).
 *
 * Pedido do usuário: no cliente, SÓ o selo — sem tabela de faixas nem preço
 * riscado. O preço do card já vem com o desconto; o cheio fica no `title`
 * para quem quiser conferir.
 */
export function DiscountBadge({
  percent,
  title,
  className,
}: {
  percent: number;
  title?: string;
  /** Posição; o padrão é o canto do card. O botão de quantidade usa outro. */
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`pointer-events-none absolute z-10 ${className ?? "top-[8px] right-[8px] desk:top-[14px] desk:right-[14px]"} rounded-full bg-[image:var(--brand-orange-gradient)] px-[8px] py-[2px] font-poppins text-[12px] leading-[18px] font-bold tracking-[0.2px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] desk:px-[10px] desk:text-[13px]`}
    >
      <span aria-hidden>-{percent}%</span>
      <span className="sr-only">{percent}% de desconto</span>
    </span>
  );
}

/**
 * Selo de texto livre do card (2026-11-04, pedido do usuário: "Novo", "Em alta"
 * ou o que ele escrever, "no canto superior esquerdo, no lado oposto do
 * desconto, seguindo a mesma linha"). Mesmo quadro laranja e mesma altura do
 * "-N%", espelhado. A largura é limitada para nunca encostar no selo de
 * desconto: texto longo ganha "…" (o texto inteiro fica no `title`).
 */
export function LabelBadge({
  text,
  placement = "inside",
}: {
  text: string;
  /**
   * `edge` (2026-11-17, pedido do usuário no card de SERVIÇO/pacote): o selo
   * sobe para a borda de cima, metade fora e metade dentro do card, para não
   * cobrir a arte. Quem usa precisa de um pai SEM `overflow-hidden`.
   */
  placement?: "inside" | "edge";
}) {
  return (
    <span
      title={text}
      className={
        placement === "edge"
          ? "pointer-events-none absolute top-0 left-[20px] z-20 max-w-[calc(100%-40px)] -translate-y-1/2 truncate rounded-full bg-[image:var(--brand-orange-gradient)] px-[12px] py-[3px] font-poppins text-[13px] leading-[18px] font-bold tracking-[0.2px] text-white shadow-[0_2px_10px_rgba(0,0,0,0.55)] ring-2 ring-black desk:left-[24px] desk:px-[16px] desk:py-[5px] desk:text-[15px] desk:leading-[20px]"
          : "pointer-events-none absolute top-[8px] left-[8px] z-10 max-w-[calc(100%-84px)] truncate rounded-full bg-[image:var(--brand-orange-gradient)] px-[8px] py-[2px] font-poppins text-[12px] leading-[18px] font-bold tracking-[0.2px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] desk:top-[14px] desk:left-[14px] desk:max-w-[calc(100%-110px)] desk:px-[10px] desk:text-[13px]"
      }
    >
      {text}
    </span>
  );
}
