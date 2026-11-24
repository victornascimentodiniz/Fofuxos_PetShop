import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/fofuxos-dark.css'

// Restaura a preferência antes da montagem do React.
try {
  document.documentElement.classList.toggle('dark', localStorage.getItem('fofuxos-theme') === 'dark')
} catch {
  // Caso o armazenamento do navegador esteja indisponível, usa o tema claro.
}
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
