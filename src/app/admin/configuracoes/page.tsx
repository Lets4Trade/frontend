import type { Metadata } from "next";
import Link from "next/link";
import { getSessionRole } from "@/features/auth/session";
import { SETTINGS_PAGE } from "@/features/admin/settings/catalog";
import { SettingsBoard } from "@/features/admin/settings/SettingsBoard";
import { getSectionsAdmin } from "@/features/site/list";

export const metadata: Metadata = {
  title: "Configurações da loja | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * "Configurações da loja" (2026-10-01) — WhatsApp, Discord, logo, ícone,
 * dados da empresa e redes sociais numa tela só, a 1 clique do menu.
 *
 * Mesma permissão de antes: estes campos já eram editáveis por ADMIN e EDITOR
 * em "Páginas → Cabeçalho e rodapé". A guarda de navegação é do layout do
 * painel; quem autoriza a escrita é o `RolesGuard` do backend.
 */
export default async function StoreSettingsPage() {
  const [snapshot, role] = await Promise.all([getSectionsAdmin(), getSessionRole()]);
  const sections = snapshot.sections.filter((section) => section.key.startsWith(`${SETTINGS_PAGE}:`));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-[16px] pt-[32px] pb-[120px] sm:px-[32px] lg:px-[50px] lg:pt-[50px]">
      <h1 className="font-poppins text-[26px] leading-[32px] font-semibold text-white">Configurações da loja</h1>
      <p className="mt-[6px] max-w-[760px] font-helvetica text-[15px] text-brand-fg-muted">
        Contatos, marca, dados da empresa e redes sociais. Cada cartão salva sozinho e a loja muda na hora.
      </p>
      {/* Atalho só para ADMIN: a tela de níveis mexe em cashback (dinheiro). */}
      {role === "ADMIN" ? (
        <p className="mt-[10px] font-helvetica text-[14px] text-brand-fg-muted">
          Níveis, cashback e ícones da fidelidade:{" "}
          <Link href="/admin/fidelidade" className="font-bold text-brand-orange hover:underline">
            Níveis de fidelidade →
          </Link>
        </p>
      ) : null}

      {snapshot.failed ? (
        <p
          role="alert"
          className="mt-[24px] rounded-2xl border border-red-9/50 bg-red-9/10 px-4 py-3 font-helvetica text-[14px] text-white"
        >
          Não conseguimos carregar as configurações agora. Recarregue a página em instantes.
        </p>
      ) : (
        <div className="mt-[28px]">
          <SettingsBoard initialSections={sections} />
        </div>
      )}
    </div>
  );
}
