import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `npm run build` writes the app into the backend checkout (pceaBackend/frontend/dist) so one
// deployment serves both. Set BACKEND_DIR if the backend isn't next to this repo.
const root = fileURLToPath(new URL('.', import.meta.url))
const backendDir = resolve(root, process.env.BACKEND_DIR || '../pceaBackend')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(backendDir, 'frontend/dist'),
    emptyOutDir: true, // it's outside this project, so Vite only clears it when told to
  },
})
