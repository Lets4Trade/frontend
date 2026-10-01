import Link from "next/link";
import { cn } from "@/lib/cn";
import { centralNavLinks, type CentralSection } from "./central";

/**
 * Navegação da Central do jogo (admin-games-ux.md, Etapa 2): Visão geral ·
 * Abas e produtos · Página da loja · ← Jogos · Ver na loja.
 *
 * Duas formas, o mesmo conteúdo:
 *   - `sidebar` (a Central): coluna fixa à esquerda a partir de 1024px; abaixo
 *     disso, uma fileira de pílulas no topo (rola na horizontal se faltar
 *     largura — nunca a página inteira).
 *   - `bar` (o Builder): sempre a fileira, acima do cabeçalho dele.
 *
 * `canManage` = cargo ADMIN. O EDITOR só vê o que abre para ele (ver
 * `centralNavLinks`) — link que daria 404 não é oferecido.
 */
export function GameAdminNav({
  game,
  active,
  canManage = true,
  variant = "sidebar",
}: {
  game: { id: string; slug: string; name: string };
  /** Seção aberta; `null` fora da Central (no Builder). */
  active: CentralSection | null;
  canManage?: boolean;
  variant?: "sidebar" | "bar";
}) {
  const { sections, extras } = centralNavLinks(game, canManage);
  const sidebar = variant === "sidebar";

  return (
    <nav
      aria-label={`Central de ${game.name}`}
      className={cn(
        "min-w-0",
        sidebar &&
          "lg:sticky lg:top-[20px] lg:w-[240px] lg:shrink-0 lg:self-start lg:rounded-[20px] lg:border lg:border-brand-border lg:bg-[image:var(--brand-surface-fill)] lg:p-[20px]",
      )}
    >
      <ul
        className={cn(
          "flex gap-[10px] overflow-x-auto pb-[4px]",
          sidebar && "lg:flex-col lg:overflow-visible lg:pb-0",
        )}
      >
        {sections.map((link) => {
          const isActive = link.key === active;
          return (
            <li key={link.key} className="shrink-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-[40px] items-center rounded-full border px-[18px] font-poppins text-[13px] font-bold whitespace-nowrap transition-colors",
                  sidebar && "lg:rounded-[12px]",
                  isActive
                    ? "border-brand-orange bg-brand-orange/15 text-white"
                    : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
        {extras.map((link, index) => (
          <li
            key={link.key}
            className={cn(
              "flex shrink-0 items-center",
              // Separa as seções dos atalhos de saída na coluna do desktop.
              sidebar && index === 0 && sections.length > 0 && "lg:mt-[10px] lg:border-t lg:border-white/10 lg:pt-[15px]",
            )}
          >
            <Link
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener" : undefined}
              className="flex h-[40px] items-center px-[10px] font-poppins text-[13px] font-bold whitespace-nowrap text-white/70 transition-colors hover:text-brand-orange"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
