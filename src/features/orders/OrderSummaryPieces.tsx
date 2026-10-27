import type { OrderGift } from "@/features/gifts/orderGift";

/**
 * Peças do painel "Ordem", compartilhadas pelo checkout (Figma 2568:1505) e
 * pela tela do pedido (2569:1682).
 *
 * As duas telas desenham o MESMO bloco: uma linha por item (quantidade, nome,
 * servidor e preço — compacta desde 2026-10-20) e o resumo de
 * Preço/Desconto/Total. Manter duas cópias faria as duas divergirem no
 * primeiro ajuste de espaçamento — e
 * dinheiro exibido de dois jeitos diferentes na mesma compra é o tipo de coisa
 * que ninguém percebe até o cliente reclamar.
 */

/** Linha rótulo à esquerda, valor à direita — a unidade de todo o painel. */
export function SummaryRow({
  label,
  value,
  className,
  href,
  linkText,
}: {
  label: string;
  value: string;
  className?: string;
  /** Torna `linkText` (o começo de `value`) um link — o número do pedido → chat. */
  href?: string;
  linkText?: string;
}) {
  const linked = href && linkText && value.startsWith(linkText);
  return (
    <div
      className={`flex items-baseline justify-between gap-[15px] ${className ?? "mt-[22px]"}`}
    >
      <span className="font-helvetica text-[16px] leading-[16px] font-bold tracking-[0.16px] text-white/80">
        {label}
      </span>
      <span className="truncate font-poppins text-[16px] leading-[23px] font-semibold tracking-[0.08px] text-white">
        {linked ? (
          <>
            <a href={href} title="Ir para o chat do pedido" className="underline decoration-white/30 underline-offset-[3px] transition-colors hover:text-brand-orange hover:decoration-brand-orange">
              {linkText}
            </a>
            {value.slice(linkText.length)}
          </>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

export type SummaryLine = {
  id: string;
  name: string;
  platform: string;
  /** Já formatada: "4x" no catálogo; no serviço, o resumo da escolha. */
  quantity: string;
  /**
   * "Jogo / Aba / Servidor / Categoria / Subcategoria" (2026-10-23) — a
   * segunda linha. Ausente = a linha antiga ("4x Produto / Servidor").
   */
  path?: string;
  /** Já formatado em BRL. */
  price: string;
};

/** "4x", "1.000x" — a quantidade do catálogo. O serviço manda o resumo da escolha. */
const UNITS = /^\d[\d.,]*\s*x$/i;

/**
 * Um item do pedido em UMA linha (2026-10-20, pedido do usuário: "não é prático
 * pra bater o olho"): "4x Exalted Orb / Forbidden Rites" à esquerda e o preço
 * à direita. A quantidade vai na frente do nome — a linha "Quantidade" saiu.
 * No serviço a "quantidade" é o resumo da escolha ("Nível 1 → 50"), que segue
 * o servidor em vez de virar prefixo.
 *
 * Antes eram ~200px por item (nome 18px, logo, data e três linhas rótulo/
 * valor); a data é da compra e já aparece uma vez no cabeçalho.
 */
export function OrderLineBlock({ line }: { line: SummaryLine }) {
  const units = UNITS.test(line.quantity.trim());

  // Com caminho (2026-10-23): "6x Fracturing Orb" em cima e "Path of Exile 2 /
  // Moedas / Forbidden Rites" embaixo, em letra menor. No serviço, o resumo da
  // escolha segue o nome ("Boost · Nível 1 → 50").
  if (line.path) {
    return (
      <div className="flex items-baseline justify-between gap-[15px] py-[10px]">
        <div className="min-w-0">
          <p className="font-poppins text-[15px] leading-[21px] font-semibold text-white">
            {units ? `${line.quantity.trim()} ` : ""}
            {line.name}
            {!units && line.quantity ? <span className="font-normal text-white/70"> · {line.quantity}</span> : null}
          </p>
          <p className="mt-[2px] font-helvetica text-[13px] leading-[18px] break-words text-white/55">{line.path}</p>
        </div>
        <span className="shrink-0 font-poppins text-[15px] leading-[21px] font-semibold text-white tabular-nums">
          {line.price}
        </span>
      </div>
    );
  }

  const where = units || !line.quantity ? line.platform : `${line.platform} · ${line.quantity}`;
  return (
    <div className="flex items-baseline justify-between gap-[15px] py-[10px]">
      <p className="min-w-0 font-poppins text-[15px] leading-[21px] text-white">
        <span className="font-semibold">
          {units ? `${line.quantity.trim()} ` : ""}
          {line.name}
        </span>
        {where ? <span className="text-white/55"> / {where}</span> : null}
      </p>
      <span className="shrink-0 font-poppins text-[15px] leading-[21px] font-semibold text-white tabular-nums">
        {line.price}
      </span>
    </div>
  );
}

/**
 * A conta de um pedido de SERVIÇO: cada linha do preço (faixa de nível,
 * adicionais) e as horas estimadas, em letra pequena logo abaixo da linha do
 * item — é o que o atendente entrega e o que o cliente confere.
 */
export function ServiceDetailsBlock({
  lines,
  hours,
}: {
  lines: { label: string; price: string }[];
  hours: string | null;
}) {
  return (
    <dl aria-label="Detalhes do serviço" className="-mt-[4px] flex flex-col gap-[2px] pb-[10px] pl-[12px]">
      {lines.map((line, index) => (
        <div key={`${index}-${line.label}`} className="flex items-baseline justify-between gap-[15px]">
          <dt className="min-w-0 truncate font-helvetica text-[13px] text-white/55">{line.label}</dt>
          <dd className="shrink-0 font-poppins text-[13px] text-white/75 tabular-nums">{line.price}</dd>
        </div>
      ))}
      {hours ? (
        <div className="flex items-baseline justify-between gap-[15px]">
          <dt className="font-helvetica text-[13px] text-white/55">Total de horas</dt>
          <dd className="shrink-0 font-poppins text-[13px] text-white/75">{hours}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * Os brindes do pedido, logo abaixo da trilha (2026-10-20): é o que vai junto
 * na entrega, e no meio dos itens se perdia. Um por JOGO. Mesma peça na tela do
 * pedido e no chat do painel.
 */
export function OrderGiftList({ gifts, className }: { gifts: OrderGift[]; className?: string }) {
  if (gifts.length === 0) return null;
  return (
    <ul className={`flex flex-col gap-[8px] ${className ?? ""}`}>
      {gifts.map((gift, index) => (
        <li
          key={`${index}-${gift.text}`}
          className="rounded-[15px] border border-[#22c55e]/35 bg-[#22c55e]/10 px-[16px] py-[10px] font-helvetica text-[14px] leading-[20px] text-white"
        >
          <strong className="font-bold text-[#4ade80]">Brinde: {gift.text}</strong>
          {gift.server ? <span className="text-white/70"> · entregue em {gift.server}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Os brindes de um pedido, na ordem dos itens que os trouxeram. */
export function purchaseGifts(items: { gift?: OrderGift | null }[]): OrderGift[] {
  return items.flatMap((item) => (item.gift ? [item.gift] : []));
}

/** Preço / Desconto / Total, com os divisores do arquivo. */
export function TotalsBlock({
  price,
  discount,
  fee,
  total,
}: {
  price: string;
  discount: string;
  /** Taxa do cartão de crédito (2026-10-27). Ausente/nula = linha some. */
  fee?: string | null;
  total: string;
}) {
  return (
    <>
      <SummaryRow label="Preço" value={price} className="mt-[26px]" />
      <SummaryRow label="Desconto" value={discount} />
      {fee ? <SummaryRow label="Taxa do cartão" value={`+ ${fee}`} /> : null}

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
