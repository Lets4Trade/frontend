import type { Metadata } from "next";
import { AccountShell } from "@/features/account/AccountShell";
import { EditProfileForm } from "@/features/account/EditProfileForm";
import { MOCK_PROFILE } from "@/features/account/profile";

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
 * ⚠️ Dados MOCK, e a rota não tem guarda. Ver .claude/context/open-questions.md.
 */
export default function EditarInformacoesPage() {
  return (
    <AccountShell activeTab="editar" title="Minhas Informações">
      <div className="absolute top-[124px] right-[50px] bottom-[50px] left-[50px]">
        <EditProfileForm
          defaults={{
            name: MOCK_PROFILE.name,
            email: MOCK_PROFILE.email,
            discord: MOCK_PROFILE.discord,
            whatsapp: MOCK_PROFILE.whatsapp,
          }}
        />
      </div>
    </AccountShell>
  );
}

