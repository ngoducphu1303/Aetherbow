import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {parseGlbCdnBase} from './src/engine/glbAssetUrl.ts';

export default defineConfig(({ mode }) => {
  const rootDir = import.meta.dirname;
  const env = loadEnv(mode, rootDir, 'VITE_');
  const useGlbCdn = Boolean(parseGlbCdnBase(env.VITE_GLB_CDN_BASE_URL));
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-public-assets-without-glb',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error || !useGlbCdn) return;
          fs.cpSync(path.resolve(rootDir, 'public'), path.resolve(rootDir, 'dist'), {
            recursive: true,
            force: false,
            filter: (source) => path.extname(source).toLowerCase() !== '.glb' || fs.statSync(source).isDirectory(),
          });
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      copyPublicDir: !useGlbCdn,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('/src/engine/') || id.includes('\\src\\engine\\')) {
              return 'game-engine';
            }
            if (id.includes('/src/data/') || id.includes('\\src\\data\\')) {
              return 'game-data';
            }
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/three/') || id.includes('\\three\\')) return 'vendor-three';
            if (id.includes('/firebase/') || id.includes('/@firebase/') || id.includes('\\firebase\\') || id.includes('\\@firebase\\')) {
              return 'vendor-firebase';
            }
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('\\react\\') ||
              id.includes('\\react-dom\\')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('/lucide-react/') ||
              id.includes('/motion/') ||
              id.includes('/framer-motion/')
            ) {
              return 'vendor-ui';
            }
            return undefined;
          },
        },
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
