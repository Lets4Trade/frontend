import { describe, expect, it } from "vitest";
import { ADMIN_NAV, ADMIN_NAV_GROUPS, adminNavSections } from "./nav";
import { canAccess, type PanelRole } from "./permissions";

const forRole = (role: PanelRole) => adminNavSections((area) => canAccess(role, area));
const shape = (role: PanelRole) => forRole(role).map((s) => [s.label, s.items.map((i) => i.label)]);

describe("menu do painel em grupos (2026-11-03)", () => {
  it("todo item pertence a um grupo que existe", () => {
    const keys = ADMIN_NAV_GROUPS.map((g) => g.key) as string[];
    for (const item of ADMIN_NAV) expect(keys).toContain(item.group);
  });

  it("ADMIN vê os 4 grupos com os 11 itens", () => {
    expect(shape("ADMIN")).toEqual([
      ["Vendas", ["Vendas e pedidos", "Propostas", "Chats"]],
      ["Catálogo", ["Produtos", "Cupons", "Jogos"]],
      ["Site", ["Páginas", "Blog", "Configurações"]],
      ["Sistema", ["Usuários", "Logs"]],
    ]);
  });

  it("cada cargo só vê o que acessa; grupo vazio some", () => {
    const writer = shape("WRITER");
    expect(writer).toEqual([["Site", ["Blog"]]]);
    for (const role of ["EDITOR", "SUPPORT"] as PanelRole[]) {
      for (const section of forRole(role)) {
        for (const item of section.items) expect(canAccess(role, item.area)).toBe(true);
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });
});
