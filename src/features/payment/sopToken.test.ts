import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithSession = vi.fn();
vi.mock("@/lib/browserSession", () => ({ fetchWithSession: (...args: unknown[]) => fetchWithSession(...args) }));

/**
 * Silent Order Post (2026-11-27): a regra que protege o número do cartão.
 * Desligado no servidor = a tela segue como antes; LIGADO com falha = a tela
 * PARA, e nunca cai no envio do número.
 */
describe("fetchSopToken", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/api/v1");
    vi.resetModules();
    fetchWithSession.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

  it("módulo desligado no servidor → off", async () => {
    fetchWithSession.mockResolvedValue(json(200, { data: { enabled: false } }));
    const { fetchSopToken } = await import("./api");
    await expect(fetchSopToken("p1")).resolves.toEqual({ status: "off" });
  });

  it("backend ainda sem a rota (404, front no ar antes) → off", async () => {
    fetchWithSession.mockResolvedValue(json(404, {}));
    const { fetchSopToken } = await import("./api");
    await expect(fetchSopToken("p1")).resolves.toEqual({ status: "off" });
  });

  it("ligado e com falha (503) ou rede caída → error", async () => {
    fetchWithSession.mockResolvedValue(json(503, {}));
    const { fetchSopToken } = await import("./api");
    await expect(fetchSopToken("p1")).resolves.toEqual({ status: "error" });
    fetchWithSession.mockRejectedValue(new Error("offline"));
    await expect(fetchSopToken("p1")).resolves.toEqual({ status: "error" });
  });

  it("ligado → token e ambiente", async () => {
    fetchWithSession.mockResolvedValue(
      json(200, { data: { enabled: true, accessToken: "tok", environment: "production" } }),
    );
    const { fetchSopToken } = await import("./api");
    await expect(fetchSopToken("p1")).resolves.toEqual({ status: "ok", accessToken: "tok", environment: "production" });
  });
});
