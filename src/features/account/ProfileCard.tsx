import Image from "next/image";
import Link from "next/link";
import { GlowBar } from "@/components/layout/GlowBar";
import { buttonVariants } from "@/components/ui/Button";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { cn } from "@/lib/cn";

export type ProfileSummary = {
  name: string;
  avatar: string;
  rank: number;
  coins: number;
  points: number;
};

/** Qual aba do painel está ativa — decide qual botão fica preenchido. */
export type AccountTab = "pedidos" | "editar";

/**
 * Card de perfil do painel do usuário (Figma 2073:1612) — 462×896, raio 30,
 * com a faixa de brilho laranja de 336px no topo.
 *
 * FLUXO, não posição absoluta (2026-11-02): o card era montado com `top/left`
 * em pixels do arquivo e não cabia no celular. Agora os elementos seguem a
 * ordem do documento e, a partir de `xl`, as margens reproduzem as coordenadas
 * do design (avatar em y=100, nome em 278, divisores em 335 e 425, botões em
 * 451 e 526, LOGOUT no rodapé). Abaixo de `xl` o card fica na largura da tela
 * e mais baixo (avatar de 96, botões lado a lado a partir de `sm`).
 *
 * Os números de coins e pontos passam por `toLocaleString("pt-BR")` — 1500
 * precisa sair como "1.500", e o design só mostra valores de três dígitos, onde
 * o problema não aparece.
 */
export function ProfileCard({
  profile,
  activeTab,
}: {
  profile: ProfileSummary;
  activeTab: AccountTab;
}) {
  return (
    <aside className="relative flex w-full flex-col items-center overflow-hidden rounded-[24px] border border-white/10 bg-brand-surface px-[20px] pt-[28px] pb-[22px] xl:h-[896px] xl:w-[462px] xl:shrink-0 xl:rounded-[30px] xl:px-[50px] xl:pt-[100px] xl:pb-[104px]">
      <GlowBar className="-top-[2px] w-[336px]" />

      {/* Avatar centrado, com o anel laranja do design (160px no desktop). */}
      <div className="size-[96px] shrink-0 overflow-hidden rounded-full border-2 border-brand-orange xl:size-[160px]">
        <Image
          src={profile.avatar}
          alt={profile.name}
          width={160}
          height={160}
          className="size-full object-cover"
        />
      </div>

      <h1 className="mt-[12px] w-full max-w-[246px] truncate text-center font-poppins text-[20px] leading-[32px] font-bold tracking-[0.44px] text-white xl:mt-[18px] xl:text-[22px]">
        {profile.name}
      </h1>

      <div className="mt-[14px] h-px w-full bg-white/25 xl:mt-[25px]" />

      {/* Ranking, COINS e PTS: três colunas de 94px, centros a −94/0/+94 do
          meio — o arquivo os põe em −98/0/+90. */}
      <div className="mt-[12px] grid w-[282px] grid-cols-3 items-center justify-items-center xl:mt-[19px]">
        {/* Posição no ranking — retângulo em degradê laranja com texto preto. */}
        <div
          className="flex h-[43px] w-[48px] items-center justify-center rounded-[8px]"
          style={{
            backgroundImage:
              "linear-gradient(134.73deg, #ff7300 13.819%, #ff4d00 89.223%)",
          }}
        >
          <span className="font-poppins text-[18px] font-bold text-black">
            #{profile.rank}
          </span>
        </div>

        <Stat label="COINS" value={profile.coins} />
        <Stat label="PTS" value={profile.points} />
      </div>

      <div className="mt-[12px] h-px w-full bg-white/25 xl:mt-[8px]" />

      {/* Links com o visual de botão — navegação precisa ser <a> para abrir em
          nova aba, ser indexável e funcionar sem JS. Um <button> dentro de um
          <Link> seria HTML inválido (elemento interativo aninhado). */}
      <nav
        aria-label="Minha conta"
        className="mt-[18px] grid w-full gap-[12px] sm:grid-cols-2 xl:mt-[25px] xl:grid-cols-1 xl:gap-[25px]"
      >
        <Link
          href="/conta/pedidos"
          aria-current={activeTab === "pedidos" ? "page" : undefined}
          className={cn(
            buttonVariants({ variant: activeTab === "pedidos" ? "primary" : "outline" }),
            "w-full px-0",
          )}
        >
          MEUS PEDIDOS
        </Link>

        <Link
          href="/conta/editar"
          aria-current={activeTab === "editar" ? "page" : undefined}
          className={cn(
            buttonVariants({ variant: activeTab === "editar" ? "primary" : "outline" }),
            "w-full px-0",
          )}
        >
          EDITAR INFORMAÇÕES
        </Link>
      </nav>

      {/* Era um link para `/logout`, página que não existe (404 e sessão viva).
          Sair é `POST /auth/logout` — ver `useLogout`. No desktop, `mt-auto`
          o leva ao rodapé do card (y=770 no arquivo). */}
      <LogoutButton
        className="mt-[18px] flex cursor-pointer items-center gap-[9px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 xl:mt-auto"
        pendingLabel={
          <span className="font-poppins text-[15px] font-medium tracking-[0.15px] text-white/80">SAINDO…</span>
        }
      >
        <Image src="/icons/power.svg" alt="" width={18} height={18} aria-hidden />
        <span className="font-poppins text-[15px] font-medium tracking-[0.15px] text-white/80">
          LOGOUT
        </span>
      </LogoutButton>
    </aside>
  );
}

/** Rótulo acima, número em degradê laranja abaixo — usado por COINS e PTS. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-poppins text-[15px] font-bold whitespace-nowrap text-white/80">
        {label}
      </p>
      <p
        className="mt-[5px] bg-clip-text font-poppins text-[24px] leading-[36px] font-semibold text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(137.97deg, #ff7300 13.819%, #ff4d00 89.223%)",
        }}
      >
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
