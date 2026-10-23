import { describe, expect, it } from "vitest";
import { buildIndex, search } from "./index";

const games = [{ id: "g1", name: "Path of Exile 2" }];

describe("busca do painel", () => {
  it("“whatsapp” leva direto ao cartão de Atendimento", () => {
    const [first] = search(buildIndex("ADMIN"), "whatsapp");
    expect(first).toMatchObject({ title: "Atendimento", href: "/admin/configuracoes#atendimento" });
  });

  it("ignora acento e maiúscula", () => {
    expect(search(buildIndex("ADMIN"), "RODAPE")[0]).toMatchObject({ title: "Rodapé", where: "Página" });
    expect(search(buildIndex("ADMIN"), "cnpj")[0]?.href).toBe("/admin/configuracoes#empresa");
  });

  it("sessão de cabeçalho/rodapé abre já selecionada", () => {
    const hit = search(buildIndex("ADMIN"), "texto da busca")[0];
    expect(hit?.href).toBe("/admin/paginas?pagina=cabecalho&secao=header-busca");
  });

  it("todas as palavras precisam casar", () => {
    expect(search(buildIndex("ADMIN"), "preços jogo")).toEqual([]);
    expect(search(buildIndex("ADMIN"), "editar preços")[0]?.href).toBe("/admin/produtos/precos");
  });

  it("jogo: ADMIN e EDITOR vão à Central; o atendente não tem jogos", () => {
    expect(search(buildIndex("ADMIN", games), "path")[0]?.href).toBe("/admin/jogos/g1");
    expect(search(buildIndex("EDITOR", games), "path")[0]?.href).toBe("/admin/jogos/g1");
    expect(search(buildIndex("SUPPORT", games), "path")).toEqual([]);
  });

  it("cada cargo vê só a sua área (2026-10-16)", () => {
    const editor = buildIndex("EDITOR");
    expect(editor.some((entry) => entry.href.startsWith("/admin/usuarios"))).toBe(false);
    expect(editor.some((entry) => entry.href.startsWith("/admin/cupons"))).toBe(false);
    expect(editor.some((entry) => entry.href === "/admin/produtos/precos")).toBe(true);
    expect(search(editor, "whatsapp")[0]?.href).toBe("/admin/configuracoes#atendimento");

    const support = buildIndex("SUPPORT");
    // "Propostas" (2026-10-23) é da área de pedidos: o atendente vê.
    expect(support.map((entry) => entry.href).sort()).toEqual(["/admin/chats", "/admin/pedidos", "/admin/propostas"]);
  });

  it("busca vazia sugere o menu e as configurações", () => {
    const empty = search(buildIndex("ADMIN"), "  ");
    expect(empty.length).toBeGreaterThan(0);
    expect(empty.every((entry) => entry.where === "Menu" || entry.where === "Configurações")).toBe(true);
  });

  it("acha pelo texto que a tela mostra, não só pelo nome", () => {
    const index = buildIndex("ADMIN");
    expect(search(index, "canais oficiais")[0]?.href).toBe("/admin/configuracoes#atendimento");
    expect(search(index, "aba do navegador")[0]?.href).toBe("/admin/configuracoes#marca");
    expect(search(index, "níveis e benefícios")[0]?.href).toBe("/admin/paginas?pagina=fidelidade");
    expect(search(index, "colunas de links")[0]?.href).toBe("/admin/paginas?pagina=rodape");
  });
});
