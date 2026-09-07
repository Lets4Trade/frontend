import Image from "next/image";

/**
 * Peças do painel "Ordem", compartilhadas pelo checkout (Figma 2568:1505) e
 * pela tela do pedido (2569:1682).
 *
 * As duas telas desenham o MESMO bloco: nome do produto com o logo do jogo e a
 * data, três linhas rótulo/valor, e o resumo de Preço/Desconto/Total. Manter
 * duas cópias faria as duas divergirem no primeiro ajuste de espaçamento — e
 * dinheiro exibido de dois jeitos diferentes na mesma compra é o tipo de coisa
 * que ninguém percebe até o cliente reclamar.
 */

/** Linha rótulo à esquerda, valor à direita — a unidade de todo o painel. */
export function SummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-[15px] ${className ?? "mt-[22px]"}`}
    >
      <span className="font-helvetica text-[16px] leading-[16px] font-bold tracking-[0.16px] text-white/80">
        {label}
      </span>
      <span className="truncate font-poppins text-[16px] leading-[23px] font-semibold tracking-[0.08px] text-white">
        {value}
      </span>
    </div>
  );
}

export type SummaryLine = {
  id: string;
  name: string;
  platform: string;
  /** Já formatada ("500M", "3x") — a unidade é do jogo, não nossa. */
  quantity: string;
  /** Já formatado em BRL. */
  price: string;
  gameLogo?: string;
  /** Já formatada (dd/mm/aa). */
  date: string;
};

/** Um item dentro do painel "Ordem". */
export function OrderLineBlock({ line }: { line: SummaryLine }) {
  return (
    <div className="mt-[26px]">
      <div className="flex items-start justify-between gap-[15px]">
        <h3 className="min-w-0 truncate font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] text-white">
          {line.name}
        </h3>
        <div className="flex shrink-0 items-center gap-[15px]">
          {line.gameLogo ? (
            <Image
              src={line.gameLogo}
              alt=""
              width={87}
              height={36}
              aria-hidden
              className="h-[36px] w-auto object-contain"
            />
          ) : null}
          <time className="font-helvetica text-[16px] tracking-[0.16px] text-brand-placeholder">
            {line.date}
          </time>
        </div>
      </div>

      <SummaryRow label="Plataforma/Servidor" value={line.platform} />
      <SummaryRow label="Quantidade" value={line.quantity} />
      <SummaryRow label="Preço" value={line.price} />
    </div>
  );
}

/** Preço / Desconto / Total, com os divisores do arquivo. */
export function TotalsBlock({
  price,
  discount,
  total,
}: {
  price: string;
  discount: string;
  total: string;
}) {
  return (
    <>
      <SummaryRow label="Preço" value={price} className="mt-[26px]" />
      <SummaryRow label="Desconto" value={discount} />

      <div aria-hidden className="mt-[26px] h-px w-full bg-white/25" />

      <div className="mt-[26px] flex items-baseline justify-between">
        <span className="font-helvetica text-[24px] leading-[27px] font-bold tracking-[0.24px] text-white/80">
          Total
        </span>
        <span className="font-poppins text-[24px] leading-[34px] font-semibold tracking-[0.24px] text-white">
          {total}
        </span>
      </div>
    </>
  );
}
