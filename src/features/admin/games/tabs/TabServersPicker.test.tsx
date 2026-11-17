import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTabAction = vi.fn();
const toastError = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/Toasts", () => ({ toastError: (...a: unknown[]) => toastError(...a), toastOk: vi.fn() }));
vi.mock("./actions", () => ({ updateTabAction: (...a: unknown[]) => updateTabAction(...a) }));

import { TabServersPicker } from "./TabServersPicker";

const servers = [
  { id: "sc", label: "Softcore" },
  { id: "hc", label: "Hardcore" },
  { id: "temp", label: "Temporada" },
];

describe("TabServersPicker com servidor escolhido (2026-11-17)", () => {
  beforeEach(() => {
    updateTabAction.mockReset().mockResolvedValue({ ok: true, data: {} });
    toastError.mockReset();
  });

  it("aba em todos: desmarcar um servidor deixa os outros", async () => {
    render(<TabServersPicker gameId="g1" tab={{ id: "t1", label: "BOOSTING", serverIds: [] }} servers={servers} server={servers[1]} />);
    const box = screen.getByRole("checkbox", { name: "Aparece em Hardcore" }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    await vi.waitFor(() => expect(updateTabAction).toHaveBeenCalledWith("g1", "t1", { serverIds: ["sc", "temp"] }));
  });

  it("marcar o que faltava volta a 'todos' (lista vazia)", async () => {
    render(<TabServersPicker gameId="g1" tab={{ id: "t1", label: "X", serverIds: ["sc", "temp"] }} servers={servers} server={servers[1]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Aparece em Hardcore" }));
    await vi.waitFor(() => expect(updateTabAction).toHaveBeenCalledWith("g1", "t1", { serverIds: [] }));
  });

  it("desmarcar o ÚNICO servidor é recusado (aba sumiria de tudo)", () => {
    render(<TabServersPicker gameId="g1" tab={{ id: "t1", label: "X", serverIds: ["temp"] }} servers={servers} server={servers[2]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Aparece em Temporada" }));
    expect(updateTabAction).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });
});
