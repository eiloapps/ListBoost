import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createListingApiMiddleware } from "./server/api-middleware";

const listingApiMiddleware = createListingApiMiddleware();

const aiListingApiPlugin = () => ({
  name: "ai-listing-api",
  configureServer(server: { middlewares: { use: (path: string, handler: typeof listingApiMiddleware) => void } }) {
    server.middlewares.use("/api/generate-listing", listingApiMiddleware);
  },
  configurePreviewServer(server: { middlewares: { use: (path: string, handler: typeof listingApiMiddleware) => void } }) {
    server.middlewares.use("/api/generate-listing", listingApiMiddleware);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Make root .env values available to the server-side Gemini middleware.
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  process.env.GEMINI_MODEL = env.GEMINI_MODEL || process.env.GEMINI_MODEL;
  process.env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), aiListingApiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
