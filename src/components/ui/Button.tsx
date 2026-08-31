import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Botão do tema dark. As três variantes vêm dos retângulos exportados do Figma
 * (Rectangle 6440–6446), que são SVG com fill e stroke em DEGRADÊ.
 *
 * No `outline` a borda não é um `border-*` comum: o degradê laranja vem da
 * classe `.brand-ring` (ver globals.css), que desenha a moldura num ::before
 * mascarado. Foi preciso por causa do fill translúcido — a explicação completa
 * está no comentário da classe.
 *
 * - `outline`  → fill cinza 10% + borda 2px em degradê laranja.
 *                (GAMES, CRIAR CONTA no header e CRIAR CONTA no card — os três
 *                 usam exatamente o mesmo estilo no design.)
 * - `primary`  → #FF7300 chapado + borda branca 15%. (ACESSAR, dentro do card.)
 * - `cta`      → degradê laranja + borda branca 15%. (ACESSAR CONTA, no header.)
 *
 * `primary` e `cta` parecem iguais de longe, mas o design usa mesmo fill chapado
 * no card e degradê no header — mantidos separados para bater 1:1.
 */
export const buttonVariants = cva(
  "inline-flex h-[50px] items-center justify-center rounded-full px-6 font-poppins text-[16px] font-bold tracking-[0.16px] transition-opacity select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90",
  {
    variants: {
      variant: {
        outline:
          "brand-ring bg-[image:var(--brand-surface-fill)] text-white",
        primary:
          "border border-[var(--brand-stroke-soft)] bg-brand-orange text-black",
        cta: "border border-[var(--brand-stroke-soft)] bg-[image:var(--brand-orange-gradient)] text-black",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", fullWidth: false },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { children: ReactNode };

export function Button({
  className,
  variant,
  fullWidth,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // `type` default "button": um <button> sem type dentro de <form> vira
      // "submit" e dispara envio sem querer. Quem submete pede explicitamente.
      type={type}
      className={cn(buttonVariants({ variant, fullWidth }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
