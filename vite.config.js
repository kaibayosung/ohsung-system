import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 포트를 5173으로 고정
    strictPort: false, // 만약 5173이 사용 중이면 다른 포트 사용 허용
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'portal.html'),
      },
    },
  },
})
