import React from 'react'
import ReactDOM from 'react-dom/client'

import Providers from '../lib/Providers'
import PopupApp from './PopupApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <PopupApp />
    </Providers>
  </React.StrictMode>,
)
