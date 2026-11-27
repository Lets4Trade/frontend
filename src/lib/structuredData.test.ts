// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, breadcrumbJsonLd, organizationJsonLd, serializeJsonLd } from "./structuredData";

describe("dados estruturados (2026-11-27)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("URL absoluta a partir da origem pública do site, sem barra dobrada", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_SITE_URL", "https://www.lets4trade.com.br/");
    expect(absoluteUrl("/diablo-4?aba=itens")).toBe("https://www.lets4trade.com.br/diablo-4?aba=itens");
    expect(absoluteUrl("https://api.lets4trade.com.br/x.webp")).toBe("https://api.lets4trade.com.br/x.webp");
  });

  it("trilha numerada a partir de 1, com URLs absolutas", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_SITE_URL", "https://www.lets4trade.com.br");
    const data = breadcrumbJsonLd([
      { name: "Lets4Trade", path: "/" },
      { name: "Diablo 4", path: "/diablo-4" },
    ]);
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Lets4Trade", item: "https://www.lets4trade.com.br/" },
      { "@type": "ListItem", position: 2, name: "Diablo 4", item: "https://www.lets4trade.com.br/diablo-4" },
    ]);
  });

  it("logo da loja vira URL absoluta", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_SITE_URL", "https://www.lets4trade.com.br");
    expect(organizationJsonLd("/images/lets4trade-logo.png").logo).toBe(
      "https://www.lets4trade.com.br/images/lets4trade-logo.png",
    );
  });

  it("texto do painel com </script> não fecha a tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
