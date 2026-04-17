import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, 'apps/vue'),
  plugins: [vue()],
  server: {
    port: 3001,
  },
})
