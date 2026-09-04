import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LangueProvider } from './lib/i18n'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LangueProvider>
      <App />
    </LangueProvider>
  </React.StrictMode>
)
