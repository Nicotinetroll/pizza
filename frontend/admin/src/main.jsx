import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Theme 
      appearance="dark" 
      accentColor="violet" 
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <App />
    </Theme>
  </StrictMode>,
)
