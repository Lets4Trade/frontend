"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { PlatformIcon } from "./PlatformIcon";
import type { ServerPlatform } from "./serverPlatform";

export type ServerOption = { key: string; label: string; href: string; active: boolean; platform?: ServerPlatform };

/**
 * Servidor no CELULAR (2026-11-18, pedido do usuário, referência mmoexp): as
 * pílulas quebravam em várias linhas e empurravam o catálogo para baixo. Aqui
 * é UM botão com o servidor escolhido; tocar abre a lista e escolher FECHA a
 * lista e navega. No computador continuam as pílulas (`ServerPicker`).
 *
 * O filtro segue na URL: cada opção leva o href do `buildHref`, sem subir a
 * página. Enquanto a lista nova carrega, o botão fica esmaecido.
 */
export function ServerDropdown({ label, options }: { label: string; options: ServerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = options.find((option) => option.active) ?? options[0];

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${current?.label ?? ""}`}
          aria-busy={pending || undefined}
          className={cn(
            "group flex h-[52px] w-full items-center gap-[12px] rounded-full border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] pr-[20px] pl-[22px] text-left outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-white",
            pending && "opacity-60",
          )}
        >
          {current?.platform ? <PlatformIcon platform={current.platform} className="size-[18px] shrink-0 text-black" /> : null}
          <span className="min-w-0 flex-1 truncate font-poppins text-[15px] font-bold tracking-[0.15px] text-black">
            {current?.label}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="size-[13px] shrink-0 text-black transition-transform group-data-[state=open]:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[6px] shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.key}
              // Escolher: a lista fecha (padrão do Radix) e a URL muda.
              onSelect={() => {
                if (!option.active) startTransition(() => router.push(option.href, { scroll: false }));
              }}
              className={cn(
                "flex h-[46px] cursor-pointer items-center gap-[10px] rounded-[14px] px-[16px] font-poppins text-[15px] font-bold outline-none select-none data-[highlighted]:bg-white/[0.07]",
                option.active ? "text-brand-orange" : "text-white/85",
              )}
            >
              {option.platform ? <PlatformIcon platform={option.platform} className="size-[18px] shrink-0" /> : null}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.active ? (
                <svg aria-hidden viewBox="0 0 24 24" className="size-[16px] shrink-0" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
