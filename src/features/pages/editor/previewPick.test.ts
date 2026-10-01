// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { builderPage } from "../registry";
import { installPreviewPicker, resolvePick } from "./previewPick";

const header = builderPage("cabecalho", [])!;
if (header.kind !== "content") throw new Error("cabecalho deveria ser página de conteúdo");

describe("resolvePick", () => {
  it("sessão da página aberta: seleciona", () => {
    expect(resolvePick("layout:header-busca", header)).toEqual({ kind: "select", suffix: "header-busca" });
  });

  it("dado da loja: vai para Configurações", () => {
    expect(resolvePick("layout:marca", header)).toEqual({ kind: "go", href: "/admin/configuracoes#marca" });
  });

  it("sessão de outra página: abre a página dela já na sessão", () => {
    expect(resolvePick("layout:footer-sobre", header)).toEqual({
      kind: "go",
      href: "/admin/paginas?pagina=rodape&secao=footer-sobre",
    });
  });

  it("chave desconhecida não leva a lugar nenhum", () => {
    expect(resolvePick("layout:nao-existe", header)).toBeNull();
    expect(resolvePick("sem-separador", header)).toBeNull();
  });
});

describe("installPreviewPicker", () => {
  it("clique num pedaço marcado escolhe a sessão e não navega", () => {
    document.body.innerHTML = `<a href="/x" data-admin-section="layout:header-busca"><span id="dentro">busca</span></a><a id="solto" href="/y">y</a>`;
    const onPick = vi.fn();
    const cleanup = installPreviewPicker(document, { onPick, selected: "layout:header-busca" });

    const inner = new MouseEvent("click", { bubbles: true, cancelable: true });
    document.getElementById("dentro")!.dispatchEvent(inner);
    expect(onPick).toHaveBeenCalledWith("layout:header-busca");
    expect(inner.defaultPrevented).toBe(true);

    const loose = new MouseEvent("click", { bubbles: true, cancelable: true });
    document.getElementById("solto")!.dispatchEvent(loose);
    expect(loose.defaultPrevented).toBe(true);
    expect(onPick).toHaveBeenCalledTimes(1);

    expect(document.querySelector("[data-admin-selected]")?.getAttribute("data-admin-section")).toBe("layout:header-busca");
    cleanup();
  });
});
