import type { Metadata } from "next";
import { LegalDocument } from "@/features/site/LegalDocument";

/**
 * Termos de Uso — linkada pelo cadastro, pelo rodapé e pelo aviso de cookies. O texto
 * é o arquivo de `public/docs/` (2026-11-18): ver `LegalDocument`.
 */
export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da Lets 4 Trade: compras, entregas, cancelamentos, reembolsos e responsabilidades.",
};

export default function Page() {
  return <LegalDocument kind="termos" />;
}
