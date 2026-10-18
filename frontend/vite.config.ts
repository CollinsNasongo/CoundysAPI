import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api is proxied to a locally running API (uvicorn on :8000 by default),
// so the browser sees one origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  build: {
    // recharts alone is ~525 kB minified (~150 kB gzipped).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep the charting library in its own long-cached chunk.
        manualChunks: { charts: ["recharts"] },
      },
    },
  },
  server: {
    // Same paths the production nginx forwards to the API (see nginx.conf).
    proxy: Object.fromEntries(
      ["/api", "/docs", "/redoc", "/health"].map((p) => [p, process.env.API_PROXY_TARGET ?? "http://localhost:8000"]),
    ),
  },
});
