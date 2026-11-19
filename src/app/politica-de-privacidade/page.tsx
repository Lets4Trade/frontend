import type { Metadata } from "next";
import { LegalDocument } from "@/features/site/LegalDocument";

/**
 * Política de Privacidade — linkada pelo cadastro, pelo rodapé e pelo aviso de cookies. O texto
 * é o arquivo de `public/docs/` (2026-11-18): ver `LegalDocument`.
 */
export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de Privacidade da Lets 4 Trade: quais dados coletamos, como usamos e protegemos, e os seus direitos na LGPD.",
};

export default function Page() {
  return <LegalDocument kind="privacidade" />;
}
