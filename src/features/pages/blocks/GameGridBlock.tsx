import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { BlockPropsMap, PageRefs } from "../types";
import { assetUrl, BlockHeading } from "./shared";

/** Classe estática por número de colunas — o Tailwind não enxerga classe montada. */
const COLUMNS = {
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-4 xl:grid-cols-5",
  6: "md:grid-cols-4 xl:grid-cols-6",
} as const;

/**
 * "Grade de jogos". Os jogos vêm RESOLVIDOS pelo backend (`refs.games`): jogo
 * excluído some da grade sozinho, sem ninguém editar o bloco. Lista vazia no
 * bloco = todos os ativos, e aí a ordem é a que o backend devolveu.
 */
export function GameGridBlock({
  props,
  refs,
}: {
  props: BlockPropsMap["gameGrid"];
  refs: PageRefs;
}) {
  const games =
    props.gameIds.length > 0
      ? props.gameIds.map((id) => refs.games[id]).filter(Boolean)
      : // "Todos": o backend manda os 24 primeiros ativos por nome JUNTO com os
        // jogos citados por outros blocos — então a grade reordena e corta aqui.
        Object.values(refs.games)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .slice(0, 24);

  if (games.length === 0) return null;

  return (
    <section className="flex flex-col gap-[25px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <ul className={cn("grid grid-cols-2 gap-[15px] md:gap-[25px]", COLUMNS[props.columns] ?? COLUMNS[5])}>
        {games.map((game) => {
          const art = assetUrl(game.imageUrl ?? undefined);
          return (
            <li key={game.id}>
              <Link
                href={`/games/${game.slug}`}
                className="group flex aspect-[4/3] flex-col items-center justify-center gap-[12px] rounded-[24px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[18px] transition-colors hover:border-brand-orange"
              >
                <span className="relative h-[60%] w-full">
                  {art ? (
                    <Image
                      src={art}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
                      className="object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </span>
                <span className="text-center font-poppins text-[14px] font-bold text-white">{game.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
