import { useEffect } from 'react'
import { X } from 'lucide-react'

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
}

export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  size = 'md',
  className = '',
  children,
}) {
  const visible = Boolean(open ?? isOpen)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    if (visible) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  if (!visible) return null

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${sizeClass} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl border border-ink/10 ${className}`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-ink-soft hover:bg-paper hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
