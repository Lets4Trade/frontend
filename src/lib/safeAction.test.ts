import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTION_FAILED_UPLOAD_MESSAGE, runAction } from "./safeAction";

type Result = { ok: true; value: number } | { ok: false; message: string };

describe("runAction", () => {
  afterEach(() => vi.restoreAllMocks());

  it("devolve o resultado da action quando ela responde", async () => {
    const result = await runAction<Result>(async () => ({ ok: true, value: 42 }), {
      ok: false,
      message: "x",
    });
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("devolve a recusa da própria action sem trocar pelo fallback", async () => {
    const result = await runAction<Result>(async () => ({ ok: false, message: "do servidor" }), {
      ok: false,
      message: "fallback",
    });
    expect(result).toEqual({ ok: false, message: "do servidor" });
  });

  it.each([
    ["corpo acima do limite", new Error("Body exceeded 11mb limit")],
    ["rede caiu", new TypeError("Failed to fetch")],
    ["id de action invalidado por deploy", new Error("Failed to find Server Action")],
    ["rejeição que nem é Error", "string solta"],
  ])("devolve o fallback quando a action lança (%s)", async (_label, thrown) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runAction<Result>(
      async () => {
        throw thrown;
      },
      { ok: false, message: ACTION_FAILED_UPLOAD_MESSAGE },
    );
    expect(result).toEqual({ ok: false, message: ACTION_FAILED_UPLOAD_MESSAGE });
  });

  it("captura também a exceção síncrona de quem monta a chamada", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runAction<Result>(
      () => {
        throw new Error("antes da promise");
      },
      { ok: false, message: "fallback" },
    );
    expect(result).toEqual({ ok: false, message: "fallback" });
  });

  it("registra só o NOME do erro, nunca a mensagem nem o objeto", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const secret = new TypeError("token=abc123 senha=hunter2");

    await runAction<Result>(
      async () => {
        throw secret;
      },
      { ok: false, message: "fallback" },
    );

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls[0];
    expect(logged).not.toContain(secret);
    expect(JSON.stringify(logged)).not.toContain("hunter2");
    expect(logged).toContain("TypeError");
  });
});
