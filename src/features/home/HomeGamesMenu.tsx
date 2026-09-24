"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { MenuGame } from "@/features/game/menuGames";
import { HomeNavTileFace } from "./HomeNavTileFace";

/**
 * Atalho GAMES da faixa de navegação da home no desktop: abre a lista de todos
 * os jogos (2026-09-24), como o do celular (`mobile/MobileGamesMenu.tsx`).
 *
 * Era um link para `/games`, rota que NÃO EXISTE (404).
 *
 * O botão herda a posição absoluta e o atraso de entrada que o `HomeNav` dá a
 * cada atalho (`style`, `data-reveal`), para continuar no X do arquivo e na
 * cascata dos outros três.
 */
export function HomeGamesMenu({
  label,
  icon,
  games,
  style,
  revealAttrs,
}: {
  label: string;
  icon: string;
  games: MenuGame[];
  style: CSSProperties;
  revealAttrs: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${label} — ver todos os jogos`}
          {...revealAttrs}
          className="nav-item absolute top-[50px] cursor-pointer outline-none focus-visible:rounded-[12px] focus-visible:ring-2 focus-visible:ring-brand-orange"
          style={style}
        >
          <HomeNavTileFace label={label} icon={icon} active={false} chevron open={open} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={40}
          collisionPadding={16}
          className="games-drop z-50 max-h-[min(480px,var(--radix-dropdown-menu-content-available-height))] w-[300px] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="px-[12px] pt-[6px] pb-[8px] font-poppins text-[12px] font-bold tracking-[0.12px] text-white/60">
            JOGOS
          </p>
          {games.length === 0 ? (
            <p className="px-[12px] py-[10px] font-poppins text-[14px] text-brand-fg-subtle">
              Nenhum jogo disponível no momento.
            </p>
          ) : (
            games.map((game) => (
              <DropdownMenu.Item key={game.slug} asChild>
                <Link
                  href={`/games/${game.slug}`}
                  className="flex items-center gap-[12px] rounded-[12px] px-[12px] py-[8px] font-poppins text-[14px] text-white outline-none transition-colors data-[highlighted]:bg-white/5"
                >
                  {game.image ? (
                    <Image
                      src={game.image}
                      alt=""
                      width={36}
                      height={36}
                      aria-hidden
                      className="size-[36px] shrink-0 rounded-[8px] object-cover"
                    />
                  ) : (
                    <span aria-hidden className="size-[36px] shrink-0 rounded-[8px] bg-white/5" />
                  )}
                  <span className="truncate">{game.name}</span>
                </Link>
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
