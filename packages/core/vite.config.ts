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
      name: 'MockChainCore',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['zustand', 'idb-keyval'],
    },
    sourcemap: true,
    minify: false,
  },
});
