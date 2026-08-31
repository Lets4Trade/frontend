import Image from "next/image";
import Link from "next/link";
import { GlowBar } from "@/components/layout/GlowBar";
import { buttonVariants } from "@/components/ui/Button";
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
 * Posicionamento absoluto pelo mesmo motivo do `OrderCard`: as coordenadas do
 * design (avatar em y=100, nome em 278, divisores em 335 e 425, LOGOUT em 773)
 * não formam uma grade regular.
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
    <aside className="relative h-[896px] w-[462px] shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-brand-surface">
      <GlowBar className="-top-[2px] w-[336px]" />

      {/* Avatar 160px centrado, com o anel laranja do design. */}
      <div className="absolute top-[100px] left-[151px] size-[160px] overflow-hidden rounded-full border-2 border-brand-orange">
        <Image
          src={profile.avatar}
          alt={profile.name}
          width={160}
          height={160}
          className="size-full object-cover"
        />
      </div>

      <h1 className="absolute top-[278px] left-1/2 w-[246px] -translate-x-1/2 text-center font-poppins text-[22px] leading-[32px] font-bold tracking-[0.44px] text-white">
        {profile.name}
      </h1>

      <div className="absolute top-[335px] left-[50px] h-px w-[362px] bg-white/25" />

      {/* Posição no ranking — retângulo em degradê laranja com texto preto. */}
      <div
        className="absolute top-[359px] left-[109px] flex h-[43px] w-[48px] items-center justify-center rounded-[8px]"
        style={{
          backgroundImage:
            "linear-gradient(134.73deg, #ff7300 13.819%, #ff4d00 89.223%)",
        }}
      >
        <span className="font-poppins text-[18px] font-bold text-black">
          #{profile.rank}
        </span>
      </div>

      <Stat label="COINS" value={profile.coins} left={231} />
      <Stat label="PTS" value={profile.points} left={321} />

      <div className="absolute top-[425px] left-[50px] h-px w-[362px] bg-white/25" />

      {/* Links com o visual de botão — navegação precisa ser <a> para abrir em
          nova aba, ser indexável e funcionar sem JS. Um <button> dentro de um
          <Link> seria HTML inválido (elemento interativo aninhado). */}
      <Link
        href="/conta/pedidos"
        aria-current={activeTab === "pedidos" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: activeTab === "pedidos" ? "primary" : "outline" }),
          "absolute top-[451px] left-[50px] w-[362px] px-0",
        )}
      >
        MEUS PEDIDOS
      </Link>

      <Link
        href="/conta/editar"
        aria-current={activeTab === "editar" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: activeTab === "editar" ? "primary" : "outline" }),
          "absolute top-[526px] left-[50px] w-[362px] px-0",
        )}
      >
        EDITAR INFORMAÇÕES
      </Link>

      <Link
        href="/logout"
        className="absolute top-[770px] left-1/2 flex -translate-x-1/2 items-center gap-[9px] transition-opacity hover:opacity-80"
      >
        <Image src="/icons/power.svg" alt="" width={18} height={18} aria-hidden />
        <span className="font-poppins text-[15px] font-medium tracking-[0.15px] text-white/80">
          LOGOUT
        </span>
      </Link>
    </aside>
  );
}

/** Rótulo acima, número em degradê laranja abaixo — usado por COINS e PTS. */
function Stat({
  label,
  value,
  left,
}: {
  label: string;
  value: number;
  left: number;
}) {
  return (
    <div
      className="absolute top-[354px] -translate-x-1/2 text-center"
      style={{ left }}
    >
      <p className="font-poppins text-[15px] font-bold whitespace-nowrap text-white/80">
        {label}
      </p>
      <p
        className="mt-[5px] bg-clip-text font-poppins text-[24px] font-semibold text-transparent"
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
