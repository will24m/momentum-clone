import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: path.resolve(__dirname, "newtab.html"),
      },
      output: {
        manualChunks: {
          react: ["react", "react-dom", "zustand"],
          dnd: ["@dnd-kit/core", "@dnd-kit/modifiers", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          supabase: ["@supabase/supabase-js", "date-fns"],
          ui: ["lucide-react", "clsx", "tailwind-merge"],
        },
      },
    },
  },
});
