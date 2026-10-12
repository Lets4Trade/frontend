import type { ReactNode } from "react";
import { formatCents } from "@/features/cart/store";
import { formatQuantity } from "@/features/game/configurator";
import { giftFor } from "@/features/pricing/gift";
import { formatGift, type CartGift } from "./cartGifts";

/**
 * O brinde de cada jogo do carrinho (2026-10-12) — um bloco só (filete verde, sem ícone), uma linha por
 * jogo com regra. Usado na gaveta do carrinho e no resumo do checkout.
 *
 * Três estados por jogo:
 *  - ganhou: "Você ganha 150Mi de Ouro" + quanto falta para o próximo passo;
 *  - bateu no teto: "brinde máximo desta compra";
 *  - ainda não: "Faltam R$ 10,00 para ganhar 50Mi de Ouro" — é o convite.
 *
 * `extra(gift)` desenha algo embaixo da linha (o checkout põe ali a escolha de
 * servidor).
 */
export function GiftSummary({
  gifts,
  note,
  extra,
  className,
}: {
  gifts: readonly CartGift[];
  /** Rodapé do cartão (ex.: "Calculado sobre o valor pago"). */
  note?: string;
  extra?: (gift: CartGift) => ReactNode;
  className?: string;
}) {
  if (gifts.length === 0) return null;

  return (
    <section
      aria-label="Brindes da compra"
      // Minimalista (pedido do usuário, 2026-10-12): sem ícone, sem degradê —
      // um filete verde à esquerda e o texto. O verde fica só no que se ganha.
      className={`border-l-2 border-[#22c55e]/70 py-[2px] pl-[12px] ${className ?? ""}`}
    >
      <ul className="flex flex-col gap-[10px]">
        {gifts.map((gift) => (
          <li key={gift.gameSlug} className="flex flex-col gap-[8px]">
            <GiftLine gift={gift} />
            {extra?.(gift)}
          </li>
        ))}
      </ul>
      {note ? <p className="mt-[6px] font-helvetica text-[11px] leading-[15px] text-white/40">{note}</p> : null}
    </section>
  );
}

function GiftLine({ gift }: { gift: CartGift }) {
  const { result, rule } = gift;
  const won = result.amount > 0;
  const step = formatGift(rule.amount, rule.label);
  // O que o PRÓXIMO passo acrescenta — menos que um passo inteiro quando o
  // teto corta no meio.
  const next = giftFor(rule, gift.paidCents + result.missingCents).amount - result.amount;

  return (
    <div className="min-w-0">
      {won ? (
        <p className="font-poppins text-[14px] leading-[19px] text-white">
          Você ganha <strong className="font-bold text-[#4ade80]">{formatGift(result.amount, rule.label)}</strong>
          <span className="text-white/70"> em {gift.gameName}</span>
        </p>
      ) : (
        <p className="font-poppins text-[14px] leading-[19px] text-white">
          Faltam <strong className="font-bold text-[#4ade80]">{formatCents(result.missingCents)}</strong> para ganhar{" "}
          <strong className="font-bold text-white">{step}</strong>
          <span className="text-white/70"> em {gift.gameName}</span>
        </p>
      )}
      <p className="mt-[2px] font-helvetica text-[12px] leading-[16px] text-brand-fg-muted">
        {result.capped
          ? "Você atingiu o brinde máximo desta compra."
          : won
            ? `Mais ${formatCents(result.missingCents)} e ganhe +${formatQuantity(next)}.`
            : `${step} a cada ${formatCents(rule.everyCents)} pagos no jogo.`}
      </p>
    </div>
  );
}
