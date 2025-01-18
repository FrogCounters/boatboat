import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Join from './Join.tsx'
import Mobile from './Mobile.tsx'
import { BrowserRouter, Routes, Route } from 'react-router'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/join" element={<Join />} />
      <Route path="/mobile" element={<Mobile />} />
    </Routes>
  </BrowserRouter>,
)
