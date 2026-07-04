import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { codeInspectorPlugin } from 'code-inspector-plugin';

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, 'apps/vue'),
  plugins: [
    vue(),
    codeInspectorPlugin({
      bundler: 'vite',
      hideDomPathAttr: true,
    }),
  ],
  server: {
    port: 3001,
  },
});
