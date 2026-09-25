import type { Metadata } from "next";
import { AdminFormCard } from "@/features/admin/AdminFormCard";
import { getAdminGames } from "@/features/admin/catalog";
import { SectionsEditor } from "@/features/admin/sections/SectionsEditor";
import { getSectionsAdmin } from "@/features/site/list";
import { sitePage } from "@/features/site/sections";

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
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSectionsPage({ searchParams }: PageProps) {
  // `?pagina=layout` abre direto na página pedida — é o destino dos botões de
  // `/admin/paginas` para as páginas que ainda usam este formulário. Sem isto
  // a tela sempre abria em "Home" (2026-09-25). Chave fora do catálogo cai no
  // padrão em vez de quebrar.
  const params = await searchParams;
  const requested = typeof params.pagina === "string" ? params.pagina : undefined;
  const initialPage = requested && sitePage(requested) ? requested : undefined;

  // Em paralelo: são leituras independentes. Os jogos alimentam o seletor dos
  // slides do hero — escolher um jogo cadastrado em vez de redigitar nome e link.
  const [{ sections, tabs }, games] = await Promise.all([getSectionsAdmin(), getAdminGames()]);

  return (
    <AdminFormCard title="EDIÇÃO DE SESSÃO" headingId="titulo-sessoes">
      <div className="px-[50px] pt-[35px]">
        <SectionsEditor
          sections={sections}
          tabs={tabs}
          games={games.map(({ id, name, slug }) => ({ id, name, slug }))}
          initialPage={initialPage}
          // Remonta ao trocar de página pela URL: o estado inicial do editor
          // só é lido na montagem.
          key={initialPage ?? "padrao"}
        />
      </div>
    </AdminFormCard>
  );
}
