import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { Fragment } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { parseLegalMarkdown, type LegalBlock, type LegalInline } from "./legalMarkdown";

/**
 * Um documento LEGAL — Termos de Uso ou Política de Privacidade.
 *
 * ── De onde vem o texto (2026-11-18) ─────────────────────────────────────
 * Dos ARQUIVOS que o usuário escreveu em `public/docs/` (Markdown simples).
 * Antes era uma lista de cláusulas em "Páginas → Termos e privacidade", com
 * teto de 2.000 caracteres por cláusula, sem subtítulo, lista nem negrito —
 * não cabia o documento de verdade. Trocar o texto agora = trocar o arquivo e
 * publicar o site.
 *
 * Lido no servidor com `join(process.cwd(), …)` (o padrão que o Next rastreia
 * para o build `standalone`; `outputFileTracingIncludes` no `next.config.ts`
 * garante). Em produção fica em memória: o arquivo só muda com um deploy.
 *
 * ── Texto puro, nunca HTML ────────────────────────────────────────────────
 * O Markdown vira DADOS (`legalMarkdown.ts`) e os dados viram elementos React:
 * todo texto é escapado, sem `dangerouslySetInnerHTML`.
 *
 * ── Sem arquivo, a página diz isso ───────────────────────────────────────
 * Não inventamos texto jurídico: faltando o arquivo, um aviso honesto e o
 * caminho de contato.
 */

export type LegalKind = "termos" | "privacidade";

export const LEGAL_DOCS: Record<LegalKind, { file: string; title: string }> = {
  termos: { file: "Termo de Uso.txt", title: "Termos de Uso" },
  privacidade: { file: "Politica de Privacidade.txt", title: "Política de Privacidade" },
};

const cache = new Map<LegalKind, Promise<LegalBlock[] | null>>();

function loadLegalDoc(kind: LegalKind): Promise<LegalBlock[] | null> {
  const read = () =>
    readFile(join(process.cwd(), "public", "docs", LEGAL_DOCS[kind].file), "utf8")
      .then(parseLegalMarkdown)
      .catch(() => null);
  // Em desenvolvimento relê sempre: editar o arquivo aparece ao recarregar.
  if (process.env.NODE_ENV !== "production") return read();
  let pending = cache.get(kind);
  if (!pending) {
    pending = read();
    cache.set(kind, pending);
  }
  return pending;
}

/** Seção numerada ("1. IDENTIFICAÇÃO…") entra no índice; "LETS 4 TRADE LTDA" não. */
function isNumbered(text: string): boolean {
  return /^\d+(\.\d+)*\.?\s/.test(text);
}

