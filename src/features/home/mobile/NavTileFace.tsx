import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * O DESENHO de um atalho da home no celular — ladrilho, ícone, seta opcional e
 * rótulo —, sem o elemento que o envolve.
 *
 * Separado de `NavTiles` (2026-09-24) porque o GAMES deixou de ser link: virou
 * o gatilho do dropdown de jogos (`MobileGamesMenu`, client). Link e botão
 * precisam da MESMA cara, e este arquivo sem `"use client"` serve aos dois sem
 * levar a home inteira para o bundle do navegador.
 */
export function NavTileFace({
  label,
  icon,
  active,
  compact,
  chevron,
  open = false,
}: {
  label: string;
  icon: string;
  active: boolean;
  compact: boolean;
  /** O atalho tem submenu: mostra a seta. */
  chevron?: boolean;
  /**
   * Regra do usuário (2026-09-24): a seta começa PARA CIMA e, com o menu
   * aberto, aponta PARA BAIXO — em todos os atalhos, celular e desktop.
   */
  open?: boolean;
}) {
  const tile = compact ? 38 : 55;

  return (
    <>
      <span className="flex items-center gap-[4px]">
        <span className="relative block" style={{ width: tile, height: tile }}>
          <Image
            src={active ? "/icons/home/tile-active.svg" : "/icons/home/tile.svg"}
            alt=""
            width={55}
            height={55}
            aria-hidden
            className="nav-tile absolute inset-0 size-full"
          />
          <Image
            src={icon}
            alt=""
            width={22}
            height={22}
            aria-hidden
            className="nav-icon absolute inset-0 m-auto"
            style={{ width: compact ? 16 : 22, height: compact ? 16 : 22 }}
          />
        </span>
        {chevron ? (
          <Image
            src="/icons/chevron-down.svg"
            alt=""
            width={14}
            height={14}
            aria-hidden
            className={cn(
              "size-[14px] transition-transform duration-[var(--dur-base)]",
              // O arquivo é uma seta para BAIXO: fechado, gira para cima.
              !open && "rotate-180",
            )}
          />
        ) : null}
      </span>
      <span
        className={cn(
          "mt-[8px] font-poppins leading-none font-bold whitespace-nowrap",
          compact ? "text-[9px]" : "text-[11px]",
          active ? "text-white" : "text-white/80",
        )}
      >
        {label}
      </span>
    </>
  );
}
