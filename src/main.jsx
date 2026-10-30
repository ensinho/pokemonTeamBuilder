import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- ADICIONE ESTA LINHA
import './styles/motion.css' // shared entrance/hover motion utilities
import './styles/interactions.css' // design system v2: switch, check, loader, rolling figures, theme reveal
import { applyTheme } from './constants/theme'
import { LocaleRouter } from './components/LocaleRouter'
import { useLanguageStore } from './store/useLanguageStore'
import { mirrorLanguageInUrl } from './services/localeHistory'
import { initAnalytics } from './services/analytics'
import { installAssetFallback } from './utils/assetHost'

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

// The language lives in the URL (`/pt/...`, see utils/localePath.js). Settle
// the address on the language the visitor arrives in before anything routes:
// a Brazilian browser opening `/builder` continues at `/pt/builder`.
mirrorLanguageInUrl(useLanguageStore.getState().language);

// A sprite missing from our mirror retries at its origin (utils/assetHost.js).
// Installed before the first render so the first <img> is already covered.
installAssetFallback();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocaleRouter>
      <App />
    </LocaleRouter>
  </React.StrictMode>,
)

// After the first render, never before it: see services/analytics.js.
initAnalytics()