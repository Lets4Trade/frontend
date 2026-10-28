"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ACCOUNT_ERROR_MESSAGES, AccountError, completeProfile } from "./accountService";
import { GenderField } from "./GenderField";
import type { Gender } from "./gender";
import { completeProfileSchema, type CompleteProfileValues } from "./schema";

type FieldErrors = Partial<Record<keyof CompleteProfileValues, string>>;

/**
 * "Complete seu cadastro" (2026-10-28, pedido do usuário): WhatsApp para a
 * equipe conseguir falar com o cliente e gênero para o avatar de quem não tem
 * foto. Aparece depois do login com Google/Discord quando falta um dos dois.
 *
 * Dá para PULAR ("Agora não"): travar quem está no meio de uma compra por causa
 * de um dado de contato custaria a venda. Pulou, a tela volta no próximo login
 * social enquanto faltar algo.
 *
 * `next`: para onde a pessoa ia — já conferido como caminho interno pela página.
 */
export function CompleteProfileForm({
  next,
  defaults,
}: {
  next: string;
  defaults: { whatsapp: string; gender: Gender | null };
}) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const data = new FormData(event.currentTarget);
    const parsed = completeProfileSchema.safeParse({
      whatsapp: String(data.get("whatsapp") ?? ""),
      gender: String(data.get("gender") ?? ""),
    });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({ whatsapp: errors.whatsapp?.[0], gender: errors.gender?.[0] });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await completeProfile(parsed.data, controller.signal);
      // `refresh`: o cabeçalho (servidor) troca o avatar neutro pelo do gênero.
      router.replace(next);
      router.refresh();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setFormError(
        cause instanceof AccountError ? cause.message || ACCOUNT_ERROR_MESSAGES[cause.code] : ACCOUNT_ERROR_MESSAGES.unknown,
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col">
      <h1 id="completar-heading" className="font-helvetica text-[25px] leading-[30px] font-bold text-white">
        Complete seu cadastro
      </h1>
      <p className="mt-[10px] font-helvetica text-[15px] leading-[22px] text-brand-fg-muted">
        Seu WhatsApp ajuda a equipe a falar com você sobre o pedido, se precisar.
      </p>

      <div className="mt-[30px] flex flex-col gap-[25px]">
        <TextField
          name="whatsapp"
          label="WhatsApp"
          type="tel"
          mask="phone"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          defaultValue={defaults.whatsapp}
          error={fieldErrors.whatsapp}
        />
        <GenderField compact defaultValue={defaults.gender} error={fieldErrors.gender} />
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-[25px] rounded-2xl border border-red-9/40 bg-red-9/10 px-4 py-3 text-center font-helvetica text-[14px] text-red-9"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-[30px] flex flex-col gap-[14px]">
        <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "SALVANDO…" : "SALVAR E CONTINUAR"}
        </Button>
        {/* Pular é um link para o destino: sem JavaScript, sem gravar nada. */}
        <Link
          href={next}
          className="text-center font-poppins text-[14px] text-brand-fg-muted underline decoration-white/30 underline-offset-[3px] hover:text-white"
        >
          Agora não
        </Link>
      </div>
    </form>
  );
}
