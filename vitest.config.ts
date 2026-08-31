import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest + React Testing Library.
// - `resolve.tsconfigPaths` resolve o alias "@/..." nativamente a partir do tsconfig.
// - jsdom como ambiente padrão (testes de componente/RTL); testes de lógica
//   pura (lib/utils) rodam normalmente nele também.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
