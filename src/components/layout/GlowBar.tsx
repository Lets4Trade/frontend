import { cn } from "@/lib/cn";

/**
 * Faixa "Linear Brilho" do design: um degradê laranja que some nas pontas,
 * com uma cópia borrada atrás para dar o halo. Puro CSS — no Figma são dois
 * retângulos sobrepostos (um com blur 7px), não um asset exportável.
 *
 * `aria-hidden`: é decoração, não deve aparecer na árvore de acessibilidade.
 */
export function GlowBar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 w-[572px] max-w-full -translate-x-1/2",
        className,
      )}
    >
      <div className="h-[5px] w-full bg-gradient-to-r from-transparent via-brand-orange to-transparent blur-[7px] absolute bottom-0 left-0" />
      <div className="-mt-[4px] h-[3px] w-full bg-gradient-to-r from-transparent via-brand-orange to-transparent absolute bottom-0 left-0" />
    </div>
  );
}
