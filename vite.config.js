import react from '@vitejs/plugin-react';

// Em desenvolvimento (npm run dev:web) as chamadas /api vão para o servidor na porta 3001
export default {
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } }
};
