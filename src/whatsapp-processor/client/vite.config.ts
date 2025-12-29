import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3006,
        proxy: {
            '/api': 'http://localhost:3005',
            '/socket.io': {
                target: 'http://localhost:3005',
                ws: true
            }
        }
    },
    build: {
        outDir: '../public/dist',
        emptyOutDir: true
    }
})
