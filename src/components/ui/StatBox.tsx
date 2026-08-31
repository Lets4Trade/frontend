import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Caixa de estatística preta do design de fidelidade (Figma 2176:2241):
 * fundo preto, borda branca a 10%, raio 15, rótulo pequeno e valor grande.
 *
 * O conteúdo é centralizado na vertical — é o que faz a mesma composição
 * servir tanto na caixa de 127px (saldo) quanto nas de 96px (cashback, total
 * economizado), sem precisar de um `top` por caixa.
 *
 * `children` no lugar de uma prop `value` porque cada caixa pinta o número de
 * um jeito: degradê laranja na maioria, verde sólido no "Total Economizado", e
 * a de progresso ainda leva barra e legenda.
 */
export function StatBox({
  label,
  children,
  className,
  contentClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  /** Ajusta o padding lateral: 50px no painel-resumo, 25px nos cards. */
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[15px] border border-white/10 bg-black",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col justify-center px-[50px]",
          contentClassName,
        )}
      >
        <p className="font-helvetica text-[14px] leading-[13px] font-bold tracking-[0.14px] text-white/80">
          {label}
        </p>
        <div className="mt-[3px]">{children}</div>
      </div>
    </div>
  );
}

/**
 * Número grande da caixa. Em degradê laranja por padrão; `gradient={false}`
 * desliga para quem tem cor própria — é o caso do "Total Economizado", em verde
 * sólido. Precisa ser uma prop e não só uma classe: o degradê depende de
 * `color: transparent`, então sobrescrever a cor por cima não funcionaria.
 */
export function StatValue({
  children,
  className,
  gradient = true,
}: {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}) {
  return (
    <p
      className={cn(
        "font-poppins text-[24px] leading-[27px] font-bold tracking-[0.24px]",
        gradient && "text-brand-gradient",
        className,
      )}
    >
      {children}
    </p>
  );
}
