import Image from "next/image";
import { cn } from "@/lib/cn";
import type { BlockPropsMap, PageRefs } from "../types";
import { assetUrl, CtaButton } from "./shared";

/**
 * "Destaque": título grande, texto, botão e imagem. Coluna única no celular,
 * texto e imagem lado a lado a partir de `md`. Sem imagem, o texto ocupa a
 * largura toda — nenhum buraco reservado para arte que não existe.
 */
export function HeroBlock({ props, refs }: { props: BlockPropsMap["hero"]; refs: PageRefs }) {
  const image = assetUrl(props.image);
  const centered = props.align === "center";

  return (
    <section className="overflow-hidden rounded-[30px] border border-brand-border bg-[image:var(--brand-surface-fill)]">
      <div
        className={cn(
          "grid items-center gap-[30px] p-[28px] md:p-[60px]",
          image && "md:grid-cols-[1.1fr_1fr]",
        )}
      >
        <div className={cn("flex flex-col gap-[18px]", centered && "items-center text-center")}>
          {props.eyebrow ? (
            <p className="text-brand-gradient font-poppins text-[13px] font-bold tracking-[1.3px] uppercase">
              {props.eyebrow}
            </p>
          ) : null}
          <h2 className="font-helvetica text-[32px] leading-[36px] font-bold tracking-[0.3px] text-white md:text-[52px] md:leading-[56px]">
            {props.title}
          </h2>
          {props.subtitle ? (
            <p className="max-w-[620px] font-poppins text-[16px] leading-[26px] text-brand-fg-muted md:text-[18px] md:leading-[28px]">
              {props.subtitle}
            </p>
          ) : null}
          <div className="pt-[6px]">
            <CtaButton cta={props.cta} refs={refs} />
          </div>
        </div>

        {image ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px]">
            <Image src={image} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
