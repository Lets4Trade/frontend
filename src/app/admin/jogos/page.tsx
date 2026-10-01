import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { AdminSearchBox } from "@/features/admin/AdminFilters";
import { DeleteGameButton } from "@/features/admin/builder/DeleteGameButton";
import { getBuilderGames } from "@/features/admin/builder/list";
import { centralHref } from "@/features/admin/games/central";
import { requireAdminPage } from "@/features/admin/guard";
import { ADMIN_SHELL } from "@/features/admin/layout";
import { cn } from "@/lib/cn";
import { backendAsset } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "Jogos | Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Painel → Jogos — no MESMO formato de Produtos (2026-10-01, pedido do
 * usuário): título + ação à direita, busca, e uma TABELA (arte, nome, link na
 * loja, produtos, ações). Antes eram cartões largos, cada um com o seu jeito.
 *
 * A busca é por nome ou link, na lista que já veio (poucos jogos; não pagina).
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
        (game) => game.name.toLocaleLowerCase("pt-BR").includes(search) || game.slug.includes(search),
      )
    : games;

  return (
    <div className={`${ADMIN_SHELL} pb-[120px]`}>
      <div className="flex flex-col gap-[24px]">
        <div className="flex flex-wrap items-center gap-[16px]">
          <h1 className="mr-auto font-poppins text-[26px] leading-[32px] font-semibold text-white">Jogos</h1>
          <Link href="/admin/jogos/novo" className={cn(buttonVariants({ variant: "primary" }), "px-[24px]")}>
            + Novo jogo
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-[12px]">
          <AdminSearchBox
            action="/admin/jogos"
            name="q"
            defaultValue={rawSearch}
            placeholder="Buscar pelo nome…"
            hidden={{}}
          />
        </div>
      </div>

      <div className="mt-[24px]">
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
          <>
            <p className="mb-[10px] font-helvetica text-[13px] text-brand-fg-subtle">
              {visible.length} {visible.length === 1 ? "jogo" : "jogos"}
            </p>
            <div className="overflow-hidden rounded-[18px] border border-brand-border bg-[image:var(--brand-surface-fill)]">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="border-b border-white/10 font-poppins text-[12px] font-bold tracking-[0.04em] text-brand-fg-subtle uppercase">
                  <tr>
                    <th scope="col" className="py-[12px] pr-[12px] pl-[18px]">
                      Jogo
                    </th>
                    <th scope="col" className="hidden w-[260px] px-[12px] py-[12px] md:table-cell">
                      Na loja
                    </th>
                    <th scope="col" className="w-[120px] px-[12px] py-[12px] text-right">
                      Produtos
                    </th>
                    <th scope="col" className="w-[110px] py-[12px] pr-[18px] pl-[12px] text-right">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visible.map((game) => {
                    const art = backendAsset(game.imageUrl);
                    return (
                      <tr key={game.id} className="transition-colors hover:bg-white/[0.03]">
                        <td className="py-[10px] pr-[12px] pl-[18px]">
                          <div className="flex min-w-0 items-center gap-[12px]">
                            <span className="relative size-[44px] shrink-0 overflow-hidden rounded-[10px] border border-white/10 bg-[#2f2f2f]">
                              {art ? <Image src={art} alt="" fill sizes="44px" className="object-contain" /> : null}
                            </span>
                            {/* O nome leva à Central: é onde se clica por instinto. */}
                            <Link
                              href={centralHref(game.id)}
                              className="min-w-0 truncate font-poppins text-[15px] font-semibold text-white hover:underline"
                            >
                              {game.name}
                            </Link>
                          </div>
                        </td>
                        <td className="hidden truncate px-[12px] md:table-cell">
                          <a
                            href={`/games/${game.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="font-helvetica text-[14px] text-white/70 transition-colors hover:text-white"
                          >
                            /games/{game.slug} ↗
                          </a>
                        </td>
                        <td className="px-[12px] text-right">
                          <Link
                            href={`/admin/produtos?jogo=${encodeURIComponent(game.id)}`}
                            className="font-poppins text-[14px] font-semibold text-white/80 transition-colors hover:text-white hover:underline"
                          >
                            {game.productCount}
                          </Link>
                        </td>
                        <td className="py-[10px] pr-[18px] pl-[12px]">
                          <div className="flex items-center justify-end gap-[8px]">
                            <Link
                              href={centralHref(game.id)}
                              aria-label={`Abrir ${game.name}`}
                              className="flex size-[36px] items-center justify-center rounded-[10px] border border-white/10 transition-colors hover:bg-white/5"
                            >
                              <Image
                                src="/icons/admin/pen.svg"
                                alt=""
                                width={16}
                                height={16}
                                aria-hidden
                                className="size-[16px]"
                              />
                            </Link>
                            <DeleteGameButton id={game.id} name={game.name} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
