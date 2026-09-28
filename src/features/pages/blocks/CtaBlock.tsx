import Link from "next/link";
import { cn } from "@/lib/cn";
import type { BlockPropsMap, PageRefs } from "../types";
import { resolveHref } from "./shared";

/**
 * "Chamada": faixa com título, texto e UM botão. No tom laranja o botão fica
 * escuro — botão laranja sobre fundo laranja some.
 */
export function CtaBlock({ props, refs }: { props: BlockPropsMap["cta"]; refs: PageRefs }) {
  const orange = props.tone === "orange";
  const href = resolveHref(props.cta?.link, refs);

  const button = href ? (
    href.startsWith("https://") ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(orange)}>
        {props.cta.label}
      </a>
    ) : (
      <Link href={href} className={buttonClass(orange)}>
        {props.cta.label}
      </Link>
    )
  ) : null;

  return (
    <section
      className={cn(
        "flex flex-col items-start gap-[20px] rounded-[30px] p-[28px] md:flex-row md:items-center md:justify-between md:p-[50px]",
        orange
          ? "bg-[image:var(--brand-orange-gradient)]"
          : "border border-brand-border bg-[image:var(--brand-surface-fill)]",
      )}
    >
      <div className="flex max-w-[900px] flex-col gap-[10px]">
        <h2 className="font-helvetica text-[26px] leading-[30px] font-bold text-white md:text-[34px] md:leading-[38px]">
          {props.title}
        </h2>
        {props.text ? (
          <p className={cn("font-poppins text-[16px] leading-[25px]", orange ? "text-white/90" : "text-brand-fg-muted")}>
            {props.text}
          </p>
        ) : null}
      </div>
      {button}
    </section>
  );
}

function buttonClass(onOrange: boolean) {
  return cn(
    "inline-flex h-[52px] shrink-0 items-center justify-center rounded-full px-[34px] font-poppins text-[14px] font-bold tracking-[0.14px] transition-opacity hover:opacity-90",
    onOrange ? "bg-black text-white" : "bg-[image:var(--brand-orange-gradient)] text-white",
  );
}
