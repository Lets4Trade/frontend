import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Faixa de navegação principal da home (Figma 796:1624), com os contadores nas
 * laterais.
 *
 * Tudo fica em coordenada absoluta lida do arquivo, com a origem no topo da
 * faixa (y=878 no frame de 1920) e o eixo X descontado dos 50px de margem da
 * página. Os contadores NÃO estão nas bordas: no arquivo eles são blocos
 * centrados em x=390 e x=1494,75, bem para dentro da margem. Distribuir a linha
 * com `justify-between`, como estava antes, jogava o da direita 300px longe do
 * lugar.
 *
 * Os quatro ladrilhos também não têm vão regular (729, 834, 955 e 1097): a
 * distância entre eles varia de 105 a 142px no arquivo. Por isso cada um carrega
 * o seu X em vez de sair de um `gap`.
 *
 * As setas de FIDELIDADE e VENDA PRA NÓS indicam submenu — ainda sem
 * comportamento, só o indicador visual do design.
 */
const NAV_ITEMS = [
  { label: "HOME", icon: "/icons/home/nav-home.svg", href: "/", left: 679, active: true, dropdown: false },
  { label: "GAMES", icon: "/icons/home/nav-games.svg", href: "/games", left: 784, active: false, dropdown: false },
  { label: "FIDELIDADE", icon: "/icons/home/nav-fidelidade.svg", href: "/fidelidade", left: 905, active: false, dropdown: true },
  { label: "VENDA PRA NÓS", icon: "/icons/home/nav-venda.svg", href: "/venda", left: 1047, active: false, dropdown: true },
];

/** Centro dos dois contadores, do arquivo (x=390 e x=1494,75 no frame). */
const STATS = [
  { center: 340, value: "+4000", label: "CLIENTES ATENDIDOS" },
  { center: 1444.75, value: "+5", label: "ANOS DE EXPÊRIENCIA" },
];

export function HomeNav() {
  return (
    <section className="relative h-[129px]">
      {STATS.map((stat) => (
        <Stat key={stat.label} {...stat} />
      ))}

      <nav aria-label="Seções principais" className="contents">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className="nav-item absolute top-[50px]"
            style={{ left: item.left }}
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

            {/* Rótulo centrado no ladrilho (y=988 no frame), e não no item
                inteiro: a seta de submenu não pode deslocar o texto. */}
            <span
              className={cn(
                "nav-label absolute top-[60px] left-[27.5px] -translate-x-1/2 whitespace-nowrap font-poppins text-[15px] leading-[19px] font-bold tracking-[0.15px]",
                item.active ? "text-white" : "text-white/80",
              )}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

/**
 * Número em laranja sólido (#ff7300, Poppins SemiBold 40px) com rótulo abaixo.
 *
 * As duas linhas são posicionadas separadamente porque no arquivo elas se
 * SOBREPÕEM: o número ocupa até y=991 e o rótulo começa em 988. Empilhadas em
 * fluxo, o bloco ficaria 3px mais alto que o design.
 */
function Stat({ center, value, label }: { center: number; value: string; label: string }) {
  return (
    <div className="contents">
      <p
        className="absolute top-[58px] -translate-x-1/2 font-poppins text-[40px] leading-[55px] font-semibold text-brand-orange"
        style={{ left: center }}
      >
        {value}
      </p>
      <p
        className="absolute top-[110px] -translate-x-1/2 whitespace-nowrap font-poppins text-[15px] leading-[23px] font-bold tracking-[0.15px] text-white/80"
        style={{ left: center }}
      >
        {label}
      </p>
    </div>
  );
}
