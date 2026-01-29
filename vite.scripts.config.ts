import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background/service-worker.js'),
                content: resolve(__dirname, 'src/content/content-script.ts'),
            },
            output: {
                entryFileNames: 'scripts/[name].js',
            },
        },
        outDir: 'dist',
        emptyOutDir: false,
    },
})
