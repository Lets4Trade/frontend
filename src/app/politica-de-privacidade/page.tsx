import type { Metadata } from "next";
import { LegalDocument, legalTitle } from "@/features/site/LegalDocument";

/**
 * Política de Privacidade — linkada pelo cadastro e exigida pela LGPD como
 * informação acessível ao titular. O texto é editado em "Edição de sessões →
 * Termos e privacidade".
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await legalTitle("privacidade"),
    description: "Política de Privacidade da Lets4Trade.",
  };
}

export default function PrivacyPage() {
  return <LegalDocument sectionKey="privacidade" />;
}
