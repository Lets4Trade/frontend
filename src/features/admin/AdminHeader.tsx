"use client";

import Image from "next/image";
import Link from "next/link";
import { GlowBar } from "@/components/layout/GlowBar";
import { UserMenu } from "@/components/layout/UserMenu";
import { PresenceToggle } from "@/features/admin/chats/PresenceToggle";
import { SaleAlerts } from "@/features/admin/sales/SaleAlerts";
import type { SessionUser } from "@/features/auth/session";
import { AdminNav, useNavAttention } from "./AdminNav";
import { adminNavSections } from "./nav";
import { canAccess, type PanelRole } from "./permissions";
import { AdminSearch } from "./search/AdminSearch";

/**
 * Cabeçalho do painel administrativo (Figma 4468:1879).
 *
 * Mesma altura (83px), mesmo preto 50% com `backdrop-blur` de 9px e a mesma
 * faixa de brilho do cabeçalho da loja — mas o MIOLO é outro: no lugar de
 * GAMES, busca, selo e carrinho, cinco seções do painel. Por isso é um
 * componente próprio e não uma variante do `SiteHeader`: os dois só
 * compartilham a moldura, e uma prop de "modo" acabaria carregando o carrinho e
 * a busca para dentro do painel.
 *
 * Medidas do arquivo (frame de 1920): logo em x=50 (138×65), a fileira de
 * seções com vão de 25px começando em x=619 e terminando em x=1301 — ou seja,
 * CENTRADA no frame — e avatar em x=1787 com a seta em x=1852.
 *
 * O bloco da direita é o mesmo `UserMenu` da loja: no arquivo é exatamente o
 * avatar de 50px com a bolinha de status e a seta de 18px a 15px dele.
 *
 * ── Menu em grupos (2026-11-03, pedido do usuário) ────────────────────────
 * Com 11 itens soltos (~1.050px) o menu só cabia numa linha a partir de
 * 1830px; abaixo disso descia para uma faixa e o cabeçalho ia de 83 para
 * 132px — a maioria dos notebooks. Agora são 4 grupos com submenu (Vendas,
 * Catálogo, Site, Sistema — `nav.ts`): uma linha de 83px a partir do `lg`
 * (1024px); abaixo, uma faixa curta com os 4 grupos, sem rolar de lado. O
 * menu deixou de ficar no centro EXATO do cabeçalho (como no Figma de 1920):
 * agora centra no espaço entre a logo e a direita, que é o que cabe em todas
 * as larguras.
 *
 * Client component por causa dos pins (vendas, chats, propostas), mantidos
 * vivos aqui. O layout continua sendo servidor e é ele quem lê a sessão — o `user`
 * chega por prop já resolvido.
 */
export function AdminHeader({
  user,
  role,
  logoUrl,
}: {
  user: SessionUser;
  /** Filtra o menu e os botões pelo cargo (`permissions.ts`). */
  role: PanelRole;
  /** "Logo da marca" do painel (2026-09-24); ausente = o arquivo de fábrica. */
  logoUrl?: string;
}) {
  const sections = adminNavSections((area) => canAccess(role, area));
  // Pins mantidos vivos AQUI (o cabeçalho está sempre montado); os submenus só
  // existem abertos. Ver `AdminNav.tsx`.
  const attention = useNavAttention({ orders: canAccess(role, "orders"), support: canAccess(role, "support") });

  return (
    <header className="relative z-20 w-full bg-black/50 backdrop-blur-[9px]">
      <GlowBar className="-top-[2px]" />

      <div className="relative mx-auto flex h-[64px] max-w-[1920px] items-center gap-[10px] px-4 sm:px-6 md:h-[83px] lg:px-[50px]">
        <Link href="/" aria-label="Lets4Trade, ir para a loja" className="shrink-0">
          <Image
            src={logoUrl ?? "/images/lets4trade-logo.png"}
            alt="Lets4Trade"
            width={138}
            height={65}
            priority
            className={`h-[41px] w-[88px] md:h-[65px] md:w-[138px] ${logoUrl ? "object-contain" : "object-cover"}`}
          />
        </Link>

        {/* Menu em 4 grupos (2026-11-03): cabe numa linha a partir do `lg`,
            centrado no espaço entre a logo e o grupo da direita. */}
        <AdminNav
          sections={sections}
          attention={attention}
          className="hidden min-w-0 flex-1 items-center justify-center gap-[28px] lg:flex xl:gap-[40px]"
        />

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-[8px] sm:gap-[16px] lg:ml-0">
          {/* Online/Offline do atendente no chat da loja (2026-10-16). ADMIN
              e ATENDENTE atendem — o EDITOR não vê chats. */}
          {canAccess(role, "support") ? <PresenceToggle /> : null}
          {/* Aviso de venda (card, som, contador, notificação) — para quem
              entrega e vê pedidos: ADMIN e ATENDENTE (2026-10-16). */}
          {canAccess(role, "orders") ? <SaleAlerts canOpenUsers={canAccess(role, "users")} /> : null}
          <AdminSearch role={role} />
          <UserMenu user={user} />
        </div>
      </div>

      {/* Celular/tablet (< lg): os mesmos 4 grupos numa faixa curta, sem
          rolar de lado (cabem em 390px). */}
      <AdminNav
        sections={sections}
        attention={attention}
        compact
        className="flex items-center justify-center gap-[16px] border-t border-white/10 px-4 py-[11px] sm:gap-[32px] lg:hidden"
      />
    </header>
  );
}
