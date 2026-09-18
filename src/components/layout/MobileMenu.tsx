"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import type { MenuGame } from "@/features/game/menuGames";
import { cn } from "@/lib/cn";
import { HeaderSearch } from "./HeaderSearch";

/**
 * Menu do cabeçalho no CELULAR (Figma 2667:1864) — o botão de três linhas ao
 * lado do carrinho.
 *
 * No mobile o cabeçalho só tem logo, selo, carrinho e este botão: busca, jogos,
 * links da loja e conta moram aqui dentro. É uma gaveta (Radix Dialog): foco
 * preso enquanto aberta, Esc fecha, e ela só existe no DOM quando aberta.
 *
 * Tudo que ela mostra já chega pronto do `SiteHeader` (server) — os jogos são
 * a mesma leitura cacheada do menu GAMES.
 */
export function MobileMenu({
  games,
  loggedIn,
  searchPlaceholder,
  signupLabel,
  loginLabel,
}: {
  games: MenuGame[];
  loggedIn: boolean;
  searchPlaceholder: string;
  signupLabel: string;
  loginLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Abrir menu"
        className="shrink-0 rounded-full transition-opacity hover:opacity-80 md:hidden"
      >
        <Image src="/icons/menu.svg" alt="" width={50} height={50} aria-hidden className="size-[42px]" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,380px)] flex-col overflow-y-auto border-l border-brand-border bg-brand-bg px-[25px] pt-[20px] pb-[40px] outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-poppins text-[16px] font-bold text-white">Menu</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar menu"
              className="flex size-[42px] items-center justify-center rounded-full border border-white/15 font-poppins text-[18px] text-white"
            >
              ✕
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Busca, jogos e links da loja.
          </Dialog.Description>

          <div className="mt-[20px]">
            <HeaderSearch placeholder={searchPlaceholder} variant="menu" onNavigate={close} />
          </div>

          <nav aria-label="Loja" className="mt-[28px] flex flex-col gap-[4px]">
            <MenuLink href="/" onClick={close}>Home</MenuLink>
            <MenuLink href="/fidelidade" onClick={close}>Fidelidade</MenuLink>
            <MenuLink href="/venda" onClick={close}>Venda pra nós</MenuLink>
          </nav>

          {games.length > 0 ? (
            <section aria-label="Jogos" className="mt-[24px]">
              <h2 className="font-poppins text-[12px] font-medium tracking-[0.12px] text-brand-fg-subtle uppercase">
                Games
              </h2>
              <ul className="mt-[8px] flex flex-col gap-[2px]">
                {games.map((game) => (
                  <li key={game.slug}>
                    <Link
                      href={`/games/${game.slug}`}
                      onClick={close}
                      className="flex items-center gap-[12px] rounded-[12px] px-[8px] py-[8px] font-poppins text-[15px] text-white transition-colors hover:bg-white/5"
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
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-auto flex flex-col gap-[12px] pt-[28px]">
            {loggedIn ? (
              <>
                <MenuLink href="/conta/pedidos" onClick={close}>Meus pedidos</MenuLink>
                <MenuLink href="/conta/editar" onClick={close}>Minhas informações</MenuLink>
              </>
            ) : (
              <>
                <Link
                  href="/criar-conta"
                  onClick={close}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  {signupLabel}
                </Link>
                <Link
                  href="/login"
                  onClick={close}
                  className={cn(buttonVariants({ variant: "cta" }), "w-full")}
                >
                  {loginLabel}
                </Link>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-[12px] px-[8px] py-[10px] font-poppins text-[16px] font-semibold text-white transition-colors hover:bg-white/5"
    >
      {children}
    </Link>
  );
}
