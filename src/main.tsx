import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { computeDiff } from './lib/diff/structuralDiff'
import { computeWordDiff } from './lib/diff/textDiff'
import { useCVStore } from './store/cvStore'

// Expose diff utilities and store for console testing
if (import.meta.env.DEV) {
  Object.assign(window, { computeDiff, computeWordDiff, useCVStore });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
