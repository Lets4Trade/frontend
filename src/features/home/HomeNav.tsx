import { editItem } from "@/features/site/editing/attrs";
import type { SectionItemView } from "@/features/site/content";
import Link from "next/link";
import { CountUp } from "@/components/ui/CountUp";
import { getMenuGames } from "@/features/game/menuGames";
import { HomeGamesMenu } from "./HomeGamesMenu";
import { HomeNavTileFace } from "./HomeNavTileFace";
import { reveal, revealDelay } from "./reveal";

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
 * GAMES abre o dropdown com todos os jogos (`HomeGamesMenu`, 2026-09-24). As
 * setas de FIDELIDADE e VENDA PRA NÓS indicam submenu — ainda sem
 * comportamento, só o indicador visual do design. Toda seta começa PARA CIMA e
 * aponta para baixo com o menu aberto (pedido do usuário).
 */
export const NAV_ITEMS = [
  { label: "HOME", icon: "/icons/home/nav-home.svg", href: "/", left: 679, active: true, dropdown: false },
  { label: "GAMES", icon: "/icons/home/nav-games.svg", href: "/games", left: 784, active: false, dropdown: true },
  { label: "FIDELIDADE", icon: "/icons/home/nav-fidelidade.svg", href: "/fidelidade", left: 905, active: false, dropdown: true },
  { label: "VENDA PRA NÓS", icon: "/icons/home/nav-venda.svg", href: "/venda", left: 1047, active: false, dropdown: true },
];

/**
 * O CENTRO de cada contador, do arquivo (x=390 e x=1494,75 no frame).
 *
 * Só a posição fica aqui — o número e a legenda vêm do banco, editados em
 * "Edição de sessões" → Home → Contadores. Eram fixos no código, com
 * "EXPÊRIENCIA" escrito errado no ar desde sempre; agora se corrige sem deploy.
 *
 * Dois centros para dois contadores: um terceiro não teria onde ficar, então a
 * lista é cortada em dois. É o mesmo compromisso do hero — conteúdo editável,
 * apresentação do arquivo.
 */
const STAT_CENTERS = [340, 1444.75];

/**
 * ASSÍNCRONO desde 2026-09-24: lê a lista de jogos do dropdown do GAMES — a
 * mesma leitura cacheada do cabeçalho (`getMenuGames`), deduplicada pelo Next.
 */
export async function HomeNav({ stats = [] }: { stats?: SectionItemView[] }) {
  const games = await getMenuGames();

  return (
    <section className="relative h-[129px]">
      {stats.slice(0, STAT_CENTERS.length).map((stat, index) => (
        <Stat
          key={stat.id}
          id={stat.id}
          center={STAT_CENTERS[index]}
          value={stat.title}
          label={stat.body}
        />
      ))}

      <nav aria-label="Seções principais" className="contents">
        {NAV_ITEMS.map((item, index) => {
          const style = { left: item.left, ...revealDelay(index + 1) };

          if (item.label === "GAMES") {
            return (
              <HomeGamesMenu
                key={item.label}
                label={item.label}
                icon={item.icon}
                games={games}
                style={style}
                revealAttrs={reveal("pop")}
              />
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              {...reveal("pop")}
              className="nav-item absolute top-[50px]"
              style={style}
            >
              <HomeNavTileFace
                label={item.label}
                icon={item.icon}
                active={item.active}
                chevron={item.dropdown}
              />
            </Link>
          );
        })}
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
function Stat({
  id,
  center,
  value,
  label,
}: {
  /** Id do item da lista "Home - Contadores" — é o que o editor grava. */
  id: string;
  center: number;
  value: string;
  label: string;
}) {
  return (
    <div className="contents">
      <p
        {...editItem("home:navegacao", id, "title")}
        className="absolute top-[58px] -translate-x-1/2 font-poppins text-[40px] leading-[55px] font-semibold text-brand-orange"
        style={{ left: center }}
      >
        <CountUp value={value} />
      </p>
      <p
        {...editItem("home:navegacao", id, "body")}
        className="absolute top-[110px] -translate-x-1/2 whitespace-nowrap font-poppins text-[15px] leading-[23px] font-bold tracking-[0.15px] text-white/80"
        style={{ left: center }}
      >
        {label}
      </p>
    </div>
  );
}
