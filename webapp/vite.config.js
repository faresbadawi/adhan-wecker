// Baut die Web-App nach ../data/www (LittleFS der Uhr). Die Hintergrund-Vorschauen in data/www/bg
// erzeugt tools/gen_assets.py, deshalb wird der Zielordner nicht geleert (siehe scripts/clean.js).
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: '/',
  build: {
    outDir: '../data/www',
    emptyOutDir: false,
    assetsDir: 'assets',
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } },
  },
  // Entwicklung am PC: API-Aufrufe an die echte Uhr weiterreichen
  server: { proxy: { '/api': 'http://azan-clock.local', '/bg': 'http://azan-clock.local' } },
});
