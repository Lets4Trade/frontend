import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { publicApiGet } from "@/lib/publicApi";
import { safeRedirectPath } from "@/lib/safeRedirect";

/**
 * "Entrar com Google" / "Entrar com Discord" (2026-10-23).
 *
 * Server component: os botões são LINKS comuns para o backend
 * (`/api/v1/auth/<provedor>`), que faz o resto e devolve a pessoa já logada.
 * Nenhum JavaScript vai para o navegador por causa deles.
 *
 * Só aparece o provedor que o backend diz estar configurado
 * (`GET /auth/providers`): botão que leva a "indisponível" é pior que botão
 * nenhum. A lista muda só em deploy — 5 min de cache.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

type Providers = { google?: boolean; discord?: boolean };

const PROVIDERS = [
  { key: "google", label: "Google", icon: "/icons/social/google.svg", width: 20, height: 20 },
  { key: "discord", label: "Discord", icon: "/icons/social/discord.svg", width: 22, height: 17 },
] as const;

export async function SocialLogin({ redirect, verb }: { redirect?: string | null; verb: "Entrar" | "Cadastrar" }) {
  const providers = API_URL ? await publicApiGet<Providers>("/auth/providers", { revalidate: 300 }) : null;
  const enabled = PROVIDERS.filter((provider) => providers?.[provider.key] === true);
  if (enabled.length === 0) return null;

  // O backend saneia de novo (`sanitizeRelativePath`); aqui é para não mandar lixo.
  const destination = safeRedirectPath(redirect, "");
  const query = destination ? `?redirect_to=${encodeURIComponent(destination)}` : "";

  return (
    <div className="mt-[25px] flex flex-col gap-[12px]">
      {/* No cadastro o card é largo (780px): lado a lado a partir do `sm`. */}
      <div className={`grid gap-[12px] ${verb === "Cadastrar" && enabled.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {enabled.map((provider) => (
          // `<a>` e não `<Link>`: é navegação para OUTRO host (a API), sem prefetch.
          <a
            key={provider.key}
            href={`${API_URL}/auth/${provider.key}${query}`}
            className={buttonVariants({ variant: "outline", fullWidth: true, className: "gap-[12px]" })}
          >
            <Image src={provider.icon} alt="" width={provider.width} height={provider.height} aria-hidden />
            {verb} com {provider.label}
          </a>
        ))}
      </div>
      <p className="text-center font-helvetica text-[12px] leading-[17px] text-brand-fg-subtle">
        Ao continuar com {enabled.map((provider) => provider.label).join(" ou ")}, você aceita os{" "}
        <Link href="/termos" className="underline hover:text-white">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/politica-de-privacidade" className="underline hover:text-white">
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="flex items-center gap-[12px]" aria-hidden>
        <span className="h-px flex-1 bg-brand-hairline" />
        <span className="font-poppins text-[12px] font-semibold tracking-[0.12px] text-brand-fg-subtle uppercase">
          ou com e-mail
        </span>
        <span className="h-px flex-1 bg-brand-hairline" />
      </div>
    </div>
  );
}

/** `?erro=` que o backend devolve quando o login social não dá certo. */
const SOCIAL_ERRORS: Record<string, string> = {
  cancelado: "Login cancelado. Tente de novo quando quiser.",
  expirado: "O login demorou demais ou foi aberto em outro navegador. Tente de novo.",
  email: "Sua conta precisa ter um e-mail confirmado no Google/Discord para entrar.",
  bloqueado: "Esta conta está desativada. Fale com o atendimento.",
  mfa: "Sua conta tem verificação em duas etapas: entre com e-mail e senha.",
  indisponivel: "Esse jeito de entrar não está disponível agora.",
  falhou: "Não conseguimos entrar agora. Tente de novo em instantes.",
};

export function socialErrorMessage(code: string | string[] | undefined): string | null {
  return typeof code === "string" ? (SOCIAL_ERRORS[code] ?? null) : null;
}
