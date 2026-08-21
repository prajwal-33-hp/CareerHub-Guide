import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = ++idCounter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  const styles = {
    success: 'border-success/30 text-success',
    error: 'border-danger/30 text-danger',
    info: 'border-ink/15 text-ink',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2 rounded-md border bg-white px-4 py-3 shadow-lg ${styles[t.type]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm text-ink flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="text-ink-soft hover:text-ink">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
