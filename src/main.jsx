import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const inter = document.createElement('link')
inter.rel = 'stylesheet'
inter.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
document.head.appendChild(inter)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
