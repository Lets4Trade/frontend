"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { ACTION_FAILED_MESSAGE, runAction } from "@/lib/safeAction";
import {
  deleteDeliveryProofAction,
  listDeliveryProofsAction,
  uploadDeliveryProofAction,
  type DeliveryProof,
} from "./deliveryProofActions";
import { formatDateTime } from "./types";

/** Mesmo teto do backend (`MAX_DELIVERY_PROOFS`). */
const MAX_PROOFS = 5;

/**
 * Comprovantes de ENTREGA do pedido (2026-10-23, pedido do usuário): a equipe
 * envia os prints aqui e o cliente vê na tela do pedido, junto do comprovante
 * de pagamento.
 *
 * As imagens são PRIVADAS: `<img>` direto na rota do backend com login (o
 * cookie de sessão viaja junto por ser same-site). `next/image` não serve — o
 * otimizador busca do servidor do Next, sem o cookie de quem está vendo.
 */
export function DeliveryProofsSection({
  reference,
  apiOrigin,
  className = "mt-[28px]",
}: {
  reference: string;
  apiOrigin: string;
  /** Margem de cima: o diálogo de "Vendas e pedidos" e o quadro do chat (2026-10-28) diferem. */
  className?: string;
}) {
  const [proofs, setProofs] = useState<DeliveryProof[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reload() {
    startTransition(async () => {
      const result = await runAction(() => listDeliveryProofsAction(reference), {
        ok: false as const,
        message: ACTION_FAILED_MESSAGE,
      });
      if (result.ok) {
        setProofs(result.data);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  // Carrega ao abrir o diálogo; o estado só muda depois do `await`.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
  }, []);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    const room = MAX_PROOFS - (proofs?.length ?? 0);
    if (files.length === 0) return;
    if (files.length > room) {
      toastError(`Cabem só mais ${room} comprovante(s) neste pedido.`);
      return;
    }
    startTransition(async () => {
      let sent = 0;
      for (const file of files) {
        const form = new FormData();
        form.set("image", file);
        const result = await runAction(() => uploadDeliveryProofAction(reference, form), {
          ok: false as const,
          message: ACTION_FAILED_MESSAGE,
        });
        if (!result.ok) {
          toastError(result.message);
          break;
        }
        sent += 1;
      }
      if (sent > 0) toastOk(sent === 1 ? "Comprovante enviado. O cliente já vê no pedido." : `${sent} comprovantes enviados.`);
      const list = await runAction(() => listDeliveryProofsAction(reference), {
        ok: false as const,
        message: ACTION_FAILED_MESSAGE,
      });
      if (list.ok) setProofs(list.data);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await runAction(() => deleteDeliveryProofAction(reference, id), {
        ok: false as const,
        message: ACTION_FAILED_MESSAGE,
      });
      setConfirming(null);
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      setProofs((current) => (current ?? []).filter((proof) => proof.id !== id));
    });
  }

  const count = proofs?.length ?? 0;
  const fileUrl = (id: string) =>
    `${apiOrigin}/api/v1/admin/orders/${encodeURIComponent(reference)}/delivery-proofs/${encodeURIComponent(id)}/file`;

  return (
    <section className={className} aria-labelledby={`proofs-${reference}`}>
      {/* Quebra de linha: no quadro do chat (400px) título e botão não cabem lado a lado. */}
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <h3
          id={`proofs-${reference}`}
          className="font-poppins text-[13px] font-bold tracking-[0.06em] text-brand-fg-subtle uppercase"
        >
          Comprovantes de entrega {proofs ? `(${count}/${MAX_PROOFS})` : ""}
        </h3>
        <button
          type="button"
          disabled={pending || proofs === null || count >= MAX_PROOFS}
          onClick={() => inputRef.current?.click()}
          className="h-[36px] rounded-full border border-brand-orange bg-[image:var(--brand-surface-fill)] px-[16px] font-poppins text-[13px] font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Enviando..." : "+ Enviar comprovante"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          hidden
          onChange={handleFiles}
        />
      </div>
      <p className="mt-[6px] font-helvetica text-[12px] text-brand-fg-subtle">
        Prints da entrega (PNG, JPEG ou WebP, até 5 MB cada). O cliente vê na tela do pedido.
      </p>

      {error ? (
        <p role="alert" className="mt-[10px] font-helvetica text-[13px] text-red-9">
          {error}
        </p>
      ) : proofs === null ? (
        <p className="mt-[10px] font-helvetica text-[13px] text-brand-fg-subtle">Carregando…</p>
      ) : count === 0 ? (
        <p className="mt-[10px] rounded-[14px] border border-dashed border-white/15 px-[14px] py-[16px] text-center font-helvetica text-[13px] text-brand-fg-subtle">
          Nenhum comprovante de entrega ainda.
        </p>
      ) : (
        <ul className="mt-[12px] grid grid-cols-2 gap-[12px] sm:grid-cols-3">
          {proofs.map((proof) => (
            <li key={proof.id} className="overflow-hidden rounded-[14px] border border-white/10 bg-black/30">
              <a href={fileUrl(proof.id)} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem privada, ver o topo */}
                <img src={fileUrl(proof.id)} alt="Comprovante de entrega" loading="lazy" className="h-[110px] w-full object-cover" />
              </a>
              <div className="flex items-center justify-between gap-[6px] px-[10px] py-[8px]">
                <span className="truncate font-helvetica text-[11px] text-brand-fg-subtle" title={proof.uploadedBy ?? undefined}>
                  {formatDateTime(proof.createdAt)}
                </span>
                {confirming === proof.id ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(proof.id)}
                    className="shrink-0 font-poppins text-[11px] font-bold text-red-9 hover:underline"
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirming(proof.id)}
                    className="shrink-0 font-poppins text-[11px] text-white/60 hover:text-red-9"
                  >
                    Apagar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
