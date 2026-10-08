// Baut die Web-App nach ../data/www (LittleFS der Uhr). Die Hintergrund-Vorschauen in data/www/bg
// erzeugt tools/gen_assets.py, deshalb wird der Zielordner nicht geleert (siehe scripts/clean.js).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../data/www',
    emptyOutDir: false,
    assetsDir: 'assets',
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name][extname]' } },
  },
  // Entwicklung am PC: API-Aufrufe an die echte Uhr weiterreichen
  server: { proxy: { '/api': 'http://azan-clock.local', '/bg': 'http://azan-clock.local' } },
});
