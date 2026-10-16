import type { ScheduleLine } from "@/features/support/hours";

/**
 * Horário de atendimento, por extenso, no meio do cabeçalho (2026-10-16).
 *
 * Pedido do usuário: "aparecer somente os horários ali em texto", centralizado
 * no vão entre o selo "+1000 REFERÊNCIAS" e o carrinho — no lugar da pílula
 * com janelinha, que ele não gostou. O online/offline fica no botão do chat.
 *
 * Quem posiciona é o `SiteHeader` (este bloco é o `flex-1` do lado direito).
 * Aqui só se decide SE cabe: o vão muda com a largura da tela e com o estado
 * da sessão (deslogado, CRIAR/ACESSAR CONTA ocupam quase tudo). Com container
 * query o bloco mede o próprio espaço — abaixo de 220px some, em vez de
 * encostar no selo ou nos botões. Sem JS, sem medir no navegador.
 *
 * Servidor puro: o horário vem do layout cacheado; não há estado.
 */
export function HeaderHours({ title, schedule }: { title: string; schedule: readonly ScheduleLine[] }) {
  if (schedule.length === 0) return null;
  return (
    <div className="@container hidden min-w-0 flex-1 md:block" data-admin-section="layout:horario">
      <div className="hidden flex-col items-center text-center @min-[220px]:flex">
        <span className="font-poppins text-[10px] leading-[14px] font-bold tracking-[0.08em] text-brand-fg-subtle uppercase">
          {title}
        </span>
        <span className="mt-[3px] flex flex-wrap justify-center gap-x-[10px] font-poppins text-[13px] leading-[18px] text-white">
          {schedule.map((line, index) => (
            <span key={line.days} className="whitespace-nowrap">
              {index > 0 ? (
                <span aria-hidden className="mr-[10px] text-brand-orange">
                  ·
                </span>
              ) : null}
              <span className="font-bold">{line.days}</span> {line.hours}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/**
 * Celular (2026-10-16, pedido do usuário): o horário fica ABAIXO da barra, mas
 * ainda DENTRO do cabeçalho — uma faixa fina que acompanha a rolagem junto
 * (o cabeçalho é `sticky`). Na barra de ~400px não cabe ao lado da logo, do
 * selo e do carrinho. Do `md` em diante quem mostra é o `HeaderHours`.
 */
export function HeaderHoursStrip({ title, schedule }: { title: string; schedule: readonly ScheduleLine[] }) {
  if (schedule.length === 0) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-[8px] gap-y-[2px] border-t border-white/10 px-[16px] py-[6px] text-center md:hidden"
      data-admin-section="layout:horario"
    >
      <span className="font-poppins text-[9px] leading-[14px] font-bold tracking-[0.08em] text-brand-fg-subtle uppercase">
        {title}
      </span>
      {schedule.map((line) => (
        <span key={line.days} className="font-poppins text-[11px] leading-[14px] whitespace-nowrap text-white">
          <span className="font-bold">{line.days}</span> {line.hours}
        </span>
      ))}
    </div>
  );
}
