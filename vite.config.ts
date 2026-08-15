import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
        vite: {
          resolve: {
            alias: {
              'pg-native': path.resolve(import.meta.dirname, './electron/stubs/pgNativeStub.cjs')
            }
          },
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['ssh2', 'ssh2-sftp-client']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is finished
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.js'
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'pg-native': path.resolve(import.meta.dirname, './electron/stubs/pgNativeStub.cjs')
    }
  },
  server: {
    port: 5173
  }
});
