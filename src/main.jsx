import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css' // <-- ADICIONE ESTA LINHA
import { applyTheme } from './constants/theme'

// Initialize theme from localStorage before first render so CSS vars are set.
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)