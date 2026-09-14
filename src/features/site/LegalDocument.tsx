import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSectionItemsFor, getSectionsFor } from "./content";

/**
 * Um documento LEGAL — Termos de Uso ou Política de Privacidade.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * O cadastro diz "ao criar sua conta, você aceita os Termos de Uso e a Política
 * de Privacidade" e linka para `/termos` e `/politica-de-privacidade`. As duas
 * rotas davam 404. O texto é editado em "Edição de sessões → Termos e
 * privacidade", como uma LISTA de cláusulas — ver o catálogo.
 *
 * ── Texto puro, nunca HTML ────────────────────────────────────────────────
 * A cláusula é renderizada como texto, com linha em branco separando
 * parágrafos. Aceitar HTML ou Markdown aqui seria abrir um
 * `dangerouslySetInnerHTML` na página que TODO visitante abre, alimentado por
 * um campo de formulário. O ganho (negrito, lista) não paga esse risco.
 *
 * ── Sem cláusula, a página diz isso ───────────────────────────────────────
 * Não inventamos texto jurídico. Documento vazio mostra um aviso honesto e o
 * caminho de contato, em vez de uma página em branco ou de um modelo genérico
 * que ninguém revisou e que a loja estaria "publicando" sem saber.
 */
export async function LegalDocument({
  sectionKey,
}: {
  /** `termos` ou `privacidade` — a sessão da página `legal`. */
  sectionKey: "termos" | "privacidade";
}) {
  const [section, items] = await Promise.all([
    getSectionsFor("legal"),
    getSectionItemsFor("legal"),
  ]);

  const doc = section(sectionKey);
  const clauses = items(sectionKey);

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex-1">
        <article className="mx-auto max-w-[900px] px-4 py-[50px] lg:px-[50px]">
          <h1 className="font-helvetica text-[30px] leading-[36px] font-bold tracking-[0.3px] text-white">
            {doc.title}
          </h1>

          {doc.footnote ? (
            <p className="mt-[10px] font-poppins text-[14px] text-brand-fg-subtle">
              Última atualização: {doc.footnote}
            </p>
          ) : null}

          <hr className="mt-[25px] border-0 border-t border-brand-hairline" />

          {clauses.length > 0 ? (
            <ol className="mt-[35px] flex flex-col gap-[35px]">
              {clauses.map((clause, index) => (
                <li key={clause.id}>
                  {clause.title ? (
                    <h2 className="font-helvetica text-[20px] leading-[26px] font-bold text-white">
                      {index + 1}. {clause.title}
                    </h2>
                  ) : null}

                  <div className="mt-[12px] flex flex-col gap-[14px]">
                    {toParagraphs(clause.body).map((paragraph, i) => (
                      <p
                        key={i}
                        className="font-poppins text-[15px] leading-[26px] whitespace-pre-line text-brand-fg-muted"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-[35px] rounded-[20px] border border-white/10 bg-brand-surface p-[25px]">
              <p className="font-poppins text-[15px] leading-[26px] text-brand-fg-muted">
                Este documento está sendo preparado e será publicado aqui em
                breve. Se tiver qualquer dúvida sobre como tratamos seus dados
                ou sobre as regras da loja, fale com a gente pelos canais de{" "}
                <Link
                  href="/venda"
                  className="text-white underline hover:text-brand-orange"
                >
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

/** Linha em branco separa parágrafos; quebra simples continua dentro dele. */
function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** O título da aba do navegador, lido da mesma sessão que a página desenha. */
export async function legalTitle(sectionKey: "termos" | "privacidade") {
  const section = await getSectionsFor("legal");
  return `${section(sectionKey).title} | Lets4Trade`;
}
