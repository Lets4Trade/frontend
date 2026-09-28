import type { BlockPropsMap } from "../types";
import { Markdown } from "./markdown";
import { BlockHeading } from "./shared";

/**
 * "Texto formatado": largura de LEITURA (≈ 70 caracteres por linha), não a da
 * página — linha de 1800px cansa e faz o olho perder a próxima linha.
 */
export function RichTextBlock({ props }: { props: BlockPropsMap["richText"] }) {
  return (
    <section className="mx-auto flex w-full max-w-[860px] flex-col gap-[16px]">
      {props.title ? <BlockHeading>{props.title}</BlockHeading> : null}
      <Markdown source={props.body} />
    </section>
  );
}
