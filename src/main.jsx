import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css' // <-- ADICIONE ESTA LINHA
import { applyTheme } from './constants/theme'

// Initialize theme from localStorage before first render so CSS vars are set.
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

// Routing used to be hash-based (#/pokemon/25); real paths are what search
// engines can actually index. Rewrite any old hash link people already have
// bookmarked/shared to its path equivalent before the router mounts.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');
if (window.location.hash.startsWith('#/')) {
  const legacyPath = window.location.hash.slice(1);
  window.history.replaceState(null, '', basename + legacyPath + window.location.search);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)