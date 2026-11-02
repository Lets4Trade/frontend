import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileCard, type AccountTab } from "./ProfileCard";
import type { AccountProfile } from "./profile";

/**
 * Moldura comum das abas do painel do usuário (Figma 2073:1612 e 2116:2031).
 *
 * As duas telas são idênticas fora o painel da direita: mesmo header logado,
 * mesmo card de perfil 462×896 e o mesmo painel 1100×898. Extraído para as abas
 * não divergirem — uma medida ajustada aqui vale para as duas.
 *
 * Medidas do design (frame de 1920): perfil em x=154, painel em x=666, vão de
 * 50px e margens de 154px dos dois lados → conteúdo de 1612px centrado.
 *
 * RESPONSIVO (2026-11-02, "não formatada pra mobile"): o desenho é só de
 * desktop e somava 1712px FIXOS (462 + 50 + 1100 + margens) — no celular o
 * painel sumia inteiro à direita, e até num notebook de 1440 ele saía cortado.
 * Agora:
 *   - `xl` (≥1280): o desenho do arquivo — perfil de 462 ao lado do painel
 *     emoldurado de 898 de altura; o painel ENCOLHE até 1100 em vez de estourar.
 *   - abaixo: tudo empilhado e na largura da tela — perfil compacto em cima,
 *     painel SEM moldura (título + conteúdo direto), para os cartões de compra
 *     terem a largura toda do celular.
 */
export function AccountShell({
  profile,
  activeTab,
  title,
  children,
}: {
  /** Perfil real, lido do backend pela rota. */
  profile: AccountProfile;
  activeTab: AccountTab;
  /** Título do painel da direita ("Meus Pedidos", "Minhas Informações"). */
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-bg">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-[1712px] flex-col gap-[28px] px-[16px] py-[24px] sm:px-[24px] xl:flex-row xl:items-start xl:gap-[50px] xl:px-[50px] xl:py-[68px]">
          <ProfileCard profile={profile} activeTab={activeTab} />

          <section
            aria-labelledby="painel-heading"
            className="relative flex min-w-0 flex-col xl:h-[898px] xl:max-w-[1100px] xl:flex-1 xl:overflow-hidden xl:rounded-[30px] xl:border xl:border-white/10 xl:bg-brand-surface xl:p-[50px]"
          >
            {/* Marcador laranja à esquerda do título (x=50 e x=76 no arquivo → vão de 22). */}
            <div className="flex items-center gap-[16px] xl:gap-[22px]">
              <div
                aria-hidden
                className="h-[26px] w-[4px] shrink-0 rounded-[29px] xl:h-[31px]"
                style={{
                  backgroundImage:
                    "linear-gradient(96.53deg, #ff7300 13.819%, #ff4d00 89.223%)",
                }}
              />

              <h2
                id="painel-heading"
                className="font-helvetica text-[22px] leading-[24px] font-bold tracking-[0.25px] text-white xl:text-[25px]"
              >
                {title}
              </h2>
            </div>

            {children}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