export async function LegalDocument({ kind }: { kind: LegalKind }) {
  const blocks = await loadLegalDoc(kind);
  const title = blocks?.find((block) => block.type === "title");
  const body = blocks?.filter((block) => block !== title) ?? [];
  // O que vem antes da 1ª linha (`---`) é a abertura do documento — empresa,
  // data e introdução —, mostrada ANTES do índice; o resto, depois dele.
  const cut = body.findIndex((block) => block.type === "rule");
  const opening = cut > 0 ? body.slice(0, cut) : [];
  const sections = cut > 0 ? body.slice(cut + 1) : body;
  const toc = body.filter(
    (block): block is Extract<LegalBlock, { type: "heading" }> =>
      block.type === "heading" && block.level === 2 && isNumbered(block.text),
  );

  return (
    <div className="flex min-h-[var(--dvh)] flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex-1">
        <article className="mx-auto max-w-[900px] px-4 py-[50px] lg:px-[50px]">
          <h1 className="font-helvetica text-[30px] leading-[36px] font-bold tracking-[0.3px] text-white">
            {title?.type === "title" ? title.text : LEGAL_DOCS[kind].title}
          </h1>

          {blocks && body.length > 0 ? (
            <>
              {opening.map((block, index) => (
                <Block key={`a${index}`} block={block} />
              ))}

              {toc.length > 0 ? (
                <nav
                  aria-label="Índice"
                  className="mt-[30px] rounded-[20px] border border-white/10 bg-brand-surface px-[22px] py-[18px]"
                >
                  <p className="font-poppins text-[12px] font-bold tracking-[0.5px] text-brand-fg-subtle uppercase">
                    Nesta página
                  </p>
                  <ol className="mt-[10px] grid gap-x-[24px] gap-y-[6px] sm:grid-cols-2">
                    {toc.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className="font-poppins text-[13px] leading-[19px] text-brand-fg-muted hover:text-brand-orange"
                        >
                          {sentenceCase(heading.text)}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              <div className="mt-[10px]">
                {sections.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-[35px] rounded-[20px] border border-white/10 bg-brand-surface p-[25px]">
              <p className="font-poppins text-[15px] leading-[26px] text-brand-fg-muted">
                Este documento está sendo preparado e será publicado aqui em breve. Se tiver qualquer dúvida sobre
                como tratamos seus dados ou sobre as regras da loja, fale com a gente pelos canais de{" "}
                <Link href="/venda" className="text-white underline hover:text-brand-orange">
                  atendimento
                </Link>
                .
              </p>
            </div>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "title":
      return null;
    case "heading":
      if (block.level === 2 && !isNumbered(block.text)) {
        // "LETS 4 TRADE LTDA" logo abaixo do título: subtítulo, não seção.
        return (
          <p className="mt-[8px] font-poppins text-[14px] font-bold tracking-[0.6px] text-brand-orange uppercase">
            {block.text}
          </p>
        );
      }
      return block.level === 2 ? (
        <h2
          id={block.id}
          className="mt-[44px] scroll-mt-[110px] font-helvetica text-[20px] leading-[26px] font-bold text-white"
        >
          {block.text}
        </h2>
      ) : (
        <h3
          id={block.id}
          className="mt-[26px] scroll-mt-[110px] font-helvetica text-[17px] leading-[23px] font-bold text-white"
        >
          {block.text}
        </h3>
      );
    case "paragraph":
      return (
        <p className="mt-[14px] font-poppins text-[15px] leading-[26px] text-brand-fg-muted">
          {block.lines.map((line, index) => (
            <Fragment key={index}>
              {index > 0 ? <br /> : null}
              <Inline parts={line} />
            </Fragment>
          ))}
        </p>
      );
    case "list":
      return (
        <ul className="mt-[12px] flex flex-col gap-[8px]">
          {block.items.map((item, index) => (
            <li
              key={index}
              className="relative pl-[20px] font-poppins text-[15px] leading-[24px] text-brand-fg-muted before:absolute before:top-[10px] before:left-[4px] before:size-[6px] before:rounded-full before:bg-brand-orange"
            >
              <Inline parts={item} />
            </li>
          ))}
        </ul>
      );
    case "rule":
      return <hr className="mt-[30px] border-0 border-t border-brand-hairline" />;
  }
}

function Inline({ parts }: { parts: LegalInline[] }) {
  return parts.map((part, index) => {
    const text = part.href ? (
      <a
        key={index}
        href={part.href}
        className="break-all text-brand-orange underline-offset-2 hover:underline"
        {...(part.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {part.text}
      </a>
    ) : (
      part.text
    );
    return part.bold ? (
      <strong key={index} className="font-semibold text-white">
        {text}
      </strong>
    ) : (
      <Fragment key={index}>{text}</Fragment>
    );
  });
}

/** "1. IDENTIFICAÇÃO DA EMPRESA" → "1. Identificação da empresa" (o índice não grita). */
function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase("pt-BR");
  const at = lower.search(/\p{L}/u);
  if (at < 0) return lower;
  return lower.slice(0, at) + lower.charAt(at).toLocaleUpperCase("pt-BR") + lower.slice(at + 1).replace(/\blgpd\b/g, "LGPD").replace(/\bcielo\b/g, "Cielo");
}
