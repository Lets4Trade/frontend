import type { Metadata } from "next";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { SectionsEditor } from "@/features/admin/sections/SectionsEditor";
import { getSectionsAdmin } from "@/features/site/list";

export const metadata: Metadata = {
  title: "Edição de sessões — Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * "EDIÇÃO DE SESSÃO" (Figma 3806:7081).
 *
 * A guarda de rota é do `app/admin/layout.tsx` (sem sessão vai para o login,
 * sessão sem ADMIN recebe 404) e quem autoriza de verdade é o `RolesGuard` do
 * backend, rota por rota.
 *
 * Server component fino: busca e entrega. Quem edita é o `SectionsEditor`, que
 * precisa ser client porque a tela troca de sessão, renomeia aba e sobe arte
 * sem recarregar.
 *
 * A moldura é o `AdminFormCard` — o MESMO card de 1510 do cadastro de jogo e do
 * de produto, que é o que o arquivo desenha aqui também (1510×606, raio 30,
 * traço branco a 20% e a faixa de brilho no topo).
 */
export default async function AdminSectionsPage() {
  const { sections, tabs } = await getSectionsAdmin();

  return (
    <AdminFormCard title="EDIÇÃO DE SESSÃO" headingId="titulo-sessoes">
      <div className="px-[50px] pt-[35px]">
        <SectionsEditor sections={sections} tabs={tabs} />
      </div>
    </AdminFormCard>
  );
}
