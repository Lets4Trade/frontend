import { editItem } from "@/features/site/editing/attrs";
import { MAX_HOME_STATS } from "@/features/site/sections";
import type { SectionItemView } from "@/features/site/content";
import Link from "next/link";
import { CountUp } from "@/components/ui/CountUp";
import { getMenuGames } from "@/features/game/menuGames";
import { HomeGamesMenu } from "./HomeGamesMenu";
import { HOME_NAV_COL, HomeNavTileFace } from "./HomeNavTileFace";
import { LogoBand } from "./LogoBand";
import { NAV_ITEMS } from "./navItems";
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
export { NAV_ITEMS } from "./navItems";

/**
 * O CENTRO de cada contador, na faixa de 1820.
 *
 * O número e a legenda vêm do banco (Páginas → Home → Contadores), até
 * `MAX_HOME_STATS` (4). Desde 2026-11-18 os atalhos (HOME, JOGOS…) saíram do
 * meio da faixa (foram para baixo do banner) e a faixa virou banner de borda a
 * borda: os contadores se espalham por IGUAL na largura toda — cada um no
 * centro da sua fatia (2 → 455 e 1365; 4 → 227,5 / 682,5 / 1137,5 / 1592,5).
 * Antes ficavam metade de cada lado do menu, com o meio vazio.
 */
const STATS_WIDTH = 1820;

export function statCenters(count: number): number[] {
  const n = Math.min(Math.max(count, 0), MAX_HOME_STATS);
  return Array.from({ length: n }, (_, i) => (STATS_WIDTH * (i + 0.5)) / n);
}

/**
 * ASSÍNCRONO desde 2026-09-24: lê a lista de jogos do dropdown do GAMES — a
 * mesma leitura cacheada do cabeçalho (`getMenuGames`), deduplicada pelo Next.
 */
export function HomeNav({ stats = [] }: { stats?: SectionItemView[] }) {
  // Os quatro atalhos (HOME, JOGOS…) saíram daqui em 2026-11-18 (pedido do
  // usuário): ficam sob o banner do hero (`HomeNavTiles`). A faixa guarda os
  // contadores, nos mesmos lugares.
  //
  // Desde 2026-11-18 a faixa é um BANNER de borda a borda da tela com logos
  // do site correndo ao fundo (`LogoBand`); os números ficam centrados nela.
  // A seção NÃO é `relative`: a faixa se posiciona pela tela (ver `LogoBand`).
  return (
    <section className="mt-[45px] h-[170px]">
      <LogoBand mode="screen" className="h-[170px]" />
      <div className="relative h-full">
        {statCenters(stats.length).map((center, index) => (
          <Stat
            key={stats[index].id}
            id={stats[index].id}
            center={center}
            value={stats[index].title}
            label={stats[index].body}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Os quatro atalhos da home (HOME, JOGOS, FIDELIDADE, VENDA PRA NÓS). Desde
 * 2026-11-18 sob o banner do hero, abaixo das barrinhas e da legenda (pedido
 * do usuário). Mantêm os vãos do arquivo entre si (`left` de `NAV_ITEMS`),
 * deslocados para começar em `originLeft`, na altura `top`.
 *
 * ASSÍNCRONO: lê a lista de jogos do dropdown do JOGOS — a mesma leitura
 * cacheada do cabeçalho (`getMenuGames`), deduplicada pelo Next.
 */
export async function HomeNavTiles({ originLeft, top }: { originLeft: number; top: number }) {
  const games = await getMenuGames();

  return (
    <nav aria-label="Seções principais" className="contents">
        {NAV_ITEMS.map((item, index) => {
          // Colunas iguais, lado a lado (2026-11-22): o vão entre os quatro é o
          // mesmo. As posições do arquivo (679/784/905/1047) davam vãos de
          // 105, 121 e 142px.
          const style = { left: originLeft + index * HOME_NAV_COL, top, ...revealDelay(index + 1) };

          if ("key" in item && item.key === "games") {
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
        className="absolute top-[47px] -translate-x-1/2 font-poppins text-[40px] leading-[55px] font-semibold text-brand-orange"
        style={{ left: center }}
      >
        <CountUp value={value} />
      </p>
      <p
        {...editItem("home:navegacao", id, "body")}
        className="absolute top-[99px] -translate-x-1/2 whitespace-nowrap font-poppins text-[15px] leading-[23px] font-bold tracking-[0.15px] text-white/80"
        style={{ left: center }}
      >
        {label}
      </p>
    </div>
  );
}
