import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CouponForm } from "@/features/admin/coupons/CouponForm";
import { getAdminCoupon, getCouponTargetGames } from "@/features/admin/coupons/data";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";

export const metadata: Metadata = {
  title: "Cupom | Lets4Trade",
  robots: { index: false, follow: false },
};

/** Painel → Cupons → um cupom. Só ADMIN. Inexistente ou leitura que falhou: 404. */
export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [coupon, games] = await Promise.all([getAdminCoupon(id), getCouponTargetGames()]);
  if (coupon === null) notFound();

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <Link href="/admin/cupons" className="font-poppins text-[13px] font-bold text-brand-orange hover:underline">
        ← Cupons
      </Link>
      <h1 className="mt-[6px] mb-[28px] font-helvetica text-[28px] leading-tight font-bold text-white">{coupon.code}</h1>
      {/* `key` pelo conteúdo salvo: depois de salvar, o formulário remonta com o que o servidor devolveu. */}
      <CouponForm key={JSON.stringify(coupon)} coupon={coupon} games={games} />
    </div>
  );
}
