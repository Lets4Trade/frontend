import { getAdminGames } from "@/features/admin/catalog";
import type { Metadata } from "next";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { buildHomeBlocks } from "@/features/home/homeBlocks";
import {
  getSectionItemsFor,
  getSectionLayout,
  getSectionsFor,
} from "@/features/site/content";
import { PageEditor, type EditorBlock } from "@/features/site/editing/PageEditor";
import { SITE_PAGES, sitePage } from "@/features/site/sections";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Páginas — Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Páginas que já têm edição inline. As demais entram conforme forem migradas. */
const EDITABLE_PAGES = ["home"] as const;

/**
 * "Páginas" — edição no próprio desenho da página (2026-09-15).
 *
 * Substitui o formulário de "Edição de sessões": em vez de campos, a página
 * real aparece aqui e o texto é editado onde ele está. Ver
 * `features/site/editing/PageEditor.tsx`.
 *
 * O SERVIDOR monta os blocos (os mesmos componentes da loja, com os mesmos
 * dados); o editor só os reordena e marca o que mudou.
 */
export default async function AdminPagesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = typeof params.pagina === "string" ? params.pagina : "home";
  const pageKey = (EDITABLE_PAGES as readonly string[]).includes(requested) ? requested : "home";

  const [section, items, layout, games] = await Promise.all([
    getSectionsFor(pageKey),
    getSectionItemsFor(pageKey),
    getSectionLayout(pageKey),
    // Para o botão "jogo" dos slides do hero: escolhe-se entre os cadastrados.
    getAdminGames(),
  ]);

  const catalog = sitePage(pageKey);
  const label = (key: string) =>
    catalog?.sections.find((item) => item.key === key)?.label ?? key;

  const blocks: EditorBlock[] = buildHomeBlocks(section, items).map((block) => ({
    key: block.key,
    label: label(block.key),
    gap: block.gap,
    node: block.node,
    // Como a seção chama UM item ("review", "membro"): é o que a barrinha de
    // ações escreve. Seção sem lista não ganha barrinha.
    itemLabel: catalog?.sections.find((item) => item.key === block.key)?.list?.itemLabel,
    itemLabels: block.itemLabels,
  }));

  return (
    <div className={`${ADMIN_SHELL} pb-[60px]`}>
      <header className="flex flex-wrap items-start justify-between gap-[25px]">
        <div>
          <h1 className="font-helvetica text-[25px] leading-none font-bold tracking-[0.25px] text-white">
            Páginas
          </h1>
          <p className="mt-[14px] font-poppins text-[16px] text-brand-fg-muted">
            Clique no texto da página para editar
          </p>
        </div>

        <nav aria-label="Páginas do site" className="flex flex-wrap gap-[10px]">
          {SITE_PAGES.map((item) => {
            const editable = (EDITABLE_PAGES as readonly string[]).includes(item.key);
            const active = item.key === pageKey;
            return editable ? (
              <Link
                key={item.key}
                href={`/admin/paginas?pagina=${item.key}`}
                aria-current={active ? "page" : undefined}
                className={`flex h-[40px] items-center rounded-full border px-[18px] font-poppins text-[14px] transition-colors ${
                  active
                    ? "border-brand-orange bg-brand-orange/10 text-white"
                    : "border-white/15 text-white/70 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              // Ainda no formulário antigo: link que leva para lá, em vez de um
              // item morto.
              <Link
                key={item.key}
                href={`/admin/sessoes?pagina=${item.key}`}
                className="flex h-[40px] items-center rounded-full border border-white/10 px-[18px] font-poppins text-[14px] text-white/40 transition-colors hover:text-white/70"
                title="Esta página ainda usa o formulário de sessões"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mt-[30px]">
        <PageEditor
          page={pageKey}
          pageLabel={catalog?.label ?? pageKey}
          blocks={blocks}
          initialOrder={layout.visible}
          initialHidden={layout.hidden}
          games={games.map(({ id, name, slug }) => ({ id, name, slug }))}
        />
      </div>
    </div>
  );
}
