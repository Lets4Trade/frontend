import { cn } from "@/lib/cn";
import { PlatformIcon } from "@/features/game/PlatformIcon";
import { isServerPlatform } from "@/features/game/serverPlatform";

/**
 * Nome do servidor COM o ícone da plataforma (PC / PlayStation / Xbox) nos
 * seletores do painel (2026-11-26, pedido do usuário: "nos lugares onde eu
 * seleciono o servidor, o ícone precisa aparecer pra mim também"). O mesmo
 * ícone monocromático da loja (`PlatformIcon`, cor do texto). Sem plataforma,
 * só o nome.
 */
export function ServerName({
  label,
  platform,
  className,
  iconClassName = "size-[15px]",
}: {
  label: string;
  platform?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-[6px]", className)}>
      {isServerPlatform(platform) ? <PlatformIcon platform={platform} className={cn("shrink-0", iconClassName)} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Só o ícone, para as opções de select (`SelectField`/`FilterMenu` com `icon`). */
export function serverIcon(platform?: string | null, className = "size-[15px] shrink-0") {
  return isServerPlatform(platform) ? <PlatformIcon platform={platform} className={className} /> : undefined;
}
