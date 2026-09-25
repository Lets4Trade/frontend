// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `serverApi` lê `NEXT_PUBLIC_API_URL` na CARGA do módulo, então cada teste
 * importa uma cópia nova depois de fixar o ambiente.
 */

let cookieHeader = "pt_at_client=abc";
vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => cookieHeader }),
}));

const fetchMock = vi.fn();

async function load(apiUrl = "https://api.example/api/v1/") {
  vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl);
  vi.stubEnv("INTERNAL_API_KEY", "chave-interna");
  vi.resetModules();
  return import("./serverApi");
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** `fetch` que só termina quando abortado — simula backend pendurado. */
function hangUntilAborted() {
  fetchMock.mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
  );
}

beforeEach(() => {
  cookieHeader = "pt_at_client=abc";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("serverApi — pré-condições", () => {
  it("sem cookie → 401 unauthenticated, sem gastar o round-trip", async () => {
    cookieHeader = "";
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({ ok: false, status: 401, reason: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sem API configurada → erro, sem fetch", async () => {
    const { apiGet } = await load("");
    expect(await apiGet("/x")).toEqual({ ok: false, status: 0, reason: "error" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("serverApi — montagem da requisição", () => {
  it("JSON: URL sem barra dupla, cookie reencaminhado, superfície, chave interna, no-store", async () => {
    fetchMock.mockResolvedValue(json(200, { data: { id: 1 } }));
    const { apiPost } = await load();

    expect(await apiPost("/admin/x", { a: 1 })).toEqual({ ok: true, data: { id: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example/api/v1/admin/x");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      cookie: "pt_at_client=abc",
      "x-pt-surface": "client",
      "x-internal-key": "chave-interna",
      accept: "application/json",
      "content-type": "application/json",
    });
  });

  it.each(["apiPostFormData", "apiPutFormData", "apiPatchFormData"] as const)(
    "%s NÃO declara content-type (o fetch gera o boundary)",
    async (fn) => {
      fetchMock.mockResolvedValue(json(200, { data: { ok: 1 } }));
      const api = await load();
      const form = new FormData();
      form.set("name", "x");

      await api[fn]("/admin/y", form);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.body).toBe(form);
      const names = Object.keys(init.headers).map((h) => h.toLowerCase());
      expect(names).not.toContain("content-type");
    },
  );

  it.each([
    ["apiGet", "GET"],
    ["apiDelete", "DELETE"],
  ] as const)("%s usa o verbo %s sem corpo", async (fn, method) => {
    fetchMock.mockResolvedValue(json(200, { data: [] }));
    const api = await load();
    await api[fn]("/z");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe(method);
    expect(init.body).toBeUndefined();
  });

  it.each([
    ["apiPut", "PUT"],
    ["apiPatch", "PATCH"],
  ] as const)("%s usa o verbo %s com JSON", async (fn, method) => {
    fetchMock.mockResolvedValue(json(200, { data: {} }));
    const api = await load();
    await api[fn]("/z", { b: 2 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe(method);
    expect(init.headers["content-type"]).toBe("application/json");
  });
});

describe("serverApi — timeouts", () => {
  it("JSON aborta em 4 s → status 0", async () => {
    vi.useFakeTimers();
    hangUntilAborted();
    const { apiGet } = await load();

    const pending = apiGet("/lento");
    await vi.advanceTimersByTimeAsync(4000);
    expect(await pending).toEqual({ ok: false, status: 0, reason: "error" });
  });

  it("upload (FormData) ainda está vivo em 4 s e só aborta em 30 s", async () => {
    vi.useFakeTimers();
    hangUntilAborted();
    const { apiPostFormData } = await load();

    let settled = false;
    const pending = apiPostFormData("/upload", new FormData()).then((r) => {
      settled = true;
      return r;
    });

    await vi.advanceTimersByTimeAsync(4000);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(26_000);
    expect(await pending).toEqual({ ok: false, status: 0, reason: "error" });
  });

  it("erro de rede → status 0, sem lançar", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({ ok: false, status: 0, reason: "error" });
  });
});

describe("serverApi — mapeamento de respostas", () => {
  it("401 → unauthenticated", async () => {
    fetchMock.mockResolvedValue(json(401, { message: "Unauthorized" }));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({
      ok: false,
      status: 401,
      reason: "unauthenticated",
      message: "Unauthorized",
    });
  });

  it.each([400, 403, 404, 409, 500])("%i → error com o status e a mensagem", async (status) => {
    fetchMock.mockResolvedValue(json(status, { message: "Motivo" }));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({ ok: false, status, reason: "error", message: "Motivo" });
  });

  it("message em ARRAY (class-validator) → primeira string", async () => {
    fetchMock.mockResolvedValue(json(400, { message: [42, "nome curto", "outro"] }));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toMatchObject({ message: "nome curto" });
  });

  it("mensagem enorme é cortada em 300 caracteres", async () => {
    fetchMock.mockResolvedValue(json(400, { message: "x".repeat(1000) }));
    const { apiGet } = await load();
    const result = await apiGet("/x");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toHaveLength(300);
  });

  it("corpo de erro que não é JSON (HTML de proxy) → sem mensagem", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({
      ok: false,
      status: 502,
      reason: "error",
      message: undefined,
    });
  });

  it("200 sem `data` no envelope → error (fail secure)", async () => {
    fetchMock.mockResolvedValue(json(200, { success: true }));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({ ok: false, status: 200, reason: "error" });
  });

  it("200 com corpo inválido → error, sem lançar", async () => {
    fetchMock.mockResolvedValue(new Response("não é json", { status: 200 }));
    const { apiGet } = await load();
    expect(await apiGet("/x")).toEqual({ ok: false, status: 0, reason: "error" });
  });
});
