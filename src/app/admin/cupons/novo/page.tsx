import type { Metadata } from "next";
import Link from "next/link";
import { CouponForm } from "@/features/admin/coupons/CouponForm";
import { getCouponTargetGames } from "@/features/admin/coupons/data";
import { requirePanelArea } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";

export const metadata: Metadata = {
  title: "Novo cupom | Lets4Trade",
  robots: { index: false, follow: false },
};

/** Painel → Cupons → Novo cupom. Só ADMIN. */
export default async function NewCouponPage() {
  await requirePanelArea("promotions");
  const games = await getCouponTargetGames();

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <Link href="/admin/cupons" className="font-poppins text-[13px] font-bold text-brand-orange hover:underline">
        ← Cupons
      </Link>
      <h1 className="mt-[6px] mb-[28px] font-helvetica text-[28px] leading-tight font-bold text-white">Novo cupom</h1>
      <CouponForm coupon={null} games={games} />
    </div>
  );
}
