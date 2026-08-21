import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-signal/15 px-6 py-12 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Your next opportunity is one application away
        </h2>
        <p className="max-w-xl text-sm text-ink-soft sm:text-base">
          Create a profile in minutes and let recruiters discover you, or start browsing roles right now.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary">Create your profile</Link>
          <Link to="/jobs" className="btn-secondary">Browse jobs</Link>
        </div>
      </div>
    </section>
  )
}
