import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlockLibrary } from "./editor/BlockLibrary";
import { HOME_SHARED_KEYS, HOME_SHARED_LABELS, isHomeSharedKey, usesHomeShared } from "./homeShared";
import { builderPage, type BlocksPageDef } from "./registry";

describe("seções da home prontas", () => {
  it("Fidelidade e Venda oferecem as seções da home; a home não", () => {
    for (const slug of ["fidelidade", "venda"]) {
      const page = builderPage(slug, []) as BlocksPageDef;
      expect(page.sharedKeys).toEqual(HOME_SHARED_KEYS);
      // Fora das seções padrão: só entram quando o admin adiciona.
      expect(page.legacyKeys.some(isHomeSharedKey)).toBe(false);
      expect(page.legacyLabels.homeReviews).toBe("Reviews (da home)");
    }
    expect((builderPage("home", []) as BlocksPageDef).sharedKeys).toBeUndefined();
  });

  it("usesHomeShared só com bloco `secao` de chave da home", () => {
    expect(usesHomeShared([{ type: "secao", props: { key: "homeReviews" } }])).toBe(true);
    expect(usesHomeShared([{ type: "secao", props: { key: "reviews" } }])).toBe(false);
    expect(usesHomeShared([{ type: "reviews", props: { key: "homeReviews" } }])).toBe(false);
  });

  it("a biblioteca lista as da home que faltam e adiciona como bloco `secao`", async () => {
    const onAdd = vi.fn();
    render(
      <BlockLibrary
        blocks={[{ id: "blk_000001", type: "secao", props: { key: "homeVideo" } }]}
        legacyKeys={["resumo"]}
        sharedKeys={HOME_SHARED_KEYS}
        legacyLabels={{ resumo: "Resumo", ...HOME_SHARED_LABELS }}
        onAdd={onAdd}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar seção" }));

    expect(await screen.findByText("Seções da home (prontas)")).toBeTruthy();
    // A que já está na página não aparece de novo.
    expect(screen.queryByText("Vídeo (da home)")).toBeNull();
    fireEvent.click(screen.getByText("Reviews (da home)"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "secao", props: { key: "homeReviews" } }));
  });
});
