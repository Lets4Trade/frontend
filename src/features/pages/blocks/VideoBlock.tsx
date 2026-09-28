import type { BlockPropsMap } from "../types";
import { BlockHeading } from "./shared";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * "Vídeo": YouTube embutido. O bloco guarda SÓ o ID (validado no backend e de
 * novo aqui) e a URL é montada num host fixo, `youtube-nocookie.com` — o
 * domínio que a CSP libera e que não grava cookie de rastreio antes do play.
 * Sem `autoplay`: vídeo que toca sozinho no meio da home é intrusivo.
 */
export function VideoBlock({ props }: { props: BlockPropsMap["video"] }) {
  if (!VIDEO_ID.test(props.videoId)) return null;

  return (
    <section className="flex flex-col gap-[20px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <div className="relative aspect-video w-full overflow-hidden rounded-[30px] border border-brand-border bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${props.videoId}?rel=0`}
          title={props.title ?? "Vídeo"}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      {props.caption ? (
        <p className="font-poppins text-[15px] leading-[24px] text-brand-fg-muted">{props.caption}</p>
      ) : null}
    </section>
  );
}
