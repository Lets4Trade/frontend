import Image from "next/image";
import { cn } from "@/lib/cn";
import type { BlockPropsMap, PageRefs } from "../types";
import { assetUrl, BlockHeading, CtaButton, Paragraphs } from "./shared";

/**
 * "Texto e imagem". No celular a imagem vem SEMPRE depois do texto,
 * independentemente do lado escolhido: o lado é decisão de composição do
 * desktop, e empilhado o que importa é ler antes de ver.
 */
export function TextImageBlock({
  props,
  refs,
}: {
  props: BlockPropsMap["textImage"];
  refs: PageRefs;
}) {
  const image = assetUrl(props.image);

  return (
    <section className={cn("grid items-center gap-[30px] md:gap-[60px]", image && "md:grid-cols-2")}>
      <div className={cn("flex flex-col gap-[18px]", image && props.imageSide === "left" && "md:order-2")}>
        <BlockHeading>{props.title}</BlockHeading>
        <div className="flex flex-col gap-[14px]">
          <Paragraphs
            text={props.body}
            className="font-poppins text-[16px] leading-[27px] text-brand-fg-muted"
          />
        </div>
        <div className="pt-[6px]">
          <CtaButton cta={props.cta} refs={refs} />
        </div>
      </div>

      {image ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[30px] border border-brand-border">
          <Image src={image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
      ) : null}
    </section>
  );
}
