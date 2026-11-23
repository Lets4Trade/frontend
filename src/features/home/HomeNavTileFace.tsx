import Image from "next/image";
import { cn } from "@/lib/cn";

/** Largura de cada atalho da home no computador — a mesma para os quatro. */
export const HOME_NAV_COL = 130;

/**
 * O DESENHO de um atalho da faixa de navegação da home no desktop (Figma
 * 796:1624): ladrilho de 55, ícone, seta opcional e o rótulo centrado no
 * ladrilho.
 *
 * Separado do `HomeNav` (2026-09-24) pelo mesmo motivo da versão do celular
 * (`mobile/NavTileFace.tsx`): o GAMES virou botão de dropdown (client) e
 * precisa da mesma cara dos links.
 */
export function HomeNavTileFace({
  label,
  icon,
  active,
  chevron,
  open = false,
}: {
  label: string;
  icon: string;
  active: boolean;
  chevron: boolean;
  /** Seta para CIMA fechada, para BAIXO aberta (regra do usuário, 2026-09-24). */
  open?: boolean;
}) {
  return (
    // Coluna de LARGURA FIXA (2026-11-22, pedido do usuário: "os 4 têm que
    // estar padronizados"): ícone e rótulo centrados na coluna, e a seta do
    // JOGOS flutua ao lado do ícone sem deslocar nada.
    <span className="flex flex-col items-center" style={{ width: HOME_NAV_COL }}>
      <span className="relative block">
        <span className="relative block size-[55px]">
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
            className="nav-icon absolute inset-0 m-auto size-[22px]"
          />
        </span>

        {chevron ? (
          <Image
            src="/icons/chevron-down.svg"
            alt=""
            width={18}
            height={18}
            aria-hidden
            // O arquivo é uma seta para BAIXO: fechado, gira para cima.
            className={cn(
              "absolute top-1/2 left-[calc(100%+8px)] -translate-y-1/2 transition-transform duration-[var(--dur-base)]",
              !open && "rotate-180",
            )}
          />
        ) : null}
      </span>

      <span
        className={cn(
          "nav-label mt-[5px] whitespace-nowrap font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px]",
          active ? "text-white" : "text-white/80",
        )}
      >
        {label}
      </span>
    </span>
  );
}
