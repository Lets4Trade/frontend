import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getBuilderGames } from "@/features/admin/builder/list";
import { backendAsset } from "@/lib/publicApi";
import { ADMIN_SHELL } from "@/features/admin/layout";

export const metadata: Metadata = {
  title: "Builder de Páginas — Lets4Trade",
  robots: { index: false, follow: false },
};

/**
 * Escolha do jogo a editar no builder.
 *
 * ⚠️ NÃO ESTÁ NO FIGMA. O arquivo desenha o builder com um jogo já carregado
 * (3883:2153) e não mostra como se chega nele — mas a aba "Builder de Page" do
 * cabeçalho precisa de um destino, e "abrir sempre o primeiro jogo" seria
 * escolher por quem administra.
 *
 * Mesmo precedente do `/admin/logs` e do modal de edição de usuário: tela fora
 * do arquivo, no estilo do painel, marcada como tal aqui para quem vier depois
 * não procurar o nó correspondente.
 *
 * Fica deliberadamente mínima — uma grade de jogos que leva ao builder. Se o
 * arquivo ganhar uma tela de listagem de jogos (que hoje não existe em lugar
 * nenhum do painel), esta some e vira um link de lá.
 */
export default async function BuilderPickerPage() {
  const games = await getBuilderGames();

  return (
    <div className={`${ADMIN_SHELL} pb-[100px]`}>
      <h1 className="font-helvetica text-[30px] leading-none font-bold tracking-[0.3px] text-white">
        Builder de Páginas
      </h1>
      <p className="mt-[15px] font-poppins text-[16px] text-brand-fg-muted">
        Escolha o game para personalizar a página da loja.
      </p>

      {games.length === 0 ? (
        <p className="mt-[50px] font-poppins text-[16px] text-brand-fg-subtle">
          Nenhum game cadastrado ainda.{" "}
          <Link href="/admin/jogos/novo" className="text-brand-orange">
            Cadastre o primeiro
          </Link>{" "}
          para poder montar a página dele.
        </p>
      ) : (
        <ul className="mt-[50px] grid grid-cols-[repeat(auto-fill,minmax(0,320px))] gap-[25px]">
          {games.map((game) => {
            const art = backendAsset(game.imageUrl);
            return (
              <li key={game.id}>
                <Link
                  href={`/admin/builder/${game.id}`}
                  className="flex h-[140px] items-center gap-[20px] rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[25px] transition-opacity hover:opacity-90"
                >
                  <div className="relative h-[90px] w-[110px] shrink-0">
                    {art ? (
                      <Image
                        src={art}
                        alt=""
                        fill
                        sizes="110px"
                        className="object-contain"
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-[12px] border border-dashed border-white/15" />
                    )}
                  </div>

                  <span className="min-w-0">
                    <span className="block truncate font-poppins text-[16px] font-bold text-white">
                      {game.name}
                    </span>
                    <span className="mt-[6px] block font-poppins text-[13px] text-brand-fg-subtle">
                      /games/{game.slug}
                    </span>
                    <span className="mt-[4px] block font-poppins text-[13px] text-brand-fg-subtle">
                      {game.productCount} produto{game.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
