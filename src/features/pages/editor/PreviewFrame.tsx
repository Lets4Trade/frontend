"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Block, PageRefs } from "../types";
import { isPreviewMessage, type EditorToPreview } from "./protocol";

const DEVICES = {
  desktop: { label: "Computador", width: 1920 },
  tablet: { label: "Tablet", width: 820 },
  mobile: { label: "Celular", width: 390 },
} as const;
type Device = keyof typeof DEVICES;

/**
 * A prévia: a página REAL (`/previa/[slug]`) num iframe da largura do aparelho
 * escolhido, escalada para caber na coluna. Iframe e não um `div` porque os
 * pontos de quebra do site são por largura de TELA — só uma janela de 390px de
 * verdade mostra o celular de verdade.
 *
 * O estado vivo do editor (inclusive o que ainda não foi salvo) vai por
 * `postMessage`; um clique num bloco lá dentro volta como "selecionar".
 */
export function PreviewFrame({
  slug,
  blocks,
  refs,
  selectedId,
  onSelect,
  reloadNonce = 0,
}: {
  slug: string;
  blocks: Block[];
  refs: PageRefs;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Muda = recarregar a prévia do zero (conteúdo do servidor mudou). */
  reloadNonce?: number;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Mede a coluna uma vez na hora e depois acompanha — mesma cautela do
  // `useScaledPreview`: o ResizeObserver não dispara em aba de segundo plano.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type === "ready") setReady(true);
      if (event.data.type === "select") onSelect(event.data.id);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSelect]);

  useEffect(() => {
    if (!ready) return;
    const message: EditorToPreview = { source: "l4t-editor", type: "render", blocks, refs, selectedId };
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [ready, blocks, refs, selectedId]);

  // Recarga pedida de fora: a prévia nova avisa "pronta" de novo.
  const [seenNonce, setSeenNonce] = useState(reloadNonce);
  if (seenNonce !== reloadNonce) {
    setSeenNonce(reloadNonce);
    setReady(false);
  }

  const width = DEVICES[device].width;
  const scale = box.width > 0 ? Math.min(1, box.width / width) : 1;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[10px]">
      <div className="flex items-center justify-center gap-[6px]">
        {(Object.keys(DEVICES) as Device[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={device === key}
            onClick={() => {
              if (key === device) return;
              // A prévia remonta com a largura nova e avisa "pronta" de novo.
              setReady(false);
              setDevice(key);
            }}
            className={cn(
              "h-[32px] rounded-full border px-[14px] font-poppins text-[12px] transition-colors",
              device === key ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-white/60 hover:text-white",
            )}
          >
            {DEVICES[key].label}
          </button>
        ))}
      </div>

      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-brand-border bg-black">
        {box.width > 0 ? (
          <iframe
            ref={frameRef}
            // `key` pelo aparelho: trocar a largura recarrega a prévia do zero,
            // e ela pede o estado ao editor de novo ("ready").
            key={`${device}-${reloadNonce}`}
            src={`/previa/${slug}`}
            title="Prévia da página"
            className="absolute top-0 left-1/2 origin-top border-0 bg-brand-bg"
            style={{
              width,
              height: box.height / scale,
              transform: `translateX(-50%) scale(${scale})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
