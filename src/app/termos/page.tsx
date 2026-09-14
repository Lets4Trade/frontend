import type { Metadata } from "next";
import { LegalDocument, legalTitle } from "@/features/site/LegalDocument";

/**
 * Termos de Uso — o link do cadastro ("ao criar sua conta, você aceita os
 * Termos de Uso") apontava para esta rota, que não existia. O texto é editado
 * em "Edição de sessões → Termos e privacidade".
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await legalTitle("termos"),
    description: "Termos de Uso da Lets4Trade.",
  };
}

export default function TermsPage() {
  return <LegalDocument sectionKey="termos" />;
}
