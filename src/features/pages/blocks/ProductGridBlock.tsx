import Image from "next/image";
import Link from "next/link";
import type { BlockPropsMap, PageRefs } from "../types";
import { assetUrl, BlockHeading, formatPriceCents } from "./shared";

/**
 * "Produtos": os itens de um jogo, já filtrados e ordenados pelo BACKEND
 * (`refs.products[blockId]`). Preço vem do catálogo na hora da leitura — o
 * bloco guarda o FILTRO, nunca o preço, então mudar o preço no painel muda
 * aqui também. Cada card leva à página do jogo, onde o carrinho mora.
 */
export function ProductGridBlock({
  blockId,
  props,
  refs,
}: {
  blockId: string;
  props: BlockPropsMap["productGrid"];
  refs: PageRefs;
}) {
  const products = refs.products[blockId] ?? [];
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-[25px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <ul className="grid grid-cols-2 gap-[15px] md:grid-cols-3 md:gap-[25px] xl:grid-cols-4">
        {products.map((product) => {
          const art = assetUrl(product.imageUrl ?? undefined);
          return (
            <li key={product.id}>
              <Link
                // Com aba escolhida, a vitrine já abre nela (`?aba=` é validado lá).
                href={`/games/${product.gameSlug}${props.tabSlug ? `?aba=${encodeURIComponent(props.tabSlug)}` : ""}`}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-brand-border bg-black/20 transition-colors hover:border-brand-orange"
              >
                <span className="relative block aspect-square w-full bg-[#2f2f2f]">
                  {art ? (
                    <Image
                      src={art}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="flex flex-1 flex-col gap-[8px] p-[16px]">
                  <span className="line-clamp-2 font-poppins text-[14px] font-bold text-white">{product.name}</span>
                  <span className="text-brand-gradient mt-auto font-helvetica text-[18px] font-bold">
                    {formatPriceCents(product.priceCents)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
