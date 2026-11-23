"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { cn } from "@/lib/cn";

/** Espera depois da última tecla antes de buscar. */
const DEBOUNCE_MS = 300;

/**
 * Busca das listagens do painel (219×50, lupa a 25px da borda) — as mesmas
 * medidas da busca da vitrine.
 *
 * EM TEMPO REAL (2026-11-22, pedido do usuário: "igual o pesquisar do user").
 * Antes era um `<form method="get">` puro, que só filtrava no Enter. Agora cada
 * tecla agenda a busca: 300 ms depois da última, a URL é TROCADA (`replace`,
 * não `push` — digitar não deve encher o histórico) e o servidor refaz a lista.
 *
 * Por que a busca continua NA URL e no SERVIDOR, e não filtrando no navegador:
 * as listas são paginadas no banco (pedidos, usuários, logs crescem sem
 * teto). Filtrar só a página carregada esconderia resultados das outras.
 *   - Performance: o debounce segura uma requisição por pausa de digitação, não
 *     uma por tecla; `useTransition` mantém a lista antiga na tela até a nova
 *     chegar (sem piscar) e a lupa pulsa enquanto isso.
 *   - Segurança: nada muda no contrato — o valor vai na query string como
 *     antes, com o mesmo `maxLength`, e o backend continua validando.
 *
 * O `<form>` fica: Enter busca na hora, e sem JavaScript ele ainda funciona
 * como antes. Os outros filtros viajam junto (`hidden`), e a página volta à 1
 * a cada busca — a 3ª página de uma busca antiga não existe na nova.
 *
 * O campo é NÃO controlado de propósito: enquanto a pessoa digita, a URL
 * anda atrás dela (300 ms + a resposta). Um campo controlado pela URL
 * apagaria as letras digitadas nesse meio-tempo.
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
  /** Filtros atuais que precisam sobreviver à busca. Vazios são ignorados. */
  hidden: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** O último termo enviado — evita buscar de novo o que já está na tela. */
  const sent = useRef(defaultValue.trim());

  // A URL mudou por outro caminho (link de filtro, voltar do navegador): o
  // campo acompanha, mas NUNCA enquanto a pessoa está digitando nele.
  useEffect(() => {
    sent.current = defaultValue.trim();
    const input = inputRef.current;
    if (input && document.activeElement !== input) input.value = defaultValue;
  }, [defaultValue]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function search(raw: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    const term = raw.trim();
    if (term === sent.current) return;
    sent.current = term;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(hidden)) {
      if (value !== "") params.set(key, value);
    }
    if (term !== "") params.set(name, term);
    const qs = params.toString();

    startTransition(() => {
      router.replace(qs ? `${action}?${qs}` : action, { scroll: false });
    });
  }

  return (
    <form
      action={action}
      method="get"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search(inputRef.current?.value ?? "");
      }}
      className="relative h-[50px] w-full shrink-0 sm:w-[219px]"
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
        className={cn(
          "pointer-events-none absolute top-1/2 left-[25px] size-[20px] -translate-y-1/2",
          pending && "animate-pulse",
        )}
      />
      <input
        ref={inputRef}
        type="search"
        name={name}
        defaultValue={defaultValue}
        maxLength={80}
        aria-label={placeholder}
        aria-busy={pending || undefined}
        placeholder={placeholder}
        onChange={(event) => {
          const value = event.target.value;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => search(value), DEBOUNCE_MS);
        }}
        className="h-full w-full rounded-full border border-brand-border bg-[image:var(--brand-surface-fill)] pr-[20px] pl-[60px] font-helvetica text-[15px] tracking-[0.15px] text-white outline-none placeholder:text-brand-placeholder focus-visible:border-brand-orange"
      />
    </form>
  );
}
