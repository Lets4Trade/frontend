import Image from "next/image";
import { backendAsset } from "@/lib/publicApi";

/**
 * Rosto de quem respondeu pela equipe (2026-10-23) — no popup, no chat do
 * pedido e no painel. Mesma moldura do `AttendantStack` (aro laranja), para a
 * pessoa que aparece "online" no botão ser reconhecida na conversa.
 *
 * Sem foto (conta sem foto, Discord sem avatar próprio, mensagem antiga): a
 * inicial do nome; sem nome também, o "S" de Suporte.
 */
export function StaffAvatar({
  name,
  avatarUrl,
  size,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size: number;
}) {
  const src = backendAsset(avatarUrl);
  return (
    <span
      aria-hidden
      title={name || undefined}
      className="relative block shrink-0 overflow-hidden rounded-full ring-2 ring-brand-orange ring-offset-2 ring-offset-black"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} quality={90} className="object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center bg-[image:var(--brand-orange-gradient)] font-poppins font-bold text-white uppercase"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {(name || "Suporte").charAt(0)}
        </span>
      )}
    </span>
  );
}
