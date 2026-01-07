import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MockChainDevTools',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@mockchain/core', 'react', 'react-dom', 'react/jsx-runtime'],
    },
    sourcemap: true,
    minify: false,
  },
});
