/**
 * Setup do Vitest.
 *
 * O `vitest.config.ts` sempre apontou para este arquivo, mas ele não existia —
 * e ninguém percebeu porque o projeto não tinha nenhum teste. O primeiro teste
 * (2026-09-14) quebrou na carga da suíte, antes de rodar qualquer coisa.
 *
 * Só o mínimo: os matchers de DOM do Testing Library (`toBeInTheDocument`…),
 * que são dependência declarada e o que teste de componente vai precisar.
 */
import "@testing-library/jest-dom/vitest";
