import Image from "next/image";
import type { ReactNode } from "react";

/**
 * A CASCA do card de produto (Figma 1374:1859) — 265×417.
 *
 * Extraída quando a tela de produtos do painel (Figma 3805:2807) chegou: ela
 * usa exatamente este card, com a mesma arte, o mesmo degradê, a mesma faixa
 * preta e o nome e o preço nas mesmas coordenadas — só a fileira de ações no
 * pé é outra (lixeira e lápis em vez do contador e do carrinho).
 *
 * Duplicar a geometria era a alternativa, e é como as duas versões começam a
 * divergir: alguém ajusta o degradê da vitrine e o do painel fica para trás.
 *
 * `actions` é a única variação, e ela ocupa a fileira de y=342 do arquivo, que
 * é a mesma nos dois desenhos.
 */
export function ProductCardShell({
  name,
  price,
  image,
  actions,
}: {
  name: string;
  /** Já formatado em BRL — quem formata é quem tem a fonte do valor. */
  price: string;
  image?: { src: string; alt?: string; width: number; height: number };
  actions: ReactNode;
}) {
  return (
    <article className="relative h-[417px] w-[265px] overflow-hidden rounded-[30px] border border-white/10 bg-black/10">
      {/* A imagem é opcional de propósito. O arquivo desenha um retângulo
          #2f2f2f no lugar dela — é espaço reservado, e é o que aparece
          enquanto o admin não sobe a arte do produto. */}
      <div className="absolute top-px left-px h-[276px] w-[263px] overflow-hidden rounded-t-[30px] bg-[#2f2f2f]">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt ?? ""}
            width={image.width}
            height={image.height}
            className="size-full object-cover"
          />
        ) : null}
      </div>

      {/* Degradê que apaga a base da arte, e a faixa preta atrás do nome e do
          preço: os dois estão no arquivo e são o que garante leitura sobre
          qualquer imagem que o admin subir. */}
      <div
        aria-hidden
        className="absolute top-[239px] left-px h-[38px] w-[263px] bg-gradient-to-b from-transparent to-black"
      />
      <div
        aria-hidden
        className="absolute top-[277px] left-px h-[60px] w-[257px] bg-black"
      />

      <h3 className="absolute top-[271px] left-0 w-full truncate px-[10px] text-center font-poppins text-[18px] leading-[27px] font-semibold tracking-[0.36px] text-white">
        {name}
      </h3>

      <p className="absolute top-[305px] left-0 w-full text-center font-poppins text-[18px] leading-[27px] font-semibold tracking-[0.36px] text-white">
        {price}
      </p>

      {/* Só a POSIÇÃO da fileira é da casca (y=342 nos dois desenhos). O
          arranjo interno fica com cada variante, porque eles diferem: na
          vitrine a fileira começa a 32px da borda, no painel ela é centrada. */}
      <div className="absolute top-[342px] left-0 w-full">{actions}</div>
    </article>
  );
}
