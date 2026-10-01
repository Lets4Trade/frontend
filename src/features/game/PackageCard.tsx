import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { GameProduct } from "./types";

/**
 * Card de PACOTE (Figma 1694:2522, 265×417): arte 263×276 com degradê para
 * preto, nome, os tópicos (`highlights`) em lista com bolinha e CONTINUAR.
 *
 * CONTINUAR é um LINK para a página do pacote (`?pacote=<id>`, 2026-10-01 —
 * antes abria um diálogo): ela SUBSTITUI a grade, com os textos do pacote à
 * esquerda e o configurador no layout que o admin escolheu (faixa de nível ou
 * lista de serviços — ver `PackageDetail`). Link e não botão: dá para voltar
 * com o "voltar" do navegador e mandar o endereço do pacote para alguém. O
 * card não mostra nem calcula preço.
 *
 * Altura MÍNIMA de 417 (e não fixa): os tópicos são escritos no painel (até
 * 6 × 80 caracteres) e o arquivo desenha só três curtos. Com altura fixa o
 * texto passaria por cima do botão.
 */
export function PackageCard({ product, href }: { product: GameProduct; href: string }) {
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
        <Link
          href={href}
          aria-label={`Continuar: ${product.name}`}
          className={cn(buttonVariants({ variant: "primary" }), "h-[40px] w-full max-w-[215px] self-center px-0")}
        >
          CONTINUAR
        </Link>
      </div>
    </article>
  );
}

