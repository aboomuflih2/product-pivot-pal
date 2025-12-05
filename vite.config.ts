import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**That's it!** Vite automatically loads `.env` files, so you don't need the `define` section at all.

Now create a `.env` file in your project root folder with these values:
```
VITE_SUPABASE_URL=https://pwkiqyejijezteeurluf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3a2lxeWVqaWplenRlZXVybHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzI5NDUsImV4cCI6MjA3NTYwODk0NX0.Cvh7nd86igAdTECVfssKtNvfjdJurhIian7HZsBxuSY
VITE_SUPABASE_PROJECT_ID=pwkiqyejijezteeurluf
