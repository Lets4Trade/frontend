"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { MenuGame } from "@/features/game/menuGames";
import { NavTileFace } from "./NavTileFace";

/**
 * Atalho GAMES da home no celular: abre a lista de todos os jogos da loja
 * (2026-09-24).
 *
 * No rodapé flutuante a lista abre PARA CIMA (`side="top"`) — embaixo não há
 * espaço, é a borda da tela. Na fileira do corpo da página abre para baixo.
 * O Radix ainda inverte sozinho se o lado pedido não couber.
 *
 * Era um link para `/games`, rota que NÃO EXISTE (404). A lista é a mesma do
 * GAMES do cabeçalho (`getMenuGames`, cacheada) e chega pronta do servidor.
 *
 * Moldura: a única do projeto para camadas flutuantes (preferences.md) — raio
 * 20, `bg-brand-surface`, borda, `p-[8px]`, itens de raio 12.
 */
export function MobileGamesMenu({
  label,
  icon,
  games,
  compact,
  side,
}: {
  label: string;
  icon: string;
  games: MenuGame[];
  compact: boolean;
  side: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${label} — ver todos os jogos`}
          className="nav-item flex flex-col items-center outline-none focus-visible:rounded-[12px] focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <NavTileFace
            label={label}
            icon={icon}
            active={false}
            compact={compact}
            chevron
            open={open}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          align="center"
          sideOffset={side === "top" ? 22 : 12}
          collisionPadding={16}
          className="games-drop z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] w-[min(320px,calc(100vw-32px))] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
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
