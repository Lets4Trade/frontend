import Link from "next/link";

/**
 * A porta de "Páginas": uma lista curta, uma linha por página, cada uma com um
 * único "Editar" (2026-10-01, versão "clean" aprovada pelo usuário). Server
 * component sem estado: só links.
 */

export type HubCard = {
  href: string;
  title: string;
  description: string;
};

export type HubGroup = { title: string; cards: HubCard[] };

export function PagesHub({ groups }: { groups: HubGroup[] }) {
  return (
    <div className="mx-auto w-full max-w-[880px] px-[16px] pt-[32px] pb-[120px] sm:px-[32px] lg:pt-[50px]">
      <h1 className="font-poppins text-[26px] leading-[32px] font-semibold text-white">Páginas</h1>
      <p className="mt-[6px] font-helvetica text-[15px] text-brand-fg-muted">O que você quer editar?</p>

      <div className="mt-[32px] flex flex-col gap-[32px]">
        {groups.map((group, index) => (
          <section key={group.title} aria-labelledby={`hub-grupo-${index}`}>
            <h2
              id={`hub-grupo-${index}`}
              className="px-[4px] font-poppins text-[12px] font-bold tracking-[0.08em] text-brand-fg-subtle uppercase"
            >
              {group.title}
            </h2>
            <ul className="mt-[10px] divide-y divide-white/10 overflow-hidden rounded-[18px] border border-brand-border bg-[image:var(--brand-surface-fill)]">
              {group.cards.map((card) => (
                <li key={card.href}>
                  <Link
                    href={card.href}
                    className="group flex items-center gap-[16px] px-[18px] py-[14px] transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-poppins text-[16px] font-semibold text-white">{card.title}</span>
                      <span className="mt-[2px] block font-helvetica text-[13px] text-brand-fg-subtle">
                        {card.description}
                      </span>
                    </span>
                    <span className="shrink-0 font-poppins text-[13px] font-bold text-brand-orange transition-transform group-hover:translate-x-[2px]">
                      Editar →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
