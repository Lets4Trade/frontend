import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { AdminSearchBox, FilterMenu } from "@/features/admin/AdminFilters";
import { DeleteBlogPostButton } from "@/features/admin/blog/DeleteBlogPostButton";
import { getAdminBlogPosts } from "@/features/admin/blog/list";
import { ADMIN_BLOG_STATUS, adminBlogHref, parseAdminBlogQuery } from "@/features/admin/blog/query";
import { getAdminGames } from "@/features/admin/catalog";
import { ADMIN_SHELL } from "@/features/admin/layout";

export const metadata: Metadata = {
  title: "Notícias | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Notícias (fora do Figma; contrato blog.md). ADMIN e EDITOR — o
 * layout do painel já barra os demais, e o backend confere de novo.
 *
 * No estilo de `/admin/jogos`, mas com busca/filtros no BACKEND (paginado):
 * notícia cresce sem teto, diferente do catálogo de jogos. Filtros na URL —
 * filtrar é navegar, sem JS.
 */
export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Os jogos primeiro: validam o `?jogo=` (id inventado vira "sem filtro").
  const games = await getAdminGames();
  const query = parseAdminBlogQuery(
    params,
    games.map((game) => game.id),
  );
  const page = await getAdminBlogPosts(query);
  const filtering = query.search !== "" || query.game !== "" || query.status !== "";

  const gameLabel = games.find((game) => game.id === query.game)?.name ?? "Todos os jogos";
  const statusLabel = ADMIN_BLOG_STATUS.find((option) => option.value === query.status)?.label ?? "Todos os status";

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <div className="flex flex-wrap items-end justify-between gap-[20px]">
        <div>
          <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">Notícias</h1>
          <p className="mt-[12px] font-poppins text-[15px] text-brand-fg-muted">
            {page ? `${page.total} notícia${page.total === 1 ? "" : "s"}${filtering ? " encontradas" : ""}` : "-"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[15px]">
          {/* `key` pelo filtro: remonta o <details> e ele fecha após escolher. */}
          <FilterMenu
            key={`g:${query.game}`}
            width={220}
            label={gameLabel}
            active={query.game !== ""}
            options={[
              { href: adminBlogHref(query, { game: "", page: 1 }), label: "Todos os jogos", active: query.game === "" },
              ...games.map((game) => ({
                href: adminBlogHref(query, { game: game.id, page: 1 }),
                label: game.name,
                active: game.id === query.game,
              })),
            ]}
          />
          <FilterMenu
            key={`s:${query.status}`}
            width={200}
            label={statusLabel}
            active={query.status !== ""}
            options={[
              { href: adminBlogHref(query, { status: "", page: 1 }), label: "Todos os status", active: query.status === "" },
              ...ADMIN_BLOG_STATUS.map((option) => ({
                href: adminBlogHref(query, { status: option.value, page: 1 }),
                label: option.label,
                active: option.value === query.status,
              })),
            ]}
          />
          <AdminSearchBox
            action="/admin/noticias"
            name="q"
            defaultValue={query.search}
            placeholder="Buscar notícia"
            hidden={{ jogo: query.game, status: query.status }}
          />
          <Link
            href="/admin/noticias/nova"
            className="flex h-[50px] items-center rounded-full bg-brand-orange px-[30px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90"
          >
            + Nova notícia
          </Link>
        </div>
      </div>

      {page === null ? (
        <Empty message="Não conseguimos carregar as notícias agora. Tente recarregar a página." />
      ) : page.items.length === 0 ? (
        filtering ? (
          <Empty message="Nenhuma notícia com esses filtros." action={{ href: "/admin/noticias", label: "Limpar filtros" }} />
        ) : (
          <Empty
            message="Nenhuma notícia escrita ainda."
            action={{ href: "/admin/noticias/nova", label: "Escrever a primeira notícia →" }}
          />
        )
      ) : (
        <>
          <ul className="mt-[40px] flex flex-col gap-[15px]">
            {page.items.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center gap-x-[25px] gap-y-[15px] rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] py-[15px]"
              >
                <div className="relative h-[63px] w-[112px] shrink-0 overflow-hidden rounded-[12px] bg-[#2f2f2f]">
                  {post.cover ? (
                    <Image src={post.cover} alt="" fill sizes="112px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 rounded-[12px] border border-dashed border-white/15" />
                  )}
                </div>

                <div className="min-w-[220px] flex-1">
                  <p className="line-clamp-2 font-poppins text-[16px] font-bold text-white">{post.title}</p>
                  <p className="mt-[4px] font-poppins text-[13px] text-brand-fg-subtle">
                    {post.gameName ?? "Sem jogo"}
                    {post.publishedDate ? ` · ${post.publishedDate}` : ""}
                  </p>
                </div>

                <span
                  className={`rounded-full px-[14px] py-[6px] font-poppins text-[12px] font-bold ${
                    post.isPublished
                      ? "bg-brand-rating/15 text-brand-rating"
                      : "border border-white/15 text-brand-fg-muted"
                  }`}
                >
                  {post.isPublished ? "Publicada" : "Rascunho"}
                </span>

                <div className="flex items-center gap-[10px]">
                  {post.isPublished && post.slug ? (
                    <Link
                      href={`/noticias/${post.slug}`}
                      target="_blank"
                      className="flex h-[36px] items-center rounded-full border border-white/10 px-[18px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-80"
                    >
                      Ver ↗
                    </Link>
                  ) : null}
                  <Link
                    href={`/admin/noticias/${post.id}/editar`}
                    aria-label={`Editar ${post.title}`}
                    className="flex size-[36px] items-center justify-center rounded-[8px] border border-white/10 bg-[image:var(--brand-surface-fill)] transition-opacity hover:opacity-90"
                  >
                    <Image src="/icons/admin/pen.svg" alt="" width={16} height={16} aria-hidden className="size-[16px]" />
                  </Link>
                  <DeleteBlogPostButton id={post.id} name={post.title} />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            current={page.page}
            pageCount={page.pageCount}
            href={(next) => adminBlogHref(query, { page: next })}
            label="das notícias"
            className="mt-[50px]"
          />
        </>
      )}
    </div>
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
