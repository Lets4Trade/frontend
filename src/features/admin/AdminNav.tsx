"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { chatUnreadCounter } from "@/features/admin/chats/chatUnread";
import { getUnseen, subscribeSales } from "@/features/admin/sales/saleAlertsStore";
import { newSellRequestsCounter } from "@/features/admin/sellRequests/newCount";
import { cn } from "@/lib/cn";
import type { AdminNavItem, AdminNavSection } from "./nav";
import { PinCount, PinDot, useUnreadCount } from "./UnreadDot";

/**
 * Menu do painel em GRUPOS com submenu (2026-11-03) — ver `ADMIN_NAV_GROUPS`.
 *
 * ── Pins ───────────────────────────────────────────────────────────────────
 * Vendas novas (número), conversas não lidas e propostas novas (ponto). O
 * item fica dentro de um submenu que só existe ABERTO, então o GRUPO também
 * acende: número se houver venda nova, senão o ponto. As contagens são
 * mantidas vivas aqui (`useNavAttention`, no cabeçalho, sempre montado) e só
 * lidas pelo grupo e pelo item.
 */

const CHAT_EVENTS = ["equipe:mensagem", "equipe:conversa"] as const;
const PROPOSAL_EVENTS = ["equipe:propostas"] as const;

export type NavAttention = Partial<Record<string, { count: number; kind: "number" | "dot"; label: string }>>;

/** Contagens dos pins por `href`. Cargo sem a área não consulta nada. */
export function useNavAttention({ orders, support }: { orders: boolean; support: boolean }): NavAttention {
  const sales = useSyncExternalStore(subscribeSales, getUnseen, () => 0);
  const chats = useUnreadCount(chatUnreadCounter, CHAT_EVENTS, support);
  const proposals = useUnreadCount(newSellRequestsCounter, PROPOSAL_EVENTS, orders);
  return {
    "/admin/pedidos": orders && sales > 0 ? { count: sales, kind: "number", label: `${sales} venda(s) nova(s)` } : undefined,
    "/admin/chats":
      chats > 0
        ? { count: chats, kind: "dot", label: chats === 1 ? "1 conversa com mensagem nova" : `${chats} conversas com mensagem nova` }
        : undefined,
    "/admin/propostas":
      proposals > 0
        ? { count: proposals, kind: "dot", label: proposals === 1 ? "1 proposta nova" : `${proposals} propostas novas` }
        : undefined,
  };
}

function isActive(item: AdminNavItem, pathname: string) {
  return item.match?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

function Pin({ attention }: { attention: NavAttention[string] }) {
  if (!attention) return null;
  return attention.kind === "number" ? (
    <PinCount count={attention.count} label={attention.label} />
  ) : (
    <PinDot label={attention.label} />
  );
}

/** O pin do GRUPO: soma das vendas novas se houver; senão um ponto se algo espera. */
function groupAttention(items: AdminNavItem[], attention: NavAttention): NavAttention[string] {
  const pins = items.map((item) => (item.href ? attention[item.href] : undefined)).filter(Boolean);
  if (pins.length === 0) return undefined;
  const numbers = pins.filter((pin) => pin!.kind === "number");
  const label = pins.map((pin) => pin!.label).join(", ");
  if (numbers.length > 0) {
    return { count: numbers.reduce((sum, pin) => sum + pin!.count, 0), kind: "number", label };
  }
  return { count: 1, kind: "dot", label };
}

const ITEM_TEXT = "font-poppins text-[16px] font-bold tracking-[0.16px] whitespace-nowrap";

export function AdminNav({
  sections,
  attention,
  className,
  compact = false,
}: {
  sections: AdminNavSection[];
  attention: NavAttention;
  className?: string;
  /** Faixa do celular: texto menor, sem vão grande. */
  compact?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const text = compact ? "font-poppins text-[14px] font-bold whitespace-nowrap" : ITEM_TEXT;

  return (
    <nav aria-label="Seções do painel" className={className}>
      {sections.map((section) => {
        const active = section.items.some((item) => isActive(item, pathname));

        // Grupo de UM item (REDATOR: só Blog): link direto, sem submenu.
        if (section.items.length === 1) {
          const item = section.items[0];
          return item.href ? (
            <Link
              key={section.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(text, "transition-opacity hover:opacity-80", active ? "text-brand-orange" : "text-white")}
            >
              {item.label}
              <Pin attention={attention[item.href]} />
            </Link>
          ) : null;
        }

        return (
          <DropdownMenu.Root key={section.key} modal={false}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={cn(
                  text,
                  "group flex items-center gap-[6px] rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
                  active ? "text-brand-orange" : "text-white",
                )}
              >
                <span>
                  {section.label}
                  <Pin attention={groupAttention(section.items, attention)} />
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 12 12"
                  className="size-[11px] transition-transform group-data-[state=open]:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="center"
                sideOffset={14}
                collisionPadding={12}
                className="z-50 min-w-[220px] overflow-hidden rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
              >
                {section.items.map((item) => {
                  const itemActive = isActive(item, pathname);
                  return item.href ? (
                    <DropdownMenu.Item key={item.label} asChild>
                      <Link
                        href={item.href}
                        aria-current={itemActive ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-[12px] rounded-[12px] px-[12px] py-[10px] font-poppins text-[14px] font-medium outline-none transition-colors hover:bg-white/5 focus:bg-white/5",
                          itemActive ? "text-brand-orange" : "text-white",
                        )}
                      >
                        {item.label}
                        <Pin attention={attention[item.href]} />
                      </Link>
                    </DropdownMenu.Item>
                  ) : (
                    <DropdownMenu.Item
                      key={item.label}
                      disabled
                      className="rounded-[12px] px-[12px] py-[10px] font-poppins text-[14px] text-white/50"
                    >
                      {item.label}
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        );
      })}
    </nav>
  );
}
