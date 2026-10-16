/**
 * Horário de atendimento (2026-10-16) — grade por dia da semana, editada em
 * Configurações da loja → Atendimento (sessão `layout:horario`).
 *
 * Cada dia é um texto EXTRA da sessão (`seg`…`dom`) com `"HH:MM-HH:MM"`; vazio
 * = fechado. Sem migration e sem tabela: a sessão já é cacheada com o layout
 * (o cabeçalho não paga ida ao backend), e o backend já guarda e valida extras.
 * A loja relê o formato aqui e ignora o que não casar — dia inválido = fechado.
 *
 * O horário é INFORMATIVO (o cliente sabe quando costuma ter gente). O
 * online/offline vem dos atendentes, não daqui — escolha do usuário.
 */

export const WEEKDAYS = [
  { key: "seg", short: "Seg", long: "Segunda" },
  { key: "ter", short: "Ter", long: "Terça" },
  { key: "qua", short: "Qua", long: "Quarta" },
  { key: "qui", short: "Qui", long: "Quinta" },
  { key: "sex", short: "Sex", long: "Sexta" },
  { key: "sab", short: "Sáb", long: "Sábado" },
  { key: "dom", short: "Dom", long: "Domingo" },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];

/** Minutos desde 00:00. `close` pode ser 1440 ("24:00" = até o fim do dia). */
export type DayRange = { open: number; close: number };

const RANGE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-4]):([0-5]\d)$/;

export function parseRange(value: string | undefined | null): DayRange | null {
  const match = RANGE.exec((value ?? "").trim());
  if (!match) return null;
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  if (close > 1440 || close <= open) return null;
  return { open, close };
}

export function formatClock(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function toRangeValue(range: DayRange): string {
  return `${formatClock(range.open)}-${formatClock(range.close)}`;
}

/**
 * "9h", "9h30". Meia-noite como fim do dia (24:00) sai "00h" — pedido do
 * usuário (2026-10-16): "24h" lê como erro para o cliente.
 */
function short(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const hour = h === 0 ? "00" : String(h);
  return m === 0 ? `${hour}h` : `${hour}h${String(m).padStart(2, "0")}`;
}

/** "09", "09:30", "00" — o formato da linha "TODOS OS DIAS DAS 09 ÀS 00H". */
function twoDigits(minutes: number): string {
  const h = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
  const m = minutes % 60;
  return m === 0 ? h : `${h}:${String(m).padStart(2, "0")}`;
}

export type ScheduleLine = { days: string; hours: string };

/**
 * A grade em linhas curtas, juntando dias SEGUIDOS com o mesmo horário:
 * "Seg a Sex · 9h às 22h", "Sáb · 10h às 18h". Dia fechado não aparece.
 * Nenhum dia aberto = lista vazia (a loja não mostra horário nenhum).
 *
 * Os SETE dias com o mesmo horário viram uma linha só (pedido do usuário,
 * 2026-10-16): "TODOS OS DIAS" · "DAS 09 ÀS 00H".
 */
export function scheduleLines(read: (key: WeekdayKey) => string | undefined): ScheduleLine[] {
  const ranges = WEEKDAYS.map((day) => ({ day, range: parseRange(read(day.key)) }));
  const first = ranges[0].range;
  if (first && ranges.every(({ range }) => range?.open === first.open && range?.close === first.close)) {
    return [{ days: "TODOS OS DIAS", hours: `DAS ${twoDigits(first.open)} ÀS ${twoDigits(first.close)}H` }];
  }
  const lines: ScheduleLine[] = [];
  let index = 0;
  while (index < ranges.length) {
    const { day, range } = ranges[index];
    if (!range) {
      index += 1;
      continue;
    }
    let end = index;
    while (
      end + 1 < ranges.length &&
      ranges[end + 1].range?.open === range.open &&
      ranges[end + 1].range?.close === range.close
    ) {
      end += 1;
    }
    const last = ranges[end].day;
    const days =
      end === index ? day.short : end === index + 1 ? `${day.short} e ${last.short}` : `${day.short} a ${last.short}`;
    lines.push({ days, hours: `${short(range.open)} às ${short(range.close)}` });
    index = end + 1;
  }
  return lines;
}
