import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | Lets4Trade",
  description: "Acesse sua conta Lets4Trade.",
  // Tela de autenticação não deve entrar em índice de busca: não tem valor de
  // SEO e aparecer na SERP só amplia a superfície para phishing e sondagem.
  robots: { index: false, follow: false },
};

/**
 * Tela de Login — Figma nó 1941:873.
 *
 * Server component: não há nada dinâmico aqui, então o HTML é estático e o
 * único JavaScript enviado ao browser é o do `LoginForm` (client component).
 * Isso mantém o bundle desta rota pequeno — ela é a porta de entrada e costuma
 * ser o primeiro carregamento do usuário.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <section
          aria-labelledby="login-heading"
          className="w-full max-w-[415px] rounded-[30px] border border-brand-border bg-brand-surface/95 p-[30px] backdrop-blur-[75px] sm:p-[50px]"
        >
          <LoginForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
