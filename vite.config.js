import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset links relative, so the app works from any sub-path (GitHub Pages)
export default defineConfig({ base: './', plugins: [react()] })
