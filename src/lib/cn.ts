import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Junta classes condicionais e resolve conflitos do Tailwind (a última vence).
 * Sem isso, `cn("px-4", "px-8")` deixaria as duas no DOM e a ordem no CSS
 * decidiria o resultado — imprevisível ao sobrescrever estilo via prop.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
