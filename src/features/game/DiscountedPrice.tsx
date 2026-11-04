/**
 * Preço com desconto no card (2026-11-02, pedido do usuário: "o preço original
 * cortado e o preço novo em evidência — R$30,00 R$28,50").
 *
 * O original vem riscado, menor e apagado; o novo, no degradê laranja da marca
 * (o mesmo do selo "-N%" e dos preços do carrinho). Os dois na MESMA linha:
 * o card tem altura fixa no desktop (o preço mora em y=305), e uma segunda
 * linha empurraria os botões.
 *
 * Linha estreita (card de ~170px no celular, ou total de várias unidades): quem
 * encolhe e ganha "…" é o preço ORIGINAL — o que a pessoa vai pagar nunca é
 * cortado.
 *
 * Leitor de tela: o `<s>` não é anunciado como "riscado" pela maioria deles,
 * então o texto diz "De … por …".
 */
export function DiscountedPrice({
  listLabel,
  priceLabel,
  className,
}: {
  /** Preço cheio, já formatado ("R$ 30,00"). */
  listLabel: string;
  /** Preço com desconto, já formatado ("R$ 28,50"). */
  priceLabel: string;
  className?: string;
}) {
  return (
    <span
      title={`De ${listLabel} por ${priceLabel}`}
      className={`inline-flex max-w-full items-baseline justify-center gap-[6px] desk:gap-[8px] ${className ?? ""}`}
    >
      <s className="min-w-0 truncate text-[12px] font-medium text-white/45 decoration-white/60 desk:text-[15px]">
        <span className="sr-only">De </span>
        {listLabel}
      </s>
      <PriceHighlight className="shrink-0">
        <span className="sr-only">por </span>
        {priceLabel}
      </PriceHighlight>
    </span>
  );
}

/**
 * O preço cobrado no degradê laranja da marca (2026-11-04, pedido do usuário:
 * "mudar a cor dos preços para laranja, no mesmo padrão do desconto"). É o
 * MESMO degradê do preço com desconto, para os cards com e sem desconto lerem
 * igual — só o riscado ao lado diferencia.
 */
export function PriceHighlight({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className ?? ""}`}
      style={{ backgroundImage: "linear-gradient(137.97deg, #ff7300 13.819%, #ff4d00 89.223%)" }}
    >
      {children}
    </span>
  );
}
