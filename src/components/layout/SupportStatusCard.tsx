"use client";

import { cn } from "@/lib/cn";
import { AttendantStack } from "@/features/support/ContactBubble";
import type { ScheduleLine } from "@/features/support/hours";
import type { SupportPresence } from "@/features/support/presenceTypes";
import { usePresence } from "@/features/support/usePresence";

/*
 * Atendimento no MENU DO CELULAR (2026-10-16): quem está online e a grade de
 * horário. No desktop o horário aparece por extenso no cabeçalho
 * (`HeaderHours`); a pílula com janelinha que existia aqui saiu a pedido do
 * usuário.
 */

/**
 * O conteúdo da janelinha: quem está online e a grade de horário. Também
 * desenhado dentro do menu do celular, onde a pílula não cabe na barra.
 */
export function SupportStatusDetails({
  presence,
  title,
  schedule,
}: {
  presence: SupportPresence;
  title: string;
  schedule: readonly ScheduleLine[];
}) {
  const online = presence.online;
  return (
    <>
    <div className="flex items-center gap-[10px]">
      {online && presence.attendants.length > 0 ? (
        <AttendantStack attendants={presence.attendants} total={presence.total} size={30} max={4} />
      ) : null}
      <p className="flex items-center gap-[8px] font-poppins text-[14px] font-bold text-white">
        <StatusDot online={online} />
        {online
          ? presence.total === 1
            ? "1 atendente online agora"
            : `${presence.total} atendentes online agora`
          : "Nenhum atendente online agora"}
      </p>
    </div>
    {!online ? (
      <p className="mt-[6px] font-helvetica text-[12px] leading-[17px] text-brand-fg-muted">
        Deixe sua mensagem no chat — respondemos assim que voltarmos.
      </p>
    ) : null}

    {schedule.length > 0 ? (
      <div className="mt-[14px] border-t border-brand-hairline pt-[12px]">
        <p className="font-poppins text-[12px] font-bold tracking-[0.06em] text-brand-orange uppercase">
          {title}
        </p>
        <dl className="mt-[8px] flex flex-col gap-[6px]">
          {schedule.map((line) => (
            <div key={line.days} className="flex items-baseline justify-between gap-[12px]">
              <dt className="font-poppins text-[13px] text-white">{line.days}</dt>
              <dd className="font-helvetica text-[13px] text-brand-fg-muted tabular-nums">{line.hours}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-[8px] font-helvetica text-[11px] text-brand-fg-subtle">Horário de Brasília.</p>
      </div>
    ) : null}
    </>
  );
}

/** Cartão do menu do celular (2026-10-16): o mesmo conteúdo da janelinha, ao vivo. */
export function SupportStatusCard({
  presence: initialPresence,
  title,
  schedule,
}: {
  presence: SupportPresence;
  title: string;
  schedule: readonly ScheduleLine[];
}) {
  const presence = usePresence(initialPresence);
  return (
    <section
      aria-label="Atendimento"
      className="rounded-[20px] border border-brand-border bg-brand-surface p-[16px]"
    >
      <SupportStatusDetails presence={presence} title={title} schedule={schedule} />
    </section>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block size-[9px] shrink-0 rounded-full",
        online ? "chat-dot-online bg-[#22c55e]" : "bg-[#ef4444]",
      )}
    />
  );
}
