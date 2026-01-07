import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MockChainMSW',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@mockchain/core', 'msw', 'msw/browser'],
    },
    sourcemap: true,
    minify: false,
  },
});
