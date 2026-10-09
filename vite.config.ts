import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // The remote builds design study is a second page beside the playground.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        "remote-builds": fileURLToPath(new URL("./remote-builds.html", import.meta.url)),
      },
    },
  },
});
