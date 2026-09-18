import Image from "next/image";
import { editItem } from "@/features/site/editing/attrs";
import type { SectionItemView } from "@/features/site/content";
import {
  TEAM_CARD_HEIGHT,
  TEAM_CARD_WIDTH,
  TEAM_PHOTO_HEIGHT,
  TEAM_PHOTO_WIDTH,
} from "./team";

/**
 * Seção "EQUIPE LETS 4 TRADE" (Figma: título 578:1796, subtítulo 578:1797,
 * texto 794:1617, mapa 567:1450 e os sete cards 578:1736 e irmãos).
 *
 * O parágrafo é alinhado à ESQUERDA: no arquivo, linhas consecutivas começam
 * exatamente na mesma coluna (dá para conferir pelo recorte idêntico das
 * primeiras palavras), o que descarta centralização.
 *
 * ── Arranjo dos cards (Figma 131:1504 — a home de referência) ─────────────
 * Os sete cards ficam nas coordenadas do arquivo, relativas à seção (origem no
 * topo do título, y=2577, e na margem de 50px): dois ladeando o texto e cinco
 * numa fileira ESCALONADA embaixo, cada um numa altura. A posição é do LUGAR,
 * não da pessoa: o 1º membro da lista ocupa o 1º lugar, e reordenar pelo
 * painel troca quem aparece onde.
 *
 * Membro além do 7º não tem lugar no desenho: entra numa fileira centrada
 * abaixo, em vez de ganhar coordenada inventada.
 *
 * Histórico: 2026-09-10 fileira única; 2026-09-17 manhã, arranjo do nó
 * 2186:2672 (outra versão da home) — o usuário confirmou depois que a
 * referência é o 131:1504.
 */
/** Os sete lugares do arquivo (cards 578:1798, 578:1736, 582:1810, …). */
const CARD_POSITIONS: React.CSSProperties[] = [
  { left: 82, top: -1 }, // DANIEL — esquerda do texto
  { left: 1372, top: -66 }, // EDDMAX — direita do texto
  { left: 79, top: 479 }, // ROGUE
  { left: 382, top: 514 }, // ZEZÃO
  { left: 707, top: 469 }, // YURI
  { left: 1050, top: 511 }, // GUS
  { left: 1377, top: 408 }, // LUAN
];

/** Onde o divisor que fecha a seção fica no arquivo (y=3595 − 2577). */
const DIVIDER_TOP = 1018;

export function TeamSection({
  title = "EQUIPE LETS 4 TRADE",
  subtitle = "Especialistas no que há de melhor no mercado relacionado a ARPGs",
  body,
  items = [],
}: {
  title?: string;
  subtitle?: string;
  /** O parágrafo longo. Ausente = o texto que o arquivo traz. */
  body?: string;
  items?: SectionItemView[];
}) {
  const placed = items.slice(0, CARD_POSITIONS.length);
  const rest = items.slice(CARD_POSITIONS.length);

  return (
    <section aria-labelledby="team-title" className="relative">
      <WorldMap />

      {/* Render decorativo à esquerda do título (Figma 844:103). */}
      <Image
        src="/images/home/deco-equipe.webp"
        alt=""
        width={86}
        height={86}
        aria-hidden
        className="pointer-events-none absolute -top-[12.68px] left-[533.88px] h-[85.56px] w-[86.42px] object-cover"
      />

      <h2
        id="team-title"
        data-edit-field="home:equipe:title"
        className="absolute top-0 left-[542px] w-[736px] text-center font-poppins text-[65px] leading-[normal] font-semibold tracking-[0.325px] text-white"
      >
        {title}
      </h2>

      {/* No arquivo o subtítulo ocupa uma linha dentro dos 601px da caixa, e
          com a Helvetica Neue real ele cabe (589px). O `whitespace-nowrap`
          fica como seguro: as linhas abaixo têm posição absoluta, então uma
          quebra inesperada — durante a troca de fonte, ou se ela falhar — não
          empurraria nada, iria POR CIMA. */}
      <p data-edit-field="home:equipe:subtitle" className="absolute top-[104px] left-[581px] w-[601px] text-center font-helvetica text-[18px] leading-[normal] font-bold tracking-[0.18px] whitespace-nowrap text-white">
        {subtitle}
      </p>

      {/* Os dois primeiros membros, nas laterais do texto. */}
      {placed.length > 0 ? (
        <ul className="contents">
          {placed.map((member, index) => (
            <TeamCard
              key={member.id}
              member={member}
              className="absolute"
              style={CARD_POSITIONS[index]}
            />
          ))}
        </ul>
      ) : null}

      {/* O parágrafo é posicionado, mas FLUI: texto editado no painel muda de
          altura. `min-height` = onde o divisor fica no arquivo — os cards são
          absolutos e não ocupam espaço, então é este bloco que dá à seção a
          altura do desenho. */}
      <div className="pt-[153px]" style={{ minHeight: DIVIDER_TOP }}>
        <p className="mx-auto w-[601px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] whitespace-pre-line text-brand-placeholder">
          <span data-edit-field="home:equipe:body">{body || TEAM_DEFAULT_BODY}</span>
        </p>
      </div>

      {rest.length > 0 ? (
        // Membros além dos sete lugares do desenho: fileira centrada.
        <ul className="mb-[100px] flex flex-wrap justify-center gap-[25px]">
          {rest.map((member) => (
            <TeamCard key={member.id} member={member} className="relative" />
          ))}
        </ul>
      ) : null}

      {/* Divisor de 1820×1 que fecha a seção (Figma 617:804). */}
      <hr className="w-[1820px] border-0 border-t border-brand-hairline" />
    </section>
  );
}

