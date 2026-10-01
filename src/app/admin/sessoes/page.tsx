import { redirect } from "next/navigation";
import { settingsHref } from "@/features/admin/settings/catalog";

/**
 * O antigo formulário "EDIÇÃO DE SESSÃO" (Figma 3806:7081) foi APOSENTADO em
 * 2026-10-01, a pedido do usuário: ficam só a edição no desenho
 * (`/admin/paginas/desenho`) e as telas atuais (Páginas, Configurações).
 * Tudo o que ele editava tem lugar nelas.
 *
 * A rota continua só para não quebrar link salvo: manda cada página para onde
 * ela é editada hoje.
 */
const DESTINO: Record<string, string> = {
  home: "/admin/paginas/desenho?pagina=home",
  venda: "/admin/paginas?pagina=venda",
  fidelidade: "/admin/paginas?pagina=fidelidade",
  games: "/admin/paginas?pagina=jogos-compartilhado",
  layout: "/admin/paginas?pagina=cabecalho",
  legal: "/admin/paginas?pagina=legal",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OldSectionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pagina = typeof params.pagina === "string" ? params.pagina : "";
  const secao = typeof params.secao === "string" ? params.secao : "";
  if (pagina === "layout" && settingsHref(secao)) redirect(settingsHref(secao)!);
  redirect(DESTINO[pagina] ?? "/admin/paginas");
}
