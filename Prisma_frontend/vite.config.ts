import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // O build gerava um único `index-*.js` de ~742 kB, acima do limite
        // que o próprio Vite recomenda (500 kB) — todo visitante baixava a
        // aplicação inteira, incluindo a biblioteca de gráficos que só o
        // dashboard do gestor usa, antes de ver a tela de login.
        //
        // Separar as dependências grandes em chunks próprios deixa o
        // navegador cachear cada uma independentemente: uma mudança no
        // código da aplicação não invalida mais o bundle do React.
        // `recharts` sozinho responde pela maior parte do peso e só é usado
        // nos relatórios do gestor — um aluno nunca renderiza um gráfico.
        manualChunks: {
          // `react-dom/client` entra explicitamente: é esse o especificador
          // que `main.tsx` importa (`createRoot`). Listando só 'react-dom',
          // o Rollup tratava `react-dom/client` como outro módulo e o corpo
          // do react-dom acabava DENTRO do chunk da aplicação — que é
          // justamente o que muda a cada deploy, invalidando ~140 kB de
          // biblioteca estável em toda publicação.
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
          http: ['axios', 'jwt-decode'],
        },
      },
    },
  },
})
