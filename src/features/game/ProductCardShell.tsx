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
 *
 * `cta` (2026-10-08, pedido do usuário): o botão "COMPRE AQUI" ABAIXO da
 * fileira. Com ele o card cresce 50px (10 de vão + 40 de botão) e mantém os
 * 25px do pé; sem ele (prévia do painel), fica nos 417 do arquivo.
 */
export function ProductCardShell({
  name,
  nameEn,
  price,
  image,
  actions,
  cta,
}: {
  name: string;
  /** Nome em inglês, numa segunda linha abaixo do português (2026-10-08). */
  nameEn?: string;
  /** Já formatado em BRL — quem formata é quem tem a fonte do valor. */
  /** Texto ou nó: a vitrine mostra o total do contador com a quantidade ao lado. */
  price: React.ReactNode;
  image?: { src: string; alt?: string; width: number; height: number };
  actions: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <article
      className={`relative ${cta ? "h-[467px]" : "h-[417px]"} w-[265px] overflow-hidden rounded-[30px] border border-white/10 bg-black/10`}
    >
      {/* A imagem é opcional de propósito. O arquivo desenha um retângulo
          #2f2f2f atrás dela; saiu em 2026-10-08 (pedido do usuário): a arte
          fica direto sobre o fundo do card, e sem arte a área fica vazia. */}
      <div className="absolute top-px left-px h-[276px] w-[263px] overflow-hidden rounded-t-[30px]">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt ?? ""}
            width={image.width}
            height={image.height}
            // Inteira e com respiro (pedido do usuário, 2026-10-06): com
            // `object-cover` a arte preenchia a área toda e ficava grande e
            // cortada. A margem de baixo é maior porque o degradê come a base.
            className="size-full object-contain px-[28px] pt-[24px] pb-[40px]"
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

      {/* Nome menor que o do arquivo (15px, pedido do usuário 2026-10-08) para
          caber o português e o inglês, um por linha, acima do preço. Só com o
          português, a linha fica no meio do espaço que o nome tinha. */}
      <h3
        className={`absolute ${nameEn ? "top-[259px]" : "top-[275px]"} left-0 w-full truncate px-[10px] text-center font-poppins text-[15px] leading-[20px] font-semibold tracking-[0.3px] text-white`}
      >
        {name}
      </h3>
      {nameEn ? (
        <p
          lang="en"
          className="absolute top-[280px] left-0 w-full truncate px-[10px] text-center font-poppins text-[15px] leading-[20px] font-medium tracking-[0.3px] text-white/70"
        >
          {nameEn}
        </p>
      ) : null}

      <p className="absolute top-[305px] left-0 w-full truncate px-[10px] text-center font-poppins text-[18px] leading-[27px] font-semibold tracking-[0.36px] text-white">
        {price}
      </p>

      {/* Só a POSIÇÃO da fileira é da casca (y=342 nos dois desenhos). O
          arranjo interno fica com cada variante, porque eles diferem: na
          vitrine a fileira começa a 32px da borda, no painel ela é centrada. */}
      <div className="absolute top-[342px] left-0 w-full">{actions}</div>
      {cta ? <div className="absolute top-[402px] left-0 w-full">{cta}</div> : null}
    </article>
  );
}