/**
 * Mapa-múndi do fundo (Figma 567:1450), em x=959 do frame de 1920.
 *
 * No arquivo o nó tem 1492,57 de largura e SANGRA para fora da página — o frame
 * corta o excesso. O SVG exportado já vem cortado nesse limite (962×986), então
 * ele é desenhado no tamanho natural: esticá-lo até os 1492,57 do nó deformaria
 * o mapa em 1,55×, que foi o que aconteceu quando o arquivo entrou.
 *
 * O invólucro mantém o `overflow-hidden` mesmo assim, para garantir que nada
 * aumente a largura de rolagem do documento. A altura (1281 = 297 + 984) passa
 * da seção de propósito: o rodapé do mapa avança sobre a área dos guias como no
 * design. É decorativo e fica atrás — as seções seguintes pintam por cima.
 */
function WorldMap() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 -left-[50px] h-[1281px] w-[1920px] overflow-hidden"
    >
      <Image
        src="/images/home/world-map.svg"
        alt=""
        width={962}
        height={986}
        className="map-drift absolute top-[297px] left-[959px] h-[986px] w-[962px] max-w-none"
      />
    </div>
  );
}

/**
 * Card 361×446, raio 30, fundo preto a 10%, contorno branco a 10% e desfoque de
 * fundo — os valores do "Rectangle 6449" lidos no inspector.
 *
 * ⚠️ O raio do `backdrop-blur` não é exposto pelo inspector; usamos os mesmos
 * 40px dos cards do hero, que têm o mesmo tratamento no arquivo.
 */
function TeamCard({
  member,
  className,
  style,
}: {
  member: SectionItemView;
  /** `absolute` nas laterais, `relative` na grade. */
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <li
      className={`team-card shrink-0 rounded-[30px] border border-white/10 bg-black/10 backdrop-blur-[40px] ${className}`}
      style={{ width: TEAM_CARD_WIDTH, height: TEAM_CARD_HEIGHT, ...style }}
    >
      {/* Membro sem foto continua com o nome no lugar certo: a moldura vazia
          ocupa a mesma caixa, em vez de o nome subir para o meio do card. */}
      {member.image ? (
        <Image
          {...editItem("home:equipe", member.id, "image")}
          src={member.image}
          alt={member.title}
          width={Math.round(TEAM_PHOTO_WIDTH)}
          height={Math.round(TEAM_PHOTO_HEIGHT)}
          className="team-photo absolute top-[50px] left-[50px] object-contain"
          style={{ width: TEAM_PHOTO_WIDTH, height: TEAM_PHOTO_HEIGHT }}
        />
      ) : (
        <span
          {...editItem("home:equipe", member.id, "image")}
          aria-hidden
          className="pointer-events-none absolute top-[50px] left-[50px] rounded-[20px] border border-dashed border-white/15"
          style={{ width: TEAM_PHOTO_WIDTH, height: TEAM_PHOTO_HEIGHT }}
        />
      )}

      <p
        {...editItem("home:equipe", member.id, "title")}
        className="team-name absolute top-[392px] left-1/2 w-[251px] -translate-x-1/2 text-center font-poppins text-[20px] leading-[normal] font-bold tracking-[0.4px] text-white">
        {member.title}
      </p>
    </li>
  );
}

/**
 * O parágrafo do arquivo, usado quando o painel não o personalizou.
 *
 * Fica aqui e não no catálogo de seções porque tem quase mil caracteres —
 * `defaultTitle` guarda rótulos curtos, e um texto deste tamanho ali faria o
 * catálogo virar arquivo de conteúdo.
 */
export const TEAM_DEFAULT_BODY =
  // Quatro parágrafos, como no arquivo (quebras renderizadas por
  // `whitespace-pre-line`).
  "Desde 2021, a Lets 4 Trade tem sido sua parceira em tempo, diversão e nas " +
  "melhores experiências em jogos online.\n\nA nossa equipe é formada por jogadores " +
  "como você, que respiram games e sabem perfeitamente o que é precisar de um " +
  "boost ou de moedas para otimizar a jogatina.\n\nCada um dos nossos especialistas " +
  "foi escolhido a dedo para assegurar que você sempre tenha o melhor atendimento " +
  "e o máximo de aproveitamento do seu tempo de lazer.\n\nComo sempre dizemos: " +
  "\u201cSe, com as nossas moedas e serviços, o seu dia se tornar um pouco mais " +
  "leve, divertido e feliz, então estamos no caminho certo!\u201d Em nome de todo " +
  "o time, o meu sincero muito obrigado por fazer parte da nossa jornada.";
