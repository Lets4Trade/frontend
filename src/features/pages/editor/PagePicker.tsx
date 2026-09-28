"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SelectField } from "@/components/ui/SelectField";

export type PageOption = { slug: string; label: string };

/**
 * Troca a página em edição (Home, Venda, Fidelidade, cada jogo, Cabeçalho e
 * rodapé, Termos). Antes de sair, grava o rascunho pendente (`beforeLeave`) —
 * navegação dentro do app não dispara o aviso de "sair da página" do navegador,
 * então sem isto a última alteração se perderia em silêncio.
 */
export function PagePicker({
  current,
  pages,
  beforeLeave,
}: {
  current: string;
  pages: PageOption[];
  beforeLeave?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="w-[300px]">
      <SelectField
        label="Página"
        options={pages.map((page) => ({ value: page.slug, label: page.label }))}
        value={current}
        disabled={leaving}
        onValueChange={async (slug) => {
          if (slug === current) return;
          setLeaving(true);
          const saved = beforeLeave ? await beforeLeave() : true;
          if (!saved && !window.confirm("O rascunho desta página não foi salvo. Trocar mesmo assim?")) {
            setLeaving(false);
            return;
          }
          router.push(`/admin/paginas?pagina=${encodeURIComponent(slug)}`);
        }}
      />
    </div>
  );
}
