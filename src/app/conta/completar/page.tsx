import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CompleteProfileForm } from "@/features/account/CompleteProfileForm";
import { getAccountProfile } from "@/features/account/profile";
import { safeRedirectPath } from "@/lib/safeRedirect";

export const metadata: Metadata = {
  title: "Complete seu cadastro",
  robots: { index: false, follow: false },
};

/**
 * "Complete seu cadastro" (2026-10-28) — para onde o backend manda quem entrou
 * com Google/Discord sem telefone ou sem gênero (`needsProfileCompletion`).
 *
 * `?voltar=` é input de qualquer um: passa pelo `safeRedirectPath` (só caminho
 * interno). Sem sessão vai ao login voltando para cá; com o cadastro já
 * completo, segue direto para o destino — a tela nunca pergunta o que já sabe.
 *
 * `?via=google` (2026-11-18): quem entrou pelo Google não precisa informar o
 * gênero — a tela pede só o WhatsApp. Mexer no parâmetro só esconde ou mostra
 * um campo opcional do próprio perfil; não dá acesso a nada.
 */
export default async function CompletarCadastroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const next = safeRedirectPath(typeof query.voltar === "string" ? query.voltar : null);
  const askGender = query.via !== "google";

  const result = await getAccountProfile();
  if (!result.ok) {
    // `via=google` vai junto: sem ele, a volta do login perguntaria o gênero.
    const back = `/conta/completar?voltar=${encodeURIComponent(next)}${askGender ? "" : "&via=google"}`;
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }
  const { profile } = result;
  if (profile.whatsapp.trim() && (profile.gender || !askGender)) redirect(next);

  return (
    <div className="flex min-h-[var(--dvh)] flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <section
          aria-labelledby="completar-heading"
          className="w-full max-w-[460px] rounded-[30px] border border-brand-border bg-brand-surface/95 p-[30px] backdrop-blur-[75px] sm:p-[50px]"
        >
          <CompleteProfileForm
            next={next}
            askGender={askGender}
            defaults={{ whatsapp: profile.whatsapp, gender: profile.gender }}
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
