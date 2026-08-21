import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { SavedJobsProvider } from './context/SavedJobsContext.jsx'
import { ApplicationsProvider } from './context/ApplicationsContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <SavedJobsProvider>
                <ApplicationsProvider>
                  <App />
                </ApplicationsProvider>
              </SavedJobsProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
