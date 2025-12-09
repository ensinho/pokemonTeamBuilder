import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css' // <-- ADICIONE ESTA LINHA

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/pokemonTeamBuilder">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)