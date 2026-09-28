import Image from "next/image";

// Movido de `app/page.tsx` em 2026-09-25: a prévia do construtor de páginas
// (`/previa/[slug]`) desenha a home com o mesmo fundo, e arquivo de página do
// Next não pode exportar componentes.

/**
 * Camada decorativa do frame (Figma 362:800 "Effect 2", 567:1710 "Ellipse 8",
 * 567:1712 "Ellipse 9"). São filhos diretos do frame Home, não de uma seção: ficam
 * atrás de tudo e atravessam os limites das seções, então moram aqui.
 *
 * A moeda "4" (945:901) era daqui e SAIU: virou o gatilho que abre o carrossel
 * do hero, então precisava ficar na frente dos cards em vez de atrás de tudo.
 * Hoje mora em `features/home/HeroDeck.tsx`.
 *
 * As coordenadas do arquivo têm origem no topo do frame — que é o topo do
 * CABEÇALHO, 83px acima desta faixa. Daí o desconto de 83 em cada `top`.
 *
 * Os dois brilhos vêm como SVG com o desfoque já rasterizado. Reproduzi-los com
 * `filter: blur()` custaria caro: são raios de 192px e 250px sobre áreas de até
 * 671×1742, e o compositor refaz esse desfoque a cada repaint. O SVG é
 * desenhado uma vez.
 *
 * O invólucro recorta para que o topo negativo do primeiro brilho não gere
 * rolagem vertical dentro do `main`, que é um container de rolagem horizontal.
 */
export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        src="/images/home/glow-hero.svg"
        alt=""
        width={508}
        height={1012}
        className="absolute -top-[83px] left-0 h-[1012px] w-[508px] max-w-none"
      />

      <Image
        src="/images/home/glow-guias.svg"
        alt=""
        width={671}
        height={1742}
        className="absolute top-[2308.09px] left-0 h-[1742px] w-[671px] max-w-none"
      />

      {/* Par do brilho acima, do outro lado (567:1712). É o fundo quente por
          trás do mapa-múndi: vai da seção da equipe até a faixa dos guias, e o
          centro da elipse cai FORA do frame, à direita — o que aparece é a
          borda dela. */}
      <Image
        src="/images/home/glow-equipe.svg"
        alt=""
        width={700}
        height={1663}
        className="absolute top-[2614.97px] left-[1220.5px] h-[1663px] w-[700px] max-w-none"
      />

      {/* O botão de contato flutuante (269:488) SAIU daqui em 2026-09-15: virou
          a bolinha de atendimento de toda a loja, fixa no canto da tela —
          `features/support/ContactBubble.tsx`, montada no layout raiz. */}
    </div>
  );
}
