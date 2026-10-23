import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // Permite el tráfico proveniente de túneles como ngrok
  }
})