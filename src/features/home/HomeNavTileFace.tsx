import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * O DESENHO de um atalho da faixa de navegação da home no desktop (Figma
 * 796:1624): ladrilho de 55, ícone, seta opcional e o rótulo centrado no
 * ladrilho.
 *
 * Separado do `HomeNav` (2026-09-24) pelo mesmo motivo da versão do celular
 * (`mobile/NavTileFace.tsx`): o GAMES virou botão de dropdown (client) e
 * precisa da mesma cara dos links.
 */
export function HomeNavTileFace({
  label,
  icon,
  active,
  chevron,
  open = false,
}: {
  label: string;
  icon: string;
  active: boolean;
  chevron: boolean;
  /** Seta para CIMA fechada, para BAIXO aberta (regra do usuário, 2026-09-24). */
  open?: boolean;
}) {
  return (
    <>
      <span className="flex items-center gap-[15px]">
        <span className="relative block size-[55px]">
          <Image
            src={active ? "/icons/home/tile-active.svg" : "/icons/home/tile.svg"}
            alt=""
            width={55}
            height={55}
            aria-hidden
            className="nav-tile absolute inset-0 size-full"
          />
          <Image
            src={icon}
            alt=""
            width={22}
            height={22}
            aria-hidden
            className="nav-icon absolute inset-0 m-auto size-[22px]"
          />
        </span>

        {chevron ? (
          <Image
            src="/icons/chevron-down.svg"
            alt=""
            width={18}
            height={18}
            aria-hidden
            // O arquivo é uma seta para BAIXO: fechado, gira para cima.
            className={cn("transition-transform duration-[var(--dur-base)]", !open && "rotate-180")}
          />
        ) : null}
      </span>

      {/* Rótulo centrado no ladrilho (y=988 no frame), e não no item
          inteiro: a seta de submenu não pode deslocar o texto. */}
      <span
        className={cn(
          "nav-label absolute top-[60px] left-[27.5px] -translate-x-1/2 whitespace-nowrap font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px]",
          active ? "text-white" : "text-white/80",
        )}
      >
        {label}
      </span>
    </>
  );
}
