import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-mono text-sm text-signal-dark">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">This page took a different career path</h1>
      <p className="mt-2 text-sm text-ink-soft">We couldn't find what you were looking for.</p>
      <Link to="/" className="btn-primary mt-6">Back to Home</Link>
    </div>
  )
}
