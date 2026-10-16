import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { AdminSearchBox } from "@/features/admin/AdminFilters";
import { getAdminCoupons } from "@/features/admin/coupons/data";
import {
  couponStatus,
  discountLabel,
  scopeLabel,
  usageLabel,
  validityLabel,
} from "@/features/admin/coupons/types";
import { requirePanelArea } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Cupons | Lets4Trade",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Painel → Cupons (2026-10-12, fora do Figma). Só ADMIN. Busca por código e
 * paginação no BACKEND, pela URL — filtrar é navegar, sem JS.
 */
export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelArea("promotions");
  const params = await searchParams;
  const search = first(params.q).trim().slice(0, 40);
  const page = Math.max(1, Number.parseInt(first(params.pagina), 10) || 1);
  const result = await getAdminCoupons(search, page);

  const href = (next: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (next > 1) query.set("pagina", String(next));
    const text = query.toString();
    return `/admin/cupons${text ? `?${text}` : ""}`;
  };

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <div className="flex flex-wrap items-end justify-between gap-[20px]">
        <div>
          <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">Cupons</h1>
          <p className="mt-[12px] font-poppins text-[15px] text-brand-fg-muted">
            {result
              ? `${result.total} ${result.total === 1 ? "cupom" : "cupons"}${search ? (result.total === 1 ? " encontrado" : " encontrados") : ""}`
              : "-"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[15px]">
          <AdminSearchBox action="/admin/cupons" name="q" defaultValue={search} placeholder="Buscar código" hidden={{}} />
          <Link
            href="/admin/cupons/novo"
            className="flex h-[50px] items-center rounded-full bg-brand-orange px-[30px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90"
          >
            + Novo cupom
          </Link>
        </div>
      </div>

      {result === null ? (
        <Empty message="Não conseguimos carregar os cupons agora. Tente recarregar a página." />
      ) : result.items.length === 0 ? (
        search ? (
          <Empty message="Nenhum cupom com esse código." action={{ href: "/admin/cupons", label: "Limpar busca" }} />
        ) : (
          <Empty message="Nenhum cupom criado ainda." action={{ href: "/admin/cupons/novo", label: "Criar o primeiro cupom →" }} />
        )
      ) : (
        <>
          <ul className="mt-[40px] flex flex-col gap-[12px]">
            {result.items.map((coupon) => {
              const status = couponStatus(coupon);
              return (
                <li key={coupon.id}>
                  <Link
                    href={`/admin/cupons/${coupon.id}`}
                    className="grid items-center gap-x-[24px] gap-y-[8px] rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] py-[16px] transition-colors hover:border-brand-orange/50 md:grid-cols-[minmax(160px,1.2fr)_110px_110px_minmax(150px,1fr)_minmax(140px,1fr)_100px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-poppins text-[16px] font-bold tracking-[0.4px] text-white">{coupon.code}</span>
                      {coupon.description ? (
                        <span className="block truncate font-helvetica text-[12px] text-white/50">{coupon.description}</span>
                      ) : null}
                    </span>
                    <Cell label="Desconto">{discountLabel(coupon)}</Cell>
                    <Cell label="Usos">{usageLabel(coupon)}</Cell>
                    <Cell label="Validade">{validityLabel(coupon)}</Cell>
                    <Cell label="Onde vale">{scopeLabel(coupon)}</Cell>
                    <span
                      className={cn(
                        "w-fit rounded-full px-[12px] py-[4px] font-poppins text-[12px] font-bold",
                        status.tone === "on" && "bg-[#22c55e]/15 text-[#4ade80]",
                        status.tone === "wait" && "bg-brand-orange/15 text-brand-orange",
                        status.tone === "off" && "bg-white/10 text-white/60",
                      )}
                    >
                      {status.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination current={result.page} pageCount={result.pageCount} href={href} label="dos cupons" className="mt-[50px]" />
        </>
      )}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: string }) {
  return (
    <span className="min-w-0">
      <span className="block font-poppins text-[11px] text-white/45 uppercase">{label}</span>
      <span className="block truncate font-helvetica text-[14px] text-white">{children}</span>
    </span>
  );
}

function Empty({ message, action }: { message: string; action?: { href: string; label: string } }) {
  return (
    <div className="py-[80px] text-center">
      <p className="font-helvetica text-[18px] text-brand-fg-muted">{message}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-block font-poppins text-[16px] font-bold text-brand-orange transition-opacity hover:opacity-80"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
