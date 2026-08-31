"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Linha de contato copiável (card "Contato Rápido" do Figma 2030:995).
 *
 * Mesma pílula dos campos: ícone da rede a 25px da borda esquerda, rótulo 15px
 * depois, botão de copiar a 25px da borda direita.
 *
 * O feedback de "copiado" vive 2s e é anunciado por `aria-live` — sem isso,
 * quem usa leitor de tela não tem como saber se a ação funcionou, já que a
 * única pista seria a troca do ícone.
 */
export function CopyRow({
  icon,
  iconSize = 20,
  label,
  value,
}: {
  icon: string;
  iconSize?: number;
  label: string;
  /** O que vai para a área de transferência (o rótulo é só o nome da rede). */
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa o timer no unmount: sem isso, sair da página antes dos 2s dispara
  // setState em componente desmontado.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // `navigator.clipboard` exige contexto seguro (HTTPS ou localhost) e pode
      // ser bloqueado por permissão. Falhar em silêncio é melhor que quebrar a
      // página — o usuário ainda consegue selecionar o texto manualmente.
    }
  }

  return (
    <div className="flex h-[50px] w-full items-center rounded-full border-2 border-[var(--brand-stroke-soft)] bg-[image:var(--brand-surface-fill)] px-[23px]">
      <Image
        src={icon}
        alt=""
        width={iconSize}
        height={iconSize}
        aria-hidden
        className="shrink-0"
      />

      <span className="ml-[15px] truncate font-poppins text-[16px] tracking-[0.16px] text-white">
        {label}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copiar ${label}`}
        className="ml-auto shrink-0 rounded-md transition-opacity hover:opacity-70"
      >
        <Image
          src="/icons/copy.svg"
          alt=""
          width={22}
          height={22}
          aria-hidden
        />
      </button>

      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copiado` : ""}
      </span>
    </div>
  );
}
