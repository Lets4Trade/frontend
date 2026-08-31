import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Faixa de navegação principal da home (Figma 796:1624), com os contadores nas
 * laterais.
 *
 * Medidas do design (frame de 1920): ladrilhos de 55px em y=928 nas posições
 * 729 / 834 / 955 / 1097, rótulos centrados abaixo em y=988. Os contadores
 * ficam em x≈309 (esquerda) e x≈1406 (direita), na mesma altura.
 *
 * As setas de FIDELIDADE e VENDA PRA NÓS indicam submenu — ainda sem
 * comportamento, só o indicador visual do design.
 */
const NAV_ITEMS = [
  { label: "HOME", icon: "/icons/home/nav-home.svg", href: "/", active: true, dropdown: false },
  { label: "GAMES", icon: "/icons/home/nav-games.svg", href: "/games", active: false, dropdown: false },
  { label: "FIDELIDADE", icon: "/icons/home/nav-fidelidade.svg", href: "/fidelidade", active: false, dropdown: true },
  { label: "VENDA PRA NÓS", icon: "/icons/home/nav-venda.svg", href: "/venda", active: false, dropdown: true },
];

export function HomeNav() {
  return (
    <section className="flex items-start justify-between pt-[50px]">
      <Stat value="+4000" label="CLIENTES ATENDIDOS" />

      <nav aria-label="Seções principais" className="flex items-start gap-[50px]">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className="nav-item flex flex-col items-center"
          >
            <span className="flex items-center gap-[15px]">
              <span className="relative block size-[55px]">
                <Image
                  src={item.active ? "/icons/home/tile-active.svg" : "/icons/home/tile.svg"}
                  alt=""
                  width={55}
                  height={55}
                  aria-hidden
                  className="nav-tile absolute inset-0 size-full"
                />
                <Image
                  src={item.icon}
                  alt=""
                  width={22}
                  height={22}
                  aria-hidden
                  className="nav-icon absolute inset-0 m-auto size-[22px]"
                />
              </span>

              {item.dropdown ? (
                <Image
                  src="/icons/chevron-down.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden
                />
              ) : null}
            </span>

            <span
              className={cn(
                "nav-label mt-[5px] font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px]",
                item.active ? "text-white" : "text-white/80",
              )}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <Stat value="+5" label="ANOS DE EXPÊRIENCIA" />
    </section>
  );
}

/** Número em laranja sólido (#ff7300, Poppins SemiBold 40px) com rótulo abaixo. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="font-poppins text-[40px] leading-[55px] font-semibold text-brand-orange">
        {value}
      </p>
      <p className="font-poppins text-[15px] leading-[23px] font-bold tracking-[0.15px] text-white/80">
        {label}
      </p>
    </div>
  );
}
