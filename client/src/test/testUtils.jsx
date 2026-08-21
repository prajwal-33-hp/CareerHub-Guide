import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from '../context/AuthContext.jsx'
import { ToastProvider } from '../context/ToastContext.jsx'
import { SavedJobsProvider } from '../context/SavedJobsContext.jsx'
import { ApplicationsProvider } from '../context/ApplicationsContext.jsx'

// Wraps a component with every provider the real app tree uses, so
// components that call useAuth/useToast/useSavedJobs/etc. work in tests
// without each test file re-declaring the provider tree.
export function AllProviders({ children }) {
  return (
    <BrowserRouter>
      <HelmetProvider>
        <ToastProvider>
          <AuthProvider>
            <SavedJobsProvider>
              <ApplicationsProvider>{children}</ApplicationsProvider>
            </SavedJobsProvider>
          </AuthProvider>
        </ToastProvider>
      </HelmetProvider>
    </BrowserRouter>
  )
}
