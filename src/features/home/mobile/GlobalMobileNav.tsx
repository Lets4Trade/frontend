"use client";

import { usePathname } from "next/navigation";
import type { MenuGame } from "@/features/game/menuGames";
import { navActiveHref } from "../navItems";
import { MobileStickyNav } from "./MobileStickyNav";
import { NavTiles } from "./NavTiles";

/**
 * A fileira de atalhos flutuante do celular em TODAS as telas da loja
 * (2026-10-15, pedido do usuário — antes só na home). Montada no layout raiz.
 *
 * Fica de fora onde o botão do chat também some: painel, checkout,
 * pagamento e prévia do construtor — telas de tarefa, onde um menu por cima
 * do botão de pagar atrapalha.
 *
 * `key={pathname}` remonta a cada navegação: a home esconde a fileira até a
 * original sair de vista, as outras páginas a mostram direto, e o observador
 * precisa recomeçar do zero em cada uma.
 */
const HIDDEN_PREFIXES = ["/admin", "/checkout", "/pagamento", "/previa"];

export function GlobalMobileNav({ games }: { games: MenuGame[] }) {
  const pathname = usePathname() ?? "/";
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <MobileStickyNav key={pathname}>
      <NavTiles compact games={games} activeHref={navActiveHref(pathname)} />
    </MobileStickyNav>
  );
}
