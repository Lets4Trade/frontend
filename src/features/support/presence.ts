import { publicApiGet } from "@/lib/publicApi";
import { OFFLINE, parsePresence, type SupportPresence } from "./presenceTypes";

/**
 * Atendentes online — leitura do SERVIDOR (cabeçalho e layout raiz, 2026-10-16).
 *
 * Igual para todo visitante, então cacheada no Next: no máximo uma ida ao
 * backend a cada 30 s por instância, não uma por página aberta. 30 s e não uma
 * hora como o layout porque presença muda sozinha (quem fecha o painel cai em
 * até 3 min); o clique em Online/Offline no painel derruba `PRESENCE_TAG` e a
 * troca aparece na hora.
 *
 * Arquivo separado da leitura autenticada (regra da casa: o `serverApi` puxa
 * `next/headers`). Backend fora do ar = offline.
 */

export const PRESENCE_TAG = "support-presence";
const REVALIDATE_SECONDS = 30;

export async function getSupportPresence(): Promise<SupportPresence> {
  const data = await publicApiGet<unknown>("/support/presence", {
    revalidate: REVALIDATE_SECONDS,
    tags: [PRESENCE_TAG],
  });
  return data ? parsePresence(data) : OFFLINE;
}
