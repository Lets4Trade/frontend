"use client";

import * as Select from "@radix-ui/react-select";
import Image from "next/image";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field, fieldSurface } from "./Field";

type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  options: readonly Option[];
  /**
   * Texto mostrado enquanto nada foi escolhido.
   *
   * OPCIONAL: quando o campo já nasce com uma opção escolhida (`defaultValue`),
   * não existe estado "nada escolhido" para descrever. Omita nesse caso.
   */
  placeholder?: string;
  error?: string;
  /** Sem `name` o valor não entra no `FormData` do formulário. */
  name?: string;
  /** Controlado. Use junto de `onValueChange`. */
  value?: string;
  /** Não controlado. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
};

/**
 * Select com a pílula dos campos de texto e um painel próprio de opções.
 *
 * ── Por que não é mais um `<select>` nativo ──────────────────────────────────
 * Era, e o motivo de trocar não é estético por capricho: a LISTA de um `<select>`
 * é desenhada pelo sistema operacional, não pela página. Nenhuma regra de CSS a
 * alcança — no Windows ela abre branca, com a fonte do sistema, no meio de um
 * tema escuro. Era o único pedaço da interface que não seguia a marca.
 *
 * O substituto é o `@radix-ui/react-select` — a mesma base que o shadcn/ui usa
 * para o componente dele. Isso importa porque a parte difícil de um dropdown de
 * verdade não é a aparência, é o comportamento que o `<select>` dava de graça e
 * que precisa ser reconstruído: navegação por setas, busca por digitação,
 * `aria-activedescendant`, foco preso enquanto aberto, Esc para fechar, clique
 * fora, rolagem do fundo travada e devolução do foco ao gatilho. Escrever isso à
 * mão é como um campo de formulário deixa de funcionar por teclado sem ninguém
 * perceber. O Radix já é a base do `UserMenu`, então não é dependência de um
 * padrão novo.
 *
 * O que se perde, conscientemente: no celular não abre mais o seletor em roda do
 * sistema. Em troca, a lista fica legível — e o projeto é desenhado em 1920.
 *
 * ── Envio em formulário ─────────────────────────────────────────────────────
 * Com `name`, o Radix renderiza um `<select>` nativo escondido espelhando o
 * valor. É o que mantém `new FormData(form)` funcionando sem que nenhum
 * formulário precise saber que o campo mudou por dentro.
 *
 * O painel repete a moldura do menu da conta (raio 20, `bg-brand-surface`,
 * borda e sombra) de propósito: são as duas superfícies flutuantes do site, e
 * duas aparências diferentes para a mesma ideia é o começo de um tema
 * inconsistente.
 */
export function SelectField({
  label,
  options,
  placeholder,
  error,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <Field label={label} htmlFor={selectId} error={error} errorId={errorId}>
      <Select.Root {...props}>
        <Select.Trigger
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            fieldSurface(error),
            // `pr-[23px]` e não o `px` inteiro: com `justify-between`, a seta
            // encosta nos mesmos 25px da borda EXTERNA que ela tinha antes
            // (23 de padding + 2 da borda).
            "group flex h-[50px] items-center justify-between gap-[10px] rounded-full pr-[23px] text-left",
            // Sem valor escolhido o texto é placeholder, não conteúdo.
            "data-[placeholder]:text-white/60",
            "disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          {/* `truncate` num span próprio: o rótulo de uma parcela
              ("12x de R$ 104,90 sem juros") é mais largo que a pílula de 315px,
              e sem o corte ele empurraria a seta para fora do campo. */}
          <span className="truncate">
            <Select.Value placeholder={placeholder} />
          </span>

          <Select.Icon asChild>
            <Image
              src="/icons/chevron-down.svg"
              alt=""
              width={18}
              height={18}
              aria-hidden
              className="shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
            />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            // `popper` (e não o padrão, que sobrepõe o gatilho): a lista desce a
            // partir do campo, como todo dropdown do site. O Radix também vira
            // para cima sozinho quando não há espaço embaixo.
            position="popper"
            sideOffset={8}
            className={cn(
              "brand-select-panel z-50 overflow-hidden rounded-[20px]",
              "border border-brand-border bg-brand-surface p-[8px]",
              "shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
              // A lista tem a largura do campo — uma lista mais estreita ou mais
              // larga que o gatilho lê como outro controle.
              "w-[var(--radix-select-trigger-width)]",
              // Nunca passa do espaço que sobra até a borda da janela. O Radix
              // mede isso e publica na variável; sem usá-la, uma lista longa
              // aberta perto do rodapé sai da tela em vez de rolar.
              "max-h-[var(--radix-select-content-available-height)]",
            )}
          >
            <Select.ScrollUpButton className="flex h-[20px] items-center justify-center text-white/60">
              <Chevron className="rotate-180" />
            </Select.ScrollUpButton>

            {/* Teto de altura + a barra laranja do site: listas longas (12
                parcelas, saldo de coins) rolam dentro do painel em vez de
                cobrir a tela inteira.

                320px e não 280: um item mede ~41px, então 280 cortava a lista
                de SETE opções por uns poucos pixels — e o painel ganhava uma
                seta de rolagem para revelar quase nada. 320 acomoda sete
                inteiros; de oito em diante rola de verdade. */}
            <Select.Viewport className="scrollbar-orange max-h-[320px] overflow-y-auto">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex cursor-pointer items-center rounded-[12px]",
                    "py-[10px] pr-[36px] pl-[12px]",
                    "font-poppins text-[14px] text-white outline-none transition-colors select-none",
                    // `highlighted` cobre mouse E teclado — é o Radix que
                    // unifica os dois, e é por isso que setear `:hover` sozinho
                    // deixaria a navegação por teclado sem realce nenhum.
                    "data-[highlighted]:bg-white/5",
                    "data-[state=checked]:text-brand-orange",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  )}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>

                  <Select.ItemIndicator className="absolute right-[12px] flex items-center">
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>

            <Select.ScrollDownButton className="flex h-[20px] items-center justify-center text-white/60">
              <Chevron />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Field>
  );
}

/**
 * Os dois ícones abaixo são desenhados aqui, e não lidos de `public/icons/`,
 * porque NÃO EXISTEM no arquivo do Figma: são afordâncias que o dropdown do
 * sistema resolvia sozinho e que passaram a ser nossas ao trocar o `<select>`.
 * A regra de nunca desenhar ícone à mão vale para ícone que o design definiu —
 * ali qualquer traço nosso estaria errado. Aqui não há original com que errar.
 *
 * `currentColor` para herdarem a cor do item (branco na lista, laranja no
 * escolhido) sem precisar de uma variante por estado.
 */
function Check({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M3.5 5.25L7 8.75L10.5 5.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
