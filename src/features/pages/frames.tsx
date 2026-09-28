import type { CSSProperties, ReactNode } from "react";
import type { ComposedBlock } from "./compose";

/**
 * Molduras das páginas do construtor — as MESMAS da página real, usadas também
 * pela prévia do editor. Uma cópia em cada lugar divergiria na primeira mudança
 * de margem, e a prévia deixaria de mostrar a verdade.
 *
 * A home não está aqui: ela tem duas colunas (celular e desktop com o desenho
 * do Figma) e mora em `app/page.tsx` / `editor/PreviewCanvas.tsx`.
 */

/** Venda pra nós: coluna de 1295 do arquivo. */
export function NarrowFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1295px] px-4 py-[50px] lg:px-[50px]">{children}</div>;
}

/** Fidelidade: teto de 1920 com recuo que cresce com a tela. */
export function WideFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1920px] px-[16px] pt-[40px] pb-[100px] md:px-[50px] md:pt-[68px] 2xl:px-[154px]">
      {children}
    </div>
  );
}

/**
 * Página de jogo: faixa FIXA de 1714 (o desenho da vitrine é de desktop), com
 * a mesma moldura elástica da home — ver o comentário em `app/page.tsx`.
 */
export function GameFrame({ children, glow }: { children: ReactNode; glow?: ReactNode }) {
  return (
    <div className="flex-1 overflow-x-auto">
      <div className="relative mx-auto w-full max-w-[1920px] min-w-[1714px] overflow-x-clip">
        {glow}
        <div className="relative mx-auto w-[1714px] pt-[50px] pb-[100px]">{children}</div>
      </div>
    </div>
  );
}

/**
 * Coluna única de blocos. O vão acompanha a tela por CSS (60% no celular) —
 * estas páginas não têm versão separada de celular como a home, e o servidor
 * não sabe o tamanho da tela de quem pediu.
 */
export function BlockColumn({
  items,
  renderItem,
}: {
  items: ComposedBlock[];
  /** Embrulho opcional de cada bloco (a prévia usa para selecionar). */
  renderItem?: (item: ComposedBlock, style: CSSProperties | undefined, className: string) => ReactNode;
}) {
  return (
    <>
      {items.map((item, index) => {
        const style = index === 0 ? undefined : ({ "--block-gap": `${item.gap}px` } as CSSProperties);
        const className = index === 0 ? "" : "mt-[calc(var(--block-gap)*0.6)] md:mt-[var(--block-gap)]";
        return renderItem ? (
          renderItem(item, style, className)
        ) : (
          <div key={item.key} style={style} className={className}>
            {item.node}
          </div>
        );
      })}
    </>
  );
}
