import { BLOG_CARD } from "@/features/home/guides";

/**
 * Nomes e campos de painel do card "VISITAR BLOG" (ver `features/home/blogCard.ts`).
 *
 * Arquivo à parte e SEM dependências pesadas: o catálogo `sections.ts` o
 * importa e vai para o bundle do painel — `blogCard.ts` puxa a validação de
 * links da vitrine, que traz o cálculo de preço junto.
 */
export const BLOG_CARD_EXTRA = {
  title: "blog-titulo",
  subtitle: "blog-texto",
  href: "blog-link",
} as const;

/** Um texto extra da sessão com campo próprio no formulário. */
export type SectionExtraField = {
  /** Nome no JSON `extras` (minúsculas, números e hífen — regra do backend). */
  name: string;
  label: string;
  /** O que a loja mostra com o campo vazio (vira o placeholder). */
  defaultValue: string;
  maxLength: number;
  hint?: string;
};

export function blogCardExtraFields(linkHint: string): SectionExtraField[] {
  return [
    {
      name: BLOG_CARD_EXTRA.title,
      label: "Card “Visitar blog”: título",
      defaultValue: BLOG_CARD.title,
      maxLength: 60,
    },
    {
      name: BLOG_CARD_EXTRA.subtitle,
      label: "Card “Visitar blog”: texto",
      defaultValue: BLOG_CARD.subtitle,
      maxLength: 80,
    },
    {
      name: BLOG_CARD_EXTRA.href,
      label: "Card “Visitar blog”: link",
      defaultValue: "",
      maxLength: 300,
      hint: linkHint,
    },
  ];
}
