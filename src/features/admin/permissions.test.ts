import { describe, expect, it } from "vitest";
import { canAccess, isPanelRole, panelHome, type PanelArea } from "./permissions";

const AREAS: PanelArea[] = ["content", "blog", "catalog", "orders", "support", "promotions", "users", "logs"];
const allowed = (role: Parameters<typeof canAccess>[0]) => AREAS.filter((area) => canAccess(role, area));

describe("níveis do painel (2026-10-16)", () => {
  it("ADMIN tudo; EDITOR conteúdo + blog + catálogo; ATENDENTE chat + pedidos", () => {
    expect(allowed("ADMIN")).toEqual(AREAS);
    expect(allowed("EDITOR")).toEqual(["content", "blog", "catalog"]);
    expect(allowed("SUPPORT")).toEqual(["orders", "support"]);
  });

  it("REDATOR (2026-10-28): entra no painel, mas só no blog", () => {
    expect(isPanelRole("WRITER")).toBe(true);
    expect(allowed("WRITER")).toEqual(["blog"]);
  });

  it("cliente, sem sessão e papel desconhecido não entram em nada", () => {
    expect(allowed("USER")).toEqual([]);
    expect(allowed(null)).toEqual([]);
    expect(allowed("ROOT" as never)).toEqual([]);
    expect(isPanelRole("USER")).toBe(false);
  });

  it("cada cargo abre o painel na sua primeira tela", () => {
    expect([panelHome("ADMIN"), panelHome("EDITOR"), panelHome("SUPPORT"), panelHome("WRITER")]).toEqual([
      "/admin/pedidos",
      "/admin/paginas",
      "/admin/chats",
      "/admin/blog",
    ]);
  });
});
