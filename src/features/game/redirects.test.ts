// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("@/lib/publicApi", () => ({ publicApiGet: (...args: unknown[]) => get(...args) }));

import { findGameRedirect, tabAliasRedirect } from "./redirects";

describe("redirect de endereço antigo (2026-11-27)", () => {
  beforeEach(() => get.mockReset());

  it("leva ao jogo e à aba de HOJE, com a query de quem chegou", async () => {
    get.mockResolvedValue({ gameSlug: "diablo-4", tabSlug: "itens" });
    await expect(findGameRedirect("diablo4itens", { utm_source: "ads", aba: "velha" })).resolves.toBe(
      "/diablo-4?utm_source=ads&aba=itens",
    );
    expect(get).toHaveBeenCalledWith("/game-redirects/diablo4itens");
  });

  it("sem aba = aba padrão", async () => {
    get.mockResolvedValue({ gameSlug: "path-of-exile" });
    await expect(findGameRedirect("currencypoe", {})).resolves.toBe("/path-of-exile");
  });

  it("sem redirect, ou resposta fora do formato, é 404", async () => {
    get.mockResolvedValue(null);
    await expect(findGameRedirect("qualquer", {})).resolves.toBeNull();
    get.mockResolvedValue({ gameSlug: "//evil.com" });
    await expect(findGameRedirect("x", {})).resolves.toBeNull();
    get.mockResolvedValue({ gameSlug: "x" });
    await expect(findGameRedirect("x", {})).resolves.toBeNull();
  });

  it("formato fora do slug nem vai à API", async () => {
    await expect(findGameRedirect("wp-admin.php", {})).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});

describe("?aba= de aba renomeada (2026-11-27)", () => {
  const aliases = { moedas: "currencys" };

  it("troca só a aba, mantendo o resto da query", () => {
    expect(tabAliasRedirect("path-of-exile", aliases, { aba: "moedas", servidor: "standard" })).toBe(
      "/path-of-exile?aba=currencys&servidor=standard",
    );
  });

  it("aba atual, ausente ou desconhecida não redireciona", () => {
    expect(tabAliasRedirect("path-of-exile", aliases, { aba: "currencys" })).toBeNull();
    expect(tabAliasRedirect("path-of-exile", aliases, {})).toBeNull();
    expect(tabAliasRedirect("path-of-exile", undefined, { aba: "moedas" })).toBeNull();
    expect(tabAliasRedirect("path-of-exile", aliases, { aba: "constructor" })).toBeNull();
  });
});
