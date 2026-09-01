"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logout } from "@/features/auth/authService";
import type { SessionUser } from "@/features/auth/session";

/**
 * Avatar + seta do estado logado (Figma 2073:1778).
 *
 * A seta do design promete um menu, então ele existe: painel, fidelidade e
 * sair. É o único ponto do cabeçalho que precisa rodar no cliente — o resto do
 * header é server component e continua sendo.
 *
 * Sair NÃO é uma navegação: quem apaga o cookie de sessão é o backend, porque
 * ele é `httpOnly` e o JS daqui não o alcança. Por isso a ordem é
 * `logout()` → `refresh()`: a primeira derruba a sessão no servidor, a segunda
 * força os server components a re-renderizarem já sem ela. Sem o `refresh()` o
 * cabeçalho continuaria mostrando o avatar até a próxima navegação dura.
 */
export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [saindo, iniciarSaida] = useTransition();

  function sair() {
    setAberto(false);
    iniciarSaida(async () => {
      await logout();
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <DropdownMenu.Root open={aberto} onOpenChange={setAberto}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Menu de ${user.name}`}
          className="flex shrink-0 items-center gap-[15px] outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
        >
          <span className="relative block size-[50px] shrink-0">
            <Image
              src={user.avatar}
              alt=""
              width={50}
              height={50}
              aria-hidden
              className="size-[50px] rounded-full object-cover"
            />
            {user.online ? (
              <Image
                src="/icons/status-dot.svg"
                alt=""
                width={8}
                height={8}
                aria-hidden
                className="absolute bottom-[-2px] left-[4px]"
              />
            ) : null}
          </span>

          <Image
            src="/icons/chevron-down.svg"
            alt=""
            width={18}
            height={18}
            aria-hidden
            className={`-ml-[10px] transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={12}
          className="z-50 w-[220px] overflow-hidden rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <p className="truncate px-[12px] pt-[6px] pb-[10px] font-poppins text-[13px] font-medium text-brand-fg-subtle">
            {user.name}
          </p>

          <ItemLink href="/conta/pedidos">Meus pedidos</ItemLink>
          <ItemLink href="/conta/editar">Minhas informações</ItemLink>
          <ItemLink href="/fidelidade">Fidelidade</ItemLink>

          <DropdownMenu.Separator className="my-[6px] h-px bg-brand-hairline" />

          <DropdownMenu.Item asChild>
            <button
              type="button"
              onClick={sair}
              disabled={saindo}
              className="w-full cursor-pointer rounded-[12px] px-[12px] py-[10px] text-left font-poppins text-[14px] text-white outline-none transition-colors hover:bg-white/5 focus:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saindo ? "Saindo…" : "Sair"}
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ItemLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="block rounded-[12px] px-[12px] py-[10px] font-poppins text-[14px] text-white outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
      >
        {children}
      </Link>
    </DropdownMenu.Item>
  );
}
