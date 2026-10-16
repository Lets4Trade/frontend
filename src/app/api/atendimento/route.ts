import { getSupportPresence } from "@/features/support/presence";

/**
 * Atendentes online para a ABA JÁ ABERTA (2026-10-16): o cabeçalho e o botão
 * do chat chegam renderizados no servidor, e a página consulta isto de tempos
 * em tempos (`usePresence`) para não mostrar "online" de quem já saiu.
 *
 * Por que uma rota do Next e não o backend direto: a leitura é a MESMA
 * cacheada de 30 s (`getSupportPresence`), então mil abas abertas custam uma
 * ida ao backend a cada 30 s por instância — não mil. E o navegador não precisa
 * falar com outra origem.
 */
export async function GET() {
  const presence = await getSupportPresence();
  return Response.json(presence, {
    headers: { "cache-control": "no-store" },
  });
}
