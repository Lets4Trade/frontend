"use client";

import Link from "next/link";
import { SectionContentForm } from "@/features/admin/sections/SectionContentForm";
import type { SectionContent } from "@/features/site/list";
import type { GameOption, SiteSectionDef } from "@/features/site/sections";

/**
 * Conteúdo de uma SEÇÃO DO DESENHO (bloco `secao`) editado dentro do
 * construtor (fase 3, 2026-09-25) — antes o painel só mandava para outra tela.
 *
 * Os campos são o `SectionContentForm` (o mesmo de Configurações e de
 * Cabeçalho/Rodapé). O que este painel acrescenta é o aviso do rascunho:
 *
 * ⚠️ Diferente dos blocos novos, isto NÃO passa pelo rascunho: as seções do
 * desenho sempre gravaram direto (é o modelo `SiteSectionContent`). A tela
 * avisa, e a prévia recarrega depois de cada gravação para mostrar o efeito.
 */
export function LegacySectionPanel({
  fullKey,
  def,
  content,
  games,
  onSaved,
}: {
  /** `home:reviews`. */
  fullKey: string;
  def: SiteSectionDef;
  content: SectionContent | undefined;
  games: GameOption[];
  /** Depois de gravar: atualiza o estado do editor e recarrega a prévia. */
  onSaved: (content: SectionContent | null) => void;
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <p className="rounded-[12px] border border-brand-orange/40 bg-brand-orange/5 px-[12px] py-[10px] font-poppins text-[12px] leading-[18px] text-brand-fg-muted">
        Textos e imagens vão para a loja <strong className="text-white">ao salvar</strong>. Mudar a ordem ou esconder a
        seção só vale depois de <strong className="text-white">Publicar</strong>.
      </p>

      <SectionContentForm fullKey={fullKey} def={def} content={content} games={games} onSaved={onSaved} />

      {fullKey.startsWith("home:") ? (
        <p className="font-poppins text-[12px] text-brand-fg-subtle">
          Prefere clicar direto na página? Use a aba{" "}
          <Link href="/admin/paginas/desenho?pagina=home" className="text-brand-orange hover:underline">
            Textos e imagens
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
