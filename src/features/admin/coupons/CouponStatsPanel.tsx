import { formatCents, type CouponStats } from "./types";

/**
 * Métricas do cupom na tela dele (2026-11-18, pedido do usuário: "quanto ele já
 * descontou e o valor total dos pedidos em que foi usado"). Só pedidos PAGOS e
 * não cancelados — a regra é do backend (`CouponsService.statsFor`).
 */
export function CouponStatsPanel({ stats }: { stats: CouponStats }) {
  return (
    <section aria-label="Resultados do cupom" className="mb-[28px]">
      <dl className="grid gap-[12px] sm:grid-cols-3">
        <Metric label="Pedidos pagos" value={stats.orders.toLocaleString("pt-BR")} />
        <Metric label="Já descontou" value={formatCents(stats.discountCents)} hint="Quanto os clientes economizaram" />
        <Metric
          label="Faturamento"
          value={formatCents(stats.revenueCents)}
          hint={`O que foi pago · ${formatCents(stats.grossCents)} antes dos descontos`}
        />
      </dl>
      <p className="mt-[10px] font-helvetica text-[12px] text-white/45">
        Conta só pedidos pagos. Pedido aguardando pagamento ou cancelado fica de fora.
      </p>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[22px] py-[16px]">
      <dt className="font-poppins text-[11px] text-white/45 uppercase">{label}</dt>
      <dd className="mt-[4px] font-poppins text-[24px] leading-tight font-bold text-white">{value}</dd>
      {hint ? <dd className="mt-[2px] font-helvetica text-[12px] text-white/50">{hint}</dd> : null}
    </div>
  );
}
