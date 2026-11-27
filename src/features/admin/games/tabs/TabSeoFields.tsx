"use client";

import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { buildSeoDescription, buildTabTitle, titleHasBrand } from "@/features/game/seo";
import { SITE_TITLE_NAME } from "@/lib/siteTitle";
import {
  SEO_DESCRIPTION_IDEAL,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_IDEAL,
  SEO_TITLE_MAX
} from "./types";

/**
 * "Aparência no Google" de uma aba (2026-11-27, troca do site antigo).
 *
 * Dois campos e uma PRÉVIA do resultado, montada com a MESMA regra da página
 * (`features/game/seo.ts`): o que aparece aqui é o que vai ao ar. Vazio = o
 * automático, mostrado no placeholder e na prévia — assim quem não quer mexer
 * vê o que já está valendo.
 *
 * O contador fica laranja passando do que o Google costuma mostrar (~60 no
 * título, ~155 na descrição): não é erro, o resto só não aparece no resultado.
 */
export function TabSeoFields({
  gameName,
  gameSlug,
  tabSlug,
  layout,
  label,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  gameName: string;
  gameSlug: string;
  /** O slug da aba (fallback do nome vazio no automático). */
  tabSlug: string;
  layout: string;
  /** O nome da aba como está no formulário (o automático o acompanha). */
  label: string;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  const autoTitle = buildTabTitle(gameName, { label: label.trim() || tabSlug, layout });
  const autoDescription = buildSeoDescription(gameName, { label: label.trim() || tabSlug, layout });
  const shownTitle = title.trim() || autoTitle;
  const fullTitle = titleHasBrand(shownTitle) ? shownTitle : `${shownTitle} | ${SITE_TITLE_NAME}`;
  const shownDescription = description.trim() || autoDescription;

  return (
    <div className="max-w-[900px]">
      <p className="font-poppins text-[15px] font-bold text-white">Aparência no Google</p>
      <p className="mt-[4px] mb-[15px] font-helvetica text-[13px] leading-[19px] text-white/60">
        O título e a frase que aparecem na pesquisa. Use as palavras que o cliente digita (ex.: “Divine Orb”). Vazio =
        automático.
      </p>

      <div className="flex flex-col gap-[15px]">
        <div>
          <TextField
            label="Título no Google"
            value={title}
            maxLength={SEO_TITLE_MAX}
            placeholder={autoTitle}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <Counter value={title} ideal={SEO_TITLE_IDEAL} max={SEO_TITLE_MAX} />
        </div>
        <div>
          <TextAreaField
            label="Descrição no Google"
            value={description}
            maxLength={SEO_DESCRIPTION_MAX}
            placeholder={autoDescription}
            className="h-[100px]"
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          <Counter value={description} ideal={SEO_DESCRIPTION_IDEAL} max={SEO_DESCRIPTION_MAX} />
        </div>
      </div>

      {/* Prévia do resultado: o Google corta o título e a descrição no fim da
          linha — o `line-clamp` imita esse corte. */}
      <div
        aria-label="Prévia do resultado no Google"
        className="mt-[15px] rounded-[16px] border border-white/10 bg-white px-[20px] py-[15px]"
      >
        <p className="truncate font-helvetica text-[12px] text-[#4d5156]">lets4trade.com.br › {gameSlug}</p>
        <p className="mt-[2px] line-clamp-1 font-helvetica text-[19px] leading-[26px] text-[#1a0dab]">{fullTitle}</p>
        <p className="mt-[2px] line-clamp-2 font-helvetica text-[13px] leading-[20px] text-[#4d5156]">
          {shownDescription}
        </p>
      </div>
    </div>
  );
}

function Counter({ value, ideal, max }: { value: string; ideal: number; max: number }) {
  const length = value.trim().length;
  if (length === 0) return null;
  return (
    <p
      className={cn(
        "mt-[6px] pl-[25px] font-helvetica text-[12px]",
        length > ideal ? "text-brand-orange" : "text-white/50",
      )}
    >
      {length}/{max}
      {length > ideal ? ` — o Google costuma mostrar até ~${ideal}` : ""}
    </p>
  );
}
