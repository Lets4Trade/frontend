"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import {
  JOGOS,
  PLATAFORMAS,
  SERVIDORES,
  TIPOS_PRODUTO,
  sellSchema,
  type SellFormValues,
} from "./schema";
import { SELL_ERROR_MESSAGES, SellError, submitSellRequest } from "./sellService";

type FieldErrors = Partial<Record<keyof SellFormValues, string>>;

/**
 * Formulário "Venda pra nós" (Figma 2030:995).
 *
 * Duas colunas de 315px com 50px de vão — o mesmo grid do cadastro. A área de
 * descrição ocupa só a coluna da esquerda na quarta linha, como no design.
 */
export function SellForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "");
    const parsed = sellSchema.safeParse({
      jogo: read("jogo"),
      plataforma: read("plataforma"),
      servidor: read("servidor"),
      tipoProduto: read("tipoProduto"),
      discord: read("discord"),
      whatsapp: read("whatsapp"),
      descricao: read("descricao"),
    });

    if (!parsed.success) {
      const { fieldErrors: zodErrors } = parsed.error.flatten();
      const next: FieldErrors = {};
      for (const [key, messages] of Object.entries(zodErrors)) {
        const first = messages?.[0];
        if (first) next[key as keyof SellFormValues] = first;
      }
      setFieldErrors(next);
      setFormError(null);
      setSent(false);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSent(false);
    setIsSubmitting(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await submitSellRequest(parsed.data, controller.signal);
      setSent(true);
      setIsSubmitting(false);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setFormError(
        cause instanceof SellError
          ? SELL_ERROR_MESSAGES[cause.code]
          : SELL_ERROR_MESSAGES.unknown,
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col">
      <div className="grid grid-cols-1 gap-x-[50px] gap-y-[25px] md:grid-cols-2">
        <SelectField
          name="jogo"
          label="Jogo:"
          placeholder="Path Of Exile 2"
          options={JOGOS}
          error={fieldErrors.jogo}
        />
        <SelectField
          name="plataforma"
          label="Plataforma:"
          placeholder="Steam"
          options={PLATAFORMAS}
          error={fieldErrors.plataforma}
        />

        <SelectField
          name="servidor"
          label="Servidor:"
          placeholder="Servidor"
          options={SERVIDORES}
          error={fieldErrors.servidor}
        />
        <SelectField
          name="tipoProduto"
          label="Tipo de Produto:"
          placeholder="Gold"
          options={TIPOS_PRODUTO}
          error={fieldErrors.tipoProduto}
        />

        <TextField
          name="discord"
          label="Discord:"
          type="text"
          placeholder="Discord ID"
          error={fieldErrors.discord}
        />
        <TextField
          name="whatsapp"
          label="Número De Whatsapp:"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+55"
          error={fieldErrors.whatsapp}
        />

        <TextAreaField
          name="descricao"
          label="Descrição Sobre o Produto Vendido:"
          placeholder="Descrição"
          error={fieldErrors.descricao}
        />
      </div>

      {/* 50px depois da textarea (e não 25 como entre as linhas) — medido no
          design: textarea termina em 553 e o divisor fica em 603. */}
      <hr className="mt-[50px] border-0 border-t border-white/20" />

      {formError ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {formError}
        </p>
      ) : null}

      {sent ? (
        <p
          role="status"
          className="mt-[25px] rounded-2xl border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-center font-helvetica text-[14px] text-brand-orange"
        >
          Recebemos suas informações. Entraremos em contato em breve.
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="mt-[25px] w-full md:w-[315px]"
      >
        {isSubmitting ? "ENVIANDO..." : "ENVIAR INFORMAÇÕES"}
      </Button>
    </form>
  );
}
