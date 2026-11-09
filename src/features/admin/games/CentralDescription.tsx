"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DescriptionPanel } from "@/features/admin/builder/BuilderPanels";
import { saveDescriptionAction } from "@/features/admin/builder/actions";
import type { Draft } from "@/features/admin/builder/types";
import { toGameDescription } from "@/features/game/description";
import { COMMON_FAQ_HREF } from "./central";

type Groups = Draft["descriptionGroups"];

/** Texto comum de TODOS os jogos (Dúvidas frequentes), só para referência. */
export type CommonFaq = { title: string; items: { question: string; answer: string }[] };


function toDraft(raw: unknown): Groups {
  // `key` só para o React; nunca vai ao servidor.
  return (toGameDescription(raw) ?? []).map((group) => ({
    key: crypto.randomUUID(),
    title: group.title,
    items: group.items.map((item) => ({ ...item, key: crypto.randomUUID() })),
  }));
}

function toPayload(groups: Groups) {
  return groups.map((group) => ({
    title: group.title,
    items: group.items.map(({ subtitle, text }) => ({ subtitle, text })),
  }));
}

/**
 * Aba "Descrição" da Central do jogo (2026-11-09, pedido do usuário: "o caminho
 * está muito longo, tem que ser padrão na aba de descrição da primeira página de
 * edição do jogo"). O mesmo editor da etapa 9 do Builder, gravando só a
 * descrição. Embaixo, o texto comum que a loja mostra ABAIXO dela em todos os
 * jogos — para quem edita ver o resultado inteiro e saber onde muda o comum.
 */
export function CentralDescription({
  gameId,
  initial,
  common,
}: {
  gameId: string;
  initial: unknown;
  common: CommonFaq;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Groups>(() => toDraft(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(toPayload(toDraft(initial))));
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(toPayload(groups)) !== saved, [groups, saved]);

  async function save() {
    setSaving(true);
    setStatus(null);
    const payload = toPayload(groups);
    const result = await saveDescriptionAction(gameId, payload).catch(() => null);
    setSaving(false);
    if (result?.ok) {
      setSaved(JSON.stringify(payload));
      setStatus({ kind: "ok", text: "Descrição publicada na loja." });
      router.refresh();
      return;
    }
    if (result && !result.ok && result.reason === "unauthenticated") {
      router.push(`/login?redirect=${encodeURIComponent(`/admin/jogos/${gameId}?secao=descricao`)}`);
      return;
    }
    setStatus({
      kind: "error",
      text: (result && !result.ok && result.message) || "Não conseguimos salvar agora. Tente novamente em instantes.",
    });
  }

  return (
    <section aria-labelledby="descricao-titulo" className="flex max-w-[860px] flex-col gap-[24px]">
      <div className="flex flex-col gap-[6px]">
        <h2 id="descricao-titulo" className="font-helvetica text-[20px] font-bold text-white">
          Descrição do jogo
        </h2>
        <p className="font-poppins text-[13px] leading-[20px] text-brand-fg-muted">
          O que você escrever aqui aparece <strong className="text-white">só neste jogo</strong>, no bloco de dúvidas
          da página, <strong className="text-white">acima</strong> do texto comum de todos os jogos.
        </p>
      </div>

      <DescriptionPanel draft={{ descriptionGroups: groups }} patch={(next) => setGroups(next.descriptionGroups)} />

      <div className="sticky bottom-[16px] z-10 flex flex-wrap items-center gap-[14px] rounded-full border border-white/10 bg-black/80 px-[16px] py-[10px] backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="h-[44px] rounded-full bg-[image:var(--brand-orange-gradient)] px-[26px] font-poppins text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "SALVANDO…" : "SALVAR DESCRIÇÃO"}
        </button>
        <p
          role={status?.kind === "error" ? "alert" : "status"}
          className={`font-poppins text-[13px] ${status?.kind === "error" ? "text-red-9" : "text-white/70"}`}
        >
          {status?.text ?? (dirty ? "Alterações não salvas." : "")}
        </p>
      </div>

      <div className="flex flex-col gap-[12px] rounded-[20px] border border-white/10 bg-black/20 p-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div>
            <p className="font-poppins text-[14px] font-bold text-white">Texto comum (abaixo, em todos os jogos)</p>
            <p className="font-poppins text-[12px] text-brand-fg-subtle">
              Não muda aqui: vale para todos os jogos. Mude em Páginas → Textos comuns dos jogos.
            </p>
          </div>
          <Link
            href={COMMON_FAQ_HREF}
            className="inline-flex h-[36px] items-center rounded-full border border-brand-orange px-[16px] font-poppins text-[12px] font-bold text-brand-orange transition-opacity hover:opacity-80"
          >
            Editar texto comum
          </Link>
        </div>
        {common.items.length > 0 ? (
          <div className="opacity-80">
            {common.title ? <p className="font-poppins text-[13px] font-bold text-white">{common.title}</p> : null}
            <ul className="mt-[8px] flex flex-col gap-[6px]">
              {common.items.map((item, index) => (
                <li key={index} className="font-poppins text-[12px] leading-[18px] text-brand-fg-muted">
                  <span className="font-bold text-white/80">{item.question}</span>
                  {item.answer ? <span className="line-clamp-2"> {item.answer}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="font-poppins text-[12px] text-brand-fg-subtle">O texto comum está vazio.</p>
        )}
      </div>
    </section>
  );
}
