import { editItem } from "@/features/site/editing/attrs";
import { MAX_HOME_STATS } from "@/features/site/sections";
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
 * GAMES abre o dropdown com todos os jogos (`HomeGamesMenu`, 2026-09-24). A
 * seta começa PARA CIMA e aponta para baixo com o menu aberto (pedido do
 * usuário). FIDELIDADE e VENDA PRA NÓS tinham a seta do design sem submenu
 * nenhum; saíram em 2026-10-06 (pedido do usuário): são links diretos.
 */
export const NAV_ITEMS = [
  { label: "HOME", icon: "/icons/home/nav-home.svg", href: "/", left: 679, active: true, dropdown: false },
  { label: "GAMES", icon: "/icons/home/nav-games.svg", href: "/games", left: 784, active: false, dropdown: true },
  { label: "FIDELIDADE", icon: "/icons/home/nav-fidelidade.svg", href: "/fidelidade", left: 905, active: false, dropdown: false },
  { label: "VENDA PRA NÓS", icon: "/icons/home/nav-venda.svg", href: "/venda", left: 1047, active: false, dropdown: false },
];

/**
 * O CENTRO de cada contador.
 *
 * O número e a legenda vêm do banco (Páginas → Home → Contadores). Com DOIS,
 * vale o arquivo: um de cada lado, centrados em x=390 e x=1494,75 do frame.
 *
 * Até 2026-10-01 a lista era CORTADA em dois — o terceiro contador salvo no
 * painel simplesmente não aparecia. Agora cabem até `MAX_HOME_STATS` (4): a
 * primeira metade (arredondada para cima) à esquerda do menu, o resto à
 * direita, espaçados por igual no vão livre de cada lado (medido: os
 * ladrilhos ocupam 679–1135 na faixa de 1820). Um sozinho num lado fica no
 * centro do arquivo.
 */
const SIDE_CENTER = { left: 340, right: 1444.75 } as const;
const SIDE_SPAN = { left: [20, 640], right: [1175, 1800] } as const;

export function statCenters(count: number): number[] {
  const n = Math.min(Math.max(count, 0), MAX_HOME_STATS);
  const leftCount = Math.ceil(n / 2);
  const side = (which: "left" | "right", k: number) => {
    if (k === 1) return [SIDE_CENTER[which]];
    const [from, to] = SIDE_SPAN[which];
    return Array.from({ length: k }, (_, i) => from + ((to - from) * (i + 0.5)) / k);
  };
  return [...side("left", leftCount), ...side("right", n - leftCount)];
}

/**
 * ASSÍNCRONO desde 2026-09-24: lê a lista de jogos do dropdown do GAMES — a
 * mesma leitura cacheada do cabeçalho (`getMenuGames`), deduplicada pelo Next.
 */
export async function HomeNav({ stats = [] }: { stats?: SectionItemView[] }) {
  const games = await getMenuGames();

  return (
    <section className="relative h-[129px]">
      {statCenters(stats.length).map((center, index) => (
        <Stat
          key={stats[index].id}
          id={stats[index].id}
          center={center}
          value={stats[index].title}
          label={stats[index].body}
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
