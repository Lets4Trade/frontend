import Image from "next/image";
import type { ReactNode } from "react";
import { CardTitleLines, splitName } from "./nameBreak";
import { PackageDescriptionPopover } from "./PackageDescriptionPopover";
import type { ServiceContent } from "./types";

const ART_BOX =
  "relative h-[150px] w-full overflow-hidden rounded-t-[22px] desk:absolute desk:top-px desk:left-px desk:h-[276px] desk:w-[263px] desk:rounded-t-[30px]";

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
  nameBreak,
  nameEn,
  price,
  image,
  actions,
  cta,
  hoverDescription,
  badge,
}: {
  name: string;
  /** Onde o título quebra em duas linhas (2026-11-17): índice do espaço do nome. */
  nameBreak?: number | null;
  /** Nome em inglês, numa segunda linha abaixo do português (2026-10-08). */
  nameEn?: string;
  /** Já formatado em BRL — quem formata é quem tem a fonte do valor. */
  /** Texto ou nó: a vitrine mostra o total do contador com a quantidade ao lado. */
  price: React.ReactNode;
  image?: { src: string; alt?: string; width: number; height: number };
  actions: ReactNode;
  cta?: ReactNode;
  /**
   * Descrição do produto ao passar o mouse na ARTE (2026-10-20, pedido do
   * usuário) — o mesmo painel do card de pacote, com textos e imagens escritos
   * no painel. Ausente = o card não mostra nada (só aparece o que o admin
   * configurou).
   */
  hoverDescription?: { title: string; content: ServiceContent };
  /** Selo do canto superior direito (desconto do pacote, 2026-10-27). */
  badge?: ReactNode;
}) {
  const art = image ? (
    <Image
      src={image.src}
      alt={image.alt ?? ""}
      width={image.width}
      height={image.height}
      // Inteira e com respiro (pedido do usuário, 2026-10-06): com
      // `object-cover` a arte preenchia a área toda e ficava grande e
      // cortada. A margem de baixo é maior porque o degradê come a base.
      className="size-full object-contain px-[16px] pt-[14px] pb-[10px] desk:px-[28px] desk:pt-[24px] desk:pb-[40px]"
    />
  ) : null;

  // Título em duas linhas (2026-11-17): no computador ele sobe 20px (uma
  // linha) para o preço continuar no mesmo lugar.
  const twoLines = splitName(name, nameBreak) !== null;
  const titleTop = nameEn
    ? twoLines
      ? "desk:top-[239px]"
      : "desk:top-[259px]"
    : twoLines
      ? "desk:top-[255px]"
      : "desk:top-[275px]";

  // Fonte que ENCOLHE nos nomes longos (2026-11-18, pedido do usuário:
  // "Fragmento de Crise Desgastado" virava "…"). Só CSS, no servidor:
  // largura útil do card (100cqi − 20px de respiro) ÷ (letras da linha mais
  // longa × 0,6em). Os 0,6em por letra foram medidos na Poppins 600 do card
  // (0,54–0,59 em nomes reais), com folga. Nome curto fica no tamanho cheio
  // (teto); muito longo para no piso — no computador o "…" ainda é a última
  // saída, no celular o nome quebra em até 2 linhas.
  const chars = Math.max(1, ...(splitName(name, nameBreak) ?? [name]).map((line) => line.length));
  const fitStyle = { "--fit": `calc((100cqi - 20px) / ${chars * 0.6})` } as React.CSSProperties;

  return (
    <article
      className={`@container relative flex w-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-black/10 pb-[14px] desk:block desk:w-[265px] desk:rounded-[30px] desk:pb-0 ${cta ? "desk:h-[467px]" : "desk:h-[417px]"}`}
    >
      {/* A imagem é opcional de propósito. O arquivo desenha um retângulo
          #2f2f2f atrás dela; saiu em 2026-10-08 (pedido do usuário): a arte
          fica direto sobre o fundo do card, e sem arte a área fica vazia. */}
      {/* Sem imagem no pé do painel: a arte já está no card, e as fotos da
          descrição vêm do próprio texto (editor do painel). */}
      {hoverDescription ? (
        <PackageDescriptionPopover title={hoverDescription.title} content={hoverDescription.content} className={ART_BOX}>
          {art}
        </PackageDescriptionPopover>
      ) : (
        <div className={ART_BOX}>{art}</div>
      )}

      {/* Degradê que apaga a base da arte, e a faixa preta atrás do nome e do
          preço: os dois estão no arquivo e são o que garante leitura sobre
          qualquer imagem que o admin subir. */}
      <div
        aria-hidden
        className="absolute top-[239px] left-px hidden h-[38px] w-[263px] bg-gradient-to-b from-transparent to-black desk:block"
      />
      <div
        aria-hidden
        className="absolute top-[277px] left-px hidden h-[60px] w-[257px] bg-black desk:block"
      />

      {/* Nome menor que o do arquivo (15px, pedido do usuário 2026-10-08) para
          caber o português e o inglês, um por linha, acima do preço. Só com o
          português, a linha fica no meio do espaço que o nome tinha. */}
      {/* Celular: 11–13px e até 2 linhas (sem "…" até lá); o preço e os botões
          descem para o pé (`mt-auto`), alinhados com os do card vizinho.
          Computador: 12–15px numa linha, nas coordenadas do arquivo. */}
      <h3
        title={name}
        style={fitStyle}
        className={`mt-[8px] w-full px-[10px] text-center font-poppins text-[length:clamp(11px,var(--fit),13px)] leading-[16px] font-semibold tracking-[0.3px] break-words text-white max-desk:mb-[4px] max-desk:line-clamp-2 desk:absolute desk:left-0 desk:mt-0 desk:truncate desk:text-[length:clamp(12px,var(--fit),15px)] desk:leading-[20px] ${titleTop}`}
      >
        <CardTitleLines name={name} nameBreak={nameBreak} />
      </h3>
      {nameEn ? (
        <p
          lang="en"
          className="w-full truncate px-[10px] text-center font-poppins text-[12px] leading-[17px] font-medium tracking-[0.3px] text-white/70 desk:absolute desk:top-[280px] desk:left-0 desk:text-[15px] desk:leading-[20px]"
        >
          {nameEn}
        </p>
      ) : null}

      <p className="w-full truncate px-[10px] text-center font-poppins text-[16px] max-desk:mt-auto leading-[24px] font-semibold tracking-[0.36px] text-white desk:absolute desk:top-[305px] desk:left-0 desk:mt-0 desk:text-[18px] desk:leading-[27px]">
        {price}
      </p>

      {/* Só a POSIÇÃO da fileira é da casca (y=342 nos dois desenhos). O
          arranjo interno fica com cada variante, porque eles diferem: na
          vitrine a fileira começa a 32px da borda, no painel ela é centrada. */}
      <div className="mt-[10px] w-full desk:absolute desk:top-[342px] desk:left-0 desk:mt-0">{actions}</div>
      {cta ? <div className="mt-[10px] w-full px-[10px] desk:absolute desk:top-[402px] desk:left-0 desk:mt-0 desk:px-0">{cta}</div> : null}
      {badge}
    </article>
  );
}
