import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileCard, type AccountTab } from "./ProfileCard";
import { MOCK_PROFILE } from "./profile";

/**
 * Moldura comum das abas do painel do usuário (Figma 2073:1612 e 2116:2031).
 *
 * As duas telas são idênticas fora o painel da direita: mesmo header logado,
 * mesmo card de perfil 462×896 e o mesmo painel 1100×898. Extraído para as abas
 * não divergirem — uma medida ajustada aqui vale para as duas.
 *
 * Medidas do design (frame de 1920): perfil em x=154, painel em x=666, vão de
 * 50px e margens de 154px dos dois lados → conteúdo de 1612px centrado.
 */
export function AccountShell({
  activeTab,
  title,
  children,
}: {
  activeTab: AccountTab;
  /** Título do painel da direita ("Meus Pedidos", "Minhas Informações"). */
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader
        user={{ name: MOCK_PROFILE.name, avatar: MOCK_PROFILE.avatar, online: true }}
      />

      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto flex w-max gap-[50px] px-[50px] py-[68px]">
          <ProfileCard profile={MOCK_PROFILE} activeTab={activeTab} />

          <section
            aria-labelledby="painel-heading"
            className="relative h-[898px] w-[1100px] shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface"
          >
            {/* Marcador laranja à esquerda do título. */}
            <div
              aria-hidden
              className="absolute top-[50px] left-[50px] h-[31px] w-[4px] rounded-[29px]"
              style={{
                backgroundImage:
                  "linear-gradient(96.53deg, #ff7300 13.819%, #ff4d00 89.223%)",
              }}
            />

            <h2
              id="painel-heading"
              className="absolute top-[50px] left-[76px] font-helvetica text-[25px] leading-[24px] font-bold tracking-[0.25px] text-white"
            >
              {title}
            </h2>

            {children}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
