import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 前台开发服务器：5173 端口；/api 与 /upload 代理到后端 8080
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/upload': { target: 'http://localhost:8080', changeOrigin: true },
      // WebSocket 私信（PRD CHT-02）：开发期由 Vite 代理转发，生产同源部署无需此配置
      '/ws': { target: 'http://localhost:8080', ws: true, changeOrigin: true }
    }
  }
})
