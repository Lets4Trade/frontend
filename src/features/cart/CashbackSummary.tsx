import Image from "next/image";
import { formatBps } from "./cashback";
import { formatCents } from "./store";

/**
 * O cartão de CASHBACK da compra (2026-10-09 na gaveta; 2026-10-12 também no
 * checkout, pedido do usuário: "o checkout no mesmo estilo do carrinho").
 *
 * Só desenho: quem chama faz a conta (`estimateCashback`) e diz de qual nível.
 * `invite` = visitante sem conta — o texto vira o convite para entrar.
 */
export function CashbackSummary({
  icon,
  cents,
  coins,
  bps,
  tierName,
  invite = false,
  nextTierName,
  missingToNextCents = 0,
  className,
}: {
  icon: string;
  cents: number;
  coins: number;
  bps: number;
  tierName: string;
  invite?: boolean;
  nextTierName?: string | null;
  missingToNextCents?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[16px] border border-brand-orange/30 bg-[linear-gradient(135deg,rgba(255,115,0,0.14),rgba(255,115,0,0.03))] px-[14px] py-[12px] ${className ?? ""}`}
    >
      <div className="flex items-center gap-[12px]">
        <Image src={icon} alt="" width={44} height={44} aria-hidden className="size-[44px] shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-poppins text-[14px] leading-[19px] text-white">
            {invite ? "Entre e ganhe " : "Você ganha "}
            <strong className="bg-clip-text font-bold text-transparent" style={{ backgroundImage: "var(--brand-orange-gradient)" }}>
              {formatCents(cents)}
            </strong>{" "}
            de cashback
          </p>
          <p className="mt-[2px] font-helvetica text-[12px] leading-[16px] text-brand-fg-muted">
            {invite
              ? `${formatBps(bps)} em Lets Coins já no nível ${tierName}`
              : `${coins.toLocaleString("pt-BR")} Lets Coins · ${formatBps(bps)} do nível ${tierName}`}
          </p>
        </div>
      </div>
      <p className="mt-[8px] font-helvetica text-[11px] leading-[15px] text-white/50">
        Creditado quando o pedido for entregue.
        {nextTierName && missingToNextCents > 0
          ? ` Faltam ${formatCents(missingToNextCents)} para o nível ${nextTierName}.`
          : ""}
      </p>
    </div>
  );
}
