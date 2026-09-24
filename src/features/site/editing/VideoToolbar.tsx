"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Painel flutuante do VÍDEO de uma sessão no editor de páginas (2026-09-17).
 *
 * Clicar no vídeo abre isto em vez do seletor de arquivo: o bloco tem TRÊS
 * coisas para trocar — a capa (imagem), o vídeo enviado (arquivo) e o link do
 * YouTube — e um clique não diria qual. Mesmo espírito da `ItemToolbar`: fica
 * no editor, nunca no componente da loja.
 *
 * Arquivo e link são exclusivos: publicar um apaga o outro (backend).
 */
export type VideoSelection = {
  key: string;
  rect: { top: number; left: number; width: number };
  /** O que está valendo hoje, para o painel dizer. */
  current: "file" | "link" | "none";
  link: string;
};

export function VideoToolbar({
  selection,
  busy,
  progress,
  onChangeCover,
  onPickVideo,
  onSaveLink,
  onRemove,
  onClose,
}: {
  selection: VideoSelection;
  busy: boolean;
  /** 0..1 durante o upload do arquivo; `null` fora dele. */
  progress: number | null;
  onChangeCover: () => void;
  onPickVideo: () => void;
  onSaveLink: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [link, setLink] = useState(selection.link);
  const { rect, current } = selection;

  const status =
    current === "file"
      ? "Tocando: vídeo enviado"
      : current === "link"
        ? "Tocando: link do YouTube"
        : "Sem vídeo — só a capa aparece";

  return (
    <div
      role="dialog"
      aria-label="Vídeo da sessão"
      className="fixed z-50 flex w-[420px] flex-col gap-[10px] rounded-[18px] border border-brand-border bg-brand-surface/95 p-[14px] shadow-[0_10px_30px_rgba(0,0,0,.5)] backdrop-blur-[10px]"
      style={{ top: Math.max(8, rect.top + 12), left: Math.max(8, rect.left + 12) }}
    >
      <div className="flex items-center justify-between">
        <span className="font-poppins text-[13px] font-semibold text-white">{status}</span>
        <Button onClick={onClose} disabled={busy} label="Fechar">
          ✕
        </Button>
      </div>

      {progress !== null ? (
        <div aria-live="polite" className="flex flex-col gap-[6px]">
          <span className="font-helvetica text-[12px] text-brand-fg-subtle">
            Enviando vídeo… {Math.round(progress * 100)}%
          </span>
          <div className="h-[6px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-orange transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* O LINK vem primeiro (2026-09-24): era um campo miúdo embaixo do
          "enviar vídeo", e o usuário achou que o painel só aceitava upload. */}
      <form
        className="flex flex-col gap-[6px]"
        onSubmit={(event) => {
          event.preventDefault();
          onSaveLink(link);
        }}
      >
        <label htmlFor="video-link" className="font-poppins text-[12px] font-bold text-white/80">
          Link do YouTube
        </label>
        <div className="flex gap-[6px]">
          <input
            id="video-link"
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            maxLength={200}
            disabled={busy}
            autoFocus
            className="h-[38px] min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-[14px] font-helvetica text-[13px] text-white outline-none focus:border-brand-orange"
          />
          <button
            type="submit"
            disabled={busy || link.trim() === ""}
            className="h-[38px] rounded-full bg-brand-orange px-[16px] font-poppins text-[13px] font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            usar link
          </button>
        </div>
        <span className="font-helvetica text-[11px] leading-[15px] text-brand-fg-subtle">
          Aceita youtube.com/watch, youtu.be, /shorts e /live.
        </span>
      </form>

      <div className="flex items-center gap-[8px]" aria-hidden>
        <span className="h-px flex-1 bg-white/10" />
        <span className="font-helvetica text-[11px] text-brand-fg-subtle">ou envie um arquivo</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="flex flex-wrap gap-[6px]">
        <Button onClick={onPickVideo} disabled={busy}>
          enviar vídeo (MP4/WebM, até 100 MB)
        </Button>
        <Button onClick={onChangeCover} disabled={busy}>
          trocar capa
        </Button>
        {current !== "none" ? (
          <Button onClick={onRemove} disabled={busy} tone="danger">
            remover vídeo
          </Button>
        ) : null}
      </div>

      <p className="font-helvetica text-[11px] leading-[15px] text-brand-fg-subtle">
        Um link substitui o vídeo enviado, e enviar um vídeo substitui o link. Publica na hora.
      </p>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  tone,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "h-[28px] rounded-full border border-white/10 px-[12px] font-poppins text-[12px] transition-colors",
        tone === "danger" ? "text-red-9 hover:bg-red-9/15" : "text-white/85 hover:bg-white/10",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
