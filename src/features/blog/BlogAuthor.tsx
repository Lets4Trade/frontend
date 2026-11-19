import Image from "next/image";
import { accountAvatar } from "@/features/account/gender";
import type { BlogAuthorView } from "./types";

/**
 * Quem escreveu a matéria (2026-11-09, pedido do usuário): a foto que a pessoa
 * subiu no site, o nome e, ao lado, o "cargo" escrito no post (ex.: Daniel ·
 * Especialista em Diablo). Sem foto, o avatar padrão; sem cargo, só o nome.
 * Foto com o aro laranja das outras fotos da equipe no site.
 */
export function BlogAuthor({
  author,
  className = "",
  size = "md",
}: {
  author: BlogAuthorView;
  className?: string;
  /** `sm`: a linha do card da lista (2026-11-18), foto de 40px. */
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <div className={`flex items-center ${small ? "gap-[12px]" : "gap-[14px]"} ${className}`}>
      <span
        className={`relative shrink-0 overflow-hidden rounded-full border-2 border-brand-orange bg-[#0a0a0a] ${
          small ? "size-[40px]" : "size-[52px]"
        }`}
      >
        <Image src={accountAvatar(author.avatar, null)} alt="" fill sizes={small ? "40px" : "52px"} className="object-cover" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-poppins text-[16px] leading-[22px] font-semibold text-white">
          {author.name}
        </span>
        {author.title ? (
          <span className="truncate font-helvetica text-[14px] leading-[20px] text-brand-placeholder">
            {author.title}
          </span>
        ) : null}
      </div>
    </div>
  );
}
