import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function pwaAssetManifestPlugin(): Plugin {
  return {
    name: 'pwa-asset-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assetUrls = [
        './',
        './index.html',
        './manifest.webmanifest',
        './icon-192.svg',
        './icon-512.svg',
      ];
      for (const fileName of Object.keys(bundle)) {
        if (fileName.startsWith('assets/')) {
          assetUrls.push(`./${fileName}`);
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify(assetUrls, null, 2),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), pwaAssetManifestPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

