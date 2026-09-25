/**
 * Normaliza texto para URL — CÓPIA FIEL de `backend/src/app/games/slugify.ts`.
 *
 * Existe no front só para a PRÉVIA do link do jogo (cadastro e builder): quem
 * decide o endereço gravado é o servidor, que normaliza de novo. As duas têm de
 * concordar, senão a tela mostraria um link e o banco guardaria outro — por
 * isso o teste fixa os mesmos casos das duas pontas.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    // Escrito com ESCAPES: marca de combinação literal é invisível no editor.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Versão "enquanto digita" do `slugify`: mesma limpeza, mas SEM tirar o hífen
 * do fim. Normalizar por completo a cada tecla apagaria o "-" recém-digitado e
 * tornaria impossível escrever "meu-jogo" letra a letra. A forma final sai do
 * `slugify` (no envio e no servidor).
 */
export function slugifyDraft(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 80);
}
