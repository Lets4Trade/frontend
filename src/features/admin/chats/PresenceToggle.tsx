"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toastError, toastOk } from "@/components/ui/Toasts";
import { fetchWithSession } from "@/lib/browserSession";
import { cn } from "@/lib/cn";
import { backendAsset } from "@/lib/publicApi";
import { getMyPresenceAction, setMyPresenceAction, uploadMyPhotoAction, type PresenceStatus } from "./presenceActions";

/**
 * Online/Offline + FOTO do atendente, no topo do painel (2026-10-16).
 *
 * Um grupo só, [foto | ● Online]: a foto é exatamente como o atendente aparece
 * no botão do chat da loja, e clicar nela troca a foto (selinho de câmera). O
 * resto do grupo liga e desliga o Online.
 *
 * Online = a foto aparece no chat da loja e o cabeçalho diz "Online". Enquanto
 * o painel estiver aberto (qualquer tela, em qualquer aba), um SINAL a cada
 * minuto mantém o status; fechou o painel ou o computador dormiu, o atendente
 * some da loja sozinho em até 3 minutos. Voltou com Online ligado, reaparece.
 *
 * O sinal vai do navegador direto ao backend (`/support/presence/heartbeat`),
 * fora de `/admin/`, para não virar uma linha de auditoria por minuto.
 */

const HEARTBEAT_MS = 60_000;
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export function PresenceToggle() {
  const router = useRouter();
  const [status, setStatus] = useState<PresenceStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const intent = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    getMyPresenceAction().then((result) => {
      if (!alive || !result.ok) return;
      intent.current = result.data.intent;
      // Online ligado = o painel aberto já é o sinal: aparece de novo na loja.
      setStatus(result.data);
      if (result.data.intent && !result.data.online) void beat();
    });
    const timer = setInterval(() => {
      if (intent.current) void beat();
    }, HEARTBEAT_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  function toggle() {
    if (!status) return;
    startTransition(async () => {
      const result = await setMyPresenceAction(!status.intent);
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      intent.current = result.data.intent;
      // Mescla em vez de trocar: um backend antigo devolve só o status, e a
      // foto/nome que a tela já tem não podem sumir por isso.
      setStatus((current) => ({ ...(current ?? result.data), ...result.data }));
    });
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("image", file, file.name);
      const result = await uploadMyPhotoAction(form);
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      setStatus((current) => (current ? { ...current, avatarUrl: result.data.avatarUrl } : current));
      toastOk("Foto trocada. É ela que aparece no chat da loja.");
      // O avatar do menu da conta é a mesma foto.
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (!status) return null;
  const online = status.intent;
  const photo = backendAsset(status.avatarUrl);

  return (
    <div
      className={cn(
        "flex h-[40px] shrink-0 items-center rounded-full border pl-[3px] transition-colors",
        online ? "border-[#22c55e]/60 bg-[#22c55e]/10" : "border-white/15 bg-black/40",
      )}
    >
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        aria-label={photo ? "Trocar sua foto do chat da loja" : "Enviar sua foto para o chat da loja"}
        title={
          photo
            ? "Sua foto no chat da loja. Clique para trocar."
            : "Sem foto: o chat da loja mostra sua inicial. Clique para enviar uma foto."
        }
        className="group relative size-[32px] shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none disabled:opacity-60"
      >
        <span className="relative block size-full overflow-hidden rounded-full">
          {photo ? (
            <Image src={photo} alt="" fill sizes="32px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center bg-[image:var(--brand-orange-gradient)] font-poppins text-[14px] font-bold text-white uppercase">
              {(status.name ?? "").charAt(0) || "?"}
            </span>
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 font-poppins text-[10px] text-white">
              …
            </span>
          ) : null}
        </span>
        {/* Selinho de câmera: a foto é clicável. */}
        <span
          aria-hidden
          className="absolute -right-[2px] -bottom-[2px] flex size-[15px] items-center justify-center rounded-full border border-black bg-white text-[9px] leading-none text-black transition-transform group-hover:scale-110"
        >
          <svg viewBox="0 0 16 16" className="size-[9px]" fill="currentColor" aria-hidden>
            <path d="M5.5 2 4.6 3.5H2.5A1.5 1.5 0 0 0 1 5v7.5A1.5 1.5 0 0 0 2.5 14h11a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5h-2.1L10.5 2h-5ZM8 5.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
          </svg>
        </span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label="Foto do atendente"
        onChange={(event) => void upload(event.target.files?.[0])}
      />

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={online}
        title={
          online
            ? "Você aparece no chat da loja. Clique para ficar offline."
            : "Clique para aparecer no chat da loja como atendente online."
        }
        className="flex h-full items-center gap-[8px] rounded-full pr-[14px] pl-[10px] font-poppins text-[13px] font-bold text-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none disabled:opacity-60"
      >
        <span
          aria-hidden
          className={cn("relative inline-block size-[9px] rounded-full", online ? "chat-dot-online bg-[#22c55e]" : "bg-[#ef4444]")}
        />
        {online ? "Online" : "Offline"}
      </button>
    </div>
  );
}

async function beat() {
  try {
    await fetchWithSession(`${API_URL}/support/presence/heartbeat`, {
      method: "POST",
      headers: { accept: "application/json", "x-pt-surface": "client" },
    });
  } catch {
    // Rede fora: o próximo sinal tenta de novo; sem sinal por 3 min, sai da loja.
  }
}
