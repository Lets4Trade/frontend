import Link from "next/link";
import { backendAsset } from "@/lib/publicApi";
import type { Cta, PageLink, PageRefs } from "../types";

/**
 * Peças comuns dos blocos da loja.
 *
 * Os blocos rodam em DOIS lugares: na home (servidor) e na prévia do editor
 * (cliente, dentro do iframe). Por isso nada aqui toca em API de servidor —
 * só recebe dado pronto (`refs`) e desenha.
 */

/** Destino de um link do bloco. `null` = referência que não existe mais. */
export function resolveHref(link: PageLink | undefined, refs: PageRefs): string | null {
  if (!link) return null;
  if (link.kind === "game") {
    const game = refs.games[link.gameId];
    return game ? `/games/${game.slug}` : null;
  }
  if (link.kind === "path") return link.path;
  // `https://` só — o backend já recusa qualquer outro esquema; conferir de
  // novo aqui é a segunda camada, barata, contra `javascript:`.
  return /^https:\/\//.test(link.url) ? link.url : null;
}

export function assetUrl(path: string | undefined): string | null {
  return backendAsset(path ?? null);
}

export function formatPriceCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Título de seção de bloco: mesma tipografia das seções da home. */
export function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-helvetica text-[24px] leading-[28px] font-bold tracking-[0.3px] text-white md:text-[30px] md:leading-[34px]">
      {children}
    </h2>
  );
}

/**
 * Botão de chamada. Link externo abre em outra aba com `noopener` — a página
 * de destino não ganha acesso à nossa via `window.opener`.
 */
export function CtaButton({ cta, refs }: { cta: Cta | undefined; refs: PageRefs }) {
  const href = resolveHref(cta?.link, refs);
  if (!cta || !href) return null;

  const className =
    "inline-flex h-[50px] items-center justify-center rounded-full bg-[image:var(--brand-orange-gradient)] px-[32px] font-poppins text-[14px] font-bold tracking-[0.14px] text-white transition-opacity hover:opacity-90";

  return href.startsWith("https://") ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {cta.label}
    </a>
  ) : (
    <Link href={href} className={className}>
      {cta.label}
    </Link>
  );
}

/** Texto puro com parágrafos separados por linha em branco. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className={className}>
            {paragraph}
          </p>
        ))}
    </>
  );
}
