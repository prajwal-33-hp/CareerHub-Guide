import { Helmet } from 'react-helmet-async'

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Helmet>
        <title>About CareerHub</title>
        <meta name="description" content="Learn about CareerHub's mission to connect students with meaningful jobs and internships." />
      </Helmet>
      <h1 className="font-display text-3xl font-bold text-ink">About CareerHub</h1>
      <p className="mt-4 text-ink-soft">
        CareerHub connects students with jobs and internships at companies that are actually hiring for
        entry-level talent. We built this platform because too many good candidates get lost in application
        black holes — so we focus on transparency: real salary ranges, real application statuses, and
        direct visibility into where you stand.
      </p>
    </div>
  )
}
