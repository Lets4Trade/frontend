import { z } from "zod";
import { BLOG_SLUG_RE } from "@/features/blog/query";

/**
 * Validação do formulário de notícia (contrato `.claude/context/blog.md`).
 *
 * Como em todo o painel: aqui é UX (avisar na hora) e a última barreira antes
 * de gastar banda com o backend. Quem decide é o DTO do backend, e os limites
 * são os MESMOS de lá — divergir faria a tela aceitar o que o servidor recusa.
 *
 * Módulo sem `next/headers`: o formulário (client) e a action (server) usam o
 * mesmo schema.
 */

export const TITLE_MIN = 3;
export const TITLE_MAX = 160;
export const EXCERPT_MAX = 400;
export const BODY_MAX = 50_000;
export const SLUG_MAX = 120;

/** Capa: mesmo teto e formatos do upload de jogo/produto. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_COVER_TYPES = "image/png,image/jpeg,image/webp,image/avif";
const COVER_MIME = new Set(ACCEPTED_COVER_TYPES.split(","));

export { BLOG_SLUG_RE };
/** Formato de id (cuid) — ele vai para o CAMINHO da URL do backend. */
export const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

/** Valor do select "sem jogo". O Radix não aceita opção com valor vazio. */
export const NO_GAME = "none";

export const blogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(TITLE_MIN, `O título precisa ter ao menos ${TITLE_MIN} caracteres.`)
    .max(TITLE_MAX, `O título pode ter no máximo ${TITLE_MAX} caracteres.`),
  // Vazio = o backend deriva do título.
  slug: z
    .string()
    .trim()
    .refine((value) => value === "" || BLOG_SLUG_RE.test(value), {
      message: `O link usa só letras minúsculas, números e hífen (até ${SLUG_MAX}).`,
    }),
  excerpt: z
    .string()
    .trim()
    .min(1, "Escreva o resumo da notícia.")
    .max(EXCERPT_MAX, `O resumo pode ter no máximo ${EXCERPT_MAX} caracteres.`),
  body: z.string().max(BODY_MAX, `O texto pode ter no máximo ${BODY_MAX.toLocaleString("pt-BR")} caracteres.`),
  gameId: z.string().trim().refine((value) => value === "" || ID_RE.test(value), {
    message: "Escolha um jogo da lista.",
  }),
  isPublished: z.boolean(),
  // ISO já convertido no NAVEGADOR (o `datetime-local` não tem fuso; convertido
  // no servidor, que roda em UTC, a hora sairia deslocada em 3h).
  publishedAt: z.string().trim().refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
    message: "Data de publicação inválida.",
  }),
});

export type BlogPostValues = z.infer<typeof blogPostSchema>;
export type BlogPostField = keyof BlogPostValues;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** `FormData` do formulário → objeto para o schema. */
export function readBlogForm(form: FormData) {
  const gameId = text(form, "gameId");
  return {
    title: text(form, "title"),
    slug: text(form, "slug"),
    excerpt: text(form, "excerpt"),
    body: text(form, "body").replace(/\r\n?/g, "\n"),
    gameId: gameId === NO_GAME ? "" : gameId,
    isPublished: text(form, "isPublished") === "true",
    publishedAt: text(form, "publishedAt"),
  };
}

/**
 * Data de publicação ↔ `<input type="datetime-local">`, SEMPRE no horário de
 * Brasília (UTC−3, sem horário de verão desde 2019).
 *
 * Fuso fixo, e não o do navegador, por dois motivos: o formulário é
 * renderizado também no servidor (UTC) — com o fuso de cada lado a hidratação
 * divergiria —, e a loja e a equipe são daqui: "publicar às 10h" quer dizer
 * 10h de Brasília, mesmo que o editor esteja viajando.
 */
const BRT_OFFSET = "-03:00";

export function isoToLocalInput(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  // Desloca 3h e lê em UTC: dá a hora de parede de Brasília sem depender de
  // `Intl` nem do fuso da máquina.
  return new Date(time - 3 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function localInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "";
  const time = Date.parse(`${value}:00${BRT_OFFSET}`);
  return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

/** Confere a capa: `null` = ok (ou sem arquivo); texto = motivo da recusa. */
export function coverProblem(file: FormDataEntryValue | null): string | null {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_COVER_BYTES) return "A capa precisa ter no máximo 5 MB.";
  if (!COVER_MIME.has(file.type)) return "A capa precisa ser PNG, JPEG, WebP ou AVIF.";
  return null;
}
