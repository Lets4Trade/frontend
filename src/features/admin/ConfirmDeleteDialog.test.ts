import { describe, expect, it } from "vitest";
import { blockedProductCount } from "./ConfirmDeleteDialog";

describe("blockedProductCount (apagar tudo, 2026-11-17)", () => {
  it("lê a contagem da recusa de servidor e de categoria", () => {
    expect(
      blockedProductCount(
        "5 produto(s) ainda estão ligados a servidores que você tirou da lista. Mova esses produtos para outro servidor, ou confirme para apagar com os produtos dentro.",
      ),
    ).toBe(5);
    expect(blockedProductCount("1 produto(s) ainda estão ligados a categorias que você tirou da lista.")).toBe(1);
  });

  it("qualquer outro erro não abre a confirmação", () => {
    expect(blockedProductCount("O link já é usado por outro jogo.")).toBeNull();
    expect(blockedProductCount(undefined)).toBeNull();
  });
});
