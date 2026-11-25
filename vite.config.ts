import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
// Nitro only for Vercel builds (VERCEL=1); local dev/tests keep the default Start server.
export default defineConfig({ ssr: { noExternal: ['@convex-dev/better-auth'] }, plugins: [tailwindcss(), tanstackStart(), ...(process.env.VERCEL ? [nitro({ preset: 'vercel' })] : []), viteReact()] })
