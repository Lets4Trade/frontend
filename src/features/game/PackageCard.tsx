"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { ProductContext } from "./ProductCard";
import { ServiceConfigurator } from "./ServiceConfigurator";
import type { GameProduct } from "./types";

/**
 * Card de PACOTE (Figma 1694:2522, 265×417): arte 263×276 com degradê para
 * preto, nome, os tópicos (`highlights`) em lista com bolinha e CONTINUAR.
 *
 * CONTINUAR abre o `ServiceConfigurator` DAQUELE produto num diálogo (decisão
 * do usuário, 2026-09-30): opções, adicionais, total e COMPRAR AGORA. O card
 * não mostra nem calcula preço — preço é só `quote`, dentro do configurador,
 * e o backend refaz a conta no pedido.
 *
 * Diálogo do Radix (a mesma base dos outros do projeto): foco preso dentro,
 * Esc e clique fora fecham, o foco volta ao CONTINUAR, fundo sem rolagem. O
 * conteúdo só é montado quando abre — 24 cards não montam 24 configuradores.
 *
 * Altura MÍNIMA de 417 (e não fixa): os tópicos são escritos no painel (até
 * 6 × 80 caracteres) e o arquivo desenha só três curtos. Com altura fixa o
 * texto passaria por cima do botão.
 */
export function PackageCard({ product, context }: { product: GameProduct; context: ProductContext }) {
  return (
    <article className="relative flex min-h-[417px] w-full max-w-[265px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-black/10">
      <div className="relative mx-px mt-px h-[276px] shrink-0 overflow-hidden rounded-t-[30px] bg-[#2f2f2f]">
        {product.image ? (
          <Image src={product.image.src} alt="" fill sizes="265px" className="object-cover" />
        ) : null}
        {/* Degradê de 114px no pé da arte, que passa por trás do nome. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[114px] bg-gradient-to-b from-transparent to-black"
        />
      </div>

      {/* Faixa preta: sobe 36px sobre a arte (o nome fica dentro do degradê,
          como no arquivo) e vai até o pé do card. */}
      <div className="relative -mt-[36px] flex flex-1 flex-col bg-[linear-gradient(to_bottom,transparent,black_36px)] px-[25px] pb-[20px]">
        <h3 className="font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] break-words text-white">
          {product.name}
        </h3>

        {product.highlights.length > 0 ? (
          <ul className="mt-[8px] list-disc pl-[20px] font-helvetica text-[14px] leading-[25px] tracking-[0.14px] text-brand-placeholder marker:text-brand-placeholder">
            {product.highlights.map((item, index) => (
              <li key={index} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Empurra o botão para o pé do card, com 15px no mínimo. */}
        <div aria-hidden className="min-h-[15px] flex-1" />
        <PackageDialog product={product} context={context} />
      </div>
    </article>
  );
}

function PackageDialog({ product, context }: { product: GameProduct; context: ProductContext }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          variant="primary"
          className="h-[40px] w-full max-w-[215px] self-center px-0"
          aria-label={`Continuar: ${product.name}`}
        >
          CONTINUAR
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        {/* Centrado, largura do card do configurador (554) e altura da janela
            no máximo: o que não couber rola DENTRO do diálogo. */}
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[554px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[30px] outline-none">
          <Dialog.Title className="sr-only">{product.name}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Escolha as opções do pacote e confira o total antes de comprar.
          </Dialog.Description>

          <ServiceConfigurator
            products={[product]}
            context={context}
            filters={
              <h2 className="font-poppins text-[18px] leading-[27px] font-bold tracking-[0.36px] break-words text-white">
                {product.name}
              </h2>
            }
            emptyMessage="Este pacote está indisponível no momento."
          />

          <Dialog.Close
            aria-label="Fechar"
            className="absolute top-[15px] right-[15px] z-10 flex size-[40px] items-center justify-center rounded-full border border-white/10 bg-black/60 font-poppins text-[20px] leading-none text-white backdrop-blur-[10px] transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <span aria-hidden>×</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
