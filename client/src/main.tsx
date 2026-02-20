import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks'
import { ToastProvider } from './components/UI'
import { GlobalStyles } from './theme'
import App from './App'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, retryDelay: a => Math.min(1000 * 2 ** a, 8000), staleTime: 30_000, gcTime: 10 * 60_000, refetchOnWindowFocus: true },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ToastProvider>
            <GlobalStyles />
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
