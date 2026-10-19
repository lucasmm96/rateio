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
// O hash router não preserva query params, então detectamos antes do render
// e armazenamos em sessionStorage para a rota /redefinir-senha consumir.
const _resetToken = new URLSearchParams(window.location.search).get('token')
if (_resetToken) {
  sessionStorage.setItem('reset_token', _resetToken)
  window.history.replaceState(null, '', window.location.pathname + '#/redefinir-senha')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
