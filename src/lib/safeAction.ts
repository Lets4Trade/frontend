/**
 * Rede de segurança para chamar server action a partir de client component.
 *
 * POR QUE EXISTE: as actions do painel devolvem `{ ok: false, ... }` para todo
 * erro que ELAS conhecem — mas há falhas que acontecem antes ou fora delas e
 * chegam ao cliente como EXCEÇÃO: corpo acima do `bodySizeLimit`, rede que caiu
 * no meio do envio, deploy novo que invalidou o id da action na página aberta,
 * erro 500 do próprio Next. Dentro de um `startTransition(async () => ...)` sem
 * `try/catch`, essa promise rejeitada derrubava a tela ou a deixava presa em
 * "salvando..." sem mensagem nenhuma (2026-09-25).
 *
 * Devolver um `fallback` no MESMO formato do resultado da action, em vez de
 * relançar, é o que deixa cada tela seguir pelo caminho de erro que ela já
 * trata — o `pending` volta ao normal e a pessoa lê o aviso.
 *
 * NÃO registramos o erro inteiro: o objeto pode carregar o corpo enviado (texto
 * do formulário, dados de usuário). Só o NOME do erro vai para o console, que
 * basta para distinguir "TypeError: Failed to fetch" de um erro do servidor.
 */
export async function runAction<T>(
  run: () => Promise<T>,
  // `NoInfer`: o tipo vem SÓ da action. Sem ele o TS inferiria `T` também do
  // literal do fallback e alargaria `reason: "error"` para `string`, e o
  // fallback deixaria de ser checado contra o contrato da action.
  fallback: NoInfer<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.warn(
      "[action] falhou antes de responder:",
      error instanceof Error ? error.name : typeof error,
    );
    return fallback;
  }
}

/** Aviso para quando a falha pode ter sido o tamanho do arquivo enviado. */
export const ACTION_FAILED_UPLOAD_MESSAGE =
  "Não foi possível concluir agora. Se enviou imagem, confira se tem até 5 MB, e tente de novo.";

/** Aviso para as ações sem arquivo — rede, sessão da página, servidor. */
export const ACTION_FAILED_MESSAGE =
  "Não foi possível concluir agora. Confira sua conexão e tente de novo — se persistir, recarregue a página.";
