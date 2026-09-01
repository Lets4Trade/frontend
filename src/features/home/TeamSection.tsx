import Image from "next/image";
import {
  TEAM,
  TEAM_CARD_HEIGHT,
  TEAM_CARD_WIDTH,
  TEAM_PHOTO_HEIGHT,
  TEAM_PHOTO_WIDTH,
  type TeamMember,
} from "./team";

/**
 * Seção "EQUIPE LETS 4 TRADE" (Figma: título 578:1796, subtítulo 578:1797,
 * texto 794:1617, mapa 567:1450 e os sete cards 578:1736 e irmãos).
 *
 * Origem no topo do título (y=2577 no frame de 1920); altura até o divisor
 * (y=3595) = 1019. Como na seção de reviews, os filhos ficam em coordenada
 * absoluta lida do arquivo.
 *
 * O parágrafo é alinhado à ESQUERDA: no arquivo, linhas consecutivas começam
 * exatamente na mesma coluna (dá para conferir pelo recorte idêntico das
 * primeiras palavras), o que descarta centralização.
 */
export function TeamSection() {
  return (
    <section aria-labelledby="team-title" className="relative h-[1019px]">
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
        EQUIPE LETS 4 TRADE
      </h2>

      {/* No arquivo o subtítulo ocupa uma linha dentro dos 601px da caixa, e
          com a Helvetica Neue real ele cabe (589px). O `whitespace-nowrap`
          fica como seguro: as linhas abaixo têm posição absoluta, então uma
          quebra inesperada — durante a troca de fonte, ou se ela falhar — não
          empurraria nada, iria POR CIMA. */}
      <p className="absolute top-[104px] left-[581px] w-[601px] text-center font-helvetica text-[18px] leading-[normal] font-bold tracking-[0.18px] whitespace-nowrap text-white">
        Especialistas no que há de melhor no mercado relacionado a ARPGs
      </p>

      <p className="absolute top-[153px] left-[581px] w-[601px] font-helvetica text-[18px] leading-[normal] tracking-[0.18px] text-brand-placeholder">
        Desde 2021, a Lets 4 Trade tem sido sua parceira em tempo, diversão e nas
        melhores experiências em jogos online. A nossa equipe é formada por
        jogadores como você, que respiram games e sabem perfeitamente o que é
        precisar de um boost ou de moedas para otimizar a jogatina. Cada um dos
        nossos especialistas foi escolhido a dedo para assegurar que você sempre
        tenha o melhor atendimento e o máximo de aproveitamento do seu tempo de
        lazer. Como sempre dizemos: &ldquo;Se, com as nossas moedas e serviços, o
        seu dia se tornar um pouco mais leve, divertido e feliz, então estamos no
        caminho certo!&rdquo; Em nome de todo o time, o meu sincero muito
        obrigado por fazer parte da nossa jornada.
      </p>

      <ul className="contents">
        {TEAM.map((member) => (
          <TeamCard key={member.name} member={member} />
        ))}
      </ul>

      {/* Divisor de 1820×1 que fecha a seção (Figma 617:804). */}
      <hr className="absolute top-[1018px] left-0 w-[1820px] border-0 border-t border-brand-hairline" />
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
function TeamCard({ member }: { member: TeamMember }) {
  return (
    <li
      className="team-card absolute rounded-[30px] border border-white/10 bg-black/10 backdrop-blur-[40px]"
      style={{
        left: member.left,
        top: member.top,
        width: TEAM_CARD_WIDTH,
        height: TEAM_CARD_HEIGHT,
      }}
    >
      <Image
        src={member.photo}
        alt={member.name}
        width={Math.round(TEAM_PHOTO_WIDTH)}
        height={Math.round(TEAM_PHOTO_HEIGHT)}
        className="team-photo absolute top-[50px] left-[50px] object-contain"
        style={{ width: TEAM_PHOTO_WIDTH, height: TEAM_PHOTO_HEIGHT }}
      />

      <p className="team-name absolute top-[392px] left-[105px] w-[151px] text-center font-poppins text-[20px] leading-[normal] font-bold tracking-[0.4px] text-white">
        {member.name}
      </p>
    </li>
  );
}
