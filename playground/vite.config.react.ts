import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import contentCollections from '@content-collections/vite';
import path from 'path';
import { codeInspectorPlugin } from 'code-inspector-plugin';

const config = defineConfig({
  root: path.resolve(__dirname, 'apps/react'),
  resolve: {
    alias: {
      '#': path.resolve(__dirname, 'apps/react/src'),
      '@': path.resolve(__dirname, 'apps/react/src'),
    },
  },
  plugins: [
    devtools(),
    contentCollections(),
    tailwindcss(),
    tanstackStart(),
    codeInspectorPlugin({
      bundler: 'vite',
      hideDomPathAttr: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    port: 3000,
  },
});

export default config;
