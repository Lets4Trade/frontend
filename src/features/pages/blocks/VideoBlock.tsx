import type { BlockPropsMap } from "../types";
import { BlockHeading } from "./shared";
import { VideoBlockPlayer } from "./VideoBlockPlayer";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * "Vídeo": YouTube embutido. O bloco guarda SÓ o ID (validado no backend e de
 * novo aqui) e a URL é montada num host fixo, `youtube-nocookie.com` — o
 * domínio que a CSP libera.
 *
 * Desde 2026-10-16 (pedido do usuário) o vídeo COMEÇA A TOCAR, mudo, quando o
 * bloco aparece na tela — o player e a regra moram em `VideoBlockPlayer`.
 */
export function VideoBlock({ props }: { props: BlockPropsMap["video"] }) {
  if (!VIDEO_ID.test(props.videoId)) return null;

  return (
    <section className="flex flex-col gap-[20px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <VideoBlockPlayer videoId={props.videoId} title={props.title ?? "Vídeo"} />
      {props.caption ? (
        <p className="font-poppins text-[15px] leading-[24px] text-brand-fg-muted">{props.caption}</p>
      ) : null}
    </section>
  );
}
