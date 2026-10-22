import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'

// Intercepta ?token= gerado pelo Better Auth no link de reset de senha.
// Salva em sessionStorage e redireciona para /redefinir-senha.
const _resetToken = new URLSearchParams(window.location.search).get('token')
if (_resetToken) {
  sessionStorage.setItem('reset_token', _resetToken)
  window.history.replaceState(null, '', '/redefinir-senha')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
