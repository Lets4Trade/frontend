import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { getAdminLoyaltyTiers } from "@/features/admin/loyalty/data";
import { LoyaltyTiersEditor } from "@/features/admin/loyalty/LoyaltyTiersEditor";

export const metadata: Metadata = {
  title: "Níveis de fidelidade | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Níveis de fidelidade (2026-10-06): nome, "a partir de", % de
 * cashback e ícone de cada nível. Só ADMIN (cashback é dinheiro). Os textos da
 * página /fidelidade continuam em Páginas → Fidelidade.
 */
export default async function LoyaltyTiersPage() {
  await requireAdminPage();
  const tiers = await getAdminLoyaltyTiers();

  return (
    <div className={`${ADMIN_SHELL} pb-[80px]`}>
      <Link href="/admin/paginas?pagina=fidelidade" className="font-poppins text-[13px] font-bold text-brand-orange hover:underline">
        ← Página de fidelidade
      </Link>
      <h1 className="mt-[6px] font-poppins text-[26px] leading-[32px] font-semibold text-white">Níveis de fidelidade</h1>
      <p className="mt-[6px] max-w-[820px] font-helvetica text-[15px] text-brand-fg-muted">
        Nome, valor a partir do qual o cliente entra no nível (total já pago na loja), cashback em Lets Coins e ícone. O
        cashback de cada compra usa o nível do cliente no momento da entrega.
      </p>

      <div className="mt-[28px]">
        {tiers ? (
          <LoyaltyTiersEditor initialTiers={tiers} />
        ) : (
          <p role="alert" className="rounded-2xl border border-red-9/50 bg-red-9/10 px-4 py-3 font-helvetica text-[14px] text-white">
            Não conseguimos carregar os níveis agora. Confira se o backend está no ar e recarregue a página.
          </p>
        )}
      </div>
    </div>
  );
}
