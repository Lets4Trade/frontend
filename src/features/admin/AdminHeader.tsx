"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlowBar } from "@/components/layout/GlowBar";
import { UserMenu } from "@/components/layout/UserMenu";
import { ChatsUnreadDot } from "@/features/admin/chats/ChatsUnreadDot";
import { PresenceToggle } from "@/features/admin/chats/PresenceToggle";
import { SaleAlerts, SalesBadge } from "@/features/admin/sales/SaleAlerts";
import { ProposalsNewDot } from "@/features/admin/sellRequests/ProposalsNewDot";
import type { SessionUser } from "@/features/auth/session";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "./nav";
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
 * ── Duas posições do menu (2026-10-23) ─────────────────────────────────────
 * Com 10 seções o menu tem ~1035px. Centrado no cabeçalho, ele só cabe entre
 * a logo e o grupo da direita (Online, sino, busca, avatar ~374px) a partir de
 * ~1830px — abaixo disso passava POR CIMA do botão Online (1280 e, com
 * "Propostas", também 1440). Então:
 *   - ≥ 1830px: uma linha só, centrada, como no arquivo do Figma;
 *   - abaixo: o menu desce para uma FAIXA logo embaixo do cabeçalho, centrada,
 *     que rola de lado dentro dela se não couber (nunca a página).
 * Antes, abaixo de 1280 o menu sumia e só a busca (Ctrl+K) navegava.
 *
 * Client component só por causa do `usePathname()`, que é o que acende a seção
 * atual. O layout continua sendo servidor e é ele quem lê a sessão — o `user`
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
  const pathname = usePathname();

  const links = ADMIN_NAV.filter((item) => canAccess(role, item.area)).map((item) => {
    const active = item.match?.some((prefix) => pathname.startsWith(prefix)) ?? false;
    const baseClass = cn(
      "font-poppins text-[16px] font-bold tracking-[0.16px] whitespace-nowrap",
      active ? "text-brand-orange" : "text-white",
    );

    // Seção que ainda não existe: texto, não link. `aria-disabled` conta
    // ao leitor de tela a mesma coisa que o cursor conta a quem enxerga.
    return item.href === null ? (
      <span
        key={item.label}
        aria-disabled
        title="Ainda não disponível"
        className={cn(baseClass, "cursor-not-allowed opacity-60")}
      >
        {item.label}
      </span>
    ) : (
      <Link
        key={item.label}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(baseClass, "transition-opacity hover:opacity-80")}
      >
        {item.label}
        {/* Vendas novas desde a última visita à lista (2026-10-16). */}
        {item.href === "/admin/pedidos" && canAccess(role, "orders") ? <SalesBadge /> : null}
        {/* Mensagem de cliente que a equipe não abriu (2026-10-28). */}
        {item.href === "/admin/chats" && canAccess(role, "support") ? <ChatsUnreadDot /> : null}
        {/* Proposta de "Venda pra nós" ainda NOVA (2026-10-28). */}
        {item.href === "/admin/propostas" && canAccess(role, "orders") ? <ProposalsNewDot /> : null}
      </Link>
    );
  });

  return (
    <header className="relative z-20 w-full bg-black/50 backdrop-blur-[9px]">
      <GlowBar className="-top-[2px]" />

      <div className="relative mx-auto flex h-[83px] max-w-[1920px] items-center px-4 sm:px-6 lg:px-[50px]">
        <Link href="/" aria-label="Lets4Trade, ir para a loja" className="shrink-0">
          <Image
            src={logoUrl ?? "/images/lets4trade-logo.png"}
            alt="Lets4Trade"
            width={138}
            height={65}
            priority
            className={`h-[65px] w-[138px] ${logoUrl ? "object-contain" : "object-cover"}`}
          />
        </Link>

        {/* Fora do fluxo flex para cair no centro EXATO do cabeçalho, e não no
            meio do que sobra entre logo e avatar — que mudaria de lugar a cada
            item novo. Mesma solução do selo "+1000" no cabeçalho da loja. */}
        <nav
          aria-label="Seções do painel"
          className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-[22px] min-[1830px]:flex"
        >
          {links}
        </nav>

        {/* Busca (Ctrl+K). Abaixo de xl o menu não cabe e ela vira a navegação. */}
        <div className="ml-auto flex shrink-0 items-center gap-[16px]">
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

      {/* Abaixo de 1830px: o mesmo menu numa faixa própria (ver o topo). */}
      <nav aria-label="Seções do painel" className="scrollbar-orange overflow-x-auto border-t border-white/10 min-[1830px]:hidden">
        <div className="mx-auto flex w-max items-center gap-[22px] px-4 py-[12px] sm:px-6 lg:px-[50px]">{links}</div>
      </nav>
    </header>
  );
}
