import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
  return {
    plugins: [react(), ...(env.VITE_HTTPS !== 'false' ? [basicSsl()] : [])],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
      },
    },
  };
});
