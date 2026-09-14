import Image from "next/image";
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
 * ── Os cards deixaram de ser espalhados ────────────────────────────────────
 * No arquivo os sete cards ficam em posições soltas em volta do mapa — (82,-1),
 * (1372,-66), (1377,408)... É bonito e é impossível de manter: com a equipe
 * vindo do banco, o oitavo membro não teria coordenada, e apagar o terceiro
 * deixaria um buraco no meio do mapa.
 *
 * Viraram uma fileira que QUEBRA sozinha, centrada, com o mesmo card de 361×446
 * e vão de 25px do arquivo. O mapa, o título e o texto continuam onde estavam;
 * a seção passou a ter altura variável, que é o preço de a lista ser editável.
 *
 * Decidido com o usuário em 2026-09-10: CRUD completo vale a perda das posições.
 */
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
        className="absolute top-0 left-[542px] w-[736px] text-center font-poppins text-[65px] leading-[normal] font-semibold tracking-[0.325px] text-white"
      >
        {title}
      </h2>

      {/* No arquivo o subtítulo ocupa uma linha dentro dos 601px da caixa, e
          com a Helvetica Neue real ele cabe (589px). O `whitespace-nowrap`
          fica como seguro: as linhas abaixo têm posição absoluta, então uma
          quebra inesperada — durante a troca de fonte, ou se ela falhar — não
          empurraria nada, iria POR CIMA. */}
      <p className="absolute top-[104px] left-[581px] w-[601px] text-center font-helvetica text-[18px] leading-[normal] font-bold tracking-[0.18px] whitespace-nowrap text-white">
        {subtitle}
      </p>

      {/* O parágrafo é posicionado, mas a seção abaixo dele FLUI — por isso ele
          reserva a própria altura com um irmão invisível, e não com um `top`
          fixo na fileira de cards. Texto editado no painel muda de altura. */}
      <div className="pt-[153px]">
        <p className="mx-auto w-[601px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] text-brand-placeholder">
          {body || DEFAULT_BODY}
        </p>
      </div>

      {items.length > 0 ? (
        <ul className="mt-[80px] flex flex-wrap justify-center gap-[25px]">
          {items.map((member) => (
            <TeamCard key={member.id} member={member} />
          ))}
        </ul>
      ) : null}

      {/* Divisor de 1820×1 que fecha a seção (Figma 617:804). */}
      <hr className="mt-[100px] w-[1820px] border-0 border-t border-brand-hairline" />
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
function TeamCard({ member }: { member: SectionItemView }) {
  return (
    <li
      className="team-card relative shrink-0 rounded-[30px] border border-white/10 bg-black/10 backdrop-blur-[40px]"
      style={{ width: TEAM_CARD_WIDTH, height: TEAM_CARD_HEIGHT }}
    >
      {/* Membro sem foto continua com o nome no lugar certo: a moldura vazia
          ocupa a mesma caixa, em vez de o nome subir para o meio do card. */}
      {member.image ? (
        <Image
          src={member.image}
          alt={member.title}
          width={Math.round(TEAM_PHOTO_WIDTH)}
          height={Math.round(TEAM_PHOTO_HEIGHT)}
          className="team-photo absolute top-[50px] left-[50px] object-contain"
          style={{ width: TEAM_PHOTO_WIDTH, height: TEAM_PHOTO_HEIGHT }}
        />
      ) : (
        <span
          aria-hidden
          className="absolute top-[50px] left-[50px] rounded-[20px] border border-dashed border-white/15"
          style={{ width: TEAM_PHOTO_WIDTH, height: TEAM_PHOTO_HEIGHT }}
        />
      )}

      <p className="team-name absolute top-[392px] left-1/2 w-[251px] -translate-x-1/2 text-center font-poppins text-[20px] leading-[normal] font-bold tracking-[0.4px] text-white">
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
const DEFAULT_BODY =
  "Desde 2021, a Lets 4 Trade tem sido sua parceira em tempo, diversão e nas " +
  "melhores experiências em jogos online. A nossa equipe é formada por jogadores " +
  "como você, que respiram games e sabem perfeitamente o que é precisar de um " +
  "boost ou de moedas para otimizar a jogatina. Cada um dos nossos especialistas " +
  "foi escolhido a dedo para assegurar que você sempre tenha o melhor atendimento " +
  "e o máximo de aproveitamento do seu tempo de lazer. Como sempre dizemos: " +
  "\u201cSe, com as nossas moedas e serviços, o seu dia se tornar um pouco mais " +
  "leve, divertido e feliz, então estamos no caminho certo!\u201d Em nome de todo " +
  "o time, o meu sincero muito obrigado por fazer parte da nossa jornada.";
