
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Conditionally import lovable-tagger if available
let componentTagger: any = () => null;
try {
  const { componentTagger: tagger } = require("lovable-tagger");
  componentTagger = tagger;
} catch {
  // lovable-tagger not available, use a no-op function
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // For custom domain (clipandship.ca), base should always be "/"
  base: "/",
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    // Ensure proper chunking for GitHub Pages
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Ensure consistent file naming
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
