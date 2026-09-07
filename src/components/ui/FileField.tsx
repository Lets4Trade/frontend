"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";
import { Field, fieldSurface } from "./Field";

type FileFieldProps = {
  label: string;
  /** Texto da pílula enquanto nada foi escolhido ("Anexar imagem"). */
  placeholder: string;
  name: string;
  /** Passado ao `accept` do input E conferido de novo aqui. */
  accept: string;
  /** Teto em bytes. Acima disso o arquivo é recusado antes de sair da máquina. */
  maxBytes: number;
  error?: string;
  onFileChange?: (file: File | null) => void;
};

/**
 * Campo de arquivo com a MESMA pílula dos outros campos (Figma 4468:1869).
 *
 * Diferença que o arquivo desenha e que é fácil não ver: aqui o texto é
 * CENTRADO, enquanto nos campos de texto ele começa a 25px da borda. Faz
 * sentido — este controle é um botão, não uma caixa de digitar.
 *
 * O `<input type="file">` de verdade continua no DOM, só que invisível, dentro
 * de um `<label>`. Não é truque de estilo: é o que mantém o clique, o Tab, o
 * Enter e o leitor de tela funcionando. Trocar por um `<div onClick>` que chama
 * `input.click()` custaria os quatro.
 *
 * `sr-only` e não `display:none`: campo escondido com `display:none` sai da
 * ordem de foco e o teclado nunca chega nele.
 */
export function FileField({
  label,
  placeholder,
  name,
  accept,
  maxBytes,
  error,
  onFileChange,
}: FileFieldProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-file`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * O nome do arquivo é estado do React, mas o `form.reset()` mexe só no DOM —
   * ele esvazia o `<input>` e não avisa ninguém. Sem isto, depois de salvar o
   * formulário limpava tudo e a pílula continuava dizendo "foto.png", com o
   * input já vazio: o cadastro seguinte iria sem imagem enquanto a tela
   * afirmava que havia uma.
   *
   * O evento `reset` do próprio formulário é o gancho certo — vale para
   * qualquer `<form>` que use este campo, sem quem o usa precisar lembrar.
   */
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    function handleReset() {
      setFileName(null);
      setLocalError(null);
      onFileChange?.(null);
    }

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [onFileChange]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    // Teto conferido AQUI para a pessoa saber na hora, sem esperar o envio de
    // um arquivo grande terminar para descobrir que foi recusado. Não é a
    // defesa: quem recusa de verdade é o `limits.fileSize` do multer, no
    // backend, que ninguém contorna pelo DevTools.
    if (file && file.size > maxBytes) {
      const sizeInMb = Math.round(maxBytes / (1024 * 1024));
      setLocalError(`A imagem precisa ter no máximo ${sizeInMb} MB.`);
      setFileName(null);
      // Limpa o input: deixar o arquivo recusado selecionado faria o envio
      // levá-lo assim mesmo.
      if (inputRef.current) inputRef.current.value = "";
      onFileChange?.(null);
      return;
    }

    setLocalError(null);
    setFileName(file?.name ?? null);
    onFileChange?.(file);
  }

  const message = error ?? localError ?? undefined;

  return (
    <Field label={label} htmlFor={inputId} error={message} errorId={errorId}>
      <label
        htmlFor={inputId}
        className={cn(
          fieldSurface(message),
          "flex h-[50px] cursor-pointer items-center justify-center rounded-full text-center",
          "hover:border-brand-orange focus-within:border-brand-orange",
          fileName === null && "text-white/60",
        )}
      >
        {/* `truncate` porque nome de arquivo não tem limite e a pílula tem
            315px: sem isso o texto empurraria a borda e quebraria a coluna. */}
        <span className="truncate px-2">{fileName ?? placeholder}</span>

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          onChange={handleChange}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          className="sr-only"
        />
      </label>
    </Field>
  );
}
