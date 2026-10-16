import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parseRange, scheduleLines, toRangeValue, type WeekdayKey } from "./hours";
import { attendantsLabel, OFFLINE, parsePresence } from "./presenceTypes";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- stub de teste
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("horário de atendimento (2026-10-16)", () => {
  it("parseRange aceita HH:MM-HH:MM com fim até 24:00 e recusa o resto", () => {
    expect(parseRange("09:00-18:00")).toEqual({ open: 540, close: 1080 });
    expect(parseRange(" 00:00-24:00 ")).toEqual({ open: 0, close: 1440 });
    expect(parseRange("18:00-09:00")).toBeNull();
    expect(parseRange("09:00-09:00")).toBeNull();
    expect(parseRange("24:00-24:30")).toBeNull();
    expect(parseRange("9h-18h")).toBeNull();
    expect(parseRange("")).toBeNull();
    expect(toRangeValue({ open: 570, close: 1440 })).toBe("09:30-24:00");
  });

  it("junta dias seguidos com o mesmo horário e pula os fechados", () => {
    const grid: Partial<Record<WeekdayKey, string>> = {
      seg: "09:00-22:00",
      ter: "09:00-22:00",
      qua: "09:00-22:00",
      qui: "09:00-22:00",
      sex: "09:00-22:00",
      sab: "10:00-18:30",
      dom: "",
    };
    expect(scheduleLines((day) => grid[day])).toEqual([
      { days: "Seg a Sex", hours: "9h às 22h" },
      { days: "Sáb", hours: "10h às 18h30" },
    ]);
  });

  it("dois dias seguidos viram 'e'; dia inválido conta como fechado; nada aberto = vazio", () => {
    const grid: Partial<Record<WeekdayKey, string>> = { sab: "10:00-14:00", dom: "10:00-14:00", qua: "lixo" };
    expect(scheduleLines((day) => grid[day])).toEqual([{ days: "Sáb e Dom", hours: "10h às 14h" }]);
  });

  it("os sete dias iguais viram 'TODOS OS DIAS DAS 09 ÀS 00H' (24:00 = 00)", () => {
    expect(scheduleLines(() => "09:00-24:00")).toEqual([{ days: "TODOS OS DIAS", hours: "DAS 09 ÀS 00H" }]);
    expect(scheduleLines(() => "08:30-18:00")).toEqual([{ days: "TODOS OS DIAS", hours: "DAS 08:30 ÀS 18H" }]);
  });

  it("meia-noite como fim do dia sai 00h nas linhas comuns", () => {
    const grid: Partial<Record<WeekdayKey, string>> = { sex: "18:00-24:00", sab: "10:00-24:00" };
    expect(scheduleLines((day) => grid[day])).toEqual([
      { days: "Sex", hours: "18h às 00h" },
      { days: "Sáb", hours: "10h às 00h" },
    ]);
    expect(scheduleLines(() => undefined)).toEqual([]);
  });
});

describe("presença dos atendentes", () => {
  it("lê a resposta da API saneada; só foto de /uploads", () => {
    expect(
      parsePresence({
        total: 5,
        attendants: [
          { name: " Ana ", avatarUrl: "/uploads/avatars/a.webp?v=17" },
          { name: "Bruno", avatarUrl: "https://evil.com/x.png" },
          { name: "Caio", avatarUrl: "/uploads/../../.env" },
          { name: "", avatarUrl: null },
          "lixo",
        ],
      }),
    ).toEqual({
      online: true,
      total: 5,
      attendants: [
        { name: "Ana", avatarUrl: "/uploads/avatars/a.webp?v=17" },
        { name: "Bruno", avatarUrl: null },
        { name: "Caio", avatarUrl: null },
      ],
    });
  });

  it("formato inesperado ou ninguém = offline", () => {
    expect(parsePresence(null)).toEqual(OFFLINE);
    expect(parsePresence("x")).toEqual(OFFLINE);
    expect(parsePresence({ total: 0, attendants: [] })).toEqual(OFFLINE);
  });

  it("rótulo com os nomes", () => {
    const one = parsePresence({ total: 1, attendants: [{ name: "Ana" }] });
    const two = parsePresence({ total: 2, attendants: [{ name: "Ana" }, { name: "Bia" }] });
    const many = parsePresence({ total: 5, attendants: [{ name: "Ana" }, { name: "Bia" }, { name: "Caio" }] });
    expect([attendantsLabel(one), attendantsLabel(two), attendantsLabel(many)]).toEqual([
      "Ana",
      "Ana e Bia",
      "Ana, Bia e mais 3",
    ]);
  });
});

describe("AttendantStack", () => {
  it("mostra até `max` rostos; com mais gente, o último lugar vira +N; sem foto, a inicial", async () => {
    const { AttendantStack } = await import("./ContactBubble");
    const attendants = [
      { name: "Ana", avatarUrl: "/uploads/avatars/a.webp" },
      { name: "bia", avatarUrl: null },
      { name: "Caio", avatarUrl: null },
    ];
    const { container, rerender } = render(<AttendantStack attendants={attendants} total={5} size={40} max={3} />);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.textContent).toBe("b+3");

    rerender(<AttendantStack attendants={attendants} total={3} size={40} max={3} />);
    expect(container.textContent).toBe("bC");
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/\/uploads\/avatars\/a\.webp$/);
  });
});
