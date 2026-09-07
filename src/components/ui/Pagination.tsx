import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Paginação do site (Figma 1204:1292): círculos de 50px com 25 de vão, o ativo
 * em laranja.
 *
 * Era o MESMO componente copiado em quatro arquivos (vitrine, produtos,
 * usuários e logs), diferindo só em como cada tela monta o endereço. Quatro
 * cópias do mesmo desenho é como uma correção entra em três telas e esquece a
 * quarta — então a montagem do endereço virou parâmetro (`href`) e o desenho
 * passou a ter um dono só.
 *
 * São links de verdade, e não botões: a página faz parte do ENDEREÇO. Isso é o
 * que permite compartilhar, voltar pelo histórico do navegador e — na vitrine —
 * ser indexado. Também é o que mantém a paginação funcionando com JavaScript
 * desligado, porque quem resolve é o servidor.
 */
type PaginationProps = {
  /** Página atual, base 1. */
  current: number;
  pageCount: number;
  /** Monta o endereço de uma página. Cada tela preserva os próprios filtros. */
  href: (page: number) => string;
  /** Descreve O QUE está sendo paginado, para leitor de tela. */
  label: string;
  className?: string;
};

/**
 * Quantos números aparecem por vez.
 *
 * Três das quatro cópias desenhavam UM CÍRCULO POR PÁGINA. Isso é invisível com
 * seis produtos e vira lixo com volume: 1000 produtos de 24 em 24 são 42
 * círculos, e a trilha de auditoria — que cresce com o tráfego — chegaria a
 * milhares. Uma janela em volta da página atual cobre o uso real, que é folhear
 * perto de onde se está.
 */
const WINDOW = 5;

export function Pagination({ current, pageCount, href, label, className }: PaginationProps) {
  // Uma página só não é uma escolha — não desenha controle nenhum.
  if (pageCount <= 1) return null;

  // A janela acompanha a página atual, mas encosta nas bordas em vez de
  // encolher: perto do início ou do fim continuam aparecendo cinco números.
  const from = Math.max(1, Math.min(current - Math.floor(WINDOW / 2), pageCount - WINDOW + 1));
  const start = Math.max(1, from);
  const end = Math.min(pageCount, start + WINDOW - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav
      aria-label={`Paginação ${label}`}
      className={cn("mt-[40px] flex flex-wrap justify-center gap-[25px]", className)}
    >
      {pages.map((number) => {
        const active = number === current;
        return (
          <Link
            key={number}
            href={href(number)}
            aria-current={active ? "page" : undefined}
            aria-label={`Página ${number}`}
            className={cn(
              "flex size-[50px] items-center justify-center rounded-full border font-poppins text-[18px] font-bold tracking-[0.36px] text-white transition-opacity hover:opacity-90",
              active
                ? "border-white/15 bg-[image:var(--brand-orange-gradient)]"
                : "border-white/10 bg-[image:var(--brand-surface-fill)]",
            )}
          >
            {number}
          </Link>
        );
      })}
    </nav>
  );
}
