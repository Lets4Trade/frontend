"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import type { MenuGame } from "@/features/game/menuGames";
import { cn } from "@/lib/cn";

/**
 * Botão GAMES do cabeçalho: abre a lista de todos os jogos ativos da loja.
 *
 * A lista chega pronta do `SiteHeader` (server component, leitura cacheada) —
 * aqui só existe o estado aberto/fechado. Radix cuida de teclado, foco e
 * fechar ao clicar fora, igual ao `UserMenu`.
 *
 * Com muitos jogos a lista rola por dentro (`max-h`) em vez de crescer além da
 * tela.
 */
export function GamesMenu({ label, games }: { label: string; games: MenuGame[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <DropdownMenu.Root open={aberto} onOpenChange={setAberto}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "hidden min-w-[159px] shrink-0 gap-[10px] px-[20px] md:inline-flex",
          )}
        >
          {label}
          <Image
            src="/icons/chevron-down.svg"
            alt=""
            width={14}
            height={14}
            aria-hidden
            className={`transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={12}
          className="z-50 max-h-[min(480px,var(--radix-dropdown-menu-content-available-height))] w-[280px] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          {games.length === 0 ? (
            <p className="px-[12px] py-[10px] font-poppins text-[14px] text-brand-fg-subtle">
              Nenhum jogo disponível no momento.
            </p>
          ) : (
            games.map((game) => (
              <DropdownMenu.Item key={game.slug} asChild>
                <Link
                  href={`/games/${game.slug}`}
                  className="flex items-center gap-[12px] rounded-[12px] px-[12px] py-[8px] font-poppins text-[14px] text-white outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
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
