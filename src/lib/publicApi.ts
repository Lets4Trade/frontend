import { internalHeaders } from "./internalKey";

/**
 * Leitura PÚBLICA do backend a partir do servidor.
 *
 * Irmã do `serverApi.ts`, e separada dele de propósito: aquele reencaminha os
 * cookies da requisição e RECUSA a chamada quando não há nenhum — é o caminho
 * do painel e da conta, onde não haver sessão é o fim da linha. A vitrine é o
 * oposto: ela existe para quem ainda não tem conta, e mandar o cookie de sessão
 * numa leitura que não depende dele é vazar credencial sem ganho nenhum.
 *
 * Duas consequências de não mandar cookie, e as duas são desejáveis:
 *   - a resposta é a MESMA para todo mundo, então ela pode ser cacheada mais
 *     tarde sem risco de servir o conteúdo de uma pessoa a outra;
 *   - o backend não precisa de guard nesta rota (ver `StorefrontController`).
 *
 * FAIL SECURE como o irmão: qualquer imprevisto vira `null`. Quem chama decide
 * entre 404 e tela vazia; o que não acontece é a página inventar catálogo.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * Teto por requisição. Sem ele um backend pendurado seguraria a renderização
 * inteira — o `fetch` do Node não tem timeout padrão, e esta é a chamada que
 * fica no caminho crítico da página mais visitada da loja.
 */
const TIMEOUT_MS = 4000;

/**
 * `/uploads/games/x.webp` → URL absoluta no BACKEND.
 *
 * A arte é servida pelo Nest (`app.use('/uploads', express.static(...))` no
 * `main.ts`), não pelo Next: um caminho relativo cairia em `localhost:3000` e
 * daria 404. O host sai do mesmo `NEXT_PUBLIC_API_URL` de todo o resto, com o
 * `/api/v1` retirado — `/uploads` fica fora do prefixo da API.
 *
 * É a mesma conversão que `features/admin/products/catalog.ts` faz para o
 * painel. Estão duplicadas porque aquela vive num módulo que o NAVEGADOR
 * importa (o card do painel é client component) e esta num módulo de servidor;
 * juntá-las arrastaria um dos dois para o lado errado da fronteira.
 */
export function backendAsset(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const origin = API_URL.replace(/\/api\/v\d+$/, "");
  return `${origin}${path}`;
}

/**
 * GET público que devolve o `data` do envelope do backend
 * (`{ data, message, success }`), ou `null` em qualquer outro desfecho.
 *
 * `cache: "no-store"` por enquanto: o catálogo muda a cada mexida do admin no
 * painel, e servir preço velho é o único erro que esta página não pode cometer.
 * Quando o catálogo estabilizar, o caminho é um `revalidate` curto com
 * invalidação por tag na escrita do painel — não um TTL cego.
 */
export async function publicApiGet<T>(
  path: string,
  options?: {
    /**
     * Segundos de cache para uma leitura que PODE ser cacheada.
     *
     * A ausência mantém o `no-store` do catálogo. Só passe um valor para
     * resposta idêntica a todo visitante e que não seja preço — hoje só a
     * tabela de níveis da fidelidade, que muda em deploy.
     */
    revalidate?: number;
    /**
     * Etiquetas do cache do Next, para a escrita do painel derrubar esta
     * resposta na hora (`revalidateTag`).
     *
     * É o que torna um `revalidate` longo aceitável em conteúdo editável: sem
     * elas, um TTL de uma hora significaria "o admin salva e espera até uma
     * hora para ver". Só tem efeito junto de `revalidate`.
     */
    tags?: string[];
  },
): Promise<T | null> {
  if (API_URL === "") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: { accept: "application/json", ...internalHeaders() },
      ...(options?.revalidate
        ? {
            next: {
              revalidate: options.revalidate,
              ...(options.tags?.length ? { tags: options.tags } : {}),
            },
          }
        : { cache: "no-store" as const }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    const data =
      typeof body === "object" && body !== null
        ? ((body as { data?: unknown }).data ?? null)
        : null;

    return data as T | null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
