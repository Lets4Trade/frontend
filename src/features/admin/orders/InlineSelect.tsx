"use client";

import * as Select from "@radix-ui/react-select";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string };

/**
 * Escolha DENTRO de uma célula da tabela — a pílula de situação e o entregador
 * de "Vendas e pedidos" (Figma 2546:1136).
 *
 * ── Por que existe, em vez do `SelectField` ────────────────────────────────
 * O `SelectField` é um CAMPO DE FORMULÁRIO: traz rótulo, área de erro e uma
 * pílula de 50px de altura. Numa linha de tabela de 24px nada disso cabe, e o
 * rótulo já é o cabeçalho da coluna.
 *
 * O que os dois compartilham é o que importa: o PAINEL de opções é o mesmo
 * (raio 20, `bg-brand-surface`, borda e sombra), porque duas aparências
 * diferentes para a mesma ideia é o começo de um tema inconsistente.
 *
 * ── Por que não é mais um `<select>` nativo ────────────────────────────────
 * Era, com o argumento de que quinze menus flutuantes numa tela custariam mais
 * do que a aparência ganha. O argumento estava errado nos dois lados:
 *
 *  • CUSTO: o Radix só monta o painel quando ABRE. O que existe por linha é um
 *    `<button>` — mais barato que o `<select>` que estava lá.
 *  • APARÊNCIA: no Windows o `<select>` desenha a própria seta cinza, quadrada,
 *    dentro da pílula colorida do arquivo. Era o único ponto do painel que não
 *    seguia a marca, e é exatamente o que o projeto já tinha decidido não fazer
 *    quando trocou o `SelectField` (ver o cabeçalho daquele arquivo).
 *
 * A regra vale sem exceção: **nenhum `<select>` nativo no tema escuro.**
 *
 * ── A pílula ───────────────────────────────────────────────────────────────
 * 24px de altura, raio total e borda branca a 5% — as medidas do arquivo.
 *
 * ── SEM SETA, e por que ────────────────────────────────────────────────────
 * Houve aqui uma `chevron-down.svg` de 12px com `opacity-0`, que só aparecia no
 * hover: a ideia era não mudar a leitura da tabela parada (no arquivo a pílula
 * é um RÓTULO, sem seta) e ainda assim dizer que clica.
 *
 * Deu errado pelo motivo mais banal: **`opacity-0` esconde, mas não tira do
 * layout.** A seta invisível continuava ocupando 12px à direita do texto, então
 * o rótulo ficava visivelmente descentrado dentro da própria pílula — e só na
 * de Status, que é a mais estreita em relação ao texto.
 *
 * A afordância agora é BRILHO e BORDA no hover e no aberto. Nenhum dos dois
 * ocupa espaço, então o texto fica no centro exato em qualquer estado, e a
 * tabela parada é idêntica ao arquivo.
 *
 * Regra que vale para qualquer célula desta tabela: **afordância que aparece no
 * hover não pode ocupar espaço no layout.** Se ocupar, a linha parada já está
 * errada.
 */
export function InlineSelect({
  value,
  options,
  onValueChange,
  disabled,
  ariaLabel,
  className,
  placeholder,
  display,
}: {
  value: string;
  options: readonly Option[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  /** Cores da pílula. Vazio = a variante neutra do entregador. */
  className?: string;
  placeholder?: string;
  /**
   * O que o GATILHO mostra, quando difere do rótulo da opção.
   *
   * Existe por causa do entregador: na lista aberta a opção precisa dizer "Sem
   * atendente" (um "—" solto não se escolhe), mas a coluna tem 134px e esse
   * texto cortaria na pílula. Na célula fechada o traço é o que o resto da
   * tabela já usa para campo vazio (`orDash`).
   */
  display?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          // `w-fit` com piso de 100px: é a medida do arquivo, onde a pílula tem
          // 100px e cresce para 117 em "Em andamento". `w-full` esticava até a
          // borda da coluna e engordava a pílula.
          "group mx-auto flex h-[24px] w-fit min-w-[100px] max-w-full items-center justify-center",
          "rounded-full border border-white/5 px-[10px]",
          // Helvetica 14/0.14px como no arquivo — NÃO negrito. A pílula do
          // arquivo é regular; o negrito veio do `<select>` anterior.
          "font-helvetica text-[14px] tracking-[0.14px] whitespace-nowrap",
          // A afordância de clique NÃO pode ocupar espaço — ver o cabeçalho.
          // Brilho e borda mudam sozinhos, sem deslocar um pixel do texto.
          "cursor-pointer outline-none transition-all duration-150",
          "hover:border-white/25 hover:brightness-125",
          "data-[state=open]:border-white/25 data-[state=open]:brightness-125",
          "focus-visible:ring-1 focus-visible:ring-white/40",
          "disabled:cursor-wait disabled:opacity-60",
          className,
        )}
      >
        {/* `truncate` num span próprio: "Em andamento" é o rótulo mais largo e
            a coluna é estreita. */}
        <span className="truncate">
          {/* Filho de `Select.Value` sobrescreve o rótulo da opção escolhida —
              é assim que o Radix separa o que a lista diz do que a célula
              mostra. Sem filho, ele desenha o texto do item. */}
          <Select.Value placeholder={placeholder}>{display}</Select.Value>
        </span>

      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "brand-select-panel z-50 overflow-hidden rounded-[20px]",
            "border border-brand-border bg-brand-surface p-[8px]",
            "shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
            // `min-w` e não `w`: a pílula tem 100px e um nome de atendente é
            // mais largo que isso. O painel acompanha o gatilho como piso, e
            // cresce com o conteúdo.
            "min-w-[var(--radix-select-trigger-width)]",
            "max-h-[var(--radix-select-content-available-height)]",
          )}
        >
          <Select.Viewport className="scrollbar-orange max-h-[280px] overflow-y-auto">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex cursor-pointer items-center rounded-[12px]",
                  "py-[8px] pr-[32px] pl-[12px]",
                  "font-poppins text-[14px] whitespace-nowrap text-white",
                  "outline-none transition-colors select-none",
                  // `highlighted` cobre mouse E teclado: só `:hover` deixaria a
                  // navegação por setas sem realce nenhum.
                  "data-[highlighted]:bg-white/5",
                  "data-[state=checked]:text-brand-orange",
                )}
              >
                <Select.ItemText>{option.label}</Select.ItemText>

                <Select.ItemIndicator className="absolute right-[12px] flex items-center">
                  <Check />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

/**
 * O mesmo tique do `SelectField`, desenhado à mão pelo mesmo motivo: ele NÃO
 * existe no arquivo do Figma — é uma afordância que o dropdown do sistema
 * resolvia sozinho e que passou a ser nossa ao trocar o `<select>`. A regra de
 * nunca desenhar ícone à mão vale para ícone que o design definiu.
 */
function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
