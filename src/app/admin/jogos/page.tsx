import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DeleteGameButton } from "@/features/admin/builder/DeleteGameButton";
import { getBuilderGames } from "@/features/admin/builder/list";
import { centralHref } from "@/features/admin/games/central";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { backendAsset } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "Jogos | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Jogos (2026-09-28, fora do Figma — pedida pelo usuário: "uma página
 * só pra jogos, listar e editar/criar").
 *
 * O CRUD do catálogo de jogos num lugar só: cadastrar (`/admin/jogos/novo`),
 * listar e buscar (aqui), abrir a Central do jogo (`/admin/jogos/[id]` —
 * cadastro, abas, produtos, categorias e atalhos da página; admin-games-ux.md,
 * Etapa 2) e excluir (lixeira — desativa, igual à de produto).
 *
 * A busca filtra em memória: a lista é a mesma do Builder (jogos ativos, com
 * contagem de produtos), e o catálogo de jogos tem dezenas de linhas, não
 * milhares. Se crescer, a busca vai para o backend como a de produtos.
 */
export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rawSearch = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const search = rawSearch.toLocaleLowerCase("pt-BR");

  const games = await getBuilderGames();
  const visible = search
    ? games.filter(
        (game) =>
          game.name.toLocaleLowerCase("pt-BR").includes(search) || game.slug.includes(search),
      )
    : games;

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <div className="flex flex-wrap items-end justify-between gap-[20px]">
        <div>
          <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
            Jogos
          </h1>
          <p className="mt-[12px] font-poppins text-[15px] text-brand-fg-muted">
            {games.length} jogo{games.length === 1 ? "" : "s"} na loja
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[15px]">
          {/* GET puro: a busca fica na URL e funciona sem JavaScript. */}
          <form action="/admin/jogos" className="flex">
            <label htmlFor="games-search" className="sr-only">
              Buscar jogo
            </label>
            <input
              id="games-search"
              type="search"
              name="q"
              defaultValue={rawSearch}
              placeholder="Buscar jogo"
              maxLength={80}
              className="h-[50px] w-[260px] rounded-full border border-white/10 bg-[image:var(--brand-surface-fill)] px-[25px] font-poppins text-[14px] text-white placeholder:text-brand-fg-subtle focus:border-brand-orange/60 focus:outline-none"
            />
          </form>
          <Link
            href="/admin/jogos/novo"
            className="flex h-[50px] items-center rounded-full bg-brand-orange px-[30px] font-poppins text-[14px] font-bold text-black transition-opacity hover:opacity-90"
          >
            + Cadastrar jogo
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-[80px] text-center">
          <p className="font-helvetica text-[18px] text-brand-fg-muted">
            {search ? "Nenhum jogo encontrado com essa busca." : "Nenhum jogo cadastrado ainda."}
          </p>
          <Link
            href={search ? "/admin/jogos" : "/admin/jogos/novo"}
            className="mt-4 inline-block font-poppins text-[16px] font-bold text-brand-orange transition-opacity hover:opacity-80"
          >
            {search ? "Limpar busca" : "Cadastrar o primeiro jogo →"}
          </Link>
        </div>
      ) : (
        <ul className="mt-[40px] flex flex-col gap-[15px]">
          {visible.map((game) => {
            // A lista do backend traz `/uploads/...`; servido pelo Next daria 404.
            const art = backendAsset(game.imageUrl);
            return (
            <li
              key={game.id}
              className="flex flex-wrap items-center gap-x-[25px] gap-y-[15px] rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] py-[15px]"
            >
              <div className="relative size-[70px] shrink-0">
                {art ? (
                  <Image src={art} alt="" fill sizes="70px" className="object-contain" />
                ) : (
                  <span className="absolute inset-0 rounded-[12px] border border-dashed border-white/15" />
                )}
              </div>

              <div className="min-w-[200px] flex-1">
                {/* O nome já leva à Central: é onde se clica por instinto. */}
                <Link
                  href={centralHref(game.id)}
                  className="block truncate font-poppins text-[16px] font-bold text-white transition-colors hover:text-brand-orange"
                >
                  {game.name}
                </Link>
                <Link
                  href={`/games/${game.slug}`}
                  target="_blank"
                  className="mt-[4px] inline-block font-poppins text-[13px] text-brand-fg-subtle transition-colors hover:text-brand-orange"
                >
                  /games/{game.slug} ↗
                </Link>
              </div>

              <Link
                href={`/admin/produtos?jogo=${encodeURIComponent(game.id)}`}
                className="font-poppins text-[13px] text-brand-fg-muted transition-colors hover:text-white"
              >
                {game.productCount} produto{game.productCount === 1 ? "" : "s"}
              </Link>

              <div className="flex flex-wrap items-center gap-[10px]">
                {/* Um botão só (Etapa 2): abas, categorias, cadastro e página
                    moram na Central, a um clique uma da outra. */}
                <Link
                  href={centralHref(game.id)}
                  aria-label={`Abrir ${game.name}`}
                  className="flex h-[36px] items-center rounded-full border border-brand-orange/50 px-[22px] font-poppins text-[13px] font-bold text-brand-orange transition-opacity hover:opacity-80"
                >
                  Abrir
                </Link>
                <DeleteGameButton id={game.id} name={game.name} />
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
