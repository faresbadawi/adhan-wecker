// Baut die Web-App nach ../data/www (LittleFS der Uhr). Die Hintergrund-Vorschauen in data/www/bg
// erzeugt tools/gen_assets.py, deshalb wird der Zielordner nicht geleert (siehe scripts/clean.js).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Modi: Standard = Uhr (../data/www); app = Bündel in der Android-App (nur Handy-Betrieb, Pfade ab /);
// pwa = Web-App für Handys ohne Uhr im Netz (../pwa, relative Pfade, damit sie auch in einem Unterordner läuft)
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pwa' ? './' : '/',
  build: {
    outDir: mode === 'pwa' ? '../pwa' : '../data/www',
    emptyOutDir: mode === 'pwa',
    assetsDir: 'assets',
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name][extname]' } },
  },
  // Entwicklung am PC: API-Aufrufe an die echte Uhr weiterreichen (andere Adresse: CLOCK=http://192.168.x.y npm run dev)
  server: { proxy: { '/api': process.env.CLOCK || 'http://azan-clock.local', '/bg': process.env.CLOCK || 'http://azan-clock.local' } },
}));
