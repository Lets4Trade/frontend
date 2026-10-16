import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_SLUG, gameHref, gameSlugFromHref, isReservedGameSlug, RESERVED_GAME_SLUGS } from "./href";

/** Página do jogo na raiz (2026-10-16): `/diablo`, não mais `/games/diablo`. */

describe("gameHref", () => {
  it("monta o link na raiz, com ou sem query", () => {
    expect(gameHref("path-of-exile-2")).toBe("/path-of-exile-2");
    expect(gameHref("diablo", "aba=boosting")).toBe("/diablo?aba=boosting");
    expect(gameHref("diablo", "?aba=boosting")).toBe("/diablo?aba=boosting");
    expect(gameHref("diablo", new URLSearchParams({ aba: "gold", servidor: "hc" }))).toBe("/diablo?aba=gold&servidor=hc");
    expect(gameHref("diablo", "")).toBe("/diablo");
    expect(gameHref("diablo", null)).toBe("/diablo");
  });
});

describe("gameSlugFromHref", () => {
  it("lê o link novo e o ANTIGO (gravado no banco antes da mudança)", () => {
    expect(gameSlugFromHref("/diablo")).toBe("diablo");
    expect(gameSlugFromHref("/games/diablo")).toBe("diablo");
    expect(gameSlugFromHref("/games/path-of-exile-2?aba=boosting#pacote")).toBe("path-of-exile-2");
  });

  it("página do site e outros caminhos não são jogo", () => {
    expect(gameSlugFromHref("/blog")).toBeNull();
    expect(gameSlugFromHref("/admin")).toBeNull();
    expect(gameSlugFromHref("/blog/um-post")).toBeNull();
    expect(gameSlugFromHref("https://outro.site/diablo")).toBeNull();
  });
});

describe("nomes reservados", () => {
  it("TODA pasta de rota de src/app está reservada (página nova = nome novo na lista)", () => {
    const appDir = join(process.cwd(), "src", "app");
    const routes = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("[") && !entry.name.startsWith("("))
      .map((entry) => entry.name);
    expect(routes.length).toBeGreaterThan(5);
    for (const route of routes) expect(isReservedGameSlug(route), `/${route} precisa estar reservado`).toBe(true);
  });

  it("toda entrada da lista está no formato de slug", () => {
    for (const slug of RESERVED_GAME_SLUGS) expect(GAME_SLUG.test(slug)).toBe(true);
  });

  it("formato aceito na raiz", () => {
    for (const ok of ["diablo", "path-of-exile-2", "a", "x1"]) expect(GAME_SLUG.test(ok)).toBe(true);
    for (const bad of ["", "-diablo", "diablo-", "Diablo", "wp-admin.php", "a/b", "a".repeat(81)]) {
      expect(GAME_SLUG.test(bad)).toBe(false);
    }
  });
});
