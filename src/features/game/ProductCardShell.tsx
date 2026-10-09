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
 *
 * CELULAR (2026-10-09): abaixo de `lg` o card é FLUIDO e em fluxo (arte, nome,
 * preço, ações e botão empilhados), para caberem dois por linha. As
 * coordenadas do arquivo continuam valendo a partir de `lg` — cada posição
 * absoluta está prefixada.
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
      className={`relative flex w-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-black/10 pb-[14px] lg:block lg:w-[265px] lg:rounded-[30px] lg:pb-0 ${cta ? "lg:h-[467px]" : "lg:h-[417px]"}`}
    >
      {/* A imagem é opcional de propósito. O arquivo desenha um retângulo
          #2f2f2f atrás dela; saiu em 2026-10-08 (pedido do usuário): a arte
          fica direto sobre o fundo do card, e sem arte a área fica vazia. */}
      <div className="relative h-[150px] w-full overflow-hidden rounded-t-[22px] lg:absolute lg:top-px lg:left-px lg:h-[276px] lg:w-[263px] lg:rounded-t-[30px]">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt ?? ""}
            width={image.width}
            height={image.height}
            // Inteira e com respiro (pedido do usuário, 2026-10-06): com
            // `object-cover` a arte preenchia a área toda e ficava grande e
            // cortada. A margem de baixo é maior porque o degradê come a base.
            className="size-full object-contain px-[16px] pt-[14px] pb-[10px] lg:px-[28px] lg:pt-[24px] lg:pb-[40px]"
          />
        ) : null}
      </div>

      {/* Degradê que apaga a base da arte, e a faixa preta atrás do nome e do
          preço: os dois estão no arquivo e são o que garante leitura sobre
          qualquer imagem que o admin subir. */}
      <div
        aria-hidden
        className="absolute top-[239px] left-px hidden h-[38px] w-[263px] bg-gradient-to-b from-transparent to-black lg:block"
      />
      <div
        aria-hidden
        className="absolute top-[277px] left-px hidden h-[60px] w-[257px] bg-black lg:block"
      />

      {/* Nome menor que o do arquivo (15px, pedido do usuário 2026-10-08) para
          caber o português e o inglês, um por linha, acima do preço. Só com o
          português, a linha fica no meio do espaço que o nome tinha. */}
      <h3
        className={`mt-[8px] w-full truncate px-[10px] text-center font-poppins text-[13px] leading-[18px] font-semibold tracking-[0.3px] text-white lg:absolute lg:mt-0 lg:left-0 lg:text-[15px] lg:leading-[20px] ${nameEn ? "lg:top-[259px]" : "lg:top-[275px]"}`}
      >
        {name}
      </h3>
      {nameEn ? (
        <p
          lang="en"
          className="w-full truncate px-[10px] text-center font-poppins text-[12px] leading-[17px] font-medium tracking-[0.3px] text-white/70 lg:absolute lg:top-[280px] lg:left-0 lg:text-[15px] lg:leading-[20px]"
        >
          {nameEn}
        </p>
      ) : null}

      <p className="mt-[4px] w-full truncate px-[10px] text-center font-poppins text-[16px] leading-[24px] font-semibold tracking-[0.36px] text-white lg:absolute lg:top-[305px] lg:left-0 lg:mt-0 lg:text-[18px] lg:leading-[27px]">
        {price}
      </p>

      {/* Só a POSIÇÃO da fileira é da casca (y=342 nos dois desenhos). O
          arranjo interno fica com cada variante, porque eles diferem: na
          vitrine a fileira começa a 32px da borda, no painel ela é centrada. */}
      <div className="mt-[10px] w-full lg:absolute lg:top-[342px] lg:left-0 lg:mt-0">{actions}</div>
      {cta ? <div className="mt-[10px] w-full px-[10px] lg:absolute lg:top-[402px] lg:left-0 lg:mt-0 lg:px-0">{cta}</div> : null}
    </article>
  );
}
