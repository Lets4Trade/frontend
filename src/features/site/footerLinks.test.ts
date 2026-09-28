import { describe, expect, it } from "vitest";
import { STORE_COLUMN_KEY, withNewsLink } from "./footerLinks";

const home = { id: "1", label: "Home", href: "/" };

describe("withNewsLink", () => {
  it("acrescenta Notícias no fim da coluna LOJA", () => {
    expect(withNewsLink(STORE_COLUMN_KEY, [home]).map((link) => link.href)).toEqual(["/", "/noticias"]);
  });

  it("não duplica quando o admin já cadastrou o link", () => {
    const own = { id: "2", label: "Blog", href: "/noticias/" };
    expect(withNewsLink(STORE_COLUMN_KEY, [own, home])).toEqual([own, home]);
  });

  it("outras colunas ficam como estão", () => {
    expect(withNewsLink("footer-coluna-2", [home])).toEqual([home]);
  });
});
