import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AdminToaster } from "@/components/ui/Toasts";
import { AdminHeader } from "@/features/admin/AdminHeader";
import { PageViewTracker } from "@/features/admin/PageViewTracker";
import { getSessionRole, getSessionUser } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Painel | Lets4Trade",
  // Painel interno: nada a indexar, e o `noindex` vale para toda rota filha.
  robots: { index: false, follow: false },
};

/**
 * Moldura e GUARDA do painel administrativo.
 *
 * A guarda fica no layout, não em cada página: rota administrativa nova nasce
 * protegida por estar na pasta, e não por alguém ter lembrado de copiar a
 * checagem. Esquecer de proteger é o erro mais provável aqui, então a estrutura
 * é quem impede.
 *
 * Dois desfechos diferentes, de propósito:
 *   - sem sessão → login, com retorno. É alguém que talvez tenha acesso.
 *   - sessão sem ADMIN → 404. Quem está logado e não é admin não precisa saber
 *     que este endereço existe; e um "403 acesso negado" só serviria para
 *     confirmar que existe algo aqui.
 *
 * Isto é conveniência de navegação, NÃO é a autorização. Quem autoriza é o
 * `RolesGuard` do backend em cada rota: nada aqui impediria uma chamada direta
 * à API, e é lá que ela é recusada.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // As duas leem o MESMO perfil, memorizado por requisição — é uma ida ao
  // backend, não duas.
  const [role, user] = await Promise.all([getSessionRole(), getSessionUser()]);

  if (role === null || user === null) redirect("/login?redirect=/admin");
  if (role !== "ADMIN") notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      {/* Registra cada tela do painel aberta — é a prova de quem acessou dado
          pessoal de terceiros, e quando. */}
      <PageViewTracker surface="admin" />
      <AdminHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />

      {/* Área dos avisos efêmeros. Uma vez só, no layout: cada tela do painel
          chama `toastOk`/`toastError` e não precisa montar nada. */}
      <AdminToaster />
    </div>
  );
}
