import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#4d4336',
            border: '1px solid #e9e3da',
            fontSize: '0.875rem',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
