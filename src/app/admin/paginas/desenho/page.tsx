import { getAdminGames } from "@/features/admin/catalog";
import type { Metadata } from "next";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { buildHomeBlocks } from "@/features/home/homeBlocks";
import {
  getSectionItemsFor,
  getSectionLayout,
  getSectionsFor,
} from "@/features/site/content";
import { EditorHeader } from "@/features/pages/editor/EditorHeader";
import { editorBack, editorTabs } from "@/features/pages/editor/editorNav";
import { PageEditor, type EditorBlock } from "@/features/site/editing/PageEditor";
import { sitePage } from "@/features/site/sections";

export const metadata: Metadata = {
  title: "Páginas | Lets4Trade",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Páginas que já têm edição inline. As demais entram conforme forem migradas. */
const EDITABLE_PAGES = ["home"] as const;


/**
 * Edição no próprio desenho da página (2026-09-15) — desde 2026-09-25 em
 * `/admin/paginas/desenho`, só para TEXTOS e IMAGENS das seções do Figma. A
 * ordem e os blocos passaram ao construtor (`/admin/paginas`).
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
      {/* Mesmo cabeçalho dos outros editores (2026-10-01): voltar, nome, "Ver na
          loja" e as abas da Home. Trocar de página é voltar à lista. */}
      <EditorHeader
        title={catalog?.label ?? "Home"}
        back={editorBack(pageKey)}
        storeHref={catalog?.href ?? "/"}
        tabs={editorTabs(pageKey, "desenho")}
      />
      <p className="mt-[10px] font-poppins text-[14px] text-brand-fg-muted">
        Clique no texto ou na imagem para editar. Textos vão para a loja em Publicar; imagens trocam na hora.
      </p>

      <div className="mt-[30px]">
        <PageEditor
          page={pageKey}
          blocks={blocks}
          initialOrder={layout.visible}
          initialHidden={layout.hidden}
          games={games.map(({ id, name, slug }) => ({ id, name, slug }))}
          orderLocked
        />
      </div>
    </div>
  );
}
