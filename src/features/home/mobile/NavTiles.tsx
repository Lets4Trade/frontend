import Link from "next/link";
import type { MenuGame } from "@/features/game/menuGames";
import { NAV_ITEMS } from "../navItems";
import { MobileGamesMenu } from "./MobileGamesMenu";
import { NavTileFace } from "./NavTileFace";

/**
 * Os quatro atalhos da home (mesma lista do desktop, `NAV_ITEMS`).
 *
 * O GAMES não é link: abre o dropdown com os jogos (`MobileGamesMenu`) — para
 * cima na versão compacta (rodapé flutuante), para baixo na do corpo.
 */
export function NavTiles({
  compact = false,
  games,
  activeHref,
}: {
  compact?: boolean;
  games: MenuGame[];
  /** Atalho aceso; ausente = o da home (`item.active`). */
  activeHref?: string | null;
}) {
  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    activeHref === undefined ? item.active : item.href === activeHref;

  return (
    <ul className="grid grid-cols-4">
      {NAV_ITEMS.map((item) => (
        <li key={item.label} className="flex justify-center">
          {item.label === "GAMES" ? (
            <MobileGamesMenu
              label={item.label}
              icon={item.icon}
              games={games}
              compact={compact}
              side={compact ? "top" : "bottom"}
            />
          ) : (
            <Link
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className="nav-item flex flex-col items-center"
            >
              <NavTileFace
                label={item.label}
                icon={!isActive(item) && "iconIdle" in item && item.iconIdle ? item.iconIdle : item.icon}
                active={isActive(item)}
                compact={compact}
                chevron={item.dropdown}
              />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
