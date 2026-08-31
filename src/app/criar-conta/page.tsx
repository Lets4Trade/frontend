import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SignupForm } from "@/features/auth/SignupForm";

export const metadata: Metadata = {
  title: "Criar conta | Lets4Trade",
  description: "Crie sua conta na Lets4Trade.",
  // Mesma razão do /login: tela de autenticação não tem valor de SEO e
  // aparecer na busca só amplia a superfície para phishing e sondagem.
  robots: { index: false, follow: false },
};

/**
 * Tela de Criar Conta — Figma nó 1953:855.
 *
 * Card de 780×469 (o do login é 415×614), mesma moldura: `#0a0a0a`, borda
 * branca a 15%, raio 30px, backdrop-blur 75px e 50px de padding interno.
 *
 * Server component: só o `SignupForm` vai como JavaScript para o browser.
 */
export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <section
          aria-labelledby="signup-heading"
          className="w-full max-w-[780px] rounded-[30px] border border-brand-border bg-brand-surface/95 p-[30px] backdrop-blur-[75px] sm:p-[50px]"
        >
          <SignupForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

