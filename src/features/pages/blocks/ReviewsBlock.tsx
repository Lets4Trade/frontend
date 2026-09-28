import Image from "next/image";
import type { BlockPropsMap } from "../types";
import { assetUrl, BlockHeading } from "./shared";

/** "Depoimentos": cards com nota, texto e quem disse. */
export function ReviewsBlock({ props }: { props: BlockPropsMap["reviews"] }) {
  if (props.items.length === 0) return null;

  return (
    <section className="flex flex-col gap-[25px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <ul className="grid gap-[15px] md:grid-cols-2 md:gap-[25px] xl:grid-cols-3">
        {props.items.map((item) => {
          const avatar = assetUrl(item.avatar);
          const rating = Math.min(5, Math.max(1, Math.round(item.rating)));
          return (
            <li
              key={item.id}
              className="flex flex-col gap-[16px] rounded-[24px] border border-brand-border bg-[image:var(--brand-surface-fill)] p-[24px]"
            >
              <p aria-label={`Nota ${rating} de 5`} className="text-[18px] tracking-[2px]">
                <span className="text-brand-orange">{"★".repeat(rating)}</span>
                <span className="text-white/15">{"★".repeat(5 - rating)}</span>
              </p>
              <p className="flex-1 font-poppins text-[15px] leading-[25px] text-brand-fg-muted">“{item.text}”</p>
              <div className="flex items-center gap-[12px]">
                <span className="relative size-[40px] shrink-0 overflow-hidden rounded-full bg-white/10">
                  {avatar ? (
                    <Image src={avatar} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center font-poppins text-[15px] font-bold text-white">
                      {item.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="font-poppins text-[14px] font-bold text-white">{item.name}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
