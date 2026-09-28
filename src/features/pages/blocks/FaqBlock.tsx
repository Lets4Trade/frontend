import type { BlockPropsMap } from "../types";
import { BlockHeading, Paragraphs } from "./shared";

/**
 * "Perguntas". `<details>` nativo: abre e fecha sem JavaScript, funciona com
 * teclado e leitor de tela, e é indexável — o texto da resposta está no HTML.
 */
export function FaqBlock({ props }: { props: BlockPropsMap["faq"] }) {
  if (props.items.length === 0) return null;

  return (
    <section className="flex flex-col gap-[25px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <div className="flex flex-col gap-[12px]">
        {props.items.map((item) => (
          <details
            key={item.id}
            className="group rounded-[20px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[22px] py-[18px] open:border-brand-orange/60"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-[15px] font-poppins text-[16px] font-bold text-white [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="text-brand-gradient shrink-0 text-[22px] leading-none transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="mt-[12px] flex flex-col gap-[10px]">
              <Paragraphs text={item.answer} className="font-poppins text-[15px] leading-[25px] text-brand-fg-muted" />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
