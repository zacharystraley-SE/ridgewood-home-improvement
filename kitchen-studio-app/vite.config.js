import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  base: "/kitchen-studio/",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "../kitchen-studio",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        studio: resolve(import.meta.dirname, "index.html"),
        manager: resolve(import.meta.dirname, "manager.html"),
      },
    },
  },
});
