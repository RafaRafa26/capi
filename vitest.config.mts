import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Testes de banco compartilham um Postgres só; rodar arquivos em paralelo
    // faria um truncar os dados do outro no meio da execução.
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
