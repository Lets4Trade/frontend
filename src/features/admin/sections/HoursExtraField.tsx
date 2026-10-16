"use client";

import { SelectField } from "@/components/ui/SelectField";
import { formatClock, parseRange, toRangeValue } from "@/features/support/hours";
import { cn } from "@/lib/cn";

/**
 * Grade do horário de atendimento (2026-10-16): uma LINHA por dia — dia,
 * Aberto/Fechado, abre, fecha —, com o nome das colunas uma vez só no topo.
 * Grava "HH:MM-HH:MM" no extra de cada dia; fechado grava vazio. Ver
 * `support/hours.ts`.
 *
 * Selects e não campo de texto: digitar "9h" ou "09-18" daria um valor que a
 * loja não entende, e o dia sumiria do cabeçalho sem aviso.
 *
 * Atalhos "copiar a segunda": quase toda loja repete o mesmo horário nos dias
 * úteis, e acertar 5 × 2 selects um a um é o tipo de tarefa que gera erro.
 */

const STEP = 30;
const OPEN_DEFAULT = { open: 9 * 60, close: 18 * 60 };

const OPEN_OPTIONS = Array.from({ length: 1440 / STEP }, (_, index) => {
  const minutes = index * STEP;
  return { value: String(minutes), label: formatClock(minutes) };
});
/** Fechar vai até "24:00" (fim do dia). */
const CLOSE_OPTIONS = [...OPEN_OPTIONS.slice(1), { value: "1440", label: "24:00" }];

type DayField = { name: string; label: string };

const ROW = "grid grid-cols-[1fr_auto] items-center gap-x-[12px] gap-y-[10px] md:grid-cols-[110px_130px_130px_130px]";

export function HoursGrid({
  fields,
  values,
  onChange,
}: {
  fields: readonly DayField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  const first = fields[0];
  const firstValue = first ? values[first.name] ?? "" : "";
  const canCopy = first !== undefined && parseRange(firstValue) !== null;

  function copy(targets: readonly DayField[]) {
    targets.forEach((field) => onChange(field.name, firstValue));
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className={cn(ROW, "hidden px-[14px] md:grid")} aria-hidden>
        {["Dia", "Atendimento", "Abre", "Fecha"].map((title) => (
          <span key={title} className="font-poppins text-[11px] font-bold tracking-[0.06em] text-brand-fg-subtle uppercase">
            {title}
          </span>
        ))}
      </div>

      <ul className="flex flex-col overflow-hidden rounded-[16px] border border-white/10">
        {fields.map((field, index) => (
          <HoursRow
            key={field.name}
            label={field.label}
            value={values[field.name] ?? ""}
            onChange={(value) => onChange(field.name, value)}
            striped={index % 2 === 1}
          />
        ))}
      </ul>

      {canCopy ? (
        <div className="flex flex-wrap gap-[8px]">
          <CopyButton onClick={() => copy(fields.slice(1, 5))}>
            Copiar {first.label.toLowerCase()} para os dias úteis
          </CopyButton>
          <CopyButton onClick={() => copy(fields.slice(1))}>Copiar {first.label.toLowerCase()} para todos</CopyButton>
        </div>
      ) : null}
    </div>
  );
}

function HoursRow({
  label,
  value,
  onChange,
  striped,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  striped: boolean;
}) {
  const range = parseRange(value);
  const open = range !== null;

  function setRange(next: { open: number; close: number }) {
    // Abrir depois do fechamento empurra o fechamento para o próximo horário.
    const close = next.close > next.open ? next.close : Math.min(1440, next.open + STEP);
    onChange(toRangeValue({ open: next.open, close }));
  }

  return (
    // O grupo leva o nome do dia: os selects não repetem rótulo na tela.
    <li
      role="group"
      aria-label={label}
      className={cn(ROW, "px-[14px] py-[10px]", striped ? "bg-white/[0.03]" : "bg-black/20")}
    >
      <span className="font-poppins text-[14px] font-bold text-white">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-label={`${label}: ${open ? "aberto" : "fechado"}`}
        onClick={() => onChange(open ? "" : toRangeValue(OPEN_DEFAULT))}
        className="flex items-center gap-[8px] justify-self-end font-poppins text-[12px] font-bold md:justify-self-start"
      >
        <span
          aria-hidden
          className={cn(
            "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors",
            open ? "bg-[#22c55e]" : "bg-white/15",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] size-[16px] rounded-full bg-white transition-[left]",
              open ? "left-[19px]" : "left-[3px]",
            )}
          />
        </span>
        <span className={open ? "text-white" : "text-white/50"}>{open ? "Aberto" : "Fechado"}</span>
      </button>
      {range ? (
        <>
          <SelectField
            label={`${label}: abre`}
            hideLabel
            value={String(range.open)}
            options={OPEN_OPTIONS}
            onValueChange={(next) => setRange({ open: Number(next), close: range.close })}
            className="h-[40px]"
          />
          <SelectField
            label={`${label}: fecha`}
            hideLabel
            value={String(range.close)}
            options={CLOSE_OPTIONS.filter((option) => Number(option.value) > range.open)}
            onValueChange={(next) => setRange({ open: range.open, close: Number(next) })}
            className="h-[40px]"
          />
        </>
      ) : (
        <span className="col-span-2 hidden font-helvetica text-[13px] text-brand-fg-subtle md:block">
          Sem atendimento neste dia
        </span>
      )}
    </li>
  );
}

function CopyButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[34px] rounded-full border border-white/15 px-[14px] font-poppins text-[12px] font-bold text-white/80 transition-colors hover:border-white/30 hover:text-white"
    >
      {children}
    </button>
  );
}
