import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/features/account/AccountShell";
import { EditProfileForm } from "@/features/account/EditProfileForm";
import { getAccountProfile } from "@/features/account/profile";

export const metadata: Metadata = {
  title: "Minhas Informações | Lets4Trade",
  description: "Edite os dados da sua conta Lets4Trade.",
  // Painel do usuário: conteúdo por conta, nada a indexar.
  robots: { index: false, follow: false },
};

/**
 * Painel do usuário — aba "Minhas Informações" (Figma nó 2116:2031).
 *
 * O formulário ocupa a área abaixo do título: começa em y=124 (label da
 * primeira linha) e o botão fica ancorado a 50px do rodapé do painel, como no
 * design — daí o `bottom-[50px]` no container e o `mt-auto` no botão.
 *
 * DADOS REAIS de `GET /me`, lidos no servidor, e rota guardada: sem sessão
 * válida vai para o login.
 */
export default async function EditarInformacoesPage() {
  const result = await getAccountProfile();
  if (!result.ok) redirect("/login?redirect=/conta/editar");

  const { profile } = result;

  return (
    <AccountShell profile={profile} activeTab="editar" title="Minhas Informações">
      <div className="absolute top-[124px] right-[50px] bottom-[50px] left-[50px]">
        <EditProfileForm
          defaults={{
            name: profile.name,
            email: profile.email,
            discord: profile.discord,
            whatsapp: profile.whatsapp,
          }}
        />
      </div>
    </AccountShell>
  );
}
