import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import './index.css'
import App from './App'
import { initI18n } from './i18n'
import { registerFonts } from './lib/fonts'

Promise.all([initI18n(), registerFonts()]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
})
