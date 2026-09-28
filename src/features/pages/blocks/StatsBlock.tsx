import type { BlockPropsMap } from "../types";

/**
 * "Contadores": números em destaque. Duas colunas no celular, todas numa
 * linha a partir de `md` — a grade se ajusta sozinha a 2…6 itens.
 */
export function StatsBlock({ props }: { props: BlockPropsMap["stats"] }) {
  if (props.items.length === 0) return null;

  return (
    <section
      className="grid grid-cols-2 gap-[15px] md:[grid-template-columns:repeat(var(--stats-cols),minmax(0,1fr))] md:gap-[25px]"
      style={{ "--stats-cols": props.items.length } as React.CSSProperties}
    >
      {props.items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col items-center justify-center gap-[6px] rounded-[24px] border border-brand-border bg-[image:var(--brand-surface-fill)] px-[16px] py-[26px] text-center"
        >
          <span className="text-brand-gradient font-helvetica text-[34px] leading-none font-bold md:text-[44px]">
            {item.value}
          </span>
          <span className="font-poppins text-[13px] font-bold tracking-[0.5px] text-white uppercase">{item.label}</span>
        </div>
      ))}
    </section>
  );
}
