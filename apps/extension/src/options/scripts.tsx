import React from 'react'
import ReactDOM from 'react-dom/client'

import Providers from '../lib/Providers'
import OptionsApp from './OptionsApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <OptionsApp />
    </Providers>
  </React.StrictMode>,
)
