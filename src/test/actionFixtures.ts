/**
 * Peças comuns dos testes de server action.
 *
 * Os `vi.mock` ficam em cada arquivo de teste (o vitest os iça para o topo do
 * módulo, e só funciona no próprio arquivo); aqui só o que se repete nos casos.
 */

/** Um byte acima do teto de 5 MB do backend. */
export function bigImage(name = "grande.png"): File {
  return new File([new Uint8Array(5 * 1024 * 1024 + 1)], name, { type: "image/png" });
}

export function smallImage(name = "arte.png"): File {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });
}

/** Falha como o `serverApi` a devolve. Status 0 = timeout / rede. */
export function apiFail(status: number, message?: string) {
  return {
    ok: false as const,
    status,
    reason: status === 401 ? ("unauthenticated" as const) : ("error" as const),
    ...(message ? { message } : {}),
  };
}

export function apiOk<T>(data: T) {
  return { ok: true as const, data };
}

/** Corpo de um `FormData` como objeto simples, para comparar com `toEqual`. */
export function formEntries(form: FormData): Record<string, string | File> {
  const out: Record<string, string | File> = {};
  form.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
