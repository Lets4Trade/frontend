import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Navegação entre as telas de UM jogo no painel (2026-09-28): cadastro, abas,
 * categorias por servidor + aba, e a página no Builder.
 *
 * São rotas separadas porque gravam de jeitos diferentes (o cadastro é um
 * formulário com SALVAR; abas gravam a cada gesto; categorias por escopo) — e
 * esta barra é o que as mantém a um clique uma da outra.
 */
export type GameAdminSection = "cadastro" | "abas" | "categorias";

export function GameAdminNav({
  gameId,
  gameName,
  active,
}: {
  gameId: string;
  gameName: string;
  active: GameAdminSection;
}) {
  const id = encodeURIComponent(gameId);
  const links: { key: GameAdminSection | "builder"; href: string; label: string }[] = [
    { key: "cadastro", href: `/admin/jogos/${id}/editar`, label: "Cadastro" },
    { key: "abas", href: `/admin/jogos/${id}/abas`, label: "Abas" },
    { key: "categorias", href: `/admin/jogos/${id}/categorias`, label: "Categorias" },
    { key: "builder", href: `/admin/builder/${id}`, label: "Página (Builder)" },
  ];

  return (
    <nav aria-label={`Telas de ${gameName}`} className="flex flex-wrap items-center gap-[10px]">
      <Link
        href="/admin/jogos"
        className="mr-[10px] font-poppins text-[14px] font-bold text-white/70 transition-opacity hover:opacity-80"
      >
        ← Jogos
      </Link>
      {links.map((link) => {
        const isActive = link.key === active;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "h-[40px] rounded-full border px-[18px] font-poppins text-[13px] leading-[38px] font-bold transition-colors",
              isActive
                ? "border-brand-orange bg-brand-orange/15 text-white"
                : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
