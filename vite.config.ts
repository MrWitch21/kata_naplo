/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relatív útvonal, így GitHub Pages alkönyvtárból és Vercelről is működik
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
