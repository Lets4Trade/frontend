import { redirect } from "next/navigation";
import { requirePanelArea } from "@/features/admin/guard";

/**
 * `/admin/builder` sem jogo → lista de Jogos.
 *
 * Até 2026-10-16 esta era a grade de jogos do EDITOR (ele não tinha a lista de
 * Jogos, que era catálogo só-ADMIN). Desde que o EDITOR cuida do catálogo, os
 * dois cargos de conteúdo usam `/admin/jogos`, onde cada linha já tem o atalho
 * para o Builder do jogo. A rota continua existindo para links antigos.
 */
export default async function BuilderPickerPage() {
  await requirePanelArea("content");
  redirect("/admin/jogos");
}
