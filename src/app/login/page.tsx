import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LoginForm } from "@/features/auth/LoginForm";
import { SocialLogin, socialErrorMessage } from "@/features/auth/SocialLogin";

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
 * Server component: o único JavaScript enviado ao browser é o do `LoginForm`
 * (client component). Isso mantém o bundle desta rota pequeno — ela é a porta
 * de entrada e costuma ser o primeiro carregamento do usuário.
 *
 * Lê `?redirect` (destino depois do login social) e `?erro` (volta do login
 * social que não deu certo) — por isso renderiza por requisição desde
 * 2026-10-23. Os botões do Google/Discord são links, sem JavaScript.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const redirect = typeof query.redirect === "string" ? query.redirect : null;

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <section
          aria-labelledby="login-heading"
          className="w-full max-w-[415px] rounded-[30px] border border-brand-border bg-brand-surface/95 p-[30px] backdrop-blur-[75px] sm:p-[50px]"
        >
          <LoginForm
            social={<SocialLogin redirect={redirect} verb="Entrar" />}
            notice={socialErrorMessage(query.erro)}
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
