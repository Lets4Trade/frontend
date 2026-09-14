/**
 * Cabeçalho que identifica a chamada como vinda do SERVIDOR do Next.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * Toda leitura que o Next faz no servidor (SSR, server actions) sai do mesmo
 * endereço. Para o backend, mil visitantes na loja parecem um cliente fazendo
 * mil requisições — e o rate limit por IP devolveria 429 com poucos visitantes
 * simultâneos. Com esta chave, o backend tira essas chamadas do limite POR IP
 * (e só dele: autenticação e autorização continuam valendo). Ver
 * `backend/src/common/security/internal-request.ts`.
 *
 * ── Por que não vaza para o navegador ─────────────────────────────────────
 * `INTERNAL_API_KEY` NÃO tem o prefixo `NEXT_PUBLIC_`: o Next só embute no
 * bundle do cliente as variáveis com esse prefixo. Mesmo que este módulo seja
 * importado por um caminho que chega a um client component, no navegador o
 * valor é `undefined` e o cabeçalho simplesmente não é enviado.
 *
 * Sem a variável (dev local sem configurar), nada é enviado e o backend trata a
 * chamada como qualquer outra — fail closed dos dois lados.
 */
export function internalHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY;
  return key ? { "x-internal-key": key } : {};
}
