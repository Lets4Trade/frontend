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
      className={`pointer-events-none absolute z-10 ${className ?? "top-[8px] right-[8px] lg:top-[14px] lg:right-[14px]"} rounded-full bg-[image:var(--brand-orange-gradient)] px-[8px] py-[2px] font-poppins text-[12px] leading-[18px] font-bold tracking-[0.2px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] lg:px-[10px] lg:text-[13px]`}
    >
      <span aria-hidden>-{percent}%</span>
      <span className="sr-only">{percent}% de desconto</span>
    </span>
  );
}
