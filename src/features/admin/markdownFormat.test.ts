import { describe, expect, it } from "vitest";
import { applyFormat } from "./markdownFormat";

describe("applyFormat", () => {
  it("negrito envolve a seleção e mantém o trecho selecionado", () => {
    const edit = applyFormat("compre gold aqui", 7, 11, "bold");
    expect(edit.value).toBe("compre **gold** aqui");
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe("gold");
  });

  it("espaço nas pontas fica fora da marcação", () => {
    expect(applyFormat("a gold b", 1, 7, "italic").value).toBe("a *gold* b");
  });

  it("várias linhas: marca cada uma, com o marcador da lista do lado de fora", () => {
    const value = "intro\n- um\n\n- dois";
    expect(applyFormat(value, 0, value.length, "italic").value).toBe("*intro*\n- *um*\n\n- *dois*");
  });

  it("sem seleção insere texto de exemplo selecionado", () => {
    const edit = applyFormat("oi ", 3, 3, "bold");
    expect(edit.value).toBe("oi **negrito**");
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe("negrito");
  });

  it("link usa a seleção como rótulo e o endereço dado", () => {
    expect(applyFormat("veja o blog", 7, 11, "link", "/noticias").value).toBe(
      "veja o [blog](/noticias)",
    );
  });

  it("listas pegam as linhas inteiras e trocam o marcador antigo", () => {
    expect(applyFormat("intro\num\ndois", 7, 10, "ul").value).toBe("intro\n- um\n- dois");
    expect(applyFormat("- um\n- dois", 0, 10, "ol").value).toBe("1. um\n2. dois");
  });
});
