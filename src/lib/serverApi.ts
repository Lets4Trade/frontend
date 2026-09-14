import { cookies } from "next/headers";
import { internalHeaders } from "./internalKey";

/**
 * Leitura autenticada do backend a partir do SERVIDOR.
 *
 * A lógica é a mesma que `features/auth/session.ts` já usava para o cabeçalho,
 * extraída quando o painel do usuário passou a precisar dela: reencaminhar os
 * cookies da requisição, declarar a superfície, nunca cachear e ter teto de
 * tempo. Repetir isso em cada leitura seria repetir também os erros.
 *
 * POR QUE NO SERVIDOR, e não `fetch` no cliente: o token vive num cookie
 * `httpOnly` e o JS da página não o enxerga. Buscar no servidor mantém a
 * sessão fora do alcance de qualquer XSS e entrega a página já preenchida, sem
 * o piscar de "carregando" em cima de dados que o usuário já tem direito de ver.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** A loja é sempre `client`; o backend isola os cookies por superfície. */
const SURFACE = "client";

/**
 * Teto por requisição. Sem ele um backend pendurado seguraria a renderização
 * inteira — o `fetch` do Node não tem timeout padrão.
 */
const TIMEOUT_MS = 4000;

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      reason: "unauthenticated" | "error";
      /**
       * A mensagem que o BACKEND escreveu, quando ele escreveu uma.
       *
       * Existe porque algumas recusas só são acionáveis com o texto original:
       * "120 produtos ainda estão ligados a servidores que você tirou da lista"
       * diz o que fazer, e um "não foi possível salvar" genérico não diz nada.
       *
       * Quem exibe decide se confia: é texto vindo de outro serviço, então vai
       * para a tela como TEXTO (nunca como HTML), e só em telas administrativas.
       */
      message?: string;
    };

/**
 * POST autenticado a partir do servidor. Mesmas regras do `apiGet`.
 *
 * Existe para as escritas que o NAVEGADOR não pode fazer sozinho com segurança
 * — hoje o fechamento do carrinho, onde o preço é recalculado no servidor a
 * partir do catálogo antes de virar pedido. Se o `fetch` saísse da página, o
 * valor sairia junto com ele.
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/**
 * POST `multipart/form-data` — o corpo que carrega ARQUIVO junto dos campos.
 * Hoje: o cadastro de jogo do painel, que manda a arte com o formulário.
 *
 * O `content-type` NÃO é declarado aqui de propósito. Multipart precisa de um
 * `boundary` no header, e quem o conhece é o `fetch`, que o gera a partir do
 * próprio `FormData`. Escrever o header à mão apaga o boundary e o servidor
 * recebe um corpo que não consegue separar em campos.
 */
export async function apiPostFormData<T>(
  path: string,
  form: FormData,
): Promise<ApiResult<T>> {
  return request<T>(path, { method: "POST", body: form });
}

/**
 * PUT com corpo JSON — substituição do recurso inteiro.
 *
 * Existe para o "SALVAR E PUBLICAR PAGE" do builder: o corpo dali é o estado
 * COMPLETO da página, e não um remendo. `PATCH` diria "mude só estes campos",
 * que é o oposto do que aquele botão faz.
 */
export async function apiPut<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

/** Mesmo caso do `apiPostFormData`, para substituição com arquivo. */
export async function apiPutFormData<T>(
  path: string,
  form: FormData,
): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PUT", body: form });
}

/** PATCH com corpo JSON — edição parcial sem arquivo. */
export async function apiPatch<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

/** Mesmo caso do `apiPostFormData`, para edição parcial. */
export async function apiPatchFormData<T>(
  path: string,
  form: FormData,
): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PATCH", body: form });
}

/**
 * DELETE autenticado. Usado hoje pela lixeira do card de produto — que no
 * backend DESATIVA em vez de apagar, mas o verbo continua sendo o certo do
 * ponto de vista de quem chama: o recurso deixa de existir para a aplicação.
 */
export async function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "DELETE" });
}

/**
 * Faz um GET autenticado e devolve o `data` do envelope do backend
 * (`{ data, message, success }`).
 *
 * FAIL SECURE: qualquer imprevisto — sem API, sem cookie, timeout, corpo
 * inesperado — vira `ok: false`. Quem chama decide entre redirecionar para o
 * login e mostrar a tela vazia; o que não acontece é inventar conteúdo.
 */
export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET" });
}

/**
 * Lê o `message` do corpo de erro do backend, se houver um legível.
 *
 * Tudo aqui é defensivo de propósito: o corpo pode não ser JSON (um proxy no
 * meio do caminho devolve HTML), pode não ter `message`, e o `message` do
 * class-validator às vezes é um ARRAY de problemas. Qualquer coisa fora do
 * esperado vira `undefined`, e quem exibe cai no texto genérico.
 *
 * O teto de 300 caracteres é para uma mensagem enorme não virar um parágrafo na
 * tela — e para o corpo de erro não ser um jeito de despejar texto no painel.
 */
async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;

    const raw = (body as { message?: unknown }).message;
    const text = Array.isArray(raw) ? raw.filter((v) => typeof v === "string")[0] : raw;

    if (typeof text !== "string" || text.trim() === "") return undefined;
    return text.trim().slice(0, 300);
  } catch {
    return undefined;
  }
}

async function request<T>(
  path: string,
  init: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: string | FormData;
  },
): Promise<ApiResult<T>> {
  if (API_URL === "") return { ok: false, status: 0, reason: "error" };

  const jar = await cookies();
  const cookieHeader = jar.toString();
  // Sem cookie não há o que autenticar: poupa um round-trip que terminaria 401.
  if (cookieHeader === "") {
    return { ok: false, status: 401, reason: "unauthenticated" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: init.method,
      body: init.body,
      headers: {
        cookie: cookieHeader,
        "x-pt-surface": SURFACE,
        ...internalHeaders(),
        accept: "application/json",
        // Só o corpo JSON declara o tipo. Com `FormData`, o `fetch` monta o
        // `content-type` sozinho — junto do boundary, que é o que separa os
        // campos e não temos como escrever aqui.
        ...(typeof init.body === "string"
          ? { "content-type": "application/json" }
          : {}),
      },
      // Resposta por conta: nunca pode entrar em cache compartilhado, senão o
      // painel de uma pessoa seria servido a outra.
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: response.status === 401 ? "unauthenticated" : "error",
        message: await readErrorMessage(response),
      };
    }

    const body: unknown = await response.json();
    const data =
      typeof body === "object" && body !== null
        ? ((body as { data?: unknown }).data ?? null)
        : null;

    if (data === null) return { ok: false, status: response.status, reason: "error" };
    return { ok: true, data: data as T };
  } catch {
    // Não registramos o erro com o objeto da requisição junto: ele carrega o
    // cookie de sessão no header.
    return { ok: false, status: 0, reason: "error" };
  } finally {
    clearTimeout(timer);
  }
}
