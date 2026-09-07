import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Controles de filtro compartilhados pelas listagens do painel — produtos
 * (Figma 3805:2807) e usuários (3831:117).
 *
 * As duas telas desenham o MESMO select de 249×50 e a MESMA busca de 219×50,
 * com a lupa a 25px da borda. Extraído quando a segunda chegou, pelo motivo de
 * sempre: duplicar é como as duas começam a divergir.
 *
 * TUDO aqui é link ou `<form method="get">` — o filtro mora na URL, então
 * filtrar é navegar. É o que mantém a filtragem no SERVIDOR e o estado
 * compartilhável, e é o que dispensa hidratação numa tela que não precisa de
 * nenhuma.
 */

export type FilterOption = {
  href: string;
  label: string;
  active: boolean;
};

/**
 * Um "select" que na verdade é uma lista de LINKS, com a pílula dos campos do
 * site e a seta do design.
 *
 * `<details>`/`<summary>` e não Radix: abrir e fechar um menu é o que o HTML já
 * sabe fazer sozinho, teclado e leitor de tela inclusos, e este componente é
 * renderizado no servidor. Um `<select>` de verdade não serviria: ele só muda a
 * URL com JavaScript.
 *
 * ⚠️ Quem usa precisa passar uma `key` que mude a cada troca de filtro. A
 * navegação do Next é suave e reaproveita o DOM: sem remontar, o `open` do
 * `<details>` sobrevive e o menu fica aberto por cima do resultado que ele
 * acabou de filtrar.
 */
export function FilterMenu({
  width,
  label,
  active,
  options,
}: {
  width: number;
  label: string;
  /** Muda só a cor do rótulo: escolhido fica branco, padrão fica apagado. */
  active: boolean;
  options: FilterOption[];
}) {
  return (
    <details className="group relative shrink-0" style={{ width }}>
      <summary
        className={cn(
          "flex h-[50px] cursor-pointer list-none items-center justify-between gap-[10px] rounded-full",
          "border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] px-[23px]",
          "font-poppins text-[16px] tracking-[0.16px] outline-none",
          "focus-visible:border-brand-orange",
          active ? "text-white" : "text-white/60",
        )}
      >
        <span className="truncate">{label}</span>
        <Image
          src="/icons/chevron-down.svg"
          alt=""
          width={18}
          height={18}
          aria-hidden
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="scrollbar-orange absolute top-[58px] left-0 z-30 max-h-[320px] w-full overflow-y-auto rounded-[20px] border border-brand-border bg-brand-surface p-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        {options.map((option) => (
          <Link
            key={option.href + option.label}
            href={option.href}
            aria-current={option.active ? "true" : undefined}
            className={cn(
              "block truncate rounded-[12px] px-[12px] py-[10px] font-poppins text-[14px] transition-colors hover:bg-white/5",
              option.active ? "text-brand-orange" : "text-white",
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

/**
 * Busca (219×50, lupa a 25px da borda) — as mesmas medidas da busca da vitrine.
 *
 * `<form method="get">` de verdade: funciona sem JavaScript e não precisa de
 * client component. Os outros filtros viajam em `hidden`, porque um GET DESCARTA
 * tudo o que não está no formulário — sem isso, buscar zeraria os filtros que já
 * estavam aplicados.
 */
export function AdminSearchBox({
  action,
  name,
  defaultValue,
  placeholder,
  hidden,
}: {
  /** Rota da própria listagem. */
  action: string;
  /** Nome do parâmetro de busca na URL. */
  name: string;
  defaultValue: string;
  placeholder: string;
  /** Filtros atuais que precisam sobreviver ao envio. Vazios são ignorados. */
  hidden: Record<string, string>;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="relative h-[50px] w-[219px] shrink-0"
    >
      {Object.entries(hidden)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

      <Image
        src="/icons/search.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[25px] size-[20px] -translate-y-1/2"
      />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        maxLength={80}
        aria-label={placeholder}
        placeholder={placeholder}
        className="h-full w-full rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] pr-[20px] pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none placeholder:text-brand-placeholder focus-visible:border-brand-orange"
      />
    </form>
  );
}
