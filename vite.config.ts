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

**Step 2: Create `.env` file with YOUR NEW credentials:**
```
VITE_SUPABASE_URL=your_new_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_new_key_here
VITE_SUPABASE_PROJECT_ID=your_new_project_id_here
