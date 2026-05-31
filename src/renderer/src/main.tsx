import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/lora/400.css'
import '@fontsource/lora/600.css'
import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/600.css'
import '@fontsource/nunito-sans/700.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
